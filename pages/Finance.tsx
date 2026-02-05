
import React, { useState, useMemo, useEffect } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Transaction, Student, Invoice, StudentStatus, Group, UserProfile, UserRole, Branch, Course, Violation, BranchEntity } from '../types';
import { 
    AlertCircle, Wallet, Edit2, X, Plus, CheckCircle, Calendar, Search, 
    FileSignature, Clock, Filter, ChevronRight, Layers, MapPin, 
    Banknote, Landmark, CreditCard, Receipt, ArrowRightLeft, Calculator,
    TrendingUp, ArrowUpRight, TrendingDown, History, User, CreditCard as CardIcon, RotateCcw,
    Check, BookOpen, FlaskConical, Atom, Dna, Globe, Scroll, Gavel, Code, Music, Dumbbell, Brain, Rocket, Languages, PenTool, ShieldAlert,
    Hourglass, Palette
} from 'lucide-react';
import { DateRangePicker } from '../components/DateRangePicker';
import { useData } from '../hooks/useData';
import { PaymentModal } from '../components/PaymentModal';
import { CustomSelect } from '../components/CustomSelect';

const ICON_MAP: Record<string, React.ElementType> = {
    'Calculator': Calculator, 'FlaskConical': FlaskConical, 'Atom': Atom, 'Dna': Dna,
    'Globe': Globe, 'Scroll': Scroll, 'Gavel': Gavel, 'Code': Code, 'BookOpen': BookOpen,
    'Music': Music, 'Dumbbell': Dumbbell, 'Palette': Palette, 'Brain': Brain, 'Rocket': Rocket,
    'Languages': Languages, 'PenTool': PenTool
};

const getSubjectConfig = (name: string, courses: Course[]) => {
    const course = courses.find(c => c.name === name);
    if (course) {
        const IconComponent = ICON_MAP[course.icon || 'BookOpen'] || BookOpen;
        let color = 'text-blue-500';
        let bg = 'bg-blue-50 dark:bg-blue-900/30';
        
        switch (course.color) {
            case 'emerald': color = 'text-emerald-500'; bg = 'bg-emerald-50 dark:bg-emerald-900/30'; break;
            case 'purple': color = 'text-purple-500'; bg = 'bg-purple-50 dark:bg-purple-900/30'; break;
            case 'amber': color = 'text-amber-500'; bg = 'bg-amber-50 dark:bg-amber-900/30'; break;
            case 'rose': color = 'text-rose-500'; bg = 'bg-rose-900/10 dark:bg-rose-900/30'; break;
            case 'indigo': color = 'text-indigo-500'; bg = 'bg-indigo-50 dark:bg-indigo-900/30'; break;
        }
        return { icon: IconComponent, color, bg };
    }
    return { icon: BookOpen, color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800' };
};

const KpiCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl ${color.bg}`}>
                <Icon className={color.text} size={24} />
            </div>
            {trend && (
                <div className={`flex items-center text-[10px] font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {trend > 0 ? '+' : ''}{trend}%
                </div>
            )}
        </div>
        <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-1">{title}</p>
            <h3 className={`text-2xl font-bold tracking-tight ${color.text}`}>{value}</h3>
        </div>
    </div>
);

