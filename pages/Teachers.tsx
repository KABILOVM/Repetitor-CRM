
import React, { useState } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Teacher } from '../types';
import { Mail, Phone, MoreHorizontal, Plus, X, Save, Trash2, User, BookOpen } from 'lucide-react';

export const Teachers: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>(() => storage.get(StorageKeys.TEACHERS, []));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Partial<Teacher> | null>(null);

  const handleAddNew = () => {
    setEditingTeacher({});
    setIsModalOpen(true);
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher({ ...teacher });
    setIsModalOpen(true);
  };

  const handleDelete = () => {
    if (!editingTeacher?.id) return;
    if (confirm('Удалить преподавателя?')) {
        const updated = teachers.filter(t => t.id !== editingTeacher.id);
        setTeachers(updated);
        storage.set(StorageKeys.TEACHERS, updated);
        setIsModalOpen(false);
        setEditingTeacher(null);
    }
  };

  const handleSave = () => {
    if (!editingTeacher?.fullName || !editingTeacher?.subject) {
        alert('Заполните ФИО и Предмет');
        return;
    }

    let updated: Teacher[];
    if (editingTeacher.id) {
        updated = teachers.map(t => t.id === editingTeacher.id ? { ...t, ...editingTeacher } as Teacher : t);
    } else {
        const newTeacher = { 
            ...editingTeacher, 
            id: Date.now(),
            phone: editingTeacher.phone || '',
            email: editingTeacher.email || '' 
        } as Teacher;
        updated = [...teachers, newTeacher];
    }
    setTeachers(updated);
    storage.set(StorageKeys.TEACHERS, updated);
    setIsModalOpen(false);
    setEditingTeacher(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Преподаватели</h2>
        <button 
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} />
          Добавить
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Преподаватель</th>
                <th className="p-4 font-medium">Предмет</th>
                <th className="p-4 font-medium">Телефон</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {teachers.map(teacher => (
                <tr key={teacher.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer" onClick={() => handleEdit(teacher)}>
                  <td className="p-4 font-medium text-slate-800 dark:text-slate-100">{teacher.fullName}</td>
                  <td className="p-4">
                      <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs font-semibold">
                          {teacher.subject}
                      </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                        <Phone size={14} className="text-slate-400 dark:text-slate-500" />
                        {teacher.phone || '-'}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                        <Mail size={14} className="text-slate-400 dark:text-slate-500" />
                        {teacher.email || '-'}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && (
                  <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400">
                          Список преподавателей пуст. Добавьте преподавателя.
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && editingTeacher && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <User size={18} className="text-blue-600 dark:text-blue-400"/>
                        {editingTeacher.id ? 'Редактировать' : 'Новый преподаватель'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">ФИО Преподавателя *</label>
                        <input 
                            type="text" 
                            value={editingTeacher.fullName || ''}
                            onChange={(e) => setEditingTeacher({...editingTeacher, fullName: e.target.value})}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                            placeholder="Иванов Иван Иванович"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Предмет *</label>
                        <input 
                            type="text" 
                            value={editingTeacher.subject || ''}
                            onChange={(e) => setEditingTeacher({...editingTeacher, subject: e.target.value})}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                            placeholder="Математика"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Телефон</label>
                            <input 
                                type="text" 
                                value={editingTeacher.phone || ''}
                                onChange={(e) => setEditingTeacher({...editingTeacher, phone: e.target.value})}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email</label>
                            <input 
                                type="email" 
                                value={editingTeacher.email || ''}
                                onChange={(e) => setEditingTeacher({...editingTeacher, email: e.target.value})}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between">
                     {editingTeacher.id ? (
                        <button onClick={handleDelete} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                            Удалить
                        </button>
                     ) : <div></div>}
                    <div className="flex gap-2">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">Отмена</button>
                        <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium flex items-center gap-2">
                            <Save size={16} /> Сохранить
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
