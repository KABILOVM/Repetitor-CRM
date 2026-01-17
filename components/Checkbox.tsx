
import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, label, disabled, className = '' }) => {
  return (
    <label className={`flex items-center gap-2 cursor-pointer select-none group ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}>
      <div className="relative flex items-center justify-center">
        <input 
          type="checkbox" 
          className="peer sr-only" 
          checked={checked} 
          onChange={(e) => !disabled && onChange(e.target.checked)} 
          disabled={disabled}
        />
        <div className={`
          w-5 h-5 rounded-md border-2 transition-all duration-200 ease-out
          ${checked 
            ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500' 
            : 'bg-white border-slate-300 group-hover:border-blue-400 dark:bg-slate-800 dark:border-slate-600 dark:group-hover:border-slate-500'
          }
        `}></div>
        <Check 
          size={12} 
          className={`absolute text-white transition-all duration-200 ${checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} 
          strokeWidth={3}
        />
      </div>
      {label && <div className="text-sm text-slate-600 dark:text-slate-300">{label}</div>}
    </label>
  );
};
