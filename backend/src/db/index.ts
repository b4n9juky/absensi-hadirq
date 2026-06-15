import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';
import '../lib/env.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is missing!');
}

// Create connection pool for MySQL
const poolConnection = mysql.createPool(process.env.DATABASE_URL);

// Initialize Drizzle client
export const db = drizzle(poolConnection, { schema, mode: 'default' });
