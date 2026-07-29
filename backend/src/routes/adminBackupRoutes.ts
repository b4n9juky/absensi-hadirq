import { Router } from 'express';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware.js';

const BACKUP_DIR = path.join(__dirname, '../../backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function parseConnectionUrl(url: string) {
  const { URL } = require('url');
  const u = new URL(url);
  return {
    host: u.hostname || 'localhost',
    port: parseInt(u.port || '3306'),
    user: decodeURIComponent(u.username || 'root'),
    password: decodeURIComponent(u.password || ''),
    database: u.pathname.replace(/^\//, '') || 'hadirq',
  };
}

// List backups
async function getBackups() {
  ensureBackupDir();
  const files = fs.readdirSync(BACKUP_DIR);
  const backupFiles = files.filter(f => f.endsWith('.sql')).sort().reverse();
  return backupFiles.map(f => {
    const stats = fs.statSync(path.join(BACKUP_DIR, f));
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    return {
      filename: f,
      size: `${sizeMB} MB`,
      createdAt: stats.mtime,
    };
  });
}

export const adminBackupRouter = Router();

adminBackupRouter.use(authMiddleware);
adminBackupRouter.use(requireRole(['super_admin']));

// List backups
adminBackupRouter.get('/backups', async (_req, res) => {
  try {
    const backups = await getBackups();
    return res.json({ success: true, data: backups });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Gagal memuat daftar backup.' });
  }
});

// Create backup
adminBackupRouter.post('/backups', async (_req, res) => {
  let conn: mysql.Connection | null = null;
  try {
    ensureBackupDir();
    const config = parseConnectionUrl(process.env.DATABASE_URL || 'mysql://root@localhost:3306/hadirq');
    conn = await mysql.createConnection({ host: config.host, port: config.port, user: config.user, password: config.password, database: config.database, multipleStatements: true });

    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').replace(/\..+/, '');
    const filename = `backup-${timestamp}.sql`;
    const filePath = path.join(BACKUP_DIR, filename);

    const [tables] = await conn.query('SHOW TABLES');
    const tableRows = tables as any[];

    let sql = `-- HadirQ Database Backup\n-- Generated: ${new Date().toISOString()}\n-- Database: ${config.database}\n\nSET FOREIGN_KEY_CHECKS = 0;\n\n`;

    for (const row of tableRows) {
      const tableName = Object.values(row)[0] as string;
      sql += `-- Table: ${tableName}\n`;
      sql += `TRUNCATE TABLE \`${tableName}\`;\n`;

      const [rows] = await conn.query(`SELECT * FROM \`${tableName}\``);
      const data = rows as any[];

      if (data.length > 0) {
        const columns = Object.keys(data[0]).map(c => `\`${c}\``).join(', ');
        for (const record of data) {
          const values = Object.values(record).map(v => {
            if (v === null || v === undefined) return 'NULL';
            if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
            if (typeof v === 'number') return String(v);
            if (typeof v === 'boolean') return v ? '1' : '0';
            const escaped = String(v).replace(/'/g, "''").replace(/\\/g, '\\\\');
            return `'${escaped}'`;
          }).join(', ');
          sql += `INSERT INTO \`${tableName}\` (${columns}) VALUES (${values});\n`;
        }
      }
      sql += '\n';
    }

    sql += 'SET FOREIGN_KEY_CHECKS = 1;\n';
    fs.writeFileSync(filePath, sql, 'utf8');

    const sizeMB = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);
    return res.json({ success: true, message: 'Backup berhasil dibuat.', data: { filename, size: `${sizeMB} MB` } });
  } catch (err: any) {
    console.error('[Backup] Error:', err);
    return res.status(500).json({ success: false, error: 'Gagal membuat backup: ' + err.message });
  } finally {
    if (conn) await conn.end();
  }
});

// Download backup
adminBackupRouter.get('/backups/:filename/download', (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File backup tidak ditemukan.' });
    }
    res.download(filePath, filename);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Gagal mengunduh backup.' });
  }
});

// Restore from backup file
adminBackupRouter.post('/backups/:filename/restore', async (req, res) => {
  let conn: mysql.Connection | null = null;
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File backup tidak ditemukan.' });
    }

    const config = parseConnectionUrl(process.env.DATABASE_URL || 'mysql://root@localhost:3306/hadirq');
    conn = await mysql.createConnection({ host: config.host, port: config.port, user: config.user, password: config.password, database: config.database, multipleStatements: true });

    const sql = fs.readFileSync(filePath, 'utf8');
    await conn.query(sql);

    return res.json({ success: true, message: 'Restore berhasil.' });
  } catch (err: any) {
    console.error('[Restore] Error:', err);
    return res.status(500).json({ success: false, error: 'Gagal restore: ' + err.message });
  } finally {
    if (conn) await conn.end();
  }
});

// Upload and restore SQL file
adminBackupRouter.post('/backups/restore-upload', async (req, res) => {
  let conn: mysql.Connection | null = null;
  try {
    const sqlContent = req.body?.sql;
    if (!sqlContent || typeof sqlContent !== 'string') {
      return res.status(400).json({ success: false, error: 'Konten SQL tidak ditemukan.' });
    }

    const config = parseConnectionUrl(process.env.DATABASE_URL || 'mysql://root@localhost:3306/hadirq');
    conn = await mysql.createConnection({ host: config.host, port: config.port, user: config.user, password: config.password, database: config.database, multipleStatements: true });

    await conn.query(sqlContent);

    return res.json({ success: true, message: 'Restore dari upload berhasil.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Gagal restore: ' + err.message });
  } finally {
    if (conn) await conn.end();
  }
});

// Delete backup
adminBackupRouter.delete('/backups/:filename', (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File backup tidak ditemukan.' });
    }
    fs.unlinkSync(filePath);
    return res.json({ success: true, message: 'Backup berhasil dihapus.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Gagal menghapus backup.' });
  }
});
