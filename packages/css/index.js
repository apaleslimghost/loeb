const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const ExtractTextPlugin = require("extract-text-webpack-plugin")

exports.webpack = {
	plugins: [
		new ExtractTextPlugin({
			filename: 'styles/[name].[hash].css',
		}),
	],
	module: {
		rules: [
			{
				test: /\.css$/,
				use: ExtractTextPlugin.extract({
					use: {
						loader: require.resolve('css-loader'),
						options: {
							modules: true,
							exportOnlyLocals: true,
						}
					}
				})
			}
		]
	}
}
