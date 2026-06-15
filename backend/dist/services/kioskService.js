"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kioskService = exports.KioskService = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const timezone_js_1 = require("../lib/timezone.js");
function toDatabaseLocalTime(date) {
    const localDate = new Date(date);
    localDate.toISOString = function () {
        const pad = (num) => String(num).padStart(2, '0');
        return `${this.getFullYear()}-${pad(this.getMonth() + 1)}-${pad(this.getDate())}T${pad(this.getHours())}:${pad(this.getMinutes())}:${pad(this.getSeconds())}.${String(this.getMilliseconds()).padStart(3, '0')}`;
    };
    return localDate;
}
function getLocalEpoch(date) {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
}
class KioskService {
    async processKioskAttendance(studentId, status) {
        const studentRecord = await index_js_1.db.select().from(schema_js_1.students).where((0, drizzle_orm_1.eq)(schema_js_1.students.id, studentId)).limit(1);
        if (studentRecord.length === 0) {
            return { success: false, message: `Siswa tidak ditemukan di database.` };
        }
        const student = studentRecord[0];
        const activeYear = await index_js_1.db.select().from(schema_js_1.academicYears).where((0, drizzle_orm_1.eq)(schema_js_1.academicYears.isActive, true)).limit(1);
        const activeSemester = await index_js_1.db.select().from(schema_js_1.semesters).where((0, drizzle_orm_1.eq)(schema_js_1.semesters.isActive, true)).limit(1);
        if (activeYear.length === 0 || activeSemester.length === 0) {
            return { success: false, message: 'Tahun ajaran atau semester aktif belum diatur di server.' };
        }
        const serverTime = (0, timezone_js_1.getJakartaDate)();
        const dayName = serverTime.toLocaleDateString('en-US', { weekday: 'long' });
        const scheduleRecord = await index_js_1.db.select().from(schema_js_1.schedules).where((0, drizzle_orm_1.eq)(schema_js_1.schedules.dayName, dayName)).limit(1);
        if (scheduleRecord.length === 0) {
            return { success: false, message: `Jadwal sekolah tidak ditemukan untuk hari ${dayName}.` };
        }
        const schedule = scheduleRecord[0];
        const attendanceDate = this.formatDate(serverTime);
        const currentTimeStr = this.formatTime(serverTime);
        const existingAttendance = await index_js_1.db.select()
            .from(schema_js_1.attendances)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.attendances.studentId, student.id), (0, drizzle_orm_1.eq)(schema_js_1.attendances.attendanceDate, attendanceDate)))
            .limit(1);
        const targetStatus = status || (currentTimeStr > schedule.lateAfter ? 'LATE' : 'PRESENT');
        if (existingAttendance.length > 0) {
            const record = existingAttendance[0];
            if (record.checkoutTime !== null) {
                return { success: false, message: `Peringatan: Anda sudah melakukan absen lengkap (datang + pulang) hari ini.` };
            }
            // Buffer: Prevent checkout if it's too close to checkinTime (less than 5 minutes)
            const checkinEpoch = record.checkinTime ? getLocalEpoch(new Date(record.checkinTime)) : 0;
            const serverEpoch = getLocalEpoch(serverTime);
            const diffMinutes = Math.abs(serverEpoch - checkinEpoch) / (1000 * 60);
            if (diffMinutes < 5) {
                return { success: false, message: `Peringatan: Anda sudah melakukan absen datang hari ini.` };
            }
            if (currentTimeStr < schedule.checkoutTime) {
                return { success: false, message: `Peringatan: Anda sudah absen datang. Absen pulang baru dibuka pukul ${schedule.checkoutTime}.` };
            }
            await index_js_1.db.update(schema_js_1.attendances)
                .set({
                checkoutTime: toDatabaseLocalTime(serverTime),
                updatedAt: toDatabaseLocalTime(serverTime),
            })
                .where((0, drizzle_orm_1.eq)(schema_js_1.attendances.id, record.id));
            return { success: true, message: `Absen Pulang berhasil! Hati-hati di jalan.` };
        }
        // New Check-in
        // Enforce rule: Cannot check in (Datang) if current time is past school checkout time
        if (currentTimeStr >= schedule.checkoutTime) {
            return { success: false, message: 'Anda belum absen datang hari ini. Silakan hubungi Guru/Admin.' };
        }
        // Check-in
        await index_js_1.db.insert(schema_js_1.attendances).values({
            studentId: student.id,
            classId: student.classId,
            academicYearId: activeYear[0].id,
            semesterId: activeSemester[0].id,
            attendanceDate,
            status: targetStatus,
            isVerified: true,
            checkinTime: toDatabaseLocalTime(serverTime),
        });
        let statusMsg = 'Hadir';
        if (targetStatus === 'LATE')
            statusMsg = 'Terlambat';
        return { success: true, message: `Absen ${statusMsg} berhasil!` };
    }
    formatDate(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    formatTime(date) {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    }
}
exports.KioskService = KioskService;
exports.kioskService = new KioskService();
