const webpack = require('webpack')
const merge = require('webpack-merge')
const path = require('path')
const chokidar = require('chokidar')
const importFresh = require('import-fresh')
const fs = require('mz/fs')
const mkdirp = require('mkdirp-promise')
const streamToPromise = require('stream-to-promise')
const Spinners = require('./spinners')

const commonOptions = {
	target: 'node',
	mode: 'development',
	watch: true,
	devtool: false,
	output: {
		libraryTarget: 'commonjs',
	}
}

module.exports = async ({ watch = true, plugins = [] }) => {
	const entries = new Set()
	let ready = false
	const watcher = chokidar.watch('./pages/**/*')

	const compilers = new Map()
	const spinners = new Spinners()

	watcher.on('add', entry => {
		if(!compilers.has(entry)) {
			const output = {
				path: path.resolve(process.cwd(), '.cache'),
				filename: `${path.basename(entry)}.[hash].js`
			}

			const config = merge.smart(commonOptions, {
				entry: `./${entry}`,
				output
			}, ...plugins.map(plugin => plugin.webpack))

			const compiler = webpack(config)
			let start = Date.now()

			compiler.hooks.watchRun.tap('loebSpinner', () => {
				start = Date.now()
				spinners.log(entry, {
					message: `building ${entry}...`
				})
			})

			compilers.set(entry, compiler)
			compiler.watcher = compiler.watch({}, async (error, stats) => {
				spinners.log(entry, {
					message: `bundled ${entry} (${Date.now() - start}ms), rendering...`
				})

				try {
					const {entrypoints, assets} = stats.toJson()
					const entryAsset = entrypoints.main.assets[0]
					const asset = path.resolve(output.path, entryAsset)
					const {default: page, ...pageProperties} = importFresh(asset)

					const copyAssets = assets.filter(asset => asset.name !== entryAsset)

					const entryType = path.extname(entry).slice(1)
					const targetPath = path.join(
						'site',
						pageProperties.slug
							? pageProperties.slug + (pageProperties.slug.endsWith('.html') ? '' : '/index.html')
							: path.relative('pages', entry).replace(new RegExp(`${entryType}$`), 'html')
					)

					await mkdirp(
						path.dirname(targetPath)
					)

					await Promise.all(copyAssets.map(async asset => {
						const assetOutputPath = path.join(output.path, asset.name)
						const assetTargetPath = path.join('site', asset.name)
						await mkdirp(path.dirname(assetTargetPath))
						await fs.copyFile(assetOutputPath, assetTargetPath)
					}))

					const plugin = plugins.find(plugin => entry.match(plugin.test))

					if(!plugin) {
						throw new Error(`no plugin to handle page ${entry}`)
					}

					const rendered = plugin.render(
						pageProperties.layout
							? props => pageProperties.layout({
								children: page(props),
								...pageProperties
							})
							: page
					)

					if(rendered.pipe) {
						rendered.pipe(
							fs.createWriteStream(
								targetPath,
							)
						)

						await streamToPromise(rendered)
					} else if(typeof rendered === 'string' || Buffer.isBuffer(rendered)) {
						await fs.writeFile(targetPath, rendered)
					} else {
						throw new Error(`plugin for ${entryType} should output a string, Buffer, or ReadableStream`)
					}

					spinners.log(entry, {
						status: 'done',
						message: `rendered ${entry} → ${targetPath} (${Date.now() - start}ms)`
					})
				} catch(error) {
					spinners.log(entry, {
						status: 'fail',
						error,
						message: `${entry} failed`
					})
				}
			})
		}
	})

	watcher.on('unlink', entry => {
		const compiler = compilers.get(entry)
		compilers.delete(entry)
		spinners.log(entry, {
			message: `${entry} deleted, stopping compiler`
		})

		const entryType = path.extname(entry).slice(1)
		const targetPath = path.join(
			'site',
			path.relative('pages', entry).replace(new RegExp(`${entryType}$`), 'html')
		)

		compiler.watcher.close(async () => {
			try {
				if(await fs.exists(targetPath)) {
					await fs.unlink(targetPath)
				}

				spinners.log(entry, {
					status: 'info',
					message: `${entry} deleted`
				})
			} catch(error) {
				spinners.log(entry, {
					status: 'fail',
					error,
					message: `${entry} deleted`
				})
			}
		})
	})
}