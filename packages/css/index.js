const MiniCssExtractPlugin = require('mini-css-extract-plugin')

exports.webpack = {
	plugins: [
		compiler =>
			new MiniCssExtractPlugin({
				filename: 'styles/[id].[contenthash].css',
			}).apply(compiler),
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
						},
					},
				],
			},
		],
	},
}
