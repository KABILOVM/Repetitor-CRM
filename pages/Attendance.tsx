import React, { useState, useMemo } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Group, Student, UserProfile, UserRole } from '../types';
import { Save, Check, X, UserCheck, UserX } from 'lucide-react';

export const Attendance: React.FC = () => {
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.Admin, fullName: '', email: '', permissions: [] });
  const allGroups = storage.get<Group[]>(StorageKeys.GROUPS, []);
  const students = storage.get<Student[]>(StorageKeys.STUDENTS, []);

  // Filter groups available for selection
  const availableGroups = useMemo(() => {
      if (user.role === UserRole.Teacher) {
          return allGroups.filter(g => g.teacher === user.fullName);
      }
      // If user has a branch assigned, filter by it
      if (user.branch) {
          return allGroups.filter(g => g.branch === user.branch);
      }
      return allGroups;
  }, [allGroups, user]);

  const [selectedGroup, setSelectedGroup] = useState(availableGroups[0]?.id || 0);
  
  // Filter students belonging to the selected group
  // Performance: useMemo prevents recalculation on every render
  const studentsInGroup = useMemo(() => {
      if (!selectedGroup) return [];
      const filtered = students.filter(s => s.groupIds?.includes(selectedGroup));
      return filtered;
  }, [students, selectedGroup]);

  // State: 'present' | 'absent' | undefined
  const [attendance, setAttendance] = useState<Record<number, 'present' | 'absent'>>({});

  const handleAttendance = (id: number, status: 'present' | 'absent') => {
    setAttendance(prev => ({ ...prev, [id]: status }));
  };

  const markAll = (status: 'present' | 'absent') => {
      const newAttendance = { ...attendance };
      studentsInGroup.forEach(s => {
          newAttendance[s.id] = status;
      });
      setAttendance(newAttendance);
  };

  const getStats = () => {
      const total = studentsInGroup.length;
      if (total === 0) return { present: 0, absent: 0 };
      const present = Object.values(attendance).filter(v => v === 'present').length;
      const absent = Object.values(attendance).filter(v => v === 'absent').length;
      return { present, absent };
  };

  const stats = getStats();

  const handleSave = () => {
      // Here you would normally save to backend/storage
      storage.notify(`Посещаемость для группы сохранена!`, 'success');
  };

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col">
      {/* Header Controls */}
      <div className="flex flex-col gap-4 flex-shrink-0">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Посещаемость</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 capitalize font-medium">
                    {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
            </div>
        </div>
        
        <select 
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-3 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(Number(e.target.value))}
        >
            {availableGroups.length > 0 ? (
                availableGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} - {g.subject}</option>
                ))
            ) : (
                <option value={0}>Нет доступных групп</option>
            )}
        </select>
      </div>

      {/* Quick Actions & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-shrink-0">
          {/* Bulk Actions */}
          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Быстрые действия:</span>
              <div className="flex gap-2 w-full">
                  <button 
                    onClick={() => markAll('present')}
                    className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1 transition-colors"
                  >
                      <UserCheck size={16} /> <span className="hidden sm:inline">Все</span> тут
                  </button>
                  <button 
                    onClick={() => markAll('absent')}
                    className="flex-1 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1 transition-colors"
                  >
                      <UserX size={16} /> <span className="hidden sm:inline">Все</span> нет
                  </button>
              </div>
          </div>

          {/* Stats Summary */}
          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-around">
                <div className="text-center">
                    <span className="block text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100">{studentsInGroup.length}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Всего</span>
                </div>
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                <div className="text-center">
                    <span className="block text-xl sm:text-2xl font-black text-emerald-500">{stats.present}</span>
                    <span className="text-[10px] text-emerald-600/70 uppercase font-bold">Был</span>
                </div>
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                <div className="text-center">
                    <span className="block text-xl sm:text-2xl font-black text-rose-500">{stats.absent}</span>
                    <span className="text-[10px] text-rose-600/70 uppercase font-bold">Нет</span>
                </div>
          </div>
      </div>

      {/* Student List - Scrollable Area */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col min-h-0">
        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 grid grid-cols-[1fr_120px] sm:grid-cols-[1fr_160px] gap-2 items-center flex-shrink-0">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Список учеников</h3>
            <h3 className="text-xs font-bold text-slate-500 uppercase text-center">Статус</h3>
        </div>

        <div className="overflow-y-auto custom-scrollbar p-1 space-y-1">
            {studentsInGroup.map(s => {
                const status = attendance[s.id];
                return (
                    <div key={s.id} className="p-2 sm:p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors rounded-lg border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                        <div className="pr-2 min-w-0 flex-1">
                            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{s.fullName}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span className={s.balance < 0 ? "text-red-500 font-bold" : ""}>
                                    {s.balance < 0 ? `Долг ${s.balance}` : 'Ок'}
                                </span>
                            </div>
                        </div>
                        <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg shrink-0 w-[120px] sm:w-[160px]">
                            <button
                                onClick={() => handleAttendance(s.id, 'present')}
                                className={`flex-1 flex items-center justify-center py-1.5 sm:py-2 rounded-md text-xs font-bold transition-all duration-200 ${
                                    status === 'present' 
                                    ? 'bg-white dark:bg-slate-600 text-emerald-600 shadow-sm ring-1 ring-emerald-500' 
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                            >
                                <Check size={14} className={`sm:mr-1 ${status === 'present' ? 'stroke-[3px]' : ''}`} />
                                <span className="hidden sm:inline">Был</span>
                            </button>
                            <button
                                onClick={() => handleAttendance(s.id, 'absent')}
                                className={`flex-1 flex items-center justify-center py-1.5 sm:py-2 rounded-md text-xs font-bold transition-all duration-200 ${
                                    status === 'absent' 
                                    ? 'bg-white dark:bg-slate-600 text-rose-600 shadow-sm ring-1 ring-rose-500' 
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                            >
                                <X size={14} className={`sm:mr-1 ${status === 'absent' ? 'stroke-[3px]' : ''}`} />
                                <span className="hidden sm:inline">Нет</span>
                            </button>
                        </div>
                    </div>
                );
            })}
            {studentsInGroup.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">
                    {selectedGroup ? 'В этой группе нет учеников' : 'Выберите группу'}
                </div>
            )}
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-center sm:justify-end flex-shrink-0">
            <button 
                onClick={handleSave}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95 text-sm"
            >
                <Save size={18} />
                Сохранить
            </button>
        </div>
      </div>
    </div>
  );
};