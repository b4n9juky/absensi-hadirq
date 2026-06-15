import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ModalShell } from '../shared/ModalShell';
import { FormInput, FormSelect } from '../shared/FormField';

interface ScheduleRecord {
  id: number;
  teacherId: string;
  teacherName: string;
  classId: number;
  className: string;
  dayName: string;
  startTime: string;
  endTime: string;
  subject: string;
}

interface ClassRecord { id: number; name: string; }
interface TeacherRecord { id: string; name: string; email: string; role: string; }

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_LABELS: Record<string, string> = {
  Monday: 'Senin', Tuesday: 'Selasa', Wednesday: 'Rabu', Thursday: 'Kamis',
  Friday: 'Jumat', Saturday: 'Sabtu', Sunday: 'Minggu',
};

interface Props { token: string; }

export const TeachingScheduleSection: React.FC<Props> = ({ token }) => {
  const authHeader = { 'Authorization': `Bearer ${token}` };
  const [list, setList] = useState<ScheduleRecord[]>([]);
  const [classesList, setClassesList] = useState<ClassRecord[]>([]);
  const [teachersList, setTeachersList] = useState<TeacherRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const triggerToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 4000); };

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ScheduleRecord | null>(null);
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formDay, setFormDay] = useState('Monday');
  const [formStart, setFormStart] = useState('07:00:00');
  const [formEnd, setFormEnd] = useState('08:30:00');
  const [formSubject, setFormSubject] = useState('');
  const [formError, setFormError] = useState('');

  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const [resSched, resClasses, resUsers] = await Promise.all([
        fetch('/api/teaching-schedules', { headers: authHeader }),
        fetch('/api/classes', { headers: authHeader }),
        fetch('/api/users', { headers: authHeader }),
      ]);
      const dSched = await resSched.json(); if (dSched.success) setList(dSched.data);
      const dClasses = await resClasses.json(); if (dClasses.success) setClassesList(dClasses.data);
      const dUsers = await resUsers.json(); if (dUsers.success) setTeachersList(dUsers.data.filter((u: TeacherRecord) => u.role === 'guru'));
    } catch { /* ignore */ } finally { setListLoading(false); }
  }, [token]);

  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => { if (toastMsg) { const t = setTimeout(() => setToastMsg(''), 4000); return () => clearTimeout(t); } }, [toastMsg]);

  const openAdd = () => {
    setEditItem(null);
    setFormTeacherId(teachersList.length > 0 ? teachersList[0].id : '');
    setFormClassId(classesList.length > 0 ? String(classesList[0].id) : '');
    setFormDay('Monday');
    setFormStart('07:00:00');
    setFormEnd('08:30:00');
    setFormSubject('');
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (item: ScheduleRecord) => {
    setEditItem(item);
    setFormTeacherId(item.teacherId);
    setFormClassId(String(item.classId));
    setFormDay(item.dayName);
    setFormStart(item.startTime);
    setFormEnd(item.endTime);
    setFormSubject(item.subject);
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formTeacherId || !formClassId || !formStart || !formEnd) {
      setFormError('Semua field wajib diisi.');
      return;
    }
    try {
      const body = { teacherId: formTeacherId, classId: Number(formClassId), dayName: formDay, startTime: formStart, endTime: formEnd, subject: formSubject };
      const url = editItem ? `/api/teaching-schedules/${editItem.id}` : '/api/teaching-schedules';
      const method = editItem ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(editItem ? 'Jadwal berhasil diperbarui!' : 'Jadwal berhasil dibuat!');
        setShowModal(false);
        fetchList();
      } else throw new Error(data.error || 'Gagal menyimpan jadwal.');
    } catch (err: any) { setFormError(err.message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus jadwal mengajar ini?')) return;
    try {
      const res = await fetch(`/api/teaching-schedules/${id}`, { method: 'DELETE', headers: authHeader });
      const data = await res.json();
      if (res.ok && data.success) { triggerToast('Jadwal berhasil dihapus.'); fetchList(); }
      else throw new Error(data.error || 'Gagal menghapus jadwal.');
    } catch (err: any) { setToastMsg(err.message); }
  };

  const grouped = DAYS.map(day => ({ day, items: list.filter(s => s.dayName === day) }));

  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
      <div className="px-6 py-5 border-b border-border flex justify-between items-center gap-4">
        <div>
          <h2 className="text-md font-bold text-foreground">Jadwal Mengajar Guru</h2>
          <p className="text-[10px] text-muted-foreground mt-1">Atur jadwal mata pelajaran per guru, kelas, dan hari.</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all">
          <Plus className="w-4 h-4" /><span>Tambah Jadwal</span>
        </button>
      </div>
      <div className="p-6">
        {listLoading ? <LoadingSpinner /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {grouped.map(({ day, items }) => (
              <div key={day} className="bg-muted/10 rounded-xl border border-border/50 overflow-hidden">
                <div className="px-4 py-3 bg-muted/20 border-b border-border/50 font-bold text-xs text-foreground uppercase tracking-wider">
                  {DAY_LABELS[day]}
                </div>
                {items.length === 0 ? (
                  <div className="px-4 py-6 text-center text-[10px] text-muted-foreground">Tidak ada jadwal</div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {items.map(s => (
                      <div key={s.id} className="px-4 py-3 space-y-1.5 hover:bg-muted/10 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">{s.teacherName}</div>
                            <div className="text-[10px] text-muted-foreground">{s.className}</div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => openEdit(s)}
                              className="p-1.5 rounded-lg bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3 h-3" /></button>
                            <button onClick={() => handleDelete(s.id)}
                              className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive hover:text-destructive/80 transition-colors"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="font-semibold text-teal-400">{s.startTime.slice(0, 5)} - {s.endTime.slice(0, 5)}</span>
                          {s.subject && <><span className="text-muted-foreground">|</span><span className="text-muted-foreground">{s.subject}</span></>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {toastMsg && <div className="fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-2xl flex items-center gap-2 animate-bounce"><span>{toastMsg}</span></div>}

      {showModal && (
        <ModalShell title={editItem ? 'Edit Jadwal Mengajar' : 'Tambah Jadwal Mengajar'} onClose={() => setShowModal(false)} maxWidth="md"
          footer={<>
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:text-foreground text-xs">Batal</button>
            <button type="submit" form="schedForm" className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs">{editItem ? 'Simpan Perubahan' : 'Simpan'}</button>
          </>}>
          <form id="schedForm" onSubmit={handleSubmit} className="space-y-4">
            <FormSelect label="Guru" value={formTeacherId} onChange={e => setFormTeacherId(e.target.value)} placeholder="-- Pilih Guru --" options={teachersList.map(t => ({ value: t.id, label: t.name }))} />
            <FormSelect label="Kelas" value={formClassId} onChange={e => setFormClassId(e.target.value)} placeholder="-- Pilih Kelas --" options={classesList.map(c => ({ value: String(c.id), label: c.name }))} />
            <FormSelect label="Hari" value={formDay} onChange={e => setFormDay(e.target.value)} options={DAYS.map(d => ({ value: d, label: DAY_LABELS[d] }))} />
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Jam Mulai (HH:MM:SS)" value={formStart} onChange={e => setFormStart(e.target.value)} placeholder="07:00:00" required />
              <FormInput label="Jam Selesai (HH:MM:SS)" value={formEnd} onChange={e => setFormEnd(e.target.value)} placeholder="08:30:00" required />
            </div>
            <FormInput label="Mata Pelajaran" value={formSubject} onChange={e => setFormSubject(e.target.value)} placeholder="Contoh: Matematika Wajib" />
            {formError && <div className="text-destructive text-xs">{formError}</div>}
          </form>
        </ModalShell>
      )}
    </section>
  );
};
