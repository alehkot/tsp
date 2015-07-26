"use strict";

var express = require('express'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    errorHandler = require('error-handler'),
    morgan = require('morgan'),
    api = require('./routes/api'),
    http = require('http'),
    path = require('path'),
    fs = require('fs'),
    busboy = require('connect-busboy');
var session = require('express-session');
var app = module.exports = express();
var RedisStore = require('connect-redis')(session);

// Increase limits.
app.use(morgan('dev'));
app.use(methodOverride());

app.use(session({
    store: new RedisStore({
        host: '127.0.0.1',
        port: 6379,
        prefix: 'sess'
    }),
    secret: 'SEKR37',
    resave: true,
    saveUninitialized: false
}));

app.use(bodyParser({
    limit: '100mb',
    keepExtensions: true,
    uploadDir: path.join(__dirname, '/files')
}));

app.use(busboy());

app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.send(500, 'Something broke!');
});

// Support CORS
app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(express.static(__dirname + '/views'));

app.get('/api/generate', api.generate);
app.post('/api/calculate', api.calculate);
app.post('/api/plotToMatrix', api.plotToMatrix);
app.post('/api/parse', api.parse);
app.post('/api/reoptimize', api.reoptimize);

var server = app.listen(3000, function () {
    console.log('Listening on port %d', server.address().port);
});
