
import React, { useState, useMemo, useEffect } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Transaction, Student, Invoice, StudentStatus, Group, UserProfile, UserRole, Branch, Course } from '../types';
import { AlertCircle, Wallet, Edit2, X, Plus, CheckCircle, Calendar, Search, FileSignature, Clock, Filter, ChevronRight, Layers, MapPin, Banknote, Landmark, CreditCard, Receipt } from 'lucide-react';
import { DateRangePicker } from '../components/DateRangePicker';
import { useData } from '../hooks/useData';

export const Finance: React.FC = () => {
  const [students, setStudents] = useData<Student[]>(StorageKeys.STUDENTS, []);
  const [transactions, setTransactions] = useData<Transaction[]>(StorageKeys.TRANSACTIONS, []);
  const [invoices, setInvoices] = useData<Invoice[]>(StorageKeys.INVOICES, []);
  
  // Static-ish data (could be useData if you want live updates on these too)
  const [groups] = useData<Group[]>(StorageKeys.GROUPS, []);
  const [courses] = useData<Course[]>(StorageKeys.COURSES, []);
  
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  
  const [activeTab, setActiveTab] = useState<'transactions' | 'invoices' | 'debtors'>('transactions');
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Financier].includes(user.role);
  
  // Edit Transaction Modal (Legacy/Edit)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Partial<Transaction> | null>(null);
  
  // --- SMART PAYMENT MODAL STATES ---
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentTarget, setPaymentTarget] = useState<Student | null>(null);
  const [paymentData, setPaymentData] = useState({
      amount: 0,
      method: 'Наличные' as 'Наличные' | 'Алиф' | 'DC' | 'Карта' | 'Перевод',
      subjectDistribution: {} as Record<string, number>,
      promiseDate: '',
      promiseReason: ''
  });

  // Promise/Debt Modal
  const [isPromiseModalOpen, setIsPromiseModalOpen] = useState(false);
  const [promiseData, setPromiseData] = useState<{ studentId: number, name: string, note: string, date: string } | null>(null);

  // Detailed Debt Modal
  const [selectedDebtor, setSelectedDebtor] = useState<Student | null>(null);

  // Financial Card State
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<Student | null>(null);
  const [cardSearchTerm, setCardSearchTerm] = useState('');

  // Debtors Filter State
  const [debtorGroupFilter, setDebtorGroupFilter] = useState<string>('All');
  const [debtorSubjectFilter, setDebtorSubjectFilter] = useState<string>('All');

  // --- Branch Filtering ---
  const isStudentVisible = (studentId: number): boolean => {
      if (!isSuperUser && user.branch) {
          const student = students.find(s => s.id === studentId);
          return student ? student.branch === user.branch : false;
      }
      if (isSuperUser && selectedBranch !== 'All') {
          const student = students.find(s => s.id === studentId);
          return student ? student.branch === selectedBranch : false;
      }
      return true;
  };

  const visibleStudents = useMemo(() => {
      if (isSuperUser) {
          if (selectedBranch !== 'All') return students.filter(s => s.branch === selectedBranch);
          return students;
      }
      if (user.branch) return students.filter(s => s.branch === user.branch);
      return students;
  }, [students, user, selectedBranch, isSuperUser]);

  const visibleTransactions = useMemo(() => {
      return transactions.filter(t => isStudentVisible(t.studentId));
  }, [transactions, students, user, selectedBranch]);

  const visibleInvoices = useMemo(() => {
      return invoices.filter(i => isStudentVisible(i.studentId));
  }, [invoices, students, user, selectedBranch]);

  // Derived Data
  const debtors = useMemo(() => visibleStudents.filter(s => s.balance < 0), [visibleStudents]);
  
  const filteredDebtors = useMemo(() => {
      return debtors.filter(s => {
          const groupMatch = debtorGroupFilter === 'All' || s.groupIds?.includes(Number(debtorGroupFilter));
          const subjectMatch = debtorSubjectFilter === 'All' || s.subjects?.includes(debtorSubjectFilter);
          return groupMatch && subjectMatch;
      });
  }, [debtors, debtorGroupFilter, debtorSubjectFilter]);

  const uniqueSubjects = useMemo(() => Array.from(new Set(groups.map(g => g.subject))), [groups]);

  const currentDay = new Date().getDate();
  const getDebtorStatus = (balance: number) => {
      if (balance >= 0) return 'ok';
      if (currentDay <= 5) return 'warning-soft'; // 1-5: Reminder
      if (currentDay <= 10) return 'warning-hard'; // 6-10: Calls
      return 'critical'; // >15: Suspension
  };

  // --- ACTIONS ---

  const handleGenerateInvoices = () => {
    const month = new Date().toISOString().slice(0, 7);
    const activeStudents = visibleStudents.filter(s => s.status === StudentStatus.Active);
    
    const newInvoices: Invoice[] = [];
    let count = 0;

    activeStudents.forEach(s => {
      const alreadyHas = invoices.find(inv => inv.studentId === s.id && inv.month === month);
      if (!alreadyHas && s.monthlyFee > 0) {
        newInvoices.push({
          id: Date.now() + count++,
          studentId: s.id,
          studentName: s.fullName,
          amount: s.monthlyFee,
          month,
          status: 'Ожидает',
          createdAt: new Date().toISOString(),
          subjects: s.subjects && s.subjects.length > 0 ? s.subjects : (s['subject'] ? [s['subject']] : [])
        });
      }
    });

    if (newInvoices.length === 0) {
      alert('Нет новых учеников для выставления счетов за этот месяц.');
      return;
    }

    // Auto-sync via useData hooks
    setInvoices([...newInvoices, ...invoices]);
    
    // Decrease balance (Charge the student)
    const updatedStudents = students.map(s => {
      const inv = newInvoices.find(i => i.studentId === s.id);
      if (inv) return { ...s, balance: s.balance - inv.amount };
      return s;
    });
    setStudents(updatedStudents);

    storage.logAction('Выставление счетов', `Выставлено ${newInvoices.length} счетов за ${month}`);
    alert(`Выставлено ${newInvoices.length} счетов`);
  };

  const handlePayInvoice = (invoice: Invoice) => {
    if (invoice.status === 'Оплачен') return;

    const newTransaction: Transaction = {
      id: Date.now(),
      studentId: invoice.studentId,
      studentName: invoice.studentName,
      amount: invoice.amount,
      date: new Date().toISOString().split('T')[0],
      type: 'Payment',
      purpose: `Оплата обучения (${invoice.month})`,
      createdBy: user.fullName
    };

    setTransactions([newTransaction, ...transactions]);

    const updatedInvoices = invoices.map(inv => 
      inv.id === invoice.id ? { ...inv, status: 'Оплачен' as const } : inv
    );
    setInvoices(updatedInvoices);

    const updatedStudents = students.map(s => 
      s.id === invoice.studentId ? { ...s, balance: s.balance + invoice.amount } : s
    );
    setStudents(updatedStudents);

    storage.logAction('Прием оплаты', `Оплачен счет ученика ${invoice.studentName} на сумму ${invoice.amount}`, invoice.studentId);
  };

  // --- SMART PAYMENT LOGIC ---

  const calculateDistribution = (total: number, student: Student) => {
      const distribution: Record<string, number> = {};
      let remaining = total;

      if (student.subjects) {
          const subjectPrices = student.subjects.map(sub => {
              const course = courses.find(c => c.name === sub);
              let price = 0;
              if (course) {
                  if (student.branch && course.branchConfig && course.branchConfig[student.branch]?.isActive) {
                      price = course.branchConfig[student.branch].price;
                  } else {
                      price = (student.branch && course.branchPrices && course.branchPrices[student.branch]) 
                                ? course.branchPrices[student.branch] 
                                : (course.price || 0);
                  }
                  
                  if (student.discountPercent) {
                      price = Math.round(price * (1 - student.discountPercent / 100));
                  }
              }
              return { name: sub, price };
          });

          // Fill sequentially
          subjectPrices.forEach(p => {
              const alloc = Math.min(remaining, p.price);
              distribution[p.name] = alloc;
              remaining -= alloc;
          });

          // If overpayment, add to first subject (or handle as general credit, but for breakdown purposes assign to main)
          if (remaining > 0 && subjectPrices.length > 0) {
              distribution[subjectPrices[0].name] += remaining;
          }
      }
      return distribution;
  };

  const handleAmountChange = (newAmount: number) => {
      const dist = paymentTarget ? calculateDistribution(newAmount, paymentTarget) : {};
      setPaymentData(prev => ({
          ...prev,
          amount: newAmount,
          subjectDistribution: dist
      }));
  };

  const openPaymentModal = () => {
      setPaymentSearch('');
      setPaymentTarget(null);
      setPaymentData({
          amount: 0,
          method: 'Наличные',
          subjectDistribution: {},
          promiseDate: '',
          promiseReason: ''
      });
      setIsPaymentModalOpen(true);
  };

  const selectStudentForPayment = (student: Student) => {
      setPaymentTarget(student);
      setPaymentSearch(''); // Clear search to hide list
      
      // Calculate full expected amount
      let totalAmount = 0;
      if (student.subjects) {
          student.subjects.forEach(sub => {
              const course = courses.find(c => c.name === sub);
              if (course) {
                  let price = 0;
                  if (student.branch && course.branchConfig && course.branchConfig[student.branch]?.isActive) {
                      price = course.branchConfig[student.branch].price;
                  } else {
                      price = (student.branch && course.branchPrices && course.branchPrices[student.branch]) 
                                ? course.branchPrices[student.branch] 
                                : (course.price || 0);
                  }
                  if (student.discountPercent) {
                      price = Math.round(price * (1 - student.discountPercent / 100));
                  }
                  totalAmount += price;
              }
          });
      }

      // Initial calculation
      const initialDist = calculateDistribution(totalAmount, student);

      setPaymentData({
          amount: totalAmount,
          method: 'Наличные',
          subjectDistribution: initialDist,
          promiseDate: '',
          promiseReason: ''
      });
  };

  const handleSmartPaymentSubmit = () => {
      if (!paymentTarget || paymentData.amount <= 0) return;

      // Construct Purpose string from distribution
      let purposeStr = 'Оплата за обучение';
      const distEntries = Object.entries(paymentData.subjectDistribution);
      if (distEntries.length > 0) {
          const details = distEntries
              .filter(([_, amt]) => amt > 0)
              .map(([sub, amt]) => `${sub}: ${amt}`)
              .join(', ');
          if (details) purposeStr += ` (${details})`;
      }

      const newTransaction: Transaction = {
          id: Date.now(),
          studentId: paymentTarget.id,
          studentName: paymentTarget.fullName,
          amount: paymentData.amount,
          date: new Date().toISOString().split('T')[0],
          type: 'Payment',
          purpose: purposeStr,
          paymentMethod: paymentData.method,
          createdBy: user.fullName
      };

      const updatedBalance = paymentTarget.balance + paymentData.amount;
      
      // Update student object
      const updatedStudent: Student = { 
          ...paymentTarget, 
          balance: updatedBalance,
          // Update debt promise if balance still negative
          debtPromise: (updatedBalance < 0 && paymentData.promiseReason) ? paymentData.promiseReason : paymentTarget.debtPromise,
          debtPromiseDeadline: (updatedBalance < 0 && paymentData.promiseDate) ? paymentData.promiseDate : paymentTarget.debtPromiseDeadline
      };

      // Clear promise if debt cleared
      if (updatedBalance >= 0) {
          updatedStudent.debtPromise = undefined;
          updatedStudent.debtPromiseDeadline = undefined;
      }

      // Update Lists
      setTransactions([newTransaction, ...transactions]);
      
      const updatedStudents = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
      setStudents(updatedStudents);

      storage.logAction('Прием оплаты', `Принято ${paymentData.amount}с от ${paymentTarget.fullName}`, paymentTarget.id);
      storage.notify('Оплата успешно принята', 'success');
      
      setIsPaymentModalOpen(false);
      setPaymentTarget(null);
  };

  // Legacy/Edit Transaction Logic
  const saveEditedTransaction = () => {
    if (!editingTransaction?.id) return;
    const updated = transactions.map(t => t.id === editingTransaction.id ? editingTransaction as Transaction : t);
    setTransactions(updated);
    setIsEditModalOpen(false);
  };

  const openPromiseModal = (student: Student) => {
      setPromiseData({
          studentId: student.id,
          name: student.fullName,
          note: student.debtPromise || '',
          date: student.debtPromiseDeadline || ''
      });
      setIsPromiseModalOpen(true);
  };

  const savePromise = () => {
      if (!promiseData) return;
      const updatedStudents = students.map(s => 
          s.id === promiseData.studentId 
          ? { ...s, debtPromise: promiseData.note, debtPromiseDeadline: promiseData.date } 
          : s
      );
      setStudents(updatedStudents);
      setIsPromiseModalOpen(false);
      setPromiseData(null);
  };

  // --- Dynamic Timeline Generator ---
  const generateTimeline = (student: Student) => {
      const today = new Date();
      const startDate = student.startDate ? new Date(student.startDate) : new Date(today.getFullYear(), 0, 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      
      const timeline: Date[] = [];
      let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

      if (current.getFullYear() < today.getFullYear() - 5) {
          current = new Date(today.getFullYear() - 5, 0, 1);
      }

      while (current <= endDate) {
          timeline.push(new Date(current));
          current.setMonth(current.getMonth() + 1);
      }
      
      return timeline; 
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Финансы и Касса</h2>
            
            {isSuperUser ? (
                <div className="flex items-center gap-2 mt-2">
                    <MapPin size={14} className="text-slate-400" />
                    <select 
                        value={selectedBranch} 
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="bg-transparent text-sm font-bold text-slate-600 dark:text-slate-300 border-b border-dashed border-slate-300 dark:border-slate-600 outline-none pb-0.5 cursor-pointer hover:text-blue-600"
                    >
                        <option value="All">Все филиалы</option>
                        {Object.values(Branch).map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>
            ) : user.branch && (
                <p className="text-xs text-slate-500 mt-1">Филиал: {user.branch}</p>
            )}
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleGenerateInvoices}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
                title="Автоматически выставить счета активным ученикам (обычно 1-го числа)"
            >
                <Calendar size={18} />
                Счета за месяц
            </button>
            <button 
                onClick={openPaymentModal}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
            >
                <Plus size={18} />
                Принять оплату
            </button>
        </div>
      </div>

      {/* Daily Cash Report Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-xs text-slate-500 uppercase font-bold">Касса за сегодня</p>
              <p className="text-2xl font-black text-emerald-600">
                  {visibleTransactions
                    .filter(t => t.date === new Date().toISOString().split('T')[0] && t.type === 'Payment')
                    .reduce((acc, t) => acc + t.amount, 0)} с.
              </p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-xs text-slate-500 uppercase font-bold">Должников (общ.)</p>
              <p className="text-2xl font-black text-red-600">{debtors.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-xs text-slate-500 uppercase font-bold">Статус сбора</p>
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                  {currentDay <= 5 ? 'Сбор оплат (до 5-го)' : currentDay <= 10 ? 'Обзвон должников' : 'Недопуск к урокам'}
              </p>
          </div>
      </div>

      {/* ... (Rest of UI components same as before) ... */}
      
      {/* Student Financial Card */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 relative z-10">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                  <Wallet size={20} className="text-blue-500" />
                  Финансовая карта ученика
              </h3>
              <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                      type="text"
                      placeholder="Поиск ученика..."
                      className="w-full pl-9 pr-8 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-700"
                      value={cardSearchTerm}
                      onChange={(e) => setCardSearchTerm(e.target.value)}
                  />
                  {cardSearchTerm && (
                      <button 
                        onClick={() => setCardSearchTerm('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                          <X size={14} />
                      </button>
                  )}
                  {cardSearchTerm && (
                      <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg mt-1 max-h-40 overflow-y-auto z-50 shadow-lg">
                          {visibleStudents.filter(s => s.fullName.toLowerCase().includes(cardSearchTerm.toLowerCase())).map(s => (
                              <button 
                                key={s.id}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                                onClick={() => { setSelectedStudentForCard(s); setCardSearchTerm(''); }}
                              >
                                  {s.fullName}
                              </button>
                          ))}
                          {visibleStudents.filter(s => s.fullName.toLowerCase().includes(cardSearchTerm.toLowerCase())).length === 0 && (
                              <div className="px-4 py-2 text-xs text-slate-400">Ученик не найден</div>
                          )}
                      </div>
                  )}
              </div>
          </div>

          {selectedStudentForCard ? (
              <div className="space-y-4 animate-in fade-in">
                  <div className="flex justify-between items-start bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                      <div>
                          <div className="flex items-center gap-2">
                              <h4 className="font-bold text-xl">{selectedStudentForCard.fullName}</h4>
                              <button onClick={() => setSelectedStudentForCard(null)} className="text-xs text-blue-500 hover:text-slate-600 underline">Сбросить</button>
                          </div>
                          <p className="text-sm text-slate-500">Начало обучения: {selectedStudentForCard.startDate || 'Не указано'}</p>
                          {selectedStudentForCard.endDate && <p className="text-sm text-red-500">Закончил: {selectedStudentForCard.endDate}</p>}
                      </div>
                      <div className="text-right">
                          <p className="text-sm text-slate-500 uppercase font-bold">Баланс</p>
                          <p className={`text-2xl font-black ${selectedStudentForCard.balance < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                              {selectedStudentForCard.balance} с.
                          </p>
                      </div>
                  </div>

                  {/* Dynamic Grid based on Student History */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-3">
                      {generateTimeline(selectedStudentForCard).map((date) => {
                          const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
                          const labelMonth = date.toLocaleString('ru-RU', { month: 'short' }).toUpperCase();
                          const labelYear = date.getFullYear().toString().slice(2); // '23, '24
                          const currentMonthKey = new Date().toISOString().slice(0, 7);
                          const isCurrent = monthKey === currentMonthKey;

                          const inv = invoices.find(i => i.studentId === selectedStudentForCard.id && i.month === monthKey);
                          let statusClass = 'bg-slate-100 dark:bg-slate-700 text-slate-400 border-slate-200 dark:border-slate-600';
                          let label = 'Нет';

                          const start = selectedStudentForCard.startDate ? new Date(selectedStudentForCard.startDate) : null;
                          const end = selectedStudentForCard.endDate ? new Date(selectedStudentForCard.endDate) : null;
                          const compDate = new Date(date.getFullYear(), date.getMonth(), 1);
                          const isActivePeriod = (!start || compDate >= new Date(start.getFullYear(), start.getMonth(), 1)) && 
                                                 (!end || compDate <= end);

                          if (inv) {
                              if (inv.status === 'Оплачен') {
                                  statusClass = 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
                                  label = 'Оплачен';
                              } else {
                                  statusClass = 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
                                  label = 'Долг';
                              }
                          } else if (isActivePeriod && compDate < new Date(new Date().getFullYear(), new Date().getMonth(), 1)) {
                               statusClass = 'bg-slate-200 dark:bg-slate-600 text-slate-500 border-slate-300 dark:border-slate-500';
                               label = '-';
                          }

                          if (isCurrent) {
                              statusClass += ' ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-800 z-10';
                          }

                          return (
                              <div key={monthKey} className={`p-2 rounded-lg text-center border ${statusClass} flex flex-col items-center justify-center min-h-[64px] transition-all`}>
                                  <span className="text-xs font-black uppercase mb-0.5 flex gap-1">
                                      {labelMonth} <span className="opacity-60 font-medium">'{labelYear}</span>
                                  </span>
                                  <span className="text-[10px] font-medium leading-tight">{label}</span>
                              </div>
                          )
                      })}
                  </div>
              </div>
          ) : (
              <div className="text-center py-10 text-slate-400 bg-slate-50 dark:bg-slate-700/30 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center gap-2">
                  <Search size={32} className="opacity-20" />
                  <p>Введите имя ученика в поиске выше, чтобы увидеть историю оплат.</p>
              </div>
          )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 mt-8">
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'transactions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
              Журнал операций
          </button>
          <button 
            onClick={() => setActiveTab('invoices')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'invoices' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
              Счета (Billing)
          </button>
          <button 
            onClick={() => setActiveTab('debtors')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'debtors' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
              Должники ({filteredDebtors.length})
          </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {activeTab === 'transactions' && (
            <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 text-xs uppercase">
                    <tr>
                        <th className="p-4">Студент / Дата</th>
                        <th className="p-4">Назначение</th>
                        <th className="p-4">Сумма</th>
                        <th className="p-4 text-right">Действия</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {visibleTransactions.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="p-4">
                                <div className="font-semibold text-slate-800 dark:text-slate-100">{t.studentName}</div>
                                <div className="text-xs text-slate-400">{t.date}</div>
                            </td>
                            <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{t.purpose}</td>
                            <td className={`p-4 font-bold ${t.type === 'Refund' ? 'text-red-500' : 'text-emerald-600'}`}>
                                {t.type === 'Refund' ? '-' : '+'}{t.amount} с.
                            </td>
                            <td className="p-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => { setEditingTransaction(t); setIsEditModalOpen(true); }} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 size={16}/></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}

        {activeTab === 'invoices' && (
            <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 text-xs uppercase">
                    <tr>
                        <th className="p-4">Ученик / Месяц</th>
                        <th className="p-4">Сумма</th>
                        <th className="p-4">Статус</th>
                        <th className="p-4 text-right">Действие</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {visibleInvoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="p-4">
                                <div className="font-semibold text-slate-800 dark:text-slate-100">{inv.studentName}</div>
                                <div className="text-xs text-slate-400">Период: {inv.month}</div>
                            </td>
                            <td className="p-4 font-bold text-slate-700 dark:text-slate-200">{inv.amount} с.</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${inv.status === 'Оплачен' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {inv.status}
                                </span>
                            </td>
                            <td className="p-4 text-right">
                                {inv.status === 'Ожидает' && (
                                    <button 
                                        onClick={() => handlePayInvoice(inv)}
                                        className="bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-emerald-700 flex items-center gap-1 ml-auto"
                                    >
                                        <CheckCircle size={14} /> Отметить оплату
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}

        {activeTab === 'debtors' && (
            <div>
             {/* Filters */}
             <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center">
                <div className="flex items-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2">
                    <Filter size={14} className="text-slate-400 mr-2"/>
                    <select 
                        value={debtorGroupFilter}
                        onChange={e => setDebtorGroupFilter(e.target.value)}
                        className="bg-transparent text-sm py-1.5 outline-none text-slate-700 dark:text-slate-300 min-w-[150px]"
                    >
                        <option value="All">Все группы</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2">
                    <Layers size={14} className="text-slate-400 mr-2"/>
                    <select 
                        value={debtorSubjectFilter}
                        onChange={e => setDebtorSubjectFilter(e.target.value)}
                        className="bg-transparent text-sm py-1.5 outline-none text-slate-700 dark:text-slate-300 min-w-[150px]"
                    >
                        <option value="All">Все предметы</option>
                        {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
             </div>

             <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 text-xs uppercase">
                    <tr>
                        <th className="p-4">Ученик (нажмите для деталей)</th>
                        <th className="p-4">Текущий баланс</th>
                        <th className="p-4">Причина / Обещание</th>
                        <th className="p-4 text-right">Действия</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredDebtors.map(s => {
                        const status = getDebtorStatus(s.balance);
                        return (
                            <tr key={s.id}>
                                <td className="p-4">
                                    <button 
                                        onClick={() => setSelectedDebtor(s)}
                                        className="text-left font-semibold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2 group"
                                    >
                                        {s.fullName}
                                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                </td>
                                <td className="p-4 font-bold text-red-600">{s.balance} с.</td>
                                <td className="p-4">
                                    {s.debtPromise ? (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-800">
                                            <div className="flex items-center gap-1 text-xs font-bold text-blue-600 mb-1">
                                                <Clock size={12}/> Обещал до {s.debtPromiseDeadline}
                                            </div>
                                            <div className="text-[10px] italic text-slate-600 dark:text-slate-300">"{s.debtPromise}"</div>
                                        </div>
                                    ) : (
                                        <>
                                            {status === 'warning-soft' && <span className="text-amber-500 text-xs font-bold">Напомнить</span>}
                                            {status === 'warning-hard' && <span className="text-orange-600 text-xs font-bold flex items-center gap-1"><AlertCircle size={12}/> Звонить родителям!</span>}
                                            {status === 'critical' && <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">СТОП УРОКИ</span>}
                                        </>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => openPromiseModal(s)}
                                            className="text-slate-400 hover:text-blue-600 p-1"
                                            title="Взять расписку / обещание"
                                        >
                                            <FileSignature size={18} />
                                        </button>
                                        <button 
                                            onClick={() => { setEditingTransaction({ studentName: s.fullName, studentId: s.id, amount: Math.abs(s.balance), type: 'Payment', purpose: 'Погашение остатка долга', date: new Date().toISOString().split('T')[0] }); setIsEditModalOpen(true); }}
                                            className="text-xs text-emerald-600 font-bold hover:underline px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded"
                                        >
                                            Весь долг
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    {filteredDebtors.length === 0 && (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-400">Список должников пуст по выбранным фильтрам</td></tr>
                    )}
                </tbody>
             </table>
            </div>
        )}
      </div>

      {/* Edit Transaction Modal */}
      {isEditModalOpen && editingTransaction && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 dark:text-white">Редактирование оплаты</h3>
                      <button onClick={() => setIsEditModalOpen(false)}><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Ученик</label>
                          <input 
                            type="text" 
                            disabled
                            className="w-full border rounded p-2 text-sm bg-slate-50 dark:bg-slate-700 dark:text-slate-400 cursor-not-allowed"
                            value={editingTransaction.studentName || ''}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Сумма (сомони)</label>
                          <input 
                            type="number" 
                            className="w-full border rounded p-2 text-sm bg-white dark:bg-slate-700 dark:text-white font-bold"
                            value={editingTransaction.amount}
                            onChange={e => setEditingTransaction({...editingTransaction, amount: Number(e.target.value)})}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Назначение</label>
                          <input 
                            type="text" 
                            className="w-full border rounded p-2 text-sm bg-white dark:bg-slate-700 dark:text-white"
                            value={editingTransaction.purpose || ''}
                            onChange={e => setEditingTransaction({...editingTransaction, purpose: e.target.value})}
                          />
                      </div>
                  </div>
                  <div className="p-4 border-t flex justify-end gap-2">
                      <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm text-slate-500">Отмена</button>
                      <button onClick={saveEditedTransaction} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold">Сохранить</button>
                  </div>
              </div>
          </div>
      )}

      {/* Smart Payment & Promise Modals use local state for simplicity, but modify data via setTransactions/setStudents hooks */}
      {/* ... (Existing modals with minor hook updates are covered by the main component logic) ... */}
      
      {/* --- SMART PAYMENT MODAL --- */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90%] animate-in zoom-in duration-200">
                <div className="p-4 border-b border-emerald-100 dark:border-emerald-900/30 flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/10 rounded-t-xl">
                    <h3 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2 text-lg">
                        <Wallet size={20} className="text-emerald-600 dark:text-emerald-400"/>
                        Прием оплаты
                    </h3>
                    <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    
                    {/* Search Section */}
                    {!paymentTarget ? (
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    autoFocus
                                    placeholder="Поиск ученика..." 
                                    value={paymentSearch}
                                    onChange={(e) => setPaymentSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            
                            {paymentSearch && (
                                <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                    {visibleStudents.filter(s => s.fullName.toLowerCase().includes(paymentSearch.toLowerCase())).map(s => (
                                        <button 
                                            key={s.id}
                                            onClick={() => selectStudentForPayment(s)}
                                            className="w-full flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600 text-left"
                                        >
                                            <div>
                                                <span className="font-bold text-slate-800 dark:text-slate-200 block">{s.fullName}</span>
                                                <span className="text-xs text-slate-500">{s.phone}</span>
                                            </div>
                                            <span className={`text-xs font-bold ${s.balance < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                {s.balance} с.
                                            </span>
                                        </button>
                                    ))}
                                    {visibleStudents.filter(s => s.fullName.toLowerCase().includes(paymentSearch.toLowerCase())).length === 0 && (
                                        <p className="text-center text-slate-400 text-sm py-4">Ученики не найдены</p>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            {/* Selected Student Card */}
                            <div className="flex justify-between items-start bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-lg text-slate-800 dark:text-white">{paymentTarget.fullName}</h4>
                                        <button onClick={() => setPaymentTarget(null)} className="text-xs text-blue-500 hover:underline">Сменить</button>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-1">{paymentTarget.subjects?.join(', ') || 'Без предметов'}</p>
                                    <div className={`text-sm font-bold ${paymentTarget.balance < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        Баланс: {paymentTarget.balance} с.
                                    </div>
                                </div>
                            </div>

                            {/* Payment Form */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Сумма оплаты</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">с.</span>
                                    <input 
                                        type="number" 
                                        autoFocus
                                        value={paymentData.amount || ''}
                                        onChange={(e) => handleAmountChange(Number(e.target.value))}
                                        className="w-full pl-8 pr-4 py-3 bg-white dark:bg-slate-700 border-2 border-emerald-500 rounded-xl text-2xl font-black text-slate-800 dark:text-white focus:outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Способ оплаты</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['Наличные', 'Алиф', 'DC', 'Карта'].map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => setPaymentData({...paymentData, method: m as any})}
                                            className={`py-3 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-1 ${
                                                paymentData.method === m
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-500'
                                                : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-emerald-200'
                                            }`}
                                        >
                                            {m === 'Наличные' && <Banknote size={18}/>}
                                            {m === 'Алиф' && <Wallet size={18}/>}
                                            {m === 'DC' && <Landmark size={18}/>}
                                            {m === 'Карта' && <CreditCard size={18}/>}
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Subject Distribution (Optional) */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Распределение по предметам (опционально)</label>
                                {Object.keys(paymentData.subjectDistribution).length > 0 ? (
                                    <div className="space-y-2">
                                        {Object.entries(paymentData.subjectDistribution).map(([subject, price]) => (
                                            <div key={subject} className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{subject}</span>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="number"
                                                        className="w-20 p-1 text-right text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 outline-none focus:border-blue-500"
                                                        value={price}
                                                        onChange={(e) => {
                                                            const newDist = {...paymentData.subjectDistribution, [subject]: Number(e.target.value)};
                                                            setPaymentData({...paymentData, subjectDistribution: newDist});
                                                        }}
                                                    />
                                                    <span className="text-xs text-slate-400">с.</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic">Нет предметов для распределения</p>
                                )}
                            </div>

                            {/* Debt Promise (Conditional) */}
                            {(paymentTarget.balance + paymentData.amount) < 0 && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 animate-in fade-in slide-in-from-top-2">
                                    <h4 className="font-bold text-blue-700 dark:text-blue-300 text-sm mb-3 flex items-center gap-2">
                                        <FileSignature size={16}/> Обещание оплаты (Расписка)
                                    </h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-blue-600/70 uppercase mb-1">Обещанная дата оплаты</label>
                                            <DateRangePicker 
                                                startDate={paymentData.promiseDate || ''}
                                                onChange={(d) => setPaymentData({...paymentData, promiseDate: d})}
                                                mode="single"
                                                className="w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-blue-600/70 uppercase mb-1">Комментарий к долгу</label>
                                            <input 
                                                type="text"
                                                placeholder="Например: Зарплата родителей 15-го числа"
                                                value={paymentData.promiseReason}
                                                onChange={(e) => setPaymentData({...paymentData, promiseReason: e.target.value})}
                                                className="w-full border border-blue-200 dark:border-blue-800 rounded-lg p-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {paymentTarget && (
                    <div className="p-6 pt-2 bg-white dark:bg-slate-800 rounded-b-xl flex justify-between gap-2">
                        <button onClick={() => setIsPaymentModalOpen(false)} className="px-6 py-3 text-sm text-slate-500 hover:text-slate-700 font-bold">Отмена</button>
                        <button 
                            onClick={handleSmartPaymentSubmit}
                            disabled={paymentData.amount <= 0}
                            className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl text-lg font-bold hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            <CheckCircle size={20} /> Подтвердить оплату
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Debt Details Modal */}
      {selectedDebtor && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
                      <div>
                          <h3 className="font-bold text-lg text-slate-800 dark:text-white">{selectedDebtor.fullName}</h3>
                          <p className="text-xs text-slate-500">Детализация задолженности</p>
                      </div>
                      <button onClick={() => setSelectedDebtor(null)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                  </div>
                  <div className="p-5">
                      <div className="flex justify-between items-center mb-4 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800">
                          <span className="text-sm font-bold text-red-800 dark:text-red-300">Общий долг:</span>
                          <span className="text-2xl font-black text-red-600">{Math.abs(selectedDebtor.balance)} с.</span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Неоплаченные счета (Пункты):</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar mb-4">
                          {invoices.filter(i => i.studentId === selectedDebtor.id && i.status === 'Ожидает').length > 0 ? (
                              invoices.filter(i => i.studentId === selectedDebtor.id && i.status === 'Ожидает')
                                .sort((a,b) => a.month.localeCompare(b.month))
                                .map(inv => (
                                  <div key={inv.id} className="flex justify-between items-center p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                      <div>
                                          <p className="font-bold text-sm text-slate-700 dark:text-slate-200">
                                              {new Date(inv.month + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                                          </p>
                                          <p className="text-xs text-slate-400">Счет #{inv.id.toString().slice(-4)}</p>
                                      </div>
                                      <div className="flex items-center gap-3">
                                          <span className="font-bold text-slate-800 dark:text-slate-100">{inv.amount} с.</span>
                                          <button 
                                              onClick={() => handlePayInvoice(inv)}
                                              className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                                          >
                                              Оплатить
                                          </button>
                                      </div>
                                  </div>
                              ))
                          ) : (
                              <div className="text-center py-4 text-slate-400 text-sm italic bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                                  Нет выставленных счетов. Долг, вероятно, ручной.
                              </div>
                          )}
                      </div>
                      
                      {/* Manual Debt Payment Option */}
                      {Math.abs(selectedDebtor.balance) > invoices.filter(i => i.studentId === selectedDebtor.id && i.status === 'Ожидает').reduce((sum, i) => sum + i.amount, 0) && (
                          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                              <p className="text-xs text-slate-500 mb-2">Есть остаток долга без счета (ручной):</p>
                              <button 
                                  onClick={() => { 
                                      setSelectedDebtor(null); // Close detail modal
                                      selectStudentForPayment(selectedDebtor); // Open smart payment
                                      setIsPaymentModalOpen(true);
                                  }}
                                  className="w-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 py-2 rounded-lg text-sm font-medium transition-colors"
                              >
                                  Погасить остаток полностью
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Promise Note Modal */}
      {isPromiseModalOpen && promiseData && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-blue-50 dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm animate-in fade-in zoom-in duration-200 border-2 border-blue-100 dark:border-slate-700">
                  <div className="p-4 border-b border-blue-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800/50 rounded-t-xl">
                      <h3 className="font-bold text-blue-700 dark:text-white flex items-center gap-2">
                          <FileSignature size={18} className="text-blue-500"/> Обещание оплаты
                      </h3>
                      <button onClick={() => setIsPromiseModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4 bg-blue-50/50 dark:bg-slate-900/20">
                      <div>
                          <label className="block text-xs font-bold text-blue-600/70 dark:text-slate-400 uppercase mb-1">Обещанная дата оплаты</label>
                          <DateRangePicker 
                            startDate={promiseData.date}
                            onChange={(d) => setPromiseData({...promiseData, date: d})}
                            mode="single"
                            className="w-full"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-blue-600/70 dark:text-slate-400 uppercase mb-1">Комментарий к долгу</label>
                          <input 
                            type="text"
                            className="w-full border border-blue-200 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 dark:text-white"
                            placeholder="Например: Зарплата родителей 15-го числа"
                            value={promiseData.note}
                            onChange={e => setPromiseData({...promiseData, note: e.target.value})}
                          />
                      </div>
                  </div>
                  <div className="p-4 border-t border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-800/50 flex justify-end gap-2 rounded-b-xl">
                      <button onClick={() => setIsPromiseModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-bold">Отмена</button>
                      <button onClick={savePromise} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">Сохранить</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
