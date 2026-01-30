
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Employee, UserRole, ALL_PERMISSIONS, UserProfile, Branch, Course } from '../types';
import { Mail, Phone, MoreHorizontal, Plus, X, Save, User, BookOpen, Briefcase, Shield, Key, MapPin, Check, Calendar, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { DateRangePicker } from '../components/DateRangePicker';

export const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>(() => storage.get(StorageKeys.EMPLOYEES, []));
  const courses = storage.get<Course[]>(StorageKeys.COURSES, []); // For subject list
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const originalEmployeeRef = useRef<string>('');

  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  
  // Validation State
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Check super user rights
  const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Financier].includes(user.role);
  const isGlobalAdmin = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer].includes(user.role);

  // Close Logic
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

  // --- Helper Component for Inputs with Error Styling ---
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
      {error && <p className="text-[10px] text-red-500 mt-1 font-bold animate-pulse">Обязательное поле</p>}
    </div>
  );

  const handleAddNew = () => {
    const defaultBranches = !isGlobalAdmin && user.branch ? [user.branch] : [];
    const newEmp: Partial<Employee> = {
        role: UserRole.Teacher,
        permissions: [],
        branches: defaultBranches,
        status: 'Active',
        subjects: [],
        phone: '+992 ',
        password: '' // Initialize with empty string
    };
    
    setEditingEmployee(newEmp);
    originalEmployeeRef.current = JSON.stringify(newEmp);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    const empData = { ...employee };
    // Normalization
    if (!empData.branches && empData.branch) empData.branches = [empData.branch];
    if (!empData.branches) empData.branches = [];
    if (!empData.status) empData.status = 'Active';
    // Normalize subjects (convert single subject to array if needed)
    if (!empData.subjects && empData.subject) empData.subjects = [empData.subject];
    if (!empData.subjects) empData.subjects = [];
    
    // Ensure phone has prefix if somehow empty
    if (!empData.phone) empData.phone = '+992 ';
    
    // Clear password in state when editing so we don't accidentally overwrite with hashed value or plain text if already there
    // But for this simple implementation, we keep what's in storage
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
    
    const phone = editingEmployee?.phone?.trim() || '';
    if (phone.length <= 5) newErrors.phone = true;

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
    }

    let updated: Employee[];
    
    const isNew = !editingEmployee?.id;
    const autoTempPassword = Math.random().toString(36).slice(-8);
    // Use manual password if provided, otherwise temp for new user or existing for old user
    const finalPassword = editingEmployee?.password?.trim() || (isNew ? autoTempPassword : editingEmployee?.password);

    const payload = {
        ...editingEmployee,
        login: editingEmployee?.email,
        password: finalPassword,
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
            phone: editingEmployee?.phone || '',
            permissions: editingEmployee?.permissions || []
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

  const togglePermission = (perm: string) => {
      const current = editingEmployee?.permissions || [];
      if (current.includes(perm)) {
          setEditingEmployee({ ...editingEmployee, permissions: current.filter(p => p !== perm) });
      } else {
          setEditingEmployee({ ...editingEmployee, permissions: [...current, perm] });
      }
  };

  const toggleBranch = (branchName: Branch) => {
      if (!isGlobalAdmin) return;
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
    <div className="space-y-6">
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
            ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    {user.branch ? `Филиал: ${user.branch}` : 'Управление персоналом'}
                </p>
            )}
        </div>
        <button 
            type="button"
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 shadow-sm text-xs uppercase tracking-widest"
        >
          <Plus size={18} />
          Добавить сотрудника
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                <th className="p-4 font-bold">Сотрудник</th>
                <th className="p-4 font-bold">Роль</th>
                <th className="p-4 font-bold">Статус</th>
                <th className="p-4 font-bold">Детали</th>
                <th className="p-4 font-bold">Контакты</th>
                <th className="p-4 font-bold text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {visibleEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer" onClick={() => handleEdit(emp)}>
                  <td className="p-4 font-bold text-slate-800 dark:text-slate-100">
                      <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700`}>
                              {emp.avatar ? (
                                  <img src={emp.avatar} alt={emp.fullName} className="w-full h-full object-cover" />
                              ) : (
                                  <User size={18} className="text-slate-400" />
                              )}
                          </div>
                          <div>
                              {emp.fullName}
                              {emp.birthYear && <span className="block text-[10px] text-slate-400">{emp.birthYear.split('-')[0]} г.р.</span>}
                          </div>
                      </div>
                  </td>
                  <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getRoleColor(emp.role as string)}`}>
                          {emp.role}
                      </span>
                  </td>
                  <td className="p-4">
                      {emp.status === 'Fired' ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded text-[10px] font-bold uppercase">
                              Уволен
                          </span>
                      ) : (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded text-[10px] font-bold uppercase">
                              Активен
                          </span>
                      )}
                  </td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                    {emp.role === UserRole.Teacher ? (
                         <div className="flex flex-col gap-1">
                             <span className="flex items-center gap-1 font-medium"><BookOpen size={14}/> {emp.subjects && emp.subjects.length > 0 ? emp.subjects.join(', ') : (emp.subject || 'Нет предметов')}</span>
                         </div>
                    ) : (
                         <span className="flex items-center gap-1 font-medium" title={emp.permissions?.join(', ')}>
                             <Shield size={14}/> {emp.permissions?.length || 0} прав
                         </span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 font-medium">
                            <Phone size={14} className="text-slate-400" />
                            {emp.phone || '-'}
                        </div>
                        <div className="flex items-center gap-2 text-xs opacity-70 font-medium">
                            <Mail size={12} className="text-slate-400" />
                            {emp.email || '-'}
                        </div>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button type="button" className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {visibleEmployees.length === 0 && (
                  <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">
                          Список сотрудников пуст.
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && editingEmployee && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-700">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-xl flex-shrink-0">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                        <Briefcase size={18} className="text-blue-600 dark:text-blue-400"/>
                        {editingEmployee.id ? 'Редактирование' : 'Новый сотрудник'}
                    </h3>
                    <button 
                        type="button"
                        onClick={(e) => handleClose(e)} 
                        className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    
                    {/* TOP SECTION: Name & Birth Year */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <InputGroup 
                                label="ФИО Сотрудника" 
                                value={editingEmployee.fullName} 
                                onChange={(v: string) => { setEditingEmployee({...editingEmployee, fullName: v}); clearError('fullName'); }}
                                error={errors.fullName}
                                placeholder="Иванов Иван"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Дата рождения</label>
                            <DateRangePicker 
                                startDate={editingEmployee.birthYear || ''}
                                onChange={(d) => setEditingEmployee({...editingEmployee, birthYear: d})}
                                mode="single"
                                align="right"
                            />
                        </div>
                    </div>

                    {/* STATUS SECTION */}
                    <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Статус</label>
                            <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-600">
                                <button
                                    type="button"
                                    onClick={() => setEditingEmployee({ ...editingEmployee, status: 'Active', firingDate: undefined, firingReason: undefined })}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${editingEmployee.status !== 'Fired' ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                >
                                    Активен
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingEmployee({ ...editingEmployee, status: 'Fired' })}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${editingEmployee.status === 'Fired' ? 'bg-red-50 text-red-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                >
                                    Уволен
                                </button>
                            </div>
                        </div>

                        {editingEmployee.status === 'Fired' && (
                            <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-top-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-red-500 uppercase mb-1">Дата увольнения</label>
                                    <DateRangePicker 
                                        startDate={editingEmployee.firingDate || ''}
                                        onChange={(d) => setEditingEmployee({...editingEmployee, firingDate: d})}
                                        mode="single"
                                        className="w-full"
                                    />
                                </div>
                                <InputGroup 
                                    label="Причина ухода" 
                                    value={editingEmployee.firingReason} 
                                    onChange={(v: string) => setEditingEmployee({...editingEmployee, firingReason: v})}
                                    placeholder="Например: По собственному желанию"
                                />
                            </div>
                        )}
                    </div>

                    {/* Role Selection */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Роль в системе</label>
                        <div className="flex flex-wrap gap-2">
                            {(Object.values(UserRole) as string[]).filter(r => r !== UserRole.Developer).map(role => (
                                <button
                                    type="button"
                                    key={role}
                                    onClick={() => setEditingEmployee({ ...editingEmployee, role: role })}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                                        editingEmployee.role === role
                                        ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-300'
                                        : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                                    }`}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Branch Access */}
                    <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
                        <h4 className="font-bold text-amber-700 dark:text-amber-300 text-sm mb-3 flex items-center gap-2 uppercase tracking-tight">
                            <MapPin size={16}/> Филиалы
                        </h4>
                        
                        {isGlobalAdmin ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(Object.values(Branch) as Branch[]).map(branch => {
                                    const isSelected = editingEmployee.branches?.includes(branch);
                                    return (
                                        <div 
                                            key={branch}
                                            onClick={() => toggleBranch(branch)}
                                            className={`flex items-center gap-2 p-2 rounded cursor-pointer border transition-all text-xs font-bold ${
                                                isSelected 
                                                ? 'bg-white border-amber-400 text-amber-900 shadow-sm dark:bg-slate-800 dark:border-amber-700 dark:text-amber-100' 
                                                : 'border-transparent hover:bg-amber-100/50 dark:hover:bg-amber-900/20 text-slate-600 dark:text-slate-400'
                                            }`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 bg-white dark:bg-slate-700 dark:border-slate-600'}`}>
                                                {isSelected && <Check size={10} strokeWidth={4} />}
                                            </div>
                                            {branch}
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                {editingEmployee.branches && editingEmployee.branches.length > 0 ? (
                                    <ul className="list-disc list-inside">
                                        {editingEmployee.branches.map((b: string) => <li key={b}>{b}</li>)}
                                    </ul>
                                ) : (
                                    <p className="italic text-slate-400">Нет привязанных филиалов</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Contact Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup 
                            label="Телефон" 
                            value={editingEmployee.phone} 
                            onChange={(v: string) => { setEditingEmployee({...editingEmployee, phone: v}); clearError('phone'); }}
                            error={errors.phone}
                        />
                        <InputGroup 
                            label="Email (Логин)" 
                            value={editingEmployee.email} 
                            onChange={(v: string) => { setEditingEmployee({...editingEmployee, email: v}); clearError('email'); }}
                            error={errors.email}
                            placeholder="Будет использован для входа"
                        />
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Дата найма</label>
                            <DateRangePicker 
                                startDate={editingEmployee.hireDate || ''}
                                onChange={(d) => setEditingEmployee({...editingEmployee, hireDate: d})}
                                mode="single"
                                align="left"
                            />
                        </div>
                    </div>

                    {/* Dynamic Sections */}
                    {editingEmployee.role === UserRole.Teacher && (
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                            <h4 className="font-bold text-blue-700 dark:text-blue-300 text-sm mb-3 flex items-center gap-2 uppercase tracking-tight">
                                <BookOpen size={16}/> Предметы
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {(Array.from(new Set(courses.map(c => c.name))) as string[]).map(subject => {
                                    const isSelected = editingEmployee.subjects?.includes(subject);
                                    return (
                                        <button
                                            type="button"
                                            key={subject}
                                            onClick={() => toggleSubject(subject)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1 ${
                                                isSelected 
                                                ? 'bg-blue-500 text-white border-blue-600' 
                                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300'
                                            }`}
                                        >
                                            {subject}
                                            {isSelected && <Check size={10} strokeWidth={3} />}
                                        </button>
                                    );
                                })}
                            </div>
                            {courses.length === 0 && <p className="text-xs text-slate-400 italic font-medium">Сначала добавьте курсы в систему</p>}
                        </div>
                    )}

                    {(editingEmployee.role === UserRole.Admin || editingEmployee.role === UserRole.GeneralDirector || editingEmployee.role === UserRole.Director) && (
                        <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-900/30">
                             <h4 className="font-bold text-purple-700 dark:text-purple-300 text-sm mb-3 flex items-center gap-2 uppercase tracking-tight">
                                <Shield size={16}/> Права доступа
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                                {(ALL_PERMISSIONS as string[]).map(perm => (
                                    <label key={perm} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                                        <input 
                                            type="checkbox"
                                            checked={(editingEmployee.permissions || []).includes(perm)}
                                            onChange={() => togglePermission(perm)}
                                            className="rounded text-purple-600 focus:ring-purple-500"
                                        />
                                        {perm}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Note on Login & Password */}
                     <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-2 flex items-center gap-2 uppercase tracking-tight">
                            <Key size={16}/> Вход в систему
                        </h4>
                        <div className="space-y-4">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                Логин соответствует Email адресу. Вы можете задать пароль вручную или оставить пустым для автогенерации (только для новых сотрудников).
                            </p>
                            <InputGroup 
                                label="Пароль" 
                                value={editingEmployee.password} 
                                onChange={(v: string) => setEditingEmployee({...editingEmployee, password: v})}
                                placeholder={editingEmployee.id ? "Введите новый или оставьте пустым" : "Задайте пароль или оставьте пустым"}
                                type={showPassword ? "text" : "password"}
                                icon={showPassword ? EyeOff : Eye}
                                onIconClick={() => setShowPassword(!showPassword)}
                            />
                        </div>
                    </div>

                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between rounded-b-xl shrink-0">
                     {editingEmployee.id ? (
                        <button 
                            type="button"
                            onClick={(e) => handleDelete(e)} 
                            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-xl text-xs font-bold transition-colors uppercase tracking-widest"
                        >
                            Удалить
                        </button>
                     ) : <div></div>}
                    <div className="flex gap-2">
                        <button 
                            type="button"
                            onClick={(e) => handleClose(e)} 
                            className="px-6 py-2 text-xs text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold uppercase tracking-widest border-2 border-slate-200 dark:border-slate-700 transition-all"
                        >
                            Отмена
                        </button>
                        <button 
                            type="button"
                            onClick={(e) => handleSave(e)} 
                            className="px-8 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 uppercase tracking-widest"
                        >
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
