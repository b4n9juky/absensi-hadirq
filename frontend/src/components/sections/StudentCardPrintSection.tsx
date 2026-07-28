import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown, GraduationCap, Loader } from 'lucide-react';

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

async function toBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const StudentCardPrintSection: React.FC<Props> = ({ token }) => {
  const [filterClass, setFilterClass] = useState('');
  const [generating, setGenerating] = useState(false);
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

  const handleGeneratePdf = async () => {
    if (!students || students.length === 0) return;
    setGenerating(true);
    try {
      const { default: jsPDF } = await import('jspdf');

      const PAGE_W = 210;
      const PAGE_H = 297;
      const MARGIN = 10;
      const GAP = 6;
      const CARD_W = (PAGE_W - 2 * MARGIN - GAP) / 2;
      const CARD_H = 58;
      const COLS = 2;
      const ROWS_PER_PAGE = Math.floor((PAGE_H - 2 * MARGIN + GAP) / (CARD_H + GAP));

      const allB64: Record<string, string> = {};
      const needsLoad: { key: string; url: string }[] = [];
      for (const s of students) {
        if (s.photo) needsLoad.push({ key: `photo-${s.id}`, url: s.photo });
        if (s.qrcode) needsLoad.push({ key: `qr-${s.id}`, url: s.qrcode });
      }
      await Promise.all(needsLoad.map(async ({ key, url }) => {
        try { allB64[key] = await toBase64(url); } catch { /* ignore */ }
      }));

      const doc = new jsPDF('p', 'mm', 'a4');

      for (let i = 0; i < students.length; i++) {
        const pageIndex = Math.floor(i / (COLS * ROWS_PER_PAGE));
        const posOnPage = i % (COLS * ROWS_PER_PAGE);
        const col = posOnPage % COLS;
        const row = Math.floor(posOnPage / COLS);

        if (pageIndex > 0 && posOnPage === 0) {
          doc.addPage();
        }

        const x = MARGIN + col * (CARD_W + GAP);
        const y = MARGIN + row * (CARD_H + GAP);

        const student = students[i];

        // Card shadow/border
        doc.setDrawColor(180);
        doc.setLineWidth(0.3);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, y, CARD_W, CARD_H, 1.5, 1.5, 'FD');

        // Header bar
        doc.setFillColor(30, 41, 59);
        doc.roundedRect(x, y, CARD_W, 10, 1.5, 1.5, 'F');
        doc.rect(x, y + 5, CARD_W, 5, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text('STUDENT\'S CARD', x + CARD_W / 2, y + 4, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.text(schoolName, x + CARD_W / 2, y + 8, { align: 'center' });

        // Body
        const bodyY = y + 13;

        // Photo area
        const photoW = 18;
        const photoH = 22;
        const photoKey = `photo-${student.id}`;
        const hasPhoto = allB64[photoKey];
        if (hasPhoto) {
          try { doc.addImage(allB64[photoKey], 'JPEG', x + 2, bodyY, photoW, photoH); } catch { /* ignore */ }
        }
        doc.setDrawColor(200);
        doc.setLineWidth(0.2);
        doc.rect(x + 2, bodyY, photoW, photoH);

        // Info area
        const infoX = x + photoW + 4;
        doc.setTextColor(55, 65, 81);
        doc.setFontSize(5);
        doc.setFont('helvetica', 'bold');

        const infoRows = [
          { label: 'Name', value: student.studentName },
          { label: 'Kelas', value: student.className },
          { label: 'NIS', value: student.nis },
        ];

        let iy = bodyY + 1;
        for (const row of infoRows) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(4.5);
          doc.text(row.label + ' :', infoX, iy);
          doc.setFont('helvetica', 'normal');
          const valX = infoX + doc.getTextWidth(row.label + ' : ') + 0.5;
          doc.text(row.value, valX, iy);
          iy += 5;
        }

        // QR code area
        const qrKey = `qr-${student.id}`;
        const qrSize = 18;
        if (allB64[qrKey]) {
          try { doc.addImage(allB64[qrKey], 'PNG', x + CARD_W - qrSize - 2, bodyY, qrSize, qrSize); } catch { /* ignore */ }
        }
        doc.setDrawColor(200);
        doc.setLineWidth(0.2);
        doc.rect(x + CARD_W - qrSize - 2, bodyY, qrSize, qrSize);

        // Footer
        doc.setFillColor(241, 245, 249);
        doc.rect(x, y + CARD_H - 4, CARD_W, 4, 'F');
        doc.setDrawColor(220);
        doc.setLineWidth(0.2);
        doc.line(x, y + CARD_H - 4, x + CARD_W, y + CARD_H - 4);
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(3.5);
        doc.setFont('helvetica', 'normal');
        doc.text('HadirQ - Sistem Absensi Sekolah', x + CARD_W / 2, y + CARD_H - 1.2, { align: 'center' });
      }

      doc.save('kartu-siswa.pdf');
    } catch (err: any) {
      alert('Gagal membuat PDF: ' + err.message);
    }
    setGenerating(false);
  };

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
            <button onClick={handleGeneratePdf} disabled={!students || students.length === 0 || generating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15 text-xs font-bold transition-all disabled:opacity-50">
              {generating ? <Loader className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              <span>{generating ? 'Membuat PDF...' : 'Download PDF Kartu'}</span>
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

      {generating && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground text-sm">
          <Loader className="w-6 h-6 mx-auto mb-3 animate-spin" />
          Memproses foto dan membuat PDF...
        </div>
      )}

      {students && students.length > 0 && !generating && (
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" />
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
