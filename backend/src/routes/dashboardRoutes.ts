import { Router } from 'express';
import { dashboardService } from '../services/dashboardService.js';
import { validate } from '../middlewares/validate.js';
import { dashboardStatsSchema } from '../lib/validation.js';

export const dashboardRouter = Router();

dashboardRouter.get('/stats', validate(dashboardStatsSchema, 'query'), async (req, res) => {
  try {
    const date = req.query.date as string | undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const classId = req.query.classId ? parseInt(req.query.classId as string) : undefined;

    const stats = await dashboardService.getStats({ date, month, year, classId });
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
