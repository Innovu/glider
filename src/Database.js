'use strict';

let pg = require('pg');

class Database {
	constructor(conString) {
		if (!conString) { throw new Error('connection string required'); }
		this.conString = conString;
	}
	begin() {
		// shfkldsjfkl
		return new Transaction();
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
	query(query) {
		return this.connect().then(function(client) {
			return new Promise(function(resolve, reject) {
				client.query(query, function(err, result) {
					client && client.done();
					if (err) { return reject(err); }
					return resolve(result);
				});
			});
		});
	}
}

module.exports = Database;
