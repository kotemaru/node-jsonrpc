exports.sub = function(params) {
	return params[0] - params[1];
}
exports.add = function(params) {
	console.log("super", this.user, "add=", this.getApis(null).add(params));
	return {current:(params[0] + params[1] + 10000), old:this.getApis(null).add(params)};
}