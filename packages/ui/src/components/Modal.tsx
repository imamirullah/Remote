import React, { useEffect } from 'react';
import { cn } from '../utils';
import { X } from 'lucide-react';
import { Card } from './Card';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 transition-opacity bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Box */}
      <Card
        variant="glass"
        className={cn(
          'relative z-10 w-full max-w-lg border border-slate-800/80 shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          {title && (
            <h3 className="text-lg font-bold tracking-tight text-white">{title}</h3>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="text-slate-300 text-sm font-medium">{children}</div>
      </Card>
    </div>
  );
};
