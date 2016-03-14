'use strict';

let api = require('./api'),
	pg = require('pg');

class Transaction {
	constructor(db) {
		if (!db) { throw new Error('db required'); }
		this.db = db;
		this.queries = [{ queryString: 'BEGIN', result: 'none' }];
		this.results = [];
	}
	commit() {
		this.queries.push({ queryString: 'COMMIT', result: 'none' });

		return this.db.connect().then((client) => {
			return this.queries.reduce((p, query) => {
				query.result = query.result || 'result';
				return p.then(() => {
					return api.query(client, query.queryString, query.values, {
						result: query.result
					}).then(result => {
						if (result) { this.results.push(result); }
					});
				});
			}, Promise.resolve()).then(() => {
				client.done();
				return this.results;
			});
		});
	}
}

api.methods.forEach(function(o) {
	Transaction.prototype[o.name] = function(queryString, values) {
		this.queries.push({ queryString, values, result: o.result });
		return this;
	};
});

module.exports = Transaction;
