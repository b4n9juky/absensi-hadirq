# Migrasi: whatsapp-web.js → @whiskeysockets/baileys

## Overview

Migrasi dari WhatsApp Web JS (Puppeteer/Chromium) ke Baileys (WebSocket murni) untuk mengurangi risiko banned/deteksi oleh WhatsApp dan menurunkan penggunaan resource.

## Files Berubah

| File | Tindakan |
|------|----------|
| `backend/package.json` | Ganti dependency |
| `backend/src/services/waService.ts` | Tulis ulang total |
| `backend/src/db/schema.ts` | Mungkin perlu penyesuaian kolom `sessionData` |

## Files Tidak Berubah

| File | Alasan |
|------|--------|
| `backend/src/routes/waRoutes.ts` | Method signatures identik |
| `backend/src/services/notificationService.ts` | Panggil `sendMessageSafe()` saja |
| `backend/src/services/kioskService.ts` | Lewat notificationService |
| `backend/src/services/attendanceService.ts` | Lewat notificationService |
| `frontend/src/components/sections/WhatsAppSection.tsx` | API response identik |
| `backend/src/index.ts` | Route mount sama |

## Langkah-Langkah

### 1. Update `package.json`

**Hapus:**
- `whatsapp-web.js`
- `puppeteer-extra`
- `puppeteer-extra-plugin-stealth`

**Tambah:**
- `@whiskeysockets/baileys` (^6.7.x)
- `@hapi/boom` (^10.x)

Jalankan `npm install` setelahnya.

### 2. Update `waSessions` schema (`db/schema.ts`)

Tidak perlu kolom baru. `sessionData` akan menyimpan JSON:
```json
{
  "creds": { ... },
  "keys": { ... }
}
```

### 3. Tulis ulang `waService.ts`

Mapping perubahan event dan method:

| Sebelum (wwebjs) | Sesudah (Baileys) |
|---|---|
| `new Client({ authStrategy: new LocalAuth() })` | `makeWASocket({ auth: { creds, keys } })` |
| `client.on('qr', cb)` | `sock.ev.on('connection.update', ({qr}) => {})` |
| `client.on('ready', cb)` | `connection === 'open'` |
| `client.on('disconnected', cb)` | `connection === 'close'` + cek `DisconnectReason` |
| `client.on('auth_failure', cb)` | `DisconnectReason.loggedOut` |
| `client.on('change_state', cb)` | Hapus — pakai `connection.update` |
| `client.sendMessage(jid, msg)` | `sock.sendMessage(jid, { text: msg })` |
| JID: `62812xxx@c.us` | JID: `62812xxx@s.whatsapp.net` |
| `client.destroy()` | `sock.ws.close()` + remove listeners |

Detail tambahan:
- **Pairing code**: Alternatif QR — cukup kode 6 digit, cocok untuk server tanpa display.
- **Auto-reconnect**: Bedakan `DisconnectReason.loggedOut` (401 → perlu re-scan) vs lainnya (auto reconnect).
- **Storage**: Pakai `useMultiFileAuthState()` atau custom DB-backed auth store.
- **Session cleanup**: Hapus folder `.wwebjs_auth/` tidak lagi diperlukan.

### 4. Hapus cache Puppeteer (opsional)

Setelah migrasi, hapus folder `.wwebjs_auth/` jika ada, dan `node_modules/puppeteer` + Chromium untuk hemat ~300MB disk.

### 5. Test

1. `npm install`
2. `npm run dev`
3. Test endpoint `/api/wa/init` — QR/pairing muncul
4. Scan QR / masukkan pairing code
5. Test `/api/wa/status` — connected: true
6. Kirim test message via `/api/wa/send` (jika ada)
7. Test `/api/wa/disconnect` — session terhapus
8. Verifikasi notifikasi attendance tetap terkirim (check-in/check-out)

## Event Flow Baileys

```
initialize()
  │
  ├─ Load session dari DB/file
  ├─ makeWASocket(...)
  │
  ├─ connection.update: { qr }        → generate QR (atau pairing code)
  ├─ connection.update: "open"        → markConnected(), saveSession()
  ├─ connection.update: "close"       →
  │    ├─ loggedOut?                  → clearSession(), minta scan ulang
  │    └─ lainnya?                    → auto-reconnect (5 detik)
  │
  └─ creds.update                     → saveCreds()
```

## Catatan Penting

- **JID `@s.whatsapp.net`** — critical. Pastikan tidak ada kode lain yang masih pakai `@c.us`.
- **`@hapi/boom`** — diperlukan karena Baileys menggunakan Boom untuk disconnect reason (cast `lastDisconnect.error`).
- **Rate limiting** — tambahkan random delay antar pesan (300ms-2s) untuk menghindari banned.
- **`useMultiFileAuthState`** — buat folder `baileys_auth_info/`. Bisa dialihkan ke DB di kemudian hari.
- **Pairing code** — gunakan `sock.requestPairingCode(phoneNumber)` untuk pairing tanpa QR.

## Rollback

Jika migrasi gagal, kembalikan ke kondisi semula:
1. `git checkout -- backend/package.json backend/src/services/waService.ts`
2. `npm install`
3. Hapus folder `baileys_auth_info/`
