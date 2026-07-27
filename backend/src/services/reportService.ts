import { reportRepo } from '../repositories/reportRepository.js';
import { getSchoolDate, formatDateWIB, formatTimeWIB } from '../lib/timezone.js';

export class ReportService {
  async getReport(filters: {
    studentId?: number;
    nis?: string;
    classId?: number;
    semesterId?: number;
    academicYearId?: number;
    date?: string;
    month?: number;
    year?: number;
    startDate?: string;
    endDate?: string;
  }) {
    let resolvedStartDate: string | undefined = filters.startDate;
    let resolvedEndDate: string | undefined = filters.endDate;

    const currentServerTime = getSchoolDate();

    if (filters.date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(filters.date)) {
        throw new Error('Format tanggal harus YYYY-MM-DD (contoh: 2026-06-08).');
      }
      resolvedStartDate = filters.date;
      resolvedEndDate = filters.date;
    } else if (filters.month) {
      const defaultDate = formatDateWIB(currentServerTime);
      const year = filters.year ?? parseInt(defaultDate.slice(0, 4));
      const month = filters.month;

      if (month < 1 || month > 12) {
        throw new Error('Bulan harus berada di antara 1 dan 12.');
      }

      const daysInMonth = new Date(year, month, 0).getDate();
      resolvedStartDate = `${year}-${String(month).padStart(2, '0')}-01`;
      resolvedEndDate = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;
    }

