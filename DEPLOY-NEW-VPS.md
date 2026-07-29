# Deploy Hadirq ke VPS Baru

## Prasyarat

- VPS dengan **minimal 2GB RAM**, 10GB disk
- OS: Ubuntu 22.04+ atau Debian 12+
- Domain sudah指向 IP VPS (DNS A record)
- Port 80 & 443 terbuka di firewall

## 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Logout/login ulang atau jalankan: newgrp docker
```

## 2. Clone Project

```bash
git clone https://github.com/b4n9juky/absensi-hadirq.git ~/hadirq
cd ~/hadirq
```

## 3. Buat File .env

```bash
cp backend/.env.example .env
nano .env
```

Wajib diisi:
```
DATABASE_URL=mysql://hadirq:hadirq123@db:3306/absensi
CORS_ORIGIN=https://domain-anda.com
BETTER_AUTH_SECRET=buat-random-32-karakter
BETTER_AUTH_URL=https://domain-anda.com
```
Sisanya bisa dibiarkan default.

## 4. Update nginx.conf

Edit `nginx/nginx.conf`, ganti `server_name` dan path SSL certificate sesuai domain anda.

```bash
nano nginx/nginx.conf
# Cari & ganti absensi.mbu.sch.id → domain-anda.com
# Cari & ganti path SSL certificate
```

## 5. Jalankan Stack

```bash
docker compose up -d

# Cek status
docker compose ps
```

## 6. Setup SSL (pertama kali)

```bash
# Request sertifikat manual
docker run --rm \
  -v hadirq_certs_data:/etc/letsencrypt \
  -v hadirq_certbot_www:/var/www/certbot \
  certbot/certbot certonly --standalone \
  -d domain-anda.com --non-interactive --agree-tos \
  -m email-anda@domain.com

# Restart nginx setelah SSL terpasang
docker compose up -d --force-recreate nginx
```

---

## Multi-Instance (VPS Sama, Domain Beda)

Satu VPS bisa menjalankan **banyak instance Hadirq** untuk sekolah berbeda.

### Arsitektur

```
Domain A (sekolah1.sch.id)          Domain B (sekolah2.sch.id)
         │                                     │
         └───────── nginx (port 80/443) ────────┘
                       │               │
              backend:3001      backend-s2:3002
                       │               │
                  db:3306            db-s2:3306
              (db_data)          (db_data_s2)
```

Setiap instance punya database, uploads, dan auth WA terpisah.

### Langkah Instance ke-2

#### 1. Setup SSL domain baru

```bash
docker run --rm \
  -v hadirq_certs_data:/etc/letsencrypt \
  -v hadirq_certbot_www:/var/www/certbot \
  certbot/certbot certonly --standalone \
  -d sekolah2.sch.id --non-interactive --agree-tos \
  -m email-anda@domain.com
```

#### 2. Aktifkan server block di nginx.conf

Edit `nginx/nginx.conf`, uncomment bagian **Instance 2** yang sudah tersedia di template:

```nginx
server {
    listen 443 ssl;
    server_name sekolah2.sch.id;
    ssl_certificate     /etc/letsencrypt/live/sekolah2.sch.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sekolah2.sch.id/privkey.pem;
    # ... proxy_pass http://backend-s2:3002;
}
```

Restart nginx:
```bash
docker compose up -d nginx --force-recreate
```

#### 3. Buat .env untuk instance 2

```bash
cp .env.example.instance2 .env.instance2
nano .env.instance2
# Isi domain, secret, dan koordinat sekolah yang berbeda
```

#### 4. Jalankan instance 2

```bash
docker compose -f docker-compose.instance2.yml --env-file .env.instance2 up -d
```

#### 5. Verifikasi

```bash
# Cek kedua instance
docker compose ps
docker compose -f docker-compose.instance2.yml ps
```

Kedua instance berjalan parallel tanpa saling ganggu.

### Tambah Instance ke-3, 4, dst

1. Duplikat `docker-compose.instance2.yml` → `docker-compose.instance3.yml`
2. Ganti semua suffix `s2` → `s3`
3. Ubah `PORT=3002` → `PORT=3003`
4. Buat `.env.instance3`
5. Tambah server block di `nginx/nginx.conf` dengan `proxy_pass http://backend-s3:3003`
6. Jalankan: `docker compose -f docker-compose.instance3.yml --env-file .env.instance3 up -d`

---

## GitHub Container Registry (Optional)

Gunakan GHCR agar deploy lebih cepat (tanpa build di VPS):

```bash
# Generate token di GitHub → Settings → Developer settings → Personal access tokens
echo $GITHUB_TOKEN | docker login ghcr.io -u b4n9juky --password-stdin

# Pull, bukan build
docker compose pull backend
docker compose up -d --no-deps backend
```

## Update ke Versi Terbaru

**Manual:**
```bash
cd ~/hadirq
git pull
docker compose up -d --build
```

**Auto via GitHub Actions:**
Push ke branch `main` → otomatis build & deploy ke semua VPS yang terdaftar.

## Troubleshoot

| Masalah | Solusi |
|---------|--------|
| Container restart terus | `docker logs hadirq-backend` untuk lihat error |
| DB connection refused | Pastikan db container sehat: `docker compose ps` |
| Permission denied mkdir | Butuh rebuild image: `docker compose up -d --build` (Dockerfile terbaru sudah buat direktori) |
| WhatsApp 405 error | Update Baileys: `npm install @whiskeysockets/baileys@latest` di container, lalu restart |
| SSL cert expired | `docker compose run certbot renew` lalu restart nginx |
| Port bentrok | Setiap instance butuh PORT internal berbeda (3001, 3002, 3003, dst) |

## Struktur File

```
~/hadirq/
├── docker-compose.yml              # Stack instance 1
├── docker-compose.instance2.yml    # Stack instance 2
├── .env                            # Env instance 1
├── .env.instance2                  # Env instance 2
├── backend/.env.example            # Template env
├── backend/.env.example.instance2  # Template env instance 2
├── backend/Dockerfile              # Production build
├── nginx/
│   ├── Dockerfile
│   ├── nginx.conf                  # Semua domain di sini
│   └── entrypoint.sh
└── .github/workflows/
    └── deploy.yml                  # CI/CD otomatis
```
