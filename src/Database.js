'use strict';

let api = require('./api'),
	pg = require('pg'),
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
}

api.methods.forEach(function(method) {
	Database.prototype[method.name] = function(queryString, values) {
		return this.connect().then(function(client) {
			return api.query(client, queryString, values, {
				close: true,
				result: method.result
			});
		});
	};
});

module.exports = Database;
