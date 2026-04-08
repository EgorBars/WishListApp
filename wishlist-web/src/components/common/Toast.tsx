import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

/**
 * Toast компонент для уведомлений
 * Неблокирующее уведомление, которое исчезает через указанное время
 */
export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'error', 
  duration = 5000, 
  onClose 
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-500',
      text: 'text-green-800',
      Icon: CheckCircle2,
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-500',
      text: 'text-red-800',
      Icon: AlertCircle,
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-500',
      text: 'text-blue-800',
      Icon: AlertCircle,
    },
  };

  const { bg, border, icon, text, Icon } = styles[type];

  return (
    <div
      className={`
        fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96
        z-50
        flex items-center gap-3
        px-4 py-4
        rounded-2xl
        border
        ${bg} ${border}
        animate-in fade-in slide-in-from-bottom-4 duration-300
      `}
      role="alert"
    >
      <Icon size={20} className={icon} />
      <p className={`flex-1 text-sm font-medium ${text}`}>{message}</p>
      <button
        onClick={onClose}
        className={`p-1 hover:bg-white/50 rounded transition-colors text-gray-400 hover:text-gray-600`}
        aria-label="Закрыть уведомление"
      >
        <X size={16} />
      </button>
    </div>
  );
};
