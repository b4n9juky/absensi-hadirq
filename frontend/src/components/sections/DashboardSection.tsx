import { useState, useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Users, CheckCircle, Clock, UserMinus, SlidersHorizontal, FileSpreadsheet, User, MapPin, Eye, Calendar, Camera } from 'lucide-react';
import { ModalShell } from '../shared/ModalShell';
import { DataTable } from '../shared/DataTable';

interface Props {
  token: string;
  user: { name: string; role: string };
}

const months = [
  { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' }, { value: '3', label: 'Maret' },
  { value: '4', label: 'April' }, { value: '5', label: 'Mei' }, { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' }, { value: '8', label: 'Agustus' }, { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' }, { value: '11', label: 'November' }, { value: '12', label: 'Desember' },
];

export const DashboardSection: React.FC<Props> = ({ token, user }) => {
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterClass, setFilterClass] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [previewDetails, setPreviewDetails] = useState<any | null>(null);
  const [serverClock, setServerClock] = useState<Date | null>(null);

  const authHeader = { 'Authorization': `Bearer ${token}` };

  const columns = [
    {
      key: 'student',
      header: 'Siswa & Kelas',
      render: (row: any) => (
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
            <div className="font-bold text-foreground text-xs">{row.student?.name || 'Siswa'}</div>
            <div className="text-[10px] text-muted-foreground">{row.student?.nis || '-'} | {row.class?.name || 'Umum'}</div>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center' as const,
      render: (row: any) => {
        const status = row.status;
        const isVerified = !!row.isVerified;
        switch (status) {
          case 'PRESENT':
            return (
              <div className="flex flex-col gap-1 items-center justify-center">
                <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
                  TEPAT WAKTU
                </span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold border ${isVerified ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-amber-500/10 border-amber-500/20 text-amber-600'}`}>
                  {isVerified ? 'Terverifikasi' : 'Belum Diverifikasi'}
                </span>
              </div>
            );
          case 'LATE':
            return (
              <div className="flex flex-col gap-1 items-center justify-center">
                <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border bg-amber-500/10 border-amber-500/20 text-amber-500">
                  TERLAMBAT
                </span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold border ${isVerified ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-amber-500/10 border-amber-500/20 text-amber-600'}`}>
                  {isVerified ? 'Terverifikasi' : 'Belum Diverifikasi'}
                </span>
              </div>
            );
          case 'SICK':
            return (
              <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border bg-blue-500/10 border-blue-500/20 text-blue-500">
                SAKIT
              </span>
            );
          case 'EXCUSED':
            return (
              <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border bg-purple-500/10 border-purple-500/20 text-purple-500">
                IZIN
              </span>
            );
          case 'ABSENT':
            return (
              <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border bg-rose-500/10 border-rose-500/20 text-rose-500">
                ALFA
              </span>
            );
          default:
            return (
              <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border bg-muted border-muted-foreground/20 text-muted-foreground">
                {status}
              </span>
            );
        }
      }
    },
    {
      key: 'checkinTime',
      header: 'Absen Masuk (Datang)',
      render: (row: any) => (
        <>
          <div className="text-foreground">{formatTimeString(row.checkinTime)}</div>
          <div className="text-[9px] text-muted-foreground mt-0.5">{formatDateString(row.attendanceDate)}</div>
        </>
      )
    },
    {
      key: 'checkoutTime',
      header: 'Absen Pulang (Checkout)',
      render: (row: any) => (
        row.checkoutTime ? (
          <div>
            <div className="text-foreground">{formatTimeString(row.checkoutTime)}</div>
            <div className="text-[9px] text-muted-foreground mt-0.5">Checkout Selesai</div>
          </div>
        ) : <span className="text-[11px] text-muted-foreground/60 italic">Belum Pulang</span>
      )
    },
    {
      key: 'distance',
      header: 'Akurasi & Jarak',
      render: (row: any) => (
        <>
          <div className="flex items-center gap-1 text-foreground/80">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <span>Jarak: <span className="font-semibold text-foreground">{row.distance?.toFixed(1) || '-'}m</span></span>
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5">Akurasi GPS: {row.accuracy?.toFixed(1) || '-'}m</div>
        </>
      )
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right' as const,
      render: (row: any) => (
        <button onClick={() => { setPreviewPhoto(row.checkinPhoto || row.checkoutPhoto); setPreviewDetails(row); }}
          className="p-2 rounded-lg bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors inline-flex">
          <Eye className="w-3.5 h-3.5" />
        </button>
      )
    }
  ];

  const { data: statsData, isPending: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboardStats', filterDate, filterClass, filterMonth, filterYear],
    queryFn: async () => {
      const params: string[] = [];
      if (filterDate) params.push(`date=${filterDate}`);
      if (filterClass) params.push(`classId=${filterClass}`);
      if (filterMonth) params.push(`month=${filterMonth}`);
      if (filterYear) params.push(`year=${filterYear}`);
      const qs = params.length > 0 ? `?${params.join('&')}` : '';
      const res = await fetch(`/api/dashboard/stats${qs}`, { headers: authHeader });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mengambil statistik.');
      return data.data;
    },
  });
  const stats = statsData || { totalStudents: 0, presentCount: 0, lateCount: 0, absentCount: 0, daysCount: 1 };

  const { data: reportsData, isPending: reportsLoading } = useQuery({
    queryKey: ['attendanceReports', filterDate, filterClass, filterMonth, filterYear],
    queryFn: async () => {
      const params: string[] = [];
      if (filterDate) params.push(`date=${filterDate}`);
      if (filterClass) params.push(`classId=${filterClass}`);
      if (filterMonth) params.push(`month=${filterMonth}`);
      if (filterYear) params.push(`year=${filterYear}`);
      const qs = params.length > 0 ? `?${params.join('&')}` : '';
      const res = await fetch(`/api/reports/attendance${qs}`, { headers: authHeader });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal mengambil data laporan.');
      return Array.isArray(result.data) ? result.data : [];
    },
  });
  const reports = reportsData || [];

  const { data: classesData } = useQuery({
    queryKey: ['classesList'],
    queryFn: async () => {
      const res = await fetch('/api/classes', { headers: authHeader });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mengambil kelas.');
      return data.data;
    },
  });
  const classesList = classesData || [];

  const errorMsg = statsError ? (statsError as Error).message : '';

  // Sync server clock when stats data is loaded
  useEffect(() => {
    if (statsData?.serverTime) {
      setServerClock(new Date(statsData.serverTime));
    }
  }, [statsData?.serverTime]);

  // Tick the clock every second
  useEffect(() => {
    if (!serverClock) return;
    const timer = setInterval(() => {
      setServerClock(prev => prev ? new Date(prev.getTime() + 1000) : null);
    }, 1000);
    return () => clearInterval(timer);
  }, [!!serverClock]);

  // Formatter for clock
  const getClockString = () => {
    if (!serverClock) return '--:--:--';
    const h = String(serverClock.getHours()).padStart(2, '0');
    const m = String(serverClock.getMinutes()).padStart(2, '0');
    const s = String(serverClock.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const getClockDateString = () => {
    if (!serverClock) return 'Memuat tanggal...';
    return serverClock.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

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
      {/* Welcome & Live Server Clock Banner */}
      <section className="bg-gradient-to-r from-teal-950 via-slate-900 to-slate-950 border border-teal-500/20 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden animate-fadeIn mb-2">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.08),transparent_50%)]" />
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            Sistem Aktif
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
            Selamat datang kembali, <span className="text-teal-400">{user?.name || 'Admin'}</span>!
          </h1>
          <p className="text-xs text-muted-foreground">
            {statsData?.schoolName || 'Sistem Absensi Kehadiran Siswa'}
          </p>
          <div className="pt-2">
            <a href="/kiosk-absensi" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold transition-all shadow-lg hover:shadow-teal-500/20">
              <Camera className="w-4 h-4" />
              <span>Buka Kiosk Absensi Wajah</span>
            </a>
          </div>
        </div>
        
        {/* Digital Clock Section */}
        <div className="bg-background/40 backdrop-blur-md border border-border/80 rounded-2xl px-6 py-4 flex flex-col md:items-end justify-center gap-1.5 relative z-10 min-w-[200px] shadow-inner">
          <div className="flex items-center gap-2 text-teal-400 font-mono text-3xl font-extrabold tracking-wider drop-shadow-[0_0_8px_rgba(20,184,166,0.3)]">
            <Clock className="w-5 h-5 text-teal-400/80" />
            <span>{getClockString()}</span>
            <span className="text-[10px] font-sans font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-widest ml-1">WIB</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground/80" />
            <span>{getClockDateString()}</span>
          </div>
        </div>
      </section>

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
        <div className="w-full">
          <DataTable
            columns={columns}
            data={reports}
            loading={reportsLoading}
            searchPlaceholder="Cari siswa atau kelas..."
            emptyText="Tidak ada data absensi yang ditemukan."
            initialRowsPerPage={10}
          />
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-bold ${
                  previewDetails.status === 'LATE' ? 'text-amber-500' :
                  previewDetails.status === 'PRESENT' ? 'text-emerald-500' :
                  previewDetails.status === 'SICK' ? 'text-blue-500' :
                  previewDetails.status === 'EXCUSED' ? 'text-purple-500' :
                  'text-rose-500'
                }`}>
                  {previewDetails.status === 'PRESENT' ? 'TEPAT WAKTU' :
                   previewDetails.status === 'LATE' ? 'TERLAMBAT' :
                   previewDetails.status === 'SICK' ? 'SAKIT' :
                   previewDetails.status === 'EXCUSED' ? 'IZIN' :
                   previewDetails.status === 'ABSENT' ? 'ALFA' :
                   previewDetails.status}
                  {(previewDetails.status === 'PRESENT' || previewDetails.status === 'LATE') && 
                    ` (${previewDetails.isVerified ? 'Terverifikasi' : 'Belum Diverifikasi'})`
                  }
                </span>
              </div>
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
