module.exports = function(content) {
	console.log(this.resourcePath)
	console.log(content, '\n\n\n')
	return content
}