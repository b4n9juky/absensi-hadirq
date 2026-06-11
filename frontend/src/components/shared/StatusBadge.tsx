interface RoleBadgeProps {
  role: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const styles: Record<string, string> = {
    admin: 'bg-red-500/10 border-red-500/20 text-red-500',
    guru: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
    siswa: 'bg-teal-500/10 border-teal-500/20 text-teal-500',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase border ${styles[role] || styles.siswa}`}>
      {role}
    </span>
  );
};

interface AttendanceBadgeProps {
  isLate: boolean;
}

export const AttendanceBadge: React.FC<AttendanceBadgeProps> = ({ isLate }) => (
  <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border ${isLate ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
    {isLate ? 'TERLAMBAT' : 'TEPAT WAKTU'}
  </span>
);

interface DeviceBadgeProps {
  bound: boolean;
}

export const DeviceBadge: React.FC<DeviceBadgeProps> = ({ bound }) => (
  <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase ${bound ? 'bg-teal-500/10 text-teal-500 border border-teal-500/20' : 'bg-muted text-muted-foreground border border-border'}`}>
    {bound ? 'Terikat' : 'Belum Terikat'}
  </span>
);

interface ActiveBadgeProps {
  isActive: boolean;
}

export const ActiveBadge: React.FC<ActiveBadgeProps> = ({ isActive }) => {
  if (!isActive) return null;
  return (
    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-[9px]">
      AKTIF
    </span>
  );
};
