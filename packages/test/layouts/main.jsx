import React from 'react'

export default ({children, assets}) => <html>
	<head>
		{assets.filter(asset => asset.endsWith('.css')).map(
			asset => <link key={asset} href={`/${asset}`} rel='stylesheet' />
		)}
	</head>
	<body>
		{children}
	</body>
</html>