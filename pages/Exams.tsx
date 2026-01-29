
import React, { useState, useMemo, useEffect } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { ExamResult, Student, Course, UserRole, UserProfile, CourseProgram } from '../types';
import { 
    Award, X, Save, Search, TrendingUp, Calendar, Layers, 
    Users, BookOpenCheck, Calculator, FlaskConical, Atom, Dna, Globe, Scroll, Gavel, Code,
    Languages, BookOpen, ChevronDown, Check, ShieldAlert, Info
} from 'lucide-react';
import { DateRangePicker } from '../components/DateRangePicker';
import { CustomSelect } from '../components/CustomSelect';
import { useData } from '../hooks/useData';

// Карта иконок для предметов
const ICON_MAP: Record<string, React.ElementType> = {
    'Математика': Calculator,
    'Химия': FlaskConical,
    'Биология': Dna,
    'Физика': Atom,
    'Английский язык': Globe,
    'История': Scroll,
    'Право': Gavel,
    'Программирование': Code,
    'Таджикский язык': Languages,
    'Default': BookOpen
};

// Функция сокращения названий
const shortenSubjectName = (name: string): string => {
    const map: Record<string, string> = {
        'Математика': 'Мат.',
        'Химия': 'Хим.',
        'Биология': 'Био.',
        'Физика': 'Физ.',
        'Английский язык': 'Анг.',
        'История': 'Ист.',
        'Право': 'Прав.',
        'Программирование': 'Прог.',
        'Таджикский язык': 'Тдж.'
    };
    return map[name] || name.slice(0, 3) + '.';
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
    // Исключаем результаты "вне программы" из общей статистики
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
                  // Проверяем, ходит ли ученик на этот курс сейчас
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
                      isExtra: !isAttending // Помечаем если вне плана
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Экзамены и тестирования</h1>
            <p className="text-sm text-slate-500 font-medium">Результаты периодических срезов знаний и KPI</p>
        </div>
        {user.role !== UserRole.Teacher && (
            <button 
                onClick={() => setIsBulkModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all active:scale-95 text-sm"
            >
                <Layers size={18} /> 
                Массовый ввод
            </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base tracking-tight">
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
              placeholder="Поиск по ученику или предмету..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-200 dark:border-slate-700">
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
                        <tr key={exam.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${exam.isExtra ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                          <td className="px-6 py-4">
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                  {exam.studentName}
                                  {exam.isExtra && <span className="p-1 bg-slate-100 dark:bg-slate-800 rounded" title="Вне плана"><ShieldAlert size={12} className="text-slate-400"/></span>}
                              </div>
                          </td>
                          <td className="px-6 py-4">
                              <div className="text-sm text-slate-700 dark:text-slate-300">{exam.subject}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                              <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${percent >= 80 ? 'bg-emerald-100 text-emerald-700' : percent >= 50 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                  {exam.score} / {exam.maxScore} • {Math.round(percent)}%
                              </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 text-right">
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
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-slate-700">
                  <header className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 shrink-0">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-600 text-white rounded-lg shadow-sm"><Layers size={22}/></div>
                          <div>
                              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none uppercase">Массовый ввод экзаменов</h3>
                              <p className="text-xs text-slate-500 font-medium mt-1.5">Ввод оценок по всем предметам программы</p>
                          </div>
                      </div>
                      <button onClick={() => setIsBulkModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-all hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><X size={20}/></button>
                  </header>

                  <div className="p-6 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex flex-wrap items-end gap-6 shrink-0">
                      <div className="w-full sm:w-64">
                          <CustomSelect 
                            label="1. Выбор программы" 
                            value={programs.find(p => p.id === bulkConfig.programId)?.name || ''} 
                            onChange={val => setBulkConfig({...bulkConfig, programId: programs.find(p => p.name === val)?.id || ''})}
                            options={programs.map(p => p.name)}
                            placeholder="Выберите программу..."
                          />
                      </div>
                      <div className="w-full sm:w-56">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">2. Дата проведения</label>
                          <input 
                              type="date" 
                              value={bulkConfig.date} 
                              onChange={e => setBulkConfig({...bulkConfig, date: e.target.value})}
                              className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all h-[38px]"
                          />
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 ml-auto">
                          <ShieldAlert size={14} className="text-blue-500"/>
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight">Ввод доступен для всех предметов</span>
                      </div>
                  </div>

                  <div className="flex-1 overflow-auto custom-scrollbar bg-white dark:bg-slate-950">
                      {bulkConfig.programId ? (
                          <div className="min-w-max">
                              <table className="w-full text-left border-separate border-spacing-0">
                                  <thead className="sticky top-0 z-30">
                                      <tr className="bg-slate-100 dark:bg-slate-900 border-b border-gray-200">
                                          <th className="p-4 text-center w-12 border-b border-r border-gray-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">#</th>
                                          <th className="p-4 px-6 min-w-[200px] max-w-[200px] border-b border-r border-gray-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-xs font-bold uppercase tracking-widest text-slate-500">Ученик</th>
                                          {currentProgramSubjects.map(subj => {
                                              const Icon = ICON_MAP[subj.name] || ICON_MAP.Default;
                                              return (
                                                  <th key={subj.id} className="p-3 text-center border-b border-r last:border-r-0 border-gray-200 dark:border-slate-700 min-w-[90px] bg-slate-100 dark:bg-slate-900 group/head relative cursor-help" title={subj.name}>
                                                      <div className="flex flex-col items-center gap-1">
                                                          <Icon size={16} className="text-blue-500" />
                                                          <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter">
                                                              {shortenSubjectName(subj.name)}
                                                          </span>
                                                      </div>
                                                  </th>
                                              );
                                          })}
                                      </tr>
                                  </thead>
                                  <tbody className="bg-white dark:bg-slate-800">
                                      {eligibleStudents.map((student, idx) => (
                                          <tr key={student.id} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/50 transition-colors">
                                              <td className="p-3 text-center border-b border-r border-gray-200 dark:border-slate-700 text-[10px] font-bold text-slate-400">
                                                  {idx + 1}
                                              </td>
                                              <td className="p-3 px-6 border-b border-r border-gray-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 text-sm truncate max-w-[200px]">
                                                  {student.fullName}
                                              </td>
                                              {currentProgramSubjects.map(subj => {
                                                  const isAttending = student.subjects?.includes(subj.name);
                                                  const scoreValue = bulkScores[student.id]?.[subj.name] || '';
                                                  const percent = scoreValue ? Math.round((Number(scoreValue) / (subj.maxExamScore || 100)) * 100) : 0;
                                                  
                                                  return (
                                                      <td key={subj.id} className={`p-3 text-center border-b border-r last:border-r-0 border-gray-200 dark:border-slate-700 ${!isAttending ? 'bg-amber-50/20 dark:bg-amber-900/10' : ''}`}>
                                                          <div className="flex flex-col items-center gap-1 relative group/input">
                                                              {!isAttending && (
                                                                  <div className="absolute -top-1 -right-1 z-10 opacity-60 group-hover/input:opacity-100 transition-opacity">
                                                                      <ShieldAlert size={10} className="text-amber-500" />
                                                                  </div>
                                                              )}
                                                              <input 
                                                                  type="number"
                                                                  placeholder="—"
                                                                  value={scoreValue}
                                                                  onChange={e => handleMatrixScoreChange(student.id, subj.name, e.target.value)}
                                                                  className={`w-16 border rounded-lg py-1.5 text-center font-black text-xs outline-none transition-all ${
                                                                      isAttending 
                                                                        ? 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 focus:border-blue-500' 
                                                                        : 'bg-slate-50 dark:bg-slate-800 border-amber-200 dark:border-amber-900/50 focus:border-amber-500 text-slate-500 dark:text-slate-400'
                                                                  }`}
                                                                  title={!isAttending ? "Ученик не ходит на этот курс" : ""}
                                                              />
                                                              {scoreValue !== '' && (
                                                                  <span className={`text-[8px] font-black tracking-widest uppercase ${!isAttending ? 'text-slate-400' : (percent >= 80 ? 'text-emerald-600' : percent >= 50 ? 'text-blue-600' : 'text-red-600')}`}>
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
                          <div className="h-full flex flex-col items-center justify-center text-center py-20">
                              <BookOpenCheck size={48} className="text-slate-200 mb-4" />
                              <h4 className="text-lg font-bold text-slate-400 uppercase tracking-widest">Выберите программу обучения</h4>
                          </div>
                      )}
                  </div>

                  <footer className="p-6 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end gap-3 shrink-0">
                      <div className="mr-auto flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-white border border-gray-300"></div> План</div>
                          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-50 border border-amber-200"></div> Вне плана</div>
                      </div>
                      <button onClick={() => setIsBulkModalOpen(false)} className="px-8 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Отмена</button>
                      <button 
                        onClick={handleBulkSave}
                        disabled={!bulkConfig.programId || eligibleStudents.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-10 py-2.5 rounded-xl font-bold shadow-lg active:scale-95 transition-all flex items-center gap-2 text-xs uppercase tracking-widest"
                      >
                          <Save size={18}/> Сохранить результаты
                      </button>
                  </footer>
              </div>
          </div>
      )}
    </div>
  );
};

export default Exams;
