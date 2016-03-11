# glider [![Build Status](https://travis-ci.org/Innovu/glider.svg?branch=master)](https://travis-ci.org/Innovu/glider) [![Coverage Status](https://coveralls.io/repos/github/Innovu/glider/badge.svg?branch=master)](https://coveralls.io/github/Innovu/glider?branch=master) ![node.js >=0.12](https://img.shields.io/badge/node.js-%3E=0.12-brightgreen.svg)

Simple, expressive, Promise-based API for interacting with Postgres built on [node-postgres](https://github.com/brianc/node-postgres). Supports node.js 0.12+.

## Install

```
npm install --save glider
```

## Examples

### select queries

```js
var db = glider(CONNECTION_STRING);
db.query('select 1::integer as number').then(function(result) {
	return result.rows[0].number === 1; // true
});

db.select('select 1::integer as number').then(function(result) {
	return result[0].number === 1; // true
});

db.selectOne('select 1::integer as number').then(function(result) {
	return result.number === 1; // true
});

db.selectValue('select 1::integer as number').then(function(result) {
	return result === 1; // true
});
```

### insert/update/delete

```js
var db = glider(CONNECTION_STRING);
db.insert('insert into foo values (1, 2, 3), (3, 4, 5)').then(function(result) {
	return result.rowCount === 2 && result.command === 'INSERT'; // true
});

db.update('update foo set value = 1 where id = 1').then(function(result) {
	return result.rowCount === 1 && result.command === 'UPDATE'; // true
});

db.delete('delete from foo where id = 2').then(function(result) {
	return result.rowCount === 1 && result.command === 'DELETE'; // true
});
```

### transactions

If there's an error in any of the queries in a transaction, `glider` will automatically invoke a `ROLLBACK` and reject the current Promise with the database error.

```js
var db = glider(CONNECTION_STRING);
db
	.begin()
	.query('create table foo (id serial, value integer)')
	.query('insert into foo (value) values (1), (2), (3)')
	.query('update foo set value = 99 where id = 1')
	.query('delete from foo where id = 3')
	.query('select * from foo')
	.commit()
	.then(function(results) {
		console.log(results[0].command);  // CREATE
		console.log(results[1].rowCount); // 3
		console.log(results[2].rowCount); // 1
		console.log(results[3].rowCount); // 1
		console.log(results[4].rows);     // [ { id: 1, value: 99 }, { id: 2, value: 2 } ]
	});
```

or with `glider`'s specialized functions...

```js
var db = glider(CONNECTION_STRING);
db
	.begin()
	.query('create table foo (id serial, value integer)')
	.insert('insert into foo (value) values (1), (2), (3)')
	.update('update foo set value = 99 where id = 1')
	.delete('delete from foo where id = 3')
	.select('select * from foo')
	.selectOne('select value from foo where id = 1')
	.selectValue('select value from foo where id = 1')
	.commit()
	.then(function(results) {
		console.log(results[0].command); // CREATE
		console.log(results[1]);         // 3
		console.log(results[2]);         // 1
		console.log(results[3]);         // 1
		console.log(results[4]);         // [ { id: 1, value: 99 }, { id: 2, value: 2 } ]
		console.log(results[5]);         // { id: 1, value: 99 }
		console.log(results[6]);         // 99
	});
```

## Testing

### Prerequisites

* [vagrant](https://www.vagrantup.com/)
* [VirtualBox](https://www.virtualbox.org/wiki/Downloads)

### Run tests (mocha + should)

```
npm test
```

### Generate coverage report (istanbul)

Reports are generated in the `./coverage` folder. An HTML-based report can be loaded into the browser from `./coverage/lcov-report/index.html`.

```
npm run cover
```