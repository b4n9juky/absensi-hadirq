"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceService = exports.AttendanceService = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const geolib_1 = require("geolib");
const fs_1 = __importDefault(require("fs"));
const settingService_js_1 = require("./settingService.js");
const timezone_js_1 = require("../lib/timezone.js");
function toDatabaseLocalTime(date) {
    const localDate = new Date(date);
    localDate.toISOString = function () {
        const pad = (num) => String(num).padStart(2, '0');
        return `${this.getFullYear()}-${pad(this.getMonth() + 1)}-${pad(this.getDate())}T${pad(this.getHours())}:${pad(this.getMinutes())}:${pad(this.getSeconds())}.${String(this.getMilliseconds()).padStart(3, '0')}`;
    };
    return localDate;
}
class AttendanceService {
    async processAttendance(payload) {
        const { student_id, latitude, longitude, accuracy, device_uuid, photoPath } = payload;
        const authenticatedUserId = payload.authenticatedUserId;
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        const acc = parseFloat(accuracy);
        if (isNaN(lat) || isNaN(lon) || isNaN(acc)) {
            this.cleanupFile(photoPath);
            return { success: false, message: 'Parameter spasial tidak valid.' };
        }
        const geofence = await settingService_js_1.settingService.getGeofenceConfig();
        if (acc > geofence.max_accuracy_meters) {
            this.cleanupFile(photoPath);
            return { success: false, message: `Akurasi sinyal GPS buruk (${acc.toFixed(1)}m). Cari tempat lapang (Maksimum ${geofence.max_accuracy_meters.toFixed(1)}m).` };
        }
        const distance = (0, geolib_1.getDistance)({ latitude: lat, longitude: lon }, { latitude: geofence.school_latitude, longitude: geofence.school_longitude });
        if (distance > geofence.school_radius_meters) {
            this.cleanupFile(photoPath);
            return { success: false, message: `Presensi Ditolak! Anda berada di luar area sekolah. Jarak: ${distance.toFixed(1)}m (Maksimum ${geofence.school_radius_meters.toFixed(1)}m).` };
        }
        // Resolve student
        let studentRecord = await index_js_1.db.select().from(schema_js_1.students).where((0, drizzle_orm_1.eq)(schema_js_1.students.userId, authenticatedUserId)).limit(1);
        if (studentRecord.length === 0 && student_id) {
            studentRecord = await index_js_1.db.select().from(schema_js_1.students).where((0, drizzle_orm_1.eq)(schema_js_1.students.nis, student_id)).limit(1);
            if (studentRecord.length > 0) {
                const found = studentRecord[0];
                if (found.userId) {
                    this.cleanupFile(photoPath);
                    return { success: false, message: 'Profil siswa sudah terikat dengan akun lain. Silakan hubungi Admin/Guru.' };
                }
                await index_js_1.db.update(schema_js_1.students)
                    .set({ userId: authenticatedUserId, updatedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema_js_1.students.id, found.id));
                found.userId = authenticatedUserId;
            }
        }
        if (studentRecord.length === 0 && device_uuid) {
            studentRecord = await index_js_1.db.select().from(schema_js_1.students).where((0, drizzle_orm_1.eq)(schema_js_1.students.deviceUuid, device_uuid)).limit(1);
            if (studentRecord.length > 0) {
                const found = studentRecord[0];
                if (found.userId) {
                    this.cleanupFile(photoPath);
                    return { success: false, message: 'Profil siswa sudah terikat dengan akun lain. Silakan hubungi Admin/Guru.' };
                }
                await index_js_1.db.update(schema_js_1.students)
                    .set({ userId: authenticatedUserId, updatedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema_js_1.students.id, found.id));
                found.userId = authenticatedUserId;
            }
        }
        if (studentRecord.length === 0) {
            this.cleanupFile(photoPath);
            return { success: false, message: 'Profil siswa Anda tidak ditemukan di database.' };
        }
        const student = studentRecord[0];
        // Device binding
        if (!student.deviceUuid) {
            await index_js_1.db.update(schema_js_1.students)
                .set({ deviceUuid: device_uuid, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_js_1.students.id, student.id));
            student.deviceUuid = device_uuid;
        }
        else if (student.deviceUuid !== device_uuid) {
            this.cleanupFile(photoPath);
            return { success: false, message: 'Gagal! Akun Anda terikat pada HP lain. Silakan hubungi Admin/Guru untuk me-reset perangkat.' };
        }
        // Active academic year & semester
        const activeYear = await index_js_1.db.select().from(schema_js_1.academicYears).where((0, drizzle_orm_1.eq)(schema_js_1.academicYears.isActive, true)).limit(1);
        const activeSemester = await index_js_1.db.select().from(schema_js_1.semesters).where((0, drizzle_orm_1.eq)(schema_js_1.semesters.isActive, true)).limit(1);
        if (activeYear.length === 0 || activeSemester.length === 0) {
            this.cleanupFile(photoPath);
            return { success: false, message: 'Tahun ajaran atau semester aktif belum diatur di server.' };
        }
        // Day schedule
        const serverTime = (0, timezone_js_1.getJakartaDate)();
        const dayName = serverTime.toLocaleDateString('en-US', { weekday: 'long' });
        const scheduleRecord = await index_js_1.db.select().from(schema_js_1.schedules).where((0, drizzle_orm_1.eq)(schema_js_1.schedules.dayName, dayName)).limit(1);
        if (scheduleRecord.length === 0) {
            this.cleanupFile(photoPath);
            return { success: false, message: `Jadwal sekolah tidak ditemukan untuk hari ${dayName}.` };
        }
        const schedule = scheduleRecord[0];
        const attendanceDate = this.formatDate(serverTime);
        const currentTimeStr = this.formatTime(serverTime);
        // Check existing attendance
        const existingAttendance = await index_js_1.db.select()
            .from(schema_js_1.attendances)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.attendances.studentId, student.id), (0, drizzle_orm_1.eq)(schema_js_1.attendances.attendanceDate, attendanceDate)))
            .limit(1);
        const photoUrl = `/uploads/${photoPath.split('/').pop() || photoPath}`;
        if (existingAttendance.length === 0) {
            // CHECK-IN
            if (currentTimeStr < schedule.checkinStart) {
                this.cleanupFile(photoPath);
                return { success: false, message: `Absen datang belum dibuka. Mulai pada jam ${schedule.checkinStart}.` };
            }
            if (currentTimeStr >= schedule.checkoutTime) {
                this.cleanupFile(photoPath);
                return { success: false, message: 'Anda belum absen datang hari ini. Silakan hubungi Guru/Admin.' };
            }
            const isLate = currentTimeStr > schedule.lateAfter;
            const status = isLate ? 'LATE' : 'PRESENT';
            await index_js_1.db.insert(schema_js_1.attendances).values({
                studentId: student.id,
                classId: student.classId,
                academicYearId: activeYear[0].id,
                semesterId: activeSemester[0].id,
                attendanceDate,
                status,
                checkinTime: toDatabaseLocalTime(serverTime),
                checkinPhoto: photoUrl,
                checkinLatitude: lat,
                checkinLongitude: lon,
            });
            const statusMsg = isLate ? 'Terlambat' : 'Tepat Waktu';
            return { success: true, message: `Absen Datang Berhasil (${statusMsg})! Jarak: ${distance.toFixed(1)}m.` };
        }
        // CHECK-OUT
        const record = existingAttendance[0];
        if (record.checkoutTime !== null) {
            this.cleanupFile(photoPath);
            return { success: false, message: 'Anda sudah melakukan absen pulang hari ini.' };
        }
        if (currentTimeStr < schedule.checkoutTime) {
            this.cleanupFile(photoPath);
            return { success: false, message: `Absen datang sudah Anda lakukan hari ini. Silakan absen pulang setelah jam ${schedule.checkoutTime}.` };
        }
        await index_js_1.db.update(schema_js_1.attendances)
            .set({
            checkoutTime: toDatabaseLocalTime(serverTime),
            checkoutPhoto: photoUrl,
            checkoutLatitude: lat,
            checkoutLongitude: lon,
            updatedAt: toDatabaseLocalTime(serverTime),
        })
            .where((0, drizzle_orm_1.eq)(schema_js_1.attendances.id, record.id));
        return { success: true, message: `Absen Pulang Berhasil! Hati-hati di jalan. Jarak: ${distance.toFixed(1)}m.` };
    }
    async processQrAttendance(payload) {
        const { student_nis, status: requestedStatus, isVerified: requestedIsVerified } = payload;
        const studentRecord = await index_js_1.db.select().from(schema_js_1.students).where((0, drizzle_orm_1.eq)(schema_js_1.students.nis, student_nis)).limit(1);
        if (studentRecord.length === 0) {
            return { success: false, message: `Siswa dengan NIS ${student_nis} tidak ditemukan di database.` };
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
        const targetStatus = requestedStatus || (currentTimeStr > schedule.lateAfter ? 'LATE' : 'PRESENT');
        const targetIsVerified = requestedIsVerified !== undefined ? requestedIsVerified : true;
        if (existingAttendance.length > 0) {
            const record = existingAttendance[0];
            // If custom status or explicit verification is requested
            if (requestedStatus || requestedIsVerified !== undefined) {
                await index_js_1.db.update(schema_js_1.attendances)
                    .set({
                    status: targetStatus,
                    isVerified: targetIsVerified,
                    updatedAt: toDatabaseLocalTime(serverTime),
                })
                    .where((0, drizzle_orm_1.eq)(schema_js_1.attendances.id, record.id));
                let statusText = 'Hadir';
                if (targetStatus === 'SICK')
                    statusText = 'Sakit';
                else if (targetStatus === 'EXCUSED')
                    statusText = 'Izin';
                else if (targetStatus === 'ABSENT')
                    statusText = 'Alfa';
                else if (targetStatus === 'LATE')
                    statusText = 'Terlambat';
                return { success: true, message: `Status siswa ${student_nis} diubah menjadi ${statusText}.` };
            }
            if (record.checkoutTime !== null) {
                return { success: false, message: `Siswa ${student_nis} sudah melakukan absen lengkap (datang + pulang) hari ini.` };
            }
            if (currentTimeStr < schedule.checkoutTime) {
                // Class check-in verification
                await index_js_1.db.update(schema_js_1.attendances)
                    .set({
                    isVerified: true,
                    updatedAt: toDatabaseLocalTime(serverTime),
                })
                    .where((0, drizzle_orm_1.eq)(schema_js_1.attendances.id, record.id));
                return { success: true, message: `Absen datang siswa ${student_nis} berhasil diverifikasi di kelas.` };
            }
            await index_js_1.db.update(schema_js_1.attendances)
                .set({
                checkoutTime: toDatabaseLocalTime(serverTime),
                updatedAt: toDatabaseLocalTime(serverTime),
            })
                .where((0, drizzle_orm_1.eq)(schema_js_1.attendances.id, record.id));
            return { success: true, message: `Absen Pulang berhasil untuk ${student_nis} via QR.` };
        }
        // Check-in via QR (does not exist yet)
        await index_js_1.db.insert(schema_js_1.attendances).values({
            studentId: student.id,
            classId: student.classId,
            academicYearId: activeYear[0].id,
            semesterId: activeSemester[0].id,
            attendanceDate,
            status: targetStatus,
            isVerified: targetIsVerified,
            checkinTime: toDatabaseLocalTime(serverTime),
        });
        let statusMsg = 'Hadir';
        if (targetStatus === 'SICK')
            statusMsg = 'Sakit';
        else if (targetStatus === 'EXCUSED')
            statusMsg = 'Izin';
        else if (targetStatus === 'ABSENT')
            statusMsg = 'Alfa';
        else if (targetStatus === 'LATE')
            statusMsg = 'Terlambat';
        return { success: true, message: `Absen ${statusMsg} berhasil untuk ${student_nis} via QR.` };
    }
    formatDate(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    formatTime(date) {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    }
    cleanupFile(filePath) {
        try {
            if (filePath && fs_1.default.existsSync(filePath))
                fs_1.default.unlinkSync(filePath);
        }
        catch { /* ignore */ }
    }
}
exports.AttendanceService = AttendanceService;
exports.attendanceService = new AttendanceService();
