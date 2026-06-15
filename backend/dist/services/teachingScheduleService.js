"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teachingScheduleService = exports.TeachingScheduleService = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
class TeachingScheduleService {
    async getAll() {
        const rows = await index_js_1.db.select({
            id: schema_js_1.teachingSchedules.id,
            teacherId: schema_js_1.teachingSchedules.teacherId,
            teacherName: schema_js_1.user.name,
            classId: schema_js_1.teachingSchedules.classId,
            className: schema_js_1.classes.name,
            dayName: schema_js_1.teachingSchedules.dayName,
            startTime: schema_js_1.teachingSchedules.startTime,
            endTime: schema_js_1.teachingSchedules.endTime,
            subject: schema_js_1.teachingSchedules.subject,
        })
            .from(schema_js_1.teachingSchedules)
            .innerJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.teacherId, schema_js_1.user.id))
            .innerJoin(schema_js_1.classes, (0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.classId, schema_js_1.classes.id))
            .orderBy(schema_js_1.teachingSchedules.dayName, schema_js_1.teachingSchedules.startTime);
        return rows;
    }
    async create(dto) {
        const existing = await index_js_1.db.select().from(schema_js_1.teachingSchedules)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.teacherId, dto.teacherId), (0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.dayName, dto.dayName), (0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.startTime, dto.startTime))).limit(1);
        if (existing.length > 0) {
            throw new Error('Jadwal bentrok: guru sudah memiliki jadwal di hari & jam yang sama.');
        }
        const [result] = await index_js_1.db.insert(schema_js_1.teachingSchedules).values({
            teacherId: dto.teacherId,
            classId: dto.classId,
            dayName: dto.dayName,
            startTime: dto.startTime,
            endTime: dto.endTime,
            subject: dto.subject,
        });
        return result.insertId;
    }
    async update(id, dto) {
        const existing = await index_js_1.db.select().from(schema_js_1.teachingSchedules).where((0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.id, id)).limit(1);
        if (existing.length === 0)
            throw new Error('Jadwal tidak ditemukan.');
        const conflict = await index_js_1.db.select().from(schema_js_1.teachingSchedules)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.teacherId, dto.teacherId ?? existing[0].teacherId), (0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.dayName, dto.dayName ?? existing[0].dayName), (0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.startTime, dto.startTime ?? existing[0].startTime), (0, drizzle_orm_1.sql) `${schema_js_1.teachingSchedules.id} != ${id}`)).limit(1);
        if (conflict.length > 0)
            throw new Error('Jadwal bentrok: guru sudah memiliki jadwal di hari & jam yang sama.');
        await index_js_1.db.update(schema_js_1.teachingSchedules).set(dto).where((0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.id, id));
    }
    async delete(id) {
        const existing = await index_js_1.db.select().from(schema_js_1.teachingSchedules).where((0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.id, id)).limit(1);
        if (existing.length === 0)
            throw new Error('Jadwal tidak ditemukan.');
        await index_js_1.db.delete(schema_js_1.teachingSchedules).where((0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.id, id));
    }
}
exports.TeachingScheduleService = TeachingScheduleService;
exports.teachingScheduleService = new TeachingScheduleService();
