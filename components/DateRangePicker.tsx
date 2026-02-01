
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, ChevronDown } from 'lucide-react';

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
}

const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// Helper to display in RU format
const formatToRu = (iso: string): string => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
};

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ 
  startDate, 
  endDate, 
  onChange, 
  label, 
  align = 'left',
  mode = 'range',
  className = '',
  direction = 'down',
  showTrigger = true
}) => {
  const [isOpen, setIsOpen] = useState(!showTrigger);
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate || '');
  const [viewDate, setViewDate] = useState(() => {
      const d = startDate ? new Date(startDate) : new Date();
      return isNaN(d.getTime()) ? new Date() : d;
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const yearsGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen || !showTrigger) {
        setLocalStart(startDate);
        setLocalEnd(endDate || '');
        if (startDate) {
            const d = new Date(startDate);
            if (!isNaN(d.getTime())) setViewDate(d);
        }
    }
    if (!isOpen) {
      setViewMode('days');
    }
  }, [isOpen, startDate, endDate, showTrigger]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTrigger && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTrigger]);

  // Scroll to selected year when year selector opens
  useEffect(() => {
    if (viewMode === 'years' && yearsGridRef.current) {
      const currentYear = viewDate.getFullYear();
      const element = yearsGridRef.current.querySelector(`[data-year="${currentYear}"]`);
      if (element) {
        element.scrollIntoView({ block: 'center' });
      }
    }
  }, [viewMode]);

  const toLocalISO = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateClick = (dateStr: string) => {
    if (mode === 'single') {
        setLocalStart(dateStr);
        setLocalEnd(dateStr);
        if (!showTrigger) onChange(dateStr, dateStr);
        return;
    }
    if (!localStart || (localStart && localEnd && localStart !== localEnd)) {
        setLocalStart(dateStr);
        setLocalEnd('');
    } else {
        if (dateStr < localStart) {
            setLocalEnd(localStart);
            setLocalStart(dateStr);
        } else {
            setLocalEnd(dateStr);
        }
    }
  };

  const handleApply = () => {
      onChange(localStart, localEnd);
      if (showTrigger) setIsOpen(false);
  };

  const handleReset = () => {
      setLocalStart('');
      setLocalEnd('');
      if (!showTrigger) onChange('', '');
  };

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 1950;
    const endYear = currentYear + 10;
    const arr = [];
    for (let i = endYear; i >= startYear; i--) arr.push(i);
    return arr;
  }, []);

  const renderYearSelector = () => (
    <div className="w-[260px] h-[300px] bg-white dark:bg-slate-800 p-2 flex flex-col">
       <div className="flex items-center justify-between mb-4 px-2 shrink-0">
          <span className="font-bold text-sm uppercase tracking-widest text-slate-800 dark:text-white">Выберите год</span>
          <button onClick={() => setViewMode('days')} className="text-blue-600 font-bold text-xs hover:underline uppercase">Назад</button>
       </div>
       <div ref={yearsGridRef} className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-3 gap-1 p-1">
          {years.map(y => (
            <button 
              key={y} 
              data-year={y}
              onClick={() => {
                const newD = new Date(viewDate);
                newD.setFullYear(y);
                setViewDate(newD);
                setViewMode('days');
              }}
              className={`p-2 text-sm font-bold rounded-lg transition-all ${viewDate.getFullYear() === y ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
            >
              {y}
            </button>
          ))}
       </div>
    </div>
  );

  const renderMonthSelector = () => (
    <div className="w-[260px] h-[300px] bg-white dark:bg-slate-800 p-2 flex flex-col">
       <div className="flex items-center justify-between mb-4 px-2 shrink-0">
          <span className="font-bold text-sm uppercase tracking-widest text-slate-800 dark:text-white">Выберите месяц</span>
          <button onClick={() => setViewMode('days')} className="text-blue-600 font-bold text-xs hover:underline uppercase">Назад</button>
       </div>
       <div className="flex-1 grid grid-cols-2 gap-2 p-1">
          {months.map((m, i) => (
            <button 
              key={m} 
              onClick={() => {
                const newD = new Date(viewDate);
                newD.setMonth(i);
                setViewDate(newD);
                setViewMode('days');
              }}
              className={`p-3 text-xs font-bold rounded-xl transition-all ${viewDate.getMonth() === i ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
            >
              {m}
            </button>
          ))}
       </div>
    </div>
  );

  const renderDays = (baseDate: Date) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const days = [];

    for (let i = 0; i < firstDayIndex; i++) days.push(<div key={`empty-${i}`} className="h-9 w-9" />);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toLocalISO(new Date(year, month, d));
      const isStart = localStart === dateStr;
      const isToday = dateStr === toLocalISO(new Date());
      
      days.push(
        <button
          key={d}
          type="button"
          onClick={() => handleDateClick(dateStr)}
          className={`h-9 w-9 text-xs font-bold flex items-center justify-center transition-all relative rounded-xl ${isStart ? 'bg-blue-600 text-white shadow-lg scale-110' : isToday ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
        >
          {d}
        </button>
      );
    }

    return (
      <div className="w-[260px] p-2 bg-white dark:bg-slate-800 rounded-3xl animate-in fade-in duration-200">
        <div className="flex items-center justify-between mb-4 px-1">
             <button type="button" onClick={() => { const d = new Date(viewDate); d.setMonth(d.getMonth()-1); setViewDate(d); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"><ChevronLeft size={16} /></button>
             
             <div className="flex gap-1">
                <button 
                  onClick={() => setViewMode('months')}
                  className="font-bold text-xs uppercase tracking-tight text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 px-1.5 py-0.5 rounded transition-colors"
                >
                  {months[month]}
                </button>
                <button 
                  onClick={() => setViewMode('years')}
                  className="font-bold text-xs uppercase tracking-tight text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 px-1.5 py-0.5 rounded transition-colors"
                >
                  {year}
                </button>
             </div>

             <button type="button" onClick={() => { const d = new Date(viewDate); d.setMonth(d.getMonth()+1); setViewDate(d); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"><ChevronRight size={16} /></button>
        </div>
        <div className="grid grid-cols-7 gap-y-1 mb-2">
            {weekDays.map(d => <div key={d} className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-1 justify-items-center">{days}</div>
      </div>
    );
  };

  const currentContent = () => {
    if (viewMode === 'years') return renderYearSelector();
    if (viewMode === 'months') return renderMonthSelector();
    return renderDays(viewDate);
  };

  if (!showTrigger) {
      return (
          <div className={`bg-white dark:bg-slate-800 p-2 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-2xl overflow-hidden ${className}`}>
              {currentContent()}
          </div>
      );
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
        {label && (
          <label className="block text-[10px] font-bold uppercase mb-1 ml-1 text-slate-500 dark:text-slate-400">
              {label}
          </label>
        )}
        <button 
            type="button" 
            onClick={() => setIsOpen(!isOpen)} 
            className={`
                w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 
                border rounded-lg shadow-sm transition-all h-[38px]
                ${isOpen 
                  ? 'border-blue-500 ring-2 ring-blue-500/10' 
                  : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                }
            `}
        >
            <div className="flex items-center gap-2">
                <CalendarIcon size={16} className={`${startDate ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className={`text-sm font-bold ${startDate ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
                    {startDate ? formatToRu(startDate) : 'Выберите дату'}
                </span>
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
        </button>
      {isOpen && (
        <div className={`absolute z-[110] bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 p-3 ${align === 'right' ? 'right-0' : 'left-0'} mt-2 animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/10 overflow-hidden`}>
          {currentContent()}
          {viewMode === 'days' && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center px-1">
                <button type="button" onClick={handleReset} className="px-4 py-2 text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors">Сброс</button>
                <button type="button" onClick={handleApply} className="px-6 py-2 text-[10px] font-bold bg-blue-600 text-white rounded-xl uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Применить</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
