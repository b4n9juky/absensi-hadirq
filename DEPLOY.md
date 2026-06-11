# Panduan Deploy dengan Git

Alur: **Laptop → GitHub → CyberPanel**

```
Laptop (dev)
  ├── git add .
  ├── git commit -m "..."
  └── git push origin main

GitHub (remote)
  │
  ▼ (SSH)

CyberPanel
  ├── git pull origin main
  ├── npm run install:all
  ├── npm run build
  └── pm2 restart shakeabsen
```

---

## Pertama Kali (1x saja)

```bash
# 1. SSH ke server
ssh user@203.123.45.67

# 2. Masuk ke direktori website
cd /home/user/public_html

# 3. Clone repo
git clone https://github.com/username/shakeabsen.git .
# atau jika sudah ada: git pull origin main

# 4. Setup environment
cp backend/.env.example backend/.env
nano backend/.env
# Isi:
#   DATABASE_URL=mysql://user:pass@localhost:3306/absensi
#   CORS_ORIGIN=https://domain.sch.id
#   BETTER_AUTH_SECRET= <string acak 32+ karakter>
#   BETTER_AUTH_URL=https://domain.sch.id

# 5. Install & build
npm run install:all
npm run build

# 6. Database
npm run db:push
npm run db:seed

# 7. Jalankan dengan PM2
pm2 start ecosystem.config.js
pm2 save
```

## Update (setelah git push)

```bash
ssh user@server
cd /home/user/public_html

git pull origin main
npm run install:all
npm run build
pm2 restart shakeabsen
```

## Rollback

```bash
cd /home/user/public_html
git revert HEAD --no-edit
git push origin main
npm run install:all
npm run build
pm2 restart shakeabsen
```

## Catatan Penting

- **`.env` tidak ikut git** — aman. Hanya `.env.example` yang terpush sebagai template
- **`frontend/dist/` dan `backend/dist/`** — tidak ikut git, dibuild langsung di server
- **`agent-skills/`** — tidak ikut git (terdaftar di `.gitignore`)
