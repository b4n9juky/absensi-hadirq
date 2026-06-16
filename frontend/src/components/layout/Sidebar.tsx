import { useNavigate } from 'react-router-dom';
import { LogOut, Users, LayoutDashboard, BookOpen, GraduationCap, Calendar, Settings, Vibrate, Clock, Book } from 'lucide-react';
import { ThemeToggle } from '../shared/ThemeToggle';

const allNavItems = [
  { path: '/dashboard/ringkasan', key: 'dashboard', icon: <LayoutDashboard className="w-4.5 h-4.5" />, label: 'Ringkasan & Absensi', roles: ['admin', 'guru'] },
  { path: '/dashboard/pengguna', key: 'users', icon: <Users className="w-4.5 h-4.5" />, label: 'Kelola Pengguna', roles: ['admin'] },
  { path: '/dashboard/kelas', key: 'classes', icon: <BookOpen className="w-4.5 h-4.5" />, label: 'Kelola Kelas', roles: ['admin'] },
  { path: '/dashboard/siswa', key: 'students', icon: <GraduationCap className="w-4.5 h-4.5" />, label: 'Kelola Siswa', roles: ['admin'] },
  { path: '/dashboard/akademik', key: 'academic', icon: <Calendar className="w-4.5 h-4.5" />, label: 'Akademik & Jadwal', roles: ['admin'] },
  { path: '/dashboard/jadwal-mengajar', key: 'teaching-schedule', icon: <Clock className="w-4.5 h-4.5" />, label: 'Jadwal Mengajar', roles: ['admin', 'guru'] },
  { path: '/dashboard/mata-pelajaran', key: 'subjects', icon: <Book className="w-4.5 h-4.5" />, label: 'Mata Pelajaran', roles: ['admin'] },
  { path: '/dashboard/pengaturan', key: 'settings', icon: <Settings className="w-4.5 h-4.5" />, label: 'Pengaturan', roles: ['admin'] },
];

interface Props {
  activeSection: string;
  onSectionChange: (s: string) => void;
  user: { name: string; role: string };
  onLogout: () => void;
}

export const Sidebar: React.FC<Props> = ({ activeSection, onSectionChange, user, onLogout }) => {
  const navigate = useNavigate();
  const navItems = allNavItems.filter(item => item.roles.includes(user.role));

  return (
    <aside className="w-64 bg-card border-r border-border backdrop-blur-md hidden md:flex flex-col justify-between shrink-0">
      <div>
        <div className="px-6 py-6 border-b border-border flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
            <Vibrate className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-md font-black tracking-wider text-foreground">
              Shake<span className="text-teal-400">Absen</span>
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-widest font-semibold uppercase">Control Panel</p>
          </div>
        </div>
        <nav className="p-4 space-y-1.5">
          {navItems.map(({ path, key, icon, label }) => (
            <button
              key={key}
              onClick={() => {
                onSectionChange(key);
                navigate(path);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeSection === key
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-md shadow-teal-500/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent'
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="p-4 border-t border-border space-y-2">
        <ThemeToggle />
        <div className="p-3 bg-background/50 rounded-xl border border-border text-xs">
          <div className="font-bold text-foreground max-w-full truncate">{user.name}</div>
          <div className="text-[10px] text-muted-foreground uppercase mt-0.5 tracking-wider">{user.role}</div>
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
};
