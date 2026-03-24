import React from 'react';
import { Spinner } from './Spinner'; // Импортируем наш новый спиннер

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
  /** Текст рядом со спиннером при isLoading (п. 5.2.3, 5.3.3 ТЗ). */
  loadingLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading,
  loadingLabel = 'Загрузка...',
  disabled,
  className = '',
  ...props
}) => {
  // Базовые стили согласно п. 5.1.3 (Default, Focus, Disabled)
  const baseStyles = "w-full py-3.5 px-6 rounded-2xl font-bold transition-all duration-200 focus:outline-none focus:ring-4 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]";
  
  // Варианты оформления (п. 4.11)
  const variants = {
    // Primary: брендовый фиолетовый
    primary: "bg-brand-primary text-white hover:bg-indigo-700 focus:ring-indigo-100 shadow-lg shadow-indigo-100",
    
    // Secondary: нейтральный серый
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-200",
    
    // Danger: красный для удаления
    danger: "bg-brand-error text-white hover:bg-red-600 focus:ring-red-100 shadow-lg shadow-red-100",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner size="sm" className="text-current" />
          <span className="tracking-wide">{loadingLabel}</span>
        </>
      ) : (
        <span className="flex items-center gap-2">
          {children}
        </span>
      )}
    </button>
  );
};