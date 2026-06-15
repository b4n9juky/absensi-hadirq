"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRouter = void 0;
const express_1 = require("express");
const dashboardService_js_1 = require("../services/dashboardService.js");
const validate_js_1 = require("../middlewares/validate.js");
const validation_js_1 = require("../lib/validation.js");
exports.dashboardRouter = (0, express_1.Router)();
exports.dashboardRouter.get('/stats', (0, validate_js_1.validate)(validation_js_1.dashboardStatsSchema, 'query'), async (req, res) => {
    try {
        const date = req.query.date;
        const month = req.query.month ? parseInt(req.query.month) : undefined;
        const year = req.query.year ? parseInt(req.query.year) : undefined;
        const classId = req.query.classId ? parseInt(req.query.classId) : undefined;
        const stats = await dashboardService_js_1.dashboardService.getStats({ date, month, year, classId });
        res.json({ success: true, data: stats });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
