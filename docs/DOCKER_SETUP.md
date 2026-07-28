# Panduan Deploy Hadirq dengan Docker + Portainer

## Arsitektur

```
GitHub → Portainer (clone + build + deploy)

Container:
  ├── hadirq-db        (mysql:8.0)
  ├── hadirq-backend   (custom: Node.js API + frontend SPA)
  ├── hadirq-nginx     (custom: Nginx reverse proxy + SSL)
  └── hadirq-certbot   (certbot/certbot: auto-renew SSL)
```

## Deploy Awal di Portainer

### 1. Buat Stack Baru

- Portainer → **Stacks** → **Add stack**
- Pilih **Repository**
- Repository URL: `https://github.com/b4n9juky/absensi-hadirq.git`
- Compose path: `docker-compose.yml`
- Branch: `main`

### 2. Isi Environment Variables

| Variable | Contoh | Wajib |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | `Masterwong**123` | Ya |
| `DATABASE_URL` | `mysql://hadirq:hadirq123@db:3306/absensi` | Ya |
| `BETTER_AUTH_URL` | `https://absensi.mbu.sch.id` | Ya |
| `CORS_ORIGIN` | `https://absensi.mbu.sch.id` | Ya |
| `BETTER_AUTH_SECRET` | string acak 32+ karakter | Ya |
| `MYSQL_DATABASE` | `absensi` | Tidak (default) |
| `MYSQL_USER` | `hadirq` | Tidak (default) |
| `MYSQL_PASSWORD` | `hadirq123` | Tidak (default) |
| `SCHOOL_LATITUDE` | `-6.200000` | Tidak (default: 0) |
| `SCHOOL_LONGITUDE` | `106.816666` | Tidak (default: 0) |
| `KIOSK_SECRET_KEY` | `absensi123456` | Tidak (default) |

### 3. Deploy

Klik **Deploy the stack**. Portainer akan:
1. Clone repo ke `/data/compose/<id>/`
2. Build image backend (multi-stage: frontend + backend)
3. Build image nginx (custom dengan openssl + entrypoint)
4. Start container: db → backend → nginx + certbot

## Setelah Deploy

### 4. Jalankan Migrasi Database

```bash
sudo docker exec hadirq-backend node /app/backend/dist/db/migrate.js
```

### 5. Seed Data (Admin + Demo)

```bash
sudo docker exec hadirq-backend node /app/backend/dist/db/seed.js
```

### 6. Setup SSL Let's Encrypt

```bash
sudo docker run --rm \
  -v hadirq_certs_data:/etc/letsencrypt \
  -v hadirq_certbot_www:/var/www/certbot \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d absensi.mbu.sch.id \
  --email admin@mbu.sch.id \
  --agree-tos --no-eff-email --force-renewal
```

Reload nginx:

```bash
sudo docker exec hadirq-nginx nginx -s reload
```

### 7. Login

- URL: `https://absensi.mbu.sch.id`
- Email: `admin@school.com`
- Password: `adminPassword123`

## Update Aplikasi (Code Change → Deploy)

### Workflow Normal

```bash
# 1. Coding di laptop
git add .
git commit -m "fitur/perbaikan baru"
git push

# 2. Di Portainer → Stacks → klik stack → Update/Redeploy
#    Portainer otomatis: git pull → rebuild image → restart container
```

### Tipe Perubahan & Cara Deploy

| Perubahan | Cara |
|---|---|
| Kode backend/frontend (JS, TS, CSS) | Push → Portainer Redeploy |
| Konfigurasi Docker (Dockerfile, nginx.conf, compose) | Push → Portainer Redeploy |
| Environment variables | Edit di Portainer → Redeploy |
| Database schema (tabel/kolom baru) | Migrasi via Drizzle (lihat bawah) |
| File statis (gambar, template) | Via bind mount atau upload di app |

### Update Database Schema

Jika ada perubahan schema TypeScript, generate migration baru:

```bash
# Di laptop (butuh koneksi ke database)
cd backend
npx drizzle-kit generate

# Commit & push migration
git add drizzle/
git commit -m "add migration for ..."
git push
```

Jalankan migrasi di server:

```bash
# Via Portainer: Redeploy stack, lalu:
sudo docker exec hadirq-backend node /app/backend/dist/db/migrate.js
```

## Perintah Maintenance

```bash
# Logs
sudo docker logs hadirq-backend -f
sudo docker logs hadirq-nginx -f
sudo docker logs hadirq-db -f

# Restart container (tanpa rebuild)
sudo docker restart hadirq-backend
sudo docker restart hadirq-nginx

# Backup database
sudo docker exec -i hadirq-db mysqldump -u root -pMYSQL_ROOT_PASSWORD absensi > backup.sql

# Restore database
sudo docker exec -i hadirq-db mysql -u root -pMYSQL_ROOT_PASSWORD absensi < backup.sql

# Masuk ke container
sudo docker exec -it hadirq-backend sh
sudo docker exec -it hadirq-db mysql -u root -pMYSQL_ROOT_PASSWORD absensi

# Seed ulang (reset data)
sudo docker exec hadirq-backend node /app/backend/dist/db/seed.js
```

## Troubleshooting

### Container restart terus-menerus
```bash
sudo docker logs hadirq-nginx --tail 50
sudo docker logs hadirq-backend --tail 50
```

### Database tidak bisa diakses
Cek healthcheck:
```bash
sudo docker inspect hadirq-db --format '{{.State.Health.Status}}'
```

### SSL certificate error
```bash
# Cek cert ada atau tidak
sudo docker exec hadirq-nginx ls -la /etc/letsencrypt/live/

# Hapus & re-run certbot
sudo docker volume rm hadirq_certs_data
# Lalu ulangi langkah 6 (Setup SSL)
```

### Migration error (tabel/kolom sudah ada)
Gunakan `--force`:
```bash
sudo docker exec hadirq-backend sh -c "cd /app/backend && npx drizzle-kit push --force"
```

## Catatan Penting

1. Port MySQL (3306) dan Backend (3001) **tidak** terbuka ke publik — hanya via internal Docker network
2. SSL certificate otomatis di-renew setiap 12 jam oleh container certbot
3. Self-signed SSL fallback otomatis jika certbot belum jalan
4. Uploaded files tersimpan di volume `hadirq_uploads_data` (persisten)
5. Database tersimpan di volume `hadirq_db_data` (persisten)
