import { db } from '../db/index.js';
import { attendances, students, classes, academicYears, semesters, teachingSchedules } from '../db/schema.js';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';

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
    // Build base query selecting required fields
    let query = db
      .select({
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
        studentName: students.name,
        classId: classes.id,
        className: classes.name,
        academicYearId: academicYears.id,
        academicYearName: academicYears.name,
        semesterId: semesters.id,
        semesterName: semesters.name,
      })
      .from(attendances)
      .innerJoin(students, eq(attendances.studentId, students.id))
      .innerJoin(classes, eq(attendances.classId, classes.id))
      .innerJoin(academicYears, eq(attendances.academicYearId, academicYears.id))
      .innerJoin(semesters, eq(attendances.semesterId, semesters.id))
      .$dynamic();

    const conditions = [];

    if (filters.studentId !== undefined) {
      conditions.push(eq(attendances.studentId, filters.studentId));
    }
    if (filters.nis) {
      conditions.push(eq(students.nis, filters.nis));
    }
    if (filters.classId !== undefined) {
      conditions.push(eq(attendances.classId, filters.classId));
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

    // Apply where clause if any conditions were added
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Order results: newest date first, then latest check‑in time
    query = query.orderBy(attendances.attendanceDate, attendances.checkinTime);

    // Execute the query and return rows
    return await query;
  }
  async getRecapReport(filters: {
    classId?: number;
    startDate: string;
    endDate: string;
    teacherId?: string;
  }) {
    let query = db
      .select({
        id: attendances.id,
        attendanceDate: attendances.attendanceDate,
        status: attendances.status,
        checkinTime: attendances.checkinTime,
        checkoutTime: attendances.checkoutTime,
        studentId: students.id,
        studentNis: students.nis,
        studentName: students.name,
        classId: classes.id,
        className: classes.name,
      })
      .from(attendances)
      .innerJoin(students, eq(attendances.studentId, students.id))
      .innerJoin(classes, eq(attendances.classId, classes.id))
      .where(and(
        gte(attendances.attendanceDate, filters.startDate),
        lte(attendances.attendanceDate, filters.endDate),
      ))
      .$dynamic();

    if (filters.classId) {
      query = query.where(eq(attendances.classId, filters.classId));
    }

    if (filters.teacherId) {
      const teacherClassIds = db.select({ id: classes.id })
        .from(classes)
        .innerJoin(teachingSchedules, eq(teachingSchedules.classId, classes.id))
        .where(eq(teachingSchedules.teacherId, filters.teacherId));
      query = query.where(inArray(attendances.classId, teacherClassIds));
    }

    query = query.orderBy(students.name, attendances.attendanceDate);
    return await query;
  }
}

export const reportRepo = new ReportRepository();
