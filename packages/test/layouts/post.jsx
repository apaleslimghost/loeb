import React from 'react'
import MainLayout from './main.jsx'
import styles from './test.css'

export default ({ children, assets, page }) => (
	<MainLayout assets={assets}>
		<div className={styles.post}>
			<h1>{page.title}!!!</h1>

			{children}
		</div>
	</MainLayout>
)
