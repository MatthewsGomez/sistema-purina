import mysql from 'mysql2/promise';

 const dbConfig = {
   host: 'by3wc2bz31wcwr4fhfie-mysql.services.clever-cloud.com',
   user: 'up8l44afxdibwr5h', 
   password: 'ZRws7VrG5R7onRvXYi2r', 
   database: 'by3wc2bz31wcwr4fhfie',
   port: 3306,
   waitForConnections: true,
   connectionLimit: 10,
   queueLimit: 0,
   connectTimeout: 10000,
   enableKeepAlive: true,
 };

/* const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'sistema_inventario',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  enableKeepAlive: true,
}; */

let connection;

export async function connectDB() {
  try {
    if (!connection) {
      connection = await mysql.createConnection(dbConfig);
    } else {
      // Verifica si la conexión está viva
      await connection.ping();
    }
    return connection;
  } catch (error) {
    console.error('Error de conexión a DB:', error);
    connection = null;
    // Intenta reconectar
    connection = await mysql.createConnection(dbConfig);
    return connection;
  }
}