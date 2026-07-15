import { db } from '../db/index.js';
import { students, attendances, schedules } from '../db/schema.js';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export class DashboardRepository {
  async getTotalStudents(classId?: number): Promise<number> {
    const query = db.select({ count: sql<number>`count(*)` }).from(students);
    if (classId) {
      query.where(eq(students.classId, classId));
    }
    const result = await query;
    return Number(result[0]?.count || 0);
  }

  async getAttendanceCount(
    status: 'PRESENT' | 'LATE',
    startDate: string,
    endDate: string,
    classId?: number
  ): Promise<number> {
    const conditions = [
      eq(attendances.status, status),
      gte(attendances.attendanceDate, startDate),
      lte(attendances.attendanceDate, endDate)
    ];

    if (classId) {
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(attendances)
        .innerJoin(students, eq(attendances.studentId, students.id))
        .where(and(...conditions, eq(students.classId, classId)));
      return Number(result[0]?.count || 0);
    } else {
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(attendances)
        .where(and(...conditions));
      return Number(result[0]?.count || 0);
    }
  }

  async getActiveSchoolDayCount(startDate: string, endDate: string): Promise<number> {
    const activeDays = await db.select({ dayName: schedules.dayName })
      .from(schedules)
      .where(eq(schedules.isActive, true));

    const activeDayNames = new Set(activeDays.map(d => d.dayName));
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let count = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayName = dayNames[d.getDay()];
      if (activeDayNames.has(dayName)) {
        count++;
      }
    }

    return count;
  }
}

export const dashboardRepo = new DashboardRepository();
