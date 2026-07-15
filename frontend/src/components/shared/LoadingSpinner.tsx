import { RefreshCw } from 'lucide-react';

interface Props {
  text?: string;
}

export const LoadingSpinner: React.FC<Props> = ({ text = 'Memuat data...' }) => (
  <div className="py-12 text-center text-muted-foreground text-base">
    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-3" />
    <span>{text}</span>
  </div>
);
