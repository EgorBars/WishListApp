import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', id, ...props }) => {
  const genId = useId();
  const inputId = id ?? props.name ?? genId;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-bold text-gray-700 ml-1"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full px-4 py-3 rounded-2xl border transition-all outline-none
          ${error 
            ? 'border-brand-error focus:ring-2 focus:ring-red-200 bg-red-50/30' 
            : 'border-gray-200 focus:border-brand-primary focus:ring-4 focus:ring-indigo-50 bg-white'
          }
          disabled:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed
          placeholder:text-gray-400 text-gray-900
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-[11px] text-brand-error font-bold ml-1 uppercase tracking-wider animate-in fade-in duration-200">
          {error}
        </p>
      )}
    </div>
  );
};