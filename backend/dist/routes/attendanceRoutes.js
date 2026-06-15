"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const attendanceService_js_1 = require("../services/attendanceService.js");
const authMiddleware_js_1 = require("../middlewares/authMiddleware.js");
const validate_js_1 = require("../middlewares/validate.js");
const validation_js_1 = require("../lib/validation.js");
const uploadDir = path_1.default.join(__dirname, '../../uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `selfie-${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Format file tidak didukung!'));
        }
    },
});
exports.attendanceRouter = (0, express_1.Router)();
exports.attendanceRouter.post('/', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['siswa']), upload.single('photo'), async (req, res) => {
    const file = req.file;
    const { student_id, latitude, longitude, accuracy, device_uuid } = req.body;
    const missingFields = [];
    if (!student_id)
        missingFields.push('student_id');
    if (!latitude)
        missingFields.push('latitude');
    if (!longitude)
        missingFields.push('longitude');
    if (!accuracy)
        missingFields.push('accuracy');
    if (!device_uuid)
        missingFields.push('device_uuid');
    if (missingFields.length > 0) {
        if (file)
            fs_1.default.unlinkSync(file.path);
        return res.status(200).json({ success: false, message: 'Payload request tidak lengkap.' });
    }
    if (!file) {
        return res.status(200).json({ success: false, message: 'Foto bukti selfie tidak terkirim.' });
    }
    const result = await attendanceService_js_1.attendanceService.processAttendance({
        student_id,
        latitude,
        longitude,
        accuracy,
        device_uuid,
        photoPath: file.path,
        authenticatedUserId: req.context.user.id,
        authenticatedUserName: req.context.user.name,
    });
    return res.status(200).json(result);
});
exports.attendanceRouter.post('/qr', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['guru']), (0, validate_js_1.validate)(validation_js_1.qrAttendanceSchema), async (req, res) => {
    const { student_nis } = req.body;
    const result = await attendanceService_js_1.attendanceService.processQrAttendance({
        student_nis,
        teacherUserId: req.context.user.id,
        teacherName: req.context.user.name,
    });
    return res.status(200).json(result);
});
