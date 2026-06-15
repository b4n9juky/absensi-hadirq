"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportsRouter = exports.reportRouter = void 0;
const express_1 = require("express");
const reportService_js_1 = require("../services/reportService.js");
exports.reportRouter = (0, express_1.Router)();
// GET reports
exports.reportRouter.get('/attendance', async (req, res) => {
    try {
        const studentIdStr = req.query.studentId;
        const nis = req.query.nis;
        const classIdStr = req.query.classId;
        const semesterIdStr = req.query.semesterId;
        const academicYearIdStr = req.query.academicYearId;
        const date = req.query.date;
        const monthStr = req.query.month;
        const yearStr = req.query.year;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const studentId = studentIdStr ? parseInt(studentIdStr) : undefined;
        const classId = classIdStr ? parseInt(classIdStr) : undefined;
        const semesterId = semesterIdStr ? parseInt(semesterIdStr) : undefined;
        const academicYearId = academicYearIdStr ? parseInt(academicYearIdStr) : undefined;
        const month = monthStr ? parseInt(monthStr) : undefined;
        const year = yearStr ? parseInt(yearStr) : undefined;
        if (studentIdStr && isNaN(studentId)) {
            return res.status(400).json({ success: false, error: 'ID Siswa tidak valid.' });
        }
        if (classIdStr && isNaN(classId)) {
            return res.status(400).json({ success: false, error: 'ID Kelas tidak valid.' });
        }
        if (semesterIdStr && isNaN(semesterId)) {
            return res.status(400).json({ success: false, error: 'ID Semester tidak valid.' });
        }
        if (academicYearIdStr && isNaN(academicYearId)) {
            return res.status(400).json({ success: false, error: 'ID Tahun Ajaran tidak valid.' });
        }
        if (monthStr && isNaN(month)) {
            return res.status(400).json({ success: false, error: 'Bulan tidak valid.' });
        }
        if (yearStr && isNaN(year)) {
            return res.status(400).json({ success: false, error: 'Tahun tidak valid.' });
        }
        const data = await reportService_js_1.reportService.getReport({
            studentId,
            nis,
            classId,
            date,
            month,
            year,
            semesterId,
            academicYearId,
            startDate,
            endDate
        });
        res.json({ success: true, data });
    }
    catch (err) {
        console.error('[ReportRoutes /attendance] Error:', err);
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.reportsRouter = exports.reportRouter;
