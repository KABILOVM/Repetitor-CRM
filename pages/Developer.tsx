
import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import { storage, StorageKeys } from '../services/storage';
import { Company, ModuleConfig, UserProfile, UserRole, FieldSchema, SidebarItem } from '../types';
import { Settings, Plus, Save, Trash2, X, Server, Layout, Edit2, Eye, EyeOff, GripVertical, MoveUp, MoveDown, GraduationCap, Users, BookOpen, Layers, UploadCloud, Terminal, RefreshCw, ArrowUpCircle, LogIn, ExternalLink, Hash, ChevronRight, FolderPlus, ChevronDown, Check, Folder, Library, Briefcase, Box, Archive, Package, Megaphone, Calendar, CreditCard, BarChart3, Award, AlertTriangle, Phone, FileQuestion, Upload, Book, LayoutGrid, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
    courses: { label: 'Курсы и Цены', icon: BookOpen },
    employees: { label: 'Сотрудники', icon: Briefcase },
    groups: { label: 'Учебные Группы', icon: Layers },
    schedule: { label: 'Расписание', icon: Calendar },
    finance: { label: 'Финансы', icon: CreditCard },
    analytics: { label: 'Аналитика', icon: BarChart3 },
    exams: { label: 'Экзамены', icon: Award },
    violations: { label: 'Нарушения', icon: AlertTriangle },
    calls: { label: 'Звонки', icon: Phone },
    surveys: { label: 'Анкеты / Опросы', icon: FileQuestion },
    import: { label: 'Импорт данных', icon: Upload },
    journal: { label: 'Журнал оценок', icon: Book },
    tasks: { label: 'Задачи и Спринты', icon: LayoutGrid },
    branches: { label: 'Филиалы', icon: MapPin },
    classes: { label: 'Обучение (LMS)', icon: GraduationCap }
};

