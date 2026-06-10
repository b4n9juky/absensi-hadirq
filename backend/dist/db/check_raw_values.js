"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("./index.js");
const drizzle_orm_1 = require("drizzle-orm");
async function run() {
    try {
        const dbRawResult = await index_js_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT 
        id, 
        attendance_date, 
        CAST(checkin_time AS CHAR) as raw_checkin_time, 
        CAST(created_at AS CHAR) as raw_created_at 
      FROM attendances
    `);
        console.log('Database Raw Strings:', JSON.stringify(dbRawResult, null, 2));
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        process.exit(0);
    }
}
run();
