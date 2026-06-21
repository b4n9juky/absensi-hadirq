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
  '/',
  authMiddleware,
  requireRole(['siswa']),
  upload.single('photo'),
  async (req, res) => {
    const file = req.file;
    const { student_id, latitude, longitude, accuracy, device_uuid } = req.body;

    const missingFields: string[] = [];
    if (!student_id) missingFields.push('student_id');
    if (!latitude) missingFields.push('latitude');
    if (!longitude) missingFields.push('longitude');
    if (!accuracy) missingFields.push('accuracy');
    if (!device_uuid) missingFields.push('device_uuid');

    if (missingFields.length > 0) {
      if (file) fs.unlinkSync(file.path);
      return res.status(200).json({ success: false, message: 'Payload request tidak lengkap.' });
    }

    if (!file) {
      return res.status(200).json({ success: false, message: 'Foto bukti selfie tidak terkirim.' });
    }

    const result = await attendanceService.processAttendance({
      student_id,
      latitude,
      longitude,
      accuracy,
      device_uuid,
      photoPath: file.path,
      authenticatedUserId: req.context!.user.id,
      authenticatedUserName: req.context!.user.name,
    });

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
