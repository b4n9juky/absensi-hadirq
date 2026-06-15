# Resume Troubleshoot Deploy CyberPanel — 503 Service Unavailable

## Timeline

| Waktu | Kejadian |
|-------|----------|
| 11 Jun 2026 ~14:00 | Website `absensi.manbontang.sch.id` mengembalikan **503 Service Unavailable** |
| ~14:05 | Cek `pm2 status` → proses **shakeabsen** online tapi sudah **restart 5324 kali** |
| ~14:10 | Cek `logs/backend-error.log` → error berulang: **`DATABASE_URL environment variable is missing!`** |
| ~14:15 | Analisis kode ditemukan penyebab |
| ~14:20 | Update `ecosystem.config.js` dengan semua env vars |
| ~14:25 | `pm2 delete` + `pm2 start --update-env` → sukses, website kembali normal |

---

## Root Cause

### Lingkungan Production
- **Web Server:** CyberPanel (OpenLiteSpeed) sebagai reverse proxy
- **App Server:** Node.js (Express) via PM2
- **Entry point:** `backend/dist/index.js`
- **PM2 CWD:** root project (`/home/.../absensi.manbontang.sch.id/`)

### Diagram Alur Error

```
PM2 start backend/dist/index.js
        │
        ▼
  index.js line 8: import 'dotenv/config'
        │
        ▼
  dotenv mencari .env di CWD (root project)  ← TIDAK KETEMU
        │                                      (file .env ada di backend/)
        ▼
  process.env.DATABASE_URL = undefined
        │
        ▼
  auth.js → db/index.js line 6:
  throw "DATABASE_URL environment variable is missing!"
        │
        ▼
  PM2 restart (loop 5324×)
        │
        ▼
  OpenLiteSpeed proxy → 503 Service Unavailable
```

### Penyebab Langsung

`dotenv` secara default membaca file `.env` dari **Current Working Directory (CWD)**, yaitu root project. Tapi file `.env` hanya ada di subfolder **`backend/.env`**, bukan di root project.

**Akibat:** Semua environment variable dari `.env` (termasuk `DATABASE_URL`) tidak pernah termuat ke `process.env`, sehingga aplikasi gagal startup dan PM2 restart terus-menerus.

---

## Solusi

### Strategi

Memindahkan environment variables dari file `backend/.env` ke **`ecosystem.config.js`** (PM2 config) — sehingga PM2 meng-inject langsung ke proses tanpa perlu `dotenv`.

### File yang Dimodifikasi

**`ecosystem.config.js`** — Tambah `env` block:

```js
env: {
  NODE_ENV: 'production',
  PORT: '3001',
  DATABASE_URL: 'mysql://user:pass@localhost:3306/db',
  CORS_ORIGIN: 'https://absensi.manbontang.sch.id',
  BETTER_AUTH_SECRET: 'super_secret_session_key...',
  BETTER_AUTH_URL: 'https://absensi.manbontang.sch.id',
  SCHOOL_LATITUDE: '0.144011',
  SCHOOL_LONGITUDE: '117.473191',
  SCHOOL_RADIUS_METERS: '50',
  MAX_ACCURACY_METERS: '30',
},
```

### Perintah yang Dijalankan

```bash
pm2 delete shakeabsen
pm2 start ecosystem.config.js --update-env
pm2 save
```

> **Penting:** `pm2 restart --update-env` diperlukan agar PM2 membaca ulang `env` block dari file config. Restart biasa tanpa `--update-env` tetap memakai cache environment lama.

---

## Pembelajaran

| Topik | Keterangan |
|-------|------------|
| **dotenv & CWD** | `dotenv` mencari `.env` di `process.cwd()`, bukan di direktori file yang berisi `import 'dotenv/config'` |
| **PM2 env injection** | Untuk production, env vars di `ecosystem.config.js` lebih reliable daripada file `.env` |
| **--update-env** | Wajib saat mengubah `env` block di PM2 config, kalau tidak PM2 tetap pakai cache lama |
| **Diagnosis** | Cek `pm2 status` (restart count) + `logs/backend-error.log` untuk menemukan akar masalah |

---

# Resume Troubleshoot - Kiosk Absensi Wajah & Kenaikan Kelas Massal

## Timeline Masalah & Resolusi (15 Jun 2026)

