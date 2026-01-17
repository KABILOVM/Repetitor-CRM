
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string;
  endDate?: string;
  onChange: (start: string, end: string) => void;
  label?: string;
  align?: 'left' | 'right';
  mode?: 'single' | 'range';
  className?: string;
}

const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ 
  startDate, 
  endDate, 
  onChange, 
  label, 
  align = 'left',
  mode = 'range',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Local state for deferred application
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate || '');

  const [viewDate, setViewDate] = useState(() => {
      const d = startDate ? new Date(startDate) : new Date();
      return isNaN(d.getTime()) ? new Date() : d;
  });
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [isYearSelection, setIsYearSelection] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const yearsContainerRef = useRef<HTMLDivElement>(null);

  // Sync local state when modal opens
  useEffect(() => {
    if (isOpen) {
        setLocalStart(startDate);
        setLocalEnd(endDate || '');
        if (startDate) {
            const d = new Date(startDate);
            if (!isNaN(d.getTime())) setViewDate(d);
        }
    }
  }, [isOpen, startDate, endDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsYearSelection(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
      if (isYearSelection && yearsContainerRef.current) {
          const year = viewDate.getFullYear();
          const selectedYearBtn = yearsContainerRef.current.querySelector(`button[data-year="${year}"]`);
          if (selectedYearBtn) {
              selectedYearBtn.scrollIntoView({ block: 'center' });
          }
      }
  }, [isYearSelection]);

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
        return;
    }

    if (!localStart || (localStart && localEnd && localStart !== localEnd)) {
        // Start new range
        setLocalStart(dateStr);
        setLocalEnd('');
    } else {
        // Complete range
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
      setIsOpen(false);
  };

  const handleReset = () => {
      setLocalStart('');
      setLocalEnd('');
  };

  const handleDateHover = (dateStr: string) => {
      if (mode === 'range' && localStart && (!localEnd || localStart === localEnd)) {
          setHoverDate(dateStr);
      }
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
  };

  const changeYear = (year: number) => {
    const newDate = new Date(viewDate);
    newDate.setFullYear(year);
    setViewDate(newDate);
    setIsYearSelection(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '...';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 105 }, (_, i) => currentYear + 5 - i);

  const renderMonth = (baseDate: Date) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) days.push(<div key={`empty-${i}`} className="h-9 w-9" />);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = toLocalISO(dateObj); 

      const activeEnd = (localEnd && localEnd !== '') ? localEnd : hoverDate;
      
      let isStart = localStart === dateStr;
      let isEnd = localEnd === dateStr;
      let isInRange = false;

      if (mode === 'range' && localStart && activeEnd) {
          const rStart = localStart < activeEnd ? localStart : activeEnd;
          const rEnd = localStart < activeEnd ? activeEnd : localStart;
          if (dateStr >= rStart && dateStr <= rEnd) {
              isInRange = true;
          }
          if (dateStr === rStart) isStart = true;
          if (dateStr === rEnd) isEnd = true;
      } else if (mode === 'single') {
          isStart = localStart === dateStr;
          isEnd = false; 
          isInRange = false;
      }

      const isToday = dateStr === toLocalISO(new Date());

      days.push(
        <button
          key={d}
          type="button"
          onClick={() => handleDateClick(dateStr)}
          onMouseEnter={() => handleDateHover(dateStr)}
          className={`
            h-9 w-9 text-xs font-medium flex items-center justify-center transition-all relative rounded-full
            ${isStart 
                ? 'bg-blue-600 text-white z-20 shadow-lg font-bold' 
                : isEnd
                    ? 'bg-blue-600 text-white z-20 shadow-lg'
                    : isInRange
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-none'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }
            ${isInRange && !isStart && !isEnd ? 'rounded-none' : ''}
            ${(isStart && activeEnd && mode === 'range') ? 'rounded-r-none' : ''}
            ${(isEnd && localStart && mode === 'range') ? 'rounded-l-none' : ''}
            ${isToday && !isStart && !isEnd && !isInRange ? 'ring-1 ring-blue-400 font-bold text-blue-500' : ''}
          `}
        >
          {d}
        </button>
      );
    }

    return (
      <div className="w-64 p-2">
        <div className="flex items-center justify-between mb-4 px-1">
             {!isYearSelection && (
                 <button type="button" onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><ChevronLeft size={16} /></button>
             )}
             
             <div className="flex items-center gap-1 mx-auto">
                 {!isYearSelection && <span className="font-bold text-slate-800 dark:text-white text-sm">{months[month]}</span>}
                 
                 <button 
                    type="button"
                    onClick={() => setIsYearSelection(!isYearSelection)}
                    className="bg-transparent font-bold text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 text-slate-800 dark:text-white flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                 >
                    {year}
                    <ChevronRight size={12} className={`transition-transform ${isYearSelection ? 'rotate-90' : 'rotate-0'}`}/>
                 </button>
             </div>

            {!isYearSelection && (
                <button type="button" onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><ChevronRight size={16} /></button>
            )}
        </div>

        {isYearSelection ? (
            <div 
                ref={yearsContainerRef}
                className="grid grid-cols-4 gap-2 h-52 overflow-y-auto custom-scrollbar p-1"
            >
                {years.map(y => (
                    <button
                        key={y}
                        data-year={y}
                        type="button"
                        onClick={() => changeYear(y)}
                        className={`
                            py-2 rounded-lg text-xs font-bold transition-all
                            ${y === year 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 border border-transparent hover:border-slate-200 dark:hover:border-slate-500'}
                        `}
                    >
                        {y}
                    </button>
                ))}
            </div>
        ) : (
            <>
                <div className="grid grid-cols-7 gap-y-2 mb-2">
                {weekDays.map(d => <div key={d} className="text-center text-[10px] text-slate-400 font-bold uppercase">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-y-1 justify-items-center">{days}</div>
            </>
        )}
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
        <div className="space-y-1">
            {label && <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{label}</label>}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-700 border rounded-lg shadow-sm transition-all h-[38px] ${isOpen ? 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/20' : 'border-slate-300 dark:border-slate-600'}`}
            >
                <div className="flex items-center gap-2">
                    <CalendarIcon size={16} className="text-slate-400" />
                    <span className={`text-sm font-medium ${startDate ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
                        {startDate ? (mode === 'single' ? formatDate(startDate) : (endDate ? `${formatDate(startDate)} - ${formatDate(endDate)}` : formatDate(startDate))) : 'Выберите дату'}
                    </span>
                </div>
                <ChevronRight size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
        </div>
      
      {isOpen && (
        <div className={`absolute top-full mt-2 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-600 p-4 ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {renderMonth(viewDate)}
          <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button type="button" onClick={handleReset} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Сбросить</button>
              <button type="button" onClick={handleApply} className="px-4 py-1.5 text-xs bg-slate-800 dark:bg-slate-600 text-white rounded-lg hover:bg-slate-900 dark:hover:bg-slate-500">Готово</button>
          </div>
        </div>
      )}
    </div>
  );
};
