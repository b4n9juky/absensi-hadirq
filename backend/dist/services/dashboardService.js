"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardService = exports.DashboardService = void 0;
const dashboardRepository_js_1 = require("../repositories/dashboardRepository.js");
const timezone_js_1 = require("../lib/timezone.js");
class DashboardService {
    async getStats(filters) {
        let startDate;
        let endDate;
        let daysCount = 1;
        const currentServerTime = (0, timezone_js_1.getJakartaDate)();
        if (filters.date) {
            // Validate date format YYYY-MM-DD
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(filters.date)) {
                throw new Error('Format tanggal harus YYYY-MM-DD (contoh: 2026-06-08).');
            }
            startDate = filters.date;
            endDate = filters.date;
            daysCount = 1;
        }
        else if (filters.month || filters.year) {
            const year = filters.year ?? currentServerTime.getFullYear();
            const month = filters.month ?? (currentServerTime.getMonth() + 1);
            if (month < 1 || month > 12) {
                throw new Error('Bulan harus berada di antara 1 dan 12.');
            }
            const daysInMonth = new Date(year, month, 0).getDate();
            startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            endDate = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;
            daysCount = daysInMonth;
        }
        else {
            // Default to today in local server time
            const localYear = currentServerTime.getFullYear();
            const localMonth = String(currentServerTime.getMonth() + 1).padStart(2, '0');
            const localDay = String(currentServerTime.getDate()).padStart(2, '0');
            startDate = `${localYear}-${localMonth}-${localDay}`;
            endDate = startDate;
            daysCount = 1;
        }
        const [totalStudents, presentCount, lateCount] = await Promise.all([
            dashboardRepository_js_1.dashboardRepo.getTotalStudents(filters.classId),
            dashboardRepository_js_1.dashboardRepo.getAttendanceCount('PRESENT', startDate, endDate, filters.classId),
            dashboardRepository_js_1.dashboardRepo.getAttendanceCount('LATE', startDate, endDate, filters.classId)
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
            daysCount
        };
    }
}
exports.DashboardService = DashboardService;
exports.dashboardService = new DashboardService();
