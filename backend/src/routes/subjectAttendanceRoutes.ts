import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { subjectAttendanceService } from '../services/subjectAttendanceService.js';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware.js';
import { teachingSchedules } from '../db/schema.js';
import { db } from '../db/index.js';
import { eq } from 'drizzle-orm';

const sessionPhotoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(__dirname, '../../uploads/pembelajaran');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, _file, cb) => {
      cb(null, `sesi-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung. Gunakan gambar.'));
    }
  },
});

export const subjectAttendanceRouter = Router();

subjectAttendanceRouter.get('/schedule/:scheduleId/date/:date', authMiddleware, requireRole(['guru']), async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.scheduleId);
    const date = req.params.date;

    if (isNaN(scheduleId)) {
      return res.status(400).json({ success: false, error: 'ID jadwal tidak valid.' });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ success: false, error: 'Format tanggal harus YYYY-MM-DD.' });
    }

    const teacherId = req.context!.user.id;

    const schedule = await db.select({ teacherId: teachingSchedules.teacherId })
      .from(teachingSchedules)
      .where(eq(teachingSchedules.id, scheduleId))
      .limit(1);

    if (schedule.length === 0) {
      return res.status(404).json({ success: false, error: 'Jadwal tidak ditemukan.' });
    }

    if (schedule[0].teacherId !== teacherId) {
      return res.status(403).json({ success: false, error: 'Anda tidak memiliki akses ke jadwal ini.' });
    }

    const result = await subjectAttendanceService.getForm(scheduleId, date);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

subjectAttendanceRouter.post('/', authMiddleware, requireRole(['guru']), sessionPhotoUpload.single('fotoPembelajaran'), async (req, res) => {
  try {
    const { scheduleId, date, entries: rawEntries, materi, kegiatan, catatanKendala } = req.body;
    const entries = typeof rawEntries === 'string' ? JSON.parse(rawEntries) : rawEntries;

    if (!scheduleId || !date || !entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, error: 'Data tidak lengkap. Dibutuhkan scheduleId, date, dan entries.' });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ success: false, error: 'Format tanggal harus YYYY-MM-DD.' });
    }

    const teacherId = req.context!.user.id;

    const schedule = await db.select({ teacherId: teachingSchedules.teacherId })
      .from(teachingSchedules)
      .where(eq(teachingSchedules.id, scheduleId))
      .limit(1);

    if (schedule.length === 0) {
      return res.status(404).json({ success: false, error: 'Jadwal tidak ditemukan.' });
    }

    if (schedule[0].teacherId !== teacherId) {
      return res.status(403).json({ success: false, error: 'Anda tidak memiliki akses ke jadwal ini.' });
    }

    const fotoPembelajaran = req.file ? `/uploads/pembelajaran/${req.file.filename}` : undefined;

    const result = await subjectAttendanceService.submitAttendance(scheduleId, date, entries, {
      materi: materi || undefined,
      kegiatan: kegiatan || undefined,
      catatanKendala: catatanKendala || undefined,
      fotoPembelajaran,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
