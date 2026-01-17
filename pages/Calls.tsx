import React, { useState, useMemo } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { AttractionLog, RetentionLog, Student, UserProfile, UserRole } from '../types';
import { Phone, UserPlus, UserCheck, Search, Plus, Save, Filter, X, Megaphone, Repeat, MessageSquare } from 'lucide-react';
import { CustomSelect } from '../components/CustomSelect';
import { DateRangePicker } from '../components/DateRangePicker';
import { useData } from '../hooks/useData';

export const Calls: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'attraction' | 'retention'>('attraction');
  
  // Data
  const [attractionLogs, setAttractionLogs] = useData<AttractionLog[]>(StorageKeys.ATTRACTION_LOGS, []);
  const [retentionLogs, setRetentionLogs] = useData<RetentionLog[]>(StorageKeys.RETENTION_LOGS, []);
  const [students] = useData<Student[]>(StorageKeys.STUDENTS, []);
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.Admin, fullName: 'Admin', email: '', permissions: [] });

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResult, setFilterResult] = useState('All');

  // Modal State
  const [isAttractionModalOpen, setIsAttractionModalOpen] = useState(false);
  const [newAttraction, setNewAttraction] = useState<Partial<AttractionLog>>({
      date: new Date().toISOString().split('T')[0],
      channel: 'Instagram',
      result: 'Подумает',
      admin: user.fullName,
      branch: user.branch || 'Главный'
  });

  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false);
  const [newRetention, setNewRetention] = useState<Partial<RetentionLog>>({
      date: new Date().toISOString().split('T')[0],
      method: 'Звонок',
      result: 'Дозвонился',
      admin: user.fullName,
      branch: user.branch || 'Главный'
  });
  const [retentionStudentData, setRetentionStudentData] = useState<Student | null>(null);

  // Logic for Retention Student Selection
  const handleStudentSelect = (studentName: string) => {
      const student = students.find(s => s.fullName === studentName);
      if (student) {
          setRetentionStudentData(student);
          setNewRetention(prev => ({
              ...prev,
              studentName: student.fullName,
              parentName: student.parents?.[0]?.name || student.parentName,
              phone: student.parents?.[0]?.phone || student.parentPhone || student.phone,
              courses: student.subjects?.join(', ') || student['subject']
          }));
      } else {
          setRetentionStudentData(null);
          setNewRetention(prev => ({ ...prev, studentName: studentName }));
      }
  };

  const handleSaveAttraction = () => {
      if (!newAttraction.fullName || !newAttraction.phone) {
          alert('Заполните Имя и Телефон');
          return;
      }
      const log: AttractionLog = {
          ...newAttraction,
          id: Date.now(),
          admin: user.fullName,
          branch: user.branch || 'Главный',
          source: newAttraction.source || 'Входящий',
          request: newAttraction.request || '',
          result: newAttraction.result as any || 'Подумает'
      } as AttractionLog;

      setAttractionLogs([log, ...attractionLogs]);
      setIsAttractionModalOpen(false);
      setNewAttraction({
          date: new Date().toISOString().split('T')[0],
          channel: 'Instagram',
          result: 'Подумает',
          admin: user.fullName
      });
  };

  const handleSaveRetention = () => {
      if (!newRetention.studentName || !newRetention.topic) {
          alert('Выберите ученика и укажите тему');
          return;
      }
      const log: RetentionLog = {
          ...newRetention,
          id: Date.now(),
          admin: user.fullName,
          branch: user.branch || 'Главный',
          phone: newRetention.phone || '',
          method: newRetention.method || 'Звонок',
          topic: newRetention.topic || '',
          result: newRetention.result || 'Дозвонился'
      } as RetentionLog;

      setRetentionLogs([log, ...retentionLogs]);
      setIsRetentionModalOpen(false);
      setNewRetention({
          date: new Date().toISOString().split('T')[0],
          method: 'Звонок',
          result: 'Дозвонился',
          admin: user.fullName
      });
      setRetentionStudentData(null);
  };

  const filteredAttraction = useMemo(() => {
      return attractionLogs.filter(l => 
          (filterResult === 'All' || l.result === filterResult) &&
          (l.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || l.phone.includes(searchTerm))
      );
  }, [attractionLogs, searchTerm, filterResult]);

  const filteredRetention = useMemo(() => {
      return retentionLogs.filter(l => 
          l.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || l.phone.includes(searchTerm)
      );
  }, [retentionLogs, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Журнал звонков (Колл-центр)</h2>
            <div className="flex gap-4 mt-2">
                <button 
                    onClick={() => setActiveTab('attraction')}
                    className={`text-sm font-medium border-b-2 pb-1 transition-colors ${activeTab === 'attraction' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500'}`}
                >
                    Привлечение (Лиды)
                </button>
                <button 
                    onClick={() => setActiveTab('retention')}
                    className={`text-sm font-medium border-b-2 pb-1 transition-colors ${activeTab === 'retention' ? 'border-purple-600 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-500'}`}
                >
                    Удержание (Ученики)
                </button>
            </div>
        </div>
        <button 
            onClick={() => activeTab === 'attraction' ? setIsAttractionModalOpen(true) : setIsRetentionModalOpen(true)}
            className={`px-4 py-2 rounded-lg font-bold text-white shadow-sm flex items-center gap-2 transition-colors ${activeTab === 'attraction' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
        >
            <Plus size={18}/>
            {activeTab === 'attraction' ? 'Новый лид' : 'Запись звонка'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center gap-4 bg-slate-50 dark:bg-slate-800/50">
              <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Поиск по имени или телефону..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                  />
              </div>
              {activeTab === 'attraction' && (
                  <div className="flex items-center gap-2">
                      <Filter size={16} className="text-slate-400"/>
                      <select 
                        value={filterResult}
                        onChange={e => setFilterResult(e.target.value)}
                        className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 outline-none"
                      >
                          <option value="All">Все статусы</option>
                          <option value="Записался">Записался</option>
                          <option value="Подумает">Подумает</option>
                          <option value="Отказ">Отказ</option>
                          <option value="Недозвон">Недозвон</option>
                      </select>
                  </div>
              )}
          </div>

          <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 text-xs uppercase">
                      <tr>
                          <th className="p-4">Дата</th>
                          <th className="p-4">{activeTab === 'attraction' ? 'Клиент' : 'Ученик'}</th>
                          <th className="p-4">{activeTab === 'attraction' ? 'Канал / Запрос' : 'Тема / Метод'}</th>
                          <th className="p-4">Результат</th>
                          <th className="p-4">Админ</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {(activeTab === 'attraction' ? filteredAttraction : filteredRetention).map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                              <td className="p-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{log.date}</td>
                              <td className="p-4">
                                  <div className="font-bold text-slate-800 dark:text-slate-200">{activeTab === 'attraction' ? log.fullName : log.studentName}</div>
                                  <div className="text-xs text-slate-500 flex items-center gap-1"><Phone size={10}/> {log.phone}</div>
                                  {activeTab === 'retention' && log.parentName && <div className="text-xs text-slate-400">Родитель: {log.parentName}</div>}
                              </td>
                              <td className="p-4 text-sm">
                                  {activeTab === 'attraction' ? (
                                      <div>
                                          <div className="font-medium text-slate-700 dark:text-slate-300">{log.channel}</div>
                                          <div className="text-xs text-slate-500">{log.request}</div>
                                      </div>
                                  ) : (
                                      <div>
                                          <div className="font-medium text-slate-700 dark:text-slate-300">{log.topic}</div>
                                          <div className="text-xs text-slate-500">{log.method}</div>
                                      </div>
                                  )}
                              </td>
                              <td className="p-4">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                                      log.result === 'Записался' || log.result === 'Решено' ? 'bg-emerald-100 text-emerald-700' :
                                      log.result === 'Отказ' ? 'bg-red-100 text-red-700' :
                                      'bg-amber-100 text-amber-700'
                                  }`}>
                                      {log.result}
                                  </span>
                                  {log.comment && <div className="text-xs text-slate-400 mt-1 max-w-[200px] truncate" title={log.comment}>{log.comment}</div>}
                              </td>
                              <td className="p-4 text-sm text-slate-500 dark:text-slate-400">{log.admin}</td>
                          </tr>
                      ))}
                      {(activeTab === 'attraction' ? filteredAttraction : filteredRetention).length === 0 && (
                          <tr><td colSpan={5} className="p-8 text-center text-slate-400">Нет записей</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Attraction Modal */}
      {isAttractionModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20">
                      <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2"><Megaphone size={18}/> Новый лид</h3>
                      <button onClick={() => setIsAttractionModalOpen(false)}><X size={20} className="text-slate-400"/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Имя</label><input type="text" value={newAttraction.fullName || ''} onChange={e => setNewAttraction({...newAttraction, fullName: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" /></div>
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Телефон</label><input type="text" value={newAttraction.phone || ''} onChange={e => setNewAttraction({...newAttraction, phone: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><CustomSelect label="Канал" value={newAttraction.channel || ''} onChange={v => setNewAttraction({...newAttraction, channel: v})} options={['Instagram', 'Facebook', 'Сайт', 'Звонок', 'Проходил мимо']} /></div>
                          <div><CustomSelect label="Результат" value={newAttraction.result || ''} onChange={v => setNewAttraction({...newAttraction, result: v as any})} options={['Записался', 'Подумает', 'Отказ', 'Недозвон']} /></div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Запрос клиента</label>
                          <textarea value={newAttraction.request || ''} onChange={e => setNewAttraction({...newAttraction, request: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 h-20" placeholder="Например: Курсы английского для ребенка 10 лет"></textarea>
                      </div>
                  </div>
                  <div className="p-4 border-t flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl">
                      <button onClick={() => setIsAttractionModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Отмена</button>
                      <button onClick={handleSaveAttraction} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">Сохранить</button>
                  </div>
              </div>
          </div>
      )}

      {/* Retention Modal */}
      {isRetentionModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-purple-50 dark:bg-purple-900/20">
                      <h3 className="font-bold text-purple-800 dark:text-purple-300 flex items-center gap-2"><Repeat size={18}/> Удержание / Звонок</h3>
                      <button onClick={() => setIsRetentionModalOpen(false)}><X size={20} className="text-slate-400"/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ученик</label>
                          <input 
                            list="students-list" 
                            type="text" 
                            value={newRetention.studentName || ''} 
                            onChange={e => handleStudentSelect(e.target.value)} 
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
                            placeholder="Начните вводить имя..."
                          />
                          <datalist id="students-list">
                              {students.map(s => <option key={s.id} value={s.fullName} />)}
                          </datalist>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-1">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ответственное лицо</label>
                              {retentionStudentData && retentionStudentData.parents && retentionStudentData.parents.length > 0 ? (
                                  <CustomSelect 
                                      value={(() => {
                                          const p = retentionStudentData.parents?.find(par => par.name === newRetention.parentName);
                                          return p ? `${p.name} (${p.role})` : (newRetention.parentName || '');
                                      })()}
                                      onChange={(val) => {
                                          const parent = retentionStudentData.parents?.find(p => `${p.name} (${p.role})` === val);
                                          setNewRetention({
                                              ...newRetention, 
                                              parentName: parent?.name || val,
                                              phone: parent?.phone || newRetention.phone 
                                          });
                                      }}
                                      options={retentionStudentData.parents.map(p => `${p.name} (${p.role})`)}
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
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Тема обращения</label>
                          <input type="text" value={newRetention.topic || ''} onChange={e => setNewRetention({...newRetention, topic: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" placeholder="Долг, Пропуски, Жалоба..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><CustomSelect label="Метод" value={newRetention.method || ''} onChange={v => setNewRetention({...newRetention, method: v})} options={['Звонок', 'SMS', 'WhatsApp', 'Встреча']} /></div>
                          <div><CustomSelect label="Результат" value={newRetention.result || ''} onChange={v => setNewRetention({...newRetention, result: v})} options={['Дозвонился', 'Недозвон', 'Обещал оплатить', 'Обещал прийти', 'Решено']} /></div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Комментарий</label>
                          <textarea value={newRetention.comment || ''} onChange={e => setNewRetention({...newRetention, comment: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 h-20"></textarea>
                      </div>
                  </div>
                  <div className="p-4 border-t flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl">
                      <button onClick={() => setIsRetentionModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Отмена</button>
                      <button onClick={handleSaveRetention} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700">Сохранить</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};