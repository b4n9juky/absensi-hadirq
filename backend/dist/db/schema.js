"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verification = exports.agendaAttendances = exports.teacherAgendas = exports.subjects = exports.settings = exports.account = exports.session = exports.subjectAttendances = exports.attendances = exports.teachingSchedules = exports.schedules = exports.students = exports.user = exports.classes = exports.semesters = exports.academicYears = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
exports.academicYears = (0, mysql_core_1.mysqlTable)('academic_years', {
    id: (0, mysql_core_1.int)('id').autoincrement().primaryKey(),
    name: (0, mysql_core_1.varchar)('name', { length: 50 }).notNull(),
    isActive: (0, mysql_core_1.boolean)('is_active').default(false).notNull(),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.semesters = (0, mysql_core_1.mysqlTable)('semesters', {
    id: (0, mysql_core_1.int)('id').autoincrement().primaryKey(),
    academicYearId: (0, mysql_core_1.int)('academic_year_id').references(() => exports.academicYears.id).notNull(),
    name: (0, mysql_core_1.varchar)('name', { length: 50 }).notNull(),
    isActive: (0, mysql_core_1.boolean)('is_active').default(false).notNull(),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.classes = (0, mysql_core_1.mysqlTable)('classes', {
    id: (0, mysql_core_1.int)('id').autoincrement().primaryKey(),
    name: (0, mysql_core_1.varchar)('name', { length: 50 }).notNull(),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.user = (0, mysql_core_1.mysqlTable)('user', {
    id: (0, mysql_core_1.varchar)('id', { length: 36 }).primaryKey(),
    name: (0, mysql_core_1.varchar)('name', { length: 255 }).notNull(),
    email: (0, mysql_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    emailVerified: (0, mysql_core_1.boolean)('email_verified').notNull(),
    image: (0, mysql_core_1.varchar)('image', { length: 255 }),
    role: (0, mysql_core_1.varchar)('role', { length: 50 }).default('siswa').notNull(),
    createdAt: (0, mysql_core_1.timestamp)('created_at').notNull(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').notNull()
});
exports.students = (0, mysql_core_1.mysqlTable)('students', {
    id: (0, mysql_core_1.int)('id').autoincrement().primaryKey(),
    userId: (0, mysql_core_1.varchar)('user_id', { length: 36 }).references(() => exports.user.id),
    nis: (0, mysql_core_1.varchar)('nis', { length: 50 }).notNull().unique(),
    classId: (0, mysql_core_1.int)('class_id').references(() => exports.classes.id).notNull(),
    deviceUuid: (0, mysql_core_1.varchar)('device_uuid', { length: 255 }),
    qrcode: (0, mysql_core_1.varchar)('qrcode', { length: 255 }),
    faceEmbedding: (0, mysql_core_1.text)('face_embedding'),
    photo: (0, mysql_core_1.varchar)('photo', { length: 255 }),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.schedules = (0, mysql_core_1.mysqlTable)('schedules', {
    id: (0, mysql_core_1.int)('id').autoincrement().primaryKey(),
    dayName: (0, mysql_core_1.varchar)('day_name', { length: 20 }).notNull().unique(), // Monday, Tuesday, Wednesday, etc.
    checkinStart: (0, mysql_core_1.time)('checkin_start').notNull(), // HH:MM:SS
    lateAfter: (0, mysql_core_1.time)('late_after').notNull(), // HH:MM:SS
    checkoutTime: (0, mysql_core_1.time)('checkout_time').notNull(), // HH:MM:SS
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.teachingSchedules = (0, mysql_core_1.mysqlTable)('teaching_schedules', {
    id: (0, mysql_core_1.int)('id').autoincrement().primaryKey(),
    teacherId: (0, mysql_core_1.varchar)('teacher_id', { length: 36 }).references(() => exports.user.id).notNull(),
    classId: (0, mysql_core_1.int)('class_id').references(() => exports.classes.id).notNull(),
    dayName: (0, mysql_core_1.varchar)('day_name', { length: 20 }).notNull(),
    startTime: (0, mysql_core_1.time)('start_time').notNull(),
    endTime: (0, mysql_core_1.time)('end_time').notNull(),
    subject: (0, mysql_core_1.varchar)('subject', { length: 100 }),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.attendances = (0, mysql_core_1.mysqlTable)('attendances', {
    id: (0, mysql_core_1.int)('id').autoincrement().primaryKey(),
    studentId: (0, mysql_core_1.int)('student_id').references(() => exports.students.id).notNull(),
    classId: (0, mysql_core_1.int)('class_id').references(() => exports.classes.id),
    academicYearId: (0, mysql_core_1.int)('academic_year_id').references(() => exports.academicYears.id).notNull(),
    semesterId: (0, mysql_core_1.int)('semester_id').references(() => exports.semesters.id).notNull(),
    attendanceDate: (0, mysql_core_1.date)('attendance_date', { mode: 'string' }).notNull(), // YYYY-MM-DD
    status: (0, mysql_core_1.mysqlEnum)('status', ['PRESENT', 'LATE', 'SICK', 'EXCUSED', 'ABSENT']).notNull(), // PRESENT, LATE, SICK, EXCUSED, ABSENT
    isVerified: (0, mysql_core_1.boolean)('is_verified').default(false).notNull(),
    // Check-in details
    checkinTime: (0, mysql_core_1.timestamp)('checkin_time'),
    checkinPhoto: (0, mysql_core_1.varchar)('checkin_photo', { length: 255 }),
    checkinLatitude: (0, mysql_core_1.double)('checkin_latitude'),
    checkinLongitude: (0, mysql_core_1.double)('checkin_longitude'),
    // Check-out details
    checkoutTime: (0, mysql_core_1.timestamp)('checkout_time'),
    checkoutPhoto: (0, mysql_core_1.varchar)('checkout_photo', { length: 255 }),
    checkoutLatitude: (0, mysql_core_1.double)('checkout_latitude'),
    checkoutLongitude: (0, mysql_core_1.double)('checkout_longitude'),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.subjectAttendances = (0, mysql_core_1.mysqlTable)('subject_attendances', {
    id: (0, mysql_core_1.int)('id').autoincrement().primaryKey(),
    teachingScheduleId: (0, mysql_core_1.int)('teaching_schedule_id').references(() => exports.teachingSchedules.id).notNull(),
    studentId: (0, mysql_core_1.int)('student_id').references(() => exports.students.id).notNull(),
    attendanceDate: (0, mysql_core_1.date)('attendance_date', { mode: 'string' }).notNull(),
    status: (0, mysql_core_1.mysqlEnum)('status', ['PRESENT', 'SICK', 'EXCUSED', 'ABSENT', 'DISPEN', 'SKIPPED']).notNull(),
    notes: (0, mysql_core_1.varchar)('notes', { length: 255 }),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
    uniqueAttendance: (0, mysql_core_1.uniqueIndex)('unique_subject_attendance').on(table.teachingScheduleId, table.studentId, table.attendanceDate),
}));
exports.session = (0, mysql_core_1.mysqlTable)('session', {
    id: (0, mysql_core_1.varchar)('id', { length: 36 }).primaryKey(),
    expiresAt: (0, mysql_core_1.timestamp)('expires_at').notNull(),
    token: (0, mysql_core_1.varchar)('token', { length: 255 }).notNull().unique(),
    createdAt: (0, mysql_core_1.timestamp)('created_at').notNull(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').notNull(),
    ipAddress: (0, mysql_core_1.varchar)('ip_address', { length: 45 }),
    userAgent: (0, mysql_core_1.varchar)('user_agent', { length: 255 }),
    userId: (0, mysql_core_1.varchar)('user_id', { length: 36 }).references(() => exports.user.id).notNull()
});
exports.account = (0, mysql_core_1.mysqlTable)('account', {
    id: (0, mysql_core_1.varchar)('id', { length: 36 }).primaryKey(),
    accountId: (0, mysql_core_1.varchar)('account_id', { length: 255 }).notNull(),
    providerId: (0, mysql_core_1.varchar)('provider_id', { length: 255 }).notNull(),
    userId: (0, mysql_core_1.varchar)('user_id', { length: 36 }).references(() => exports.user.id).notNull(),
    accessToken: (0, mysql_core_1.varchar)('access_token', { length: 255 }),
    refreshToken: (0, mysql_core_1.varchar)('refresh_token', { length: 255 }),
    idToken: (0, mysql_core_1.varchar)('id_token', { length: 2048 }),
    expiresAt: (0, mysql_core_1.timestamp)('expires_at'),
    password: (0, mysql_core_1.varchar)('password', { length: 255 }),
    createdAt: (0, mysql_core_1.timestamp)('created_at').notNull(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').notNull()
});
exports.settings = (0, mysql_core_1.mysqlTable)('settings', {
    key: (0, mysql_core_1.varchar)('key', { length: 100 }).primaryKey(),
    value: (0, mysql_core_1.text)('value').notNull(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.subjects = (0, mysql_core_1.mysqlTable)('subjects', {
    id: (0, mysql_core_1.int)('id').autoincrement().primaryKey(),
    name: (0, mysql_core_1.varchar)('name', { length: 100 }).notNull().unique(),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
});
exports.teacherAgendas = (0, mysql_core_1.mysqlTable)('teacher_agendas', {
    id: (0, mysql_core_1.int)('id').autoincrement().primaryKey(),
    teacherId: (0, mysql_core_1.varchar)('teacher_id', { length: 36 }).references(() => exports.user.id).notNull(),
    classId: (0, mysql_core_1.int)('class_id').references(() => exports.classes.id).notNull(),
    title: (0, mysql_core_1.varchar)('title', { length: 200 }).notNull(),
    agendaType: (0, mysql_core_1.varchar)('agenda_type', { length: 50 }),
    date: (0, mysql_core_1.date)('date', { mode: 'string' }).notNull(),
    startTime: (0, mysql_core_1.time)('start_time'),
    endTime: (0, mysql_core_1.time)('end_time'),
    academicYearId: (0, mysql_core_1.int)('academic_year_id').references(() => exports.academicYears.id).notNull(),
    semesterId: (0, mysql_core_1.int)('semester_id').references(() => exports.semesters.id).notNull(),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.agendaAttendances = (0, mysql_core_1.mysqlTable)('agenda_attendances', {
    id: (0, mysql_core_1.int)('id').autoincrement().primaryKey(),
    agendaId: (0, mysql_core_1.int)('agenda_id').references(() => exports.teacherAgendas.id).notNull(),
    studentId: (0, mysql_core_1.int)('student_id').references(() => exports.students.id).notNull(),
    status: (0, mysql_core_1.mysqlEnum)('status', ['PRESENT', 'SICK', 'EXCUSED', 'ABSENT', 'DISPEN']).default('ABSENT').notNull(),
    checkinTime: (0, mysql_core_1.timestamp)('checkin_time'),
    notes: (0, mysql_core_1.varchar)('notes', { length: 255 }),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
    uniqueAttendance: (0, mysql_core_1.uniqueIndex)('unique_agenda_attendance').on(table.agendaId, table.studentId),
}));
exports.verification = (0, mysql_core_1.mysqlTable)('verification', {
    id: (0, mysql_core_1.varchar)('id', { length: 36 }).primaryKey(),
    identifier: (0, mysql_core_1.varchar)('identifier', { length: 255 }).notNull(),
    value: (0, mysql_core_1.varchar)('value', { length: 255 }).notNull(),
    expiresAt: (0, mysql_core_1.timestamp)('expires_at').notNull(),
    createdAt: (0, mysql_core_1.timestamp)('created_at'),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at')
});
