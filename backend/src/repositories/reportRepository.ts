import { db } from '../db/index.js';
import { attendances, students, classes, academicYears, semesters } from '../db/schema.js';
import { eq, and, gte, lte } from 'drizzle-orm';

export interface ReportFilters {
  studentId?: number;
  nis?: string;
  classId?: number;
  semesterId?: number;
  academicYearId?: number;
  date?: string;
  startDate?: string;
  endDate?: string;
}

export class ReportRepository {
  async getAttendanceReport(filters: ReportFilters) {
    const query = db.select({
      id: attendances.id,
      attendanceDate: attendances.attendanceDate,
      status: attendances.status,
      checkinTime: attendances.checkinTime,
      checkinPhoto: attendances.checkinPhoto,
      checkinLatitude: attendances.checkinLatitude,
      checkinLongitude: attendances.checkinLongitude,
      checkoutTime: attendances.checkoutTime,
      checkoutPhoto: attendances.checkoutPhoto,
      checkoutLatitude: attendances.checkoutLatitude,
      checkoutLongitude: attendances.checkoutLongitude,
      studentId: students.id,
      studentNis: students.nis,
      classId: classes.id,
      className: classes.name,
      academicYearId: academicYears.id,
      academicYearName: academicYears.name,
      semesterId: semesters.id,
      semesterName: semesters.name
    })
    .from(attendances)
    .innerJoin(students, eq(attendances.studentId, students.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(academicYears, eq(attendances.academicYearId, academicYears.id))
    .innerJoin(semesters, eq(attendances.semesterId, semesters.id));

    const conditions = [];

    if (filters.studentId !== undefined) {
      conditions.push(eq(attendances.studentId, filters.studentId));
    }
    if (filters.nis) {
      conditions.push(eq(students.nis, filters.nis));
    }
    if (filters.classId !== undefined) {
      conditions.push(eq(students.classId, filters.classId));
    }
    if (filters.semesterId !== undefined) {
      conditions.push(eq(attendances.semesterId, filters.semesterId));
    }
    if (filters.academicYearId !== undefined) {
      conditions.push(eq(attendances.academicYearId, filters.academicYearId));
    }
    if (filters.date) {
      conditions.push(eq(attendances.attendanceDate, filters.date));
    } else {
      if (filters.startDate) {
        conditions.push(gte(attendances.attendanceDate, filters.startDate));
      }
      if (filters.endDate) {
        conditions.push(lte(attendances.attendanceDate, filters.endDate));
      }
    }

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    // Order descending by date, then checkin time
    query.orderBy(attendances.attendanceDate, attendances.checkinTime);

    return query;
  }
}

export const reportRepo = new ReportRepository();
