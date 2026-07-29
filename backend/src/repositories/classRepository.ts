import { db } from '../db/index.js';
import { classes } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export class ClassRepository {
  async findAll() {
    return db.select().from(classes);
  }

  async findById(id: number) {
    const results = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
    return results[0] || null;
  }

  async findByName(name: string) {
    const results = await db.select().from(classes).where(eq(classes.name, name)).limit(1);
    return results[0] || null;
  }

  async create(name: string, schoolId: number) {
    const [result] = await db.insert(classes).values({ name, schoolId });
    return result.insertId;
  }

  async update(id: number, name: string) {
    await db.update(classes)
      .set({ name, updatedAt: new Date() })
      .where(eq(classes.id, id));
  }

  async delete(id: number) {
    await db.delete(classes).where(eq(classes.id, id));
  }
}
export const classRepo = new ClassRepository();
