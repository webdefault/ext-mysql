const MySQL = require('./');

test('Create POOL', async () => 
{
	process.env.ENCODE = "utf8";
	process.env.MYSQL_HOSTNAME = "localhost";
	process.env.MYSQL_USER = "root";
	if( !process.env.MYSQL_PASSWORD == null ) 
		process.env.MYSQL_PASSWORD = "Password12!";
	process.env.MYSQL_DATABASE = "test";

	MySQL.CREATE_POOL();
	// MySQL.LOGGER = console.log;
});

test('Create MySQL object', async function() 
{
	expect( conn = new MySQL() ).not.toBeNull();
});


test('Init db connection', async () => 
{
	expect( await conn.init() ).not.toBeNull();
});

test('Selection', async () => 
{
	const [rows, fields] = await conn.execute( "SELECT 1 + 3 as r1, ? as r2", [10] );
	expect( rows.length ).toBe(1);
	expect( rows ).toEqual([{ r1:4, r2:10 }]);
});

test('Create table', async () => 
{
	const [rows, fields] = await conn.execute( 
		"CREATE TABLE IF NOT EXISTS `test_table` (\
		  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,\
		  `name` varchar(60) DEFAULT NULL,\
		  `age` int(11) DEFAULT NULL,\
		  `gender` tinyint(4) DEFAULT NULL,\
		  PRIMARY KEY (`id`)\
		) ENGINE=InnoDB DEFAULT CHARSET=utf8;" );
});

test('Throw syntax error', async () => 
{
	var gotError = false;
	try
	{
		var [rows, fields] = await conn.execute( "SELECT test_table FROM test" );
	}
	catch( err )
	{
		gotError = true;
	}
	
	expect( gotError ).toBe( true );
});

test('Insert', async () => 
{
	[results, ids] = await conn.insert( "test_table", [{name:"John", age:27, gender:1}, {name:"Mary", age:32, gender:2}] );
	expect( ids.length ).toBe(2);
	
	const [rows, fields] = await conn.execute( "SELECT * FROM test_table WHERE id IN (?, ?) ORDER BY id ASC", ids );
	expect( rows.length ).toBe(2);
	expect( rows ).toEqual([
		{ id:ids[0], name:"John", age:27, gender:1 }, 
		{ id:ids[1], name:"Mary", age:32, gender:2 }]);
});

test('Update', async () => 
{
	const result = await conn.update( "test_table", {age:["age + ?", 1]}, { id:[" >= ?", ids[0]] } );
	expect( result.affectedRows ).toBe(2);
	
	const [rows, fields] = await conn.execute( "SELECT * FROM test_table WHERE id IN (?, ?) ORDER BY id ASC", ids );
	expect( rows.length ).toBe(2);
	expect( rows ).toEqual([
		{ id:ids[0], name:"John", age:28, gender:1 }, 
		{ id:ids[1], name:"Mary", age:33, gender:2 }]);
});

test('Delete', async () => 
{
	const result = await conn.delete( "test_table", [{ id:[">= ?", ids[0]] }] );
	expect( result.affectedRows ).toBe(2);
	
	const [rows, fields] = await conn.execute( "SELECT * FROM test_table WHERE id IN (?, ?) ORDER BY id ASC", ids );
	expect( rows.length ).toBe(0);
});

test('Drop table', async () => 
{
	const result = await conn.execute( "DROP TABLE test_table" );
});

test('Release connection', async () => 
{
	expect( await conn.release() ).not.toBeNull();
});

test('End pool', async () => 
{
	expect( await MySQL.POOL.end() ).not.toBeNull();
});