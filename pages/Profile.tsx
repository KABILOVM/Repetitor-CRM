
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage, StorageKeys } from '../services/storage';
import { UserRole, UserProfile, Company, SidebarItem, ModuleConfig, Employee } from '../types';
import * as LucideIcons from 'lucide-react';
import { 
    Save, User, Mail, Shield, Camera, Moon, Sun, LogOut, 
    Cloud, RefreshCw, AlertCircle, Check, Download, Settings, 
    Lock, Users, Layout, Palette, Megaphone, Layers, Calendar, CreditCard, 
    Briefcase, BookOpen, Award, AlertTriangle, Phone, FileQuestion, 
    BarChart3, Upload, Book, CheckSquare, ChevronRight, Search, ArrowLeft, Type,
    GripVertical, Eye, EyeOff, Edit3, X, GraduationCap, LayoutGrid, Info, Plus, Trash2,
    ShieldCheck, ShieldAlert, UserCheck, Globe, LockKeyhole, Zap, 
    ShieldX, FolderPlus, Folder, Library, Box, Archive, Package, ChevronDown, Smartphone, ShieldEllipsis, History, MapPin, KeyRound, SmartphoneNfc
} from 'lucide-react';
import { useData } from '../hooks/useData';

const THEME_OPTIONS = [
    { name: 'brand', label: 'Фирменный (Sky)', color: '#28A9E7' },
    { name: 'blue', label: 'Классический синий', color: '#2563eb' },
    { name: 'rose', label: 'Розовая мечта', color: '#e11d48' },
    { name: 'emerald', label: 'Лесная зелень', color: '#059669' },
    { name: 'amber', label: 'Золотой песок', color: '#d97706' },
    { name: 'purple', label: 'Королевский фиолет', color: '#9333ea' },
    { name: 'indigo', label: 'Ночной индиго', color: '#4f46e5' },
    { name: 'orange', label: 'Сочный оранжевый', color: '#ea580c' },
];

const MODULE_INFO: Record<string, { label: string, icon: any }> = {
    crm: { label: 'CRM (Воронка)', icon: Megaphone },
    students: { label: 'Ученики', icon: Users },
    courses: { label: 'Курсы и цены', icon: BookOpen },
    employees: { label: 'Сотрудники', icon: Briefcase },
    groups: { label: 'Учебные группы', icon: Layers },
    schedule: { label: 'Расписание', icon: Calendar },
    finance: { label: 'Финансы', icon: CreditCard },
    analytics: { label: 'Аналитика', icon: BarChart3 },
    exams: { label: 'Экзамены', icon: Award },
    violations: { label: 'Нарушения', icon: AlertTriangle },
    calls: { label: 'Звонки', icon: Phone },
    surveys: { label: 'Анкеты / Опросы', icon: FileQuestion },
    import: { label: 'Импорт данных', icon: Upload },
    journal: { label: 'Журнал оценок', icon: Book },
    tasks: { label: 'Задачи и спринты', icon: LayoutGrid },
    branches: { label: 'Филиалы', icon: MapPin },
    classes: { label: 'Обучение (LMS)', icon: GraduationCap }
};

