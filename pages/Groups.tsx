
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Group, Employee, Student, UserRole, UserProfile, Branch, Course, CourseProgram, ScheduleSlot, BranchEntity } from '../types';
import { 
    Users, Calendar, Plus, Save, X, Library, Trash2, Settings, User, 
    Search, Calculator, FlaskConical, Atom, Dna, Globe, Scroll, Gavel, 
    Code, BookOpen, MapPin, Clock, DoorOpen, ChevronLeft, ChevronRight, Check, CheckCircle, Layers, BookOpenCheck,
    MoreHorizontal, GraduationCap, BarChart3, PieChart as PieIcon, Activity, TrendingUp, Edit3, AlertCircle,
    UserCheck, UserX
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { StudentProfileModal } from '../components/StudentProfileModal';
import { CustomSelect } from '../components/CustomSelect';
import { useData } from '../hooks/useData';

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

  const dynamicBranchList = useMemo(() => branches.filter(b => b.isActive).map(b => b.name).sort(), [branches]);

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

  // ... (остальной код компонента Groups остается без изменений)
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
            </div>
        </div>
        {user.role !== UserRole.Teacher && (
            <button onClick={() => { setEditingGroup({ maxStudents: 20, scheduleSlots: [], branch: user.branch }); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 shadow-sm active:scale-95 text-sm"><Plus size={18} /> Создать группу</button>
        )}
      </div>
      {/* ... (рендер списка групп) */}
    </div>
  );
};
