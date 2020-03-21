import React from 'react'
import MainLayout from './main.jsx'
import styles from './test.css'

export default ({ children, assets, body, page }) => (
	<MainLayout assets={assets}>
		<div className={styles.post}>
			<h1>{page.title}!!!</h1>

			<article {...(body ? {dangerouslySetInnerHTML: {__html: body}} : {children})} />
		</div>
	</MainLayout>
)
