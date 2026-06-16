import { db } from '../db/index.js';
import { subjects } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export class SubjectService {
  async getAll() {
    return await db.select().from(subjects).orderBy(subjects.name);
  }

  async getById(id: number) {
    const rows = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
    return rows.length > 0 ? rows[0] : null;
  }

  async create(name: string) {
    const existing = await db.select().from(subjects).where(eq(subjects.name, name)).limit(1);
    if (existing.length > 0) {
      throw new Error('Mata pelajaran dengan nama tersebut sudah ada.');
    }
    const [result] = await db.insert(subjects).values({ name });
    return result.insertId;
  }

  async update(id: number, name: string) {
    const existing = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
    if (existing.length === 0) {
      throw new Error('Mata pelajaran tidak ditemukan.');
    }
    const duplicate = await db.select().from(subjects).where(eq(subjects.name, name)).limit(1);
    if (duplicate.length > 0 && duplicate[0].id !== id) {
      throw new Error('Mata pelajaran dengan nama tersebut sudah ada.');
    }
    await db.update(subjects).set({ name }).where(eq(subjects.id, id));
  }

  async delete(id: number) {
    const existing = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
    if (existing.length === 0) {
      throw new Error('Mata pelajaran tidak ditemukan.');
    }
    await db.delete(subjects).where(eq(subjects.id, id));
  }
}

export const subjectService = new SubjectService();
