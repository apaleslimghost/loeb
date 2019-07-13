#!/usr/bin/env node

const loeb = require('@loeb/core')
const { argv } = require('yargs')
const webpack = require('webpack')

const compiler = webpack({
	plugins: [
		loeb({
			...argv,
			plugins: argv.plugins
				? argv.plugins.map(require)
				: [
						require('@loeb/mdx'),
						require('@loeb/react'),
						require('@loeb/images'),
						require('@loeb/css'),
				  ],
		}),
	],
})

compiler.run()
