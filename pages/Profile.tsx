import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage, StorageKeys } from '../services/storage';
import { UserRole, UserProfile, Branch, Company, ALL_PERMISSIONS, SidebarItem, ModuleConfig, Employee } from '../types';
import * as LucideIcons from 'lucide-react';
import { 
    Save, User, Mail, Shield, Camera, CheckCircle, MapPin, Moon, Sun, LogOut, 
    Cloud, RefreshCw, HardDrive, AlertCircle, Check, Download, Settings, 
    Lock, Users, Layout, Palette, Megaphone, Layers, Calendar, CreditCard, 
    Briefcase, BookOpen, Award, AlertTriangle, Phone, FileQuestion, 
    BarChart3, Upload, Book, CheckSquare, ChevronRight, Search, ArrowLeft, Type,
    GripVertical, Eye, EyeOff, Edit3, X, GraduationCap, LayoutGrid, Info, Plus, Trash2,
    ShieldCheck, ShieldAlert, UserCheck, Globe, LockKeyhole, Zap, Eye as ViewIcon, Edit2 as EditIcon,
    ShieldX, FolderPlus, Folder, Library, Box, Archive, Package, ChevronDown, Smartphone, ShieldEllipsis, History
} from 'lucide-react';
import { useData } from '../hooks/useData';

// --- Types for granular permissions ---
// Fix for missing types
type PermissionLevel = 'view' | 'edit' | 'delete';
type AccessScope = 'own' | 'course' | 'all';

interface DetailedPermission {
  levels: PermissionLevel[];
  scope: AccessScope;
}

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

// --- Group icons for menu ---
// Fix for missing constant
const GROUP_ICONS = [
    { name: 'Folder', icon: Folder },
    { name: 'Layers', icon: Layers },
    { name: 'Library', icon: Library },
    { name: 'Briefcase', icon: Briefcase },
    { name: 'Box', icon: Box },
    { name: 'Archive', icon: Archive },
    { name: 'BookOpen', icon: BookOpen },
    { name: 'Package', icon: Package },
    { name: 'Settings', icon: Settings }
];

