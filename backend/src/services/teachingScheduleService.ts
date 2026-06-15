import { db } from '../db/index.js';
import { teachingSchedules, classes, user } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { userRepo } from '../repositories/userRepository.js';

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
}

export const teachingScheduleService = new TeachingScheduleService();
