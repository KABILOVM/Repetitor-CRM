
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Group, UserRole, UserProfile, Branch, BranchEntity, Course, Employee, ScheduleSlot } from '../types';
import { 
    X, Clock, MapPin, User, Save, Filter, 
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
    AlertCircle, DoorOpen, LayoutGrid, Columns, ChevronDown, Check, BookOpen, Plus,
    Users, Search, Trash2, Layers, Calculator, FlaskConical, Atom, Dna, Globe, Scroll, Gavel, Code,
    Music, Dumbbell, Palette, Brain, Rocket, Languages, PenTool, GraduationCap
} from 'lucide-react';
import { useData } from '../hooks/useData';

// --- Config ---
const DAYS_ORDER = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const FULL_DAYS: Record<string, string> = {
  'Пн': 'Понедельник',
  'Вт': 'Вторник',
  'Ср': 'Среда',
  'Чт': 'Четверг',
  'Пт': 'Пятница',
  'Сб': 'Суббота',
  'Вс': 'Воскресенье'
};

const START_HOUR = 8;
const END_HOUR = 21;
const HOUR_HEIGHT = 80; // pixels per hour
const TIMES = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => `${String(START_HOUR + i).padStart(2, '0')}:00`);

// --- Icons Map ---
const ICON_MAP: Record<string, React.ElementType> = {
    'Calculator': Calculator, 'FlaskConical': FlaskConical, 'Atom': Atom, 'Dna': Dna,
    'Globe': Globe, 'Scroll': Scroll, 'Gavel': Gavel, 'Code': Code, 'BookOpen': BookOpen,
    'Music': Music, 'Dumbbell': Dumbbell, 'Palette': Palette, 'Brain': Brain, 'Rocket': Rocket,
    'Languages': Languages, 'PenTool': PenTool, 'Layers': Layers, 'GraduationCap': GraduationCap
};

interface ScheduleEvent {
  uniqueId: string;
  groupId: number;
  groupName: string;
  subject: string;
  teacher: string;
  dayCode: string; 
  time: string;
  endTime: string;
  duration: number; // in hours
  room?: string;
  color?: string;
  icon?: string;
  top: number;
  height: number;
}

