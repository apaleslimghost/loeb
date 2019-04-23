const webpack = require('webpack')
const merge = require('webpack-merge')
const path = require('path')
const chokidar = require('chokidar')
const importFresh = require('import-fresh')
const fs = require('fs')
const mkdirp = require('mkdirp')

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

	watcher.on('add', entry => {
		if(!compilers.has(entry)) {
			const output = {
				path: path.resolve(process.cwd(), '.cache', path.dirname(entry)),
				filename: path.basename(entry) + '.js'
			}

			const compiler = webpack(merge.smart(commonOptions, {
				entry: `./${entry}`,
				output
			}, ...plugins.map(plugin => plugin.webpack)))

			compilers.set(entry, compiler)
			compiler.watcher = compiler.watch({}, (err, stats) => {
				if(err) console.error(err)
				console.log(stats.toString({
					colors: true
				}) + '\n')

				const asset = path.resolve(output.path, output.filename)
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

				const rendered = plugin.render(page)

				if(rendered.pipe) {
					rendered.pipe(
						fs.createWriteStream(
							targetPath,
						)
					)
				} else if(typeof rendered === 'string' || Buffer.isBuffer(rendered)) {
					fs.writeFileSync(targetPath, rendered)
				} else {
					throw new Error(`plugin for ${entryType} should output a string, Buffer, or ReadableStream`)
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