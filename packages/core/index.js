const merge = require('webpack-merge')
const path = require('path')
const Komatsu = require('komatsu')
const glob = require('glob-promise')
const colours = require('ansi-colors')
const requireFromString = require('require-from-string')
const assignDeep = require('assign-deep')

const NodeTemplatePlugin = require('webpack/lib/node/NodeTemplatePlugin')
const NodeTargetPlugin = require('webpack/lib/node/NodeTargetPlugin')
const LibraryTemplatePlugin = require('webpack/lib/LibraryTemplatePlugin')
const ExternalsPlugin = require('webpack/lib/ExternalsPlugin')
const SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin')
const WebpackOptionsApply = require('webpack/lib/WebpackOptionsApply')
const WebpackOptionsDefaulter = require('webpack/lib/WebpackOptionsDefaulter')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

function extractHelperFilesFromCompilation(
	mainCompilation,
	childCompilation,
	filename,
	childEntryChunks,
) {
	const helperAssetNames = childEntryChunks.map((entryChunk, index) => {
		return mainCompilation.mainTemplate.hooks.assetPath.call(filename, {
			hash: childCompilation.hash,
			chunk: entryChunk,
			name: `HtmlWebpackPlugin_${index}`,
		})
	})

	helperAssetNames.forEach(helperFileName => {
		delete mainCompilation.assets[helperFileName]
	})

	return helperAssetNames.map(helperFileName => {
		return childCompilation.assets[helperFileName].source()
	})
}

const runAsChild = child =>
	new Promise((resolve, reject) => {
		child.runAsChild((err, entries, childCompilation) => {
			if (err) {
				reject(err)
			} else {
				resolve({ entries, childCompilation })
			}
		})
	})

const applyPlugins = (compiler, plugins) =>
	Array.isArray(plugins) &&
	plugins.forEach(plugin => {
		if (typeof plugin === 'function') {
			plugin.call(compiler, compiler)
		} else {
			plugin.apply(compiler)
		}
	})

module.exports = ({ plugins = [], isStatic = true }) => ({
	apply(compiler) {
		const pagesPromise = glob('./pages/**/*', { nodir: true })

		const extraOptions = merge.smart(
			{
				target: 'web',
				entry: [],
				devtool: false,
				mode: 'development',
				output: {
					path: path.resolve('site'),
					filename: 'scripts/[name].[hash].js',
				},
				plugins: [new CleanWebpackPlugin()],
			},
			...plugins.map(plugin => plugin.webpack),
		)

		assignDeep(compiler.options, extraOptions)
		applyPlugins(compiler, extraOptions.plugins)

		const spinners = new Komatsu()
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
			applyPlugins(child, compiler.options.plugins)

			new NodeTemplatePlugin(outputOptions).apply(child)
			new NodeTargetPlugin().apply(child)
			new LibraryTemplatePlugin('', 'commonjs2').apply(child)
			new SingleEntryPlugin(child.context, entry, chunkName).apply(child)
			new ExternalsPlugin(
				outputOptions.libraryTarget,
				compiler.options.externals,
			).apply(child)

			childCompilers.set(entry, child)
			return child
		}

		async function buildPage(entry, compilation) {
			const entryType = path.extname(entry).slice(1)

			const plugin = plugins.find(
				plugin => plugin.test && entry.match(plugin.test),
			)

			if (!plugin) {
				throw new Error(`no plugin to handle page ${entry}`)
			}

			const childCompiler = getChildCompiler(entry, compilation)

			const { entries, childCompilation } = await runAsChild(childCompiler)

			await Promise.all(
				extractHelperFilesFromCompilation(
					compilation,
					childCompilation,
					childCompiler.options.output.filename,
					entries,
				).map(async source => {
					const { default: page, ...properties } = requireFromString(
						source,
						entry,
					)

					if (Array.isArray(page)) {
						await Promise.all(
							page.map(({ render, ...subProperties }) =>
								writePage({
									page: render,
									properties: { ...properties, ...subProperties },
									generated: true,
								}),
							),
						)
					} else {
						await writePage({ page, properties })
					}

					async function writePage({ page, properties, generated = false }) {
						if (generated && !properties.slug) {
							throw new Error(
								`page generated by ${entry} is missing a slug property`,
							)
						}

						Object.assign(
							properties,
							typeof properties.getData === 'function'
								? await properties.getData()
								: {},
						)

						const targetPath = properties.slug
							? properties.slug.replace(/^\//, '') +
							  (properties.slug.endsWith('.html') ? '' : '/index.html')
							: path
									.relative('pages', entry)
									.replace(new RegExp(`${entryType}$`), 'html')

						// const clientScript = compilation.mainTemplate.hooks.assetPath.call(filename, {
						// 	hash: childCompilation.hash,
						// 	chunk: 'client' + chunkName,
						// 	name: `HtmlWebpackPlugin_${index}`,
						// })

						const renderedPage = plugin.render(
							props => page({ ...props, ...properties }),
							{ isStatic },
						)

						const rendered =
							'<!doctype html>' +
							(properties.layout
								? plugin.render(
										props =>
											properties.layout({
												body: renderedPage,
												assets: Object.keys(compilation.assets),
												page: { ...props, ...properties },
											}),
										{ isStatic: true },
								  )
								: renderedPage)

						compilation.assets[targetPath] = {
							source: () => rendered,
							size: () => rendered.length,
						}
					}
				}),
			)
		}

		compiler.hooks.make.tapPromise('loeb', async compilation => {
			const pages = await pagesPromise
			await Promise.all(
				pages.map(page =>
					spinners.logPromise(
						buildPage(page, compilation),
						colours.grey(`building page ${colours.cyan(page)}`),
					),
				),
			).catch(() => {}) // error has already been logged, we don't want it to stop the compiler
		})

		// u wot m8
		compiler.hooks.shouldEmit.tap('loeb', () => true)
		compiler.hooks.failed.tap('loeb', error => {
			console.log(error)
		})
	},
})
