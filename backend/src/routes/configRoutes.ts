import { Router } from 'express';
import { db } from '../db/index.js';
import { students } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { settingService } from '../services/settingService.js';

export const configRouter = Router();

configRouter.get('/', authMiddleware, async (req, res) => {
  try {
    const authenticatedUserId = req.context!.user.id;
    const userName = req.context!.user.name;

    let studentRecord = await db.select().from(students).where(eq(students.userId, authenticatedUserId)).limit(1);

    if (studentRecord.length === 0) {
      const deviceUuidQuery = (req.query.device_uuid as string) || '';
      if (deviceUuidQuery) {
        studentRecord = await db.select().from(students).where(eq(students.deviceUuid, deviceUuidQuery)).limit(1);
      }
    }

    const geofence = await settingService.getGeofenceConfig();
    const schoolName = await settingService.getValue('school_name');

    res.json({
      success: true,
      data: {
        api_base_url: geofence.api_base_url || `${req.protocol}://${req.get('host')}`,
        student_name: userName,
        student_nis: studentRecord.length > 0 ? studentRecord[0].nis : '',
        device_uuid: studentRecord.length > 0 ? (studentRecord[0].deviceUuid || '') : '',
        school_latitude: geofence.school_latitude,
        school_longitude: geofence.school_longitude,
        school_radius_meters: geofence.school_radius_meters,
        max_accuracy_meters: geofence.max_accuracy_meters,
        school_name: schoolName || '',
      },
    });
  } catch (error) {
    console.error('[Config] Error fetching config:', error);
    res.status(500).json({ success: false, error: 'Gagal memuat konfigurasi server.' });
  }
});
