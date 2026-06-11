#!/bin/bash
set -e

echo "=== ShakeAbsen Deploy Script ==="
echo ""

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js tidak ditemukan. Install Node.js terlebih dahulu."
    exit 1
fi
echo "[OK] Node.js $(node -v)"

# 2. Check PM2
if ! command -v pm2 &> /dev/null; then
    echo "[INFO] PM2 tidak ditemukan. Menginstall PM2 global..."
    npm install -g pm2
fi
echo "[OK] PM2 $(pm2 -v)"

# 3. Install dependencies
echo ""
echo ">>> Menginstall dependencies..."
cd "$(dirname "$0")"

echo "[Frontend] npm install..."
cd frontend && npm install && cd ..

echo "[Backend] npm install..."
cd backend && npm install && cd ..

# 4. Build
echo ""
echo ">>> Building aplikasi..."
echo "[Frontend] npm run build..."
cd frontend && npm run build && cd ..

echo "[Backend] npm run build..."
cd backend && npm run build && cd ..

# 5. Copy .env jika belum ada
if [ ! -f backend/.env ]; then
    echo ""
    echo "[WARN] backend/.env belum ada. Menyalin dari .env.example..."
    cp backend/.env.example backend/.env
    echo "EDIT dulu file backend/.env dengan konfigurasi yang benar!"
fi

# 6. Database migration
echo ""
echo ">>> Database migration..."
cd backend && npm run db:push && cd ..

# 7. Seed database (optional)
echo ""
echo ">>> Database seeding..."
cd backend && npm run db:seed && cd ..

# 8. Restart PM2
echo ""
echo ">>> Restart PM2..."

# Create logs directory
mkdir -p logs

if pm2 list | grep -q "shakeabsen"; then
    pm2 restart shakeabsen
else
    pm2 start ecosystem.config.js
fi

pm2 save

echo ""
echo "=== DEPLOY SELESAI ==="
echo "Cek status: pm2 status"
echo "Cek log: pm2 logs shakeabsen"
