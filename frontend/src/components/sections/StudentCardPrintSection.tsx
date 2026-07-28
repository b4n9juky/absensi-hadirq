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
    if (!students || students.length === 0) return;
    const origin = window.location.origin;
    const toAbs = (url: string) => url.startsWith('http') ? url : origin + url;
    const cardsHtml = students.map((student) => `
      <div class="student-card">
        <div class="card-header">
          <div class="card-title">STUDENT'S CARD</div>
          <div class="card-school">${escapeHtml(schoolName)}</div>
          ${schoolAddress ? `<div class="card-address">${escapeHtml(schoolAddress)}</div>` : ''}
        </div>
        <div class="card-body">
          <div class="card-left">
            ${student.photo
              ? `<img src="${toAbs(student.photo)}" alt="${escapeHtml(student.studentName)}" class="card-photo" />`
              : `<div class="card-photo-placeholder"></div>`}
            <div class="card-info">
              <div class="card-info-row"><span class="card-label">Name</span><span class="card-colon">:</span><span class="card-value">${escapeHtml(student.studentName)}</span></div>
              <div class="card-info-row"><span class="card-label">Kelas</span><span class="card-colon">:</span><span class="card-value">${escapeHtml(student.className)}</span></div>
              <div class="card-info-row"><span class="card-label">NIS</span><span class="card-colon">:</span><span class="card-value">${escapeHtml(student.nis)}</span></div>
            </div>
          </div>
          <div class="card-right">
            ${student.qrcode ? `<img src="${toAbs(student.qrcode)}" alt="QR" class="card-qrcode" />` : `<div class="card-qrcode-placeholder"></div>`}
          </div>
        </div>
        <div class="card-footer">HadirQ - Sistem Absensi Sekolah</div>
      </div>
    `).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Izinkan pop-up untuk mencetak.'); return; }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cetak Kartu Siswa</title>
        <style>
          @page { size: A4 portrait; margin: 8mm; }
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8mm; }
          .student-card { border: 1.5px solid #d1d5db; border-radius: 8px; background: white; page-break-inside: avoid; break-inside: avoid; overflow: hidden; }
          .card-header { background: #1e293b; color: white; text-align: center; padding: 6px 10px; }
          .card-title { font-size: 10px; font-weight: 800; letter-spacing: 1px; }
          .card-school { font-size: 9px; font-weight: 600; margin-top: 1px; }
          .card-address { font-size: 7px; opacity: 0.8; }
          .card-body { display: flex; padding: 8px; gap: 8px; }
          .card-left { flex: 1; display: flex; gap: 8px; align-items: center; }
          .card-photo { width: 60px; height: 72px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb; flex-shrink: 0; }
          .card-photo-placeholder { width: 60px; height: 72px; border-radius: 4px; border: 1px dashed #d1d5db; flex-shrink: 0; background: #f9fafb; }
          .card-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
          .card-info-row { display: flex; align-items: center; gap: 2px; font-size: 8px; }
          .card-label { font-weight: 700; color: #374151; min-width: 26px; font-size: 7px; }
          .card-colon { color: #9ca3af; }
          .card-value { font-weight: 600; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .card-right { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 75px; }
          .card-qrcode { width: 70px; height: 70px; object-fit: contain; }
          .card-qrcode-placeholder { width: 70px; height: 70px; border: 1px dashed #d1d5db; border-radius: 4px; background: #f9fafb; }
          .card-footer { background: #f1f5f9; text-align: center; font-size: 6px; color: #64748b; padding: 3px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="print-grid">${cardsHtml}</div>
        <script>
          window.onload = function() { window.print(); window.close(); };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return (
    <div className="space-y-6">
      <section className="bg-card border border-border rounded-xl p-5">
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
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
          {(loadError as Error).message}
        </div>
      )}

      {loading && (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground text-sm animate-pulse">
          <Loader className="w-6 h-6 mx-auto mb-3 animate-spin" />
          Memuat data siswa...
        </div>
      )}

      {students && students.length > 0 && (
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Printer className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Preview ({students.length} siswa)
            </h3>
          </div>
          <div className="p-4">
            <div className="preview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {students.map((student) => (
                <div key={student.id} style={{ border: '1.5px solid #d1d5db', borderRadius: '8px', background: 'white' }}>
                  <div style={{ background: '#1e293b', color: 'white', textAlign: 'center', padding: '6px 10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1px' }}>STUDENT'S CARD</div>
                    <div style={{ fontSize: '9px', fontWeight: 600, marginTop: '1px' }}>{schoolName}</div>
                    {schoolAddress && <div style={{ fontSize: '7px', opacity: 0.8 }}>{schoolAddress}</div>}
                  </div>
                  <div style={{ display: 'flex', padding: '8px', gap: '8px' }}>
                    <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {student.photo ? (
                        <img src={student.photo} alt={student.studentName} style={{ width: '60px', height: '72px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e5e7eb', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: '60px', height: '72px', borderRadius: '4px', border: '1px dashed #d1d5db', flexShrink: 0, background: '#f9fafb' }} />
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                        {[
                          { label: 'Name', value: student.studentName },
                          { label: 'Kelas', value: student.className },
                          { label: 'NIS', value: student.nis },
                        ].map((row) => (
                          <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '8px' }}>
                            <span style={{ fontWeight: 700, color: '#374151', minWidth: '26px', fontSize: '7px' }}>{row.label}</span>
                            <span style={{ color: '#9ca3af' }}>:</span>
                            <span style={{ fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '75px' }}>
                      {student.qrcode ? (
                        <img src={student.qrcode} alt="QR" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
                      ) : (
                        <div style={{ width: '70px', height: '70px', border: '1px dashed #d1d5db', borderRadius: '4px', background: '#f9fafb' }} />
                      )}
                    </div>
                  </div>
                  <div style={{ background: '#f1f5f9', textAlign: 'center', fontSize: '6px', color: '#64748b', padding: '3px', borderTop: '1px solid #e5e7eb' }}>
                    HadirQ - Sistem Absensi Sekolah
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {students && students.length === 0 && !loading && (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground text-sm">
          Tidak ada siswa ditemukan.
        </div>
      )}
    </div>
  );
};
