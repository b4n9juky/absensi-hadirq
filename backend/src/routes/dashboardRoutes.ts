import { Router } from 'express';
import { dashboardService } from '../services/dashboardService.js';

export const dashboardRouter = Router();

// GET dashboard statistics
dashboardRouter.get('/stats', async (req, res) => {
  try {
    const date = req.query.date as string | undefined;
    const monthStr = req.query.month as string | undefined;
    const yearStr = req.query.year as string | undefined;
    const classIdStr = req.query.classId as string | undefined;

    const month = monthStr ? parseInt(monthStr) : undefined;
    const year = yearStr ? parseInt(yearStr) : undefined;
    const classId = classIdStr ? parseInt(classIdStr) : undefined;

    if (monthStr && isNaN(month!)) {
      return res.status(400).json({ success: false, error: 'Bulan tidak valid.' });
    }
    if (yearStr && isNaN(year!)) {
      return res.status(400).json({ success: false, error: 'Tahun tidak valid.' });
    }
    if (classIdStr && isNaN(classId!)) {
      return res.status(400).json({ success: false, error: 'ID Kelas tidak valid.' });
    }

    const stats = await dashboardService.getStats({ date, month, year, classId });
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
