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
