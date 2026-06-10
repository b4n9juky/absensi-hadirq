import { ShieldAlert } from 'lucide-react';

interface Props {
  message: string;
}

export const ErrorBanner: React.FC<Props> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3">
      <ShieldAlert className="w-5 h-5 shrink-0" />
      <span>{message}</span>
    </div>
  );
};
