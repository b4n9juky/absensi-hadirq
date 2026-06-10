import { Router } from 'express';
import { scheduleService } from '../services/scheduleService.js';

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

// PUT to update a specific day's schedule
scheduleRouter.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    }
    const { checkinStart, lateAfter, checkoutTime } = req.body;
    await scheduleService.updateSchedule(id, { checkinStart, lateAfter, checkoutTime });
    res.json({ success: true, message: 'Jadwal sekolah berhasil diperbarui.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
export const schedulesRouter = scheduleRouter;
