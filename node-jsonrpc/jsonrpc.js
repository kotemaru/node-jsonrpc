var TAG = "jsonrpc:";

var Glob = require('glob');
var Path = require('path');

var base_apis = {};
var user_apis = {};
var init_path = "";

function getApis(user) {
	if (user) {
		if (user_apis[user] == null) user_apis[user] = {};
		return user_apis[user];
	}
	return base_apis;
}
function getApi(user, name) {
	if (user) {
		if (user_apis[user] == null) user_apis[user] = {};
		if (user_apis[user][name]) return user_apis[user][name];
	}
	return base_apis[name];
}
function clearApis(user) {
	console.log(TAG, 'clearApis', user);
	if (user) {
		user_apis[user] = {};
	} else {
		base_apis = {};
	}
}
function load(user, path, callback) {
	console.log(TAG, 'load', user, path);
	var apis = getApis(user);

	Glob(path, function(err, files) {
		var names = [];
		var file = null;
		try {
			for (var i = 0; i < files.length; i++) {
				file = files[i];
				delete require.cache[require.resolve(file)]
				var exports = require(file);
				for ( var name in exports) {
					console.log(TAG, 'load api: method=', name, 'on', user);
					apis[name] = exports[name];
					names.push(name);
				}
			}
			if (callback) callback({
				methods : names
			});
		} catch (err) {
			if (callback) callback({
				methods : names,
				error : file + ":" + err.toString()
			});
		}
	});
}

function handler(req, res) {
	var user = req.cookies.user;

	// var decoded = JSON.parse(buf);
	var decoded = req.body;
	var isBatch = Array.isArray(decoded);
	var requests = isBatch ? decoded : [ decoded ];
	var responses = [];

	for (var i = 0; i < requests.length; i++) {
		var request = requests[i];
		console.log(TAG, 'request user=', user, ":", JSON.stringify(request));
		var response = {
			id : request.id,
			jsonrpc : "2.0"
		};
		try {
			var api = getApi(user, request.method);
			if (api == null) {
				throw new Error("Unknown method:" + request.method + " on " + user);
			}
			var _this = {
				getApis : getApis,
				getApi : getApi,
				user : user
			};
			response.result = api.call(_this, request.params);
		} catch (err) {
			response.error = err.toString();
		}
		responses.push(response);
	}
	console.log(TAG, 'response ', JSON.stringify(isBatch ? responses : responses[0]));

	res.json(isBatch ? responses : responses[0]);
}

exports.handler = handler;
exports.getApi = getApi;
exports.getApis = getApis;

exports.reload = function(req, res) {
	var user = req.query.user;
	var path = req.query.path;
	var clear = req.query.clear;
	if (path == null) {
		path = init_path;
	} else {
		path = __dirname + "/" + path;
	}

	if (clear == "on") clearApis(user);
	load(user, path, function(result) {
		res.json(result);
	});
};

exports.init = function(path) {
	var callback = function(result) {
		if (result.error) {
			throw new Error(TAG + "Init error" + ":" + result.error);
		} else {
			console.log(TAG, "init:", JSON.stringify(result));
		}
	};

	init_path = __dirname + path + "/*.js";
	load(null, init_path, callback);
	Glob(__dirname + path + "/users/*", function(err, users) {
		for (var i = 0; i < users.length; i++) {
			var user = Path.basename(users[i]);
			load(user, users[i] + "/*.js", callback);
		}
	});
	return exports;
};

exports.login = function(req, res) {
	res.cookie('user', req.query.user, {
		maxAge : 6000000
	});
	res.json({
		user : req.query.user
	});
};
