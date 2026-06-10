"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classesRouter = void 0;
const express_1 = require("express");
const classService_js_1 = require("../services/classService.js");
const schema_js_1 = require("../db/schema.js");
const index_js_1 = require("../db/index.js");
const drizzle_orm_1 = require("drizzle-orm");
exports.classesRouter = (0, express_1.Router)();
// GET all classes
exports.classesRouter.get('/', async (req, res) => {
    try {
        const data = await classService_js_1.classService.getClasses();
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST create class
exports.classesRouter.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        const classId = await classService_js_1.classService.createClass({ name });
        res.status(201).json({ success: true, message: 'Kelas berhasil dibuat.', data: { id: classId } });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// PUT update class
exports.classesRouter.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID tidak valid.' });
        }
        const { name } = req.body;
        await classService_js_1.classService.updateClass(id, { name });
        res.json({ success: true, message: 'Kelas berhasil diperbarui.' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// DELETE class
exports.classesRouter.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID tidak valid.' });
        }
        // Check references in students
        const linked = await index_js_1.db.select().from(schema_js_1.students).where((0, drizzle_orm_1.eq)(schema_js_1.students.classId, id)).limit(1);
        if (linked.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Kelas tidak bisa dihapus karena terdapat data Siswa yang terdaftar di dalamnya. Pindahkan siswa terlebih dahulu.'
            });
        }
        await classService_js_1.classService.deleteClass(id);
        res.json({ success: true, message: 'Kelas berhasil dihapus.' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.default = exports.classesRouter;
