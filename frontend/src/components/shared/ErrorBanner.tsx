import { ShieldAlert } from 'lucide-react';

interface Props {
  message: string;
}

export const ErrorBanner: React.FC<Props> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
      <ShieldAlert className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
};
