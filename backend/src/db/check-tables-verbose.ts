import mysql from 'mysql2/promise';
import '../lib/env.js';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is missing!');
  }
  
  console.log('Connecting to database...');
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const [tables] = await connection.query('SHOW TABLES');
    console.log('=== TABLES IN DATABASE ===');
    console.table(tables);

    for (const row of tables as any[]) {
      const tableName = Object.values(row)[0] as string;
      console.log(`\n=== DESCRIBE ${tableName} ===`);
      try {
        const [cols] = await connection.query(`DESCRIBE \`${tableName}\``);
        console.table(cols);
      } catch (err: any) {
        console.error(`Error describing table ${tableName}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error('Error occurred:', err.message);
  } finally {
    await connection.end();
    console.log('Database connection closed.');
  }
}

main().catch(console.error);
