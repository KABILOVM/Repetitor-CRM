
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { storage, StorageKeys } from '../services/storage';
import { UserRole, UserProfile, SidebarItem, Company, AppNotification } from '../types';
import { useData } from '../hooks/useData';
import { RoleSwitcher } from './RoleSwitcher';
import { Logo } from './Logo';

interface LayoutProps {
  children: React.ReactNode;
}

const THEME_MAP: Record<string, any> = {
  brand: { 50: '#f0faff', 100: '#e0f4fe', 500: '#28A9E7', 600: '#28A9E7', 700: '#1d92c9' },
  blue: { 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
  rose: { 50: '#fff1f2', 100: '#ffe4e6', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c' },
  emerald: { 50: '#ecfdf5', 100: '#d1fae5', 500: '#10b981', 600: '#059669', 700: '#047857' },
  amber: { 50: '#fffbeb', 100: '#fef3c7', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
  purple: { 50: '#faf5ff', 100: '#f3e8ff', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce' },
  indigo: { 50: '#eef2ff', 100: '#e0e7ff', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' },
  orange: { 50: '#fff7ed', 100: '#ffedd5', 500: '#f97316', 600: '#ea580c', 700: '#c2410c' }
};

const DynamicThemeInjector = ({ profile }: { profile: UserProfile }) => {
    const colors = THEME_MAP[profile.themeColor || 'brand'];
    if (!colors) return null;

    const css = `
        :root {
            --brand-50: ${colors[50]};
            --brand-100: ${colors[100]};
            --brand-500: ${colors[500]};
            --brand-600: ${colors[600]};
            --brand-700: ${colors[700]};
            --font-heading: 'Inter', sans-serif;
            --font-body: 'Inter', sans-serif;
        }
        
        .bg-blue-600 { background-color: var(--brand-600) !important; }
        .hover\\:bg-blue-700:hover { background-color: var(--brand-700) !important; }
        .bg-blue-500 { background-color: var(--brand-500) !important; }
        .bg-blue-50 { background-color: var(--brand-50) !important; }
        .dark .bg-blue-900\\/30 { background-color: rgba(40, 169, 231, 0.15) !important; }
        .text-blue-600 { color: var(--brand-600) !important; }
        .text-blue-500 { color: var(--brand-500) !important; }
        .dark .text-blue-400 { color: var(--brand-500) !important; }
        .border-blue-600 { border-color: var(--brand-600) !important; }
        .border-blue-500 { border-color: var(--brand-500) !important; }
        .focus\\:border-blue-500:focus { border-color: var(--brand-500) !important; }
        .shadow-blue-500\\/30 { box-shadow: 0 10px 15px -3px rgba(40, 169, 231, 0.3) !important; }
        .ring-blue-500:focus { --tw-ring-color: var(--brand-500) !important; }
        .fill-\\[\\#28A9E7\\] { fill: var(--brand-500) !important; }
    `;

    return <style>{css}</style>;
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sidebar_expanded_groups');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const location = useLocation();
  const navigate = useNavigate();
  const [user] = useData<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.Admin, fullName: '', email: '', permissions: [] });
  const [notifications, setNotifications] = useData<AppNotification[]>(StorageKeys.NOTIFICATIONS, []);
  const [companies] = useData<Company[]>(StorageKeys.COMPANIES, []);

  const company = useMemo(() => {
    return companies.find(c => c.id === user.companyId) || storage.getCompanyConfig(user.companyId);
  }, [companies, user.companyId]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  useEffect(() => {
    localStorage.setItem('sidebar_expanded_groups', JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  useEffect(() => {
    setSidebarOpen(false);
    setShowNotifications(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    if (confirm('Очистить все уведомления?')) {
      setNotifications([]);
    }
  };

  const menuTree = useMemo(() => {
    const config = company.sidebarConfig || [];
    const filtered = config.filter(item => {
      const hasRole = item.roles.includes(user.role) || user.role === UserRole.Developer;
      return hasRole && item.visible;
    });
    const roots = filtered.filter(i => !i.parentId);
    return roots.map(root => ({
      ...root,
      children: filtered.filter(child => child.parentId === root.id),
      IconComponent: (LucideIcons as any)[root.icon] || LucideIcons.HelpCircle
    }));
  }, [company.sidebarConfig, user.role]);

  const renderMenuItem = (item: any, isChild = false) => {
    const isActive = location.pathname === item.path;
    const isExpanded = expandedGroups[item.id];
    const hasChildren = item.children && item.children.length > 0;
    const Icon = item.IconComponent || (LucideIcons as any)[item.icon] || LucideIcons.HelpCircle;

    if (item.isGroup || hasChildren) {
      return (
        <div key={item.id} className="space-y-1">
          <button
            onClick={() => toggleGroup(item.id)}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200`}
          >
            <div className="flex items-center gap-3">
              <Icon size={20} className={isExpanded ? 'text-blue-500' : ''} />
              {item.label}
            </div>
            <LucideIcons.ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-blue-500' : ''}`} />
          </button>
          {isExpanded && <div className="pl-4 space-y-1 animate-in slide-in-from-top-1 duration-200">{item.children.map((child: any) => renderMenuItem(child, true))}</div>}
        </div>
      );
    }

    return (
      <button
        key={item.id}
        onClick={() => {
          if (item.isCustom && item.path.startsWith('http')) window.open(item.path, '_blank');
          else navigate(item.path);
          setSidebarOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative group ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200'} ${isChild ? 'py-2 px-3 opacity-90' : ''}`}
      >
        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />}
        <Icon size={isChild ? 18 : 20} />
        {item.label}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200 antialiased">
      <DynamicThemeInjector profile={user} />
      <RoleSwitcher />
      
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 animate-in fade-in" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-all duration-300 ease-in-out flex flex-col shadow-2xl lg:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between shrink-0">
          <Logo className="h-8 w-auto" />
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 -mr-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><LucideIcons.X size={24} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
          {menuTree.map(item => renderMenuItem(item))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 mt-2 space-y-2 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
            <div onClick={() => { navigate('/profile'); setSidebarOpen(false); }} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold overflow-hidden shrink-0 border-2 border-white dark:border-slate-800 shadow-sm">
                    {user.avatar ? <img src={user.avatar} alt="User" className="w-full h-full object-cover"/> : <LucideIcons.User size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{user.fullName}</p>
                    <p className="text-[10px] font-medium text-slate-400 truncate">{user.role}</p>
                </div>
            </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header Bar (Desktop & Mobile) */}
        <header className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-sm z-30">
          <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><LucideIcons.Menu size={24} /></button>
              <div className="hidden lg:block">
                  <h1 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{company.name}</h1>
              </div>
          </div>

          <div className="flex items-center gap-3">
              {/* Notifications Center */}
              <div className="relative" ref={notificationRef}>
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`p-2.5 rounded-xl transition-all relative ${showNotifications ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                      <LucideIcons.Bell size={20} />
                      {unreadCount > 0 && (
                          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center animate-bounce">
                              {unreadCount}
                          </span>
                      )}
                  </button>

                  {showNotifications && (
                      <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[24px] shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                          <header className="p-4 border-b dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center">
                              <h4 className="text-sm font-bold uppercase tracking-tight">Уведомления</h4>
                              <div className="flex gap-2">
                                  <button onClick={markAllRead} className="text-[10px] font-bold text-blue-600 hover:underline uppercase">Прочитать все</button>
                                  <button onClick={clearNotifications} className="p-1 hover:bg-red-50 text-red-400 rounded transition-colors"><LucideIcons.Trash2 size={14}/></button>
                              </div>
                          </header>
                          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                              {notifications.length > 0 ? notifications.map(n => (
                                  <div 
                                    key={n.id} 
                                    onClick={() => markAsRead(n.id)}
                                    className={`p-4 border-b last:border-0 dark:border-slate-700 flex gap-4 transition-colors cursor-pointer ${n.read ? 'opacity-60 grayscale' : 'bg-blue-50/20 dark:bg-blue-900/10'}`}
                                  >
                                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                                          n.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                          n.type === 'error' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                          n.type === 'warning' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                          'bg-blue-50 text-blue-600 border-blue-100'
                                      }`}>
                                          {n.type === 'success' ? <LucideIcons.CheckCircle2 size={18}/> :
                                           n.type === 'error' ? <LucideIcons.AlertCircle size={18}/> :
                                           n.type === 'warning' ? <LucideIcons.ShieldAlert size={18}/> :
                                           <LucideIcons.Info size={18}/>}
                                      </div>
                                      <div className="min-w-0">
                                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{n.title}</p>
                                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                                          <p className="text-[10px] text-slate-400 mt-2 font-medium">{new Date(n.createdAt).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>
                                      </div>
                                  </div>
                              )) : (
                                  <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
                                      <LucideIcons.Inbox size={48} className="opacity-10" />
                                      <p className="text-sm font-medium italic">Уведомлений пока нет</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}
              </div>

              <div 
                className="w-10 h-10 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden cursor-pointer hover:shadow-md transition-all active:scale-95"
                onClick={() => navigate('/profile')}
              >
                 {user.avatar ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover"/> : <LucideIcons.User size={18} className="text-slate-400" />}
              </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 custom-scrollbar relative bg-slate-50/30 dark:bg-transparent">
          {children}
        </div>
      </main>
    </div>
  );
};
