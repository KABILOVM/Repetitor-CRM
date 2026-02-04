
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { storage, StorageKeys } from '../services/storage';
import { Student, StudentStatus, Course, UserRole, UserProfile, Branch, ExamResult, BranchEntity } from '../types';
import { 
    Calendar, BarChart3, FileText, Copy, Share2, MapPin, 
    TrendingUp, Target, Users, ArrowUpRight, ArrowDownRight, 
    Filter, LayoutGrid, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import { DateRangePicker } from '../components/DateRangePicker';
import { CustomSelect } from '../components/CustomSelect';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-slate-700 pb-2">{label}</p>
        <div className="space-y-1.5">
            {payload.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div>
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{p.name}:</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{p.value}</span>
                </div>
            ))}
        </div>
      </div>
    );
  }
  return null;
};

type ReportMode = 'charts' | 'report';
type DateMode = 'daily' | 'period';

export const Analytics: React.FC = () => {
  const [mode, setMode] = useState<ReportMode>('report');
  const [dateMode, setDateMode] = useState<DateMode>('daily');
  
  const today = new Date().toISOString().split('T')[0];
  const [primaryDate, setPrimaryDate] = useState(today);
  const [rangeStart, setRangeStart] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]); 
  const [rangeEnd, setRangeEnd] = useState(today);

  const [selectedBranch, setSelectedBranch] = useState<string>('All');

  const students = storage.get<Student[]>(StorageKeys.STUDENTS, []);
  const courses = storage.get<Course[]>(StorageKeys.COURSES, []);
  const examResults = storage.get<ExamResult[]>(StorageKeys.EXAM_RESULTS, []);
  const branches = storage.get<BranchEntity[]>(StorageKeys.BRANCHES, []);
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Financier].includes(user.role);
  
  // Fixed: Branch is a type, generating dynamic branch list for filtering
  const dynamicBranchList = useMemo(() => branches.filter(b => b.isActive).map(b => b.name).sort(), [branches]);

  const allSubjects = useMemo(() => 
    Array.from(new Set(courses.map(c => c.name))).sort(), [courses]
  );

  // Fix: Explicitly type the stats array to avoid unknown errors during map
  const stats = useMemo(() => {
    const startCheck = dateMode === 'daily' ? primaryDate : rangeStart;
    const endCheck = dateMode === 'daily' ? primaryDate : rangeEnd;
    const snapshotDate = endCheck;

    let filteredStudents = students;
    if (isSuperUser) {
        if (selectedBranch !== 'All') filteredStudents = students.filter(s => s.branch === selectedBranch);
    } else if (user.branch) {
        filteredStudents = students.filter(s => s.branch === user.branch);
    }

    return allSubjects.map(sub => {
      const course = courses.find(c => c.name === sub);
      const subStudents = filteredStudents.filter(s => s.subjects?.includes(sub));
      
      const fact = subStudents.filter(s => 
        s.status === StudentStatus.Active && 
        (s.startDate && s.startDate <= snapshotDate) && 
        (!s.endDate || s.endDate > snapshotDate)
      ).length;

      const presale = subStudents.filter(s => s.status === StudentStatus.Presale).length;
      const joined = subStudents.filter(s => s.startDate && s.startDate >= startCheck && s.startDate <= endCheck).length;
      const left = subStudents.filter(s => s.endDate && s.endDate >= startCheck && s.endDate <= endCheck).length;
      const dropped = subStudents.filter(s => s.dropOffDate && s.dropOffDate >= startCheck && s.dropOffDate <= endCheck).length;
      const dynamics = joined - left;

      // Исключаем результаты "вне программы" из расчета средней эффективности
      const subExams = examResults.filter(r => r.subject === sub && !r.isExtra && r.date >= startCheck && r.date <= endCheck);
      const avgScore = subExams.length > 0 
        ? Math.round((subExams.reduce((acc, r) => acc + (r.score / r.maxScore), 0) / subExams.length) * 100)
        : 0;

      return {
        subject: sub,
        plan: course?.targetStudents || 0,
        fact,
        joined,
        left,
        dropped,
        presale,
        dynamics,
        avgScore
      };
    });
  }, [students, courses, examResults, allSubjects, dateMode, primaryDate, rangeStart, rangeEnd, selectedBranch, user, isSuperUser]);

  const totals = stats.reduce((acc, s) => ({
    plan: acc.plan + s.plan,
    fact: acc.fact + s.fact,
    presale: acc.presale + s.presale,
    joined: acc.joined + s.joined,
    left: acc.left + s.left,
    dropped: acc.dropped + s.dropped,
    dynamics: acc.dynamics + s.dynamics
  }), { plan: 0, fact: 0, presale: 0, joined: 0, left: 0, dropped: 0, dynamics: 0 });

  const totalPercent = totals.plan > 0 ? Math.round((totals.fact / totals.plan) * 100) : 0;

  return (
    <div className="space-y-8 antialiased pb-20">
      {/* Header & Main Controls */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 px-1">
        <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Аналитика</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Мониторинг ключевых показателей эффективности центра</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
             <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner h-[42px]">
                <button 
                  onClick={() => setMode('report')} 
                  className={`flex items-center gap-2 px-5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${mode === 'report' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <FileText size={14} /> Отчет
                </button>
                <button 
                  onClick={() => setMode('charts')} 
                  className={`flex items-center gap-2 px-5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${mode === 'charts' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <BarChart3 size={14} /> Графики
                </button>
              </div>

              <div className="h-[42px] flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-700 pr-3 mr-1">
                    <Calendar size={16} className="text-slate-400" />
                    <button onClick={() => setDateMode('daily')} className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${dateMode === 'daily' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'text-slate-400 hover:text-slate-600'}`}>День</button>
                    <button onClick={() => setDateMode('period')} className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${dateMode === 'period' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'text-slate-400 hover:text-slate-600'}`}>Период</button>
                </div>
                {dateMode === 'daily' ? (
                  <DateRangePicker startDate={primaryDate} onChange={(s) => setPrimaryDate(s)} mode="single" className="!border-none !shadow-none !p-0 !h-auto !bg-transparent" />
                ) : (
                  <DateRangePicker startDate={rangeStart} endDate={rangeEnd} onChange={(s, e) => { setRangeStart(s); setRangeEnd(e); }} className="!border-none !shadow-none !p-0 !h-auto !bg-transparent" />
                )}
              </div>

              {isSuperUser && (
                <div className="w-56">
                    <CustomSelect 
                        value={selectedBranch === 'All' ? 'Все филиалы' : selectedBranch} 
                        onChange={(val) => setSelectedBranch(val === 'Все филиалы' ? 'All' : val)} 
                        // Fixed: Using dynamic branch list instead of type
                        options={['Все филиалы', ...dynamicBranchList]} 
                        icon={MapPin}
                    />
                </div>
              )}
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md group">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform"><Target size={24}/></div>
                  <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">План</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-white">{totals.plan}</span>
                  </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{totals.fact}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1.5 tracking-wide">Активные ученики (Факт)</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md group">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform"><TrendingUp size={24}/></div>
                  <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Темп</span>
                      <span className={`text-sm font-bold flex items-center gap-0.5 ${totals.dynamics >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {totals.dynamics >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                          {totals.dynamics}
                      </span>
                  </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{totals.joined}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1.5 tracking-wide">Записалось за период</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md group">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-rose-50 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform"><AlertCircle size={24}/></div>
                  <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Убыль</span>
                      <span className="text-sm font-bold text-rose-600">-{totals.left + totals.dropped}</span>
                  </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{totals.left}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1.5 tracking-wide">Выбыло (Окончание/Отвал)</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md group">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform"><RefreshCw size={24}/></div>
                  <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Lead</span>
                      <span className="text-sm font-bold text-amber-600">{totals.presale}</span>
                  </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{totalPercent}%</h3>
              <p className="text-xs text-slate-500 font-medium mt-1.5 tracking-wide">Общее выполнение плана</p>
          </div>
      </div>

      {mode === 'report' ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-blue-600"><CheckCircle2 size={24} /></div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Сводный отчет по дисциплинам</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Детализация выполнения плана (KPI)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Всего факт</span>
                            <span className="text-xl font-black text-blue-600">{totals.fact}</span>
                        </div>
                        <div className="w-px h-10 bg-slate-200 dark:bg-slate-700"></div>
                        <div className="text-center">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Всего план</span>
                            <span className="text-xl font-black text-slate-400">{totals.plan}</span>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/30 dark:bg-slate-700/20 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b dark:border-slate-700">
                                <th className="p-6 px-10">Название дисциплины</th>
                                <th className="p-6">План / Факт</th>
                                <th className="p-6">Эффективность</th>
                                <th className="p-6">Движение (+/-)</th>
                                <th className="p-6 text-right px-10">Прогноз (Lead)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {/* Fix: s is now correctly typed from stats */}
                            {stats.map(s => {
                                const percent = s.plan > 0 ? Math.round((s.fact / s.plan) * 100) : 0;
                                return (
                                    <tr key={s.subject} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors group">
                                        <td className="p-6 px-10 whitespace-nowrap">
                                            <span className="font-bold text-slate-800 dark:text-slate-100 tracking-tight text-sm group-hover:text-blue-600 transition-colors">{s.subject}</span>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">{s.fact}</span>
                                                <span className="text-xs text-slate-400 font-medium">/ {s.plan}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 min-w-[180px]">
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                                                    <span className={percent >= 80 ? 'text-emerald-600' : percent >= 50 ? 'text-amber-600' : 'text-rose-600'}>{percent}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-1000 ${percent >= 80 ? 'bg-emerald-500' : percent >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                                        style={{ width: `${Math.min(percent, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-emerald-600">+{s.joined}</span>
                                                    <span className="text-[10px] font-bold text-rose-500">-{s.left}</span>
                                                </div>
                                                <div className={`px-2 py-1 rounded-lg text-xs font-black border ${s.dynamics >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                                    {s.dynamics > 0 ? '+' : ''}{s.dynamics}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-right px-10">
                                            <span className="text-sm font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full shadow-sm">{s.presale}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border border-slate-200 dark:border-slate-700 h-[500px] shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-10">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Наполняемость (Факт vs План)</h3>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div><span className="text-[9px] font-bold uppercase text-slate-500">Факт</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div><span className="text-[9px] font-bold uppercase text-slate-500">План</span></div>
                    </div>
                </div>
                <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats} margin={{ bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} interval={0} angle={-15} textAnchor="end" />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                            <Bar name="Факт" dataKey="fact" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={24} />
                            <Bar name="План" dataKey="plan" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border border-slate-200 dark:border-slate-700 h-[500px] shadow-sm flex flex-col">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-10 text-slate-400">Динамика прироста студентов</h3>
                <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats} margin={{ bottom: 20 }}>
                            <defs>
                                <linearGradient id="colorDynamics" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} interval={0} angle={-15} textAnchor="end" />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" name="Динамика" dataKey="dynamics" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorDynamics)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
