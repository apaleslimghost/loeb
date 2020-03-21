import React from 'react'

export default ({ body, children, assets }) => (
	<html>
		<head>
			{assets
				.filter(asset => asset.endsWith('.css'))
				.map(asset => (
					<link key={asset} href={`/${asset}`} rel='stylesheet' />
				))}
		</head>
		<body {...(body ? {dangerouslySetInnerHTML: {__html: body}} : {children})} />
	</html>
)
