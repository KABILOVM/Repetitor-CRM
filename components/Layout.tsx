
import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { storage, StorageKeys } from '../services/storage';
import { UserRole, UserProfile } from '../types';
import { Logo } from './Logo';
import { RoleSwitcher } from './RoleSwitcher';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Users, 
  Library, 
  Calendar, 
  Phone, 
  AlertTriangle, 
  CreditCard, 
  BarChart3, 
  Menu,
  Award,
  BookOpen,
  X,
  User as UserIcon,
  Briefcase,
  CheckCircle,
  Info,
  AlertCircle,
  Settings,
  Server,
  RotateCcw,
  Check
} from 'lucide-react';

// --- Internal Toast Component ---
interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

const ToastContainer = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handleNotification = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setToasts(prev => [...prev, detail]);
      
      // Auto-remove after 4 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== detail.id));
      }, 4000);
    };

    window.addEventListener('app-notification', handleNotification);
    return () => window.removeEventListener('app-notification', handleNotification);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col-reverse gap-2 pointer-events-none items-center">
      {toasts.map(toast => {
        let bg = 'bg-white dark:bg-slate-800';
        let icon = <Info size={18} className="text-blue-500" />;
        let border = 'border-l-4 border-blue-500';

        if (toast.type === 'success') {
          icon = <CheckCircle size={18} className="text-emerald-500" />;
          border = 'border-l-4 border-emerald-500';
        } else if (toast.type === 'error') {
          icon = <AlertCircle size={18} className="text-red-500" />;
          border = 'border-l-4 border-red-500';
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle size={18} className="text-amber-500" />;
          border = 'border-l-4 border-amber-500';
        }

        return (
          <div 
            key={toast.id} 
            className={`pointer-events-auto flex items-center gap-3 p-4 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 ${bg} ${border} min-w-[300px] animate-in slide-in-from-bottom fade-in duration-300`}
          >
            {icon}
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{toast.message}</p>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="ml-auto text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  
  // Verification Mode State
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'verifying'>(
    (localStorage.getItem('sys_update_status') as 'idle' | 'verifying') || 'idle'
  );
  const pendingVersion = localStorage.getItem('sys_pending_version') || '1.0.x';

  // Listen for storage changes to update banner state in real-time
  useEffect(() => {
    const handleStorageChange = () => {
        setUpdateStatus((localStorage.getItem('sys_update_status') as 'idle' | 'verifying') || 'idle');
    };
    window.addEventListener('storage-update-event', handleStorageChange);
    return () => window.removeEventListener('storage-update-event', handleStorageChange);
  }, []);

  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { 
    fullName: 'Guest', 
    role: UserRole.Admin, 
    email: '', 
    permissions: [] 
  });

  // Get current company configuration
  const company = storage.getCompanyConfig(user.companyId);
  const modules = company.modules;

  const navigate = useNavigate();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleConfirmUpdate = () => {
      localStorage.setItem('sys_app_version', pendingVersion);
      localStorage.setItem('sys_update_status', 'idle');
      localStorage.removeItem('sys_pending_version');
      setUpdateStatus('idle');
      storage.notify(`Обновление ${pendingVersion} успешно применено!`, 'success');
      window.dispatchEvent(new Event('storage-update-event'));
  };

  const handleRollbackUpdate = () => {
      localStorage.setItem('sys_update_status', 'idle');
      localStorage.removeItem('sys_pending_version');
      setUpdateStatus('idle');
      storage.notify('Выполнен откат к предыдущей версии.', 'warning');
      window.dispatchEvent(new Event('storage-update-event'));
  };

  // Define All Menu Items with strict role mapping
  // REMOVED 'Journal' / 'Attendance' separate links as requested
  const allMenuItems = [
    { 
        to: "/", 
        icon: LayoutDashboard, 
        label: "Дашборд", 
        roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Financier, UserRole.Teacher, UserRole.Student, UserRole.Developer],
        enabled: true 
    },
    { 
        to: "/crm", 
        icon: Users, 
        label: "CRM (Лиды)", 
        roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Developer],
        enabled: modules.crm
    },
    { 
        to: "/students", 
        icon: GraduationCap, 
        label: "Ученики", 
        roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Financier, UserRole.Teacher, UserRole.Developer],
        enabled: modules.students
    },
    { 
        to: "/courses", 
        icon: BookOpen, 
        label: "Курсы", 
        roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Developer],
        enabled: modules.courses
    },
    { 
        to: "/employees", 
        icon: Briefcase, 
        label: "Сотрудники", 
        roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Developer],
        enabled: modules.employees
    },
    { 
        to: "/groups", 
        icon: Library, 
        label: "Группы (Журнал)", // Updated label to indicate merged functionality
        roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Teacher, UserRole.Developer],
        enabled: modules.groups
    },
    { 
        to: "/schedule", 
        icon: Calendar, 
        label: "Расписание", 
        roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Teacher, UserRole.Student, UserRole.Developer],
        enabled: modules.schedule
    },
    { 
        to: "/calls", 
        icon: Phone, 
        label: "Звонки", 
        roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Developer],
        enabled: modules.calls
    },
    { 
        to: "/violations", 
        icon: AlertTriangle, 
        label: "Нарушения", 
        roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Teacher, UserRole.Developer],
        enabled: modules.violations
    },
    { 
        to: "/exams", 
        icon: Award, 
        label: "Экзамены", 
        roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Teacher, UserRole.Student, UserRole.Developer],
        enabled: modules.exams
    },
    { 
        to: "/finance", 
        icon: CreditCard, 
        label: "Финансы", 
        roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Financier, UserRole.Developer],
        enabled: modules.finance
    },
    { 
        to: "/analytics", 
        icon: BarChart3, 
        label: "Аналитика", 
        roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Financier, UserRole.Developer],
        enabled: modules.analytics
    },
    { 
      to: "/developer", 
      icon: Settings, 
      label: "Разработчик", 
      roles: [UserRole.Developer],
      enabled: true
    },
  ];

  // Filter Menu Items based on Role AND Company Module Config
  const menuItems = useMemo(() => {
      return allMenuItems.filter(item => 
        item.roles.includes(user.role as UserRole) && item.enabled
      );
  }, [user.role, modules]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200 flex flex-col">
      
      {/* Toast Container */}
      <ToastContainer />
      
      {/* Developer Role Switcher Overlay */}
      <RoleSwitcher />

      {/* --- SYSTEM UPDATE VERIFICATION BANNER --- */}
      {updateStatus === 'verifying' && (
          <div className="bg-amber-500 text-white px-4 py-3 shadow-md sticky top-0 z-[100] animate-in slide-in-from-top duration-300">
              <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-full animate-pulse">
                          <Server size={20} />
                      </div>
                      <div>
                          <p className="font-bold text-sm">Установлено обновление {pendingVersion}</p>
                          <p className="text-xs opacity-90">Пожалуйста, проверьте работоспособность сайта. Если возникли ошибки — нажмите "Откатить".</p>
                      </div>
                  </div>
                  <div className="flex gap-2">
                      <button 
                          onClick={handleRollbackUpdate}
                          className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium border border-white/30 transition-colors flex items-center gap-2"
                      >
                          <RotateCcw size={16} /> Откатить
                      </button>
                      <button 
                          onClick={handleConfirmUpdate}
                          className="px-4 py-1.5 bg-white text-amber-600 hover:bg-amber-50 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                      >
                          <Check size={16} /> Всё работает (Принять)
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Mobile Header */}
      <div className="lg:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center sticky top-0 z-30">
        <div className="w-32 cursor-pointer" onClick={() => window.location.href = '#/'}>
            <Logo className="h-8 w-auto" />
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-600 dark:text-slate-300">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-6 h-full flex flex-col">
            <div className="hidden lg:block mb-8 cursor-pointer" onClick={() => window.location.href = '#/'}>
              <Logo className="h-10 w-auto" />
            </div>

            {/* Company Name Badge */}
            <div className="mb-4 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <p className="text-[10px] uppercase font-bold text-blue-500 dark:text-blue-300">Компания</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{company.name}</p>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar -mr-2 pr-2">
              {menuItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-blue-600 dark:hover:text-blue-400'
                    }`
                  }
                >
                  <item.icon size={20} className="transition-transform group-hover:scale-110" />
                  <span className="font-medium text-sm">{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-700 mt-2 space-y-2">
                {/* User Profile Link */}
                <div 
                    onClick={() => navigate('/profile')}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors mt-2"
                >
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold overflow-hidden">
                        {user.avatar ? <img src={user.avatar} alt="User" className="w-full h-full object-cover"/> : <UserIcon size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{user.fullName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.role}</p>
                    </div>
                </div>
            </div>
        </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-4 lg:p-8 overflow-x-hidden pt-6 lg:pt-8">
          {children}
        </main>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </div>
  );
};