export const Finance: React.FC = () => {
  const [students] = useData<Student[]>(StorageKeys.STUDENTS, []);
  const [transactions] = useData<Transaction[]>(StorageKeys.TRANSACTIONS, []);
  const [invoices] = useData<Invoice[]>(StorageKeys.INVOICES, []);
  const [groups] = useData<Group[]>(StorageKeys.GROUPS, []);
  const [courses] = useData<Course[]>(StorageKeys.COURSES, []);
  const [branches] = useData<BranchEntity[]>(StorageKeys.BRANCHES, []);
  
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  
  const dynamicBranchList = useMemo(() => branches.filter(b => b.isActive).map(b => b.name).sort(), [branches]);

  const [activeTab, setActiveTab] = useState<'transactions' | 'invoices' | 'debtors'>('transactions');
  const [selectedBranch, setSelectedBranch] = useState<string>('Все филиалы');
  // Fix: Cast array to (UserRole | string)[] for includes check
  const isSuperUser = ([UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Financier] as (UserRole | string)[]).includes(user.role);
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<Student | null>(null);
  const [isRefundMode, setIsRefundMode] = useState(false);

  const [selectedStudentForCard, setSelectedStudentForCard] = useState<Student | null>(null);
  const [cardSearchTerm, setCardSearchTerm] = useState('');
  const [debtorGroupFilter, setDebtorGroupFilter] = useState<string>('All');

  const currentDay = new Date().getDate();

  const isStudentVisible = (studentId: number): boolean => {
      const student = students.find(s => s.id === studentId);
      if (!student) return false;

      if (!isSuperUser && user.branch) {
          return student.branch === user.branch;
      }
      if (isSuperUser && selectedBranch !== 'Все филиалы') {
          return student.branch === selectedBranch;
      }
      return true;
  };

  const visibleStudents = useMemo(() => {
      if (isSuperUser && selectedBranch !== 'Все филиалы') return students.filter(s => s.branch === selectedBranch);
      if (!isSuperUser && user.branch) return students.filter(s => s.branch === user.branch);
      return students;
  }, [students, user.branch, selectedBranch, isSuperUser]);

  const visibleTransactions = useMemo(() => transactions.filter(t => isStudentVisible(t.studentId)), [transactions, selectedBranch, user.branch, students, isSuperUser]);
  const visibleInvoices = useMemo(() => invoices.filter(i => isStudentVisible(i.studentId)), [invoices, selectedBranch, user.branch, students, isSuperUser]);
  const debtors = useMemo(() => visibleStudents.filter(s => s.balance < 0), [visibleStudents]);

  const todayIncome = useMemo(() => {
      return visibleTransactions
          .filter(t => t.date === new Date().toISOString().split('T')[0] && t.type === 'Payment')
          .reduce((acc, t) => acc + t.amount, 0);
  }, [visibleTransactions]);

  const handlePayInvoice = (invoice: Invoice) => {
    if (invoice.status === 'Оплачен') return;
    const student = students.find(s => s.id === invoice.studentId);
    if (student) {
        setPaymentTarget(student);
        setIsRefundMode(false);
        setIsPaymentModalOpen(true);
    }
  };

  const openModal = (refund: boolean) => {
    setPaymentTarget(null);
    setIsRefundMode(refund);
    setIsPaymentModalOpen(true);
  };

  const generateTimeline = (student: Student) => {
      const today = new Date();
      const startDate = student.startDate ? new Date(student.startDate) : new Date(today.getFullYear(), 0, 1);
      const timeline: Date[] = [];
      let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (current <= new Date(today.getFullYear(), today.getMonth() + 1, 1)) {
          timeline.push(new Date(current));
          current.setMonth(current.getMonth() + 1);
      }
      return timeline.reverse().slice(0, 12);
  };

  const studentCardData = useMemo(() => {
      if (!selectedStudentForCard) return null;
      const stTransactions = transactions.filter(t => t.studentId === selectedStudentForCard.id);
      
      const currentMonth = new Date().toISOString().slice(0, 7);
      const unpaidInvoices = invoices.filter(inv => 
          inv.studentId === selectedStudentForCard.id && 
          inv.status === 'Ожидает' && 
          inv.month < currentMonth
      );
      
      const totalPaid = stTransactions.filter(t => t.type === 'Payment').reduce((sum, t) => sum + t.amount, 0);
      const totalRefunded = stTransactions.filter(t => t.type === 'Refund').reduce((sum, t) => sum + t.amount, 0);
      
      const sortedTransactions = [...stTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latestTransaction = sortedTransactions[0] || null;

      const subjectPrices = (selectedStudentForCard.subjects || []).map(sub => {
          const course = courses.find(c => c.name === sub);
          const discount = selectedStudentForCard.subjectDiscounts?.[sub] ?? (selectedStudentForCard.discountPercent || 0);
          const basePrice = course?.price || 0;
          const finalPrice = Math.round(basePrice * (1 - discount / 100));
          return { name: sub, finalPrice, discount };
      });

      const totalMonthlySum = subjectPrices.reduce((sum, sp) => sum + sp.finalPrice, 0);

      return {
          transactions: sortedTransactions,
          latestTransaction,
          totalPaid,
          totalRefunded,
          netIncome: totalPaid - totalRefunded,
          delaysCount: unpaidInvoices.length,
          subjectPrices,
          totalMonthlySum
      };
  }, [selectedStudentForCard, transactions, courses, invoices]);

  const getMethodIcon = (method: string) => {
      const m = method?.toLowerCase() || '';
      if (m.includes('алиф')) return <div className="p-1.5 bg-yellow-100 text-yellow-700 rounded-lg"><CreditCard size={14}/></div>;
      if (m.includes('dc') || m.includes('душанбе')) return <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg"><Landmark size={14}/></div>;
      if (m.includes('карт')) return <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg"><CardIcon size={14}/></div>;
      return <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg"><Banknote size={14}/></div>;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500 antialiased">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4">
             <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Финансы и касса</h2>
                <div className="flex items-center gap-2 mt-2">
                    <div className="w-56">
                        <CustomSelect 
                            value={isSuperUser ? selectedBranch : (user.branch || 'Все филиалы')} 
                            onChange={(val) => setSelectedBranch(val)}
                            disabled={!isSuperUser}
                            options={['Все филиалы', ...dynamicBranchList]}
                            icon={MapPin}
                        />
                    </div>
                </div>
             </div>
        </div>
        <div className="flex flex-wrap gap-3">
            <button 
                onClick={() => openModal(false)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
            >
                <Plus size={16} strokeWidth={3} /> ПРИНЯТЬ ОПЛАТУ
            </button>
            <button 
                onClick={() => openModal(true)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
            >
                <RotateCcw size={16} strokeWidth={3} /> ОФОРМИТЬ ВОЗВРАТ
            </button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard title="Касса за сегодня" value={`${todayIncome.toLocaleString()} с.`} icon={Wallet} color={{ text: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' }} trend={12} />
          <KpiCard title="Должников всего" value={debtors.length} icon={TrendingDown} color={{ text: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' }} />
          <KpiCard title="Статус сбора" value={currentDay <= 5 ? 'Фаза сбора' : currentDay <= 15 ? 'Обзвон' : 'Блокировка'} icon={Clock} color={{ text: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' }} />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-6 md:p-8">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-600 shadow-inner">
                          <Receipt size={22} />
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">Финансовая карта</h3>
                          <p className="text-[10px] text-slate-400 font-medium tracking-widest mt-1.5">История платежей и начислений</p>
                      </div>
                  </div>
                  <div className="relative w-full max-w-md group">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                      <input type="text" placeholder="Поиск ученика по имени..." className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg text-sm font-semibold outline-none transition-all shadow-inner" value={cardSearchTerm} onChange={(e) => setCardSearchTerm(e.target.value)} />
                      {cardSearchTerm && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-1">
                              {visibleStudents.filter(s => s.fullName.toLowerCase().includes(cardSearchTerm.toLowerCase())).slice(0, 5).map(s => (
                                  <button key={s.id} className="w-full text-left px-4 py-3 text-sm font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between group" onClick={() => { setSelectedStudentForCard(s); setCardSearchTerm(''); }}>
                                      <span className="text-slate-700 dark:text-slate-200 group-hover:text-blue-600">{s.fullName}</span>
                                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${s.balance < 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{s.balance} с.</span>
                                  </button>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
              {selectedStudentForCard && studentCardData ? (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <div className="flex flex-col lg:flex-row gap-6 mb-8">
                          {/* Main Info Card */}
                          <div className="flex-1 flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-50/40 dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner">
                              <div className="flex items-center gap-5 min-w-0 w-full md:w-auto">
                                  <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-md overflow-hidden shrink-0">
                                      {selectedStudentForCard.avatar ? <img src={selectedStudentForCard.avatar} className="w-full h-full object-cover" alt={selectedStudentForCard.fullName} /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={28}/></div>}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                      <h4 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight truncate" title={selectedStudentForCard.fullName}>
                                          {selectedStudentForCard.fullName}
                                      </h4>
                                      <div className="flex flex-wrap gap-1.5 mt-2">
                                          {selectedStudentForCard.subjects?.map(sub => {
                                              const { icon: SIcon, color, bg } = getSubjectConfig(sub, courses);
                                              return (
                                                  <div key={sub} className="relative group/tooltip">
                                                      <div className={`p-1.5 rounded-lg border border-white/50 shadow-sm ${bg} transition-transform hover:scale-110 cursor-help`}>
                                                          <SIcon size={13} className={color} />
                                                      </div>
                                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-900 text-white text-[9px] font-bold rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                                                          {sub}
                                                      </div>
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  </div>
                              </div>
                              <div className="flex flex-wrap sm:flex-nowrap gap-6 items-center shrink-0 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 pt-6 md:pt-0 md:pl-8 w-full md:w-auto justify-between sm:justify-start">
                                  <div className="text-center bg-white dark:bg-slate-800 p-3 px-4 rounded-xl border border-slate-100 dark:border-slate-700 flex-1 md:flex-none shadow-sm">
                                      <p className="text-[9px] font-bold text-slate-400 tracking-widest mb-1">Оплачено всего</p>
                                      <div className="text-lg font-bold text-emerald-600 tracking-tight">{studentCardData.totalPaid.toLocaleString()} <span className="text-[10px] opacity-60">с.</span></div>
                                  </div>
                                  <div className="text-center bg-white dark:bg-slate-800 p-3 px-4 rounded-xl border border-slate-100 dark:border-slate-700 flex-1 md:flex-none shadow-sm">
                                      <p className="text-[9px] font-bold text-slate-400 tracking-widest mb-1">Задержки</p>
                                      <div className={`text-lg font-bold tracking-tight ${studentCardData.delaysCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{studentCardData.delaysCount} <span className="text-[10px] opacity-60">мес.</span></div>
                                  </div>
                                  <div className="text-center md:text-right flex-1 md:flex-none min-w-[100px]">
                                      <p className="text-[10px] font-bold text-slate-400 tracking-widest mb-1">Баланс</p>
                                      <div className={`text-2xl font-bold tracking-tight ${selectedStudentForCard.balance < 0 ? 'text-rose-600' : 'text-blue-600'}`}>{selectedStudentForCard.balance.toLocaleString()} <span className="text-sm opacity-40 font-bold">с.</span></div>
                                  </div>
                              </div>
                          </div>
                          
                          {/* Latest Operation Side Card */}
                          <div className="w-full lg:w-72 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                               <div className="h-full flex flex-col">
                                    <p className="text-[10px] font-bold text-slate-400 tracking-widest mb-4 flex items-center gap-2"><History size={14} className="text-blue-500" /> Последняя операция</p>
                                    {studentCardData.latestTransaction ? (
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {getMethodIcon(studentCardData.latestTransaction.paymentMethod || '')}
                                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{studentCardData.latestTransaction.paymentMethod || 'Наличные'}</span>
                                                </div>
                                                <span className="text-[10px] font-semibold text-slate-400">{studentCardData.latestTransaction.date}</span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-bold text-slate-800 dark:text-white leading-tight truncate">{studentCardData.latestTransaction.purpose}</p>
                                                </div>
                                                <div className={`text-xl font-bold tracking-tight ml-2 ${studentCardData.latestTransaction.type === 'Refund' ? 'text-rose-500' : 'text-emerald-600'}`}>
                                                    {studentCardData.latestTransaction.type === 'Refund' ? '-' : ''}{studentCardData.latestTransaction.amount} <span className="text-xs">с.</span>
                                                </div>
                                            </div>
                                            <div className="pt-3 border-t border-slate-50 dark:border-slate-700 mt-auto">
                                                <p className="text-[9px] font-bold text-slate-400 tracking-widest">Админ: <span className="text-slate-600 dark:text-slate-300">{studentCardData.latestTransaction.createdBy}</span></p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center opacity-30 italic text-[11px]">
                                            Нет записей
                                        </div>
                                    )}
                               </div>
                          </div>
                      </div>

                      {/* Timeline Strip */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-2 mb-8">
                        {generateTimeline(selectedStudentForCard).map((date) => {
                            const monthKey = date.toISOString().slice(0, 7);
                            const inv = invoices.find(i => i.studentId === selectedStudentForCard.id && i.month === monthKey);
                            const isPaid = inv?.status === 'Оплачен';
                            const isCurrent = monthKey === new Date().toISOString().slice(0, 7);
                            
                            const paymentsInMonth = transactions
                                .filter(t => t.studentId === selectedStudentForCard.id && t.type === 'Payment' && t.date.startsWith(monthKey))
                                .reduce((sum, t) => sum + t.amount, 0);
                            
                            const refundsInMonth = transactions
                                .filter(t => t.studentId === selectedStudentForCard.id && t.type === 'Refund' && t.date.startsWith(monthKey))
                                .reduce((sum, t) => sum + t.amount, 0);
                            
                            const netMonthPaid = paymentsInMonth - refundsInMonth;

                            return (
                                <div key={monthKey} className={`p-3 rounded-xl border-2 text-center transition-all ${isPaid ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/10 dark:border-emerald-800' : inv ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-900/10 dark:border-rose-800' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700 text-slate-300'} ${isCurrent ? 'ring-4 ring-blue-500/10 !border-blue-500 !text-blue-600 shadow-sm scale-[1.02]' : ''}`}>
                                    <span className="text-[10px] font-bold tracking-tight block mb-1">{date.toLocaleString('ru-RU', { month: 'short' })}</span>
                                    <div className="flex flex-col items-center">
                                        {netMonthPaid > 0 ? (
                                            <>
                                                <span className="text-[10px] font-bold text-emerald-600">Оплата</span>
                                                <span className="text-[9px] font-bold opacity-70 mt-0.5">{netMonthPaid} с.</span>
                                            </>
                                        ) : inv ? (
                                            <>
                                                <span className="text-[10px] font-bold text-rose-600">Долг</span>
                                                <span className="text-[9px] font-bold opacity-70 mt-0.5">{inv.amount} с.</span>
                                            </>
                                        ) : (
                                            <span className="text-[11px] font-bold">—</span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                      </div>

                      {/* Detailed Transaction List */}
                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-2">
                              <h5 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-2"><History size={15} className="text-blue-500" /> Детальная история транзакций</h5>
                              <span className="text-[10px] font-bold text-slate-400">Записей: {studentCardData.transactions.length}</span>
                          </div>
                          <div className="overflow-x-auto custom-scrollbar">
                              <table className="w-full text-left">
                                  <thead>
                                      <tr className="text-[10px] font-bold text-slate-400 tracking-widest border-b dark:border-slate-700 bg-slate-50/30">
                                          <th className="p-4 px-8">Дата</th>
                                          <th className="p-4">Способ</th>
                                          <th className="p-4">Назначение</th>
                                          <th className="p-4 text-right px-8">Сумма</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                      {studentCardData.transactions.map(t => (
                                          <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                              <td className="p-4 px-8 whitespace-nowrap">
                                                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{t.date}</span>
                                              </td>
                                              <td className="p-4">
                                                  <div className="flex items-center gap-2.5">
                                                      {getMethodIcon(t.paymentMethod || '')}
                                                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">{t.paymentMethod || 'Наличные'}</span>
                                                  </div>
                                              </td>
                                              <td className="p-4">
                                                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200 tracking-tight line-clamp-1">{t.purpose}</div>
                                                  <div className="text-[9px] text-slate-400 mt-0.5 font-medium">Админ: {t.createdBy || 'Система'}</div>
                                              </td>
                                              <td className="p-4 text-right px-8">
                                                  <div className={`text-base font-bold tracking-tight ${t.type === 'Refund' ? 'text-rose-500' : 'text-emerald-600'}`}>
                                                      {t.type === 'Refund' ? '-' : '+'}{t.amount} <span className="text-[10px] opacity-60">с.</span>
                                                  </div>
                                              </td>
                                          </tr>
                                      ))}
                                      {studentCardData.transactions.length === 0 && (
                                          <tr>
                                              <td colSpan={4} className="p-12 text-center text-slate-400 italic text-sm">История транзакций пуста</td>
                                          </tr>
                                      )}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                      <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-md mb-6 border border-slate-100 dark:border-slate-700">
                          <Search size={28} className="opacity-30 text-blue-500" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-600 dark:text-slate-400">Выберите ученика для просмотра</h4>
                      <p className="text-xs max-w-xs mt-2 font-medium leading-relaxed">Начните вводить имя в строке поиска выше, чтобы получить детальный финансовый отчет.</p>
                  </div>
              )}
          </div>
      </div>

      <div className="space-y-6">
          <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex items-center gap-1 w-full sm:w-fit border border-slate-200 dark:border-slate-700 shadow-inner overflow-x-auto hide-scrollbar">
              {[
                { id: 'transactions', label: 'Журнал операций', icon: History },
                { id: 'invoices', label: 'Начисления', icon: Receipt },
                { id: 'debtors', label: `Должники (${debtors.length})`, icon: AlertCircle },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><tab.icon size={14} strokeWidth={3} />{tab.label}</button>
              ))}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {activeTab === 'transactions' && (
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold tracking-widest border-b dark:border-slate-700"><tr><th className="p-5 px-8">Студент / Дата</th><th className="p-5">Назначение / Способ</th><th className="p-5">Сумма</th><th className="p-5 text-right px-8">Действия</th></tr></thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {visibleTransactions.slice(0, 50).map(t => (
                                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                    <td className="p-5 px-8"><div className="font-bold text-slate-800 dark:text-slate-100 text-sm">{t.studentName}</div><div className="text-[10px] font-bold text-slate-400 tracking-widest mt-1.5">{t.date}</div></td>
                                    <td className="p-5 text-sm"><div className="text-slate-700 dark:text-slate-300 font-bold tracking-tight text-[11px]">{t.purpose}</div><div className="text-[10px] text-slate-400 mt-1.5 font-bold">{t.paymentMethod || 'Наличные'}</div></td>
                                    <td className="p-5"><span className={`text-lg font-bold tracking-tight ${t.type === 'Refund' ? 'text-rose-500' : 'text-emerald-600'}`}>{t.type === 'Refund' ? '-' : '+'}{t.amount} с.</span></td>
                                    <td className="p-5 text-right px-8"><button onClick={() => { const s = students.find(st => st.id === t.studentId); if (s) { setPaymentTarget(s); setIsRefundMode(t.type === 'Refund'); setIsPaymentModalOpen(true); } }} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all border border-transparent hover:border-blue-100"><Edit2 size={16}/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {activeTab === 'invoices' && (
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold tracking-widest border-b dark:border-slate-700"><tr><th className="p-5 px-8">Ученик / Период</th><th className="p-5">Сумма начисления</th><th className="p-5">Статус</th><th className="p-5 text-right px-8">Действие</th></tr></thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {visibleInvoices.map(inv => (
                                <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                    <td className="p-5 px-8"><div className="font-bold text-slate-800 dark:text-slate-100 text-sm">{inv.studentName}</div><div className="text-[10px] font-bold text-blue-600 tracking-widest mt-1.5">Месяц: {inv.month}</div></td>
                                    <td className="p-5 font-bold text-slate-700 dark:text-slate-200">{inv.amount} с.</td>
                                    <td className="p-5"><span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold tracking-widest border ${inv.status === 'Оплачен' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{inv.status}</span></td>
                                    <td className="p-5 text-right px-8">{inv.status === 'Ожидает' && <button onClick={() => handlePayInvoice(inv)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest hover:bg-emerald-700 shadow-sm flex items-center gap-2 ml-auto transition-all active:scale-95"><CheckCircle size={14} strokeWidth={3} /> ПРИНЯТЬ</button>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {activeTab === 'debtors' && (
                <div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-4 items-center px-6">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm">
                            <Filter size={14} className="text-slate-400"/>
                            <select value={debtorGroupFilter} onChange={e => setDebtorGroupFilter(e.target.value)} className="bg-transparent text-[10px] font-bold outline-none text-slate-600 dark:text-slate-300 min-w-[130px] tracking-wider cursor-pointer">
                                <option value="All">Все группы</option>
                                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold tracking-widest border-b dark:border-slate-700"><tr><th className="p-5 px-8">Ученик</th><th className="p-5">Сумма долга</th><th className="p-5">Статус / Обещание</th><th className="p-5 text-right px-8">Действия</th></tr></thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {debtors.filter(s => debtorGroupFilter === 'All' || s.groupIds?.includes(Number(debtorGroupFilter))).map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                        <td className="p-5 px-8"><div className="font-bold text-slate-800 dark:text-white text-sm">{s.fullName}</div><div className="text-[10px] font-bold text-slate-400 tracking-widest mt-1.5">{s.phone}</div></td>
                                        <td className="p-5"><span className="text-xl font-bold tracking-tight text-rose-600">{s.balance} с.</span></td>
                                        <td className="p-5">{s.debtPromise ? <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-3 max-w-xs"><Clock size={14} className="text-blue-500 shrink-0 mt-0.5" /><div><div className="text-[9px] font-bold text-blue-600">Обещал до {s.debtPromiseDeadline}</div><div className="text-[11px] italic text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">«{s.debtPromise}»</div></div></div> : <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold tracking-widest border ${Math.abs(s.balance) > 1000 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{Math.abs(s.balance) > 1000 ? 'Критично' : 'Напомнить'}</span>}</td>
                                        <td className="p-5 text-right px-8"><div className="flex justify-end gap-2"><button onClick={() => { setPaymentTarget(s); setIsRefundMode(false); setIsPaymentModalOpen(true); }} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-bold tracking-wider shadow-sm active:scale-95 hover:bg-slate-800 transition-all">ПРИНЯТЬ ОПЛАТУ</button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
          </div>
      </div>

      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        targetStudent={paymentTarget}
        setTargetStudent={setPaymentTarget}
        isRefundInitial={isRefundMode}
      />
    </div>
  );
};
