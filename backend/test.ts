import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { eq } from 'drizzle-orm';
import { db } from './src/db/index.js';
import { attendances, academicYears, semesters } from './src/db/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loginAndGetHeaders(email: string, password: string): Promise<Record<string, string>> {
  const res = await fetch('http://localhost:3000/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:3000'
    },
    body: JSON.stringify({ email, password })
  });
  const data: any = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`Failed to login for ${email}: ${data.error?.message || data.message || 'Unknown error'}`);
  }
  return {
    'Authorization': `Bearer ${data.token}`
  };
}

async function runTests() {
  console.log('Clearing previous attendance records...');
  await db.delete(attendances);
  console.log('Cleared.');

  // 1. Retrieve role headers via sign-in
  console.log('\nLogging in test users to retrieve authorization contexts...');
  let adminHeaders: Record<string, string>;
  let guruHeaders: Record<string, string>;
  let siswaHeaders: Record<string, string>;

  try {
    adminHeaders = await loginAndGetHeaders('admin@school.com', 'adminPassword123');
    guruHeaders = await loginAndGetHeaders('guru@school.com', 'guruPassword123');
    siswaHeaders = await loginAndGetHeaders('siswa@school.com', 'siswaPassword123');
    console.log('Authentication contexts populated successfully.');
  } catch (err: any) {
    console.error('Fatal Authentication Error:', err.message);
    process.exit(1);
  }

  const dummyPath = path.join(__dirname, 'dummy.jpg');
  fs.writeFileSync(dummyPath, 'dummy photo content');

  const attendanceUrl = 'http://localhost:3000/api/attendance';

  async function sendRequest(label: string, fields: any, headers: Record<string, string>) {
    console.log(`\n--- ${label} ---`);
    
    const formData = new FormData();
    formData.append('student_id', fields.student_id);
    formData.append('latitude', fields.latitude);
    formData.append('longitude', fields.longitude);
    formData.append('accuracy', fields.accuracy);
    formData.append('device_uuid', fields.device_uuid);

    const fileBuffer = fs.readFileSync(dummyPath);
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
    formData.append('photo', blob, 'selfie.jpg');

    try {
      const response = await fetch(attendanceUrl, {
        method: 'POST',
        headers: headers,
        body: formData,
      });
      const data = await response.json();
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(data, null, 2));
    } catch (err: any) {
      console.error('Error executing request:', err.message);
    }
  }

  // ======================================
  // STARTING AUTH & RBAC VERIFICATION TESTS
  // ======================================
  console.log('\n======================================');
  console.log('STARTING AUTHENTICATION & RBAC TESTS');
  console.log('======================================');

  // Test Case A: Call attendance with NO headers (Unauthorized)
  console.log('\n--- Test A: Attendance Submission without Headers (Expects 401) ---');
  await sendRequest('ATTENDANCE - NO HEADERS', {
    student_id: 'SISWA-BTG-025',
    latitude: '0.144021',
    longitude: '117.473201',
    accuracy: '10.0',
    device_uuid: 'device-uuid-9842a-2849b',
  }, {});

  // Test Case B: Call attendance with Admin headers (Forbidden role - Admin is not a student)
  console.log('\n--- Test B: Attendance Submission with Admin Role (Expects 403) ---');
  await sendRequest('ATTENDANCE - ADMIN HEADERS', {
    student_id: 'SISWA-BTG-025',
    latitude: '0.144021',
    longitude: '117.473201',
    accuracy: '10.0',
    device_uuid: 'device-uuid-9842a-2849b',
  }, adminHeaders);

  // ======================================
  // STARTING MILESTONE 1 TESTS (STUDENT AUTH)
  // ======================================
  console.log('\n======================================');
  console.log('STARTING MILESTONE 1: STUDENT ATTENDANCE TESTS');
  console.log('======================================');

  // 1. Success Case - First entry of the day (Check-in)
  await sendRequest('TEST CASE 1: FIRST DAILY REQUEST (Absen Datang)', {
    student_id: 'SISWA-BTG-025',
    latitude: '0.144021',
    longitude: '117.473201',
    accuracy: '10.0',
    device_uuid: 'device-uuid-9842a-2849b',
  }, siswaHeaders);

  // 2. Success Case - Second entry of the day (Check-out)
  await sendRequest('TEST CASE 2: SECOND DAILY REQUEST (Absen Pulang)', {
    student_id: 'SISWA-BTG-025',
    latitude: '0.144021',
    longitude: '117.473201',
    accuracy: '10.0',
    device_uuid: 'device-uuid-9842a-2849b',
  }, siswaHeaders);

  // 3. Duplicate Case - Third daily request
  await sendRequest('TEST CASE 3: DUPLICATE DAILY REQUEST (Absen Pulang Ulang)', {
    student_id: 'SISWA-BTG-025',
    latitude: '0.144021',
    longitude: '117.473201',
    accuracy: '10.0',
    device_uuid: 'device-uuid-9842a-2849b',
  }, siswaHeaders);

  // Run Milestone 2 tests
  await runMilestone2Tests(adminHeaders, siswaHeaders);

  // Run Milestone 3 tests
  await runMilestone3Tests(adminHeaders, guruHeaders, siswaHeaders);

  // Run Milestone 4 tests
  await runMilestone4Tests(adminHeaders, guruHeaders, siswaHeaders);

  if (fs.existsSync(dummyPath)) {
    fs.unlinkSync(dummyPath);
  }
  console.log('\nTest suite finished and local dummy files cleaned.');
}

