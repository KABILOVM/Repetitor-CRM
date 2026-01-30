
import React, { useMemo, useState, useEffect } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { StudentStatus, Student, Transaction, ExamResult, Group, UserProfile, UserRole, Branch, ScheduleSlot } from '../types';
import { TrendingUp, Users, AlertTriangle, Wallet, ArrowUpRight, ArrowDownRight, Activity, Calendar as CalendarIcon, Filter, Clock, BookOpen, User, MapPin } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { StudentProfileModal } from '../components/StudentProfileModal';

// --- Shared Components ---

const KpiCard = ({ title, value, subValue, icon: Icon, trend, colorClass, bgClass }: any) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between h-full transition-all hover:shadow-md">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${bgClass}`}>
        <Icon className={colorClass} size={24} />
      </div>
      {trend && (
        <span className={`flex items-center text-xs font-bold ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'} bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded-full`}>
          {trend === 'up' ? <ArrowUpRight size={14} className="mr-1"/> : <ArrowDownRight size={14} className="mr-1"/>}
        </span>
      )}
    </div>
    <div>
      <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-1 tracking-tight">{value}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
      {subValue && <p className="text-xs text-slate-400 mt-2 border-t border-slate-100 dark:border-slate-700 pt-2 font-medium">{subValue}</p>}
    </div>
  </div>
);

const SectionTitle = ({ title, subtitle }: { title: string, subtitle?: string }) => (
    <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>}
    </div>
);

