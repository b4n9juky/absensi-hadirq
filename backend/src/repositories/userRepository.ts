import { db } from '../db/index.js';
import { user, session, account, teachingSchedules, teacherAgendas } from '../db/schema.js';
import { eq, like } from 'drizzle-orm';

export class UserRepository {
  async findAll(schoolId?: number) {
    if (schoolId) {
      return db.select().from(user).where(eq(user.schoolId, schoolId));
    }
    return db.select().from(user);
  }

  async findById(id: string) {
    const results = await db.select().from(user).where(eq(user.id, id)).limit(1);
    return results[0] || null;
  }

  async findByEmail(email: string) {
    const results = await db.select().from(user).where(eq(user.email, email)).limit(1);
    return results[0] || null;
  }

  async update(id: string, name: string, email: string, role: string, phone?: string) {
    await db.update(user)
      .set({ name, email, role, phone: phone ?? null, updatedAt: new Date() })
      .where(eq(user.id, id));
  }

  async updatePassword(id: string, hashedPassword: string) {
    await db.update(account)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(account.userId, id));
  }

  async updateRole(id: string, role: string) {
    await db.update(user).set({ role, updatedAt: new Date() }).where(eq(user.id, id));
  }

  async searchByRole(role: string, query: string) {
    return db.select({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    })
    .from(user)
    .where(
      eq(user.role, role)
    );
  }

  async delete(id: string) {
    await db.delete(teachingSchedules).where(eq(teachingSchedules.teacherId, id));
    await db.delete(teacherAgendas).where(eq(teacherAgendas.teacherId, id));
    await db.delete(session).where(eq(session.userId, id));
    await db.delete(account).where(eq(account.userId, id));
    await db.delete(user).where(eq(user.id, id));
  }
}
export const userRepo = new UserRepository();
