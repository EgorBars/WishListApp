import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div 
      className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 text-brand-error text-sm rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300"
      role="alert"
    >
      <AlertCircle size={18} className="flex-shrink-0" />
      <span className="font-medium">{message}</span>
    </div>
  );
};