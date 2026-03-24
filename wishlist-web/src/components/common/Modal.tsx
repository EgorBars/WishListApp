import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      // Блокируем прокрутку основной страницы (п. 4.6 ТЗ)
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
      {/* Задний фон (Backdrop) — затемнение более глубокое для фокуса на окне */}
      <div 
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Само окно (Content) — скругления 3xl как в Login/Register */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300 border border-gray-100 flex flex-col">
        
        {/* Шапка модального окна — увеличили отступы и жирность шрифта */}
        <div className="flex items-center justify-between p-6 border-b border-gray-50">
          <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            {title}
          </h3>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-indigo-50 rounded-2xl transition-all text-gray-400 hover:text-brand-primary focus:outline-none focus:ring-4 focus:ring-indigo-50 active:scale-90"
            aria-label="Закрыть модальное окно"
          >
            <X size={24} />
          </button>
        </div>

        {/* Тело модального окна — отступы согласованы с карточками */}
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
};