
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
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Нарушения</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Дисциплинарный журнал</p>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} />
          Зафиксировать нарушение
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 shadow-sm flex-1 sm:flex-none">
                    <Filter size={14} className="text-slate-400 mr-2"/>
                    <select 
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="bg-transparent text-sm py-2 outline-none text-slate-700 dark:text-slate-300 cursor-pointer min-w-[120px]"
                    >
                        <option value="All">Все типы</option>
                        <option value="Опоздание">Опоздание</option>
                        <option value="Поведение">Поведение</option>
                        <option value="Успеваемость">Успеваемость</option>
                    </select>
                </div>
            </div>
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Поиск по имени..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 text-xs uppercase">
                    <tr>
                        <th className="p-4">Ученик</th>
                        <th className="p-4">Дата</th>
                        <th className="p-4">Тип</th>
                        <th className="p-4">Комментарий</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredViolations.map(v => {
                        const displayType = v.type === 'ДЗ' ? 'Успеваемость' : v.type;
                        return (
                            <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="p-4 font-medium text-slate-800 dark:text-slate-100">
                                    {v.studentName}
                                    {(v.subject || v.reporter) && (
                                        <div className="text-[10px] text-slate-400 mt-1 flex gap-2">
                                            {v.subject && <span>{v.subject}</span>}
                                            {v.reporter && <span>(от: {v.reporter.split(' ')[0]})</span>}
                                        </div>
                                    )}
                                </td>
                                <td className="p-4 text-slate-500 dark:text-slate-400 text-sm">{v.date}</td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border ${
                                        v.type === 'Поведение' ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' :
                                        (v.type === 'ДЗ' || v.type === 'Успеваемость') ? 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800' :
                                        'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                                    }`}>
                                        <AlertTriangle size={12} />
                                        {displayType}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">{v.comment}</td>
                            </tr>
                        );
                    })}
                    {filteredViolations.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400">Нарушений не найдено.</td></tr>}
                </tbody>
            </table>
        </div>
      </div>

       {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <AlertTriangle size={18} className="text-red-600 dark:text-red-400"/>
                        Новое нарушение
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Студент</label>
                        <input 
                            type="text" 
                            list="students-list"
                            value={newViolation.studentName || ''}
                            onChange={(e) => setNewViolation({...newViolation, studentName: e.target.value})}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            placeholder="Начните вводить имя..."
                        />
                         <datalist id="students-list">
                            {students.map(s => <option key={s.id} value={s.fullName} />)}
                        </datalist>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Тип</label>
                            <select 
                                value={newViolation.type}
                                onChange={(e) => setNewViolation({...newViolation, type: e.target.value as any})}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            >
                                <option value="Опоздание">Опоздание</option>
                                <option value="Поведение">Поведение</option>
                                <option value="Успеваемость">Успеваемость</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Дата</label>
                            <DateRangePicker 
                                startDate={newViolation.date || ''}
                                onChange={(d) => setNewViolation({...newViolation, date: d})}
                                mode="single"
                                className="w-full"
                            />
                        </div>
                    </div>
                    
                    {/* NEW FIELDS: Subject & Reporter */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Предмет (опц.)</label>
                            <input
                                list="subjects-list"
                                type="text"
                                value={newViolation.subject || ''}
                                onChange={(e) => setNewViolation({...newViolation, subject: e.target.value})}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                placeholder="Химия..."
                            />
                            <datalist id="subjects-list">
                                {courses.map(c => <option key={c.id} value={c.name} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Кто зафиксировал</label>
                            <input 
                                list="reporters-list"
                                type="text"
                                value={newViolation.reporter || ''}
                                onChange={(e) => setNewViolation({...newViolation, reporter: e.target.value})}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                placeholder="Учитель..."
                            />
                            <datalist id="reporters-list">
                                {employees.map(e => <option key={e.id} value={e.fullName} />)}
                            </datalist>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Комментарий</label>
                        <textarea
                            value={newViolation.comment || ''}
                            onChange={(e) => setNewViolation({...newViolation, comment: e.target.value})}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm h-20 resize-none focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        ></textarea>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">Отмена</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium flex items-center gap-2">
                        <Save size={16} /> Сохранить
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
