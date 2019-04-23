const {Asset} = require('parcel-bundler')
const mdx = require('@mdx-js/mdx')
const path = require('path')

class MDXAsset extends Asset {
	constructor(name, pkg, options) {
		super(name, pkg, options)
		this.type = 'js'
	}

	async generate() {
		const config = await this.getConfig(
			['.mdxrc', 'mdx.config.js', 'package.json'],
			{packageKey: 'mdx'}
		)
		const compiled = mdx.sync(this.contents, config)
		const fullCode = `/* @jsx mdx */
import { React, mdx } from '@loeb/mdx/alias' // from 'react'
${compiled}
`

		return [
			{
				type: 'js',
				value: fullCode,
				sourceMap: undefined
			}
		]
	}
}

module.exports = MDXAsset
