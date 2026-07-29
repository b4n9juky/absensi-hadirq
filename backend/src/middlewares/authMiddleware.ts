import { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/auth.js';
import { db } from '../db/index.js';
import { user as userTable } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const logPath = path.join(__dirname, '../../auth_debug.log');

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionData = await auth.api.getSession({
      headers: req.headers as any
    });

    if (process.env.DEBUG_AUTH === 'true') {
      const logMsg = `[${new Date().toISOString()}] URL: ${req.url}, Method: ${req.method}, Auth: ${req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'NONE'}, Session: ${sessionData ? `User: ${sessionData.user.email}, Role: ${sessionData.user.role}` : 'NULL'}\n`;
      fs.appendFileSync(logPath, logMsg);
    }

    if (!sessionData) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Sesi tidak ditemukan.' });
    }

    const session = sessionData.session;
    let user = sessionData.user as any;

    // Ensure role and schoolId are present — fetch from DB if Better Auth omitted them
    if (!user.role || user.schoolId === undefined) {
      const [dbUser] = await db.select({
        role: userTable.role,
        schoolId: userTable.schoolId,
      }).from(userTable).where(eq(userTable.id, user.id)).limit(1);
      if (dbUser) {
        user = { ...user, role: dbUser.role, schoolId: dbUser.schoolId };
      }
    }

    // Cross-tenant check: if the request is scoped to a school, the user must belong to that school
    if (req.context?.schoolId && user.schoolId && req.context.schoolId !== user.schoolId) {
      return res.status(403).json({ success: false, error: 'Forbidden: Akun Anda tidak terdaftar di sekolah ini.' });
    }

    req.context = {
      ...req.context,
      user,
      session,
      schoolId: req.context?.schoolId || user.schoolId || null,
    };

    next();
  } catch (err: any) {
    console.error('[AuthMiddleware] Error:', err);
    res.status(500).json({ success: false, error: 'Gagal memproses autentikasi.' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.DEBUG_AUTH === 'true') {
      const contextMsg = `[requireRole] URL: ${req.url}, context: ${!!req.context}, user: ${!!req.context?.user}, role: ${req.context?.user?.role}, allowed: ${JSON.stringify(allowedRoles)}\n`;
      fs.appendFileSync(logPath, contextMsg);
    }

    if (!req.context || !req.context.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Sesi tidak ditemukan.' });
    }

    const role = req.context.user.role;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Anda tidak memiliki akses untuk menu ini.' });
    }

    next();
  };
};
