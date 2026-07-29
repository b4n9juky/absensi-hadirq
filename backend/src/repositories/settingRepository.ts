import { db } from '../db/index.js';
import { settings } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export class SettingRepository {
  async getAll(schoolId?: number): Promise<{ key: string; value: string }[]> {
    if (schoolId) {
      return db.select().from(settings).where(eq(settings.schoolId, schoolId));
    }
    return db.select().from(settings);
  }

  async get(key: string, schoolId?: number) {
    if (schoolId) {
      const rows = await db.select().from(settings)
        .where(and(eq(settings.key, key), eq(settings.schoolId, schoolId)))
        .limit(1);
      return rows[0] || null;
    }
    const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    return rows[0] || null;
  }

  async upsert(key: string, value: string, schoolId?: number) {
    const sid = schoolId || 0;
    const existing = await this.get(key, sid);
    if (existing) {
      await db.update(settings)
        .set({ value, updatedAt: new Date() })
        .where(and(eq(settings.key, key), eq(settings.schoolId, sid)));
    } else {
      await db.insert(settings).values({ key, value, schoolId: sid });
    }
  }

  async upsertMany(entries: { key: string; value: string; schoolId?: number }[]) {
    for (const entry of entries) {
      await this.upsert(entry.key, entry.value, entry.schoolId);
    }
  }
}

export const settingRepo = new SettingRepository();
