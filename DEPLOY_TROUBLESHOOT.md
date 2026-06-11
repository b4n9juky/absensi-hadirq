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

## Rekomendasi ke Depan

1. **Simpan env vars di PM2 config** untuk production — jangan andalkan file `.env`
2. **File `backend/.env` tetap boleh ada** untuk development lokal (jalan via `tsx src/index.ts` dari folder `backend/`)
3. **Gunakan guard** di `ecosystem.config.js`: jika ada perubahan env, selalu pakai `--update-env`
4. **Monitoring**: pantau restart count PM2 via `pm2 status` sebagai early warning
