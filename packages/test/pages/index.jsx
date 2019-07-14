import React from 'react'

const context = require.context('./posts')
const pages = context.keys().map(context)

export { default as layout } from '../layouts/main.jsx'

export default () => (
	<ul>
		{pages.map(page => (
			<li key={page.slug}>
				<a href={page.slug}>{page.title}</a>
			</li>
		))}
	</ul>
)
