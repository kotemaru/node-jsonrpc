# JSONRPC

## 概要

汎用JSONRPCサーバです。<br>
NodeJS+Express3 で構成されています。

## 起動方法

NodeJSをインストールして app.js を実行するだけです。

		> node.exe app.js

  * OSには依存しないはずです。

## 使い方

### JSONRPCメソッドの定義

apis/ のは以下に JS ファイルを置いて関数を定義します。

  * apis/add.js

		exports.add = function(params) {
			return params[0] + params[1];
		}

  * exports に設定するプロパティ名が JSONRPC のメソッド名になります。
  * 引数の params は JSONRPC の params がそのまま渡されます。
  * 戻り値は JSONRPC の result になります。
  * ユーザ毎の定義を行う場合にはJSファイルの定義場所を変えます。
    * apis/users/ユーザ名/add.js となります。
    * ユーザについては後述。
  * 関数スコープの this は以下の定義になります。
    * this.user: ログインユーザ名。未ログインはnull。
    * this.getApi(user,method): 他の関数を取得。
      * 例：this.getApi(null,"add")(params): デフォルトの add() の呼び出し。


### 呼び出し

HTTPの呼び出しシーケンスは以下となります。

		POST /apis HTTP/1.1
		Host: localhost:8000
		Content-type: application/json
		Content-length: ???

		{
			"jsonrpc": "2.0",
			"id": 3,
			"method": "add",
			"params": [10, 20]
		}

  * Content-typeは必須で、charsetはutf-8固定です。

応答シーケンスは以下となります。

		HTTP/1.1 200 OK
		Content-Type: application/json; charset=utf-8
		Content-Length: 88

		{
		  "id": 3,
		  "jsonrpc": "2.0",
		  "result": 30
		}

  * エラーの場合は "error" プロパティにメッセージが入ります。

#### バッチ呼び出し

バッチ呼び出しも可能です。

  * 呼び出し例

		[
		  {"jsonrpc": "2.0","id": 3,"method": "add","params": [3,4]},
		  {"jsonrpc": "2.0","id": 4,"method": "add","params": [8,9]}
		]

  * 応答例

		[
		  {"id": 3,"jsonrpc": "2.0","result": 7},
		  {"id": 4,"jsonrpc": "2.0","result": 17}
		]

### 関数定義の更新

サーバ上のJSファイルを直接編集か WebAPI で上書きすることができます。<br>
更新後、再読み込みの WebAPI を叩いて反映させます。

#### WebAPIでJSファイルの置き換え

JSファイルの置き換えるHTTPシーケンスは以下となります。

		PUT /apis/mul.js HTTP/1.1
		Host: localhost:8000
		Content-type: text/javascript
		Content-length: ???

		exports.mul = function(params) {
			return params[0] * params[1];
		}

  * Content-type: text/javascriptは必須です。charsetはutf-8固定です。
  * スクリプトは構文チェックされ、エラーがあると更新されません。

#### 再読み込み

更新したJSファイルの再読み込みは以下の WebAPI を叩きます。

		GET /apis/reload HTTP/1.1
		Host: localhost:8000

  * クエリパラメータに user と path が指定できます。
  * user は後述のユーザ名。
    * 指定されたユーザだけが対象となる。
    * 指定されない場合はデフォルトが対象となる。
  * path は再読み込み対象のJSファイルをglab形式(hoge/*.js)で指定します。

### ユーザ

リクエストの Cookie の user にユーザ名が定義されている場合、ログイン状態とみなします。<br>
ログイン状態では JSONRPC 呼び出しに置いてユーザ毎の定義を優先して使用します。<br>
ユーザ毎の定義がない場合にはデフォルトが使用されます。

ユーザ毎のJSONRPCメソッド関数の定義場所は以下となります。

  * apis/users/ユーザ名/*.js

#### ログイン

認証はしていないが以下の Set-Cookie を返すだけの WebAPI を用意している。

	GET /login?user=ユーザ名

	Set-Cookie: user=ユーザ名


# Tools

Created with [Nodeclipse v0.5](https://github.com/Nodeclipse/nodeclipse-1)
 ([Eclipse Marketplace](http://marketplace.eclipse.org/content/nodeclipse), [site](http://www.nodeclipse.org))
