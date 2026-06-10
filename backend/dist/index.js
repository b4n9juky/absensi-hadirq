"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const geolib_1 = require("geolib");
const drizzle_orm_1 = require("drizzle-orm");
require("dotenv/config");
const index_js_1 = require("./db/index.js");
const schema_js_1 = require("./db/schema.js");
const academicYearRoutes_js_1 = require("./routes/academicYearRoutes.js");
const semesterRoutes_js_1 = require("./routes/semesterRoutes.js");
const scheduleRoutes_js_1 = require("./routes/scheduleRoutes.js");
const dashboardRoutes_js_1 = require("./routes/dashboardRoutes.js");
const reportRoutes_js_1 = require("./routes/reportRoutes.js");
const userRoutes_js_1 = require("./routes/userRoutes.js");
const classRoutes_js_1 = require("./routes/classRoutes.js");
const studentRoutes_js_1 = require("./routes/studentRoutes.js");
const node_1 = require("better-auth/node");
const auth_js_1 = require("./lib/auth.js");
const authMiddleware_js_1 = require("./middlewares/authMiddleware.js");
// In CommonJS, __dirname is already defined globally.
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Enable CORS for mobile application connections
app.use((0, cors_1.default)());
// Mount Better Auth handler first before body-parser parses json body!
app.all('/api/auth/*', (req, res) => {
    return (0, node_1.toNodeHandler)(auth_js_1.auth)(req, res);
});
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Register CRUD management routers with auth checking
app.use('/api/academic-years', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['admin']), academicYearRoutes_js_1.academicYearsRouter);
app.use('/api/semesters', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['admin']), semesterRoutes_js_1.semestersRouter);
app.use('/api/schedules', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['admin']), scheduleRoutes_js_1.schedulesRouter);
app.use('/api/dashboard', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['admin', 'guru']), dashboardRoutes_js_1.dashboardRouter);
app.use('/api/reports', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['admin', 'guru']), reportRoutes_js_1.reportsRouter);
app.use('/api/users', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['admin']), userRoutes_js_1.usersRouter);
app.use('/api/classes', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['admin']), classRoutes_js_1.classesRouter);
app.use('/api/students', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['admin']), studentRoutes_js_1.studentsRouter);
// Sync Configuration Endpoint for Android Client
app.get('/api/config', authMiddleware_js_1.authMiddleware, async (req, res) => {
    try {
        const authenticatedUserId = req.context.user.id;
        const userName = req.context.user.name;
        let studentRecord = await index_js_1.db.select().from(schema_js_1.students).where((0, drizzle_orm_1.eq)(schema_js_1.students.userId, authenticatedUserId)).limit(1);
        if (studentRecord.length === 0) {
            const deviceUuidQuery = req.query.device_uuid || '';
            if (deviceUuidQuery) {
                console.log(`[Config] [Fallback] Trying device UUID lookup: "${deviceUuidQuery}"`);
                studentRecord = await index_js_1.db.select().from(schema_js_1.students).where((0, drizzle_orm_1.eq)(schema_js_1.students.deviceUuid, deviceUuidQuery)).limit(1);
            }
        }
        res.json({
            success: true,
            data: {
                api_base_url: `${req.protocol}://${req.get('host')}`,
                student_name: userName,
                student_nis: studentRecord.length > 0 ? studentRecord[0].nis : '',
                device_uuid: studentRecord.length > 0 ? (studentRecord[0].deviceUuid || '') : '',
                school_latitude: parseFloat(process.env.SCHOOL_LATITUDE || '0'),
                school_longitude: parseFloat(process.env.SCHOOL_LONGITUDE || '0'),
                school_radius_meters: parseFloat(process.env.SCHOOL_RADIUS_METERS || '50'),
                max_accuracy_meters: parseFloat(process.env.MAX_ACCURACY_METERS || '30')
            }
        });
    }
    catch (error) {
        console.error('[Config] Error fetching config:', error);
        res.status(500).json({ success: false, error: 'Gagal memuat konfigurasi server.' });
    }
});
// Ensure upload directory exists
const uploadDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Serve uploaded images statically
app.use('/uploads', express_1.default.static(uploadDir));
// Multer Storage Configuration
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path_1.default.extname(file.originalname);
        cb(null, `selfie-${uniqueSuffix}${ext}`);
    }
});
// Configure Multer
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Format file tidak didukung!'));
        }
    }
});
/**
 * Endpoint to process student attendance (Check-in & Check-out).
 * Expects multipart/form-data payload with:
 * - photo: image file
 * - student_id: string, optional (Siswa's NIS, used as fallback identity)
 * - latitude: string/number
 * - longitude: string/number
 * - accuracy: string/number
 * - device_uuid: string
 */
