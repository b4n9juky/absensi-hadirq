import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, QrCode, Download } from 'lucide-react';
import { DeviceBadge } from '../shared/StatusBadge';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ModalShell } from '../shared/ModalShell';
import { FormInput, FormSelect } from '../shared/FormField';

interface StudentRecord {
  id: number; userId: string; nis: string; classId: number;
  studentName: string; studentEmail: string; className: string;
  deviceUuid?: string | null;
  qrcode?: string | null;
}
interface UserRecord { id: string; name: string; email: string; role: string; }
interface ClassRecord { id: number; name: string; }

interface Props { token: string; }

export const StudentsSection: React.FC<Props> = ({ token }) => {
  const authHeader = { 'Authorization': `Bearer ${token}` };
  const [studentsList, setStudentsList] = useState<StudentRecord[]>([]);
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [classesList, setClassesList] = useState<ClassRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const triggerToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 4000); };

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState<StudentRecord | null>(null);
  const [studentNis, setStudentNis] = useState('');
  const [studentUserId, setStudentUserId] = useState('');
  const [studentClassId, setStudentClassId] = useState('');
  const [previewQr, setPreviewQr] = useState<StudentRecord | null>(null);

  const fetchData = useCallback(async () => {
    setListLoading(true);
    try {
      const [resStud, resCls, resUsr] = await Promise.all([
        fetch('/api/students', { headers: authHeader }),
        fetch('/api/classes', { headers: authHeader }),
        fetch('/api/users', { headers: authHeader }),
      ]);
      const dataStud = await resStud.json(); if (dataStud.success) setStudentsList(dataStud.data);
      const dataCls = await resCls.json(); if (dataCls.success) setClassesList(dataCls.data);
      const dataUsr = await resUsr.json(); if (dataUsr.success) setUsersList(dataUsr.data);
    } catch { /* ignore */ } finally { setListLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (toastMsg) { const t = setTimeout(() => setToastMsg(''), 4000); return () => clearTimeout(t); } }, [toastMsg]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ nis: studentNis, userId: studentUserId, classId: parseInt(studentClassId) }) });
      const data = await res.json();
      if (res.ok && data.success) { triggerToast('Profil Siswa berhasil dibuat!'); setShowAddStudent(false); setStudentNis(''); setStudentUserId(''); setStudentClassId(''); fetchData(); }
      else throw new Error(data.error || 'Gagal menyimpan siswa.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditStudent) return;
    try {
      const res = await fetch(`/api/students/${showEditStudent.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ nis: studentNis, userId: studentUserId, classId: parseInt(studentClassId) }) });
      const data = await res.json();
      if (res.ok && data.success) { triggerToast('Profil Siswa berhasil diperbarui!'); setShowEditStudent(null); fetchData(); }
      else throw new Error(data.error || 'Gagal memperbarui siswa.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus profil siswa ini?')) return;
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE', headers: authHeader });
      const data = await res.json();
      if (res.ok && data.success) { triggerToast('Profil Siswa berhasil dihapus.'); fetchData(); }
      else throw new Error(data.error || 'Gagal menghapus siswa.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const handleResetDevice = async (id: number) => {
    if (!confirm('Reset perangkat HP yang terikat pada siswa ini?')) return;
    try {
      const res = await fetch(`/api/students/${id}/reset-device`, { method: 'PUT', headers: authHeader });
      const data = await res.json();
      if (res.ok && data.success) { triggerToast('Perangkat HP berhasil direset.'); fetchData(); }
      else throw new Error(data.error || 'Gagal reset device.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
      <div className="px-6 py-5 border-b border-border flex justify-between items-center gap-4">
        <div><h2 className="text-md font-bold text-foreground">Kelola Profil Siswa</h2><p className="text-[10px] text-muted-foreground mt-1">Mengikat nomor induk NIS dengan akun user login.</p></div>
        <button onClick={() => { setStudentNis(''); setStudentUserId(''); setStudentClassId(''); setShowAddStudent(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all">
          <Plus className="w-4 h-4" /><span>Tambah Profil Siswa</span>
        </button>
      </div>
      <div className="overflow-x-auto w-full">
        {listLoading ? <LoadingSpinner /> : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/20 border-b border-border text-muted-foreground text-xs uppercase font-semibold tracking-wider">
                <th className="px-6 py-4">Nomor Induk (NIS)</th><th className="px-6 py-4">Nama Siswa</th><th className="px-6 py-4">Email Terikat</th>
                <th className="px-6 py-4">Kelas</th><th className="px-6 py-4">Status Perangkat HP</th><th className="px-6 py-4 text-center">QR Code</th><th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-xs">
              {studentsList.map((row) => (
                <tr key={row.id} className="hover:bg-muted/25 transition-colors">
                  <td className="px-6 py-4 font-mono text-muted-foreground font-bold">{row.nis}</td>
                  <td className="px-6 py-4 font-bold text-foreground">{row.studentName || '-'}</td>
                  <td className="px-6 py-4 text-muted-foreground">{row.studentEmail || '-'}</td>
                  <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full bg-secondary text-muted-foreground text-[10px] font-bold">{row.className || '-'}</span></td>
                  <td className="px-6 py-4"><DeviceBadge bound={!!row.deviceUuid} /></td>
                  <td className="px-6 py-4 text-center">
                    {row.qrcode ? (
                      <button onClick={() => setPreviewQr(row)}
                        className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors inline-flex">
                        <QrCode className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-muted-foreground/50 text-[10px]">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-1">
                    <button onClick={() => { setStudentNis(row.nis); setStudentUserId(row.userId); setStudentClassId(String(row.classId)); setShowEditStudent(row); }}
                      className="p-2 rounded-lg bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors inline-flex"><Pencil className="w-3.5 h-3.5" /></button>
                    {row.deviceUuid && (
                      <button onClick={() => handleResetDevice(row.id)}
                        className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 hover:text-amber-600 transition-colors inline-flex border border-amber-500/10" title="Reset Device">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(row.id)}
                      className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive hover:text-destructive/80 transition-colors inline-flex border border-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {errorMsg && <div className="px-6 py-3 text-destructive text-xs">{errorMsg}</div>}
      {toastMsg && <div className="fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-2xl flex items-center gap-2 animate-bounce"><span>{toastMsg}</span></div>}

      {showAddStudent && (
        <ModalShell title="Tambah Profil Siswa" onClose={() => setShowAddStudent(false)} maxWidth="md"
          footer={<><button type="button" onClick={() => setShowAddStudent(false)} className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:text-foreground text-xs">Batal</button><button type="submit" form="addStudentForm" className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs">Simpan</button></>}>
          <form id="addStudentForm" onSubmit={handleAdd}>
            <div className="space-y-4">
              <FormInput label="Nomor Induk Siswa (NIS)" value={studentNis} onChange={(e) => setStudentNis(e.target.value)} placeholder="Contoh: SISWA-BTG-025" required />
              <FormSelect label="Hubungkan Akun User Login" value={studentUserId} onChange={(e) => setStudentUserId(e.target.value)}
                options={usersList.filter(u => u.role === 'siswa').map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))} placeholder="-- Pilih User --" />
              <FormSelect label="Kelas" value={studentClassId} onChange={(e) => setStudentClassId(e.target.value)}
                options={classesList.map(c => ({ value: String(c.id), label: c.name }))} placeholder="-- Pilih Kelas --" />
            </div>
          </form>
        </ModalShell>
      )}

      {showEditStudent && (
        <ModalShell title="Edit Profil Siswa" onClose={() => setShowEditStudent(null)} maxWidth="md"
          footer={<><button type="button" onClick={() => setShowEditStudent(null)} className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:text-foreground text-xs">Batal</button><button type="submit" form="editStudentForm" className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs">Simpan Perubahan</button></>}>
          <form id="editStudentForm" onSubmit={handleEdit}>
            <div className="space-y-4">
              <FormInput label="Nomor Induk Siswa (NIS)" value={studentNis} onChange={(e) => setStudentNis(e.target.value)} required />
              <FormSelect label="Hubungkan Akun User Login" value={studentUserId} onChange={(e) => setStudentUserId(e.target.value)}
                options={usersList.filter(u => u.role === 'siswa' || u.id === showEditStudent.userId).map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))} placeholder="-- Pilih User --" />
              <FormSelect label="Kelas" value={studentClassId} onChange={(e) => setStudentClassId(e.target.value)}
                options={classesList.map(c => ({ value: String(c.id), label: c.name }))} placeholder="-- Pilih Kelas --" />
            </div>
          </form>
        </ModalShell>
      )}

      {previewQr && (
        <ModalShell title={`QR Code - ${previewQr.nis}`} onClose={() => setPreviewQr(null)} maxWidth="sm"
          footer={<>
            <a href={previewQr.qrcode!} download={`${previewQr.nis}.png`}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs inline-flex items-center gap-2">
              <Download className="w-3.5 h-3.5" /> Unduh QR
            </a>
            <button onClick={() => setPreviewQr(null)}
              className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:text-foreground text-xs">Tutup</button>
          </>}>
          <div className="flex flex-col items-center gap-4 py-4">
            <img src={previewQr.qrcode!} alt={`QR ${previewQr.nis}`}
              className="w-48 h-48 rounded-xl border border-border" />
            <div className="text-center">
              <p className="font-bold text-foreground text-sm">{previewQr.studentName || previewQr.nis}</p>
              <p className="text-muted-foreground text-xs mt-1">NIS: {previewQr.nis}</p>
            </div>
          </div>
        </ModalShell>
      )}
    </section>
  );
};
