import { db } from '../db/index.js';
import { schedules } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';

export class ScheduleRepository {
  async findAll() {
    return db.select().from(schedules);
  }

  async findById(id: number) {
    const results = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
    return results[0] || null;
  }

  async update(id: number, checkinStart: string, lateAfter: string, checkoutTime: string) {
    await db.update(schedules)
      .set({
        checkinStart,
        lateAfter,
        checkoutTime,
      })
      .where(eq(schedules.id, id));
  }

  async updateActive(id: number, isActive: boolean) {
    await db.update(schedules)
      .set({ isActive })
      .where(eq(schedules.id, id));
  }

  async countActive(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(schedules).where(eq(schedules.isActive, true));
    return Number(result[0]?.count || 0);
  }
}
export const scheduleRepo = new ScheduleRepository();
