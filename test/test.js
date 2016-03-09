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
		'DROP TABLE IF EXISTS ' + TABLE + '; ' +
		'CREATE TABLE ' + TABLE + '(id SERIAL, name VARCHAR(10), age INTEGER);' +
		'INSERT INTO ' + TABLE + ' (name, age) VALUES ' +
		DATA.map(function(d) { return '(\'' + d.name + '\',' + d.age + ')'; }).join(',') + ';';

	// do this with pg, not glider
	pg.connect(CONSTRING, function(err, client, release) {
		if (err) { return done(err); }
		client.query(query, function(err) {
			if (err) { return done(err); }
			release();
			return done();
		});
	});
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

});

describe('[Transaction]', function() {

	it('throws when constructor is invoked without a db connection', function() {
		(function() { new glider.Transaction(); }).should.throw(/db required/);
	});

	it('resolves a series of SELECT queries', function() {
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
			}) ;
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

});

// helpers
function shouldNotHappen() { should.not.exist('this should not happen'); }
