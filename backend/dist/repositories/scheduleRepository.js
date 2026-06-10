"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleRepo = exports.ScheduleRepository = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
class ScheduleRepository {
    async findAll() {
        return index_js_1.db.select().from(schema_js_1.schedules);
    }
    async findById(id) {
        const results = await index_js_1.db.select().from(schema_js_1.schedules).where((0, drizzle_orm_1.eq)(schema_js_1.schedules.id, id)).limit(1);
        return results[0] || null;
    }
    async update(id, checkinStart, lateAfter, checkoutTime) {
        await index_js_1.db.update(schema_js_1.schedules)
            .set({
            checkinStart,
            lateAfter,
            checkoutTime,
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema_js_1.schedules.id, id));
    }
}
exports.ScheduleRepository = ScheduleRepository;
exports.scheduleRepo = new ScheduleRepository();
