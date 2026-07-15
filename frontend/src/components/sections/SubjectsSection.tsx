import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Upload, FileSpreadsheet, RefreshCw, Download } from 'lucide-react';
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

  // Import Excel state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{ name: string }[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; results: any[] } | null>(null);
  const [importLoading, setImportLoading] = useState(false);

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
        if (!XLSX) { setImportPreview([{ name: '(muat ulang untuk preview)' }]); return; }
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        
        const keys = json.length > 0 ? Object.keys(json[0]) : [];
        const nameKey = keys.find(k => k.toLowerCase().trim() === 'name' || k.toLowerCase().trim() === 'nama' || k.toLowerCase().trim() === 'mata pelajaran') || 'name';

        const preview = json.slice(0, 5).map((r: any) => ({
          name: String(r[nameKey] || ''),
        }));
        setImportPreview(preview);
      } catch { setImportPreview([{ name: '(gagal baca preview)' }]); }
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
      const res = await fetch('/api/subjects/import', { method: 'POST', headers: authHeader, body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        setImportResult(data.data);
        triggerToast(`Import selesai: ${data.data.imported} sukses, ${data.data.failed} gagal`);
        fetchSubjects();
      } else throw new Error(data.error || 'Gagal import data.');
    } catch (err: any) { setErrorMsg(err.message); } finally { setImportLoading(false); }
  };

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
    <section className="bg-card border border-border rounded-xl overflow-hidden shadow-xl animate-fadeIn">
      <div className="px-6 py-5 border-b border-border flex justify-between items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Mata Pelajaran</h2>
          <p className="text-xs text-muted-foreground mt-1">Daftar mata pelajaran yang tersedia untuk jadwal mengajar.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setImportFile(null); setImportPreview([]); setImportResult(null); setShowImportModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all">
              <Upload className="w-4 h-4" /><span>Import Excel</span>
          </button>
          <button onClick={() => { setSubjectName(''); setShowAdd(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all">
              <Plus className="w-4 h-4" /><span>Tambah Mata Pelajaran</span>
          </button>
        </div>
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
      {/* Import Excel Modal */}
      {showImportModal && (
        <ModalShell title="Import Mapel dari Excel" onClose={() => { setShowImportModal(false); setImportResult(null); setImportFile(null); setImportPreview([]); }} maxWidth="lg"
          footer={!importResult ? <><button type="button" onClick={() => setShowImportModal(false)} className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:text-foreground text-xs">Batal</button>
            <button onClick={handleImportSubmit} disabled={!importFile || importLoading}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 ${!importFile || importLoading ? 'bg-secondary text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}>
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
                        <span className="text-muted-foreground">Baris {r.row}:</span> Mapel: {r.name || 'n/a'} — <span className="text-destructive">{r.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => { setShowImportModal(false); setImportResult(null); setImportFile(null); setImportPreview([]); }}
                className="w-full px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs">Tutup</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
                <span className="text-xs text-muted-foreground">Butuh template? Download file contoh Excel:</span>
                <a href="/uploads/templates/template-import-mapel.xlsx" download
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all">
                  <Download className="w-3.5 h-3.5" /> Download Template
                </a>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1.5 uppercase font-semibold">File Excel</label>
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('subject-excel-file-input')?.click()}>
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
                  <input id="subject-excel-file-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFileChange} />
                </div>
              </div>
              {importPreview.length > 0 && (
                <div>
                  <h4 className="text-foreground/80 font-semibold mb-2">Preview (5 baris pertama):</h4>
                  <div className="bg-background rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead><tr className="bg-secondary text-muted-foreground uppercase font-semibold">
                        <th className="px-3 py-2">Nama Mata Pelajaran</th>
                      </tr></thead>
                      <tbody className="divide-y divide-border">
                        {importPreview.map((row, i) => (
                          <tr key={i} className="text-foreground">
                            <td className="px-3 py-2">{row.name || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">Kolom wajib: Name/Nama/Mata Pelajaran</p>
                </div>
              )}
            </div>
          )}
        </ModalShell>
      )}
    </section>
  );
};
