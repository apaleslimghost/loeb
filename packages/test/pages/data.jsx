import React from 'react'
import fs from 'fs'
import path from 'path'

export { default as layout } from '../layouts/main.jsx'

const context = require.context('../assets')
const assets = context.keys().map(context)

export default assets.map(asset => ({
	slug: `/assets/${path.basename(asset).match(/^(.+?)\./)[1]}`,
	getData: async () => ({ title: 'hello' }),
	render: ({ title }) => (
		<>
			<h2>{title}</h2> <img src={asset} />
		</>
	),
}))
