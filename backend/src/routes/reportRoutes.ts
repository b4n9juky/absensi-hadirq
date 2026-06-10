import { Router } from 'express';
import { reportService } from '../services/reportService.js';

export const reportRouter = Router();

// GET reports
reportRouter.get('/attendance', async (req, res) => {
  try {
    const studentIdStr = req.query.studentId as string | undefined;
    const nis = req.query.nis as string | undefined;
    const classIdStr = req.query.classId as string | undefined;
    const semesterIdStr = req.query.semesterId as string | undefined;
    const academicYearIdStr = req.query.academicYearId as string | undefined;
    const date = req.query.date as string | undefined;
    const monthStr = req.query.month as string | undefined;
    const yearStr = req.query.year as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const studentId = studentIdStr ? parseInt(studentIdStr) : undefined;
    const classId = classIdStr ? parseInt(classIdStr) : undefined;
    const semesterId = semesterIdStr ? parseInt(semesterIdStr) : undefined;
    const academicYearId = academicYearIdStr ? parseInt(academicYearIdStr) : undefined;
    const month = monthStr ? parseInt(monthStr) : undefined;
    const year = yearStr ? parseInt(yearStr) : undefined;

    if (studentIdStr && isNaN(studentId!)) {
      return res.status(400).json({ success: false, error: 'ID Siswa tidak valid.' });
    }
    if (classIdStr && isNaN(classId!)) {
      return res.status(400).json({ success: false, error: 'ID Kelas tidak valid.' });
    }
    if (semesterIdStr && isNaN(semesterId!)) {
      return res.status(400).json({ success: false, error: 'ID Semester tidak valid.' });
    }
    if (academicYearIdStr && isNaN(academicYearId!)) {
      return res.status(400).json({ success: false, error: 'ID Tahun Ajaran tidak valid.' });
    }
    if (monthStr && isNaN(month!)) {
      return res.status(400).json({ success: false, error: 'Bulan tidak valid.' });
    }
    if (yearStr && isNaN(year!)) {
      return res.status(400).json({ success: false, error: 'Tahun tidak valid.' });
    }

    const data = await reportService.getReport({
      studentId,
      nis,
      classId,
      date,
      month,
      year,
      semesterId,
      academicYearId,
      startDate,
      endDate
    });

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
export const reportsRouter = reportRouter;
