import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Building, Settings, LogOut, Shield, LayoutDashboard, Database } from 'lucide-react';
import { ThemeToggle } from '../shared/ThemeToggle';
import { ErrorBanner } from '../shared/ErrorBanner';

interface Props {
  user: { name: string; role: string };
  onLogout: () => void;
}

const navItems = [
  { path: '/admin/sekolah', key: 'schools', icon: Building, label: 'Sekolah' },
  { path: '/admin/backup', key: 'backup', icon: Database, label: 'Backup & Restore' },
  { path: '/admin/pengaturan', key: 'settings', icon: Settings, label: 'Pengaturan Global' },
];

export const SuperAdminLayout: React.FC<Props> = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [errorMsg] = useState('');

  const currentPath = location.pathname.split('/').pop() || 'sekolah';
  const activeSection = currentPath;

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-60 bg-card border-r border-border hidden md:flex flex-col shrink-0 h-screen sticky top-0">
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground leading-none">
                Hadir<span className="text-primary">Q</span>
              </h1>
              <p className="text-2xs text-muted-foreground mt-0.5">Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ path, key, icon: Icon, label }) => {
            const isActive = activeSection === key;
            return (
              <button
                key={key}
                onClick={() => navigate(path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-destructive/10 text-destructive border border-destructive/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-destructive' : ''}`} />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <ThemeToggle />
          <div className="px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-sm">
            <div className="font-semibold text-foreground truncate">{user.name}</div>
            <div className="text-2xs text-muted-foreground uppercase tracking-wider mt-0.5">super_admin</div>
          </div>
          <button
            onClick={onLogout}
            className="btn-danger w-full text-sm"
            aria-label="Keluar dari akun"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center px-6 gap-4 shrink-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-destructive" />
            <span className="font-medium">Panel Super Admin</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => navigate('/dashboard/ringkasan')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard Sekolah
          </button>
        </header>
        <main className="flex-1 p-6 overflow-y-auto max-w-6xl w-full mx-auto space-y-6 animate-fade-in">
          <ErrorBanner message={errorMsg} />
          <Outlet />
        </main>
      </div>
    </div>
  );
};
