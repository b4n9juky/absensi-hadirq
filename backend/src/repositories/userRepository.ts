import { db } from '../db/index.js';
import { user, session, account } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export class UserRepository {
  async findAll() {
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

  async update(id: string, name: string, email: string, role: string) {
    await db.update(user)
      .set({ name, email, role, updatedAt: new Date() })
      .where(eq(user.id, id));
  }

  async delete(id: string) {
    // Delete sessions, credentials, and user row
    await db.delete(session).where(eq(session.userId, id));
    await db.delete(account).where(eq(account.userId, id));
    await db.delete(user).where(eq(user.id, id));
  }
}
export const userRepo = new UserRepository();
