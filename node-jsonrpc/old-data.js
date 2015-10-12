/**
 * 旧ダミーショップデータ処理モジュール
 */


var TAG = "old-data:";

var Glob = require('glob');
var Path = require('path');
var FS = require('fs');

var OLD_DATA_DIR = __dirname + "/old-data/";


/**
 * 指定されたメソッドのJSONデータを読み込む。
 * <li>IDは必須。
 * @param method メソッド名
 * @param id  IDまたはIDの配列。
 * @returns JSONデータ。見つからない場合は undefined
 */
function loadData(method, id) {
	var dir = OLD_DATA_DIR + method + "/";
	var ids = Array.isArray(id) ? id : [ id ];
	for (var i = 0; i < ids.length; i++) {
		if (ids[i] == null) continue;
		var data = loadDataSub(dir + ids[i] + ".json");
		if (data != null) return data;
	}
	return undefined;
}

/**
 * 指定されたメソッドのデフォルトのJSONデータを読み込む。
 * @param method メソッド名
 * @returns JSONデータ。見つからない場合は undefined
 */
function loadDefaultData(method) {
	var dir = OLD_DATA_DIR + method + "/";
	return loadDataSub(dir + "default.json");
}

function loadDataSub(path) {
	try {
		if (!FS.existsSync(path)) return undefined;
		//var status = FS.accessSync(path);
		//if (!status.isFile()) return undefined;
		return JSON.parse(FS.readFileSync(path, 'utf8'));
	} catch (e) {
		console.error(TAG, path, e.toString());
		return undefined;
	}
}

function loadDataAsync(method, id, callback) {
	var dir = OLD_DATA_DIR + method + "/";
	loadDataAsyncSub(dir + id + ".json", function(err, data) {
		if (err) {
			loadDataAsyncSub(dir + "default.json", callback);
		} else {
			callback(null, data);
		}
	});
}

function loadDataAsyncSub(path, callback) {
	FS.readFile(path, 'utf8', function(err, stream) {
		if (err) return callback(err, null);
		try {
			callback(null, JSON.parse(stream));
		} catch (e) {
			callback(e, null);
		}
	});
}

exports.loadDataAsync = loadDataAsync;
exports.loadData = loadData;
exports.loadDefaultData = loadDefaultData;
