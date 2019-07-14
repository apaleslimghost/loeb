#!/usr/bin/env node

const loeb = require('@loeb/core')
const webpack = require('webpack')
const webpackMiddleware = require('webpack-dev-middleware')
const express = require('express')
const colours = require('ansi-colors')
const open = require('open')

const { dependencies } = require('./package.json')
const defaultPlugins = Object.keys(dependencies).filter(
	dependency => dependency.startsWith('@loeb/') && dependency !== '@loeb/core',
)

const initLoeb = argv =>
	webpack({
		plugins: [
			loeb({
				...argv,
				plugins: (argv.plugins || defaultPlugins).map(require),
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
			const compiler = initLoeb({ ...argv, isStatic: false })
			const app = express()
			app.use(
				webpackMiddleware(compiler, {
					logLevel: 'silent',
				}),
			)
			const server = app.listen(argv.port, () => {
				const { port } = server.address()
				const url = `http://localhost:${port}`
				console.log(
					` ${colours.magenta('ö')} listening at ${colours.blue.underline(
						url,
					)}`,
				)
				open(url)
			})
		},
	)
	.help().argv
