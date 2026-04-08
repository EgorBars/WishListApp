import React from 'react';

interface InputSkeletonProps {
  height?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Input skeleton для loading состояния
 * Отображает shimmer эффект (скользящая светлая полоса)
 */
export const InputSkeleton: React.FC<InputSkeletonProps> = ({ 
  height = 'md', 
  className = '' 
}) => {
  const sizes = {
    sm: 'h-8',
    md: 'h-11',
    lg: 'h-14',
  };

  return (
    <div
      className={`
        ${sizes[height]} 
        rounded-2xl 
        bg-gradient-to-r 
        from-gray-100 
        via-gray-50 
        to-gray-100 
        animate-shimmer 
        background-size-200 
        ${className}
      `}
      style={{
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s infinite',
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};
