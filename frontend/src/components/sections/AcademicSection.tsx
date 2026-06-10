import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { ActiveBadge } from '../shared/StatusBadge';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ModalShell } from '../shared/ModalShell';
import { FormInput, FormSelect } from '../shared/FormField';

interface YearRecord { id: number; name: string; isActive: boolean; }
interface SemesterRecord { id: number; academicYearId: number; name: string; isActive: boolean; }
interface ScheduleRecord { id: number; dayName: string; checkinStart: string; lateAfter: string; checkoutTime: string; }

interface Props { token: string; }

export const AcademicSection: React.FC<Props> = ({ token }) => {
  const authHeader = { 'Authorization': `Bearer ${token}` };
  const [yearsList, setYearsList] = useState<YearRecord[]>([]);
  const [semestersList, setSemestersList] = useState<SemesterRecord[]>([]);
  const [schedulesList, setSchedulesList] = useState<ScheduleRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const triggerToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 4000); };

  // Year state
  const [showAddYear, setShowAddYear] = useState(false);
  const [yearName, setYearName] = useState('');

  // Semester state
  const [showAddSemester, setShowAddSemester] = useState(false);
  const [semName, setSemName] = useState('');
  const [semYearId, setSemYearId] = useState('');

  // Schedule state
  const [showEditSchedule, setShowEditSchedule] = useState<ScheduleRecord | null>(null);
  const [schedStart, setSchedStart] = useState('');
  const [schedLate, setSchedLate] = useState('');
  const [schedCheckout, setSchedCheckout] = useState('');

  const fetchData = useCallback(async () => {
    setListLoading(true);
    try {
      const [resY, resSem, resSched] = await Promise.all([
        fetch('/api/academic-years', { headers: authHeader }),
        fetch('/api/semesters', { headers: authHeader }),
        fetch('/api/schedules', { headers: authHeader }),
      ]);
      const dY = await resY.json(); if (dY.success) setYearsList(dY.data);
      const dSem = await resSem.json(); if (dSem.success) setSemestersList(dSem.data);
      const dSched = await resSched.json(); if (dSched.success) setSchedulesList(dSched.data);
    } catch { /* ignore */ } finally { setListLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (toastMsg) { const t = setTimeout(() => setToastMsg(''), 4000); return () => clearTimeout(t); } }, [toastMsg]);

  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/academic-years', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ name: yearName }) });
      const data = await res.json();
      if (res.ok && data.success) { triggerToast('Tahun ajaran berhasil dibuat!'); setShowAddYear(false); setYearName(''); fetchData(); }
      else throw new Error(data.error || 'Gagal.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const handleActivateYear = async (id: number) => {
    try {
      const res = await fetch(`/api/academic-years/${id}/activate`, { method: 'PUT', headers: authHeader });
      const data = await res.json();
      if (res.ok && data.success) { triggerToast('Tahun ajaran diaktifkan!'); fetchData(); }
      else throw new Error(data.error || 'Gagal.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const handleAddSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/semesters', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ name: semName, academicYearId: parseInt(semYearId) }) });
      const data = await res.json();
      if (res.ok && data.success) { triggerToast('Semester berhasil dibuat!'); setShowAddSemester(false); setSemName(''); setSemYearId(''); fetchData(); }
      else throw new Error(data.error || 'Gagal.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const handleActivateSemester = async (id: number) => {
    try {
      const res = await fetch(`/api/semesters/${id}/activate`, { method: 'PUT', headers: authHeader });
      const data = await res.json();
      if (res.ok && data.success) { triggerToast('Semester diaktifkan!'); fetchData(); }
      else throw new Error(data.error || 'Gagal.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const handleEditSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditSchedule) return;
    try {
      const res = await fetch(`/api/schedules/${showEditSchedule.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ checkinStart: schedStart, lateAfter: schedLate, checkoutTime: schedCheckout }) });
      const data = await res.json();
      if (res.ok && data.success) { triggerToast('Jadwal diperbarui!'); setShowEditSchedule(null); fetchData(); }
      else throw new Error(data.error || 'Gagal.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
      {/* Left Column: Years + Semesters */}
      <div className="space-y-6">
        {/* Academic Years */}
        <section className="bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden shadow-xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div><h2 className="text-md font-bold text-white">Tahun Ajaran</h2><p className="text-[10px] text-slate-500 mt-1">Periode tahun ajaran aktif.</p></div>
            <button onClick={() => { setYearName(''); setShowAddYear(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all">
              <Plus className="w-3.5 h-3.5" /><span>Tambah</span>
            </button>
          </div>
          {listLoading ? <LoadingSpinner /> : (
            <div className="space-y-2">
              {yearsList.length === 0 && <p className="text-slate-500 text-xs">Belum ada data.</p>}
              {yearsList.map((year) => (
                <div key={year.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-950/40 border border-slate-900">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">{year.name}</span>
                    <ActiveBadge isActive={year.isActive} />
                  </div>
                  {!year.isActive && (
                    <button onClick={() => handleActivateYear(year.id)}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] font-semibold transition-colors">
                      Aktifkan
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Semesters */}
        <section className="bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden shadow-xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div><h2 className="text-md font-bold text-white">Semester</h2><p className="text-[10px] text-slate-500 mt-1">Pembagian semester dalam tahun ajaran.</p></div>
            <button onClick={() => { setSemName(''); setSemYearId(''); setShowAddSemester(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all">
              <Plus className="w-3.5 h-3.5" /><span>Tambah</span>
            </button>
          </div>
          {listLoading ? <LoadingSpinner /> : (
            <div className="space-y-2">
              {semestersList.length === 0 && <p className="text-slate-500 text-xs">Belum ada data.</p>}
              {semestersList.map((sem) => (
                <div key={sem.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-950/40 border border-slate-900">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">{sem.name}</span>
                    <span className="text-[10px] text-slate-500">{yearsList.find(y => y.id === sem.academicYearId)?.name || ''}</span>
                    <ActiveBadge isActive={sem.isActive} />
                  </div>
                  {!sem.isActive && (
                    <button onClick={() => handleActivateSemester(sem.id)}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] font-semibold transition-colors">
                      Aktifkan
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Right Column: Schedules */}
      <section className="bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden shadow-xl p-6 space-y-4">
        <div>
          <h2 className="text-md font-bold text-white">Jadwal Harian</h2>
          <p className="text-[10px] text-slate-500 mt-1">Atur jam masuk, batas toleransi, dan jam pulang.</p>
        </div>
        {listLoading ? <LoadingSpinner /> : (
          <div className="space-y-2">
            {schedulesList.length === 0 && <p className="text-slate-500 text-xs">Belum ada data.</p>}
            {schedulesList.map((sched) => (
              <div key={sched.id} className="p-4 rounded-xl bg-slate-950/40 border border-slate-900 flex justify-between items-center gap-4">
                <div>
                  <div className="font-bold text-white text-sm">{sched.dayName}</div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Mulai: {sched.checkinStart} | Toleransi: {sched.lateAfter} | Pulang: {sched.checkoutTime}
                  </div>
                </div>
                <button onClick={() => { setSchedStart(sched.checkinStart); setSchedLate(sched.lateAfter); setSchedCheckout(sched.checkoutTime); setShowEditSchedule(sched); }}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {errorMsg && <div className="col-span-full text-red-400 text-xs">{errorMsg}</div>}
      {toastMsg && <div className="fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-sm shadow-2xl flex items-center gap-2 animate-bounce"><span>{toastMsg}</span></div>}

      {/* Add Year Modal */}
      {showAddYear && (
        <ModalShell title="Tambah Tahun Ajaran" onClose={() => setShowAddYear(false)} maxWidth="sm"
          footer={<><button type="button" onClick={() => setShowAddYear(false)} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 font-bold hover:text-white text-xs">Batal</button><button type="submit" form="addYearForm" className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs">Simpan</button></>}>
          <form id="addYearForm" onSubmit={handleAddYear}>
            <FormInput label="Nama Tahun Ajaran" value={yearName} onChange={(e) => setYearName(e.target.value)} placeholder="Contoh: 2025/2026" required />
          </form>
        </ModalShell>
      )}

      {/* Add Semester Modal */}
      {showAddSemester && (
        <ModalShell title="Tambah Semester" onClose={() => setShowAddSemester(false)} maxWidth="sm"
          footer={<><button type="button" onClick={() => setShowAddSemester(false)} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 font-bold hover:text-white text-xs">Batal</button><button type="submit" form="addSemForm" className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs">Simpan</button></>}>
          <form id="addSemForm" onSubmit={handleAddSemester}>
            <div className="space-y-4">
              <FormInput label="Nama Semester" value={semName} onChange={(e) => setSemName(e.target.value)} placeholder="Contoh: Ganjil 2025" required />
              <FormSelect label="Tahun Ajaran" value={semYearId} onChange={(e) => setSemYearId(e.target.value)}
                options={yearsList.map(y => ({ value: String(y.id), label: y.name }))} placeholder="-- Pilih Tahun Ajaran --" />
            </div>
          </form>
        </ModalShell>
      )}

      {/* Edit Schedule Modal */}
      {showEditSchedule && (
        <ModalShell title="Edit Jadwal Harian" onClose={() => setShowEditSchedule(null)} maxWidth="sm"
          footer={<><button type="button" onClick={() => setShowEditSchedule(null)} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 font-bold hover:text-white text-xs">Batal</button><button type="submit" form="editSchedForm" className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs">Simpan Perubahan</button></>}>
          <form id="editSchedForm" onSubmit={handleEditSchedule}>
            <div className="space-y-4">
              <p className="text-teal-400 font-semibold">{showEditSchedule.dayName}</p>
              <FormInput label="Jam Mulai Absen" type="time" value={schedStart} onChange={(e) => setSchedStart(e.target.value)} required />
              <FormInput label="Batas Toleransi Terlambat" type="time" value={schedLate} onChange={(e) => setSchedLate(e.target.value)} required />
              <FormInput label="Jam Pulang (Checkout)" type="time" value={schedCheckout} onChange={(e) => setSchedCheckout(e.target.value)} required />
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
};
