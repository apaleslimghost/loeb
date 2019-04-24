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
				path: path.resolve(process.cwd(), '.cache', path.dirname(entry)),
				filename: path.basename(entry) + '.js'
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
				const entryType = path.extname(entry).slice(1)
				const targetPath = path.join(
					'site',
					path.relative('pages', entry).replace(new RegExp(`${entryType}$`), 'html')
				)

				const asset = path.resolve(output.path, output.filename)

				spinners.log(entry, {
					message: `bundled ${entry} → ${targetPath} (${Date.now() - start}ms), rendering...`
				})

				try {
					const page = importFresh(asset).default
					await mkdirp(
						path.dirname(targetPath)
					)

					const plugin = plugins.find(plugin => entry.match(plugin.test))

					if(!plugin) {
						throw new Error(`no plugin to handle page ${entry}`)
					}

					const rendered = plugin.render(page)

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

	watcher.on('unlink', path => {
		console.log(compilers)
		const compiler = compilers.get(path)
		compilers.delete(path)
		compiler.watcher.close()
	})
}