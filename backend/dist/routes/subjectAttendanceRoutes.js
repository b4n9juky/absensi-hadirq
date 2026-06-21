"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subjectAttendanceRouter = void 0;
const express_1 = require("express");
const subjectAttendanceService_js_1 = require("../services/subjectAttendanceService.js");
const authMiddleware_js_1 = require("../middlewares/authMiddleware.js");
const schema_js_1 = require("../db/schema.js");
const index_js_1 = require("../db/index.js");
const drizzle_orm_1 = require("drizzle-orm");
exports.subjectAttendanceRouter = (0, express_1.Router)();
exports.subjectAttendanceRouter.get('/schedule/:scheduleId/date/:date', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['guru']), async (req, res) => {
    try {
        const scheduleId = parseInt(req.params.scheduleId);
        const date = req.params.date;
        if (isNaN(scheduleId)) {
            return res.status(400).json({ success: false, error: 'ID jadwal tidak valid.' });
        }
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({ success: false, error: 'Format tanggal harus YYYY-MM-DD.' });
        }
        const teacherId = req.context.user.id;
        const schedule = await index_js_1.db.select({ teacherId: schema_js_1.teachingSchedules.teacherId })
            .from(schema_js_1.teachingSchedules)
            .where((0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.id, scheduleId))
            .limit(1);
        if (schedule.length === 0) {
            return res.status(404).json({ success: false, error: 'Jadwal tidak ditemukan.' });
        }
        if (schedule[0].teacherId !== teacherId) {
            return res.status(403).json({ success: false, error: 'Anda tidak memiliki akses ke jadwal ini.' });
        }
        const result = await subjectAttendanceService_js_1.subjectAttendanceService.getForm(scheduleId, date);
        res.json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.subjectAttendanceRouter.post('/', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['guru']), async (req, res) => {
    try {
        const { scheduleId, date, entries } = req.body;
        if (!scheduleId || !date || !entries || !Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ success: false, error: 'Data tidak lengkap. Dibutuhkan scheduleId, date, dan entries.' });
        }
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({ success: false, error: 'Format tanggal harus YYYY-MM-DD.' });
        }
        const teacherId = req.context.user.id;
        const schedule = await index_js_1.db.select({ teacherId: schema_js_1.teachingSchedules.teacherId })
            .from(schema_js_1.teachingSchedules)
            .where((0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.id, scheduleId))
            .limit(1);
        if (schedule.length === 0) {
            return res.status(404).json({ success: false, error: 'Jadwal tidak ditemukan.' });
        }
        if (schedule[0].teacherId !== teacherId) {
            return res.status(403).json({ success: false, error: 'Anda tidak memiliki akses ke jadwal ini.' });
        }
        const result = await subjectAttendanceService_js_1.subjectAttendanceService.submitAttendance(scheduleId, date, entries);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
