
import React, { useState, useEffect, useMemo } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Group, Employee, UserRole, UserProfile, Branch } from '../types';
import { X, Clock, MapPin, User, BookOpen, Save, Filter, Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertCircle, DoorOpen } from 'lucide-react';

// --- Config ---
const DAYS_ORDER = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const FULL_DAYS: Record<string, string> = {
  'Пн': 'Понедельник',
  'Вт': 'Вторник',
  'Ср': 'Среда',
  'Чт': 'Четверг',
  'Пт': 'Пятница',
  'Сб': 'Суббота'
};
const TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

// --- Types ---
interface ScheduleEvent {
  uniqueId: string;
  groupId: number;
  groupName: string;
  subject: string;
  teacher: string;
  dayCode: string; // 'Пн'
  time: string; // '14:00'
  duration: number; // in minutes, default 60
  room?: string;
}

export const Schedule: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>(() => storage.get(StorageKeys.GROUPS, []));
  const employees = storage.get<Employee[]>(StorageKeys.EMPLOYEES, []);
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Financier].includes(user.role);
  
  // State
  const [activeDay, setActiveDay] = useState<string>(DAYS_ORDER[new Date().getDay() - 1] || 'Пн');
  const [filterTeacher, setFilterTeacher] = useState<string>('All');
  const [filterSubject, setFilterSubject] = useState<string>('All');
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  
  // Modal
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Parsing Logic
  const events = useMemo(() => {
    const parsedEvents: ScheduleEvent[] = [];
    
    groups.forEach(g => {
        // Teacher restriction: Only process groups where teacher matches user if role is Teacher
        if (user.role === UserRole.Teacher && g.teacher !== user.fullName) return;
        
        // Branch filtering logic
        if (isSuperUser) {
            // SuperUser filters by selectedBranch
            if (selectedBranch !== 'All' && g.branch !== selectedBranch) return;
        } else if (user.branch) {
            // Regular Admin restricted to their branch
            if (g.branch !== user.branch) return;
        }

        // PREFERRED: Use structured data if available
        if (g.scheduleDays && g.scheduleDays.length > 0 && g.scheduleTime) {
            g.scheduleDays.forEach((day, idx) => {
                if (DAYS_ORDER.includes(day)) {
                    parsedEvents.push({
                        uniqueId: `${g.id}-${idx}`,
                        groupId: g.id,
                        groupName: g.name,
                        subject: g.subject,
                        teacher: g.teacher,
                        dayCode: day,
                        time: g.scheduleTime || '09:00',
                        duration: 60,
                        room: g.room
                    });
                }
            });
        } 
        // FALLBACK: Parse legacy string
        else {
            const parts = g.schedule.split(' ');
            if (parts.length >= 2) {
                const timeStr = parts[parts.length - 1]; // Last part is usually time
                const daysStr = parts[0]; // First part is days split by /
                
                const days = daysStr.split('/').map(d => d.replace(/[^а-яА-Яa-zA-Z]/g, ''));
                
                days.forEach((day, idx) => {
                    // Normalize day
                    let normalizedDay = day;
                    if (day.startsWith('Mon')) normalizedDay = 'Пн';
                    if (day.startsWith('Tue')) normalizedDay = 'Вт';
                    // ... simplistic mapping, relying mostly on Russian input for now as per app language
                    
                    if (DAYS_ORDER.includes(normalizedDay)) {
                        parsedEvents.push({
                            uniqueId: `${g.id}-${idx}`,
                            groupId: g.id,
                            groupName: g.name,
                            subject: g.subject,
                            teacher: g.teacher,
                            dayCode: normalizedDay,
                            time: timeStr,
                            duration: 60,
                            room: g.room
                        });
                    }
                });
            }
        }
    });
    return parsedEvents;
  }, [groups, user, selectedBranch, isSuperUser]);

  // Filtering
  const filteredEvents = useMemo(() => {
      return events.filter(ev => {
          const matchTeacher = filterTeacher === 'All' || ev.teacher === filterTeacher;
          const matchSubject = filterSubject === 'All' || ev.subject === filterSubject;
          return matchTeacher && matchSubject;
      });
  }, [events, filterTeacher, filterSubject]);

  // Lists for dropdowns
  const uniqueTeachers = useMemo(() => Array.from(new Set(groups.map(g => g.teacher).filter(Boolean))), [groups]);
  const uniqueSubjects = useMemo(() => Array.from(new Set(groups.map(g => g.subject))), [groups]);

  // --- Actions ---

  const getSubjectColor = (subject: string) => {
      const s = subject.toLowerCase();
      if (s.includes('мат')) return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800';
      if (s.includes('англ')) return 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800';
      if (s.includes('хим')) return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800';
      if (s.includes('физ')) return 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800';
      if (s.includes('био')) return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800';
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
  };

  const handleEditClick = (ev: ScheduleEvent) => {
      if (user.role === UserRole.Student) return; // Students can't edit
      setEditingEvent(ev);
      setIsModalOpen(true);
  };

  const handleSave = () => {
      if (!editingEvent) return;

      const group = groups.find(g => g.id === editingEvent.groupId);
      if (group) {
          // If group uses new structure
          let updatedGroup = { ...group, teacher: editingEvent.teacher, scheduleTime: editingEvent.time };
          
          // Also update legacy string for safety
          const daysStr = group.scheduleDays?.length ? group.scheduleDays.join('/') : group.schedule.split(' ')[0];
          updatedGroup.schedule = `${daysStr} ${editingEvent.time}`;

          const updatedGroups = groups.map(g => g.id === group.id ? updatedGroup : g);
          setGroups(updatedGroups);
          storage.set(StorageKeys.GROUPS, updatedGroups);
      }
      
      setIsModalOpen(false);
      setEditingEvent(null);
  };

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      {/* Header & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 flex-shrink-0">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Расписание занятий</h2>
            {isSuperUser ? (
                <div className="flex items-center gap-2 mt-2">
                    <MapPin size={14} className="text-slate-400" />
                    <select 
                        value={selectedBranch} 
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="bg-transparent text-sm font-bold text-slate-600 dark:text-slate-300 border-b border-dashed border-slate-300 dark:border-slate-600 outline-none pb-0.5 cursor-pointer hover:text-blue-600"
                    >
                        <option value="All">Все филиалы</option>
                        {Object.values(Branch).map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>
            ) : (
                <p className="text-slate-500 dark:text-slate-400 text-sm">Планирование и загрузка аудиторий</p>
            )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 shadow-sm">
                <Filter size={16} className="text-slate-400 mr-2" />
                <select 
                    value={filterSubject} 
                    onChange={e => setFilterSubject(e.target.value)}
                    className="bg-transparent text-sm py-2 outline-none text-slate-700 dark:text-slate-200 min-w-[140px]"
                >
                    <option value="All">Все предметы</option>
                    {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            {/* Hide Teacher Filter if user is Teacher (redundant) */}
            {user.role !== UserRole.Teacher && (
                <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 shadow-sm">
                    <User size={16} className="text-slate-400 mr-2" />
                    <select 
                        value={filterTeacher} 
                        onChange={e => setFilterTeacher(e.target.value)}
                        className="bg-transparent text-sm py-2 outline-none text-slate-700 dark:text-slate-200 min-w-[140px]"
                    >
                        <option value="All">Все преподаватели</option>
                        {uniqueTeachers.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            )}
        </div>
      </div>

      {/* Mobile Day Tabs (Visible on < lg) */}
      <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 flex-shrink-0 hide-scrollbar">
          {DAYS_ORDER.map(day => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                    activeDay === day 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                  {FULL_DAYS[day]}
              </button>
          ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden relative flex flex-col">
          
          {/* Desktop Week View */}
          <div className="hidden lg:block overflow-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-[80px_repeat(6,_1fr)] min-w-[1000px]">
                  {/* Header Row */}
                  <div className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-700 p-3 text-center text-xs font-bold text-slate-500 uppercase">
                      Время
                  </div>
                  {DAYS_ORDER.map(day => (
                      <div key={day} className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-700 p-3 text-center text-sm font-bold text-slate-700 dark:text-slate-200">
                          {FULL_DAYS[day]}
                      </div>
                  ))}

                  {/* Time Rows */}
                  {TIMES.map(time => (
                      <React.Fragment key={time}>
                          <div className="border-b border-r border-slate-100 dark:border-slate-700/50 p-2 text-center text-xs font-medium text-slate-400 sticky left-0 bg-white dark:bg-slate-800 z-10">
                              {time}
                          </div>
                          {DAYS_ORDER.map(day => {
                              const cellEvents = filteredEvents.filter(e => e.dayCode === day && e.time.startsWith(time.split(':')[0]));
                              return (
                                  <div key={`${day}-${time}`} className="border-b border-r border-slate-100 dark:border-slate-700/50 p-1 min-h-[80px] relative group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                      {cellEvents.map(ev => (
                                          <div 
                                            key={ev.uniqueId}
                                            onClick={() => handleEditClick(ev)}
                                            className={`mb-1 p-2 rounded-lg text-xs border-l-4 cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] transition-all ${getSubjectColor(ev.subject)}`}
                                          >
                                              <div className="font-bold truncate">{ev.groupName}</div>
                                              <div className="flex items-center gap-1 opacity-80 mt-0.5 truncate">
                                                  <User size={10} /> {ev.teacher.split(' ')[0]}
                                              </div>
                                              <div className="flex justify-between items-center mt-1">
                                                  <div className="flex items-center gap-1 opacity-80">
                                                      <Clock size={10} /> {ev.time}
                                                  </div>
                                                  {ev.room && (
                                                      <div className="flex items-center gap-1 font-bold text-[10px] opacity-70 bg-white/30 px-1 rounded">
                                                          <DoorOpen size={10} /> {ev.room}
                                                      </div>
                                                  )}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              );
                          })}
                      </React.Fragment>
                  ))}
              </div>
          </div>

          {/* Mobile Day View */}
          <div className="lg:hidden flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {TIMES.map(time => {
                  const timeEvents = filteredEvents.filter(e => e.dayCode === activeDay && e.time.startsWith(time.split(':')[0]));
                  if (timeEvents.length === 0) return null;

                  return (
                      <div key={time} className="flex gap-4">
                          <div className="w-14 pt-2 text-right text-sm font-bold text-slate-400 flex-shrink-0">
                              {time}
                          </div>
                          <div className="flex-1 space-y-2 pb-4 border-l-2 border-slate-100 dark:border-slate-700 pl-4 relative">
                              <div className="absolute -left-[5px] top-3 w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                              {timeEvents.map(ev => (
                                  <div 
                                    key={ev.uniqueId} 
                                    onClick={() => handleEditClick(ev)}
                                    className={`p-3 rounded-xl border shadow-sm ${getSubjectColor(ev.subject)}`}
                                  >
                                      <div className="flex justify-between items-start mb-1">
                                          <h4 className="font-bold">{ev.groupName}</h4>
                                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{ev.subject}</span>
                                      </div>
                                      <div className="flex items-center justify-between text-xs opacity-90 mt-2">
                                          <div className="flex items-center gap-3">
                                              <span className="flex items-center gap-1"><User size={12}/> {ev.teacher}</span>
                                              <span className="flex items-center gap-1"><Clock size={12}/> 60 мин</span>
                                          </div>
                                          {ev.room && (
                                              <span className="flex items-center gap-1 font-bold"><DoorOpen size={12}/> {ev.room}</span>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )
              })}
              {filteredEvents.filter(e => e.dayCode === activeDay).length === 0 && (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                      <CalendarIcon size={32} className="mb-2 opacity-20"/>
                      <p>Нет занятий в этот день</p>
                  </div>
              )}
          </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && editingEvent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Clock size={18} className="text-blue-600 dark:text-blue-400"/>
                        Изменить время
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className="text-center mb-4">
                        <h4 className="text-lg font-bold text-slate-800 dark:text-white">{editingEvent.groupName}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{editingEvent.subject}</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Преподаватель</label>
                        <select 
                            value={editingEvent.teacher}
                            onChange={(e) => setEditingEvent({...editingEvent, teacher: e.target.value})}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            disabled={user.role === UserRole.Teacher}
                        >
                            {uniqueTeachers.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Время начала</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                            <select 
                                value={editingEvent.time}
                                onChange={(e) => setEditingEvent({...editingEvent, time: e.target.value})}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            >
                                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg flex gap-2 items-start">
                        <AlertCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0"/>
                        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                            Изменение времени применится ко всем дням занятий этой группы. Для изменения дней или аудитории используйте раздел "Группы".
                        </p>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">Отмена</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium flex items-center gap-2">
                        <Save size={16} /> Сохранить
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
