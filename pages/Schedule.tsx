
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
import { CustomSelect } from '../components/CustomSelect';

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
  duration: number; 
  room?: string;
  color?: string;
  icon?: string;
}

type ViewMode = 'days' | 'rooms';

export const Schedule: React.FC = () => {
  const [groups, setGroups] = useData<Group[]>(StorageKeys.GROUPS, []);
  const [branches] = useData<BranchEntity[]>(StorageKeys.BRANCHES, []);
  const [courses] = useData<Course[]>(StorageKeys.COURSES, []);
  
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Financier].includes(user.role);
  
  const [viewMode, setViewMode] = useState<ViewMode>('days');
  const [activeDay, setActiveDay] = useState<string>(() => {
      const d = new Date().getDay(); 
      return DAYS_ORDER[d === 0 ? 6 : d - 1];
  });
  const [filterTeacher, setFilterTeacher] = useState<string>('Все');
  const [filterSubject, setFilterSubject] = useState<string>('Все');
  
  const dynamicBranchList = useMemo(() => branches.filter(b => b.isActive).map(b => b.name).sort(), [branches]);
  const [selectedBranch, setSelectedBranch] = useState<string>(user.branch || 'Все филиалы');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);

  const roomsInBranch = useMemo(() => {
      if (selectedBranch === 'Все филиалы') return [];
      const branch = branches.find(b => b.name === selectedBranch);
      return branch?.classrooms || [];
  }, [selectedBranch, branches]);

  const scheduleEvents = useMemo(() => {
      const events: ScheduleEvent[] = [];
      groups.forEach(g => {
          if (selectedBranch !== 'Все филиалы' && g.branch !== selectedBranch) return;
          if (filterSubject !== 'Все' && g.subject !== filterSubject) return;
          if (filterTeacher !== 'Все' && g.teacher !== filterTeacher) return;

          const course = courses.find(c => c.name === g.subject);
          
          if (g.scheduleSlots && g.scheduleSlots.length > 0) {
              g.scheduleSlots.forEach(slot => {
                  events.push({
                      uniqueId: `${g.id}_${slot.id}`,
                      groupId: g.id,
                      groupName: g.name,
                      subject: g.subject,
                      teacher: g.teacher,
                      dayCode: slot.day,
                      time: slot.time,
                      endTime: slot.endTime,
                      duration: 90,
                      room: slot.room || g.room,
                      color: course?.color || 'blue',
                      icon: course?.icon || 'BookOpen'
                  });
              });
          }
      });
      return events;
  }, [groups, selectedBranch, filterSubject, filterTeacher, courses]);

  return (
    <div className="space-y-6 antialiased font-sans">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Расписание занятий</h2>
            <div className="flex flex-wrap items-center gap-3 mt-2">
                {isSuperUser ? (
                    <div className="w-56">
                        <CustomSelect 
                            value={selectedBranch} 
                            onChange={setSelectedBranch} 
                            options={['Все филиалы', ...dynamicBranchList]} 
                            icon={MapPin}
                        />
                    </div>
                ) : user.branch && (
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <MapPin size={14} className="text-blue-500" /> {user.branch}
                    </div>
                )}
            </div>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 shadow-inner h-[40px]">
            <button onClick={() => setViewMode('days')} className={`px-5 py-1.5 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase transition-all ${viewMode === 'days' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><CalendarIcon size={14}/> По дням</button>
            <button onClick={() => setViewMode('rooms')} className={`px-5 py-1.5 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase transition-all ${viewMode === 'rooms' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><DoorOpen size={14}/> По кабинетам</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-2 shadow-sm overflow-x-auto hide-scrollbar">
          {DAYS_ORDER.map(d => (
              <button 
                key={d} 
                onClick={() => setActiveDay(d)}
                className={`flex-1 min-w-[80px] py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeDay === d ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105 z-10' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-700'}`}
              >
                  {FULL_DAYS[d]}
              </button>
          ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[500px]">
          {viewMode === 'days' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-8 animate-in fade-in duration-500">
                  {scheduleEvents.filter(e => e.dayCode === activeDay).sort((a,b) => a.time.localeCompare(b.time)).map(event => {
                      const Icon = ICON_MAP[event.icon || 'BookOpen'] || BookOpen;
                      return (
                          <div key={event.uniqueId} className="group bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-blue-400 hover:shadow-xl transition-all cursor-default">
                              <div className="flex justify-between items-start mb-6">
                                  <div className="flex items-center gap-3">
                                      <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-sm text-blue-600 border border-slate-100 dark:border-slate-700">
                                          <Clock size={16} strokeWidth={2.5}/>
                                      </div>
                                      <span className="text-sm font-black text-slate-900 dark:text-white tracking-tighter">{event.time} - {event.endTime}</span>
                                  </div>
                                  <div className="text-[10px] font-black text-slate-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700 uppercase tracking-widest">{event.room || 'Ауд. ?'}</div>
                              </div>
                              <div className="flex items-center gap-4 mb-5">
                                  <div className={`p-3 rounded-2xl bg-white dark:bg-slate-800 border shadow-sm group-hover:scale-110 transition-transform ${event.color === 'emerald' ? 'text-emerald-500 border-emerald-100' : 'text-blue-500 border-blue-100'}`}>
                                      <Icon size={20} />
                                  </div>
                                  <div className="min-w-0">
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{event.subject}</p>
                                      <h4 className="font-bold text-sm text-slate-800 dark:text-white uppercase leading-tight truncate">{event.groupName}</h4>
                                  </div>
                              </div>
                              <div className="pt-4 border-t border-slate-200/50 dark:border-slate-700 flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 shadow-inner overflow-hidden shrink-0"><User size={14}/></div>
                                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">{event.teacher}</span>
                              </div>
                          </div>
                      );
                  })}
                  {scheduleEvents.filter(e => e.dayCode === activeDay).length === 0 && (
                      <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-300">
                          <AlertCircle size={64} strokeWidth={1} className="opacity-10 mb-4" />
                          <p className="text-sm font-bold uppercase tracking-widest italic opacity-50">На этот день занятий не запланировано</p>
                      </div>
                  )}
              </div>
          ) : (
              <div className="overflow-x-auto custom-scrollbar p-6">
                   <div className="min-w-[800px]">
                        <div className="grid grid-cols-[100px_repeat(auto-fit,minmax(150px,1fr))] border-b dark:border-slate-700 mb-2 pb-4">
                            <div className="flex flex-col items-center justify-center"><Clock size={20} className="text-slate-300"/></div>
                            {roomsInBranch.map(room => (
                                <div key={room.id} className="text-center font-black text-[11px] uppercase tracking-[0.2em] text-slate-500 flex flex-col gap-1 border-l dark:border-slate-700">
                                    <span>{room.name}</span>
                                    <span className="text-[8px] opacity-40">кап: {room.capacity}</span>
                                </div>
                            ))}
                            {roomsInBranch.length === 0 && <div className="text-center text-slate-400 italic text-xs py-10 uppercase">Выберите филиал для просмотра кабинетов</div>}
                        </div>
                        <div className="space-y-1">
                            {TIMES.map(time => (
                                <div key={time} className="grid grid-cols-[100px_repeat(auto-fit,minmax(150px,1fr))] min-h-[100px] group/row">
                                    <div className="flex items-center justify-center text-xs font-black text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-l-2xl border-r dark:border-slate-800">{time}</div>
                                    {roomsInBranch.map(room => {
                                        const event = scheduleEvents.find(e => e.dayCode === activeDay && e.time === time && e.room === room.name);
                                        return (
                                            <div key={room.id} className="border-l border-b dark:border-slate-800 p-2 relative group/cell hover:bg-blue-50/10 transition-colors">
                                                {event && (
                                                    <div className="bg-white dark:bg-slate-800 border-l-4 border-blue-500 p-3 rounded-xl shadow-sm h-full flex flex-col justify-between animate-in zoom-in-95 duration-200">
                                                        <h5 className="text-[10px] font-black uppercase text-slate-800 dark:text-white truncate">{event.groupName}</h5>
                                                        <p className="text-[9px] font-bold text-slate-400 truncate">{event.teacher.split(' ')[0]}</p>
                                                        <div className="text-[8px] font-black text-blue-500 uppercase mt-1">{event.subject}</div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                   </div>
              </div>
          )}
      </div>
    </div>
  );
};
