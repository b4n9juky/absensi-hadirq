import { Shield, BookOpen, GraduationCap, Check, Clock, X } from 'lucide-react';

interface RoleBadgeProps {
  role: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const styles: Record<string, string> = {
    admin: 'bg-destructive/10 border-destructive/20 text-destructive',
    guru: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
    siswa: 'bg-teal-500/10 border-teal-500/20 text-teal-500',
  };
  const icons: Record<string, React.ReactNode> = {
    admin: <Shield className="w-3 h-3" />,
    guru: <BookOpen className="w-3 h-3" />,
    siswa: <GraduationCap className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-2xs font-semibold uppercase border ${styles[role] || styles.siswa}`}>
      {icons[role] || icons.siswa}
      {role}
    </span>
  );
};

interface AttendanceBadgeProps {
  isLate: boolean;
}

export const AttendanceBadge: React.FC<AttendanceBadgeProps> = ({ isLate }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${isLate ? 'bg-warning/10 border-warning/20 text-warning' : 'bg-success/10 border-success/20 text-success'}`}>
    {isLate ? <Clock className="w-3 h-3" /> : <Check className="w-3 h-3" />}
    {isLate ? 'TERLAMBAT' : 'TEPAT WAKTU'}
  </span>
);

interface DeviceBadgeProps {
  bound: boolean;
}

export const DeviceBadge: React.FC<DeviceBadgeProps> = ({ bound }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-bold tracking-wide uppercase ${bound ? 'bg-teal-500/10 text-teal-500 border border-teal-500/20' : 'bg-muted text-muted-foreground border border-border'}`}>
    {bound ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
    {bound ? 'Terikat' : 'Belum Terikat'}
  </span>
);

interface ActiveBadgeProps {
  isActive: boolean;
}

export const ActiveBadge: React.FC<ActiveBadgeProps> = ({ isActive }) => {
  if (!isActive) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-success/10 text-success border border-success/20 font-bold text-2xs">
      <Check className="w-3 h-3" />
      AKTIF
    </span>
  );
};
