import { Router } from 'express';
import { subjectAttendanceService } from '../services/subjectAttendanceService.js';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware.js';
import { teachingSchedules } from '../db/schema.js';
import { db } from '../db/index.js';
import { eq } from 'drizzle-orm';

export const subjectAttendanceRouter = Router();

subjectAttendanceRouter.get('/schedule/:scheduleId/date/:date', authMiddleware, requireRole(['guru']), async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.scheduleId);
    const date = req.params.date;

    if (isNaN(scheduleId)) {
      return res.status(400).json({ success: false, error: 'ID jadwal tidak valid.' });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ success: false, error: 'Format tanggal harus YYYY-MM-DD.' });
    }

    const teacherId = req.context!.user.id;

    const schedule = await db.select({ teacherId: teachingSchedules.teacherId })
      .from(teachingSchedules)
      .where(eq(teachingSchedules.id, scheduleId))
      .limit(1);

    if (schedule.length === 0) {
      return res.status(404).json({ success: false, error: 'Jadwal tidak ditemukan.' });
    }

    if (schedule[0].teacherId !== teacherId) {
      return res.status(403).json({ success: false, error: 'Anda tidak memiliki akses ke jadwal ini.' });
    }

    const result = await subjectAttendanceService.getForm(scheduleId, date);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

subjectAttendanceRouter.post('/', authMiddleware, requireRole(['guru']), async (req, res) => {
  try {
    const { scheduleId, date, entries } = req.body;

    if (!scheduleId || !date || !entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, error: 'Data tidak lengkap. Dibutuhkan scheduleId, date, dan entries.' });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ success: false, error: 'Format tanggal harus YYYY-MM-DD.' });
    }

    const teacherId = req.context!.user.id;

    const schedule = await db.select({ teacherId: teachingSchedules.teacherId })
      .from(teachingSchedules)
      .where(eq(teachingSchedules.id, scheduleId))
      .limit(1);

    if (schedule.length === 0) {
      return res.status(404).json({ success: false, error: 'Jadwal tidak ditemukan.' });
    }

    if (schedule[0].teacherId !== teacherId) {
      return res.status(403).json({ success: false, error: 'Anda tidak memiliki akses ke jadwal ini.' });
    }

    const result = await subjectAttendanceService.submitAttendance(scheduleId, date, entries);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
