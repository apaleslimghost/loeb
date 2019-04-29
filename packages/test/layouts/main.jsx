import React from 'react'

export default ({children, assets}) => <html>
	<head>
		{assets.filter(({name}) => name.endsWith('.css')).map(
			asset => <link key={asset.name} href={`/${asset.name}`} rel='stylesheet' />
		)}
	</head>
	<body>
		{children}
	</body>
</html>