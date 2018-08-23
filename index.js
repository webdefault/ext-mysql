const mysql2 = require('mysql2');

class MySQL
{
	constructor()
	{
		this.transactionCounter = 0;
		this.transactionSuccess = 0;
	}
	
	isInited()
	{
		return typeof this.conn.connection.isInTransaction != 'undefined';
	}
	
	async init()
	{
		this.conn = await MySQL.POOL.promise().getConnection();
		if( !this.isInited() )
		{
			this.conn.connection.isInTransaction = false;
			await this.conn.query( 'SET CHARACTER SET ' + process.env.ENCODE );
			// if( timezone ) this._pdo.exec( 'SET @@session.time_zone = "'.timezone.'"' );
		}
		
		return this;
	}
	
	beginTransaction()
	{
		if( this.transactionCounter == 0 )
		{
			if( this.conn.connection.isInTransaction ) this.conn.rollback();
			this.conn.beginTransaction();
			this.conn.connection.isInTransaction = true;
		}
		
		this.transactionSuccess++;
		this.transactionCounter++;
		
		// print_r( "beginTransaction".this.transactionCounter.' == '.this.transactionSuccess."\n" );
		// this._pdo.exec('SAVEPOINT trans'.this.transactionCounter);
		
		return this.transactionCounter >= 0;
	}
	
	setTransactionSuccessful()
	{
		// print_r( "setTransactionSuccessful\n" );
		this.transactionSuccess--;
	}
	
	endTransaction()
	{
		// print_r( 'outsize: '.this.transactionCounter.' == '.this.transactionSuccess."\n"); 
		if( this.transactionCounter != 0 )
		{
			this.transactionCounter--;
			
			// error_log( ': '.this.transactionCounter.' == '.this.transactionSuccess );
			// print_r( this.transactionCounter.' == '.this.transactionSuccess."\n"); 
			if( this.transactionCounter == this.transactionSuccess )
			{
				if( this.transactionCounter == 0 )
				{
					// print_r( "endTransaction" );
					return this.conn.commit();
				}
			}
			else
			{
				// print_r( "rolling back" );
				this.transactionCounter = 0;
				this.transactionSuccess = 0;
				this.conn.rollback();
				
				throw new Error( "Transaction has no success. Rolling back", 1 );
			}
		}
	}

	elog( text )
	{
		if( MySQL.LOGGER )
		{
			MySQL.LOGGER( text );
		} 
	}
	
	log( sql, values )
	{
		if( MySQL.LOGGER )
		{
			var value = "[" + new Date().toISOString() + "] > " +
				sql + ";\n" +
				( values ? 'BIND: ' + values : '' ) + "\n";
			
			MySQL.LOGGER( value );
			// fs.appendFile( process.env.LOG_PATH + "/" + this.logFile + "."+ filestamp + ".log", value, (err) => {if (err) throw err;});
		}
	}

	/*
	 * 	execute queries
	 */
	async execute( sql, values )
	{
		// assert( is_string( sql ), print_r( sql, true ) );
		
		this.log( sql, values );
		
		try
		{
			return await this.conn.query( sql, values );
		}
		catch( err )
		{
			this.elog( err );
			throw err;
		}
	}
	
	/*
	 * 	Insere um novo registro
	 */
	async insert( table, list )
	{
		var ids = [];
		var results = [];
		for( var k1 in list )
		{
			var v1 = list[k1];
			
			try
			{
				this.beginTransaction();
				
				var sql = this.createInsertSQL( table, v1 );
				
				var params = [];
				for( var k2 in v1 )
				{
					var v2 = v1[k2];
					
					if( Array.isArray( v2 ) )
					{
						if( v2.length > 1 )
						{
							params.push( v2[1] );
						}
					}
					else
					{
						params.push( v2 );
					}
				}
				
				this.log( sql, params );
				
				var [result, err] = await this.conn.query( sql, params );
				this.setTransactionSuccessful();
			}
			catch ( err )
			{
				this.elog( err );
			}
			finally
			{
				this.endTransaction();
			}
			
			results.push( result );
			ids.push( result.insertId );
		}
		
		return [results, ids];
	}
	
