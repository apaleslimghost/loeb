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

	const helperContents = helperAssetNames.map((helperFileName) => {
		return childCompilation.assets[helperFileName].source();
	});

	return helperContents;
}

module.exports = async ({ plugins = [] }) => {
	const compiler = webpack(merge.smart({
		target: 'node',
		entry: require.resolve('./empty.js'),
		devtool: false,
		mode: 'development',
		output: {
			filename: 'dummy.js'
		}
	},
		...plugins.map(plugin => plugin.webpack)
	))

	compiler.hooks.make.tapAsync('loeb', (compilation, callback) => {
		const filename = `.cache/child.js`
		const outputOptions = {
			libraryTarget: 'commonjs2',
			filename,
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
		new SingleEntryPlugin(child.context, './pages/index.jsx', `loeb_idk`).apply(child)
		new ExternalsPlugin(
			outputOptions.libraryTarget,
			compiler.options.externals
		).apply(child);

		child.runAsChild((err, entries, childCompilation) => {
			extractHelperFilesFromCompilation(compilation, childCompilation, filename, entries).forEach(source => {
				const { default: page } = requireFromString(source)
				console.log(page)
			})

			callback()
		})
	})

	compiler.run((err, compilation) => {
		// console.log(compilation)
	})
}