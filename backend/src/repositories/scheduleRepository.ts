import { db } from '../db/index.js';
import { schedules } from '../db/schema.js';
import { eq } from 'drizzle-orm';

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
        updatedAt: new Date()
      })
      .where(eq(schedules.id, id));
  }
}
export const scheduleRepo = new ScheduleRepository();
