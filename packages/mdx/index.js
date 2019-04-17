const React = require('react')
const {renderToStaticNodeStream} = require('react-dom/server')

exports.type = 'mdx'
exports.parcel = bundler => bundler.addAssetType('mdx', require.resolve('./asset')),
exports.output = Component => renderToStaticNodeStream(React.createElement(Component))