async function runMilestone2Tests(adminHeaders: Record<string, string>, siswaHeaders: Record<string, string>) {
  console.log('\n======================================');
  console.log('STARTING MILESTONE 2: CRUD API TESTS');
  console.log('======================================');

  const baseUrl = 'http://localhost:3000/api';

  // Test Case C: Access admin endpoint with Student headers (Forbidden)
  console.log('\n--- Test C: Get Academic Years using Siswa Credentials (Expects 403) ---');
  let res = await fetch(`${baseUrl}/academic-years`, {
    headers: siswaHeaders
  });
  console.log('GET /academic-years (siswa role) status:', res.status);
  let data: any = await res.json();
  console.log('GET /academic-years (siswa role) response:', JSON.stringify(data, null, 2));

  // --- ACADEMIC YEARS ---
  console.log('\n--- 1. Get Academic Years (Admin Role) ---');
  res = await fetch(`${baseUrl}/academic-years`, {
    headers: adminHeaders
  });
  data = await res.json();
  console.log('GET /academic-years status:', res.status);
  console.log('GET /academic-years length:', data.data?.length);

  console.log('\n--- 2. Create Academic Year (Success) ---');
  res = await fetch(`${baseUrl}/academic-years`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ name: '2026/2027', isActive: false })
  });
  data = await res.json();
  console.log('POST /academic-years status:', res.status);
  console.log('POST /academic-years response:', JSON.stringify(data, null, 2));
  const newYearId = data.data?.id;

  console.log('\n--- 3. Create Academic Year (Fail - empty name) ---');
  res = await fetch(`${baseUrl}/academic-years`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ name: '', isActive: false })
  });
  data = await res.json();
  console.log('POST /academic-years empty name status:', res.status);
  console.log('POST /academic-years empty name response:', JSON.stringify(data, null, 2));

  if (newYearId) {
    console.log('\n--- 4. Activate Academic Year ---');
    res = await fetch(`${baseUrl}/academic-years/${newYearId}/activate`, {
      method: 'PUT',
      headers: adminHeaders
    });
    data = await res.json();
    console.log('PUT /academic-years/:id/activate status:', res.status);
    console.log('PUT /academic-years/:id/activate response:', JSON.stringify(data, null, 2));
    
    // Verify it is active and others are inactive
    res = await fetch(`${baseUrl}/academic-years`, {
      headers: adminHeaders
    });
    data = await res.json();
    const activeYears = data.data.filter((y: any) => y.isActive);
    console.log('Active academic years count:', activeYears.length);
    console.log('Active academic year name:', activeYears[0]?.name);
  }

  // --- SEMESTERS ---
  console.log('\n--- 5. Get Semesters ---');
  res = await fetch(`${baseUrl}/semesters`, {
    headers: adminHeaders
  });
  data = await res.json();
  console.log('GET /semesters status:', res.status);
  console.log('GET /semesters length:', data.data?.length);

  if (newYearId) {
    console.log('\n--- 6. Create Semester (Success) ---');
    res = await fetch(`${baseUrl}/semesters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({ academicYearId: newYearId, name: 'Genap', isActive: false })
    });
    data = await res.json();
    console.log('POST /semesters status:', res.status);
    console.log('POST /semesters response:', JSON.stringify(data, null, 2));
    const newSemId = data.data?.id;

    console.log('\n--- 7. Create Semester (Fail - invalid year ID) ---');
    res = await fetch(`${baseUrl}/semesters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({ academicYearId: 99999, name: 'Ganjil', isActive: false })
    });
    data = await res.json();
    console.log('POST /semesters invalid year status:', res.status);
    console.log('POST /semesters invalid year response:', JSON.stringify(data, null, 2));

    if (newSemId) {
      console.log('\n--- 8. Activate Semester ---');
      res = await fetch(`${baseUrl}/semesters/${newSemId}/activate`, {
        method: 'PUT',
        headers: adminHeaders
      });
      data = await res.json();
      console.log('PUT /semesters/:id/activate status:', res.status);
      console.log('PUT /semesters/:id/activate response:', JSON.stringify(data, null, 2));

      // Verify it is active and others are inactive in that year
      res = await fetch(`${baseUrl}/semesters`, {
        headers: adminHeaders
      });
      data = await res.json();
      const activeSemsInNewYear = data.data.filter((s: any) => s.academicYearId === newYearId && s.isActive);
      console.log('Active semesters count in year 2026/2027:', activeSemsInNewYear.length);
      console.log('Active semester name:', activeSemsInNewYear[0]?.name);
    }
  }

  // --- SCHEDULES ---
  console.log('\n--- 9. Get Schedules ---');
  res = await fetch(`${baseUrl}/schedules`, {
    headers: adminHeaders
  });
  data = await res.json();
  console.log('GET /schedules status:', res.status);
  console.log('GET /schedules count:', data.data?.length);
  const firstSchedule = data.data?.[0];

  if (firstSchedule) {
    const schedId = firstSchedule.id;
    console.log(`\n--- 10. Update Schedule (Fail - checkinStart >= lateAfter) ---`);
    res = await fetch(`${baseUrl}/schedules/${schedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({
        checkinStart: '08:00:00',
        lateAfter: '07:30:00',
        checkoutTime: '13:00:00'
      })
    });
    data = await res.json();
    console.log('PUT /schedules fail status:', res.status);
    console.log('PUT /schedules fail response:', JSON.stringify(data, null, 2));

    console.log(`\n--- 11. Update Schedule (Fail - lateAfter >= checkoutTime) ---`);
    res = await fetch(`${baseUrl}/schedules/${schedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({
        checkinStart: '06:00:00',
        lateAfter: '14:00:00',
        checkoutTime: '13:00:00'
      })
    });
    data = await res.json();
    console.log('PUT /schedules fail status 2:', res.status);
    console.log('PUT /schedules fail response 2:', JSON.stringify(data, null, 2));

    console.log(`\n--- 12. Update Schedule (Fail - invalid time format) ---`);
    res = await fetch(`${baseUrl}/schedules/${schedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({
        checkinStart: '06:00',
        lateAfter: '07:30:00',
        checkoutTime: '13:00:00'
      })
    });
    data = await res.json();
    console.log('PUT /schedules invalid time status:', res.status);
    console.log('PUT /schedules invalid time response:', JSON.stringify(data, null, 2));

    console.log(`\n--- 13. Update Schedule (Success) ---`);
    res = await fetch(`${baseUrl}/schedules/${schedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({
        checkinStart: '06:15:00',
        lateAfter: '07:45:00',
        checkoutTime: '13:15:00'
      })
    });
    data = await res.json();
    console.log('PUT /schedules success status:', res.status);
    console.log('PUT /schedules success response:', JSON.stringify(data, null, 2));

    // Restore schedule back to original for normal operations
    await fetch(`${baseUrl}/schedules/${schedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({
        checkinStart: firstSchedule.checkinStart,
        lateAfter: firstSchedule.lateAfter,
        checkoutTime: firstSchedule.checkoutTime
      })
    });
    console.log('Restored original schedule parameters.');
  }

  // Restore active status of year and semester
  res = await fetch(`${baseUrl}/academic-years`, {
    headers: adminHeaders
  });
  data = await res.json();
  const year2025 = data.data.find((y: any) => y.name === '2025/2026');
  if (year2025) {
    await fetch(`${baseUrl}/academic-years/${year2025.id}/activate`, { method: 'PUT', headers: adminHeaders });
    console.log('Restored active academic year to 2025/2026.');
  }
  res = await fetch(`${baseUrl}/semesters`, {
    headers: adminHeaders
  });
  data = await res.json();
  const semesterGanjil = data.data.find((s: any) => s.name === 'Ganjil' && s.academicYearId === year2025?.id);
  if (semesterGanjil) {
    await fetch(`${baseUrl}/semesters/${semesterGanjil.id}/activate`, { method: 'PUT', headers: adminHeaders });
    console.log('Restored active semester to Ganjil.');
  }

  if (newYearId) {
    // Delete test semester first
    await db.delete(semesters).where(eq(semesters.academicYearId, newYearId));
    // Then delete test academic year
    await db.delete(academicYears).where(eq(academicYears.id, newYearId));
    console.log('Cleaned up test academic year and semesters from DB.');
  }

  console.log('\n======================================');
  console.log('FINISHED MILESTONE 2: CRUD API TESTS');
  console.log('======================================');
}

async function runMilestone3Tests(
  adminHeaders: Record<string, string>,
  guruHeaders: Record<string, string>,
  siswaHeaders: Record<string, string>
) {
  console.log('\n======================================');
  console.log('STARTING MILESTONE 3: ADMIN DASHBOARD TESTS');
  console.log('======================================');

  const baseUrl = 'http://localhost:3000/api';

  // Test Case D: Access dashboard endpoint with Student headers (Forbidden)
  console.log('\n--- Test D: Get Dashboard using Student Credentials (Expects 403) ---');
  let res = await fetch(`${baseUrl}/dashboard/stats`, {
    headers: siswaHeaders
  });
  console.log('GET /dashboard/stats (siswa role) status:', res.status);
  let data: any = await res.json();
  console.log('GET /dashboard/stats (siswa role) response:', JSON.stringify(data, null, 2));

  // --- 1. GET stats without filters using Guru context (should default to today) ---
  console.log('\n--- 1. Get Stats (Default Today - Guru Role) ---');
  res = await fetch(`${baseUrl}/dashboard/stats`, {
    headers: guruHeaders
  });
  data = await res.json();
  console.log('GET /dashboard/stats status:', res.status);
  console.log('GET /dashboard/stats response:', JSON.stringify(data, null, 2));

  // --- 2. GET stats with class filter ---
  console.log('\n--- 2. Get Stats with Class Filter (classId = 1) ---');
  res = await fetch(`${baseUrl}/dashboard/stats?classId=1`, {
    headers: guruHeaders
  });
  data = await res.json();
  console.log('GET /dashboard/stats?classId=1 status:', res.status);
  console.log('GET /dashboard/stats?classId=1 response:', JSON.stringify(data, null, 2));

  // --- 3. GET stats with class filter for non-existent class ---
  console.log('\n--- 3. Get Stats with Non-Existent Class Filter (classId = 99999) ---');
  res = await fetch(`${baseUrl}/dashboard/stats?classId=99999`, {
    headers: guruHeaders
  });
  data = await res.json();
  console.log('GET /dashboard/stats?classId=99999 status:', res.status);
  console.log('GET /dashboard/stats?classId=99999 response:', JSON.stringify(data, null, 2));

  // --- 4. GET stats with specific date filter ---
  const serverTime = new Date();
  const localYear = serverTime.getFullYear();
  const localMonth = String(serverTime.getMonth() + 1).padStart(2, '0');
  const localDay = String(serverTime.getDate()).padStart(2, '0');
  const todayStr = `${localYear}-${localMonth}-${localDay}`;

  console.log(`\n--- 4. Get Stats with Date Filter (date = ${todayStr}) ---`);
  res = await fetch(`${baseUrl}/dashboard/stats?date=${todayStr}`, {
    headers: guruHeaders
  });
  data = await res.json();
  console.log(`GET /dashboard/stats?date=${todayStr} status:`, res.status);
  console.log(`GET /dashboard/stats?date=${todayStr} response:`, JSON.stringify(data, null, 2));

  // --- 5. GET stats with month and year filter ---
  console.log(`\n--- 5. Get Stats with Month and Year (month = ${localMonth}, year = ${localYear}) ---`);
  res = await fetch(`${baseUrl}/dashboard/stats?month=${parseInt(localMonth)}&year=${localYear}`, {
    headers: guruHeaders
  });
  data = await res.json();
  console.log(`GET /dashboard/stats?month=${parseInt(localMonth)}&year=${localYear} status:`, res.status);
  console.log(`GET /dashboard/stats?month=${parseInt(localMonth)}&year=${localYear} response:`, JSON.stringify(data, null, 2));

  // --- 6. GET stats error cases - invalid date format ---
  console.log('\n--- 6. Get Stats (Fail - invalid date format) ---');
  res = await fetch(`${baseUrl}/dashboard/stats?date=2026/06/08`, {
    headers: guruHeaders
  });
  data = await res.json();
  console.log('GET /dashboard/stats invalid date status:', res.status);
  console.log('GET /dashboard/stats invalid date response:', JSON.stringify(data, null, 2));

  // --- 7. GET stats error cases - invalid month ---
  console.log('\n--- 7. Get Stats (Fail - invalid month > 12) ---');
  res = await fetch(`${baseUrl}/dashboard/stats?month=13`, {
    headers: guruHeaders
  });
  data = await res.json();
  console.log('GET /dashboard/stats invalid month status:', res.status);
  console.log('GET /dashboard/stats invalid month response:', JSON.stringify(data, null, 2));

  console.log('\n======================================');
  console.log('FINISHED MILESTONE 3: ADMIN DASHBOARD TESTS');
  console.log('======================================');
}

async function runMilestone4Tests(
  adminHeaders: Record<string, string>,
  guruHeaders: Record<string, string>,
  siswaHeaders: Record<string, string>
) {
  console.log('\n======================================');
  console.log('STARTING MILESTONE 4: REPORTS API TESTS');
  console.log('======================================');

  const baseUrl = 'http://localhost:3000/api';

  // --- 1. GET reports without filters (all records - Guru Role) ---
  console.log('\n--- 1. Get Reports (All records - Guru Role) ---');
  let res = await fetch(`${baseUrl}/reports/attendance`, {
    headers: guruHeaders
  });
  let data: any = await res.json();
  console.log('GET /reports/attendance status:', res.status);
  console.log('GET /reports/attendance length:', data.data?.length);
  if (data.data?.length > 0) {
    console.log('GET /reports/attendance first row:', JSON.stringify(data.data[0], null, 2));
  }

  // --- 2. GET reports per student ---
  console.log('\n--- 2. Get Reports (Per Student: nis = SISWA-BTG-025) ---');
  res = await fetch(`${baseUrl}/reports/attendance?nis=SISWA-BTG-025`, {
    headers: guruHeaders
  });
  data = await res.json();
  console.log('GET /reports/attendance?nis=... status:', res.status);
  console.log('GET /reports/attendance?nis=... length:', data.data?.length);

  // --- 3. GET reports per class ---
  console.log('\n--- 3. Get Reports (Per Class: classId = 1) ---');
  res = await fetch(`${baseUrl}/reports/attendance?classId=1`, {
    headers: guruHeaders
  });
  data = await res.json();
  console.log('GET /reports/attendance?classId=1 status:', res.status);
  console.log('GET /reports/attendance?classId=1 length:', data.data?.length);

  // --- 4. GET reports per specific date ---
  const serverTime = new Date();
  const localYear = serverTime.getFullYear();
  const localMonth = String(serverTime.getMonth() + 1).padStart(2, '0');
  const localDay = String(serverTime.getDate()).padStart(2, '0');
  const todayStr = `${localYear}-${localMonth}-${localDay}`;

  console.log(`\n--- 4. Get Reports (Per Date: date = ${todayStr}) ---`);
  res = await fetch(`${baseUrl}/reports/attendance?date=${todayStr}`, {
    headers: guruHeaders
  });
  data = await res.json();
  console.log(`GET /reports/attendance?date=${todayStr} status:`, res.status);
  console.log(`GET /reports/attendance?date=${todayStr} length:`, data.data?.length);

  // --- 5. GET reports per month ---
  console.log(`\n--- 5. Get Reports (Per Month: month = ${localMonth}, year = ${localYear}) ---`);
  res = await fetch(`${baseUrl}/reports/attendance?month=${parseInt(localMonth)}&year=${localYear}`, {
    headers: guruHeaders
  });
  data = await res.json();
  console.log(`GET /reports/attendance?month=${parseInt(localMonth)}&year=${localYear} status:`, res.status);
  console.log(`GET /reports/attendance?month=${parseInt(localMonth)}&year=${localYear} length:`, data.data?.length);

  // --- 6. GET reports per semester ---
  console.log('\n--- 6. Get Reports (Per Semester: semesterId = 1) ---');
  res = await fetch(`${baseUrl}/reports/attendance?semesterId=1`, {
    headers: guruHeaders
  });
  data = await res.json();
  console.log('GET /reports/attendance?semesterId=1 status:', res.status);
  console.log('GET /reports/attendance?semesterId=1 length:', data.data?.length);

  // --- 7. GET reports error cases - invalid date ---
  console.log('\n--- 7. Get Reports (Fail - invalid date format) ---');
  res = await fetch(`${baseUrl}/reports/attendance?date=2026/06/08`, {
    headers: guruHeaders
  });
  data = await res.json();
  console.log('GET /reports/attendance invalid date status:', res.status);
  console.log('GET /reports/attendance invalid date response:', JSON.stringify(data, null, 2));

  console.log('\n======================================');
  console.log('FINISHED MILESTONE 4: REPORTS API TESTS');
  console.log('======================================');
}

runTests();
