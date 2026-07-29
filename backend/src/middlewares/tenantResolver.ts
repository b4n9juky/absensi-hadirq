import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { schools } from '../db/schema.js';
import { eq } from 'drizzle-orm';

declare global {
  namespace Express {
    interface Request {
      context?: {
        user: {
          id: string;
          name: string;
          email: string;
          emailVerified: boolean;
          image?: string | null;
          role: string;
          schoolId: number | null;
          createdAt: Date;
          updatedAt: Date;
        };
        session: {
          id: string;
          expiresAt: Date;
          token: string;
          createdAt: Date;
          updatedAt: Date;
          ipAddress?: string | null;
          userAgent?: string | null;
          userId: string;
        };
        schoolId?: number | null;
        school?: {
          id: number;
          name: string;
          slug: string;
          timezone: string;
          latitude: number | null;
          longitude: number | null;
          radiusMeters: number | null;
          maxAccuracy: number | null;
          isActive: boolean;
          isApproved: boolean;
        } | null;
      };
    }
  }
}

export const tenantResolver = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const host = req.headers['host'] || '';
    const slugHeader = req.headers['x-school-slug'] as string | undefined;

    let slug: string | null = null;

    if (slugHeader) {
      slug = slugHeader;
    } else {
      const parts = host.split('.');
      if (parts.length >= 3) {
        const subdomain = parts[0].toLowerCase();
        if (subdomain !== 'www' && subdomain !== 'admin') {
          slug = subdomain;
        }
      }
    }

    if (!slug) {
      req.context = {} as any;
      return next();
    }

    const schoolRecord = await db.select().from(schools).where(eq(schools.slug, slug)).limit(1);

    if (schoolRecord.length === 0) {
      return res.status(404).json({ success: false, error: 'Sekolah tidak ditemukan.' });
    }

    const s = schoolRecord[0];

    if (!s.isActive) {
      return res.status(403).json({ success: false, error: 'Sekolah ini tidak aktif. Hubungi administrator.' });
    }

    req.context = {
      user: undefined as any,
      session: undefined as any,
      schoolId: s.id,
      school: {
        id: s.id,
        name: s.name,
        slug: s.slug,
        timezone: s.timezone || 'Asia/Jakarta',
        latitude: s.latitude,
        longitude: s.longitude,
        radiusMeters: s.radiusMeters,
        maxAccuracy: s.maxAccuracy,
        isActive: s.isActive,
        isApproved: s.isApproved,
      },
    };

    next();
  } catch (err) {
    console.error('[TenantResolver] Error:', err);
    res.status(500).json({ success: false, error: 'Gagal memproses informasi sekolah.' });
  }
};
