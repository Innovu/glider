'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var api = require('./api'),
    pg = require('pg');

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
		key: 'commit',
		value: function commit() {
			var _this = this;

			this.queries.push({ queryString: 'COMMIT', result: 'none' });

			return this.db.connect().then(function (client) {
				return _this.queries.reduce(function (p, query) {
					query.result = query.result || 'result';
					return p.then(function () {
						return api.query(client, query.queryString, query.values, {
							result: query.result
						}).then(function (result) {
							if (result) {
								_this.results.push(result);
							}
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

api.methods.forEach(function (o) {
	Transaction.prototype[o.name] = function (queryString, values) {
		this.queries.push({ queryString: queryString, values: values, result: o.result });
		return this;
	};
});

module.exports = Transaction;