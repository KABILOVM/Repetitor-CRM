
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label?: string; 
  icon?: React.ElementType;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  label,
  icon: Icon,
  className = '',
  placeholder = 'Выберите',
  disabled = false,
  error = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className={`block text-[10px] font-bold uppercase mb-1 ml-1 transition-colors ${disabled ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
            {label} {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
            flex items-center justify-between w-full gap-2 px-3 py-2 text-sm 
            bg-white dark:bg-slate-800 
            border
            rounded-lg shadow-sm 
            transition-all duration-200
            focus:outline-none
            h-[38px]
            ${error 
                ? 'border-red-500 text-red-900 dark:text-red-100 bg-red-50 dark:bg-red-900/10' 
                : isOpen 
                    ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-md' 
                    : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
            }
            ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-900' : ''}
        `}
      >
        <div className="flex items-center gap-2 truncate flex-1">
          {Icon && <Icon size={16} className={`shrink-0 ${value ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />}
          
          <div className="flex flex-col items-start truncate w-full text-left">
             <span className={`truncate w-full font-medium ${value && value !== 'Все' ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
                {value || placeholder}
             </span>
          </div>
        </div>
        <ChevronDown 
          size={16} 
          className={`text-slate-400 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 z-[100] w-full min-w-[200px] mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100 origin-top p-1">
          <div className="space-y-0.5">
            {options.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`
                    flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg transition-all text-left group
                    ${value === option
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900'
                    }
                `}
              >
                <span className="truncate">{option}</span>
                {value === option && <Check size={14} className="text-blue-600 dark:text-blue-400" strokeWidth={3} />}
              </button>
            ))}
            {options.length === 0 && (
              <div className="p-6 text-center text-slate-400 text-xs italic">
                Нет данных
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
