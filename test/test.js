'use strict';

let glider = require('..'),
	should = require('should');

const PORT = process.env.TRAVIS ? '5432' : '55432',
	CONSTRING = `postgresql://postgres@localhost:${PORT}/postgres`,
	DB = glider(CONSTRING);

it('creates a Database', function() {
	should.exist(DB);
	DB.should.be.an.instanceOf(glider.Database);
	DB.conString.should.equal(CONSTRING);
});

it('connects to a database', function() {
	return DB.connect().then(client => client.done());
});

it('errors on connect error', function() {
	let db = glider('postgres://baduser@localhost:55432/postgres');
	return db.connect().then(
		() => should.not.exist(1),
		err => err.code.should.equal('28000')
	);
});

it('executes basic select query', function() {
	return DB.query('select 1::int as number;')
		.then(result => result.rows[0].number.should.equal(1));
});

it('errors on bad query', function() {
	return DB.query('wtf;').then(
		() => should.not.exist(1),
		err => err.message.should.containEql('syntax error')
	);
});
