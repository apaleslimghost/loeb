import React from 'react'
import styles from './test.css'

export default ({children, title}) => <div className={styles.post}>
	<h1>{title}!!!</h1>

	{children}
</div>