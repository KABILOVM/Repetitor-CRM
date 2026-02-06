
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string;
  endDate?: string;
  onChange: (start: string, end: string) => void;
  label?: string;
  align?: 'left' | 'right';
  mode?: 'single' | 'range';
  className?: string;
  direction?: 'up' | 'down';
  showTrigger?: boolean;
  error?: boolean;
}

const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const formatToRu = (iso: string): string => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
};

const formatToIso = (ru: string): string => {
    const parts = ru.split('.');
    if (parts.length !== 3) return '';
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ 
  startDate, 
  endDate, 
  onChange, 
  label, 
  align = 'left',
  mode = 'single',
  className = '',
  direction = 'down',
  showTrigger = true,
  error = false
}) => {
  const [isOpen, setIsOpen] = useState(!showTrigger);
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate || '');
  const [inputValue, setInputValue] = useState(formatToRu(startDate));
  const [viewDate, setViewDate] = useState(() => {
      const d = startDate ? new Date(startDate) : new Date();
      return isNaN(d.getTime()) ? new Date() : d;
  });
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalStart(startDate);
    setLocalEnd(endDate || '');
    setInputValue(formatToRu(startDate));
    if (startDate) {
        const d = new Date(startDate);
        if (!isNaN(d.getTime())) setViewDate(d);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTrigger && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTrigger]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^\d]/g, '');
    if (val.length > 8) val = val.slice(0, 8);
    
    let formatted = val;
    if (val.length > 2) formatted = val.slice(0, 2) + '.' + val.slice(2);
    if (val.length > 4) formatted = formatted.slice(0, 5) + '.' + formatted.slice(5);
    
    setInputValue(formatted);

    if (val.length === 8) {
        const iso = formatToIso(formatted);
        const d = new Date(iso);
        if (!isNaN(d.getTime())) {
            setLocalStart(iso);
            if (mode === 'single') onChange(iso, iso);
            setViewDate(d);
        }
    }
  };

  const toLocalISO = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateClick = (dateStr: string) => {
    if (mode === 'single') {
        setLocalStart(dateStr);
        setInputValue(formatToRu(dateStr));
        onChange(dateStr, dateStr);
        if (showTrigger) setIsOpen(false);
        return;
    }
    if (!localStart || (localStart && localEnd && localStart !== localEnd)) {
        setLocalStart(dateStr);
        setLocalEnd('');
    } else {
        const start = dateStr < localStart ? dateStr : localStart;
        const end = dateStr < localStart ? localStart : dateStr;
        setLocalStart(start);
        setLocalEnd(end);
        onChange(start, end);
    }
  };

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 1950;
    const endYear = currentYear + 10;
    const arr = [];
    for (let i = endYear; i >= startYear; i--) arr.push(i);
    return arr;
  }, []);

  const renderDays = (baseDate: Date) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const days = [];

    for (let i = 0; i < firstDayIndex; i++) days.push(<div key={`empty-${i}`} className="h-8 w-8" />);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toLocalISO(new Date(year, month, d));
      const isSelected = localStart === dateStr || localEnd === dateStr;
      const isInRange = localStart && localEnd && dateStr > localStart && dateStr < localEnd;
      const isToday = dateStr === toLocalISO(new Date());
      
      days.push(
        <button
          key={d}
          type="button"
          onClick={() => handleDateClick(dateStr)}
          className={`h-8 w-8 text-[11px] font-bold flex items-center justify-center transition-all rounded-lg
            ${isSelected ? 'bg-blue-600 text-white shadow-md' : isInRange ? 'bg-blue-50 text-blue-600' : isToday ? 'text-blue-600 border border-blue-200' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
        >
          {d}
        </button>
      );
    }

    return (
      <div className="w-[230px] p-2 bg-white dark:bg-slate-800 rounded-2xl">
        <div className="flex items-center justify-between mb-3 px-1">
             <button type="button" onClick={() => { const d = new Date(viewDate); d.setMonth(d.getMonth()-1); setViewDate(d); }} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronLeft size={14} /></button>
             <div className="flex gap-1">
                <button type="button" onClick={() => setViewMode('months')} className="font-bold text-[10px] uppercase hover:bg-slate-50 px-1 rounded">{months[month]}</button>
                <button type="button" onClick={() => setViewMode('years')} className="font-bold text-[10px] uppercase hover:bg-slate-50 px-1 rounded">{year}</button>
             </div>
             <button type="button" onClick={() => { const d = new Date(viewDate); d.setMonth(d.getMonth()+1); setViewDate(d); }} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronRight size={14} /></button>
        </div>
        <div className="grid grid-cols-7 gap-y-1 mb-1.5">
            {weekDays.map(d => <div key={d} className="text-center text-[8px] text-slate-400 font-bold uppercase">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5 justify-items-center">{days}</div>
      </div>
    );
  };

  const currentContent = () => {
    if (viewMode === 'years') return (
        <div className="w-[230px] h-[240px] overflow-y-auto grid grid-cols-3 gap-1 p-2 custom-scrollbar">
            {years.map(y => (
                <button key={y} type="button" onClick={() => { const d = new Date(viewDate); d.setFullYear(y); setViewDate(d); setViewMode('days'); }} className={`p-2 text-xs font-bold rounded-lg ${viewDate.getFullYear() === y ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'}`}>{y}</button>
            ))}
        </div>
    );
    if (viewMode === 'months') return (
        <div className="w-[230px] grid grid-cols-2 gap-1 p-2">
            {months.map((m, i) => (
                <button key={m} type="button" onClick={() => { const d = new Date(viewDate); d.setMonth(i); setViewDate(d); setViewMode('days'); }} className={`p-2 text-xs font-bold rounded-lg ${viewDate.getMonth() === i ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'}`}>{m}</button>
            ))}
        </div>
    );
    return renderDays(viewDate);
  };

  if (!showTrigger) return <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 shadow-xl ${className}`}>{currentContent()}</div>;

  return (
    <div className={`relative antialiased font-sans ${className}`} ref={containerRef}>
        {label && <label className="block text-xs font-semibold mb-1.5 ml-1 text-slate-500 dark:text-slate-400">{label}</label>}
        <div className={`
            flex items-center bg-white dark:bg-slate-800 border rounded-xl shadow-sm transition-all h-[42px] overflow-hidden group
            ${error ? 'border-red-500 ring-4 ring-red-500/10' : isOpen ? 'border-blue-500 ring-4 ring-blue-500/5' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}
        `}>
            <input 
              type="text" 
              value={inputValue}
              onChange={handleInputChange}
              placeholder="ДД.ММ.ГГГГ"
              className="flex-1 bg-transparent px-4 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-300 placeholder:font-normal"
            />
            <button 
                type="button" 
                onClick={() => setIsOpen(!isOpen)} 
                className="px-3 border-l border-slate-200 dark:border-slate-700 h-full text-slate-400 hover:text-blue-500 transition-colors bg-slate-50/50 dark:bg-slate-900/30"
            >
                <CalendarIcon size={18} className={startDate ? 'text-blue-600' : ''} />
            </button>
        </div>
      {isOpen && (
        <div className={`absolute z-[250] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 mt-2 ${align === 'right' ? 'right-0' : 'left-0'} animate-in fade-in zoom-in-95 duration-200 overflow-hidden`}>
          {currentContent()}
        </div>
      )}
    </div>
  );
};