const compressImage = (dataUrl: string, maxWidth = 400, maxHeight = 400): Promise<string> => {
    return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } }
            else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; } }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = dataUrl;
    });
};

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useData<UserProfile>(StorageKeys.USER_PROFILE, {
    fullName: 'Администратор',
    role: UserRole.GeneralDirector,
    email: 'admin@repetitor.tj',
    avatar: '',
    permissions: ['All'],
    themeColor: 'brand'
  });
  
  const [companies, setCompanies] = useData<Company[]>(StorageKeys.COMPANIES, []);
  const [employees, setEmployees] = useData<Employee[]>(StorageKeys.EMPLOYEES, []);
  
  const company = useMemo(() => {
    return companies.find(c => c.id === user.companyId) || storage.getCompanyConfig(user.companyId);
  }, [companies, user.companyId]);

  const [editingConfig, setEditingConfig] = useState<Company | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>(user.role);
  const [newRoleName, setNewRoleName] = useState('');
  const [isAddingRole, setIsAddingRole] = useState(false);

  // Password change state
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (company && !editingConfig) {
      setEditingConfig(JSON.parse(JSON.stringify(company)));
    }
  }, [company]);

  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'account' | 'roles' | 'cloud' | 'system'>('profile');

  const handleSave = () => {
    storage.set(StorageKeys.USER_PROFILE, user);
    if (editingConfig) {
      const updatedCompanies = companies.map(c => c.id === editingConfig.id ? editingConfig : c);
      setCompanies(updatedCompanies);
      storage.set(StorageKeys.COMPANIES, updatedCompanies);
    }
    storage.notify('Настройки сохранены', 'success');
  };

  const handleChangePassword = () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
        storage.notify('Заполните все поля для смены пароля', 'warning');
        return;
    }
    if (passwords.new !== passwords.confirm) {
        storage.notify('Новые пароли не совпадают', 'error');
        return;
    }
    if (passwords.new.length < 6) {
        storage.notify('Минимальная длина пароля — 6 символов', 'error');
        return;
    }

    const currentEmployee = employees.find(e => e.email === user.email);
    if (!currentEmployee || currentEmployee.password !== passwords.current) {
        storage.notify('Текущий пароль указан неверно', 'error');
        return;
    }

    const updatedEmployees = employees.map(e => 
        e.email === user.email ? { ...e, password: passwords.new, mustChangePassword: false } : e
    );
    setEmployees(updatedEmployees);
    setPasswords({ current: '', new: '', confirm: '' });
    storage.notify('Пароль успешно изменен', 'success');
  };

  const handleLogout = () => {
      localStorage.removeItem(StorageKeys.USER_PROFILE);
      navigate('/login');
      window.location.reload();
  };

  const handleAddRole = () => {
      if (!newRoleName.trim() || !editingConfig) return;
      if (editingConfig.rolePermissions?.[newRoleName]) {
          storage.notify('Роль с таким названием уже существует', 'error');
          return;
      }
      
      const updatedPerms = { 
          ...(editingConfig.rolePermissions || {}), 
          [newRoleName]: {} 
      };

      setEditingConfig({ ...editingConfig, rolePermissions: updatedPerms });
      setSelectedRole(newRoleName);
      setNewRoleName('');
      setIsAddingRole(false);
      storage.notify('Роль добавлена', 'success');
  };

  const handleDeleteRole = (roleToDelete: string) => {
      if (roleToDelete === UserRole.GeneralDirector || roleToDelete === UserRole.Developer) {
          storage.notify('Системные роли нельзя удалять', 'error');
          return;
      }
      if (!confirm(`Вы уверены, что хотите удалить роль "${roleToDelete}"?`)) return;
      if (!editingConfig) return;

      const updatedPerms = { ...(editingConfig.rolePermissions || {}) };
      delete updatedPerms[roleToDelete];

      setEditingConfig({ ...editingConfig, rolePermissions: updatedPerms });
      if (selectedRole === roleToDelete) {
          setSelectedRole(UserRole.GeneralDirector);
      }
      storage.notify('Роль удалена', 'info');
  };

  const togglePermission = (moduleKey: string, action: 'view' | 'edit' | 'delete') => {
      if (!editingConfig) return;
      const rolePerms = editingConfig.rolePermissions || {};
      const currentRoleData = rolePerms[selectedRole] || {};
      const modulePerms = currentRoleData[moduleKey] || { actions: [], scope: 'own' };
      
      let newActions = [...(modulePerms.actions || [])];
      if (newActions.includes(action)) {
          newActions = newActions.filter(a => a !== action);
      } else {
          newActions.push(action);
      }

      setEditingConfig({
          ...editingConfig,
          rolePermissions: {
              ...rolePerms,
              [selectedRole]: {
                  ...currentRoleData,
                  [moduleKey]: { ...modulePerms, actions: newActions }
              }
          }
      });
  };

  const updateScope = (moduleKey: string, scope: 'own' | 'course' | 'all') => {
      if (!editingConfig) return;
      const rolePerms = editingConfig.rolePermissions || {};
      const currentRoleData = rolePerms[selectedRole] || {};
      const modulePerms = currentRoleData[moduleKey] || { actions: [], scope: 'own' };

      setEditingConfig({
          ...editingConfig,
          rolePermissions: {
              ...rolePerms,
              [selectedRole]: {
                  ...currentRoleData,
                  [moduleKey]: { ...modulePerms, scope }
              }
          }
      });
  };

  const isSuperUser = user.role === UserRole.GeneralDirector || user.role === UserRole.Developer;

  const tabs = [
    { id: 'profile', label: 'Профиль', icon: User },
    { id: 'account', label: 'Безопасность', icon: Lock },
    ...(isSuperUser ? [{ id: 'roles', label: 'Роли и Права', icon: ShieldCheck }] : []),
    { id: 'cloud', label: 'Облако', icon: Cloud },
    { id: 'system', label: 'Интерфейс', icon: Palette },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4 antialiased">
      <div className="flex items-center justify-between gap-4 px-1">
        <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight uppercase">Настройки</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Персонализация и управление доступом</p>
        </div>
        <button 
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
        >
          <Save size={16} /> Сохранить изменения
        </button>
      </div>

      <div className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl flex items-center gap-1 border border-slate-200 dark:border-slate-700 overflow-x-auto hide-scrollbar shrink-0">
          {tabs.map(tab => (
            <button 
                key={tab.id}
                onClick={() => setActiveSettingsTab(tab.id as any)}
                className={`
                    flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                    ${activeSettingsTab === tab.id 
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }
                `}
            >
                <tab.icon size={14} strokeWidth={3} />
                {tab.label}
            </button>
          ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
          {activeSettingsTab === 'profile' && (
              <div className="p-10 space-y-12 animate-in fade-in duration-300">
                  <div className="flex items-center gap-10">
                      <div className="relative group shrink-0">
                          <div className="w-28 h-28 rounded-[32px] bg-slate-50 dark:bg-slate-700 overflow-hidden border-4 border-white dark:border-slate-600 shadow-xl">
                              {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><User size={48} /></div>}
                          </div>
                          <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2.5 rounded-2xl shadow-xl border-4 border-white dark:border-slate-800 hover:bg-blue-700 transition-all active:scale-90"><Camera size={16} strokeWidth={3}/></button>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = async () => {
                                      const compressed = await compressImage(reader.result as string);
                                      setUser({...user, avatar: compressed});
                                  };
                                  reader.readAsDataURL(file);
                              }
                          }} />
                      </div>
                      <div>
                          <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight uppercase">{user.fullName || 'Без имени'}</h3>
                          <div className="flex items-center gap-3 mt-3">
                              <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-lg border border-blue-100 uppercase tracking-widest">{user.role}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user.email}</span>
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t dark:border-slate-700">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Полное имя (ФИО)</label>
                          <input type="text" value={user.fullName} onChange={e => setUser({...user, fullName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-2xl p-4 text-sm font-bold outline-none transition-all shadow-inner" />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email / Логин для входа</label>
                          <input type="email" value={user.email} onChange={e => setUser({...user, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-2xl p-4 text-sm font-bold outline-none transition-all shadow-inner" />
                      </div>
                  </div>

                  <div className="pt-12 border-t dark:border-slate-700">
                      <button 
                        onClick={handleLogout} 
                        className="flex items-center gap-4 p-5 bg-rose-50 dark:bg-rose-900/10 text-rose-600 rounded-[24px] border border-rose-100 dark:border-rose-900/30 group transition-all hover:bg-rose-600 hover:text-white"
                      >
                          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><LogOut size={24} /></div>
                          <div className="text-left">
                              <span className="block font-black text-sm uppercase tracking-widest">Выйти из системы</span>
                              <span className="text-[9px] font-bold opacity-60 uppercase tracking-tighter">Завершить текущую сессию и вернуться к входу</span>
                          </div>
                      </button>
                  </div>
              </div>
          )}

          {activeSettingsTab === 'account' && (
              <div className="p-10 space-y-10 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      {/* Смена пароля */}
                      <div className="space-y-6">
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><KeyRound size={20}/></div>
                              <h4 className="font-bold text-slate-800 dark:text-white uppercase tracking-tight">Смена пароля</h4>
                          </div>
                          
                          <div className="space-y-4">
                              <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Текущий пароль</label>
                                  <div className="relative">
                                      <input 
                                        type={showPass.current ? "text" : "password"} 
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 pr-12 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                                        value={passwords.current}
                                        onChange={e => setPasswords({...passwords, current: e.target.value})}
                                      />
                                      <button onClick={() => setShowPass({...showPass, current: !showPass.current})} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-colors">
                                          {showPass.current ? <EyeOff size={18}/> : <Eye size={18}/>}
                                      </button>
                                  </div>
                              </div>
                              <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Новый пароль</label>
                                  <div className="relative">
                                      <input 
                                        type={showPass.new ? "text" : "password"} 
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 pr-12 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                                        value={passwords.new}
                                        onChange={e => setPasswords({...passwords, new: e.target.value})}
                                      />
                                      <button onClick={() => setShowPass({...showPass, new: !showPass.new})} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-colors">
                                          {showPass.new ? <EyeOff size={18}/> : <Eye size={18}/>}
                                      </button>
                                  </div>
                              </div>
                              <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Подтвердите новый пароль</label>
                                  <div className="relative">
                                      <input 
                                        type={showPass.confirm ? "text" : "password"} 
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 pr-12 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                                        value={passwords.confirm}
                                        onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                                      />
                                      <button onClick={() => setShowPass({...showPass, confirm: !showPass.confirm})} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-colors">
                                          {showPass.confirm ? <EyeOff size={18}/> : <Eye size={18}/>}
                                      </button>
                                  </div>
                              </div>
                              <button 
                                onClick={handleChangePassword}
                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all hover:bg-slate-800"
                              >
                                Обновить пароль
                              </button>
                          </div>
                      </div>

                      {/* 2FA & Devices */}
                      <div className="space-y-6">
                           <div className="p-6 rounded-[32px] bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm"><SmartphoneNfc size={24}/></div>
                                    <div>
                                        <h5 className="font-bold text-slate-800 dark:text-white uppercase tracking-tight text-sm">Двухфакторная защита</h5>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mt-0.5">Повысьте безопасность аккаунта</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-6 font-medium">Для входа потребуется ввести код из приложения Google Authenticator или SMS-подтверждение.</p>
                                <button className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-blue-700 transition-all">Подключить</button>
                           </div>

                           <div className="space-y-4">
                               <h5 className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Активные сессии</h5>
                               <div className="space-y-2">
                                   <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-between">
                                       <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-50 dark:bg-slate-800 text-emerald-500 rounded-lg"><Smartphone size={16}/></div>
                                            <div>
                                                <p className="text-xs font-bold dark:text-white">Текущий браузер (Windows)</p>
                                                <p className="text-[9px] text-slate-400 uppercase font-black">Душанбе, Таджикистан • online</p>
                                            </div>
                                       </div>
                                       <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">Тут</span>
                                   </div>
                               </div>
                           </div>
                      </div>
                  </div>
              </div>
          )}

          {activeSettingsTab === 'roles' && editingConfig && (
              <div className="flex flex-1 overflow-hidden animate-in fade-in duration-300">
                  {/* Роли (Слева) */}
                  <aside className="w-72 border-r dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col shrink-0">
                      <div className="p-6 border-b dark:border-slate-700 bg-white dark:bg-slate-800/50 flex justify-between items-center">
                          <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Роли</h4>
                          {!isAddingRole ? (
                              <button onClick={() => setIsAddingRole(true)} className="p-1.5 bg-blue-600 text-white rounded-lg hover:scale-110 transition-all shadow-sm shadow-blue-500/20"><Plus size={14} strokeWidth={3}/></button>
                          ) : (
                              <button onClick={() => setIsAddingRole(false)} className="p-1.5 bg-slate-200 text-slate-400 rounded-lg"><X size={14} strokeWidth={3}/></button>
                          )}
                      </div>
                      <div className="p-3 space-y-1 overflow-y-auto custom-scrollbar flex-1">
                          {isAddingRole && (
                              <div className="p-2 space-y-2 animate-in slide-in-from-top-1 duration-200">
                                  <input 
                                    autoFocus
                                    className="w-full bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-xl p-3 text-xs font-bold outline-none shadow-lg"
                                    placeholder="Название роли..."
                                    value={newRoleName}
                                    onChange={e => setNewRoleName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddRole()}
                                  />
                                  <div className="flex gap-1">
                                      <button onClick={handleAddRole} className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-[10px] font-black uppercase">Создать</button>
                                      <button onClick={() => setIsAddingRole(false)} className="flex-1 bg-slate-200 text-slate-500 py-1.5 rounded-lg text-[10px] font-black uppercase">Отмена</button>
                                  </div>
                              </div>
                          )}
                          {Object.keys(editingConfig.rolePermissions || {}).map(roleName => (
                              <div key={roleName} className="relative group">
                                  <button
                                    onClick={() => setSelectedRole(roleName)}
                                    className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-bold transition-all uppercase tracking-tight ${selectedRole === roleName ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 translate-x-1' : 'text-slate-500 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-800'}`}
                                  >
                                      {roleName}
                                  </button>
                                  {roleName !== UserRole.GeneralDirector && roleName !== UserRole.Developer && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteRole(roleName); }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                          <Trash2 size={14} />
                                      </button>
                                  )}
                              </div>
                          ))}
                      </div>
                  </aside>

                  {/* Матрица прав (Центр) */}
                  <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-800">
                      <header className="p-6 border-b dark:border-slate-700 bg-slate-50/30">
                          <div className="flex flex-col gap-6">
                              <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Shield size={20}/></div>
                                  <div>
                                      <h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-tight">Управление доступом: {selectedRole}</h4>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Определите полномочия для каждого модуля</p>
                                  </div>
                              </div>

                              {/* Легенда */}
                              <div className="grid grid-cols-3 gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm">
                                  {[
                                      { id: 'own', icon: LockKeyhole, label: 'Свои записи', desc: 'Видит только записи, связанные с ним' },
                                      { id: 'course', icon: BookOpen, label: 'По курсу', desc: 'Видит записи своего курса (для учителей)' },
                                      { id: 'all', icon: Globe, label: 'Вся школа', desc: 'Полный доступ ко всем данным филиала/сети' }
                                  ].map(s => (
                                      <div key={s.id} className="flex flex-col gap-1">
                                          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                              <s.icon size={14}/>
                                              <span className="text-[10px] font-black uppercase tracking-tight">{s.label}</span>
                                          </div>
                                          <p className="text-[9px] text-slate-400 font-medium leading-tight">{s.desc}</p>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </header>

                      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-3">
                          <div className="grid grid-cols-[2fr_1fr_1fr] items-center gap-6 px-5 mb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              <div>Модуль системы</div>
                              <div className="text-center">Функции (Разрешения)</div>
                              <div className="text-center">Масштаб доступа (Scope)</div>
                          </div>

                          {Object.entries(MODULE_INFO).map(([key, info]) => {
                              const isEnabled = editingConfig.modules[key as keyof ModuleConfig];
                              const Icon = info.icon;
                              const rolePerms = editingConfig.rolePermissions?.[selectedRole]?.[key] || { actions: [], scope: 'own' };
                              
                              return (
                                  <div key={key} className={`grid grid-cols-[2fr_1fr_1fr] items-center gap-6 p-4 rounded-[24px] border transition-all ${isEnabled ? 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm' : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-50 dark:border-slate-800 opacity-80 grayscale'}`}>
                                      <div className="flex items-center gap-4 min-w-0">
                                          <div className={`p-3 rounded-2xl shrink-0 ${isEnabled ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                              <Icon size={20} />
                                          </div>
                                          <div className="truncate">
                                              <span className={`text-sm font-black uppercase tracking-tight block ${isEnabled ? 'text-slate-800 dark:text-white' : 'text-slate-500'}`}>{info.label}</span>
                                              {!isEnabled && <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Модуль отключен</span>}
                                          </div>
                                      </div>

                                      <div className="flex items-center justify-center gap-1 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-2xl border dark:border-slate-700 h-[42px]">
                                          {[
                                              { id: 'view', label: 'Просм.' },
                                              { id: 'edit', label: 'Правка' },
                                              { id: 'delete', label: 'Удал.' }
                                          ].map(action => {
                                              const isActive = (rolePerms.actions || []).includes(action.id);
                                              return (
                                                  <button
                                                      key={action.id}
                                                      disabled={!isEnabled}
                                                      onClick={() => togglePermission(key, action.id as any)}
                                                      className={`flex-1 h-full rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-white dark:hover:bg-slate-800'}`}
                                                  >
                                                      {action.label}
                                                  </button>
                                              );
                                          })}
                                      </div>

                                      <div className="flex items-center justify-center gap-1 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-2xl border dark:border-slate-700 h-[42px]">
                                          {[
                                              { id: 'own', icon: LockKeyhole, label: 'Свои' },
                                              { id: 'course', icon: BookOpen, label: 'Курс' },
                                              { id: 'all', icon: Globe, label: 'Школа' }
                                          ].map(s => {
                                              const isCurrent = rolePerms.scope === s.id;
                                              return (
                                                  <button
                                                      key={s.id}
                                                      disabled={!isEnabled}
                                                      onClick={() => updateScope(key, s.id as any)}
                                                      title={s.label}
                                                      className={`flex-1 h-full flex items-center justify-center gap-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isCurrent ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white dark:hover:bg-slate-800'}`}
                                                  >
                                                      <s.icon size={12} />
                                                      <span className="hidden xl:inline">{s.label}</span>
                                                  </button>
                                              );
                                          })}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </main>
              </div>
          )}

          {activeSettingsTab === 'system' && (
              <div className="p-10 space-y-12 animate-in fade-in duration-300">
                  <div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-white mb-8 flex items-center gap-3 uppercase tracking-widest">
                          <Palette size={20} className="text-blue-600"/> Палитра интерфейса
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                          {THEME_OPTIONS.map(opt => (
                              <button 
                                key={opt.name} 
                                onClick={() => setUser({...user, themeColor: opt.name})} 
                                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all group ${user.themeColor === opt.name ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-xl scale-105' : 'border-slate-50 dark:border-slate-700 hover:border-blue-200'}`}
                              >
                                  <div className="w-12 h-12 rounded-xl shadow-lg border-4 border-white dark:border-slate-800 group-hover:rotate-12 transition-transform" style={{ backgroundColor: opt.color }}></div>
                                  <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase text-center leading-tight tracking-tighter">{opt.label}</span>
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          )}
          
          {activeSettingsTab === 'cloud' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-20 text-slate-300">
                <div className="p-10 bg-slate-50 dark:bg-slate-900 rounded-full mb-8">
                    <ShieldCheck size={80} strokeWidth={1} className="opacity-10" />
                </div>
                <h4 className="text-xl font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Настройки активны</h4>
                <p className="text-sm font-bold uppercase text-slate-400 tracking-widest italic opacity-50">Параметры безопасности и синхронизации управляются автоматически</p>
            </div>
          )}
      </div>
    </div>
  );
};
