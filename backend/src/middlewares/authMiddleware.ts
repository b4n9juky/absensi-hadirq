import { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/auth.js';
import fs from 'fs';
import path from 'path';

const logPath = path.join(__dirname, '../../auth_debug.log');

// Extend Express Request type definition for req.context
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
      };
    }
  }
}

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

    req.context = {
      user: sessionData.user as any,
      session: sessionData.session
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
