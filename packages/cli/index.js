#!/usr/bin/env node

const loeb = require('@loeb/core')
const webpack = require('webpack')
const webpackMiddleware = require('webpack-dev-middleware')
const express = require('express')
const open = require('open')

const initLoeb = argv =>
	webpack({
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

require('yargs')
	.command('build', 'build the site', () => {}, argv => initLoeb(argv).run())
	.command(
		'watch',
		'watch and build the site',
		() => {},
		argv => initLoeb(argv).watch({}, () => {}),
	)
	.command(
		['serve', '$0'],
		'watch and serve the site',
		() => {},
		argv => {
			const compiler = initLoeb(argv)
			const app = express()
			app.use(
				webpackMiddleware(compiler, {
					logLevel: 'silent',
				}),
			)
			const server = app.listen(() => {
				const { port } = server.address()
				open(`http://localhost:${port}`)
			})
		},
	)
	.help().argv
