import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ModalShell } from '../shared/ModalShell';
import { FormInput } from '../shared/FormField';

interface ClassRecord { id: number; name: string; }

interface Props { token: string; }

export const ClassesSection: React.FC<Props> = ({ token }) => {
  const authHeader = { 'Authorization': `Bearer ${token}` };
  const [classesList, setClassesList] = useState<ClassRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const triggerToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 4000); };

  const [showAddClass, setShowAddClass] = useState(false);
  const [showEditClass, setShowEditClass] = useState<ClassRecord | null>(null);
  const [className, setClassName] = useState('');

  const fetchClasses = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch('/api/classes', { headers: authHeader });
      const data = await res.json();
      if (data.success) setClassesList(data.data);
    } catch { /* ignore */ } finally { setListLoading(false); }
  }, [token]);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);
  useEffect(() => { if (toastMsg) { const t = setTimeout(() => setToastMsg(''), 4000); return () => clearTimeout(t); } }, [toastMsg]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/classes', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ name: className }) });
      const data = await res.json();
      if (res.ok && data.success) { triggerToast(`Kelas "${className}" berhasil dibuat!`); setShowAddClass(false); setClassName(''); fetchClasses(); }
      else throw new Error(data.error || 'Gagal menyimpan kelas.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditClass) return;
    try {
      const res = await fetch(`/api/classes/${showEditClass.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ name: className }) });
      const data = await res.json();
      if (res.ok && data.success) { triggerToast('Nama Kelas berhasil diperbarui!'); setShowEditClass(null); setClassName(''); fetchClasses(); }
      else throw new Error(data.error || 'Gagal memperbarui kelas.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kelas ini?')) return;
    try {
      const res = await fetch(`/api/classes/${id}`, { method: 'DELETE', headers: authHeader });
      const data = await res.json();
      if (res.ok && data.success) { triggerToast('Kelas berhasil dihapus.'); fetchClasses(); }
      else throw new Error(data.error || 'Gagal menghapus kelas.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
      <div className="px-6 py-5 border-b border-border flex justify-between items-center gap-4">
        <div>
          <h2 className="text-md font-bold text-foreground">Kelola Kelas Yayasan</h2>
          <p className="text-[10px] text-muted-foreground mt-1">Daftar kelas pembelajaran untuk absensi harian.</p>
        </div>
        <button onClick={() => { setClassName(''); setShowAddClass(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all">
          <Plus className="w-4 h-4" /><span>Tambah Kelas</span>
        </button>
      </div>
      <div className="overflow-x-auto w-full">
        {listLoading ? <LoadingSpinner /> : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/20 border-b border-border text-muted-foreground text-xs uppercase font-semibold tracking-wider">
                <th className="px-6 py-4">ID Kelas</th><th className="px-6 py-4">Nama Kelas</th><th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-xs">
              {classesList.map((row) => (
                <tr key={row.id} className="hover:bg-muted/25 transition-colors">
                  <td className="px-6 py-4 text-muted-foreground font-mono">#{row.id}</td>
                  <td className="px-6 py-4 font-bold text-foreground text-sm">{row.name}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => { setClassName(row.name); setShowEditClass(row); }}
                      className="p-2 rounded-lg bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors inline-flex"><Pencil className="w-3.5 h-3.5" /></button>
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

      {showAddClass && (
        <ModalShell title="Tambah Kelas Baru" onClose={() => setShowAddClass(false)} maxWidth="sm"
          footer={<><button type="button" onClick={() => setShowAddClass(false)} className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:text-foreground text-xs">Batal</button><button type="submit" form="addClassForm" className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs">Simpan</button></>}>
          <form id="addClassForm" onSubmit={handleAdd}>
            <FormInput label="Nama Kelas" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Contoh: XII IPA 1, XI IPS 2" required />
          </form>
        </ModalShell>
      )}

      {showEditClass && (
        <ModalShell title="Edit Nama Kelas" onClose={() => setShowEditClass(null)} maxWidth="sm"
          footer={<><button type="button" onClick={() => setShowEditClass(null)} className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:text-foreground text-xs">Batal</button><button type="submit" form="editClassForm" className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs">Simpan Perubahan</button></>}>
          <form id="editClassForm" onSubmit={handleEdit}>
            <FormInput label="Nama Kelas" value={className} onChange={(e) => setClassName(e.target.value)} required />
          </form>
        </ModalShell>
      )}
    </section>
  );
};
