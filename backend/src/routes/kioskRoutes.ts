import { Router } from 'express';
import { kioskService } from '../services/kioskService.js';
import { db } from '../db/index.js';
import { students, user } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const kioskRouter = Router();

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
      // Get student name for greeting
      const studentRec = await db.select({
        name: user.name
      }).from(students)
        .leftJoin(user, eq(students.userId, user.id))
        .where(eq(students.id, parseInt(studentId)))
        .limit(1);
        
      const studentName = studentRec.length > 0 && studentRec[0].name ? studentRec[0].name : '';

      res.json({ 
        success: true, 
        message: result.message,
        data: { studentName }
      });
    } else {
      res.status(400).json({ success: false, error: result.message });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default kioskRouter;
