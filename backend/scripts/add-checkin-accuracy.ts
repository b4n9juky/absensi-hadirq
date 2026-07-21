import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Adding checkin_accuracy column to attendances table...');
  try {
    await db.execute(sql`ALTER TABLE attendances ADD COLUMN checkin_accuracy DOUBLE NULL`);
    console.log('Column added successfully!');
  } catch (error: any) {
    console.error('Error:', error?.message || error);
  }
  process.exit(0);
}

main();
