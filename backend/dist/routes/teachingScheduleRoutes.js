"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teachingSchedulesRouter = void 0;
const express_1 = require("express");
const teachingScheduleService_js_1 = require("../services/teachingScheduleService.js");
exports.teachingSchedulesRouter = (0, express_1.Router)();
exports.teachingSchedulesRouter.get('/', async (req, res) => {
    try {
        const data = await teachingScheduleService_js_1.teachingScheduleService.getAll();
        res.json({ success: true, data });
    }
    catch (err) {
        console.error('[TeachingSchedulesRouter GET /] Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.teachingSchedulesRouter.post('/', async (req, res) => {
    try {
        const { teacherId, classId, dayName, startTime, endTime, subject } = req.body;
        if (!teacherId || !classId || !dayName || !startTime || !endTime) {
            return res.status(400).json({ success: false, error: 'Semua field wajib diisi (teacherId, classId, dayName, startTime, endTime).' });
        }
        const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        if (!validDays.includes(dayName)) {
            return res.status(400).json({ success: false, error: 'Hari tidak valid. Gunakan bahasa Inggris (Monday-Sunday).' });
        }
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            return res.status(400).json({ success: false, error: 'Format waktu harus HH:MM:SS.' });
        }
        const scheduleId = await teachingScheduleService_js_1.teachingScheduleService.create({
            teacherId, classId: Number(classId), dayName, startTime, endTime, subject: subject || '',
        });
        res.status(201).json({ success: true, message: 'Jadwal mengajar berhasil dibuat.', data: { id: scheduleId } });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.teachingSchedulesRouter.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ success: false, error: 'ID tidak valid.' });
        const { teacherId, classId, dayName, startTime, endTime, subject } = req.body;
        await teachingScheduleService_js_1.teachingScheduleService.update(id, {
            teacherId, classId: classId ? Number(classId) : undefined,
            dayName, startTime, endTime, subject,
        });
        res.json({ success: true, message: 'Jadwal mengajar berhasil diperbarui.' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.teachingSchedulesRouter.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ success: false, error: 'ID tidak valid.' });
        await teachingScheduleService_js_1.teachingScheduleService.delete(id);
        res.json({ success: true, message: 'Jadwal mengajar berhasil dihapus.' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
