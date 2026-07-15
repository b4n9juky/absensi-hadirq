import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

interface Column {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: any) => React.ReactNode;
}

interface Props {
  columns: Column[];
  data: any[];
  loading?: boolean;
  emptyText?: string;
  rowKey?: string;
  searchPlaceholder?: string;
  initialRowsPerPage?: number;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-3.5">
          <div className="h-4 bg-muted rounded animate-shimmer" style={{
            width: `${60 + Math.random() * 30}%`,
            backgroundImage: 'linear-gradient(90deg, transparent 0%, hsl(var(--muted-foreground) / 0.08) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
          }} />
        </td>
      ))}
    </tr>
  );
}

function EmptyState({ message, query }: { message: string; query: string }) {
  return (
    <div className="py-16 text-center" role="status">
      <Inbox className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground">
        {query ? 'Data yang dicari tidak ditemukan.' : message}
      </p>
    </div>
  );
}

export const DataTable: React.FC<Props> = ({
  columns,
  data,
  loading,
  emptyText = 'Belum ada data.',
  rowKey = 'id',
  searchPlaceholder = 'Cari...',
  initialRowsPerPage = 10,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return data;
    return data.filter(row => {
      return Object.values(row).some(val => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [data, searchQuery]);

  const totalRows = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="space-y-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 bg-muted/10 border-b border-border">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder={searchPlaceholder}
            className="w-full bg-background border border-input rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 transition-colors"
            aria-label={searchPlaceholder}
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Tampilkan</span>
          <select
            value={rowsPerPage}
            onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="bg-background border border-input rounded-lg px-2 py-1.5 text-sm font-medium text-foreground focus:border-primary/50 transition-colors"
            aria-label="Jumlah baris per halaman"
          >
            {[5, 10, 15, 20, 50].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto w-full">
        {loading ? (
          <table className="w-full text-left border-collapse" aria-busy="true" aria-label="Memuat data">
            <thead>
              <tr className="bg-muted/10 border-b border-border">
                {columns.map(col => (
                  <th key={col.key} className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))}
            </tbody>
          </table>
        ) : paginatedData.length === 0 ? (
          <EmptyState message={emptyText} query={searchQuery} />
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/10 border-b border-border">
                {columns.map(col => (
                  <th key={col.key} className={`px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginatedData.map((row, idx) => (
                <tr key={row[rowKey] ?? idx} className="text-sm hover:bg-muted/30 transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className={`px-5 py-3 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
                      {col.render ? col.render(row) : String(row[col.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalRows > 0 && !loading && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-border bg-muted/10 text-sm text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">{startIndex + 1}-{Math.min(startIndex + rowsPerPage, totalRows)}</span>
            {' '}dari{' '}
            <span className="font-medium text-foreground">{totalRows}</span> data
            {searchQuery && ` (disaring)`}
          </div>
          <div className="flex items-center gap-3">
            <span>Halaman <span className="font-medium text-foreground">{safePage}</span>/{totalPages}</span>
            <div className="flex items-center gap-1">
              <button
                disabled={safePage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:hover:bg-background transition-colors"
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:hover:bg-background transition-colors"
                aria-label="Halaman berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
