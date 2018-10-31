# ext-mysql
Extended use of mysql2.

[![npm][npm]][npm-url]
[![dependencies][dependencies]][dependencies-url]
[![appveyor][appveyor]][appveyor-url]

## Install
```bash
npm i --save ext-mysql
```

## Usage
A wrapper for mysql2 connections.
```javascript
const MySQL = require('ext-mysql');

// Create a pool for connections using the default way. 
// Or, you can set one `MySQL.POOL = myMysql2CreatedPool;`
MySQL.CREATE_POOL({
  host: 'localhost',
  user: 'root',
  database: 'test',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});



// You can set a logger for your connections.
// Each query you request calls logger.
MySQL.LOGGER = console.info;

// Create a instance.
var conn = new MySQL();

// Here it calls POOL.getConnection().
// Set ENCODE from process.env.ENCODE
await conn.init();

// Just like you'd do without it, plus, you have log
const [rows, fields] = await conn.execute( 'select * from table where id = ?', [10] );
console.log( rows )
```

### Insert
You should (but not required) begin, set success and end a transaction. This is the following way of doing that.
```javascript
try
{
  // Start a transaction.
  await conn.beginTransaction();

  // Insert using array, plus, log
  var [rawResults, ids] = await conn.insert( 'table', [{ name:"John", age:27 }, { name:"Mary", age:25 }] );
  console.log( ids );// [1, 2]

  // All good
  await conn.setTransactionSuccessful();
}
catch( err )
{
  // In case of error, show it.
  console.error( err );
}
finally
{
  // In success or error, we end it making commit or rollback.
  await conn.endTransaction();
}
```

### Transaction 
Based on the idea of [SQLiteDatabase][SQLiteDatabase]. You can nest your transaction. Calling `beginTransaction` many times you want, but you have to call the same amount `setTransactionSuccessful` and `endTransaction` in order to commit or rollback.
```javascript
conn.beginTransaction();// addPerson();
// ...
  conn.beginTransaction();// setGoods();
  // ...
    conn.beginTransaction();// setGoodsAddresses();
    conn.setTransactionSuccessful();
    conn.endTransaction();
  // ...
  conn.setTransactionSuccessful();
  conn.endTransaction();
//...
conn.setTransactionSuccessful();
conn.endTransaction();
```
**A transaction ended without calling `setTransactionSuccessful` will trigger and error and rollout all your changes.**

### Update
```javascript
// UPDATE table SET father_id = 123 WHERE name = "John" AND age = 27
var rawResult = await conn.update( 'table', { father_id:123 }, { name:"John", age:27 } );
console.log( rawResult.affectedRows );
```

### Delete
```javascript
// This will run two delete queries, first matching John and second, Mary
conn.delete( 'table', [{name:John}, {name:Mary}] );
```

### Custom values
You may need custom set of value for an insert or update, even a delete.
```javascript
// UPDATE table SET balance = balance + 10 WHERE cost >= 100
conn.update( 'table', [{balance:["balance + ?", 10}, {cost:[">= ?", 100]] );
```

### Release connection
After your use you must release your connection.
```javascript
conn.release();
```

### Select with array group
Select and build arrays (when you do joins). 
Consider the columns`_category_id`, `_category_name`. The rows will be grouped to a column-array (ex: `category[{id:X, name:Y}]`).

```javascript
conn.selectWithArray( 
  sql, values,
  'id', // groupBy - The column name used to find a new row (`id`)
  { category:["id", "name"] } // columns - A list of the columns to build `{ "categories":["id", "name"] }`. The first array`s item will to group it (No duplicated items).
  );
```
Result (example):
```bash
[
  { 
    id:1, 
    category:
    [
      { id:1, name:"cat 1" },
      { id:2, name:"cat 2" },
      { id:3, name:"cat 3" }
    ],
    "_category_id": 1,
    "_category_name": "cat 1"
  },
  { 
    id:2, 
    category:[
    {
      id:6,
      name:"cat 6"
    }],
    "_category_id": 6,
    "_category_name": "cat 6"
  }
]
```

[SQLiteDatabase]: https://github.com/aosp-mirror/platform_frameworks_base/blob/master/core/java/android/database/sqlite/SQLiteDatabase.java

[npm]: https://badge.fury.io/js/ext-mysql.svg
[npm-url]: https://npmjs.com/package/ext-mysql

[npm]: https://img.shields.io/npm/v/ext-mysql.svg
[npm-url]: https://npmjs.com/package/ext-mysql

[dependencies]: https://david-dm.org/webdefault/ext-mysql.svg
[dependencies-url]: https://david-dm.org/webdefault/ext-mysql

[appveyor]: https://ci.appveyor.com/api/projects/status/iknarxax2kwvaflj?svg=true
[appveyor-url]:https://ci.appveyor.com/project/orlleite/ext-mysql/branch/master

