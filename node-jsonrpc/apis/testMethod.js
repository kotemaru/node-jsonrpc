var OldData = require('../old-data');

exports.testMethod = function testMethod(params) {
	var data = OldData.loadData(arguments.callee.name, params.id);
	if (data != null) return data;
	return OldData.loadDefaultData(arguments.callee.name);
}
