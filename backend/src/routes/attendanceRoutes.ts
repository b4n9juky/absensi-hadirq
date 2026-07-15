import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { attendanceService } from '../services/attendanceService.js';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { attendanceSchema, qrAttendanceSchema } from '../lib/validation.js';

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `selfie-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung!'));
    }
  },
});

export const attendanceRouter = Router();

attendanceRouter.delete(
  '/:id',
  authMiddleware,
  requireRole(['admin']),
  async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(200).json({ success: false, message: 'ID absensi tidak valid.' });
    }

    const result = await attendanceService.deleteAttendance(id);
    return res.status(200).json(result);
  }
);

attendanceRouter.post(
  '/qr',
  authMiddleware,
  requireRole(['guru']),
  validate(qrAttendanceSchema),
  async (req, res) => {
    const { student_nis } = req.body;

    const result = await attendanceService.processQrAttendance({
      student_nis,
      teacherUserId: req.context!.user.id,
      teacherName: req.context!.user.name,
    });

    return res.status(200).json(result);
  }
);
