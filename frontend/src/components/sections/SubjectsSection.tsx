import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '../shared/DataTable';
import { ModalShell } from '../shared/ModalShell';
import { FormInput } from '../shared/FormField';

interface SubjectRecord { id: number; name: string; }

interface Props { token: string; }

export const SubjectsSection: React.FC<Props> = ({ token }) => {
  const authHeader = { 'Authorization': `Bearer ${token}` };
  const [subjectsList, setSubjectsList] = useState<SubjectRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const triggerToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 4000); };

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<SubjectRecord | null>(null);
  const [subjectName, setSubjectName] = useState('');

  const fetchSubjects = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch('/api/subjects', { headers: authHeader });
      const data = await res.json();
      if (data.success) setSubjectsList(data.data);
    } catch { /* ignore */ } finally { setListLoading(false); }
  }, [token]);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);
  useEffect(() => { if (toastMsg) { const t = setTimeout(() => setToastMsg(''), 4000); return () => clearTimeout(t); } }, [toastMsg]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/subjects', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ name: subjectName }) });
      const data = await res.json();
      if (res.ok && data.success) { triggerToast(`"${subjectName}" berhasil ditambahkan!`); setShowAdd(false); setSubjectName(''); fetchSubjects(); }
      else throw new Error(data.error || 'Gagal menyimpan mata pelajaran.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEdit) return;
    try {
      const res = await fetch(`/api/subjects/${showEdit.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ name: subjectName }) });
      const data = await res.json();
      if (res.ok && data.success) { triggerToast('Nama mata pelajaran berhasil diperbarui!'); setShowEdit(null); setSubjectName(''); fetchSubjects(); }
      else throw new Error(data.error || 'Gagal memperbarui mata pelajaran.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus mata pelajaran ini?')) return;
    try {
      const res = await fetch(`/api/subjects/${id}`, { method: 'DELETE', headers: authHeader });
      const data = await res.json();
      if (res.ok && data.success) { triggerToast('Mata pelajaran berhasil dihapus.'); fetchSubjects(); }
      else throw new Error(data.error || 'Gagal menghapus mata pelajaran.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const columns = [
    {
      key: 'id',
      header: 'ID',
      render: (row: SubjectRecord) => <span className="text-muted-foreground font-mono">#{row.id}</span>
    },
    {
      key: 'name',
      header: 'Nama Mata Pelajaran',
      render: (row: SubjectRecord) => <span className="font-bold text-foreground text-sm">{row.name}</span>
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right' as const,
      render: (row: SubjectRecord) => (
        <div className="space-x-2 inline-flex">
          <button onClick={() => { setSubjectName(row.name); setShowEdit(row); }}
            className="p-2 rounded-lg bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors inline-flex">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleDelete(row.id)}
            className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive hover:text-destructive/80 transition-colors inline-flex border border-destructive/10">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
      <div className="px-6 py-5 border-b border-border flex justify-between items-center gap-4">
        <div>
          <h2 className="text-md font-bold text-foreground">Mata Pelajaran</h2>
          <p className="text-[10px] text-muted-foreground mt-1">Daftar mata pelajaran yang tersedia untuk jadwal mengajar.</p>
        </div>
        <button onClick={() => { setSubjectName(''); setShowAdd(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all">
          <Plus className="w-4 h-4" /><span>Tambah Mata Pelajaran</span>
        </button>
      </div>
      <div className="w-full">
        <DataTable
          columns={columns}
          data={subjectsList}
          loading={listLoading}
          searchPlaceholder="Cari mata pelajaran..."
          emptyText="Tidak ada mata pelajaran."
        />
      </div>
      {errorMsg && <div className="px-6 py-3 text-destructive text-xs">{errorMsg}</div>}
      {toastMsg && <div className="fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-2xl flex items-center gap-2 animate-bounce"><span>{toastMsg}</span></div>}

      {showAdd && (
        <ModalShell title="Tambah Mata Pelajaran" onClose={() => setShowAdd(false)} maxWidth="sm"
          footer={<><button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:text-foreground text-xs">Batal</button><button type="submit" form="addSubjectForm" className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs">Simpan</button></>}>
          <form id="addSubjectForm" onSubmit={handleAdd}>
            <FormInput label="Nama Mata Pelajaran" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="Contoh: Matematika Wajib" required />
          </form>
        </ModalShell>
      )}

      {showEdit && (
        <ModalShell title="Edit Mata Pelajaran" onClose={() => setShowEdit(null)} maxWidth="sm"
          footer={<><button type="button" onClick={() => setShowEdit(null)} className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:text-foreground text-xs">Batal</button><button type="submit" form="editSubjectForm" className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs">Simpan Perubahan</button></>}>
          <form id="editSubjectForm" onSubmit={handleEdit}>
            <FormInput label="Nama Mata Pelajaran" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} required />
          </form>
        </ModalShell>
      )}
    </section>
  );
};
