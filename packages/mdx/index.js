const React = require('react')
const {renderToStaticNodeStream} = require('react-dom/server')

exports.type = 'mdx'

exports.webpack = {
	module: {
		rules: [
			{
				test: /\.mdx?$/,
				use: [
					{
						loader: require.resolve('babel-loader'),
						options: {
							presets: [
								[require.resolve('@babel/preset-env'), {
									targets: {
										node: 'current'
									}
								}],
								require.resolve('@babel/preset-react')
							]
						}
					},
					require.resolve('@mdx-js/loader'),
				]
			}
		 ]
	},
	externals: {
		'@mdx-js/react': {commonjs: require.resolve('@mdx-js/react')},
		'react': {commonjs: require.resolve('react')},
	}
}

exports.render = Component => {
	const element = React.createElement(Component)
	return renderToStaticNodeStream(element)
}