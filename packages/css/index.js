const MiniCssExtractPlugin = require('mini-css-extract-plugin')

exports.webpack = {
	plugins: [
		new MiniCssExtractPlugin({
			filename: 'styles/[name].[hash].css',
		}),
	],
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: require.resolve('css-loader'),
						options: {
							modules: true,
						}
					}
				]
			}
		]
	}
}
