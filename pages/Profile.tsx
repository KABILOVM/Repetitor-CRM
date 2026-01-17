
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage, StorageKeys } from '../services/storage';
import { UserRole, UserProfile, Branch } from '../types';
import { Save, User, Mail, Shield, Camera, CheckCircle, MapPin, Moon, Sun, LogOut } from 'lucide-react';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile>(() => storage.get(StorageKeys.USER_PROFILE, {
    fullName: 'Администратор',
    role: UserRole.GeneralDirector,
    email: 'admin@repetitor.tj',
    avatar: '',
    permissions: ['Все модули', 'Финансы', 'Аналитика', 'Настройки'],
    branch: undefined
  }));
  
  const [isSaved, setIsSaved] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    storage.set(StorageKeys.USER_PROFILE, user);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    storage.logAction('Обновление профиля', `Пользователь изменил свои данные`);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUser(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
      localStorage.removeItem(StorageKeys.USER_PROFILE);
      navigate('/login');
  };

  const toggleTheme = () => {
      if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        setDarkMode(false);
      } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        setDarkMode(true);
      }
  };

  const canEditBranch = user.role === UserRole.GeneralDirector || user.role === UserRole.Developer;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Настройки профиля</h2>
        <button 
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
        >
          {isSaved ? <CheckCircle size={20} /> : <Save size={20} />}
          {isSaved ? 'Сохранено' : 'Сохранить изменения'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Avatar & Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center border-4 border-white dark:border-slate-600 shadow-xl group-hover:opacity-90 transition-opacity">
                {user.avatar ? (
                  <img src={user.avatar} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <User size={48} className="text-slate-400" />
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2.5 rounded-xl shadow-lg hover:scale-110 transition-transform"
              >
                <Camera size={20} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarChange} 
                className="hidden" 
                accept="image/*" 
              />
            </div>
            
            <h3 className="mt-6 font-black text-xl text-slate-800 dark:text-white">{user.fullName}</h3>
            <span className="mt-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-blue-100 dark:border-blue-800">
              {user.role}
            </span>
            
            <div className="w-full mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 space-y-4">
              <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                <Mail size={16} />
                {user.email}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                <MapPin size={16} />
                {user.branch || 'Филиал не выбран'}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                <Shield size={16} />
                Аккаунт защищен
              </div>
            </div>
          </div>
        </div>

        {/* Right: Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
            <h4 className="font-bold text-lg text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-4">Личные данные</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Полное имя</label>
                <input 
                  type="text" 
                  value={user.fullName}
                  onChange={e => setUser({...user, fullName: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-700 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Иван Иванов"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Электронная почта</label>
                <input 
                  type="email" 
                  value={user.email}
                  onChange={e => setUser({...user, email: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-700 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="admin@school.tj"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
            <h4 className="font-bold text-lg text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-4">Доступ и Роль</h4>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
                <div>
                  <p className="font-bold text-slate-800 dark:text-white text-sm">Текущая роль</p>
                  <p className="text-xs text-slate-500">{user.role}</p>
                </div>
                <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">Системная</span>
              </div>

              {/* Branch Selection - Only for SuperAdmin/Dev */}
              {canEditBranch && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Привязка к филиалу</label>
                  <select 
                    value={user.branch || ''}
                    onChange={e => setUser({...user, branch: e.target.value as Branch})}
                    className="w-full bg-slate-50 dark:bg-slate-700 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Все филиалы (Супер-админ)</option>
                    {Object.values(Branch).map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400">
                    Если филиал выбран, вы будете видеть и создавать учеников только для этого филиала.
                  </p>
                </div>
              )}
              
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Доступные модули</label>
                <div className="flex flex-wrap gap-2">
                  {user.permissions.map((p, i) => (
                    <span key={i} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-600">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* System Settings (Theme & Logout) */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
            <h4 className="font-bold text-lg text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-4">Система</h4>
            <div className="space-y-4">
                <button onClick={toggleTheme} className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                    <div className="flex items-center gap-3">
                        {darkMode ? <Moon size={20} className="text-slate-600 dark:text-slate-300"/> : <Sun size={20} className="text-orange-500"/>}
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{darkMode ? 'Тёмная тема' : 'Светлая тема'}</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${darkMode ? 'bg-blue-600' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-5' : ''}`}></div>
                    </div>
                </button>

                <button onClick={handleLogout} className="w-full flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                    <LogOut size={20} />
                    <span className="text-sm font-medium">Выйти из системы</span>
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
