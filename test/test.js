var glider = require('..'),
	pg = require('pg'),
	should = require('should');

var PORT = process.env.TRAVIS ? '5432' : '55432',
	CONSTRING = 'postgresql://postgres@localhost:' + PORT + '/postgres',
	TABLE = 'glider_test',
	DB = glider(CONSTRING),
	DATA = [
		{ name: 'Tony', age: 35 },
		{ name: 'Brian', age: 45 },
		{ name: 'Eli', age: 55 },
		{ name: 'Brandon', age: 65 },
		{ name: 'Gabriel', age: 75 },
		{ name: 'Mahen', age: 75 }
	];

before(function(done) {
	var query =
		'drop table if exists ' + TABLE + '; ' +
		'create table ' + TABLE + '(id serial, name varchar(10), age integer);' +
		'insert into ' + TABLE + ' (name, age) values ' +
		DATA.map(function(d) { return '(\'' + d.name + '\',' + d.age + ')'; }).join(',') + ';';

	pgQuery(query, done);
});

describe('index', function() {

	it('exposes core classes', function() {
		glider.Transaction.name.should.equal('Transaction');
		glider.Database.name.should.equal('Database');
	});

	it('creates a Database', function() {
		should.exist(DB);
		DB.should.be.an.instanceOf(glider.Database);
		DB.conString.should.equal(CONSTRING);
	});

});

describe('[Database]', function() {

	var TABLE_FOO = 'foo';

	after(function(done) {
		pgQuery('drop table ' + TABLE_FOO, done);
	});

	it('throws when constructor is invoked without connection string', function() {
		(function() { new glider.Database(); }).should.throw(/connection string required/);
	});

	it('rejects when connect() is invoked with no connection string', function() {
		var db = new glider.Database('fakestring');
		db.conString = null;
		return db.connect().then(
			shouldNotHappen,
			function(err) { err.message.should.match(/connection string required/); }
		);
	});

	it('resolves a database connection', function() {
		return DB.connect().then(function(client) {
			client.done.should.be.a.Function();
			client.done();
		});
	});

	it('rejects on connect error', function() {
		var db = glider('postgres://baduser@localhost:55432/postgres');
		return db.connect().then(
			shouldNotHappen,
			function(err) { ['28000', 'ECONNREFUSED'].should.containEql(err.code); }
		);
	});

	it('rejects on query with no query string', function() {
		return DB.query().then(
			shouldNotHappen,
			function(err) { err.message.should.match(/query required/); }
		);
	});

	it('resolves basic select query', function() {
		return DB.query('select 1::int as number;').then(
			function(result) {
				result.rowCount.should.equal(1);
				result.rows[0].number.should.equal(1);
			}
		);
	});

	it('rejects on bad query', function() {
		return DB.query('wtf;').then(
			shouldNotHappen,
			function(err) { err.message.should.containEql('syntax error'); }
		);
	});

	it('resolves with test data', function() {
		return DB.query('select * from ' + TABLE).then(function(result) {
			result.rowCount.should.equal(DATA.length);
			DATA.forEach(function(data, index) {
				result.rows[index].should.have.properties(data);
			});
		});
	});

	it('resolves on create/insert/update/select/delete', function() {
		return DB.query('create table ' + TABLE_FOO + ' (id serial, bar varchar(10))')
			.then(function(result) {
				result.command.should.equal('CREATE');
				return DB.query('insert into ' + TABLE_FOO + ' (bar) values ($1), ($2), ($3)', ['sanders', 'trump', 'cruz']);
			})
			.then(function(result) {
				result.command.should.equal('INSERT');
				result.rowCount.should.equal(3);
				return DB.query('update ' + TABLE_FOO + ' set bar = $1 where bar = $2', ['clinton', 'sanders']);
			})
			.then(function(result) {
				result.command.should.equal('UPDATE');
				result.rowCount.should.equal(1);
				return DB.query('select * from ' + TABLE_FOO);
			})
			.then(function(result) {
				result.command.should.equal('SELECT');
				result.rowCount.should.equal(3);
				result.fields.should.have.length(2);
				result.fields.forEach(function(field) { ['id', 'bar'].should.containEql(field.name); });
				return DB.query('delete from ' + TABLE_FOO + ' where bar != $1', ['trump']);
			})
			.then(function(result) {
				result.command.should.equal('DELETE');
				result.rowCount.should.equal(2);
				return DB.query('select * from ' + TABLE_FOO);
			})
			.then(function(result) {
				result.command.should.equal('SELECT');
				result.rowCount.should.equal(1);
				result.rows[0].bar.should.equal('trump');
			});
	});

});

describe('[Transaction]', function() {

	it('throws when constructor is invoked without a db connection', function() {
		(function() { new glider.Transaction(); }).should.throw(/db required/);
	});

	it('resolves a series of select queries', function() {
		return DB
			.begin()
			.query('select 1::int as number')
			.query('select $1::int as number', ['2'])
			.queryOne('select 3::int as number')
			.commit()
			.then(function(results) {
				results[0].rows[0].number.should.equal(1);
				results[1].rows[0].number.should.equal(2);
				results[2].number.should.equal(3);
			});
	});

	it('rejects on missing query string', function() {
		return DB
			.begin()
			.query('select 1::int as number')
			.query('wtf')
			.query('select 2::int as number')
			.commit()
			.then(
				function() { shouldNotHappen(); },
				function(err) { err.message.should.match(/syntax error.+wtf/); }
			);
	});

	it('rejects on transaction error', function() {
		return DB
			.begin()
			.query('select 1::int as number')
			.query()
			.query('select 2::int as number')
			.commit()
			.then(
				function() { shouldNotHappen(); },
				function(err) { err.message.should.match(/query string required/); }
			);
	});

	it('resolves with test data', function() {
		return DB
			.begin()
			.query('select * from ' + TABLE)
			.commit()
			.then(function(results) {
				results.should.have.length(1);
				results[0].rowCount.should.equal(DATA.length);
				DATA.forEach(function(data, index) {
					results[0].rows[index].should.have.properties(data);
				});
			});
	});

	it('resolves on insert and select', function() {
		return DB
			.begin()
			.query('insert into ' + TABLE + ' (name, age) values ($1, $2)', ['rubio', 44])
			.queryOne('select * from ' + TABLE + ' where id = lastval()')
			.commit()
			.then(function(results) {
				results.should.have.length(2);
				results[0].rowCount.should.equal(1);
				results[1].name.should.equal('rubio');
				results[1].age.should.equal(44);
			});
	});

	it('rejects and rollbacks on error', function() {
		return DB
			.begin()
			.query('insert into ' + TABLE + ' (name, age) values ($1, $2)', ['insert1', 123])
			.query('wtf;')
			.query('insert into ' + TABLE + ' (name, age) values ($1, $2)', ['insert2', 456])
			.commit()
			.then(shouldNotHappen, function(err) {
				err.message.should.match(/syntax error.+wtf/);
				return DB.query('select * from ' + TABLE + ' where name in ($1, $2)', ['insert1', 'insert2'])
			})
			.then(function(result) {
				result.rowCount.should.equal(0);
			});
	});

});

// helpers
function shouldNotHappen() { should.not.exist('this should not happen'); }

function pgQuery(query, values, callback) {
	callback = arguments[arguments.length - 1];
	values = values || [];
	pg.connect(CONSTRING, function(err, client, done) {
		if (err) { return callback(err); }
		client.query(query, values, function(err) {
			if (err) { return callback(err); }
			done();
			return callback();
		});
	});
}
