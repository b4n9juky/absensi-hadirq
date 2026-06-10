import React from 'react';
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
}

export const DataTable: React.FC<Props> = ({ columns, data, loading, emptyText = 'Tidak ada data.', rowKey = 'id' }) => {
  if (loading) return <LoadingSpinner />;

  if (data.length === 0) {
    return (
      <div className="py-20 text-center text-slate-500 text-sm">
        <span>{emptyText}</span>
      </div>
    );
  }

  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-slate-900/20 border-b border-slate-900 text-slate-400 text-xs uppercase font-semibold tracking-wider">
          {columns.map((col) => (
            <th key={col.key} className={`px-6 py-4 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-900/50 text-xs">
        {data.map((row, idx) => (
          <tr key={row[rowKey] ?? idx} className="hover:bg-slate-900/25 transition-colors">
            {columns.map((col) => (
              <td key={col.key} className={`px-6 py-4 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
                {col.render ? col.render(row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
