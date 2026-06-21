"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
require("./lib/env.js");
const node_1 = require("better-auth/node");
const auth_js_1 = require("./lib/auth.js");
const authMiddleware_js_1 = require("./middlewares/authMiddleware.js");
const userService_js_1 = require("./services/userService.js");
const academicYearRoutes_js_1 = require("./routes/academicYearRoutes.js");
const semesterRoutes_js_1 = require("./routes/semesterRoutes.js");
const scheduleRoutes_js_1 = require("./routes/scheduleRoutes.js");
const dashboardRoutes_js_1 = require("./routes/dashboardRoutes.js");
const reportRoutes_js_1 = require("./routes/reportRoutes.js");
const userRoutes_js_1 = require("./routes/userRoutes.js");
const classRoutes_js_1 = require("./routes/classRoutes.js");
const studentRoutes_js_1 = require("./routes/studentRoutes.js");
const settingRoutes_js_1 = require("./routes/settingRoutes.js");
const attendanceRoutes_js_1 = require("./routes/attendanceRoutes.js");
const configRoutes_js_1 = require("./routes/configRoutes.js");
const teacherRoutes_js_1 = require("./routes/teacherRoutes.js");
const teachingScheduleRoutes_js_1 = require("./routes/teachingScheduleRoutes.js");
const kioskRoutes_js_1 = require("./routes/kioskRoutes.js");
const subjectAttendanceRoutes_js_1 = require("./routes/subjectAttendanceRoutes.js");
const subjectRoutes_js_1 = require("./routes/subjectRoutes.js");
const agendaAttendanceRoutes_js_1 = require("./routes/agendaAttendanceRoutes.js");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Trust proxy — OpenLiteSpeed reverse proxy mengirim X-Forwarded-For
app.set('trust proxy', 1);
// Security headers
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
}));
// CORS — baca dari env, fallback ke semua origin untuk development
const corsOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(s => s.trim());
app.use((0, cors_1.default)({
    origin: corsOrigins,
    credentials: true,
}));
// Rate limiting — 100 request per menit per IP
app.use('/api', (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    message: { success: false, error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' },
}));
// Stricter rate limiting on authentication routes (15 attempts per 15 minutes)
const authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    message: { success: false, error: 'Terlalu banyak percobaan masuk. Silakan coba lagi setelah 15 menit.' },
});
app.use('/api/auth/', authRateLimiter);
// Better Auth
app.all('/api/auth/*', (req, res) => {
    return (0, node_1.toNodeHandler)(auth_js_1.auth)(req, res);
});
// Interceptor to sanitize internal server/database errors in production to prevent information disclosure (OWASP A09 / CWE-209)
app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (body) {
        if (body && body.success === false && typeof body.error === 'string') {
            const lowerMessage = body.error.toLowerCase();
            const dbKeywords = [
                'select ', 'insert ', 'update ', 'delete ', 'table', 'column',
                'sql', 'database', 'mysql', 'drizzle', 'query', 'syntax error',
                'foreign key', 'constraint', 'unknown column', 'field list', 'sqlstate'
            ];
            const isDbError = dbKeywords.some(keyword => lowerMessage.includes(keyword));
            if (isDbError && process.env.NODE_ENV === 'production') {
                body.error = 'Terjadi kesalahan internal pada server database. Silakan hubungi administrator.';
            }
        }
        return originalJson.call(this, body);
    };
    next();
});
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Serve built frontend static files in production
const frontendDist = path_1.default.join(__dirname, '../../frontend/dist');
app.use(express_1.default.static(frontendDist));
// Multer config for Excel file import
const uploadExcel = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, cb) => {
            const importDir = path_1.default.join(__dirname, '../uploads/imports');
            if (!fs_1.default.existsSync(importDir))
                fs_1.default.mkdirSync(importDir, { recursive: true });
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
        }
        else {
            cb(new Error('Format file harus .xlsx atau .xls'));
        }
    },
});
app.post('/api/users/import', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['admin']), uploadExcel.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, error: 'File Excel tidak terkirim.' });
        }
        const result = await userService_js_1.userService.importUsers(file.path);
        res.json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
app.use('/api/academic-years', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['admin']), academicYearRoutes_js_1.academicYearsRouter);
app.use('/api/semesters', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['admin']), semesterRoutes_js_1.semestersRouter);
app.use('/api/schedules', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['admin']), scheduleRoutes_js_1.schedulesRouter);
app.use('/api/dashboard', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['admin', 'guru']), dashboardRoutes_js_1.dashboardRouter);
app.use('/api/reports', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['admin', 'guru']), reportRoutes_js_1.reportsRouter);
app.use('/api/users', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['admin']), userRoutes_js_1.usersRouter);
app.use('/api/classes', authMiddleware_js_1.authMiddleware, classRoutes_js_1.classesRouter);
app.use('/api/students', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['admin']), studentRoutes_js_1.studentsRouter);
app.use('/api/settings', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['admin']), settingRoutes_js_1.settingsRouter);
app.use('/api/attendance', attendanceRoutes_js_1.attendanceRouter);
app.use('/api/kiosk', kioskRoutes_js_1.kioskRouter);
app.use('/api/config', configRoutes_js_1.configRouter);
app.use('/api/teaching-schedules', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['admin']), teachingScheduleRoutes_js_1.teachingSchedulesRouter);
app.use('/api/subjects', authMiddleware_js_1.authMiddleware, subjectRoutes_js_1.subjectRouter);
app.use('/api/teacher', teacherRoutes_js_1.teacherRouter);
app.use('/api/teacher', agendaAttendanceRoutes_js_1.agendaAttendanceRouter);
app.use('/api/subject-attendances', subjectAttendanceRoutes_js_1.subjectAttendanceRouter);
// Serve uploaded images statically
const uploadDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express_1.default.static(uploadDir));
// SPA fallback — semua non-API route arahkan ke index.html
app.get('*', (req, res, next) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path_1.default.join(frontendDist, 'index.html'));
    }
    else {
        next();
    }
});
app.listen(PORT, () => {
    console.log(`[Server] ShakeAbsen Backend running on port ${PORT}`);
    console.log(`[Geofence] School coordinates: Lat ${process.env.SCHOOL_LATITUDE}, Lon ${process.env.SCHOOL_LONGITUDE}`);
    console.log(`[Geofence] Max radius: ${process.env.SCHOOL_RADIUS_METERS}m, Max GPS accuracy: ${process.env.MAX_ACCURACY_METERS}m`);
});
