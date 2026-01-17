
import React, { useState, useMemo } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { StudentStatus, Student, PipelineStage, Group, UserRole, UserProfile, Branch, Cluster, Course } from '../types';
import { Search, Plus, Upload, Eye, Lock, GraduationCap, MapPin, Calculator, FlaskConical, Atom, Dna, Globe, Scroll, Gavel, Code, BookOpen, Filter, Pencil, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StudentProfileModal } from '../components/StudentProfileModal';
import { CustomSelect } from '../components/CustomSelect';
import { useData } from '../hooks/useData';

export const Students: React.FC = () => {
  // Use new hook for reactive data
  const [students, setStudents] = useData<Student[]>(StorageKeys.STUDENTS, []);
  
  // These are typically static config, so standard storage.get is fine, 
  // but better to use useData if we want real-time updates for them too.
  const [groups] = useData<Group[]>(StorageKeys.GROUPS, []);
  const [courses] = useData<Course[]>(StorageKeys.COURSES, []);
  
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  
  const navigate = useNavigate();

  // Filters State
  const [filterStatus, setFilterStatus] = useState<string>('Все');
  const [filterSubject, setFilterSubject] = useState<string>('Все');
  const [filterCluster, setFilterCluster] = useState<string>('Все');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [originalStatus, setOriginalStatus] = useState<StudentStatus | null>(null);

  const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Financier].includes(user.role);

  const availableSubjects = useMemo(() => {
      const all = Array.from(new Set(courses.map(c => c.name)));
      return ['Все', ...all];
  }, [courses]);

  // Helper to determine icon based on subject name
  const getSubjectConfig = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes('мат')) return { icon: Calculator, color: 'text-blue-500' };
      if (n.includes('хим')) return { icon: FlaskConical, color: 'text-purple-500' };
      if (n.includes('физ')) return { icon: Atom, color: 'text-indigo-500' };
      if (n.includes('био')) return { icon: Dna, color: 'text-emerald-500' };
      if (n.includes('англ') || n.includes('english') || n.includes('язык')) return { icon: Globe, color: 'text-sky-500' };
      if (n.includes('истор')) return { icon: Scroll, color: 'text-amber-500' };
      if (n.includes('прав')) return { icon: Gavel, color: 'text-rose-500' };
      if (n.includes('it') || n.includes('прог')) return { icon: Code, color: 'text-slate-600' };
      
      return { icon: BookOpen, color: 'text-slate-400' };
  };

  // Filter students based on branch access OR teacher role
  const visibleStudents = useMemo(() => {
      // 1. Teacher Access: Only Active students in their groups
      if (user.role === UserRole.Teacher) {
          const teacherGroups = groups.filter(g => g.teacher === user.fullName);
          const teacherGroupIds = teacherGroups.map(g => g.id);
          
          return students.filter(s => 
              s.status === StudentStatus.Active && // ONLY ACTIVE STUDENTS FOR TEACHERS
              s.groupIds?.some(id => teacherGroupIds.includes(id))
          );
      }

      // 2. Student Access: Only see themselves
      if (user.role === UserRole.Student) {
          return students.filter(s => s.platformAccount === user.email || s.fullName === user.fullName);
      }

      // 3. Filter by selected branch (for SuperAdmin/Director) or assigned branch (for regular Admin)
      let filtered = students;
      
      if (isSuperUser) {
          if (selectedBranch !== 'All') {
              filtered = filtered.filter(s => s.branch === selectedBranch);
          }
      } else if (user.branch) {
          filtered = filtered.filter(s => s.branch === user.branch);
      }

      return filtered;
  }, [students, user, groups, selectedBranch, isSuperUser]);

  const filteredStudents = visibleStudents.filter(student => {
    // Teacher sees restricted list (already filtered in visibleStudents), others filter here
    const statusMatch = (user.role === UserRole.Teacher) ? true : (filterStatus === 'Все' || student.status === filterStatus);
    const subjectMatch = filterSubject === 'Все' || (student.subjects && student.subjects.includes(filterSubject));
    const clusterMatch = filterCluster === 'Все' || student.cluster === filterCluster;
    const searchMatch = student.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusMatch && subjectMatch && clusterMatch && searchMatch;
  });

  const getStatusColor = (status: StudentStatus) => {
    switch (status) {
      case StudentStatus.Active: return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
      case StudentStatus.Presale: return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
      case StudentStatus.Paused: return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      case StudentStatus.Archived: return 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
      case StudentStatus.Dropped: return 'bg-rose-50 text-rose-700 border-rose-200 line-through decoration-rose-400 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800';
      default: return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setOriginalStatus(student.status as StudentStatus);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
      const now = new Date().toISOString().split('T')[0];
      const newS: Student = { 
          id: 0,
          fullName: '',
          phone: '',
          status: StudentStatus.Presale, 
          pipelineStage: PipelineStage.New, 
          balance: 0, 
          monthlyFee: 0, 
          discountPercent: 0, 
          consecutiveAbsences: 0, 
          source: 'Не указано', 
          studyLanguage: 'RU', 
          targetUniversity: 'Local', 
          subjects: [], 
          assignedBooks: [],
          groupIds: [],
          presaleDate: now,
          parentPhone: '',
          branch: (!isSuperUser && user.branch) ? user.branch : (selectedBranch !== 'All' ? selectedBranch as Branch : undefined) 
      };
      setEditingStudent(newS); 
      setOriginalStatus(null);
      setIsModalOpen(true);
  }

  const handleSave = (updatedData: Student) => {
    if (!updatedData.fullName || !updatedData.phone) {
      alert('Пожалуйста, заполните ФИО и телефон');
      return;
    }

    let updatedStudentsList: Student[];
    const now = new Date().toISOString();
    const todayDate = now.split('T')[0];
    const admin = user.fullName;
    
    const currentStatus = updatedData.status as StudentStatus;
    
    if (updatedData.id !== 0) {
        if (originalStatus !== currentStatus) {
            if (currentStatus === StudentStatus.Active && !updatedData.startDate) {
                updatedData.startDate = todayDate;
            }
            if (originalStatus === StudentStatus.Active && currentStatus === StudentStatus.Archived) {
                updatedData.endDate = todayDate;
            }
            if (originalStatus === StudentStatus.Presale && currentStatus === StudentStatus.Dropped) {
                updatedData.dropOffDate = todayDate;
            }
        }
        updatedData.lastModifiedBy = admin;
        updatedData.lastModifiedAt = now;

        updatedStudentsList = students.map(s => s.id === updatedData.id ? updatedData : s);
        storage.logAction('Редактирование профиля', `Обновлены данные ученика ${updatedData.fullName}`, updatedData.id);
    } else {
        updatedData.id = Date.now();
        updatedData.lastModifiedBy = admin;
        updatedData.lastModifiedAt = now;
        
        if (!updatedData.branch) {
             if (user.branch) updatedData.branch = user.branch;
             else if (selectedBranch !== 'All') updatedData.branch = selectedBranch as Branch;
        }
        
        updatedStudentsList = [updatedData, ...students];
        storage.logAction('Новый ученик', `Добавлен новый ученик: ${updatedData.fullName} в филиал ${updatedData.branch || 'Основной'}`, updatedData.id);
    }

    // This updates local state AND pushes to Supabase automatically via useData hook mechanism
    setStudents(updatedStudentsList);
    setIsModalOpen(false);
    setEditingStudent(null);
  };

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Список учеников</h2>
            
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
            ) : user.branch && user.role !== UserRole.Teacher && user.role !== UserRole.Student ? (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <Lock size={12} /> Филиал: {user.branch}
                </p>
            ) : null}

            {user.role === UserRole.Teacher && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <GraduationCap size={12} /> Мои активные ученики
                </p>
            )}
        </div>
        <div className="flex gap-2">
            {user.role !== UserRole.Teacher && user.role !== UserRole.Student && (
                <>
                    <button 
                        onClick={() => navigate('/import')}
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg font-medium transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                        <Upload size={18} />
                        Импорт
                    </button>
                    <button 
                        onClick={handleCreate}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Добавить ученика
                    </button>
                </>
            )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        {/* Filters Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-end bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
          
          {/* 3 Filters Group */}
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
             {/* Status Filter */}
             {user.role !== UserRole.Teacher && user.role !== UserRole.Student && (
                <CustomSelect
                    label="Статус"
                    value={filterStatus}
                    onChange={setFilterStatus}
                    options={['Все', ...Object.values(StudentStatus)]}
                    className="flex-1 sm:flex-none sm:w-48"
                />
             )}

             {/* Subject Filter */}
             <CustomSelect
                label="Предмет"
                value={filterSubject}
                onChange={setFilterSubject}
                options={availableSubjects}
                className="flex-1 sm:flex-none sm:w-48"
             />

             {/* Cluster/Course Filter */}
             <CustomSelect
                label="Курс"
                value={filterCluster}
                onChange={setFilterCluster}
                options={['Все', ...Object.values(Cluster)]}
                className="flex-1 sm:flex-none sm:w-48"
             />
          </div>

          <div className="relative w-full xl:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-shadow shadow-sm h-[38px]"
            />
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                <th className="p-4 pl-6 font-medium">Ученик</th>
                <th className="p-4 font-medium">Курс</th>
                <th className="p-4 font-medium">Предметы</th>
                <th className="p-4 font-medium">Статус</th>
                <th className="p-4 font-medium">Филиал</th>
                <th className="p-4 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredStudents.map(student => {
                const studentGroups = groups.filter(g => student.groupIds?.includes(g.id));
                
                return (
                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer" onClick={() => handleEdit(student)}>
                    <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-600">
                                {student.avatar ? (
                                    <img src={student.avatar} alt={student.fullName} className="w-full h-full object-cover" />
                                ) : (
                                    <User size={20} className="text-slate-400" />
                                )}
                            </div>
                            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{student.fullName}</span>
                        </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                        {student.cluster || '-'}
                    </td>
                    <td className="p-4">
                        <div className="flex gap-2 items-center">
                            {student.subjects && student.subjects.length > 0 ? student.subjects.map(sub => {
                                const { icon: Icon, color } = getSubjectConfig(sub);
                                const subjectGroup = studentGroups.find(g => g.subject === sub);
                                const tooltipText = subjectGroup ? `${sub} (${subjectGroup.name})` : sub;
                                
                                return (
                                    <div key={sub} className="relative group/tooltip flex items-center justify-center cursor-help">
                                        <Icon className={`${color}`} size={18} />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-medium text-white bg-slate-800 rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                                            {tooltipText}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                        </div>
                                    </div>
                                );
                            }) : <span className="text-xs text-slate-400">-</span>}
                        </div>
                    </td>
                    <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${getStatusColor(student.status as StudentStatus)}`}>
                            {student.status}
                        </span>
                    </td>
                    <td className="p-4 text-xs text-slate-600 dark:text-slate-400">
                        {student.branch || 'Не указан'}
                    </td>
                    <td className="p-4 text-right">
                        <button onClick={(e) => {e.stopPropagation(); handleEdit(student);}} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
                            {user.role === UserRole.Teacher || user.role === UserRole.Student ? <Eye size={18} /> : <Pencil size={18} />}
                        </button>
                    </td>
                    </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-sm">Ученики не найдены</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && editingStudent && (
          <StudentProfileModal 
            student={editingStudent} 
            onClose={() => setIsModalOpen(false)} 
            onSave={handleSave} 
          />
      )}
    </div>
  );
};
