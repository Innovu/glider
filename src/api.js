exports.query = function query(client, queryString, values, opts) {
	return new Promise(function(resolve, reject) {
		values = values || [];
		opts = opts || {};
		if (!queryString) { return reject(new Error('query string required')); }
		client.query(queryString, values, function(err, result) {
			if (err) {
				return client.query('ROLLBACK', function(rollbackErr) {
					client.done(rollbackErr);
					return reject(err);
				});
			}
			if (opts.close && client) { client.done(); }

			switch(opts.result) {
				case 'count':
					return resolve(result.rowCount);
				case 'rows':
					return resolve(result.rows);
				case 'one':
					return resolve(result.rows[0]);
				case 'value':
					return resolve(result.rows[0][result.fields[0].name]);
				case 'result':
					return resolve(result);
				default:
					return resolve();
			}
		});
	});
};

exports.methods = [
	{ name: 'query', result: 'result' },
	{ name: 'select', result: 'rows' },
	{ name: 'selectOne', result: 'one' },
	{ name: 'selectValue', result: 'value' },
	{ name: 'insert', result: 'count' },
	{ name: 'update', result: 'count' },
	{ name: 'delete', result: 'count' }
];