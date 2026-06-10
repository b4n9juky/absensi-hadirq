import { db } from './src/db/index.js';
import { attendances } from './src/db/schema.js';

async function check() {
  try {
    const records = await db.select().from(attendances);
    console.log('Database Records inside MySQL:');
    console.log(JSON.stringify(records, null, 2));
  } catch (error) {
    console.error('Error fetching database records:', error);
  } finally {
    process.exit(0);
  }
}

check();
