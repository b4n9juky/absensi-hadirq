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
    console.error('[TeacherRoutes /current-schedule] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

teacherRouter.get('/students-with-face-status/:classId', authMiddleware, requireRole(['guru']), async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);
    if (isNaN(classId)) {
      return res.status(400).json({ success: false, error: 'ID kelas tidak valid.' });
    }
    const students = await teacherService.getClassStudentsWithFaceStatus(classId);
    res.json({ success: true, data: students });
  } catch (err: any) {
    console.error('[TeacherRoutes /students-with-face-status] Error:', err);
    res.status(500).json({ success: false, error: err.message });
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
    console.error('[TeacherRoutes /class-students] Error:', err);
    res.status(500).json({ success: false, error: err.message });
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
    console.error('[TeacherRoutes /mark-attendance] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

teacherRouter.get('/my-schedules', authMiddleware, requireRole(['guru']), async (req, res) => {
  try {
    const teacherId = req.context!.user.id;
    const schedules = await teacherService.getMySchedules(teacherId);
    res.json({ success: true, data: schedules });
  } catch (err: any) {
    console.error('[TeacherRoutes /my-schedules GET] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

teacherRouter.post('/my-schedules', authMiddleware, requireRole(['guru']), async (req, res) => {
  try {
    const teacherId = req.context!.user.id;
    const { classId, dayName, startTime, endTime, subject } = req.body;
    if (!classId || !dayName || !startTime || !endTime) {
      return res.status(400).json({ success: false, error: 'Semua field wajib diisi (classId, dayName, startTime, endTime).' });
    }
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!validDays.includes(dayName)) {
      return res.status(400).json({ success: false, error: 'Hari tidak valid. Gunakan bahasa Inggris (Monday-Sunday).' });
    }
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({ success: false, error: 'Format waktu harus HH:MM:SS.' });
    }
    const scheduleId = await teacherService.createMySchedule(teacherId, {
      classId: Number(classId), dayName, startTime, endTime, subject: subject || '',
    });
    res.status(201).json({ success: true, message: 'Jadwal berhasil dibuat.', data: { id: scheduleId } });
  } catch (err: any) {
    console.error('[TeacherRoutes /my-schedules POST] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

teacherRouter.put('/my-schedules/:id', authMiddleware, requireRole(['guru']), async (req, res) => {
  try {
    const teacherId = req.context!.user.id;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    const { classId, dayName, startTime, endTime, subject } = req.body;
    await teacherService.updateMySchedule(teacherId, id, {
      classId: classId ? Number(classId) : undefined,
      dayName, startTime, endTime, subject,
    });
    res.json({ success: true, message: 'Jadwal berhasil diperbarui.' });
  } catch (err: any) {
    console.error('[TeacherRoutes /my-schedules PUT] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

teacherRouter.delete('/my-schedules/:id', authMiddleware, requireRole(['guru']), async (req, res) => {
  try {
    const teacherId = req.context!.user.id;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    await teacherService.deleteMySchedule(teacherId, id);
    res.json({ success: true, message: 'Jadwal berhasil dihapus.' });
  } catch (err: any) {
    console.error('[TeacherRoutes /my-schedules DELETE] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

teacherRouter.get('/report', authMiddleware, requireRole(['guru']), async (req, res) => {
  try {
    const teacherId = req.context!.user.id;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const resolvedStart = startDate || today;
    const resolvedEnd = endDate || today;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(resolvedStart) || !dateRegex.test(resolvedEnd)) {
      return res.status(400).json({ success: false, error: 'Format tanggal harus YYYY-MM-DD.' });
    }

    const data = await teacherService.getTeacherReport(teacherId, resolvedStart, resolvedEnd);
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('[TeacherRoutes /report] Error:', err);
    res.status(500).json({ success: false, error: err.message });
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
    console.error('[TeacherRoutes /mark-attendance-bulk] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

teacherRouter.post('/mark-class-attendance', authMiddleware, requireRole(['guru']), async (req, res) => {
  try {
    const { classId, date, students: studentEntries } = req.body;

    if (!classId || !date || !Array.isArray(studentEntries) || studentEntries.length === 0) {
      return res.status(400).json({ success: false, error: 'classId, date, dan students (array) wajib diisi.' });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ success: false, error: 'Format tanggal harus YYYY-MM-DD.' });
    }

    for (const entry of studentEntries) {
      if (!entry.studentId || (entry.status !== undefined && entry.status !== null && entry.status !== '' && !['PRESENT', 'SICK', 'EXCUSED', 'ABSENT'].includes(entry.status))) {
        return res.status(400).json({ success: false, error: `Status tidak valid untuk siswa ID ${entry.studentId}. Gunakan: PRESENT, SICK, EXCUSED, ABSENT, atau null.` });
      }
    }

    const teacherId = req.context!.user.id;
    const result = await teacherService.markClassAttendance(teacherId, Number(classId), date, studentEntries);
    res.json(result);
  } catch (err: any) {
    console.error('[TeacherRoutes /mark-class-attendance] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }  
});

teacherRouter.get('/semester-journal', authMiddleware, requireRole(['admin', 'guru']), async (req, res) => {
  try {
    const user = req.context!.user;
    const teacherIdParam = req.query.teacherId as string | undefined;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'startDate dan endDate wajib diisi (YYYY-MM-DD).' });
    }

    const teacherId = user.role === 'guru' ? user.id : (teacherIdParam || user.id);

    const data = await teacherService.getSemesterJournal(teacherId, startDate, endDate);
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('[TeacherRoutes /semester-journal] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
