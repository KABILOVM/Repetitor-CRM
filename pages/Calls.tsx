
import React, { useState, useMemo } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { AttractionLog, RetentionLog, Student, UserRole, UserProfile, Branch } from '../types';
import { Phone, Search, Plus, Save, Filter, X, User, MessageSquare, Megaphone, Repeat, Layers, Calendar, Clock, UserPlus } from 'lucide-react';
import { CustomSelect } from '../components/CustomSelect';
import { useData } from '../hooks/useData';

const CHANNELS = ['Instagram', 'Facebook', 'Telegram', 'WhatsApp', 'Звонок', 'Визит', 'Рекомендация'];
const ATTRACTION_RESULTS = ['Записался', 'Подумает', 'Отказ', 'Недозвон'];
const RETENTION_METHODS = ['Звонок', 'Мессенджер', 'Личная беседа'];
const RETENTION_RESULTS = ['Дозвонился', 'Не доступен', 'Перезвонить', 'Решено'];

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
  const [retentionSearch, setRetentionSearch] = useState('');

  const handleSaveAttraction = () => {
      if (!newAttraction.fullName || !newAttraction.phone) {
          alert('Пожалуйста, укажите имя и телефон лида');
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
      storage.notify('Лид успешно добавлен', 'success');
  };

  const handleSaveRetention = () => {
      if (!newRetention.studentName || !newRetention.topic) {
          alert('Выберите ученика и укажите тему обращения');
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
      setRetentionSearch('');
      storage.notify('Запись звонка сохранена', 'success');
  };

  const selectStudentForRetention = (s: Student) => {
      setNewRetention({
          ...newRetention,
          studentName: s.fullName,
          phone: s.phone || s.parentPhone,
          parentName: s.parentName || (s.parents && s.parents[0]?.name),
          courses: s.subjects?.join(', ')
      });
      setRetentionSearch(s.fullName);
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Колл-центр</h2>
            <div className="flex gap-4 mt-2">
                <button 
                    onClick={() => setActiveTab('attraction')}
                    className={`text-xs font-bold uppercase tracking-widest border-b-4 pb-1 transition-all ${activeTab === 'attraction' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Лиды (Привлечение)
                </button>
                <button 
                    onClick={() => setActiveTab('retention')}
                    className={`text-xs font-bold uppercase tracking-widest border-b-4 pb-1 transition-all ${activeTab === 'retention' ? 'border-purple-600 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Ученики (Удержание)
                </button>
            </div>
        </div>
        <button 
            onClick={() => activeTab === 'attraction' ? setIsAttractionModalOpen(true) : setIsRetentionModalOpen(true)}
            className={`px-5 py-2.5 rounded-xl font-bold text-white shadow-lg flex items-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-widest ${activeTab === 'attraction' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20'}`}
        >
            <Plus size={18} strokeWidth={3}/>
            {activeTab === 'attraction' ? 'Новый лид' : 'Запись звонка'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-900/50">
              <div className="relative w-full sm:max-w-md group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18}/>
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Поиск по имени или телефону..."
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all uppercase tracking-tighter"
                  />
              </div>
              {activeTab === 'attraction' && (
                  <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                      <Filter size={14} className="text-slate-400"/>
                      <select 
                        value={filterResult}
                        onChange={e => setFilterResult(e.target.value)}
                        className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
                      >
                          <option value="All">Все статусы</option>
                          {ATTRACTION_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                  </div>
              )}
          </div>

          <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                  <thead className="bg-slate-50/50 dark:bg-slate-700/30 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b dark:border-slate-700">
                      <tr>
                          <th className="p-5 px-8">Дата / Админ</th>
                          <th className="p-5">{activeTab === 'attraction' ? 'Потенциальный клиент' : 'Действующий ученик'}</th>
                          <th className="p-5">{activeTab === 'attraction' ? 'Интерес / Канал' : 'Тема обращения'}</th>
                          <th className="p-5">Результат</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {(activeTab === 'attraction' ? filteredAttraction : filteredRetention).map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                              <td className="p-5 px-8">
                                  <div className="text-[11px] font-bold text-slate-800 dark:text-slate-300 uppercase tracking-tighter">{log.date}</div>
                                  <div className="text-[10px] text-slate-400 font-medium uppercase mt-1">{log.admin}</div>
                              </td>
                              <td className="p-5">
                                  <div className="font-bold text-slate-800 dark:text-white uppercase tracking-tight text-sm">{activeTab === 'attraction' ? log.fullName : log.studentName}</div>
                                  <div className="text-xs text-blue-500 flex items-center gap-1 font-bold mt-1 tracking-tighter"><Phone size={10}/> {log.phone}</div>
                                  {activeTab === 'retention' && log.parentName && <div className="text-[10px] text-slate-400 font-medium uppercase mt-1">Родитель: {log.parentName}</div>}
                              </td>
                              <td className="p-5 text-sm font-medium">
                                  {activeTab === 'attraction' ? (
                                      <div>
                                          <div className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">{log.channel}</div>
                                          <div className="text-[10px] text-slate-400 italic line-clamp-1">{log.request}</div>
                                      </div>
                                  ) : (
                                      <div>
                                          <div className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">{log.topic}</div>
                                          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">{log.method}</div>
                                      </div>
                                  )}
                              </td>
                              <td className="p-5">
                                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                                      log.result === 'Записался' || log.result === 'Решено' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30' :
                                      log.result === 'Отказ' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/30' :
                                      'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30'
                                  }`}>
                                      {log.result}
                                  </span>
                                  {log.comment && <div className="text-[10px] text-slate-400 mt-1.5 max-w-[250px] line-clamp-2 italic leading-relaxed" title={log.comment}>«{log.comment}»</div>}
                              </td>
                          </tr>
                      ))}
                      {(activeTab === 'attraction' ? filteredAttraction : filteredRetention).length === 0 && (
                          <tr><td colSpan={4} className="p-12 text-center text-slate-400 text-sm font-medium italic border-2 border-dashed border-slate-50 dark:border-slate-800 m-4 rounded-3xl">Записей звонков пока нет</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Attraction Modal */}
      {isAttractionModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                  <header className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                      <div>
                          <h3 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3"><UserPlus className="text-blue-600" /> Новый лид</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Регистрация входящего обращения</p>
                      </div>
                      <button onClick={() => setIsAttractionModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><X size={24}/></button>
                  </header>
                  <div className="p-8 space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Дата</label>
                              <input type="date" value={newAttraction.date} onChange={e => setNewAttraction({...newAttraction, date: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Канал связи</label>
                              <select value={newAttraction.channel} onChange={e => setNewAttraction({...newAttraction, channel: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold outline-none">
                                  {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                          </div>
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ФИО Клиента *</label>
                          <input type="text" value={newAttraction.fullName} onChange={e => setNewAttraction({...newAttraction, fullName: e.target.value})} placeholder="Напр: Рахимов Алишер" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10" />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Телефон *</label>
                          <input type="text" value={newAttraction.phone} onChange={e => setNewAttraction({...newAttraction, phone: e.target.value})} placeholder="+992 900 00 00 00" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10" />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Запрос / Интерес</label>
                          <textarea value={newAttraction.request} onChange={e => setNewAttraction({...newAttraction, request: e.target.value})} placeholder="Напр: Интересуется химией 5 кластер..." className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold h-24 resize-none outline-none focus:ring-4 focus:ring-blue-500/10" />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Результат</label>
                          <div className="grid grid-cols-2 gap-2">
                              {ATTRACTION_RESULTS.map(res => (
                                  <button key={res} onClick={() => setNewAttraction({...newAttraction, result: res as any})} className={`py-2 px-3 rounded-lg text-xs font-bold border-2 transition-all ${newAttraction.result === res ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white dark:bg-slate-700 border-slate-100 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}>
                                      {res}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>
                  <footer className="p-6 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
                      <button onClick={() => setIsAttractionModalOpen(false)} className="px-6 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Отмена</button>
                      <button onClick={handleSaveAttraction} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-blue-500/20 active:scale-95 transition-all text-xs uppercase tracking-widest"><Save size={16}/> Сохранить</button>
                  </footer>
              </div>
          </div>
      )}

      {/* Retention Modal */}
      {isRetentionModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                  <header className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                      <div>
                          <h3 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3"><Repeat className="text-purple-600" /> Запись звонка</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Работа с действующими учениками</p>
                      </div>
                      <button onClick={() => setIsRetentionModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><X size={24}/></button>
                  </header>
                  <div className="p-8 space-y-5">
                      <div className="relative group">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Поиск ученика *</label>
                          <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                              <input 
                                type="text" 
                                value={retentionSearch}
                                onChange={e => {
                                    setRetentionSearch(e.target.value);
                                    setNewRetention({...newRetention, studentName: e.target.value});
                                }}
                                placeholder="Введите имя для поиска..." 
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 pl-10 text-sm font-bold outline-none focus:ring-4 focus:ring-purple-500/10" 
                              />
                          </div>
                          {retentionSearch && !newRetention.phone && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                                  {students.filter(s => s.fullName.toLowerCase().includes(retentionSearch.toLowerCase())).slice(0, 5).map(s => (
                                      <button 
                                        key={s.id} 
                                        onClick={() => selectStudentForRetention(s)}
                                        className="w-full text-left p-3 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 border-b last:border-0 border-slate-100 dark:border-slate-700"
                                      >
                                          {s.fullName} <span className="text-[10px] text-slate-400 font-normal ml-2">({s.branch})</span>
                                      </button>
                                  ))}
                              </div>
                          )}
                      </div>
                      
                      {newRetention.studentName && newRetention.phone && (
                          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800 animate-in slide-in-from-top-2">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-purple-600 shadow-sm"><User size={20}/></div>
                                  <div>
                                      <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">{newRetention.phone}</p>
                                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Родитель: {newRetention.parentName || 'Не указан'}</p>
                                  </div>
                              </div>
                          </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Способ связи</label>
                              <select value={newRetention.method} onChange={e => setNewRetention({...newRetention, method: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold outline-none">
                                  {RETENTION_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Результат</label>
                              <select value={newRetention.result} onChange={e => setNewRetention({...newRetention, result: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold outline-none">
                                  {RETENTION_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                          </div>
                      </div>

                      <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Тема обращения *</label>
                          <input type="text" value={newRetention.topic} onChange={e => setNewRetention({...newRetention, topic: e.target.value})} placeholder="Напр: Пропуск занятий / Оплата..." className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-purple-500/10" />
                      </div>

                      <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Комментарий к звонку</label>
                          <textarea value={newRetention.comment} onChange={e => setNewRetention({...newRetention, comment: e.target.value})} placeholder="О чем договорились? Результат беседы..." className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold h-24 resize-none outline-none focus:ring-4 focus:ring-purple-500/10" />
                      </div>
                  </div>
                  <footer className="p-6 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
                      <button onClick={() => setIsRetentionModalOpen(false)} className="px-6 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Отмена</button>
                      <button onClick={handleSaveRetention} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-purple-500/20 active:scale-95 transition-all text-xs uppercase tracking-widest"><Save size={16}/> Сохранить</button>
                  </footer>
              </div>
          </div>
      )}
    </div>
  );
};
