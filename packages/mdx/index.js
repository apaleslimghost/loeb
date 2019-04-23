const react = require('@loeb/react')

exports.test = /\.mdx?$/

exports.webpack = {
	module: {
		rules: [
			{
				test: exports.test,
				use: [
					react.webpack.module.rules[0].use[0],
					require.resolve('@mdx-js/loader'),
				]
			}
		 ]
	},
	externals: react.webpack.externals,
	resolve: {
		alias: {
			'@mdx-js/react': require.resolve('@mdx-js/react')
		}
	}
}

exports.render = react.render
