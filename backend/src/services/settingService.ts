import { settingRepo } from '../repositories/settingRepository.js';
import { db } from '../db/index.js';
import { schools } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export class SettingService {
  async getAll(schoolId?: number) {
    const rows = await settingRepo.getAll(schoolId);
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }

    // Merge per-school geofence from schools table if schoolId provided
    if (schoolId) {
      const [school] = await db.select({
        latitude: schools.latitude,
        longitude: schools.longitude,
        radiusMeters: schools.radiusMeters,
        maxAccuracy: schools.maxAccuracy,
        timezone: schools.timezone,
      }).from(schools).where(eq(schools.id, schoolId)).limit(1);

      if (school) {
        if (school.latitude) map.school_latitude = String(school.latitude);
        if (school.longitude) map.school_longitude = String(school.longitude);
        if (school.radiusMeters) map.school_radius_meters = String(school.radiusMeters);
        if (school.maxAccuracy) map.max_accuracy_meters = String(school.maxAccuracy);
        if (school.timezone) map.school_timezone = school.timezone;
      }
    }

    return map;
  }

  async update(entries: Record<string, string>, schoolId?: number) {
    const allowedKeys = [
      'school_latitude',
      'school_longitude',
      'school_radius_meters',
      'max_accuracy_meters',
      'api_base_url',
      'school_name',
      'school_logo',
      'school_days',
      'school_timezone',
    ];

    for (const key of Object.keys(entries)) {
      if (!allowedKeys.includes(key)) {
        throw new Error(`Key "${key}" tidak diizinkan.`);
      }
    }

    const payload = Object.entries(entries).map(([key, value]) => ({
      key,
      value: String(value),
      schoolId: schoolId || 0,
    }));

    await settingRepo.upsertMany(payload);

    // Sync timezone to in-memory cache if updated
    if (entries.school_timezone) {
      const { setSchoolTimezone } = await import('../lib/timezone.js');
      setSchoolTimezone(entries.school_timezone);
    }

    return this.getAll(schoolId);
  }

  async getValue(key: string, schoolId?: number): Promise<string | null> {
    const row = await settingRepo.get(key, schoolId);
    return row ? row.value : null;
  }

  async getGeofenceConfig(schoolId?: number) {
    // If schoolId is provided, read directly from schools table
    if (schoolId) {
      const [school] = await db.select({
        latitude: schools.latitude,
        longitude: schools.longitude,
        radiusMeters: schools.radiusMeters,
        maxAccuracy: schools.maxAccuracy,
      }).from(schools).where(eq(schools.id, schoolId)).limit(1);

      if (school) {
        return {
          school_latitude: school.latitude || 0,
          school_longitude: school.longitude || 0,
          school_radius_meters: school.radiusMeters || 50,
          max_accuracy_meters: school.maxAccuracy || 30,
        };
      }
    }

    // Fallback: settings table, then env vars
    const get = async (key: string, envKey: string, fallback: string) => {
      const val = await this.getValue(key, schoolId);
      if (val !== null && val.trim() !== '') return val;
      return process.env[envKey] || fallback;
    };

    return {
      school_latitude: parseFloat(await get('school_latitude', 'SCHOOL_LATITUDE', '0')),
      school_longitude: parseFloat(await get('school_longitude', 'SCHOOL_LONGITUDE', '0')),
      school_radius_meters: parseFloat(await get('school_radius_meters', 'SCHOOL_RADIUS_METERS', '50')),
      max_accuracy_meters: parseFloat(await get('max_accuracy_meters', 'MAX_ACCURACY_METERS', '30')),
    };
  }
}

export const settingService = new SettingService();
