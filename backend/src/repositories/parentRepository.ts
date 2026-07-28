import { db } from '../db/index.js';
import { students, user, classes } from '../db/schema.js';
import { eq, isNull } from 'drizzle-orm';

export class ParentRepository {
  async findStudentsByParentId(parentId: string) {
    return db.select({
      id: students.id,
      name: students.name,
      nis: students.nis,
      classId: students.classId,
      photo: students.photo,
      parentId: students.parentId,
      className: classes.name,
    })
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    .where(eq(students.parentId, parentId));
  }

  async findParentByStudentId(studentId: number) {
    const result = await db.select({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    })
    .from(students)
    .innerJoin(user, eq(students.parentId, user.id))
    .where(eq(students.id, studentId))
    .limit(1);
    return result[0] || null;
  }

  async findAllWithParent() {
    return db.select({
      id: students.id,
      name: students.name,
      nis: students.nis,
      classId: students.classId,
      className: classes.name,
      parentId: students.parentId,
      parentName: user.name,
      parentEmail: user.email,
      parentPhone: user.phone,
    })
    .from(students)
    .leftJoin(classes, eq(students.classId, classes.id))
    .leftJoin(user, eq(students.parentId, user.id));
  }

  async findAllWithoutParent() {
    return db.select({
      id: students.id,
      name: students.name,
      nis: students.nis,
      classId: students.classId,
      className: classes.name,
    })
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    .where(isNull(students.parentId));
  }

  async findAllParents() {
    return db.select({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    })
    .from(user)
    .where(eq(user.role, 'parent'));
  }

  async setParent(studentId: number, parentId: string) {
    await db.update(students).set({ parentId, updatedAt: new Date() }).where(eq(students.id, studentId));
  }

  async removeParent(studentId: number) {
    await db.update(students).set({ parentId: null, updatedAt: new Date() }).where(eq(students.id, studentId));
  }
}
export const parentRepo = new ParentRepository();