export const Developer: React.FC = () => {
  const navigate = useNavigate();
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.Student, fullName: 'User', email: '', permissions: [] });
  const isDev = user.role === UserRole.Developer;

  const [companies, setCompanies] = useState<Company[]>(() => {
      const data = localStorage.getItem(StorageKeys.COMPANIES);
      return data ? JSON.parse(data) : [];
  });

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState<'modules' | 'sidebar' | 'config' | 'updates'>('modules');
  
  const [editingConfig, setEditingConfig] = useState<Company | null>(null);
  const [editingSidebarItem, setEditingSidebarItem] = useState<SidebarItem | null>(null);
  
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeData, setMergeData] = useState({ label: '', icon: 'Folder' });

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  useEffect(() => {
      if (companies.length === 0) {
          const defaultC = storage.getCompanyConfig();
          setCompanies([defaultC]);
      }
  }, []);

  useEffect(() => {
    if (!isDev && user.companyId) {
        const config = storage.getCompanyConfig(user.companyId);
        setSelectedCompany(config);
        setEditingConfig(JSON.parse(JSON.stringify(config)));
    }
  }, [isDev, user.companyId]);

  const handleSave = () => {
      if (!editingConfig) return;
      const updatedList = companies.map(c => c.id === editingConfig.id ? editingConfig : c);
      setCompanies(updatedList);
      storage.set(StorageKeys.COMPANIES, updatedList);
      setSelectedCompany(editingConfig);
      storage.notify('Конfiguration обновлена', 'success');
  };

  const handleSelectCompany = (c: Company) => {
      if (!isDev) return;
      const config = storage.getCompanyConfig(c.id); 
      setSelectedCompany(config);
      setEditingConfig(JSON.parse(JSON.stringify(config))); 
      setSelectedItemIds(new Set());
  };

  const handleCreateCompany = () => {
      if (!isDev) return;
      const name = prompt("Введите название новой компании:");
      if (!name) return;
      const id = name.toLowerCase().replace(/\s+/g, '_');
      const defaultC = storage.getCompanyConfig('repetitor_tj'); 
      const template = JSON.parse(JSON.stringify(defaultC));
      const newCompany: Company = { ...template, id, name, createdAt: new Date().toISOString() };
      const updated = [...companies, newCompany];
      setCompanies(updated);
      storage.set(StorageKeys.COMPANIES, updated);
      handleSelectCompany(newCompany);
  };

  const impersonateCompanyAdmin = (company: Company) => {
      if (!isDev) return;
      const adminProfile: UserProfile = {
          fullName: `Admin (${company.name})`,
          role: UserRole.GeneralDirector,
          originalRole: UserRole.Developer,
          email: `admin@${company.id}.com`,
          permissions: ['All'],
          companyId: company.id,
          avatar: `https://ui-avatars.com/api/?name=${company.name.replace(' ', '+')}&background=random`
      };
      storage.set(StorageKeys.USER_PROFILE, adminProfile);
      window.location.hash = '#/';
      window.location.reload();
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

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId !== id) {
        setDropTargetId(id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDropTargetId(null);
    if (!editingConfig || !editingConfig.sidebarConfig || !draggedId || draggedId === targetId) return;

    const items = [...editingConfig.sidebarConfig];
    const idsToMove = selectedItemIds.has(draggedId) 
        ? Array.from(selectedItemIds) 
        : [draggedId];

    const expandedIdsToMove = new Set(idsToMove);
    idsToMove.forEach(id => {
        items.filter(i => i.parentId === id).forEach(child => expandedIdsToMove.add(child.id));
    });

    const movingItems = items.filter(i => expandedIdsToMove.has(i.id));
    const remainingItems = items.filter(i => !expandedIdsToMove.has(i.id));
    
    const targetIdx = remainingItems.findIndex(i => i.id === targetId);
    remainingItems.splice(targetIdx, 0, ...movingItems);

    setEditingConfig({ ...editingConfig, sidebarConfig: remainingItems });
    setDraggedId(null);
  };

  const deleteSidebarItem = (id: string) => {
      if (!editingConfig || !editingConfig.sidebarConfig) return;
      if (!confirm("Удалить этот пункт меню? Вложенные элементы будут вынесены в корень.")) return;
      
      const updated = editingConfig.sidebarConfig
        .filter(i => i.id !== id)
        .map(i => i.parentId === id ? { ...i, parentId: undefined } : i);

      setEditingConfig({ ...editingConfig, sidebarConfig: updated });
      setSelectedItemIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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
        alert("Введите название группы");
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

  const handleBulkDelete = () => {
      if (!confirm(`Удалить выбранные элементы (${selectedItemIds.size})?`)) return;
      if (!editingConfig || !editingConfig.sidebarConfig) return;

      const updated = editingConfig.sidebarConfig
        .filter(i => !selectedItemIds.has(i.id))
        .map(i => i.parentId && selectedItemIds.has(i.parentId) ? { ...i, parentId: undefined } : i);

      setEditingConfig({ ...editingConfig, sidebarConfig: updated });
      setSelectedItemIds(new Set());
  };

  // Dynamically calculate available roles for sidebar configuration
  const allAvailableRoles = useMemo(() => {
    const rolesFromEnum = Object.values(UserRole).filter(r => r !== UserRole.Developer);
    const customRoles = editingConfig?.rolePermissions ? Object.keys(editingConfig.rolePermissions) : [];
    // Merge both and remove duplicates
    return Array.from(new Set([...rolesFromEnum, ...customRoles])).sort();
  }, [editingConfig?.rolePermissions]);

  return (
    <div className="h-[calc(100vh-6rem)] flex gap-6">
      {isDev && (
          <div className="w-64 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden shrink-0">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2">
                      <Server size={16}/> Компании
                  </h3>
                  <button onClick={handleCreateCompany} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-blue-600"><Plus size={16}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {companies.map(c => (
                      <div key={c.id} className="relative group">
                        <button
                            onClick={() => handleSelectCompany(c)}
                            className={`w-full text-left px-3 py-3 rounded-lg text-sm font-medium transition-colors ${selectedCompany?.id === c.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                            <span className="truncate">{c.name}</span>
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); impersonateCompanyAdmin(c); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <LogIn size={14} />
                        </button>
                      </div>
                  ))}
              </div>
          </div>
      )}

      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
          {editingConfig ? (
              <>
                <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <button onClick={() => setActiveTab('modules')} className={`py-4 px-6 text-sm font-bold border-b-2 transition-colors ${activeTab === 'modules' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500'}`}>Модули</button>
                    <button onClick={() => setActiveTab('sidebar')} className={`py-4 px-6 text-sm font-bold border-b-2 transition-colors ${activeTab === 'sidebar' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500'}`}>Главное меню</button>
                    <button onClick={() => setActiveTab('config')} className={`py-4 px-6 text-sm font-bold border-b-2 transition-colors ${activeTab === 'config' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500'}`}>Настройка полей</button>
                </div>

                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">{isDev ? editingConfig.name : 'Настройки системы'}</h2>
                    <button onClick={handleSave} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold shadow-sm hover:bg-emerald-700 flex items-center gap-2 transition-all active:scale-95"><Save size={18}/> Сохранить всё</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {activeTab === 'sidebar' && (
                        <div className="space-y-4 max-w-3xl mx-auto">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-lg">Управление меню</h3>
                                    <p className="text-sm text-slate-500">Зажмите за иконку для перемещения. Используйте галочки для массовой группировки.</p>
                                </div>
                                {selectedItemIds.size > 0 && (
                                    <div className="flex gap-2 animate-in slide-in-from-right duration-200">
                                        <button 
                                            onClick={handleBulkDelete}
                                            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-red-100 transition-colors"
                                        >
                                            <Trash2 size={16}/> Удалить ({selectedItemIds.size})
                                        </button>
                                        <button 
                                            onClick={() => setShowMergeModal(true)}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-colors active:scale-95"
                                        >
                                            <FolderPlus size={16}/> Объединить в группу
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                                {editingConfig.sidebarConfig?.map((item, idx) => {
                                    const Icon = (LucideIcons as any)[item.icon] || LucideIcons.HelpCircle;
                                    const isChild = !!item.parentId;
                                    const isSelected = selectedItemIds.has(item.id);
                                    const isDragging = draggedId === item.id;
                                    const isTarget = dropTargetId === item.id;
                                    
                                    return (
                                        <div 
                                            key={item.id} 
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, item.id)}
                                            onDragOver={(e) => handleDragOver(e, item.id)}
                                            onDrop={(e) => handleDrop(e, item.id)}
                                            className={`
                                                group flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border transition-all shadow-sm
                                                ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200 dark:border-slate-700'} 
                                                ${isChild ? 'ml-8' : ''}
                                                ${isDragging ? 'opacity-30 cursor-grabbing scale-[0.98]' : 'cursor-grab'}
                                                ${isTarget ? 'drag-over' : ''}
                                                hover:border-blue-300
                                            `}
                                        >
                                            <div className="flex items-center gap-4 flex-1">
                                                <div 
                                                    onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }}
                                                    className={`
                                                        w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer shrink-0
                                                        ${isSelected 
                                                            ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-500/20' 
                                                            : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-blue-400'
                                                        }
                                                    `}
                                                >
                                                    {isSelected && <Check size={14} strokeWidth={4} className="text-white" />}
                                                </div>

                                                <div className={`p-2 rounded-lg shrink-0 ${item.visible ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-slate-100 text-slate-400'} ${item.isGroup ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300' : ''}`}>
                                                    <Icon size={18}/>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`font-bold text-sm truncate ${item.visible ? 'text-slate-800 dark:text-white' : 'text-slate-400 line-through'}`}>{item.label} {item.isGroup && <span className="ml-2 text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-bold uppercase">Группа</span>}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono truncate">
                                                        {item.path || '(контейнер)'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                <div className="text-slate-300 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <GripVertical size={16} />
                                                </div>
                                                <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingSidebarItem(item); }} className="p-2 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                                                        <Edit2 size={18}/>
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); toggleSidebarItem(item.id); }} className={`p-2 rounded-lg transition-colors ${item.visible ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}>
                                                        {item.visible ? <Eye size={18}/> : <EyeOff size={18}/>}
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); deleteSidebarItem(item.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'modules' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(Object.entries(editingConfig.modules) as [keyof ModuleConfig, boolean][]).map(([key, value]) => {
                                const info = MODULE_INFO[key] || { label: key, icon: Settings };
                                const Icon = info.icon;
                                return (
                                    <label 
                                        key={String(key)} 
                                        className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${value ? 'bg-white border-blue-600 dark:border-blue-500 shadow-md ring-4 ring-blue-500/5' : 'bg-slate-50 dark:bg-slate-800 opacity-60 border-slate-100 dark:border-slate-700'}`}
                                        onClick={() => setEditingConfig({ ...editingConfig, modules: { ...editingConfig.modules, [key]: !value }})}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-xl ${value ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                                <Icon size={20} />
                                            </div>
                                            <span className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-tight">{String(info.label)}</span>
                                        </div>
                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${value ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600'}`}>
                                            {value && <Check size={14} strokeWidth={4} className="text-white"/>}
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
              </>
          ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Settings size={48} className="mb-4 opacity-20"/>
                  <p>{isDev ? 'Выберите компанию для настройки' : 'Загрузка настроек...'}</p>
              </div>
          )}
      </div>

      {/* Merge Modal */}
      {showMergeModal && (
          <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                      <h3 className="font-bold">Создание группы</h3>
                      <button onClick={() => setShowMergeModal(false)} className="text-slate-400"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Название группы</label>
                          <input 
                              type="text" 
                              autoFocus
                              value={mergeData.label} 
                              onChange={e => setMergeData({...mergeData, label: e.target.value})}
                              placeholder="Например: Обучение"
                              className="w-full border rounded-lg p-2.5 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Выберите иконку</label>
                          <div className="grid grid-cols-5 gap-2">
                              {GROUP_ICONS.map(item => (
                                  <button
                                      key={item.name}
                                      onClick={() => setMergeData({...mergeData, icon: item.name})}
                                      className={`p-2.5 rounded-lg flex items-center justify-center border transition-all ${mergeData.icon === item.name ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 dark:bg-slate-700 border-transparent hover:border-slate-300'}`}
                                  >
                                      <item.icon size={20} />
                                  </button>
                              ))}
                          </div>
                      </div>
                      <p className="text-[10px] text-slate-400 italic text-center">Выбранные модули ({selectedItemIds.size}) будут перемещены в эту группу.</p>
                  </div>
                  <div className="p-4 border-t flex gap-2 bg-slate-50 dark:bg-slate-800/50">
                      <button onClick={() => setShowMergeModal(false)} className="flex-1 px-4 py-2 text-sm text-slate-500 font-bold">Отмена</button>
                      <button onClick={handleMergeIntoGroup} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Создать</button>
                  </div>
              </div>
          </div>
      )}

      {/* Editing Item Modal */}
      {editingSidebarItem && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 dark:text-white">Настройка пункта меню</h3>
                      <button onClick={() => setEditingSidebarItem(null)} className="text-slate-400"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Название</label>
                            <input 
                                type="text" 
                                value={editingSidebarItem.label} 
                                onChange={e => setEditingSidebarItem({...editingSidebarItem, label: e.target.value})}
                                className="w-full border rounded-lg p-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Иконка (Lucide)</label>
                            <input 
                                type="text" 
                                value={editingSidebarItem.icon} 
                                onChange={e => setEditingSidebarItem({...editingSidebarItem, icon: e.target.value})}
                                className="w-full border rounded-lg p-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                      </div>

                      {!editingSidebarItem.isGroup && (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Путь / Ссылка</label>
                            <input 
                                type="text" 
                                value={editingSidebarItem.path} 
                                onChange={e => setEditingSidebarItem({...editingSidebarItem, path: e.target.value})}
                                className="w-full border rounded-lg p-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                      )}

                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Группировка (Переместить)</label>
                          <select 
                            value={editingSidebarItem.parentId || ""} 
                            onChange={e => setEditingSidebarItem({...editingSidebarItem, parentId: e.target.value || undefined})}
                            className="w-full border rounded-lg p-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                          >
                              <option value="">Без группы (в корне)</option>
                              {/* Using explicit SidebarItem cast to ensure proper type checking in filter */}
                              {(editingConfig?.sidebarConfig || []).filter((i: SidebarItem) => i.isGroup && i.id !== editingSidebarItem.id).map(g => (
                                  <option key={String(g.id)} value={String(g.id)}>{String(g.label)}</option>
                              ))}
                          </select>
                      </div>

                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Доступ для ролей</label>
                          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-2 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700">
                              {allAvailableRoles.map(role => {
                                  const hasRole = (editingSidebarItem.roles || []).includes(role);
                                  return (
                                  <label key={role} className="flex items-center justify-between text-xs cursor-pointer hover:bg-white dark:hover:bg-slate-700 p-2 rounded transition-colors border border-transparent hover:border-slate-100">
                                      <span className="truncate">{role}</span>
                                      <div 
                                          onClick={(e) => {
                                              e.preventDefault();
                                              const currentRoles = editingSidebarItem.roles || [];
                                              const roles = currentRoles.includes(role)
                                                  ? currentRoles.filter(r => r !== role)
                                                  : [...currentRoles, role];
                                              setEditingSidebarItem({...editingSidebarItem, roles});
                                          }}
                                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${hasRole ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-slate-800 border-slate-200'}`}
                                      >
                                          {hasRole && <Check size={12} strokeWidth={4} className="text-white"/>}
                                      </div>
                                  </label>
                                )})}
                          </div>
                      </div>
                  </div>
                  <div className="p-4 border-t flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/50">
                      <button onClick={() => setEditingSidebarItem(null)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-bold">Отмена</button>
                      <button onClick={() => saveItemEdits(editingSidebarItem)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold transition-all active:scale-95 shadow-md">Применить</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
