import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from './Button';

interface ErrorModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}

/**
 * Красивое модальное окно для отображения ошибок
 * Заменяет встроенный alert()
 */
export const ErrorModal: React.FC<ErrorModalProps> = ({ 
  isOpen, 
  message, 
  onClose 
}) => {
  React.useEffect(() => {
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
      role="alertdialog"
      aria-modal="true"
    >
      {/* Фон */}
      <div 
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Окно ошибки */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300 border border-red-100 flex flex-col">
        
        {/* Шапка с иконкой ошибки */}
        <div className="flex items-center justify-between p-6 border-b border-red-50 bg-red-50/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-2xl">
              <AlertCircle size={24} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Ошибка</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-red-100 rounded-2xl transition-all text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-300 active:scale-90"
            aria-label="Закрыть окно ошибки"
          >
            <X size={20} />
          </button>
        </div>

        {/* Сообщение об ошибке */}
        <div className="p-6">
          <p className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">
            {message}
          </p>
        </div>

        {/* Кнопка закрытия */}
        <div className="px-6 pb-6 flex gap-3">
          <Button 
            onClick={onClose}
            variant="primary"
            className="w-full"
          >
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
};
