
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Employee, UserRole, UserProfile, Branch, Course, Company, BranchEntity } from '../types';
import { Mail, Phone, MoreHorizontal, Plus, X, Save, User, BookOpen, Briefcase, Shield, Key, MapPin, Check, Calendar, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { DateRangePicker } from '../components/DateRangePicker';
import { Checkbox } from '../components/Checkbox';

export const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>(() => storage.get(StorageKeys.EMPLOYEES, []));
  const courses = storage.get<Course[]>(StorageKeys.COURSES, []); 
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  
  // Get current company config for roles
  const companyConfig = useMemo(() => storage.getCompanyConfig(user.companyId), [user.companyId]);
  const availableRoles = useMemo(() => {
      if (!companyConfig.rolePermissions) return Object.values(UserRole).filter(r => r !== UserRole.Developer);
      return Object.keys(companyConfig.rolePermissions);
  }, [companyConfig]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const originalEmployeeRef = useRef<string>('');

  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Financier].includes(user.role);
  const isGlobalAdmin = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer].includes(user.role);

  const handleClose = (e?: React.MouseEvent) => {
      if (e) {
          e.preventDefault();
          e.stopPropagation();
      }
      
      const currentData = JSON.stringify(editingEmployee);
      const isDirty = editingEmployee && currentData !== originalEmployeeRef.current;

      if (isDirty) {
          if (!confirm('Есть несохраненные изменения. Закрыть окно без сохранения?')) {
              return;
          }
      }
      
      setIsModalOpen(false);
      setEditingEmployee(null);
      setErrors({});
      setShowPassword(false);
  };

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Escape' && isModalOpen) {
              handleClose();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, editingEmployee]);

  const getRoleColor = (role: string) => {
      switch (role) {
          case UserRole.Admin: return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
          case UserRole.Teacher: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
          case UserRole.GeneralDirector: return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
          case UserRole.Director: return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
          case UserRole.Financier: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
          default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
      }
  };

  const visibleEmployees = useMemo(() => {
      let filtered = employees;
      if (isSuperUser) {
          if (selectedBranch !== 'All') {
              filtered = employees.filter(e => {
                  const empBranches = e.branches || (e.branch ? [e.branch] : []);
                  return empBranches.includes(selectedBranch as Branch);
              });
          }
      } else if (user.branch) {
          filtered = employees.filter(e => {
              const empBranches = e.branches || (e.branch ? [e.branch] : []);
              return empBranches.includes(user.branch as Branch);
          });
      }
      return filtered;
  }, [employees, user, isSuperUser, selectedBranch]);

  const InputGroup = ({ label, value, onChange, type = "text", placeholder = "", className = "", disabled = false, error = false, icon: Icon, onIconClick, ...props }: any) => (
    <div className={className}>
      <label className={`block text-[10px] font-bold uppercase mb-1 ${error ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
          {label} {error && '*'}
      </label>
      <div className="relative">
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
              ${Icon ? 'pr-10' : ''}
          `}
          {...props}
        />
        {Icon && (
            <button 
                type="button" 
                onClick={onIconClick}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
            >
                <Icon size={16} />
            </button>
        )}
      </div>
    </div>
  );

  const handleAddNew = () => {
    const defaultBranches = !isGlobalAdmin && user.branch ? [user.branch] : [];
    const firstRole = availableRoles[0] || UserRole.Teacher;
    const newEmp: Partial<Employee> = {
        role: firstRole,
        permissions: [],
        branches: defaultBranches,
        status: 'Active',
        subjects: [],
        phone: '+992 ',
        password: '',
        companyId: user.companyId || 'repetitor_tj'
    };
    
    setEditingEmployee(newEmp);
    originalEmployeeRef.current = JSON.stringify(newEmp);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    const empData = { ...employee };
    if (!empData.branches && empData.branch) empData.branches = [empData.branch];
    if (!empData.branches) empData.branches = [];
    if (!empData.status) empData.status = 'Active';
    if (!empData.subjects && empData.subject) empData.subjects = [empData.subject];
    if (!empData.subjects) empData.subjects = [];
    if (!empData.phone) empData.phone = '+992 ';
    empData.password = employee.password || '';

    setEditingEmployee(empData);
    originalEmployeeRef.current = JSON.stringify(empData);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editingEmployee?.id) return;
    if (confirm('Удалить сотрудника?')) {
        const updated = employees.filter(t => t.id !== editingEmployee.id);
        setEmployees(updated);
        storage.set(StorageKeys.EMPLOYEES, updated);
        setIsModalOpen(false);
        setEditingEmployee(null);
    }
  };

  const clearError = (field: string) => {
      if (errors[field]) {
          setErrors(prev => ({ ...prev, [field]: false }));
      }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newErrors: Record<string, boolean> = {};
    if (!editingEmployee?.fullName?.trim()) newErrors.fullName = true;
    if (!editingEmployee?.role) newErrors.role = true;
    if (!editingEmployee?.email?.trim()) newErrors.email = true;
    
    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
    }

    let updated: Employee[];
    const isNew = !editingEmployee?.id;
    const autoTempPassword = Math.random().toString(36).slice(-8);
    const finalPassword = editingEmployee?.password?.trim() || (isNew ? autoTempPassword : editingEmployee?.password);

    // Sync permissions from the role in companyConfig
    const rolePerms = companyConfig.rolePermissions?.[editingEmployee?.role || ''] || [];

    const payload = {
        ...editingEmployee,
        login: editingEmployee?.email,
        password: finalPassword,
        permissions: Array.isArray(rolePerms) ? rolePerms : Object.keys(rolePerms), // Support both formats
        mustChangePassword: isNew && !editingEmployee?.password ? true : editingEmployee?.mustChangePassword,
        subject: editingEmployee?.subjects && editingEmployee.subjects.length > 0 ? editingEmployee.subjects[0] : '',
        branch: editingEmployee?.branches && editingEmployee.branches.length > 0 ? editingEmployee.branches[0] : undefined
    } as Employee;

    if (editingEmployee?.id) {
        updated = employees.map(t => t.id === editingEmployee.id ? payload : t);
    } else {
        const newEmployee = { 
            ...payload, 
            id: Date.now(),
        } as Employee;
        updated = [...employees, newEmployee];
        
        if (!editingEmployee?.password) {
            setTimeout(() => {
                alert(`📨 Имитация отправки email на ${newEmployee.email}:\n\n"Добро пожаловать в систему!\nВаш логин: ${newEmployee.email}\nВаш временный пароль: ${autoTempPassword}\n\nПожалуйста, смените пароль при первом входе."`);
            }, 500);
        }
    }
    
    setEmployees(updated);
    storage.set(StorageKeys.EMPLOYEES, updated);
    setIsModalOpen(false);
    setEditingEmployee(null);
    storage.notify('Сотрудник сохранен', 'success');
  };

  const toggleBranch = (branchName: Branch) => {
      const currentBranches = editingEmployee?.branches || [];
      if (currentBranches.includes(branchName)) {
          setEditingEmployee({ ...editingEmployee, branches: currentBranches.filter(b => b !== branchName) });
      } else {
          setEditingEmployee({ ...editingEmployee, branches: [...currentBranches, branchName] });
      }
  };

  const toggleSubject = (subjName: string) => {
      const current = editingEmployee?.subjects || [];
      if (current.includes(subjName)) {
          setEditingEmployee({ ...editingEmployee, subjects: current.filter(s => s !== subjName) });
      } else {
          setEditingEmployee({ ...editingEmployee, subjects: [...current, subjName] });
      }
  };

  return (
    <div className="space-y-6 antialiased font-sans">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Сотрудники</h2>
            {isSuperUser ? (
                <div className="flex items-center gap-2 mt-2">
                    <MapPin size={14} className="text-slate-400" />
                    <select 
                        value={selectedBranch} 
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="bg-transparent text-sm font-bold text-slate-600 dark:text-slate-300 border-b border-dashed border-slate-300 dark:border-slate-600 outline-none pb-0.5 cursor-pointer hover:text-blue-600"
                    >
                        <option value="All">Все филиалы</option>
                        {(Object.values(Branch) as string[]).map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>
            ) : user.branch && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium flex items-center gap-1">
                    <MapPin size={14} className="text-blue-500" /> {user.branch}
                </p>
            )}
        </div>
        <button 
            type="button"
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 text-xs uppercase tracking-widest active:scale-95"
        >
          <Plus size={18} strokeWidth={3} />
          Новый сотрудник
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                <th className="p-4 pl-6">Сотрудник</th>
                <th className="p-4">Роль</th>
                <th className="p-4">Статус</th>
                <th className="p-4">Филиалы</th>
                <th className="p-4">Контакты</th>
                <th className="p-4 text-right pr-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {visibleEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer" onClick={() => handleEdit(emp)}>
                  <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0 border-2 border-white dark:border-slate-600 shadow-sm">
                              {emp.avatar ? <img src={emp.avatar} alt={emp.fullName} className="w-full h-full object-cover" /> : <User size={18} className="text-slate-400" />}
                          </div>
                          <div>
                              <span className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-tight">{emp.fullName}</span>
                              {emp.birthYear && <span className="block text-[10px] text-slate-400 font-medium">{emp.birthYear}</span>}
                          </div>
                      </div>
                  </td>
                  <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getRoleColor(emp.role as string)}`}>
                          {emp.role}
                      </span>
                  </td>
                  <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${emp.status === 'Fired' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                          {emp.status === 'Fired' ? 'Уволен' : 'Активен'}
                      </span>
                  </td>
                  <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                          {(emp.branches || (emp.branch ? [emp.branch] : [])).map(b => (
                              <span key={b} className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 uppercase tracking-tighter">{b.split('(')[0]}</span>
                          ))}
                      </div>
                  </td>
                  <td className="p-4 text-xs">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                            <Phone size={12} className="text-blue-500" />
                            {emp.phone || '-'}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 font-medium">
                            <Mail size={12} />
                            {emp.email}
                        </div>
                    </div>
                  </td>
                  <td className="p-4 text-right pr-6">
                    <button type="button" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {visibleEmployees.length === 0 && (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-400 italic text-sm font-medium">Список сотрудников пуст</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && editingEmployee && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden border border-slate-100 dark:border-slate-700">
                <header className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20">
                            <Briefcase size={20} />
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white uppercase tracking-tight">
                            {editingEmployee.id ? 'Редактировать данные' : 'Новый сотрудник'}
                        </h3>
                    </div>
                    <button onClick={handleClose} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white dark:bg-slate-700 rounded-full shadow-sm"><X size={20} /></button>
                </header>
                
                <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/20 dark:bg-slate-900/10">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="sm:col-span-2">
                            <InputGroup 
                                label="ФИО Сотрудника" 
                                value={editingEmployee.fullName} 
                                onChange={(v: string) => { setEditingEmployee({...editingEmployee, fullName: v}); clearError('fullName'); }}
                                error={errors.fullName}
                                placeholder="Иванов Иван"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 ml-1">Дата рождения</label>
                            <DateRangePicker 
                                startDate={editingEmployee.birthYear || ''}
                                onChange={(d) => setEditingEmployee({...editingEmployee, birthYear: d})}
                                mode="single"
                                align="right"
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Статус</label>
                            <div className="flex bg-slate-50 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner">
                                <button
                                    type="button"
                                    onClick={() => setEditingEmployee({ ...editingEmployee, status: 'Active', firingDate: undefined, firingReason: undefined })}
                                    className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${editingEmployee.status !== 'Fired' ? 'bg-emerald-500 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                >
                                    Активен
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingEmployee({ ...editingEmployee, status: 'Fired' })}
                                    className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${editingEmployee.status === 'Fired' ? 'bg-rose-500 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                >
                                    Уволен
                                </button>
                            </div>
                        </div>

                        {editingEmployee.status === 'Fired' && (
                            <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-700 space-y-4 animate-in slide-in-from-top-2">
                                <DateRangePicker label="Дата увольнения" startDate={editingEmployee.firingDate || ''} onChange={(d) => setEditingEmployee({...editingEmployee, firingDate: d})} mode="single" />
                                <InputGroup label="Причина увольнения" value={editingEmployee.firingReason} onChange={(v: string) => setEditingEmployee({...editingEmployee, firingReason: v})} placeholder="Напр. Переезд" />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 ml-1 tracking-widest">Роль в системе</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {availableRoles.map(role => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => setEditingEmployee({ ...editingEmployee, role })}
                                    className={`px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all text-center uppercase tracking-tight ${
                                        editingEmployee.role === role
                                        ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-md scale-[1.02]'
                                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                                    }`}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#fffef0] dark:bg-slate-900/50 p-6 rounded-[32px] border border-amber-100 dark:border-amber-900/30 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <MapPin size={18} className="text-amber-500" />
                            <h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-tight">Филиалы доступа</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                            {(Object.values(Branch) as Branch[]).map(branch => (
                                <Checkbox 
                                    key={branch} 
                                    label={<span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter leading-none">{branch}</span>} 
                                    checked={!!editingEmployee.branches?.includes(branch)} 
                                    onChange={() => toggleBranch(branch)} 
                                />
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <InputGroup label="Email / Логин" value={editingEmployee.email} onChange={(v: string) => { setEditingEmployee({...editingEmployee, email: v}); clearError('email'); }} error={errors.email} placeholder="admin@center.tj" />
                        <InputGroup label="Телефон" value={editingEmployee.phone} onChange={(v: string) => { setEditingEmployee({...editingEmployee, phone: v}); clearError('phone'); }} error={errors.phone} />
                    </div>

                    {editingEmployee.role === UserRole.Teacher && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30">
                            <div className="flex items-center gap-2 mb-4">
                                <BookOpen size={18} className="text-blue-500" />
                                <h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-tight">Дисциплины</h4>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {Array.from(new Set(courses.map(c => c.name))).map(subject => (
                                    <button
                                        key={subject}
                                        type="button"
                                        onClick={() => toggleSubject(subject)}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all uppercase tracking-widest ${
                                            editingEmployee.subjects?.includes(subject)
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                            : 'bg-white text-slate-400 border-slate-100 hover:border-blue-300'
                                        }`}
                                    >
                                        {subject}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 pt-4 border-t dark:border-slate-700">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">Безопасность</p>
                        <InputGroup 
                            label="Пароль для входа" 
                            value={editingEmployee.password} 
                            onChange={(v: string) => setEditingEmployee({...editingEmployee, password: v})}
                            placeholder={editingEmployee.id ? "Оставьте пустым для сохранения" : "Будет создан автоматически"}
                            type={showPassword ? "text" : "password"}
                            icon={showPassword ? EyeOff : Eye}
                            onIconClick={() => setShowPassword(!showPassword)}
                        />
                    </div>
                </div>

                <footer className="p-6 border-t dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center shrink-0">
                    <button 
                        type="button"
                        onClick={handleClose} 
                        className="px-8 py-3 text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-[0.2em] transition-all"
                    >
                        Отмена
                    </button>
                    <button 
                        type="button"
                        onClick={handleSave} 
                        className="px-12 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-500/30 flex items-center gap-2 transition-all active:scale-95 uppercase tracking-widest text-xs"
                    >
                        <Save size={18} strokeWidth={3} /> Сохранить
                    </button>
                </footer>
            </div>
        </div>
      )}
    </div>
  );
};
