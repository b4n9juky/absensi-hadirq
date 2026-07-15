import { Router } from 'express';
import { scheduleService } from '../services/scheduleService.js';
import { validate } from '../middlewares/validate.js';
import { updateScheduleSchema } from '../lib/validation.js';

export const scheduleRouter = Router();

// GET all schedules
scheduleRouter.get('/', async (req, res) => {
  try {
    const data = await scheduleService.getSchedules();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

scheduleRouter.put('/:id', validate(updateScheduleSchema), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    }
    const { checkinStart, lateAfter, checkoutTime } = req.body;
    await scheduleService.updateSchedule(id, { checkinStart, lateAfter, checkoutTime });
    res.json({ success: true, message: 'Jadwal sekolah berhasil diperbarui.' });
  } catch (err: any) {
    console.error('[ScheduleRoutes] Error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

scheduleRouter.patch('/:id/active', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    }
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, error: 'isActive harus boolean.' });
    }
    await scheduleService.toggleActive(id, isActive);
    res.json({ success: true, message: `Hari ${isActive ? 'diaktifkan' : 'dinonaktifkan'}.` });
  } catch (err: any) {
    console.error('[ScheduleRoutes] Error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});
export const schedulesRouter = scheduleRouter;
