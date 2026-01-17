
import React, { useState, useMemo } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { ExamResult, Student, Course, Group, UserRole, UserProfile } from '../types';
import { Award, Plus, X, Save, Search, TrendingUp, Calendar, Layers, Filter, Users } from 'lucide-react';
import { DateRangePicker } from '../components/DateRangePicker';

export const Exams: React.FC = () => {
  const [examResults, setExamResults] = useState<ExamResult[]>(() => storage.get(StorageKeys.EXAM_RESULTS, []));
  const students = storage.get<Student[]>(StorageKeys.STUDENTS, []);
  const courses = storage.get<Course[]>(StorageKeys.COURSES, []);
  const groups = storage.get<Group[]>(StorageKeys.GROUPS, []);
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  // Bulk Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkConfig, setBulkConfig] = useState({
      date: new Date().toISOString().split('T')[0],
      subject: '',
      groupId: 0,
      maxScore: 100
  });
  const [bulkScores, setBulkScores] = useState<Record<number, string>>({}); // studentId -> score string

  // Derived: Available Months
  const availableMonths = useMemo(() => {
      const months = new Set<string>();
      months.add(currentMonthKey);
      examResults.forEach(r => months.add(r.date.slice(0, 7)));
      return Array.from(months).sort().reverse();
  }, [examResults, currentMonthKey]);

  // Derived: Stats for Selected Month
  const performanceStats = useMemo(() => {
    const periodResults = examResults.filter(r => r.date.startsWith(selectedMonth));
    const statsMap: Record<string, { total: number, max: number, count: number }> = {};
    
    periodResults.forEach(r => {
      if (!statsMap[r.subject]) statsMap[r.subject] = { total: 0, max: 0, count: 0 };
      statsMap[r.subject].total += r.score;
      statsMap[r.subject].max += r.maxScore;
      statsMap[r.subject].count += 1;
    });

    return Object.entries(statsMap).map(([subject, data]) => ({
      subject,
      avgPercent: Math.round((data.total / data.max) * 100),
      count: data.count
    })).sort((a, b) => b.avgPercent - a.avgPercent);
  }, [examResults, selectedMonth]);

  // Derived: Filtered List
  const filteredResults = useMemo(() => {
      return examResults
        .filter(r => r.date.startsWith(selectedMonth))
        .filter(r => 
            r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            r.subject.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [examResults, selectedMonth, searchTerm]);

  // Bulk Logic
  const eligibleStudents = useMemo(() => {
      if (bulkConfig.groupId) {
          // If group selected, return students in that group
          return students.filter(s => s.groupIds?.includes(bulkConfig.groupId));
      } else if (bulkConfig.subject) {
          // If only subject selected, return students taking that subject (less common but useful)
          return students.filter(s => s.subjects?.includes(bulkConfig.subject));
      }
      return [];
  }, [students, bulkConfig.groupId, bulkConfig.subject]);

  const handleBulkSave = () => {
      if (!bulkConfig.subject || !bulkConfig.date) {
          alert('Выберите предмет и дату');
          return;
      }

      const newResults: ExamResult[] = [];
      
      eligibleStudents.forEach(s => {
          const scoreVal = bulkScores[s.id];
          if (scoreVal && scoreVal !== '') {
              newResults.push({
                  id: Date.now() + Math.random(), // Unique ID
                  studentId: s.id,
                  studentName: s.fullName,
                  subject: bulkConfig.subject,
                  date: bulkConfig.date,
                  score: Number(scoreVal),
                  maxScore: Number(bulkConfig.maxScore),
                  feedback: bulkConfig.groupId ? `Группа: ${groups.find(g => g.id === bulkConfig.groupId)?.name}` : undefined
              });
          }
      });

      if (newResults.length === 0) {
          alert('Не введено ни одной оценки');
          return;
      }

      const updated = [...newResults, ...examResults];
      setExamResults(updated);
      storage.set(StorageKeys.EXAM_RESULTS, updated);
      storage.logAction('Экзамены', `Добавлено ${newResults.length} результатов по предмету ${bulkConfig.subject}`);
      
      setIsBulkModalOpen(false);
      setBulkScores({});
      setBulkConfig({ ...bulkConfig, subject: '', groupId: 0 }); // Reset selection but keep date/maxScore
  };

  const handleGroupSelect = (groupId: number) => {
      const grp = groups.find(g => g.id === groupId);
      if (grp) {
          setBulkConfig(prev => ({ ...prev, groupId, subject: grp.subject }));
      } else {
          setBulkConfig(prev => ({ ...prev, groupId: 0, subject: '' }));
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Экзамены</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Результаты тестирований и срезов знаний</p>
        </div>
        {user.role !== UserRole.Teacher && (
            <button 
            onClick={() => setIsBulkModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all hover:scale-105"
            >
            <Layers size={18} /> 
            Массовый ввод (По группам)
            </button>
        )}
      </div>

      {/* Stats Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" /> 
            Сводка успеваемости
          </h3>
          
          <div className="flex items-center bg-slate-50 dark:bg-slate-700 rounded-lg p-1 border border-slate-200 dark:border-slate-600">
              <Calendar size={16} className="text-slate-400 ml-2" />
              <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-200 outline-none px-2 py-1 cursor-pointer"
              >
                  {availableMonths.map(m => (
                      <option key={m} value={m}>
                          {new Date(m + '-01').toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}
                      </option>
                  ))}
              </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {performanceStats.map(s => (
            <div key={s.subject} className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{s.subject}</p>
              <div className="flex justify-between items-end">
                <p className={`text-2xl font-black ${s.avgPercent >= 80 ? 'text-emerald-500' : s.avgPercent >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                    {s.avgPercent}%
                </p>
                <div className="text-right">
                    <p className="text-xs text-slate-400">Ср. балл</p>
                    <p className="text-[10px] text-slate-500 font-bold bg-slate-100 dark:bg-slate-600 px-1.5 rounded">{s.count} работ</p>
                </div>
              </div>
            </div>
          ))}
          {performanceStats.length === 0 && (
              <div className="col-span-full text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-xl">
                  Нет данных за выбранный месяц
              </div>
          )}
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center gap-4 flex-wrap">
          <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase">История результатов</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              placeholder="Поиск по имени или предмету..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
           <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Ученик</th>
                  <th className="px-6 py-3 text-left">Предмет</th>
                  <th className="px-6 py-3 text-left">Результат</th>
                  <th className="px-6 py-3 text-left">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {/* Заглушка: пока здесь пусто, чтобы не было ошибок сборки */}
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-sm">
                    Список результатов пуст или загружается...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      
    </div>
  );
};

export default Exams;