import { Router } from 'express';
import { studentService } from '../services/studentService.js';
import { attendances } from '../db/schema.js';
import { db } from '../db/index.js';
import { eq } from 'drizzle-orm';

export const studentsRouter = Router();

// GET all students
studentsRouter.get('/', async (req, res) => {
  try {
    const data = await studentService.getStudents();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create student
studentsRouter.post('/', async (req, res) => {
  try {
    const { userId, nis, classId } = req.body;
    const studentId = await studentService.createStudent({ 
      userId, 
      nis, 
      classId: parseInt(classId) 
    });
    res.status(201).json({ success: true, message: 'Siswa berhasil dibuat.', data: { id: studentId } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT update student
studentsRouter.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    }
    const { userId, nis, classId } = req.body;
    await studentService.updateStudent(id, { 
      userId, 
      nis, 
      classId: parseInt(classId) 
    });
    res.json({ success: true, message: 'Siswa berhasil diperbarui.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE student
studentsRouter.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    }

    // Check referenced attendances
    const linked = await db.select().from(attendances).where(eq(attendances.studentId, id)).limit(1);
    if (linked.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Data siswa tidak bisa dihapus karena telah memiliki riwayat kehadiran di database.' 
      });
    }

    await studentService.deleteStudent(id);
    res.json({ success: true, message: 'Siswa berhasil dihapus.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT reset student device UUID
studentsRouter.put('/:id/reset-device', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    }
    await studentService.resetDevice(id);
    res.json({ success: true, message: 'Kunci perangkat HP siswa berhasil di-reset.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default studentsRouter;
