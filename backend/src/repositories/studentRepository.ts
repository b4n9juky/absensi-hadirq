import { db } from '../db/index.js';
import { students, user, classes } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export class StudentRepository {
  async findAll() {
    return db.select({
      id: students.id,
      name: students.name,
      nis: students.nis,
      classId: students.classId,
      deviceUuid: students.deviceUuid,
      qrcode: students.qrcode,
      faceEmbedding: students.faceEmbedding,
      photo: students.photo,
      parentId: students.parentId,
      parentName: user.name,
      parentPhone: user.phone,
      createdAt: students.createdAt,
      updatedAt: students.updatedAt,
      studentName: students.name,
      className: classes.name
    })
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    .leftJoin(user, eq(students.parentId, user.id));
  }

  async findByClassId(classId: number) {
    return db.select({
      id: students.id,
      name: students.name,
      nis: students.nis,
      classId: students.classId,
      deviceUuid: students.deviceUuid,
      qrcode: students.qrcode,
      faceEmbedding: students.faceEmbedding,
      photo: students.photo,
      parentId: students.parentId,
      parentName: user.name,
      parentPhone: user.phone,
      createdAt: students.createdAt,
      updatedAt: students.updatedAt,
      studentName: students.name,
      className: classes.name
    })
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    .leftJoin(user, eq(students.parentId, user.id))
    .where(eq(students.classId, classId));
  }

  async findById(id: number) {
    const results = await db.select().from(students).where(eq(students.id, id)).limit(1);
    return results[0] || null;
  }

  async findByNis(nis: string) {
    const results = await db.select().from(students).where(eq(students.nis, nis)).limit(1);
    return results[0] || null;
  }

  async create(name: string, nis: string, classId: number, schoolId: number, qrcode?: string) {
    const [result] = await db.insert(students).values({
      name,
      nis,
      classId,
      schoolId,
      qrcode
    });
    return result.insertId;
  }

  async update(id: number, name: string, nis: string, classId: number, qrcode?: string, clientTimestamp?: string) {
    const values: Record<string, any> = { name, nis, classId, updatedAt: clientTimestamp ? new Date(clientTimestamp) : new Date() };
    if (qrcode !== undefined) values.qrcode = qrcode;
    await db.update(students)
      .set(values)
      .where(eq(students.id, id));
  }

  async updatePhoto(id: number, photoPath: string, clientTimestamp?: string) {
    await db.update(students)
      .set({ photo: photoPath, updatedAt: clientTimestamp ? new Date(clientTimestamp) : new Date() })
      .where(eq(students.id, id));
  }

  async updateQrCode(id: number, qrcode: string, clientTimestamp?: string) {
    await db.update(students)
      .set({ qrcode, updatedAt: clientTimestamp ? new Date(clientTimestamp) : new Date() })
      .where(eq(students.id, id));
  }

  async updateDeviceUuid(id: number, deviceUuid: string | null, clientTimestamp?: string) {
    await db.update(students)
      .set({ deviceUuid, updatedAt: clientTimestamp ? new Date(clientTimestamp) : new Date() })
      .where(eq(students.id, id));
  }

  async deleteFace(id: number, clientTimestamp?: string) {
    await db.update(students)
      .set({ faceEmbedding: null, updatedAt: clientTimestamp ? new Date(clientTimestamp) : new Date() })
      .where(eq(students.id, id));
  }

  async delete(id: number) {
    await db.delete(students).where(eq(students.id, id));
  }
}
export const studentRepo = new StudentRepository();
