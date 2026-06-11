import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';

import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { authMiddleware, requireRole } from './middlewares/authMiddleware.js';
import { userService } from './services/userService.js';

import { academicYearsRouter } from './routes/academicYearRoutes.js';
import { semestersRouter } from './routes/semesterRoutes.js';
import { schedulesRouter } from './routes/scheduleRoutes.js';
import { dashboardRouter } from './routes/dashboardRoutes.js';
import { reportsRouter } from './routes/reportRoutes.js';
import { usersRouter } from './routes/userRoutes.js';
import { classesRouter } from './routes/classRoutes.js';
import { studentsRouter } from './routes/studentRoutes.js';
import { settingsRouter } from './routes/settingRoutes.js';
import { attendanceRouter } from './routes/attendanceRoutes.js';
import { configRouter } from './routes/configRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy — OpenLiteSpeed reverse proxy mengirim X-Forwarded-For
app.set('trust proxy', true);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// CORS — baca dari env, fallback ke semua origin untuk development
const corsOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

// Rate limiting — 100 request per menit per IP
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' },
}));

// Better Auth
app.all('/api/auth/*', (req, res) => {
  return toNodeHandler(auth)(req, res);
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve built frontend static files in production
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// Multer config for Excel file import
const uploadExcel = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const importDir = path.join(__dirname, '../uploads/imports');
      if (!fs.existsSync(importDir)) fs.mkdirSync(importDir, { recursive: true });
      cb(null, importDir);
    },
    filename: (_req, _file, cb) => {
      cb(null, `import-${Date.now()}-${Math.round(Math.random() * 1e9)}.xlsx`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, _file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowedMimes.includes(_file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format file harus .xlsx atau .xls'));
    }
  },
});

app.post('/api/users/import', authMiddleware, requireRole(['admin']), uploadExcel.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'File Excel tidak terkirim.' });
    }
    const result = await userService.importUsers(file.path);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.use('/api/academic-years', authMiddleware, requireRole(['admin']), academicYearsRouter);
app.use('/api/semesters', authMiddleware, requireRole(['admin']), semestersRouter);
app.use('/api/schedules', authMiddleware, requireRole(['admin']), schedulesRouter);
app.use('/api/dashboard', authMiddleware, requireRole(['admin', 'guru']), dashboardRouter);
app.use('/api/reports', authMiddleware, requireRole(['admin', 'guru']), reportsRouter);
app.use('/api/users', authMiddleware, requireRole(['admin']), usersRouter);
app.use('/api/classes', authMiddleware, requireRole(['admin']), classesRouter);
app.use('/api/students', authMiddleware, requireRole(['admin']), studentsRouter);
app.use('/api/settings', authMiddleware, requireRole(['admin']), settingsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/config', configRouter);

// Serve uploaded images statically
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// SPA fallback — semua non-API route arahkan ke index.html
app.get('*', (req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendDist, 'index.html'));
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`[Server] ShakeAbsen Backend running on port ${PORT}`);
  console.log(`[Geofence] School coordinates: Lat ${process.env.SCHOOL_LATITUDE}, Lon ${process.env.SCHOOL_LONGITUDE}`);
  console.log(`[Geofence] Max radius: ${process.env.SCHOOL_RADIUS_METERS}m, Max GPS accuracy: ${process.env.MAX_ACCURACY_METERS}m`);
});
