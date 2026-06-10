# Changelog — Perbaikan Alur Login & Identifikasi Siswa

## Ringkasan Perubahan

Memperbaiki masalah siswa tidak bisa melakukan absensi karena profil siswa tidak ter-link dengan akun user. Solusi: tambah alur login email+password di Android dan fallback identifikasi siswa via NIS/deviceUUID di backend.

---

## File yang Dimodifikasi

### Backend — `backend/src/index.ts`

| Perubahan | Lokasi |
|-----------|--------|
| **Config endpoint**: tambah fallback `?device_uuid=` query param untuk lookup siswa | Baris 59-67 |
| **Attendance endpoint**: hapus `student_id` dari validasi payload wajib | Baris 162 |
| **Attendance endpoint**: tambah fallback NIS + deviceUUID di resolusi siswa | Baris 229-259 |

### Android — `app/src/main/java/com/example/data/api/PresensiApi.kt`

| Perubahan | Baris |
|-----------|-------|
| Import `@Body` untuk POST JSON | 4 |
| Method `signIn()` — POST ke `/api/auth/sign-in/email` | 17-20 |
| Data class `SignInRequest`, `SignInResponse`, `SignInUser` | 38-54 |

### Android — `app/src/main/java/com/example/data/AttendanceRepository.kt`

| Perubahan | Baris |
|-----------|-------|
| Import `SignInRequest` | 5 |
| Method `loginAndFetchConfig()` — login + config dalam satu fungsi | 91-143 |
| Config URL: tambah `?device_uuid=` query param | 86 |

### Android — `app/src/main/java/com/example/ui/PresensiViewModel.kt`

| Perubahan | Baris |
|-----------|-------|
| Sealed interface `LoginState` (Idle/Loading/Success/Error) | 33-38 |
| StateFlow `_loginState` | 73-74 |
| Method `loginToServer(serverIp, email, password)` | 142-161 |

### Android — `app/src/main/java/com/example/ui/DashboardScreen.kt`

| Perubahan | Baris |
|-----------|-------|
| Import `LoginState` | 52 |
| Observasi `loginState` dari ViewModel | 76 |
| Ganti `ServerSetupScreen` dengan `LoginScreen` | 258-263 |
| Hapus `ServerSetupScreen` composable (token-based) | — |
| Tambah `LoginScreen` composable (email + password) | 327-488 |

---

## Detail Perubahan

### 1. Alur Login Baru (Android)

**Sebelumnya:** Siswa memasukkan **Server IP** + **Token** manual.
**Sekarang:** Siswa memasukkan **Server IP** + **Email** + **Password**.

```
ServerSetupScreen (lama)         LoginScreen (baru)
┌──────────────────────┐        ┌──────────────────────┐
│ Server IP            │        │ Server IP            │
│ Token (****)         │        │ Email                │
│                      │        │ Password (****)      │
│ [AMBIL KONFIGURASI]  │        │ [MASUK & KONFIGURASI]│
└──────────────────────┘        └──────────────────────┘
```

### 2. Resolusi Siswa Saat Absensi (Backend)

Urutan lookup siswa di `POST /api/attendance`:

```
1. students.userId = authenticatedUserId
2. students.nis = student_id (dari payload, jika ada)
3. students.deviceUuid = device_uuid (dari payload)
```

**Auto-link** hanya jika `students.userId` masih NULL.
**Tolak** jika `userId` sudah terisi akun lain.

### 3. Config Endpoint (Backend)

`GET /api/config?device_uuid=xxx`

```
1. students.userId = authenticatedUserId
2. students.deviceUuid = device_uuid (dari query param)
```

Tidak ada auto-link di config endpoint (read-only).

---

## Alur Lengkap

