"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subjectService = exports.SubjectService = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
class SubjectService {
    async getAll() {
        return await index_js_1.db.select().from(schema_js_1.subjects).orderBy(schema_js_1.subjects.name);
    }
    async getById(id) {
        const rows = await index_js_1.db.select().from(schema_js_1.subjects).where((0, drizzle_orm_1.eq)(schema_js_1.subjects.id, id)).limit(1);
        return rows.length > 0 ? rows[0] : null;
    }
    async create(name) {
        const existing = await index_js_1.db.select().from(schema_js_1.subjects).where((0, drizzle_orm_1.eq)(schema_js_1.subjects.name, name)).limit(1);
        if (existing.length > 0) {
            throw new Error('Mata pelajaran dengan nama tersebut sudah ada.');
        }
        const [result] = await index_js_1.db.insert(schema_js_1.subjects).values({ name });
        return result.insertId;
    }
    async update(id, name) {
        const existing = await index_js_1.db.select().from(schema_js_1.subjects).where((0, drizzle_orm_1.eq)(schema_js_1.subjects.id, id)).limit(1);
        if (existing.length === 0) {
            throw new Error('Mata pelajaran tidak ditemukan.');
        }
        const duplicate = await index_js_1.db.select().from(schema_js_1.subjects).where((0, drizzle_orm_1.eq)(schema_js_1.subjects.name, name)).limit(1);
        if (duplicate.length > 0 && duplicate[0].id !== id) {
            throw new Error('Mata pelajaran dengan nama tersebut sudah ada.');
        }
        await index_js_1.db.update(schema_js_1.subjects).set({ name }).where((0, drizzle_orm_1.eq)(schema_js_1.subjects.id, id));
    }
    async delete(id) {
        const existing = await index_js_1.db.select().from(schema_js_1.subjects).where((0, drizzle_orm_1.eq)(schema_js_1.subjects.id, id)).limit(1);
        if (existing.length === 0) {
            throw new Error('Mata pelajaran tidak ditemukan.');
        }
        await index_js_1.db.delete(schema_js_1.subjects).where((0, drizzle_orm_1.eq)(schema_js_1.subjects.id, id));
    }
}
exports.SubjectService = SubjectService;
exports.subjectService = new SubjectService();
