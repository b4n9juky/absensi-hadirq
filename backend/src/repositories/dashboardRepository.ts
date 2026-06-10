import { db } from '../db/index.js';
import { students, attendances } from '../db/schema.js';
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
}

export const dashboardRepo = new DashboardRepository();
