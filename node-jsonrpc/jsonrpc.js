/**
 * JSONRPC メインモジュール
 *
 *
 */
var TAG = "jsonrpc:";

var Glob = require('glob');
var Path = require('path');
var FS = require('fs');

/**
 * デフォルトのJSONPRC関数のマップ。key=メソッド名、value=関数
 */
var base_apis = {};
/**
 * ユーザ毎のJSONPRC関数のマップ。key=ユーザ名、value={key=メソッド名、value=関数}
 */
var user_apis = {};

/**
 * init()で指定されたディレクトリの保存用。
 */
var init_path = "";

/**
 * 指定されたユーザの関数マップを取得。
 *
 * @param user ユーザ名
 * @returns ユーザが見つからない場合はデフォルト。
 */
function getApis(user) {
	if (user) {
		if (user_apis[user] == null) user_apis[user] = {};
		return user_apis[user];
	}
	return base_apis;
}

/**
 * 指定されたユーザ・メソッド名の関数を取得。
 * <li>ユーザが見つからない場合はデフォルト。
 *
 * @param user ユーザ名
 * @param name メソッド名
 * @returns 見つからない場合はnull。
 */
function getApi(user, name) {
	if (user) {
		if (user_apis[user] == null) user_apis[user] = {};
		if (user_apis[user][name]) return user_apis[user][name];
	}
	return base_apis[name];
}

/**
 * 指定されたユーザの関数マップを初期化。
 *
 * @param user ユーザ名
 */
function clearApis(user) {
	console.log(TAG, 'clearApis', user);
	if (user) {
		user_apis[user] = {};
	} else {
		base_apis = {};
	}
}

/**
 * JSファイルを読み込んで関数をJSONPRCに登録する。
 * <li>exports にプロパティ名が JSONRPC のメソッド名となる。
 *
 * @param user ユーザ名
 * @param path 読み込むJSファイルのパス。glab形式。'hoge/*.js'
 * @param callback 結果関数 function(result={methods:[メソッド名],error:"エラーメッセージ"})
 */
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

/**
 * JSONRPC関数初期化処理。
 * <li>指定されたフォルダ配下の '*.js' を全て JSONRPC関数として登録する。
 * <li>指定されたフォルダ配下の 'users/＊/*.js' を全て JSONRPCのユーザ関数として登録する。
 *
 * @param path JSONRPC用の関数定義のルートフォルダ
 */
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

/**
 * JSファイル再読込ハンドラ
 * <li>指定されたJSファイルを読み込んでJSONRPC関数定義を上書きする。
 * <li>クエリ：?user=ユーザ名&path=読み込みパス
 * <li>user: 省略の場合はデフォルトを上書きする
 * <li>path: 省略の場合は init() で指定されたパスとなる。glab形式 'hoge/*.js'
 */
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

/**
 * JSONRPCハンドラー。
 * <li>リクエストボディを解析して JSONRPC を処理する。
 * <li>バッチリクエスト対応。
 * <li>ログインユーザは Cookie: user で判別。
 * <li>同期式なので並列処理できない。
 */
exports.handler = function handler(req, res) {
	var user = req.cookies.user;
	console.log(TAG, "handler", user);

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

/**
 * ログインハンドラ。
 * <li>クエリ：?user=ユーザ名
 * <li>user: ログインユーザ名
 * <li>認証とかしない。ユーザ名をそのままクッキーで返すだけ。
 */
exports.login = function(req, res) {
	res.status(302);
	res.set({
		Location : "http://localhost/path?status=1" // 1=ログイン, 2=ログアウト
	});
	res.cookie('user', req.query.user, {
		maxAge : 6000000
	});
	res.json({
		user : req.query.user
	});
};

/**
 * データ更新ハンドラ。
 * <li>クエリ：無し
 * <li>urlのパスのファイルをリクエストボディで置き換える。
 * <li>Content-type: text/* 以外では動作しない。
 * <li>text/javascript の場合は構文チェックを行う。
 */
exports.put = function(req, res) {
	var path = __dirname + req.path;
	var ctype = req.headers['content-type'];
	console.log(TAG, "PUT", path, ctype, "\n", req.rawBody);

	if (req.rawBody == null) {
		res.status(400);
		return res.json({
			error : "Not found body. Content-type:" + ctype
		});
	}

	if (ctype.lastIndexOf("text/javascript", 0) != 0) {
		try {
			eval("(function(){" + req.rawBody + "})()");
		} catch (err) {
			res.status(400);
			return res.json({
				error : "" + err,
			});
		}
	}
	try {
		FS.mkdirSync(Path.dirname(path));
	} catch (e) {
		// ignore.
	}
	FS.writeFile(path, req.rawBody, null, function(err) {
		console.log(TAG, "PUT", req.path);
		if (err) res.status(500);
		res.json({
			error : err
		});
	});
}

/**
 * text/* リクエストボディ処理ハンドラ。
 * <li>put() 用。
 * <li>Content-type:text/* の場合だけ req.rawBody にリクエストボディを詰める。
 * <li>charset は utf-8 のみ。
 */
exports.textBodyParser = function(req, res, next) {
	var ctype = req.headers['content-type'] || '';
	if (ctype.lastIndexOf("text/", 0) != 0) {
		next();
		return;
	}
	console.log(TAG, "textBodyParser");

	req.rawBody = "";
	req.on('data', function(chunk) {
		req.rawBody += chunk;
	});

	req.on('end', function() {
		next();
	});
}

// EOF
