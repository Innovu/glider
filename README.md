# glider [![Build Status](https://travis-ci.org/Innovu/glider.svg?branch=master)](https://travis-ci.org/Innovu/glider) [![Coverage Status](https://coveralls.io/repos/github/Innovu/glider/badge.svg?branch=master)](https://coveralls.io/github/Innovu/glider?branch=master) ![node.js >=0.12](https://img.shields.io/badge/node.js-%3E=0.12-brightgreen.svg)

Simple, expressive, Promise-based API for interacting with Postgres built on [node-postgres](https://github.com/brianc/node-postgres). Supports node.js 0.12+.

## Install

```
npm install --save glider
```

## API

* Transaction
	* begin()
	* commit()
	* query(queryString, values)
	* queryRows(queryString, values)
		* select(queryString, values)
		* selectOne(queryString, values)
	* queryCount(queryString, values)
		* insert(queryString, values)
		* update(queryString, values)
		* delete(queryString, values)

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