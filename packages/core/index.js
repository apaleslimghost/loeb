const webpack = require('webpack')
const merge = require('webpack-merge')
const path = require('path')
const chokidar = require('chokidar')
const importFresh = require('import-fresh')
const fs = require('fs')
const mkdirp = require('mkdirp')

module.exports = async ({ watch = true, plugins = [] }) => {
	const entries = new Set()
	let ready = false
	const watcher = chokidar.watch('./pages/**/*')

	function build() {
		if(ready) {
			const compiler = webpack(merge.smart({
				entry: Array.from(entries).reduce((entry, key) => ({
					...entry,
					[key]: './' + key
				}), {}),
				target: 'node',
				mode: 'development',
				watch: true,
				devtool: false,
				output: {
					libraryTarget: 'commonjs',
					path: path.resolve(process.cwd(), '.cache')
				}
			}, ...plugins.map(plugin => plugin.webpack)))
			
			compiler.run((err, stats) => {
				if(err) console.error(err)

				const {assetsByChunkName} = stats.toJson()
				Object.keys(assetsByChunkName).forEach(entry => {
					const asset = path.resolve(process.cwd(), '.cache', assetsByChunkName[entry])
					const page = importFresh(asset).default

					const entryType = path.extname(entry).slice(1)

					const targetPath = path.join(
						'site',
						entry.replace(new RegExp(`${entryType}$`), 'html')
					)

					mkdirp.sync(
						path.dirname(targetPath)
					)

					const plugin = plugins.find(plugin => plugin.type === entryType)

					if(!plugin) {
						throw new Error(`no plugin to handle page ${entry}`)
					}

					const output = plugin.render(page)

					if(output.pipe) {
						output.pipe(
							fs.createWriteStream(
								targetPath,
							)
						)
					} else if(typeof output === string || Buffer.isBuffer(output)) {
						fs.writeFileSync(targetPath, output)
					} else {
						throw new Error(`plugin for ${entryType} should output a string, Buffer, or ReadableStream`)
					}
				})
			})
		}
	}

	watcher.on('ready', () => {
		ready = true
		build()
	})

	watcher.on('add', path => {
		entries.add(path)
		build()
	})

	watcher.on('unlink', path => {
		entries.delete(path)
		build()
	})

	watcher.on('change', build)

	// compiler.watch({}, (err, stats) => {
	// 	console.log(err, stats)
	// })
}