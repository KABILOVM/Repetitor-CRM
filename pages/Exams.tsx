
import React, { useState, useMemo, useEffect } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { ExamResult, Student, Course, UserRole, UserProfile, CourseProgram } from '../types';
import { 
    Award, X, Save, Search, TrendingUp, Calendar, Layers, 
    Users, BookOpenCheck, Calculator, FlaskConical, Atom, Dna, Globe, Scroll, Gavel, Code,
    Languages, BookOpen, ChevronDown, Check, ShieldAlert, Info, PenTool, Music, Dumbbell, Brain, Rocket, GraduationCap
} from 'lucide-react';
import { CustomSelect } from '../components/CustomSelect';
import { DateRangePicker } from '../components/DateRangePicker';
import { useData } from '../hooks/useData';

// Полная карта иконок
const ICON_COMPONENTS: Record<string, React.ElementType> = {
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
    'GraduationCap': GraduationCap
};

const COLOR_CLASSES: Record<string, string> = {
    'blue': 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
    'emerald': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
    'purple': 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',
    'amber': 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',
    'rose': 'text-rose-600 bg-rose-50 dark:bg-rose-900/30',
    'cyan': 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30',
    'indigo': 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30',
    'slate': 'text-slate-600 bg-slate-50 dark:bg-slate-700/30'
};

