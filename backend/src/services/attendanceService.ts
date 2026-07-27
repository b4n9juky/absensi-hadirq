import { db } from '../db/index.js';
import {
  students, attendances, academicYears, semesters, schedules,
} from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { getSchoolDate } from '../lib/timezone.js';

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

export class AttendanceService {
  async processAttendance(payload: AttendancePayload) {
    this.cleanupFile(payload.photoPath);
    return { success: false, message: 'Absensi mandiri siswa telah dinonaktifkan. Absensi hanya dapat dilakukan oleh Guru.' };
  }

  async processQrAttendance(payload: QrAttendancePayload & { status?: 'PRESENT' | 'LATE' | 'SICK' | 'EXCUSED' | 'ABSENT', isVerified?: boolean }) {
    const { student_nis, status: requestedStatus, isVerified: requestedIsVerified } = payload;

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

    const serverTime = getSchoolDate();
    const dayName = serverTime.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Jakarta' });
    const scheduleRecord = await db.select().from(schedules).where(eq(schedules.dayName, dayName)).limit(1);

    if (scheduleRecord.length === 0) {
      return { success: false, message: `Jadwal sekolah tidak ditemukan untuk hari ${dayName}.` };
    }

    const schedule = scheduleRecord[0];

    if (!schedule.isActive) {
      return { success: false, message: 'Hari ini bukan hari sekolah. Presensi tidak tersedia.' };
    }
    const attendanceDate = this.formatDate(serverTime);
    const currentTimeStr = this.formatTime(serverTime);

    const existingAttendance = await db.select()
      .from(attendances)
      .where(and(
        eq(attendances.studentId, student.id),
        eq(attendances.attendanceDate, attendanceDate)
      ))
      .limit(1);

    const targetStatus = requestedStatus || (currentTimeStr > schedule.lateAfter ? 'LATE' : 'PRESENT');
    const targetIsVerified = requestedIsVerified !== undefined ? requestedIsVerified : true;

    if (existingAttendance.length > 0) {
      const record = existingAttendance[0];

      // If custom status or explicit verification is requested
      if (requestedStatus || requestedIsVerified !== undefined) {
        await db.update(attendances)
          .set({
            status: targetStatus,
            isVerified: targetIsVerified,
            updatedAt: serverTime,
          })
          .where(eq(attendances.id, record.id));

        let statusText = 'Hadir';
        if (targetStatus === 'SICK') statusText = 'Sakit';
        else if (targetStatus === 'EXCUSED') statusText = 'Izin';
        else if (targetStatus === 'ABSENT') statusText = 'Alfa';
        else if (targetStatus === 'LATE') statusText = 'Terlambat';
        return { success: true, message: `Status siswa ${student_nis} diubah menjadi ${statusText}.` };
      }

      const isQrCheckoutValid = record.checkoutTime != null &&
        !(record.checkoutTime instanceof Date && isNaN(record.checkoutTime.getTime()));

      if (isQrCheckoutValid) {
        return { success: false, message: `Siswa ${student_nis} sudah melakukan absen lengkap (datang + pulang) hari ini.` };
      }

      if (currentTimeStr < schedule.checkinStart) {
        return { success: false, message: `Absen datang belum dibuka. Mulai pada jam ${schedule.checkinStart}.` };
      }

      if (currentTimeStr < schedule.checkoutTime) {
        // Class check-in verification
        await db.update(attendances)
          .set({
            isVerified: true,
            updatedAt: serverTime,
          })
          .where(eq(attendances.id, record.id));
        return { success: true, message: `Absen datang siswa ${student_nis} berhasil diverifikasi di kelas.` };
      }

      await db.update(attendances)
        .set({
          checkoutTime: serverTime,
          updatedAt: serverTime,
        })
        .where(eq(attendances.id, record.id));

        return { success: true, message: `Absen Pulang berhasil untuk ${student_nis} via QR.` };
    }

    // Check-in via QR (does not exist yet)
    await db.insert(attendances).values({
      studentId: student.id,
      classId: student.classId,
      academicYearId: activeYear[0].id,
      semesterId: activeSemester[0].id,
      attendanceDate,
      status: targetStatus,
      isVerified: targetIsVerified,
      checkinTime: serverTime,
    });

    let statusMsg = 'Hadir';
    if (targetStatus === 'SICK') statusMsg = 'Sakit';
    else if (targetStatus === 'EXCUSED') statusMsg = 'Izin';
    else if (targetStatus === 'ABSENT') statusMsg = 'Alfa';
    else if (targetStatus === 'LATE') statusMsg = 'Terlambat';
    return { success: true, message: `Absen ${statusMsg} berhasil untuk ${student_nis} via QR.` };
  }

  async deleteAttendance(id: number) {
    const records = await db.select().from(attendances).where(eq(attendances.id, id)).limit(1);

    if (records.length === 0) {
      return { success: false, message: 'Data absensi tidak ditemukan.' };
    }

    const record = records[0];

    if (record.checkinPhoto) {
      const filePath = path.join(__dirname, '../..', record.checkinPhoto);
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { /* ignore */ }
    }
    if (record.checkoutPhoto) {
      const filePath = path.join(__dirname, '../..', record.checkoutPhoto);
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { /* ignore */ }
    }

    await db.delete(attendances).where(eq(attendances.id, id));

    return { success: true, message: 'Data absensi berhasil dihapus.' };
  }

  private formatDate(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  private formatTime(date: Date): string {
    return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:${String(date.getUTCSeconds()).padStart(2, '0')}`;
  }

  private cleanupFile(filePath: string) {
    try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { /* ignore */ }
  }
}

export const attendanceService = new AttendanceService();
