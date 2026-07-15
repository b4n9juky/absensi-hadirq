import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1, 'Nama tidak boleh kosong'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter').regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password harus mengandung huruf kecil, huruf besar, dan angka'
  ),
  role: z.enum(['admin', 'guru'], { message: 'Role tidak valid' }),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, 'Nama tidak boleh kosong'),
  email: z.string().email('Format email tidak valid'),
  role: z.enum(['admin', 'guru'], { message: 'Role tidak valid' }),
});

export const createStudentSchema = z.object({
  name: z.string().min(1, 'Nama siswa wajib diisi'),
  nis: z.string().min(1, 'NIS wajib diisi'),
  classId: z.coerce.number().int().positive('Kelas wajib dipilih'),
});

export const updateStudentSchema = z.object({
  name: z.string().min(1, 'Nama siswa wajib diisi'),
  nis: z.string().min(1, 'NIS wajib diisi'),
  classId: z.coerce.number().int().positive('Kelas wajib dipilih'),
});

export const updateScheduleSchema = z.object({
  checkinStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/, 'Format waktu harus HH:MM atau HH:MM:SS'),
  lateAfter: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/, 'Format waktu harus HH:MM atau HH:MM:SS'),
  checkoutTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/, 'Format waktu harus HH:MM atau HH:MM:SS'),
});

export const attendanceSchema = z.object({
  student_id: z.string().min(1, 'student_id wajib diisi'),
  latitude: z.string().min(1, 'latitude wajib diisi'),
  longitude: z.string().min(1, 'longitude wajib diisi'),
  accuracy: z.string().min(1, 'accuracy wajib diisi'),
  device_uuid: z.string().min(1, 'device_uuid wajib diisi'),
});

export const qrAttendanceSchema = z.object({
  student_nis: z.string().min(1, 'NIS siswa tidak ditemukan di QR code'),
});

export const dashboardStatsSchema = z.object({
  date: z.string().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().optional(),
  classId: z.coerce.number().int().positive().optional(),
});
