import { Router } from 'express';
import { db } from '../db/index.js';
import { students, classes, schedules, user } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { settingService } from '../services/settingService.js';

export const configRouter = Router();

configRouter.get('/', authMiddleware, async (req, res) => {
  try {
    const userName = req.context!.user.name;

    let studentRecord: any[] = [];
    const deviceUuidQuery = (req.query.device_uuid as string) || '';
    if (deviceUuidQuery) {
      studentRecord = await db.select().from(students).where(eq(students.deviceUuid, deviceUuidQuery)).limit(1);
    }

    // Fetch class name if student has a classId
    let className = '';
    if (studentRecord.length > 0 && studentRecord[0].classId) {
      const classRec = await db.select().from(classes).where(eq(classes.id, studentRecord[0].classId)).limit(1);
      if (classRec.length > 0) className = classRec[0].name;
    }

    const geofence = await settingService.getGeofenceConfig();
    const schoolName = await settingService.getValue('school_name');
    const schoolLogo = await settingService.getValue('school_logo');

    const activeScheduleDays = await db.select({ dayName: schedules.dayName })
      .from(schedules)
      .where(eq(schedules.isActive, true));

    res.json({
      success: true,
      data: {
        api_base_url: geofence.api_base_url || `${req.protocol}://${req.get('host')}`,
        student_name: studentRecord.length > 0 ? studentRecord[0].name : userName,
        student_nis: studentRecord.length > 0 ? studentRecord[0].nis : '',
        student_photo: studentRecord.length > 0 ? (studentRecord[0].photo || '') : '',
        student_qrcode: studentRecord.length > 0 ? (studentRecord[0].qrcode || '') : '',
        student_class: className,
        device_uuid: studentRecord.length > 0 ? (studentRecord[0].deviceUuid || '') : '',
        school_latitude: geofence.school_latitude,
        school_longitude: geofence.school_longitude,
        school_radius_meters: geofence.school_radius_meters,
        max_accuracy_meters: geofence.max_accuracy_meters,
        school_name: schoolName || '',
        school_logo: schoolLogo || '',
        active_days: activeScheduleDays.map(d => d.dayName),
      },
    });
  } catch (error) {
    console.error('[Config] Error fetching config:', error);
    res.status(500).json({ success: false, error: 'Gagal memuat konfigurasi server.' });
  }
});

configRouter.get('/debug', async (_req, res) => {
  const results: Record<string, any> = {};
  try {
    // Test 1: DB connection
    results.dbConnection = 'Connecting...';
    await db.execute('SELECT 1 as test');
    results.dbConnection = 'OK';

    // Test 2: students table query (exact import query)
    try {
      const r = await db.select({ id: students.id, name: students.name, nis: students.nis })
        .from(students)
        .where(eq(students.nis, '999999'))
        .limit(1);
      results.studentsQuery = `OK (${r.length} rows)`;
    } catch (e: any) {
      results.studentsQuery = `FAILED: ${e.sqlMessage || e.message}`;
      results.studentsQueryCode = e.code;
      results.studentsQueryErrno = e.errno;
    }

    // Test 3: Full import query (all columns)
    try {
      const r = await db.select({
        id: students.id,
        name: students.name,
        nis: students.nis,
        classId: students.classId,
        deviceUuid: students.deviceUuid,
        qrcode: students.qrcode,
        faceEmbedding: students.faceEmbedding,
        photo: students.photo,
        createdAt: students.createdAt,
        updatedAt: students.updatedAt,
      }).from(students).where(eq(students.nis, '999999')).limit(1);
      results.fullStudentsQuery = `OK (${r.length} rows)`;
    } catch (e: any) {
      results.fullStudentsQuery = `FAILED: ${e.sqlMessage || e.message}`;
    }

    // Test 4: Schedules table (is_active column)
    try {
      const s = await db.select({ dayName: schedules.dayName })
        .from(schedules)
        .where(eq(schedules.isActive, true));
      results.schedulesQuery = `OK (${s.length} rows)`;
    } catch (e: any) {
      results.schedulesQuery = `FAILED: ${e.sqlMessage || e.message}`;
    }

    // Test 5: Tables list
    const [tablesRaw] = await db.execute('SHOW TABLES');
    results.tables = (tablesRaw as unknown as any[]).map((t: any) => Object.values(t)[0]);

    res.json({ success: true, data: results });
  } catch (e: any) {
    res.json({ success: true, data: { ...results, fatal: e.sqlMessage || e.message } });
  }
});
