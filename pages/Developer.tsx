
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Company, ModuleConfig, DictionaryConfig, UserProfile, UserRole, ModuleSettings, FieldSchema, FormTabSchema } from '../types';
import { Settings, Plus, Save, Trash2, CheckCircle, X, Server, Layout, List, LogIn, Edit2, Eye, EyeOff, GripVertical, Type, Database, MoveUp, MoveDown, GraduationCap, Users, BookOpen, Layers, ArrowRight, Check, UploadCloud, Terminal, HardDrive, AlertTriangle, FileArchive, Play, RefreshCw, ArrowUpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- Internal Component: Chip List Editor ---
const StringListEditor = ({ 
    items, 
    onChange 
}: { 
    items: string[], 
    onChange: (items: string[]) => void 
}) => {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addItem();
        }
    };

    const addItem = () => {
        const val = inputValue.trim();
        if (val && !items.includes(val)) {
            onChange([...items, val]);
            setInputValue('');
        }
    };

    const removeItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        onChange(newItems);
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <input 
                    type="text" 
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                    placeholder="Введите значение и нажмите Enter..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button 
                    onClick={addItem}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus size={18} />
                </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200 animate-in zoom-in duration-200 shadow-sm">
                        <span>{item}</span>
                        <button onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <X size={14} />
                        </button>
                    </div>
                ))}
                {items.length === 0 && (
                    <p className="text-xs text-slate-400 italic">Список пуст</p>
                )}
            </div>
        </div>
    );
};

const MODULE_ICONS: Record<string, React.ElementType> = {
    students: GraduationCap,
    employees: Users,
    courses: BookOpen,
    groups: Layers
};

const MODULE_NAMES: Record<string, string> = {
    students: 'Ученики',
    employees: 'Сотрудники',
    courses: 'Курсы',
    groups: 'Группы'
};

