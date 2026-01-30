
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Group, UserRole, UserProfile, Branch, BranchEntity, Course, Employee, ScheduleSlot } from '../types';
import { 
    X, Clock, MapPin, User, Save, Filter, 
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
    AlertCircle, DoorOpen, LayoutGrid, Columns, ChevronDown, Check, BookOpen, Plus,
    Users, Search, Trash2, Layers, Calculator, FlaskConical, Atom, Dna, Globe, Scroll, Gavel, Code,
    Music, Dumbbell, Palette, Brain, Rocket, Languages, PenTool, GraduationCap, Languages as TranslateIcon
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
const TIMES = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', 
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

// --- Icons Map ---
const ICON_MAP: Record<string, React.ElementType> = {
    'Calculator': Calculator,
    'FlaskConical': FlaskConical,
    'Atom': Atom,
    'Dna': Dna,
    'Globe': Globe,
    'Scroll': Scroll,
    'Gavel': Gavel,
    'Code': Code,
    'BookOpen': BookOpen,
    'Music': Music,
    'Dumbbell': Dumbbell,
    'Palette': Palette,
    'Brain': Brain,
    'Rocket': Rocket,
    'Languages': Languages,
    'PenTool': PenTool,
    'Layers': Layers,
    'GraduationCap': GraduationCap
};

// --- Internal Types ---
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
}

type ViewMode = 'days' | 'rooms';

