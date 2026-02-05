
import React, { useState, useEffect } from 'react';
import { X, Wallet, Banknote, CreditCard, Landmark, HelpCircle, Check, PencilLine, Calendar, ChevronRight, Search, User, RotateCcw, Pencil } from 'lucide-react';
import { Student, Transaction, Invoice, UserProfile, UserRole } from '../types';
import { storage, StorageKeys } from '../services/storage';
import { DateRangePicker } from './DateRangePicker';
import { useData } from '../hooks/useData';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetStudent: Student | null;
  setTargetStudent?: (student: Student | null) => void;
  isRefundInitial?: boolean;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  targetStudent,
  setTargetStudent,
  isRefundInitial = false
}) => {
  const [user] = useData<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.Admin, fullName: '', email: '', permissions: [] });
  const [students, setStudents] = useData<Student[]>(StorageKeys.STUDENTS, []);
  const [transactions, setTransactions] = useData<Transaction[]>(StorageKeys.TRANSACTIONS, []);
  const [invoices, setInvoices] = useData<Invoice[]>(StorageKeys.INVOICES, []);

  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState('Наличные');
  const [customMethod, setCustomMethod] = useState('');
  const [isRefund, setIsRefund] = useState(isRefundInitial);
  const [refundReason, setRefundReason] = useState('');
  const [promiseDate, setPromiseDate] = useState('');
  const [promiseReason, setPromiseReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsRefund(isRefundInitial);
      if (targetStudent) {
        const debt = Number(targetStudent.balance) < 0 ? Math.abs(Number(targetStudent.balance)) : 0;
        setAmount(!isRefundInitial ? debt : 0);
        setRefundReason('');
        setCustomMethod('');
        setMethod('Наличные');
      } else {
        setAmount(0);
        setSearchQuery('');
        setRefundReason('');
      }
    }
  }, [isOpen, targetStudent, isRefundInitial]);

  if (!isOpen) return null;

  const handlePaymentSubmit = () => {
    if (!targetStudent || amount <= 0) return;
    if (method === 'Другое' && !customMethod.trim()) {
        storage.notify('Укажите способ оплаты', 'warning');
        return;
    }

    const finalAmount = Number(amount);
    const type = isRefund ? 'Refund' : 'Payment';
    const finalMethod = method === 'Другое' ? (customMethod || 'Другое') : method;
    
    let purpose = isRefund 
      ? `Возврат средств (${finalMethod})` 
      : `Оплата за обучение (${finalMethod})`;
    
    if (isRefund && refundReason.trim()) {
      purpose += `: ${refundReason.trim()}`;
    }

    const newTransaction: Transaction = {
        id: Date.now(),
        studentId: targetStudent.id,
        studentName: targetStudent.fullName,
        amount: finalAmount,
        date: new Date().toISOString().split('T')[0],
        type: type,
        purpose: purpose,
        paymentMethod: finalMethod,
        createdBy: user.fullName
    };

    const balanceChange = isRefund ? -finalAmount : finalAmount;
    
    const updatedStudentsList = students.map(s => {
        if (Number(s.id) === Number(targetStudent.id)) {
            const currentBalance = Number(s.balance) || 0;
            const newBalance = currentBalance + balanceChange;
            return { 
                ...s, 
                balance: newBalance,
                debtPromise: (!isRefund && newBalance < 0 && promiseReason) ? promiseReason : (newBalance >= 0 ? undefined : s.debtPromise),
                debtPromiseDeadline: (!isRefund && newBalance < 0 && promiseDate) ? promiseDate : (newBalance >= 0 ? undefined : s.debtPromiseDeadline)
            };
        }
        return s;
    });

    let updatedInvoicesList = [...invoices];
    if (type === 'Payment') {
        let remainingPayment = finalAmount;
        const studentInvoices = updatedInvoicesList
            .filter(inv => Number(inv.studentId) === Number(targetStudent.id) && inv.status === 'Ожидает')
            .sort((a, b) => a.month.localeCompare(b.month));

        for (const inv of studentInvoices) {
            if (remainingPayment >= inv.amount) {
                updatedInvoicesList = updatedInvoicesList.map(i => i.id === inv.id ? { ...i, status: 'Оплачен' } : i);
                remainingPayment -= inv.amount;
            } else {
                break;
            }
        }
    }

    setTransactions([newTransaction, ...transactions]);
    setStudents(updatedStudentsList);
    setInvoices(updatedInvoicesList);
    
    storage.notify(isRefund ? 'Возврат оформлен' : 'Оплата принята', 'success');
    onClose();
  };

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  const themeColor = isRefund ? '#f43f5e' : '#10b981';
  const headerBg = isRefund ? '#fff1f2' : '#f0fdf4';
  const activeBtnBg = isRefund ? '#fff1f2' : '#f0fdf4';
  
  const confirmBtnColor = isRefund ? '#e11d48' : '#10b981';

  return (
    <div className="fixed inset-0 bg-black/60 z-[500] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            {/* Header */}
            <div className={`p-4 border-b border-emerald-50 dark:border-slate-700 flex justify-between items-center transition-colors`} style={{ backgroundColor: headerBg }}>
                <div className="flex items-center gap-3">
                    {isRefund ? <RotateCcw style={{ color: themeColor }} size={22} /> : <Wallet style={{ color: themeColor }} size={22} />}
                    <h3 className="font-bold text-lg" style={{ color: isRefund ? '#991b1b' : '#1e4d3a' }}>
                        {isRefund ? 'Оформление возврата' : 'Прием оплаты'}
                    </h3>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={24} />
                </button>
            </div>
            
            <div className="p-6 space-y-6">
                {!targetStudent ? (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input 
                                type="text" 
                                autoFocus
                                placeholder="Поиск ученика..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-blue-500 transition-all"
                            />
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {filteredStudents.map(s => (
                                <button 
                                    key={s.id}
                                    onClick={() => setTargetStudent?.(s)}
                                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 hover:border-blue-500 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                                            <User size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-slate-800 dark:text-white text-sm">{s.fullName}</p>
                                            <p className={`text-[10px] font-bold ${Number(s.balance) < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>Баланс: {s.balance} с.</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-slate-200 group-hover:text-blue-500" />
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Student Info Card */}
                        <div className="bg-[#f8fafc] dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-xl p-5 relative">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white text-lg">{targetStudent.fullName}</h4>
                                    <p className="text-slate-400 text-xs font-medium mt-1">
                                        {targetStudent.subjects?.join(', ') || 'Предметы не указаны'}
                                    </p>
                                    <p className={`text-sm font-bold mt-2 ${Number(targetStudent.balance) < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        Баланс: {targetStudent.balance} с.
                                    </p>
                                </div>
                                {setTargetStudent && (
                                    <button 
                                        onClick={() => setTargetStudent(null)}
                                        className="text-[10px] font-bold text-blue-600 hover:underline"
                                    >
                                        Сменить
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Amount Input */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 tracking-widest ml-1">Сумма {isRefund ? 'возврата' : 'оплаты'}</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">с.</div>
                                <input 
                                    type="number" 
                                    autoFocus
                                    value={amount || ''}
                                    onChange={e => setAmount(Number(e.target.value))}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 border-2 rounded-xl text-3xl font-bold text-slate-700 dark:text-white focus:outline-none transition-all"
                                    style={{ borderColor: themeColor }}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Payment Methods */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 tracking-widest ml-1">Способ {isRefund ? 'выплаты' : 'оплаты'}</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { id: 'Наличные', icon: Banknote, label: 'Наличные' },
                                    { id: 'Алиф', icon: CreditCard, label: 'Алиф' },
                                    { id: 'DC', icon: Landmark, label: 'DC' },
                                    { id: 'Другое', icon: HelpCircle, label: 'Другое' }
                                ].map((m) => (
                                    <button 
                                        key={m.id} 
                                        onClick={() => setMethod(m.id)}
                                        className={`flex flex-col items-center justify-center py-3 px-1 rounded-xl border-2 transition-all gap-1.5 ${
                                            method === m.id 
                                            ? 'border-current' 
                                            : 'border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800'
                                        }`}
                                        style={{ 
                                            borderColor: method === m.id ? themeColor : undefined,
                                            backgroundColor: method === m.id ? activeBtnBg : undefined,
                                            color: method === m.id ? themeColor : undefined
                                        }}
                                    >
                                        <m.icon size={20} />
                                        <span className="text-[10px] font-bold">{m.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Method Input */}
                        {method === 'Другое' && (
                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                <label className="block text-[10px] font-bold text-slate-500 tracking-widest ml-1">Укажите способ оплаты / Банк</label>
                                <div className="relative">
                                    <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input 
                                        type="text" 
                                        autoFocus
                                        value={customMethod}
                                        onChange={e => setCustomMethod(e.target.value)}
                                        placeholder="Напр. Хумо, Спитамен, Перевод..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Refund Reason Section (Only for Refunds) */}
                        {isRefund && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="block text-[10px] font-bold text-slate-500 tracking-widest ml-1">Причина возврата</label>
                                <textarea 
                                    value={refundReason} 
                                    onChange={(e) => setRefundReason(e.target.value)} 
                                    className="w-full border-2 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none transition-all h-24 resize-none focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-900/30"
                                    style={{ borderColor: themeColor }}
                                    placeholder="Укажите причину (например: Уход из центра, Переплата...)"
                                />
                            </div>
                        )}

                        {/* Promise Section (Only for Payments) */}
                        {!isRefund && (Number(targetStudent.balance) + amount) < 0 && (
                            <div className="bg-[#f0f9ff] dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-900/30 space-y-4">
                                <h4 className="font-bold text-[#1d4ed8] dark:text-blue-400 text-sm flex items-center gap-2">
                                    <PencilLine size={18}/> Обещание оплаты (Расписка)
                                </h4>
                                <div>
                                    <label className="block text-[9px] font-bold text-blue-500 uppercase mb-1 tracking-wider">Обещанная дата оплаты</label>
                                    <DateRangePicker 
                                        startDate={promiseDate} 
                                        onChange={(d) => setPromiseDate(d)} 
                                        mode="single" 
                                        className="w-full" 
                                        direction="up" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-blue-500 uppercase mb-1 tracking-wider">Комментарий к долгу</label>
                                    <input 
                                        type="text" 
                                        placeholder="Например: Зарплата родителей" 
                                        value={promiseReason} 
                                        onChange={(e) => setPromiseReason(e.target.value)} 
                                        className="w-full border border-blue-200 dark:border-blue-800 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 text-slate-700 outline-none focus:ring-2 focus:ring-blue-400" 
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900/50 flex justify-between items-center">
                <button 
                    onClick={onClose} 
                    className="text-slate-500 font-bold text-sm hover:text-slate-700 px-4 py-2 transition-colors"
                >
                    Отмена
                </button>
                <button 
                    onClick={handlePaymentSubmit}
                    disabled={!targetStudent || amount <= 0 || (method === 'Другое' && !customMethod.trim())}
                    className="disabled:opacity-40 text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 uppercase tracking-widest text-[11px]"
                    style={{ 
                        backgroundColor: confirmBtnColor,
                        boxShadow: `0 10px 20px -5px ${isRefund ? 'rgba(225,29,72,0.3)' : 'rgba(16,185,129,0.3)'}`
                    }}
                >
                    {isRefund ? <RotateCcw size={18} /> : <Check size={18} strokeWidth={3} />}
                    {isRefund ? 'ОФОРМИТЬ ВОЗВРАТ' : 'ПОДТВЕРДИТЬ ОПЛАТУ'}
                </button>
            </div>
        </div>
    </div>
  );
};
