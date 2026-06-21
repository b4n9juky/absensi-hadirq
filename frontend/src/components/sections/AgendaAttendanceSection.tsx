import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ArrowLeft, QrCode, CheckSquare, Calendar, Clock, Users } from 'lucide-react';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ModalShell } from '../shared/ModalShell';
import { FormInput, FormSelect } from '../shared/FormField';

interface AgendaRecord {
  id: number;
  title: string;
  agendaType: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  className: string;
  classId: number;
}

interface ClassRecord { id: number; name: string; }

interface StudentAttendance {
  studentId: number;
  nis: string;
  studentName: string;
  status: string;
  checkinTime: string | null;
  notes: string;
}

const STATUS_LIST = ['PRESENT', 'SICK', 'EXCUSED', 'ABSENT', 'DISPEN'];
const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Hadir', SICK: 'Sakit', EXCUSED: 'Izin', ABSENT: 'Alpa', DISPEN: 'Dispensasi',
};
const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
  SICK: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  EXCUSED: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  ABSENT: 'text-red-400 border-red-500/30 bg-red-500/10',
  DISPEN: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
};

interface Props { token: string; }

export const AgendaAttendanceSection: React.FC<Props> = ({ token }) => {
  const authHeader = { 'Authorization': `Bearer ${token}` };
  const [agendas, setAgendas] = useState<AgendaRecord[]>([]);
  const [classesList, setClassesList] = useState<ClassRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const triggerToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 4000); };

  const [showModal, setShowModal] = useState(false);
  const [editAgenda, setEditAgenda] = useState<AgendaRecord | null>(null);
  const [formClassId, setFormClassId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formAgendaType, setFormAgendaType] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formError, setFormError] = useState('');

  const [selectedAgenda, setSelectedAgenda] = useState<AgendaRecord | null>(null);
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [qrNis, setQrNis] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrMsg, setQrMsg] = useState('');

  const fetchAgendas = useCallback(async () => {
    setListLoading(true);
    try {
      const [resAgendas, resClasses] = await Promise.all([
        fetch('/api/teacher/agendas', { headers: authHeader }),
        fetch('/api/classes', { headers: authHeader }),
      ]);
      const dAgendas = await resAgendas.json(); if (dAgendas.success) setAgendas(dAgendas.data);
      const dClasses = await resClasses.json(); if (dClasses.success) setClassesList(dClasses.data);
    } catch { /* ignore */ } finally { setListLoading(false); }
  }, [token]);

  useEffect(() => { fetchAgendas(); }, [fetchAgendas]);

  const todayStr = new Date().toISOString().split('T')[0];

  const openAdd = () => {
    setEditAgenda(null);
    setFormClassId(classesList.length > 0 ? String(classesList[0].id) : '');
    setFormTitle('');
    setFormAgendaType('');
    setFormDate(todayStr);
    setFormStart('');
    setFormEnd('');
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (item: AgendaRecord) => {
    setEditAgenda(item);
    setFormClassId(String(item.classId));
    setFormTitle(item.title);
    setFormAgendaType(item.agendaType || '');
    setFormDate(item.date);
    setFormStart(item.startTime || '');
    setFormEnd(item.endTime || '');
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formClassId || !formTitle || !formDate) {
      setFormError('Judul, kelas, dan tanggal wajib diisi.');
      return;
    }
    try {
      const body: any = { classId: Number(formClassId), title: formTitle, date: formDate };
      if (formAgendaType) body.agendaType = formAgendaType;
      if (formStart) body.startTime = formStart;
      if (formEnd) body.endTime = formEnd;

      const url = editAgenda ? `/api/teacher/agendas/${editAgenda.id}` : '/api/teacher/agendas';
      const method = editAgenda ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(editAgenda ? 'Agenda berhasil diperbarui!' : 'Agenda berhasil dibuat!');
        setShowModal(false);
        fetchAgendas();
      } else throw new Error(data.error || 'Gagal menyimpan agenda.');
    } catch (err: any) { setFormError(err.message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus agenda ini? Semua data absensi akan ikut terhapus.')) return;
    try {
      const res = await fetch(`/api/teacher/agendas/${id}`, { method: 'DELETE', headers: authHeader });
      const data = await res.json();
      if (res.ok && data.success) { triggerToast('Agenda berhasil dihapus.'); fetchAgendas(); }
      else throw new Error(data.error || 'Gagal menghapus agenda.');
    } catch (err: any) { setToastMsg(err.message); }
  };

  const openAttendance = async (agenda: AgendaRecord) => {
    setSelectedAgenda(agenda);
    setQrNis('');
    setQrMsg('');
    setStudentsLoading(true);
    try {
      const res = await fetch(`/api/teacher/agendas/${agenda.id}/students`, { headers: authHeader });
      const data = await res.json();
      if (data.success) setStudents(data.data.students);
      else throw new Error(data.error || 'Gagal memuat data siswa.');
    } catch (err: any) { setToastMsg(err.message); } finally { setStudentsLoading(false); }
  };

  const updateStudentStatus = (studentId: number, status: string) => {
    setStudents(prev => prev.map(s => s.studentId === studentId ? { ...s, status } : s));
  };

  const updateStudentNotes = (studentId: number, notes: string) => {
    setStudents(prev => prev.map(s => s.studentId === studentId ? { ...s, notes } : s));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const entries = students.map(s => ({ studentId: s.studentId, status: s.status, notes: s.notes || undefined }));
      const res = await fetch(`/api/teacher/agendas/${selectedAgenda!.id}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ entries }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(data.message);
      } else throw new Error(data.error || 'Gagal menyimpan.');
    } catch (err: any) { setToastMsg(err.message); } finally { setSaving(false); }
  };

  const handleQrScan = async () => {
    if (!qrNis.trim()) return;
    setQrLoading(true);
    setQrMsg('');
    try {
      const res = await fetch(`/api/teacher/agendas/${selectedAgenda!.id}/qr-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ studentNis: qrNis.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setQrMsg(`✓ ${data.message}`);
        setQrNis('');
        setStudents(prev => prev.map(s =>
          s.nis === qrNis.trim() ? { ...s, status: 'PRESENT', checkinTime: new Date().toISOString() } : s
        ));
      } else throw new Error(data.error || 'Gagal memproses QR.');
    } catch (err: any) { setQrMsg(`✗ ${err.message}`); } finally { setQrLoading(false); }
  };

  const backToList = () => {
    setSelectedAgenda(null);
    setStudents([]);
  };

  const grouped = agendas.reduce((acc, a) => {
    const key = a.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {} as Record<string, AgendaRecord[]>);

  const sortedDates = Object.keys(grouped).sort();

  if (selectedAgenda) {
    return (
      <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
        <div className="px-6 py-5 border-b border-border flex flex-wrap items-center gap-3">
          <button onClick={backToList} className="p-2 rounded-lg bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-md font-bold text-foreground truncate">{selectedAgenda.title}</h2>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{selectedAgenda.date}</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{selectedAgenda.className}</span>
              {selectedAgenda.agendaType && <span className="text-teal-400">{selectedAgenda.agendaType}</span>}
              {(selectedAgenda.startTime || selectedAgenda.endTime) && (
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{selectedAgenda.startTime?.slice(0, 5) || '--'}-{selectedAgenda.endTime?.slice(0, 5) || '--'}</span>
              )}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-muted/10 rounded-xl border border-border/50 p-4">
            <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2"><QrCode className="w-4 h-4 text-teal-400" /> Scan QR Siswa</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={qrNis}
                onChange={e => setQrNis(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleQrScan(); }}
                placeholder="Scan QR atau ketik NIS siswa..."
                className="flex-1 bg-background border border-input rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:border-primary text-xs"
                autoFocus
              />
              <button onClick={handleQrScan} disabled={qrLoading || !qrNis.trim()}
                className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold text-xs flex items-center gap-2 transition-all">
                {qrLoading ? 'Memproses...' : 'Hadirkan'}
              </button>
            </div>
            {qrMsg && <div className={`mt-2 text-xs font-semibold ${qrMsg.startsWith('✓') ? 'text-teal-400' : 'text-red-400'}`}>{qrMsg}</div>}
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-2"><CheckSquare className="w-4 h-4 text-teal-400" /> Daftar Siswa</h3>
            <button onClick={handleSaveAttendance} disabled={saving}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold text-xs transition-all">
              {saving ? 'Menyimpan...' : 'Simpan Absensi'}
            </button>
          </div>

          {studentsLoading ? <LoadingSpinner /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-muted-foreground font-semibold">NIS</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-semibold">Nama</th>
                    <th className="text-center py-3 px-2 text-muted-foreground font-semibold">Status</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-semibold">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {students.map(s => (
                    <tr key={s.studentId} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-2 font-mono text-muted-foreground">{s.nis}</td>
                      <td className="py-3 px-2 font-bold text-foreground">{s.studentName}</td>
                      <td className="py-3 px-2">
                        <div className="flex justify-center gap-1">
                          {STATUS_LIST.map(st => (
                            <button
                              key={st}
                              onClick={() => updateStudentStatus(s.studentId, st)}
                              className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition-all ${
                                s.status === st
                                  ? STATUS_COLORS[st]
                                  : 'text-muted-foreground border-transparent hover:border-border/50'
                              }`}
                            >
                              {STATUS_LABELS[st]}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="text"
                          value={s.notes}
                          onChange={e => updateStudentNotes(s.studentId, e.target.value)}
                          placeholder="Catatan..."
                          className="w-24 bg-background border border-input rounded-lg px-2 py-1 text-[10px] text-foreground focus:outline-none focus:border-primary"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {toastMsg && <div className="fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-2xl flex items-center gap-2 animate-bounce"><span>{toastMsg}</span></div>}
      </section>
    );
  }

  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
      <div className="px-6 py-5 border-b border-border flex justify-between items-center gap-4">
        <div>
          <h2 className="text-md font-bold text-foreground">Agenda Absensi</h2>
          <p className="text-[10px] text-muted-foreground mt-1">Buat agenda absensi kustom untuk ujian, quiz, atau kegiatan lainnya.</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all">
          <Plus className="w-4 h-4" /><span>Buat Agenda Baru</span>
        </button>
      </div>
      <div className="p-6">
        {listLoading ? <LoadingSpinner /> : agendas.length === 0 ? (
          <div className="py-16 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <div className="text-sm text-muted-foreground">Belum ada agenda absensi.</div>
            <button onClick={openAdd} className="mt-4 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-all">
              Buat Agenda Pertama
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map(date => (
              <div key={date}>
                <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-teal-400" />
                  {date}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grouped[date].map(a => (
                    <div key={a.id} className="bg-muted/10 rounded-xl border border-border/50 overflow-hidden hover:border-border transition-colors">
                      <button onClick={() => openAttendance(a)} className="w-full text-left p-4 space-y-2 hover:bg-muted/10 transition-colors">
                        <div className="font-bold text-sm text-foreground truncate">{a.title}</div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{a.className}</span>
                          {a.agendaType && <><span>|</span><span className="text-teal-400">{a.agendaType}</span></>}
                        </div>
                        {(a.startTime || a.endTime) && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {a.startTime?.slice(0, 5) || '--'} - {a.endTime?.slice(0, 5) || '--'}
                          </div>
                        )}
                      </button>
                      <div className="px-4 pb-3 flex gap-1">
                        <button onClick={() => openAttendance(a)}
                          className="flex-1 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold transition-colors">
                          Isi Absensi
                        </button>
                        <button onClick={() => openEdit(a)}
                          className="p-1.5 rounded-lg bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleDelete(a.id)}
                          className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive hover:text-destructive/80 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {toastMsg && <div className="fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-2xl flex items-center gap-2 animate-bounce"><span>{toastMsg}</span></div>}

      {showModal && (
        <ModalShell title={editAgenda ? 'Edit Agenda' : 'Buat Agenda Baru'} onClose={() => setShowModal(false)} maxWidth="md"
          footer={<>
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:text-foreground text-xs">Batal</button>
            <button type="submit" form="agendaForm" className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs">{editAgenda ? 'Simpan Perubahan' : 'Simpan'}</button>
          </>}>
          <form id="agendaForm" onSubmit={handleSubmit} className="space-y-4">
            <FormInput label="Judul Agenda" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Contoh: UTS Matematika" required />
            <FormSelect label="Kelas" value={formClassId} onChange={e => setFormClassId(e.target.value)} placeholder="-- Pilih Kelas --" options={classesList.map(c => ({ value: String(c.id), label: c.name }))} />
            <FormInput label="Tipe Agenda (opsional)" value={formAgendaType} onChange={e => setFormAgendaType(e.target.value)} placeholder="Contoh: UTS, Quiz, Kegiatan" />
            <FormInput label="Tanggal" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} required />
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Jam Mulai (opsional)" value={formStart} onChange={e => setFormStart(e.target.value)} placeholder="07:00:00" />
              <FormInput label="Jam Selesai (opsional)" value={formEnd} onChange={e => setFormEnd(e.target.value)} placeholder="08:30:00" />
            </div>
            {formError && <div className="text-destructive text-xs">{formError}</div>}
          </form>
        </ModalShell>
      )}
    </section>
  );
};
