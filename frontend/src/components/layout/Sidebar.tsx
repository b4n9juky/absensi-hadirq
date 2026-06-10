import { LogOut, Users, LayoutDashboard, BookOpen, GraduationCap, Calendar, Vibrate } from 'lucide-react';

type Section = 'dashboard' | 'users' | 'classes' | 'students' | 'academic';

interface Props {
  activeSection: Section;
  onSectionChange: (s: Section) => void;
  user: { name: string; role: string };
  onLogout: () => void;
}

const navItems: { key: Section; icon: React.ReactNode; label: string }[] = [
  { key: 'dashboard', icon: <LayoutDashboard className="w-4.5 h-4.5" />, label: 'Ringkasan & Absensi' },
  { key: 'users', icon: <Users className="w-4.5 h-4.5" />, label: 'Kelola Pengguna' },
  { key: 'classes', icon: <BookOpen className="w-4.5 h-4.5" />, label: 'Kelola Kelas' },
  { key: 'students', icon: <GraduationCap className="w-4.5 h-4.5" />, label: 'Kelola Siswa' },
  { key: 'academic', icon: <Calendar className="w-4.5 h-4.5" />, label: 'Akademik & Jadwal' },
];

export const Sidebar: React.FC<Props> = ({ activeSection, onSectionChange, user, onLogout }) => (
  <aside className="w-64 bg-slate-900/60 border-r border-slate-900/80 backdrop-blur-md hidden md:flex flex-col justify-between shrink-0">
    <div>
      <div className="px-6 py-6 border-b border-slate-900 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
          <Vibrate className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h1 className="text-md font-black tracking-wider text-white">
            Shake<span className="text-teal-400">Absen</span>
          </h1>
          <p className="text-[10px] text-slate-500 tracking-widest font-semibold uppercase">Control Panel</p>
        </div>
      </div>
      <nav className="p-4 space-y-1.5">
        {navItems.map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => onSectionChange(key)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeSection === key
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-md shadow-teal-500/5'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent'
            }`}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
    <div className="p-4 border-t border-slate-900">
      <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-900/60 mb-3 text-xs">
        <div className="font-bold text-white max-w-full truncate">{user.name}</div>
        <div className="text-[10px] text-slate-500 uppercase mt-0.5 tracking-wider">{user.role}</div>
      </div>
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 text-xs font-bold transition-all"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Keluar Sesi</span>
      </button>
    </div>
  </aside>
);
