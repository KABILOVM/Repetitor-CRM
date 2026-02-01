import React, { useState } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Group, Student } from '../types';
import { ChevronLeft, ChevronRight, Save, Calculator } from 'lucide-react';

export const Journal: React.FC = () => {
  const groups = storage.get<Group[]>(StorageKeys.GROUPS, []);
  const students = storage.get<Student[]>(StorageKeys.STUDENTS, []);

  const [selectedGroup, setSelectedGroup] = useState(groups[0]?.id || 0);
  const [selectedDate, setSelectedDate] = useState('2023-10-25');
  
  const currentGroup = groups.find(g => g.id === selectedGroup);
  // Filter students that could belong to this group (mock logic for demo)
  const studentsInGroup = students.filter(s => currentGroup ? s.subjects?.includes(currentGroup.subject) : false).slice(0, 5); 
  
  const [attendance, setAttendance] = useState<Record<number, string>>({});
  // Structure: studentId -> { errorPercent: string, finalGrade: number }
  const [scores, setScores] = useState<Record<number, { errorPercent: string, finalGrade: number }>>({});

  const handleAttendance = (id: number, status: string) => {
    setAttendance(prev => ({ ...prev, [id]: status }));
  };

  // Logic from Regulation 9.3
  const calculateGrade = (errorPercent: number): number => {
      if (errorPercent <= 10) return 5;
      if (errorPercent <= 20) return 4;
      if (errorPercent <= 30) return 3;
      if (errorPercent <= 40) return 2;
      return 1;
  };

  const handleScoreChange = (id: number, val: string) => {
    // Only allow numbers
    if (val !== '' && isNaN(Number(val))) return;
    
    const errors = val === '' ? '' : Math.min(100, Math.max(0, Number(val)));
    const grade = errors === '' ? 0 : calculateGrade(Number(errors));

    setScores(prev => ({
        ...prev,
        [id]: { errorPercent: String(errors), finalGrade: grade }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Классный журнал</h2>
        <div className="flex items-center gap-2">
            <select 
                className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(Number(e.target.value))}
            >
                {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} - {g.subject}</option>
                ))}
                {groups.length === 0 && <option>Нет групп</option>}
            </select>
            <div className="flex items-center bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-200">
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-l-lg"><ChevronLeft size={16}/></button>
                <span className="px-2 text-sm font-medium border-x border-slate-200 dark:border-slate-600">{selectedDate}</span>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-r-lg"><ChevronRight size={16}/></button>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Тема урока</label>
                <input type="text" className="w-full border-slate-300 dark:border-slate-600 rounded-md text-sm p-2 border bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400" placeholder="Например: Основы органической химии" />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Домашнее задание</label>
                <input type="text" className="w-full border-slate-300 dark:border-slate-600 rounded-md text-sm p-2 border bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400" placeholder="Например: Читать главу 4, упр. 1-5" />
            </div>
        </div>

        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs">
                    <th className="p-3 border-r border-slate-200 dark:border-slate-700 w-1/3">Ученик</th>
                    <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-center w-1/4">Посещаемость</th>
                    <th className="p-3 text-center">Оценка за тему (% ошибок)</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {studentsInGroup.map(s => {
                    const grade = scores[s.id]?.finalGrade || 0;
                    let gradeColor = 'text-slate-400';
                    if (grade === 5) gradeColor = 'text-emerald-600 font-bold';
                    else if (grade === 4) gradeColor = 'text-blue-600 font-bold';
                    else if (grade === 3) gradeColor = 'text-amber-600';
                    else if (grade > 0) gradeColor = 'text-red-600 font-bold';

                    return (
                        <tr key={s.id}>
                            <td className="p-3 border-r border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-100">{s.fullName}</td>
                            <td className="p-3 border-r border-slate-200 dark:border-slate-700">
                                <div className="flex justify-center gap-1">
                                    {[
                                    { k: 'П', t: 'Присутствовал' }, 
                                    { k: 'Н', t: 'Не был' }, 
                                    { k: 'О', t: 'Опоздал' }, 
                                    { k: 'У', t: 'Уважительная' }
                                    ].map((stat) => (
                                        <button
                                            key={stat.k}
                                            title={stat.t}
                                            onClick={() => handleAttendance(s.id, stat.k)}
                                            className={`w-8 h-8 rounded text-xs font-bold transition-colors ${
                                                attendance[s.id] === stat.k
                                                ? stat.k === 'П' ? 'bg-emerald-500 text-white' 
                                                : stat.k === 'Н' ? 'bg-red-500 text-white'
                                                : 'bg-amber-500 text-white'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                            }`}
                                        >
                                            {stat.k}
                                        </button>
                                    ))}
                                </div>
                            </td>
                            <td className="p-3">
                                <div className="flex items-center justify-center gap-3">
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            className="w-20 pl-2 pr-6 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-center" 
                                            placeholder="% Ош"
                                            value={scores[s.id]?.errorPercent || ''}
                                            onChange={(e) => handleScoreChange(s.id, e.target.value)}
                                        />
                                        <span className="absolute right-2 top-1.5 text-xs text-slate-400">%</span>
                                    </div>
                                    <span className="text-slate-300 dark:text-slate-600">→</span>
                                    <div className={`w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-lg border border-slate-200 dark:border-slate-600 ${gradeColor}`}>
                                        {grade || '-'}
                                    </div>
                                </div>
                                <div className="text-[10px] text-center text-slate-400 mt-1">
                                    0-10% = 5, 11-20% = 4...
                                </div>
                            </td>
                        </tr>
                    );
                })}
                 {studentsInGroup.length === 0 && (
                     <tr><td colSpan={3} className="p-6 text-center text-slate-500 dark:text-slate-400">Нет студентов</td></tr>
                )}
            </tbody>
        </table>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end">
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
                <Save size={18} />
                Сохранить
            </button>
        </div>
      </div>
    </div>
  );
};