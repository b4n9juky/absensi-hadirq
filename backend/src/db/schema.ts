import { mysqlTable, int, varchar, double, timestamp, boolean, date, mysqlEnum, time, text, uniqueIndex, foreignKey } from 'drizzle-orm/mysql-core';

// ============================
// MULTI-TENANT: schools table
// ============================
export const schools = mysqlTable('schools', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  domain: varchar('domain', { length: 255 }),
  logo: varchar('logo', { length: 500 }),
  isActive: boolean('is_active').default(false).notNull(),
  isApproved: boolean('is_approved').default(false).notNull(),
  contactEmail: varchar('contact_email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  latitude: double('latitude'),
  longitude: double('longitude'),
  radiusMeters: double('radius_meters').default(50),
  maxAccuracy: double('max_accuracy').default(30),
  timezone: varchar('timezone', { length: 50 }).default('Asia/Jakarta'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ============================
// TENANT-SCOPED TABLES
// All have schoolId that references schools.id
// ============================

export const academicYears = mysqlTable('academic_years', {
  id: int('id').autoincrement().primaryKey(),
  schoolId: int('school_id').default(0).notNull(),
  name: varchar('name', { length: 50 }).notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const semesters = mysqlTable('semesters', {
  id: int('id').autoincrement().primaryKey(),
  schoolId: int('school_id').default(0).notNull(),
  academicYearId: int('academic_year_id').references(() => academicYears.id).notNull(),
  name: varchar('name', { length: 50 }).notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const classes = mysqlTable('classes', {
  id: int('id').autoincrement().primaryKey(),
  schoolId: int('school_id').default(0).notNull(),
  name: varchar('name', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const user = mysqlTable('user', {
  id: varchar('id', { length: 36 }).primaryKey(),
  schoolId: int('school_id'),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: varchar('image', { length: 255 }),
  role: varchar('role', { length: 50 }).default('siswa').notNull(),
  phone: varchar('phone', { length: 20 }),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const students = mysqlTable('students', {
  id: int('id').autoincrement().primaryKey(),
  schoolId: int('school_id').default(0).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  nis: varchar('nis', { length: 50 }).notNull(),
  classId: int('class_id').references(() => classes.id).notNull(),
  parentId: varchar('parent_id', { length: 36 }).references(() => user.id),
  deviceUuid: varchar('device_uuid', { length: 255 }),
  qrcode: varchar('qrcode', { length: 255 }),
  faceEmbedding: text('face_embedding'),
  photo: varchar('photo', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  uniqueNis: uniqueIndex('unique_nis_school').on(table.schoolId, table.nis),
}));

export const schedules = mysqlTable('schedules', {
  id: int('id').autoincrement().primaryKey(),
  schoolId: int('school_id').default(0).notNull(),
  dayName: varchar('day_name', { length: 20 }).notNull(),
  checkinStart: time('checkin_start').notNull(),
  lateAfter: time('late_after').notNull(),
  checkoutTime: time('checkout_time').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  uniqueDay: uniqueIndex('unique_day_school').on(table.schoolId, table.dayName),
}));

export const teachingSchedules = mysqlTable('teaching_schedules', {
  id: int('id').autoincrement().primaryKey(),
  schoolId: int('school_id').default(0).notNull(),
  teacherId: varchar('teacher_id', { length: 36 }).references(() => user.id).notNull(),
  classId: int('class_id').references(() => classes.id).notNull(),
  dayName: varchar('day_name', { length: 20 }).notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  subject: varchar('subject', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const attendances = mysqlTable('attendances', {
  id: int('id').autoincrement().primaryKey(),
  schoolId: int('school_id').default(0).notNull(),
  studentId: int('student_id').references(() => students.id).notNull(),
  classId: int('class_id').references(() => classes.id),
  academicYearId: int('academic_year_id').references(() => academicYears.id).notNull(),
  semesterId: int('semester_id').references(() => semesters.id).notNull(),
  attendanceDate: date('attendance_date', { mode: 'string' }).notNull(),
  status: mysqlEnum('status', ['PRESENT', 'LATE', 'SICK', 'EXCUSED', 'ABSENT']).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),

  checkinTime: timestamp('checkin_time'),
  checkinPhoto: varchar('checkin_photo', { length: 255 }),
  checkinLatitude: double('checkin_latitude'),
  checkinLongitude: double('checkin_longitude'),
  checkinAccuracy: double('checkin_accuracy'),

  checkoutTime: timestamp('checkout_time'),
  checkoutPhoto: varchar('checkout_photo', { length: 255 }),
  checkoutLatitude: double('checkout_latitude'),
  checkoutLongitude: double('checkout_longitude'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const subjectAttendances = mysqlTable('subject_attendances', {
  id: int('id').autoincrement().primaryKey(),
  schoolId: int('school_id').default(0).notNull(),
  teachingScheduleId: int('teaching_schedule_id').notNull(),
  studentId: int('student_id').references(() => students.id).notNull(),
  attendanceDate: date('attendance_date', { mode: 'string' }).notNull(),
  status: mysqlEnum('status', ['PRESENT', 'SICK', 'EXCUSED', 'ABSENT', 'DISPEN', 'SKIPPED']).notNull(),
  notes: varchar('notes', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  uniqueAttendance: uniqueIndex('unique_subject_attendance').on(table.teachingScheduleId, table.studentId, table.attendanceDate),
  tschedFk: foreignKey({ columns: [table.teachingScheduleId], foreignColumns: [teachingSchedules.id], name: 'sa_tsched_fk' }),
}));

export const teachingSessionLogs = mysqlTable('teaching_session_logs', {
  id: int('id').autoincrement().primaryKey(),
  schoolId: int('school_id').default(0).notNull(),
  teachingScheduleId: int('teaching_schedule_id').notNull(),
  attendanceDate: date('attendance_date', { mode: 'string' }).notNull(),
  materi: varchar('materi', { length: 500 }),
  kegiatan: varchar('kegiatan', { length: 500 }),
  catatanKendala: text('catatan_kendala'),
  fotoPembelajaran: varchar('foto_pembelajaran', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  uniqueSession: uniqueIndex('unique_teaching_session').on(table.teachingScheduleId, table.attendanceDate),
  tschedFk: foreignKey({ columns: [table.teachingScheduleId], foreignColumns: [teachingSchedules.id], name: 'tsl_tsched_fk' }),
}));

export const teacherAgendas = mysqlTable('teacher_agendas', {
  id: int('id').autoincrement().primaryKey(),
  schoolId: int('school_id').default(0).notNull(),
  teacherId: varchar('teacher_id', { length: 36 }).references(() => user.id).notNull(),
  classId: int('class_id').references(() => classes.id),
  title: varchar('title', { length: 200 }).notNull(),
  agendaType: varchar('agenda_type', { length: 50 }),
  subject: varchar('subject', { length: 100 }),
  notes: text('notes'),
  date: date('date', { mode: 'string' }).notNull(),
  startTime: time('start_time'),
  endTime: time('end_time'),
  academicYearId: int('academic_year_id').references(() => academicYears.id).notNull(),
  semesterId: int('semester_id').references(() => semesters.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const agendaAttendances = mysqlTable('agenda_attendances', {
  id: int('id').autoincrement().primaryKey(),
  schoolId: int('school_id').default(0).notNull(),
  agendaId: int('agenda_id').references(() => teacherAgendas.id).notNull(),
  studentId: int('student_id').references(() => students.id).notNull(),
  status: mysqlEnum('status', ['PRESENT', 'SICK', 'EXCUSED', 'ABSENT', 'DISPEN']).default('ABSENT').notNull(),
  checkinTime: timestamp('checkin_time'),
  notes: varchar('notes', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  uniqueAttendance: uniqueIndex('unique_agenda_attendance').on(table.agendaId, table.studentId),
}));

export const teacherAttendances = mysqlTable('teacher_attendances', {
  id: int('id').autoincrement().primaryKey(),
  schoolId: int('school_id').default(0).notNull(),
  teacherId: varchar('teacher_id', { length: 36 }).references(() => user.id).notNull(),
  attendanceDate: date('attendance_date', { mode: 'string' }).notNull(),
  checkinTime: timestamp('checkin_time'),
  checkoutTime: timestamp('checkout_time'),
  status: mysqlEnum('status', ['PRESENT', 'LATE', 'SICK', 'EXCUSED', 'ABSENT']).notNull(),
  note: text('note'),
  isVerified: boolean('is_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  uniqueAttendance: uniqueIndex('unique_teacher_attendance').on(table.schoolId, table.teacherId, table.attendanceDate),
}));

export const subjects = mysqlTable('subjects', {
  id: int('id').autoincrement().primaryKey(),
  schoolId: int('school_id').default(0).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueName: uniqueIndex('unique_subject_school').on(table.schoolId, table.name),
}));

export const settings = mysqlTable('settings', {
  key: varchar('key', { length: 100 }).notNull(),
  schoolId: int('school_id').default(0).notNull(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  pk: uniqueIndex('settings_pk').on(table.schoolId, table.key),
}));

export const waSessions = mysqlTable('wa_sessions', {
  id: int('id').autoincrement().primaryKey(),
  schoolId: int('school_id').default(0).notNull(),
  sessionData: text('session_data').notNull(),
  status: varchar('status', { length: 20 }).default('disconnected'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const notifications = mysqlTable('notifications', {
  id: int('id').autoincrement().primaryKey(),
  schoolId: int('school_id').default(0).notNull(),
  studentId: int('student_id').references(() => students.id).notNull(),
  type: mysqlEnum('type', ['CHECKIN', 'CHECKOUT']).notNull(),
  channel: varchar('channel', { length: 20 }).default('whatsapp'),
  recipient: varchar('recipient', { length: 20 }).notNull(),
  message: text('message').notNull(),
  status: mysqlEnum('status', ['PENDING', 'SENT', 'FAILED']).default('PENDING'),
  error: text('error'),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================
// BETTER AUTH TABLES (no schoolId — system-wide)
// ============================

export const session = mysqlTable('session', {
  id: varchar('id', { length: 36 }).primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 255 }),
  userId: varchar('user_id', { length: 36 }).references(() => user.id).notNull()
});

export const account = mysqlTable('account', {
  id: varchar('id', { length: 36 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 36 }).references(() => user.id).notNull(),
  accessToken: varchar('access_token', { length: 255 }),
  refreshToken: varchar('refresh_token', { length: 255 }),
  idToken: varchar('id_token', { length: 2048 }),
  expiresAt: timestamp('expires_at'),
  password: varchar('password', { length: 255 }),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const verification = mysqlTable('verification', {
  id: varchar('id', { length: 36 }).primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  value: varchar('value', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at')
});
