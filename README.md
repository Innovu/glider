> **NOT YET FUNCTIONAL**

# glider [![Build Status](https://travis-ci.org/Innovu/glider.svg?branch=master)](https://travis-ci.org/Innovu/glider) [![Coverage Status](https://coveralls.io/repos/github/Innovu/glider/badge.svg?branch=master)](https://coveralls.io/github/Innovu/glider?branch=master) ![node.js >=0.12](https://img.shields.io/badge/node.js-%3E=0.12-brightgreen.svg)

Simple, expressive, Promise-based API for interacting with Postgres built on [node-postgres](https://github.com/brianc/node-postgres). Supports node.js 0.12+.

## Table of Contents

* [Install](#install)
* [Usage](#usage)
	* [create a Database object](#create-a-database-object)
	* [basic queries](#basic-queries)
	* [getting data from queries (SELECT)](#getting-data-from-queries-select)
	* [row count queries (INSERT/UPDATE/DELETE)](#row-count-queries-insertupdatedelete)
	* [postgres commands](#postgres-commands)
	* [transactions](#transactions)
* [Testing](#testing)

## Install

```
npm install --save glider
```

## Usage

### create a Database object

The `Database` object is the core for most of the API. All you need to do is provide a connection string or [client configuration object](https://github.com/brianc/node-postgres/wiki/Client#parameters), just like in node-postgres with [pg.connect](https://github.com/brianc/node-postgres/wiki/pg#connectstring-connectionstring-function-callback).

```js
var db = glider(postgresql://postgres@localhost:5432/postgres);

// or...

var db = glider({
	user: 'user',
	password: 'password',
	database: 'postgres',
	host: 'localhost'
});
```

### basic queries

The mechanics of the basic query is identical to node-postgres, except that instead of providing a callback, `glider` returns a Promise.

```js
var db = glider(CONNECTION_STRING);

// "result" is a node-postgres result object
db.query('select $1::integer as number', [1]).then(function(result) {
	return result.command === 'SELECT' && result.rows[0].number === 1; // true
});
```

### getting data from queries (SELECT)

The following functions allow you to grab rows, a single row, or even a single value.

```js
var db = glider(CONNECTION_STRING);

// array of rows
db.select('select 1::integer as number').then(function(rows) {
	return rows[0].number === 1; // true
});

// single row
db.one('select 1::integer as number').then(function(row) {
	return row.number === 1; // true
});

// single value
db.value('select 1::integer as number').then(function(value) {
	return value === 1; // true
});
```

### row count queries (INSERT/UPDATE/DELETE)

In the instance where you are doing non-returning queries that have a row count, like insert/update/delete, `glider` has functions that will instead return the row count. This is a matter of convenience. If you need the full result object, use `db.query()`.

The functions are functionally identical to each other, but allow the actual operation to be more expressive, which becomes extremely useful once you start using `glider`'s [transactions](#transactions).

```js
var db = glider(CONNECTION_STRING);

db.query('insert into foo values (1, 2, 3), (3, 4, 5)').then(function(result) {
	return result.rowCount === 2 && result.command === 'INSERT'; // true
});

db.insert('insert into foo values (1, 2, 3), (3, 4, 5)').then(function(count) {
	return count === 2; // true
});

db.update('update foo set value = 1 where id = 1').then(function(count) {
	return count === 1; // true
});

db.delete('delete from foo where id = 2').then(function(count) {
	return count === 1; // true
});
```

### postgres commands

You can also execute [postgres commands](http://www.postgresql.org/docs/9.1/static/sql-commands.html) or any query you don't need a result for with `command()`. So whether you're invoking a `CREATE` or `ALTER` or just calling an insert/update/delete for which you don't need a result, use `command()`.

```js
var db = glider(CONNECTION_STRING);

db.command('create table foo (id serial, value integer)').then(function(result) {
	return !result; // true
});

db.command('insert into foo (value) values (1), (2)').then(function(result) {
	return !result; // true
});
```

### transactions

`glider` has a unique chaining API that allows you to string together a series of queries in a very clear, expressive manner. All connection pooling, result gathering, error handling, etc... is handled internally and a Promise is returned.

If there's an error in any of the queries in a transaction, `glider` will automatically invoke a `ROLLBACK` and reject the current Promise with the database error.

```js
var db = glider(CONNECTION_STRING);
db
	.begin()
	.command('create table foo (id serial, value integer)')
	.insert('insert into foo (value) values ($1), ($2), ($3)', [1, 2, 3])
	.update('update foo set value = 99 where id = 1')
	.delete('delete from foo where id = 3')
	.select('select * from foo')
	.one('select value from foo where id = 1')
	.value('select value from foo where id = 1')
	.commit()
	.then(function(results) {
		console.log(results[0]);         // undefined
		console.log(results[1]);         // 3
		console.log(results[2]);         // 1
		console.log(results[3]);         // 1
		console.log(results[4]);         // [ { id: 1, value: 99 }, { id: 2, value: 2 } ]
		console.log(results[5]);         // { id: 1, value: 99 }
		console.log(results[6]);         // 99
	});
```

or a similar example of returning `node-postgres`'s result objects...

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

and since the session is handled internally by `glider`, you can make use of postgres's [sequence manipulation functions](http://www.postgresql.org/docs/9.4/static/functions-sequence.html), like in this trivial example...

```js
var db = glider(CONNECTION_STRING);
db
	.begin()
	.query('create table foo (id serial, value integer)')
	.insert('insert into foo (value) values (999)')
	.one('select value from foo where id = lastval()')
	.commit()
	.then(function(value) {
		console.log(value); // 999
	});
```

## Testing

To test, install the prerequisites, run `npm test`, and vagrant will take care of spinning up a headless VM with a local postgres instance. All tests will be run against this instance. The vagrant VM will continue running after the tests complete to make subsequent test runs instant. You can shut down the VM at any time by running `vagrant halt`, or remove the VM entirely with `vagrant destroy`.

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