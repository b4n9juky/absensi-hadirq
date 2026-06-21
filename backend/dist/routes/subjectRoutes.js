"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subjectRouter = void 0;
const express_1 = require("express");
const subjectService_js_1 = require("../services/subjectService.js");
const authMiddleware_js_1 = require("../middlewares/authMiddleware.js");
exports.subjectRouter = (0, express_1.Router)();
exports.subjectRouter.get('/', async (req, res) => {
    try {
        const data = await subjectService_js_1.subjectService.getAll();
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.subjectRouter.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ success: false, error: 'ID tidak valid.' });
        const data = await subjectService_js_1.subjectService.getById(id);
        if (!data)
            return res.status(404).json({ success: false, error: 'Mata pelajaran tidak ditemukan.' });
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.subjectRouter.post('/', (0, authMiddleware_js_1.requireRole)(['admin']), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Nama mata pelajaran wajib diisi.' });
        }
        const id = await subjectService_js_1.subjectService.create(name.trim());
        res.status(201).json({ success: true, message: 'Mata pelajaran berhasil ditambahkan.', data: { id } });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.subjectRouter.put('/:id', (0, authMiddleware_js_1.requireRole)(['admin']), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ success: false, error: 'ID tidak valid.' });
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Nama mata pelajaran wajib diisi.' });
        }
        await subjectService_js_1.subjectService.update(id, name.trim());
        res.json({ success: true, message: 'Mata pelajaran berhasil diperbarui.' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.subjectRouter.delete('/:id', (0, authMiddleware_js_1.requireRole)(['admin']), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ success: false, error: 'ID tidak valid.' });
        await subjectService_js_1.subjectService.delete(id);
        res.json({ success: true, message: 'Mata pelajaran berhasil dihapus.' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
