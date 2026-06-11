import { settingRepo } from '../repositories/settingRepository.js';

export class SettingService {
  async getAll() {
    const rows = await settingRepo.getAll();
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return map;
  }

  async update(entries: Record<string, string>) {
    const allowedKeys = [
      'school_latitude',
      'school_longitude',
      'school_radius_meters',
      'max_accuracy_meters',
    ];

    for (const key of Object.keys(entries)) {
      if (!allowedKeys.includes(key)) {
        throw new Error(`Key "${key}" tidak diizinkan.`);
      }
    }

    const payload = Object.entries(entries).map(([key, value]) => ({
      key,
      value: String(value),
    }));

    await settingRepo.upsertMany(payload);
    return this.getAll();
  }

  async getValue(key: string): Promise<string | null> {
    const row = await settingRepo.get(key);
    return row ? row.value : null;
  }
}

export const settingService = new SettingService();
