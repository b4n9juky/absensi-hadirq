"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teacherService = exports.TeacherService = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const attendanceService_js_1 = require("./attendanceService.js");
const timezone_js_1 = require("../lib/timezone.js");
class TeacherService {
    async getTeacherData(teacherId) {
        const rows = await index_js_1.db.select({ name: schema_js_1.user.name }).from(schema_js_1.user).where((0, drizzle_orm_1.eq)(schema_js_1.user.id, teacherId)).limit(1);
        return rows.length > 0 ? rows[0] : null;
    }
    async getCurrentSchedule(teacherId) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const now = (0, timezone_js_1.getJakartaDate)();
        const dayName = days[now.getDay()];
        const currentTime = now.toTimeString().slice(0, 8);
        const rows = await index_js_1.db.select({
            id: schema_js_1.teachingSchedules.id,
            classId: schema_js_1.teachingSchedules.classId,
            className: schema_js_1.classes.name,
            subject: schema_js_1.teachingSchedules.subject,
            startTime: schema_js_1.teachingSchedules.startTime,
            endTime: schema_js_1.teachingSchedules.endTime,
            dayName: schema_js_1.teachingSchedules.dayName,
        })
            .from(schema_js_1.teachingSchedules)
            .innerJoin(schema_js_1.classes, (0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.classId, schema_js_1.classes.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.teacherId, teacherId), (0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.dayName, dayName), (0, drizzle_orm_1.lte)(schema_js_1.teachingSchedules.startTime, currentTime), (0, drizzle_orm_1.gte)(schema_js_1.teachingSchedules.endTime, currentTime)))
            .limit(1);
        return rows.length > 0 ? rows[0] : null;
    }
    async getUpcomingSchedule(teacherId) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const now = (0, timezone_js_1.getJakartaDate)();
        const dayName = days[now.getDay()];
        const currentTime = now.toTimeString().slice(0, 8);
        const rows = await index_js_1.db.select({
            id: schema_js_1.teachingSchedules.id,
            classId: schema_js_1.teachingSchedules.classId,
            className: schema_js_1.classes.name,
            subject: schema_js_1.teachingSchedules.subject,
            startTime: schema_js_1.teachingSchedules.startTime,
            endTime: schema_js_1.teachingSchedules.endTime,
            dayName: schema_js_1.teachingSchedules.dayName,
        })
            .from(schema_js_1.teachingSchedules)
            .innerJoin(schema_js_1.classes, (0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.classId, schema_js_1.classes.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.teacherId, teacherId), (0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.dayName, dayName), (0, drizzle_orm_1.gte)(schema_js_1.teachingSchedules.startTime, currentTime)))
            .orderBy(schema_js_1.teachingSchedules.startTime)
            .limit(1);
        return rows.length > 0 ? rows[0] : null;
    }
    async getClassStudentsWithAttendance(classId) {
        const jakartaDate = (0, timezone_js_1.getJakartaDate)();
        const today = `${jakartaDate.getFullYear()}-${String(jakartaDate.getMonth() + 1).padStart(2, '0')}-${String(jakartaDate.getDate()).padStart(2, '0')}`;
        const rows = await index_js_1.db.select({
            studentId: schema_js_1.students.id,
            nis: schema_js_1.students.nis,
            studentName: schema_js_1.user.name,
            status: schema_js_1.attendances.status,
            checkinTime: schema_js_1.attendances.checkinTime,
            checkoutTime: schema_js_1.attendances.checkoutTime,
            isVerified: schema_js_1.attendances.isVerified,
        })
            .from(schema_js_1.students)
            .innerJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.students.userId, schema_js_1.user.id))
            .leftJoin(schema_js_1.attendances, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.attendances.studentId, schema_js_1.students.id), (0, drizzle_orm_1.eq)(schema_js_1.attendances.attendanceDate, today)))
            .where((0, drizzle_orm_1.eq)(schema_js_1.students.classId, classId))
            .orderBy(schema_js_1.user.name);
        return rows;
    }
    async markAttendance(teacherId, teacherName, studentNis, status, isVerified) {
        return attendanceService_js_1.attendanceService.processQrAttendance({
            student_nis: studentNis,
            teacherUserId: teacherId,
            teacherName: teacherName,
            status,
            isVerified,
        });
    }
    async markAttendanceBulk(teacherId, teacherName, studentNisList) {
        const jakartaDate = (0, timezone_js_1.getJakartaDate)();
        const today = `${jakartaDate.getFullYear()}-${String(jakartaDate.getMonth() + 1).padStart(2, '0')}-${String(jakartaDate.getDate()).padStart(2, '0')}`;
        if (!studentNisList || studentNisList.length === 0) {
            return { success: true, message: 'Tidak ada siswa untuk diverifikasi.' };
        }
        // Find student IDs matching the NIS list
        const studentRecords = await index_js_1.db.select({ id: schema_js_1.students.id })
            .from(schema_js_1.students)
            .where((0, drizzle_orm_1.inArray)(schema_js_1.students.nis, studentNisList));
        if (studentRecords.length === 0) {
            return { success: false, message: 'Siswa tidak ditemukan.' };
        }
        const studentIds = studentRecords.map(s => s.id);
        // Update isVerified = true for existing attendances today
        await index_js_1.db.update(schema_js_1.attendances)
            .set({
            isVerified: true,
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_js_1.attendances.studentId, studentIds), (0, drizzle_orm_1.eq)(schema_js_1.attendances.attendanceDate, today)));
        return { success: true, message: `Berhasil memverifikasi ${studentNisList.length} siswa.` };
    }
}
exports.TeacherService = TeacherService;
exports.teacherService = new TeacherService();
