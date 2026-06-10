import * as XLSX from 'xlsx';

export interface ExcelUserRow {
  name: string;
  email: string;
  role: string;
}

export interface ParseResult {
  rows: ExcelUserRow[];
  errors: { row: number; email: string; error: string }[];
}

const VALID_ROLES = ['admin', 'guru', 'siswa'];

export function parseExcelUserFile(filePath: string): ParseResult {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('File Excel tidak memiliki sheet.');
  }

  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });

  if (rawData.length === 0) {
    throw new Error('File Excel kosong.');
  }

  const header = Object.keys(rawData[0]).map((k) => k.toLowerCase().trim());
  const hasName = header.includes('name') || header.includes('nama');
  const hasEmail = header.includes('email') || header.includes('email');
  const hasRole = header.includes('role') || header.includes('peran') || header.includes('role');

  if (!hasName || !hasEmail || !hasRole) {
    throw new Error(
      'Format kolom tidak sesuai. File harus memiliki kolom: Name/Nama, Email, Role/Peran.'
    );
  }

  const nameKey = header.find((k) => k === 'name' || k === 'nama')!;
  const emailKey = header.find((k) => k === 'email')!;
  const roleKey = header.find((k) => k === 'role' || k === 'peran')!;

  const rows: ExcelUserRow[] = [];
  const errors: { row: number; email: string; error: string }[] = [];

  for (let i = 0; i < rawData.length; i++) {
    const item = rawData[i];
    const name = String(item[nameKey] || '').trim();
    const email = String(item[emailKey] || '').trim();
    const role = String(item[roleKey] || '').trim().toLowerCase();

    const rowNum = i + 2;

    if (!name) {
      errors.push({ row: rowNum, email, error: 'Nama tidak boleh kosong.' });
      continue;
    }
    if (!email) {
      errors.push({ row: rowNum, email, error: 'Email tidak boleh kosong.' });
      continue;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row: rowNum, email, error: 'Format email tidak valid.' });
      continue;
    }
    if (!role) {
      errors.push({ row: rowNum, email, error: 'Role tidak boleh kosong.' });
      continue;
    }
    if (!VALID_ROLES.includes(role)) {
      errors.push({
        row: rowNum,
        email,
        error: `Role "${role}" tidak valid. Harus: admin, guru, atau siswa.`,
      });
      continue;
    }

    rows.push({ name, email, role });
  }

  return { rows, errors };
}
