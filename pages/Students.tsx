import React, { useState, useMemo } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { StudentStatus, Student, Group, UserRole, UserProfile, Branch, Course, CourseProgram, BranchEntity } from '../types';
import { 
    Search, Plus, Upload, Eye, Lock, MapPin, 
    Calculator, FlaskConical, Atom, Dna, Globe, Scroll, Gavel, 
    Code, BookOpen, Filter, Pencil, User, Music, Dumbbell, Brain, Rocket, Languages, PenTool, Layers,
    ArrowUpDown, ChevronUp, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StudentProfileModal } from '../components/StudentProfileModal';
import { CustomSelect } from '../components/CustomSelect';
import { useData } from '../hooks/useData';

const STUDY_LANGUAGES = ["Русский", "Таджикский", "Английский"];

type SortKey = 'fullName' | 'status' | 'cluster';
type SortOrder = 'asc' | 'desc';

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
    'Brain': Brain,
    'Rocket': Rocket,
    'Languages': Languages,
    'PenTool': PenTool,
    'Layers': Layers,
    'GraduationCap': BookOpen
};

export const Students: React.FC = () => {
  const [students, setStudents] = useData<Student[]>(StorageKeys.STUDENTS, []);
  const [groups] = useData<Group[]>(StorageKeys.GROUPS, []);
  const [courses] = useData<Course[]>(StorageKeys.COURSES, []);
  const [programs] = useData<CourseProgram[]>(StorageKeys.COURSE_PROGRAMS, []);
  const [branches] = useData<BranchEntity[]>(StorageKeys.BRANCHES, []);
  
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  const navigate = useNavigate();

  // Filters State
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterSubjects, setFilterSubjects] = useState<string[]>([]);
  const [filterClusters, setFilterClusters] = useState<string[]>([]);
  const [filterLanguages, setFilterLanguages] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  
  // Sort State
  const [sortKey, setSortKey] = useState<SortKey>('fullName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Financier].includes(user.role);

  const availableSubjects = useMemo(() => Array.from(new Set(courses.map(c => c.name))).sort(), [courses]);
  const availablePrograms = useMemo(() => programs.map(p => p.name).sort(), [programs]);
  const dynamicBranchList = useMemo(() => branches.filter(b => b.isActive).map(b => b.name).sort(), [branches]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
        setSortKey(key);
        setSortOrder('asc');
    }
  };

  const getSubjectConfig = (name: string) => {
      const course = courses.find(c => c.name === name);
      if (course) {
          const IconComponent = ICON_MAP[course.icon || 'BookOpen'] || BookOpen;
          return { icon: IconComponent, color: getColorClass(course.color) };
      }
      return { icon: BookOpen, color: 'text-slate-400' };
  };

  const getColorClass = (colorName?: string) => {
      switch (colorName) {
          case 'blue': return 'text-blue-500';
          case 'emerald': return 'text-emerald-500';
          case 'purple': return 'text-purple-500';
          case 'amber': return 'text-amber-500';
          case 'rose': return 'text-rose-500';
          case 'cyan': return 'text-cyan-500';
          case 'indigo': return 'text-indigo-500';
          case 'slate': return 'text-slate-500';
          default: return 'text-slate-400';
      }
  };

  const visibleStudents = useMemo(() => {
      let filtered: Student[] = [];
      
      if (user.role === UserRole.Teacher) {
          const teacherGroups = groups.filter(g => g.teacher === user.fullName);
          const teacherGroupIds = teacherGroups.map(g => g.id);
          filtered = students.filter(s => 
              (s.status === StudentStatus.Active || s.status === 'Активен') && 
              s.groupIds?.some(id => teacherGroupIds.includes(id))
          );
      } else if (user.role === UserRole.Student) {
          filtered = students.filter(s => s.platformAccount === user.email || s.fullName === user.fullName);
      } else {
          filtered = students;
          if (isSuperUser) {
              if (selectedBranch !== 'All') filtered = filtered.filter(s => s.branch === selectedBranch);
          } else if (user.branch) {
              filtered = filtered.filter(s => s.branch === user.branch);
          }
      }

      // Deduplicate by ID to prevent repeated rows seen in screenshot
      const uniqueMap = new Map();
      filtered.forEach(s => uniqueMap.set(s.id, s));
      return Array.from(uniqueMap.values());
  }, [students, user, groups, selectedBranch, isSuperUser]);

  const filteredAndSortedStudents = useMemo(() => {
    let result = [...visibleStudents];

    // 1. Filter by Search Term (Name or Phone)
    if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase().trim();
        result = result.filter(student => 
            student.fullName.toLowerCase().includes(search) || 
            (student.phone && student.phone.includes(search))
        );
    }

    // 2. Filter by Status (OR logic within category)
    if (filterStatuses.length > 0) {
        result = result.filter(student => 
            filterStatuses.some(fs => 
                (student.status || '').toString().toLowerCase().trim() === fs.toLowerCase().trim()
            )
        );
    }

    // 3. Filter by Subject (OR logic within category)
    if (filterSubjects.length > 0) {
        result = result.filter(student => 
            (student.subjects || []).some(sub => 
                filterSubjects.some(fs => fs.toLowerCase().trim() === sub.toLowerCase().trim())
            )
        );
    }

    // 4. Filter by Product / Cluster (OR logic within category)
    if (filterClusters.length > 0) {
        result = result.filter(student => 
            filterClusters.some(fc => 
                (student.cluster || '').toString().toLowerCase().trim() === fc.toLowerCase().trim()
            )
        );
    }

    // 5. Filter by Language (OR logic within category)
    if (filterLanguages.length > 0) {
        result = result.filter(student => 
            filterLanguages.some(fl => 
                (student.studyLanguage || '').toString().toLowerCase().trim() === fl.toLowerCase().trim()
            )
        );
    }

    // 6. Sorting
    result.sort((a, b) => {
        let valA = (a[sortKey] || '').toString().toLowerCase();
        let valB = (b[sortKey] || '').toString().toLowerCase();

        if (sortKey === 'fullName') {
            return sortOrder === 'asc' ? valA.localeCompare(valB, 'ru') : valB.localeCompare(valA, 'ru');
        }

        if (valA === valB) return 0;
        if (sortOrder === 'asc') return valA > valB ? 1 : -1;
        return valA < valB ? 1 : -1;
    });

    return result;
  }, [visibleStudents, filterStatuses, filterSubjects, filterClusters, filterLanguages, searchTerm, sortKey, sortOrder]);

  const getStatusColor = (status: StudentStatus | string) => {
    const s = status?.toString().toLowerCase().trim();
    if (s === 'активен') return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
    if (s === 'предзапись') return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
    if (s === 'пауза') return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
    if (s === 'неактивен' || s === 'архив') return 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
    if (s === 'отвал' || s === 'отвалился') return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800';
    return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  const handleSave = (updatedData: Student) => {
    if (!updatedData.fullName) return;
    setIsModalOpen(false);
    setEditingStudent(null);
    const now = new Date().toISOString();
    let updatedStudentsList: Student[];
    if (updatedData.id !== 0) {
        updatedData.lastModifiedBy = user.fullName;
        updatedData.lastModifiedAt = now;
        updatedStudentsList = students.map(s => s.id === updatedData.id ? updatedData : s);
    } else {
        updatedData.id = Date.now();
        updatedData.createdAt = now;
        updatedData.lastModifiedBy = user.fullName;
        updatedData.lastModifiedAt = now;
        updatedStudentsList = [updatedData, ...students];
    }
    setStudents(updatedStudentsList);
    storage.notify('Изменения сохранены', 'success');
  };

  const handleDelete = (id: number) => {
    const updatedList = students.filter(s => s.id !== id);
    setStudents(updatedList);
    setEditingStudent(null);
    setIsModalOpen(false);
    storage.notify('Студент успешно удален', 'info');
    storage.logAction('Удаление', `Ученик с ID ${id} был удален`, id);
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown size={12} className="text-slate-300" />;
    return sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <div className="space-y-6 pb-20 relative antialiased font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Список учеников</h2>
            {isSuperUser ? (
                <div className="flex items-center gap-2 mt-2">
                    <div className="w-56">
                        <CustomSelect 
                            value={selectedBranch === 'All' ? 'Все филиалы' : selectedBranch} 
                            onChange={(val) => setSelectedBranch(val === 'Все филиалы' ? 'All' : val)}
                            options={['Все филиалы', ...dynamicBranchList]}
                            icon={MapPin}
                        />
                    </div>
                </div>
            ) : user.branch && <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium"><Lock size={12} /> Филиал: {user.branch}</p>}
        </div>
        <div className="flex gap-2">
            {user.role !== UserRole.Teacher && user.role !== UserRole.Student && (
                <>
                    <button onClick={() => navigate('/import')} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl font-bold transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-xs uppercase tracking-widest"><Upload size={18} />Импорт</button>
                    <button onClick={() => { setEditingStudent({ id: 0, fullName: '', phone: '', status: StudentStatus.Presale, balance: 0, monthlyFee: 0, consecutiveAbsences: 0, source: 'Не указано' } as Student); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2 text-xs uppercase tracking-widest active:scale-95"><Plus size={18} />Добавить</button>
                </>
            )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-end bg-slate-50/30 dark:bg-slate-800/50">
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
             {user.role !== UserRole.Teacher && user.role !== UserRole.Student && (
                <CustomSelect
                    label="Статус"
                    value={filterStatuses}
                    onChange={setFilterStatuses}
                    options={Object.values(StudentStatus)}
                    className="flex-1 sm:flex-none sm:w-44"
                    multiple
                    placeholder="Все статусы"
                />
             )}
             <CustomSelect
                label="Курс"
                value={filterSubjects}
                onChange={setFilterSubjects}
                options={availableSubjects}
                className="flex-1 sm:flex-none sm:w-44"
                multiple
                placeholder="Все курсы"
             />
             <CustomSelect
                label="Продукт"
                value={filterClusters}
                onChange={setFilterClusters}
                options={availablePrograms}
                className="flex-1 sm:flex-none sm:w-44"
                multiple
                placeholder="Все продукты"
             />
             <CustomSelect
                label="Язык"
                value={filterLanguages}
                onChange={setFilterLanguages}
                options={STUDY_LANGUAGES}
                className="flex-1 sm:flex-none sm:w-36"
                multiple
                placeholder="Все языки"
             />
          </div>

          <div className="relative w-full xl:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Поиск по имени или телефону..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all shadow-sm h-[42px] font-bold uppercase tracking-tight"
            />
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar relative">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                <th className="p-4 pl-8 sticky top-0 z-20 bg-slate-50 dark:bg-slate-800 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => toggleSort('fullName')}>
                    <div className="flex items-center gap-2">Ученик <SortIcon column="fullName" /></div>
                </th>
                <th className="p-4 sticky top-0 z-20 bg-slate-50 dark:bg-slate-800 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => toggleSort('cluster')}>
                    <div className="flex items-center gap-2">Продукт <SortIcon column="cluster" /></div>
                </th>
                <th className="p-4 sticky top-0 z-20 bg-slate-50 dark:bg-slate-800">Курсы</th>
                <th className="p-4 sticky top-0 z-20 bg-slate-50 dark:bg-slate-800 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => toggleSort('status')}>
                    <div className="flex items-center gap-2">Статус <SortIcon column="status" /></div>
                </th>
                <th className="p-4 sticky top-0 z-20 bg-slate-50 dark:bg-slate-800">Филиал</th>
                <th className="p-4 sticky top-0 z-20 bg-slate-50 dark:bg-slate-800 text-right pr-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredAndSortedStudents.map(student => {
                return (
                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group" onClick={() => handleEdit(student)}>
                    <td className="p-4 pl-8">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-white dark:border-slate-600 shadow-sm transition-transform group-hover:scale-110">
                                {student.avatar ? <img src={student.avatar} alt={student.fullName} className="w-full h-full object-cover" /> : <User size={20} className="text-slate-400" />}
                            </div>
                            <span className="font-medium text-slate-800 dark:text-slate-100 text-xs tracking-tight">{student.fullName}</span>
                        </div>
                    </td>
                    <td className="p-4 text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">{student.cluster || '-'}</td>
                    <td className="p-4">
                        <div className="flex gap-2 items-center flex-wrap">
                            {(student.subjects || []).slice().sort().map(sub => {
                                const { icon: Icon, color } = getSubjectConfig(sub);
                                return (
                                    <div key={sub} className="relative group/tooltip flex items-center justify-center cursor-help">
                                        <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 transition-all hover:bg-white hover:shadow-md">
                                            <Icon className={color} size={16} />
                                        </div>
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 text-[9px] font-black text-white bg-slate-900 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10 uppercase tracking-widest">{sub}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </td>
                    <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border tracking-widest shadow-sm ${getStatusColor(student.status as StudentStatus)}`}>
                            {student.status?.toString().toLowerCase().trim() === 'отвал' ? 'ОТВАЛИЛСЯ' : student.status}
                        </span>
                    </td>
                    <td className="p-4 text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">{student.branch || 'Не указан'}</td>
                    <td className="p-4 text-right pr-8">
                        <button onClick={(e) => {e.stopPropagation(); handleEdit(student);}} className="p-2.5 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 rounded-xl text-slate-400 transition-all active:scale-90 border border-transparent hover:shadow-lg hover:shadow-blue-500/20">
                            {user.role === UserRole.Teacher || user.role === UserRole.Student ? <Eye size={18} /> : <Pencil size={18} />}
                        </button>
                    </td>
                    </tr>
                );
              })}
              {filteredAndSortedStudents.length === 0 && (
                  <tr><td colSpan={6} className="p-24 text-center text-slate-400 text-sm font-medium italic opacity-50 uppercase tracking-widest">Ученики не найдены</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && editingStudent && (
          <StudentProfileModal 
            student={editingStudent} 
            onClose={() => { setIsModalOpen(false); setEditingStudent(null); }} 
            onSave={handleSave} 
            onDelete={handleDelete}
          />
      )}
    </div>
  );
};