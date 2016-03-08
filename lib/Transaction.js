'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var pg = require('pg');

var Transaction = function () {
	function Transaction(db) {
		_classCallCheck(this, Transaction);

		if (!db) {
			throw new Error('db required');
		}
		this.db = db;
		this.queries = [{ queryString: 'BEGIN', result: 'none' }];
		this.results = [];
	}

	_createClass(Transaction, [{
		key: 'query',
		value: function query(queryString, values) {
			this.queries.push({ queryString: queryString, values: values });
			return this;
		}
	}, {
		key: 'queryOne',
		value: function queryOne(queryString, values) {
			this.queries.push({ queryString: queryString, values: values, result: 'one' });
			return this;
		}
	}, {
		key: 'commit',
		value: function commit() {
			var _this = this;

			this.queries.push({ queryString: 'COMMIT', result: 'none' });

			return this.db.connect().then(function (client) {
				return _this.queries.reduce(function (p, query) {
					query.result = query.result || 'many';
					return p.then(function () {
						return new Promise(function (resolve, reject) {
							if (!query.queryString) {
								return reject(new Error('query string required'));
							}
							client.query(query.queryString, query.values, function (err, result) {
								if (err) {
									return reject(err);
								}
								switch (query.result) {
									case 'many':
										_this.results.push(result);
										break;
									case 'one':
										_this.results.push(result.rows[0]);
										break;
								}
								return resolve(_this);
							});
						});
					});
				}, Promise.resolve()).then(function () {
					client.done();
					return _this.results;
				});
			});
		}
	}]);

	return Transaction;
}();

module.exports = Transaction;