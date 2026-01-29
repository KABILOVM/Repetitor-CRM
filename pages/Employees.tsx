
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Employee, UserRole, UserProfile, Branch, Course } from '../types';
// Added Send icon to imports
import { Mail, Phone, MoreHorizontal, Plus, X, Save, User, BookOpen, Briefcase, Key, MapPin, Check, AlertTriangle, Loader2, Send, Calendar } from 'lucide-react';
import { DateRangePicker } from '../components/DateRangePicker';

const InputGroup = ({ label, value, onChange, type = "text", placeholder = "", className = "", disabled = false, error = false, ...props }: any) => (
  <div className={className}>
    <label className={`block text-[10px] font-bold uppercase mb-1 ${error ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
        {label} {error && '*'}
    </label>
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full border rounded-lg p-2 text-sm outline-none transition-all duration-300 h-[38px]
          ${error 
              ? 'border-red-500 ring-2 ring-red-200 dark:ring-red-900/50 shadow-[0_0_10px_rgba(239,68,68,0.3)] bg-red-50 dark:bg-red-900/10 text-red-900 dark:text-red-100 placeholder-red-300' 
              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 placeholder-slate-400'
          }
          ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}
      `}
      {...props}
    />
  </div>
);

export const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>(() => storage.get(StorageKeys.EMPLOYEES, []));
  const courses = storage.get<Course[]>(StorageKeys.COURSES, []);
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Financier].includes(user.role);
  const isGlobalAdmin = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer].includes(user.role);

  const handleAddNew = () => {
    setEditingEmployee({ 
        role: UserRole.Teacher, 
        branches: !isGlobalAdmin && user.branch ? [user.branch] : [], 
        status: 'Active', 
        phone: '+992 ' 
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const newErrors: Record<string, boolean> = {};
    if (!editingEmployee?.fullName?.trim()) newErrors.fullName = true;
    if (!editingEmployee?.email?.trim()) newErrors.email = true;
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setIsSending(true);
    try {
        const isNew = !editingEmployee?.id;
        const token = isNew ? Math.random().toString(36).substring(2, 15) : editingEmployee?.inviteToken;
        
        const payload = {
            ...editingEmployee,
            id: editingEmployee?.id || Date.now(),
            login: editingEmployee?.email,
            password: isNew ? '' : editingEmployee?.password,
            mustChangePassword: isNew,
            inviteToken: token,
            companyId: user.companyId || 'repetitor_tj'
        } as Employee;

        if (isNew) {
            const inviteLink = `${window.location.origin}${window.location.pathname}#/login?token=${token}`;
            // Вызов метода отправки
            await storage.sendInviteEmail(payload.email, payload.fullName, inviteLink);
        }

        const updated = isNew ? [...employees, payload] : employees.map(e => e.id === payload.id ? payload : e);
        setEmployees(updated);
        storage.set(StorageKeys.EMPLOYEES, updated);
        setIsModalOpen(false);
        setEditingEmployee(null);
        storage.notify(isNew ? 'Приглашение отправлено' : 'Данные сохранены', 'success');
    } catch (err) {
        storage.notify('Ошибка при сохранении', 'error');
    } finally {
        setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 antialiased">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Сотрудники</h2>
            {isSuperUser && (
                <div className="flex items-center gap-2 mt-2">
                    <MapPin size={14} className="text-slate-400" />
                    <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer">
                        <option value="All">Все филиалы</option>
                        {(Object.values(Branch) as string[]).map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>
            )}
        </div>
        <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 text-xs uppercase tracking-widest">
          <Plus size={18} /> Добавить сотрудника
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-700/30 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b">
            <tr><th className="p-4 pl-6">Сотрудник</th><th className="p-4">Роль</th><th className="p-4">Статус</th><th className="p-4">Контакты</th><th className="p-4"></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {employees.map(emp => (
              <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer" onClick={() => { setEditingEmployee(emp); setIsModalOpen(true); }}>
                <td className="p-4 pl-6 font-bold text-slate-800 dark:text-slate-100">{emp.fullName}</td>
                <td className="p-4"><span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase">{emp.role}</span></td>
                <td className="p-4">{emp.status === 'Fired' ? <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-bold uppercase">Уволен</span> : <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase">Активен</span>}</td>
                <td className="p-4 text-xs font-medium text-slate-500">{emp.phone}</td>
                <td className="p-4 text-right"><MoreHorizontal size={18} className="text-slate-300" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && editingEmployee && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <header className="p-6 border-b flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-lg uppercase tracking-tight flex items-center gap-3"><Briefcase className="text-blue-600"/> {editingEmployee.id ? 'Редактирование' : 'Приглашение сотрудника'}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full"><X size={20}/></button>
                </header>
                
                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2"><InputGroup label="ФИО Сотрудника" value={editingEmployee.fullName} onChange={(v: string) => setEditingEmployee({...editingEmployee, fullName: v})} error={errors.fullName}/></div>
                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Дата рождения</label><DateRangePicker startDate={editingEmployee.birthYear || ''} onChange={(d) => setEditingEmployee({...editingEmployee, birthYear: d})} mode="single" align="right"/></div>
                    </div>

                    <div className="bg-slate-100 dark:bg-slate-900 rounded-[24px] p-2 flex border border-slate-200">
                        <button onClick={() => setEditingEmployee({...editingEmployee, status: 'Active'})} className={`flex-1 py-3 text-xs font-black uppercase rounded-2xl transition-all ${editingEmployee.status !== 'Fired' ? 'bg-emerald-600 text-white shadow-lg scale-[1.02]' : 'text-slate-400'}`}>Активен</button>
                        <button onClick={() => setEditingEmployee({...editingEmployee, status: 'Fired'})} className={`flex-1 py-3 text-xs font-black uppercase rounded-2xl transition-all ${editingEmployee.status === 'Fired' ? 'bg-rose-600 text-white shadow-lg scale-[1.02]' : 'text-slate-400'}`}>Уволен</button>
                    </div>

                    {/* Fired Details Section */}
                    {editingEmployee.status === 'Fired' && (
                        <div className="bg-rose-50/50 dark:bg-rose-900/10 p-5 rounded-3xl border border-rose-100 dark:border-rose-900/30 space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-2">
                                <AlertTriangle size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Детали увольнения</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase mb-1 ml-1">Дата увольнения</label>
                                    <DateRangePicker 
                                        startDate={editingEmployee.firingDate || ''} 
                                        onChange={(d) => setEditingEmployee({...editingEmployee, firingDate: d})} 
                                        mode="single" 
                                        align="left"
                                    />
                                </div>
                                <InputGroup 
                                    label="Причина увольнения" 
                                    value={editingEmployee.firingReason} 
                                    onChange={(v: string) => setEditingEmployee({...editingEmployee, firingReason: v})}
                                    placeholder="Напр: Собственное желание"
                                    className="flex-1"
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Телефон" value={editingEmployee.phone} onChange={(v: string) => setEditingEmployee({...editingEmployee, phone: v})}/>
                        <InputGroup label="Email (на него придет ссылка)" value={editingEmployee.email} onChange={(v: string) => setEditingEmployee({...editingEmployee, email: v})} error={errors.email}/>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Роль и Филиалы</label>
                        <div className="flex flex-wrap gap-2">
                            {Object.values(UserRole).filter(r => r !== UserRole.Developer).map(role => (
                                <button key={role} onClick={() => setEditingEmployee({...editingEmployee, role: role as UserRole})} className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${editingEmployee.role === role ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border-slate-100'}`}>{role}</button>
                            ))}
                        </div>
                    </div>
                </div>

                <footer className="p-6 border-t bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Отмена</button>
                    <button onClick={handleSave} disabled={isSending} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-blue-500/30 transition-all active:scale-95 text-xs uppercase tracking-widest">
                        {isSending ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>}
                        {isSending ? 'Отправка...' : (editingEmployee.id ? 'Сохранить' : 'Отправить инвайт')}
                    </button>
                </footer>
            </div>
        </div>
      )}
    </div>
  );
};