| Masalah | Penyebab (Root Cause) | Solusi yang Diterapkan |
|---------|-----------------------|------------------------|
| **Kamera/Wajah Tidak Terdeteksi** | Ukuran model `Tiny Face Detector` terlalu kecil sehingga tidak andal di kondisi minim cahaya atau jarak jauh (1-3m). | Mengupgrade pemindai utama menggunakan **SSD Mobilenet V1** yang jauh lebih akurat, dengan fallback otomatis ke `Tiny Face Detector` (sensitivitas `0.3`) jika gagal. |
| **Absen Terbaca Ganda (Datang + Pulang Sekaligus)** | 1. Request API dikirim ganda oleh frame kamera asinkron yang berdekatan.<br>2. Ketiadaan jeda waktu minimum di server sehingga request kedua (selisih milidetik) langsung memicu check-out pulang di hari itu. | 1. Frontend: Menambahkan pengunci sinkron (`isScanningRef.current`) sebelum menembak API.<br>2. Backend: Membatasi check-out jika jeda sejak check-in kurang dari 5 menit menggunakan perhitungan zona waktu independen (`getLocalEpoch`). |
| **Gagal Update Database (`db:push` di VPS)** | Drizzle-kit mencoba mengosongkan/menghapus (*truncate*) tabel `academic_years` untuk memproses ulang foreign key, tetapi ditolak MySQL karena relasi kunci aktif. | Mengabaikan `db:push` di VPS, dan beralih menggunakan skrip migrasi raw SQL aman: `npx tsx src/db/add-column.ts` untuk memproses `ALTER TABLE ADD COLUMN` tanpa menghapus data. |
| **Error `Unexpected token '<'` (Bukan valid JSON)** | 1. Endpoint `/embeddings` terblokir `authMiddleware` sesi admin.<br>2. Berkas model AI `ssd_mobilenetv1` tidak ada di VPS karena dikecualikan dari Git. Server web mengembalikan HTML fallback (`index.html`) yang memicu error parsing JSON. | 1. Memindahkan endpoint ke `/api/kiosk/embeddings` dengan proteksi Kiosk Secret Key.<br>2. Memperbarui skrip `download-models.mjs` di VPS untuk mengunduh 8 berkas `.bin` model AI secara lengkap, lalu melakukan build ulang. |
| **Gagal Query / Bentrok Env PM2 (`Failed query: select ...`)** | 1. PM2 berjalan dari root folder (CWD `.`) sehingga `dotenv` gagal memuat `backend/.env`. <br>2. Nilai `DATABASE_URL` di `ecosystem.config.js` tertimpa ke default development saat `git reset --hard`. | 1. Membuat loader kustom `backend/src/lib/env.ts` untuk mencari `.env` secara dinamis di berbagai folder relatif.<br>2. Mengaktifkan `override: true` pada `dotenv` agar berkas `/backend/.env` di VPS selalu mengesampingkan environment variable default bawaan PM2/Git. |

---

## Panduan Perawatan & Migrasi Server Mendatang

### 1. Penambahan Kolom Database Baru di VPS
Jika ada pembaruan skema database di masa mendatang, **hindari penggunaan `npm run db:push` langsung di VPS** jika terdapat relasi foreign key aktif yang berisiko memicu truncation data. 
* **Rekomendasi:** Tulis skrip migrasi SQL manual menggunakan perintah `ALTER TABLE` seperti pada [add-column.ts](file:///c:/Users/yayas/Documents/Aplikasi/absensilocation/backend/src/db/add-column.ts) lalu jalankan dengan `npx tsx`.

### 2. Penanganan File Model AI Besar di Git
* File `.bin` model AI (total ~12MB) sengaja dimasukkan ke `.gitignore` agar repositori Git tetap ringan.
* Jika Anda memindahkan atau mengkloning proyek ini ke server baru, **selalu jalankan** perintah ini sekali sebelum melakukan build:
  ```bash
  cd frontend
  node download-models.mjs
  ```

### 3. Pengamanan Link Kiosk Absensi
* Selalu pastikan variabel `KIOSK_SECRET_KEY` terkonfigurasi dengan aman di file `.env` server backend (atau PM2 config).
* Laptop kiosk sekolah harus diotentikasi sekali saat setup awal agar token tersimpan di browser (`localStorage`). Tanpa token ini, siapa pun (termasuk siswa dari ponsel pribadinya) tidak akan bisa menembak API absensi wajah.

### 4. Pengelolaan Environment Variables yang Aman & Konsisten
* **Jangan menulis/menyimpan kredensial rahasia (seperti password DB atau Better Auth Secret)** di file `ecosystem.config.js` karena file tersebut dilacak oleh Git dan akan ter-overwrite saat deploy/reset.
* **Selalu simpan kredensial rahasia di berkas `/backend/.env` di VPS.** Loader backend otomatis mendeteksi berkas ini dan menggunakannya untuk menimpa konfigurasi default (`override: true`).

