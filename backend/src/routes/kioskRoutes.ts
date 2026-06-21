import { Router } from 'express';
import { kioskService } from '../services/kioskService.js';
import { studentService } from '../services/studentService.js';
import { db } from '../db/index.js';
import { students, user, classes } from '../db/schema.js';
import { eq, isNull, and } from 'drizzle-orm';

export const kioskRouter = Router();

kioskRouter.get('/embeddings', async (req, res) => {
  try {
    const kioskToken = req.headers['x-kiosk-token'];
    const expectedToken = process.env.KIOSK_SECRET_KEY || 'absensi-kiosk-secret-key-12345';
    if (!kioskToken || kioskToken !== expectedToken) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Kunci kiosk tidak valid.' });
    }
    const data = await studentService.getStudentEmbeddings();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

kioskRouter.post('/checkin', async (req, res) => {
  try {
    const kioskToken = req.headers['x-kiosk-token'];
    const expectedToken = process.env.KIOSK_SECRET_KEY || 'absensi-kiosk-secret-key-12345';
    if (!kioskToken || kioskToken !== expectedToken) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Kunci kiosk tidak valid.' });
    }

    const { studentId, status } = req.body;
    
    if (!studentId || isNaN(parseInt(studentId))) {
      return res.status(400).json({ success: false, error: 'ID Siswa tidak valid.' });
    }

    const result = await kioskService.processKioskAttendance(parseInt(studentId), status);
    
    if (result.success) {
      // Get student name and photo for greeting
      const studentRec = await db.select({
        name: user.name,
        photo: students.photo,
      }).from(students)
        .leftJoin(user, eq(students.userId, user.id))
        .where(eq(students.id, parseInt(studentId)))
        .limit(1);
        
      const studentName = studentRec.length > 0 && studentRec[0].name ? studentRec[0].name : '';
      const studentPhoto = studentRec.length > 0 ? studentRec[0].photo : null;

      res.json({ 
        success: true, 
        message: result.message,
        data: { studentName, studentPhoto }
      });
    } else {
      res.status(400).json({ success: false, error: result.message });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

kioskRouter.get('/classes', async (req, res) => {
  try {
    const kioskToken = req.headers['x-kiosk-token'];
    const expectedToken = process.env.KIOSK_SECRET_KEY || 'absensi-kiosk-secret-key-12345';
    if (!kioskToken || kioskToken !== expectedToken) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Kunci kiosk tidak valid.' });
    }
    const data = await db.select({ id: classes.id, name: classes.name }).from(classes).orderBy(classes.name);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

kioskRouter.post('/register-face/:studentId', async (req, res) => {
  try {
    const kioskToken = req.headers['x-kiosk-token'];
    const expectedToken = process.env.KIOSK_SECRET_KEY || 'absensi-kiosk-secret-key-12345';
    if (!kioskToken || kioskToken !== expectedToken) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Kunci kiosk tidak valid.' });
    }
    const studentId = parseInt(req.params.studentId);
    if (isNaN(studentId)) {
      return res.status(400).json({ success: false, error: 'ID siswa tidak valid.' });
    }
    const { faceEmbedding } = req.body;
    if (!faceEmbedding || !Array.isArray(faceEmbedding)) {
      return res.status(400).json({ success: false, error: 'Face embedding tidak valid.' });
    }
    await studentService.registerFace(studentId, faceEmbedding);
    res.json({ success: true, message: 'Wajah siswa berhasil didaftarkan.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

kioskRouter.get('/students-without-face', async (req, res) => {
  try {
    const kioskToken = req.headers['x-kiosk-token'];
    const expectedToken = process.env.KIOSK_SECRET_KEY || 'absensi-kiosk-secret-key-12345';
    if (!kioskToken || kioskToken !== expectedToken) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Kunci kiosk tidak valid.' });
    }
    const classId = req.query.classId ? parseInt(req.query.classId as string) : undefined;
    const conditions = [isNull(students.faceEmbedding)];
    if (classId && !isNaN(classId)) {
      conditions.push(eq(students.classId, classId));
    }
    const data = await db.select({
      id: students.id,
      nis: students.nis,
      studentName: user.name,
      classId: students.classId,
    })
    .from(students)
    .innerJoin(user, eq(students.userId, user.id))
    .where(and(...conditions))
    .orderBy(user.name);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default kioskRouter;
