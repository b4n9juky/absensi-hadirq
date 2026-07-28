import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, GraduationCap, Loader } from 'lucide-react';

interface Props {
  token: string;
}

interface StudentRecord {
  id: number; nis: string; classId: number;
  studentName: string; className: string;
  qrcode?: string | null;
  photo?: string | null;
}

interface ClassRecord { id: number; name: string; }

export const StudentCardPrintSection: React.FC<Props> = ({ token }) => {
  const [filterClass, setFilterClass] = useState('');
  const authHeader = { Authorization: `Bearer ${token}` };

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings', { headers: authHeader });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mengambil pengaturan.');
      return data.data;
    },
  });

  const { data: classes } = useQuery({
    queryKey: ['classListForPrint'],
    queryFn: async () => {
      const res = await fetch('/api/classes', { headers: authHeader });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mengambil kelas.');
      return data.data as ClassRecord[];
    },
  });

  const { data: students, isPending: loading, error: loadError } = useQuery({
    queryKey: ['studentsForPrint', filterClass],
    queryFn: async () => {
      const params = filterClass ? `?classId=${filterClass}` : '';
      const res = await fetch(`/api/students${params}`, { headers: authHeader });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mengambil data siswa.');
      return data.data as StudentRecord[];
    },
  });

  const schoolName = settings?.school_name || 'SEKOLAH';
  const schoolAddress = settings?.school_address || '';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-0">
      <section className="bg-card border border-border rounded-xl p-5 print:hidden">
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Cetak Kartu Siswa (QR Code)</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Filter Kelas</label>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary">
              <option value="">Semua Kelas</option>
              {(classes || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            {students && <span>{students.length} siswa</span>}
          </div>
          <div className="flex justify-end">
            <button onClick={handlePrint} disabled={!students || students.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15 text-xs font-bold transition-all disabled:opacity-50">
              <Printer className="w-4 h-4" />
              <span>Cetak Kartu</span>
            </button>
          </div>
        </div>
      </section>

      {loadError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs print:hidden">
          {(loadError as Error).message}
        </div>
      )}

      {loading && (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground text-sm animate-pulse print:hidden">
          <Loader className="w-6 h-6 mx-auto mb-3 animate-spin" />
          Memuat data siswa...
        </div>
      )}

      {students && students.length > 0 && (
        <div className="print-grid">
          {students.map((student, index) => (
            <div key={student.id} className="student-card">
              <div className="card-header">
                <div className="card-title">STUDENT'S CARD</div>
                <div className="card-school">{schoolName}</div>
                {schoolAddress && <div className="card-address">{schoolAddress}</div>}
              </div>
              <div className="card-body">
                <div className="card-left">
                  {student.photo ? (
                    <img src={student.photo} alt={student.studentName} className="card-photo" crossOrigin="anonymous" />
                  ) : (
                    <div className="card-photo-placeholder">
                      <GraduationCap className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="card-info">
                    <div className="card-info-row">
                      <span className="card-label">Name</span>
                      <span className="card-colon">:</span>
                      <span className="card-value">{student.studentName}</span>
                    </div>
                    <div className="card-info-row">
                      <span className="card-label">Kelas</span>
                      <span className="card-colon">:</span>
                      <span className="card-value">{student.className}</span>
                    </div>
                    <div className="card-info-row">
                      <span className="card-label">NIS</span>
                      <span className="card-colon">:</span>
                      <span className="card-value">{student.nis}</span>
                    </div>
                  </div>
                </div>
                <div className="card-right">
                  {student.qrcode ? (
                    <img src={student.qrcode} alt="QR" className="card-qrcode" />
                  ) : (
                    <div className="card-qrcode-placeholder">
                      <span className="text-2xs text-muted-foreground">No QR</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="card-footer">
                HadirQ - Sistem Absensi Sekolah
              </div>
            </div>
          ))}
        </div>
      )}

      {students && students.length === 0 && !loading && (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground text-sm print:hidden">
          Tidak ada siswa ditemukan.
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:space-y-0 > * { margin-top: 0; margin-bottom: 0; }
        }
        .print-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media print {
          .print-grid {
            gap: 8px;
          }
        }
        .student-card {
          border: 1.5px solid #d1d5db;
          border-radius: 12px;
          overflow: hidden;
          background: white;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .card-header {
          background: #1e293b;
          color: white;
          text-align: center;
          padding: 8px 12px;
        }
        .card-title {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .card-school {
          font-size: 10px;
          font-weight: 600;
          margin-top: 2px;
        }
        .card-address {
          font-size: 8px;
          opacity: 0.8;
          margin-top: 1px;
        }
        .card-body {
          display: flex;
          padding: 10px;
          gap: 10px;
          min-height: 120px;
        }
        .card-left {
          flex: 1;
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .card-photo {
          width: 70px;
          height: 85px;
          object-fit: cover;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          flex-shrink: 0;
        }
        .card-photo-placeholder {
          width: 70px;
          height: 85px;
          border-radius: 6px;
          border: 1px dashed #d1d5db;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: #f9fafb;
        }
        .card-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }
        .card-info-row {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 9px;
        }
        .card-label {
          font-weight: 700;
          color: #374151;
          min-width: 28px;
          text-transform: uppercase;
          font-size: 7px;
        }
        .card-colon {
          color: #9ca3af;
        }
        .card-value {
          font-weight: 600;
          color: #111827;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .card-right {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 85px;
        }
        .card-qrcode {
          width: 80px;
          height: 80px;
          object-fit: contain;
        }
        .card-qrcode-placeholder {
          width: 80px;
          height: 80px;
          border: 1px dashed #d1d5db;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f9fafb;
        }
        .card-footer {
          background: #f1f5f9;
          text-align: center;
          font-size: 7px;
          color: #64748b;
          padding: 4px;
          border-top: 1px solid #e5e7eb;
          letter-spacing: 0.5px;
        }
      `}</style>
    </div>
  );
};
