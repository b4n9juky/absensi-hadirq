import { Router } from 'express';
import { parentService } from '../services/parentService.js';
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
      cb(null, `import-parents-${Date.now()}-${Math.round(Math.random() * 1e9)}.xlsx`);
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

export const parentAdminRouter = Router();
export const parentDashboardRouter = Router();

// Admin: get all students with their parent link info
parentAdminRouter.get('/list', async (req, res) => {
  try {
    const data = await parentService.getAllWithLinks();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: search parent users
parentAdminRouter.get('/search', async (req, res) => {
  try {
    const query = (req.query.q as string) || '';
    const parents = await parentService.searchParents(query);
    res.json({ success: true, data: parents });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: link parent to student
parentAdminRouter.put('/link', async (req, res) => {
  try {
    const { studentId, parentId } = req.body;
    if (!studentId || !parentId) {
      return res.status(400).json({ success: false, error: 'studentId dan parentId wajib diisi.' });
    }
    await parentService.linkToStudent(parseInt(studentId), parentId);
    res.json({ success: true, message: 'Orang tua berhasil ditautkan ke siswa.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin: unlink parent from student
parentAdminRouter.delete('/unlink/:studentId', async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    if (isNaN(studentId)) {
      return res.status(400).json({ success: false, error: 'ID siswa tidak valid.' });
    }
    await parentService.unlinkStudent(studentId);
    res.json({ success: true, message: 'Tautan orang tua berhasil dihapus.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin: import parent accounts from Excel
parentAdminRouter.post('/import', uploadExcel.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'File Excel tidak terkirim.' });
    }
    const result = await parentService.importParents(file.path);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Parent dashboard: get my children with today's attendance
parentDashboardRouter.get('/children', async (req, res) => {
  try {
    const userId = req.context?.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Tidak terautentikasi.' });
    }
    const children = await parentService.getMyChildren(userId);
    res.json({ success: true, data: children });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Parent dashboard: get attendance history for a child
parentDashboardRouter.get('/attendance/:studentId', async (req, res) => {
  try {
    const userId = req.context?.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Tidak terautentikasi.' });
    }
    const studentId = parseInt(req.params.studentId);
    if (isNaN(studentId)) {
      return res.status(400).json({ success: false, error: 'ID siswa tidak valid.' });
    }
    const dateFrom = (req.query.dateFrom as string) || '';
    const dateTo = (req.query.dateTo as string) || '';
    const attendance = await parentService.getChildAttendance(userId, studentId, dateFrom, dateTo);
    res.json({ success: true, data: attendance });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
