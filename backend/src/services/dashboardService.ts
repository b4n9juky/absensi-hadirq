import { dashboardRepo } from '../repositories/dashboardRepository.js';
import { getSchoolDate } from '../lib/timezone.js';
import { settingService } from './settingService.js';

export interface DashboardStatsDto {
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  daysCount: number;
  serverTime: string;
  schoolName: string;
}

export class DashboardService {
  async getStats(filters: {
    date?: string;
    month?: number;
    year?: number;
    classId?: number;
  }): Promise<DashboardStatsDto> {
    let startDate: string;
    let endDate: string;
    let daysCount = 1;

    const currentServerTime = getSchoolDate();

    if (filters.date) {
      // Validate date format YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(filters.date)) {
        throw new Error('Format tanggal harus YYYY-MM-DD (contoh: 2026-06-08).');
      }
      startDate = filters.date;
      endDate = filters.date;
      daysCount = await dashboardRepo.getActiveSchoolDayCount(startDate, endDate);
    } else if (filters.month || filters.year) {
      const year = filters.year ?? currentServerTime.getUTCFullYear();
      const month = filters.month ?? (currentServerTime.getUTCMonth() + 1);

      if (month < 1 || month > 12) {
        throw new Error('Bulan harus berada di antara 1 dan 12.');
      }

      const daysInMonth = new Date(year, month, 0).getDate();
      startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      endDate = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;
      daysCount = await dashboardRepo.getActiveSchoolDayCount(startDate, endDate);
    } else {
      // Default to today in WIB
      const localYear = currentServerTime.getUTCFullYear();
      const localMonth = String(currentServerTime.getUTCMonth() + 1).padStart(2, '0');
      const localDay = String(currentServerTime.getUTCDate()).padStart(2, '0');
      startDate = `${localYear}-${localMonth}-${localDay}`;
      endDate = startDate;
      daysCount = await dashboardRepo.getActiveSchoolDayCount(startDate, endDate);
    }

    const [totalStudents, presentCount, lateCount, schoolName] = await Promise.all([
      dashboardRepo.getTotalStudents(filters.classId),
      dashboardRepo.getAttendanceCount('PRESENT', startDate, endDate, filters.classId),
      dashboardRepo.getAttendanceCount('LATE', startDate, endDate, filters.classId),
      settingService.getValue('school_name')
    ]);

    // Calculate absentCount: (totalStudents * daysCount) - (presentCount + lateCount)
    // Ensures that it doesn't go below 0
    const rawAbsent = (totalStudents * daysCount) - (presentCount + lateCount);
    const absentCount = rawAbsent < 0 ? 0 : rawAbsent;

    return {
      totalStudents,
      presentCount,
      lateCount,
      absentCount,
      daysCount,
      serverTime: currentServerTime.toISOString(),
      schoolName: schoolName || 'Sekolah'
    };
  }
}

export const dashboardService = new DashboardService();
