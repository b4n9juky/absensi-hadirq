"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingRepo = exports.SettingRepository = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
class SettingRepository {
    async getAll() {
        return index_js_1.db.select().from(schema_js_1.settings);
    }
    async get(key) {
        const rows = await index_js_1.db.select().from(schema_js_1.settings).where((0, drizzle_orm_1.eq)(schema_js_1.settings.key, key)).limit(1);
        return rows[0] || null;
    }
    async upsert(key, value) {
        const existing = await this.get(key);
        if (existing) {
            await index_js_1.db.update(schema_js_1.settings)
                .set({ value, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_js_1.settings.key, key));
        }
        else {
            await index_js_1.db.insert(schema_js_1.settings).values({ key, value });
        }
    }
    async upsertMany(entries) {
        for (const entry of entries) {
            await this.upsert(entry.key, entry.value);
        }
    }
}
exports.SettingRepository = SettingRepository;
exports.settingRepo = new SettingRepository();
