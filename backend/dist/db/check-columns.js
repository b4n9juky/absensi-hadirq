"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
require("../lib/env.js");
async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is missing!');
    }
    console.log('Connecting to database...');
    const connection = await promise_1.default.createConnection(process.env.DATABASE_URL);
    try {
        console.log('=== DESCRIBE attendances ===');
        const [attendancesCols] = await connection.query('DESCRIBE attendances');
        console.table(attendancesCols);
        console.log('=== DESCRIBE students ===');
        const [studentsCols] = await connection.query('DESCRIBE students');
        console.table(studentsCols);
        console.log('=== Running the exact query that failed ===');
        const query = `
      select id, student_id, class_id, academic_year_id, semester_id, attendance_date, status, is_verified, checkin_time, checkin_photo, checkin_latitude, checkin_longitude, checkout_time, checkout_photo, checkout_latitude, checkout_longitude, created_at, updated_at 
      from attendances 
      where (attendances.student_id = ? and attendances.attendance_date = ?) 
      limit ?
    `;
        const params = [2, '2026-06-15', 1];
        const [rows] = await connection.query(query, params);
        console.log('Query succeeded! Rows returned:', rows.length);
    }
    catch (err) {
        console.error('Error occurred:');
        console.error('Code:', err.code);
        console.error('Errno:', err.errno);
        console.error('SqlState:', err.sqlState);
        console.error('Message:', err.message);
    }
    finally {
        await connection.end();
        console.log('Database connection closed.');
    }
}
main().catch(console.error);
