"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subjectAttendanceService = exports.SubjectAttendanceService = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
class SubjectAttendanceService {
    async getForm(scheduleId, date) {
        const schedule = await index_js_1.db.select({
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
            .where((0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.id, scheduleId))
            .limit(1);
        if (schedule.length === 0) {
            throw new Error('Jadwal mengajar tidak ditemukan.');
        }
        const studentsRows = await index_js_1.db.select({
            studentId: schema_js_1.students.id,
            nis: schema_js_1.students.nis,
            studentName: schema_js_1.user.name,
        })
            .from(schema_js_1.students)
            .innerJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.students.userId, schema_js_1.user.id))
            .where((0, drizzle_orm_1.eq)(schema_js_1.students.classId, schedule[0].classId))
            .orderBy(schema_js_1.user.name);
        const existingSubjectAttendances = await index_js_1.db.select({
            studentId: schema_js_1.subjectAttendances.studentId,
            status: schema_js_1.subjectAttendances.status,
            notes: schema_js_1.subjectAttendances.notes,
        })
            .from(schema_js_1.subjectAttendances)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.subjectAttendances.teachingScheduleId, scheduleId), (0, drizzle_orm_1.eq)(schema_js_1.subjectAttendances.attendanceDate, date)));
        const existingMap = new Map(existingSubjectAttendances.map(s => [s.studentId, s]));
        const dailyAttendances = await index_js_1.db.select({
            studentId: schema_js_1.attendances.studentId,
            checkinTime: schema_js_1.attendances.checkinTime,
        })
            .from(schema_js_1.attendances)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.attendances.attendanceDate, date), (0, drizzle_orm_1.inArray)(schema_js_1.attendances.studentId, studentsRows.map(s => s.studentId))));
        const dailyCheckinMap = new Set(dailyAttendances.filter(a => a.checkinTime != null).map(a => a.studentId));
        const result = studentsRows.map(student => {
            const existing = existingMap.get(student.studentId);
            let defaultStatus = 'ABSENT';
            if (dailyCheckinMap.has(student.studentId)) {
                defaultStatus = 'PRESENT';
            }
            return {
                studentId: student.studentId,
                nis: student.nis,
                studentName: student.studentName,
                status: existing ? existing.status : defaultStatus,
                notes: existing ? existing.notes || '' : '',
            };
        });
        return {
            schedule: schedule[0],
            students: result,
        };
    }
    async submitAttendance(scheduleId, date, entries) {
        const validStatuses = ['PRESENT', 'SICK', 'EXCUSED', 'ABSENT', 'DISPEN', 'SKIPPED'];
        for (const entry of entries) {
            if (!validStatuses.includes(entry.status)) {
                throw new Error(`Status tidak valid untuk siswa ID ${entry.studentId}: ${entry.status}`);
            }
        }
        for (const entry of entries) {
            await index_js_1.db.insert(schema_js_1.subjectAttendances)
                .values({
                teachingScheduleId: scheduleId,
                studentId: entry.studentId,
                attendanceDate: date,
                status: entry.status,
                notes: entry.notes || null,
            })
                .onDuplicateKeyUpdate({
                set: {
                    status: entry.status,
                    notes: entry.notes || null,
                },
            });
        }
        return { success: true, message: `Berhasil menyimpan absensi ${entries.length} siswa.` };
    }
}
exports.SubjectAttendanceService = SubjectAttendanceService;
exports.subjectAttendanceService = new SubjectAttendanceService();
