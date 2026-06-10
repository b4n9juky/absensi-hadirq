"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.semesterRepo = exports.SemesterRepository = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
class SemesterRepository {
    async findAll() {
        return index_js_1.db.select().from(schema_js_1.semesters);
    }
    async findById(id) {
        const results = await index_js_1.db.select().from(schema_js_1.semesters).where((0, drizzle_orm_1.eq)(schema_js_1.semesters.id, id)).limit(1);
        return results[0] || null;
    }
    async create(academicYearId, name, isActive) {
        const [result] = await index_js_1.db.insert(schema_js_1.semesters).values({
            academicYearId,
            name,
            isActive,
        });
        return result.insertId;
    }
    async deactivateAllInYear(academicYearId) {
        await index_js_1.db.update(schema_js_1.semesters)
            .set({ isActive: false })
            .where((0, drizzle_orm_1.eq)(schema_js_1.semesters.academicYearId, academicYearId));
    }
    async setActive(id) {
        await index_js_1.db.update(schema_js_1.semesters).set({ isActive: true }).where((0, drizzle_orm_1.eq)(schema_js_1.semesters.id, id));
    }
}
exports.SemesterRepository = SemesterRepository;
exports.semesterRepo = new SemesterRepository();