    if (resolvedStartDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(resolvedStartDate)) {
        throw new Error('Format tanggal mulai harus YYYY-MM-DD.');
      }
    }
    if (resolvedEndDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(resolvedEndDate)) {
        throw new Error('Format tanggal akhir harus YYYY-MM-DD.');
      }
    }

    const rows = await reportRepo.getAttendanceReport({
      studentId: filters.studentId,
      nis: filters.nis,
      classId: filters.classId,
      semesterId: filters.semesterId,
      academicYearId: filters.academicYearId,
      date: filters.date,
      startDate: resolvedStartDate,
      endDate: resolvedEndDate
    });

    const formatTimestamp = (dateVal: any): string | null => {
      if (!dateVal) return null;
      if (dateVal instanceof Date) {
        if (isNaN(dateVal.getTime())) return null;
        return `${formatDateWIB(dateVal)}T${formatTimeWIB(dateVal)}`;
      }
      const str = String(dateVal);
      if (!str || str === '0000-00-00' || str === '0000-00-00 00:00:00') return null;
      if (str.endsWith('Z')) return str.slice(0, -1);
      return str;
    };

    return rows.map(row => {
      // Safely serialize DATE to YYYY-MM-DD string
      let attendanceDateStr = '';
      const rawDate = row.attendanceDate as any;
      if (rawDate instanceof Date) {
        if (!isNaN(rawDate.getTime())) {
          const y = rawDate.getFullYear();
          const m = String(rawDate.getMonth() + 1).padStart(2, '0');
          const d = String(rawDate.getDate()).padStart(2, '0');
          attendanceDateStr = `${y}-${m}-${d}`;
        }
      } else {
        attendanceDateStr = String(row.attendanceDate);
      }

      return {
        id: row.id,
        attendanceDate: attendanceDateStr,
        status: row.status,
        checkinTime: formatTimestamp(row.checkinTime),
        checkinPhoto: row.checkinPhoto,
        checkinLatitude: row.checkinLatitude,
        checkinLongitude: row.checkinLongitude,
        checkoutTime: formatTimestamp(row.checkoutTime),
        checkoutPhoto: row.checkoutPhoto,
        checkoutLatitude: row.checkoutLatitude,
        checkoutLongitude: row.checkoutLongitude,
        student: {
          id: row.studentId,
          nis: row.studentNis,
          name: row.studentName
        },
        class: {
          id: row.classId,
          name: row.className
        },
        academicYear: {
          id: row.academicYearId,
          name: row.academicYearName
        },
        semester: {
          id: row.semesterId,
          name: row.semesterName
        }
      };
    });
  }

  async getRecap(filters: {
    type: 'daily' | 'weekly' | 'monthly' | 'semester';
    classId?: number;
    date?: string;
    startDate?: string;
    endDate?: string;
    month?: number;
    year?: number;
    semesterId?: number;
    academicYearId?: number;
    teacherId?: string;
  }) {
    const currentServerTime = getSchoolDate();
    let startDate: string;
    let endDate: string;

    if (filters.type === 'daily') {
      startDate = filters.date || formatDateWIB(currentServerTime);
      endDate = startDate;
    } else if (filters.type === 'weekly') {
      const baseDate = filters.date ? new Date(filters.date + 'T00:00:00+07:00') : currentServerTime;
      const day = baseDate.getUTCDay();
      const mon = new Date(baseDate);
      mon.setUTCDate(baseDate.getUTCDate() - ((day + 6) % 7));
      const sat = new Date(mon);
      sat.setUTCDate(mon.getUTCDate() + 5);
      startDate = formatDateWIB(mon);
      endDate = formatDateWIB(sat);
    } else if (filters.type === 'monthly') {
      const defaultDate = formatDateWIB(currentServerTime);
      const year = filters.year ?? parseInt(defaultDate.slice(0, 4));
      const month = filters.month ?? parseInt(defaultDate.slice(5, 7));
      const daysInMonth = new Date(year, month, 0).getDate();
      startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      endDate = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;
    } else {
      startDate = filters.startDate || formatDateWIB(currentServerTime);
      endDate = filters.endDate || startDate;
    }

    const formatTime = (t: any): string | null => {
      if (!t) return null;
      if (t instanceof Date) {
        if (isNaN(t.getTime())) return null;
        return formatTimeWIB(t);
      }
      const s = String(t);
      if (s.includes('T')) return s.slice(11, 19);
      return s;
    };

    const rows = await reportRepo.getRecapReport({
      classId: filters.classId,
      startDate,
      endDate,
      teacherId: filters.teacherId,
    });

    const studentMap = new Map<number, any>();
    const dailyRecap: Record<string, any> = {};
    let totalPresent = 0, totalLate = 0, totalSick = 0, totalExcused = 0, totalAbsent = 0;

    for (const row of rows) {
      const dStr = String(row.attendanceDate);
      if (!dailyRecap[dStr]) {
        dailyRecap[dStr] = { present: 0, late: 0, sick: 0, excused: 0, absent: 0 };
      }
      if (row.status === 'PRESENT') dailyRecap[dStr].present++;
      else if (row.status === 'LATE') dailyRecap[dStr].late++;
      else if (row.status === 'SICK') dailyRecap[dStr].sick++;
      else if (row.status === 'EXCUSED') dailyRecap[dStr].excused++;
      else if (row.status === 'ABSENT') dailyRecap[dStr].absent++;

      if (row.status === 'PRESENT') totalPresent++;
      else if (row.status === 'LATE') totalLate++;
      else if (row.status === 'SICK') totalSick++;
      else if (row.status === 'EXCUSED') totalExcused++;
      else if (row.status === 'ABSENT') totalAbsent++;

      if (!studentMap.has(row.studentId)) {
        studentMap.set(row.studentId, {
          studentId: row.studentId,
          nis: row.studentNis,
          name: row.studentName,
          className: row.className,
          records: [],
        });
      }
      studentMap.get(row.studentId).records.push({
        date: dStr,
        status: row.status,
        checkinTime: formatTime(row.checkinTime),
        checkoutTime: formatTime(row.checkoutTime),
      });
    }

    const students = Array.from(studentMap.values());

    return {
      startDate,
      endDate,
      summary: {
        totalStudents: students.length,
        presentCount: totalPresent,
        lateCount: totalLate,
        sickCount: totalSick,
        excusedCount: totalExcused,
        absentCount: totalAbsent,
      },
      dailyRecap,
      students,
    };
  }
}

export const reportService = new ReportService();
