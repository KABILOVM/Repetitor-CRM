
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Employee, UserRole, UserProfile, Branch, Course, Company, BranchEntity } from '../types';
import { Mail, Phone, MoreHorizontal, Plus, X, Save, User, BookOpen, Briefcase, Shield, Key, MapPin, Check, Calendar, AlertTriangle, Eye, EyeOff, Wallet, Landmark, Smartphone, Activity, UserPlus, Info, Trash2, ShieldCheck, ChevronDown, UserMinus, FileText, Edit3, Camera, Upload, Trash } from 'lucide-react';
import { DateRangePicker } from '../components/DateRangePicker';
import { Checkbox } from '../components/Checkbox';
import { useData } from '../hooks/useData';
import { CustomSelect } from '../components/CustomSelect';

const compressImage = (dataUrl: string, maxWidth = 400, maxHeight = 400): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
            } else {
                if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
            }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = dataUrl;
    });
};

const InputGroup = ({ label, value, onChange, type = "text", placeholder = "", className = "", disabled = false, error = false, icon: Icon, onIconClick, children, subtitle, ...props }: any) => (
    <div className={className}>
      {label && <label className={`block text-xs font-semibold mb-1.5 ml-1 transition-colors ${error ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
          {label}
      </label>}
      <div className="relative flex gap-1.5">
        <div className="relative flex-1 group/field">
            <input
              type={type}
              value={value || ''}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className={`w-full border rounded-xl px-4 text-sm font-bold outline-none transition-all duration-300 h-[42px]
                  ${error 
                      ? 'border-red-500 ring-4 ring-red-500/10 bg-red-50 dark:bg-red-900/10 text-red-900 placeholder-red-300' 
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 placeholder-slate-400 shadow-sm'
                  }
                  ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-900' : ''}
                  ${Icon ? 'pr-10' : ''}
              `}
              {...props}
            />
            {Icon && (
                <button 
                    type="button" 
                    onClick={onIconClick}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-colors"
                >
                    <Icon size={18} />
                </button>
            )}
        </div>
        {children}
      </div>
      {subtitle && <p className="text-[10px] text-slate-400 mt-1 ml-1 font-medium">{subtitle}</p>}
    </div>
  );

export const Employees: React.FC = () => {
  const [employees, setEmployees] = useData<Employee[]>(StorageKeys.EMPLOYEES, []);
  const [branches] = useData<BranchEntity[]>(StorageKeys.BRANCHES, []);
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  
  const companyConfig = useMemo(() => storage.getCompanyConfig(user.companyId), [user.companyId]);
  
  // Dynamic Role List from Super Admin's config
  const availableRoles = useMemo(() => {
      if (!companyConfig.rolePermissions) {
          return Object.values(UserRole).filter(r => r !== UserRole.Developer);
      }
      return Object.keys(companyConfig.rolePermissions);
  }, [companyConfig]);

  const activeBranches = useMemo(() => branches.filter(b => b.isActive).map(b => b.name).sort(), [branches]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPhone2, setShowPhone2] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalEmployeeRef = useRef<string>('');

  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('Все филиалы');
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const stopCamera = () => {
      if (stream) { stream.getTracks().forEach(track => track.stop()); setStream(null); }
      setShowCamera(false);
  };

  const handleClose = () => {
      stopCamera();
      const currentData = JSON.stringify(editingEmployee);
      if (editingEmployee && currentData !== originalEmployeeRef.current && !confirm('Есть несохраненные изменения. Закрыть окно?')) return;
      setIsModalOpen(false);
      setEditingEmployee(null);
      setErrors({});
      setShowPassword(false);
      setShowPhone2(false);
      setShowPhotoMenu(false);
  };

  const visibleEmployees = useMemo(() => {
      let filtered = employees;
      const isSuperUser = user.role === UserRole.GeneralDirector || user.role === UserRole.Director || user.role === UserRole.Developer;
      if (isSuperUser) {
          if (selectedBranchFilter !== 'Все филиалы') {
              filtered = employees.filter(e => (e.branches || (e.branch ? [e.branch] : [])).includes(selectedBranchFilter as Branch));
          }
      } else if (user.branch) {
          filtered = employees.filter(e => (e.branches || (e.branch ? [e.branch] : [])).includes(user.branch as Branch));
      }
      return filtered.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [employees, user, selectedBranchFilter]);

  const handleAddNew = () => {
    const isGlobalAdmin = user.role === UserRole.GeneralDirector || user.role === UserRole.Director || user.role === UserRole.Developer;
    const newEmp: Partial<Employee> = {
        role: availableRoles[0] || UserRole.Teacher, 
        branches: !isGlobalAdmin && user.branch ? [user.branch] : [], 
        status: 'Active', 
        phone: '+992 ', 
        password: '', 
        walletType: 'DC', 
        hireDate: new Date().toISOString().split('T')[0], 
        companyId: user.companyId || 'repetitor_tj'
    };
    setEditingEmployee(newEmp);
    originalEmployeeRef.current = JSON.stringify(newEmp);
    setIsModalOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    const empData = { ...employee, password: '' };
    if (!empData.lastName && empData.fullName) {
        const parts = empData.fullName.split(' ');
        empData.lastName = parts[0] || '';
        empData.firstName = parts[1] || '';
        empData.middleName = parts.slice(2).join(' ') || '';
    }
    setEditingEmployee(empData);
    setShowPhone2(!!empData.phone2);
    originalEmployeeRef.current = JSON.stringify(empData);
    setIsModalOpen(true);
  };

  const handleCapture = async () => {
      if (videoRef.current) {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
          const compressed = await compressImage(canvas.toDataURL('image/jpeg', 0.8));
          setEditingEmployee(prev => prev ? ({ ...prev, avatar: compressed }) : null);
          stopCamera();
          setShowPhotoMenu(false);
      }
  };

  const handleSave = () => {
    const newErrors: Record<string, boolean> = {};
    if (!editingEmployee?.firstName?.trim()) newErrors.firstName = true;
    if (!editingEmployee?.lastName?.trim()) newErrors.lastName = true;
    if (!editingEmployee?.email?.trim()) newErrors.email = true;
    if (!editingEmployee?.hireDate) newErrors.hireDate = true;
    
    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        storage.notify('Заполните обязательные поля', 'error');
        return;
    }

    const fullName = `${editingEmployee?.lastName} ${editingEmployee?.firstName} ${editingEmployee?.middleName || ''}`.trim();
    const isNew = !editingEmployee?.id;
    
    let finalPassword = '';
    let mustChange = false;

    if (isNew) {
        const autoTempPassword = Math.random().toString(36).slice(-8);
        finalPassword = editingEmployee?.password?.trim() || autoTempPassword;
        mustChange = true;
        
        if (!editingEmployee?.password) {
            const systemUrl = window.location.origin;
            const welcomeMsg = `Добро пожаловать в систему!\n\nЛогин: ${editingEmployee?.email}\nВременный пароль: ${autoTempPassword}\n\n${systemUrl}`;
            setTimeout(() => { alert(welcomeMsg); }, 500);
        }
    } else {
        const originalEmployee = employees.find(e => e.id === editingEmployee.id);
        if (editingEmployee?.password?.trim()) {
            finalPassword = editingEmployee.password.trim();
            mustChange = true;
        } else {
            finalPassword = originalEmployee?.password || '';
            mustChange = originalEmployee?.mustChangePassword || false;
        }
    }

    const payload = {
        ...editingEmployee,
        fullName,
        login: editingEmployee?.email,
        password: finalPassword,
        mustChangePassword: mustChange,
    } as Employee;

    let updated: Employee[];
    if (editingEmployee?.id) {
        updated = employees.map(t => t.id === editingEmployee.id ? payload : t);
    } else {
        const newEmployee = { ...payload, id: Date.now() } as Employee;
        updated = [...employees, newEmployee];
    }
    
    setEmployees(updated);
    setIsModalOpen(false);
    setEditingEmployee(null);
    storage.notify('Сотрудник сохранен', 'success');
  };

  return (
    <div className="space-y-6 antialiased font-sans">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Сотрудники</h2>
            {(user.role === UserRole.GeneralDirector || user.role === UserRole.Director || user.role === UserRole.Developer) && (
                <div className="w-56 mt-2">
                    <CustomSelect 
                        value={selectedBranchFilter} 
                        onChange={setSelectedBranchFilter}
                        options={['Все филиалы', ...activeBranches]}
                        icon={MapPin}
                    />
                </div>
            )}
        </div>
        <button 
            type="button"
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 text-xs uppercase tracking-widest active:scale-95"
        >
          <Plus size={18} strokeWidth={3} /> Новый сотрудник
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                <th className="p-3 pl-8">Сотрудник</th>
                <th className="p-3">Роль</th>
                <th className="p-3">Статус</th>
                <th className="p-3">Филиалы</th>
                <th className="p-3">Контакты</th>
                <th className="p-3 text-right pr-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {visibleEmployees.map(emp => (
                <tr key={emp.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${emp.status === 'Fired' ? 'opacity-60' : ''}`} onClick={() => handleEdit(emp)}>
                  <td className="p-3 pl-8">
                      <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0 border-2 border-white dark:border-slate-600 shadow-sm">
                              {emp.avatar ? <img src={emp.avatar} alt={emp.fullName} className="w-full h-full object-cover" /> : <User size={16} className="text-slate-400" />}
                          </div>
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-tight">{emp.fullName}</span>
                      </div>
                  </td>
                  <td className="p-3 text-xs font-bold uppercase text-slate-500">{emp.role}</td>
                  <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border ${emp.status === 'Fired' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{emp.status === 'Fired' ? 'Уволен' : 'Активен'}</span>
                  </td>
                  <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                          {(emp.branches || (emp.branch ? [emp.branch] : [])).map(b => (
                              <span key={b} className="text-[9px] font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-50 uppercase">{b.split('(')[0]}</span>
                          ))}
                      </div>
                  </td>
                  <td className="p-3 text-xs font-bold text-slate-600">{emp.phone || '-'}</td>
                  <td className="p-3 text-right pr-8">
                    <button type="button" className="p-2 text-slate-300 hover:text-blue-500"><MoreHorizontal size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && editingEmployee && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-4xl flex flex-col border border-slate-100 dark:border-slate-700 overflow-hidden my-auto max-h-[95vh] antialiased">
                <header className="px-6 py-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20"><Briefcase size={22} /></div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white tracking-tight uppercase leading-none">
                                {editingEmployee.id ? 'Карточка сотрудника' : 'Регистрация сотрудника'}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Персональные и системные данные</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 text-slate-400 hover:text-red-500 transition-all bg-white dark:bg-slate-700 rounded-xl border shadow-sm"><X size={20} /></button>
                </header>
                
                <div className="p-8 space-y-8 overflow-y-auto overflow-x-hidden custom-scrollbar bg-white dark:bg-slate-800 flex-1">
                    
                    <div className="flex gap-8 items-start">
                        <div className="relative shrink-0 pt-1">
                            <div className="w-24 h-24 rounded-3xl bg-slate-50 dark:bg-slate-700 overflow-hidden border-2 border-slate-100 dark:border-slate-700 shadow-inner flex items-center justify-center">
                                {editingEmployee.avatar ? <img src={editingEmployee.avatar} className="w-full h-full object-cover" /> : <User size={40} className="text-slate-200" />}
                            </div>
                            <button 
                                type="button"
                                onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                                className="absolute -bottom-2 -right-2 p-2 bg-blue-600 text-white rounded-xl border-4 border-white dark:border-slate-800 hover:bg-blue-700 shadow-lg transition-all active:scale-90"
                            >
                                <Camera size={14} strokeWidth={3}/>
                            </button>
                            
                            {showPhotoMenu && (
                                <div className="absolute top-full left-0 mt-3 w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-[100] p-1.5 animate-in fade-in zoom-in-95 duration-100">
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl"><Upload size={16}/> Загрузить файл</button>
                                    <button type="button" onClick={async () => {
                                        setShowCamera(true); setShowPhotoMenu(false);
                                        const ms = await navigator.mediaDevices.getUserMedia({ video: true });
                                        setStream(ms); if (videoRef.current) videoRef.current.srcObject = ms;
                                    }} className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl"><Camera size={16}/> Сделать фото</button>
                                    {editingEmployee.avatar && <button type="button" onClick={() => { setEditingEmployee(p => p ? ({...p, avatar: undefined}) : null); setShowPhotoMenu(false); }} className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl border-t dark:border-slate-700 mt-1"><Trash size={16}/> Удалить фото</button>}
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = async (evt) => {
                                        const compressed = await compressImage(evt.target?.result as string);
                                        setEditingEmployee(p => p ? ({ ...p, avatar: compressed }) : null);
                                        setShowPhotoMenu(false);
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }} />
                        </div>

                        <div className="flex-1 grid grid-cols-12 gap-4">
                            <InputGroup className="col-span-4" label="Фамилия *" value={editingEmployee.lastName} onChange={(v: string) => { setEditingEmployee(p => p ? ({...p, lastName: v}) : null); setErrors(e => ({...e, lastName: false})); }} error={errors.lastName} placeholder="Иванов" />
                            <InputGroup className="col-span-4" label="Имя *" value={editingEmployee.firstName} onChange={(v: string) => { setEditingEmployee(p => p ? ({...p, firstName: v}) : null); setErrors(e => ({...e, firstName: false})); }} error={errors.firstName} placeholder="Иван" />
                            <InputGroup className="col-span-4" label="Отчество" value={editingEmployee.middleName} onChange={(v: string) => setEditingEmployee(p => p ? ({...p, middleName: v}) : null)} placeholder="Сергеевич" />
                            
                            <div className="col-span-3 mt-4">
                                <DateRangePicker label="Дата рождения" startDate={editingEmployee.birthYear || ''} onChange={(d) => setEditingEmployee(prev => prev ? ({ ...prev, birthYear: d }) : null)} mode="single" className="w-full" align="left" />
                            </div>
                            <div className="col-span-3 mt-4">
                                <DateRangePicker label="Дата приема *" startDate={editingEmployee.hireDate || ''} onChange={(d) => { setEditingEmployee(prev => prev ? ({ ...prev, hireDate: d }) : null); setErrors(p => ({...p, hireDate: false})); }} mode="single" className="w-full" align="left" error={errors.hireDate} />
                            </div>
                            <div className="col-span-3 mt-4">
                                <CustomSelect label="Роль в системе" value={editingEmployee.role || ''} onChange={(v) => setEditingEmployee(p => p ? ({...p, role: v}) : null)} options={availableRoles} icon={Shield} className="h-[42px]" />
                            </div>
                            <div className="col-span-3 mt-4">
                                <CustomSelect label="Статус" value={editingEmployee.status === 'Fired' ? 'Уволен' : 'Активен'} onChange={(v) => setEditingEmployee(p => p ? ({...p, status: v === 'Уволен' ? 'Fired' : 'Active'}) : null)} options={['Активен', 'Уволен']} icon={Activity} className="h-[42px]" />
                            </div>
                        </div>
                    </div>

                    {showCamera && (
                        <div className="relative aspect-video bg-black rounded-[32px] overflow-hidden shadow-2xl border-4 border-white dark:border-slate-700 animate-in slide-in-from-top-4">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                                <button type="button" onClick={stopCamera} className="p-4 bg-white/20 backdrop-blur-xl text-white rounded-2xl hover:bg-white/40 transition-all border border-white/30"><X size={24}/></button>
                                <button type="button" onClick={handleCapture} className="p-5 bg-blue-600 text-white rounded-3xl shadow-2xl hover:bg-blue-700 active:scale-90 transition-all"><Camera size={32}/></button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-12 gap-6 pt-6 border-t dark:border-slate-700">
                        <InputGroup className="col-span-6" label="Email / Логин для входа" value={editingEmployee.email} onChange={(v: string) => { setEditingEmployee(p => p ? ({...p, email: v}) : null); setErrors(e => ({...e, email: false})); }} error={errors.email} placeholder="ivanov@example.com" icon={Mail} />
                        <InputGroup 
                            className="col-span-6" 
                            label={editingEmployee.id ? "Новый пароль" : "Пароль"} 
                            value={editingEmployee.password} 
                            onChange={(v: string) => setEditingEmployee(p => p ? ({...p, password: v}) : null)} 
                            placeholder={editingEmployee.id ? "Оставьте пустым, чтобы не менять" : "Сгенерируется автоматически"} 
                            type={showPassword ? "text" : "password"} 
                            icon={showPassword ? EyeOff : Eye} 
                            onIconClick={() => setShowPassword(!showPassword)} 
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">Доступ к филиалам</label>
                        <div className="flex flex-wrap gap-2.5 p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-inner">
                            {activeBranches.map(branchName => (
                                <div key={branchName} className="bg-white dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center shadow-sm hover:border-blue-300 transition-all cursor-pointer select-none">
                                    <Checkbox label={<span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tighter">{branchName}</span>} checked={!!editingEmployee.branches?.includes(branchName)} onChange={() => {
                                        const cur = editingEmployee.branches || [];
                                        setEditingEmployee(p => p ? ({...p, branches: cur.includes(branchName) ? cur.filter(b => b !== branchName) : [...cur, branchName]}) : null);
                                    }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <footer className="px-8 py-5 border-t dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center shrink-0">
                    <button type="button" onClick={handleClose} className="px-6 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 uppercase tracking-widest transition-all">Отмена</button>
                    <button type="button" onClick={handleSave} className="px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[20px] font-black shadow-2xl shadow-blue-600/30 flex items-center gap-3 transition-all active:scale-95 uppercase tracking-widest text-xs">
                        <Save size={20} strokeWidth={2.5}/> Сохранить карточку
                    </button>
                </footer>
            </div>
        </div>
      )}
    </div>
  );
};
