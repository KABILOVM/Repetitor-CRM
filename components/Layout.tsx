import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, BookOpen, Briefcase, Layers, Calendar, 
  CheckSquare, Phone, AlertTriangle, Award, CreditCard, BarChart3, 
  Upload, User as UserIcon, Menu, X, Settings, Megaphone
} from 'lucide-react';
import { storage, StorageKeys } from '../services/storage';
import { UserRole, UserProfile } from '../types';
import { RoleSwitcher } from './RoleSwitcher';
import { Logo } from './Logo';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.Admin, fullName: '', email: '', permissions: [] });

  const menuItems = [
    { path: '/', label: 'Дашборд', icon: LayoutDashboard, roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Financier, UserRole.Teacher] },
    { path: '/crm', label: 'CRM (Воронка)', icon: Megaphone, roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin] },
    { path: '/students', label: 'Ученики', icon: Users, roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Teacher, UserRole.Financier] },
    { path: '/groups', label: 'Группы', icon: Layers, roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Teacher] },
    { path: '/schedule', label: 'Расписание', icon: Calendar, roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Teacher, UserRole.Student] },
    { path: '/attendance', label: 'Посещаемость', icon: CheckSquare, roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Teacher] },
    { path: '/finance', label: 'Финансы', icon: CreditCard, roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Financier, UserRole.Admin] },
    { path: '/employees', label: 'Сотрудники', icon: Briefcase, roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin] },
    { path: '/courses', label: 'Курсы', icon: BookOpen, roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin] },
    { path: '/exams', label: 'Экзамены', icon: Award, roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Teacher] },
    { path: '/violations', label: 'Нарушения', icon: AlertTriangle, roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Teacher] },
    { path: '/calls', label: 'Звонки', icon: Phone, roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin] },
    { path: '/analytics', label: 'Аналитика', icon: BarChart3, roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Financier] },
    { path: '/import', label: 'Импорт', icon: Upload, roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin] },
  ];

  if (user.role === UserRole.Developer) {
      menuItems.push({ path: '/developer', label: 'Система', icon: Settings, roles: [UserRole.Developer] });
  }

  const visibleItems = menuItems.filter(item => 
      item.roles.includes(user.role) || user.role === UserRole.Developer
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <RoleSwitcher />
      
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-200 ease-in-out flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between">
          <Logo className="h-8 w-auto" />
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-500">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                  }
                `}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700 mt-2 space-y-2">
            <div 
                onClick={() => {
                    navigate('/profile');
                    setSidebarOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors mt-2"
            >
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold overflow-hidden shrink-0">
                    {user.avatar ? <img src={user.avatar} alt="User" className="w-full h-full object-cover"/> : <UserIcon size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{user.fullName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.role}</p>
                </div>
            </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="lg:hidden p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-500">
            <Menu size={24} />
          </button>
          <Logo className="h-6 w-auto" />
          <div className="w-6" />
        </div>

        <div className="flex-1 overflow-auto p-4 lg:p-8 custom-scrollbar relative">
          {children}
        </div>
      </main>
    </div>
  );
};