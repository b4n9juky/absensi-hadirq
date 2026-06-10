import { RefreshCw, Vibrate } from 'lucide-react';

type Section = 'dashboard' | 'users' | 'classes' | 'students' | 'academic';

interface Props {
  activeSection: Section;
  onSectionChange: (s: Section) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const options: { value: Section; label: string }[] = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'users', label: 'Pengguna' },
  { value: 'classes', label: 'Kelas' },
  { value: 'students', label: 'Siswa' },
  { value: 'academic', label: 'Jadwal & Periode' },
];

export const TopBar: React.FC<Props> = ({ activeSection, onSectionChange, onRefresh, isLoading }) => (
  <header className="border-b border-slate-900 bg-slate-900/30 backdrop-blur-md px-6 py-4 flex items-center justify-between md:justify-end">
    <div className="flex items-center gap-2 md:hidden">
      <Vibrate className="w-5 h-5 text-teal-400 animate-pulse" />
      <span className="font-black text-white text-sm">ShakeAbsen Panel</span>
    </div>
    <div className="flex items-center gap-2.5">
      <button
        onClick={onRefresh}
        className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
        title="Refresh Data"
      >
        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
      <div className="md:hidden">
        <select
          value={activeSection}
          onChange={(e: any) => onSectionChange(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs font-bold text-white focus:outline-none"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  </header>
);
