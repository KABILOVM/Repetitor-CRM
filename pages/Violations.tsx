import React, { useState, useMemo } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Violation, Student, Course, Employee } from '../types';
import { AlertTriangle, Plus, X, Save, Search, Filter } from 'lucide-react';
import { DateRangePicker } from '../components/DateRangePicker';

export const Violations: React.FC = () => {
  const [violations, setViolations] = useState<Violation[]>(() => storage.get(StorageKeys.VIOLATIONS, []));
  const students = storage.get<Student[]>(StorageKeys.STUDENTS, []);
  const courses = storage.get<Course[]>(StorageKeys.COURSES, []);
  const employees = storage.get<Employee[]>(StorageKeys.EMPLOYEES, []);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newViolation, setNewViolation] = useState<Partial<Violation>>({
      type: 'Поведение',
      date: new Date().toISOString().split('T')[0],
      subject: '',
      reporter: ''
  });

  // Filter Logic
  const filteredViolations = useMemo(() => {
      return violations.filter(v => {
          const matchesSearch = v.studentName.toLowerCase().includes(searchTerm.toLowerCase());
          const typeToCheck = v.type === 'ДЗ' ? 'Успеваемость' : v.type;
          const matchesType = filterType === 'All' || typeToCheck === filterType;
          return matchesSearch && matchesType;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [violations, searchTerm, filterType]);

  const handleSave = () => {
      if (!newViolation.studentName || !newViolation.comment) {
          alert('Выберите студента и укажите комментарий');
          return;
      }
      
      // Find student ID based on name if not already set (for better data integrity)
      const student = students.find(s => s.fullName === newViolation.studentName);
      const studentId = student ? student.id : (newViolation.studentId || 0);

      const v = { ...newViolation, id: Date.now(), studentId } as Violation;
      const updated = [v, ...violations];
      setViolations(updated);
      storage.set(StorageKeys.VIOLATIONS, updated);
      setIsModalOpen(false);
      setNewViolation({ 
          type: 'Поведение', 
          date: new Date().toISOString().split('T')[0],
          subject: '',
          reporter: ''
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Журнал нарушений</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Контроль дисциплины и успеваемости</p>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-red-600/20 active:scale-95 text-xs uppercase tracking-widest"
        >
          <Plus size={18} />
          Зафиксировать
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        {/* Filters */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm flex-1 sm:flex-none">
                    <Filter size={16} className="text-slate-400 mr-2"/>
                    <select 
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="bg-transparent text-xs font-bold py-1.5 outline-none text-slate-700 dark:text-slate-300 cursor-pointer min-w-[140px] uppercase tracking-widest"
                    >
                        <option value="All">Все типы</option>
                        <option value="Опоздание">Опоздание</option>
                        <option value="Поведение">Поведение</option>
                        <option value="Успеваемость">Успеваемость</option>
                    </select>
                </div>
            </div>
            <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Поиск..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all uppercase tracking-tighter"
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
                                <td className="p-5 px-8 font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight text-sm">
                                    {v.studentName}
                                </td>
                                <td className="p-5 text-sm">
                                    <div className="text-slate-600 dark:text-slate-300 font-bold mb-1 uppercase tracking-tighter">{v.date}</div>
                                    <div className="space-y-0.5">
                                        {v.reporter && (
                                            <div className="text-[10px] text-slate-400 leading-tight font-medium">
                                                зафиксировал: <span className="font-bold">{v.reporter}</span> {reporterObj?.role ? `(${reporterObj.role})` : ''}
                                            </div>
                                        )}
                                        {v.subject && (
                                            <div className="text-[10px] text-slate-400 leading-tight italic font-medium">
                                                предмет: <span className="font-bold">{v.subject}</span>
                                            </div>
                                        )}
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

       {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in zoom-in duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tight text-xl">
                        <AlertTriangle size={22} className="text-red-600 dark:text-red-400"/>
                        Новое нарушение
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white dark:bg-slate-700 rounded-full shadow-sm">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 tracking-widest">ФИО Ученика *</label>
                        <input 
                            type="text" 
                            list="students-list"
                            value={newViolation.studentName || ''}
                            onChange={(e) => setNewViolation({...newViolation, studentName: e.target.value})}
                            className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 shadow-sm"
                            placeholder="Начните вводить..."
                        />
                         <datalist id="students-list">
                            {students.map(s => <option key={s.id} value={s.fullName} />)}
                        </datalist>
                    </div>
                     <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 tracking-widest">Тип нарушения</label>
                            <select 
                                value={newViolation.type}
                                onChange={(e) => setNewViolation({...newViolation, type: e.target.value as any})}
                                className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                            >
                                <option value="Опоздание">Опоздание</option>
                                <option value="Поведение">Поведение</option>
                                <option value="Успеваемость">Успеваемость</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 tracking-widest">Дата события</label>
                            <DateRangePicker 
                                startDate={newViolation.date || ''}
                                onChange={(d) => setNewViolation({...newViolation, date: d})}
                                mode="single"
                                className="w-full"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 tracking-widest">Урок (опц.)</label>
                            <input
                                list="subjects-list"
                                type="text"
                                value={newViolation.subject || ''}
                                onChange={(e) => setNewViolation({...newViolation, subject: e.target.value})}
                                className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm"
                                placeholder="Напр. Химия"
                            />
                            <datalist id="subjects-list">
                                {courses.map(c => <option key={c.id} value={c.name} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 tracking-widest">Кто выявил</label>
                            <input 
                                list="reporters-list"
                                type="text" 
                                value={newViolation.reporter || ''}
                                onChange={(e) => setNewViolation({...newViolation, reporter: e.target.value})}
                                className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm"
                                placeholder="Имя учителя..."
                            />
                            <datalist id="reporters-list">
                                {employees.map(e => <option key={e.id} value={e.fullName} />)}
                            </datalist>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 tracking-widest">Описание ситуации *</label>
                        <textarea
                            value={newViolation.comment || ''}
                            onChange={(e) => setNewViolation({...newViolation, comment: e.target.value})}
                            className="w-full border border-slate-200 dark:border-slate-700 rounded-3xl p-5 text-sm font-medium h-32 resize-none outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                            placeholder="Опишите обстоятельства нарушения..."
                        ></textarea>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 flex justify-end gap-3 rounded-b-3xl shrink-0">
                    <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors uppercase tracking-widest">Отмена</button>
                    <button onClick={handleSave} className="px-10 py-3 text-xs bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-red-500/20 transition-all active:scale-95 uppercase tracking-widest">
                        <Save size={18} strokeWidth={3}/> Сохранить
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};