
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { storage, StorageKeys } from '../services/storage';
import { Student, StudentStatus, Course, UserRole, UserProfile, Branch } from '../types';
import { Calendar, BarChart3, FileText, Copy, Share2, MapPin } from 'lucide-react';
import { DateRangePicker } from '../components/DateRangePicker';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-700 p-3 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-100">{label}</p>
        <p className="text-sm text-blue-600 dark:text-blue-400">Учеников: {payload[0].value}</p>
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

  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [selectedBranch, setSelectedBranch] = useState<string>('All');

  const students = storage.get<Student[]>(StorageKeys.STUDENTS, []);
  const courses = storage.get<Course[]>(StorageKeys.COURSES, []);
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Financier].includes(user.role);
  
  const allSubjects = useMemo(() => 
    Array.from(new Set(courses.map(c => c.name))).sort(), [courses]
  );

  // --- Logic for Report ---
  const stats = useMemo(() => {
    // Determine the date range to check for "Changes" (Joined/Left/Dropped)
    const startCheck = dateMode === 'daily' ? primaryDate : rangeStart;
    const endCheck = dateMode === 'daily' ? primaryDate : rangeEnd;

    // Determine the date to check for "Current State" (Fact/Total)
    // Usually for a report, we want the state at the END of the period.
    const snapshotDate = endCheck;

    // Filter students based on branch selection
    let filteredStudents = students;
    if (isSuperUser) {
        if (selectedBranch !== 'All') filteredStudents = students.filter(s => s.branch === selectedBranch);
    } else if (user.branch) {
        filteredStudents = students.filter(s => s.branch === user.branch);
    }

    const data = allSubjects.map(sub => {
      const course = courses.find(c => c.name === sub);
      const subStudents = filteredStudents.filter(s => s.subjects?.includes(sub));
      
      // 1. Snapshot Metrics (State at the end of the period)
      
      // FACT: Currently Active (and started before snapshot end, and hasn't left before snapshot end)
      const fact = subStudents.filter(s => 
        s.status === StudentStatus.Active && 
        (s.startDate && s.startDate <= snapshotDate) && 
        (!s.endDate || s.endDate > snapshotDate)
      ).length;

      // PRESALE: Currently Presale
      const presale = subStudents.filter(s => s.status === StudentStatus.Presale).length;

      // 2. Flow Metrics (Changes within the period)
      
      // Joined: startDate is within range (Presale -> Active)
      const joined = subStudents.filter(s => s.startDate && s.startDate >= startCheck && s.startDate <= endCheck).length;
      
      // Left: endDate is within range (Active -> Inactive/Archived)
      const left = subStudents.filter(s => s.endDate && s.endDate >= startCheck && s.endDate <= endCheck).length;
      
      // Dropped (Отвалились): dropOffDate is within range (Presale -> Dropped)
      const dropped = subStudents.filter(s => s.dropOffDate && s.dropOffDate >= startCheck && s.dropOffDate <= endCheck).length;

      const dynamics = joined - left;

      return {
        subject: sub,
        plan: course?.targetStudents || 0,
        fact,
        joined,
        left,
        dropped,
        presale,
        dynamics
      };
    });

    if (subjectFilter !== 'All') return data.filter(d => d.subject === subjectFilter);
    return data;
  }, [students, courses, allSubjects, dateMode, primaryDate, rangeStart, rangeEnd, subjectFilter, selectedBranch, user, isSuperUser]);

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

  const copyReportToClipboard = () => {
      const dateStr = dateMode === 'daily' 
        ? new Date(primaryDate).toLocaleDateString('ru-RU') 
        : `${new Date(rangeStart).toLocaleDateString('ru-RU')} - ${new Date(rangeEnd).toLocaleDateString('ru-RU')}`;

      const branchName = selectedBranch === 'All' ? 'Все филиалы' : selectedBranch;

      let report = `📑️ Ежедневный отчет по количеству учеников ${dateStr}\n\n`;
      report += `Филиал: ${branchName}\n(план выполнен на ${totalPercent}%)\n`;
      report += `🔷️ Количество учеников по предметам план/факт/предзапись\n\n`;

      stats.forEach(s => {
          const percent = s.plan > 0 ? Math.round((s.fact / s.plan) * 100) : 0;
          report += `🔹️${s.subject} - ${s.plan}/${s.fact}/${s.presale} (${percent}%)\n`;
          report += `Записались: ${s.joined > 0 ? '+' : ''}${s.joined}\n`;
          report += `Ушли (Архив): -${s.left}\n`;
          report += `Отказ (Лиды): -${s.dropped}\n`;
          report += `Динамика: ${s.dynamics > 0 ? '+' : ''}${s.dynamics}\n\n`;
      });

      report += `📈️ Итог - ${totals.plan}/${totals.fact}/${totals.presale} (${totalPercent}%)\n`;
      report += `Записались: +${totals.joined}\n`;
      report += `Ушли (Архив): -${totals.left}\n`;
      report += `Отказ (Лиды): -${totals.dropped}\n`;
      report += `Динамика: ${totals.dynamics > 0 ? '+' : ''}${totals.dynamics}`;

      navigator.clipboard.writeText(report);
      alert('Отчет скопирован в буфер обмена!');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        
        {/* Top Controls: Mode & Branch */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex gap-4 items-center">
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <button 
                  onClick={() => setMode('report')} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'report' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-white' : 'text-slate-500'}`}
                >
                  <FileText size={16} /> Отчет
                </button>
                <button 
                  onClick={() => setMode('charts')} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'charts' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-white' : 'text-slate-500'}`}
                >
                  <BarChart3 size={16} /> Графики
                </button>
              </div>

              {isSuperUser && (
                <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-slate-400" />
                    <select 
                        value={selectedBranch} 
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="bg-transparent text-sm font-bold text-slate-600 dark:text-slate-300 border-b border-dashed border-slate-300 dark:border-slate-600 outline-none pb-0.5 cursor-pointer hover:text-blue-600"
                    >
                        <option value="All">Все филиалы</option>
                        {Object.values(Branch).map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>
              )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="flex bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg h-10 overflow-hidden">
              <button onClick={() => setDateMode('daily')} className={`px-4 text-xs font-bold transition-colors ${dateMode === 'daily' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>1 День</button>
              <button onClick={() => setDateMode('period')} className={`px-4 text-xs font-bold transition-colors ${dateMode === 'period' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Период</button>
            </div>
            {dateMode === 'daily' ? (
              <DateRangePicker startDate={primaryDate} onChange={(s) => setPrimaryDate(s)} mode="single" />
            ) : (
              <DateRangePicker startDate={rangeStart} endDate={rangeEnd} onChange={(s, e) => { setRangeStart(s); setRangeEnd(e); }} />
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <select 
            value={subjectFilter} 
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-700 border-none rounded-lg text-sm p-2 outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px] text-slate-800 dark:text-white"
          >
            <option value="All">Все предметы</option>
            {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {mode === 'report' && (
              <button 
                onClick={copyReportToClipboard}
                className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline flex items-center gap-2"
              >
                  <Copy size={16} /> Копировать текст
              </button>
          )}
        </div>
      </div>

      {mode === 'report' ? (
        <div className="space-y-6 animate-in fade-in">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-20"><Share2 size={100} /></div>
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-1">Ежедневный отчет</h2>
                    <p className="opacity-80 mb-4">{new Date(dateMode === 'daily' ? primaryDate : rangeEnd).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                            <span className="block text-xs uppercase opacity-70">План</span>
                            <span className="font-bold text-xl">{totals.plan}</span>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                            <span className="block text-xs uppercase opacity-70">Факт (Актив)</span>
                            <span className="font-bold text-xl">{totals.fact}</span>
                        </div>
                        <div className="flex-1 ml-4">
                            <div className="flex justify-between text-xs mb-1 font-bold">
                                <span>Выполнение плана</span>
                                <span>{totalPercent}%</span>
                            </div>
                            <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                                <div className="bg-white h-full rounded-full" style={{ width: `${Math.min(totalPercent, 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subject List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {stats.map(s => {
                    const percent = s.plan > 0 ? Math.round((s.fact / s.plan) * 100) : 0;
                    return (
                        <div key={s.subject} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 dark:text-white truncate pr-2">{s.subject}</h3>
                                <span className={`text-xs font-bold px-2 py-1 rounded ${percent >= 80 ? 'bg-emerald-100 text-emerald-700' : percent >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                    {percent}%
                                </span>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                                    <div className="text-center">
                                        <div className="text-[10px] uppercase text-slate-400">План</div>
                                        <div className="font-bold">{s.plan}</div>
                                    </div>
                                    <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
                                    <div className="text-center">
                                        <div className="text-[10px] uppercase text-slate-400">Факт</div>
                                        <div className="font-bold text-blue-600 dark:text-blue-400">{s.fact}</div>
                                    </div>
                                    <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
                                    <div className="text-center">
                                        <div className="text-[10px] uppercase text-slate-400">Предзапись</div>
                                        <div className="font-bold">{s.presale}</div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">Записались (Новые):</span>
                                        <span className="font-bold text-emerald-600">+{s.joined}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">Ушли (Архив):</span>
                                        <span className="font-bold text-slate-600 dark:text-slate-400">-{s.left}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">Отказ (Лиды):</span>
                                        <span className="font-bold text-rose-500">-{s.dropped}</span>
                                    </div>
                                    <div className="border-t border-slate-200 dark:border-slate-600 pt-2 flex justify-between">
                                        <span className="font-bold text-slate-700 dark:text-slate-200">Динамика:</span>
                                        <span className={`font-bold ${s.dynamics > 0 ? 'text-emerald-600' : s.dynamics < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                                            {s.dynamics > 0 ? '+' : ''}{s.dynamics}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      ) : (
        /* Original Chart View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 h-96">
                <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Ученики по предметам (Факт)</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="fact" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 h-96">
                <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Динамика (Пришли - Ушли)</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <Tooltip />
                    <Bar dataKey="dynamics" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      )}
    </div>
  );
};
