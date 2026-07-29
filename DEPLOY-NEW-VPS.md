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

## 4. Jalankan Stack

```bash
# Buat network dulu (jika belum ada)
docker network create hadirq-network 2>/dev/null || true

# Jalankan semua container
docker compose up -d

# Cek status
docker compose ps
```

## 5. Setup SSL (pertama kali)

```bash
# Hentikan dulu, jalankan certbot manual
docker compose stop nginx

# Request sertifikat
docker run --rm \
  -v certs_data:/etc/letsencrypt \
  -v certbot_www:/var/www/certbot \
  certbot/certbot certonly --standalone \
  -d domain-anda.com --non-interactive --agree-tos \
  -m email-anda@domain.com

# Jalankan ulang
docker compose up -d
```

## 6. Update Frontend Domain

Edit `nginx/nginx.conf`, ganti `server_name` dan path SSL certificate sesuai domain anda.

```bash
nano nginx/nginx.conf
# Cari & ganti absensi.mbu.sch.id → domain-anda.com
# Cari & ganti path SSL certificate

# Restart nginx setelah diedit
docker compose up -d --force-recreate nginx
```

## 7. Setup GitHub Container Registry (Optional)

Buat token di: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)

```bash
# Login ke GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u b4n9juky --password-stdin

# Pull image terbaru (lebih cepat dari build)
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

**Auto via GitHub Actions (jika sudah setup):**
Cukup push ke branch `main` → otomatis build & deploy.

## Troubleshoot

| Masalah | Solusi |
|---------|--------|
| Container restart terus | `docker logs hadirq-backend` untuk lihat error |
| DB connection refused | Pastikan `db` container sehat: `docker compose ps` |
| Permission denied mkdir | `docker exec -u root hadirq-backend chown -R hadirq:nodejs /app/backend/baileys_auth_info` |
| WhatsApp 405 error | Update Baileys: `npm install @whiskeysockets/baileys@latest` di container, lalu restart |
| SSL cert expired | `docker compose run certbot renew` lalu restart nginx |

## Struktur File

```
~/hadirq/
├── docker-compose.yml        # Stack utama
├── .env                      # Environment variables
├── backend/
│   ├── Dockerfile            # Production build
│   ├── Dockerfile.dev        # Development hot-reload
│   └── .env.example          # Template env
├── nginx/
│   ├── Dockerfile
│   ├── nginx.conf            # Konfigurasi domain
│   └── entrypoint.sh
└── .github/workflows/
    └── deploy.yml            # CI/CD otomatis
```
