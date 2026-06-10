"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRepo = exports.DashboardRepository = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
class DashboardRepository {
    async getTotalStudents(classId) {
        const query = index_js_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_js_1.students);
        if (classId) {
            query.where((0, drizzle_orm_1.eq)(schema_js_1.students.classId, classId));
        }
        const result = await query;
        return Number(result[0]?.count || 0);
    }
    async getAttendanceCount(status, startDate, endDate, classId) {
        const conditions = [
            (0, drizzle_orm_1.eq)(schema_js_1.attendances.status, status),
            (0, drizzle_orm_1.gte)(schema_js_1.attendances.attendanceDate, startDate),
            (0, drizzle_orm_1.lte)(schema_js_1.attendances.attendanceDate, endDate)
        ];
        if (classId) {
            const result = await index_js_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_js_1.attendances)
                .innerJoin(schema_js_1.students, (0, drizzle_orm_1.eq)(schema_js_1.attendances.studentId, schema_js_1.students.id))
                .where((0, drizzle_orm_1.and)(...conditions, (0, drizzle_orm_1.eq)(schema_js_1.students.classId, classId)));
            return Number(result[0]?.count || 0);
        }
        else {
            const result = await index_js_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_js_1.attendances)
                .where((0, drizzle_orm_1.and)(...conditions));
            return Number(result[0]?.count || 0);
        }
    }
}
exports.DashboardRepository = DashboardRepository;
exports.dashboardRepo = new DashboardRepository();
