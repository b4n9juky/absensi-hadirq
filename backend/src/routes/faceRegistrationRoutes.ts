import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { faceRegistrationService } from '../services/faceRegistrationService.js';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware.js';

export const faceRegistrationRouter = Router();

const faceUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(__dirname, '../../uploads/faces');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, _file, cb) => {
      cb(null, `face-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('File harus berupa gambar.'));
    }
  },
});

faceRegistrationRouter.post(
  '/students/:id/register-face-photo',
  authMiddleware,
  requireRole(['guru', 'admin']),
  faceUpload.single('photo'),
  async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      if (isNaN(studentId)) {
        return res.status(400).json({ success: false, error: 'ID siswa tidak valid.' });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: 'File foto tidak terkirim.' });
      }

      const result = await faceRegistrationService.registerFace(studentId, file.path);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  },
);
