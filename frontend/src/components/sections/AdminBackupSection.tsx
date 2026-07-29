import { useState, useEffect, useCallback } from 'react';
import { Download, Upload, Trash2, RefreshCw, AlertCircle, Database, FileText } from 'lucide-react';
import { api } from '../../lib/api';
import { DataTable } from '../shared/DataTable';

interface BackupFile {
  filename: string;
  size: string;
  createdAt: string;
}

export const AdminBackupSection: React.FC = () => {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [restoringFile, setRestoringFile] = useState<string | null>(null);
  const [uploadSql, setUploadSql] = useState('');

  const loadBackups = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/admin/backups');
      if (res.success) setBackups(res.data || []);
      else setError(res.error || 'Gagal memuat backup.');
    } catch {
      setError('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBackups(); }, [loadBackups]);

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    setMessage('');
    try {
      const res = await api.post('/api/admin/backups');
      if (res.success) {
        setMessage(`Backup ${res.data.filename} berhasil dibuat (${res.data.size}).`);
        loadBackups();
      } else {
        setError(res.error || 'Gagal membuat backup.');
      }
    } catch {
      setError('Gagal membuat backup.');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = (filename: string) => {
    const token = localStorage.getItem('absen_admin_token');
    window.open(`/api/admin/backups/${filename}/download?token=${token}`, '_blank');
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Hapus backup ${filename}?`)) return;
    setError('');
    try {
      const res = await api.del(`/api/admin/backups/${filename}`);
      if (res.success) {
        setMessage('Backup berhasil dihapus.');
        loadBackups();
      } else {
        setError(res.error || 'Gagal menghapus backup.');
      }
    } catch {
      setError('Gagal menghapus backup.');
    }
  };

  const handleRestore = async (filename: string) => {
    if (!confirm(`Yakin akan merestore ${filename}? Semua data saat ini akan diganti.`)) return;
    setRestoringFile(filename);
    setError('');
    setMessage('');
    try {
      const res = await api.post(`/api/admin/backups/${filename}/restore`);
      if (res.success) {
        setMessage('Restore berhasil!');
      } else {
        setError(res.error || 'Gagal restore.');
      }
    } catch {
      setError('Gagal restore.');
    } finally {
      setRestoringFile(null);
    }
  };

  const handleUploadRestore = async () => {
    if (!uploadSql.trim()) return;
    if (!confirm('Yakin akan restore dari SQL yang diupload? Semua data saat ini akan diganti.')) return;
    setRestoringFile('upload');
    setError('');
    setMessage('');
    try {
      const res = await api.post('/api/admin/backups/restore-upload', { sql: uploadSql });
      if (res.success) {
        setMessage('Restore dari upload berhasil!');
        setUploadSql('');
      } else {
        setError(res.error || 'Gagal restore.');
      }
    } catch {
      setError('Gagal restore.');
    } finally {
      setRestoringFile(null);
    }
  };

  const columns = [
    { key: 'filename', header: 'Nama File', render: (r: BackupFile) => (
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        <span className="text-sm font-mono text-foreground">{r.filename}</span>
      </div>
    )},
    { key: 'size', header: 'Ukuran' },
    { key: 'createdAt', header: 'Tanggal', render: (r: BackupFile) => (
      <span className="text-sm text-muted-foreground">
        {new Date(r.createdAt).toLocaleString('id-ID')}
      </span>
    )},
    { key: 'actions', header: 'Aksi', align: 'right' as const, render: (r: BackupFile) => (
      <div className="flex items-center justify-end gap-2">
        <button onClick={() => handleDownload(r.filename)} className="p-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors" title="Download">
          <Download className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button onClick={() => handleRestore(r.filename)} disabled={restoringFile === r.filename} className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-50" title="Restore">
          <Upload className="w-3.5 h-3.5 text-amber-400" />
        </button>
        <button onClick={() => handleDelete(r.filename)} className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 transition-colors" title="Hapus">
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Backup & Restore Database</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Buat, unduh, dan restore backup database
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadBackups} disabled={loading} className="p-2 rounded-xl bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleCreate} disabled={creating} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-colors hover:bg-primary/90 disabled:opacity-50">
            <Database className="w-4 h-4" />
            {creating ? 'Membuat...' : 'Buat Backup'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start gap-3">
          <Database className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <DataTable
          columns={columns}
          data={backups}
          loading={loading}
          emptyText="Belum ada backup. Klik 'Buat Backup' untuk memulai."
          searchPlaceholder="Cari backup..."
        />
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Upload className="w-4 h-4 text-teal-400" />
          Restore dari File SQL
        </h3>
        <p className="text-xs text-muted-foreground">
          Paste konten file SQL atau upload file backup untuk direstore. 
          <span className="text-destructive font-semibold"> Peringatan: Semua data saat ini akan diganti!</span>
        </p>
        <textarea
          value={uploadSql}
          onChange={e => setUploadSql(e.target.value)}
          placeholder="Paste konten SQL di sini..."
          rows={8}
          className="w-full bg-background border border-input rounded-xl p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 transition-colors"
        />
        <div className="flex justify-end">
          <button
            onClick={handleUploadRestore}
            disabled={!uploadSql.trim() || restoringFile === 'upload'}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold transition-colors hover:bg-destructive/20 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {restoringFile === 'upload' ? 'Merestore...' : 'Restore dari SQL'}
          </button>
        </div>
      </div>
    </div>
  );
};
