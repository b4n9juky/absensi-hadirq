import { db } from '../db/index.js';
import {
  students, attendances, academicYears, semesters, schedules,
} from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getDistance } from 'geolib';
import fs from 'fs';
import { settingService } from './settingService.js';

export interface AttendancePayload {
  student_id: string;
  latitude: string;
  longitude: string;
  accuracy: string;
  device_uuid: string;
  photoPath: string;
  authenticatedUserId: string;
  authenticatedUserName: string;
}

export interface QrAttendancePayload {
  student_nis: string;
  teacherUserId: string;
  teacherName: string;
}

function toDatabaseLocalTime(date: Date): Date {
  const localDate = new Date(date);
  localDate.toISOString = function () {
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${this.getFullYear()}-${pad(this.getMonth() + 1)}-${pad(this.getDate())}T${pad(this.getHours())}:${pad(this.getMinutes())}:${pad(this.getSeconds())}.${String(this.getMilliseconds()).padStart(3, '0')}`;
  };
  return localDate;
}

export class AttendanceService {
  async processAttendance(payload: AttendancePayload) {
    const { student_id, latitude, longitude, accuracy, device_uuid, photoPath } = payload;
    const authenticatedUserId = payload.authenticatedUserId;

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const acc = parseFloat(accuracy);

    if (isNaN(lat) || isNaN(lon) || isNaN(acc)) {
      this.cleanupFile(photoPath);
      return { success: false, message: 'Parameter spasial tidak valid.' };
    }

    const geofence = await settingService.getGeofenceConfig();

    if (acc > geofence.max_accuracy_meters) {
      this.cleanupFile(photoPath);
      return { success: false, message: `Akurasi sinyal GPS buruk (${acc.toFixed(1)}m). Cari tempat lapang (Maksimum ${geofence.max_accuracy_meters.toFixed(1)}m).` };
    }

    const distance = getDistance(
      { latitude: lat, longitude: lon },
      { latitude: geofence.school_latitude, longitude: geofence.school_longitude }
    );

    if (distance > geofence.school_radius_meters) {
      this.cleanupFile(photoPath);
      return { success: false, message: `Presensi Ditolak! Anda berada di luar area sekolah. Jarak: ${distance.toFixed(1)}m (Maksimum ${geofence.school_radius_meters.toFixed(1)}m).` };
    }

    // Resolve student
    let studentRecord = await db.select().from(students).where(eq(students.userId, authenticatedUserId)).limit(1);

    if (studentRecord.length === 0 && student_id) {
      studentRecord = await db.select().from(students).where(eq(students.nis, student_id)).limit(1);

      if (studentRecord.length > 0) {
        const found = studentRecord[0];
        if (found.userId) {
          this.cleanupFile(photoPath);
          return { success: false, message: 'Profil siswa sudah terikat dengan akun lain. Silakan hubungi Admin/Guru.' };
        }
        await db.update(students)
          .set({ userId: authenticatedUserId, updatedAt: new Date() })
          .where(eq(students.id, found.id));
        found.userId = authenticatedUserId;
      }
    }

    if (studentRecord.length === 0 && device_uuid) {
      studentRecord = await db.select().from(students).where(eq(students.deviceUuid, device_uuid)).limit(1);
      if (studentRecord.length > 0) {
        const found = studentRecord[0];
        if (found.userId) {
          this.cleanupFile(photoPath);
          return { success: false, message: 'Profil siswa sudah terikat dengan akun lain. Silakan hubungi Admin/Guru.' };
        }
        await db.update(students)
          .set({ userId: authenticatedUserId, updatedAt: new Date() })
          .where(eq(students.id, found.id));
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
      await db.update(students)
        .set({ deviceUuid: device_uuid, updatedAt: new Date() })
        .where(eq(students.id, student.id));
      student.deviceUuid = device_uuid;
    } else if (student.deviceUuid !== device_uuid) {
      this.cleanupFile(photoPath);
      return { success: false, message: 'Gagal! Akun Anda terikat pada HP lain. Silakan hubungi Admin/Guru untuk me-reset perangkat.' };
    }

    // Active academic year & semester
    const activeYear = await db.select().from(academicYears).where(eq(academicYears.isActive, true)).limit(1);
    const activeSemester = await db.select().from(semesters).where(eq(semesters.isActive, true)).limit(1);

    if (activeYear.length === 0 || activeSemester.length === 0) {
      this.cleanupFile(photoPath);
      return { success: false, message: 'Tahun ajaran atau semester aktif belum diatur di server.' };
    }

    // Day schedule
    const serverTime = new Date();
    const dayName = serverTime.toLocaleDateString('en-US', { weekday: 'long' });
    const scheduleRecord = await db.select().from(schedules).where(eq(schedules.dayName, dayName)).limit(1);

    if (scheduleRecord.length === 0) {
      this.cleanupFile(photoPath);
      return { success: false, message: `Jadwal sekolah tidak ditemukan untuk hari ${dayName}.` };
    }

    const schedule = scheduleRecord[0];
    const attendanceDate = this.formatDate(serverTime);
    const currentTimeStr = this.formatTime(serverTime);

    // Check existing attendance
    const existingAttendance = await db.select()
      .from(attendances)
      .where(and(
        eq(attendances.studentId, student.id),
        eq(attendances.attendanceDate, attendanceDate)
      ))
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

      await db.insert(attendances).values({
        studentId: student.id,
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

    await db.update(attendances)
      .set({
        checkoutTime: toDatabaseLocalTime(serverTime),
        checkoutPhoto: photoUrl,
        checkoutLatitude: lat,
        checkoutLongitude: lon,
        updatedAt: toDatabaseLocalTime(serverTime),
      })
      .where(eq(attendances.id, record.id));

    return { success: true, message: `Absen Pulang Berhasil! Hati-hati di jalan. Jarak: ${distance.toFixed(1)}m.` };
  }

  async processQrAttendance(payload: QrAttendancePayload) {
    const { student_nis } = payload;

    const studentRecord = await db.select().from(students).where(eq(students.nis, student_nis)).limit(1);
    if (studentRecord.length === 0) {
      return { success: false, message: `Siswa dengan NIS ${student_nis} tidak ditemukan di database.` };
    }

    const student = studentRecord[0];
    const activeYear = await db.select().from(academicYears).where(eq(academicYears.isActive, true)).limit(1);
    const activeSemester = await db.select().from(semesters).where(eq(semesters.isActive, true)).limit(1);

    if (activeYear.length === 0 || activeSemester.length === 0) {
      return { success: false, message: 'Tahun ajaran atau semester aktif belum diatur di server.' };
    }

    const serverTime = new Date();
    const dayName = serverTime.toLocaleDateString('en-US', { weekday: 'long' });
    const scheduleRecord = await db.select().from(schedules).where(eq(schedules.dayName, dayName)).limit(1);

    if (scheduleRecord.length === 0) {
      return { success: false, message: `Jadwal sekolah tidak ditemukan untuk hari ${dayName}.` };
    }

    const schedule = scheduleRecord[0];
    const attendanceDate = this.formatDate(serverTime);
    const currentTimeStr = this.formatTime(serverTime);

    const existingAttendance = await db.select()
      .from(attendances)
      .where(and(
        eq(attendances.studentId, student.id),
        eq(attendances.attendanceDate, attendanceDate)
      ))
      .limit(1);

    if (existingAttendance.length > 0) {
      if (existingAttendance[0].checkoutTime !== null) {
        return { success: false, message: `Siswa ${student_nis} sudah melakukan absen lengkap (datang + pulang) hari ini.` };
      }

      if (currentTimeStr < schedule.checkoutTime) {
        return { success: false, message: `Belum waktunya pulang! Jam pulang ${schedule.checkoutTime}.` };
      }

      await db.update(attendances)
        .set({
          checkoutTime: toDatabaseLocalTime(serverTime),
          updatedAt: toDatabaseLocalTime(serverTime),
        })
        .where(eq(attendances.id, existingAttendance[0].id));

      return { success: true, message: `Absen Pulang berhasil untuk ${student_nis} via QR.` };
    }

    // Check-in via QR
    if (currentTimeStr < schedule.checkinStart) {
      return { success: false, message: `Absen datang belum dibuka. Mulai pada jam ${schedule.checkinStart}.` };
    }

    const isLate = currentTimeStr > schedule.lateAfter;
    const status = isLate ? 'LATE' : 'PRESENT';

    await db.insert(attendances).values({
      studentId: student.id,
      academicYearId: activeYear[0].id,
      semesterId: activeSemester[0].id,
      attendanceDate,
      status,
      checkinTime: toDatabaseLocalTime(serverTime),
    });

    const statusMsg = isLate ? 'Terlambat' : 'Tepat Waktu';
    return { success: true, message: `Absen ${statusMsg} untuk ${student_nis} via QR.` };
  }

  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private formatTime(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  }

  private cleanupFile(filePath: string) {
    try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { /* ignore */ }
  }
}

export const attendanceService = new AttendanceService();
