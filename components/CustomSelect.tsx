
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface CustomSelectProps {
  value: string | string[];
  onChange: (value: any) => void;
  options: string[];
  label?: string; 
  icon?: React.ElementType;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
  multiple?: boolean;
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
  required = false,
  multiple = false
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

  const isSelected = (option: string) => {
    const optTrim = option.trim();
    if (multiple && Array.isArray(value)) {
      return value.some(v => v.trim() === optTrim);
    }
    return typeof value === 'string' && value.trim() === optTrim;
  };

  const handleSelect = (option: string) => {
    const optTrim = option.trim();
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const exists = currentValues.some(v => v.trim() === optTrim);
      if (exists) {
        onChange(currentValues.filter(v => v.trim() !== optTrim));
      } else {
        onChange([...currentValues, optTrim]);
      }
    } else {
      onChange(optTrim);
      setIsOpen(false);
    }
  };

  const getDisplayText = () => {
    if (multiple && Array.isArray(value)) {
      if (value.length === 0) return placeholder;
      if (value.length === 1) return value[0];
      return `Выбрано: ${value.length}`;
    }
    return (value as string) || placeholder;
  };

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
          {Icon && <Icon size={16} className={`shrink-0 ${value && (Array.isArray(value) ? value.length > 0 : value !== 'Все') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />}
          
          <div className="flex flex-col items-start truncate w-full text-left">
             <span className={`truncate w-full font-bold uppercase tracking-tighter text-xs ${value && (Array.isArray(value) ? value.length > 0 : value !== 'Все') ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
                {getDisplayText()}
             </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {multiple && Array.isArray(value) && value.length > 0 && (
            <X 
              size={14} 
              className="text-slate-300 hover:text-rose-500 transition-colors mr-1" 
              onClick={(e) => { e.stopPropagation(); onChange([]); }}
            />
          )}
          <ChevronDown 
            size={16} 
            className={`text-slate-400 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} 
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 z-[100] w-full min-w-[220px] mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100 origin-top p-1">
          <div className="space-y-0.5">
            {multiple && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="flex items-center justify-between w-full px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 rounded-lg transition-all mb-1 border-b dark:border-slate-700"
              >
                Сбросить всё
              </button>
            )}
            {options.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => handleSelect(option)}
                className={`
                    flex items-center justify-between w-full px-3 py-2 text-xs rounded-lg transition-all text-left group
                    ${isSelected(option)
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900'
                    }
                `}
              >
                <div className="flex items-center gap-2 truncate">
                  {multiple && (
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected(option) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                      {isSelected(option) && <Check size={10} strokeWidth={4} className="text-white" />}
                    </div>
                  )}
                  <span className="truncate font-bold uppercase tracking-tight">{option}</span>
                </div>
                {!multiple && isSelected(option) && <Check size={14} className="text-blue-600 dark:text-blue-400" strokeWidth={3} />}
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
