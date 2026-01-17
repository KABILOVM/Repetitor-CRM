
import React, { useState, useMemo } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Employee, UserRole, ALL_PERMISSIONS, UserProfile, Branch, Course } from '../types';
import { Mail, Phone, MoreHorizontal, Plus, X, Save, User, BookOpen, Briefcase, Shield, Key, MapPin, Check, Calendar, AlertTriangle } from 'lucide-react';
import { DateRangePicker } from '../components/DateRangePicker';

export const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>(() => storage.get(StorageKeys.EMPLOYEES, []));
  const courses = storage.get<Course[]>(StorageKeys.COURSES, []); // For subject list
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  
  // Validation State
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Check super user rights
  const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Financier].includes(user.role);
  const isGlobalAdmin = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer].includes(user.role);

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
      {error && <p className="text-[10px] text-red-500 mt-1 font-bold animate-pulse">Обязательное поле</p>}
    </div>
  );

  const handleAddNew = () => {
    const defaultBranches = !isGlobalAdmin && user.branch ? [user.branch] : [];
    
    setEditingEmployee({
        role: UserRole.Teacher,
        permissions: [],
        branches: defaultBranches,
        status: 'Active',
        subjects: [],
        phone: '+992 ' // Default phone
    });
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

    setEditingEmployee(empData);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = () => {
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

  const handleSave = () => {
    const newErrors: Record<string, boolean> = {};
    
    if (!editingEmployee?.fullName?.trim()) newErrors.fullName = true;
    if (!editingEmployee?.role) newErrors.role = true; // Should ideally not happen as it has default
    if (!editingEmployee?.email?.trim()) newErrors.email = true;
    
    // Validate phone (must have more than just +992 and space)
    const phone = editingEmployee?.phone?.trim() || '';
    if (phone.length <= 5) newErrors.phone = true;

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        // Optional: shake animation or focus logic
        return;
    }

    let updated: Employee[];
    
    const isNew = !editingEmployee?.id;
    const tempPassword = Math.random().toString(36).slice(-8);

    const payload = {
        ...editingEmployee,
        // Map email to login
        login: editingEmployee?.email,
        // Set password if new, else keep existing
        password: isNew ? tempPassword : editingEmployee?.password,
        // Set mustChangePassword if new
        mustChangePassword: isNew ? true : editingEmployee?.mustChangePassword,
        
        // Sync deprecated fields
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
        
        // Simulate sending email
        setTimeout(() => {
            alert(`📨 Имитация отправки email на ${newEmployee.email}:\n\n"Добро пожаловать в систему!\nВаш логин: ${newEmployee.email}\nВаш временный пароль: ${tempPassword}\n\nПожалуйста, смените пароль при первом входе."`);
        }, 500);
    }
    
    setEmployees(updated);
    storage.set(StorageKeys.EMPLOYEES, updated);
    setIsModalOpen(false);
    setEditingEmployee(null);
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
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Сотрудники</h2>
            
            {isSuperUser ? (
                <div className="flex items-center gap-2 mt-2">
                    <MapPin size={14} className="text-slate-400" />
                    <select 
                        value={selectedBranch} 
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="bg-transparent text-sm font-bold text-slate-600 dark:text-slate-300 border-b border-dashed border-slate-300 dark:border-slate-600 outline-none pb-0.5 cursor-pointer hover:text-blue-600"
                    >
                        <option value="All">Все филиалы</option>
                        {Object.values(Branch).map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>
            ) : (
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    {user.branch ? `Филиал: ${user.branch}` : 'Управление персоналом'}
                </p>
            )}
        </div>
        <button 
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} />
          Добавить сотрудника
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Сотрудник</th>
                <th className="p-4 font-medium">Роль</th>
                <th className="p-4 font-medium">Статус</th>
                <th className="p-4 font-medium">Детали</th>
                <th className="p-4 font-medium">Контакты</th>
                <th className="p-4 font-medium text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {visibleEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer" onClick={() => handleEdit(emp)}>
                  <td className="p-4 font-medium text-slate-800 dark:text-slate-100">
                      <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getRoleColor(emp.role as string)}`}>
                              {emp.fullName.charAt(0)}
                          </div>
                          <div>
                              {emp.fullName}
                              {emp.birthYear && <span className="block text-[10px] text-slate-400">{emp.birthYear.split('-')[0]} г.р.</span>}
                          </div>
                      </div>
                  </td>
                  <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getRoleColor(emp.role as string)}`}>
                          {emp.role}
                      </span>
                  </td>
                  <td className="p-4">
                      {emp.status === 'Fired' ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded text-xs font-bold">
                              Уволен
                          </span>
                      ) : (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded text-xs font-bold">
                              Активен
                          </span>
                      )}
                  </td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                    {emp.role === UserRole.Teacher ? (
                         <div className="flex flex-col gap-1">
                             <span className="flex items-center gap-1"><BookOpen size={14}/> {emp.subjects && emp.subjects.length > 0 ? emp.subjects.join(', ') : (emp.subject || 'Нет предметов')}</span>
                         </div>
                    ) : (
                         <span className="flex items-center gap-1" title={emp.permissions?.join(', ')}>
                             <Shield size={14}/> {emp.permissions?.length || 0} прав
                         </span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <Phone size={14} className="text-slate-400" />
                            {emp.phone || '-'}
                        </div>
                        <div className="flex items-center gap-2 text-xs opacity-70">
                            <Mail size={12} className="text-slate-400" />
                            {emp.email || '-'}
                        </div>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {visibleEmployees.length === 0 && (
                  <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Briefcase size={18} className="text-blue-600 dark:text-blue-400"/>
                        {editingEmployee.id ? 'Редактировать сотрудника' : 'Новый сотрудник'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
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
                                    onClick={() => setEditingEmployee({ ...editingEmployee, status: 'Active', firingDate: undefined, firingReason: undefined })}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${editingEmployee.status !== 'Fired' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                >
                                    Активен
                                </button>
                                <button
                                    onClick={() => setEditingEmployee({ ...editingEmployee, status: 'Fired' })}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${editingEmployee.status === 'Fired' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
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
                            {Object.values(UserRole).filter(r => r !== UserRole.Developer).map(role => (
                                <button
                                    key={role}
                                    onClick={() => setEditingEmployee({ ...editingEmployee, role: role })}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
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
                        <h4 className="font-bold text-amber-700 dark:text-amber-300 text-sm mb-3 flex items-center gap-2">
                            <MapPin size={16}/> Доступ к филиалам
                        </h4>
                        
                        {isGlobalAdmin ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {Object.values(Branch).map(branch => {
                                    const isSelected = editingEmployee.branches?.includes(branch);
                                    return (
                                        <div 
                                            key={branch}
                                            onClick={() => toggleBranch(branch)}
                                            className={`flex items-center gap-2 p-2 rounded cursor-pointer border transition-all text-xs font-medium ${
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
                            <div className="text-sm text-slate-600 dark:text-slate-300">
                                {editingEmployee.branches && editingEmployee.branches.length > 0 ? (
                                    <ul className="list-disc list-inside">
                                        {editingEmployee.branches.map(b => <li key={b}>{b}</li>)}
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
                            <h4 className="font-bold text-blue-700 dark:text-blue-300 text-sm mb-3 flex items-center gap-2">
                                <BookOpen size={16}/> Предметы преподавателя
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {Array.from(new Set(courses.map(c => c.name))).map(subject => {
                                    const isSelected = editingEmployee.subjects?.includes(subject);
                                    return (
                                        <button
                                            key={subject}
                                            onClick={() => toggleSubject(subject)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${
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
                            {courses.length === 0 && <p className="text-xs text-slate-400 italic">Сначала добавьте курсы в систему</p>}
                        </div>
                    )}

                    {(editingEmployee.role === UserRole.Admin || editingEmployee.role === UserRole.GeneralDirector || editingEmployee.role === UserRole.Director) && (
                        <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-900/30">
                             <h4 className="font-bold text-purple-700 dark:text-purple-300 text-sm mb-3 flex items-center gap-2">
                                <Shield size={16}/> Права доступа
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                                {ALL_PERMISSIONS.map(perm => (
                                    <label key={perm} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
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

                    {/* Note on Login */}
                     <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-2 flex items-center gap-2">
                            <Key size={16}/> Данные для входа
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Логин соответствует Email адресу. Пароль отправляется на почту при создании сотрудника.
                            При первом входе потребуется смена пароля.
                        </p>
                    </div>

                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between">
                     {editingEmployee.id ? (
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
