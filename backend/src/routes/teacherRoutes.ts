import { Router } from 'express';
import { teacherService } from '../services/teacherService.js';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware.js';

export const teacherRouter = Router();

teacherRouter.get('/current-schedule', authMiddleware, requireRole(['guru']), async (req, res) => {
  try {
    const teacherId = req.context!.user.id;
    const schedule = await teacherService.getCurrentSchedule(teacherId);
    if (!schedule) {
      const upcoming = await teacherService.getUpcomingSchedule(teacherId);
      return res.json({ success: true, data: null, upcoming: upcoming });
    }
    res.json({ success: true, data: schedule });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

teacherRouter.get('/class-students/:classId', authMiddleware, requireRole(['guru']), async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);
    if (isNaN(classId)) {
      return res.status(400).json({ success: false, error: 'ID kelas tidak valid.' });
    }
    const students = await teacherService.getClassStudentsWithAttendance(classId);
    res.json({ success: true, data: students });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

teacherRouter.post('/mark-attendance', authMiddleware, requireRole(['guru']), async (req, res) => {
  try {
    const { student_nis, status, isVerified, is_verified } = req.body;
    if (!student_nis) {
      return res.status(400).json({ success: false, error: 'NIS siswa wajib diisi.' });
    }
    const teacherId = req.context!.user.id;
    const teacherName = req.context!.user.name;
    const finalIsVerified = isVerified !== undefined ? isVerified : is_verified;
    const result = await teacherService.markAttendance(teacherId, teacherName, student_nis, status, finalIsVerified);
    res.json({ success: result.success, message: result.message });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

teacherRouter.post('/mark-attendance-bulk', authMiddleware, requireRole(['guru']), async (req, res) => {
  try {
    const { student_nis_list } = req.body;
    if (!student_nis_list || !Array.isArray(student_nis_list)) {
      return res.status(400).json({ success: false, error: 'Daftar NIS siswa wajib berupa Array.' });
    }
    const teacherId = req.context!.user.id;
    const teacherName = req.context!.user.name;
    const result = await teacherService.markAttendanceBulk(teacherId, teacherName, student_nis_list);
    res.json({ success: result.success, message: result.message });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
