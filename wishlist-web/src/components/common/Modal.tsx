import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClassMap = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
} as const;

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'sm',
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl animate-in fade-in zoom-in duration-300 ${sizeClassMap[size]}`}
      >
        <div className="flex items-center justify-between border-b border-gray-50 p-6">
          <h3 className="text-2xl font-extrabold tracking-tight text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-2xl p-2 text-gray-400 transition-all hover:bg-indigo-50 hover:text-brand-primary focus:outline-none focus:ring-4 focus:ring-indigo-50 active:scale-90"
            aria-label="Закрыть модальное окно"
          >
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
};
