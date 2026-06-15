"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingService = exports.SettingService = void 0;
const settingRepository_js_1 = require("../repositories/settingRepository.js");
class SettingService {
    async getAll() {
        const rows = await settingRepository_js_1.settingRepo.getAll();
        const map = {};
        for (const row of rows) {
            map[row.key] = row.value;
        }
        return map;
    }
    async update(entries) {
        const allowedKeys = [
            'school_latitude',
            'school_longitude',
            'school_radius_meters',
            'max_accuracy_meters',
            'api_base_url',
            'school_name',
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
        await settingRepository_js_1.settingRepo.upsertMany(payload);
        return this.getAll();
    }
    async getValue(key) {
        const row = await settingRepository_js_1.settingRepo.get(key);
        return row ? row.value : null;
    }
    async getGeofenceConfig() {
        const get = async (key, envKey, fallback) => {
            const val = await this.getValue(key);
            if (val !== null && val.trim() !== '')
                return val;
            return process.env[envKey] || fallback;
        };
        return {
            school_latitude: parseFloat(await get('school_latitude', 'SCHOOL_LATITUDE', '0.1340')),
            school_longitude: parseFloat(await get('school_longitude', 'SCHOOL_LONGITUDE', '117.5000')),
            school_radius_meters: parseFloat(await get('school_radius_meters', 'SCHOOL_RADIUS_METERS', '50')),
            max_accuracy_meters: parseFloat(await get('max_accuracy_meters', 'MAX_ACCURACY_METERS', '30')),
            api_base_url: await get('api_base_url', 'API_BASE_URL', ''),
        };
    }
}
exports.SettingService = SettingService;
exports.settingService = new SettingService();