const MODULE_INFO: Record<keyof ModuleConfig, { label: string, icon: any }> = {
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
  
  useEffect(() => {
    if (company && !editingConfig) {
      setEditingConfig(JSON.parse(JSON.stringify(company)));
    }
  }, [company]);

  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'account' | 'roles' | 'cloud' | 'system'>('profile');
  const [innerAccessTab, setInnerAccessTab] = useState<'sidebar' | 'permissions'>('sidebar');
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);
  const [editingSidebarItem, setEditingSidebarItem] = useState<SidebarItem | null>(null);
  
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  // Security states
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);

  // Sidebar management states
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeData, setMergeData] = useState({ label: '', icon: 'Folder' });
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') return document.documentElement.classList.contains('dark');
    return false;
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    storage.set(StorageKeys.USER_PROFILE, user);
    if (editingConfig) {
      const updatedCompanies = companies.map(c => c.id === editingConfig.id ? editingConfig : c);
      if (!updatedCompanies.find(c => c.id === editingConfig.id)) {
          updatedCompanies.push(editingConfig);
      }
      setCompanies(updatedCompanies);
      storage.set(StorageKeys.COMPANIES, updatedCompanies);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    storage.notify('Настройки сохранены', 'success');
  };

  const handlePasswordUpdate = (e: React.FormEvent) => {
      e.preventDefault();
      if (!passwordForm.current || !passwordForm.new) {
          storage.notify('Заполните все поля пароля', 'warning');
          return;
      }
      if (passwordForm.new !== passwordForm.confirm) {
          storage.notify('Новые пароли не совпадают', 'error');
          return;
      }
      
      const currentEmployee = employees.find(e => e.email === user.email);
      if (currentEmployee && currentEmployee.password !== passwordForm.current) {
          storage.notify('Текущий пароль введен неверно', 'error');
          return;
      }

      const updatedEmployees = employees.map(emp => {
          if (emp.email === user.email) {
              return { ...emp, password: passwordForm.new };
          }
          return emp;
      });

      setEmployees(updatedEmployees);
      setPasswordForm({ current: '', new: '', confirm: '' });
      storage.notify('Пароль успешно изменен', 'success');
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUser({ ...user, avatar: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const toggleTheme = () => {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      setDarkMode(isDark);
  };

  const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer].includes(user.role);

  const tabs = [
    { id: 'profile', label: 'Профиль', icon: User },
    { id: 'account', label: 'Безопасность', icon: Lock },
    ...(isSuperUser ? [{ id: 'roles', label: 'Доступы', icon: Shield }] : []),
    { id: 'cloud', label: 'Облако', icon: Cloud },
    { id: 'system', label: 'Интерфейс', icon: Palette },
  ];

  const getRolePerms = (role: string): Record<string, DetailedPermission> => {
      const raw = editingConfig?.rolePermissions?.[role] || {};
      if (Array.isArray(raw)) {
          const converted: Record<string, DetailedPermission> = {};
          raw.forEach((modKey: string) => {
              converted[modKey] = { levels: ['view', 'edit'], scope: 'all' };
          });
          return converted;
      }
      return raw;
  };

  const confirmCreateRole = () => {
    const name = newRoleName.trim();
    if (name && editingConfig) {
      const perms = editingConfig.rolePermissions || {};
      if (perms[name]) {
        storage.notify('Такая роль уже существует', 'warning');
        return;
      }
      setEditingConfig({
        ...editingConfig,
        rolePermissions: { ...perms, [name]: {} }
      });
      setSelectedRoleForPerms(name);
      setNewRoleName('');
      setIsCreatingRole(false);
    }
  };

  const handleRemoveRole = (role: string) => {
    if (confirm(`Удалить роль "${role}"?`) && editingConfig) {
      const perms = { ...editingConfig.rolePermissions };
      delete perms[role];
      setEditingConfig({ ...editingConfig, rolePermissions: perms });
      if (selectedRoleForPerms === role) setSelectedRoleForPerms('');
    }
  };

  const updateGranularPermission = (role: string, moduleKey: string, level: PermissionLevel) => {
      if (!editingConfig) return;
      const rolePerms = { ...getRolePerms(role) };
      const current = rolePerms[moduleKey] || { levels: [], scope: 'all' };
      
      const newLevels = current.levels.includes(level)
          ? current.levels.filter(l => l !== level)
          : [...current.levels, level];
          
      rolePerms[moduleKey] = { ...current, levels: newLevels };
      
      setEditingConfig({
          ...editingConfig,
          rolePermissions: { ...editingConfig.rolePermissions, [role]: rolePerms }
      });
  };

  const updateAccessScope = (role: string, moduleKey: string, scope: AccessScope) => {
      if (!editingConfig) return;
      const rolePerms = { ...getRolePerms(role) };
      const current = rolePerms[moduleKey] || { levels: [], scope: 'all' };
      
      rolePerms[moduleKey] = { ...current, scope };
      
      setEditingConfig({
          ...editingConfig,
          rolePermissions: { ...editingConfig.rolePermissions, [role]: rolePerms }
      });
  };

  const toggleSidebarItem = (id: string) => {
    if (!editingConfig || !editingConfig.sidebarConfig) return;
    const config = [...editingConfig.sidebarConfig];
    const idx = config.findIndex(i => i.id === id);
    if (idx > -1) {
        config[idx].visible = !config[idx].visible;
        setEditingConfig({ ...editingConfig, sidebarConfig: config });
    }
  };

  const saveItemEdits = (item: SidebarItem) => {
    if (!editingConfig || !editingConfig.sidebarConfig) return;
    const updated = editingConfig.sidebarConfig.map(i => i.id === item.id ? item : i);
    setEditingConfig({ ...editingConfig, sidebarConfig: updated });
    setEditingSidebarItem(null);
  };

  const toggleSelection = (id: string) => {
      setSelectedItemIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const handleMergeIntoGroup = () => {
    if (!editingConfig || !editingConfig.sidebarConfig) return;
    if (!mergeData.label) {
        storage.notify("Введите название группы", 'warning');
        return;
    }

    const groupId = `group_${Date.now()}`;
    const newGroup: SidebarItem = {
        id: groupId,
        label: mergeData.label,
        path: '',
        icon: mergeData.icon,
        roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Teacher, UserRole.Financier],
        visible: true,
        isGroup: true
    };

    const updatedConfig = editingConfig.sidebarConfig.map(item => {
        if (selectedItemIds.has(item.id)) {
            return { ...item, parentId: groupId };
        }
        return item;
    });

    setEditingConfig({
        ...editingConfig,
        sidebarConfig: [newGroup, ...updatedConfig]
    });

    setShowMergeModal(false);
    setMergeData({ label: '', icon: 'Folder' });
    setSelectedItemIds(new Set());
    storage.notify('Группа создана', 'success');
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!editingConfig || !editingConfig.sidebarConfig || !draggedId || draggedId === targetId) return;

    const items = [...editingConfig.sidebarConfig];
    const draggedIdx = items.findIndex(i => i.id === draggedId);
    const targetIdx = items.findIndex(i => i.id === targetId);

    if (draggedIdx > -1 && targetIdx > -1) {
        const [movedItem] = items.splice(draggedIdx, 1);
        items.splice(targetIdx, 0, movedItem);
        setEditingConfig({ ...editingConfig, sidebarConfig: items });
    }
    setDraggedId(null);
  };

  const handleRemoveItem = (id: string) => {
    if (!editingConfig || !editingConfig.sidebarConfig) return;
    if (confirm('Удалить этот элемент?')) {
        const updated = editingConfig.sidebarConfig.filter(i => i.id !== id).map(i => i.parentId === id ? { ...i, parentId: undefined } : i);
        setEditingConfig({ ...editingConfig, sidebarConfig: updated });
    }
  };

  useEffect(() => {
    if (editingConfig && !selectedRoleForPerms && editingConfig.rolePermissions) {
      const firstRole = Object.keys(editingConfig.rolePermissions)[0];
      if (firstRole) setSelectedRoleForPerms(firstRole);
    }
  }, [editingConfig]);

  return (
    <div className="max-w-6xl mx-auto space-y-4 antialiased">
      {/* Header Area */}
      <div className="flex items-center justify-between gap-4 px-1">
        <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight leading-none">Настройки</h2>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">Конфигурация аккаунта и прав доступа</p>
        </div>
        <button 
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
        >
          {isSaved ? <Check size={14} strokeWidth={4} /> : <Save size={14} />}
          {isSaved ? 'Сохранено' : 'Сохранить изменения'}
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-700 overflow-x-auto hide-scrollbar shrink-0">
          {tabs.map(tab => (
            <button 
                key={tab.id}
                onClick={() => setActiveSettingsTab(tab.id as any)}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap
                    ${activeSettingsTab === tab.id 
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }
                `}
            >
                <tab.icon size={14} />
                {tab.label}
            </button>
          ))}
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[450px]">
          {activeSettingsTab === 'profile' && (
              <div className="p-8 space-y-10 animate-in fade-in duration-300">
                  <div className="flex items-center gap-8">
                      <div className="relative group shrink-0">
                          <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-700 overflow-hidden border-2 border-white dark:border-slate-600 shadow-sm">
                              {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={40} /></div>}
                          </div>
                          <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-lg shadow-md border-2 border-white dark:border-slate-800"><Camera size={14} /></button>
                          <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">{user.fullName || 'Без имени'}</h3>
                          <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">{user.role}</span>
                              <span className="text-[10px] text-slate-400 font-bold">{user.email}</span>
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t dark:border-slate-700">
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1">Полное имя</label>
                          <input type="text" value={user.fullName} onChange={e => setUser({...user, fullName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg p-3 text-sm font-bold outline-none transition-all" />
                      </div>
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1">Email / Логин</label>
                          <input type="email" value={user.email} onChange={e => setUser({...user, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg p-3 text-sm font-bold outline-none transition-all" />
                      </div>
                  </div>
              </div>
          )}

          {activeSettingsTab === 'account' && (
              <div className="p-8 space-y-8 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      {/* Password Form */}
                      <form onSubmit={handlePasswordUpdate} className="space-y-6">
                          <div>
                              <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                                  <ShieldEllipsis size={18} className="text-blue-600" />
                                  Смена пароля
                              </h4>
                              <p className="text-xs text-slate-500 font-medium">Регулярно обновляйте пароль для защиты доступа</p>
                          </div>
                          <div className="space-y-4">
                              <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-slate-500 ml-1">Текущий пароль</label>
                                  <input 
                                      type="password" 
                                      value={passwordForm.current}
                                      onChange={e => setPasswordForm({...passwordForm, current: e.target.value})}
                                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" 
                                  />
                              </div>
                              <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-slate-500 ml-1">Новый пароль</label>
                                  <input 
                                      type="password" 
                                      value={passwordForm.new}
                                      onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" 
                                  />
                              </div>
                              <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-slate-500 ml-1">Подтвердите новый пароль</label>
                                  <input 
                                      type="password" 
                                      value={passwordForm.confirm}
                                      onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" 
                                  />
                              </div>
                              <button 
                                  type="submit"
                                  className="w-full py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-md hover:bg-black transition-all active:scale-95"
                              >
                                  Обновить пароль
                              </button>
                          </div>
                      </form>

                      {/* 2FA & Sessions */}
                      <div className="space-y-8">
                          {/* 2FA Toggle */}
                          <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-6">
                              <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-50">
                                          <Smartphone size={20} />
                                      </div>
                                      <div>
                                          <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">Двухфакторная аутентификация</h4>
                                          <p className="text-[10px] text-slate-500 font-medium mt-1">Дополнительный код при входе через приложение</p>
                                      </div>
                                  </div>
                                  <button 
                                      onClick={() => setIsTwoFactorEnabled(!isTwoFactorEnabled)}
                                      className={`w-11 h-6 rounded-full transition-all relative ${isTwoFactorEnabled ? 'bg-blue-600 shadow-inner shadow-blue-900/20' : 'bg-slate-200 dark:bg-slate-700'}`}
                                  >
                                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isTwoFactorEnabled ? 'translate-x-5' : ''}`}></div>
                                  </button>
                              </div>
                          </div>

                          {/* Sessions History */}
                          <div className="space-y-4">
                              <div className="flex items-center gap-2 px-1">
                                  <History size={16} className="text-slate-400" />
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Активные сессии</h4>
                              </div>
                              <div className="space-y-2">
                                  {[
                                      { device: 'Windows PC • Chrome', location: 'Душанбе, TJ', time: 'Сейчас', ip: '217.11.189.44', active: true },
                                      { device: 'iPhone 15 Pro • Safari', location: 'Худжанд, TJ', time: '2 часа назад', ip: '192.168.1.5', active: false }
                                  ].map((session, idx) => (
                                      <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl hover:shadow-sm transition-all group">
                                          <div className="flex items-center gap-4">
                                              <div className={`p-2 rounded-lg ${session.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                                                  <Smartphone size={16} />
                                              </div>
                                              <div>
                                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{session.device}</p>
                                                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{session.location} • {session.ip}</p>
                                              </div>
                                          </div>
                                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${session.active ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50'}`}>
                                              {session.time}
                                          </span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="pt-8 border-t dark:border-slate-700">
                      <div className="bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-rose-600 shadow-sm border border-rose-50">
                                  <ShieldX size={24} />
                              </div>
                              <div>
                                  <h4 className="text-sm font-bold text-rose-800 dark:text-rose-400">Удаление учетной записи</h4>
                                  <p className="text-[10px] text-rose-600/70 font-medium mt-1">Это действие необратимо. Все ваши данные будут удалены без возможности восстановления.</p>
                              </div>
                          </div>
                          <button 
                              onClick={() => confirm('Вы уверены, что хотите удалить аккаунт? Это действие невозможно отменить.')}
                              className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition-all active:scale-95 whitespace-nowrap"
                          >
                              Удалить аккаунт
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {activeSettingsTab === 'roles' && editingConfig && (
              <div className="flex flex-col h-full animate-in fade-in duration-300">
                  <div className="px-6 border-b border-slate-100 dark:border-slate-700 flex gap-6 items-center bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
                      <button onClick={() => setInnerAccessTab('sidebar')} className={`py-3 text-xs font-bold border-b-2 transition-colors ${innerAccessTab === 'sidebar' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>Главное меню</button>
                      <button onClick={() => setInnerAccessTab('permissions')} className={`py-3 text-xs font-bold border-b-2 transition-colors ${innerAccessTab === 'permissions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>Настройка доступов</button>
                  </div>

                  <div className="flex-1 overflow-hidden">
                      {innerAccessTab === 'sidebar' ? (
                          <div className="p-6 space-y-4 overflow-y-auto max-h-[600px] custom-scrollbar">
                              <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                      <Info size={14} className="text-blue-500" />
                                      <p className="text-[11px] text-slate-500 font-medium">Перетаскивайте пункты за иконку слева или объединяйте их в группы.</p>
                                  </div>
                                  {selectedItemIds.size > 0 && (
                                      <button 
                                          onClick={() => setShowMergeModal(true)}
                                          className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all"
                                      >
                                          <FolderPlus size={14}/> Объединить в группу ({selectedItemIds.size})
                                      </button>
                                  )}
                              </div>

                              <div className="space-y-1 bg-slate-50/30 dark:bg-slate-900/10 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
                                  {editingConfig.sidebarConfig?.map((item) => {
                                      const Icon = (LucideIcons as any)[item.icon] || LucideIcons.HelpCircle;
                                      const isChild = !!item.parentId;
                                      const isSelected = selectedItemIds.has(item.id);
                                      const isDragging = draggedId === item.id;
                                      
                                      return (
                                          <div 
                                              key={item.id} 
                                              draggable
                                              onDragStart={(e) => handleDragStart(e, item.id)}
                                              onDragOver={handleDragOver}
                                              onDrop={(e) => handleDrop(e, item.id)}
                                              className={`
                                                  flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-xl border transition-all 
                                                  ${item.visible ? 'border-slate-100 dark:border-slate-700 shadow-sm' : 'opacity-40 grayscale'} 
                                                  ${isChild ? 'ml-8 border-l-2 border-l-blue-100 dark:border-l-blue-900/30' : ''}
                                                  ${isSelected ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/10' : ''}
                                                  ${isDragging ? 'opacity-20 bg-slate-100' : ''}
                                                  group/item
                                              `}
                                          >
                                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                                  <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-1 shrink-0">
                                                      <GripVertical size={14} />
                                                  </div>
                                                  
                                                  <div 
                                                      onClick={() => toggleSelection(item.id)}
                                                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 ${isSelected ? 'bg-blue-600 border-blue-600 shadow-sm' : 'bg-white dark:bg-slate-700 border-slate-200'}`}
                                                  >
                                                      {isSelected && <Check size={12} strokeWidth={4} className="text-white"/>}
                                                  </div>

                                                  <div className={`p-2 rounded-lg shrink-0 ${item.visible ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'} ${item.isGroup ? 'bg-purple-50 text-purple-600' : ''}`}>
                                                      <Icon size={14}/>
                                                  </div>
                                                  <div className="min-w-0">
                                                      <span className={`font-bold text-xs ${item.visible ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 line-through'} truncate`}>
                                                          {item.label}
                                                      </span>
                                                      {item.isGroup && <span className="ml-2 text-[8px] bg-purple-100 text-purple-600 px-1 rounded font-bold uppercase">Группа</span>}
                                                  </div>
                                              </div>

                                              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                  <button onClick={() => setEditingSidebarItem(item)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit3 size={14}/></button>
                                                  <button onClick={() => toggleSidebarItem(item.id)} className={`p-1.5 transition-colors ${item.visible ? 'text-emerald-500' : 'text-slate-300'}`}>{item.visible ? <Eye size={14}/> : <EyeOff size={14}/>}</button>
                                                  <button onClick={() => handleRemoveItem(item.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-4 h-full">
                              {/* Sidebar Roles */}
                              <div className="lg:col-span-1 border-r border-slate-100 dark:border-slate-700 flex flex-col bg-slate-50/20">
                                  <div className="p-4 flex items-center justify-between border-b border-slate-50 dark:border-slate-700">
                                    <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Роли</h4>
                                    <button onClick={() => setIsCreatingRole(true)} className="p-1 text-blue-600 hover:bg-blue-50 rounded-md"><Plus size={14}/></button>
                                  </div>
                                  <div className="p-2 space-y-1 overflow-y-auto custom-scrollbar flex-1">
                                    {isCreatingRole && (
                                        <div className="p-2 space-y-2 animate-in slide-in-from-top-1">
                                            <input autoFocus type="text" placeholder="Имя роли" className="w-full text-xs p-2 rounded-lg border dark:bg-slate-700 outline-none font-bold" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmCreateRole()}/>
                                            <div className="flex gap-1"><button onClick={confirmCreateRole} className="flex-1 py-1.5 bg-blue-600 text-white rounded-md text-[10px] font-bold">Добавить</button><button onClick={() => setIsCreatingRole(false)} className="px-2 py-1.5 text-slate-400 bg-white dark:bg-slate-700 rounded-md text-[10px] border">Отмена</button></div>
                                        </div>
                                    )}
                                    {editingConfig.rolePermissions && Object.keys(editingConfig.rolePermissions).map(role => (
                                      <div key={role} className="group flex items-center justify-between gap-1">
                                        <button onClick={() => setSelectedRoleForPerms(role)} className={`flex-1 text-left px-3 py-2.5 rounded-lg text-[11px] font-bold transition-all ${selectedRoleForPerms === role ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{role}</button>
                                        <button onClick={() => handleRemoveRole(role)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                                      </div>
                                    ))}
                                  </div>
                              </div>
                              
                              {/* Permissions List */}
                              <div className="lg:col-span-3 overflow-y-auto custom-scrollbar">
                                  {selectedRoleForPerms ? (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-700 animate-in fade-in duration-300">
                                      <div className="p-4 bg-blue-50/30 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30 sticky top-0 z-10 backdrop-blur-md">
                                          <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                                              <ShieldCheck size={14}/> Управление доступом: {selectedRoleForPerms}
                                          </h4>
                                      </div>
                                      {Object.entries(MODULE_INFO).map(([key, info]) => {
                                          const rolePerms = getRolePerms(selectedRoleForPerms);
                                          const current = rolePerms[key] || { levels: [], scope: 'all' };
                                          const isActive = current.levels.length > 0;
                                          const Icon = info.icon;
                                          
                                          return (
                                            <div key={key} className={`flex flex-col p-4 transition-all ${isActive ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-900/20 grayscale opacity-40 hover:opacity-100 hover:grayscale-0'}`}>
                                              <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-4 min-w-[180px]">
                                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm transition-all ${isActive ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20' : 'bg-white dark:bg-slate-700 text-slate-300 border-slate-100 dark:border-slate-600'}`}><Icon size={18} /></div>
                                                  <div>
                                                    <span className={`text-sm font-bold transition-colors ${isActive ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>{info.label}</span>
                                                    {!isActive && <span className="block text-[8px] font-bold text-slate-300 tracking-tight mt-0.5">Доступ закрыт</span>}
                                                  </div>
                                                </div>

                                                <div className="flex items-center gap-2 flex-1 justify-center">
                                                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                                        {(['view', 'edit', 'delete'] as PermissionLevel[]).map(lvl => {
                                                            const isSet = current.levels.includes(lvl);
                                                            const lLabel = lvl === 'view' ? 'Просмотр' : lvl === 'edit' ? 'Правка' : 'Удаление';
                                                            return (
                                                                <button key={lvl} onClick={() => updateGranularPermission(selectedRoleForPerms, key, lvl)} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all ${isSet ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-white dark:hover:bg-slate-700'}`}>
                                                                    {lLabel}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>

                                                {isActive && (
                                                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                                        {(['own', 'course', 'all'] as AccessScope[]).map(sc => (
                                                            <button key={sc} onClick={() => updateAccessScope(selectedRoleForPerms, key, sc)} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all ${current.scope === sc ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm border border-slate-100 dark:border-slate-600' : 'text-slate-400 hover:text-slate-50'}`}>
                                                                {sc === 'own' ? 'Только свои' : sc === 'course' ? 'Курс' : 'Все данные'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-300 py-32 bg-slate-50/30 dark:bg-slate-900/10">
                                      <LockKeyhole size={64} strokeWidth={1} className="mb-4 text-slate-200" />
                                      <h5 className="text-sm font-bold text-slate-400">Выберите роль для настройки прав</h5>
                                    </div>
                                  )}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {activeSettingsTab === 'system' && (
              <div className="p-8 space-y-10 animate-in fade-in duration-300">
                  <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                          <Palette size={16} className="text-blue-600"/> Цвет элементов интерфейса
                      </h4>
                      <div className="flex flex-wrap gap-3">
                          {THEME_OPTIONS.map(opt => (
                              <button key={opt.name} onClick={() => setUser({...user, themeColor: opt.name})} className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${user.themeColor === opt.name ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-sm' : 'border-slate-50 dark:border-slate-700'}`}>
                                  <div className="w-10 h-10 rounded-lg shadow-sm border border-white/20" style={{ backgroundColor: opt.color }}></div>
                                  <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{opt.label}</span>
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="pt-8 border-t dark:border-slate-700 flex flex-col sm:flex-row gap-4">
                      <button onClick={toggleTheme} className="flex-1 flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 group transition-all hover:bg-slate-100 dark:hover:bg-slate-800">
                          <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${darkMode ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-orange-400 text-white shadow-orange-500/20'}`}>
                                  {darkMode ? <Moon size={18} /> : <Sun size={18} />}
                              </div>
                              <span className="font-bold text-xs text-slate-700 dark:text-slate-200">Тема оформления</span>
                          </div>
                          <div className={`w-10 h-5 rounded-full relative transition-colors ${darkMode ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-5' : ''}`}></div></div>
                      </button>
                      
                      <button onClick={() => { localStorage.removeItem(StorageKeys.USER_PROFILE); navigate('/login'); }} className="flex-1 flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-900/10 text-rose-600 rounded-xl border border-rose-100 dark:border-rose-900/30 group transition-all hover:bg-rose-100 dark:hover:bg-rose-900/20">
                          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20"><LogOut size={18} /></div>
                          <span className="font-bold text-xs uppercase tracking-tight">Выйти из аккаунта</span>
                      </button>
                  </div>
              </div>
          )}

          {activeSettingsTab === 'cloud' && (
              <div className="p-20 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-500">
                  <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 text-slate-200 dark:text-slate-700">
                    <Cloud size={48} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">Функционал в разработке</h4>
                  <p className="text-xs text-slate-400 max-w-xs font-medium">Данный раздел будет доступен в следующем системном обновлении.</p>
              </div>
          )}
      </div>

      {/* Merge Group Modal */}
      {showMergeModal && (
          <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                      <h3 className="font-bold text-sm">Создание группы меню</h3>
                      <button onClick={() => setShowMergeModal(false)} className="text-slate-400"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Название группы</label>
                          <input 
                              type="text" 
                              autoFocus
                              value={mergeData.label} 
                              onChange={e => setMergeData({...mergeData, label: e.target.value})}
                              placeholder="Например: Обучение"
                              className="w-full border rounded-lg p-2.5 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Иконка группы</label>
                          <div className="grid grid-cols-4 gap-2">
                              {GROUP_ICONS.map(item => (
                                  <button
                                      key={item.name}
                                      onClick={() => setMergeData({...mergeData, icon: item.name})}
                                      className={`p-3 rounded-xl flex items-center justify-center border-2 transition-all ${mergeData.icon === item.name ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105' : 'bg-slate-50 dark:bg-slate-700 border-transparent hover:border-slate-300'}`}
                                  >
                                      <item.icon size={20} />
                                  </button>
                              ))}
                          </div>
                      </div>
                      <p className="text-[9px] text-slate-400 italic text-center font-medium">Выбранные модули ({selectedItemIds.size}) будут перемещены в эту группу.</p>
                  </div>
                  <div className="p-4 border-t dark:border-slate-700 flex gap-2 bg-slate-50 dark:bg-slate-800/50">
                      <button onClick={() => setShowMergeModal(false)} className="flex-1 px-4 py-2 text-xs text-slate-500 font-bold">Отмена</button>
                      <button onClick={handleMergeIntoGroup} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-md">Создать</button>
                  </div>
              </div>
          </div>
      )}

      {/* Sidebar Item Edit Modal */}
      {editingSidebarItem && (
          <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 dark:border-slate-700 animate-in zoom-in-95">
                  <header className="p-4 border-b dark:border-slate-700 bg-slate-50/50 flex justify-between items-center">
                      <h3 className="font-bold text-sm uppercase tracking-tight">Редактор пункта меню</h3>
                      <button onClick={() => setEditingSidebarItem(null)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><X size={20}/></button>
                  </header>
                  <div className="p-6 space-y-4">
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Заголовок</label>
                          <input type="text" value={editingSidebarItem.label} onChange={e => setEditingSidebarItem({...editingSidebarItem, label: e.target.value})} className="w-full border rounded-lg p-2.5 text-sm font-bold bg-slate-50 dark:bg-slate-900 outline-none focus:border-blue-500 transition-all" />
                      </div>
                      {!editingSidebarItem.isGroup && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Путь (Path)</label>
                            <input type="text" value={editingSidebarItem.path} onChange={e => setEditingSidebarItem({...editingSidebarItem, path: e.target.value})} className="w-full border rounded-lg p-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-900 outline-none focus:border-blue-500 transition-all" />
                        </div>
                      )}
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-center gap-3">
                         {(() => { const Icon = (LucideIcons as any)[editingSidebarItem.icon] || LucideIcons.HelpCircle; return <Icon className="text-blue-500" size={18}/> })()}
                         <div>
                            <p className="text-[9px] font-bold text-blue-500 uppercase">Иконка (Lucide)</p>
                            <p className="text-[10px] font-mono text-slate-600 dark:text-slate-300">{editingSidebarItem.icon}</p>
                         </div>
                      </div>
                  </div>
                  <footer className="p-4 border-t dark:border-slate-700 flex justify-end gap-2 bg-slate-50 dark:bg-slate-900/50">
                      <button onClick={() => setEditingSidebarItem(null)} className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Отмена</button>
                      <button onClick={() => saveItemEdits(editingSidebarItem)} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-xs shadow-sm active:scale-95 transition-all">Применить</button>
                  </footer>
              </div>
          </div>
      )}
    </div>
  );
};
