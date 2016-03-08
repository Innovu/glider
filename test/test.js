var glider = require('..'),
	should = require('should');

var PORT = process.env.TRAVIS ? '5432' : '55432',
	CONSTRING = 'postgresql://postgres@localhost:' + PORT + '/postgres',
	DB = glider(CONSTRING);

it('creates a Database', function() {
	should.exist(DB);
	DB.should.be.an.instanceOf(glider.Database);
	DB.conString.should.equal(CONSTRING);
});

it('connects to a database', function() {
	return DB.connect().then(function(client) {
		client.done.should.be.a.Function();
		client.done();
	});
});

it('errors on connect error', function() {
	var db = glider('postgres://baduser@localhost:55432/postgres');
	return db.connect().then(
		shouldNotHappen,
		function(err) { ['28000', 'ECONNREFUSED'].should.containEql(err.code); }
	);
});

// it('executes basic select query', function() {
// 	return DB.query('select 1::int as number;').then(
// 		function(result) { result.rows[0].number.should.equal(1); }
// 	);
// });

// it('errors on bad query', function() {
// 	return DB.query('wtf;').then(
// 		shouldNotHappen,
// 		function(err) { err.message.should.containEql('syntax error'); }
// 	);
// });

it('executes transaction', function() {
	return DB
		.begin()
		.query('select 1::int as number')
		.query('select 2::int as number')
		.query('select 3::int as number')
		.commit()
		.then(function(results) {
			results[1].rows[0].number.should.equal(1);
			results[2].rows[0].number.should.equal(2);
			results[3].rows[0].number.should.equal(3);
		}) ;
});

// helpers
function shouldNotHappen() { should.not.exist(1); }
