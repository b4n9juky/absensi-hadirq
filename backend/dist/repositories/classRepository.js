"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classRepo = exports.ClassRepository = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
class ClassRepository {
    async findAll() {
        return index_js_1.db.select().from(schema_js_1.classes);
    }
    async findById(id) {
        const results = await index_js_1.db.select().from(schema_js_1.classes).where((0, drizzle_orm_1.eq)(schema_js_1.classes.id, id)).limit(1);
        return results[0] || null;
    }
    async findByName(name) {
        const results = await index_js_1.db.select().from(schema_js_1.classes).where((0, drizzle_orm_1.eq)(schema_js_1.classes.name, name)).limit(1);
        return results[0] || null;
    }
    async create(name) {
        const [result] = await index_js_1.db.insert(schema_js_1.classes).values({ name });
        return result.insertId;
    }
    async update(id, name) {
        await index_js_1.db.update(schema_js_1.classes)
            .set({ name, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_js_1.classes.id, id));
    }
    async delete(id) {
        await index_js_1.db.delete(schema_js_1.classes).where((0, drizzle_orm_1.eq)(schema_js_1.classes.id, id));
    }
}
exports.ClassRepository = ClassRepository;
exports.classRepo = new ClassRepository();
