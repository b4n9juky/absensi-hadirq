"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRouter = void 0;
const express_1 = require("express");
const dashboardService_js_1 = require("../services/dashboardService.js");
exports.dashboardRouter = (0, express_1.Router)();
// GET dashboard statistics
exports.dashboardRouter.get('/stats', async (req, res) => {
    try {
        const date = req.query.date;
        const monthStr = req.query.month;
        const yearStr = req.query.year;
        const classIdStr = req.query.classId;
        const month = monthStr ? parseInt(monthStr) : undefined;
        const year = yearStr ? parseInt(yearStr) : undefined;
        const classId = classIdStr ? parseInt(classIdStr) : undefined;
        if (monthStr && isNaN(month)) {
            return res.status(400).json({ success: false, error: 'Bulan tidak valid.' });
        }
        if (yearStr && isNaN(year)) {
            return res.status(400).json({ success: false, error: 'Tahun tidak valid.' });
        }
        if (classIdStr && isNaN(classId)) {
            return res.status(400).json({ success: false, error: 'ID Kelas tidak valid.' });
        }
        const stats = await dashboardService_js_1.dashboardService.getStats({ date, month, year, classId });
        res.json({ success: true, data: stats });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
