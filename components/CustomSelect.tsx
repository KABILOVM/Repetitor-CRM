
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
    <div className={`relative ${className} antialiased font-sans`} ref={containerRef}>
      {label && (
        <label className={`block text-xs font-bold mb-1.5 ml-1 transition-colors ${disabled ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
            {label} {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
            flex items-center justify-between w-full gap-2 px-4 py-2 text-sm 
            bg-white dark:bg-slate-800 
            border
            rounded-xl shadow-sm 
            transition-all duration-300
            focus:outline-none
            h-[42px]
            ${error 
                ? 'border-red-500 text-red-900 dark:text-red-100 bg-red-50 dark:bg-red-900/10' 
                : isOpen 
                    ? 'border-blue-500 ring-4 ring-blue-500/5 shadow-md scale-[1.01]' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
            }
            ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-900' : ''}
        `}
      >
        <div className="flex items-center gap-3 truncate flex-1">
          {Icon && <Icon size={16} className={`shrink-0 transition-colors ${value && (Array.isArray(value) ? value.length > 0 : (value !== 'Все' && value !== 'Все филиалы')) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />}
          
          <div className="flex flex-col items-start truncate w-full text-left">
             <span className={`truncate w-full font-bold text-xs ${value && (Array.isArray(value) ? value.length > 0 : (value !== 'Все' && value !== 'Все филиалы')) ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
                {getDisplayText()}
             </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {multiple && Array.isArray(value) && value.length > 0 && (
            <X 
              size={14} 
              className="text-slate-300 hover:text-rose-500 transition-colors" 
              onClick={(e) => { e.stopPropagation(); onChange([]); }}
            />
          )}
          <ChevronDown 
            size={16} 
            className={`text-slate-400 transition-transform duration-500 shrink-0 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} 
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 z-[150] w-full min-w-[240px] mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-2xl max-h-72 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 origin-top p-1.5 ring-1 ring-black/5">
          <div className="space-y-1">
            {multiple && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="flex items-center justify-between w-full px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all mb-1 border-b dark:border-slate-700"
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
                    flex items-center justify-between w-full px-4 py-2.5 text-xs rounded-xl transition-all text-left group
                    ${isSelected(option)
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700'
                    }
                `}
              >
                <div className="flex items-center gap-3 truncate">
                  {multiple && (
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected(option) ? 'bg-white border-white' : 'border-slate-200 bg-white dark:bg-slate-700 dark:border-slate-600'}`}>
                      {isSelected(option) && <Check size={12} strokeWidth={4} className="text-blue-600" />}
                    </div>
                  )}
                  <span className="truncate font-bold">{option}</span>
                </div>
                {!multiple && isSelected(option) && <Check size={16} className="text-white" strokeWidth={4} />}
              </button>
            ))}
            {options.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs italic font-medium uppercase tracking-widest opacity-50">
                Нет данных
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
