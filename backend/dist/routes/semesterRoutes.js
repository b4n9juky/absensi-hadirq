"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.semestersRouter = exports.semesterRouter = void 0;
const express_1 = require("express");
const semesterService_js_1 = require("../services/semesterService.js");
exports.semesterRouter = (0, express_1.Router)();
// GET all semesters
exports.semesterRouter.get('/', async (req, res) => {
    try {
        const data = await semesterService_js_1.semesterService.getSemesters();
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST a new semester
exports.semesterRouter.post('/', async (req, res) => {
    try {
        const { academicYearId, name, isActive } = req.body;
        const insertId = await semesterService_js_1.semesterService.createSemester({ academicYearId, name, isActive });
        res.status(201).json({ success: true, message: 'Semester berhasil dibuat.', data: { id: insertId } });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// PUT to activate a specific semester (deactivates others in the same academic year)
exports.semesterRouter.put('/:id/activate', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID tidak valid.' });
        }
        await semesterService_js_1.semesterService.activateSemester(id);
        res.json({ success: true, message: 'Semester berhasil diaktifkan.' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.semestersRouter = exports.semesterRouter;
