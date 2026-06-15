import { db } from '../db/index.js';
import { teachingSchedules, students, classes, attendances, user } from '../db/schema.js';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { attendanceService } from './attendanceService.js';
import { getJakartaDate } from '../lib/timezone.js';

export class TeacherService {
  async getTeacherData(teacherId: string) {
    const rows = await db.select({ name: user.name }).from(user).where(eq(user.id, teacherId)).limit(1);
    return rows.length > 0 ? rows[0] : null;
  }

  async getCurrentSchedule(teacherId: string) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = getJakartaDate();
    const dayName = days[now.getDay()];
    const currentTime = now.toTimeString().slice(0, 8);

    const rows = await db.select({
      id: teachingSchedules.id,
      classId: teachingSchedules.classId,
      className: classes.name,
      subject: teachingSchedules.subject,
      startTime: teachingSchedules.startTime,
      endTime: teachingSchedules.endTime,
      dayName: teachingSchedules.dayName,
    })
    .from(teachingSchedules)
    .innerJoin(classes, eq(teachingSchedules.classId, classes.id))
    .where(and(
      eq(teachingSchedules.teacherId, teacherId),
      eq(teachingSchedules.dayName, dayName),
      lte(teachingSchedules.startTime, currentTime),
      gte(teachingSchedules.endTime, currentTime),
    ))
    .limit(1);

    return rows.length > 0 ? rows[0] : null;
  }

  async getUpcomingSchedule(teacherId: string) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = getJakartaDate();
    const dayName = days[now.getDay()];
    const currentTime = now.toTimeString().slice(0, 8);

    const rows = await db.select({
      id: teachingSchedules.id,
      classId: teachingSchedules.classId,
      className: classes.name,
      subject: teachingSchedules.subject,
      startTime: teachingSchedules.startTime,
      endTime: teachingSchedules.endTime,
      dayName: teachingSchedules.dayName,
    })
    .from(teachingSchedules)
    .innerJoin(classes, eq(teachingSchedules.classId, classes.id))
    .where(and(
      eq(teachingSchedules.teacherId, teacherId),
      eq(teachingSchedules.dayName, dayName),
      gte(teachingSchedules.startTime, currentTime),
    ))
    .orderBy(teachingSchedules.startTime)
    .limit(1);

    return rows.length > 0 ? rows[0] : null;
  }

  async getClassStudentsWithAttendance(classId: number) {
    const jakartaDate = getJakartaDate();
    const today = `${jakartaDate.getFullYear()}-${String(jakartaDate.getMonth() + 1).padStart(2, '0')}-${String(jakartaDate.getDate()).padStart(2, '0')}`;

    const rows = await db.select({
      studentId: students.id,
      nis: students.nis,
      studentName: user.name,
      status: attendances.status,
      checkinTime: attendances.checkinTime,
      checkoutTime: attendances.checkoutTime,
      isVerified: attendances.isVerified,
    })
    .from(students)
    .innerJoin(user, eq(students.userId, user.id))
    .leftJoin(attendances, and(
      eq(attendances.studentId, students.id),
      eq(attendances.attendanceDate, today),
    ))
    .where(eq(students.classId, classId))
    .orderBy(user.name);

    return rows;
  }

  async markAttendance(teacherId: string, teacherName: string, studentNis: string, status?: 'PRESENT' | 'LATE' | 'SICK' | 'EXCUSED' | 'ABSENT', isVerified?: boolean) {
    return attendanceService.processQrAttendance({
      student_nis: studentNis,
      teacherUserId: teacherId,
      teacherName: teacherName,
      status,
      isVerified,
    });
  }

  async markAttendanceBulk(teacherId: string, teacherName: string, studentNisList: string[]) {
    const jakartaDate = getJakartaDate();
    const today = `${jakartaDate.getFullYear()}-${String(jakartaDate.getMonth() + 1).padStart(2, '0')}-${String(jakartaDate.getDate()).padStart(2, '0')}`;

    if (!studentNisList || studentNisList.length === 0) {
      return { success: true, message: 'Tidak ada siswa untuk diverifikasi.' };
    }

    // Find student IDs matching the NIS list
    const studentRecords = await db.select({ id: students.id })
      .from(students)
      .where(inArray(students.nis, studentNisList));

    if (studentRecords.length === 0) {
      return { success: false, message: 'Siswa tidak ditemukan.' };
    }

    const studentIds = studentRecords.map(s => s.id);

    // Update isVerified = true for existing attendances today
    await db.update(attendances)
      .set({
        isVerified: true,
        updatedAt: new Date()
      })
      .where(and(
        inArray(attendances.studentId, studentIds),
        eq(attendances.attendanceDate, today)
      ));

    return { success: true, message: `Berhasil memverifikasi ${studentNisList.length} siswa.` };
  }
}

export const teacherService = new TeacherService();
