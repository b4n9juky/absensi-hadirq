import { db } from '../db/index.js';
import { students, user, classes } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export class StudentRepository {
  async findAll() {
    return db.select({
      id: students.id,
      userId: students.userId,
      nis: students.nis,
      classId: students.classId,
      deviceUuid: students.deviceUuid,
      qrcode: students.qrcode,
      faceEmbedding: students.faceEmbedding,
      photo: students.photo,
      createdAt: students.createdAt,
      updatedAt: students.updatedAt,
      studentName: user.name,
      studentEmail: user.email,
      className: classes.name
    })
    .from(students)
    .innerJoin(user, eq(students.userId, user.id))
    .innerJoin(classes, eq(students.classId, classes.id));
  }

  async findById(id: number) {
    const results = await db.select().from(students).where(eq(students.id, id)).limit(1);
    return results[0] || null;
  }

  async findByNis(nis: string) {
    const results = await db.select().from(students).where(eq(students.nis, nis)).limit(1);
    return results[0] || null;
  }

  async findByUserId(userId: string) {
    const results = await db.select().from(students).where(eq(students.userId, userId)).limit(1);
    return results[0] || null;
  }

  async create(userId: string, nis: string, classId: number, qrcode?: string) {
    const [result] = await db.insert(students).values({
      userId,
      nis,
      classId,
      qrcode
    });
    return result.insertId;
  }

  async update(id: number, userId: string, nis: string, classId: number, qrcode?: string) {
    const values: Record<string, any> = { userId, nis, classId, updatedAt: new Date() };
    if (qrcode !== undefined) values.qrcode = qrcode;
    await db.update(students)
      .set(values)
      .where(eq(students.id, id));
  }

  async updatePhoto(id: number, photoPath: string) {
    await db.update(students)
      .set({ photo: photoPath, updatedAt: new Date() })
      .where(eq(students.id, id));
  }

  async updateQrCode(id: number, qrcode: string) {
    await db.update(students)
      .set({ qrcode, updatedAt: new Date() })
      .where(eq(students.id, id));
  }

  async updateDeviceUuid(id: number, deviceUuid: string | null) {
    await db.update(students)
      .set({ deviceUuid, updatedAt: new Date() })
      .where(eq(students.id, id));
  }

  async delete(id: number) {
    await db.delete(students).where(eq(students.id, id));
  }
}
export const studentRepo = new StudentRepository();
