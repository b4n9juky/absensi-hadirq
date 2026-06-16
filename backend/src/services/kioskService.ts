import { db } from '../db/index.js';
import { students, attendances, academicYears, semesters, schedules } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getJakartaDate } from '../lib/timezone.js';

function toDatabaseLocalTime(date: Date): Date {
  const localDate = new Date(date);
  localDate.toISOString = function () {
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${this.getFullYear()}-${pad(this.getMonth() + 1)}-${pad(this.getDate())}T${pad(this.getHours())}:${pad(this.getMinutes())}:${pad(this.getSeconds())}.${String(this.getMilliseconds()).padStart(3, '0')}`;
  };
  return localDate;
}

function getLocalEpoch(date: Date): number {
  return Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  );
}

export class KioskService {
  async processKioskAttendance(studentId: number, status?: 'PRESENT' | 'LATE' | 'SICK' | 'EXCUSED' | 'ABSENT') {
    const studentRecord = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
    if (studentRecord.length === 0) {
      return { success: false, message: `Siswa tidak ditemukan di database.` };
    }

    const student = studentRecord[0];
    const activeYear = await db.select().from(academicYears).where(eq(academicYears.isActive, true)).limit(1);
    const activeSemester = await db.select().from(semesters).where(eq(semesters.isActive, true)).limit(1);

    if (activeYear.length === 0 || activeSemester.length === 0) {
      return { success: false, message: 'Tahun ajaran atau semester aktif belum diatur di server.' };
    }

    const serverTime = getJakartaDate();
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

      await db.update(attendances)
        .set({
          checkoutTime: toDatabaseLocalTime(serverTime),
          updatedAt: toDatabaseLocalTime(serverTime),
        })
        .where(eq(attendances.id, record.id));

      return { success: true, message: `Absen Pulang berhasil! Hati-hati di jalan.` };
    }

    // New Check-in
    // Enforce rule: Cannot check in (Datang) before checkin start time
    if (currentTimeStr < schedule.checkinStart) {
      return { success: false, message: `Absen datang belum dibuka. Mulai pada jam ${schedule.checkinStart}.` };
    }

    // Enforce rule: Cannot check in (Datang) if current time is past school checkout time
    if (currentTimeStr >= schedule.checkoutTime) {
      return { success: false, message: 'Anda belum absen datang hari ini. Silakan hubungi Guru/Admin.' };
    }

    // Check-in
    await db.insert(attendances).values({
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
    if (targetStatus === 'LATE') statusMsg = 'Terlambat';
    return { success: true, message: `Absen ${statusMsg} berhasil!` };
  }

  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private formatTime(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  }
}

export const kioskService = new KioskService();
