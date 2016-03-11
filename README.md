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

### transactions

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
		console.log(results[0].command);
		console.log(results[1].rowCount);
		console.log(results[2].rowCount);
		console.log(results[3].rowCount);
		console.log(results[4].rows);
	});

	// output
	//   CREATE
	//   3
	//   1
	//   1
	//   [
	//     { id: 1, value: 99 },
	//     { id: 2, value: 2 }
	//   ]
```

or with the shorthand functions...

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
		console.log(results[0].command);
		console.log(results[1]);
		console.log(results[2]);
		console.log(results[3]);
		console.log(results[4]);
		console.log(results[5]);
		console.log(results[6]);
	});

	// output
	//
	//   CREATE
	//   3
	//   1
	//   1
	//   [
	//     { id: 1, value: 99 },
	//     { id: 2, value: 2 }
	//   ]
	//   { id: 1, value: 99 }
	//   99
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