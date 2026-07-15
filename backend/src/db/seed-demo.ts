import { db } from './index.js';
import { teachingSchedules, teachingSessionLogs, classes, students, user } from './schema.js';
import { eq, and } from 'drizzle-orm';

async function seedDemo() {
  console.log('--- MULAI SEED DATA DEMO (Session Logs) ---');

  try {
    const today = new Date().toISOString().slice(0, 10);

    // Get all teaching schedules with teacher names
    const schedules = await db.select({
      scheduleId: teachingSchedules.id,
      teacherId: teachingSchedules.teacherId,
      className: classes.name,
      subject: teachingSchedules.subject,
      dayName: teachingSchedules.dayName,
      startTime: teachingSchedules.startTime,
      endTime: teachingSchedules.endTime,
    })
    .from(teachingSchedules)
    .innerJoin(classes, eq(teachingSchedules.classId, classes.id));

    if (schedules.length === 0) {
      console.log('Tidak ada jadwal mengajar. Jalankan npm run db:seed dulu.');
      process.exit(0);
    }

    const teacherNames: Record<string, string> = {};
    for (const s of schedules) {
      if (!teacherNames[s.teacherId]) {
        const [u] = await db.select().from(user).where(eq(user.id, s.teacherId)).limit(1);
        teacherNames[s.teacherId] = u?.name || 'Guru';
      }
    }

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const todayDayName = dayNames[new Date().getDay()];
    const todaySchedules = schedules.filter(s => s.dayName === todayDayName);

    let count = 0;
    for (const s of todaySchedules) {
      const [existing] = await db.select().from(teachingSessionLogs)
        .where(and(
          eq(teachingSessionLogs.teachingScheduleId, s.scheduleId),
          eq(teachingSessionLogs.attendanceDate, today),
        ))
        .limit(1);

      if (existing) continue;

      const materiOptions = [
        `Persamaan dan Pertidaksamaan Linear`,
        `Teori Dasar ${s.subject}`,
        `Penerapan Konsep ${s.subject} dalam Kehidupan Sehari-hari`,
        `Review Materi dan Latihan Soal ${s.subject}`,
        `Diskusi Kelompok: Studi Kasus ${s.subject}`,
      ];
      const kegiatanOptions = [
        'Ceramah interaktif dan tanya jawab',
        'Praktikum dan demonstrasi',
        'Pembahasan soal secara berkelompok',
        'Presentasi siswa dan diskusi kelas',
        'Video pembelajaran dan analisis',
      ];

      const materi = materiOptions[Math.floor(Math.random() * materiOptions.length)];
      const kegiatan = kegiatanOptions[Math.floor(Math.random() * kegiatanOptions.length)];

      await db.insert(teachingSessionLogs).values({
        teachingScheduleId: s.scheduleId,
        attendanceDate: today,
        materi,
        kegiatan,
        catatanKendala: 'Pembelajaran berjalan lancar.',
      });
      count++;
    }

    console.log(`+ ${count} session logs untuk hari ${todayDayName} (${today})`);
    console.log('');
    console.log('=== SEED DEMO SELESAI ===');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedDemo();
