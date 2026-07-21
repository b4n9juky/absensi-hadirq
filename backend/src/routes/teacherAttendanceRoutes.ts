import { Router } from 'express';
import { teacherAttendanceService } from '../services/teacherAttendanceService.js';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware.js';

export const teacherAttendanceRouter = Router();

teacherAttendanceRouter.post('/checkin', authMiddleware, requireRole(['guru']), async (req, res) => {
  try {
    const teacherId = req.context!.user.id;
    const result = await teacherAttendanceService.checkin(teacherId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

teacherAttendanceRouter.post('/checkout', authMiddleware, requireRole(['guru']), async (req, res) => {
  try {
    const teacherId = req.context!.user.id;
    const result = await teacherAttendanceService.checkout(teacherId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

teacherAttendanceRouter.get('/my-status', authMiddleware, requireRole(['guru']), async (req, res) => {
  try {
    const teacherId = req.context!.user.id;
    const result = await teacherAttendanceService.getMyStatus(teacherId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

teacherAttendanceRouter.get('/report', authMiddleware, requireRole(['admin', 'guru']), async (req, res) => {
  try {
    const user = req.context!.user;
    const teacherIdParam = req.query.teacherId as string | undefined;
    const date = req.query.date as string | undefined;
    const monthStr = req.query.month as string | undefined;
    const yearStr = req.query.year as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const month = monthStr ? parseInt(monthStr) : undefined;
    const year = yearStr ? parseInt(yearStr) : undefined;

    const teacherId = user.role === 'guru' ? user.id : teacherIdParam;

    const result = await teacherAttendanceService.getReport({
      teacherId,
      date,
      month,
      year,
      startDate,
      endDate,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

teacherAttendanceRouter.get('/teachers', authMiddleware, requireRole(['admin']), async (_req, res) => {
  try {
    const teachers = await teacherAttendanceService.getTeachers();
    res.json({ success: true, data: teachers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

teacherAttendanceRouter.put('/:id/verify', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID tidak valid.' });

    const { teacherAttendanceRepo } = await import('../repositories/teacherAttendanceRepository.js');
    await teacherAttendanceRepo.update(id, { isVerified: true });
    res.json({ success: true, message: 'Absensi terverifikasi.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

teacherAttendanceRouter.put('/:id', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID tidak valid.' });

    const { teacherAttendanceRepo } = await import('../repositories/teacherAttendanceRepository.js');
    const { status, note, checkinTime, checkoutTime, isVerified } = req.body;
    await teacherAttendanceRepo.update(id, { status, note, checkinTime, checkoutTime, isVerified });
    res.json({ success: true, message: 'Data absensi diperbarui.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});