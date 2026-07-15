import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<Props> = ({
  title,
  message,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  const iconColor = variant === 'danger' ? 'text-destructive' : variant === 'warning' ? 'text-warning' : 'text-accent';
  const confirmClass = variant === 'danger'
    ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
    : variant === 'warning'
    ? 'bg-warning hover:bg-warning/90 text-warning-foreground'
    : 'bg-accent hover:bg-accent/90 text-accent-foreground';

  return (
    <div className="fixed inset-0 bg-background/70 z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-xl shadow-modal w-full max-w-sm overflow-hidden animate-scale-in" role="alertdialog" aria-modal="true">
        <div className="p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <AlertTriangle className={`w-6 h-6 ${iconColor}`} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
        </div>
        <div className="p-4 border-t border-border flex gap-3 justify-end bg-muted/30">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
