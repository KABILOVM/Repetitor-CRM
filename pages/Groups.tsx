
import React, { useState, useMemo } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Group, Employee, Student, UserRole, UserProfile, Branch } from '../types';
import { 
    Users, Calendar, Plus, Save, X, Library, Trash2, Settings, User, 
    Search, Calculator, FlaskConical, Atom, Dna, Globe, Scroll, Gavel, 
    Code, BookOpen, MapPin, Clock, DoorOpen, ChevronLeft, ChevronRight, Check
} from 'lucide-react';
import { StudentProfileModal } from '../components/StudentProfileModal';

const DAYS_OF_WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const Groups: React.FC = () => {
  // Sort groups by ID descending (newest first)
  const [groups, setGroups] = useState<Group[]>(() => {
      const data = storage.get<Group[]>(StorageKeys.GROUPS, []);
      return data.sort((a, b) => b.id - a.id);
  });

  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  
  // Fetch Employees and filter only teachers
  const allEmployees = storage.get<Employee[]>(StorageKeys.EMPLOYEES, []);
  const teachers = useMemo(() => allEmployees.filter(e => e.role === UserRole.Teacher && e.status !== 'Fired'), [allEmployees]);
  
  const [students, setStudents] = useState<Student[]>(() => storage.get(StorageKeys.STUDENTS, []));

  // Filter State
  const [subjectFilter, setSubjectFilter] = useState('Все');
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Financier].includes(user.role);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<Group> | null>(null);
  
  // Journal Modal State
  const [viewingGroupJournal, setViewingGroupJournal] = useState<Group | null>(null);
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<number, string>>({});
  
  // Student Profile Modal State
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);

  // Filter Groups by Branch AND Teacher role
  const visibleGroups = useMemo(() => {
      // 1. Teacher Access
      if (user.role === UserRole.Teacher) {
          return groups.filter(g => g.teacher === user.fullName);
      }

      // 2. SuperUser Filter
      if (isSuperUser) {
          if (selectedBranch !== 'All') return groups.filter(g => g.branch === selectedBranch);
          return groups;
      }

      // 3. Branch Access (Regular Admin)
      if (user.branch) {
          return groups.filter(g => g.branch === user.branch);
      }

      // 4. Fallback (Global)
      return groups;
  }, [groups, user, selectedBranch, isSuperUser]);

  const subjects = useMemo(() => {
      const all = Array.from(new Set(visibleGroups.map(g => g.subject)));
      return ['Все', ...all];
  }, [visibleGroups]);

  const filteredGroups = useMemo(() => {
      if (subjectFilter === 'Все') return visibleGroups;
      return visibleGroups.filter(g => g.subject === subjectFilter);
  }, [visibleGroups, subjectFilter]);

  // Helper to determine icon based on subject name
  const getSubjectIcon = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes('мат')) return Calculator;
      if (n.includes('хим')) return FlaskConical;
      if (n.includes('физ')) return Atom;
      if (n.includes('био')) return Dna;
      if (n.includes('англ') || n.includes('english') || n.includes('язык')) return Globe;
      if (n.includes('истор')) return Scroll;
      if (n.includes('прав')) return Gavel;
      if (n.includes('it') || n.includes('прог')) return Code;
      
      return BookOpen;
  };

  const handleAddNew = () => {
    setEditingGroup({
        studentsCount: 0,
        maxStudents: 10,
        schedule: 'Пн/Ср/Пт 14:00', // Default fallback
        scheduleDays: ['Пн', 'Ср', 'Пт'],
        scheduleTime: '14:00',
        room: '',
        branch: (!isSuperUser && user.branch) ? user.branch : (selectedBranch !== 'All' ? selectedBranch as Branch : undefined), // Auto assign branch
        teacher: user.role === UserRole.Teacher ? user.fullName : undefined // Auto assign teacher if self
    });
    setIsModalOpen(true);
  };

  const handleEdit = (group: Group) => {
    setEditingGroup({ ...group });
    setIsModalOpen(true);
  };

  const handleDelete = () => {
    if (!editingGroup?.id) return;
    if (confirm('Удалить группу? Это также удалит занятия из расписания.')) {
        const updated = groups.filter(g => g.id !== editingGroup.id);
        setGroups(updated);
        storage.set(StorageKeys.GROUPS, updated);
        setIsModalOpen(false);
        setEditingGroup(null);
    }
  };

  const handleSave = () => {
    if (!editingGroup?.name || !editingGroup?.subject) {
        alert('Пожалуйста, заполните Название и Предмет');
        return;
    }

    // Construct schedule string for display compatibility
    const daysStr = editingGroup.scheduleDays?.length ? editingGroup.scheduleDays.join('/') : '';
    const timeStr = editingGroup.scheduleTime || '';
    const constructedSchedule = `${daysStr} ${timeStr}`.trim();

    const payload = {
        ...editingGroup,
        schedule: constructedSchedule // Ensure legacy field is populated
    } as Group;

    let updated: Group[];
    if (editingGroup.id) {
        updated = groups.map(g => g.id === editingGroup.id ? payload : g);
    } else {
        const newGroup = { 
            ...payload, 
            id: Date.now(),
            // Safety check for branch assignment if creating new group
            branch: editingGroup.branch || ((!isSuperUser && user.branch) ? user.branch : undefined) 
        } as Group;
        updated = [newGroup, ...groups]; // Add to top
    }
    setGroups(updated);
    storage.set(StorageKeys.GROUPS, updated);
    setIsModalOpen(false);
    setEditingGroup(null);
  };

  const handleOpenJournal = (e: React.MouseEvent, group: Group) => {
      e.stopPropagation();
      // Initialize Journal State
      setViewingGroupJournal(group);
      setJournalDate(new Date().toISOString().split('T')[0]);
      setAttendance({});
  };

  const getGroupStudents = (groupId: number) => {
      return students.filter(s => s.groupIds?.includes(groupId));
  };

  const updateStudent = (updatedStudent: Student) => {
      const updatedList = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
      setStudents(updatedList);
      storage.set(StorageKeys.STUDENTS, updatedList);
  };

  const toggleDay = (day: string) => {
      const current = editingGroup?.scheduleDays || [];
      if (current.includes(day)) {
          setEditingGroup(prev => ({ ...prev, scheduleDays: current.filter(d => d !== day) }));
      } else {
          // Sort days to keep them in order
          const newDays = [...current, day].sort((a, b) => DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b));
          setEditingGroup(prev => ({ ...prev, scheduleDays: newDays }));
      }
  };

  // --- Journal Logic ---
  const handleAttendance = (id: number, status: string) => {
    setAttendance(prev => ({ ...prev, [id]: status }));
  };

  const markAllPresent = () => {
      if (!viewingGroupJournal) return;
      const studentsInGroup = getGroupStudents(viewingGroupJournal.id);
      const newAttendance = { ...attendance };
      studentsInGroup.forEach(s => {
          newAttendance[s.id] = 'П';
      });
      setAttendance(newAttendance);
  };

  const saveJournal = () => {
      storage.notify('Журнал урока сохранен!', 'success');
      setViewingGroupJournal(null);
  };

  const changeJournalDate = (offset: number) => {
      const d = new Date(journalDate);
      d.setDate(d.getDate() + offset);
      setJournalDate(d.toISOString().split('T')[0]);
      // Reset daily stats for demo
      setAttendance({});
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Группы</h2>
            
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
            ) : user.branch && user.role !== UserRole.Teacher ? (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin size={12} /> Филиал: {user.branch}
                </p>
            ) : null}
        </div>
        {user.role !== UserRole.Teacher && user.role !== UserRole.Student && (
            <button 
                onClick={handleAddNew}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
            >
            <Plus size={18} />
            Создать группу
            </button>
        )}
      </div>

      {/* Subject Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {subjects.map(sub => (
            <button
                key={sub}
                onClick={() => setSubjectFilter(sub)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    subjectFilter === sub 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
            >
                {sub}
            </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.map(group => {
          const SubjectIcon = getSubjectIcon(group.subject);
          return (
            <div 
                key={group.id} 
                onClick={() => {
                    if (user.role === UserRole.Teacher) {
                        handleOpenJournal({ stopPropagation: () => {} } as any, group);
                    } else {
                        handleEdit(group);
                    }
                }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
            >
                {/* Background Icon */}
                <div className="absolute -right-6 -bottom-6 opacity-[0.03] dark:opacity-[0.05] pointer-events-none transition-transform group-hover:scale-110 duration-500">
                    <SubjectIcon size={180} />
                </div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{group.name}</h3>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{group.subject}</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                    group.studentsCount >= group.maxStudents 
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                    : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                }`}>
                    {group.studentsCount}/{group.maxStudents} мест
                </span>
                </div>
                
                <div className="space-y-3 mb-6 relative z-10">
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                    <Users size={16} className="text-slate-400 dark:text-slate-500" />
                    <span>Преп: {group.teacher || 'Не назначен'}</span>
                </div>
                
                {/* Schedule Display */}
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                    <Calendar size={16} className="text-slate-400 dark:text-slate-500" />
                    <span>
                        {group.scheduleDays && group.scheduleDays.length > 0 
                            ? group.scheduleDays.join('/') 
                            : 'Дни не указаны'} 
                        {group.scheduleTime ? ` ${group.scheduleTime}` : ''}
                    </span>
                </div>

                {/* Room & Branch Display */}
                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    {group.room && (
                        <div className="flex items-center gap-2">
                            <DoorOpen size={16} className="text-slate-400 dark:text-slate-500" />
                            <span>{group.room}</span>
                        </div>
                    )}
                    {group.branch && (
                        <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-slate-400 dark:text-slate-500" />
                            <span className="truncate max-w-[100px]">{group.branch}</span>
                        </div>
                    )}
                </div>
                </div>

                <div className="flex gap-2 relative z-10">
                {user.role !== UserRole.Teacher && user.role !== UserRole.Student && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(group); }}
                        className="flex-1 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Settings size={14} /> Настройки
                    </button>
                )}
                <button 
                    onClick={(e) => handleOpenJournal(e, group)}
                    className="flex-1 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <BookOpen size={14} /> Журнал
                </button>
                </div>
            </div>
          );
        })}
        {filteredGroups.length === 0 && (
            <div className="col-span-full text-center text-slate-500 dark:text-slate-400 py-10 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                Группы не найдены.
            </div>
        )}
      </div>

      {/* Group Edit Modal */}
      {isModalOpen && editingGroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Library size={18} className="text-blue-600 dark:text-blue-400"/>
                        {editingGroup.id ? 'Редактировать группу' : 'Новая группа'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Название группы *</label>
                        <input 
                            type="text" 
                            value={editingGroup.name || ''}
                            onChange={(e) => setEditingGroup({...editingGroup, name: e.target.value})}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            placeholder="Например: Math-10A"
                        />
                    </div>
                    {isSuperUser && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Филиал</label>
                            <select 
                                value={editingGroup.branch || ''}
                                onChange={(e) => setEditingGroup({...editingGroup, branch: e.target.value as Branch})}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            >
                                <option value="">Выберите филиал...</option>
                                {Object.values(Branch).map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Предмет *</label>
                        <input 
                            type="text" 
                            value={editingGroup.subject || ''}
                            onChange={(e) => setEditingGroup({...editingGroup, subject: e.target.value})}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            placeholder="Математика"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Преподаватель</label>
                        <select 
                            value={editingGroup.teacher || ''}
                            onChange={(e) => setEditingGroup({...editingGroup, teacher: e.target.value})}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            disabled={user.role === UserRole.Teacher}
                        >
                            <option value="">Выберите преподавателя...</option>
                            {teachers.map(t => (
                                <option key={t.id} value={t.fullName}>{t.fullName} ({t.subjects?.join(', ') || t.subject})</option>
                            ))}
                        </select>
                        {teachers.length === 0 && (
                            <p className="text-[10px] text-amber-500 mt-1">Добавьте преподавателя в разделе "Сотрудники"</p>
                        )}
                    </div>

                    {/* Schedule Picker */}
                    <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg border border-slate-200 dark:border-slate-600">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Расписание занятий</label>
                        
                        <div className="flex justify-between gap-1 mb-3">
                            {DAYS_OF_WEEK.map(day => (
                                <button
                                    key={day}
                                    onClick={() => toggleDay(day)}
                                    className={`
                                        w-8 h-8 rounded-full text-xs font-bold transition-all
                                        ${editingGroup.scheduleDays?.includes(day)
                                            ? 'bg-blue-600 text-white shadow-md' 
                                            : 'bg-white dark:bg-slate-700 text-slate-500 border border-slate-300 dark:border-slate-500 hover:border-blue-400'
                                        }
                                    `}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Время</label>
                                <div className="relative">
                                    <Clock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    <input 
                                        type="time" 
                                        value={editingGroup.scheduleTime || ''}
                                        onChange={(e) => setEditingGroup({...editingGroup, scheduleTime: e.target.value})}
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg pl-8 pr-2 py-1.5 text-sm outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Аудитория</label>
                                <div className="relative">
                                    <DoorOpen size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    <input 
                                        type="text" 
                                        value={editingGroup.room || ''}
                                        onChange={(e) => setEditingGroup({...editingGroup, room: e.target.value})}
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg pl-8 pr-2 py-1.5 text-sm outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                        placeholder="Каб. 101"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Учеников сейчас</label>
                            <input 
                                type="number" 
                                value={editingGroup.studentsCount || 0}
                                onChange={(e) => setEditingGroup({...editingGroup, studentsCount: Number(e.target.value)})}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Макс. мест</label>
                            <input 
                                type="number" 
                                value={editingGroup.maxStudents || 10}
                                onChange={(e) => setEditingGroup({...editingGroup, maxStudents: Number(e.target.value)})}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between">
                     {editingGroup.id ? (
                        <button onClick={handleDelete} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                            Удалить
                        </button>
                     ) : <div></div>}
                    <div className="flex gap-2">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">Отмена</button>
                        <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium flex items-center gap-2">
                            <Save size={16} /> Сохранить
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Journal Modal */}
      {viewingGroupJournal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-xl shrink-0">
                      <div>
                          <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                              <BookOpen size={18} className="text-blue-500"/>
                              Журнал: {viewingGroupJournal.name}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{viewingGroupJournal.subject} • {viewingGroupJournal.teacher}</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                          {/* Date Navigation */}
                          <div className="flex items-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-200 shadow-sm">
                              <button onClick={() => changeJournalDate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-l-lg"><ChevronLeft size={16}/></button>
                              <span className="px-3 text-sm font-medium border-x border-slate-200 dark:border-slate-600 min-w-[100px] text-center">
                                  {new Date(journalDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                              </span>
                              <button onClick={() => changeJournalDate(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-r-lg"><ChevronRight size={16}/></button>
                          </div>
                          
                          <button onClick={() => setViewingGroupJournal(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                              <X size={24} />
                          </button>
                      </div>
                  </div>
                  
                  {/* Journal Content */}
                  <div className="flex-1 flex flex-col min-h-0">
                      
                      {/* Controls */}
                      <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex justify-end shrink-0">
                          <button 
                              onClick={markAllPresent}
                              className="text-sm text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                          >
                              <Check size={16} /> Отметить всех присутствующими
                          </button>
                      </div>

                      {/* Student Table */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-900/30 relative">
                          <table className="w-full text-left border-collapse">
                              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs uppercase sticky top-0 z-20 shadow-sm">
                                  <tr>
                                      <th className="p-4 pl-6">Ученик</th>
                                      <th className="p-4 text-center">Посещаемость</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                  {getGroupStudents(viewingGroupJournal.id).length > 0 ? (
                                      getGroupStudents(viewingGroupJournal.id).map(student => {
                                          return (
                                              <tr key={student.id} className="group hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                                  <td className="p-4 pl-6">
                                                      <button 
                                                          onClick={() => setSelectedStudentForProfile(student)}
                                                          className="font-bold text-slate-800 dark:text-slate-200 text-sm hover:text-blue-600 dark:hover:text-blue-400 text-left"
                                                      >
                                                          {student.fullName}
                                                      </button>
                                                  </td>
                                                  <td className="p-4">
                                                      <div className="flex justify-center gap-1">
                                                          {[
                                                          { k: 'П', t: 'Присутствовал', color: 'bg-emerald-500' }, 
                                                          { k: 'Н', t: 'Не был', color: 'bg-red-500' }, 
                                                          { k: 'О', t: 'Опоздал', color: 'bg-amber-500' }
                                                          ].map((stat) => (
                                                              <button
                                                                  key={stat.k}
                                                                  title={stat.t}
                                                                  onClick={() => handleAttendance(student.id, stat.k)}
                                                                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                                                      attendance[student.id] === stat.k
                                                                      ? `${stat.color} text-white shadow-md scale-105`
                                                                      : 'bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-400'
                                                                  }`}
                                                              >
                                                                  {stat.k}
                                                              </button>
                                                          ))}
                                                      </div>
                                                  </td>
                                              </tr>
                                          );
                                      })
                                  ) : (
                                      <tr>
                                          <td colSpan={2} className="p-10 text-center text-slate-400 text-sm">
                                              В этой группе пока нет учеников
                                          </td>
                                      </tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
                  
                  <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center rounded-b-xl shrink-0">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                          Всего учеников: <b>{getGroupStudents(viewingGroupJournal.id).length}</b>
                      </div>
                      <button 
                          onClick={saveJournal}
                          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95 text-sm"
                      >
                          <Save size={18} />
                          Сохранить урок
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Student Profile Modal */}
      {selectedStudentForProfile && (
          <StudentProfileModal 
            student={selectedStudentForProfile} 
            onClose={() => setSelectedStudentForProfile(null)} 
            onSave={(updatedStudent) => {
                updateStudent(updatedStudent);
                setSelectedStudentForProfile(null);
            }} 
          />
      )}
    </div>
  );
};
