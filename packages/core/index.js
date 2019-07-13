const webpack = require('webpack')
const merge = require('webpack-merge')
const path = require('path')
const chokidar = require('chokidar')
const importFresh = require('import-fresh')
const fs = require('mz/fs')
const mkdirp = require('mkdirp-promise')
const streamToPromise = require('stream-to-promise')
const Spinners = require('./spinners')
const requireFromString = require('require-from-string')

const NodeTemplatePlugin = require('webpack/lib/node/NodeTemplatePlugin')
const NodeTargetPlugin = require('webpack/lib/node/NodeTargetPlugin')
const LibraryTemplatePlugin = require('webpack/lib/LibraryTemplatePlugin')
const ExternalsPlugin = require('webpack/lib/ExternalsPlugin')
const SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin')
const WebpackOptionsApply = require('webpack/lib/WebpackOptionsApply')
const WebpackOptionsDefaulter = require('webpack/lib/WebpackOptionsDefaulter')

const glob = require('glob-promise')

function extractHelperFilesFromCompilation(mainCompilation, childCompilation, filename, childEntryChunks) {
	const helperAssetNames = childEntryChunks.map((entryChunk, index) => {
		return mainCompilation.mainTemplate.hooks.assetPath.call(filename, {
			hash: childCompilation.hash,
			chunk: entryChunk,
			name: `HtmlWebpackPlugin_${index}`
		});
	});

	helperAssetNames.forEach((helperFileName) => {
		delete mainCompilation.assets[helperFileName];
	});

	return helperAssetNames.map((helperFileName) => {
		return childCompilation.assets[helperFileName].source()
	});
}

const runAsChild = child => new Promise((resolve, reject) => {
	child.runAsChild((err, entries, childCompilation) => {
		if (err) {
			reject(err)
		} else {
			resolve({ entries, childCompilation })
		}
	})
})

module.exports = async ({ plugins = [] }) => {
	const compiler = webpack(merge.smart({
		target: 'node',
		entry: require.resolve('./empty.js'),
		devtool: false,
		mode: 'development',
		output: {
			path: path.resolve('site'),
			filename: 'dummy.js'
		},
	},
		...plugins.map(plugin => plugin.webpack)
	))

	const childCompilers = new Map()

	function getChildCompiler(entry, compilation) {
		if (childCompilers.has(entry)) {
			return childCompilers.get(entry)
		}

		const chunkName = entry.replace(/[^a-z]/g, '-')

		const outputOptions = {
			libraryTarget: 'commonjs2',
			filename: `${chunkName}.js`,
		}

		const child = compilation.createChildCompiler('loeb', outputOptions)
		child.context = compiler.context

		if (compiler.options.plugins && Array.isArray(compiler.options.plugins)) {
			for (const plugin of compiler.options.plugins) {
				if (typeof plugin === "function") {
					plugin.call(child, child);
				} else {
					plugin.apply(child);
				}
			}
		}

		new NodeTemplatePlugin(outputOptions).apply(child);
		new NodeTargetPlugin().apply(child);
		new LibraryTemplatePlugin('', 'commonjs2').apply(child);
		new SingleEntryPlugin(child.context, entry, chunkName).apply(child)
		new ExternalsPlugin(
			outputOptions.libraryTarget,
			compiler.options.externals
		).apply(child);

		childCompilers.set(entry, child)
		return child
	}

	async function buildPage(entry, compilation) {
		const entryType = path.extname(entry).slice(1)

		const plugin = plugins.find(plugin => entry.match(plugin.test))

		if (!plugin) {
			throw new Error(`no plugin to handle page ${entry}`)
		}

		const child = getChildCompiler(entry, compilation)

		const { entries, childCompilation } = await runAsChild(child)

		extractHelperFilesFromCompilation(compilation, childCompilation, child.options.output.filename, entries).forEach(source => {
			const { default: page, ...pageProperties } = requireFromString(source)
			const targetPath = pageProperties.slug
				? pageProperties.slug + (pageProperties.slug.endsWith('.html') ? '' : '/index.html')
				: path.relative('pages', entry).replace(new RegExp(`${entryType}$`), 'html')

			const rendered = plugin.render(
				pageProperties.layout
					? props => pageProperties.layout({
						children: page(props),
						assets,
						page: pageProperties
					})
					: page
			)

			compilation.assets[targetPath] = {
				source: () => rendered,
				size: () => rendered.length,
			}
		})
	}

	compiler.hooks.make.tapPromise('loeb', async (compilation, callback) => {
		const entry = './pages/index.jsx'
		await buildPage(entry, compilation)
	})

	compiler.hooks.emit.tap('loeb', (compilation) => {
		delete compilation.assets['dummy.js']
	})

	compiler.run((err, compilation) => {
		// console.log(compilation)
	})
}