// --- Components ---
const FilterDropdown = ({ 
    label, 
    value, 
    options, 
    onChange, 
    icon: Icon,
    placeholder = "Все"
}: { 
    label?: string, 
    value: string, 
    options: string[], 
    onChange: (v: string) => void, 
    icon: any,
    placeholder?: string
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            {label && <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">{label}</label>}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border rounded-xl transition-all h-[38px] min-w-[150px] shadow-sm hover:shadow-md ${isOpen ? 'border-blue-500 ring-4 ring-blue-500/5' : 'border-slate-200 dark:border-slate-700'}`}
            >
                <div className="flex items-center gap-2 truncate">
                    <Icon size={14} className={value !== 'All' && value !== 'Все' ? 'text-blue-500' : 'text-slate-400'} />
                    <span className={`text-[11px] font-bold truncate ${value !== 'All' && value !== 'Все' ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500 uppercase tracking-tighter'}`}>
                        {value === 'All' || value === 'Все' ? placeholder : value}
                    </span>
                </div>
                <ChevronDown size={12} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-full min-w-[180px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-1">
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        <button 
                            onClick={() => { onChange('Все'); setIsOpen(false); }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[11px] font-bold transition-colors mb-0.5 ${value === 'Все' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                        >
                            {placeholder}
                            {value === 'Все' && <Check size={12} strokeWidth={3} />}
                        </button>
                        {options.map(opt => (
                            <button 
                                key={opt}
                                onClick={() => { onChange(opt); setIsOpen(false); }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[11px] font-bold transition-colors mb-0.5 ${value === opt ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                            >
                                <span className="truncate">{opt}</span>
                                {value === opt && <Check size={12} strokeWidth={3} />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export const Schedule: React.FC = () => {
  // Data
  const [groups, setGroups] = useData<Group[]>(StorageKeys.GROUPS, []);
  const [branches] = useData<BranchEntity[]>(StorageKeys.BRANCHES, []);
  const [courses] = useData<Course[]>(StorageKeys.COURSES, []);
  
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Financier].includes(user.role);
  
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('days');
  const [activeDay, setActiveDay] = useState<string>(() => {
      const d = new Date().getDay(); 
      return DAYS_ORDER[d === 0 ? 6 : d - 1];
  });
  const [filterTeacher, setFilterTeacher] = useState<string>('Все');
  const [filterSubject, setFilterSubject] = useState<string>('Все');
  const [selectedBranch, setSelectedBranch] = useState<string>(user.branch || 'Все');
  
  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [expandedCell, setExpandedCell] = useState<ScheduleEvent[] | null>(null);

  const [assignDraft, setAssignDraft] = useState<{
      groupId: number | null;
      subject: string;
      day: string;
      time: string;
      endTime: string;
      duration: number;
      room?: string;
  }>({
      groupId: null,
      subject: '',
      day: 'Пн',
      time: '09:00',
      endTime: '10:30',
      duration: 1.5
  });

  // Logic: Transform groups into events
  const events = useMemo(() => {
    const parsedEvents: ScheduleEvent[] = [];
    
    groups.forEach(g => {
        if (user.role === UserRole.Teacher && g.teacher !== user.fullName) return;
        
        if (isSuperUser) {
            if (selectedBranch !== 'Все' && g.branch !== selectedBranch) return;
        } else if (user.branch) {
            if (g.branch !== user.branch) return;
        }

        const courseInfo = courses.find(c => c.name === g.subject);

        if (g.scheduleSlots && g.scheduleSlots.length > 0) {
            g.scheduleSlots.forEach((slot) => {
                if (DAYS_ORDER.includes(slot.day)) {
                    // Рассчитываем длительность для визуализации
                    const [h1, m1] = slot.time.split(':').map(Number);
                    const [h2, m2] = slot.endTime.split(':').map(Number);
                    const dur = (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;

                    parsedEvents.push({
                        uniqueId: `${g.id}-slot-${slot.id}`,
                        groupId: g.id,
                        groupName: g.name,
                        subject: g.subject,
                        teacher: g.teacher,
                        dayCode: slot.day,
                        time: slot.time || '09:00',
                        endTime: slot.endTime || '10:30',
                        duration: dur || 1,
                        room: slot.room,
                        color: courseInfo?.color || 'blue',
                        icon: courseInfo?.icon || 'BookOpen'
                    });
                }
            });
        }
    });
    return parsedEvents;
  }, [groups, user, selectedBranch, isSuperUser, courses]);

  // Filters
  const filteredEvents = useMemo(() => {
      return events.filter(ev => {
          const matchTeacher = filterTeacher === 'Все' || ev.teacher === filterTeacher;
          const matchSubject = filterSubject === 'Все' || ev.subject === filterSubject;
          return matchTeacher && matchSubject;
      });
  }, [events, filterTeacher, filterSubject]);

  const currentBranchClassrooms = useMemo(() => {
      const branchName = isSuperUser ? selectedBranch : user.branch;
      if (!branchName || branchName === 'Все') return [];
      const branch = branches.find(b => b.name === branchName);
      return branch?.classrooms || [];
  }, [branches, selectedBranch, user.branch, isSuperUser]);

  const uniqueTeachers = useMemo(() => Array.from(new Set(visibleGroupsForMeta().map(g => g.teacher).filter(Boolean))), [groups, selectedBranch]);
  const uniqueSubjects = useMemo(() => Array.from(new Set(visibleGroupsForMeta().map(g => g.subject))), [groups, selectedBranch]);

  function visibleGroupsForMeta() {
      if (selectedBranch === 'Все') return groups;
      return groups.filter(g => g.branch === selectedBranch);
  }

  // Colors mapping
  const getSubjectStyles = (colorName: string = 'blue') => {
      switch (colorName) {
          case 'blue': return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800';
          case 'emerald': return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800';
          case 'purple': return 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800';
          case 'amber': return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800';
          case 'rose': return 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/40 dark:text-rose-400 dark:border-rose-800';
          case 'cyan': return 'bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-800';
          case 'indigo': return 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800';
          default: return 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
      }
  };

  // Grid Cols Definition
  const gridTemplateCols = useMemo(() => {
    if (viewMode === 'days') return '60px repeat(7, 1fr)';
    const roomCount = currentBranchClassrooms.length || 1;
    return `60px repeat(${roomCount}, minmax(180px, 1fr))`;
  }, [viewMode, currentBranchClassrooms]);

  // Handlers
  const handleOpenAssignModal = (day: string, time: string, room?: string) => {
      const [h, m] = time.split(':').map(Number);
      const end = new Date();
      end.setHours(h, m + 90);
      const endTimeStr = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
      
      setAssignDraft({
          groupId: null,
          subject: filterSubject !== 'Все' ? filterSubject : '',
          day,
          time,
          endTime: endTimeStr,
          duration: 1.5,
          room
      });
      setIsAssignModalOpen(true);
  };

  const handleAssignGroup = () => {
      if (!assignDraft.groupId) {
          alert('Пожалуйста, выберите группу');
          return;
      }
      const updatedGroups = groups.map(g => {
          if (g.id === assignDraft.groupId) {
              const newSlot: ScheduleSlot = {
                  id: Date.now().toString(),
                  day: assignDraft.day,
                  time: assignDraft.time,
                  endTime: assignDraft.endTime,
                  room: assignDraft.room
              };
              return { ...g, scheduleSlots: [...(g.scheduleSlots || []), newSlot] };
          }
          return g;
      });
      setGroups(updatedGroups);
      setIsAssignModalOpen(false);
      storage.notify('Занятие назначено', 'success');
  };

  const handleSaveEditedEvent = () => {
      if (!editingEvent) return;
      const updatedGroups = groups.map(g => {
          if (g.id === editingEvent.groupId) {
              const slotId = editingEvent.uniqueId.split('-slot-')[1];
              return {
                  ...g,
                  scheduleSlots: g.scheduleSlots?.map(s => 
                      s.id === slotId 
                      ? { ...s, day: editingEvent.dayCode, time: editingEvent.time, endTime: editingEvent.endTime, room: editingEvent.room }
                      : s
                  )
              };
          }
          return g;
      });
      setGroups(updatedGroups);
      setIsEditModalOpen(false);
      storage.notify('Занятие перенесено', 'success');
  };

  const handleDeleteSlot = () => {
      if (!editingEvent) return;
      if (!confirm('Удалить это занятие из расписания?')) return;
      const updatedGroups = groups.map(g => {
          if (g.id === editingEvent.groupId) {
              const slotId = editingEvent.uniqueId.split('-slot-')[1];
              return { ...g, scheduleSlots: g.scheduleSlots?.filter(s => s.id !== slotId) };
          }
          return g;
      });
      setGroups(updatedGroups);
      setIsEditModalOpen(false);
      storage.notify('Занятие удалено', 'info');
  };

  const availableGroupsToAssign = useMemo(() => {
      let list = groups;
      if (!isSuperUser && user.branch) list = list.filter(g => g.branch === user.branch);
      else if (isSuperUser && selectedBranch !== 'Все') list = list.filter(g => g.branch === selectedBranch);
      if (assignDraft.subject) list = list.filter(g => g.subject === assignDraft.subject);
      return list;
  }, [groups, assignDraft.subject, selectedBranch, user.branch, isSuperUser]);

  // Logic to determine if an event is active during a specific time slot
  const isEventAtHour = (event: ScheduleEvent, hourSlot: string) => {
    const [startH, startM] = event.time.split(':').map(Number);
    const [endH, endM] = event.endTime.split(':').map(Number);
    const currentH = parseInt(hourSlot.split(':')[0]);
    
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;
    const currentTotalStart = currentH * 60;
    const currentTotalEnd = (currentH + 1) * 60;

    // Урок попадает в слот, если его диапазон пересекается с часовым диапазоном слота
    return startTotal < currentTotalEnd && endTotal > currentTotalStart;
  };

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col overflow-hidden antialiased">
      {/* Header Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Расписание</h2>
            <div className="flex items-center gap-2">
                {isSuperUser && (
                    <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center h-[36px]">
                        <MapPin size={14} className="text-slate-400 ml-2" />
                        <select 
                            value={selectedBranch} 
                            onChange={(e) => setSelectedBranch(e.target.value)} 
                            className="bg-transparent text-[11px] font-bold uppercase tracking-tight text-slate-600 dark:text-slate-300 outline-none px-2 cursor-pointer"
                        >
                            <option value="Все">Все филиалы</option>
                            {Object.values(Branch).map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                )}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner h-[36px]">
                    <button onClick={() => setViewMode('days')} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center gap-1.5 transition-all ${viewMode === 'days' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><Columns size={12}/> Неделя</button>
                    <button onClick={() => setViewMode('rooms')} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center gap-1.5 transition-all ${viewMode === 'rooms' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><DoorOpen size={12}/> Кабинеты</button>
                </div>
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            {viewMode === 'rooms' && <FilterDropdown label="День" icon={CalendarIcon} value={activeDay} options={DAYS_ORDER} onChange={setActiveDay} placeholder="День" />}
            <FilterDropdown label="Предмет" icon={BookOpen} value={filterSubject} options={uniqueSubjects} onChange={setFilterSubject} placeholder="Предмет" />
            {user.role !== UserRole.Teacher && <FilterDropdown label="Учитель" icon={User} value={filterTeacher} options={uniqueTeachers} onChange={setFilterTeacher} placeholder="Учитель" />}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
          <div className="overflow-auto custom-scrollbar flex-1">
              <div className="grid h-full min-w-max md:min-w-full" style={{ gridTemplateColumns: gridTemplateCols }}>
                  
                  {/* Sticky Header Row */}
                  <div className="sticky top-0 z-40 bg-slate-50 dark:bg-slate-900 border-b border-r border-slate-200 dark:border-slate-700 p-2 text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center h-[48px]">Время</div>
                  
                  {viewMode === 'days' ? (
                      DAYS_ORDER.map(day => (
                          <div key={day} className={`sticky top-0 z-30 bg-slate-50 dark:bg-slate-900 border-b border-r border-slate-200 dark:border-slate-700 p-2 text-center text-[11px] font-bold transition-colors uppercase tracking-tight flex items-center justify-center h-[48px] ${activeDay === day ? 'text-blue-600 dark:text-blue-400 border-b-2 !border-b-blue-600 bg-blue-50/20' : 'text-slate-400 dark:text-slate-500'}`}>
                              {FULL_DAYS[day]}
                          </div>
                      ))
                  ) : (
                      currentBranchClassrooms.length > 0 ? currentBranchClassrooms.map(room => (
                          <div key={room.id} className="sticky top-0 z-30 bg-slate-50 dark:bg-slate-900 border-b border-r border-slate-200 dark:border-slate-700 p-2 text-center flex flex-col items-center justify-center h-[48px]">
                              <span className="flex items-center gap-1.5 font-bold uppercase tracking-tight text-slate-700 dark:text-slate-100 text-[10px] truncate max-w-[150px]"><DoorOpen size={12} className="text-blue-500 shrink-0"/> {room.name}</span>
                              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none">Мест: {room.capacity}</span>
                          </div>
                      )) : (
                          <div className="sticky top-0 z-30 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 text-center text-xs font-bold text-slate-400 col-span-full h-[48px]">
                              Выберите филиал для просмотра аудиторий
                          </div>
                      )
                  )}

                  {/* Body Rows */}
                  {TIMES.map(time => (
                      <React.Fragment key={time}>
                          <div className="border-b border-r border-slate-100 dark:border-slate-700/50 p-2 text-center text-[10px] font-bold text-slate-400 sticky left-0 bg-white dark:bg-slate-800 z-20 flex items-center justify-center uppercase tracking-tight h-[80px]">{time}</div>
                          
                          {viewMode === 'days' ? (
                              DAYS_ORDER.map(day => {
                                  const cellEvents = filteredEvents.filter(e => e.dayCode === day && isEventAtHour(e, time));
                                  return (
                                      <div key={`${day}-${time}`} className="border-b border-r border-slate-50 dark:border-slate-700/30 p-1.5 min-h-[80px] relative group hover:bg-slate-50/30 dark:hover:bg-slate-700/20 transition-colors h-[80px]">
                                          {cellEvents.length > 1 ? (
                                              <div onClick={() => setExpandedCell(cellEvents)} className="relative w-full h-full cursor-pointer animate-in fade-in zoom-in-95 duration-200">
                                                  <div className="absolute inset-0 bg-slate-100 dark:bg-slate-700 border rounded-xl translate-x-1.5 translate-y-1.5 opacity-40 shadow-sm border-slate-200 dark:border-slate-600"></div>
                                                  <div className="absolute inset-0 bg-white dark:bg-slate-800 p-2 rounded-xl border-2 shadow-md flex flex-col justify-between border-blue-400 dark:border-blue-700 ring-4 ring-blue-500/5 group-hover:ring-blue-500/10 transition-all">
                                                      <div className="flex justify-between items-start gap-1">
                                                          <div className="font-bold truncate uppercase tracking-tighter text-[10px] leading-tight text-blue-600 dark:text-blue-400">
                                                              <div className="flex items-center gap-1">
                                                                  {cellEvents[0].icon && (() => { const SIcon = ICON_MAP[cellEvents[0].icon] || BookOpen; return <SIcon size={10}/> })()}
                                                                  {cellEvents[0].groupName}
                                                              </div>
                                                          </div>
                                                          <span className="shrink-0 text-[9px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-sm">+{cellEvents.length - 1}</span>
                                                      </div>
                                                      <div className="flex justify-between items-center mt-1">
                                                          <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest"><Layers size={8} className="text-blue-500"/> Стек занятий</div>
                                                          <ChevronDown size={12} className="text-blue-300 animate-bounce" />
                                                      </div>
                                                  </div>
                                              </div>
                                          ) : (
                                              cellEvents.map(ev => {
                                                  const SIcon = ICON_MAP[ev.icon || 'BookOpen'] || BookOpen;
                                                  return (
                                                    <div key={ev.uniqueId} onClick={() => { setEditingEvent(ev); setIsEditModalOpen(true); }} className={`p-2 rounded-xl border shadow-sm h-full flex flex-col justify-between hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer ${getSubjectStyles(ev.color)}`}>
                                                        <div className="font-bold truncate uppercase tracking-tighter text-[10px] leading-tight flex items-center gap-1.5">
                                                            <SIcon size={12} className="shrink-0 opacity-80" />
                                                            <span className="truncate">{ev.groupName}</span>
                                                        </div>
                                                        <div className="flex justify-between items-end">
                                                            <div className="text-[9px] opacity-75 truncate font-medium uppercase tracking-tight flex items-center gap-1"><User size={8}/> {ev.teacher.split(' ')[0]}</div>
                                                            <div className="text-[8px] font-black opacity-60 bg-blue-500 text-white px-1 rounded uppercase">{ev.time}-{ev.endTime}</div>
                                                        </div>
                                                    </div>
                                                  )
                                              })
                                          )}
                                          {cellEvents.length === 0 && <button onClick={() => handleOpenAssignModal(day, time)} className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded-xl border-2 border-dashed border-slate-100 dark:border-slate-700 text-slate-300 hover:text-blue-400 hover:border-blue-300"><Plus size={18} /></button>}
                                      </div>
                                  );
                              })
                          ) : (
                              currentBranchClassrooms.map(room => {
                                  const cellEvents = filteredEvents.filter(e => e.dayCode === activeDay && e.room === room.name && isEventAtHour(e, time));
                                  return (
                                      <div key={`${room.id}-${time}`} className="border-b border-r border-slate-50 dark:border-slate-700/30 p-1.5 min-h-[80px] relative group hover:bg-slate-50/30 dark:hover:bg-slate-700/20 transition-colors h-[80px]">
                                          {cellEvents.length > 1 ? (
                                              <div onClick={() => setExpandedCell(cellEvents)} className="relative w-full h-full cursor-pointer animate-in fade-in zoom-in-95 duration-200">
                                                  <div className="absolute inset-0 bg-slate-100 dark:bg-slate-700 border rounded-xl translate-x-1.5 translate-y-1.5 opacity-40 shadow-sm border-slate-200 dark:border-slate-600"></div>
                                                  <div className="absolute inset-0 bg-white dark:bg-slate-800 p-2 rounded-xl border-2 shadow-md flex flex-col justify-between border-emerald-400 dark:border-emerald-700 ring-4 ring-emerald-500/5 group-hover:ring-emerald-500/10 transition-all">
                                                      <div className="flex justify-between items-start gap-1">
                                                          <div className="font-bold truncate uppercase tracking-tighter text-[10px] leading-tight text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                              {cellEvents[0].icon && (() => { const SIcon = ICON_MAP[cellEvents[0].icon] || BookOpen; return <SIcon size={10}/> })()}
                                                              {cellEvents[0].groupName}
                                                          </div>
                                                          <span className="shrink-0 text-[9px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow-sm">+{cellEvents.length - 1}</span>
                                                      </div>
                                                      <div className="flex justify-between items-center mt-1">
                                                          <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest"><Layers size={8} className="text-emerald-500"/> Групповой стек</div>
                                                          <ChevronDown size={12} className="text-emerald-300 animate-bounce" />
                                                      </div>
                                                  </div>
                                              </div>
                                          ) : cellEvents.length === 1 ? (
                                              cellEvents.map(ev => {
                                                  const SIcon = ICON_MAP[ev.icon || 'BookOpen'] || BookOpen;
                                                  return (
                                                    <div key={ev.uniqueId} onClick={() => { setEditingEvent(ev); setIsEditModalOpen(true); }} className={`h-full p-2 rounded-xl border shadow-sm flex flex-col justify-between hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer ${getSubjectStyles(ev.color)}`}>
                                                        <div className="font-bold truncate uppercase tracking-tighter text-[10px] leading-tight flex items-center gap-1.5">
                                                            <SIcon size={12} className="shrink-0 opacity-80" />
                                                            <span className="truncate">{ev.groupName}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between opacity-75 font-bold text-[8px] uppercase tracking-wide truncate">
                                                            <span><User size={10} className="inline mr-0.5" /> {ev.teacher.split(' ')[0]}</span>
                                                            <span className="bg-white/50 px-1 rounded">{ev.time}-{ev.endTime}</span>
                                                        </div>
                                                    </div>
                                                  )
                                              })
                                          ) : (
                                              <button onClick={() => handleOpenAssignModal(activeDay, time, room.name)} className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded-xl border-2 border-dashed border-slate-100 dark:border-slate-700/50 text-slate-300 hover:text-emerald-500 hover:border-emerald-300"><Plus size={20} /></button>
                                          )}
                                      </div>
                                  );
                              })
                          )}
                      </React.Fragment>
                  ))}
              </div>
          </div>
      </div>

      {/* Modal: Edit Event */}
      {isEditModalOpen && editingEvent && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in zoom-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-700">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-3 text-lg uppercase tracking-tight">
                        <Clock size={22} className="text-blue-500"/> ИЗМЕНИТЬ ЗАНЯТИЕ
                    </h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-slate-300 hover:text-slate-500 transition-colors rounded-full p-1.5 border-2 border-slate-50 dark:border-slate-700"><X size={24} /></button>
                </div>
                
                <div className="p-8 space-y-8">
                    <div className="text-center p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[28px] border border-slate-100 dark:border-slate-700">
                        <div className="flex justify-center mb-4">
                             {(() => { const SIcon = ICON_MAP[editingEvent.icon || 'BookOpen'] || BookOpen; return <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-md text-blue-500 border border-slate-50 dark:border-slate-700"><SIcon size={32}/></div> })()}
                        </div>
                        <h4 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight mb-1">{editingEvent.groupName}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium flex items-center justify-center gap-1.5">
                            {editingEvent.subject} <span className="opacity-30">•</span> {editingEvent.teacher}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">ДЕНЬ НЕДЕЛИ</label>
                            <div className="relative">
                                <select 
                                    value={editingEvent.dayCode} 
                                    onChange={(e) => setEditingEvent({...editingEvent, dayCode: e.target.value})} 
                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all appearance-none cursor-pointer hover:border-blue-400 shadow-sm"
                                >
                                    {DAYS_ORDER.map(d => <option key={d} value={d}>{FULL_DAYS[d]}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">С</label>
                            <input type="time" value={editingEvent.time} onChange={e => setEditingEvent({...editingEvent, time: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold bg-white dark:bg-slate-700 shadow-sm outline-none"/>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">ДО</label>
                            <input type="time" value={editingEvent.endTime} onChange={e => setEditingEvent({...editingEvent, endTime: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold bg-white dark:bg-slate-700 shadow-sm outline-none"/>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">КАБИНЕТ</label>
                            <div className="relative">
                                <DoorOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                <select 
                                    value={editingEvent.room || ''} 
                                    onChange={(e) => setEditingEvent({...editingEvent, room: e.target.value})} 
                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all appearance-none cursor-pointer hover:border-blue-400 shadow-sm"
                                >
                                    <option value="">Без кабинета</option>
                                    {currentBranchClassrooms.map(room => <option key={room.id} value={room.name}>{room.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center gap-4">
                    <button 
                        onClick={handleDeleteSlot} 
                        className="text-rose-500 hover:text-rose-600 dark:text-rose-400 font-bold text-sm transition-all flex items-center gap-2 hover:scale-105"
                    >
                        <Trash2 size={18}/> Убрать
                    </button>
                    
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={() => setIsEditModalOpen(false)} 
                            className="text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 uppercase tracking-widest transition-colors"
                        >
                            ОТМЕНА
                        </button>
                        <button 
                            onClick={handleSaveEditedEvent} 
                            className="px-10 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-3 text-sm"
                        >
                            <Save size={20} /> СОХРАНИТЬ
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Modal: Assign Existing Group */}
      {isAssignModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-700">
                <header className="p-5 border-b dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tight text-sm"><CalendarIcon size={18} className="text-blue-600"/> Назначить занятие</h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Добавление группы в сетку</p>
                    </div>
                    <button onClick={() => setIsAssignModalOpen(false)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors bg-white dark:bg-slate-700 rounded-full shadow-sm"><X size={20}/></button>
                </header>
                <div className="p-6 space-y-5">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">День</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-tight">{FULL_DAYS[assignDraft.day || 'Пн']}</span>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-widest ml-1">Выбор группы *</label>
                            <select value={assignDraft.groupId || ''} onChange={e => setAssignDraft({...assignDraft, groupId: Number(e.target.value)})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold h-[42px] outline-none shadow-sm">
                                <option value="">Выберите группу...</option>
                                {availableGroupsToAssign.map(g => (<option key={g.id} value={g.id}>{g.name} ({g.subject})</option>))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-widest ml-1">С</label>
                                <input type="time" value={assignDraft.time} onChange={e => setAssignDraft({...assignDraft, time: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold bg-white dark:bg-slate-900 shadow-sm outline-none"/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-widest ml-1">До</label>
                                <input type="time" value={assignDraft.endTime} onChange={e => setAssignDraft({...assignDraft, endTime: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold bg-white dark:bg-slate-900 shadow-sm outline-none"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-widest ml-1">Аудитория</label>
                            <div className="relative">
                                <DoorOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                <select value={assignDraft.room || ''} onChange={(e) => setAssignDraft({...assignDraft, room: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm font-bold outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 h-[42px] shadow-sm">
                                    <option value="">Без аудитории</option>
                                    {currentBranchClassrooms.map(room => <option key={room.id} value={room.name}>{room.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                <footer className="p-5 border-t dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
                    <button onClick={() => setIsAssignModalOpen(false)} className="px-6 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Отмена</button>
                    <button onClick={handleAssignGroup} disabled={!assignDraft.groupId} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all text-[11px] flex items-center gap-2"><Check size={16} strokeWidth={3}/> Подтвердить</button>
                </footer>
              </div>
          </div>
      )}
    </div>
  );
};
