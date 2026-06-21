"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentsRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const studentService_js_1 = require("../services/studentService.js");
const studentRepository_js_1 = require("../repositories/studentRepository.js");
const schema_js_1 = require("../db/schema.js");
const index_js_1 = require("../db/index.js");
const drizzle_orm_1 = require("drizzle-orm");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const validate_js_1 = require("../middlewares/validate.js");
const validation_js_1 = require("../lib/validation.js");
const uploadDir = path_1.default.join(__dirname, '../../uploads/students');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const studentPhotoUpload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadDir),
        filename: (_req, file, cb) => {
            const ext = path_1.default.extname(file.originalname) || '.jpg';
            cb(null, `student-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
        },
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, _file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(_file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Format file harus JPG, PNG, atau WebP.'));
        }
    },
});
exports.studentsRouter = (0, express_1.Router)();
exports.studentsRouter.get('/', async (req, res) => {
    try {
        const data = await studentService_js_1.studentService.getStudents();
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.studentsRouter.post('/', (0, validate_js_1.validate)(validation_js_1.createStudentSchema), async (req, res) => {
    try {
        const { userId, nis, classId } = req.body;
        const studentId = await studentService_js_1.studentService.createStudent({ userId, nis, classId });
        res.status(201).json({ success: true, message: 'Siswa berhasil dibuat.', data: { id: studentId } });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.studentsRouter.put('/:id', (0, validate_js_1.validate)(validation_js_1.updateStudentSchema), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID tidak valid.' });
        }
        const { userId, nis, classId } = req.body;
        await studentService_js_1.studentService.updateStudent(id, { userId, nis, classId });
        res.json({ success: true, message: 'Siswa berhasil diperbarui.' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// DELETE student
exports.studentsRouter.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID tidak valid.' });
        }
        // Check referenced attendances
        const linked = await index_js_1.db.select().from(schema_js_1.attendances).where((0, drizzle_orm_1.eq)(schema_js_1.attendances.studentId, id)).limit(1);
        if (linked.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Data siswa tidak bisa dihapus karena telah memiliki riwayat kehadiran di database.'
            });
        }
        await studentService_js_1.studentService.deleteStudent(id);
        res.json({ success: true, message: 'Siswa berhasil dihapus.' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// PUT reset student device UUID
exports.studentsRouter.put('/:id/reset-device', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID tidak valid.' });
        }
        await studentService_js_1.studentService.resetDevice(id);
        res.json({ success: true, message: 'Kunci perangkat HP siswa berhasil di-reset.' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// GET student QR code image
exports.studentsRouter.get('/:id/qrcode', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID tidak valid.' });
        }
        const student = await studentRepository_js_1.studentRepo.findById(id);
        if (!student || !student.qrcode) {
            return res.status(404).json({ success: false, error: 'QR code tidak ditemukan.' });
        }
        const filePath = path_1.default.join(__dirname, '../../', student.qrcode.replace(/^\//, ''));
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'File QR code tidak ditemukan.' });
        }
        res.sendFile(filePath);
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.studentsRouter.post('/promote', async (req, res) => {
    try {
        const { fromClassId, toClassId, studentIds } = req.body;
        const result = await studentService_js_1.studentService.promoteStudents(parseInt(fromClassId), parseInt(toClassId), studentIds ? studentIds.map((id) => parseInt(id)) : undefined);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.studentsRouter.put('/:id/photo', studentPhotoUpload.single('photo'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID tidak valid.' });
        }
        const existing = await studentRepository_js_1.studentRepo.findById(id);
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Siswa tidak ditemukan.' });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'File foto tidak terkirim.' });
        }
        const photoPath = `/uploads/students/${req.file.filename}`;
        // Delete old photo file if exists
        if (existing.photo) {
            const oldPath = path_1.default.join(__dirname, '../../', existing.photo.replace(/^\//, ''));
            if (fs_1.default.existsSync(oldPath)) {
                fs_1.default.unlinkSync(oldPath);
            }
        }
        await studentRepository_js_1.studentRepo.updatePhoto(id, photoPath);
        res.json({ success: true, message: 'Foto siswa berhasil diperbarui.', data: { photo: photoPath } });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.studentsRouter.put('/:id/register-face', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID tidak valid.' });
        }
        const { faceEmbedding } = req.body;
        if (!faceEmbedding || !Array.isArray(faceEmbedding)) {
            return res.status(400).json({ success: false, error: 'Face embedding tidak valid.' });
        }
        await studentService_js_1.studentService.registerFace(id, faceEmbedding);
        res.json({ success: true, message: 'Wajah siswa berhasil didaftarkan.' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.default = exports.studentsRouter;
