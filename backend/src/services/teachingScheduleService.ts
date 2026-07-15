import { db } from '../db/index.js';
import { teachingSchedules, classes, user } from '../db/schema.js';
import { eq, and, or, sql } from 'drizzle-orm';
import { userRepo } from '../repositories/userRepository.js';
import fs from 'fs';
import { parseExcelScheduleFile } from '../lib/excelParser.js';

export interface CreateTeachingScheduleDto {
  teacherId: string;
  classId: number;
  dayName: string;
  startTime: string;
  endTime: string;
  subject: string;
}

export class TeachingScheduleService {
  async getAll() {
    const rows = await db.select({
      id: teachingSchedules.id,
      teacherId: teachingSchedules.teacherId,
      teacherName: user.name,
      classId: teachingSchedules.classId,
      className: classes.name,
      dayName: teachingSchedules.dayName,
      startTime: teachingSchedules.startTime,
      endTime: teachingSchedules.endTime,
      subject: teachingSchedules.subject,
    })
    .from(teachingSchedules)
    .innerJoin(user, eq(teachingSchedules.teacherId, user.id))
    .innerJoin(classes, eq(teachingSchedules.classId, classes.id))
    .orderBy(teachingSchedules.dayName, teachingSchedules.startTime);
    return rows;
  }

  async create(dto: CreateTeachingScheduleDto) {
    const existing = await db.select().from(teachingSchedules)
      .where(and(
        eq(teachingSchedules.teacherId, dto.teacherId),
        eq(teachingSchedules.dayName, dto.dayName),
        eq(teachingSchedules.startTime, dto.startTime),
      )).limit(1);
    if (existing.length > 0) {
      throw new Error('Jadwal bentrok: guru sudah memiliki jadwal di hari & jam yang sama.');
    }
    const [result] = await db.insert(teachingSchedules).values({
      teacherId: dto.teacherId,
      classId: dto.classId,
      dayName: dto.dayName,
      startTime: dto.startTime,
      endTime: dto.endTime,
      subject: dto.subject,
    });
    return result.insertId;
  }

  async update(id: number, dto: Partial<CreateTeachingScheduleDto>) {
    const existing = await db.select().from(teachingSchedules).where(eq(teachingSchedules.id, id)).limit(1);
    if (existing.length === 0) throw new Error('Jadwal tidak ditemukan.');

    const conflict = await db.select().from(teachingSchedules)
      .where(and(
        eq(teachingSchedules.teacherId, dto.teacherId ?? existing[0].teacherId),
        eq(teachingSchedules.dayName, dto.dayName ?? existing[0].dayName),
        eq(teachingSchedules.startTime, dto.startTime ?? existing[0].startTime),
        sql`${teachingSchedules.id} != ${id}`,
      )).limit(1);
    if (conflict.length > 0) throw new Error('Jadwal bentrok: guru sudah memiliki jadwal di hari & jam yang sama.');

    await db.update(teachingSchedules).set(dto).where(eq(teachingSchedules.id, id));
  }

  async delete(id: number) {
    const existing = await db.select().from(teachingSchedules).where(eq(teachingSchedules.id, id)).limit(1);
    if (existing.length === 0) throw new Error('Jadwal tidak ditemukan.');
    await db.delete(teachingSchedules).where(eq(teachingSchedules.id, id));
  }

  async importSchedules(filePath: string) {
    const { rows, errors: parseErrors } = parseExcelScheduleFile(filePath);

    const results: { row: number; status: string; error?: string }[] = [];
    let imported = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        // Resolve teacher
        const teacher = await db.select().from(user)
          .where(or(eq(user.email, row.teacherEmailOrName), eq(user.name, row.teacherEmailOrName)))
          .limit(1);
        if (teacher.length === 0) {
          results.push({ row: rowNum, status: 'failed', error: `Guru "${row.teacherEmailOrName}" tidak ditemukan.` });
          failed++;
          continue;
        }

        // Resolve class
        const classRecord = await db.select().from(classes)
          .where(eq(classes.name, row.className))
          .limit(1);
        if (classRecord.length === 0) {
          results.push({ row: rowNum, status: 'failed', error: `Kelas "${row.className}" tidak ditemukan.` });
          failed++;
          continue;
        }

        // Check conflict
        const conflict = await db.select().from(teachingSchedules)
          .where(and(
            eq(teachingSchedules.teacherId, teacher[0].id),
            eq(teachingSchedules.dayName, row.dayName),
            eq(teachingSchedules.startTime, row.startTime),
          )).limit(1);
        if (conflict.length > 0) {
          results.push({ row: rowNum, status: 'skipped', error: 'Jadwal bentrok dengan jadwal guru yang sudah ada.' });
          failed++;
          continue;
        }

        await db.insert(teachingSchedules).values({
          teacherId: teacher[0].id,
          classId: classRecord[0].id,
          dayName: row.dayName,
          startTime: row.startTime,
          endTime: row.endTime,
          subject: row.subject,
        });

        results.push({ row: rowNum, status: 'imported' });
        imported++;
      } catch (err: any) {
        results.push({ row: rowNum, status: 'failed', error: err.message || 'Gagal menyimpan jadwal.' });
        failed++;
      }
    }

    for (const pe of parseErrors) {
      results.push({ row: pe.row, status: 'failed', error: pe.error });
      failed++;
    }

    try { fs.unlinkSync(filePath); } catch { /* ignore */ }

    return { imported, failed, results };
  }
}

export const teachingScheduleService = new TeachingScheduleService();
