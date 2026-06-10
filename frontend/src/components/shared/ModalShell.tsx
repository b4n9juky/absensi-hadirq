import React from 'react';
import { X } from 'lucide-react';

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };

export const ModalShell: React.FC<Props> = ({ title, onClose, children, footer, maxWidth = 'md' }) => (
  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl w-full ${sizeMap[maxWidth]} shadow-2xl overflow-hidden relative`}>
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-bold text-white text-sm">{title}</h3>
        <button type="button" onClick={onClose} className="text-slate-500 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6 space-y-4 text-xs">
        {children}
      </div>
      {footer && (
        <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-950/20">
          {footer}
        </div>
      )}
    </div>
  </div>
);
