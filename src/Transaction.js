'use strict';

let pg = require('pg');

class Transaction {
	constructor(db) {
		if (!db) { throw new Error('db required'); }
		this.db = db;
		this.queries = [{ queryString: 'BEGIN', result: 'none' }];
		this.results = [];
	}
	query(queryString, values) {
		this.queries.push({ queryString, values });
		return this;
	}
	queryOne(queryString, values) {
		this.queries.push({ queryString, values, result: 'one' });
		return this;
	}
	commit() {
		this.queries.push({ queryString: 'COMMIT', result: 'none' });

		return this.db.connect().then((client) => {
			return this.queries.reduce((p, query) => {
				query.result = query.result || 'many';
				return p.then(() => {
					return new Promise((resolve, reject) => {
						if (!query.queryString) { return reject(new Error('query string required')); }
						client.query(query.queryString, query.values, (err, result) => {
							if (err) { return reject(err); }
							switch(query.result) {
								case 'many':
									this.results.push(result);
									break;
								case 'one':
									this.results.push(result.rows[0]);
									break;
							}
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
