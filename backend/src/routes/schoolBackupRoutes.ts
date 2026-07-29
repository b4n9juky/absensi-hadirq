import { Router } from 'express';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware.js';

function parseConnectionUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname || 'localhost',
    port: parseInt(u.port || '3306'),
    user: decodeURIComponent(u.username || 'root'),
    password: decodeURIComponent(u.password || ''),
    database: u.pathname.replace(/^\//, '') || 'hadirq',
  };
}

function getSchoolDir(schoolId: number) {
  const dir = path.join(__dirname, '../../backups', `school_${schoolId}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export const schoolBackupRouter = Router();

schoolBackupRouter.use(authMiddleware);
schoolBackupRouter.use(requireRole(['admin']));

// List school backups
schoolBackupRouter.get('/schools/backups', async (req, res) => {
  try {
    const schoolId = req.context!.schoolId;
    if (!schoolId) return res.status(400).json({ success: false, error: 'Sekolah tidak teridentifikasi.' });

    const dir = getSchoolDir(schoolId);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort().reverse();
    const backups = files.map(f => {
      const stats = fs.statSync(path.join(dir, f));
      return { filename: f, size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB', createdAt: stats.mtime };
    });
    return res.json({ success: true, data: backups });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Gagal memuat daftar backup.' });
  }
});

// Create school backup
schoolBackupRouter.post('/schools/backups', async (req, res) => {
  let conn: mysql.Connection | null = null;
  try {
    const schoolId = req.context!.schoolId;
    if (!schoolId) return res.status(400).json({ success: false, error: 'Sekolah tidak teridentifikasi.' });

    const config = parseConnectionUrl(process.env.DATABASE_URL || 'mysql://root@localhost:3306/hadirq');
    conn = await mysql.createConnection({ host: config.host, port: config.port, user: config.user, password: config.password, database: config.database, multipleStatements: true });

    const dir = getSchoolDir(schoolId);
    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').replace(/\..+/, '');
    const filename = `backup-${timestamp}.sql`;
    const filePath = path.join(dir, filename);

    const schoolTables = [
      'academic_years', 'semesters', 'classes',
      'schedules', 'teaching_schedules', 'attendances',
      'subject_attendances', 'teaching_session_logs',
      'teacher_attendances', 'teacher_agendas', 'agenda_attendances',
      'subjects', 'settings', 'wa_sessions', 'notifications',
    ];

    let sql = `-- HadirQ School Backup\n-- School ID: ${schoolId}\n-- Generated: ${new Date().toISOString()}\n\nSET FOREIGN_KEY_CHECKS = 0;\n\n`;

    // Backup school record
    const [schoolRows] = await conn.query('SELECT * FROM schools WHERE id = ?', [schoolId]);
    const schoolData = schoolRows as any[];
    if (schoolData.length > 0) {
      sql += `TRUNCATE TABLE schools;\n`;
      const cols = Object.keys(schoolData[0]).map(c => `\`${c}\``).join(', ');
      const vals = Object.values(schoolData[0]).map(v => {
        if (v === null || v === undefined) return 'NULL';
        if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
        if (typeof v === 'number') return String(v);
        if (typeof v === 'boolean') return v ? '1' : '0';
        return `'${String(v).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
      }).join(', ');
      sql += `INSERT INTO schools (${cols}) VALUES (${vals});\n\n`;
    }

    // Backup users with this schoolId
    for (const tbl of ['user']) {
      const [rows] = await conn.query(`SELECT * FROM \`${tbl}\` WHERE school_id = ?`, [schoolId]);
      const data = rows as any[];
      if (data.length > 0) {
        const cols = Object.keys(data[0]).map(c => `\`${c}\``).join(', ');
        sql += `DELETE FROM \`${tbl}\` WHERE school_id = ${schoolId};\n`;
        for (const r of data) {
          const vals = Object.values(r).map(v => {
            if (v === null || v === undefined) return 'NULL';
            if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
            if (typeof v === 'number') return String(v);
            if (typeof v === 'boolean') return v ? '1' : '0';
            return `'${String(v).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
          }).join(', ');
          sql += `INSERT INTO \`${tbl}\` (${cols}) VALUES (${vals});\n`;
        }
        sql += '\n';
      }
    }

    // Backup students
    const [studRows] = await conn.query('SELECT * FROM students WHERE school_id = ?', [schoolId]);
    const studData = studRows as any[];
    if (studData.length > 0) {
      const cols = Object.keys(studData[0]).map(c => `\`${c}\``).join(', ');
      sql += `DELETE FROM students WHERE school_id = ${schoolId};\n`;
      for (const r of studData) {
        const vals = Object.values(r).map(v => {
          if (v === null || v === undefined) return 'NULL';
          if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
          if (typeof v === 'number') return String(v);
          if (typeof v === 'boolean') return v ? '1' : '0';
          return `'${String(v).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
        }).join(', ');
        sql += `INSERT INTO students (${cols}) VALUES (${vals});\n`;
      }
      sql += '\n';
    }

    // Backup school-scoped tables
    for (const tbl of schoolTables) {
      const [rows] = await conn.query(`SELECT * FROM \`${tbl}\` WHERE school_id = ?`, [schoolId]);
      const data = rows as any[];
      if (data.length > 0) {
        const cols = Object.keys(data[0]).map(c => `\`${c}\``).join(', ');
        sql += `DELETE FROM \`${tbl}\` WHERE school_id = ${schoolId};\n`;
        for (const r of data) {
          const vals = Object.values(r).map(v => {
            if (v === null || v === undefined) return 'NULL';
            if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
            if (typeof v === 'number') return String(v);
            if (typeof v === 'boolean') return v ? '1' : '0';
            return `'${String(v).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
          }).join(', ');
          sql += `INSERT INTO \`${tbl}\` (${cols}) VALUES (${vals});\n`;
        }
        sql += '\n';
      }
    }

    sql += 'SET FOREIGN_KEY_CHECKS = 1;\n';
    fs.writeFileSync(filePath, sql, 'utf8');

    const sizeMB = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);
    return res.json({ success: true, message: 'Backup sekolah berhasil.', data: { filename, size: `${sizeMB} MB` } });
  } catch (err: any) {
    console.error('[SchoolBackup] Error:', err);
    return res.status(500).json({ success: false, error: 'Gagal membuat backup: ' + err.message });
  } finally {
    if (conn) await conn.end();
  }
});

// Restore school backup
schoolBackupRouter.post('/schools/backups/:filename/restore', async (req, res) => {
  let conn: mysql.Connection | null = null;
  try {
    const schoolId = req.context!.schoolId;
    if (!schoolId) return res.status(400).json({ success: false, error: 'Sekolah tidak teridentifikasi.' });

    const filename = path.basename(req.params.filename);
    const filePath = path.join(getSchoolDir(schoolId), filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File backup tidak ditemukan.' });
    }

    const config = parseConnectionUrl(process.env.DATABASE_URL || 'mysql://root@localhost:3306/hadirq');
    conn = await mysql.createConnection({ host: config.host, port: config.port, user: config.user, password: config.password, database: config.database, multipleStatements: true });

    const sql = fs.readFileSync(filePath, 'utf8');
    await conn.query(sql);

    return res.json({ success: true, message: 'Restore data sekolah berhasil.' });
  } catch (err: any) {
    console.error('[SchoolRestore] Error:', err);
    return res.status(500).json({ success: false, error: 'Gagal restore: ' + err.message });
  } finally {
    if (conn) await conn.end();
  }
});

// Delete school backup
schoolBackupRouter.delete('/schools/backups/:filename', (req, res) => {
  try {
    const schoolId = req.context!.schoolId;
    if (!schoolId) return res.status(400).json({ success: false, error: 'Sekolah tidak teridentifikasi.' });

    const filename = path.basename(req.params.filename);
    const filePath = path.join(getSchoolDir(schoolId), filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File backup tidak ditemukan.' });
    }
    fs.unlinkSync(filePath);
    return res.json({ success: true, message: 'Backup berhasil dihapus.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Gagal menghapus backup.' });
  }
});

// Download school backup
schoolBackupRouter.get('/schools/backups/:filename/download', (req, res) => {
  try {
    const schoolId = req.context!.schoolId;
    if (!schoolId) return res.status(400).json({ success: false, error: 'Sekolah tidak teridentifikasi.' });

    const filename = path.basename(req.params.filename);
    const filePath = path.join(getSchoolDir(schoolId), filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File backup tidak ditemukan.' });
    }
    res.download(filePath, filename);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Gagal mengunduh backup.' });
  }
});
