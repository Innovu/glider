'use strict';

let Database = require('./Database'),
	pg = require('pg');

let glider = module.exports = function(conString) {
	return new Database(conString);
}

glider.Database = Database;
