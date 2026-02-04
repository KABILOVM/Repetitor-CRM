
import React from 'react';

interface LabelProps {
  children: React.ReactNode;
  required?: boolean;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  htmlFor?: string;
}

/**
 * Label component redesigned following Material Design 3 guidelines.
 * Uses Sentence case, medium weight, and accessible colors.
 */
export const Label: React.FC<LabelProps> = ({ 
  children, 
  required, 
  error, 
  disabled, 
  className = '',
  htmlFor 
}) => {
  return (
    <label 
      htmlFor={htmlFor}
      className={`
        block 
        text-sm 
        font-medium 
        leading-none 
        transition-colors 
        duration-200
        mb-2
        ${error 
          ? 'text-red-600 dark:text-red-400' 
          : disabled 
            ? 'text-slate-400 dark:text-slate-600' 
            : 'text-slate-700 dark:text-slate-300'
        }
        ${className}
      `}
    >
      {children}
      {required && (
        <span className="ml-1 text-red-500 font-bold" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
};
