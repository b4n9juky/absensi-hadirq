import { db } from '../db/index.js';
import { teachingSchedules, students, classes, attendances, subjectAttendances, teachingSessionLogs, user } from '../db/schema.js';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { getJakartaDate } from '../lib/timezone.js';

export class SubjectAttendanceService {
  async getForm(scheduleId: number, date: string) {
    const schedule = await db.select({
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
    .where(eq(teachingSchedules.id, scheduleId))
    .limit(1);

    if (schedule.length === 0) {
      throw new Error('Jadwal mengajar tidak ditemukan.');
    }

    const studentsRows = await db.select({
      studentId: students.id,
      nis: students.nis,
      studentName: students.name,
    })
    .from(students)
    .where(eq(students.classId, schedule[0].classId))
    .orderBy(students.name);

    const existingSubjectAttendances = await db.select({
      studentId: subjectAttendances.studentId,
      status: subjectAttendances.status,
      notes: subjectAttendances.notes,
    })
    .from(subjectAttendances)
    .where(and(
      eq(subjectAttendances.teachingScheduleId, scheduleId),
      eq(subjectAttendances.attendanceDate, date),
    ));

    const existingMap = new Map(existingSubjectAttendances.map(s => [s.studentId, s]));

    const dailyAttendances = await db.select({
      studentId: attendances.studentId,
      checkinTime: attendances.checkinTime,
    })
    .from(attendances)
    .where(and(
      eq(attendances.attendanceDate, date),
      inArray(attendances.studentId, studentsRows.map(s => s.studentId)),
    ));

    const dailyCheckinMap = new Set(dailyAttendances.filter(a => a.checkinTime != null).map(a => a.studentId));

    const result = studentsRows.map(student => {
      const existing = existingMap.get(student.studentId);
      let defaultStatus = 'ABSENT';
      if (dailyCheckinMap.has(student.studentId)) {
        defaultStatus = 'PRESENT';
      }
      return {
        studentId: student.studentId,
        nis: student.nis,
        studentName: student.studentName,
        status: existing ? existing.status : defaultStatus,
        notes: existing ? existing.notes || '' : '',
      };
    });

    return {
      schedule: schedule[0],
      students: result,
      sessionLog: await db.select({
        materi: teachingSessionLogs.materi,
        kegiatan: teachingSessionLogs.kegiatan,
        catatanKendala: teachingSessionLogs.catatanKendala,
        fotoPembelajaran: teachingSessionLogs.fotoPembelajaran,
      })
      .from(teachingSessionLogs)
      .where(and(
        eq(teachingSessionLogs.teachingScheduleId, scheduleId),
        eq(teachingSessionLogs.attendanceDate, date),
      ))
      .limit(1)
      .then(rows => rows[0] || null),
    };
  }

  async submitAttendance(
    scheduleId: number,
    date: string,
    entries: { studentId: number; status: string; notes?: string }[],
    sessionMeta?: { materi?: string; kegiatan?: string; catatanKendala?: string; fotoPembelajaran?: string },
  ) {
    const validStatuses = ['PRESENT', 'SICK', 'EXCUSED', 'ABSENT', 'DISPEN', 'SKIPPED'];

    for (const entry of entries) {
      if (!validStatuses.includes(entry.status)) {
        throw new Error(`Status tidak valid untuk siswa ID ${entry.studentId}: ${entry.status}`);
      }
    }

    for (const entry of entries) {
      await db.insert(subjectAttendances)
        .values({
          teachingScheduleId: scheduleId,
          studentId: entry.studentId,
          attendanceDate: date,
          status: entry.status as any,
          notes: entry.notes || null,
        })
        .onDuplicateKeyUpdate({
          set: {
            status: entry.status as any,
            notes: entry.notes || null,
          },
        });
    }

    if (sessionMeta) {
      await db.insert(teachingSessionLogs)
        .values({
          teachingScheduleId: scheduleId,
          attendanceDate: date,
          materi: sessionMeta.materi || null,
          kegiatan: sessionMeta.kegiatan || null,
          catatanKendala: sessionMeta.catatanKendala || null,
          fotoPembelajaran: sessionMeta.fotoPembelajaran || null,
        })
        .onDuplicateKeyUpdate({
          set: {
            materi: sessionMeta.materi || null,
            kegiatan: sessionMeta.kegiatan || null,
            catatanKendala: sessionMeta.catatanKendala || null,
            fotoPembelajaran: sessionMeta.fotoPembelajaran || null,
          },
        });
    }

    return { success: true, message: `Berhasil menyimpan absensi ${entries.length} siswa.` };
  }
}

export const subjectAttendanceService = new SubjectAttendanceService();
