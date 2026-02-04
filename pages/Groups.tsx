
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Group, Employee, Student, UserRole, UserProfile, Branch, Course, CourseProgram, ScheduleSlot, BranchEntity } from '../types';
import { 
    Users, Calendar, Plus, Save, X, Library, Trash2, Settings, User, 
    Search, Calculator, FlaskConical, Atom, Dna, Globe, Scroll, Gavel, 
    Code, BookOpen, MapPin, Clock, DoorOpen, ChevronLeft, ChevronRight, Check, CheckCircle, Layers, BookOpenCheck,
    MoreHorizontal, GraduationCap, BarChart3, PieChart as PieIcon, Activity, TrendingUp, Edit3, AlertCircle,
    UserCheck, UserX, Undo2, Minus, ChevronDown
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { StudentProfileModal } from '../components/StudentProfileModal';
import { CustomSelect } from '../components/CustomSelect';
import { useData } from '../hooks/useData';

const DAYS_ORDER = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const AGE_CATEGORIES = ['3-5 класс', '6-8 класс', '9-11 класс', 'Другое'];

interface AttendanceRecord {
    topic: string;
    attendance: Record<number, string>;
    lastModifiedBy: string;
    lastModifiedAt: string;
}

// Mini Custom Select for Schedule Grid - Modified to open UPWARDS
const ScheduleMiniSelect = ({ value, options, onChange, placeholder, icon: Icon }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={ref}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl text-xs font-bold transition-all h-[42px] shadow-sm ${isOpen ? 'border-blue-500 ring-4 ring-blue-500/5' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
            >
                <div className="flex items-center gap-2 truncate">
                    {Icon && <Icon size={14} className="text-slate-400" />}
                    <span className={value ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>{value || placeholder}</span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute bottom-full left-0 w-full mb-1.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-2xl z-[100] p-1 animate-in fade-in slide-in-from-bottom-1 duration-200 max-h-48 overflow-y-auto custom-scrollbar">
                    {options.map((opt: string) => (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => { onChange(opt); setIsOpen(false); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-bold transition-colors ${value === opt ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export const Groups: React.FC = () => {
  const [groups, setGroups] = useData<Group[]>(StorageKeys.GROUPS, []);
  const [courses] = useData<Course[]>(StorageKeys.COURSES, []);
  const [programs] = useData<CourseProgram[]>(StorageKeys.COURSE_PROGRAMS, []);
  const [students, setStudents] = useData<Student[]>(StorageKeys.STUDENTS, []);
  const [branches] = useData<BranchEntity[]>(StorageKeys.BRANCHES, []);
  const [allAttendance, setAllAttendance] = useData<Record<string, AttendanceRecord>>(StorageKeys.ATTENDANCE, {});

  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  const [allEmployees] = useData<Employee[]>(StorageKeys.EMPLOYEES, []);
  const teachers = useMemo(() => allEmployees.filter(e => e.role === UserRole.Teacher && e.status !== 'Fired'), [allEmployees]);
  
  const [viewMode, setViewMode] = useState<'cards' | 'stats'>('cards');
  const [subjectFilter, setSubjectFilter] = useState('Все');
  const [programFilter, setProgramFilter] = useState('Все');
  const [selectedBranch, setSelectedBranch] = useState<string>(user.branch || 'Все');
  const [searchTerm, setSearchTerm] = useState('');
  
  const isSuperUser = ([UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Financier] as (UserRole | string)[]).includes(user.role);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<Group> | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const originalGroupRef = useRef<string>('');
  
  const [viewingGroupJournal, setViewingGroupJournal] = useState<Group | null>(null);
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [lessonTopic, setLessonTopic] = useState('');
  const [attendance, setAttendance] = useState<Record<number, string>>({});
  const [isEditingJournal, setIsEditingJournal] = useState(true);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [journalErrors, setJournalErrors] = useState<{ topic?: boolean, students?: Set<number> }>({});

  useEffect(() => {
    if (viewingGroupJournal) {
        const key = `${viewingGroupJournal.id}_${journalDate}`;
        const existingRecord = allAttendance[key];
        setJournalErrors({});
        if (existingRecord) {
            setLessonTopic(existingRecord.topic || '');
            setAttendance(existingRecord.attendance || {});
            setIsEditingJournal(false);
        } else {
            setLessonTopic('');
            setAttendance({});
            setIsEditingJournal(true);
        }
    }
  }, [journalDate, viewingGroupJournal, allAttendance]);

  const allAvailableSubjectNames = useMemo(() => Array.from(new Set(courses.map(c => c.name))).sort(), [courses]);
  const allAvailableProgramNames = useMemo(() => programs.map(p => p.name).sort(), [programs]);
  const dynamicBranchList = useMemo(() => branches.filter(b => b.isActive).map(b => b.name).sort(), [branches]);

  const visibleGroups = useMemo(() => {
      let list = groups;

      if (searchTerm.trim()) {
          const s = searchTerm.toLowerCase();
          list = list.filter(g => g.name.toLowerCase().includes(s));
      }

      if (user.role === UserRole.Teacher) list = list.filter(g => g.teacher === user.fullName);
      
      if (isSuperUser) {
          if (selectedBranch !== 'Все') list = list.filter(g => g.branch === selectedBranch);
      } else if (user.branch) {
          list = list.filter(g => g.branch === user.branch);
      }

      if (subjectFilter !== 'Все') list = list.filter(g => g.subject === subjectFilter);
      if (programFilter !== 'Все') {
          const progId = programs.find(p => p.name === programFilter)?.id;
          list = list.filter(g => g.courseProgramId === progId);
      }
      return list.sort((a, b) => b.id - a.id);
  }, [groups, user, selectedBranch, isSuperUser, subjectFilter, programFilter, programs, searchTerm]);

  const stats = useMemo(() => {
    const totalActualGroups = visibleGroups.length;
    
    let totalMax = 0;
    let totalFact = 0;

    visibleGroups.forEach(g => {
        totalMax += (Number(g.maxStudents) || 0);
        totalFact += students.filter(s => s.groupIds?.includes(g.id)).length;
    });
    
    const subjectStats = Array.from(new Set(visibleGroups.map(g => g.subject))).map(sub => {
        const subGroups = visibleGroups.filter(g => g.subject === sub);
        let actual = 0;
        let plan = 0;
        subGroups.forEach(g => {
            actual += students.filter(s => s.groupIds?.includes(g.id)).length;
            plan += (Number(g.maxStudents) || 0);
        });
        return { subject: (sub as string).slice(0, 8) + '...', fullSubject: sub, actual, plan };
    });

    return {
        totalActualGroups,
        totalMaxStudents: totalMax,
        totalActualStudents: totalFact,
        capacityUsage: totalMax > 0 ? Math.round((totalFact / totalMax) * 100) : 0,
        subjectStats
    };
  }, [visibleGroups, students]);

  const handleClose = () => {
      if (editingGroup && JSON.stringify(editingGroup) !== originalGroupRef.current) {
          if (!confirm('Есть несохраненные изменения. Закрыть окно?')) return;
      }
      setIsModalOpen(false);
      setEditingGroup(null);
      setErrors({});
  };

  const handleAddNew = () => {
    const newG: Partial<Group> = {
        maxStudents: 20,
        scheduleSlots: [{ id: Date.now().toString(), day: 'Пн', time: '14:00', endTime: '15:30', room: '' }],
        branch: (!isSuperUser && user.branch) ? user.branch : (selectedBranch !== 'Все' ? selectedBranch : undefined), 
        teacher: user.role === UserRole.Teacher ? user.fullName : undefined,
        ageCategory: '9-11 класс'
    };
    setEditingGroup(newG);
    setErrors({});
    originalGroupRef.current = JSON.stringify(newG);
    setIsModalOpen(true);
  };

  const handleEdit = (group: Group) => {
    const groupWithSlots = { ...group, scheduleSlots: group.scheduleSlots || [] };
    setEditingGroup(groupWithSlots);
    setErrors({});
    originalGroupRef.current = JSON.stringify(groupWithSlots);
    setIsModalOpen(true);
  };

  const handleDelete = () => {
    if (!editingGroup?.id) return;
    if (confirm('Удалить группу?')) {
        const idToDelete = editingGroup.id;
        setGroups(groups.filter(g => g.id !== idToDelete));
        setIsModalOpen(false);
        setEditingGroup(null);
    }
  };

  const handleSave = () => {
    const newErrors: Record<string, boolean> = {};
    if (!editingGroup?.name?.trim()) newErrors.name = true;
    if (!editingGroup?.courseProgramId) newErrors.program = true;
    if (!editingGroup?.subject) newErrors.subject = true;
    if (isSuperUser && !editingGroup?.branch) newErrors.branch = true;
    if (!editingGroup?.teacher) newErrors.teacher = true;

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        storage.notify('Заполните обязательные поля', 'warning');
        return;
    }

    const slots = editingGroup!.scheduleSlots || [];
    const constructedSchedule = slots.map(s => `${s.day} ${s.time}-${s.endTime}`).join(', ');
    
    const payload = {
        ...editingGroup,
        schedule: constructedSchedule,
        scheduleDays: Array.from(new Set(slots.map(s => s.day))),
        scheduleTime: slots.length > 0 ? `${slots[0].time}-${slots[0].endTime}` : '',
        room: slots.length > 0 ? slots[0].room : '',
    } as Group;

    setGroups(editingGroup!.id ? groups.map(g => g.id === editingGroup!.id ? payload : g) : [({ ...payload, id: Date.now() } as Group), ...groups]);
    setIsModalOpen(false);
    setEditingGroup(null);
  };

  const clearFieldError = (field: string) => {
    if (errors[field]) {
        setErrors(prev => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    }
  };

  const handleAddSlot = () => {
    setEditingGroup(prev => ({
        ...prev,
        scheduleSlots: [
            ...(prev?.scheduleSlots || []),
            { id: Date.now().toString(), day: 'Пн', time: '14:00', endTime: '15:30', room: '' }
        ]
    }));
  };

  const handleRemoveSlot = (id: string) => {
    setEditingGroup(prev => ({
        ...prev,
        scheduleSlots: prev?.scheduleSlots?.filter(s => s.id !== id) || []
    }));
  };

  const handleUpdateSlot = (id: string, updates: Partial<ScheduleSlot>) => {
    setEditingGroup(prev => ({
        ...prev,
        scheduleSlots: prev?.scheduleSlots?.map(s => s.id === id ? { ...s, ...updates } : s) || []
    }));
  };

  const handleOpenJournal = (e: React.MouseEvent, group: Group) => {
      e.stopPropagation();
      setViewingGroupJournal(group);
      setJournalDate(new Date().toISOString().split('T')[0]);
  };

  const markAllAttendance = (status: string) => {
      if (!viewingGroupJournal) return;
      const groupStudents = students.filter(s => s.groupIds?.includes(viewingGroupJournal.id));
      const newAttendance = { ...attendance };
      groupStudents.forEach(s => {
          newAttendance[s.id] = status;
      });
      setAttendance(newAttendance);
      if (journalErrors.students) {
          const newErrs = new Set(journalErrors.students);
          groupStudents.forEach(s => newErrs.delete(s.id));
          setJournalErrors({ ...journalErrors, students: newErrs });
      }
  };

  const saveJournal = () => { 
      if (!viewingGroupJournal) return;
      const groupStudents = students.filter(s => s.groupIds?.includes(viewingGroupJournal.id));
      const missingStudents = new Set<number>();
      groupStudents.forEach(s => { if (!attendance[s.id]) missingStudents.add(s.id); });
      const hasTopicError = !lessonTopic.trim();
      const hasStudentError = missingStudents.size > 0;
      if (hasTopicError || hasStudentError) {
          setJournalErrors({ topic: hasTopicError, students: missingStudents });
          storage.notify('Заполните все данные в журнале', 'warning');
          return;
      }
      const key = `${viewingGroupJournal.id}_${journalDate}`;
      setAllAttendance({ ...allAttendance, [key]: { topic: lessonTopic, attendance, lastModifiedBy: user.fullName, lastModifiedAt: new Date().toISOString() } });
      storage.notify('Журнал сохранен', 'success'); 
      setIsEditingJournal(false);
  };

  const handleDeleteStudent = (id: number) => {
      setStudents(students.filter(s => s.id !== id));
      setSelectedStudentForProfile(null);
      storage.notify('Ученик удален', 'info');
  };

  const currentBranchClassrooms = useMemo(() => {
    if (!editingGroup?.branch) return [];
    const b = branches.find(item => item.name === editingGroup.branch);
    return b?.classrooms?.map(c => c.name) || [];
  }, [editingGroup?.branch, branches]);

  return (
    <div className="space-y-6 antialiased font-sans">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Группы</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
                {isSuperUser ? (
                    <div className="w-48">
                        <CustomSelect 
                            value={selectedBranch} 
                            onChange={setSelectedBranch} 
                            options={['Все', ...dynamicBranchList]} 
                            icon={MapPin}
                        />
                    </div>
                ) : user.branch && user.role !== UserRole.Teacher && (
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                        <MapPin size={14} className="text-blue-500" /> {user.branch}
                    </p>
                )}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 shadow-inner h-[36px]">
                    <button onClick={() => setViewMode('cards')} className={`px-4 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold transition-all ${viewMode === 'cards' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-50'}`}><Library size={14}/> Список</button>
                    <button onClick={() => setViewMode('stats')} className={`px-4 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold transition-all ${viewMode === 'stats' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-50'}`}><BarChart3 size={14}/> Статистика</button>
                </div>
            </div>
        </div>
        {user.role !== UserRole.Teacher && (
            <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 shadow-sm active:scale-95 text-sm tracking-wide"><Plus size={18} strokeWidth={3} /> Создать группу</button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-end shadow-sm">
          <CustomSelect label="Продукт" value={programFilter} onChange={setProgramFilter} options={['Все', ...allAvailableProgramNames]} className="w-full sm:w-48" />
          <CustomSelect label="Курс" value={subjectFilter} onChange={setSubjectFilter} options={['Все', ...allAvailableSubjectNames]} className="w-full sm:w-48" />
          <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Поиск по названию..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-[38px] pl-9 pr-4 py-2 border border-slate-200 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
      </div>

      {viewMode === 'stats' ? (
          <div className="space-y-6 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-500 tracking-wider mb-1">Групп всего</p>
                    <h3 className="text-2xl font-bold">{stats.totalActualGroups}</h3>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-500 tracking-wider mb-1">Студентов факт</p>
                    <h3 className="text-2xl font-bold text-emerald-600">{stats.totalActualStudents}</h3>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-500 tracking-wider mb-1">Загрузка мест</p>
                    <h3 className="text-2xl font-bold text-blue-600">{stats.capacityUsage}%</h3>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-500 tracking-wider mb-1">Макс. мест</p>
                    <h3 className="text-2xl font-bold text-slate-400">{stats.totalMaxStudents}</h3>
                  </div>
              </div>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
            {visibleGroups.map(group => {
              const actualStudentCount = students.filter(s => s.groupIds?.includes(group.id)).length;
              const slots = group.scheduleSlots || [];
              const progress = Math.min(100, (actualStudentCount / group.maxStudents) * 100);
              const isOverPlan = actualStudentCount > group.maxStudents;
              
              return (
                <div key={group.id} onClick={() => user.role === UserRole.Teacher ? handleOpenJournal({ stopPropagation: () => {} } as any, group) : handleEdit(group)} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all cursor-pointer flex flex-col h-full active:scale-[0.98]">
                    <div className="p-6 flex-1">
                        <div className="flex justify-between items-start mb-4">
                            <div className="min-w-0">
                                <div className="flex gap-2 mb-2">
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase"><Layers size={10}/> {group.subject}</span>
                                    {group.ageCategory && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded uppercase">
                                            {group.ageCategory === 'Другое' ? group.customAgeCategory : group.ageCategory}
                                        </span>
                                    )}
                                </div>
                                <h3 className="font-bold text-lg leading-tight tracking-tight truncate">{group.name}</h3>
                            </div>
                        </div>
                        <div className="space-y-4 mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center border border-slate-100 dark:border-slate-600 shadow-sm shrink-0"><GraduationCap size={18} className="text-slate-400" /></div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-slate-400 leading-none mb-1">Учитель</p>
                                    <p className="text-sm font-semibold truncate">{group.teacher || 'Не назначен'}</p>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400"><span>Места</span><span className={actualStudentCount >= group.maxStudents ? 'text-rose-500 font-black' : 'text-emerald-600'}>{actualStudentCount} / {group.maxStudents}</span></div>
                                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-500 rounded-full ${isOverPlan ? 'bg-rose-500' : (actualStudentCount === group.maxStudents ? 'bg-amber-500' : 'bg-emerald-500')}`} 
                                        style={{ width: `${Math.min(100, progress)}%` }} 
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-slate-50 dark:border-slate-700 pt-4">
                            <p className="text-[10px] font-bold text-slate-400 tracking-wider mb-2 flex items-center gap-1.5"><Calendar size={12} className="text-blue-500"/> Расписание</p>
                            <div className="flex flex-wrap gap-1.5">
                                {slots.length > 0 ? slots.map((s, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm"><span className="text-blue-600">{s.day}</span><span>{s.time} - {s.endTime}</span></div>
                                )) : <div className="text-[10px] text-slate-400 italic">Не настроено</div>}
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                        {user.role !== UserRole.Teacher && (
                            <button onClick={(e) => { e.stopPropagation(); handleEdit(group); }} className="p-2.5 bg-white dark:bg-slate-800 text-slate-400 hover:text-blue-600 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 transition-all active:scale-90"><Settings size={18}/></button>
                        )}
                        <button onClick={(e) => handleOpenJournal(e, group)} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold tracking-wide shadow-sm transition-all active:scale-95">Заполнить журнал</button>
                    </div>
                </div>
              );
            })}
          </div>
      )}

      {isModalOpen && editingGroup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-200 antialiased">
                <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight text-xl"><Library size={22} className="text-blue-600"/>{editingGroup.id ? 'Настройка группы' : 'Новая группа'}</h3>
                    <button onClick={handleClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"><X size={24} /></button>
                </div>
                <div className="p-8 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="space-y-6">
                        <div>
                            <label className={`block text-[10px] font-bold mb-1.5 ml-1 tracking-wider transition-colors ${errors.name ? 'text-red-500' : 'text-slate-500'}`}>Название группы *</label>
                            <input 
                                type="text" 
                                value={editingGroup.name || ''} 
                                onChange={(e) => { setEditingGroup({...editingGroup, name: e.target.value}); clearFieldError('name'); }} 
                                className={`w-full border rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all ${errors.name ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`} 
                                placeholder="Напр. БИО-ДУШ-10А"
                            />
                        </div>
                        {isSuperUser && (
                            <CustomSelect label="Филиал *" value={editingGroup.branch || ''} onChange={(val: any) => { setEditingGroup({...editingGroup, branch: val as Branch}); clearFieldError('branch'); }} options={dynamicBranchList} error={errors.branch} required />
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <CustomSelect label="Продукт *" value={programs.find(p => p.id === editingGroup.courseProgramId)?.name || ''} onChange={(val: any) => { setEditingGroup({...editingGroup, courseProgramId: programs.find(p => p.name === val)?.id}); clearFieldError('program'); }} options={allAvailableProgramNames} icon={Layers} error={errors.program} required />
                            <CustomSelect label="Курс *" value={editingGroup.subject || ''} onChange={(val: any) => { setEditingGroup({...editingGroup, subject: val}); clearFieldError('subject'); }} options={allAvailableSubjectNames} icon={BookOpen} error={errors.subject} required />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <CustomSelect 
                                label="Возрастная категория *" 
                                value={editingGroup.ageCategory || ''} 
                                onChange={(val: any) => setEditingGroup({...editingGroup, ageCategory: val})} 
                                options={AGE_CATEGORIES} 
                                icon={Users} 
                                required 
                            />
                            {editingGroup.ageCategory === 'Другое' && (
                                <div className="animate-in slide-in-from-top-1">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1 tracking-wider uppercase">Укажите возраст *</label>
                                    <input 
                                        type="text" 
                                        value={editingGroup.customAgeCategory || ''} 
                                        onChange={(e) => setEditingGroup({...editingGroup, customAgeCategory: e.target.value})} 
                                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none bg-slate-50 dark:bg-slate-900 focus:bg-white transition-all text-slate-800" 
                                        placeholder="Напр. Студенты"
                                    />
                                </div>
                            )}
                        </div>

                        <CustomSelect label="Преподаватель *" value={editingGroup.teacher || ''} onChange={(val: any) => { setEditingGroup({...editingGroup, teacher: val}); clearFieldError('teacher'); }} options={teachers.map(t => t.fullName)} icon={User} disabled={user.role === UserRole.Teacher} error={errors.teacher} required />

                        <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                    <Clock size={18} className="text-blue-500"/> Расписание занятий
                                </h4>
                                <button 
                                    onClick={handleAddSlot}
                                    className="text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 uppercase tracking-widest border border-blue-100"
                                >
                                    <Plus size={14}/> Добавить слот
                                </button>
                            </div>
                            <div className="space-y-3">
                                {editingGroup.scheduleSlots?.map((slot, idx) => (
                                    <div key={slot.id} className="grid grid-cols-12 gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 relative group">
                                        <div className="col-span-3">
                                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">День</label>
                                            <ScheduleMiniSelect
                                                value={slot.day}
                                                options={DAYS_ORDER}
                                                onChange={(val: string) => handleUpdateSlot(slot.id, { day: val })}
                                                placeholder="День"
                                            />
                                        </div>
                                        <div className="col-span-5">
                                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Интервал времени (24ч)</label>
                                            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 h-[42px] shadow-sm group-focus-within:border-blue-500 group-focus-within:ring-4 group-focus-within:ring-blue-500/5 transition-all">
                                                <input 
                                                    type="time" 
                                                    value={slot.time} 
                                                    onChange={(e) => handleUpdateSlot(slot.id, { time: e.target.value })}
                                                    className="flex-1 bg-transparent text-xs font-bold outline-none text-slate-800 dark:text-white text-center"
                                                />
                                                <span className="text-slate-300 font-bold">—</span>
                                                <input 
                                                    type="time" 
                                                    value={slot.endTime} 
                                                    onChange={(e) => handleUpdateSlot(slot.id, { endTime: e.target.value })}
                                                    className="flex-1 bg-transparent text-xs font-bold outline-none text-slate-800 dark:text-white text-center"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-3">
                                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Ауд.</label>
                                            <ScheduleMiniSelect
                                                value={slot.room}
                                                options={currentBranchClassrooms}
                                                onChange={(val: string) => handleUpdateSlot(slot.id, { room: val })}
                                                placeholder="Ауд."
                                                icon={DoorOpen}
                                            />
                                        </div>
                                        <div className="col-span-1 flex items-end justify-center pb-1">
                                            <button 
                                                onClick={() => handleRemoveSlot(slot.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 transition-all hover:bg-red-50 rounded-xl active:scale-90"
                                                title="Удалить слот"
                                            >
                                                <Minus size={18} strokeWidth={3} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {(!editingGroup.scheduleSlots || editingGroup.scheduleSlots.length === 0) && (
                                    <div className="text-center py-10 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[28px] bg-slate-50/50 dark:bg-slate-900/30">
                                        <Calendar size={32} className="mx-auto text-slate-200 mb-2" />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] italic">Расписание не задано</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between gap-3 shrink-0">
                    {editingGroup.id ? (
                        <button onClick={handleDelete} className="text-rose-500 px-5 py-2.5 text-xs font-bold tracking-widest transition-all hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl">Удалить группу</button>
                    ) : <div/>}
                    <div className="flex gap-3">
                        <button onClick={handleClose} className="px-6 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 tracking-widest transition-colors hover:text-slate-700 dark:hover:text-slate-200">Отмена</button>
                        <button onClick={handleSave} className="px-10 py-3 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xl shadow-blue-500/20 flex items-center gap-2 shadow-sm active:scale-95 transition-all tracking-wide uppercase"><Save size={18} /> Сохранить</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Journal Modal */}
      {viewingGroupJournal && (
          <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 overflow-hidden antialiased">
                  <header className="p-6 border-b dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 shrink-0 gap-4">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20"><BookOpenCheck size={24}/></div>
                          <div>
                              <h3 className="font-bold text-xl text-slate-900 dark:text-white tracking-tight leading-none">{viewingGroupJournal.name}</h3>
                              <p className="text-[10px] text-slate-400 font-bold mt-1.5">{viewingGroupJournal.subject} • {viewingGroupJournal.teacher}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-3">
                          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-1 shadow-sm">
                              <button onClick={() => { const d = new Date(journalDate); d.setDate(d.getDate()-1); setJournalDate(d.toISOString().split('T')[0]); }} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all"><ChevronLeft size={16}/></button>
                              <input type="date" value={journalDate} onChange={e => setJournalDate(e.target.value)} className="bg-transparent text-sm font-bold px-2 outline-none dark:text-white" />
                              <button onClick={() => { const d = new Date(journalDate); d.setDate(d.getDate()+1); setJournalDate(d.toISOString().split('T')[0]); }} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all"><ChevronRight size={16}/></button>
                          </div>
                          <button onClick={() => setViewingGroupJournal(null)} className="p-2.5 text-slate-400 hover:text-rose-500 transition-all bg-white dark:bg-slate-700 rounded-xl shadow-sm border"><X size={20}/></button>
                      </div>
                  </header>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8 bg-slate-50/30 dark:bg-slate-950/20">
                      <div className="space-y-4">
                          <div className="flex justify-between items-end px-2">
                              <h4 className="text-xs font-bold text-slate-400">Урок и материалы</h4>
                              {!isEditingJournal && (
                                  <button onClick={() => setIsEditingJournal(true)} className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"><Edit3 size={12}/> Редактировать запись</button>
                              )}
                          </div>
                          <div className={`p-4 rounded-2xl border-2 transition-all ${journalErrors.topic ? 'border-red-500 bg-red-50' : 'border-slate-100 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm'}`}>
                              <label className="block text-[10px] font-bold text-slate-400 mb-2 ml-1">Тема занятия</label>
                              {isEditingJournal ? (
                                  <input 
                                    type="text"
                                    value={lessonTopic} 
                                    onChange={e => { setLessonTopic(e.target.value); setJournalErrors({...journalErrors, topic: false}); }} 
                                    className="w-full h-[42px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-bold text-slate-800 dark:text-white outline-none placeholder:text-slate-300 shadow-inner" 
                                    placeholder="Напр. Основы фотосинтеза..." 
                                  />
                              ) : (
                                  <p className="text-base font-bold text-slate-800 dark:text-white leading-tight">{lessonTopic || 'Тема не указана'}</p>
                              )}
                          </div>
                      </div>

                      <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                              <h4 className="text-xs font-bold text-slate-400">Посещаемость и активность</h4>
                              {isEditingJournal && (
                                  <div className="flex gap-2">
                                      <button onClick={() => markAllAttendance('П')} className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-bold flex items-center gap-2 hover:bg-emerald-600 hover:text-white transition-all"><UserCheck size={14}/> Все были</button>
                                      <button onClick={() => markAllAttendance('Н')} className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-bold flex items-center gap-2 hover:bg-rose-600 hover:text-white transition-all"><UserX size={14}/> Никого нет</button>
                                  </div>
                              )}
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                              {students.filter(s => s.groupIds?.includes(viewingGroupJournal.id)).sort((a,b) => a.fullName.localeCompare(b.fullName)).map((student, sIdx) => {
                                  const status = attendance[student.id];
                                  const hasError = journalErrors.students?.has(student.id);
                                  return (
                                      <div key={student.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${hasError ? 'border-red-500 bg-red-50 ring-4 ring-red-500/5' : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-200 shadow-sm'}`}>
                                          <div className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer" onClick={() => setSelectedStudentForProfile(student)}>
                                              <span className="text-[10px] font-bold text-slate-300 w-4">{sIdx + 1}</span>
                                              <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700 border flex items-center justify-center overflow-hidden shrink-0">
                                                  {student.avatar ? <img src={student.avatar} className="w-full h-full object-cover"/> : <User size={20} className="text-slate-300"/>}
                                              </div>
                                              <div className="min-w-0">
                                                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate tracking-tight">{student.fullName}</p>
                                              </div>
                                          </div>

                                          <div className={`flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl transition-all ${!isEditingJournal ? 'opacity-50 pointer-events-none' : ''}`}>
                                              {[
                                                  { k: 'П', t: 'Был', c: 'emerald' },
                                                  { k: 'Н', t: 'Нет', c: 'rose' },
                                                  { k: 'О', t: 'Опозд.', c: 'amber' }
                                              ].map(btn => (
                                                  <button
                                                      key={btn.k}
                                                      onClick={() => setAttendance({...attendance, [student.id]: btn.k})}
                                                      className={`w-10 h-10 sm:w-12 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                                                          status === btn.k 
                                                          ? `bg-white dark:bg-slate-700 text-${btn.c}-600 shadow-md ring-1 ring-${btn.c}-500 scale-105 z-10` 
                                                          : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                                      }`}
                                                      title={btn.t}
                                                  >
                                                      {btn.k}
                                                  </button>
                                              ))}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  </div>

                  <footer className="p-6 border-t dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col sm:flex-row justify-between items-center gap-6 shrink-0">
                      <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                              <span className="text-[10px] font-bold text-slate-400">Присутствует: {Object.values(attendance).filter(v => v === 'П' || v === 'О').length}</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                              <span className="text-[10px] font-bold text-slate-400">Отсутствует: {Object.values(attendance).filter(v => v === 'Н').length}</span>
                          </div>
                      </div>
                      <div className="flex gap-4 w-full sm:w-auto">
                          <button onClick={() => setViewingGroupJournal(null)} className="flex-1 sm:flex-none px-8 py-3 text-xs font-bold text-slate-500 tracking-wide">Закрыть</button>
                          {isEditingJournal && (
                              <button onClick={saveJournal} className="flex-1 sm:flex-none px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 active:scale-95 transition-all text-xs"><Save size={18} strokeWidth={2.5}/> Сохранить журнал</button>
                          )}
                      </div>
                  </footer>
              </div>
          </div>
      )}

      {selectedStudentForProfile && (
          <StudentProfileModal 
            student={selectedStudentForProfile} 
            onClose={() => setSelectedStudentForProfile(null)} 
            onSave={(s) => { setStudents(students.map(item => item.id === s.id ? s : item)); setSelectedStudentForProfile(null); }}
            onDelete={handleDeleteStudent}
          />
      )}
    </div>
  );
};
