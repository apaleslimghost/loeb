const Bundler = require('parcel-bundler')
const importFresh = require('import-fresh')
const path = require('path')
const fs = require('fs')
const mkdirp = require('mkdirp')

module.exports = async ({ watch = true, plugins = [] }) => {
	const bundler = new Bundler('pages/**/*', {
		target: 'node',
		autoinstall: false,
		hmr: false,
		sourceMaps: false,
		watch,
	})

	plugins.forEach(plugin => {
		if(plugin.parcel) {
			plugin.parcel(bundler)
		}
	})

	function outputFromBundle(bundle) {
		bundle.childBundles.forEach(entry => {
			const exported = importFresh(entry.name)
			const page = exported.__esModule ? exported.default : exported

			const entryType = path.extname(
				entry.entryAsset.name
			).slice(1)

			const targetPath = path.join(
				'site',
				entry.entryAsset.relativeName.replace(new RegExp(`\\.${entryType}$`), '.html')
			)

			mkdirp.sync(
				path.dirname(targetPath)
			)

			const plugin = plugins.find(plugin => plugin.type === entryType)

			if(!plugin) {
				throw new Error(`no plugin to handle page pages/${entry.entryAsset.relativeName}`)
			}

			const output = plugin.output(page)

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

		return bundle
	}

	if(watch) {
		bundler.on('bundled', outputFromBundle)
	}

	return outputFromBundle(await bundler.bundle())
}
