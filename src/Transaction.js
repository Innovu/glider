'use strict';

let pg = require('pg');

class Transaction {
	constructor(db) {
		if (!db) { throw new Error('db required'); }
		this.db = db;
		this.queries = [{ queryString: 'BEGIN' }];
		this.results = [];
	}
	query(queryString, values) {
		this.queries.push({ queryString, values });
		return this;
	}
	commit() {
		this.queries.push({ queryString: 'COMMIT' });

		return this.db.connect().then((client) => {
			return this.queries.reduce((p, query) => {
				return p.then(() => {
					return new Promise((resolve, reject) => {
						if (!query.queryString) { return reject(new Error('query string required')); }
						client.query(query.queryString, query.values, (err, result) => {
							if (err) { return reject(err); }
							this.results.push(result);
							return resolve(this);
						});
					});
				});
			}, Promise.resolve()).then(() => {
				client.done();
				return this.results;
			});
		});
	}
}

module.exports = Transaction;
