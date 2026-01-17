
import React, { useState, useEffect, useMemo } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { CallTask, Student, CallHistoryItem, RetentionLog, AttractionLog, UserRole, UserProfile, Branch, Course } from '../types';
import { Phone, CheckCircle, Clock, Plus, X, Save, Filter, AlertCircle, Calendar, MessageSquare, Tag, RotateCcw, History, PhoneForwarded, User, Users, ClipboardList, Magnet, ArrowRight, Edit2 } from 'lucide-react';
import { StudentProfileModal } from '../components/StudentProfileModal';
import { DateRangePicker } from '../components/DateRangePicker';
import { CustomSelect } from '../components/CustomSelect';

export const Calls: React.FC = () => {
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  const [calls, setCalls] = useState<CallTask[]>(() => storage.get(StorageKeys.CALLS, []));
  const [students, setStudents] = useState<Student[]>(() => storage.get(StorageKeys.STUDENTS, []));
  const [retentionLogs, setRetentionLogs] = useState<RetentionLog[]>(() => storage.get(StorageKeys.RETENTION_LOGS, []));
  const [attractionLogs, setAttractionLogs] = useState<AttractionLog[]>(() => storage.get(StorageKeys.ATTRACTION_LOGS, []));
  const courses = storage.get<Course[]>(StorageKeys.COURSES, []);

  const [activeTab, setActiveTab] = useState<'tasks' | 'retention' | 'attraction'>('tasks');

  // Filter State
  const [filterReason, setFilterReason] = useState<string>('Все');
  const [filterStatus, setFilterStatus] = useState<string>('Все'); // New Status Filter
  
  // Date Filters
  const [dateFilterStart, setDateFilterStart] = useState<string>(new Date().toISOString().slice(0, 7) + '-01'); // Start of month
  const [dateFilterEnd, setDateFilterEnd] = useState<string>(new Date().toISOString().slice(0, 10)); // Today

  // New Task Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState<Partial<CallTask>>({
      status: 'Ожидает',
      date: new Date().toISOString().split('T')[0]
  });

  // Completion Modal State
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completingTask, setCompletingTask] = useState<CallTask | null>(null);
  const [callResult, setCallResult] = useState('');

  // Retention Modal Config
  const RETENTION_METHODS = ["Исходящий звонок", "Входящий звонок", "Визит в центр"];
  const RETENTION_TOPICS = [
      "Пропуски", 
      "Оплата", 
      "Результат экзамена", 
      "Нарушение правил", 
      "Приглашение на 1 урок", 
      "Первичная адаптация", 
      "Слабые результаты"
  ];
  const RETENTION_BRANCHES = ["Ватан", "ЦУМ", "82 мкр"];

  // Retention Modal State
  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false);
  const [newRetention, setNewRetention] = useState<Partial<RetentionLog>>({
      date: new Date().toISOString().split('T')[0],
      method: RETENTION_METHODS[0],
      topic: RETENTION_TOPICS[0],
      branch: RETENTION_BRANCHES[0], // Default
      admin: user.fullName
  });

  // Attraction Modal State
  const [isAttractionModalOpen, setIsAttractionModalOpen] = useState(false);
  const [newAttraction, setNewAttraction] = useState<Partial<AttractionLog>>({
      date: new Date().toISOString().split('T')[0],
      channel: 'Входящий звонок',
      source: 'Instagram',
      branch: user.branch || Branch.Dushanbe_Vatan,
      admin: user.fullName,
      result: 'Подумает'
  });

  // Student Profile Modal State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Quick Results Tags
  const QUICK_RESULTS = [
      "Не берут трубку",
      "Обещали оплатить завтра",
      "Ошиблись номером",
      "Уважительная причина",
      "Перезвонить позже",
      "Номер отключен",
      "Придут разбираться"
  ];

  const ATTRACTION_RESULTS = ['Записался', 'Подумает', 'Отказ', 'Недозвон'];

  // --- Auto-Generate Tasks on Mount ---
  useEffect(() => {
      const today = new Date().toISOString().split('T')[0];
      const newTasks: CallTask[] = [];
      
      const taskExists = (studentId: number, keyword: string) => {
          return calls.some(c => 
              c.studentId === studentId && 
              c.reason.toLowerCase().includes(keyword.toLowerCase()) && 
              (c.status === 'Ожидает' || c.date === today)
          );
      };

      students.forEach(s => {
          // 1. Debtors
          if (s.balance < 0) {
              if (!taskExists(s.id, 'задолженность') && !taskExists(s.id, 'долг')) {
                  newTasks.push({
                      id: Date.now() + Math.random(),
                      studentId: s.id,
                      studentName: s.fullName,
                      studentPhone: s.phone,
                      parentName: s.parentName,
                      parentPhone: s.parentPhone || s.phone,
                      reason: `Задолженность (${s.balance}с.)`,
                      status: 'Ожидает',
                      date: today
                  });
              }
          }

          // 2. Absentees (3+ consecutive)
          if (s.consecutiveAbsences >= 3) {
              if (!taskExists(s.id, 'пропуск')) {
                  newTasks.push({
                      id: Date.now() + Math.random() + 1, // Offset ID
                      studentId: s.id,
                      studentName: s.fullName,
                      studentPhone: s.phone,
                      parentName: s.parentName,
                      parentPhone: s.parentPhone || s.phone,
                      reason: `Пропуски (${s.consecutiveAbsences} подряд)`,
                      status: 'Ожидает',
                      date: today
                  });
              }
          }
      });

      if (newTasks.length > 0) {
          const updated = [...newTasks, ...calls];
          setCalls(updated);
          storage.set(StorageKeys.CALLS, updated);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Handlers ---

  const initiateCompletion = (task: CallTask) => {
      setCompletingTask(task);
      setCallResult(task.result || ''); // Pre-fill result if editing
      setIsCompleteModalOpen(true);
  };

  const saveResult = (shouldCloseTask: boolean) => {
      if (!completingTask) return;
      
      const now = new Date();
      const historyItem: CallHistoryItem = {
          date: now.toISOString().split('T')[0],
          result: callResult || 'Без комментария',
          timestamp: now.toISOString()
      };

      const updated = calls.map(c => {
          if (c.id === completingTask.id) {
              return {
                  ...c,
                  status: shouldCloseTask ? 'Выполнено' as const : 'Ожидает' as const,
                  result: callResult || 'Без комментария',
                  history: [historyItem, ...(c.history || [])]
              };
          }
          return c;
      });
      
      setCalls(updated);
      storage.set(StorageKeys.CALLS, updated);
      setIsCompleteModalOpen(false);
      setCompletingTask(null);
  };

  const handleRestore = (taskId: number) => {
      const updated = calls.map(c => 
          c.id === taskId 
          ? { ...c, status: 'Ожидает' as const } 
          : c
      );
      setCalls(updated);
      storage.set(StorageKeys.CALLS, updated);
  };

  const handleSaveNewTask = () => {
      if (!newTask.studentName || !newTask.reason) {
          alert('Выберите ученика и причину звонка');
          return;
      }

      const student = students.find(s => s.fullName === newTask.studentName);
      
      const task: CallTask = {
          ...newTask,
          id: Date.now(),
          studentId: student?.id || 0,
          studentName: student?.fullName || newTask.studentName || 'Unknown',
          studentPhone: student?.phone,
          parentName: student?.parentName,
          parentPhone: newTask.parentPhone || student?.parentPhone || student?.phone || 'Не указан',
          reason: newTask.reason || '',
          status: newTask.status || 'Ожидает',
          date: newTask.date || new Date().toISOString().split('T')[0]
      };

      const updated = [task, ...calls];
      setCalls(updated);
      storage.set(StorageKeys.CALLS, updated);
      setIsModalOpen(false);
      setNewTask({ status: 'Ожидает', date: new Date().toISOString().split('T')[0] });
  };

  const handleSaveRetention = () => {
      if (!newRetention.studentName || !newRetention.result) {
          alert('ФИО ученика и Итог обязательны');
          return;
      }
      const entry: RetentionLog = {
          ...newRetention as RetentionLog,
          id: Date.now()
      };
      const updated = [entry, ...retentionLogs];
      setRetentionLogs(updated);
      storage.set(StorageKeys.RETENTION_LOGS, updated);
      setIsRetentionModalOpen(false);
      setNewRetention({
          date: new Date().toISOString().split('T')[0],
          method: RETENTION_METHODS[0],
          topic: RETENTION_TOPICS[0],
          branch: RETENTION_BRANCHES[0],
          admin: user.fullName
      });
  };

  const handleSaveAttraction = () => {
      if (!newAttraction.fullName || !newAttraction.phone) {
          alert('ФИО и Телефон обязательны');
          return;
      }
      const entry: AttractionLog = {
          ...newAttraction as AttractionLog,
          id: Date.now()
      };
      const updated = [entry, ...attractionLogs];
      setAttractionLogs(updated);
      storage.set(StorageKeys.ATTRACTION_LOGS, updated);
      setIsAttractionModalOpen(false);
      setNewAttraction({
          date: new Date().toISOString().split('T')[0],
          channel: 'Входящий звонок',
          source: 'Instagram',
          branch: user.branch || Branch.Dushanbe_Vatan,
          admin: user.fullName,
          result: 'Подумает'
      });
  };

  // --- Filtering ---
  const filteredCalls = useMemo(() => {
      return calls.filter(c => {
          // Date Filter
          if (c.date < dateFilterStart || c.date > dateFilterEnd) return false;

          // Status Filter
          if (filterStatus !== 'Все' && c.status !== filterStatus) return false;

          // Reason Filter
          if (filterReason === 'Все') return true;
          const r = c.reason.toLowerCase();
          if (filterReason === 'Долги') return r.includes('долг') || r.includes('задолж') || r.includes('оплат');
          if (filterReason === 'Пропуски') return r.includes('пропуск');
          if (filterReason === 'Другое') return !r.includes('долг') && !r.includes('задолж') && !r.includes('оплат') && !r.includes('пропуск');
          return true;
      });
  }, [calls, filterReason, filterStatus, dateFilterStart, dateFilterEnd]);

  const filteredRetention = useMemo(() => {
      return retentionLogs.filter(log => {
          return log.date >= dateFilterStart && log.date <= dateFilterEnd;
      });
  }, [retentionLogs, dateFilterStart, dateFilterEnd]);

  const filteredAttraction = useMemo(() => {
      return attractionLogs.filter(log => {
          return log.date >= dateFilterStart && log.date <= dateFilterEnd;
      });
  }, [attractionLogs, dateFilterStart, dateFilterEnd]);

  const activeCount = calls.filter(c => c.status === 'Ожидает').length;

  const updateStudent = (updatedStudent: Student) => {
      const updatedList = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
      setStudents(updatedList);
      storage.set(StorageKeys.STUDENTS, updatedList);
  };

  // Helpers for retention modal auto-fill
  const handleRetentionStudentSelect = (name: string) => {
      const s = students.find(st => st.fullName === name);
      if (s) {
          setNewRetention(prev => ({
              ...prev,
              studentName: s.fullName,
              studentId: s.id,
              // Try to pre-fill parent name/phone from the first parent if available
              parentName: s.parents?.[0]?.name || s.parentName,
              phone: s.parents?.[0]?.phone || s.parentPhone || s.phone,
              courses: s.subjects?.join(', ') || s['subject'] || '',
              // branch: s.branch || prev.branch // Don't auto override branch if we want manual selection, or check if branch exists in RETENTION_BRANCHES
          }));
      } else {
          setNewRetention(prev => ({ ...prev, studentName: name }));
      }
  };

  // Helper to get parents for dropdown in Retention Modal
  const retentionStudentData = useMemo(() => {
      return students.find(s => s.fullName === newRetention.studentName);
  }, [newRetention.studentName, students]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Звонки и Журналы</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Управление коммуникациями</p>
        </div>
        <div className="flex gap-2">
            {activeTab === 'tasks' && (
                <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"><Plus size={18} /> Задача</button>
            )}
            {activeTab === 'retention' && (
                <button onClick={() => setIsRetentionModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"><Plus size={18} /> Запись</button>
            )}
            {activeTab === 'attraction' && (
                <button onClick={() => setIsAttractionModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"><Plus size={18} /> Запись</button>
            )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 space-x-6">
          <button 
            onClick={() => setActiveTab('tasks')} 
            className={`py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'tasks' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
              <Phone size={16}/> Задачи (CRM)
              <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full">{activeCount}</span>
          </button>
          <button 
            onClick={() => setActiveTab('retention')} 
            className={`py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'retention' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
              <ClipboardList size={16}/> Удержание
          </button>
          <button 
            onClick={() => setActiveTab('attraction')} 
            className={`py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'attraction' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
              <Magnet size={16}/> Привлечение
          </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[400px]">
        
        {/* --- TASKS VIEW --- */}
        {activeTab === 'tasks' && (
            <>
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 bg-slate-50 dark:bg-slate-800/50">
                    <DateRangePicker startDate={dateFilterStart} endDate={dateFilterEnd} onChange={(s, e) => { setDateFilterStart(s); setDateFilterEnd(e); }} />
                    <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                        <CustomSelect 
                            value={filterStatus}
                            onChange={setFilterStatus}
                            options={['Все', 'Ожидает', 'Выполнено']}
                            label="Статус"
                            className="w-full sm:w-48"
                        />
                        <CustomSelect 
                            value={filterReason}
                            onChange={setFilterReason}
                            options={['Все', 'Долги', 'Пропуски', 'Другое']}
                            label="Тип"
                            icon={Filter}
                            className="w-full sm:w-48"
                        />
                    </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredCalls.map(call => {
                        const r = call.reason.toLowerCase();
                        const isDebt = r.includes('долг') || r.includes('задолж');
                        const isAbsence = r.includes('пропуск');
                        const liveStudent = students.find(s => s.id === call.studentId);
                        const sName = liveStudent?.fullName || call.studentName;
                        const sPhone = liveStudent?.phone || call.studentPhone;
                        const pName = liveStudent?.parentName || call.parentName || 'Родитель';
                        const pPhone = liveStudent?.parentPhone || call.parentPhone;

                        let iconColor = 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
                        if (isDebt) iconColor = 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400';
                        if (isAbsence) iconColor = 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
                        if (call.status === 'Выполнено') iconColor = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';

                        return (
                            <div key={call.id} className={`p-4 sm:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${call.status === 'Выполнено' ? 'opacity-75 bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
                                <div className="flex gap-4 items-start w-full">
                                    <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                                        {call.status === 'Выполнено' ? <CheckCircle size={20}/> : (isDebt ? <AlertCircle size={20}/> : (isAbsence ? <Clock size={20}/> : <Phone size={20} />))}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                                            <button 
                                                onClick={() => liveStudent && setSelectedStudent(liveStudent)}
                                                className={`font-bold text-lg text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 text-left transition-colors ${call.status === 'Выполнено' ? 'line-through decoration-slate-400' : ''}`}
                                            >
                                                {sName}
                                            </button>
                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                <User size={12}/> {sPhone || 'Нет номера'}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 w-fit px-2 py-1 rounded">
                                            <Users size={14} className="text-slate-400"/>
                                            <span className="font-medium">{pName}</span>:
                                            <span className="font-mono text-slate-800 dark:text-slate-200">{pPhone}</span>
                                        </div>
                                        <div className="mt-2 text-sm">
                                            <span className={`${call.status === 'Выполнено' ? 'text-slate-500' : (isDebt ? 'text-rose-600' : isAbsence ? 'text-amber-600' : 'text-blue-600')} font-bold`}>
                                                {call.reason}
                                            </span>
                                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                                <Calendar size={10}/> {call.date}
                                            </div>
                                        </div>
                                        {call.history && call.history.length > 0 && (
                                            <div className="mt-3 space-y-1">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                                    <History size={10}/> История звонков
                                                </div>
                                                {call.history.map((h, idx) => (
                                                    <div key={idx} className="text-xs bg-slate-50 dark:bg-slate-700/50 p-2 rounded border border-slate-100 dark:border-slate-700 flex items-start gap-2 max-w-md">
                                                        <span className="text-slate-400 shrink-0 font-mono text-[10px] pt-0.5">{new Date(h.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                        <span className="text-slate-700 dark:text-slate-300">{h.result}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 self-end sm:self-start sm:mt-1">
                                    {call.status !== 'Выполнено' && (
                                        <button onClick={() => initiateCompletion(call)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-sm whitespace-nowrap">
                                            <Phone size={16} /> <span className="hidden sm:inline">Результат</span>
                                        </button>
                                    )}
                                    {call.status === 'Выполнено' && (
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => initiateCompletion(call)} 
                                                className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                title="Редактировать результат"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded">Завершено</span>
                                            <button onClick={() => handleRestore(call.id)} className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                                                <RotateCcw size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {filteredCalls.length === 0 && <div className="p-10 text-center text-slate-400">Нет задач по выбранному фильтру.</div>}
                </div>
            </>
        )}

        {/* --- RETENTION VIEW --- */}
        {activeTab === 'retention' && (
            <>
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-sm text-slate-500">История звонков действующим ученикам.</div>
                    <DateRangePicker startDate={dateFilterStart} endDate={dateFilterEnd} onChange={(s, e) => { setDateFilterStart(s); setDateFilterEnd(e); }} align="right" />
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-xs uppercase">
                            <tr>
                                <th className="p-4">Дата</th>
                                <th className="p-4">ФИО Ученика</th>
                                <th className="p-4">Тема</th>
                                <th className="p-4">Филиал</th>
                                <th className="p-4">Итог разговора</th>
                                <th className="p-4">Курсы</th>
                                <th className="p-4">Админ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredRetention.sort((a,b) => b.id - a.id).map(log => (
                                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                    <td className="p-4 whitespace-nowrap text-slate-600 dark:text-slate-400">{log.date}</td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800 dark:text-slate-100">{log.studentName}</div>
                                        {log.parentName && <div className="text-xs text-slate-500">Род: {log.parentName}</div>}
                                        <div className="text-xs text-slate-400">{log.phone}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            log.topic === 'Пропуски' ? 'bg-amber-100 text-amber-700' :
                                            log.topic === 'Оплата' ? 'bg-red-100 text-red-700' :
                                            log.topic === 'Слабые результаты' ? 'bg-purple-100 text-purple-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                            {log.topic}
                                        </span>
                                        <div className="text-[10px] text-slate-400 mt-1">{log.method}</div>
                                    </td>
                                    <td className="p-4 text-xs font-bold text-slate-600 dark:text-slate-400">{log.branch}</td>
                                    <td className="p-4 max-w-xs">
                                        <div className="text-slate-700 dark:text-slate-300 font-medium">{log.result}</div>
                                        {log.comment && <div className="text-xs text-slate-500 italic mt-1">{log.comment}</div>}
                                    </td>
                                    <td className="p-4 text-xs text-slate-500 max-w-[150px] truncate">{log.courses}</td>
                                    <td className="p-4 text-xs text-slate-500">{log.admin}</td>
                                </tr>
                            ))}
                            {filteredRetention.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-400">Записей не найдено</td></tr>}
                        </tbody>
                    </table>
                </div>
            </>
        )}

        {/* --- ATTRACTION VIEW --- */}
        {activeTab === 'attraction' && (
            <>
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-sm text-slate-500">Журнал входящих обращений (Лиды).</div>
                    <DateRangePicker startDate={dateFilterStart} endDate={dateFilterEnd} onChange={(s, e) => { setDateFilterStart(s); setDateFilterEnd(e); }} align="right" />
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-xs uppercase">
                            <tr>
                                <th className="p-4">Дата</th>
                                <th className="p-4">ФИО Клиента</th>
                                <th className="p-4">Канал / Источник</th>
                                <th className="p-4">Запрос</th>
                                <th className="p-4">Итог</th>
                                <th className="p-4">Причина / Коммент</th>
                                <th className="p-4">Админ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredAttraction.sort((a,b) => b.id - a.id).map(log => (
                                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                    <td className="p-4 whitespace-nowrap text-slate-600 dark:text-slate-400">{log.date}</td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800 dark:text-slate-100">{log.fullName}</div>
                                        <div className="text-xs text-slate-400">{log.phone}</div>
                                    </td>
                                    <td className="p-4 text-xs">
                                        <div className="font-bold text-slate-600 dark:text-slate-300">{log.channel}</div>
                                        <div className="text-slate-400">{log.source}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-medium">{log.request}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            log.result === 'Записался' ? 'bg-emerald-100 text-emerald-700' :
                                            log.result === 'Отказ' ? 'bg-red-100 text-red-700' :
                                            log.result === 'Подумает' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                                        }`}>
                                            {log.result}
                                        </span>
                                    </td>
                                    <td className="p-4 max-w-xs text-xs">
                                        {log.refusalReason && <div className="text-red-500 mb-1">{log.refusalReason}</div>}
                                        <div className="text-slate-500 italic">{log.comment}</div>
                                    </td>
                                    <td className="p-4 text-xs text-slate-500">{log.admin}</td>
                                </tr>
                            ))}
                            {filteredAttraction.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-400">Записей не найдено</td></tr>}
                        </tbody>
                    </table>
                </div>
            </>
        )}
      </div>

       {/* New Task Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Phone size={18} className="text-blue-600 dark:text-blue-400"/>
                        Новая задача
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Студент</label>
                        <input 
                            type="text" 
                            list="students-list"
                            value={newTask.studentName || ''}
                            onChange={(e) => setNewTask({...newTask, studentName: e.target.value})}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            placeholder="Начните вводить имя..."
                        />
                         <datalist id="students-list">
                            {students.map(s => <option key={s.id} value={s.fullName} />)}
                        </datalist>
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Причина звонка</label>
                        <input type="text" value={newTask.reason || ''} onChange={(e) => setNewTask({...newTask, reason: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" placeholder="Например: Жалоба на поведение" />
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Телефон для связи (опционально)</label>
                        <input type="text" value={newTask.parentPhone || ''} onChange={(e) => setNewTask({...newTask, parentPhone: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" placeholder="+992..." />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Дата</label>
                        <DateRangePicker 
                            startDate={newTask.date || ''}
                            onChange={(d) => setNewTask({...newTask, date: d})}
                            mode="single"
                            className="w-full"
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">Отмена</button>
                    <button onClick={handleSaveNewTask} className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium flex items-center gap-2"><Save size={16} /> Сохранить</button>
                </div>
            </div>
        </div>
      )}

      {/* ... (rest of modals: Completion, Retention, Attraction) ... */}
      {/* Completion Modal */}
      {isCompleteModalOpen && completingTask && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><CheckCircle size={18} className="text-blue-600 dark:text-blue-400"/> Фиксация результата</h3>
                      <button onClick={() => setIsCompleteModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{completingTask.studentName}</p>
                          <p className="text-xs text-slate-500">{completingTask.reason}</p>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Итог разговора</label>
                          <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 h-24 resize-none" placeholder="Напишите результат звонка..." value={callResult} onChange={(e) => setCallResult(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-1"><Tag size={12}/> Быстрые ответы</label>
                          <div className="flex flex-wrap gap-2">
                              {QUICK_RESULTS.map(tag => (
                                  <button key={tag} onClick={() => setCallResult(tag)} className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 border border-slate-200 dark:border-slate-600 rounded-md transition-colors">{tag}</button>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between gap-2">
                      <button onClick={() => saveResult(false)} className="flex-1 px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm transition-colors"><PhoneForwarded size={16} /> Перезвонить</button>
                      <button onClick={() => saveResult(true)} className="flex-1 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm transition-colors"><CheckCircle size={16} /> Вопрос решен</button>
                  </div>
              </div>
          </div>
      )}

      {/* Retention Modal */}
      {isRetentionModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><ClipboardList size={18} className="text-amber-500"/> Запись в журнал удержания</h3>
                      <button onClick={() => setIsRetentionModalOpen(false)}><X size={20} className="text-slate-400"/></button>
                  </div>
                  <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ученик</label>
                          <input type="text" list="retention-students" value={newRetention.studentName} onChange={(e) => handleRetentionStudentSelect(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" placeholder="Выберите ученика..." />
                          <datalist id="retention-students">{students.map(s => <option key={s.id} value={s.fullName}/>)}</datalist>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Филиал</label>
                              <CustomSelect 
                                value={newRetention.branch || ''} 
                                onChange={(val) => setNewRetention({...newRetention, branch: val})}
                                options={RETENTION_BRANCHES}
                                placeholder="Выберите"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Способ</label>
                              <CustomSelect 
                                value={newRetention.method || ''} 
                                onChange={(val) => setNewRetention({...newRetention, method: val})}
                                options={RETENTION_METHODS}
                                placeholder="Выберите"
                              />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Тема разговора</label>
                          <CustomSelect 
                            value={newRetention.topic || ''} 
                            onChange={(val) => setNewRetention({...newRetention, topic: val})}
                            options={RETENTION_TOPICS}
                            placeholder="Выберите"
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-1">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ответственные лица</label>
                              {retentionStudentData && retentionStudentData.parents && retentionStudentData.parents.length > 0 ? (
                                  <CustomSelect 
                                      value={newRetention.parentName || ''}
                                      onChange={(val) => {
                                          const parent = retentionStudentData.parents?.find(p => p.name === val);
                                          setNewRetention({
                                              ...newRetention, 
                                              parentName: val,
                                              phone: parent?.phone || newRetention.phone 
                                          });
                                      }}
                                      options={retentionStudentData.parents.map(p => p.name)}
                                      placeholder="Выберите..."
                                  />
                              ) : (
                                  <input 
                                      type="text" 
                                      value={newRetention.parentName || ''} 
                                      onChange={e => setNewRetention({...newRetention, parentName: e.target.value})} 
                                      className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
                                      placeholder="ФИО Родителя"
                                  />
                              )}
                          </div>
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Телефон</label><input type="text" value={newRetention.phone || ''} onChange={e => setNewRetention({...newRetention, phone: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" /></div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Итог разговора *</label>
                          <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 h-20 resize-none" value={newRetention.result || ''} onChange={e => setNewRetention({...newRetention, result: e.target.value})} placeholder="Обязательно к заполнению" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Комментарии</label>
                          <input type="text" value={newRetention.comment || ''} onChange={e => setNewRetention({...newRetention, comment: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
                      </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2">
                      <button onClick={() => setIsRetentionModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Отмена</button>
                      <button onClick={handleSaveRetention} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Сохранить</button>
                  </div>
              </div>
          </div>
      )}

      {/* Attraction Modal */}
      {isAttractionModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Magnet size={18} className="text-emerald-500"/> Запись в журнал привлечения</h3>
                      <button onClick={() => setIsAttractionModalOpen(false)}><X size={20} className="text-slate-400"/></button>
                  </div>
                  <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">ФИО Клиента *</label><input type="text" value={newAttraction.fullName || ''} onChange={e => setNewAttraction({...newAttraction, fullName: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" /></div>
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Номер *</label><input type="text" value={newAttraction.phone || ''} onChange={e => setNewAttraction({...newAttraction, phone: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Канал прихода</label>
                              <CustomSelect 
                                value={newAttraction.channel || ''} 
                                onChange={(val) => setNewAttraction({...newAttraction, channel: val})}
                                options={['Визит в центр', 'Входящий звонок', 'Instagram', 'Сайт', 'Рекомендация']}
                                placeholder="Выберите"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Источник</label>
                              <CustomSelect 
                                value={newAttraction.source || ''} 
                                onChange={(val) => setNewAttraction({...newAttraction, source: val})}
                                options={storage.getCompanyConfig().dictionaries.sources}
                                placeholder="Выберите"
                              />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Запрос (Предмет)</label>
                          <CustomSelect 
                            value={newAttraction.request || ''} 
                            onChange={(val) => setNewAttraction({...newAttraction, request: val})}
                            options={[...courses.map(c => c.name), 'Другое']}
                            placeholder="Выберите предмет..."
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Итог консультации</label>
                              <CustomSelect 
                                value={newAttraction.result || ''} 
                                onChange={(val) => setNewAttraction({...newAttraction, result: val as any})}
                                options={ATTRACTION_RESULTS}
                                placeholder="Выберите"
                              />
                          </div>
                          {newAttraction.result === 'Отказ' && (
                              <div><label className="block text-xs font-bold text-red-500 uppercase mb-1">Причина отказа</label><input type="text" value={newAttraction.refusalReason || ''} onChange={e => setNewAttraction({...newAttraction, refusalReason: e.target.value})} className="w-full border border-red-300 dark:border-red-800 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" /></div>
                          )}
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Комментарии</label>
                          <input type="text" value={newAttraction.comment || ''} onChange={e => setNewAttraction({...newAttraction, comment: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
                      </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2">
                      <button onClick={() => setIsAttractionModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Отмена</button>
                      <button onClick={handleSaveAttraction} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Сохранить</button>
                  </div>
              </div>
          </div>
      )}

      {/* Student Profile Modal */}
      {selectedStudent && (
          <StudentProfileModal 
            student={selectedStudent} 
            onClose={() => setSelectedStudent(null)} 
            onSave={(updatedStudent) => {
                updateStudent(updatedStudent);
                setSelectedStudent(null);
            }} 
          />
      )}
    </div>
  );
};
