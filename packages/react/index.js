const React = require('react')
const { renderToString, renderToStaticMarkup } = require('react-dom/server')

exports.test = /\.jsx?$/

exports.webpack = {
	module: {
		rules: [
			{
				test: exports.test,
				use: [
					{
						loader: require.resolve('babel-loader'),
						options: {
							presets: [
								[
									require.resolve('@babel/preset-env'),
									{
										targets: {
											node: 'current',
										},
									},
								],
								require.resolve('@babel/preset-react'),
							],
						},
					},
				],
			},
		],
	},
	externals: {
		react: { commonjs2: require.resolve('react') },
	},
}

exports.render = (Component, { isStatic }) => {
	const element = React.createElement(Component)
	return (isStatic ? renderToStaticMarkup : renderToString)(element)
}
