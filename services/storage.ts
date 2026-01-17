
import { Student, Group, Transaction, Lesson, Employee, Violation, CallTask, Company, DEFAULT_LEAVE_REASONS } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_PREFIX = 'educrm_';

export const StorageKeys = {
  STUDENTS: `${STORAGE_PREFIX}students`,
  GROUPS: `${STORAGE_PREFIX}groups`,
  TRANSACTIONS: `${STORAGE_PREFIX}transactions`,
  LESSONS: `${STORAGE_PREFIX}lessons`,
  TEACHERS: `${STORAGE_PREFIX}teachers`,
  EMPLOYEES: `${STORAGE_PREFIX}teachers`,
  VIOLATIONS: `${STORAGE_PREFIX}violations`,
  CALLS: `${STORAGE_PREFIX}calls`,
  RETENTION_LOGS: `${STORAGE_PREFIX}retention_logs`,
  ATTRACTION_LOGS: `${STORAGE_PREFIX}attraction_logs`,
  ENROLLMENTS: `${STORAGE_PREFIX}enrollments`,
  EXAM_RESULTS: `${STORAGE_PREFIX}exam_results`,
  ATTENDANCE: `${STORAGE_PREFIX}attendance`,
  SUBJECT_TARGETS: `${STORAGE_PREFIX}subject_targets`, 
  COURSES: `${STORAGE_PREFIX}courses`,
  INVOICES: `${STORAGE_PREFIX}invoices`,
  AUDIT_LOGS: `${STORAGE_PREFIX}audit_logs`,
  USER_PROFILE: `${STORAGE_PREFIX}user_profile`,
  COMPANIES: `${STORAGE_PREFIX}companies`,
};

const DEFAULT_COMPANY: Company = {
  id: 'repetitor_tj',
  name: 'Repetitor.tj (Default)',
  isActive: true,
  createdAt: new Date().toISOString(),
  modules: {
    crm: true,
    students: true,
    courses: true,
    employees: true,
    groups: true,
    schedule: true,
    finance: true,
    analytics: true,
    exams: true,
    violations: true,
    calls: true
  },
  dictionaries: {
    sources: [
      "Не указано", "В школу приходили", "Инстаграм", "Интернет", "Купон (Учусь с другом)",
      "От друзей", "От родственников", "От ХС", "Реклама с улицы", "Учился раньше", "Фейсбук", "Chat GPT", "Тик Ток"
    ],
    grades: ["4", "5", "6", "7", "8", "9", "10", "11", "Не учится", "1 курс", "2 курс", "3 курс", "4 курс"],
    studyGoals: ["1 кластер", "2 кластер", "3 кластер", "4 кластер", "5 кластер", "ТГМУ/Рос", "Россия", "Зарубеж", "Для себя"],
    leaveReasons: DEFAULT_LEAVE_REASONS,
    expenseCategories: ["Зарплата", "Аренда", "Реклама", "Хоз. нужды", "Налоги", "Прочее"]
  },
  moduleSettings: {
    students: {
      tableColumns: [
        { key: 'fullName', label: 'Ученик', visible: true },
        { key: 'cluster', label: 'Курс', visible: true },
        { key: 'subjects', label: 'Предметы', visible: true },
        { key: 'status', label: 'Статус', visible: true },
        { key: 'branch', label: 'Филиал', visible: true },
        { key: 'phone', label: 'Телефон', visible: false },
        { key: 'balance', label: 'Баланс', visible: false }
      ],
      formTabs: [
        {
          id: 'info',
          label: 'Общее',
          icon: 'User',
          fields: [
            { key: 'fullName', label: 'ФИО Ученика', type: 'text', required: true, hidden: false },
            { key: 'phone', label: 'Телефон', type: 'phone', required: false, hidden: false },
            { key: 'birthYear', label: 'Дата рождения', type: 'date', required: true, hidden: false },
            { key: 'platformAccount', label: 'Аккаунт', type: 'text', required: false, hidden: false, placeholder: 'Логин / Email' },
            { key: 'pipelineStage', label: 'Статус (Воронка)', type: 'select', required: false, hidden: false },
            { key: 'isColorBlind', label: 'Справка о дальтонизме', type: 'boolean', required: false, hidden: false }
          ]
        },
        {
          id: 'academic',
          label: 'Обучение',
          icon: 'GraduationCap',
          fields: [
            { key: 'status', label: 'Статус обучения', type: 'select', required: true, hidden: false },
            { key: 'branch', label: 'Филиал', type: 'select', required: true, hidden: false },
            { key: 'school', label: 'Школа', type: 'text', required: false, hidden: false },
            { key: 'grade', label: 'Класс / Курс', type: 'select', required: false, hidden: false, dictionaryKey: 'grades' },
            { key: 'source', label: 'Откуда узнали', type: 'select', required: false, hidden: false, dictionaryKey: 'sources' },
            { key: 'cluster', label: 'Кластер', type: 'select', required: false, hidden: false },
            { key: 'studyGoal', label: 'Цель обучения', type: 'select', required: false, hidden: false, dictionaryKey: 'studyGoals' },
            { key: 'studyLanguage', label: 'Язык обучения', type: 'select', required: false, hidden: false }
          ]
        },
        {
          id: 'finance',
          label: 'Финансы',
          icon: 'CreditCard',
          fields: [
             { key: 'discountPercent', label: 'Скидка (%)', type: 'number', required: false, hidden: false },
             { key: 'discountReason', label: 'Основание скидки', type: 'text', required: false, hidden: false }
          ]
        }
      ]
    },
    employees: {
      tableColumns: [
        { key: 'fullName', label: 'Сотрудник', visible: true },
        { key: 'role', label: 'Роль', visible: true },
        { key: 'status', label: 'Статус', visible: true },
        { key: 'phone', label: 'Телефон', visible: true },
        { key: 'email', label: 'Email', visible: true }
      ],
      formTabs: [
        {
          id: 'main',
          label: 'Основное',
          fields: [
            { key: 'fullName', label: 'ФИО', type: 'text', required: true, hidden: false },
            { key: 'role', label: 'Роль', type: 'select', required: true, hidden: false },
            { key: 'status', label: 'Статус', type: 'select', required: true, hidden: false },
            { key: 'email', label: 'Email (Логин)', type: 'email', required: true, hidden: false },
            { key: 'phone', label: 'Телефон', type: 'phone', required: true, hidden: false },
            { key: 'birthYear', label: 'Дата рождения', type: 'date', required: false, hidden: false }
          ]
        }
      ]
    },
    courses: {
      tableColumns: [
        { key: 'name', label: 'Название', visible: true },
        { key: 'duration', label: 'Длительность', visible: true },
        { key: 'price', label: 'Цена (базовая)', visible: true }
      ],
      formTabs: [
        {
          id: 'general',
          label: 'Информация',
          fields: [
            { key: 'name', label: 'Название предмета', type: 'text', required: true, hidden: false },
            { key: 'description', label: 'Описание', type: 'textarea', required: false, hidden: false },
            { key: 'duration', label: 'Длительность', type: 'text', required: false, hidden: false }
          ]
        }
      ]
    }
  }
};

