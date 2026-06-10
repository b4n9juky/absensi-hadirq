"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.academicYearRepo = exports.AcademicYearRepository = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
class AcademicYearRepository {
    async findAll() {
        return index_js_1.db.select().from(schema_js_1.academicYears);
    }
    async findById(id) {
        const results = await index_js_1.db.select().from(schema_js_1.academicYears).where((0, drizzle_orm_1.eq)(schema_js_1.academicYears.id, id)).limit(1);
        return results[0] || null;
    }
    async create(name, isActive) {
        const [result] = await index_js_1.db.insert(schema_js_1.academicYears).values({
            name,
            isActive,
        });
        return result.insertId;
    }
    async deactivateAll() {
        await index_js_1.db.update(schema_js_1.academicYears).set({ isActive: false });
    }
    async setActive(id) {
        await index_js_1.db.update(schema_js_1.academicYears).set({ isActive: true }).where((0, drizzle_orm_1.eq)(schema_js_1.academicYears.id, id));
    }
}
exports.AcademicYearRepository = AcademicYearRepository;
exports.academicYearRepo = new AcademicYearRepository();
