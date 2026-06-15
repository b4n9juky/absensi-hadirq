"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulesRouter = exports.scheduleRouter = void 0;
const express_1 = require("express");
const scheduleService_js_1 = require("../services/scheduleService.js");
const validate_js_1 = require("../middlewares/validate.js");
const validation_js_1 = require("../lib/validation.js");
exports.scheduleRouter = (0, express_1.Router)();
// GET all schedules
exports.scheduleRouter.get('/', async (req, res) => {
    try {
        const data = await scheduleService_js_1.scheduleService.getSchedules();
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.scheduleRouter.put('/:id', (0, validate_js_1.validate)(validation_js_1.updateScheduleSchema), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID tidak valid.' });
        }
        const { checkinStart, lateAfter, checkoutTime } = req.body;
        await scheduleService_js_1.scheduleService.updateSchedule(id, { checkinStart, lateAfter, checkoutTime });
        res.json({ success: true, message: 'Jadwal sekolah berhasil diperbarui.' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.schedulesRouter = exports.scheduleRouter;