```
1. Admin buat akun siswa (email + password) via panel web
2. Admin buat profil siswa (NIS) di panel web
       ↓
3. Siswa buka Android → masukkan Server IP + Email + Password
       ↓
4. POST /api/auth/sign-in/email → dapat Bearer token
        ↓
5. GET /api/config?device_uuid=xxx → dapat NIS, lokasi, radius
        ↓
6a. Role = "siswa" → App siap → step ReadyToShake
6b. Role = "guru" → GuruDashboardScreen (QR scanner)
        ↓
7. Siswa goyang HP → GPS check → selfie
        ↓
8. POST /api/attendance { device_uuid, lat, lon, acc, photo }
   ├─ userId cocok? → lanjut ke device binding check
   ├─ NIS cocok & userId null? → auto-link → lanjut
   ├─ deviceUuid cocok & userId null? → auto-link → lanjut
   └─ tidak cocok → ditolak
        ↓
9. Device binding check (jika deviceUuid masih null → binding otomatis)
10. Presensi masuk/keluar sesuai jadwal
```

---

## QR Attendance untuk Guru — 2026-06-09

### Ringkasan
Guru dapat melakukan absensi siswa dengan scan QR Code (NIS) menggunakan kamera HP.

### Backend — `backend/src/index.ts`
| Perubahan | Lokasi |
|-----------|--------|
| Endpoint `POST /api/attendance/qr` (auth `guru`) | Baris 432+ |
| Validasi NIS, lookup siswa, jadwal, check-in/checkout | — |
| Auto check-out jika sudah check-in di hari yang sama | — |
| Logika status PRESENT / LATE sama seperti endpoint siswa | — |

### Android — `gradle/libs.versions.toml`
| Perubahan | Baris |
|-----------|-------|
| Tambah `mlkitBarcodeScanning = "17.3.0"` | — |
| Tambah library `mlkit-barcode-scanning` | — |

### Android — `app/build.gradle.kts`
| Perubahan | Baris |
|-----------|-------|
| Tambah `implementation(libs.mlkit.barcode.scanning)` | — |

### Android — `app/.../api/PresensiApi.kt`
| Perubahan | Baris |
|-----------|-------|
| Method `scanAttendanceQr()` — POST ke `/api/attendance/qr` | — |
| Data class `QrAttendanceRequest(student_nis)` | — |

### Android — `app/.../data/AttendanceRepository.kt`
| Perubahan | Baris |
|-----------|-------|
| Method `scanQrAttendance()` — panggil API QR | — |
| Data class `LoginResult(setting, role, serverIp)` | — |
| Method `getUserRole()` / `saveUserRole()` — SharedPreferences | — |
| `loginAndFetchConfig()` terima role **guru** (tanpa fetch config) | — |

### Android — `app/.../ui/PresensiViewModel.kt`
| Perubahan | Baris |
|-----------|-------|
| Sealed interface `QrScanState` | — |
| StateFlow `_qrScanState`, `_userRole`, `_serverIp` | — |
| Method `scanQrCode(nis)` | — |
| Method `logout()` — reset state + SharedPreferences | — |
| Init: restore `userRole` dari SharedPreferences | — |

### Android — `app/.../ui/components/QrScannerView.kt` (BARU)
| Fitur | Keterangan |
|-------|------------|
| ML Kit `BarcodeScanning` + CameraX `ImageAnalysis` | — |
| Analisis real-time barcode dari back camera | — |
| Overlay panduan scan + error handling | — |

### Android — `app/.../ui/GuruDashboardScreen.kt` (BARU)
| Fitur | Keterangan |
|-------|------------|
| QrScannerView di bagian atas | — |
| Result dialog sukses/gagal setelah scan | — |
| Riwayat scan terbaru di bagian bawah | — |
| Tombol logout di top bar | — |

### Android — `app/.../ui/DashboardScreen.kt`
| Perubahan | Baris |
|-----------|-------|
| Observasi `userRole` dari ViewModel | — |
| Jika role = "guru" → tampilkan `GuruDashboardScreen` | — |
| Jika role = "siswa" → flow absensi normal (existing) | — |

### Alur QR Guru
```
1. Login dengan akun guru (email + password)
2. Role "guru" terdeteksi → GuruDashboardScreen
3. Arahkan kamera ke QR Code kartu siswa (berisi NIS)
4. ML Kit scan → POST /api/attendance/qr { student_nis }
5. Backend:
   ├─ Cari siswa by NIS
   ├─ Cek jadwal hari ini
   ├─ Jika sudah check-in → auto check-out
   ├─ Jika belum → check-in (PRESENT / LATE)
   └─ Response sukses/gagal → dialog
6. Riwayat scan ditampilkan di layar
```
```
