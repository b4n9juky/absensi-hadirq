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
        console.log('=== Running the exact query that failed earlier (checkin/checkout query) ===');
        const query1 = `
      select id, student_id, class_id, academic_year_id, semester_id, attendance_date, status, is_verified, checkin_time, checkin_photo, checkin_latitude, checkin_longitude, checkout_time, checkout_photo, checkout_latitude, checkout_longitude, created_at, updated_at 
      from attendances 
      where (attendances.student_id = ? and attendances.attendance_date = ?) 
      limit ?
    `;
        const params1 = [2, '2026-06-15', 1];
        const [rows1] = await connection.query(query1, params1);
        console.log('Query 1 succeeded! Rows returned:', rows1.length);
        console.log('=== Running report query ===');
        // This is the SQL representation of reportRepo.getAttendanceReport()
        const query2 = `
      SELECT 
        a.id, 
        a.attendance_date as attendanceDate, 
        a.status, 
        a.checkin_time as checkinTime, 
        a.checkin_photo as checkinPhoto, 
        a.checkin_latitude as checkinLatitude, 
        a.checkin_longitude as checkinLongitude, 
        a.checkout_time as checkoutTime, 
        a.checkout_photo as checkoutPhoto, 
        a.checkout_latitude as checkoutLatitude, 
        a.checkout_longitude as checkoutLongitude, 
        s.id as studentId, 
        s.nis as studentNis, 
        u.name as studentName, 
        c.id as classId, 
        c.name as className, 
        ay.id as academicYearId, 
        ay.name as academicYearName, 
        sem.id as semesterId, 
        sem.name as semesterName
      FROM attendances a
      INNER JOIN students s ON a.student_id = s.id
      INNER JOIN classes c ON a.class_id = c.id
      INNER JOIN user u ON s.user_id = u.id
      INNER JOIN academic_years ay ON a.academic_year_id = ay.id
      INNER JOIN semesters sem ON a.semester_id = sem.id
      WHERE a.attendance_date = ?
      ORDER BY a.attendance_date DESC, a.checkin_time DESC
    `;
        const params2 = ['2026-06-15'];
        const [rows2] = await connection.query(query2, params2);
        console.log('Report Query succeeded! Rows returned:', rows2.length);
        if (rows2.length > 0) {
            console.log('First row data:', rows2[0]);
        }
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
