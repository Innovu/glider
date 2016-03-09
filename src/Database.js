'use strict';

let pg = require('pg'),
	Transaction = require('./Transaction');

class Database {
	constructor(conString) {
		if (!conString) { throw new Error('connection string required'); }
		this.conString = conString;
	}
	begin() {
		return new Transaction(this);
	}
	connect() {
		return new Promise((resolve, reject) => {
			if (!this.conString) { return reject(new Error('connection string required')); }
			pg.connect(this.conString, (err, client, done) => {
				if (err) { return reject(err); }
				client.done = done;
				return resolve(client);
			});
		});
	}
	query(query, values) {
		values = values || [];
		if (!query) { return Promise.reject(new Error('query required')); }

		return this.connect().then(function(client) {
			return new Promise(function(resolve, reject) {
				client.query(query, values, function(err, result) {
					client && client.done();
					if (err) { return reject(err); }
					return resolve(result);
				});
			});
		});
	}
}

module.exports = Database;
