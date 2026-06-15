"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configRouter = void 0;
const express_1 = require("express");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const authMiddleware_js_1 = require("../middlewares/authMiddleware.js");
const settingService_js_1 = require("../services/settingService.js");
exports.configRouter = (0, express_1.Router)();
exports.configRouter.get('/', authMiddleware_js_1.authMiddleware, async (req, res) => {
    try {
        const authenticatedUserId = req.context.user.id;
        const userName = req.context.user.name;
        let studentRecord = await index_js_1.db.select().from(schema_js_1.students).where((0, drizzle_orm_1.eq)(schema_js_1.students.userId, authenticatedUserId)).limit(1);
        if (studentRecord.length === 0) {
            const deviceUuidQuery = req.query.device_uuid || '';
            if (deviceUuidQuery) {
                studentRecord = await index_js_1.db.select().from(schema_js_1.students).where((0, drizzle_orm_1.eq)(schema_js_1.students.deviceUuid, deviceUuidQuery)).limit(1);
            }
        }
        const geofence = await settingService_js_1.settingService.getGeofenceConfig();
        const schoolName = await settingService_js_1.settingService.getValue('school_name');
        res.json({
            success: true,
            data: {
                api_base_url: geofence.api_base_url || `${req.protocol}://${req.get('host')}`,
                student_name: userName,
                student_nis: studentRecord.length > 0 ? studentRecord[0].nis : '',
                device_uuid: studentRecord.length > 0 ? (studentRecord[0].deviceUuid || '') : '',
                school_latitude: geofence.school_latitude,
                school_longitude: geofence.school_longitude,
                school_radius_meters: geofence.school_radius_meters,
                max_accuracy_meters: geofence.max_accuracy_meters,
                school_name: schoolName || '',
            },
        });
    }
    catch (error) {
        console.error('[Config] Error fetching config:', error);
        res.status(500).json({ success: false, error: 'Gagal memuat konfigurasi server.' });
    }
});
