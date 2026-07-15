import { Router } from 'express';
import { subjectService } from '../services/subjectService.js';
import { requireRole } from '../middlewares/authMiddleware.js';

export const subjectRouter = Router();

subjectRouter.get('/', async (req, res) => {
  try {
    const data = await subjectService.getAll();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

subjectRouter.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    const data = await subjectService.getById(id);
    if (!data) return res.status(404).json({ success: false, error: 'Mata pelajaran tidak ditemukan.' });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

subjectRouter.post('/', requireRole(['admin']), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Nama mata pelajaran wajib diisi.' });
    }
    const id = await subjectService.create(name.trim());
    res.status(201).json({ success: true, message: 'Mata pelajaran berhasil ditambahkan.', data: { id } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

subjectRouter.put('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Nama mata pelajaran wajib diisi.' });
    }
    await subjectService.update(id, name.trim());
    res.json({ success: true, message: 'Mata pelajaran berhasil diperbarui.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

subjectRouter.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    await subjectService.delete(id);
    res.json({ success: true, message: 'Mata pelajaran berhasil dihapus.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadExcel = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const importDir = path.join(__dirname, '../../uploads/imports');
      if (!fs.existsSync(importDir)) fs.mkdirSync(importDir, { recursive: true });
      cb(null, importDir);
    },
    filename: (_req, _file, cb) => {
      cb(null, `import-subjects-${Date.now()}-${Math.round(Math.random() * 1e9)}.xlsx`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format file harus .xlsx atau .xls'));
    }
  },
});

subjectRouter.post('/import', requireRole(['admin']), uploadExcel.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'File Excel tidak terkirim.' });
    }
    const result = await subjectService.importSubjects(file.path);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
