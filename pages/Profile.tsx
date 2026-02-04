
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage, StorageKeys } from '../services/storage';
import { UserRole, UserProfile, Branch, Company, SidebarItem, ModuleConfig, Employee } from '../types';
import * as LucideIcons from 'lucide-react';
import { 
    Save, User, Mail, Shield, Camera, CheckCircle, MapPin, Moon, Sun, LogOut, 
    Cloud, RefreshCw, HardDrive, AlertCircle, Check, Download, Settings, 
    Lock, Users, Layout, Palette, Megaphone, Layers, Calendar, CreditCard, 
    Briefcase, BookOpen, Award, AlertTriangle, Phone, FileQuestion, 
    BarChart3, Upload, Book, CheckSquare, ChevronRight, Search, ArrowLeft, Type,
    GripVertical, Eye, EyeOff, Edit3, X, GraduationCap, LayoutGrid, Info, Plus, Trash2,
    ShieldCheck, ShieldAlert, UserCheck, Globe, LockKeyhole, Zap, 
    ShieldX, FolderPlus, Folder, Library, Box, Archive, Package, ChevronDown, Smartphone, ShieldEllipsis, History
} from 'lucide-react';
import { useData } from '../hooks/useData';

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

const compressImage = (dataUrl: string, maxWidth = 400, maxHeight = 400): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
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
  
  useEffect(() => {
    if (company && !editingConfig) {
      setEditingConfig(JSON.parse(JSON.stringify(company)));
    }
  }, [company]);

  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'account' | 'roles' | 'cloud' | 'system'>('profile');
  const [innerAccessTab, setInnerAccessTab] = useState<'sidebar' | 'permissions'>('sidebar');
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);
  
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') return document.documentElement.classList.contains('dark');
    return false;
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    storage.set(StorageKeys.USER_PROFILE, user);
    if (editingConfig) {
      const updatedCompanies = companies.map(c => c.id === editingConfig.id ? editingConfig : c);
      setCompanies(updatedCompanies);
      storage.set(StorageKeys.COMPANIES, updatedCompanies);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    storage.notify('Настройки сохранены', 'success');
  };

  const toggleTheme = () => {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      setDarkMode(isDark);
  };

  const handleLogout = () => {
      localStorage.removeItem(StorageKeys.USER_PROFILE);
      navigate('/login');
      window.location.reload();
  };

  const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer].includes(user.role);

  const tabs = [
    { id: 'profile', label: 'Профиль', icon: User },
    { id: 'account', label: 'Безопасность', icon: Lock },
    ...(isSuperUser ? [{ id: 'roles', label: 'Доступы', icon: Shield }] : []),
    { id: 'cloud', label: 'Облако', icon: Cloud },
    { id: 'system', label: 'Интерфейс', icon: Palette },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4 antialiased">
      <div className="flex items-center justify-between gap-4 px-1">
        <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Настройки</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">Управление профилем и системой</p>
        </div>
        <button 
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
        >
          {isSaved ? <Check size={14} strokeWidth={4} /> : <Save size={14} />}
          {isSaved ? 'Сохранено' : 'Сохранить изменения'}
        </button>
      </div>

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

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[450px]">
          {activeSettingsTab === 'profile' && (
              <div className="p-8 space-y-10 animate-in fade-in duration-300">
                  <div className="flex items-center gap-8">
                      <div className="relative group shrink-0">
                          <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-700 overflow-hidden border-2 border-white dark:border-slate-600 shadow-sm">
                              {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={40} /></div>}
                          </div>
                          <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-lg shadow-md border-2 border-white dark:border-slate-800"><Camera size={14} /></button>
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
                          <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">{user.fullName || 'Без имени'}</h3>
                          <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">{user.role}</span>
                              <span className="text-[10px] text-slate-400 font-bold">{user.email}</span>
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t dark:border-slate-700">
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Полное имя</label>
                          <input type="text" value={user.fullName} onChange={e => setUser({...user, fullName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg p-3 text-sm font-bold outline-none transition-all" />
                      </div>
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email / Логин</label>
                          <input type="email" value={user.email} onChange={e => setUser({...user, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg p-3 text-sm font-bold outline-none transition-all" />
                      </div>
                  </div>

                  <div className="pt-12 border-t dark:border-slate-700">
                      <button 
                        onClick={handleLogout} 
                        className="w-full max-w-sm flex items-center gap-4 p-4 bg-rose-50 dark:bg-rose-900/10 text-rose-600 rounded-2xl border border-rose-100 dark:border-rose-900/30 group transition-all hover:bg-rose-100 dark:hover:bg-rose-900/20"
                      >
                          <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-transform"><LogOut size={24} /></div>
                          <div className="text-left">
                              <span className="block font-black text-sm uppercase tracking-wider">Выйти из аккаунта</span>
                              <span className="text-[10px] font-bold opacity-60 uppercase">Завершить текущую сессию</span>
                          </div>
                      </button>
                  </div>
              </div>
          )}

          {activeSettingsTab === 'system' && (
              <div className="p-8 space-y-10 animate-in fade-in duration-300">
                  <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-widest">
                          <Palette size={16} className="text-blue-600"/> Цвет элементов интерфейса
                      </h4>
                      <div className="flex flex-wrap gap-3">
                          {THEME_OPTIONS.map(opt => (
                              <button key={opt.name} onClick={() => setUser({...user, themeColor: opt.name})} className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${user.themeColor === opt.name ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-sm' : 'border-slate-50 dark:border-slate-700'}`}>
                                  <div className="w-10 h-10 rounded-lg shadow-sm border border-white/20" style={{ backgroundColor: opt.color }}></div>
                                  <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{opt.label}</span>
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
                              <span className="font-bold text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wide">Тема оформления</span>
                          </div>
                          <div className={`w-10 h-5 rounded-full relative transition-colors ${darkMode ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-5' : ''}`}></div></div>
                      </button>
                  </div>
              </div>
          )}

          {activeSettingsTab === 'account' && (
              <div className="p-8 flex flex-col items-center justify-center py-20 text-slate-300">
                  <ShieldCheck size={64} strokeWidth={1} className="mb-4 opacity-20" />
                  <p className="text-sm font-bold uppercase tracking-widest italic">Настройки безопасности обновлены</p>
              </div>
          )}
      </div>
    </div>
  );
};
