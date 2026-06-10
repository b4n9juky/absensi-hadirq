import { useState, useEffect, useCallback } from 'react';
import { Plus, Upload, Pencil, Trash2, RefreshCw, FileSpreadsheet, Check } from 'lucide-react';
import { RoleBadge } from '../shared/StatusBadge';
import { LoadingSpinner } from '../shared/LoadingSpinner';
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
  const [userRole, setUserRole] = useState('siswa');

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
      const res = await fetch(`/api/users/${showEditUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ name: userName, email: userEmail, role: userRole })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast('Akun Pengguna berhasil diperbarui!');
        setShowEditUser(null);
        setUserName(''); setUserEmail('');
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
    <section className="bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
      <div className="px-6 py-5 border-b border-slate-900 flex justify-between items-center gap-4">
        <div>
          <h2 className="text-md font-bold text-white">Kelola Akun Pengguna</h2>
          <p className="text-[10px] text-slate-500 mt-1">Daftar hak akses Admin, Guru, dan Siswa.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setUserName(''); setUserEmail(''); setUserPassword(''); setUserRole('siswa'); setShowAddUser(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all">
            <Plus className="w-4 h-4" /><span>Tambah User</span>
          </button>
          <button onClick={() => { setImportFile(null); setImportPreview([]); setImportResult(null); setShowImportModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 text-xs font-bold transition-all">
            <Upload className="w-4 h-4" /><span>Import Excel</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto w-full">
        {listLoading ? <LoadingSpinner text="Sinkronisasi database..." /> : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/20 border-b border-slate-900 text-slate-400 text-xs uppercase font-semibold tracking-wider">
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">Alamat Email</th>
                <th className="px-6 py-4 text-center">Peran (Role)</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/50 text-xs">
              {usersList.map((row) => (
                <tr key={row.id} className="hover:bg-slate-900/25 transition-colors">
                  <td className="px-6 py-4 font-bold text-white">{row.name}</td>
                  <td className="px-6 py-4 text-slate-300">{row.email}</td>
                  <td className="px-6 py-4 text-center"><RoleBadge role={row.role} /></td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => { setUserName(row.name); setUserEmail(row.email); setUserRole(row.role); setShowEditUser(row); }}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors inline-flex">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteUser(row.id)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors inline-flex border border-red-500/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {errorMsg && <div className="px-6 py-3 text-red-400 text-xs">{errorMsg}</div>}
      {toastMsg && <div className="fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-sm shadow-2xl flex items-center gap-2 animate-bounce"><Check className="w-5 h-5" /><span>{toastMsg}</span></div>}

      {/* Add User Modal */}
      {showAddUser && (
        <ModalShell title="Tambah Akun Pengguna" onClose={() => setShowAddUser(false)} maxWidth="md"
          footer={<><button type="button" onClick={() => setShowAddUser(false)} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 font-bold hover:text-white text-xs">Batal</button><button type="submit" form="addUserForm" className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs">Simpan</button></>}>
          <form id="addUserForm" onSubmit={handleAddUser}>
            <div className="space-y-4">
              <FormInput label="Nama Lengkap" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Nama Pengguna" required />
              <FormInput label="Alamat Email" type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="name@school.com" required />
              <FormInput label="Kata Sandi" type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} placeholder="Minimal 6 karakter" required />
              <FormSelect label="Peran (Role)" value={userRole} onChange={(e) => setUserRole(e.target.value)}
                options={[{ value: 'siswa', label: 'Siswa' }, { value: 'guru', label: 'Guru' }, { value: 'admin', label: 'Administrator' }]} />
            </div>
          </form>
        </ModalShell>
      )}

      {/* Edit User Modal */}
      {showEditUser && (
        <ModalShell title="Edit Akun Pengguna" onClose={() => setShowEditUser(null)} maxWidth="md"
          footer={<><button type="button" onClick={() => setShowEditUser(null)} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 font-bold hover:text-white text-xs">Batal</button><button type="submit" form="editUserForm" className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs">Simpan Perubahan</button></>}>
          <form id="editUserForm" onSubmit={handleEditUserSubmit}>
            <div className="space-y-4">
              <FormInput label="Nama Lengkap" value={userName} onChange={(e) => setUserName(e.target.value)} required />
              <FormInput label="Alamat Email" type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required />
              <FormSelect label="Peran (Role)" value={userRole} onChange={(e) => setUserRole(e.target.value)}
                options={[{ value: 'siswa', label: 'Siswa' }, { value: 'guru', label: 'Guru' }, { value: 'admin', label: 'Administrator' }]} />
            </div>
          </form>
        </ModalShell>
      )}

      {/* Import Excel Modal */}
      {showImportModal && (
        <ModalShell title="Import User dari Excel" onClose={() => { setShowImportModal(false); setImportResult(null); setImportFile(null); setImportPreview([]); }} maxWidth="lg"
          footer={!importResult ? <><button type="button" onClick={() => setShowImportModal(false)} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 font-bold hover:text-white text-xs">Batal</button>
            <button onClick={handleImportSubmit} disabled={!importFile || importLoading}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 ${!importFile || importLoading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-400 text-slate-950'}`}>
              {importLoading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Mengimport...</> : <><Upload className="w-3.5 h-3.5" /> Import</>}
            </button></> : undefined}>
          {importResult ? (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{importResult.imported}</div>
                  <div className="text-slate-400 mt-1">Berhasil</div>
                </div>
                <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-red-400">{importResult.failed}</div>
                  <div className="text-slate-400 mt-1">Gagal</div>
                </div>
              </div>
              {importResult.results.filter((r: any) => r.status === 'failed' || r.status === 'skipped').length > 0 && (
                <div>
                  <h4 className="text-slate-300 font-semibold mb-2">Detail Error:</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importResult.results.filter((r: any) => r.status === 'failed' || r.status === 'skipped').map((r: any, i: number) => (
                      <div key={i} className="bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2 text-slate-300">
                        <span className="text-slate-500">Baris {r.row}:</span> {r.email} — <span className="text-red-400">{r.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => { setShowImportModal(false); setImportResult(null); setImportFile(null); setImportPreview([]); }}
                className="w-full px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs">Tutup</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold">File Excel</label>
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-blue-500/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('excel-file-input')?.click()}>
                  {importFile ? (
                    <div className="text-slate-200">
                      <FileSpreadsheet className="w-8 h-8 mx-auto text-blue-400 mb-2" />
                      <p className="font-semibold">{importFile.name}</p>
                      <p className="text-slate-500 text-[10px] mt-1">{(importFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div className="text-slate-400">
                      <Upload className="w-8 h-8 mx-auto mb-2" />
                      <p className="font-semibold">Klik untuk pilih file Excel</p>
                      <p className="text-slate-500 text-[10px] mt-1">Format .xlsx atau .xls</p>
                    </div>
                  )}
                  <input id="excel-file-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFileChange} />
                </div>
              </div>
              {importPreview.length > 0 && (
                <div>
                  <h4 className="text-slate-300 font-semibold mb-2">Preview (5 baris pertama):</h4>
                  <div className="bg-slate-950 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead><tr className="bg-slate-900 text-slate-400 uppercase font-semibold">
                        <th className="px-3 py-2">Nama</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Role</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-800">
                        {importPreview.map((row, i) => (
                          <tr key={i} className="text-slate-200">
                            <td className="px-3 py-2">{row.name || '-'}</td>
                            <td className="px-3 py-2">{row.email || '-'}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${row.role === 'admin' ? 'bg-red-500/10 text-red-400' : row.role === 'guru' ? 'bg-blue-500/10 text-blue-400' : 'bg-teal-500/10 text-teal-400'}`}>
                                {row.role || '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-slate-500 text-[10px] mt-1">Kolom wajib: Name/Nama, Email, Role/Peran</p>
                </div>
              )}
            </div>
          )}
        </ModalShell>
      )}
    </section>
  );
};
