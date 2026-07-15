import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, RefreshCw, Download } from 'lucide-react';
import { ModalShell } from './ModalShell';

declare global {
  interface Window { XLSX: any; }
}

interface ExcelColumn {
  header: string;
  key: string;
}

interface ImportResult {
  imported: number;
  failed: number;
  results: Array<{ row: number; status: string; error?: string; [key: string]: any }>;
}

interface Props {
  title: string;
  endpoint: string;
  templateUrl: string;
  columns: ExcelColumn[];
  authHeader: Record<string, string>;
  onClose: () => void;
  onSuccess?: () => void;
  inputId?: string;
  maxFileSizeMB?: number;
}

export const ImportExcelModal: React.FC<Props> = ({
  title,
  endpoint,
  templateUrl,
  columns,
  authHeader,
  onClose,
  onSuccess,
  inputId = 'import-excel-input',
  maxFileSizeMB = 5,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setPreview([]);
    setResult(null);
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > maxFileSizeMB * 1024 * 1024) {
      alert(`Ukuran file maksimal ${maxFileSizeMB} MB.`);
      return;
    }

    setFile(selected);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const XLSX = window.XLSX;
        if (!XLSX) return;
        const wb = XLSX.read(ev.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        setPreview((rows as any[]).slice(0, 5));
      } catch {
        setPreview([]);
      }
    };
    reader.readAsBinaryString(selected);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: authHeader,
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        onSuccess?.();
      } else {
        alert(data.error || 'Gagal mengimport data.');
      }
    } catch {
      alert('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  const errorRows = result?.results.filter(r => r.status === 'failed' || r.status === 'skipped') || [];
  const resultField = columns.length > 0 ? Object.keys(result?.results[0] || {}).find(k => k !== 'row' && k !== 'status' && k !== 'error') || 'id' : 'id';

  return (
    <ModalShell
      title={title}
      onClose={handleClose}
      maxWidth="lg"
      footer={!result ? (
        <>
          <button type="button" onClick={handleClose} className="btn-secondary text-sm">Batal</button>
          <button onClick={handleSubmit} disabled={!file || loading}
            className={`btn-primary text-sm ${!file || loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Mengimport...</> : <><Upload className="w-4 h-4" /> Import</>}
          </button>
        </>
      ) : undefined}
    >
      {result ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-success/10 border border-success/20 rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-success">{result.imported}</div>
              <div className="text-sm text-muted-foreground mt-0.5">Berhasil</div>
            </div>
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-destructive">{result.failed}</div>
              <div className="text-sm text-muted-foreground mt-0.5">Gagal</div>
            </div>
          </div>
          {errorRows.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Detail Error:</h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {errorRows.map((r, i) => (
                  <div key={i} className="bg-destructive/5 border border-destructive/10 rounded-lg px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Baris {r.row}:</span> {String(r[resultField] ?? 'n/a')} &mdash; <span className="text-destructive font-medium">{r.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={handleClose} className="w-full btn-primary text-sm">
            Tutup
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-accent/5 border border-accent/10">
            <span className="text-sm text-muted-foreground">Butuh template? Download contoh:</span>
            <a href={templateUrl} download className="btn-primary text-xs">
              <Download className="w-3.5 h-3.5" /> Download Template
            </a>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">File Excel</label>
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div className="text-foreground">
                  <FileSpreadsheet className="w-10 h-10 mx-auto text-primary mb-3" />
                  <p className="font-semibold text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <Upload className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="font-semibold text-sm">Klik untuk pilih file Excel</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Format .xlsx atau .xls (maks {maxFileSizeMB} MB)</p>
                </div>
              )}
              <input ref={fileInputRef} id={inputId} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            </div>
          </div>
          {preview.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Preview ({Math.min(preview.length, 5)} baris pertama):</h4>
              <div className="bg-muted/30 rounded-xl overflow-hidden border border-border">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      {columns.map(c => (
                        <th key={c.key} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{c.header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.map((row, i) => (
                      <tr key={i} className="text-foreground">
                        {columns.map(c => (
                          <td key={c.key} className="px-4 py-2.5">{String(row[c.key] ?? '-')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
};
