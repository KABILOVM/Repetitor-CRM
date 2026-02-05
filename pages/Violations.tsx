
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Violation, Student, Course, Employee, StudentStatus, UserProfile, UserRole } from '../types';
import { AlertTriangle, Plus, X, Save, Search, Filter, User, BookOpen, Calendar as CalendarIcon, ShieldCheck, CheckCircle, ChevronRight, Info } from 'lucide-react';
import { DateRangePicker } from '../components/DateRangePicker';
import { CustomSelect } from '../components/CustomSelect';

export const Violations: React.FC = () => {
  const [violations, setViolations] = useState<Violation[]>(() => storage.get(StorageKeys.VIOLATIONS, []));
  const students = storage.get<Student[]>(StorageKeys.STUDENTS, []);
  const courses = storage.get<Course[]>(StorageKeys.COURSES, []);
  const employees = storage.get<Employee[]>(StorageKeys.EMPLOYEES, []);
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.Admin, fullName: 'Admin', email: '', permissions: [] });

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentResults, setShowStudentResults] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const [newViolation, setNewViolation] = useState<Partial<Violation>>({
      type: 'Поведение',
      date: new Date().toISOString().split('T')[0],
      subject: '',
      reporter: user.fullName 
  });

  const studentSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
          if (studentSearchRef.current && !studentSearchRef.current.contains(e.target as Node)) {
              setShowStudentResults(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter Logic
  const filteredViolations = useMemo(() => {
      return violations.filter(v => {
          const matchesSearch = v.studentName.toLowerCase().includes(searchTerm.toLowerCase());
          const typeToCheck = v.type === 'ДЗ' ? 'Успеваемость' : v.type;
          const matchesType = filterType === 'All' || typeToCheck === filterType;
          return matchesSearch && matchesType;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [violations, searchTerm, filterType]);

  const foundStudents = useMemo(() => {
      if (!studentSearch.trim() || selectedStudent) return [];
      return students.filter(s => 
          s.status === StudentStatus.Active && 
          s.fullName.toLowerCase().includes(studentSearch.toLowerCase())
      ).slice(0, 5);
  }, [studentSearch, students, selectedStudent]);

  const handleSelectStudent = (s: Student) => {
      setSelectedStudent(s);
      setStudentSearch(s.fullName);
      setShowStudentResults(false);
      setNewViolation(prev => ({ ...prev, studentName: s.fullName, studentId: s.id, subject: '' }));
  };

  const handleSave = () => {
      if (!newViolation.studentName || !newViolation.comment) {
          storage.notify('Выберите ученика и укажите комментарий', 'warning');
          return;
      }
      
      const v = { 
          ...newViolation, 
          id: Date.now(), 
          reporter: user.fullName 
      } as Violation;
      
      const updated = [v, ...violations];
      setViolations(updated);
      storage.set(StorageKeys.VIOLATIONS, updated);
      setIsModalOpen(false);
      resetModal();
      storage.notify('Нарушение зафиксировано', 'success');
  };

  const resetModal = () => {
      setSelectedStudent(null);
      setStudentSearch('');
      setNewViolation({ 
          type: 'Поведение', 
          date: new Date().toISOString().split('T')[0],
          subject: '',
          reporter: user.fullName
      });
  };

  return (
    <div className="space-y-6 antialiased font-sans">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Журнал нарушений</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Контроль дисциплины и успеваемости</p>
        </div>
        <button 
            onClick={() => { resetModal(); setIsModalOpen(true); }}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-red-600/20 active:scale-95 text-xs uppercase tracking-widest"
        >
          <Plus size={18} strokeWidth={3} />
          Зафиксировать
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="w-48">
                    <CustomSelect 
                        value={filterType === 'All' ? 'Все типы' : filterType}
                        onChange={(val: string) => setFilterType(val === 'Все типы' ? 'All' : val)}
                        options={['Все типы', 'Опоздание', 'Поведение', 'Успеваемость']}
                        icon={Filter}
                    />
                </div>
            </div>
            <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Поиск по ученику..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all h-[38px]"
                />
            </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
                <thead className="bg-slate-50/30 dark:bg-slate-700/30 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b dark:border-slate-700">
                    <tr>
                        <th className="p-5 px-8">Ученик</th>
                        <th className="p-5">Дата / Автор</th>
                        <th className="p-5">Тип</th>
                        <th className="p-5">Комментарий</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredViolations.map(v => {
                        const displayType = v.type === 'ДЗ' ? 'Успеваемость' : v.type;
                        const reporterObj = employees.find(e => e.fullName === v.reporter);
                        return (
                            <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="p-5 px-8 font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight text-sm">{v.studentName}</td>
                                <td className="p-5 text-sm">
                                    <div className="text-slate-600 dark:text-slate-300 font-bold mb-1 uppercase tracking-tighter">{v.date}</div>
                                    <div className="space-y-0.5">
                                        {v.reporter && <div className="text-[10px] text-slate-400 leading-tight font-medium">зафиксировал: <span className="font-bold">{v.reporter}</span> {reporterObj?.role ? `(${reporterObj.role})` : ''}</div>}
                                        {v.subject && <div className="text-[10px] text-slate-400 leading-tight italic font-medium">курс: <span className="font-bold">{v.subject}</span></div>}
                                    </div>
                                </td>
                                <td className="p-5">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${
                                        v.type === 'Поведение' ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 shadow-sm shadow-red-500/10' :
                                        (v.type === 'ДЗ' || v.type === 'Успеваемость') ? 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800 shadow-sm shadow-orange-500/10' :
                                        'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800 shadow-sm shadow-amber-500/10'
                                    }`}>
                                        <AlertTriangle size={12} strokeWidth={3}/>
                                        {displayType}
                                    </span>
                                </td>
                                <td className="p-5 text-slate-700 dark:text-slate-300 text-sm font-medium leading-relaxed max-w-xs">{v.comment}</td>
                            </tr>
                        );
                    })}
                    {filteredViolations.length === 0 && <tr><td colSpan={4} className="p-12 text-center text-slate-400 text-sm font-medium italic">Нарушений не зафиксировано</td></tr>}
                </tbody>
            </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in zoom-in duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-600/20">
                            <AlertTriangle size={24}/>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white uppercase tracking-tight text-xl">Новое нарушение</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Регистрация дисциплинарного случая</p>
                        </div>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white dark:bg-slate-700 rounded-full shadow-sm">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/20 dark:bg-slate-900/10">
                    <div className="relative" ref={studentSearchRef}>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1 tracking-widest">ФИО Ученика *</label>
                        <div className="relative group">
                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${selectedStudent ? 'text-blue-500' : 'text-slate-400'}`} size={18} />
                            <input 
                                type="text" 
                                value={studentSearch}
                                onChange={(e) => {
                                    setStudentSearch(e.target.value);
                                    setShowStudentResults(true);
                                    if (selectedStudent) setSelectedStudent(null);
                                }}
                                onFocus={() => setShowStudentResults(true)}
                                className={`w-full border-2 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none transition-all ${selectedStudent ? 'border-blue-500 ring-4 ring-blue-500/5' : 'border-slate-100 dark:border-slate-700 focus:border-red-500 focus:ring-4 focus:ring-red-500/5 shadow-sm'}`}
                                placeholder="Начните вводить имя активного ученика..."
                            />
                            {selectedStudent && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 animate-in zoom-in duration-200">
                                    <CheckCircle size={12} strokeWidth={3}/> Выбран
                                </div>
                            )}
                        </div>

                        {showStudentResults && foundStudents.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[20px] shadow-2xl z-[100] p-1.5 animate-in fade-in slide-in-from-top-1 duration-200 ring-1 ring-black/5">
                                {foundStudents.map(s => (
                                    <button 
                                        key={s.id}
                                        onClick={() => handleSelectStudent(s)}
                                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 font-bold text-xs uppercase tracking-tighter shrink-0">{s.fullName.charAt(0)}</div>
                                            <div className="text-left">
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600">{s.fullName}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">{s.branch || 'Все филиалы'}</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-400" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <CustomSelect 
                                label="Тип нарушения *"
                                value={newViolation.type || 'Поведение'}
                                onChange={(val: any) => setNewViolation({...newViolation, type: val as any})}
                                options={['Опоздание', 'Поведение', 'Успеваемость']}
                                icon={AlertTriangle}
                            />
                        </div>
                        <div className="space-y-2">
                             <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-widest">Дата события *</label>
                             <DateRangePicker 
                                startDate={newViolation.date || ''}
                                onChange={(d) => setNewViolation({...newViolation, date: d})}
                                mode="single"
                                className="w-full"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <CustomSelect 
                                label="Курс (из программы ученика)"
                                value={newViolation.subject || ''}
                                onChange={(val: any) => setNewViolation({...newViolation, subject: val})}
                                options={selectedStudent ? (selectedStudent.subjects || []) : []}
                                icon={BookOpen}
                                placeholder={selectedStudent ? "Выберите предмет" : "Сначала выберите ученика"}
                                disabled={!selectedStudent}
                            />
                        </div>
                        <div className="space-y-1.5 opacity-80">
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-widest">Кто выявил (Системно)</label>
                            <div className="flex items-center gap-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl px-4 h-[42px] shadow-inner">
                                <ShieldCheck size={16} className="text-emerald-500" />
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{user.fullName}</span>
                                <span className="text-[10px] text-slate-400 font-bold ml-auto uppercase tracking-tighter">Фикс.</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-widest">Описание ситуации *</label>
                        <textarea
                            value={newViolation.comment || ''}
                            onChange={(e) => setNewViolation({...newViolation, comment: e.target.value})}
                            className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-[24px] p-5 text-sm font-medium h-32 resize-none outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-inner leading-relaxed"
                            placeholder="Опишите обстоятельства нарушения максимально подробно..."
                        ></textarea>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-end items-center gap-4 shrink-0">
                    <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors uppercase tracking-widest">Отмена</button>
                    <button 
                        onClick={handleSave} 
                        disabled={!selectedStudent}
                        className="px-10 py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:grayscale text-white rounded-[20px] font-black shadow-xl shadow-red-500/20 transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                    >
                        <Save size={18} strokeWidth={2.5}/> Сохранить нарушение
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
