const Bundler = require('parcel-bundler')
const importFresh = require('import-fresh')
const React = require('react')
const {renderToStaticNodeStream} = require('react-dom/server')
const path = require('path')
const fs = require('fs')
const mkdirp = require('mkdirp')

module.exports = async () => {
	const bundler = new Bundler('pages/**/*', {
		target: 'node',
		hmr: false,
		sourceMaps: false,
	})

	bundler.addAssetType('mdx', require.resolve('@mdx-js/parcel-plugin-mdx/src/MDXAsset'))

	bundler.on('bundled', bundle => {
		bundle.childBundles.forEach(entry => {
			const Component = importFresh(entry.name).default
			const targetPath = path.join(
				'site',
				path.relative('dist', entry.name).replace(/\.js$/, '.html')
			)

			mkdirp.sync(
				path.dirname(targetPath)
			)

			renderToStaticNodeStream(React.createElement(Component)).pipe(
				fs.createWriteStream(
					targetPath,
				)
			)
			
		})
	})

	bundler.bundle()
}

module === require.main && module.exports()