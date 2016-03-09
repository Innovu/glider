'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var pg = require('pg'),
    Transaction = require('./Transaction');

var Database = function () {
	function Database(conString) {
		_classCallCheck(this, Database);

		if (!conString) {
			throw new Error('connection string required');
		}
		this.conString = conString;
	}

	_createClass(Database, [{
		key: 'begin',
		value: function begin() {
			return new Transaction(this);
		}
	}, {
		key: 'connect',
		value: function connect() {
			var _this = this;

			return new Promise(function (resolve, reject) {
				if (!_this.conString) {
					return reject(new Error('connection string required'));
				}
				pg.connect(_this.conString, function (err, client, done) {
					if (err) {
						return reject(err);
					}
					client.done = done;
					return resolve(client);
				});
			});
		}
	}, {
		key: 'query',
		value: function query(_query, values) {
			values = values || [];
			if (!_query) {
				return Promise.reject(new Error('query required'));
			}

			return this.connect().then(function (client) {
				return new Promise(function (resolve, reject) {
					client.query(_query, values, function (err, result) {
						client && client.done();
						if (err) {
							return reject(err);
						}
						return resolve(result);
					});
				});
			});
		}
	}]);

	return Database;
}();

module.exports = Database;