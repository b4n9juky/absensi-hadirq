import { Router } from 'express';
import { db } from '../db/index.js';
import { schools } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware.js';

export const adminSchoolRouter = Router();

adminSchoolRouter.use(authMiddleware);
adminSchoolRouter.use(requireRole(['super_admin']));

// List all schools
adminSchoolRouter.get('/schools', async (req, res) => {
  try {
    const all = await db.select().from(schools).orderBy(schools.createdAt);
    return res.json({ success: true, data: all });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Gagal memuat data sekolah.' });
  }
});

// Get single school
adminSchoolRouter.get('/schools/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    const [school] = await db.select().from(schools).where(eq(schools.id, id)).limit(1);
    if (!school) return res.status(404).json({ success: false, error: 'Sekolah tidak ditemukan.' });
    return res.json({ success: true, data: school });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Gagal memuat data sekolah.' });
  }
});

// Update school config
adminSchoolRouter.put('/schools/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    const { latitude, longitude, radiusMeters, maxAccuracy, timezone, isActive, name } = req.body;
    const updateData: Record<string, any> = {};
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (radiusMeters !== undefined) updateData.radiusMeters = radiusMeters;
    if (maxAccuracy !== undefined) updateData.maxAccuracy = maxAccuracy;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (name !== undefined) updateData.name = name;
    if (Object.keys(updateData).length === 0) return res.status(400).json({ success: false, error: 'Tidak ada data yang diubah.' });
    await db.update(schools).set(updateData).where(eq(schools.id, id));
    return res.json({ success: true, message: 'Data sekolah berhasil diperbarui.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Gagal memperbarui data sekolah.' });
  }
});

// Approve school
adminSchoolRouter.put('/schools/:id/approve', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    await db.update(schools).set({ isApproved: true, isActive: true }).where(eq(schools.id, id));
    return res.json({ success: true, message: 'Sekolah berhasil disetujui dan diaktifkan.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Gagal menyetujui sekolah.' });
  }
});

// Reject school
adminSchoolRouter.put('/schools/:id/reject', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    await db.update(schools).set({ isApproved: false, isActive: false }).where(eq(schools.id, id));
    return res.json({ success: true, message: 'Sekolah berhasil ditolak.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Gagal menolak sekolah.' });
  }
});

// Delete school
adminSchoolRouter.delete('/schools/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    await db.update(schools).set({ isActive: false }).where(eq(schools.id, id));
    return res.json({ success: true, message: 'Sekolah berhasil dinonaktifkan.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Gagal menonaktifkan sekolah.' });
  }
});
