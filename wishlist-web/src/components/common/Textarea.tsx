import React, { useId } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className = '', id, ...props }) => {
  const genId = useId();
  const textareaId = id ?? props.name ?? genId;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-bold text-gray-700 ml-1">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`
          w-full px-4 py-3 rounded-2xl border transition-all outline-none resize-none
          ${error 
            ? 'border-brand-error focus:ring-2 focus:ring-red-200' 
            : 'border-gray-200 focus:border-brand-primary focus:ring-4 focus:ring-indigo-50'
          }
          disabled:opacity-60 disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-[11px] text-brand-error font-bold ml-1 uppercase">{error}</p>}
    </div>
  );
};