export const Exams: React.FC = () => {
  const [examResults, setExamResults] = useData<ExamResult[]>(StorageKeys.EXAM_RESULTS, []);
  const [students] = useData<Student[]>(StorageKeys.STUDENTS, []);
  const [courses] = useData<Course[]>(StorageKeys.COURSES, []);
  const [programs] = useData<CourseProgram[]>(StorageKeys.COURSE_PROGRAMS, []);
  
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  
  const [searchTerm, setSearchTerm] = useState('');
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkConfig, setBulkConfig] = useState({
      date: new Date().toISOString().split('T')[0],
      programId: ''
  });
  
  const [bulkScores, setBulkScores] = useState<Record<number, Record<string, string>>>({});

  const currentProgramSubjects = useMemo(() => {
      if (!bulkConfig.programId) return [];
      const program = programs.find(p => p.id === bulkConfig.programId);
      if (!program) return [];
      return courses.filter(c => program.subjectIds.includes(c.id));
  }, [bulkConfig.programId, programs, courses]);

  const eligibleStudents = useMemo(() => {
      if (!bulkConfig.programId) return [];
      const progName = programs.find(p => p.id === bulkConfig.programId)?.name;
      
      return students.filter(s => {
          const matchesProgram = s.cluster === progName;
          const isActive = s.status === 'Активен';
          return matchesProgram && isActive;
      }).sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru'));
  }, [students, bulkConfig.programId, programs]);

  const availableMonths = useMemo(() => {
      const months = new Set<string>();
      months.add(currentMonthKey);
      examResults.forEach(r => months.add(r.date.slice(0, 7)));
      return Array.from(months).sort().reverse();
  }, [examResults, currentMonthKey]);

  const monthOptions = useMemo(() => {
    return availableMonths.map(m => ({
      key: m,
      label: new Date(m + '-01').toLocaleString('ru-RU', { month: 'long', year: 'numeric' })
    }));
  }, [availableMonths]);

  const performanceStats = useMemo(() => {
    const periodResults = examResults.filter(r => r.date.startsWith(selectedMonth) && !r.isExtra);
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

  const filteredResults = useMemo(() => {
      return examResults
        .filter(r => r.date.startsWith(selectedMonth))
        .filter(r => 
            r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            r.subject.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [examResults, selectedMonth, searchTerm]);

  const handleBulkSave = () => {
      const newResults: ExamResult[] = [];
      const programName = programs.find(p => p.id === bulkConfig.programId)?.name || 'Все';

      Object.entries(bulkScores).forEach(([sId, subjectScores]) => {
          const student = students.find(s => s.id === Number(sId));
          if (!student) return;

          Object.entries(subjectScores).forEach(([subjectName, scoreVal]) => {
              if (scoreVal !== undefined && scoreVal !== '') {
                  const course = courses.find(c => c.name === subjectName);
                  const isAttending = student.subjects?.includes(subjectName);
                  
                  newResults.push({
                      id: Date.now() + Math.random(),
                      studentId: student.id,
                      studentName: student.fullName,
                      subject: subjectName,
                      date: bulkConfig.date,
                      score: Number(scoreVal),
                      maxScore: Number(course?.maxExamScore) || 100,
                      feedback: `Матричный ввод (${programName})`,
                      isExtra: !isAttending 
                  });
              }
          });
      });

      if (newResults.length === 0) {
          alert('Вы не ввели баллы ни для одного ученика');
          return;
      }

      setExamResults([...newResults, ...examResults]);
      setIsBulkModalOpen(false);
      setBulkScores({});
      storage.notify(`Успешно добавлено ${newResults.length} результатов`, 'success');
  };

  const handleMatrixScoreChange = (studentId: number, subjectName: string, val: string) => {
      setBulkScores(prev => ({
          ...prev,
          [studentId]: {
              ...(prev[studentId] || {}),
              [subjectName]: val
          }
      }));
  };

  return (
    <div className="space-y-6 antialiased font-sans">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Экзамены и тестирования</h1>
            <p className="text-sm text-slate-500 font-medium">Результаты срезов знаний</p>
        </div>
        {user.role !== UserRole.Teacher && (
            <button 
                onClick={() => setIsBulkModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all active:scale-95 text-sm uppercase tracking-widest"
            >
                <Layers size={18} /> 
                МАСШТАБНЫЙ ВВОД
            </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base tracking-tight uppercase">
            <TrendingUp size={18} className="text-blue-600" /> 
            Сводка успеваемости
          </h2>
          <div className="w-full sm:w-64">
            <CustomSelect 
              value={monthOptions.find(o => o.key === selectedMonth)?.label || ''}
              options={monthOptions.map(o => o.label)}
              onChange={(val) => {
                const found = monthOptions.find(o => o.label === val);
                if (found) setSelectedMonth(found.key);
              }}
              placeholder="Выберите месяц"
              icon={Calendar}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {performanceStats.map(s => (
            <div key={s.subject} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-blue-200 hover:shadow-md transition-all group">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2 tracking-wider group-hover:text-blue-600 transition-colors truncate">{s.subject}</p>
              <div className="flex justify-between items-end">
                <p className={`text-3xl font-bold tracking-tight ${s.avgPercent >= 80 ? 'text-emerald-600' : s.avgPercent >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {s.avgPercent}<span className="text-sm ml-0.5 opacity-50 font-medium">%</span>
                </p>
                <div className="text-right">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Работ: {s.count}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center gap-4 flex-wrap bg-white dark:bg-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
            <Award size={16} className="text-amber-500"/>
            История экзаменов
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              placeholder="Поиск ученика..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium h-[38px]"
            />
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">Ученик</th>
                  <th className="px-6 py-4">Предмет</th>
                  <th className="px-6 py-4 text-center">Баллы / %</th>
                  <th className="px-6 py-4 text-right">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {filteredResults.map(exam => {
                    const percent = (exam.score / exam.maxScore) * 100;
                    return (
                        <tr key={exam.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${exam.isExtra ? 'opacity-70 bg-amber-50/10' : ''}`}>
                          <td className="px-6 py-4">
                              <div className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                  {exam.studentName}
                                  {exam.isExtra && (
                                    <div className="group relative">
                                        <ShieldAlert size={14} className="text-amber-500 cursor-help" />
                                        <div className="absolute bottom-full left-0 mb-2 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10">
                                            Вне программы
                                            <div className="absolute top-full left-2 border-4 border-transparent border-t-slate-900"></div>
                                        </div>
                                    </div>
                                  )}
                              </div>
                          </td>
                          <td className="px-6 py-4">
                              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-tight">{exam.subject}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                              <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black ${percent >= 80 ? 'bg-emerald-50 text-emerald-700' : percent >= 50 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                                  {exam.score} / {exam.maxScore} • {Math.round(percent)}%
                              </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-400 text-right">
                              {new Date(exam.date).toLocaleDateString('ru-RU')}
                          </td>
                        </tr>
                    );
                })}
              </tbody>
            </table>
          </div>
        </div>

      {isBulkModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-slate-700">
                  <header className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
                      <div className="flex items-center gap-4">
                          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20"><Layers size={20} strokeWidth={2.5}/></div>
                          <div>
                              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none uppercase">Массовый ввод экзаменов</h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Матрица результатов</p>
                          </div>
                      </div>
                      <button onClick={() => setIsBulkModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-all hover:bg-white dark:hover:bg-slate-700 rounded-full shadow-sm"><X size={22}/></button>
                  </header>

                  <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col md:flex-row items-center gap-6 shrink-0">
                      <div className="w-full md:w-72">
                          <CustomSelect 
                            label="1. Продукт обучения" 
                            value={programs.find(p => p.id === bulkConfig.programId)?.name || ''} 
                            onChange={val => setBulkConfig({...bulkConfig, programId: programs.find(p => p.name === val)?.id || ''})}
                            options={programs.map(p => p.name)}
                            placeholder="Продукт..."
                          />
                      </div>
                      <div className="w-full md:w-56">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">2. Дата экзамена</label>
                          <DateRangePicker 
                            startDate={bulkConfig.date} 
                            onChange={(d) => setBulkConfig({...bulkConfig, date: d})} 
                            mode="single" 
                            className="w-full"
                          />
                      </div>
                  </div>

                  <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-950 relative">
                      {bulkConfig.programId ? (
                          <div className="min-w-max p-4">
                              <table className="w-full text-left border-separate border-spacing-0 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative">
                                  <thead>
                                      <tr>
                                          <th className="p-3 text-center w-12 border-b border-r border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 sticky top-0 z-50">#</th>
                                          <th className="p-3 px-6 min-w-[220px] border-b border-r border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky top-0 z-50">ФИО</th>
                                          {currentProgramSubjects.map(subj => {
                                              const IconComp = ICON_COMPONENTS[subj.icon || 'BookOpen'] || BookOpen;
                                              const colorSet = COLOR_CLASSES[subj.color || 'blue'] || COLOR_CLASSES.blue;
                                              return (
                                                  <th key={subj.id} className="p-3 text-center border-b border-r last:border-r-0 border-slate-200 dark:border-slate-700 min-w-[130px] bg-slate-100 dark:bg-slate-900 sticky top-0 z-50">
                                                      <div className="flex flex-col items-center gap-2">
                                                          <div className={`p-2 rounded-lg ${colorSet.split(' ').slice(1).join(' ')}`}><IconComp size={16} className={colorSet.split(' ')[0]} /></div>
                                                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 tracking-tight leading-tight max-w-[110px] text-center whitespace-normal" title={subj.name}>
                                                              {subj.name}
                                                          </span>
                                                      </div>
                                                  </th>
                                              );
                                          })}
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                      {eligibleStudents.map((student, idx) => (
                                          <tr key={student.id} className="hover:bg-blue-50/20 dark:hover:bg-slate-700/30 transition-colors group">
                                              <td className="p-3 text-center border-r border-slate-50 dark:border-slate-700 text-[10px] font-bold text-slate-300">
                                                  {idx + 1}
                                              </td>
                                              <td className="p-3 px-6 border-r border-slate-50 dark:border-slate-700">
                                                  <span className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-tight">{student.fullName}</span>
                                              </td>
                                              {currentProgramSubjects.map(subj => {
                                                  const isAttending = student.subjects?.includes(subj.name);
                                                  const scoreValue = bulkScores[student.id]?.[subj.name] || '';
                                                  const percent = scoreValue ? Math.round((Number(scoreValue) / (subj.maxExamScore || 100)) * 100) : 0;
                                                  
                                                  return (
                                                      <td 
                                                        key={subj.id} 
                                                        className={`p-3 text-center border-r last:border-r-0 border-slate-50 dark:border-slate-700 transition-colors ${!isAttending ? 'bg-slate-50/50 dark:bg-slate-900/10' : 'bg-white dark:bg-slate-800'}`}
                                                      >
                                                          <div className="flex flex-col items-center gap-1.5 relative group/input">
                                                              <div className="relative">
                                                                <input 
                                                                    type="number"
                                                                    placeholder="—"
                                                                    title={isAttending ? `Ходит на курс «${subj.name}»` : `Не записан на курс «${subj.name}»`}
                                                                    value={scoreValue}
                                                                    onChange={e => handleMatrixScoreChange(student.id, subj.name, e.target.value)}
                                                                    className={`w-14 border rounded-xl py-1.5 text-center font-bold text-sm outline-none transition-all ${
                                                                        isAttending 
                                                                          ? 'bg-white dark:bg-slate-700 border-blue-200 dark:border-blue-700 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10' 
                                                                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 border-dashed text-slate-400 focus:border-blue-400'
                                                                    }`}
                                                                />
                                                                {isAttending && (
                                                                    <div className="absolute -top-1 -right-1 z-10 bg-emerald-500 rounded-full shadow-sm p-0.5" title="Посещает">
                                                                        <Check size={8} className="text-white" strokeWidth={5}/>
                                                                    </div>
                                                                )}
                                                              </div>
                                                              {scoreValue !== '' && (
                                                                  <span className={`text-[8px] font-black tracking-widest uppercase ${!isAttending ? 'text-slate-400' : (percent >= 80 ? 'text-emerald-600' : percent >= 50 ? 'text-blue-600' : 'text-rose-600')}`}>
                                                                      {percent}%
                                                                  </span>
                                                              )}
                                                          </div>
                                                      </td>
                                                  );
                                              })}
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center py-32 space-y-4">
                              <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-md border border-slate-100 dark:border-slate-700">
                                  <BookOpenCheck size={40} className="text-slate-200" />
                              </div>
                              <div>
                                  <h4 className="text-lg font-bold text-slate-400 uppercase tracking-widest leading-none">Ожидание выбора</h4>
                                  <p className="text-xs text-slate-400 font-medium mt-2">Выберите программу обучения</p>
                              </div>
                          </div>
                      )}
                  </div>

                  <footer className="p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                      <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-600 uppercase tracking-tight">
                             <div className="w-3.5 h-3.5 rounded bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 flex items-center justify-center shadow-sm"><Check size={8} strokeWidth={5}/></div>
                             <span>Посещает курс</span>
                          </div>
                          <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                             <div className="w-3.5 h-3.5 rounded bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200"></div>
                             <span>Не записан</span>
                          </div>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => setIsBulkModalOpen(false)} className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-800 transition-colors">ОТМЕНА</button>
                        <button 
                            onClick={handleBulkSave}
                            disabled={!bulkConfig.programId || eligibleStudents.length === 0}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-10 py-3 rounded-2xl font-bold shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-3 text-xs uppercase tracking-widest"
                        >
                            <Save size={16} strokeWidth={2.5}/> СОХРАНИТЬ МАТРИЦУ
                        </button>
                      </div>
                  </footer>
              </div>
          </div>
      )}
    </div>
  );
};

export default Exams;
