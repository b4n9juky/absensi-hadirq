"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRouter = void 0;
const express_1 = require("express");
const settingService_js_1 = require("../services/settingService.js");
exports.settingsRouter = (0, express_1.Router)();
// GET all settings
exports.settingsRouter.get('/', async (req, res) => {
    try {
        const data = await settingService_js_1.settingService.getAll();
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// PUT update settings (partial)
exports.settingsRouter.put('/', async (req, res) => {
    try {
        const entries = req.body;
        const data = await settingService_js_1.settingService.update(entries);
        res.json({ success: true, message: 'Pengaturan berhasil disimpan.', data });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.default = exports.settingsRouter;