// --- 1. TEACHER DASHBOARD ---
const TeacherDashboard = ({ user, students, groups, exams }: { user: UserProfile, students: Student[], groups: Group[], exams: ExamResult[] }) => {
    // 1. Filter My Groups
    const myGroups = useMemo(() => groups.filter(g => g.teacher === user.fullName), [groups, user.fullName]);
    
    // 2. Filter My Active Students
    const myStudents = useMemo(() => {
        const groupIds = myGroups.map(g => g.id);
        return students.filter(s => s.status === StudentStatus.Active && s.groupIds?.some(id => groupIds.includes(id)));
    }, [students, myGroups]);

    // 3. Schedule for Today
    const todaySchedule = useMemo(() => {
        const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        const todayCode = days[new Date().getDay()];
        
        const scheduleItems: any[] = [];

        myGroups.forEach(g => {
            if (g.scheduleSlots && g.scheduleSlots.length > 0) {
                const todaySlots = g.scheduleSlots.filter(s => s.day === todayCode);
                todaySlots.forEach(s => {
                    scheduleItems.push({ ...g, time: s.time, room: s.room });
                });
            } else if (g.schedule.includes(todayCode)) {
                const parts = g.schedule.split(' ');
                const time = parts.length > 1 ? parts[parts.length - 1] : '';
                scheduleItems.push({ ...g, time, room: g.room });
            }
        });

        return scheduleItems.sort((a, b) => a.time.localeCompare(b.time));
    }, [myGroups]);

    // 4. Academic Performance
    const avgScore = useMemo(() => {
        const myExams = exams.filter(e => e.subject === user.subject);
        if (myExams.length === 0) return 0;
        const total = myExams.reduce((acc, e) => acc + (e.score / e.maxScore), 0);
        return Math.round((total / myExams.length) * 100);
    }, [exams, user.subject]);

    const riskyStudents = myStudents.filter(s => s.consecutiveAbsences >= 3);

    return (
        <div className="space-y-6 animate-in fade-in">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Кабинет преподавателя</h2>
            
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard title="Мои группы" value={myGroups.length} icon={BookOpen} colorClass="text-blue-600" bgClass="bg-blue-50 dark:bg-blue-900/20" />
                <KpiCard title="Активные ученики" value={myStudents.length} subValue="Только текущие" icon={Users} colorClass="text-emerald-600" bgClass="bg-emerald-50 dark:bg-emerald-900/20" />
                <KpiCard title="Средний балл" value={`${avgScore}%`} subValue={`По предмету ${user.subject || '...'}`} icon={Activity} colorClass="text-purple-600" bgClass="bg-purple-50 dark:bg-purple-900/20" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Schedule Widget */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <SectionTitle title="Расписание на сегодня" subtitle={new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })} />
                    <div className="space-y-3">
                        {todaySchedule.length > 0 ? todaySchedule.map((g, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 p-2 rounded-lg font-bold text-sm">
                                        {g.time}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">{g.name}</h4>
                                        <p className="text-xs text-slate-500 font-medium">{g.subject} {g.room ? `• ${g.room}` : ''}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-600 px-2 py-1 rounded border dark:border-slate-500 uppercase tracking-widest">
                                    {g.studentsCount} уч.
                                </span>
                            </div>
                        )) : (
                            <div className="text-center py-10 text-slate-400">
                                <Clock size={32} className="mx-auto mb-2 opacity-20"/>
                                <p className="text-sm font-medium">На сегодня занятий нет</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Risk Widget */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <SectionTitle title="Зона внимания" subtitle="Пропуски более 3 раз подряд" />
                        {riskyStudents.length > 0 && <AlertTriangle size={20} className="text-amber-500 animate-pulse"/>}
                    </div>
                    <div className="space-y-2">
                        {riskyStudents.length > 0 ? riskyStudents.map(s => (
                            <div key={s.id} className="flex justify-between items-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-amber-800 dark:text-amber-200 font-bold text-xs shadow-sm">
                                        {s.fullName.charAt(0)}
                                    </div>
                                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{s.fullName}</span>
                                </div>
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{s.consecutiveAbsences} проп.</span>
                            </div>
                        )) : (
                            <div className="text-center py-10 text-slate-400">
                                <Users size={32} className="mx-auto mb-2 opacity-20"/>
                                <p className="text-sm font-medium">Все посещают исправно</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- REST OF DASHBOARD UNCHANGED ---
const FinancierDashboard = ({ transactions, students }: { transactions: Transaction[], students: Student[] }) => {
    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = today.slice(0, 7);
    const todayRevenue = transactions.filter(t => t.type === 'Payment' && t.date === today).reduce((sum, t) => sum + t.amount, 0);
    const monthRevenue = transactions.filter(t => t.type === 'Payment' && t.date.startsWith(currentMonth)).reduce((sum, t) => sum + t.amount, 0);
    const totalDebt = students.reduce((sum, s) => sum + (s.balance < 0 ? Math.abs(s.balance) : 0), 0);
    const revenueData = useMemo(() => {
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const data = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const dayStr = String(i).padStart(2, '0');
            const dateKey = `${currentMonth}-${dayStr}`;
            const val = transactions.filter(t => t.type === 'Payment' && t.date === dateKey).reduce((acc, t) => acc + t.amount, 0);
            data.push({ name: dayStr, value: val });
        }
        return data;
    }, [transactions, currentMonth]);
    const debtors = students.filter(s => s.balance < 0).sort((a,b) => a.balance - b.balance).slice(0, 10);
    return (
        <div className="space-y-6 animate-in fade-in">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Финансовый обзор</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard title="Выручка за сегодня" value={`${todayRevenue.toLocaleString()} с.`} icon={Wallet} colorClass="text-emerald-600" bgClass="bg-emerald-50 dark:bg-emerald-900/20" />
                <KpiCard title="Выручка за месяц" value={`${monthRevenue.toLocaleString()} с.`} icon={TrendingUp} colorClass="text-blue-600" bgClass="bg-blue-50 dark:bg-blue-900/20" />
                <KpiCard title="Общая задолженность" value={`${totalDebt.toLocaleString()} с.`} icon={AlertTriangle} colorClass="text-rose-600" bgClass="bg-rose-50 dark:bg-rose-900/20" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"><SectionTitle title="Динамика поступлений" subtitle="Текущий месяц (по дням)" /><div className="h-80"><ResponsiveContainer width="100%" height="100%"><AreaChart data={revenueData}><defs><linearGradient id="colorFin" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} /><YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} /><Tooltip formatter={(value: number) => [`${value} с.`, 'Сумма']} /><Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorFin)" /></AreaChart></ResponsiveContainer></div></div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col"><SectionTitle title="Топ должников" subtitle="Требуют немедленной оплаты" /><div className="overflow-y-auto flex-1 custom-scrollbar -mr-2 pr-2 space-y-2">{debtors.map(s => (<div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg"><div><p className="font-bold text-sm text-slate-800 dark:text-white">{s.fullName}</p><p className="text-xs text-slate-500 font-medium">{s.phone}</p></div><span className="font-bold text-rose-500 tracking-tight">{s.balance} с.</span></div>))}</div></div>
            </div>
        </div>
    );
}

