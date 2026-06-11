# ShakeAbsen

Sistem Absensi Sekolah berbasis **geolocation (geofence)** + **selfie photo** + **QR Code**.

- **Frontend**: React 19 + Vite 8 + Tailwind CSS
- **Backend**: Express.js + TypeScript + Drizzle ORM (MySQL)
- **Auth**: Better Auth (email/password + bearer token)
- **Geofence**: Geolib — validasi jarak & akurasi GPS

---

## Struktur Project

```
shakeabsen/
├── frontend/          # Admin Panel (React SPA)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/       # Sidebar, TopBar, DashboardLayout
│   │   │   ├── sections/     # Dashboard, Users, Students, etc.
│   │   │   └── shared/       # Modal, Form, Table, Badge, etc.
│   │   └── App.tsx           # Router (React Router DOM)
│   └── dist/                 # Build output
├── backend/           # API Server (Express)
│   ├── src/
│   │   ├── routes/           # Route handlers
│   │   ├── services/         # Business logic
│   │   ├── repositories/     # Database queries
│   │   ├── middlewares/      # Auth, validation
│   │   ├── lib/              # Auth config, helpers
│   │   └── db/               # Schema, migrations, seed
│   ├── .env                  # Environment variables
│   └── dist/                 # Build output
├── uploads/           # Selfie photos & Excel imports
├── ecosystem.config.js # PM2 process manager
└── deploy.sh          # Deployment script
```

---

## Quick Start (Development)

```bash
# 1. Setup database MySQL & buat database 'absensi'
# 2. Copy .env
cp backend/.env.example backend/.env
# 3. Edit backend/.env — isi DATABASE_URL & konfigurasi lain

# 4. Install dependencies
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# 5. Push schema ke database
cd backend && npm run db:push && cd ..

# 6. Seed data awal (admin, kelas, jadwal)
cd backend && npm run db:seed && cd ..

# 7. Jalankan backend (port 3001)
cd backend && npm run dev &

# 8. Jalankan frontend (port 5173) — di terminal lain
cd frontend && npm run dev
```

Buka `http://localhost:5173` → Login dengan akun hasil seed.

---

## Production Deploy (CyberPanel)

Lihat panduan lengkap: [DEPLOY_CYBERPANEL.md](./DEPLOY_CYBERPANEL.md)

### Ringkasan Deploy

```bash
# 1. Setup environment
cp backend/.env.example backend/.env
nano backend/.env   # isi DATABASE_URL, CORS_ORIGIN, BETTER_AUTH_SECRET

# 2. Install & build
npm run install:all
npm run build

# 3. Database
npm run db:push
npm run db:seed

# 4. Jalankan dengan PM2
pm2 start ecosystem.config.js
pm2 save
```

---

## API Documentation

Lihat: [backend/API_SPEC.md](./backend/API_SPEC.md)

### Endpoints Utama

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| POST | `/api/auth/sign-in/email` | - | Login |
| POST | `/api/attendance` | siswa | Check-in/out (GPS + foto) |
| POST | `/api/attendance/qr` | guru | Check-in/out via QR |
| GET | `/api/config` | semua | Konfigurasi aplikasi Android |
| GET | `/api/dashboard/stats` | admin/guru | Statistik absensi |
| GET/PUT | `/api/settings` | admin | Pengaturan geofence & API |

---

## Environment Variables

| Variable | Wajib | Default | Deskripsi |
|----------|-------|---------|-----------|
| `PORT` | - | 3001 | Port backend |
| `DATABASE_URL` | ✅ | - | `mysql://user:pass@host:3306/db` |
| `CORS_ORIGIN` | ✅ | * | Domain origin (koma untuk multi) |
| `BETTER_AUTH_SECRET` | ✅ | - | String acak 32+ karakter |
| `BETTER_AUTH_URL` | ✅ | - | URL domain (https://...) |
| `SCHOOL_LATITUDE` | - | 0.1340 | Fallback latitude |
| `SCHOOL_LONGITUDE` | - | 117.5000 | Fallback longitude |
| `SCHOOL_RADIUS_METERS` | - | 50 | Fallback radius (meter) |
| `MAX_ACCURACY_METERS` | - | 30 | Fallback akurasi GPS |

> Geofence settings bisa diubah via Admin Panel → **Pengaturan** (tersimpan di database).
> Env hanya sebagai fallback jika belum tersimpan di DB.

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 19, Vite 8, TypeScript 6, Tailwind 3 |
| Backend | Express 4, TypeScript 5, Drizzle ORM |
| Database | MySQL 8 (via mysql2) |
| Auth | Better Auth 1 (bearer token) |
| Geofence | Geolib |
| Validation | Zod 4 |
| File Upload | Multer |
| QR Code | qrcode |
| Excel Import | xlsx |
| Security | Helmet, express-rate-limit |
