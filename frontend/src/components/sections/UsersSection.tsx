import { useState, useEffect, useCallback } from 'react';
import { Plus, Upload, Pencil, Trash2, RefreshCw, FileSpreadsheet, Check, Download } from 'lucide-react';
import { RoleBadge } from '../shared/StatusBadge';
import { DataTable } from '../shared/DataTable';
import { ModalShell } from '../shared/ModalShell';
import { FormInput, FormSelect } from '../shared/FormField';

interface UserRecord {
  id: string; name: string; email: string; role: string;
}

interface Props {
  token: string;
}

export const UsersSection: React.FC<Props> = ({ token }) => {
  const authHeader = { 'Authorization': `Bearer ${token}` };

  const columns = [
    {
      key: 'name',
      header: 'Nama Lengkap',
      render: (row: UserRecord) => <span className="font-bold text-foreground">{row.name}</span>
    },
    {
      key: 'email',
      header: 'Alamat Email',
      render: (row: UserRecord) => <span className="text-muted-foreground">{row.email}</span>
    },
    {
      key: 'role',
      header: 'Peran (Role)',
      align: 'center' as const,
      render: (row: UserRecord) => <RoleBadge role={row.role} />
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right' as const,
      render: (row: UserRecord) => (
        <div className="space-x-2 inline-flex">
          <button onClick={() => { setUserName(row.name); setUserEmail(row.email); setUserRole(row.role); setUserNewPassword(''); setShowEditUser(row); }}
            className="p-2 rounded-lg bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors inline-flex" aria-label="Edit pengguna">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleDeleteUser(row.id)}
            className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive hover:text-destructive/80 transition-colors inline-flex border border-destructive/10">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Add/Edit User form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState<UserRecord | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userNewPassword, setUserNewPassword] = useState('');
  const [userRole, setUserRole] = useState('guru');

  // Import Excel state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{ name: string; email: string; role: string }[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; results: any[] } | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch('/api/users', { headers: authHeader });
      const data = await res.json();
      if (data.success) setUsersList(data.data);
    } catch { /* ignore */ } finally { setListLoading(false); }
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ name: userName, email: userEmail, password: userPassword, role: userRole })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast('Akun Pengguna berhasil dibuat!');
        setShowAddUser(false);
        setUserName(''); setUserEmail(''); setUserPassword('');
        fetchUsers();
      } else throw new Error(data.error || 'Gagal menyimpan user.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditUser) return;
    try {
      const body: any = { name: userName, email: userEmail, role: userRole };
      if (userNewPassword) body.password = userNewPassword;
      const res = await fetch(`/api/users/${showEditUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast('Akun Pengguna berhasil diperbarui!');
        setShowEditUser(null);
        setUserName(''); setUserEmail(''); setUserNewPassword('');
        fetchUsers();
      } else throw new Error(data.error || 'Gagal memperbarui user.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus akun pengguna ini?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE', headers: authHeader });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast('Akun Pengguna berhasil dihapus.');
        fetchUsers();
      } else throw new Error(data.error || 'Gagal menghapus user.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { setImportFile(null); setImportPreview([]); return; }
    setImportFile(file);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const XLSX = (window as any).XLSX;
        if (!XLSX) { setImportPreview([{ name: '(muat ulang untuk preview)', email: '', role: '' }]); return; }
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        const preview = json.slice(0, 5).map((r: any) => ({
          name: String(r.name || r.nama || ''),
          email: String(r.email || ''),
          role: String(r.role || r.peran || '').toLowerCase(),
        }));
        setImportPreview(preview);
      } catch { setImportPreview([{ name: '(gagal baca preview)', email: '', role: '' }]); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportSubmit = async () => {
    if (!importFile) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await fetch('/api/users/import', { method: 'POST', headers: authHeader, body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        setImportResult(data.data);
        triggerToast(`Import selesai: ${data.data.imported} sukses, ${data.data.failed} gagal`);
        fetchUsers();
      } else throw new Error(data.error || 'Gagal import data.');
    } catch (err: any) { setErrorMsg(err.message); } finally { setImportLoading(false); }
  };

  useEffect(() => { if (toastMsg) { const t = setTimeout(() => setToastMsg(''), 4000); return () => clearTimeout(t); } }, [toastMsg]);

  return (
    <section className="bg-card border border-border rounded-xl overflow-hidden shadow-xl animate-fadeIn">
      <div className="px-6 py-5 border-b border-border flex justify-between items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Kelola Akun Pengguna</h2>
          <p className="text-xs text-muted-foreground mt-1">Daftar hak akses Admin, Guru, dan Siswa.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setUserName(''); setUserEmail(''); setUserPassword(''); setUserRole('guru'); setShowAddUser(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all" aria-label="Tambah pengguna">
            <Plus className="w-4 h-4" /><span>Tambah User</span>
          </button>
          <button onClick={() => { setImportFile(null); setImportPreview([]); setImportResult(null); setShowImportModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all">
            <Upload className="w-4 h-4" /><span>Import Excel</span>
          </button>
        </div>
      </div>

      <div className="w-full">
        <DataTable
          columns={columns}
          data={usersList}
          loading={listLoading}
          searchPlaceholder="Cari nama atau email..."
          emptyText="Tidak ada akun pengguna."
        />
      </div>

      {errorMsg && <div className="px-6 py-3 text-destructive text-xs">{errorMsg}</div>}
      {toastMsg && <div className="fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-2xl flex items-center gap-2 animate-bounce"><Check className="w-5 h-5" /><span>{toastMsg}</span></div>}

      {/* Add User Modal */}
      {showAddUser && (
        <ModalShell title="Tambah Akun Pengguna" onClose={() => setShowAddUser(false)} maxWidth="md"
          footer={<><button type="button" onClick={() => setShowAddUser(false)} className="px-4 py-2 rounded-lg border border-border text-muted-foreground font-bold hover:text-foreground text-xs">Batal</button><button type="submit" form="addUserForm" className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs">Simpan</button></>}>
          <form id="addUserForm" onSubmit={handleAddUser}>
            <div className="space-y-4">
              <FormInput label="Nama Lengkap" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Nama Pengguna" required />
              <FormInput label="Alamat Email" type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="name@school.com" required />
              <FormInput label="Kata Sandi" type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} placeholder="Minimal 6 karakter" required />
              <FormSelect label="Peran (Role)" value={userRole} onChange={(e) => setUserRole(e.target.value)}
                options={[{ value: 'guru', label: 'Guru' }, { value: 'admin', label: 'Administrator' }]} />
            </div>
          </form>
        </ModalShell>
      )}

      {/* Edit User Modal */}
      {showEditUser && (
        <ModalShell title="Edit Akun Pengguna" onClose={() => setShowEditUser(null)} maxWidth="md"
          footer={<><button type="button" onClick={() => setShowEditUser(null)} className="px-4 py-2 rounded-lg border border-border text-muted-foreground font-bold hover:text-foreground text-xs">Batal</button><button type="submit" form="editUserForm" className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs">Simpan Perubahan</button></>}>
          <form id="editUserForm" onSubmit={handleEditUserSubmit}>
            <div className="space-y-4">
              <FormInput label="Nama Lengkap" value={userName} onChange={(e) => setUserName(e.target.value)} required />
              <FormInput label="Alamat Email" type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required />
              <FormInput label="Kata Sandi Baru" type="password" value={userNewPassword} onChange={(e) => setUserNewPassword(e.target.value)} placeholder="Kosongkan jika tidak diubah" />
              <FormSelect label="Peran (Role)" value={userRole} onChange={(e) => setUserRole(e.target.value)}
                options={[{ value: 'guru', label: 'Guru' }, { value: 'admin', label: 'Administrator' }]} />
            </div>
          </form>
        </ModalShell>
      )}

      {/* Import Excel Modal */}
      {showImportModal && (
        <ModalShell title="Import User dari Excel" onClose={() => { setShowImportModal(false); setImportResult(null); setImportFile(null); setImportPreview([]); }} maxWidth="lg"
          footer={!importResult ? <><button type="button" onClick={() => setShowImportModal(false)} className="px-4 py-2 rounded-lg border border-border text-muted-foreground font-bold hover:text-foreground text-xs">Batal</button>
            <button onClick={handleImportSubmit} disabled={!importFile || importLoading}
              className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 ${!importFile || importLoading ? 'bg-secondary text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}>
              {importLoading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Mengimport...</> : <><Upload className="w-3.5 h-3.5" /> Import</>}
            </button></> : undefined}>
          {importResult ? (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-500">{importResult.imported}</div>
                  <div className="text-muted-foreground mt-1">Berhasil</div>
                </div>
                <div className="flex-1 bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-destructive">{importResult.failed}</div>
                  <div className="text-muted-foreground mt-1">Gagal</div>
                </div>
              </div>
              {importResult.results.filter((r: any) => r.status === 'failed' || r.status === 'skipped').length > 0 && (
                <div>
                  <h4 className="text-foreground/80 font-semibold mb-2">Detail Error:</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importResult.results.filter((r: any) => r.status === 'failed' || r.status === 'skipped').map((r: any, i: number) => (
                      <div key={i} className="bg-destructive/5 border border-destructive/10 rounded-lg px-3 py-2 text-foreground/80">
                        <span className="text-muted-foreground">Baris {r.row}:</span> {r.email} — <span className="text-destructive">{r.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => { setShowImportModal(false); setImportResult(null); setImportFile(null); setImportPreview([]); }}
                className="w-full px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs">Tutup</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
                <span className="text-xs text-muted-foreground">Butuh template? Download file contoh Excel:</span>
                <a href="/api/templates/download/user"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all">
                  <Download className="w-3.5 h-3.5" /> Download Template
                </a>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1.5 uppercase font-semibold">File Excel</label>
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('excel-file-input')?.click()}>
                  {importFile ? (
                    <div className="text-foreground">
                      <FileSpreadsheet className="w-8 h-8 mx-auto text-primary mb-2" />
                      <p className="font-semibold">{importFile.name}</p>
                      <p className="text-muted-foreground text-xs mt-1">{(importFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      <Upload className="w-8 h-8 mx-auto mb-2" />
                      <p className="font-semibold">Klik untuk pilih file Excel</p>
                      <p className="text-muted-foreground/60 text-xs mt-1">Format .xlsx atau .xls</p>
                    </div>
                  )}
                  <input id="excel-file-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFileChange} />
                </div>
              </div>
              {importPreview.length > 0 && (
                <div>
                  <h4 className="text-foreground/80 font-semibold mb-2">Preview (5 baris pertama):</h4>
                  <div className="bg-background rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead><tr className="bg-secondary text-muted-foreground uppercase font-semibold">
                        <th className="px-3 py-2">Nama</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Role</th>
                      </tr></thead>
                      <tbody className="divide-y divide-border">
                        {importPreview.map((row, i) => (
                          <tr key={i} className="text-foreground">
                            <td className="px-3 py-2">{row.name || '-'}</td>
                            <td className="px-3 py-2">{row.email || '-'}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-2xs font-bold uppercase ${row.role === 'admin' ? 'bg-red-500/10 text-red-500' : row.role === 'guru' ? 'bg-blue-500/10 text-blue-500' : 'bg-teal-500/10 text-teal-500'}`}>
                                {row.role || '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">Kolom wajib: Name/Nama, Email, Role/Peran</p>
                </div>
              )}
            </div>
          )}
        </ModalShell>
      )}
    </section>
  );
};
