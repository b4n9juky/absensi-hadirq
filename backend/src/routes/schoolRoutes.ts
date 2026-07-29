import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { schools, user as userTable, account } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const schoolRouter = Router();

// Check slug availability
schoolRouter.get('/schools/check-slug', async (req, res) => {
  try {
    const slug = (req.query.slug as string || '').toLowerCase().trim();
    if (!slug || slug.length < 3) {
      return res.json({ success: true, data: { taken: false } });
    }
    const existing = await db.select({ id: schools.id }).from(schools).where(eq(schools.slug, slug)).limit(1);
    return res.json({ success: true, data: { taken: existing.length > 0 } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Gagal memeriksa ketersediaan slug.' });
  }
});

// Register new school
schoolRouter.post('/schools/register', async (req, res) => {
  try {
    const { name, slug, adminName, adminEmail, adminPassword } = req.body;

    if (!name || !slug || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ success: false, error: 'Semua field harus diisi.' });
    }

    const normalizedSlug = slug.toLowerCase().trim();
    if (normalizedSlug.length < 3) {
      return res.status(400).json({ success: false, error: 'Subdomain minimal 3 karakter.' });
    }

    if (adminPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'Password minimal 8 karakter.' });
    }

    const existingSlug = await db.select({ id: schools.id }).from(schools).where(eq(schools.slug, normalizedSlug)).limit(1);
    if (existingSlug.length > 0) {
      return res.status(400).json({ success: false, error: 'Subdomain sudah digunakan.' });
    }

    const existingEmail = await db.select({ id: userTable.id }).from(userTable).where(eq(userTable.email, adminEmail)).limit(1);
    if (existingEmail.length > 0) {
      return res.status(400).json({ success: false, error: 'Email sudah terdaftar.' });
    }

    const [newSchool] = await db.insert(schools).values({
      name,
      slug: normalizedSlug,
      isActive: false,
      isApproved: false,
      contactEmail: adminEmail,
    }).$returningId();

    const userId = uuidv4();
    const now = new Date();

    await db.insert(userTable).values({
      id: userId,
      schoolId: newSchool.id,
      name: adminName,
      email: adminEmail,
      emailVerified: true,
      role: 'admin',
      createdAt: now,
      updatedAt: now,
    });

    const { hashPassword } = await import('@better-auth/utils/password');
    const hashedPassword = await hashPassword(adminPassword);
    await db.insert(account).values({
      id: uuidv4(),
      userId,
      accountId: userId,
      providerId: 'credential',
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    });

    return res.json({ success: true, data: { schoolId: newSchool.id, message: 'Pendaftaran berhasil. Menunggu persetujuan administrator.' } });
  } catch (err: any) {
    console.error('[SchoolRegister] Error:', err);
    if (err.message?.includes('Duplicate entry')) {
      return res.status(400).json({ success: false, error: 'Data sudah terdaftar.' });
    }
    return res.status(500).json({ success: false, error: 'Gagal mendaftarkan sekolah.' });
  }
});
