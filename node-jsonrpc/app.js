/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var jsonrpc = require('./jsonrpc').init('/apis');

var app = express();

// all environments
app.set('port', process.env.PORT || 8000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(jsonrpc.textBodyParser);
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}

// JSONRPC settings
app.post('/apis', jsonrpc.handler);
app.get('/login', jsonrpc.login);
app.get('/apis/reload', jsonrpc.reload);
app.put('/apis/users/**', jsonrpc.put);

http.createServer(app).listen(app.get('port'), function() {
	console.log('Express server listening on port ' + app.get('port'));
});