	/*
	 * 	Atualiza o registro
	 */
	async update( table, values, where )
	{
		this.beginTransaction();
		
		try
		{
			var sql = this.createUpdateSQL( table, values, where );
			
			var params = [];
			for( var k2 in values )
			{
				var v2 = values[k2];
				
				if( Array.isArray( v2 ) )
				{
					if( v2.length > 1 )
					{
						params.push( v2[1] );
					}
				}
				else
				{
					params.push( v2 );
				}
			}
			
			for( var k2 in where )
			{
				var v2 = where[k2];
				if( Array.isArray( v2 ) )
				{
					if( v2.length > 1 )
					{
						params.push( v2[1] );
					}
				}
				else
				{
					params.push( v2 );
				}
			}
			
			this.log( sql, params );
			
			var [result, err] = await this.conn.query( sql, params );
			this.setTransactionSuccessful();
		} 
		catch ( err )
		{
			this.elog( err );
		}
		finally
		{
			this.endTransaction();
			return result;
		}
	}
	
	/*
	 * 	Apaga o registro
	 */
	async delete( table, wheres )
	{
		var count = 0;
		this.beginTransaction();
		
		try
		{
			for( var k1 in wheres )
			{
				var params = [];
				var v1 = wheres[k1];
				
				var sql = this.createDeleteSQL( table, v1 );
				
				for( var k2 in v1)
				{
					var v2 = v1[k2];
					
					if( Array.isArray( v2 ) )
					{
						if( v2.length > 1 )
						{
							params.push( v2[1] );
						}
					}
					else
					{
						params.push( v2 );
					}
				}
				
				var [result, err] = await this.conn.query( sql, params );
			}
			
			this.log( sql, params );
			this.setTransactionSuccessful();
		}
		catch ( err )
		{
			this.elog( err );
		}
		finally
		{
			this.endTransaction();
			return result;
		}
	}
	
	/*
	public function tables()
	{
		echo 'tables not implemented.
		';
	}

	public function columns( table )
	{
		echo 'columns not implemented.
		';
	}

	public function createTable( name, fields )
	{
		echo 'createTable not implemented.
		';
	}

	public function editTable( name, fields )
	{
		echo 'editTable not implemented.
		';
	}
	*/

	createInsertSQL( table, array )
	{
		var x = 'INSERT INTO ' + table + ' (';
		var glue = '';
		
		for( var k in array )
		{
			var v = array[v];
			x += glue + k;
			glue = ', ';
		}
		
		x += ') VALUES (';
		
		glue = '';
		for( var k in array) 
		{
			var v = array[k];			
			x += glue;

			if( Array.isArray( v ) ) 
				x += v[0];
			else
				x += '?';

			glue = ', ';
		}
		
		x += ')';
		
		return x;
	}

	createUpdateSQL( table, values, where )
	{
		var x = 'UPDATE ' + table + ' SET ';
		var glue = '';
		
		for( var k in values ) 
		{
			var v = values[k];
			
			x += glue + k + ' = ' + ( Array.isArray( v ) ? v[0] : '?' );
			glue = ', ';
		}

		x += ' WHERE ';

		glue = '';
		for( var k in where )
		{
			var v = where[k];
			
			x += glue + k + ( Array.isArray( v ) ? ' ' + v[0] : ' = ? ' );
			glue = ' AND ';
		}

		return x;
	}


	createDeleteSQL( table, array )
	{
		var x = 'DELETE FROM ' + table + ' WHERE ';
		
		var glue = '';
		for( var k in array )
		{
			var v = array[k];
			
			x += glue + k + ( Array.isArray( v ) ? ' ' + v[0] : ' = ? ' );
			glue = ' AND ';
		} 

		return x;
	}
	
	release()
	{
		this.conn.release();
	}
}

MySQL.POOL = null;
MySQL.LOGGER = null;
MySQL.CREATE_POOL = function(values)
{
	if( values == null )
	{
		values = {
			host: process.env.MYSQL_HOSTNAME,
			user: process.env.MYSQL_USER,
			password: process.env.MYSQL_PASSWORD,
			database: process.env.MYSQL_DATABASE,
			waitForConnections: true,
			connectionLimit: 10,
			queueLimit: 0
		}
	}
	// Set the pool for connections.
	const m2 = require('mysql2');
	return MySQL.POOL = m2.createPool(values);
}

module.exports = MySQL;