import { Router } from 'express';
import { classService } from '../services/classService.js';
import { students } from '../db/schema.js';
import { db } from '../db/index.js';
import { eq } from 'drizzle-orm';

export const classesRouter = Router();

// GET all classes
classesRouter.get('/', async (req, res) => {
  try {
    const data = await classService.getClasses();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create class
classesRouter.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const classId = await classService.createClass({ name });
    res.status(201).json({ success: true, message: 'Kelas berhasil dibuat.', data: { id: classId } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT update class
classesRouter.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    }
    const { name } = req.body;
    await classService.updateClass(id, { name });
    res.json({ success: true, message: 'Kelas berhasil diperbarui.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE class
classesRouter.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    }

    // Check references in students
    const linked = await db.select().from(students).where(eq(students.classId, id)).limit(1);
    if (linked.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Kelas tidak bisa dihapus karena terdapat data Siswa yang terdaftar di dalamnya. Pindahkan siswa terlebih dahulu.' 
      });
    }

    await classService.deleteClass(id);
    res.json({ success: true, message: 'Kelas berhasil dihapus.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
export default classesRouter;