const AdminDashboard = ({ students, transactions, exams }: { students: Student[], transactions: Transaction[], exams: ExamResult[] }) => {
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        months.add(currentMonthKey);
        transactions.forEach(t => months.add(t.date.slice(0, 7)));
        // Fix: Explicitly type return as string[]
        return Array.from(months).sort().reverse() as string[];
    }, [transactions, currentMonthKey]);
    const isAllTime = selectedMonth === 'all';
    const activeStudentsCount = useMemo(() => {
        if (isAllTime) return students.filter(s => s.status === StudentStatus.Active).length;
        const [year, month] = selectedMonth.split('-').map(Number);
        const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];
        return students.filter(s => s.startDate && s.startDate <= endOfMonth && (!s.endDate || s.endDate > endOfMonth)).length;
    }, [students, selectedMonth, isAllTime]);
    const revenue = transactions.filter(t => t.type === 'Payment' && (isAllTime || t.date.startsWith(selectedMonth))).reduce((acc, t) => acc + t.amount, 0);
    const sourceData = useMemo(() => {
        const counts: Record<string, number> = {};
        students.forEach(s => { const src = s.source || 'Не указано'; counts[src] = (counts[src] || 0) + 1; });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    }, [students]);
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Общий обзор</h2>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-600 shadow-inner">
                    <CalendarIcon size={16} className="text-slate-400" />
                    <select 
                        value={selectedMonth} 
                        onChange={(e) => setSelectedMonth(e.target.value)} 
                        className="bg-transparent border-none font-bold text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer py-1"
                    >
                        <option value="all">За все время</option>
                        {/* Fix: m is correctly inferred as string */}
                        {availableMonths.map((m: string) => (
                            <option key={m} value={m}>
                                {new Date(m + '-01').toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Активные ученики" value={activeStudentsCount} icon={Users} colorClass="text-blue-600" bgClass="bg-blue-50 dark:bg-blue-900/20" />
                <KpiCard title="Выручка" value={`${revenue.toLocaleString()} с.`} icon={Wallet} colorClass="text-emerald-600" bgClass="bg-emerald-50 dark:bg-emerald-900/20" />
                <KpiCard title="Всего в базе" value={students.length} icon={Filter} colorClass="text-purple-600" bgClass="bg-purple-50 dark:bg-purple-900/20" />
                <KpiCard title="Источников" value={sourceData.length} icon={Activity} colorClass="text-amber-600" bgClass="bg-amber-50 dark:bg-amber-900/20" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-80">
                    <SectionTitle title="Источники трафика" />
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={sourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {sourceData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend layout="vertical" verticalAlign="middle" align="right" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-400 font-medium">
                    <p>Дополнительная аналитика в разделе "Аналитика"</p>
                </div>
            </div>
        </div>
    )
}

export const Dashboard: React.FC = () => {
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.Admin, fullName: '', email: '', permissions: [] });
  const allStudents = storage.get<Student[]>(StorageKeys.STUDENTS, []);
  const allTransactions = storage.get<Transaction[]>(StorageKeys.TRANSACTIONS, []);
  const exams = storage.get<ExamResult[]>(StorageKeys.EXAM_RESULTS, []);
  const groups = storage.get<Group[]>(StorageKeys.GROUPS, []);
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const isSuperUser = [UserRole.GeneralDirector, UserRole.Developer, UserRole.Financier].includes(user.role);
  useEffect(() => { const hasWelcomed = sessionStorage.getItem('hasWelcomed'); if (!hasWelcomed) { storage.notify(`Добро пожаловать, ${user.fullName}!`, 'info'); sessionStorage.setItem('hasWelcomed', 'true'); } if (isSuperUser || user.role === UserRole.Admin) { const debtCount = allStudents.filter(s => s.balance < 0).length; if (debtCount > 0 && !hasWelcomed) { setTimeout(() => { storage.notify(`Внимание: ${debtCount} должников требуют оплаты.`, 'warning'); }, 1000); } } }, [user.fullName, isSuperUser, allStudents]);
  const filteredData = useMemo(() => { let filteredStudents = allStudents; let filteredTransactions = allTransactions; let activeBranchFilter: string | undefined = undefined; if (isSuperUser) { if (selectedBranch !== 'All') activeBranchFilter = selectedBranch; } else if (user.branch) { activeBranchFilter = user.branch; } if (activeBranchFilter) { filteredStudents = allStudents.filter(s => s.branch === activeBranchFilter); const branchStudentIds = filteredStudents.map(s => s.id); filteredTransactions = allTransactions.filter(t => branchStudentIds.includes(t.studentId)); } return { students: filteredStudents, transactions: filteredTransactions }; }, [allStudents, allTransactions, selectedBranch, user, isSuperUser]);
  if (user.role === UserRole.Teacher) { return <TeacherDashboard user={user} students={allStudents} groups={groups} exams={exams} />; }
  const branchSelector = isSuperUser && (<div className="flex justify-end mb-4"><div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"><MapPin size={16} className="text-slate-400" /><select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer uppercase tracking-widest"><option value="All">Все филиалы</option>{(Object.values(Branch) as string[]).map(b => <option key={b} value={b}>{b}</option>)}</select></div></div>);
  if (user.role === UserRole.Financier) { return (<>{branchSelector}<FinancierDashboard transactions={filteredData.transactions} students={filteredData.students} /></>); }
  return (<>{branchSelector}<AdminDashboard students={filteredData.students} transactions={filteredData.transactions} exams={exams} /></>);
};