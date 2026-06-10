"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.academicYearsRouter = exports.academicYearRouter = void 0;
const express_1 = require("express");
const academicYearService_js_1 = require("../services/academicYearService.js");
exports.academicYearRouter = (0, express_1.Router)();
// GET all academic years
exports.academicYearRouter.get('/', async (req, res) => {
    try {
        const data = await academicYearService_js_1.academicYearService.getYears();
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST a new academic year
exports.academicYearRouter.post('/', async (req, res) => {
    try {
        const { name, isActive } = req.body;
        const insertId = await academicYearService_js_1.academicYearService.createYear({ name, isActive });
        res.status(201).json({ success: true, message: 'Tahun ajaran berhasil dibuat.', data: { id: insertId } });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// PUT to activate a specific academic year (sets others as inactive)
exports.academicYearRouter.put('/:id/activate', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID tidak valid.' });
        }
        await academicYearService_js_1.academicYearService.activateYear(id);
        res.json({ success: true, message: 'Tahun ajaran berhasil diaktifkan.' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.academicYearsRouter = exports.academicYearRouter;
