"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentsRouter = void 0;
const express_1 = require("express");
const studentService_js_1 = require("../services/studentService.js");
const schema_js_1 = require("../db/schema.js");
const index_js_1 = require("../db/index.js");
const drizzle_orm_1 = require("drizzle-orm");
exports.studentsRouter = (0, express_1.Router)();
// GET all students
exports.studentsRouter.get('/', async (req, res) => {
    try {
        const data = await studentService_js_1.studentService.getStudents();
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST create student
exports.studentsRouter.post('/', async (req, res) => {
    try {
        const { userId, nis, classId } = req.body;
        const studentId = await studentService_js_1.studentService.createStudent({
            userId,
            nis,
            classId: parseInt(classId)
        });
        res.status(201).json({ success: true, message: 'Siswa berhasil dibuat.', data: { id: studentId } });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// PUT update student
exports.studentsRouter.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID tidak valid.' });
        }
        const { userId, nis, classId } = req.body;
        await studentService_js_1.studentService.updateStudent(id, {
            userId,
            nis,
            classId: parseInt(classId)
        });
        res.json({ success: true, message: 'Siswa berhasil diperbarui.' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// DELETE student
exports.studentsRouter.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID tidak valid.' });
        }
        // Check referenced attendances
        const linked = await index_js_1.db.select().from(schema_js_1.attendances).where((0, drizzle_orm_1.eq)(schema_js_1.attendances.studentId, id)).limit(1);
        if (linked.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Data siswa tidak bisa dihapus karena telah memiliki riwayat kehadiran di database.'
            });
        }
        await studentService_js_1.studentService.deleteStudent(id);
        res.json({ success: true, message: 'Siswa berhasil dihapus.' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// PUT reset student device UUID
exports.studentsRouter.put('/:id/reset-device', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID tidak valid.' });
        }
        await studentService_js_1.studentService.resetDevice(id);
        res.json({ success: true, message: 'Kunci perangkat HP siswa berhasil di-reset.' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.default = exports.studentsRouter;
