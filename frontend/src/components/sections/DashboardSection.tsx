import { useState, useEffect, useCallback } from 'react';
import { Users, CheckCircle, Clock, UserMinus, SlidersHorizontal, FileSpreadsheet, RefreshCw, User, MapPin, Eye } from 'lucide-react';
import { ModalShell } from '../shared/ModalShell';

interface Props {
  token: string;
}

const months = [
  { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' }, { value: '3', label: 'Maret' },
  { value: '4', label: 'April' }, { value: '5', label: 'Mei' }, { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' }, { value: '8', label: 'Agustus' }, { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' }, { value: '11', label: 'November' }, { value: '12', label: 'Desember' },
];

export const DashboardSection: React.FC<Props> = ({ token }) => {
  const [stats, setStats] = useState<any>({ totalStudents: 0, presentCount: 0, lateCount: 0, absentCount: 0, daysCount: 1 });
  const [statsLoading, setStatsLoading] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterClass, setFilterClass] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [classesList, setClassesList] = useState<any[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [previewDetails, setPreviewDetails] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const authHeader = { 'Authorization': `Bearer ${token}` };

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const params: string[] = [];
      if (filterDate) params.push(`date=${filterDate}`);
      if (filterClass) params.push(`classId=${filterClass}`);
      if (filterMonth) params.push(`month=${filterMonth}`);
      if (filterYear) params.push(`year=${filterYear}`);
      const qs = params.length > 0 ? `?${params.join('&')}` : '';
      const res = await fetch(`/api/dashboard/stats${qs}`, { headers: authHeader });
      const data = await res.json();
      if (res.ok && data.success) setStats(data.data);
      else throw new Error(data.error || 'Gagal mengambil statistik.');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setStatsLoading(false);
    }
  }, [token, filterDate, filterClass, filterMonth, filterYear]);

  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const params: string[] = [];
      if (filterDate) params.push(`date=${filterDate}`);
      if (filterClass) params.push(`classId=${filterClass}`);
      if (filterMonth) params.push(`month=${filterMonth}`);
      if (filterYear) params.push(`year=${filterYear}`);
      const qs = params.length > 0 ? `?${params.join('&')}` : '';
      const res = await fetch(`/api/reports/attendance${qs}`, { headers: authHeader });
      const data = await res.json();
      if (res.ok) setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setReportsLoading(false);
    }
  }, [token, filterDate, filterClass, filterMonth, filterYear]);

  useEffect(() => {
    fetchStats();
    fetchReports();
    fetch('/api/classes', { headers: authHeader }).then(r => r.json()).then(d => { if (d.success) setClassesList(d.data); }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchStats();
    fetchReports();
  }, [fetchStats, fetchReports]);

  const handleResetFilters = () => {
    setFilterDate(new Date().toISOString().split('T')[0]);
    setFilterClass('');
    setFilterMonth('');
    setFilterYear('');
  };

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return '-';
    try { return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return dateStr; }
  };

  const formatTimeString = (timeStr: string) => {
    if (!timeStr) return '-';
    try { return new Date(timeStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
    catch { return timeStr; }
  };

  return (
    <>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
        {[
          { label: 'Total Siswa', value: stats.totalStudents, icon: <Users className="w-5 h-5" />, color: 'from-blue-500 to-teal-500', iconBg: 'bg-blue-500/10 text-blue-500', textColor: 'text-foreground' },
          { label: 'Hadir Tepat Waktu', value: stats.presentCount, icon: <CheckCircle className="w-5 h-5" />, color: 'from-teal-500 to-emerald-500', iconBg: 'bg-teal-500/10 text-teal-500', textColor: 'text-teal-500' },
          { label: 'Siswa Terlambat', value: stats.lateCount, icon: <Clock className="w-5 h-5" />, color: 'from-amber-500 to-orange-500', iconBg: 'bg-amber-500/10 text-amber-500', textColor: 'text-amber-500' },
          { label: 'Belum Hadir / Absen', value: stats.absentCount, icon: <UserMinus className="w-5 h-5" />, color: 'from-red-500 to-rose-500', iconBg: 'bg-red-500/10 text-red-500', textColor: 'text-red-500' },
        ].map((card, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden group hover:border-border/80 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{card.label}</p>
                <h3 className={`text-3xl font-extrabold mt-2 ${card.textColor}`}>{statsLoading ? '...' : card.value}</h3>
              </div>
              <div className={`p-3 rounded-xl ${card.iconBg}`}>{card.icon}</div>
            </div>
            <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r ${card.color}`} />
          </div>
        ))}
      </section>

      <section className="bg-card/50 border border-border rounded-2xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Saringan & Filter Data</h2>
          </div>
          <button onClick={handleResetFilters} className="px-4 py-2 rounded-xl bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground border border-border text-xs font-bold transition-all self-end">
            Atur Ulang Filter
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Tanggal Absensi</label>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Kelas</label>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary">
              <option value="">Semua Kelas</option>
              {classesList.map((cls: any) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Bulan Rekap</label>
            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary">
              <option value="">Pilih Bulan (Opsional)</option>
              {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Tahun Rekap</label>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary">
              <option value="">Pilih Tahun (Opsional)</option>
              {[2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-border flex justify-between items-center gap-4">
          <div>
            <h2 className="text-md font-bold text-foreground">Log Riwayat Kehadiran Siswa</h2>
            <p className="text-[10px] text-muted-foreground mt-1">Ditemukan {reports.length} rekaman absensi cocok.</p>
          </div>
          <button onClick={() => {
            const csvContent = reports.map((r: any) => `${r.attendanceDate},${r.student?.nis},${r.status}`).join('\n');
            navigator.clipboard.writeText(`Tanggal,NIS,Status\n${csvContent}`);
            alert('Rekap absensi disalin ke clipboard!');
          }} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15 text-xs font-bold transition-all">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>
        </div>
        <div className="overflow-x-auto w-full">
          {reportsLoading ? (
            <div className="py-20 text-center text-muted-foreground text-sm">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
              <span>Memuat data absensi...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground text-sm">
              <User className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <span>Tidak ada data absensi yang ditemukan.</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/20 border-b border-border text-muted-foreground text-xs uppercase font-semibold tracking-wider">
                  <th className="px-6 py-4">Siswa & Kelas</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Absen Masuk (Datang)</th>
                  <th className="px-6 py-4">Absen Pulang (Checkout)</th>
                  <th className="px-6 py-4">Akurasi & Jarak</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-xs">
                {reports.map((row: any) => {
                  const isLate = row.status === 'LATE';
                  return (
                    <tr key={row.id} className="hover:bg-muted/25 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {row.checkinPhoto ? (
                            <img src={row.checkinPhoto} alt="Selfie" onClick={() => { setPreviewPhoto(row.checkinPhoto); setPreviewDetails(row); }}
                              className="w-10 h-10 rounded-lg object-cover cursor-pointer border border-border hover:border-primary transition-colors bg-background" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground/60">
                              <User className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-foreground text-xs">{row.student?.nis || 'Siswa'}</div>
                            <div className="text-[10px] text-muted-foreground">{row.class?.name || 'Umum'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border ${isLate ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                          {isLate ? 'TERLAMBAT' : 'TEPAT WAKTU'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-foreground">{formatTimeString(row.checkinTime)}</div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">{formatDateString(row.attendanceDate)}</div>
                      </td>
                      <td className="px-6 py-4">
                        {row.checkoutTime ? (
                          <div>
                            <div className="text-foreground">{formatTimeString(row.checkoutTime)}</div>
                            <div className="text-[9px] text-muted-foreground mt-0.5">Checkout Selesai</div>
                          </div>
                        ) : <span className="text-[11px] text-muted-foreground/60 italic">Belum Pulang</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-foreground/80">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span>Jarak: <span className="font-semibold text-foreground">{row.distance?.toFixed(1) || '-'}m</span></span>
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">Akurasi GPS: {row.accuracy?.toFixed(1) || '-'}m</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => { setPreviewPhoto(row.checkinPhoto || row.checkoutPhoto); setPreviewDetails(row); }}
                          className="p-2 rounded-lg bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          {errorMsg}
        </div>
      )}

      {previewPhoto && (
        <ModalShell title="Foto Bukti Selfie" onClose={() => { setPreviewPhoto(null); setPreviewDetails(null); }} maxWidth="md"
          footer={<button onClick={() => { setPreviewPhoto(null); setPreviewDetails(null); }} className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:text-foreground text-xs">Tutup</button>}>
          <img src={previewPhoto} alt="Preview Selfie" className="w-full rounded-xl border border-border" />
          {previewDetails && (
            <div className="bg-background rounded-xl p-4 space-y-2 text-xs border border-border">
              <div className="flex justify-between"><span className="text-muted-foreground">Siswa</span><span className="text-foreground font-semibold">{previewDetails.student?.nis || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className={`font-bold ${previewDetails.status === 'LATE' ? 'text-amber-500' : 'text-emerald-500'}`}>{previewDetails.status}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Jam Masuk</span><span className="text-foreground">{formatTimeString(previewDetails.checkinTime)}</span></div>
              {previewDetails.checkoutTime && (
                <div className="flex justify-between"><span className="text-muted-foreground">Jam Pulang</span><span className="text-foreground">{formatTimeString(previewDetails.checkoutTime)}</span></div>
              )}
            </div>
          )}
        </ModalShell>
      )}
    </>
  );
};