const FilterDropdown = ({ value, options, onChange, icon: Icon, placeholder = "Все", className = "" }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button onClick={() => setIsOpen(!isOpen)} className={`flex items-center justify-between gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border rounded-xl transition-all h-[38px] w-full shadow-sm ${isOpen ? 'border-blue-500 ring-4 ring-blue-500/5' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-center gap-2 truncate">
                    <Icon size={14} className={value !== 'Все' && value !== 'Все филиалы' ? 'text-blue-500' : 'text-slate-400'} />
                    <span className={`text-[11px] font-bold truncate ${value !== 'Все' && value !== 'Все филиалы' ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500 uppercase tracking-tighter'}`}>{value === 'Все' ? placeholder : value}</span>
                </div>
                <ChevronDown size={12} className={`text-slate-400 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-full min-w-[180px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[100] p-1 animate-in fade-in zoom-in-95 duration-200">
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        <button onClick={() => { onChange('Все'); setIsOpen(false); }} className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[11px] font-bold transition-colors ${value === 'Все' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'hover:bg-slate-50'}`}>{placeholder} {value === 'Все' && <Check size={12}/>}</button>
                        {options.map((opt: string) => (<button key={opt} onClick={() => { onChange(opt); setIsOpen(false); }} className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[11px] font-bold transition-colors ${value === opt ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'hover:bg-slate-50'}`}><span className="truncate">{opt}</span>{value === opt && <Check size={12}/>}</button>))}
                    </div>
                </div>
            )}
        </div>
    );
};

export const Schedule: React.FC = () => {
  const [groups, setGroups] = useData<Group[]>(StorageKeys.GROUPS, []);
  const [branches] = useData<BranchEntity[]>(StorageKeys.BRANCHES, []);
  const [courses] = useData<Course[]>(StorageKeys.COURSES, []);
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  const isSuperUser = ([UserRole.GeneralDirector, UserRole.Director, UserRole.Developer] as (UserRole | string)[]).includes(user.role);

  const [viewMode, setViewMode] = useState<'days' | 'rooms'>('days');
  const [activeDay, setActiveDay] = useState<string>(DAYS_ORDER[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);
  const [filterTeacher, setFilterTeacher] = useState<string>('Все');
  const [filterSubject, setFilterSubject] = useState<string>('Все');
  const [selectedBranch, setSelectedBranch] = useState<string>(user.branch || 'Все филиалы');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const events = useMemo(() => {
    const list: ScheduleEvent[] = [];
    groups.forEach(g => {
        if (user.role === UserRole.Teacher && g.teacher !== user.fullName) return;
        if (isSuperUser) { 
            if (selectedBranch !== 'Все филиалы' && g.branch !== selectedBranch) return; 
        }
        else if (user.branch && g.branch !== user.branch) return;

        const course = courses.find(c => c.name === g.subject);
        g.scheduleSlots?.forEach(slot => {
            if (!slot.time || !slot.endTime) return;
            const [h1, m1] = slot.time.split(':').map(Number);
            const [h2, m2] = slot.endTime.split(':').map(Number);
            const duration = ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
            const top = (h1 - START_HOUR) * HOUR_HEIGHT + (m1 / 60) * HOUR_HEIGHT;
            const height = duration * HOUR_HEIGHT;

            list.push({
                uniqueId: `${g.id}-${slot.id}`,
                groupId: g.id, groupName: g.name, subject: g.subject, teacher: g.teacher,
                dayCode: slot.day, time: slot.time, endTime: slot.endTime,
                duration, room: slot.room, color: course?.color, icon: course?.icon,
                top, height
            });
        });
    });
    return list;
  }, [groups, user, selectedBranch, isSuperUser, courses]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => (filterTeacher === 'Все' || e.teacher === filterTeacher) && (filterSubject === 'Все' || e.subject === filterSubject));
  }, [events, filterTeacher, filterSubject]);

  const currentBranchClassrooms = useMemo(() => {
      const bName = isSuperUser ? selectedBranch : user.branch;
      if (bName === 'Все филиалы') return [];
      return branches.find(b => b.name === bName)?.classrooms || [];
  }, [branches, selectedBranch, user.branch, isSuperUser]);

  const getSubjectStyles = (color: string = 'blue') => {
      const base = "absolute left-1 right-1 rounded-xl border shadow-sm transition-all hover:shadow-lg hover:z-20 p-1.5 md:p-2 overflow-hidden group/event cursor-pointer ";
      switch (color) {
          case 'emerald': return base + "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800";
          case 'purple': return base + "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800";
          case 'amber': return base + "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800";
          case 'rose': return base + "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-400 dark:border-rose-800";
          default: return base + "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800";
      }
  };

  const handleSaveEdit = () => {
    if (!editingEvent) return;
    const updated = groups.map(g => g.id === editingEvent.groupId ? { ...g, scheduleSlots: g.scheduleSlots?.map(s => s.id === editingEvent.uniqueId.split('-')[1] ? { ...s, day: editingEvent.dayCode, time: editingEvent.time, endTime: editingEvent.endTime, room: editingEvent.room } : s) } : g);
    setGroups(updated);
    setIsEditModalOpen(false);
    storage.notify('Расписание обновлено', 'success');
  };

  const handleDeleteSlot = () => {
    if (!editingEvent || !confirm('Удалить занятие?')) return;
    const updated = groups.map(g => g.id === editingEvent.groupId ? { ...g, scheduleSlots: g.scheduleSlots?.filter(s => s.id !== editingEvent.uniqueId.split('-')[1]) } : g);
    setGroups(updated);
    setIsEditModalOpen(false);
  };

  const visibleDays = isMobile ? [activeDay] : DAYS_ORDER;
  const visibleRooms = currentBranchClassrooms.length > 0 ? currentBranchClassrooms : [{id: 'empty', name: '?' }];
  const columnsToRender = viewMode === 'days' ? visibleDays : visibleRooms;
  const columnsCount = columnsToRender.length;

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col antialiased font-sans">
      {/* Filters Header */}
      <div className="flex flex-col gap-3 shrink-0 px-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center justify-between md:justify-start gap-4">
                <h2 className="text-xl font-bold uppercase tracking-tight whitespace-nowrap">Расписание</h2>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border h-[36px]">
                    <button onClick={() => setViewMode('days')} className={`px-4 py-1 text-[10px] font-bold uppercase rounded-lg transition-all ${viewMode === 'days' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}>{isMobile ? 'Дни' : 'Неделя'}</button>
                    <button onClick={() => setViewMode('rooms')} className={`px-4 py-1 text-[10px] font-bold uppercase rounded-lg transition-all ${viewMode === 'rooms' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}>Каб.</button>
                </div>
            </div>
            
            {isSuperUser && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl h-[38px] flex items-center px-3 shadow-sm md:w-auto w-full">
                    <MapPin size={14} className="text-slate-400 mr-2 shrink-0" />
                    <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="bg-transparent text-[11px] font-bold uppercase outline-none cursor-pointer w-full">
                        <option value="Все филиалы">Все филиалы</option>
                        {branches.filter(b => b.isActive).map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                </div>
            )}
        </div>

        <div className="flex flex-wrap gap-2">
            <FilterDropdown icon={BookOpen} value={filterSubject} options={Array.from(new Set(groups.map(g => g.subject)))} onChange={setFilterSubject} placeholder="Предмет" className="flex-1 md:flex-none min-w-[120px]" />
            <FilterDropdown icon={User} value={filterTeacher} options={Array.from(new Set(groups.map(g => g.teacher)))} onChange={setFilterTeacher} placeholder="Учитель" className="flex-1 md:flex-none min-w-[120px]" />
        </div>
      </div>

      {/* Mobile Day Navigation Tabs */}
      {isMobile && viewMode === 'days' && (
          <div className="flex overflow-x-auto hide-scrollbar gap-2 px-2 pb-1 shrink-0">
              {DAYS_ORDER.map(d => (
                  <button 
                    key={d} 
                    onClick={() => setActiveDay(d)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all whitespace-nowrap border ${activeDay === d ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}
                  >
                      {FULL_DAYS[d]}
                  </button>
              ))}
          </div>
      )}

      {/* Grid Canvas */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-[28px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col mx-1 md:mx-0">
          <div className="overflow-auto custom-scrollbar flex-1 relative">
              
              {viewMode === 'rooms' && selectedBranch === 'Все филиалы' ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-900/40">
                      <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-lg mb-4 border border-slate-100 dark:border-slate-700">
                          <MapPin size={48} className="text-blue-500 opacity-20" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">Выберите филиал</h3>
                      <p className="text-sm text-slate-500 max-w-xs mt-2 font-medium">Для вкладки «Кабинеты» необходимо выбрать конкретное отделение.</p>
                  </div>
              ) : (
                <div className="grid h-full" style={{ gridTemplateColumns: `${isMobile ? '60px' : '80px'} repeat(${columnsCount}, 1fr)`, minWidth: isMobile ? 'auto' : '800px' }}>
                  
                  {/* Grid Headers */}
                  <div className="sticky top-0 left-0 z-[60] bg-slate-50 dark:bg-slate-900 border-b border-r p-3 h-[50px] flex items-center justify-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Время</div>
                  {viewMode === 'days' ? 
                    visibleDays.map(d => (
                        <div key={d} className={`sticky top-0 z-40 bg-slate-50 dark:bg-slate-900 border-b border-r p-3 h-[50px] flex items-center justify-center text-[11px] font-black uppercase tracking-tight transition-colors ${activeDay === d ? 'text-blue-600 border-b-2 border-b-blue-600' : 'text-slate-400'}`}>{FULL_DAYS[d]}</div>
                    )) : 
                    visibleRooms.map(r => (
                        <div key={(r as any).id} className="sticky top-0 z-40 bg-slate-50 dark:bg-slate-900 border-b border-r p-3 h-[50px] flex flex-col items-center justify-center min-w-[120px]"><span className="text-[10px] font-black uppercase tracking-tight flex items-center gap-1.5"><DoorOpen size={12} className="text-blue-500"/> {(r as any).name}</span><span className="text-[8px] text-slate-400 font-bold">Мест: {(r as any).capacity || 0}</span></div>
                    ))
                  }

                  {/* Sidebar Scale */}
                  <div className="relative sticky left-0 z-30 bg-white dark:bg-slate-800 border-r dark:border-slate-700 shadow-[2px_0_10px_rgba(0,0,0,0.02)]" style={{ height: (TIMES.length - 1) * HOUR_HEIGHT }}>
                      {TIMES.map((time, idx) => (
                          <div key={time} className={`absolute left-0 w-full text-right ${isMobile ? 'pr-2' : 'pr-3'}`} style={{ top: idx * HOUR_HEIGHT }}>
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 absolute w-full left-0 -translate-y-1/2">{time}</span>
                          </div>
                      ))}
                  </div>

                  {/* Data Columns */}
                  {columnsToRender.map((col, idx) => {
                      const colId = viewMode === 'days' ? (col as string) : (col as any).name;
                      const colEvents = filteredEvents.filter(e => viewMode === 'days' ? e.dayCode === colId : (e.dayCode === activeDay && e.room === colId));
                      
                      return (
                        <div key={idx} className="relative border-r dark:border-slate-700/50" style={{ height: (TIMES.length - 1) * HOUR_HEIGHT }}>
                            {/* Hour grid lines */}
                            {TIMES.map((_, tIdx) => (
                                <div key={tIdx} className="absolute left-0 w-full border-b border-slate-100 dark:border-slate-700/30" style={{ top: tIdx * HOUR_HEIGHT, height: HOUR_HEIGHT }}></div>
                            ))}
                            
                            {/* Events Blocks */}
                            {colEvents.map(ev => {
                                const Icon = ICON_MAP[ev.icon || 'BookOpen'] || BookOpen;
                                return (
                                    <div key={ev.uniqueId} 
                                         className={getSubjectStyles(ev.color)} 
                                         style={{ top: ev.top, height: ev.height }}
                                         onClick={() => { setEditingEvent(ev); setIsEditModalOpen(true); }}
                                    >
                                        <div className="flex flex-col h-full overflow-hidden">
                                            <div className="flex items-center gap-1.5 font-black text-[9px] md:text-[10px] uppercase tracking-tighter truncate mb-0.5">
                                                <Icon size={isMobile ? 10 : 12} className="shrink-0 opacity-70" />
                                                <span className="truncate">{ev.groupName}</span>
                                            </div>
                                            
                                            {ev.room && (
                                                <div className="flex items-center gap-1 opacity-70 mb-0.5">
                                                    <DoorOpen size={isMobile ? 8 : 10} className="shrink-0" />
                                                    <span className="text-[8px] md:text-[9px] font-bold truncate">{ev.room}</span>
                                                </div>
                                            )}

                                            <div className="mt-auto flex justify-between items-center opacity-70 gap-2">
                                                <span className="text-[8px] md:text-[9px] font-bold truncate flex items-center gap-1 flex-1 min-w-0">
                                                    <User size={isMobile ? 7 : 8} className="shrink-0" /> 
                                                    <span className="truncate">{ev.teacher.split(' ')[0]}</span>
                                                </span>
                                                <span className="text-[7px] md:text-[8px] font-black bg-white/40 dark:bg-black/20 px-1 md:px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm">
                                                    {ev.time}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                      );
                  })}
                </div>
              )}
          </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingEvent && (
          <div className="fixed inset-0 bg-black/60 z-[500] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-700">
                  <header className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                      <h3 className="font-bold text-lg uppercase tracking-tight flex items-center gap-2 tracking-tighter"><Clock className="text-blue-500" size={18}/> Редактор занятия</h3>
                      <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all"><X size={20}/></button>
                  </header>
                  <div className="p-6 md:p-8 space-y-5">
                      <div className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 mb-2">
                          <h4 className="font-black text-xl text-slate-800 dark:text-white uppercase tracking-tight leading-tight">{editingEvent.groupName}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{editingEvent.subject} • {editingEvent.teacher}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">День недели</label>
                              <select value={editingEvent.dayCode} onChange={e => setEditingEvent({...editingEvent, dayCode: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all">
                                  {DAYS_ORDER.map(d => <option key={d} value={d}>{FULL_DAYS[d]}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">Начало</label>
                              <input type="time" value={editingEvent.time} onChange={e => setEditingEvent({...editingEvent, time: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"/>
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">Конец</label>
                              <input type="time" value={editingEvent.endTime} onChange={e => setEditingEvent({...editingEvent, endTime: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"/>
                          </div>
                          <div className="col-span-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">Кабинет</label>
                              <select value={editingEvent.room || ''} onChange={e => setEditingEvent({...editingEvent, room: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all">
                                  <option value="">Без кабинета</option>
                                  {currentBranchClassrooms.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                              </select>
                          </div>
                      </div>
                  </div>
                  <footer className="p-6 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between gap-3">
                      <button onClick={handleDeleteSlot} className="text-rose-500 font-bold text-xs flex items-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-3 py-1 rounded-lg transition-all uppercase tracking-widest"><Trash2 size={16}/> Удалить</button>
                      <div className="flex gap-2">
                          <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors hover:text-slate-600">Отмена</button>
                          <button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-xl shadow-blue-500/20 text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2"><Save size={14}/> Сохранить</button>
                      </div>
                  </footer>
              </div>
          </div>
      )}
    </div>
  );
};
