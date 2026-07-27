import { Router } from 'express';
import { settingService } from '../services/settingService.js';
import { getSchoolTimezone } from '../lib/timezone.js';

export const settingsRouter = Router();

// GET all settings
settingsRouter.get('/', async (req, res) => {
  try {
    const data = await settingService.getAll();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET school timezone
settingsRouter.get('/timezone', async (_req, res) => {
  res.json({ success: true, data: { timezone: getSchoolTimezone() } });
});

// PUT update settings (partial)
settingsRouter.put('/', async (req, res) => {
  try {
    const entries = req.body;
    const data = await settingService.update(entries);
    res.json({ success: true, message: 'Pengaturan berhasil disimpan.', data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default settingsRouter;
