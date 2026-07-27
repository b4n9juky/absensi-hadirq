import { db } from '../db/index.js';
import { teachingSchedules, students, classes, attendances, user, subjectAttendances, teacherAgendas, agendaAttendances, teachingSessionLogs, academicYears, semesters } from '../db/schema.js';
import { eq, and, gte, lte, sql, inArray, ne } from 'drizzle-orm';
import { attendanceService } from './attendanceService.js';
import { getSchoolDate } from '../lib/timezone.js';

export class TeacherService {
  async getTeacherData(teacherId: string) {
    const rows = await db.select({ name: user.name }).from(user).where(eq(user.id, teacherId)).limit(1);
    return rows.length > 0 ? rows[0] : null;
  }

  async getCurrentSchedule(teacherId: string) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = getSchoolDate();
    const dayName = days[now.getUTCDay()];
    const currentTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`;

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
    const now = getSchoolDate();
    const dayName = days[now.getUTCDay()];
    const currentTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`;

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

  async getClassStudentsWithFaceStatus(classId: number) {
    const rows = await db.select({
      studentId: students.id,
      nis: students.nis,
      studentName: students.name,
      hasFace: students.faceEmbedding,
    })
    .from(students)
    .where(eq(students.classId, classId))
    .orderBy(students.name);

    return rows.map(r => ({
      studentId: r.studentId,
      nis: r.nis,
      studentName: r.studentName,
      hasFace: r.hasFace !== null,
    }));
  }

