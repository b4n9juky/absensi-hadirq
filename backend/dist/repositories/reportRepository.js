"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportRepo = exports.ReportRepository = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
class ReportRepository {
    async getAttendanceReport(filters) {
        const query = index_js_1.db.select({
            id: schema_js_1.attendances.id,
            attendanceDate: schema_js_1.attendances.attendanceDate,
            status: schema_js_1.attendances.status,
            checkinTime: schema_js_1.attendances.checkinTime,
            checkinPhoto: schema_js_1.attendances.checkinPhoto,
            checkinLatitude: schema_js_1.attendances.checkinLatitude,
            checkinLongitude: schema_js_1.attendances.checkinLongitude,
            checkoutTime: schema_js_1.attendances.checkoutTime,
            checkoutPhoto: schema_js_1.attendances.checkoutPhoto,
            checkoutLatitude: schema_js_1.attendances.checkoutLatitude,
            checkoutLongitude: schema_js_1.attendances.checkoutLongitude,
            studentId: schema_js_1.students.id,
            studentNis: schema_js_1.students.nis,
            classId: schema_js_1.classes.id,
            className: schema_js_1.classes.name,
            academicYearId: schema_js_1.academicYears.id,
            academicYearName: schema_js_1.academicYears.name,
            semesterId: schema_js_1.semesters.id,
            semesterName: schema_js_1.semesters.name
        })
            .from(schema_js_1.attendances)
            .innerJoin(schema_js_1.students, (0, drizzle_orm_1.eq)(schema_js_1.attendances.studentId, schema_js_1.students.id))
            .innerJoin(schema_js_1.classes, (0, drizzle_orm_1.eq)(schema_js_1.students.classId, schema_js_1.classes.id))
            .innerJoin(schema_js_1.academicYears, (0, drizzle_orm_1.eq)(schema_js_1.attendances.academicYearId, schema_js_1.academicYears.id))
            .innerJoin(schema_js_1.semesters, (0, drizzle_orm_1.eq)(schema_js_1.attendances.semesterId, schema_js_1.semesters.id));
        const conditions = [];
        if (filters.studentId !== undefined) {
            conditions.push((0, drizzle_orm_1.eq)(schema_js_1.attendances.studentId, filters.studentId));
        }
        if (filters.nis) {
            conditions.push((0, drizzle_orm_1.eq)(schema_js_1.students.nis, filters.nis));
        }
        if (filters.classId !== undefined) {
            conditions.push((0, drizzle_orm_1.eq)(schema_js_1.students.classId, filters.classId));
        }
        if (filters.semesterId !== undefined) {
            conditions.push((0, drizzle_orm_1.eq)(schema_js_1.attendances.semesterId, filters.semesterId));
        }
        if (filters.academicYearId !== undefined) {
            conditions.push((0, drizzle_orm_1.eq)(schema_js_1.attendances.academicYearId, filters.academicYearId));
        }
        if (filters.date) {
            conditions.push((0, drizzle_orm_1.eq)(schema_js_1.attendances.attendanceDate, filters.date));
        }
        else {
            if (filters.startDate) {
                conditions.push((0, drizzle_orm_1.gte)(schema_js_1.attendances.attendanceDate, filters.startDate));
            }
            if (filters.endDate) {
                conditions.push((0, drizzle_orm_1.lte)(schema_js_1.attendances.attendanceDate, filters.endDate));
            }
        }
        if (conditions.length > 0) {
            query.where((0, drizzle_orm_1.and)(...conditions));
        }
        // Order descending by date, then checkin time
        query.orderBy(schema_js_1.attendances.attendanceDate, schema_js_1.attendances.checkinTime);
        return query;
    }
}
exports.ReportRepository = ReportRepository;
exports.reportRepo = new ReportRepository();
