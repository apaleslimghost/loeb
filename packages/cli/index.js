#!/usr/bin/env node

const loeb = require('@loeb/core')
const {argv} = require('yargs')

loeb({
	...argv,
	plugins: argv.plugins ? argv.plugins.map(require) : [
		require('@loeb/mdx'),
		require('@loeb/react'),
	]
})