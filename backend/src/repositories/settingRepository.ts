import { db } from '../db/index.js';
import { settings } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export class SettingRepository {
  async getAll(): Promise<{ key: string; value: string }[]> {
    return db.select().from(settings);
  }

  async get(key: string) {
    const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    return rows[0] || null;
  }

  async upsert(key: string, value: string) {
    const existing = await this.get(key);
    if (existing) {
      await db.update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
  }

  async upsertMany(entries: { key: string; value: string }[]) {
    for (const entry of entries) {
      await this.upsert(entry.key, entry.value);
    }
  }
}

export const settingRepo = new SettingRepository();