function toDatabaseLocalTime(date) {
    const localDate = new Date(date);
    localDate.toISOString = function () {
        const pad = (num) => String(num).padStart(2, '0');
        const yyyy = this.getFullYear();
        const MM = pad(this.getMonth() + 1);
        const dd = pad(this.getDate());
        const hh = pad(this.getHours());
        const mm = pad(this.getMinutes());
        const ss = pad(this.getSeconds());
        const ms = String(this.getMilliseconds()).padStart(3, '0');
        return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}.${ms}`;
    };
    return localDate;
}
app.post('/api/attendance', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['siswa']), upload.single('photo'), async (req, res) => {
    const file = req.file;
    const { student_id, latitude, longitude, accuracy, device_uuid } = req.body;
    console.log('\n[API] === INCOMING ATTENDANCE REQUEST ===');
    console.log(`[API] Student ID (NIS): ${student_id}`);
    console.log(`[API] Coordinates: Lat ${latitude}, Lon ${longitude}`);
    console.log(`[API] GPS Accuracy: ${accuracy}m`);
    console.log(`[API] Device UUID: ${device_uuid}`);
    console.log(`[API] Photo File: ${file ? file.filename : 'NOT FOUND'}`);
    // 1. Payload validation
    const missingFields = [];
    if (!student_id)
        missingFields.push('student_id');
    if (!latitude)
        missingFields.push('latitude');
    if (!longitude)
        missingFields.push('longitude');
    if (!accuracy)
        missingFields.push('accuracy');
    if (!device_uuid)
        missingFields.push('device_uuid');
    if (missingFields.length > 0) {
        console.log('[API] [Rejected] Payload request tidak lengkap. Missing:', missingFields.join(', '));
        console.log('[API] [DEBUG] Raw values - student_id:', JSON.stringify(student_id), 'latitude:', JSON.stringify(latitude), 'longitude:', JSON.stringify(longitude), 'accuracy:', JSON.stringify(accuracy), 'device_uuid:', JSON.stringify(device_uuid));
        if (file)
            fs_1.default.unlinkSync(file.path);
        return res.status(200).json({
            success: false,
            message: 'Payload request tidak lengkap.'
        });
    }
    if (!file) {
        console.log('[API] [Rejected] Foto bukti selfie tidak terkirim.');
        return res.status(200).json({
            success: false,
            message: 'Foto bukti selfie tidak terkirim.'
        });
    }
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const acc = parseFloat(accuracy);
    if (isNaN(lat) || isNaN(lon) || isNaN(acc)) {
        console.log('[API] [Rejected] Parameter spasial tidak valid.');
        fs_1.default.unlinkSync(file.path);
        return res.status(200).json({
            success: false,
            message: 'Parameter spasial tidak valid.'
        });
    }
    // 2. Accuracy validation (<= 30 meters)
    const maxAccuracy = parseFloat(process.env.MAX_ACCURACY_METERS || '30');
    if (acc > maxAccuracy) {
        console.log(`[API] [Rejected] GPS accuracy ${acc}m exceeds limit of ${maxAccuracy}m`);
        fs_1.default.unlinkSync(file.path);
        return res.status(200).json({
            success: false,
            message: `Akurasi sinyal GPS buruk (${acc.toFixed(1)}m). Cari tempat lapang (Maksimum ${maxAccuracy.toFixed(1)}m).`
        });
    }
    // 3. Geofencing validation (<= 50 meters)
    const schoolLat = parseFloat(process.env.SCHOOL_LATITUDE || '0.1340');
    const schoolLon = parseFloat(process.env.SCHOOL_LONGITUDE || '117.5000');
    const maxRadius = parseFloat(process.env.SCHOOL_RADIUS_METERS || '50');
    const distance = (0, geolib_1.getDistance)({ latitude: lat, longitude: lon }, { latitude: schoolLat, longitude: schoolLon });
    console.log(`[API] [Geofence] Calculated distance: ${distance.toFixed(1)}m (Max limit: ${maxRadius}m)`);
    if (distance > maxRadius) {
        console.log(`[API] [Rejected] Student is out of geofence: ${distance.toFixed(1)}m`);
        fs_1.default.unlinkSync(file.path);
        return res.status(200).json({
            success: false,
            message: `Presensi Ditolak! Anda berada di luar area sekolah. Jarak: ${distance.toFixed(1)}m (Maksimum ${maxRadius.toFixed(1)}m).`
        });
    }
    try {
        // 4. Resolve Student from authenticated user context
        const authenticatedUserId = req.context.user.id;
        let studentRecord = await index_js_1.db.select().from(schema_js_1.students).where((0, drizzle_orm_1.eq)(schema_js_1.students.userId, authenticatedUserId)).limit(1);
        if (studentRecord.length === 0) {
            // Fallback 1: try NIS lookup (student_id from payload)
            if (student_id) {
                console.log(`[API] [Fallback] Trying NIS lookup: "${student_id}"`);
                studentRecord = await index_js_1.db.select().from(schema_js_1.students).where((0, drizzle_orm_1.eq)(schema_js_1.students.nis, student_id)).limit(1);
            }
            if (studentRecord.length === 0) {
                // Fallback 2: try device UUID lookup (device_uuid from payload)
                console.log(`[API] [Fallback] Trying device UUID lookup: "${device_uuid}"`);
                studentRecord = await index_js_1.db.select().from(schema_js_1.students).where((0, drizzle_orm_1.eq)(schema_js_1.students.deviceUuid, device_uuid)).limit(1);
            }
            if (studentRecord.length > 0) {
                const found = studentRecord[0];
                if (found.userId) {
                    console.log(`[API] [Rejected] Student profile is already linked to another user.`);
                    fs_1.default.unlinkSync(file.path);
                    return res.status(200).json({
                        success: false,
                        message: `Profil siswa sudah terikat dengan akun lain. Silakan hubungi Admin/Guru.`
                    });
                }
                // Auto-link: userId is NULL, safe to claim
                console.log(`[API] [Auto-Link] Linking userId ${authenticatedUserId} to student NIS ${found.nis}`);
                await index_js_1.db.update(schema_js_1.students)
                    .set({ userId: authenticatedUserId, updatedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema_js_1.students.id, found.id));
                found.userId = authenticatedUserId;
            }
        }
        if (studentRecord.length === 0) {
            console.log(`[API] [Rejected] Authenticated student user has no linked student profile.`);
            fs_1.default.unlinkSync(file.path);
            return res.status(200).json({
                success: false,
                message: `Profil siswa Anda tidak ditemukan di database.`
            });
        }
        const student = studentRecord[0];
        console.log(`[API] Resolved Student: DB_ID ${student.id}, NIS ${student.nis}, Device Locked: ${student.deviceUuid || 'NONE'}`);
        // Device binding & locking verification
        if (!student.deviceUuid) {
            // Auto-bind device on first request
            console.log(`[API] [Binding] Automatically locking device_uuid: "${device_uuid}" to student NIS: ${student.nis}`);
            await index_js_1.db.update(schema_js_1.students)
                .set({ deviceUuid: device_uuid, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_js_1.students.id, student.id));
            student.deviceUuid = device_uuid;
        }
        else if (student.deviceUuid !== device_uuid) {
            console.log(`[API] [Rejected] Device UUID mismatch. Registered: "${student.deviceUuid}", Received: "${device_uuid}"`);
            fs_1.default.unlinkSync(file.path);
            return res.status(200).json({
                success: false,
                message: 'Gagal! Akun Anda terikat pada HP lain. Silakan hubungi Admin/Guru untuk me-reset perangkat.'
            });
        }
        // 5. Retrieve Active Academic Year & Semester
        const activeYear = await index_js_1.db.select().from(schema_js_1.academicYears).where((0, drizzle_orm_1.eq)(schema_js_1.academicYears.isActive, true)).limit(1);
        const activeSemester = await index_js_1.db.select().from(schema_js_1.semesters).where((0, drizzle_orm_1.eq)(schema_js_1.semesters.isActive, true)).limit(1);
        if (activeYear.length === 0 || activeSemester.length === 0) {
            console.log('[API] [Rejected] Active academic year or semester not found.');
            fs_1.default.unlinkSync(file.path);
            return res.status(200).json({
                success: false,
                message: 'Tahun ajaran atau semester aktif belum diatur di server.'
            });
        }
        console.log(`[API] Active Period: Year ${activeYear[0].name}, Semester ${activeSemester[0].name}`);
        // 6. Get Day Schedule
        const serverTime = new Date();
        const dayName = serverTime.toLocaleDateString('en-US', { weekday: 'long' });
        const scheduleRecord = await index_js_1.db.select().from(schema_js_1.schedules).where((0, drizzle_orm_1.eq)(schema_js_1.schedules.dayName, dayName)).limit(1);
        if (scheduleRecord.length === 0) {
            console.log(`[API] [Rejected] Schedule not configured for ${dayName}`);
            fs_1.default.unlinkSync(file.path);
            return res.status(200).json({
                success: false,
                message: `Jadwal sekolah tidak ditemukan untuk hari ${dayName}.`
            });
        }
        const schedule = scheduleRecord[0];
        console.log(`[API] Today's Schedule (${dayName}): Start ${schedule.checkinStart}, Late ${schedule.lateAfter}, Checkout ${schedule.checkoutTime}`);
        // Helper: Local school timezone strings
        const localYear = serverTime.getFullYear();
        const localMonth = String(serverTime.getMonth() + 1).padStart(2, '0');
        const localDay = String(serverTime.getDate()).padStart(2, '0');
        const attendanceDate = `${localYear}-${localMonth}-${localDay}`;
        const localHours = String(serverTime.getHours()).padStart(2, '0');
        const localMinutes = String(serverTime.getMinutes()).padStart(2, '0');
        const localSeconds = String(serverTime.getSeconds()).padStart(2, '0');
        const currentTimeStr = `${localHours}:${localMinutes}:${localSeconds}`;
        console.log(`[API] Server Local Time: ${currentTimeStr}, Date: ${attendanceDate}`);
        // 7. Check existing daily attendance row
        const existingAttendance = await index_js_1.db.select()
            .from(schema_js_1.attendances)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.attendances.studentId, student.id), (0, drizzle_orm_1.eq)(schema_js_1.attendances.attendanceDate, attendanceDate)))
            .limit(1);
        const photoUrl = `/uploads/${file.filename}`;
        if (existingAttendance.length === 0) {
            // --- ACTION A: ABSENSI DATANG (CHECK-IN) ---
            console.log('[API] Processing CHECK-IN (Absen Datang)...');
            // Check checkin start boundaries
            if (currentTimeStr < schedule.checkinStart) {
                console.log(`[API] [Rejected] Check-in not open yet. Current: ${currentTimeStr}, Start: ${schedule.checkinStart}`);
                fs_1.default.unlinkSync(file.path);
                return res.status(200).json({
                    success: false,
                    message: `Absen datang belum dibuka. Mulai pada jam ${schedule.checkinStart}.`
                });
            }
            // Check delay
            const isLate = currentTimeStr > schedule.lateAfter;
            const status = isLate ? 'LATE' : 'PRESENT';
            await index_js_1.db.insert(schema_js_1.attendances).values({
                studentId: student.id,
                academicYearId: activeYear[0].id,
                semesterId: activeSemester[0].id,
                attendanceDate: attendanceDate,
                status: status,
                checkinTime: toDatabaseLocalTime(serverTime),
                checkinPhoto: photoUrl,
                checkinLatitude: lat,
                checkinLongitude: lon
            });
            const statusMsg = isLate ? 'Terlambat' : 'Tepat Waktu';
            console.log(`[API] [Success] Check-in completed for student ${student.nis}. Status: ${statusMsg}`);
            return res.status(200).json({
                success: true,
                message: `Absen Datang Berhasil (${statusMsg})! Jarak: ${distance.toFixed(1)}m.`
            });
        }
        else {
            // --- ACTION B: ABSENSI PULANG (CHECK-OUT) ---
            console.log('[API] Processing CHECK-OUT (Absen Pulang)...');
            const record = existingAttendance[0];
            // Prevent double checkout
            if (record.checkoutTime !== null) {
                console.log(`[API] [Rejected] Student ${student.nis} already checked out today.`);
                fs_1.default.unlinkSync(file.path);
                return res.status(200).json({
                    success: false,
                    message: 'Anda sudah melakukan absen pulang hari ini.'
                });
            }
            // Verify server time meets checkout_time
            if (currentTimeStr < schedule.checkoutTime) {
                console.log(`[API] [Rejected] Early checkout check. Current: ${currentTimeStr}, Limit: ${schedule.checkoutTime}`);
                fs_1.default.unlinkSync(file.path);
                return res.status(200).json({
                    success: false,
                    message: `Belum waktunya pulang! Jam pulang adalah ${schedule.checkoutTime}. Jam server saat ini ${currentTimeStr}.`
                });
            }
            await index_js_1.db.update(schema_js_1.attendances)
                .set({
                checkoutTime: toDatabaseLocalTime(serverTime),
                checkoutPhoto: photoUrl,
                checkoutLatitude: lat,
                checkoutLongitude: lon,
                updatedAt: toDatabaseLocalTime(serverTime)
            })
                .where((0, drizzle_orm_1.eq)(schema_js_1.attendances.id, record.id));
            console.log(`[API] [Success] Check-out completed for student ${student.nis}.`);
            return res.status(200).json({
                success: true,
                message: `Absen Pulang Berhasil! Hati-hati di jalan. Jarak: ${distance.toFixed(1)}m.`
            });
        }
    }
    catch (error) {
        console.error('[API] [Fatal Error] Database process failed:', error);
        if (file)
            fs_1.default.unlinkSync(file.path);
        return res.status(500).json({
            success: false,
            message: 'Gagal memproses data absensi di server.'
        });
    }
});
// QR Attendance endpoint for teachers scanning student ID cards
app.post('/api/attendance/qr', authMiddleware_js_1.authMiddleware, (0, authMiddleware_js_1.requireRole)(['guru']), async (req, res) => {
    const { student_nis } = req.body;
    console.log('\n[QR] === QR ATTENDANCE REQUEST ===');
    console.log(`[QR] Scanned NIS: ${student_nis}`);
    console.log(`[QR] Teacher: ${req.context?.user.name} (${req.context?.user.id})`);
    if (!student_nis) {
        return res.status(200).json({
            success: false,
            message: 'NIS siswa tidak ditemukan di QR code.'
        });
    }
    try {
        // 1. Find student by NIS
        const studentRecord = await index_js_1.db.select().from(schema_js_1.students).where((0, drizzle_orm_1.eq)(schema_js_1.students.nis, student_nis)).limit(1);
        if (studentRecord.length === 0) {
            console.log(`[QR] [Rejected] Student with NIS "${student_nis}" not found.`);
            return res.status(200).json({
                success: false,
                message: `Siswa dengan NIS ${student_nis} tidak ditemukan di database.`
            });
        }
        const student = studentRecord[0];
        console.log(`[QR] Found Student: ${student.nis} (Class ID: ${student.classId})`);
        // 2. Retrieve Active Academic Year & Semester
        const activeYear = await index_js_1.db.select().from(schema_js_1.academicYears).where((0, drizzle_orm_1.eq)(schema_js_1.academicYears.isActive, true)).limit(1);
        const activeSemester = await index_js_1.db.select().from(schema_js_1.semesters).where((0, drizzle_orm_1.eq)(schema_js_1.semesters.isActive, true)).limit(1);
        if (activeYear.length === 0 || activeSemester.length === 0) {
            console.log('[QR] [Rejected] Active academic year or semester not found.');
            return res.status(200).json({
                success: false,
                message: 'Tahun ajaran atau semester aktif belum diatur di server.'
            });
        }
        // 3. Get Day Schedule
        const serverTime = new Date();
        const dayName = serverTime.toLocaleDateString('en-US', { weekday: 'long' });
        const scheduleRecord = await index_js_1.db.select().from(schema_js_1.schedules).where((0, drizzle_orm_1.eq)(schema_js_1.schedules.dayName, dayName)).limit(1);
        if (scheduleRecord.length === 0) {
            console.log(`[QR] [Rejected] Schedule not configured for ${dayName}`);
            return res.status(200).json({
                success: false,
                message: `Jadwal sekolah tidak ditemukan untuk hari ${dayName}.`
            });
        }
        const schedule = scheduleRecord[0];
        // 4. Calculate time & date
        const localYear = serverTime.getFullYear();
        const localMonth = String(serverTime.getMonth() + 1).padStart(2, '0');
        const localDay = String(serverTime.getDate()).padStart(2, '0');
        const attendanceDate = `${localYear}-${localMonth}-${localDay}`;
        const localHours = String(serverTime.getHours()).padStart(2, '0');
        const localMinutes = String(serverTime.getMinutes()).padStart(2, '0');
        const localSeconds = String(serverTime.getSeconds()).padStart(2, '0');
        const currentTimeStr = `${localHours}:${localMinutes}:${localSeconds}`;
        console.log(`[QR] Server Time: ${currentTimeStr}, Date: ${attendanceDate}, Day: ${dayName}`);
        // 5. Check existing attendance
        const existingAttendance = await index_js_1.db.select()
            .from(schema_js_1.attendances)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.attendances.studentId, student.id), (0, drizzle_orm_1.eq)(schema_js_1.attendances.attendanceDate, attendanceDate)))
            .limit(1);
        if (existingAttendance.length > 0) {
            if (existingAttendance[0].checkoutTime !== null) {
                console.log(`[QR] [Rejected] Student ${student.nis} already completed attendance today.`);
                return res.status(200).json({
                    success: false,
                    message: `Siswa ${student.nis} sudah melakukan absen lengkap (datang + pulang) hari ini.`
                });
            }
            // Check-out via QR
            if (currentTimeStr < schedule.checkoutTime) {
                console.log(`[QR] [Rejected] Early checkout for ${student.nis}. Current: ${currentTimeStr}, Limit: ${schedule.checkoutTime}`);
                return res.status(200).json({
                    success: false,
                    message: `Belum waktunya pulang! Jam pulang ${schedule.checkoutTime}.`
                });
            }
            await index_js_1.db.update(schema_js_1.attendances)
                .set({
                checkoutTime: toDatabaseLocalTime(serverTime),
                updatedAt: toDatabaseLocalTime(serverTime)
            })
                .where((0, drizzle_orm_1.eq)(schema_js_1.attendances.id, existingAttendance[0].id));
            console.log(`[QR] [Success] Check-out for ${student.nis} via QR.`);
            return res.status(200).json({
                success: true,
                message: `Absen Pulang berhasil untuk ${student.nis} via QR.`
            });
        }
        // 6. Check-in: validate time
        if (currentTimeStr < schedule.checkinStart) {
            console.log(`[QR] [Rejected] Check-in not open yet. Current: ${currentTimeStr}, Start: ${schedule.checkinStart}`);
            return res.status(200).json({
                success: false,
                message: `Absen datang belum dibuka. Mulai pada jam ${schedule.checkinStart}.`
            });
        }
        const isLate = currentTimeStr > schedule.lateAfter;
        const status = isLate ? 'LATE' : 'PRESENT';
        await index_js_1.db.insert(schema_js_1.attendances).values({
            studentId: student.id,
            academicYearId: activeYear[0].id,
            semesterId: activeSemester[0].id,
            attendanceDate: attendanceDate,
            status: status,
            checkinTime: toDatabaseLocalTime(serverTime),
        });
        const statusMsg = isLate ? 'Terlambat' : 'Tepat Waktu';
        console.log(`[QR] [Success] Check-in for ${student.nis} via QR. Status: ${statusMsg}`);
        return res.status(200).json({
            success: true,
            message: `Absen ${statusMsg} untuk ${student.nis} via QR.`
        });
    }
    catch (error) {
        console.error('[QR] [Fatal Error]', error);
        return res.status(500).json({
            success: false,
            message: 'Gagal memproses absen QR di server.'
        });
    }
});
// Start Express server
app.listen(PORT, () => {
    console.log(`[Server] ShakeAbsen Backend running on port ${PORT}`);
    console.log(`[Geofence] School coordinates: Lat ${process.env.SCHOOL_LATITUDE}, Lon ${process.env.SCHOOL_LONGITUDE}`);
    console.log(`[Geofence] Max radius: ${process.env.SCHOOL_RADIUS_METERS}m, Max GPS accuracy: ${process.env.MAX_ACCURACY_METERS}m`);
});