  async getClassStudentsWithAttendance(classId: number) {
    const jakartaDate = getSchoolDate();
    const today = `${jakartaDate.getUTCFullYear()}-${String(jakartaDate.getUTCMonth() + 1).padStart(2, '0')}-${String(jakartaDate.getUTCDate()).padStart(2, '0')}`;

    const rows = await db.select({
      studentId: students.id,
      nis: students.nis,
      studentName: students.name,
      status: attendances.status,
      checkinTime: attendances.checkinTime,
      checkoutTime: attendances.checkoutTime,
      isVerified: attendances.isVerified,
    })
    .from(students)
    .leftJoin(attendances, and(
      eq(attendances.studentId, students.id),
      eq(attendances.attendanceDate, today),
    ))
    .where(eq(students.classId, classId))
    .orderBy(students.name);

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
    const jakartaDate = getSchoolDate();
    const today = `${jakartaDate.getUTCFullYear()}-${String(jakartaDate.getUTCMonth() + 1).padStart(2, '0')}-${String(jakartaDate.getUTCDate()).padStart(2, '0')}`;

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

  async markClassAttendance(teacherId: string, classId: number, date: string, entries: { studentId: number; status: string | null }[]) {
    const scheduleCheck = await db.select()
      .from(teachingSchedules)
      .where(and(eq(teachingSchedules.teacherId, teacherId), eq(teachingSchedules.classId, classId)))
      .limit(1);

    if (scheduleCheck.length === 0) {
      throw new Error('Anda tidak mengajar kelas ini. Hanya bisa mengabsen kelas yang Anda ajar.');
    }

    const activeYear = await db.select().from(academicYears).where(eq(academicYears.isActive, true)).limit(1);
    const activeSemester = await db.select().from(semesters).where(eq(semesters.isActive, true)).limit(1);
    const now = getSchoolDate();

    if (activeYear.length === 0 || activeSemester.length === 0) {
      throw new Error('Tahun ajaran atau semester aktif belum diatur.');
    }

    let upserted = 0;
    let deleted = 0;

    for (const entry of entries) {
      if (entry.status === null || entry.status === '') {
        const existing = await db.select({ id: attendances.id })
          .from(attendances)
          .where(and(
            eq(attendances.studentId, entry.studentId),
            eq(attendances.attendanceDate, date),
          ))
          .limit(1);

        if (existing.length > 0) {
          await db.delete(attendances).where(eq(attendances.id, existing[0].id));
          deleted++;
        }
      } else {
        const existing = await db.select({ id: attendances.id })
          .from(attendances)
          .where(and(
            eq(attendances.studentId, entry.studentId),
            eq(attendances.attendanceDate, date),
          ))
          .limit(1);

        if (existing.length > 0) {
          await db.update(attendances)
            .set({
              status: entry.status as any,
              isVerified: true,
              updatedAt: now,
            })
            .where(eq(attendances.id, existing[0].id));
        } else {
          await db.insert(attendances).values({
            studentId: entry.studentId,
            classId,
            academicYearId: activeYear[0].id,
            semesterId: activeSemester[0].id,
            attendanceDate: date,
            status: entry.status as any,
            isVerified: true,
            checkinTime: now,
          });
        }
        upserted++;
      }
    }

    return { success: true, upserted, deleted, message: `Berhasil menyimpan absensi: ${upserted} siswa ditandai, ${deleted} dikosongkan.` };
  }

  async getMySchedules(teacherId: string) {
    const rows = await db.select({
      id: teachingSchedules.id,
      classId: teachingSchedules.classId,
      className: classes.name,
      dayName: teachingSchedules.dayName,
      startTime: teachingSchedules.startTime,
      endTime: teachingSchedules.endTime,
      subject: teachingSchedules.subject,
    })
    .from(teachingSchedules)
    .innerJoin(classes, eq(teachingSchedules.classId, classes.id))
    .where(eq(teachingSchedules.teacherId, teacherId))
    .orderBy(teachingSchedules.dayName, teachingSchedules.startTime);
    return rows;
  }

  async createMySchedule(teacherId: string, dto: {
    classId: number; dayName: string; startTime: string; endTime: string; subject: string;
  }) {
    const conflict = await db.select().from(teachingSchedules)
      .where(and(
        eq(teachingSchedules.teacherId, teacherId),
        eq(teachingSchedules.dayName, dto.dayName),
        eq(teachingSchedules.startTime, dto.startTime),
      )).limit(1);
    if (conflict.length > 0) {
      throw new Error('Jadwal bentrok: Anda sudah memiliki jadwal di hari & jam yang sama.');
    }
    const [result] = await db.insert(teachingSchedules).values({
      teacherId, classId: dto.classId, dayName: dto.dayName,
      startTime: dto.startTime, endTime: dto.endTime, subject: dto.subject,
    });
    return result.insertId;
  }

  async updateMySchedule(teacherId: string, id: number, dto: {
    classId?: number; dayName?: string; startTime?: string; endTime?: string; subject?: string;
  }) {
    const existing = await db.select().from(teachingSchedules)
      .where(and(eq(teachingSchedules.id, id), eq(teachingSchedules.teacherId, teacherId)))
      .limit(1);
    if (existing.length === 0) throw new Error('Jadwal tidak ditemukan.');

    const conflict = await db.select().from(teachingSchedules)
      .where(and(
        eq(teachingSchedules.teacherId, teacherId),
        eq(teachingSchedules.dayName, dto.dayName ?? existing[0].dayName),
        eq(teachingSchedules.startTime, dto.startTime ?? existing[0].startTime),
        ne(teachingSchedules.id, id),
      )).limit(1);
    if (conflict.length > 0) {
      throw new Error('Jadwal bentrok: Anda sudah memiliki jadwal di hari & jam yang sama.');
    }

    await db.update(teachingSchedules).set(dto)
      .where(and(eq(teachingSchedules.id, id), eq(teachingSchedules.teacherId, teacherId)));
  }

  async deleteMySchedule(teacherId: string, id: number) {
    const existing = await db.select().from(teachingSchedules)
      .where(and(eq(teachingSchedules.id, id), eq(teachingSchedules.teacherId, teacherId)))
      .limit(1);
    if (existing.length === 0) throw new Error('Jadwal tidak ditemukan.');
    await db.delete(teachingSchedules)
      .where(and(eq(teachingSchedules.id, id), eq(teachingSchedules.teacherId, teacherId)));
  }

  async getTeacherReport(teacherId: string, startDate: string, endDate: string) {
    // 1. Get teacher's teaching schedules
    const schedulesList = await db.select({
      scheduleId: teachingSchedules.id,
      classId: teachingSchedules.classId,
      className: classes.name,
      subject: teachingSchedules.subject,
      startTime: teachingSchedules.startTime,
      endTime: teachingSchedules.endTime,
    })
    .from(teachingSchedules)
    .innerJoin(classes, eq(teachingSchedules.classId, classes.id))
    .where(eq(teachingSchedules.teacherId, teacherId))
    .orderBy(teachingSchedules.startTime);

    const scheduleIds = schedulesList.map(s => s.scheduleId);

    // Get subject attendance counts per schedule grouped by status
    const subjectAttendanceCounts = scheduleIds.length > 0 ? await db.select({
      scheduleId: subjectAttendances.teachingScheduleId,
      status: subjectAttendances.status,
      count: sql<number>`COUNT(*)`.as('count'),
    })
    .from(subjectAttendances)
    .where(and(
      inArray(subjectAttendances.teachingScheduleId, scheduleIds),
      gte(subjectAttendances.attendanceDate, startDate),
      lte(subjectAttendances.attendanceDate, endDate),
    ))
    .groupBy(subjectAttendances.teachingScheduleId, subjectAttendances.status) : [];

    // Batch query student counts per class
    const scheduleClassIds = [...new Set(schedulesList.map(s => s.classId))];
    const classStudentCounts = scheduleClassIds.length > 0 ? await db.select({
      classId: students.classId,
      count: sql<number>`COUNT(*)`.as('count'),
    })
    .from(students)
    .where(inArray(students.classId, scheduleClassIds))
    .groupBy(students.classId) : [];

    const studentCountMap = new Map(classStudentCounts.map(r => [r.classId, Number(r.count)]));

    const sessionLogs = scheduleIds.length > 0 ? await db.select({
      teachingScheduleId: teachingSessionLogs.teachingScheduleId,
      attendanceDate: teachingSessionLogs.attendanceDate,
      materi: teachingSessionLogs.materi,
      kegiatan: teachingSessionLogs.kegiatan,
      catatanKendala: teachingSessionLogs.catatanKendala,
      fotoPembelajaran: teachingSessionLogs.fotoPembelajaran,
    })
    .from(teachingSessionLogs)
    .where(and(
      inArray(teachingSessionLogs.teachingScheduleId, scheduleIds),
      gte(teachingSessionLogs.attendanceDate, startDate),
      lte(teachingSessionLogs.attendanceDate, endDate),
    )) : [];

    const sessionLogMap = new Map(sessionLogs.map(l => [`${l.teachingScheduleId}_${l.attendanceDate}`, l]));

    const schedules = schedulesList.map(sched => {
      const statusCounts = subjectAttendanceCounts.filter(c => c.scheduleId === sched.scheduleId);
      return {
        scheduleId: sched.scheduleId,
        className: sched.className,
        subject: sched.subject || '',
        startTime: sched.startTime,
        endTime: sched.endTime,
        totalStudents: studentCountMap.get(sched.classId) || 0,
        presentCount: Number(statusCounts.find(c => c.status === 'PRESENT')?.count || 0),
        sickCount: Number(statusCounts.find(c => c.status === 'SICK')?.count || 0),
        excusedCount: Number(statusCounts.find(c => c.status === 'EXCUSED')?.count || 0),
        absentCount: Number(statusCounts.find(c => c.status === 'ABSENT')?.count || 0),
        dispensationCount: Number(statusCounts.find(c => c.status === 'DISPEN')?.count || 0),
        skippedCount: Number(statusCounts.find(c => c.status === 'SKIPPED')?.count || 0),
        materi: sessionLogMap.get(`${sched.scheduleId}_${startDate}`)?.materi || '',
        kegiatan: sessionLogMap.get(`${sched.scheduleId}_${startDate}`)?.kegiatan || '',
        catatanKendala: sessionLogMap.get(`${sched.scheduleId}_${startDate}`)?.catatanKendala || '',
        fotoPembelajaran: sessionLogMap.get(`${sched.scheduleId}_${startDate}`)?.fotoPembelajaran || '',
      };
    });

    // 2. Get teacher's agendas with attendance counts
    const agendasList = await db.select({
      agendaId: teacherAgendas.id,
      title: teacherAgendas.title,
      agendaType: teacherAgendas.agendaType,
      className: classes.name,
      classId: teacherAgendas.classId,
    })
    .from(teacherAgendas)
    .innerJoin(classes, eq(teacherAgendas.classId, classes.id))
    .where(and(
      eq(teacherAgendas.teacherId, teacherId),
      gte(teacherAgendas.date, startDate),
      lte(teacherAgendas.date, endDate),
    ))
    .orderBy(teacherAgendas.date);

    const agendaIds = agendasList.map(a => a.agendaId);

    // Get agenda attendance counts per agenda grouped by status
    const agendaAttendanceCounts = agendaIds.length > 0 ? await db.select({
      agendaId: agendaAttendances.agendaId,
      status: agendaAttendances.status,
      count: sql<number>`COUNT(*)`.as('count'),
    })
    .from(agendaAttendances)
    .where(inArray(agendaAttendances.agendaId, agendaIds))
    .groupBy(agendaAttendances.agendaId, agendaAttendances.status) : [];

    // Batch query student counts per class for agendas
    const agendaClassIds = [...new Set(agendasList.map(a => a.classId).filter((id): id is number => id != null))];
    const agendaClassStudentCounts = agendaClassIds.length > 0 ? await db.select({
      classId: students.classId,
      count: sql<number>`COUNT(*)`.as('count'),
    })
    .from(students)
    .where(inArray(students.classId, agendaClassIds))
    .groupBy(students.classId) : [];

    const agendaStudentCountMap = new Map(agendaClassStudentCounts.map(r => [r.classId, Number(r.count)]));

    const agendas = agendasList.map(ag => {
      const statusCounts = agendaAttendanceCounts.filter(c => c.agendaId === ag.agendaId);
      return {
        agendaId: ag.agendaId,
        title: ag.title,
        agendaType: ag.agendaType,
        className: ag.className,
        totalStudents: ag.classId ? (agendaStudentCountMap.get(ag.classId) || 0) : 0,
        presentCount: Number(statusCounts.find(c => c.status === 'PRESENT')?.count || 0),
        sickCount: Number(statusCounts.find(c => c.status === 'SICK')?.count || 0),
        excusedCount: Number(statusCounts.find(c => c.status === 'EXCUSED')?.count || 0),
        absentCount: Number(statusCounts.find(c => c.status === 'ABSENT')?.count || 0),
        dispensationCount: Number(statusCounts.find(c => c.status === 'DISPEN')?.count || 0),
      };
    });

    // 3. Overall stats
    const scheduleTotalPresent = schedules.reduce((sum, s) => sum + s.presentCount, 0);
    const agendaTotalPresent = agendas.reduce((sum, a) => sum + a.presentCount, 0);

    return {
      schedules,
      agendas,
      stats: {
        scheduleCount: schedules.length,
        agendaCount: agendas.length,
        totalPresent: scheduleTotalPresent + agendaTotalPresent,
        totalScheduleStudents: schedules.length > 0 ? Math.max(...schedules.map(s => s.totalStudents), 0) : 0,
      },
    };
  }
  async getSemesterJournal(teacherId: string, startDate: string, endDate: string) {
    const schedulesList = await db.select({
      scheduleId: teachingSchedules.id,
      classId: teachingSchedules.classId,
      className: classes.name,
      subject: teachingSchedules.subject,
      startTime: teachingSchedules.startTime,
      endTime: teachingSchedules.endTime,
      dayName: teachingSchedules.dayName,
    })
    .from(teachingSchedules)
    .innerJoin(classes, eq(teachingSchedules.classId, classes.id))
    .where(eq(teachingSchedules.teacherId, teacherId))
    .orderBy(teachingSchedules.dayName, teachingSchedules.startTime);

    const scheduleIds = schedulesList.map(s => s.scheduleId);
    if (scheduleIds.length === 0) {
      return { teacher: null, entries: [], stats: {} };
    }

    const teacherData = await db.select({ name: user.name, email: user.email })
      .from(user).where(eq(user.id, teacherId)).limit(1);
    const teacher = teacherData.length > 0 ? teacherData[0] : null;

    const sessionLogs = scheduleIds.length > 0 ? await db.select({
      teachingScheduleId: teachingSessionLogs.teachingScheduleId,
      attendanceDate: teachingSessionLogs.attendanceDate,
      materi: teachingSessionLogs.materi,
      kegiatan: teachingSessionLogs.kegiatan,
      catatanKendala: teachingSessionLogs.catatanKendala,
    })
    .from(teachingSessionLogs)
    .where(and(
      inArray(teachingSessionLogs.teachingScheduleId, scheduleIds),
      gte(teachingSessionLogs.attendanceDate, startDate),
      lte(teachingSessionLogs.attendanceDate, endDate),
    ))
    .orderBy(teachingSessionLogs.attendanceDate) : [];

    const dateScheduleIds = [...new Set(sessionLogs.map(l => l.teachingScheduleId))];
    const attendanceCounts = dateScheduleIds.length > 0 ? await db.select({
      teachingScheduleId: subjectAttendances.teachingScheduleId,
      attendanceDate: subjectAttendances.attendanceDate,
      status: subjectAttendances.status,
      count: sql<number>`COUNT(*)`.as('count'),
    })
    .from(subjectAttendances)
    .where(and(
      inArray(subjectAttendances.teachingScheduleId, dateScheduleIds),
      gte(subjectAttendances.attendanceDate, startDate),
      lte(subjectAttendances.attendanceDate, endDate),
    ))
    .groupBy(subjectAttendances.teachingScheduleId, subjectAttendances.attendanceDate, subjectAttendances.status) : [];

    const scheduleMap = new Map(schedulesList.map(s => [s.scheduleId, s]));

    const entryMap = new Map<string, {
      date: string;
      schedules: any[];
    }>();

    for (const log of sessionLogs) {
      const sched = scheduleMap.get(log.teachingScheduleId);
      if (!sched) continue;

      const key = log.attendanceDate;
      if (!entryMap.has(key)) {
        entryMap.set(key, { date: key, schedules: [] });
      }

      const statusCounts = attendanceCounts.filter(c =>
        c.teachingScheduleId === log.teachingScheduleId &&
        c.attendanceDate === log.attendanceDate
      );

      entryMap.get(key)!.schedules.push({
        scheduleId: log.teachingScheduleId,
        className: sched.className,
        subject: sched.subject || '',
        startTime: sched.startTime,
        endTime: sched.endTime,
        dayName: sched.dayName,
        materi: log.materi || '',
        kegiatan: log.kegiatan || '',
        catatanKendala: log.catatanKendala || '',
        presentCount: Number(statusCounts.find(c => c.status === 'PRESENT')?.count || 0),
        sickCount: Number(statusCounts.find(c => c.status === 'SICK')?.count || 0),
        excusedCount: Number(statusCounts.find(c => c.status === 'EXCUSED')?.count || 0),
        absentCount: Number(statusCounts.find(c => c.status === 'ABSENT')?.count || 0),
        dispensationCount: Number(statusCounts.find(c => c.status === 'DISPEN')?.count || 0),
        skippedCount: Number(statusCounts.find(c => c.status === 'SKIPPED')?.count || 0),
      });
    }

    const entries = Array.from(entryMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    let totalSessions = 0, totalPresent = 0, totalSick = 0, totalExcused = 0, totalAbsent = 0;
    for (const entry of entries) {
      for (const s of entry.schedules) {
        totalSessions++;
        totalPresent += s.presentCount;
        totalSick += s.sickCount;
        totalExcused += s.excusedCount;
        totalAbsent += s.absentCount;
      }
    }

    return {
      teacher,
      startDate,
      endDate,
      entries,
      stats: {
        totalDays: entries.length,
        totalSessions,
        totalPresent,
        totalSick,
        totalExcused,
        totalAbsent,
      },
    };
  }
}

export const teacherService = new TeacherService();
