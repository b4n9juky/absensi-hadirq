import { db } from './index.js';
import { academicYears, semesters, classes, students, schedules, user, teachingSchedules, subjects, attendances, subjectAttendances, teachingSessionLogs, settings, teacherAgendas, agendaAttendances } from './schema.js';
import { eq, and } from 'drizzle-orm';
import { auth } from '../lib/auth.js';
import { generateQrCode } from '../lib/qrGenerator.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SUBJECTS = [
  'Matematika', 'Fisika', 'Biologi', 'Bahasa Inggris', 'Sejarah',
  'Kimia', 'Ekonomi', 'Geografi', 'Sosiologi', 'PKN',
  'Agama', 'Olahraga', 'Seni Budaya', 'Informatika', 'Bahasa Indonesia',
];

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function randomTime(before: string, after: string): string {
  const [bh, bm] = before.split(':').map(Number);
  const [ah, am] = after.split(':').map(Number);
  const startMin = bh * 60 + bm;
  const endMin = ah * 60 + am;
  const randMin = startMin + Math.floor(Math.random() * (endMin - startMin));
  return `${String(Math.floor(randMin / 60)).padStart(2, '0')}:${String(randMin % 60).padStart(2, '0')}:00`;
}

async function seed() {
  console.log('--- MULAI SEED DATABASE ---');

  try {
    // ================ 1. ACADEMIC YEARS ================
    let [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true)).limit(1);
    if (!activeYear) {
      const [r] = await db.insert(academicYears).values({ name: '2025/2026', isActive: true });
      activeYear = (await db.select().from(academicYears).where(eq(academicYears.id, r.insertId)).limit(1))[0];
      console.log('+ Tahun Ajaran: 2025/2026');
    } else {
      console.log('= Tahun Ajaran 2025/2026 sudah ada');
    }

    // ================ 2. SEMESTERS ================
    let [activeSemester] = await db.select().from(semesters).where(eq(semesters.isActive, true)).limit(1);
    if (!activeSemester) {
      const [r] = await db.insert(semesters).values({ academicYearId: activeYear.id, name: 'Ganjil', isActive: true });
      activeSemester = (await db.select().from(semesters).where(eq(semesters.id, r.insertId)).limit(1))[0];
      console.log('+ Semester: Ganjil');
    } else {
      console.log('= Semester Ganjil sudah ada');
    }

    // ================ 3. CLASSES ================
    const classNames = ['X IPA 1', 'X IPA 2', 'XI IPA 1', 'XI IPA 2', 'XII IPA 1', 'XII IPA 2'];
    const classMap: Record<string, number> = {};
    for (const name of classNames) {
      let [c] = await db.select().from(classes).where(eq(classes.name, name)).limit(1);
      if (!c) {
        const [r] = await db.insert(classes).values({ name });
        classMap[name] = r.insertId;
        console.log(`+ Kelas: ${name}`);
      } else {
        classMap[name] = c.id;
      }
    }

    // ================ 4. USERS (Admin & Guru) ================
    const adminPassword = 'admin123';
    const guruPassword = 'guru123';

    let [adminUser] = await db.select().from(user).where(eq(user.email, 'admin@school.com')).limit(1);
    if (!adminUser) {
      const res = await auth.api.signUpEmail({ body: { email: 'admin@school.com', password: adminPassword, name: 'Administrator' } });
      await db.update(user).set({ role: 'admin' }).where(eq(user.id, res.user.id));
      adminUser = null as unknown as typeof adminUser;
      console.log('+ Admin: admin@school.com');
    } else {
      console.log('= Admin sudah ada');
    }

    const guruData = [
      { email: 'guru.matematika@school.com', name: 'Dr. Ahmad Fauzi', mapel: 'Matematika' },
      { email: 'guru.fisika@school.com', name: 'Siti Nurhaliza, S.Si', mapel: 'Fisika' },
      { email: 'guru.biologi@school.com', name: 'Bambang Wijaya, S.Pd', mapel: 'Biologi' },
      { email: 'guru.inggris@school.com', name: 'Jane Doe, M.Pd', mapel: 'Bahasa Inggris' },
      { email: 'guru.sejarah@school.com', name: 'Prof. Hadi Pranoto', mapel: 'Sejarah' },
    ];
    const guruMap: Record<string, { id: string; name: string; mapel: string }> = {};
    for (const g of guruData) {
      let [existing] = await db.select().from(user).where(eq(user.email, g.email)).limit(1);
      if (!existing) {
        const res = await auth.api.signUpEmail({ body: { email: g.email, password: guruPassword, name: g.name } });
        await db.update(user).set({ role: 'guru' }).where(eq(user.id, res.user.id));
        guruMap[g.email] = { id: res.user.id, name: g.name, mapel: g.mapel };
        console.log(`+ Guru: ${g.name}`);
      } else {
        await db.update(user).set({ role: 'guru' }).where(eq(user.email, g.email));
        guruMap[g.email] = { id: existing.id, name: existing.name, mapel: g.mapel };
      }
    }

    // ================ 5. SUBJECTS ================
    for (const name of SUBJECTS) {
      const [existing] = await db.select().from(subjects).where(eq(subjects.name, name)).limit(1);
      if (!existing) {
        await db.insert(subjects).values({ name });
        console.log(`+ Mapel: ${name}`);
      }
    }

    // ================ 6. STUDENTS ================
    const studentPerClass: Record<string, Array<{ name: string; nis: string }>> = {
      'X IPA 1': [
        { name: 'Ani Rahmawati', nis: 'XIPA-001' }, { name: 'Budi Hartono', nis: 'XIPA-002' },
        { name: 'Citra Dewi', nis: 'XIPA-003' }, { name: 'Dimas Prayoga', nis: 'XIPA-004' },
        { name: 'Eka Putri', nis: 'XIPA-005' },
      ],
      'X IPA 2': [
        { name: 'Fajar Sidik', nis: 'XIPA-006' }, { name: 'Gita Permata', nis: 'XIPA-007' },
        { name: 'Hendra Gunawan', nis: 'XIPA-008' }, { name: 'Intan Permatasari', nis: 'XIPA-009' },
        { name: 'Joko Susilo', nis: 'XIPA-010' },
      ],
      'XI IPA 1': [
        { name: 'Kartika Sari', nis: 'XIPA-011' }, { name: 'Lukman Hakim', nis: 'XIPA-012' },
        { name: 'Mega Wati', nis: 'XIPA-013' }, { name: 'Nanda Pratama', nis: 'XIPA-014' },
        { name: 'Olivia Susanti', nis: 'XIPA-015' },
      ],
      'XI IPA 2': [
        { name: 'Putra Ramadan', nis: 'XIPA-016' }, { name: 'Rina Marlina', nis: 'XIPA-017' },
        { name: 'Sandi Gunawan', nis: 'XIPA-018' }, { name: 'Tina Amalia', nis: 'XIPA-019' },
        { name: 'Umar Bakri', nis: 'XIPA-020' },
      ],
      'XII IPA 1': [
        { name: 'Vina Lestari', nis: 'XIPA-021' }, { name: 'Wahyu Nugroho', nis: 'XIPA-022' },
        { name: 'Xena Marlita', nis: 'XIPA-023' }, { name: 'Yoga Pratama', nis: 'XIPA-024' },
        { name: 'Zahra Ramadhani', nis: 'XIPA-025' },
      ],
      'XII IPA 2': [
        { name: 'Adi Saputra', nis: 'XIPA-026' }, { name: 'Bella Anggraini', nis: 'XIPA-027' },
        { name: 'Candra Wirawan', nis: 'XIPA-028' }, { name: 'Dian Permata', nis: 'XIPA-029' },
        { name: 'Erik Tohir', nis: 'XIPA-030' },
      ],
    };

    const studentIds: number[] = [];
    for (const [kelas, daftar] of Object.entries(studentPerClass)) {
      const classId = classMap[kelas];
      for (const s of daftar) {
        let [existing] = await db.select().from(students).where(eq(students.nis, s.nis)).limit(1);
        if (!existing) {
          const [r] = await db.insert(students).values({ name: s.name, nis: s.nis, classId });
          const studentId = r.insertId;
          try { const qrPath = await generateQrCode(s.nis, studentId); await db.update(students).set({ qrcode: qrPath }).where(eq(students.id, studentId)); } catch {}
          studentIds.push(studentId);
          console.log(`+ Siswa: ${s.name} (${s.nis})`);
        } else {
          studentIds.push(existing.id);
        }
      }
    }

    // ================ 7. SCHEDULES (Default) ================
    for (const day of DAYS) {
      const [existing] = await db.select().from(schedules).where(eq(schedules.dayName, day)).limit(1);
      if (!existing) {
        await db.insert(schedules).values({ dayName: day, checkinStart: '06:00:00', lateAfter: '07:30:00', checkoutTime: '13:00:00', isActive: true });
        console.log(`+ Jadwal Default: ${day}`);
      }
    }

    // ================ 8. TEACHING SCHEDULES ================
    const jadwal: Array<{ teacherId: string; className: string; subject: string; dayName: string; startTime: string; endTime: string }> = [];

    const guruList = Object.values(guruMap);

    jadwal.push(
      { teacherId: guruList[0].id, className: 'X IPA 1', subject: 'Matematika', dayName: 'Monday', startTime: '07:00:00', endTime: '08:30:00' },
      { teacherId: guruList[0].id, className: 'XI IPA 1', subject: 'Matematika', dayName: 'Tuesday', startTime: '08:00:00', endTime: '09:30:00' },
      { teacherId: guruList[0].id, className: 'XII IPA 1', subject: 'Matematika', dayName: 'Wednesday', startTime: '08:00:00', endTime: '09:30:00' },
      { teacherId: guruList[0].id, className: 'X IPA 1', subject: 'Matematika', dayName: 'Thursday', startTime: '09:00:00', endTime: '10:30:00' },
      { teacherId: guruList[0].id, className: 'XII IPA 1', subject: 'Matematika', dayName: 'Friday', startTime: '07:00:00', endTime: '08:30:00' },

      { teacherId: guruList[1].id, className: 'X IPA 2', subject: 'Fisika', dayName: 'Monday', startTime: '08:30:00', endTime: '10:00:00' },
      { teacherId: guruList[1].id, className: 'XI IPA 2', subject: 'Fisika', dayName: 'Tuesday', startTime: '09:30:00', endTime: '11:00:00' },
      { teacherId: guruList[1].id, className: 'XII IPA 2', subject: 'Fisika', dayName: 'Wednesday', startTime: '08:00:00', endTime: '09:30:00' },
      { teacherId: guruList[1].id, className: 'X IPA 2', subject: 'Fisika', dayName: 'Thursday', startTime: '07:00:00', endTime: '08:30:00' },
      { teacherId: guruList[1].id, className: 'XII IPA 2', subject: 'Fisika', dayName: 'Friday', startTime: '08:30:00', endTime: '10:00:00' },

      { teacherId: guruList[2].id, className: 'X IPA 1', subject: 'Biologi', dayName: 'Monday', startTime: '10:00:00', endTime: '11:30:00' },
      { teacherId: guruList[2].id, className: 'XI IPA 2', subject: 'Biologi', dayName: 'Tuesday', startTime: '07:00:00', endTime: '08:30:00' },
      { teacherId: guruList[2].id, className: 'X IPA 1', subject: 'Biologi', dayName: 'Wednesday', startTime: '09:30:00', endTime: '11:00:00' },
      { teacherId: guruList[2].id, className: 'XI IPA 2', subject: 'Biologi', dayName: 'Thursday', startTime: '10:00:00', endTime: '11:30:00' },
      { teacherId: guruList[2].id, className: 'X IPA 1', subject: 'Biologi', dayName: 'Friday', startTime: '10:00:00', endTime: '11:30:00' },

      { teacherId: guruList[3].id, className: 'X IPA 2', subject: 'Bahasa Inggris', dayName: 'Monday', startTime: '07:00:00', endTime: '08:30:00' },
      { teacherId: guruList[3].id, className: 'XI IPA 1', subject: 'Bahasa Inggris', dayName: 'Tuesday', startTime: '10:00:00', endTime: '11:30:00' },
      { teacherId: guruList[3].id, className: 'XII IPA 2', subject: 'Bahasa Inggris', dayName: 'Wednesday', startTime: '09:30:00', endTime: '11:00:00' },
      { teacherId: guruList[3].id, className: 'X IPA 2', subject: 'Bahasa Inggris', dayName: 'Thursday', startTime: '08:30:00', endTime: '10:00:00' },
      { teacherId: guruList[3].id, className: 'XI IPA 1', subject: 'Bahasa Inggris', dayName: 'Friday', startTime: '08:30:00', endTime: '10:00:00' },

      { teacherId: guruList[4].id, className: 'XI IPA 1', subject: 'Sejarah', dayName: 'Monday', startTime: '08:30:00', endTime: '10:00:00' },
      { teacherId: guruList[4].id, className: 'XII IPA 1', subject: 'Sejarah', dayName: 'Tuesday', startTime: '10:00:00', endTime: '11:30:00' },
      { teacherId: guruList[4].id, className: 'XII IPA 2', subject: 'Sejarah', dayName: 'Wednesday', startTime: '07:00:00', endTime: '08:30:00' },
      { teacherId: guruList[4].id, className: 'XI IPA 1', subject: 'Sejarah', dayName: 'Thursday', startTime: '07:00:00', endTime: '08:30:00' },
      { teacherId: guruList[4].id, className: 'XII IPA 1', subject: 'Sejarah', dayName: 'Friday', startTime: '09:00:00', endTime: '10:30:00' },
    );

    const scheduleIds: Record<string, number> = {};
    for (const j of jadwal) {
      const classId = classMap[j.className];
      const key = `${j.teacherId}_${j.dayName}_${classId}`;
      const [existing] = await db.select().from(teachingSchedules)
        .where(and(eq(teachingSchedules.teacherId, j.teacherId), eq(teachingSchedules.dayName, j.dayName), eq(teachingSchedules.classId, classId)))
        .limit(1);
      if (!existing) {
        const [r] = await db.insert(teachingSchedules).values({ teacherId: j.teacherId, classId, dayName: j.dayName, startTime: j.startTime, endTime: j.endTime, subject: j.subject });
        const inserted = (await db.select().from(teachingSchedules).where(eq(teachingSchedules.id, r.insertId)).limit(1))[0];
        scheduleIds[key] = inserted.id;
        console.log(`+ Jadwal Mengajar: ${j.subject} - ${j.className} (${j.dayName})`);
      } else {
        scheduleIds[key] = existing.id;
      }
    }

    // ================ 9. SETTINGS ================
    const defaultSettings = [
      { key: 'school_name', value: 'SMA Negeri Contoh' },
      { key: 'school_latitude', value: '-6.2088' },
      { key: 'school_longitude', value: '106.8456' },
      { key: 'school_radius_meters', value: '50' },
      { key: 'max_accuracy_meters', value: '30' },
    ];
    for (const s of defaultSettings) {
      const [existing] = await db.select().from(settings).where(eq(settings.key, s.key)).limit(1);
      if (!existing) {
        await db.insert(settings).values(s);
        console.log(`+ Setting: ${s.key}`);
      }
    }

    // ================ 10. TODAY ATTENDANCES ================
    const today = formatDate(new Date());
    for (const [kelas, daftar] of Object.entries(studentPerClass)) {
      for (const s of daftar) {
        const [existingStudent] = await db.select().from(students).where(eq(students.nis, s.nis)).limit(1);
        if (!existingStudent) continue;

        const [existingAtt] = await db.select().from(attendances)
          .where(and(eq(attendances.studentId, existingStudent.id), eq(attendances.attendanceDate, today)))
          .limit(1);
        if (existingAtt) continue;

        const rand = Math.random();
        if (rand < 0.7) {
          await db.insert(attendances).values({
            studentId: existingStudent.id, classId: classMap[kelas], academicYearId: activeYear.id,
            semesterId: activeSemester.id, attendanceDate: today, status: 'PRESENT',
            checkinTime: new Date(`${today}T${randomTime('06:00', '07:15')}`),
          });
        } else if (rand < 0.9) {
          await db.insert(attendances).values({
            studentId: existingStudent.id, classId: classMap[kelas], academicYearId: activeYear.id,
            semesterId: activeSemester.id, attendanceDate: today, status: 'LATE',
            checkinTime: new Date(`${today}T${randomTime('07:31', '09:00')}`),
          });
        }
      }
    }
    console.log('+ Absensi hari ini');

    // ================ 11. SUBJECT ATTENDANCES & TEACHING SESSION LOGS ================
    const todayDayName = DAYS[new Date().getDay()];
    for (const j of jadwal) {
      if (j.dayName !== todayDayName) continue;
      const schedId = scheduleIds[`${j.teacherId}_${j.dayName}_${classMap[j.className]}`];
      if (!schedId) continue;

      const daftar = studentPerClass[j.className];
      if (!daftar) continue;

      for (const s of daftar) {
        const [existingStudent] = await db.select().from(students).where(eq(students.nis, s.nis)).limit(1);
        if (!existingStudent) continue;

        const [existingSA] = await db.select().from(subjectAttendances)
          .where(and(eq(subjectAttendances.studentId, existingStudent.id), eq(subjectAttendances.attendanceDate, today)))
          .limit(1);
        if (existingSA) continue;

        const rand = Math.random();
        const status: 'PRESENT' | 'SICK' | 'EXCUSED' | 'ABSENT' | 'DISPEN' | 'SKIPPED' = rand < 0.7 ? 'PRESENT' : rand < 0.85 ? 'SICK' : rand < 0.95 ? 'EXCUSED' : 'ABSENT';

        await db.insert(subjectAttendances).values({
          teachingScheduleId: schedId, studentId: existingStudent.id,
          attendanceDate: today, status,
        });
      }
    }
    console.log('+ Kehadiran Mapel hari ini');

    // ================ 12. TEACHER AGENDAS & AGENDA ATTENDANCES ================
    for (const g of guruList) {
      for (const [kelas] of Object.entries(studentPerClass).slice(0, 2)) {
        const [existingAgenda] = await db.select().from(teacherAgendas)
          .where(and(eq(teacherAgendas.teacherId, g.id), eq(teacherAgendas.date, today)))
          .limit(1);

        if (!existingAgenda) {
          const [r] = await db.insert(teacherAgendas).values({
            teacherId: g.id, classId: classMap[kelas], title: `Pertemuan ${g.mapel} - ${kelas}`,
            agendaType: 'pembelajaran', subject: g.mapel, date: today,
            startTime: '08:00:00', endTime: '09:30:00',
            academicYearId: activeYear.id, semesterId: activeSemester.id,
          });

          // Seed agenda attendances
          const agenda = (await db.select().from(teacherAgendas).where(eq(teacherAgendas.id, r.insertId)).limit(1))[0];
          for (const s of studentPerClass[kelas]) {
            const [existingStudent] = await db.select().from(students).where(eq(students.nis, s.nis)).limit(1);
            if (!existingStudent) continue;

            const [existingAA] = await db.select().from(agendaAttendances)
              .where(and(eq(agendaAttendances.agendaId, agenda.id), eq(agendaAttendances.studentId, existingStudent.id)))
              .limit(1);
            if (existingAA) continue;

            const rand = Math.random();
            const status: 'PRESENT' | 'SICK' | 'ABSENT' = rand < 0.75 ? 'PRESENT' : rand < 0.9 ? 'SICK' : 'ABSENT';
            await db.insert(agendaAttendances).values({
              agendaId: agenda.id, studentId: existingStudent.id,
              status,
              checkinTime: new Date(),
            });
          }
          console.log(`+ Agenda & Absensi: ${g.mapel} - ${kelas}`);
        }
      }
    }

    console.log('');
    console.log('========================================');
    console.log('  SEED DATABASE SELESAI');
    console.log('========================================');
    console.log('');
    console.log('Akun:');
    console.log(`  Admin: admin@school.com / ${adminPassword}`);
    for (const g of guruData) {
      console.log(`  Guru ${g.name}: ${g.email} / ${guruPassword}`);
    }
    console.log('');
    console.log(`Siswa: ${studentIds.length} siswa di ${classNames.length} kelas`);
    console.log('');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seed();
