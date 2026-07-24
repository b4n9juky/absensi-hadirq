import { migrate } from 'drizzle-orm/mysql2/migrator';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import path from 'path';

async function runMigrations() {
  const migrationsFolder = path.resolve(__dirname, '../../drizzle');
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is missing');
    process.exit(1);
  }

  console.log('Running database migrations...');

  const connection = await mysql.createConnection(databaseUrl);
  const db = drizzle(connection);

  try {
    await migrate(db, { migrationsFolder });
    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigrations();