// Event Bus for Data Updates
type Listener = (key: string, data: any) => void;
const listeners: Listener[] = [];

// Event Bus for Notifications
export const notify = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
  const event = new CustomEvent('app-notification', { 
    detail: { message, type, id: Date.now() } 
  });
  window.dispatchEvent(event);
};

export const storage = {
  // Subscribe to changes (for React hooks)
  subscribe: (callback: Listener) => {
    listeners.push(callback);
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    };
  },

  // Notify all listeners
  _notifyListeners: (key: string, data: any) => {
    listeners.forEach(cb => cb(key, data));
  },

  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from storage`, e);
      return defaultValue;
    }
  },

  set: async (key: string, value: any): Promise<void> => {
    try {
      // 1. Save locally immediately (Optimistic UI)
      localStorage.setItem(key, JSON.stringify(value));
      
      // 2. Notify local components
      storage._notifyListeners(key, value);

      // 3. Sync to Cloud (Fire and forget, but handle errors silently)
      if (isSupabaseConfigured()) {
          const payload = { 
              key, 
              value: value === undefined ? null : value, 
              updated_at: new Date().toISOString() 
          };

          const { error } = await supabase
            .from('app_data')
            .upsert(payload, { onConflict: 'key' });
          
          if (error) {
              // Log the full error object for better debugging in console
              // console.error('Cloud Sync Error:', error); 
          }
      }

    } catch (e) {
      console.error(`Error saving ${key} to storage`, e);
    }
  },

  // Initialize Cloud Sync on App Start
  initCloud: async () => {
      if (!isSupabaseConfigured()) return;

      try {
          // 1. Pull latest data from cloud
          const { data, error } = await supabase.from('app_data').select('*');
          
          if (error) {
              console.warn('Cloud Sync: Table access failed. Check if "app_data" table exists.', error.message);
              return;
          }
          
          if (data) {
              data.forEach(row => {
                  const { key, value } = row;
                  localStorage.setItem(key, JSON.stringify(value));
                  storage._notifyListeners(key, value);
              });
              // console.log('✅ Cloud Sync: Data pulled successfully');
          }

          // 2. Subscribe to Realtime Changes
          supabase
            .channel('app_data_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_data' }, (payload) => {
                const { new: newRow } = payload;
                if (newRow && 'key' in newRow) {
                    const typedRow = newRow as { key: string, value: any };
                    // Update Local Storage
                    localStorage.setItem(typedRow.key, JSON.stringify(typedRow.value));
                    // Update React State
                    storage._notifyListeners(typedRow.key, typedRow.value);
                }
            })
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.warn('⚠️ Cloud Sync: Realtime connection failed. Ensure Replication is enabled for "app_data" table in Supabase Dashboard -> Database -> Replication.');
                }
            });

      } catch (err) {
          console.error('Cloud Sync Init Exception:', err);
      }
  },

  getCompanyConfig: (companyId: string = 'repetitor_tj'): Company => {
    try {
      const companies = JSON.parse(localStorage.getItem(StorageKeys.COMPANIES) || '[]');
      const company = companies.find((c: Company) => c.id === companyId);
      if (company) {
          if (!company.moduleSettings) {
              return { ...company, moduleSettings: DEFAULT_COMPANY.moduleSettings };
          }
          return company;
      }
      if (companies.length === 0) {
        localStorage.setItem(StorageKeys.COMPANIES, JSON.stringify([DEFAULT_COMPANY]));
        return DEFAULT_COMPANY;
      }
      return DEFAULT_COMPANY;
    } catch (e) {
      return DEFAULT_COMPANY;
    }
  },

  logAction: (action: string, details: string, entityId?: number) => {
    const logs = storage.get<any[]>(StorageKeys.AUDIT_LOGS, []);
    const user = storage.get(StorageKeys.USER_PROFILE, { fullName: 'Администратор' });
    const newLog = {
      id: Date.now(),
      userId: 'user_1',
      userName: user.fullName,
      action,
      details,
      timestamp: new Date().toISOString(),
      entityId
    };
    storage.set(StorageKeys.AUDIT_LOGS, [newLog, ...logs].slice(0, 1000));
  },

  notify,

  clear: () => {
    Object.values(StorageKeys).forEach(key => localStorage.removeItem(key));
  }
};
