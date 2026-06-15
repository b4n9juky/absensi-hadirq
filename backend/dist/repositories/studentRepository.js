"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentRepo = exports.StudentRepository = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
class StudentRepository {
    async findAll() {
        return index_js_1.db.select({
            id: schema_js_1.students.id,
            userId: schema_js_1.students.userId,
            nis: schema_js_1.students.nis,
            classId: schema_js_1.students.classId,
            deviceUuid: schema_js_1.students.deviceUuid,
            qrcode: schema_js_1.students.qrcode,
            faceEmbedding: schema_js_1.students.faceEmbedding,
            createdAt: schema_js_1.students.createdAt,
            updatedAt: schema_js_1.students.updatedAt,
            studentName: schema_js_1.user.name,
            studentEmail: schema_js_1.user.email,
            className: schema_js_1.classes.name
        })
            .from(schema_js_1.students)
            .innerJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.students.userId, schema_js_1.user.id))
            .innerJoin(schema_js_1.classes, (0, drizzle_orm_1.eq)(schema_js_1.students.classId, schema_js_1.classes.id));
    }
    async findById(id) {
        const results = await index_js_1.db.select().from(schema_js_1.students).where((0, drizzle_orm_1.eq)(schema_js_1.students.id, id)).limit(1);
        return results[0] || null;
    }
    async findByNis(nis) {
        const results = await index_js_1.db.select().from(schema_js_1.students).where((0, drizzle_orm_1.eq)(schema_js_1.students.nis, nis)).limit(1);
        return results[0] || null;
    }
    async findByUserId(userId) {
        const results = await index_js_1.db.select().from(schema_js_1.students).where((0, drizzle_orm_1.eq)(schema_js_1.students.userId, userId)).limit(1);
        return results[0] || null;
    }
    async create(userId, nis, classId, qrcode) {
        const [result] = await index_js_1.db.insert(schema_js_1.students).values({
            userId,
            nis,
            classId,
            qrcode
        });
        return result.insertId;
    }
    async update(id, userId, nis, classId, qrcode) {
        const values = { userId, nis, classId, updatedAt: new Date() };
        if (qrcode !== undefined)
            values.qrcode = qrcode;
        await index_js_1.db.update(schema_js_1.students)
            .set(values)
            .where((0, drizzle_orm_1.eq)(schema_js_1.students.id, id));
    }
    async updateQrCode(id, qrcode) {
        await index_js_1.db.update(schema_js_1.students)
            .set({ qrcode, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_js_1.students.id, id));
    }
    async updateDeviceUuid(id, deviceUuid) {
        await index_js_1.db.update(schema_js_1.students)
            .set({ deviceUuid, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_js_1.students.id, id));
    }
    async delete(id) {
        await index_js_1.db.delete(schema_js_1.students).where((0, drizzle_orm_1.eq)(schema_js_1.students.id, id));
    }
}
exports.StudentRepository = StudentRepository;
exports.studentRepo = new StudentRepository();
