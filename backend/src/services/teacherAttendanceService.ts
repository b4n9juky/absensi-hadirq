import { teacherAttendanceRepo } from '../repositories/teacherAttendanceRepository.js';
import { schedules } from '../db/schema.js';
import { db } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { getSchoolDate, formatDateWIB, formatTimeWIB, getWIBDay } from '../lib/timezone.js';

const DEFAULT_CHECKIN_START = '06:30:00';
const DEFAULT_LATE_AFTER = '07:00:00';
const DEFAULT_CHECKOUT_TIME = '15:00:00';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export class TeacherAttendanceService {
  async checkin(teacherId: string) {
    const now = getSchoolDate();
    const today = formatDateWIB(now);
    const currentTime = formatTimeWIB(now);

    const existing = await teacherAttendanceRepo.findByTeacherAndDate(teacherId, today);
    if (existing) {
      if (existing.checkinTime) {
        throw new Error('Anda sudah melakukan absen masuk hari ini.');
      }
    }

    const dayName = dayNames[getWIBDay(now)];
    const daySchedule = await db.select()
      .from(schedules)
      .where(eq(schedules.dayName, dayName))
      .limit(1);

    const lateAfter = daySchedule.length > 0 ? daySchedule[0].lateAfter : DEFAULT_LATE_AFTER;
    const checkinStart = daySchedule.length > 0 ? daySchedule[0].checkinStart : DEFAULT_CHECKIN_START;

    const isLate = currentTime > lateAfter;

    if (existing && !existing.checkinTime) {
      await teacherAttendanceRepo.update(existing.id, {
        checkinTime: now,
        status: isLate ? 'LATE' : 'PRESENT',
      });
      return { success: true, message: isLate ? 'Absen masuk (TERLAMBAT)' : 'Absen masuk berhasil', status: isLate ? 'LATE' : 'PRESENT' };
    }

    await teacherAttendanceRepo.create({
      schoolId: 0,
      teacherId,
      attendanceDate: today,
      checkinTime: now,
      status: isLate ? 'LATE' : 'PRESENT',
    });

    return { success: true, message: isLate ? 'Absen masuk (TERLAMBAT)' : 'Absen masuk berhasil', status: isLate ? 'LATE' : 'PRESENT' };
  }

  async checkout(teacherId: string) {
    const now = getSchoolDate();
    const today = formatDateWIB(now);

    const existing = await teacherAttendanceRepo.findByTeacherAndDate(teacherId, today);
    if (!existing) {
      throw new Error('Anda belum absen masuk hari ini.');
    }
    if (existing.checkoutTime) {
      throw new Error('Anda sudah absen pulang hari ini.');
    }

    await teacherAttendanceRepo.updateCheckout(existing.id, now);
    return { success: true, message: 'Absen pulang berhasil' };
  }

  async getMyStatus(teacherId: string) {
    const now = getSchoolDate();
    const today = formatDateWIB(now);

    const record = await teacherAttendanceRepo.findByTeacherAndDate(teacherId, today);
    if (!record) {
      return { checkedIn: false, checkedOut: false, record: null };
    }

    return {
      checkedIn: !!record.checkinTime,
      checkedOut: !!record.checkoutTime,
      record: {
        id: record.id,
        checkinTime: record.checkinTime,
        checkoutTime: record.checkoutTime,
        status: record.status,
        isVerified: record.isVerified,
        note: record.note,
      },
    };
  }

  async getReport(filters: {
    teacherId?: string;
    date?: string;
    month?: number;
    year?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const currentServerTime = getSchoolDate();
    let startDate: string;
    let endDate: string;

    if (filters.date) {
      startDate = filters.date;
      endDate = filters.date;
    } else if (filters.month && filters.year) {
      const daysInMonth = new Date(filters.year, filters.month, 0).getDate();
      startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
      endDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-${daysInMonth}`;
    } else {
      startDate = filters.startDate || formatDateWIB(currentServerTime);
      endDate = filters.endDate || startDate;
    }

    const [rows, summary] = await Promise.all([
      teacherAttendanceRepo.getReport({
        teacherId: filters.teacherId,
        startDate,
        endDate,
      }),
      teacherAttendanceRepo.getAdminSummary({ startDate, endDate }),
    ]);

    const formatTime = (t: any): string | null => {
      if (!t) return null;
      if (t instanceof Date) return formatTimeWIB(t);
      const s = String(t);
      if (s.includes('T')) return s.slice(11, 19);
      return s;
    };

    return {
      startDate,
      endDate,
      records: rows.map(r => ({
        ...r,
        checkinTime: formatTime(r.checkinTime),
        checkoutTime: formatTime(r.checkoutTime),
      })),
      summary,
    };
  }

  async getTeachers() {
    return await teacherAttendanceRepo.getAllTeachers();
  }
}

export const teacherAttendanceService = new TeacherAttendanceService();