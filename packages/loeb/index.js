const Bundler = require('parcel-bundler')
const importFresh = require('import-fresh')
const React = require('react')
const {renderToStaticMarkup} = require('react-dom/server')

module.exports = async () => {
	const bundler = new Bundler('pages/**/*.mdx', {
		target: 'node',
		hmr: false,
		sourceMaps: false,
	})
	bundler.addAssetType('mdx', require.resolve('@mdx-js/parcel-plugin-mdx/src/MDXAsset'))

	bundler.on('bundled', bundle => {
		bundle.childBundles.forEach(entry => {
			const Component = importFresh(entry.name).default
			console.log(renderToStaticMarkup(React.createElement(Component)))
		})
	})

	bundler.bundle()
}

module === require.main && module.exports()