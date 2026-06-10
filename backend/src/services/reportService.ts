import { reportRepo } from '../repositories/reportRepository.js';

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

    const currentServerTime = new Date();

    if (filters.date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(filters.date)) {
        throw new Error('Format tanggal harus YYYY-MM-DD (contoh: 2026-06-08).');
      }
      resolvedStartDate = filters.date;
      resolvedEndDate = filters.date;
    } else if (filters.month) {
      const year = filters.year ?? currentServerTime.getFullYear();
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
        return dateVal.toISOString().slice(0, -1);
      }
      const str = String(dateVal);
      if (str.endsWith('Z')) {
        return str.slice(0, -1);
      }
      return str;
    };

    return rows.map(row => {
      // Safely serialize DATE to YYYY-MM-DD string
      let attendanceDateStr = '';
      const rawDate = row.attendanceDate as any;
      if (rawDate instanceof Date) {
        const y = rawDate.getFullYear();
        const m = String(rawDate.getMonth() + 1).padStart(2, '0');
        const d = String(rawDate.getDate()).padStart(2, '0');
        attendanceDateStr = `${y}-${m}-${d}`;
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
          nis: row.studentNis
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
}

export const reportService = new ReportService();
