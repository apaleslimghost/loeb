exports.webpack = {
	module: {
		rules: [
			{
				test: /\.(png|gif|jpe?g|webp)$/,
				use: [{
					loader: require.resolve('file-loader'),
					options: {
						name: '[name].[hash].[ext]',
						outputPath: 'images',
						publicPath: '/images',
					}
				}]
			}
		]
	}
}