export const Developer: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>(() => {
      const data = localStorage.getItem(StorageKeys.COMPANIES);
      return data ? JSON.parse(data) : [];
  });

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState<'modules' | 'config' | 'updates'>('modules');
  
  // Module Config Sub-state
  const [selectedModule, setSelectedModule] = useState<string>('students');
  const [activeConfigTab, setActiveConfigTab] = useState<'columns' | 'form'>('form');
  const [editingField, setEditingField] = useState<{tabId: string, field: FieldSchema} | null>(null);
  const [showDictEditor, setShowDictEditor] = useState(false); // To toggle inline list editor
  const [newColumnFieldKey, setNewColumnFieldKey] = useState('');

  // Edit State
  const [editingConfig, setEditingConfig] = useState<Company | null>(null);

  // Update State
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const [updateLogs, setUpdateLogs] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const updateFileInputRef = useRef<HTMLInputElement>(null);
  const appVersion = localStorage.getItem('sys_app_version') || '1.0.0';
  const lastUpdate = localStorage.getItem('sys_last_update') || new Date().toLocaleDateString();

  useEffect(() => {
      if (companies.length === 0) {
          const defaultC = storage.getCompanyConfig();
          setCompanies([defaultC]);
      }
  }, []);

  const handleSave = () => {
      if (!editingConfig) return;
      // We are editing a copy, so changes are isolated to this specific ID
      const updatedList = companies.map(c => c.id === editingConfig.id ? editingConfig : c);
      setCompanies(updatedList);
      localStorage.setItem(StorageKeys.COMPANIES, JSON.stringify(updatedList));
      setSelectedCompany(editingConfig);
      storage.notify('Конфигурация компании обновлена', 'success');
  };

  const handleModuleToggle = (key: keyof ModuleConfig) => {
      if (!editingConfig) return;
      setEditingConfig({
          ...editingConfig,
          modules: {
              ...editingConfig.modules,
              [key]: !editingConfig.modules[key]
          }
      });
  };

  const handleDictionaryChange = (key: string, items: string[]) => {
      if (!editingConfig) return;
      setEditingConfig({
          ...editingConfig,
          dictionaries: {
              ...editingConfig.dictionaries,
              [key]: items
          }
      });
  };

  const handleCreateDictionary = () => {
      const name = prompt("Введите название нового списка (например: 'university_types'):");
      if (!name) return;
      
      const key = name.toLowerCase().replace(/\s+/g, '_');
      if (editingConfig?.dictionaries[key]) {
          alert('Такой список уже существует');
          return;
      }

      setEditingConfig(prev => {
          if (!prev) return null;
          return {
              ...prev,
              dictionaries: {
                  ...prev.dictionaries,
                  [key]: []
              }
          };
      });
      
      // Auto select the new dictionary in the editing field
      if (editingField) {
          setEditingField({
              ...editingField,
              field: { ...editingField.field, dictionaryKey: key }
          });
          setShowDictEditor(true);
      }
  };

  const handleSelectCompany = (c: Company) => {
      setSelectedCompany(c);
      // Ensure we clone the config so editing doesn't affect state until save
      const config = storage.getCompanyConfig(c.id); 
      setEditingConfig(JSON.parse(JSON.stringify(config))); 
  };

  const handleCreateCompany = () => {
      const name = prompt("Введите название новой компании:");
      if (!name) return;
      
      const id = name.toLowerCase().replace(/\s+/g, '_');
      
      // CRITICAL: Deep clone the default config to ensure no reference sharing
      const defaultC = storage.getCompanyConfig('repetitor_tj'); 
      const template = JSON.parse(JSON.stringify(defaultC));
      
      const newCompany: Company = {
          ...template,
          id,
          name,
          createdAt: new Date().toISOString()
      };
      
      const updated = [...companies, newCompany];
      setCompanies(updated);
      localStorage.setItem(StorageKeys.COMPANIES, JSON.stringify(updated));
      handleSelectCompany(newCompany);
  };

  const impersonateCompanyAdmin = (company: Company) => {
      if (confirm(`Войти в панель управления компании "${company.name}" как Администратор?`)) {
          const adminProfile: UserProfile = {
              fullName: `Admin (${company.name})`,
              role: UserRole.GeneralDirector,
              originalRole: UserRole.Developer,
              email: `admin@${company.id}.com`,
              permissions: ['All'],
              companyId: company.id, // Set Tenant ID
              avatar: `https://ui-avatars.com/api/?name=${company.name.replace(' ', '+')}&background=random`
          };
          
          storage.set(StorageKeys.USER_PROFILE, adminProfile);
          window.location.href = '#/';
          window.location.reload();
      }
  };

  // --- Update System Logic ---
  const addUpdateLog = (msg: string) => {
      setUpdateLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (!file.name.endsWith('.zip')) {
              alert('Пожалуйста, выберите .zip архив');
              return;
          }
          setUpdateFile(file);
          setUpdateLogs([]);
          addUpdateLog(`Выбран файл: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
      }
  };

  const runUpdateProcess = async () => {
      if (!updateFile) return;
      
      if (!confirm('Внимание! Это запустит процесс обновления системы. После установки потребуется проверка работоспособности. Продолжить?')) return;

      setIsUpdating(true);
      setUpdateLogs([]);
      
      const steps = [
          { msg: 'Инициализация процесса обновления...', delay: 800 },
          { msg: 'Проверка целостности архива...', delay: 1500 },
          { msg: 'Создание резервной копии текущей конфигурации...', delay: 1000 },
          { msg: 'Распаковка файлов обновления...', delay: 2000 },
          { msg: 'Применение миграций базы данных...', delay: 1200 },
          { msg: 'Оптимизация ассетов...', delay: 1000 },
          { msg: 'Верификация контрольных сумм...', delay: 800 },
          { msg: 'Обновление успешно установлено! Переход в режим проверки.', delay: 500 }
      ];

      for (const step of steps) {
          addUpdateLog(step.msg);
          await new Promise(resolve => setTimeout(resolve, step.delay));
      }

      // Finalize simulation
      const newVersion = `1.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 20)}`;
      localStorage.setItem('sys_pending_version', newVersion);
      localStorage.setItem('sys_update_status', 'verifying');
      localStorage.setItem('sys_last_update', new Date().toLocaleDateString());
      
      setIsUpdating(false);
      
      // Trigger global event for layout to catch
      window.dispatchEvent(new Event('storage-update-event'));
      
      // Reload to show banner
      setTimeout(() => {
          window.location.reload();
      }, 1000);
  };

  // --- Module Config Logic ---
  // ... (Existing functions for module config remain unchanged)
  const toggleColumnVisibility = (key: string) => {
      if (!editingConfig?.moduleSettings?.[selectedModule]) return;
      const columns = [...editingConfig.moduleSettings[selectedModule].tableColumns];
      const colIndex = columns.findIndex(c => c.key === key);
      if (colIndex > -1) {
          columns[colIndex].visible = !columns[colIndex].visible;
          setEditingConfig({
              ...editingConfig,
              moduleSettings: {
                  ...editingConfig.moduleSettings,
                  [selectedModule]: {
                      ...editingConfig.moduleSettings[selectedModule],
                      tableColumns: columns
                  }
              }
          });
      }
  };

  const deleteColumn = (key: string) => {
      if (!editingConfig?.moduleSettings?.[selectedModule]) return;
      const columns = editingConfig.moduleSettings[selectedModule].tableColumns.filter(c => c.key !== key);
      setEditingConfig({
          ...editingConfig,
          moduleSettings: {
              ...editingConfig.moduleSettings,
              [selectedModule]: {
                  ...editingConfig.moduleSettings[selectedModule],
                  tableColumns: columns
              }
          }
      });
  };

  const addColumnFromField = () => {
      if (!newColumnFieldKey || !editingConfig?.moduleSettings?.[selectedModule]) return;
      
      // Find label from field definition
      let label = newColumnFieldKey;
      editingConfig.moduleSettings[selectedModule].formTabs.forEach(tab => {
          const field = tab.fields.find(f => f.key === newColumnFieldKey);
          if (field) label = field.label;
      });

      const newCol = { key: newColumnFieldKey, label, visible: true };
      const columns = [...editingConfig.moduleSettings[selectedModule].tableColumns, newCol];
      
      setEditingConfig({
          ...editingConfig,
          moduleSettings: {
              ...editingConfig.moduleSettings,
              [selectedModule]: {
                  ...editingConfig.moduleSettings[selectedModule],
                  tableColumns: columns
              }
          }
      });
      setNewColumnFieldKey('');
  };

  const updateField = (tabId: string, updatedField: FieldSchema) => {
      if (!editingConfig?.moduleSettings?.[selectedModule]) return;
      const tabs = [...editingConfig.moduleSettings[selectedModule].formTabs];
      const tabIndex = tabs.findIndex(t => t.id === tabId);
      if (tabIndex > -1) {
          const fieldIndex = tabs[tabIndex].fields.findIndex(f => f.key === updatedField.key);
          if (fieldIndex > -1) {
              tabs[tabIndex].fields[fieldIndex] = updatedField;
              setEditingConfig({
                  ...editingConfig,
                  moduleSettings: {
                      ...editingConfig.moduleSettings,
                      [selectedModule]: {
                          ...editingConfig.moduleSettings[selectedModule],
                          formTabs: tabs
                      }
                  }
              });
          }
      }
      setEditingField(null);
      setShowDictEditor(false);
  };

  const addNewField = (tabId: string) => {
      if (!editingConfig?.moduleSettings?.[selectedModule]) return;
      const newKey = prompt("ID поля (английскими буквами, без пробелов):");
      if (!newKey) return;

      const tabs = [...editingConfig.moduleSettings[selectedModule].formTabs];
      const tabIndex = tabs.findIndex(t => t.id === tabId);
      if (tabIndex > -1) {
          // Check for duplicate key
          const exists = tabs.some(t => t.fields.some(f => f.key === newKey));
          if (exists) {
              alert('Поле с таким ID уже существует');
              return;
          }

          tabs[tabIndex].fields.push({
              key: newKey,
              label: 'Новое поле',
              type: 'text',
              required: false,
              hidden: false
          });
          setEditingConfig({
              ...editingConfig,
              moduleSettings: {
                  ...editingConfig.moduleSettings,
                  [selectedModule]: {
                      ...editingConfig.moduleSettings[selectedModule],
                      formTabs: tabs
                  }
              }
          });
      }
  };

  const deleteField = (tabId: string, fieldKey: string) => {
      if (!confirm("Удалить поле?")) return;
      if (!editingConfig?.moduleSettings?.[selectedModule]) return;
      const tabs = [...editingConfig.moduleSettings[selectedModule].formTabs];
      const tabIndex = tabs.findIndex(t => t.id === tabId);
      if (tabIndex > -1) {
          tabs[tabIndex].fields = tabs[tabIndex].fields.filter(f => f.key !== fieldKey);
          setEditingConfig({
              ...editingConfig,
              moduleSettings: {
                  ...editingConfig.moduleSettings,
                  [selectedModule]: {
                      ...editingConfig.moduleSettings[selectedModule],
                      formTabs: tabs
                  }
              }
          });
      }
  };

  const moveField = (tabId: string, index: number, direction: 'up' | 'down') => {
      if (!editingConfig?.moduleSettings?.[selectedModule]) return;
      const tabs = [...editingConfig.moduleSettings[selectedModule].formTabs];
      const tabIndex = tabs.findIndex(t => t.id === tabId);
      if (tabIndex > -1) {
          const fields = [...tabs[tabIndex].fields];
          const newIndex = direction === 'up' ? index - 1 : index + 1;
          
          if (newIndex >= 0 && newIndex < fields.length) {
              const temp = fields[index];
              fields[index] = fields[newIndex];
              fields[newIndex] = temp;
              tabs[tabIndex].fields = fields;
              
              setEditingConfig({
                  ...editingConfig,
                  moduleSettings: {
                      ...editingConfig.moduleSettings,
                      [selectedModule]: {
                          ...editingConfig.moduleSettings[selectedModule],
                          formTabs: tabs
                      }
                  }
              });
          }
      }
  };

  const addNewTab = () => {
      if (!editingConfig?.moduleSettings?.[selectedModule]) return;
      const tabName = prompt("Название новой вкладки:");
      if (!tabName) return;
      const tabId = tabName.toLowerCase().replace(/\s+/g, '_');

      const tabs = [...editingConfig.moduleSettings[selectedModule].formTabs];
      tabs.push({
          id: tabId,
          label: tabName,
          fields: []
      });

      setEditingConfig({
          ...editingConfig,
          moduleSettings: {
              ...editingConfig.moduleSettings,
              [selectedModule]: {
                  ...editingConfig.moduleSettings[selectedModule],
                  formTabs: tabs
              }
          }
      });
  };

  const deleteTab = (tabId: string) => {
      if (!confirm("Удалить вкладку и все поля в ней?")) return;
      if (!editingConfig?.moduleSettings?.[selectedModule]) return;
      
      const tabs = editingConfig.moduleSettings[selectedModule].formTabs.filter(t => t.id !== tabId);
      
      setEditingConfig({
          ...editingConfig,
          moduleSettings: {
              ...editingConfig.moduleSettings,
              [selectedModule]: {
                  ...editingConfig.moduleSettings[selectedModule],
                  formTabs: tabs
              }
          }
      });
  };

  // Helper to get available fields for new columns
  const getAvailableFieldsForColumns = () => {
      if (!editingConfig?.moduleSettings?.[selectedModule]) return [];
      const currentKeys = editingConfig.moduleSettings[selectedModule].tableColumns.map(c => c.key);
      const allFields = editingConfig.moduleSettings[selectedModule].formTabs.flatMap(t => t.fields);
      return allFields.filter(f => !currentKeys.includes(f.key));
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex gap-6">
      
      {/* Sidebar List (Companies) */}
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
                        <div className="flex justify-between items-center">
                            <span className="truncate">{c.name}</span>
                            {c.id === 'repetitor_tj' && <span className="text-[10px] bg-white/20 px-1 rounded flex-shrink-0">Def</span>}
                        </div>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); impersonateCompanyAdmin(c); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                        title="Войти как Админ (Тест)"
                    >
                        <LogIn size={14} />
                    </button>
                  </div>
              ))}
          </div>
          
          {/* Version Info in Sidebar Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50">
              <p>App Version: <span className="font-mono text-slate-600 dark:text-slate-300">{appVersion}</span></p>
              <p>Last Update: {lastUpdate}</p>
          </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden relative">
          
          {/* -- TABS HEADER -- */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <button 
                    onClick={() => setActiveTab('modules')} 
                    className={`py-4 px-6 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'modules' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    <Layout size={16}/> Модули
                </button>
                <button 
                    onClick={() => setActiveTab('config')} 
                    className={`py-4 px-6 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'config' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    <Edit2 size={16}/> Детальная настройка
                </button>
                <button 
                    onClick={() => setActiveTab('updates')} 
                    className={`py-4 px-6 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ml-auto ${activeTab === 'updates' ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    <ArrowUpCircle size={16}/> Обновление системы
                </button>
          </div>

          {activeTab === 'updates' ? (
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  <div className="max-w-3xl mx-auto space-y-8">
                      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-xl flex justify-between items-center relative overflow-hidden">
                          <div className="relative z-10">
                              <h2 className="text-2xl font-bold mb-1">Системное обновление</h2>
                              <p className="text-slate-300 text-sm">Текущая версия: <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-white font-bold">{appVersion}</span></p>
                          </div>
                          <div className="relative z-10 text-right">
                              <p className="text-xs text-slate-400 uppercase font-bold mb-1">Статус</p>
                              <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${localStorage.getItem('sys_update_status') === 'verifying' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                                  <span className="font-bold">{localStorage.getItem('sys_update_status') === 'verifying' ? 'Ожидает проверки' : 'Стабильно'}</span>
                              </div>
                          </div>
                          <Server size={180} className="absolute -right-10 -bottom-10 opacity-10 rotate-12" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors bg-white dark:bg-slate-800 relative group cursor-pointer" onClick={() => updateFileInputRef.current?.click()}>
                                  <input 
                                      type="file" 
                                      ref={updateFileInputRef}
                                      className="hidden" 
                                      accept=".zip"
                                      onChange={handleFileSelect}
                                  />
                                  <div className="w-16 h-16 bg-blue-50 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 text-blue-500 group-hover:scale-110 transition-transform">
                                      <UploadCloud size={32} />
                                  </div>
                                  {updateFile ? (
                                      <>
                                          <p className="font-bold text-slate-800 dark:text-white">{updateFile.name}</p>
                                          <p className="text-xs text-slate-500">{(updateFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                          <button onClick={(e) => { e.stopPropagation(); setUpdateFile(null); }} className="absolute top-2 right-2 p-1 hover:bg-red-100 text-red-500 rounded-full"><X size={16}/></button>
                                      </>
                                  ) : (
                                      <>
                                          <p className="font-bold text-slate-700 dark:text-slate-200">Загрузите ZIP-архив</p>
                                          <p className="text-xs text-slate-400 mt-1">Перетащите файл или кликните</p>
                                      </>
                                  )}
                              </div>

                              <button 
                                  onClick={runUpdateProcess}
                                  disabled={!updateFile || isUpdating}
                                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                              >
                                  {isUpdating ? <RefreshCw size={20} className="animate-spin" /> : <Play size={20} />}
                                  {isUpdating ? 'Установка...' : 'Начать обновление'}
                              </button>
                          </div>

                          <div className="bg-slate-900 rounded-2xl p-4 font-mono text-xs text-slate-300 shadow-inner h-64 overflow-y-auto custom-scrollbar flex flex-col">
                              <div className="flex items-center gap-2 border-b border-slate-700 pb-2 mb-2 text-slate-500">
                                  <Terminal size={14} />
                                  <span>Deployment Logs</span>
                              </div>
                              <div className="flex-1 space-y-1">
                                  {updateLogs.length === 0 && <span className="opacity-30 italic">Ready for deployment...</span>}
                                  {updateLogs.map((log, i) => (
                                      <div key={i} className="break-all">
                                          <span className="text-blue-500 mr-2">$</span>
                                          {log}
                                      </div>
                                  ))}
                                  {isUpdating && <div className="animate-pulse text-blue-400 mt-2">_ Processing...</div>}
                              </div>
                          </div>
                      </div>

                      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3 items-start">
                          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                          <div>
                              <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm">Важная информация</h4>
                              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                                  После загрузки архива система автоматически перейдет в <b>Режим проверки</b>. 
                                  Сайт будет обновлен, но изменения не будут зафиксированы окончательно, пока вы не подтвердите их работоспособность.
                                  В случае ошибок вы сможете выполнить <b>мгновенный откат</b> до предыдущей версии.
                              </p>
                          </div>
                      </div>
                  </div>
              </div>
          ) : editingConfig ? (
              <>
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Settings size={20} className="text-blue-500"/>
                            Настройки: {editingConfig.name}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 font-mono">ID: {editingConfig.id}</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => impersonateCompanyAdmin(editingConfig)}
                            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            <LogIn size={18} /> Тест
                        </button>
                        <button 
                            onClick={handleSave}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-colors"
                        >
                            <Save size={18} /> Сохранить
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/20 custom-scrollbar">
                    
                    {/* --- MODULES TAB --- */}
                    {activeTab === 'modules' && (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {Object.entries(editingConfig.modules).map(([key, value]) => (
                                <label key={key} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${value ? 'bg-white border-blue-200 dark:bg-slate-800 dark:border-blue-800' : 'bg-slate-100 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 opacity-75'}`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${value ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                                        <span className="font-bold text-slate-700 dark:text-slate-200 capitalize">{key}</span>
                                    </div>
                                    <div className={`w-10 h-6 rounded-full p-1 transition-colors flex items-center ${value ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                        <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${value ? 'translate-x-4' : ''}`}></div>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="hidden" 
                                        checked={value} 
                                        onChange={() => handleModuleToggle(key as keyof ModuleConfig)}
                                    />
                                </label>
                            ))}
                        </div>
                    )}

                    {/* --- CONFIG TAB (DETAILED) --- */}
                    {activeTab === 'config' && (
                        <div className="flex h-full gap-4">
                            {/* Module Selector Sidebar */}
                            <div className="w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col shrink-0">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 font-bold text-xs uppercase text-slate-500">
                                    Выберите модуль
                                </div>
                                <div className="p-2 space-y-1">
                                    {Object.keys(editingConfig.moduleSettings || {}).map(modKey => {
                                        const Icon = MODULE_ICONS[modKey] || Layout;
                                        return (
                                            <button
                                                key={modKey}
                                                onClick={() => setSelectedModule(modKey)}
                                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                    selectedModule === modKey 
                                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                <Icon size={16}/>
                                                {MODULE_NAMES[modKey] || modKey}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Main Config Area */}
                            <div className="flex-1 flex flex-col">
                                <div className="flex gap-2 mb-4 border-b border-slate-200 dark:border-slate-700 pb-1">
                                    <button 
                                        onClick={() => setActiveConfigTab('form')}
                                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeConfigTab === 'form' ? 'bg-white dark:bg-slate-800 border-x border-t border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Поля формы
                                    </button>
                                    <button 
                                        onClick={() => setActiveConfigTab('columns')}
                                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeConfigTab === 'columns' ? 'bg-white dark:bg-slate-800 border-x border-t border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Столбцы таблицы
                                    </button>
                                </div>

                                {activeConfigTab === 'columns' && editingConfig.moduleSettings?.[selectedModule] && (
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-bold text-slate-800 dark:text-white">Настройка отображения в таблице</h3>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            {editingConfig.moduleSettings[selectedModule].tableColumns.map(col => (
                                                <div key={col.key} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-slate-400"><GripVertical size={16}/></div>
                                                        <span className="font-medium text-slate-700 dark:text-slate-200">{col.label}</span>
                                                        <span className="text-xs text-slate-400 font-mono">({col.key})</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={() => toggleColumnVisibility(col.key)}
                                                            className={`p-2 rounded-lg transition-colors ${col.visible ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'}`}
                                                            title={col.visible ? 'Скрыть' : 'Показать'}
                                                        >
                                                            {col.visible ? <Eye size={18}/> : <EyeOff size={18}/>}
                                                        </button>
                                                        <button 
                                                            onClick={() => deleteColumn(col.key)}
                                                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                            title="Удалить из таблицы"
                                                        >
                                                            <Trash2 size={18}/>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Add Column Section */}
                                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Добавить столбец из поля</label>
                                            <div className="flex gap-2">
                                                <select 
                                                    className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                                    value={newColumnFieldKey}
                                                    onChange={(e) => setNewColumnFieldKey(e.target.value)}
                                                >
                                                    <option value="">-- Выберите поле --</option>
                                                    {getAvailableFieldsForColumns().map(f => (
                                                        <option key={f.key} value={f.key}>{f.label} ({f.key})</option>
                                                    ))}
                                                </select>
                                                <button 
                                                    onClick={addColumnFromField}
                                                    disabled={!newColumnFieldKey}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Добавить
                                                </button>
                                            </div>
                                            {getAvailableFieldsForColumns().length === 0 && (
                                                <p className="text-xs text-slate-400 mt-2">Все доступные поля уже добавлены в таблицу.</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeConfigTab === 'form' && editingConfig.moduleSettings?.[selectedModule] && (
                                    <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pb-10">
                                        <div className="flex justify-end">
                                            <button onClick={addNewTab} className="text-xs flex items-center gap-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg font-bold">
                                                <Plus size={14}/> Добавить вкладку
                                            </button>
                                        </div>
                                        {editingConfig.moduleSettings[selectedModule].formTabs.map(tab => (
                                            <div key={tab.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                                                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <Layout size={16} className="text-slate-400"/>
                                                        <span className="font-bold text-slate-700 dark:text-slate-200">{tab.label}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={() => addNewField(tab.id)}
                                                            className="text-xs flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1 rounded transition-colors font-bold"
                                                        >
                                                            <Plus size={14}/> Поле
                                                        </button>
                                                        <button onClick={() => deleteTab(tab.id)} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded"><Trash2 size={14}/></button>
                                                    </div>
                                                </div>
                                                <div className="p-2 space-y-2">
                                                    {tab.fields.map((field, idx) => (
                                                        <div key={field.key} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 rounded-lg group transition-all shadow-sm">
                                                            <div className="flex items-center gap-3">
                                                                <div className="text-slate-300 group-hover:text-slate-500 cursor-move"><GripVertical size={16}/></div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{field.label}</span>
                                                                        {field.required && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded font-bold">Req</span>}
                                                                        {field.hidden && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded font-bold">Hidden</span>}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-700 px-1 rounded">{field.key}</span>
                                                                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">{field.type}</span>
                                                                        {field.dictionaryKey && <span className="text-[10px] text-purple-500 flex items-center gap-0.5"><Database size={10}/> {field.dictionaryKey}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <div className="flex flex-col gap-0.5 mr-2">
                                                                    <button onClick={() => moveField(tab.id, idx, 'up')} disabled={idx === 0} className="p-0.5 hover:text-blue-600 disabled:opacity-30"><MoveUp size={12}/></button>
                                                                    <button onClick={() => moveField(tab.id, idx, 'down')} disabled={idx === tab.fields.length - 1} className="p-0.5 hover:text-blue-600 disabled:opacity-30"><MoveDown size={12}/></button>
                                                                </div>
                                                                <button 
                                                                    onClick={() => setEditingField({tabId: tab.id, field})}
                                                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-blue-600 transition-colors"
                                                                >
                                                                    <Edit2 size={16}/>
                                                                </button>
                                                                <button 
                                                                    onClick={() => deleteField(tab.id, field.key)}
                                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                                                >
                                                                    <Trash2 size={16}/>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {tab.fields.length === 0 && <p className="text-xs text-slate-400 text-center py-2 italic">Нет полей</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
              </>
          ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Settings size={48} className="mb-4 opacity-20"/>
                  <p>Выберите компанию для настройки</p>
              </div>
          )}

          {/* Edit Field Modal */}
          {editingField && (
              <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4 animate-in zoom-in duration-200 border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
                      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2 flex-shrink-0">
                          <h3 className="font-bold text-lg dark:text-white">Настройка поля</h3>
                          <button onClick={() => { setEditingField(null); setShowDictEditor(false); }}><X size={20} className="text-slate-400"/></button>
                      </div>
                      
                      <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 px-1">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Название (Label)</label>
                            <input 
                                type="text" 
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                                value={editingField.field.label}
                                onChange={(e) => setEditingField({...editingField, field: {...editingField.field, label: e.target.value}})}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Тип поля</label>
                            <select 
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                value={editingField.field.type}
                                onChange={(e) => setEditingField({...editingField, field: {...editingField.field, type: e.target.value as any}})}
                            >
                                <option value="text">Текст</option>
                                <option value="number">Число</option>
                                <option value="date">Дата</option>
                                <option value="select">Список (Select)</option>
                                <option value="boolean">Да/Нет</option>
                                <option value="phone">Телефон</option>
                                <option value="email">Email</option>
                                <option value="textarea">Текст (Area)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Опции</label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Обязательное</span>
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${editingField.field.required ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-500'}`}>
                                        {editingField.field.required && <Check size={14} className="text-white" strokeWidth={3} />}
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="hidden"
                                        checked={editingField.field.required}
                                        onChange={(e) => setEditingField({...editingField, field: {...editingField.field, required: e.target.checked}})}
                                    />
                                </label>
                                <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Скрытое</span>
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${editingField.field.hidden ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-500'}`}>
                                        {editingField.field.hidden && <Check size={14} className="text-white" strokeWidth={3} />}
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="hidden"
                                        checked={editingField.field.hidden}
                                        onChange={(e) => setEditingField({...editingField, field: {...editingField.field, hidden: e.target.checked}})}
                                    />
                                </label>
                            </div>
                        </div>

                        {editingField.field.type === 'select' && (
                            <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Справочник (Список)</label>
                                <div className="flex gap-2 mb-3">
                                    <select 
                                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editingField.field.dictionaryKey || ''}
                                        onChange={(e) => setEditingField({...editingField, field: {...editingField.field, dictionaryKey: e.target.value}})}
                                    >
                                        <option value="">-- Выберите --</option>
                                        {Object.keys(editingConfig?.dictionaries || {}).map(dk => (
                                            <option key={dk} value={dk}>{dk}</option>
                                        ))}
                                    </select>
                                    <button 
                                        onClick={handleCreateDictionary}
                                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                                        title="Создать новый список"
                                    >
                                        <Plus size={18}/>
                                    </button>
                                </div>
                                
                                {editingField.field.dictionaryKey && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Элементы списка:</span>
                                            <button 
                                                onClick={() => setShowDictEditor(!showDictEditor)}
                                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                {showDictEditor ? 'Скрыть редактор' : 'Редактировать список'}
                                            </button>
                                        </div>
                                        
                                        {showDictEditor && (
                                            <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-600">
                                                <StringListEditor 
                                                    items={editingConfig?.dictionaries[editingField.field.dictionaryKey] || []}
                                                    onChange={(items) => handleDictionaryChange(editingField.field.dictionaryKey!, items)}
                                                />
                                            </div>
                                        )}
                                        
                                        {!showDictEditor && (
                                            <div className="flex flex-wrap gap-1">
                                                {(editingConfig?.dictionaries[editingField.field.dictionaryKey] || []).slice(0, 5).map((item, i) => (
                                                    <span key={i} className="text-[10px] bg-white dark:bg-slate-600 px-2 py-1 rounded text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-500">{item}</span>
                                                ))}
                                                {(editingConfig?.dictionaries[editingField.field.dictionaryKey] || []).length > 5 && <span className="text-[10px] text-slate-400">...</span>}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
                          <button onClick={() => { setEditingField(null); setShowDictEditor(false); }} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Отмена</button>
                          <button 
                            onClick={() => updateField(editingField.tabId, editingField.field)}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                          >
                              Сохранить
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};
