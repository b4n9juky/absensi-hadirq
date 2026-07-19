import { Router } from 'express';
import { kioskService } from '../services/kioskService.js';
import { studentService } from '../services/studentService.js';
import { db } from '../db/index.js';
import { students, classes, attendances } from '../db/schema.js';
import { eq, isNull, and, desc } from 'drizzle-orm';
import { getJakartaDate } from '../lib/timezone.js';
import { settingService } from '../services/settingService.js';

export const kioskRouter = Router();

function getKioskToken(): string {
  const token = process.env.KIOSK_SECRET_KEY;
  if (!token) {
    throw new Error('KIOSK_SECRET_KEY tidak dikonfigurasi di environment.');
  }
  return token;
}

kioskRouter.get('/embeddings', async (req, res) => {
  try {
    const kioskToken = req.headers['x-kiosk-token'];
    const expectedToken = getKioskToken();
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
    const expectedToken = getKioskToken();
    if (!kioskToken || kioskToken !== expectedToken) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Kunci kiosk tidak valid.' });
    }

    let { studentId, studentNis, status, latitude, longitude, accuracy } = req.body;

    // If studentNis provided (QR scan), look up student by NIS
    if (studentNis && !studentId) {
      const studentRec = await db.select({ id: students.id })
        .from(students)
        .where(eq(students.nis, studentNis))
        .limit(1);
      if (studentRec.length === 0) {
        return res.status(404).json({ success: false, error: `Siswa dengan NIS ${studentNis} tidak ditemukan.` });
      }
      studentId = studentRec[0].id;
    }

    if (!studentId || isNaN(parseInt(studentId))) {
      return res.status(400).json({ success: false, error: 'ID Siswa tidak valid.' });
    }

    const lat = latitude !== undefined ? parseFloat(latitude) : undefined;
    const lng = longitude !== undefined ? parseFloat(longitude) : undefined;
    const acc = accuracy !== undefined ? parseFloat(accuracy) : undefined;

    const result = await kioskService.processKioskAttendance(parseInt(studentId), status, lat, lng, acc);
    
    if (result.success) {
      const studentRec = await db.select({
        name: students.name,
        photo: students.photo,
      }).from(students)
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
    const expectedToken = getKioskToken();
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
    const expectedToken = getKioskToken();
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
    await studentService.appendFaceEmbedding(studentId, faceEmbedding);
    res.json({ success: true, message: 'Wajah siswa berhasil didaftarkan.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

kioskRouter.get('/students-without-face', async (req, res) => {
  try {
    const kioskToken = req.headers['x-kiosk-token'];
    const expectedToken = getKioskToken();
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
      studentName: students.name,
      classId: students.classId,
    })
    .from(students)
    .where(and(...conditions))
    .orderBy(students.name);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

kioskRouter.get('/recent-arrivals', async (req, res) => {
  try {
    const kioskToken = req.headers['x-kiosk-token'];
    const expectedToken = getKioskToken();
    if (!kioskToken || kioskToken !== expectedToken) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Kunci kiosk tidak valid.' });
    }

    const serverTime = getJakartaDate();
    const today = `${serverTime.getFullYear()}-${String(serverTime.getMonth() + 1).padStart(2, '0')}-${String(serverTime.getDate()).padStart(2, '0')}`;

    const recentArrivals = await db.select({
      id: attendances.id,
      studentId: students.id,
      studentName: students.name,
      nis: students.nis,
      photo: students.photo,
      className: classes.name,
      status: attendances.status,
      checkinTime: attendances.checkinTime,
    })
    .from(attendances)
    .innerJoin(students, eq(attendances.studentId, students.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .where(eq(attendances.attendanceDate, today))
    .orderBy(desc(attendances.checkinTime))
    .limit(10);

    res.json({ success: true, data: recentArrivals });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

kioskRouter.get('/school-location', async (req, res) => {
  try {
    const kioskToken = req.headers['x-kiosk-token'];
    const expectedToken = getKioskToken();
    if (!kioskToken || kioskToken !== expectedToken) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Kunci kiosk tidak valid.' });
    }

    const geofence = await settingService.getGeofenceConfig();
    res.json({
      success: true,
      data: {
        latitude: geofence.school_latitude,
        longitude: geofence.school_longitude,
        radius: geofence.school_radius_meters,
        maxAccuracy: geofence.max_accuracy_meters,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default kioskRouter;
