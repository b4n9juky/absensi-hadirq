import { db } from './index.js';
import { academicYears, semesters, classes, students, schedules, user, teachingSchedules, subjects } from './schema.js';
import { eq } from 'drizzle-orm';
import { auth } from '../lib/auth.js';
import { generateQrCode } from '../lib/qrGenerator.js';

async function seed() {
  console.log('--- START DATABASE SEEDING ---');

  try {
    // 1. Active Academic Year
    const existingYears = await db.select().from(academicYears).where(eq(academicYears.name, '2025/2026'));
    let activeYearId: number;
    
    if (existingYears.length === 0) {
      const [insertResult] = await db.insert(academicYears).values({
        name: '2025/2026',
        isActive: true,
      });
      activeYearId = insertResult.insertId;
      console.log('Inserted Academic Year: 2025/2026');
    } else {
      activeYearId = existingYears[0].id;
      console.log('Academic Year 2025/2026 already exists');
    }

    // 2. Active Semester (linked to Academic Year)
    const existingSemesters = await db.select().from(semesters).where(eq(semesters.name, 'Ganjil'));
    let activeSemesterId: number;
    
    if (existingSemesters.length === 0) {
      const [insertResult] = await db.insert(semesters).values({
        academicYearId: activeYearId,
        name: 'Ganjil',
        isActive: true,
      });
      activeSemesterId = insertResult.insertId;
      console.log('Inserted Semester: Ganjil');
    } else {
      activeSemesterId = existingSemesters[0].id;
      console.log('Semester Ganjil already exists');
    }

    // 3. Demo Class
    const existingClasses = await db.select().from(classes).where(eq(classes.name, 'XII IPA 1'));
    let classId: number;
    
    if (existingClasses.length === 0) {
      const [insertResult] = await db.insert(classes).values({
        name: 'XII IPA 1',
      });
      classId = insertResult.insertId;
      console.log('Inserted Class: XII IPA 1');
    } else {
      classId = existingClasses[0].id;
      console.log('Class XII IPA 1 already exists');
    }

    // Seed Better Auth Users
    // A. Seed Admin User
    let adminUser = await db.select().from(user).where(eq(user.email, 'admin@school.com')).limit(1);
    let adminUserId: string;
    if (adminUser.length === 0) {
      const res = await auth.api.signUpEmail({
        body: {
          email: 'admin@school.com',
          password: 'adminPassword123',
          name: 'Administrator'
        }
      });
      await db.update(user).set({ role: 'admin' }).where(eq(user.id, res.user.id));
      adminUserId = res.user.id;
      console.log('Seeded Admin User');
    } else {
      adminUserId = adminUser[0].id;
      console.log('Admin User already exists');
    }

    // B. Seed Guru User
    let guruUser = await db.select().from(user).where(eq(user.email, 'guru@school.com')).limit(1);
    let guruUserId: string;
    if (guruUser.length === 0) {
      const res = await auth.api.signUpEmail({
        body: {
          email: 'guru@school.com',
          password: 'guruPassword123',
          name: 'Guru Pengawas'
        }
      });
      await db.update(user).set({ role: 'guru' }).where(eq(user.id, res.user.id));
      guruUserId = res.user.id;
      console.log('Seeded Guru User');
    } else {
      guruUserId = guruUser[0].id;
      console.log('Guru User already exists');
    }

    // C. Seed Siswa User
    let siswaUser = await db.select().from(user).where(eq(user.email, 'siswa@school.com')).limit(1);
    let siswaUserId: string;
    if (siswaUser.length === 0) {
      const res = await auth.api.signUpEmail({
        body: {
          email: 'siswa@school.com',
          password: 'siswaPassword123',
          name: 'Siswa Demo'
        }
      });
      siswaUserId = res.user.id;
      console.log('Seeded Siswa User');
    } else {
      siswaUserId = siswaUser[0].id;
      console.log('Siswa User already exists');
    }

    // 4. Demo Student mapped to Android Client default NIS and seeded user
    const existingStudents = await db.select().from(students).where(eq(students.nis, 'SISWA-BTG-025'));
    
    if (existingStudents.length === 0) {
      const [insertResult] = await db.insert(students).values({
        userId: siswaUserId,
        nis: 'SISWA-BTG-025',
        classId: classId,
      });
      const studentId = insertResult.insertId;
      try {
        const qrPath = await generateQrCode('SISWA-BTG-025', studentId);
        await db.update(students).set({ qrcode: qrPath }).where(eq(students.id, studentId));
        console.log(`QR Code generated for SISWA-BTG-025`);
      } catch (err) {
        console.error('Failed to generate QR for seed student:', err);
      }
      console.log('Inserted Student with NIS: SISWA-BTG-025');
    } else {
      const existing = existingStudents[0];
      await db.update(students).set({ userId: siswaUserId }).where(eq(students.nis, 'SISWA-BTG-025'));
      if (!existing.qrcode) {
        try {
          const qrPath = await generateQrCode('SISWA-BTG-025', existing.id);
          await db.update(students).set({ qrcode: qrPath }).where(eq(students.id, existing.id));
          console.log(`QR Code generated for existing SISWA-BTG-025`);
        } catch (err) {
          console.error('Failed to generate QR for existing seed student:', err);
        }
      }
      console.log('Student with NIS SISWA-BTG-025 already exists, updated userId reference');
    }

    // 5. Subjects
    const subjectNames = [
      'Matematika', 'Fisika', 'Biologi', 'Bahasa Inggris', 'Sejarah',
      'Kimia', 'Ekonomi', 'Geografi', 'Sosiologi', 'PKN',
      'Agama', 'Olahraga', 'Seni Budaya', 'Informatika', 'Bahasa Indonesia',
    ];
    for (const name of subjectNames) {
      const existing = await db.select().from(subjects).where(eq(subjects.name, name)).limit(1);
      if (existing.length === 0) {
        await db.insert(subjects).values({ name });
        console.log(`Inserted Subject: ${name}`);
      } else {
        console.log(`Subject "${name}" already exists`);
      }
    }

    // 6. Default Schedules (Monday to Sunday)
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const day of days) {
      const existingSchedule = await db.select().from(schedules).where(eq(schedules.dayName, day));
      if (existingSchedule.length === 0) {
        await db.insert(schedules).values({
          dayName: day,
          checkinStart: '06:00:00',
          lateAfter: '07:30:00',
          checkoutTime: '13:00:00',
        });
        console.log(`Inserted Default Schedule for: ${day}`);
      } else {
        console.log(`Schedule for ${day} already exists`);
      }
    }

    // 6. Teaching Schedule for demo Guru
    const existingTeaching = await db.select().from(teachingSchedules).where(eq(teachingSchedules.teacherId, guruUserId)).limit(1);
    if (existingTeaching.length === 0) {
      const teachingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      for (const day of teachingDays) {
        await db.insert(teachingSchedules).values({
          teacherId: guruUserId,
          classId: classId,
          dayName: day,
          startTime: '08:00:00',
          endTime: '09:30:00',
          subject: 'Matematika',
        });
        console.log(`Inserted Teaching Schedule: Guru -> XII IPA 1, ${day} 08:00-09:30`);
      }
    } else {
      console.log('Teaching Schedule already exists for Guru');
    }

    // 7. Additional demo students for XII IPA 1
    const existingExtraStudents = await db.select().from(students).where(eq(students.nis, 'SISWA-BTG-026')).limit(1);
    if (existingExtraStudents.length === 0) {
      const extraStudents = [
        { email: 'siswa2@school.com', name: 'Siti Rahmawati', nis: 'SISWA-BTG-026' },
        { email: 'siswa3@school.com', name: 'Budi Santoso', nis: 'SISWA-BTG-027' },
        { email: 'siswa4@school.com', name: 'Dewi Lestari', nis: 'SISWA-BTG-028' },
        { email: 'siswa5@school.com', name: 'Ahmad Hidayat', nis: 'SISWA-BTG-029' },
      ];
      for (const s of extraStudents) {
        try {
          const res = await auth.api.signUpEmail({
            body: { email: s.email, password: 'siswaPassword123', name: s.name }
          });
          await db.update(user).set({ role: 'siswa' }).where(eq(user.id, res.user.id));
          await db.insert(students).values({
            userId: res.user.id,
            nis: s.nis,
            classId: classId,
          });
          console.log(`Inserted Student: ${s.name} (${s.nis})`);
        } catch (err) {
          console.log(`Student ${s.email} already exists or error:`, err);
        }
      }
    } else {
      console.log('Extra students already exist');
    }

    console.log('--- DATABASE SEEDING COMPLETED SUCCESSFULLY ---');
  } catch (error) {
    console.error('Error during database seeding:', error);
  } finally {
    process.exit(0);
  }
}

seed();
