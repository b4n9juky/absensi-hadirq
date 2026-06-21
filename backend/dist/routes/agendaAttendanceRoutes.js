"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agendaAttendanceRouter = void 0;
const express_1 = require("express");
const agendaAttendanceService_js_1 = require("../services/agendaAttendanceService.js");
const authMiddleware_js_1 = require("../middlewares/authMiddleware.js");
exports.agendaAttendanceRouter = (0, express_1.Router)();
exports.agendaAttendanceRouter.get('/agendas', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['guru']), async (req, res) => {
    try {
        const teacherId = req.context.user.id;
        const { date, agendaType } = req.query;
        const result = await agendaAttendanceService_js_1.agendaAttendanceService.getAgendas(teacherId, {
            date: date,
            agendaType: agendaType,
        });
        res.json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.agendaAttendanceRouter.post('/agendas', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['guru']), async (req, res) => {
    try {
        const teacherId = req.context.user.id;
        const { classId, title, agendaType, date, startTime, endTime } = req.body;
        if (!classId || !title || !date) {
            return res.status(400).json({ success: false, error: 'Data tidak lengkap. Dibutuhkan classId, title, dan date.' });
        }
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({ success: false, error: 'Format tanggal harus YYYY-MM-DD.' });
        }
        const agendaId = await agendaAttendanceService_js_1.agendaAttendanceService.createAgenda(teacherId, {
            classId: Number(classId), title, agendaType, date, startTime, endTime,
        });
        res.status(201).json({ success: true, message: 'Agenda berhasil dibuat.', data: { id: agendaId } });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.agendaAttendanceRouter.put('/agendas/:id', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['guru']), async (req, res) => {
    try {
        const teacherId = req.context.user.id;
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ success: false, error: 'ID tidak valid.' });
        const { title, agendaType, date, startTime, endTime } = req.body;
        await agendaAttendanceService_js_1.agendaAttendanceService.updateAgenda(teacherId, id, { title, agendaType, date, startTime, endTime });
        res.json({ success: true, message: 'Agenda berhasil diperbarui.' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.agendaAttendanceRouter.delete('/agendas/:id', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['guru']), async (req, res) => {
    try {
        const teacherId = req.context.user.id;
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ success: false, error: 'ID tidak valid.' });
        await agendaAttendanceService_js_1.agendaAttendanceService.deleteAgenda(teacherId, id);
        res.json({ success: true, message: 'Agenda berhasil dihapus.' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.agendaAttendanceRouter.get('/agendas/:id/students', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['guru']), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ success: false, error: 'ID agenda tidak valid.' });
        const result = await agendaAttendanceService_js_1.agendaAttendanceService.getForm(id);
        res.json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.agendaAttendanceRouter.post('/agendas/:id/attendance', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['guru']), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ success: false, error: 'ID agenda tidak valid.' });
        const { entries } = req.body;
        if (!entries || !Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ success: false, error: 'Data entries tidak valid.' });
        }
        const result = await agendaAttendanceService_js_1.agendaAttendanceService.submitAttendance(id, entries);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.agendaAttendanceRouter.post('/agendas/:id/qr-scan', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['guru']), async (req, res) => {
    try {
        const teacherId = req.context.user.id;
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ success: false, error: 'ID agenda tidak valid.' });
        const { studentNis } = req.body;
        if (!studentNis) {
            return res.status(400).json({ success: false, error: 'NIS siswa wajib diisi.' });
        }
        const result = await agendaAttendanceService_js_1.agendaAttendanceService.qrScanAttendance(teacherId, id, studentNis);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
