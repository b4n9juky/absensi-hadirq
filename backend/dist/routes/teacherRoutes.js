"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teacherRouter = void 0;
const express_1 = require("express");
const teacherService_js_1 = require("../services/teacherService.js");
const authMiddleware_js_1 = require("../middlewares/authMiddleware.js");
exports.teacherRouter = (0, express_1.Router)();
exports.teacherRouter.get('/current-schedule', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['guru']), async (req, res) => {
    try {
        const teacherId = req.context.user.id;
        const schedule = await teacherService_js_1.teacherService.getCurrentSchedule(teacherId);
        if (!schedule) {
            const upcoming = await teacherService_js_1.teacherService.getUpcomingSchedule(teacherId);
            return res.json({ success: true, data: null, upcoming: upcoming });
        }
        res.json({ success: true, data: schedule });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.teacherRouter.get('/class-students/:classId', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['guru']), async (req, res) => {
    try {
        const classId = parseInt(req.params.classId);
        if (isNaN(classId)) {
            return res.status(400).json({ success: false, error: 'ID kelas tidak valid.' });
        }
        const students = await teacherService_js_1.teacherService.getClassStudentsWithAttendance(classId);
        res.json({ success: true, data: students });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.teacherRouter.post('/mark-attendance', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['guru']), async (req, res) => {
    try {
        const { student_nis, status, isVerified, is_verified } = req.body;
        if (!student_nis) {
            return res.status(400).json({ success: false, error: 'NIS siswa wajib diisi.' });
        }
        const teacherId = req.context.user.id;
        const teacherName = req.context.user.name;
        const finalIsVerified = isVerified !== undefined ? isVerified : is_verified;
        const result = await teacherService_js_1.teacherService.markAttendance(teacherId, teacherName, student_nis, status, finalIsVerified);
        res.json({ success: result.success, message: result.message });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.teacherRouter.post('/mark-attendance-bulk', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['guru']), async (req, res) => {
    try {
        const { student_nis_list } = req.body;
        if (!student_nis_list || !Array.isArray(student_nis_list)) {
            return res.status(400).json({ success: false, error: 'Daftar NIS siswa wajib berupa Array.' });
        }
        const teacherId = req.context.user.id;
        const teacherName = req.context.user.name;
        const result = await teacherService_js_1.teacherService.markAttendanceBulk(teacherId, teacherName, student_nis_list);
        res.json({ success: result.success, message: result.message });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
