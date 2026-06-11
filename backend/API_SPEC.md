# API Specification — ShakeAbsen

Base URL: `http://localhost:3001/api`

## Authentication

Better Auth with Bearer token. All endpoints (except `/api/auth/*`) require:

```
Authorization: Bearer <token>
```

### POST /api/auth/sign-in/email
Login with email & password.

**Request Body:**
```json
{ "email": "admin@school.com", "password": "..." }
```

**Response:**
```json
{ "token": "...", "user": { "id": "...", "name": "...", "email": "...", "role": "admin|guru|siswa" } }
```

## Attendance

### POST /api/attendance
Check-in / Check-out with GPS + selfie photo. `role: siswa`

**Request:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| photo | file | Selfie image (max 10MB, image/*) |
| student_id | string | NIS (used as fallback identity) |
| latitude | string | GPS latitude |
| longitude | string | GPS longitude |
| accuracy | string | GPS accuracy in meters |
| device_uuid | string | Unique device identifier |

### POST /api/attendance/qr
Check-in / Check-out via QR scan by teacher. `role: guru`

**Request Body:**
```json
{ "student_nis": "12345" }
```

## Configuration

### GET /api/config
Get mobile app sync configuration. `role: siswa|admin|guru`

**Query:** `?device_uuid=...` (optional fallback)

## Management CRUD

All endpoints below require `role: admin` unless noted.

### Users

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/users | List all users |
| POST | /api/users | Create user |
| PUT | /api/users/:id | Update user |
| DELETE | /api/users/:id | Delete user (checks student refs) |
| POST | /api/users/import | Import users from Excel (.xlsx) |

**POST /api/users** body:
```json
{ "name": "...", "email": "...", "password": "...", "role": "admin|guru|siswa" }
```

### Students

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/students | List all students |
| POST | /api/students | Create student |
| PUT | /api/students/:id | Update student |
| DELETE | /api/students/:id | Delete student (checks attendance refs) |
| PUT | /api/students/:id/reset-device | Reset device UUID binding |
| GET | /api/students/:id/qrcode | Get QR code image file |

**POST /api/students** body:
```json
{ "userId": "...", "nis": "12345", "classId": 1 }
```

### Classes

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/classes | List all classes |
| POST | /api/classes | Create class |
| PUT | /api/classes/:id | Update class |
| DELETE | /api/classes/:id | Delete class |

### Academic Years & Semesters

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/academic-years | List all academic years |
| POST | /api/academic-years | Create academic year |
| PUT | /api/academic-years/:id | Update academic year |
| DELETE | /api/academic-years/:id | Delete academic year |
| GET | /api/semesters | List all semesters |
| POST | /api/semesters | Create semester |
| PUT | /api/semesters/:id | Update semester |
| DELETE | /api/semesters/:id | Delete semester |

### Schedules

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/schedules | List all day schedules |
| PUT | /api/schedules/:id | Update schedule for a day |

**PUT /api/schedules/:id** body:
```json
{ "checkinStart": "07:00", "lateAfter": "07:15", "checkoutTime": "15:00" }
```

### Dashboard & Reports

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | /api/dashboard/stats | admin, guru | Attendance statistics |
| GET | /api/reports | admin, guru | Detailed reports |

**GET /api/dashboard/stats** query params:
- `date` — filter by date (YYYY-MM-DD)
- `month` — filter by month (1-12)
- `year` — filter by year
- `classId` — filter by class

### Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/settings | List all settings |
| PUT | /api/settings/:key | Update setting value |

## Error Response Format

```json
{ "success": false, "error": "Deskripsi error." }
```

## Success Response Format

```json
{ "success": true, "data": { ... } }
```

## Geofence Validation

Attendance endpoints validate:
- GPS accuracy ≤ `MAX_ACCURACY_METERS` (default: 30m)
- Distance from school ≤ `SCHOOL_RADIUS_METERS` (default: 50m)
- School coordinates: `SCHOOL_LATITUDE`, `SCHOOL_LONGITUDE`
