import { Check } from 'lucide-react';

interface Props {
  message: string;
}

export const Toast: React.FC<Props> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm tracking-wide shadow-2xl flex items-center gap-2 animate-bounce">
      <Check className="w-5 h-5 shrink-0" />
      <span>{message}</span>
    </div>
  );
};
