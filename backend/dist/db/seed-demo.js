"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("./index.js");
const schema_js_1 = require("./schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const auth_js_1 = require("../lib/auth.js");
const qrGenerator_js_1 = require("../lib/qrGenerator.js");
async function seedDemo() {
    console.log('--- MULAI SEED DATA DEMO ---');
    try {
        // === AMBIL REFERENSI YANG SUDAH ADA ===
        const activeYear = await index_js_1.db.select().from(schema_js_1.academicYears).where((0, drizzle_orm_1.eq)(schema_js_1.academicYears.isActive, true)).limit(1);
        if (activeYear.length === 0) {
            console.log('Jalankan seed.ts dulu!');
            process.exit(1);
        }
        const activeYearId = activeYear[0].id;
        const activeSemester = await index_js_1.db.select().from(schema_js_1.semesters).where((0, drizzle_orm_1.eq)(schema_js_1.semesters.isActive, true)).limit(1);
        if (activeSemester.length === 0) {
            console.log('Jalankan seed.ts dulu!');
            process.exit(1);
        }
        const activeSemesterId = activeSemester[0].id;
        const today = new Date().toISOString().slice(0, 10);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[new Date().getDay()];
        const serverTime = new Date();
        const formatTime = (date) => {
            return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
        };
        const currentTimeStr = formatTime(serverTime);
        function randomTime(before, after) {
            const [bh, bm] = before.split(':').map(Number);
            const [ah, am] = after.split(':').map(Number);
            const startMin = bh * 60 + bm;
            const endMin = ah * 60 + am;
            const randMin = startMin + Math.floor(Math.random() * (endMin - startMin));
            const h = Math.floor(randMin / 60);
            const m = randMin % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
        }
        // === 1. TAMBAH KELAS ===
        const classNames = ['X IPA 1', 'X IPA 2', 'XI IPA 1', 'XI IPA 2', 'XII IPA 1', 'XII IPA 2'];
        const classIds = {};
        for (const name of classNames) {
            let [row] = await index_js_1.db.select().from(schema_js_1.classes).where((0, drizzle_orm_1.eq)(schema_js_1.classes.name, name)).limit(1);
            if (!row) {
                const [ins] = await index_js_1.db.insert(schema_js_1.classes).values({ name });
                classIds[name] = ins.insertId;
                console.log(`+ Kelas: ${name} (id=${ins.insertId})`);
            }
            else {
                classIds[name] = row.id;
                console.log(`= Kelas: ${name} sudah ada`);
            }
        }
        // === 2. TAMBAH GURU ===
        const guruData = [
            { email: 'guru.matematika@school.com', name: 'Dr. Ahmad Fauzi', mapel: 'Matematika' },
            { email: 'guru.fisika@school.com', name: 'Siti Nurhaliza, S.Si', mapel: 'Fisika' },
            { email: 'guru.biologi@school.com', name: 'Bambang Wijaya, S.Pd', mapel: 'Biologi' },
            { email: 'guru.inggris@school.com', name: 'Jane Doe, M.Pd', mapel: 'Bahasa Inggris' },
            { email: 'guru.sejarah@school.com', name: 'Prof. Hadi Pranoto', mapel: 'Sejarah' },
        ];
        const guruMap = {};
        for (const g of guruData) {
            let [existing] = await index_js_1.db.select().from(schema_js_1.user).where((0, drizzle_orm_1.eq)(schema_js_1.user.email, g.email)).limit(1);
            if (!existing) {
                const res = await auth_js_1.auth.api.signUpEmail({
                    body: { email: g.email, password: 'guruPassword123', name: g.name }
                });
                await index_js_1.db.update(schema_js_1.user).set({ role: 'guru' }).where((0, drizzle_orm_1.eq)(schema_js_1.user.id, res.user.id));
                guruMap[g.email] = { id: res.user.id, name: g.name, mapel: g.mapel };
                console.log(`+ Guru: ${g.name} (${g.email})`);
            }
            else {
                await index_js_1.db.update(schema_js_1.user).set({ role: 'guru' }).where((0, drizzle_orm_1.eq)(schema_js_1.user.email, g.email));
                guruMap[g.email] = { id: existing.id, name: existing.name, mapel: g.mapel };
                console.log(`= Guru: ${g.name} sudah ada`);
            }
        }
        // === 3. TAMBAH SISWA PER KELAS ===
        const siswaPerKelas = {
            'X IPA 1': [
                { email: 'siswa.x1.1@school.com', name: 'Ani Rahmawati', nis: 'XIPA-001' },
                { email: 'siswa.x1.2@school.com', name: 'Budi Hartono', nis: 'XIPA-002' },
                { email: 'siswa.x1.3@school.com', name: 'Citra Dewi', nis: 'XIPA-003' },
                { email: 'siswa.x1.4@school.com', name: 'Dimas Prayoga', nis: 'XIPA-004' },
                { email: 'siswa.x1.5@school.com', name: 'Eka Putri', nis: 'XIPA-005' },
            ],
            'X IPA 2': [
                { email: 'siswa.x2.1@school.com', name: 'Fajar Sidik', nis: 'XIPA-006' },
                { email: 'siswa.x2.2@school.com', name: 'Gita Permata', nis: 'XIPA-007' },
                { email: 'siswa.x2.3@school.com', name: 'Hendra Gunawan', nis: 'XIPA-008' },
                { email: 'siswa.x2.4@school.com', name: 'Intan Permatasari', nis: 'XIPA-009' },
                { email: 'siswa.x2.5@school.com', name: 'Joko Susilo', nis: 'XIPA-010' },
            ],
            'XI IPA 1': [
                { email: 'siswa.xi1.1@school.com', name: 'Kartika Sari', nis: 'XIPA-011' },
                { email: 'siswa.xi1.2@school.com', name: 'Lukman Hakim', nis: 'XIPA-012' },
                { email: 'siswa.xi1.3@school.com', name: 'Mega Wati', nis: 'XIPA-013' },
                { email: 'siswa.xi1.4@school.com', name: 'Nanda Pratama', nis: 'XIPA-014' },
                { email: 'siswa.xi1.5@school.com', name: 'Olivia Susanti', nis: 'XIPA-015' },
            ],
            'XI IPA 2': [
                { email: 'siswa.xi2.1@school.com', name: 'Putra Ramadan', nis: 'XIPA-016' },
                { email: 'siswa.xi2.2@school.com', name: 'Rina Marlina', nis: 'XIPA-017' },
                { email: 'siswa.xi2.3@school.com', name: 'Sandi Gunawan', nis: 'XIPA-018' },
                { email: 'siswa.xi2.4@school.com', name: 'Tina Amalia', nis: 'XIPA-019' },
                { email: 'siswa.xi2.5@school.com', name: 'Umar Bakri', nis: 'XIPA-020' },
            ],
            'XII IPA 1': [
                { email: 'siswa.xii1.1@school.com', name: 'Vina Lestari', nis: 'XIPA-021' },
                { email: 'siswa.xii1.2@school.com', name: 'Wahyu Nugroho', nis: 'XIPA-022' },
                { email: 'siswa.xii1.3@school.com', name: 'Xena Marlita', nis: 'XIPA-023' },
                { email: 'siswa.xii1.4@school.com', name: 'Yoga Pratama', nis: 'XIPA-024' },
                { email: 'siswa.xii1.5@school.com', name: 'Zahra Ramadhani', nis: 'XIPA-025' },
            ],
            'XII IPA 2': [
                { email: 'siswa.xii2.1@school.com', name: 'Adi Saputra', nis: 'XIPA-026' },
                { email: 'siswa.xii2.2@school.com', name: 'Bella Anggraini', nis: 'XIPA-027' },
                { email: 'siswa.xii2.3@school.com', name: 'Candra Wirawan', nis: 'XIPA-028' },
                { email: 'siswa.xii2.4@school.com', name: 'Dian Permata', nis: 'XIPA-029' },
                { email: 'siswa.xii2.5@school.com', name: 'Erik Tohir', nis: 'XIPA-030' },
            ],
        };
        const allStudentIds = [];
        for (const [kelas, daftar] of Object.entries(siswaPerKelas)) {
            const classId = classIds[kelas];
            for (const s of daftar) {
                let [existingUser] = await index_js_1.db.select().from(schema_js_1.user).where((0, drizzle_orm_1.eq)(schema_js_1.user.email, s.email)).limit(1);
                let userId;
                if (!existingUser) {
                    const res = await auth_js_1.auth.api.signUpEmail({
                        body: { email: s.email, password: 'siswaPassword123', name: s.name }
                    });
                    await index_js_1.db.update(schema_js_1.user).set({ role: 'siswa' }).where((0, drizzle_orm_1.eq)(schema_js_1.user.id, res.user.id));
                    userId = res.user.id;
                }
                else {
                    await index_js_1.db.update(schema_js_1.user).set({ role: 'siswa' }).where((0, drizzle_orm_1.eq)(schema_js_1.user.email, s.email));
                    userId = existingUser.id;
                }
                let [existingStudent] = await index_js_1.db.select().from(schema_js_1.students).where((0, drizzle_orm_1.eq)(schema_js_1.students.nis, s.nis)).limit(1);
                let studentId;
                if (!existingStudent) {
                    const [ins] = await index_js_1.db.insert(schema_js_1.students).values({ userId, nis: s.nis, classId });
                    studentId = ins.insertId;
                    try {
                        const qrPath = await (0, qrGenerator_js_1.generateQrCode)(s.nis, studentId);
                        await index_js_1.db.update(schema_js_1.students).set({ qrcode: qrPath }).where((0, drizzle_orm_1.eq)(schema_js_1.students.id, studentId));
                    }
                    catch { /* qr optional */ }
                    console.log(`+ Siswa: ${s.name} (${s.nis}) -> ${kelas}`);
                }
                else {
                    studentId = existingStudent.id;
                    await index_js_1.db.update(schema_js_1.students).set({ userId, classId }).where((0, drizzle_orm_1.eq)(schema_js_1.students.id, studentId));
                }
                allStudentIds.push(studentId);
            }
        }
        // === 4. JADWAL MENGAJAR GURU ===
        const jadwal = [];
        const guruIds = Object.values(guruMap);
        const kelasList = Object.keys(classIds);
        // Matematika (Dr. Ahmad Fauzi) -> X IPA 1, XI IPA 1, XII IPA 1
        jadwal.push({ teacherId: guruIds[0].id, className: 'X IPA 1', subject: 'Matematika', dayName: 'Monday', startTime: '07:00:00', endTime: '08:30:00' }, { teacherId: guruIds[0].id, className: 'XI IPA 1', subject: 'Matematika', dayName: 'Tuesday', startTime: '08:00:00', endTime: '09:30:00' }, { teacherId: guruIds[0].id, className: 'XII IPA 1', subject: 'Matematika', dayName: 'Wednesday', startTime: '08:00:00', endTime: '09:30:00' }, { teacherId: guruIds[0].id, className: 'X IPA 1', subject: 'Matematika', dayName: 'Thursday', startTime: '09:00:00', endTime: '10:30:00' }, { teacherId: guruIds[0].id, className: 'XII IPA 1', subject: 'Matematika', dayName: 'Friday', startTime: '07:00:00', endTime: '08:30:00' });
        // Fisika (Siti Nurhaliza) -> X IPA 2, XI IPA 2, XII IPA 2
        jadwal.push({ teacherId: guruIds[1].id, className: 'X IPA 2', subject: 'Fisika', dayName: 'Monday', startTime: '08:30:00', endTime: '10:00:00' }, { teacherId: guruIds[1].id, className: 'XI IPA 2', subject: 'Fisika', dayName: 'Tuesday', startTime: '09:30:00', endTime: '11:00:00' }, { teacherId: guruIds[1].id, className: 'XII IPA 2', subject: 'Fisika', dayName: 'Wednesday', startTime: '08:00:00', endTime: '09:30:00' }, { teacherId: guruIds[1].id, className: 'X IPA 2', subject: 'Fisika', dayName: 'Thursday', startTime: '07:00:00', endTime: '08:30:00' }, { teacherId: guruIds[1].id, className: 'XII IPA 2', subject: 'Fisika', dayName: 'Friday', startTime: '08:30:00', endTime: '10:00:00' });
        // Biologi (Bambang Wijaya) -> X IPA 1, XI IPA 2
        jadwal.push({ teacherId: guruIds[2].id, className: 'X IPA 1', subject: 'Biologi', dayName: 'Monday', startTime: '10:00:00', endTime: '11:30:00' }, { teacherId: guruIds[2].id, className: 'XI IPA 2', subject: 'Biologi', dayName: 'Tuesday', startTime: '07:00:00', endTime: '08:30:00' }, { teacherId: guruIds[2].id, className: 'X IPA 1', subject: 'Biologi', dayName: 'Wednesday', startTime: '09:30:00', endTime: '11:00:00' }, { teacherId: guruIds[2].id, className: 'XI IPA 2', subject: 'Biologi', dayName: 'Thursday', startTime: '10:00:00', endTime: '11:30:00' }, { teacherId: guruIds[2].id, className: 'X IPA 1', subject: 'Biologi', dayName: 'Friday', startTime: '10:00:00', endTime: '11:30:00' });
        // Bahasa Inggris (Jane Doe) -> X IPA 2, XI IPA 1, XII IPA 2
        jadwal.push({ teacherId: guruIds[3].id, className: 'X IPA 2', subject: 'Bahasa Inggris', dayName: 'Monday', startTime: '07:00:00', endTime: '08:30:00' }, { teacherId: guruIds[3].id, className: 'XI IPA 1', subject: 'Bahasa Inggris', dayName: 'Tuesday', startTime: '10:00:00', endTime: '11:30:00' }, { teacherId: guruIds[3].id, className: 'XII IPA 2', subject: 'Bahasa Inggris', dayName: 'Wednesday', startTime: '09:30:00', endTime: '11:00:00' }, { teacherId: guruIds[3].id, className: 'X IPA 2', subject: 'Bahasa Inggris', dayName: 'Thursday', startTime: '08:30:00', endTime: '10:00:00' }, { teacherId: guruIds[3].id, className: 'XI IPA 1', subject: 'Bahasa Inggris', dayName: 'Friday', startTime: '08:30:00', endTime: '10:00:00' });
        // Sejarah (Hadi Pranoto) -> XI IPA 1, XII IPA 1, XII IPA 2
        jadwal.push({ teacherId: guruIds[4].id, className: 'XI IPA 1', subject: 'Sejarah', dayName: 'Monday', startTime: '08:30:00', endTime: '10:00:00' }, { teacherId: guruIds[4].id, className: 'XII IPA 1', subject: 'Sejarah', dayName: 'Tuesday', startTime: '10:00:00', endTime: '11:30:00' }, { teacherId: guruIds[4].id, className: 'XII IPA 2', subject: 'Sejarah', dayName: 'Wednesday', startTime: '07:00:00', endTime: '08:30:00' }, { teacherId: guruIds[4].id, className: 'XI IPA 1', subject: 'Sejarah', dayName: 'Thursday', startTime: '07:00:00', endTime: '08:30:00' }, { teacherId: guruIds[4].id, className: 'XII IPA 1', subject: 'Sejarah', dayName: 'Friday', startTime: '09:00:00', endTime: '10:30:00' });
        for (const j of jadwal) {
            const classId = classIds[j.className];
            const [existing] = await index_js_1.db.select().from(schema_js_1.teachingSchedules)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.teacherId, j.teacherId), (0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.dayName, j.dayName), (0, drizzle_orm_1.eq)(schema_js_1.teachingSchedules.classId, classId))).limit(1);
            if (!existing) {
                await index_js_1.db.insert(schema_js_1.teachingSchedules).values({
                    teacherId: j.teacherId,
                    classId,
                    dayName: j.dayName,
                    startTime: j.startTime,
                    endTime: j.endTime,
                    subject: j.subject,
                });
                console.log(`+ Jadwal: ${j.subject} - ${j.className} (${j.dayName} ${j.startTime}-${j.endTime})`);
            }
        }
        // === 5. ABSENSI HARI INI (untuk simulasi) ===
        // Cari semua siswa per kelas, beri status PRESENT/LATE untuk beberapa
        for (const [kelas, daftar] of Object.entries(siswaPerKelas)) {
            const classId = classIds[kelas];
            const lateAfter = '07:30:00';
            for (let i = 0; i < daftar.length; i++) {
                const s = daftar[i];
                const [existingStudent] = await index_js_1.db.select().from(schema_js_1.students)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.students.nis, s.nis), (0, drizzle_orm_1.eq)(schema_js_1.students.classId, classId)))
                    .limit(1);
                if (!existingStudent)
                    continue;
                // Cek apakah sudah ada absensi hari ini
                const [existingAtt] = await index_js_1.db.select().from(schema_js_1.attendances)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.attendances.studentId, existingStudent.id), (0, drizzle_orm_1.eq)(schema_js_1.attendances.attendanceDate, today))).limit(1);
                if (existingAtt)
                    continue;
                // 70% PRESENT, 20% LATE, 10% absent (tidak dibuat)
                const rand = Math.random();
                if (rand < 0.7) {
                    const checkin = randomTime('06:00', '07:15');
                    await index_js_1.db.insert(schema_js_1.attendances).values({
                        studentId: existingStudent.id,
                        academicYearId: activeYearId,
                        semesterId: activeSemesterId,
                        attendanceDate: today,
                        status: 'PRESENT',
                        checkinTime: new Date(`${today}T${checkin}`),
                    });
                    console.log(`  Absen HADIR: ${s.name} (${s.nis}, ${kelas}) jam ${checkin}`);
                }
                else if (rand < 0.9) {
                    const checkin = randomTime('07:31', '09:00');
                    await index_js_1.db.insert(schema_js_1.attendances).values({
                        studentId: existingStudent.id,
                        academicYearId: activeYearId,
                        semesterId: activeSemesterId,
                        attendanceDate: today,
                        status: 'LATE',
                        checkinTime: new Date(`${today}T${checkin}`),
                    });
                    console.log(`  Absen TELAT: ${s.name} (${s.nis}, ${kelas}) jam ${checkin}`);
                }
                else {
                    console.log(`  Absen TIDAK HADIR: ${s.name} (${s.nis}, ${kelas})`);
                }
            }
        }
        console.log('');
        console.log('=== DATA DEMO SELESAI ===');
        console.log('');
        console.log('Akun Guru Demo:');
        for (const g of guruData) {
            const gData = guruMap[g.email];
            console.log(`  ${g.name} -> ${g.email} / guruPassword123`);
        }
        console.log('');
        console.log('Akun Siswa Demo (password: siswaPassword123):');
        for (const [kelas, daftar] of Object.entries(siswaPerKelas)) {
            console.log(`  ${kelas}:`);
            for (const s of daftar) {
                console.log(`    - ${s.name} (${s.email}) NIS: ${s.nis}`);
            }
        }
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        process.exit(0);
    }
}
seedDemo();
