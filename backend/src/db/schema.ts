import { mysqlTable, int, varchar, double, float, timestamp, boolean, date, mysqlEnum, time, text } from 'drizzle-orm/mysql-core';

export const academicYears = mysqlTable('academic_years', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const semesters = mysqlTable('semesters', {
  id: int('id').autoincrement().primaryKey(),
  academicYearId: int('academic_year_id').references(() => academicYears.id).notNull(),
  name: varchar('name', { length: 50 }).notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const classes = mysqlTable('classes', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const user = mysqlTable('user', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: varchar('image', { length: 255 }),
  role: varchar('role', { length: 50 }).default('siswa').notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const students = mysqlTable('students', {
  id: int('id').autoincrement().primaryKey(),
  userId: varchar('user_id', { length: 36 }).references(() => user.id),
  nis: varchar('nis', { length: 50 }).notNull().unique(),
  classId: int('class_id').references(() => classes.id).notNull(),
  deviceUuid: varchar('device_uuid', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const schedules = mysqlTable('schedules', {
  id: int('id').autoincrement().primaryKey(),
  dayName: varchar('day_name', { length: 20 }).notNull().unique(), // Monday, Tuesday, Wednesday, etc.
  checkinStart: time('checkin_start').notNull(), // HH:MM:SS
  lateAfter: time('late_after').notNull(),       // HH:MM:SS
  checkoutTime: time('checkout_time').notNull(),   // HH:MM:SS
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const attendances = mysqlTable('attendances', {
  id: int('id').autoincrement().primaryKey(),
  studentId: int('student_id').references(() => students.id).notNull(),
  academicYearId: int('academic_year_id').references(() => academicYears.id).notNull(),
  semesterId: int('semester_id').references(() => semesters.id).notNull(),
  attendanceDate: date('attendance_date', { mode: 'string' }).notNull(), // YYYY-MM-DD
  status: mysqlEnum('status', ['PRESENT', 'LATE']).notNull(), // PRESENT, LATE
  
  // Check-in details
  checkinTime: timestamp('checkin_time'),
  checkinPhoto: varchar('checkin_photo', { length: 255 }),
  checkinLatitude: double('checkin_latitude'),
  checkinLongitude: double('checkin_longitude'),
  
  // Check-out details
  checkoutTime: timestamp('checkout_time'),
  checkoutPhoto: varchar('checkout_photo', { length: 255 }),
  checkoutLatitude: double('checkout_latitude'),
  checkoutLongitude: double('checkout_longitude'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

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
