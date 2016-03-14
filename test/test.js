var glider = require('..'),
	pg = require('pg'),
	should = require('should');

var api = glider.api,
	Database = glider.Database,
	Transaction = glider.Transaction;

var PORT = process.env.TRAVIS ? '5432' : '55432',
	CONSTRING = 'postgresql://postgres@localhost:' + PORT + '/postgres',
	TABLE_FOO = 'foo',
	DB = glider(CONSTRING);

describe('index', function() {

	it('exposes core classes', function() {
		Transaction.name.should.equal('Transaction');
		Database.name.should.equal('Database');
	});

	it('creates a Database', function() {
		should.exist(DB);
		DB.should.be.an.instanceOf(Database);
		DB.conString.should.equal(CONSTRING);
	});

});

describe('[Database]', function() {

	afterEach(function(done) {
		pgQuery('drop table if exists foo', done);
	});

	it('throws when #constructor is invoked without connection string', function() {
		(function() { new Database(); }).should.throw(/connection string required/);
	});

	it('rejects when #connect is invoked with no connection string', function() {
		var db = new Database('fakestring');
		db.conString = null;
		return db.connect().then(
			shouldNotHappen,
			function(err) { err.message.should.match(/connection string required/); }
		);
	});

	it('resolves when #connect makes a database connection', function() {
		return DB.connect().then(function(client) {
			client.done.should.be.a.Function();
			client.done();
		});
	});

	it('rejects on #connect error', function() {
		var db = glider('postgres://baduser@localhost:55432/postgres');
		return db.connect().then(
			shouldNotHappen,
			function(err) { ['28000', 'ECONNREFUSED'].should.containEql(err.code); }
		);
	});

	api.methods.forEach(function(method) {
		it('rejects on #' + method.name + ' with no query string', function() {
			return DB[method.name]().then(
				shouldNotHappen,
				function(err) { err.message.should.match(/query string required/); }
			);
		});

		it('rejects #' + method.name + ' on bad query', function() {
			return DB[method.name]('wtf;').then(
				shouldNotHappen,
				function(err) { err.message.should.containEql('syntax error'); }
			);
		});
	});

	it('resolves on create/insert/update/select/delete via #query', function() {
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

	it('resolves on #insert/#update/#select/#selectOne/#selectValue/#delete', function() {
		return DB.query('create table ' + TABLE_FOO + ' (id serial, bar varchar(10))')
			.then(function(result) {
				result.command.should.equal('CREATE');
				return DB.insert('insert into ' + TABLE_FOO + ' (bar) values ($1), ($2), ($3)', ['sanders', 'trump', 'cruz']);
			})
			.then(function(result) {
				result.should.equal(3);
				return DB.update('update ' + TABLE_FOO + ' set bar = $1 where bar = $2', ['clinton', 'sanders']);
			})
			.then(function(result) {
				result.should.equal(1);
				return DB.select('select * from ' + TABLE_FOO);
			})
			.then(function(result) {
				result.should.have.length(3);
				result.forEach(function(row) { row.should.have.properties(['id', 'bar']); });
				return DB.delete('delete from ' + TABLE_FOO + ' where bar != $1', ['trump']);
			})
			.then(function(result) {
				result.should.equal(2);
				return DB.one('select * from ' + TABLE_FOO + ' where id = 2');
			})
			.then(function(result) {
				result.should.have.properties({
					id: 2,
					bar: 'trump'
				});
				return DB.value('select bar from ' + TABLE_FOO + ' where id = 2');
			})
			.then(function(result) {
				result.should.equal('trump');
			});
	});

});

describe('[Transaction]', function() {

	afterEach(function() {
		return DB.query('drop table if exists foo');
	});

	it('throws when constructor is invoked without a db connection', function() {
		(function() { new Transaction(); }).should.throw(/db required/);
	});

	it('resolves results via #query for create/select/insert/update/delete', function() {
		return DB
			.begin()
			.query('create table foo (id serial, value integer)')
			.query('insert into foo (value) values ($1), ($2), ($3)', [1, 2, 3])
			.query('select * from foo order by id asc')
			.query('update foo set value = 0 where id = 2')
			.query('delete from foo where id = 1')
			.query('select * from foo order by id asc')
			.commit()
			.then(function(results) {
				results.should.have.length(6);

				results[0].command.should.equal('CREATE');

				results[1].command.should.equal('INSERT');
				results[1].rowCount.should.equal(3);

				results[2].command.should.equal('SELECT');
				results[2].rowCount.should.equal(3);
				results[2].rows[0].value.should.equal(1);
				results[2].rows[1].value.should.equal(2);
				results[2].rows[2].value.should.equal(3);

				results[3].command.should.equal('UPDATE');
				results[3].rowCount.should.equal(1);

				results[4].command.should.equal('DELETE');
				results[4].rowCount.should.equal(1);

				results[5].command.should.equal('SELECT');
				results[5].rowCount.should.equal(2);
				results[5].rows[0].value.should.equal(0);
				results[5].rows[1].value.should.equal(3);
			});
	});

	it('resolves results via #select/#selectOne/#update/#insert/#delete', function() {
		return DB
			.begin()
			.query('create table foo (id serial, value integer)')
			.insert('insert into foo (value) values ($1), ($2), ($3)', [1, 2, 3])
			.select('select * from foo order by id asc')
			.update('update foo set value = 0 where id = 2')
			.delete('delete from foo where id = 1')
			.select('select * from foo order by id asc')
			.one('select * from foo where value = 0')
			.value('select value from foo where id = 3')
			.commit()
			.then(function(results) {
				results.should.have.length(8);

				results[0].command.should.equal('CREATE');

				results[1].should.equal(3);

				results[2].should.have.length(3);
				results[2][0].value.should.equal(1);
				results[2][1].value.should.equal(2);
				results[2][2].value.should.equal(3);

				results[3].should.equal(1);

				results[4].should.equal(1);

				results[5].should.have.length(2);
				results[5][0].value.should.equal(0);
				results[5][1].value.should.equal(3);

				results[6].id.should.equal(2);

				results[7].should.equal(3);
			});
	});

	it('rejects on transaction error', function() {
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

	it('rejects on missing query string', function() {
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

	it('rejects and rollbacks on error', function() {
		return DB
			.begin()
			.query('create table foo (id serial, name varchar(10), age integer)')
			.query('insert into foo (name, age) values ($1, $2)', ['insert1', 123])
			.query('wtf;')
			.query('insert into foo (name, age) values ($1, $2)', ['insert2', 456])
			.commit()
			.then(shouldNotHappen, function(err) {
				err.message.should.match(/syntax error.+wtf/);
				return DB.query('select exists(select 1 from pg_catalog.pg_class where relname = $1) as hasfoo', ['foo']);
			})
			.then(function(result) {
				result.rows[0].hasfoo.should.equal(false);
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
