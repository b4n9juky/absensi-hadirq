import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

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

export const DataTable: React.FC<Props> = ({
  columns,
  data,
  loading,
  emptyText = 'Tidak ada data.',
  rowKey = 'id',
  searchPlaceholder = 'Cari data...',
  initialRowsPerPage = 10
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [currentPage, setCurrentPage] = useState(1);

  // Helper to recursively check values for matches
  const rowMatchesSearch = (row: any, query: string): boolean => {
    if (!query) return true;
    const queryLower = query.toLowerCase();
    
    const checkValue = (val: any): boolean => {
      if (val === null || val === undefined) return false;
      if (typeof val === 'object') {
        return Object.values(val).some(nested => checkValue(nested));
      }
      return String(val).toLowerCase().includes(queryLower);
    };

    return Object.values(row).some(val => checkValue(val));
  };

  // 1. Filter data based on search query
  const filteredData = useMemo(() => {
    setCurrentPage(1); // Reset page on search
    return data.filter(row => rowMatchesSearch(row, searchQuery));
  }, [data, searchQuery]);

  // 2. Pagination calculations
  const totalRows = filteredData.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
  
  // Ensure current page is valid
  const activePage = Math.min(currentPage, totalPages);
  
  const startIndex = (activePage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
  
  const paginatedData = useMemo(() => {
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, startIndex, endIndex]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Search and Limit Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 bg-muted/5 border-b border-border/80">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-background border border-input rounded-xl pl-9 pr-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
          />
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Tampilkan:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-background border border-input rounded-xl px-2 py-1.5 focus:outline-none focus:border-primary font-semibold text-foreground"
          >
            {[5, 10, 15, 20, 50].map((size) => (
              <option key={size} value={size}>{size} Baris</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto w-full">
        {paginatedData.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground text-sm">
            <span>{searchQuery ? 'Data yang dicari tidak ditemukan.' : emptyText}</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/20 border-b border-border text-muted-foreground text-xs uppercase font-semibold tracking-wider">
                {columns.map((col) => (
                  <th key={col.key} className={`px-6 py-4 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-xs">
              {paginatedData.map((row, idx) => (
                <tr key={row[rowKey] ?? idx} className="hover:bg-muted/25 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-6 py-4 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {totalRows > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border bg-muted/5 text-xs text-muted-foreground">
          <div>
            Menampilkan <span className="font-semibold text-foreground">{startIndex + 1}-{endIndex}</span> dari <span className="font-semibold text-foreground">{totalRows}</span> data
            {searchQuery && ` (disaring dari total ${data.length})`}
          </div>
          <div className="flex items-center gap-4">
            <span>Halaman <span className="font-semibold text-foreground">{activePage}</span> dari <span className="font-semibold text-foreground">{totalPages}</span></span>
            <div className="flex items-center gap-1">
              <button
                disabled={activePage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:hover:bg-background transition-colors text-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:hover:bg-background transition-colors text-foreground"
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
