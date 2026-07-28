import { Router } from 'express';
import { waService } from '../services/waService.js';
import { notificationService } from '../services/notificationService.js';

export const waRouter = Router();

waRouter.post('/init', async (req, res) => {
  try {
    const status = waService.getStatus();
    if (status.connected) {
      return res.json({ success: true, message: 'WhatsApp sudah terhubung.', data: { connected: true } });
    }
    if (status.initializing) {
      return res.json({ success: true, message: 'WhatsApp sedang memulai koneksi.', data: { connected: false, initializing: true } });
    }
    const phone = req.body?.phone as string | undefined;
    waService.initialize(phone).catch((err: any) => {
      console.error('[WA] Init error:', err.message);
    });
    const msg = phone
      ? 'Meminta pairing code WhatsApp...'
      : 'Memulai koneksi WhatsApp. Silakan scan QR.';
    return res.json({ success: true, message: msg, data: { connected: false, initializing: true, usingPairing: !!phone } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

waRouter.get('/status', async (_req, res) => {
  try {
    const status = waService.getStatus();
    const qr = status.hasQR ? waService.getQR() : null;
    const pairingCode = status.hasPairingCode ? waService.getPairingCode() : null;
    res.json({ success: true, data: { ...status, qr, pairingCode } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

waRouter.get('/notifications', async (req, res) => {
  try {
    const { dateFrom, dateTo, status, page, limit } = req.query;
    const [notificationsData, stats] = await Promise.all([
      notificationService.getNotifications({
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        status: status as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
      }),
      notificationService.getNotificationStats({
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
      }),
    ]);
    res.json({ success: true, data: { ...notificationsData, stats } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

waRouter.post('/disconnect', async (_req, res) => {
  try {
    await waService.disconnect();
    res.json({ success: true, message: 'Koneksi WhatsApp diputuskan.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
