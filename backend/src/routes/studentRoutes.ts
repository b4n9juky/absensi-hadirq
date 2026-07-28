import { Router } from 'express';
import multer from 'multer';
import { studentService } from '../services/studentService.js';
import { studentRepo } from '../repositories/studentRepository.js';
import path from 'path';
import fs from 'fs';
import { validate } from '../middlewares/validate.js';
import { createStudentSchema, updateStudentSchema } from '../lib/validation.js';

const uploadDir = path.join(__dirname, '../../uploads/students');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const studentPhotoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `student-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, _file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(_file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format file harus JPG, PNG, atau WebP.'));
    }
  },
});

export const studentsRouter = Router();

studentsRouter.get('/', async (req, res) => {
  try {
    const classId = req.query.classId ? parseInt(req.query.classId as string) : undefined;
    const data = await studentService.getStudents(classId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

studentsRouter.post('/', validate(createStudentSchema), async (req, res) => {
  try {
    const { name, nis, classId, clientTimestamp } = req.body;
    const studentId = await studentService.createStudent({ name, nis, classId }, clientTimestamp);
    res.status(201).json({ success: true, message: 'Siswa berhasil dibuat.', data: { id: studentId } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

studentsRouter.put('/:id', validate(updateStudentSchema), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    }
    const { name, nis, classId, clientTimestamp } = req.body;
    await studentService.updateStudent(id, { name, nis, classId }, clientTimestamp);
    res.json({ success: true, message: 'Siswa berhasil diperbarui.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE student (cascade removes all related records)
studentsRouter.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID tidak valid.' });
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

// GET student QR code image
studentsRouter.get('/:id/qrcode', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    }
    const student = await studentRepo.findById(id);
    if (!student || !student.qrcode) {
      return res.status(404).json({ success: false, error: 'QR code tidak ditemukan.' });
    }
    const filePath = path.join(__dirname, '../../', student.qrcode.replace(/^\//, ''));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File QR code tidak ditemukan.' });
    }
    res.sendFile(filePath);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

studentsRouter.post('/promote', async (req, res) => {
  try {
    const { fromClassId, toClassId, studentIds } = req.body;
    const result = await studentService.promoteStudents(
      parseInt(fromClassId),
      parseInt(toClassId),
      studentIds ? studentIds.map((id: any) => parseInt(id)) : undefined
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});



studentsRouter.put('/:id/photo', studentPhotoUpload.single('photo'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    }
    const existing = await studentRepo.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Siswa tidak ditemukan.' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'File foto tidak terkirim.' });
    }
    const photoPath = `/uploads/students/${req.file.filename}`;

    // Delete old photo file if exists
    if (existing.photo) {
      const oldPath = path.join(__dirname, '../../', existing.photo.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await studentRepo.updatePhoto(id, photoPath);
    res.json({ success: true, message: 'Foto siswa berhasil diperbarui.', data: { photo: photoPath } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

studentsRouter.put('/:id/register-face', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    }
    const { faceEmbedding, clientTimestamp } = req.body;
    if (!faceEmbedding || !Array.isArray(faceEmbedding)) {
      return res.status(400).json({ success: false, error: 'Face embedding tidak valid.' });
    }
    const dup = await studentService.checkDuplicateFace(id, faceEmbedding);
    if (dup.isDuplicate) {
      return res.status(409).json({ success: false, error: `Wajah ini sudah terdaftar atas nama ${dup.matchedStudent!.name} (${dup.matchedStudent!.nis}). Silakan hubungi admin jika ada kesalahan.` });
    }
    await studentService.appendFaceEmbedding(id, faceEmbedding, clientTimestamp);
    res.json({ success: true, message: 'Wajah siswa berhasil didaftarkan.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

studentsRouter.delete('/:id/delete-face', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    }
    const { clientTimestamp } = req.body;
    await studentService.deleteFace(id, clientTimestamp);
    res.json({ success: true, message: 'Data biometrik wajah berhasil dihapus.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

const uploadExcel = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const importDir = path.join(__dirname, '../../uploads/imports');
      if (!fs.existsSync(importDir)) fs.mkdirSync(importDir, { recursive: true });
      cb(null, importDir);
    },
    filename: (_req, _file, cb) => {
      cb(null, `import-students-${Date.now()}-${Math.round(Math.random() * 1e9)}.xlsx`);
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

studentsRouter.post('/import', uploadExcel.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'File Excel tidak terkirim.' });
    }
    const result = await studentService.importStudents(file.path);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default studentsRouter;
