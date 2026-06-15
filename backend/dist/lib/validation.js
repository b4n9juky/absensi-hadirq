"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardStatsSchema = exports.qrAttendanceSchema = exports.attendanceSchema = exports.updateScheduleSchema = exports.updateStudentSchema = exports.createStudentSchema = exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nama tidak boleh kosong'),
    email: zod_1.z.string().email('Format email tidak valid'),
    password: zod_1.z.string().min(6, 'Password minimal 6 karakter'),
    role: zod_1.z.enum(['admin', 'guru', 'siswa'], { message: 'Role tidak valid' }),
});
exports.updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nama tidak boleh kosong'),
    email: zod_1.z.string().email('Format email tidak valid'),
    role: zod_1.z.enum(['admin', 'guru', 'siswa'], { message: 'Role tidak valid' }),
});
exports.createStudentSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, 'User ID wajib diisi'),
    nis: zod_1.z.string().min(1, 'NIS wajib diisi'),
    classId: zod_1.z.coerce.number().int().positive('Kelas wajib dipilih'),
});
exports.updateStudentSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, 'User ID wajib diisi'),
    nis: zod_1.z.string().min(1, 'NIS wajib diisi'),
    classId: zod_1.z.coerce.number().int().positive('Kelas wajib dipilih'),
});
exports.updateScheduleSchema = zod_1.z.object({
    checkinStart: zod_1.z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/, 'Format waktu harus HH:MM atau HH:MM:SS'),
    lateAfter: zod_1.z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/, 'Format waktu harus HH:MM atau HH:MM:SS'),
    checkoutTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/, 'Format waktu harus HH:MM atau HH:MM:SS'),
});
exports.attendanceSchema = zod_1.z.object({
    student_id: zod_1.z.string().min(1, 'student_id wajib diisi'),
    latitude: zod_1.z.string().min(1, 'latitude wajib diisi'),
    longitude: zod_1.z.string().min(1, 'longitude wajib diisi'),
    accuracy: zod_1.z.string().min(1, 'accuracy wajib diisi'),
    device_uuid: zod_1.z.string().min(1, 'device_uuid wajib diisi'),
});
exports.qrAttendanceSchema = zod_1.z.object({
    student_nis: zod_1.z.string().min(1, 'NIS siswa tidak ditemukan di QR code'),
});
exports.dashboardStatsSchema = zod_1.z.object({
    date: zod_1.z.string().optional(),
    month: zod_1.z.coerce.number().int().min(1).max(12).optional(),
    year: zod_1.z.coerce.number().int().optional(),
    classId: zod_1.z.coerce.number().int().positive().optional(),
});
