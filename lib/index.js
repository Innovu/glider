'use strict';

var Database = require('./Database'),
    pg = require('pg');

var glider = module.exports = function (conString) {
	return new Database(conString);
};

glider.Database = Database;