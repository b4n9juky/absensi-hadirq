import { RefreshCw } from 'lucide-react';

interface Props {
  text?: string;
}

export const LoadingSpinner: React.FC<Props> = ({ text = 'Memuat data...' }) => (
  <div className="py-20 text-center text-muted-foreground text-sm">
    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
    <span>{text}</span>
  </div>
);
