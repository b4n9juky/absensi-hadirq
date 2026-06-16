# Class Attendance (Absensi Mata Pelajaran)

Penambahan fitur transaksi absensi bagi guru untuk mencatat kehadiran siswa pada jam mengajar yang spesifik. Fitur ini dirancang sesuai dengan hasil diskusi kita.

## User Review Required

> [!IMPORTANT]
> Harap tinjau rencana di bawah ini untuk memastikan sudah sesuai dengan alur yang Anda inginkan.
> Jika disetujui, saya akan mulai melakukan perubahan pada database, backend, dan frontend.

## Proposed Changes

---

### Database Schema

#### [MODIFY] [schema.ts](file:///c:/Users/yayas/Documents/Aplikasi/absensilocation/backend/src/db/schema.ts)
- Menambahkan tabel baru `subjectAttendances`:
  - `id`: Primary key
  - `teachingScheduleId`: Foreign key ke tabel `teachingSchedules`
  - `studentId`: Foreign key ke tabel `students`
  - `attendanceDate`: Tanggal absensi (YYYY-MM-DD)
  - `status`: Enum yang berisi status (`'PRESENT'`, `'SICK'`, `'EXCUSED'`, `'ABSENT'`, `'DISPEN'`, `'SKIPPED'`)
  - `notes`: Catatan opsional dari guru

#### [NEW] Database Migration
- Menerapkan perubahan skema ke database MySQL menggunakan Drizzle.

---

### Backend API

#### [NEW] [subjectAttendanceService.ts](file:///c:/Users/yayas/Documents/Aplikasi/absensilocation/backend/src/services/subjectAttendanceService.ts)
- Logic untuk mengambil daftar siswa di suatu jadwal, sekaligus mencocokkan dengan tabel `attendances` (absensi harian) di tanggal tersebut untuk menentukan pre-fill status 'Hadir'.
- Logic untuk menyimpan/memperbarui daftar absensi kelas yang di-submit guru.

#### [NEW] [subjectAttendanceRoutes.ts](file:///c:/Users/yayas/Documents/Aplikasi/absensilocation/backend/src/routes/subjectAttendanceRoutes.ts)
- `GET /api/subject-attendances/schedule/:scheduleId/date/:date` - Mengambil form absensi beserta status default siswa.
- `POST /api/subject-attendances` - Menyimpan (upsert) data kehadiran.

#### [MODIFY] [index.ts](file:///c:/Users/yayas/Documents/Aplikasi/absensilocation/backend/src/index.ts)
- Mendaftarkan endpoint baru ke router utama Express.

---

### Frontend UI (Teacher)

#### [NEW] [ClassAttendancePage.tsx](file:///c:/Users/yayas/Documents/Aplikasi/absensilocation/frontend/src/pages/ClassAttendancePage.tsx)
- Halaman antarmuka untuk guru.
- Menampilkan jadwal mengajar pada hari tersebut.
- Saat jadwal dipilih, menampilkan daftar siswa di kelas tersebut.
- Status siswa akan **otomatis terisi "Hadir"** jika mereka sudah melakukan absen kedatangan hari itu. Sisanya akan kosong/Alpa.
- Guru dapat memilih/mengubah status menjadi: Hadir, Sakit, Izin, Alpa, Dispen, Bolos.
- Tombol "Simpan Absensi" untuk mengirim data ke backend.

#### [MODIFY] [App.tsx](file:///c:/Users/yayas/Documents/Aplikasi/absensilocation/frontend/src/App.tsx)
- Menambahkan route baru seperti `/teacher/attendance` untuk halaman guru tersebut.

## Verification Plan

### Automated Checks
- Validasi TypeScript (TS Build) pada sisi Backend dan Frontend.

### Manual Verification
1. Login sebagai Guru.
2. Buka menu Absensi Kelas.
3. Pilih salah satu jam mengajar.
4. Verifikasi bahwa siswa yang sudah melakukan absensi kedatangan (harian) otomatis ter-centang/terpilih "Hadir", dan yang lain "Alpa".
5. Ubah status beberapa siswa (misal menjadi "Bolos" dan "Dispen") lalu tekan Simpan.
6. Refresh halaman untuk memverifikasi data tersimpan dengan benar.
7. Verifikasi di database bahwa absensi kelas (subjectAttendances) tersimpan tanpa merubah status absensi harian di tabel (attendances).
