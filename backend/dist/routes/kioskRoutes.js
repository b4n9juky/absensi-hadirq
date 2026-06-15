"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kioskRouter = void 0;
const express_1 = require("express");
const kioskService_js_1 = require("../services/kioskService.js");
const studentService_js_1 = require("../services/studentService.js");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
exports.kioskRouter = (0, express_1.Router)();
exports.kioskRouter.get('/embeddings', async (req, res) => {
    try {
        const kioskToken = req.headers['x-kiosk-token'];
        const expectedToken = process.env.KIOSK_SECRET_KEY || 'absensi-kiosk-secret-key-12345';
        if (!kioskToken || kioskToken !== expectedToken) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Kunci kiosk tidak valid.' });
        }
        const data = await studentService_js_1.studentService.getStudentEmbeddings();
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.kioskRouter.post('/checkin', async (req, res) => {
    try {
        const kioskToken = req.headers['x-kiosk-token'];
        const expectedToken = process.env.KIOSK_SECRET_KEY || 'absensi-kiosk-secret-key-12345';
        if (!kioskToken || kioskToken !== expectedToken) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Kunci kiosk tidak valid.' });
        }
        const { studentId, status } = req.body;
        if (!studentId || isNaN(parseInt(studentId))) {
            return res.status(400).json({ success: false, error: 'ID Siswa tidak valid.' });
        }
        const result = await kioskService_js_1.kioskService.processKioskAttendance(parseInt(studentId), status);
        if (result.success) {
            // Get student name for greeting
            const studentRec = await index_js_1.db.select({
                name: schema_js_1.user.name
            }).from(schema_js_1.students)
                .leftJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.students.userId, schema_js_1.user.id))
                .where((0, drizzle_orm_1.eq)(schema_js_1.students.id, parseInt(studentId)))
                .limit(1);
            const studentName = studentRec.length > 0 && studentRec[0].name ? studentRec[0].name : '';
            res.json({
                success: true,
                message: result.message,
                data: { studentName }
            });
        }
        else {
            res.status(400).json({ success: false, error: result.message });
        }
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.default = exports.kioskRouter;
