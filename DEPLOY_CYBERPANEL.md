# Panduan Deploy ShakeAbsen di CyberPanel (OpenLiteSpeed)

## Prasyarat

- CyberPanel dengan OpenLiteSpeed terinstall
- Node.js 20+ (install via CyberPanel → NodeJS Selector atau manual)
- MySQL database (buat via CyberPanel → Websites → Databases)
- Domain sudah di-pointing ke server

---

## Langkah 1 — Setup Database

1. Buka CyberPanel → **Websites** → **Databases**
2. Klik **Create Database**
3. Isi:
   - **Database Name**: `absensi`
   - **Database User**: `absensi_user`
   - **Database Password**: `(buat password kuat)`
4. Catat kredensialnya

---

## Langkah 2 — Upload File Project

### Opsi A: Git Clone

```bash
cd /home/<username>/public_html
git clone https://github.com/username/shakeabsen.git .
```

### Opsi B: Upload via File Manager

1. Zip folder project (tanpa `node_modules`)
2. Upload via CyberPanel **File Manager**
3. Extract

---

## Langkah 3 — Install Node.js & PM2

### Via CyberPanel NodeJS Selector (jika tersedia)

1. CyberPanel → **NodeJS Selector**
2. Pilih domain → **NodeJS App**
3. **Application Mode**: Production
4. **Application URL**: `https://domain.sch.id`
5. **Application Path**: `/home/<username>/public_html`
6. **Application Startup File**: `backend/dist/index.js`
7. Klik **Create**

> CyberPanel otomatis menjalankan Node.js app sebagai service.

### Via SSH (jika NodeJS Selector tidak tersedia)

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2 global
npm install -g pm2

# Setup project
cd /home/<username>/public_html
npm run install:all
npm run build

# Setup .env
cp backend/.env.example backend/.env
nano backend/.env   # isi dengan kredensial database & domain

# Database migration
npm run db:push
npm run db:seed

# Start dengan PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Langkah 4 — Konfigurasi OpenLiteSpeed (Reverse Proxy)

### 4.1 Setup Document Root

1. CyberPanel → **Websites** → klik domain
2. **Document Root**: `/home/<username>/public_html/frontend/dist`
3. **Save**

### 4.2 Setup Reverse Proxy untuk API

1. CyberPanel → **Websites** → klik domain → **Rewrite Rules**
2. Tambah rule Apache-style:

```apache
RewriteRule ^/api/(.*) http://127.0.0.1:3001/api/$1 [P,L]
RewriteRule ^/uploads/(.*) http://127.0.0.1:3001/uploads/$1 [P,L]
```

### 4.3 Atau via OpenLiteSpeed Admin (alternatif)

1. Login ke **OpenLiteSpeed Admin** (port 7080)
2. Pilih **Virtual Host** → domain Anda
3. **Context** → **Add**:
   ```
   URI: /api/
   Type: Proxy
   Context: http://127.0.0.1:3001/api/
   ```
4. **Context** → **Add**:
   ```
   URI: /uploads/
   Type: Proxy
   Context: http://127.0.0.1:3001/uploads/
   ```
5. **Graceful Restart**

---

## Langkah 5 — Setup SSL

1. CyberPanel → **Websites** → klik domain
2. **SSL** → **Issue Free SSL (Let's Encrypt)**
3. Centang **Auto Redirect HTTP → HTTPS**
4. **Issue**

---

## Langkah 6 — Verifikasi

| Endpoint | Expected |
|----------|----------|
| `https://domain.sch.id/` | Halaman Login Admin |
| `https://domain.sch.id/api/health` | 404 (OK, karena belum ada route health) |
| `https://domain.sch.id/api/auth/sign-in/email` | 405 (Method Not Allowed — karena pakai POST) |

Cek status Node.js:

```bash
pm2 status
pm2 logs shakeabsen
```

---

## Struktur Direktori Final

```
/home/<username>/public_html/
├── frontend/
│   ├── dist/              ← Document Root OpenLiteSpeed
│   └── ...
├── backend/
│   ├── dist/              ← Hasil build TypeScript
│   ├── .env               ← Konfigurasi produksi
│   └── ...
├── uploads/               ← File selfie & import
├── logs/                  ← Log PM2
├── ecosystem.config.js    ← PM2 config
└── deploy.sh              ← Script deploy
```

---

## Troubleshooting

### 502 Bad Gateway
- Node.js belum jalan: `pm2 start ecosystem.config.js`
- Port salah: pastikan `PORT=3001` di `.env` cocok dengan proxy

### File Upload Gagal
- Cek permission folder `uploads/`:
  ```bash
  chmod -R 755 uploads/
  chown -R <username>:<username> uploads/
  ```

### CORS Error
- Pastikan `CORS_ORIGIN` di `.env` berisi domain Anda
- Bisa multi-domain: `https://domain1.sch.id,https://domain2.sch.id`

### Database Connection Error
- Verifikasi `DATABASE_URL` di `.env`
- Cek apakah MySQL allow remote/local sesuai konfigurasi
