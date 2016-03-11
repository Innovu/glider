'use strict';

let api = require('./api'),
	Database = require('./Database'),
	pg = require('pg'),
	Transaction = require('./Transaction');

let glider = module.exports = function(conString) {
	return new Database(conString);
}

glider.Database = Database;
glider.Transaction = Transaction;
glider.api = api
