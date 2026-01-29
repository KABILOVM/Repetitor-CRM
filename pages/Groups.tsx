
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Group, Employee, Student, UserRole, UserProfile, Branch, Course, CourseProgram, ScheduleSlot, BranchEntity } from '../types';
import { 
    Users, Calendar, Plus, Save, X, Library, Trash2, Settings, User, 
    Search, Calculator, FlaskConical, Atom, Dna, Globe, Scroll, Gavel, 
    Code, BookOpen, MapPin, Clock, DoorOpen, ChevronLeft, ChevronRight, Check, CheckCircle, Layers, BookOpenCheck,
    MoreHorizontal, GraduationCap, BarChart3, PieChart as PieIcon, Activity, TrendingUp, Edit3, AlertCircle
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { StudentProfileModal } from '../components/StudentProfileModal';
import { CustomSelect } from '../components/CustomSelect';
import { useData } from '../hooks/useData';

const DAYS_ORDER = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface AttendanceRecord {
    topic: string;
    attendance: Record<number, string>;
    lastModifiedBy: string;
    lastModifiedAt: string;
}

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
  const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Financier].includes(user.role);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<Group> | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const originalGroupRef = useRef<string>('');
  
  const formRefs = {
    name: useRef<HTMLDivElement>(null),
    branch: useRef<HTMLDivElement>(null),
    program: useRef<HTMLDivElement>(null),
    subject: useRef<HTMLDivElement>(null),
    teacher: useRef<HTMLDivElement>(null)
  };

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

  const visibleGroups = useMemo(() => {
      let list = groups;
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
  }, [groups, user, selectedBranch, isSuperUser, subjectFilter, programFilter, programs]);

  const stats = useMemo(() => {
    const totalActualGroups = visibleGroups.length;
    const totalMaxStudents = visibleGroups.reduce((acc, g) => acc + (Number(g.maxStudents) || 0), 0);
    const totalActualStudents = visibleGroups.reduce((acc, g) => acc + (Number(g.studentsCount) || 0), 0);
    const attendanceData = [
        { name: 'Был', value: Math.round(totalActualStudents * 0.85), color: '#10b981' },
        { name: 'Нет', value: Math.round(totalActualStudents * 0.10), color: '#ef4444' },
        { name: 'Опоздал', value: Math.round(totalActualStudents * 0.05), color: '#f59e0b' }
    ];
    const subjectStats = Array.from(new Set(visibleGroups.map(g => g.subject))).map(sub => {
        const subGroups = visibleGroups.filter(g => g.subject === sub);
        const actual = subGroups.reduce((acc, g) => acc + g.studentsCount, 0);
        const plan = subGroups.reduce((acc, g) => acc + g.maxStudents, 0);
        return { subject: (sub as string).slice(0, 8) + '...', fullSubject: sub, actual, plan };
    });
    return {
        totalActualGroups,
        totalMaxStudents,
        totalActualStudents,
        capacityUsage: totalMaxStudents > 0 ? Math.round((totalActualStudents / totalMaxStudents) * 100) : 0,
        attendanceData,
        subjectStats
    };
  }, [visibleGroups]);

  const getSubjectIcon = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes('мат')) return Calculator;
      if (n.includes('хим')) return FlaskConical;
      if (n.includes('физ')) return Atom;
      if (n.includes('био')) return Dna;
      if (n.includes('англ') || n.includes('язык')) return Globe;
      if (n.includes('истор')) return Scroll;
      if (n.includes('прав')) return Gavel;
      if (n.includes('it') || n.includes('прог')) return Code;
      return BookOpen;
  };

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
        studentsCount: 0,
        maxStudents: 20,
        scheduleSlots: [{ id: Date.now().toString(), day: 'Пн', time: '14:00', endTime: '15:30', room: '' }],
        branch: (!isSuperUser && user.branch) ? user.branch : (selectedBranch !== 'Все' ? selectedBranch : undefined), 
        teacher: user.role === UserRole.Teacher ? user.fullName : undefined
    };
    setEditingGroup(newG);
    setErrors({});
    originalGroupRef.current = JSON.stringify(newG);
    setIsModalOpen(true);
  };

  const handleEdit = (group: Group) => {
    const actualCount = students.filter(s => s.groupIds?.includes(group.id)).length;
    const groupWithLatestCount = { ...group, studentsCount: actualCount, scheduleSlots: group.scheduleSlots || [] };
    setEditingGroup(groupWithLatestCount);
    setErrors({});
    originalGroupRef.current = JSON.stringify(groupWithLatestCount);
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
    const actualCount = editingGroup!.id ? students.filter(s => s.groupIds?.includes(editingGroup!.id!)).length : 0;
    
    const payload = {
        ...editingGroup,
        schedule: constructedSchedule,
        scheduleDays: Array.from(new Set(slots.map(s => s.day))),
        scheduleTime: slots.length > 0 ? `${slots[0].time}-${slots[0].endTime}` : '',
        room: slots.length > 0 ? slots[0].room : '',
        studentsCount: actualCount
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

  const updateScheduleSlot = (id: string, updates: Partial<ScheduleSlot>) => {
      if (!editingGroup) return;
      const newSlots = editingGroup.scheduleSlots?.map(s => {
          if (s.id === id) {
              const updated = { ...s, ...updates };
              if (updates.time && !updates.endTime) {
                  const [h, m] = updates.time.split(':').map(Number);
                  const end = new Date();
                  end.setHours(h, m + 90);
                  updated.endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
              }
              return updated;
          }
          return s;
      });
      setEditingGroup({ ...editingGroup, scheduleSlots: newSlots });
  };

  const handleOpenJournal = (e: React.MouseEvent, group: Group) => {
      e.stopPropagation();
      setViewingGroupJournal(group);
      setJournalDate(new Date().toISOString().split('T')[0]);
      setLessonTopic('');
      setAttendance({});
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
      storage.notify('Журнал сохранен!', 'success'); 
      setIsEditingJournal(false);
  };

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
                            options={['Все', ...(Object.values(Branch) as string[])]} 
                            icon={MapPin}
                        />
                    </div>
                ) : user.branch && user.role !== UserRole.Teacher && (
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                        <MapPin size={14} className="text-blue-500" /> {user.branch}
                    </p>
                )}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 shadow-inner h-[36px]">
                    <button onClick={() => setViewMode('cards')} className={`px-4 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold uppercase transition-all ${viewMode === 'cards' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><Library size={14}/> Список</button>
                    <button onClick={() => setViewMode('stats')} className={`px-4 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold uppercase transition-all ${viewMode === 'stats' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><BarChart3 size={14}/> Статистика</button>
                </div>
            </div>
        </div>
        {user.role !== UserRole.Teacher && (
            <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 shadow-sm active:scale-95 text-sm"><Plus size={18} /> Создать группу</button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-end shadow-sm">
          <CustomSelect label="Продукт" value={programFilter} onChange={setProgramFilter} options={['Все', ...allAvailableProgramNames]} className="w-full sm:w-48" />
          <CustomSelect label="Курс" value={subjectFilter} onChange={setSubjectFilter} options={['Все', ...allAvailableSubjectNames]} className="w-full sm:w-48" />
          <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Поиск..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 h-[38px]" />
          </div>
      </div>

      {viewMode === 'stats' ? (
          <div className="space-y-6 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Групп</p>
                    <h3 className="text-2xl font-bold">{stats.totalActualGroups}</h3>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Студентов</p>
                    <h3 className="text-2xl font-bold text-emerald-600">{stats.totalActualStudents}</h3>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Загрузка</p>
                    <h3 className="text-2xl font-bold text-blue-600">{stats.capacityUsage}%</h3>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Посещаемость</p>
                    <h3 className="text-2xl font-bold text-amber-600">85%</h3>
                  </div>
              </div>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
            {visibleGroups.map(group => {
              const SubjectIcon = getSubjectIcon(group.subject);
              const slots = group.scheduleSlots || [];
              const progress = Math.min(100, (group.studentsCount / group.maxStudents) * 100);
              return (
                <div key={group.id} onClick={() => user.role === UserRole.Teacher ? handleOpenJournal({ stopPropagation: () => {} } as any, group) : handleEdit(group)} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all cursor-pointer flex flex-col h-full active:scale-[0.98]">
                    <div className="p-6 flex-1">
                        <div className="flex justify-between items-start mb-4">
                            <div className="min-w-0">
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded mb-2"><Layers size={10}/> {group.subject}</span>
                                <h3 className="font-bold text-lg leading-tight uppercase tracking-tight truncate">{group.name}</h3>
                            </div>
                        </div>
                        <div className="space-y-4 mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm shrink-0"><GraduationCap size={18} className="text-slate-400" /></div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-slate-400 leading-none mb-1">Учитель</p>
                                    <p className="text-sm font-semibold truncate">{group.teacher || 'Не назначен'}</p>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400"><span>Места</span><span className={group.studentsCount >= group.maxStudents ? 'text-rose-500' : 'text-emerald-600'}>{group.studentsCount} / {group.maxStudents}</span></div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full transition-all duration-500 rounded-full ${group.studentsCount >= group.maxStudents ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${progress}%` }} /></div>
                            </div>
                        </div>
                        <div className="border-t border-slate-50 pt-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Calendar size={12} className="text-blue-500"/> Расписание</p>
                            <div className="flex flex-wrap gap-1.5">
                                {slots.length > 0 ? slots.map((s, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm"><span className="text-blue-600 uppercase">{s.day}</span><span>{s.time} - {s.endTime}</span></div>
                                )) : <div className="text-[10px] text-slate-400 italic">Не настроено</div>}
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                        {user.role !== UserRole.Teacher && (
                            <button onClick={(e) => { e.stopPropagation(); handleEdit(group); }} className="p-2.5 bg-white text-slate-400 hover:text-blue-600 rounded-lg shadow-sm border border-slate-200 transition-all active:scale-90"><Settings size={18}/></button>
                        )}
                        <button onClick={(e) => handleOpenJournal(e, group)} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold uppercase tracking-wider shadow-sm transition-all active:scale-95">Журнал</button>
                    </div>
                </div>
              );
            })}
          </div>
      )}

      {isModalOpen && editingGroup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                <div className="p-5 border-b flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 tracking-tight text-lg"><Library size={20} className="text-blue-600"/>{editingGroup.id ? 'Настройка группы' : 'Новая группа'}</h3>
                    <button onClick={handleClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    <div className="space-y-4">
                        <div>
                            <label className={`block text-[10px] font-bold uppercase mb-1.5 tracking-wider transition-colors ${errors.name ? 'text-red-500' : 'text-slate-500'}`}>Название группы *</label>
                            <input type="text" value={editingGroup.name || ''} onChange={(e) => { setEditingGroup({...editingGroup, name: e.target.value}); clearFieldError('name'); }} className={`w-full border rounded-lg px-3.5 py-2.5 text-sm font-semibold outline-none transition-all ${errors.name ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'}`} placeholder="Напр. Math-10A"/>
                        </div>
                        {isSuperUser && (
                            <CustomSelect label="Филиал *" value={editingGroup.branch || ''} onChange={(val) => { setEditingGroup({...editingGroup, branch: val as Branch}); clearFieldError('branch'); }} options={Object.values(Branch)} error={errors.branch} />
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <CustomSelect label="Продукт *" value={programs.find(p => p.id === editingGroup.courseProgramId)?.name || ''} onChange={(val) => { setEditingGroup({...editingGroup, courseProgramId: programs.find(p => p.name === val)?.id}); clearFieldError('program'); }} options={allAvailableProgramNames} icon={Layers} error={errors.program} />
                            <CustomSelect label="Курс *" value={editingGroup.subject || ''} onChange={(val) => { setEditingGroup({...editingGroup, subject: val}); clearFieldError('subject'); }} options={allAvailableSubjectNames} icon={BookOpen} error={errors.subject} />
                        </div>
                        <CustomSelect label="Преподаватель *" value={editingGroup.teacher || ''} onChange={(val) => { setEditingGroup({...editingGroup, teacher: val}); clearFieldError('teacher'); }} options={teachers.map(t => t.fullName)} icon={User} disabled={user.role === UserRole.Teacher} error={errors.teacher} />
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Учеников</label><div className="bg-slate-50 border rounded-lg px-4 py-2.5 text-sm text-slate-500 font-bold">{editingGroup.studentsCount || 0}</div></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Макс. мест</label><input type="number" value={editingGroup.maxStudents || 20} onChange={(e) => setEditingGroup({...editingGroup, maxStudents: Number(e.target.value)})} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 outline-none font-bold"/></div>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t bg-slate-50 flex justify-between gap-3 shrink-0">
                    {editingGroup.id ? <button onClick={handleDelete} className="text-rose-500 px-4 py-2 text-sm font-medium transition-colors hover:bg-rose-50 rounded-lg">Удалить</button> : <div/>}
                    <div className="flex gap-2">
                        <button onClick={handleClose} className="px-5 py-2 text-sm text-slate-500 font-medium">Отмена</button>
                        <button onClick={handleSave} className="px-6 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2 transition-all active:scale-95"><Save size={18} /> Сохранить</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {viewingGroupJournal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden border border-slate-100">
                <div className="p-4 px-6 border-b flex justify-between items-center bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><BookOpen size={20}/></div>
                        <h3 className="font-bold text-slate-900 text-lg uppercase tracking-tight">{viewingGroupJournal.name}</h3>
                    </div>
                    <button onClick={() => setViewingGroupJournal(null)} className="p-2 text-slate-300 hover:text-rose-500"><X size={24} /></button>
                </div>
                <div className="bg-slate-50 p-3 px-6 border-b flex flex-wrap items-center gap-4 shrink-0">
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden h-10">
                        <button onClick={() => { const d = new Date(journalDate); d.setDate(d.getDate()-1); setJournalDate(d.toISOString().split('T')[0]); }} className="p-2.5 hover:bg-slate-50 border-r"><ChevronLeft size={16}/></button>
                        <span className="px-4 text-[11px] font-bold uppercase tracking-widest min-w-[120px] text-center">{new Date(journalDate).toLocaleDateString('ru-RU')}</span>
                        <button onClick={() => { const d = new Date(journalDate); d.setDate(d.getDate()+1); setJournalDate(d.toISOString().split('T')[0]); }} className="p-2.5 hover:bg-slate-50 border-l"><ChevronRight size={16}/></button>
                    </div>
                    <input type="text" value={lessonTopic} onChange={(e) => { setLessonTopic(e.target.value); if (journalErrors.topic) setJournalErrors({ ...journalErrors, topic: false }); }} disabled={!isEditingJournal} className={`flex-1 border rounded-xl px-4 py-2 text-sm bg-white outline-none transition-all font-semibold h-10 ${journalErrors.topic ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-200 focus:border-blue-500'}`} placeholder="Тема текущего урока..."/>
                    {isEditingJournal ? <button onClick={saveJournal} className="h-10 px-6 rounded-xl bg-blue-600 text-white text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"><Save size={16}/> Сохранить</button> : <button onClick={() => setIsEditingJournal(true)} className="h-10 px-6 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2"><Edit3 size={16}/> Править</button>}
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-white/80 backdrop-blur-md text-slate-500 text-[11px] font-bold uppercase tracking-widest border-b">
                            <tr><th className="p-4 pl-8">Ученик</th><th className="p-4 text-center pr-8">Посещение</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {students.filter(s => s.groupIds?.includes(viewingGroupJournal.id)).map(student => {
                                const hasError = journalErrors.students?.has(student.id);
                                return (
                                    <tr key={student.id} className={hasError ? 'bg-red-50' : 'hover:bg-slate-50'}>
                                        <td className="p-3 pl-8">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 border flex items-center justify-center text-slate-400 shadow-inner">{student.avatar ? <img src={student.avatar} className="w-full h-full rounded-full object-cover" /> : <User size={14}/>}</div>
                                                <span className={`font-bold text-sm ${hasError ? 'text-red-600' : 'text-slate-700'}`}>{student.fullName}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 pr-8 text-center">
                                            <div className="flex justify-center gap-1">
                                                {['П', 'Н', 'О'].map(k => (
                                                    <button key={k} onClick={() => { if (isEditingJournal) { setAttendance({ ...attendance, [student.id]: k }); if (hasError) { const newErrs = new Set(journalErrors.students); newErrs.delete(student.id); setJournalErrors({ ...journalErrors, students: newErrs }); } } }} className={`w-9 h-9 rounded-xl text-xs font-bold border transition-all ${attendance[student.id] === k ? (k === 'П' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : k === 'Н' ? 'bg-rose-500 text-white border-rose-500 shadow-md' : 'bg-amber-500 text-white border-amber-500 shadow-md') : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>{k}</button>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}
      {selectedStudentForProfile && <StudentProfileModal student={selectedStudentForProfile} onClose={() => setSelectedStudentForProfile(null)} onSave={(updatedStudent) => { setSelectedStudentForProfile(null); setStudents(students.map(s => s.id === updatedStudent.id ? updatedStudent : s)); }} />}
    </div>
  );
};
