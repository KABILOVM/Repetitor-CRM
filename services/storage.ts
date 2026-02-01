
import { Student, Group, Transaction, Employee, Violation, Company, DEFAULT_LEAVE_REASONS, SidebarItem, UserRole, UserProfile, Branch, Cluster, AuditLog, Invoice, AppNotification } from '../types';
import { supabase } from './supabase';

const STORAGE_PREFIX = 'repetitor_';

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
  ATTANCE: `${STORAGE_PREFIX}attendance`,
  ATTENDANCE: `${STORAGE_PREFIX}attendance`,
  SUBJECT_TARGETS: `${STORAGE_PREFIX}subject_targets`, 
  COURSES: `${STORAGE_PREFIX}courses`,
  COURSE_PROGRAMS: `${STORAGE_PREFIX}course_programs`,
  INVOICES: `${STORAGE_PREFIX}invoices`,
  AUDIT_LOGS: `${STORAGE_PREFIX}audit_logs`,
  USER_PROFILE: `${STORAGE_PREFIX}user_profile`,
  COMPANIES: `${STORAGE_PREFIX}companies`,
  BRANCHES: `${STORAGE_PREFIX}branches`,
  LMS_SUBJECTS: `${STORAGE_PREFIX}lms_subjects`,
  LMS_SECTIONS: `${STORAGE_PREFIX}lms_sections`,
  LMS_TOPICS: `${STORAGE_PREFIX}lms_topics`,
  LMS_LESSONS: `${STORAGE_PREFIX}lms_lessons`,
  LMS_PROGRESS: `${STORAGE_PREFIX}lms_progress`,
  SURVEYS: `${STORAGE_PREFIX}surveys`,
  SURVEY_RESPONSES: `${STORAGE_PREFIX}survey_responses`,
  TASK_TEAMS: `${STORAGE_PREFIX}tasks_teams`,
  TASK_SPRINTS: `${STORAGE_PREFIX}tasks_sprints`,
  TASK_ITEMS: `${STORAGE_PREFIX}tasks_items`,
  TASK_COLUMNS: `${STORAGE_PREFIX}tasks_columns`,
  NOTIFICATIONS: `${STORAGE_PREFIX}notifications`,
};

const DEFAULT_SIDEBAR: SidebarItem[] = [
  { id: 'dashboard', path: '/', label: 'Дашборд', icon: 'LayoutDashboard', roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Financier, UserRole.Teacher], visible: true },
  { id: 'crm', path: '/crm', label: 'CRM (Воронка)', icon: 'Megaphone', roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin], visible: true },
  { id: 'tasks', path: '/tasks', label: 'Задачи', icon: 'LayoutGrid', roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Teacher], visible: true },
  { id: 'students', path: '/students', label: 'Ученики', icon: 'Users', roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Teacher, UserRole.Financier], visible: true },
  { id: 'groups', path: '/groups', label: 'Группы', icon: 'Layers', roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Teacher], visible: true },
  { id: 'schedule', path: '/schedule', label: 'Расписание', icon: 'Calendar', roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Teacher, UserRole.Student], visible: true },
  { id: 'finance', path: '/finance', label: 'Финансы', icon: 'CreditCard', roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Financier, UserRole.Admin], visible: true },
  { id: 'employees', path: '/employees', label: 'Сотрудники', icon: 'Briefcase', roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin], visible: true },
  { id: 'courses', path: '/courses', label: 'Курсы', icon: 'BookOpen', roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Teacher], visible: true },
  { id: 'branches', path: '/branches', label: 'Филиалы', icon: 'MapPin', roles: [UserRole.GeneralDirector, UserRole.Developer], visible: true },
  { id: 'exams', path: '/exams', label: 'Экзамены', icon: 'Award', roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Teacher], visible: true },
  { id: 'violations', path: '/violations', label: 'Нарушения', icon: 'AlertTriangle', roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Teacher], visible: true },
  { id: 'calls', path: '/calls', label: 'Звонки', icon: 'Phone', roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin], visible: true },
  { id: 'surveys', path: '/surveys', label: 'Анкеты', icon: 'FileQuestion', roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Teacher, UserRole.Student], visible: true },
  { id: 'analytics', path: '/analytics', label: 'Аналитика', icon: 'BarChart3', roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Financier], visible: true },
  { id: 'import', path: '/import', label: 'Импорт', icon: 'Upload', roles: [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin], visible: true },
];

const listeners: ((key: string, value: any) => void)[] = [];

export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    try {
      return JSON.parse(stored) as T;
    } catch {
      return defaultValue;
    }
  },
  set: <T>(key: string, value: T): void => {
    // 1. Сохраняем локально
    localStorage.setItem(key, JSON.stringify(value));
    
    // 2. Уведомляем локальных подписчиков
    listeners.forEach(l => l(key, value));

    // 3. Синхронизируем с облаком (кроме профиля самого пользователя)
    if (key !== StorageKeys.USER_PROFILE) {
        const user = storage.get<UserProfile | null>(StorageKeys.USER_PROFILE, null);
        if (user?.companyId) {
            supabase.from('organization_data').upsert({
                organization_id: user.companyId,
                key: key,
                data: value,
                updated_at: new Date().toISOString()
            }).then(({ error }) => {
                if (error) console.error('Cloud Sync Error:', error);
            });
        }
    }
  },
  notifyExternalChange: (key: string, value: any) => {
    // Вызывается при получении данных из Realtime
    localStorage.setItem(key, JSON.stringify(value));
    listeners.forEach(l => l(key, value));
  },
  subscribe: (callback: (key: string, value: any) => void) => {
    listeners.push(callback);
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    };
  },
  logAction: (action: string, details: string, entityId?: number | string) => {
    const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { fullName: 'Unknown', role: UserRole.Admin, email: '', permissions: [] });
    const logs = storage.get<AuditLog[]>(StorageKeys.AUDIT_LOGS, []);
    const newLog: AuditLog = {
      id: Date.now(),
      organization_id: user.organization_id, 
      userId: user.email,
      userName: user.fullName,
      action,
      details,
      timestamp: new Date().toISOString(),
      entityId
    };
    storage.set(StorageKeys.AUDIT_LOGS, [newLog, ...logs]);
  },
  notify: (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', title?: string) => {
    const notifications = storage.get<AppNotification[]>(StorageKeys.NOTIFICATIONS, []);
    const newNotif: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title || (type === 'success' ? 'Успешно' : type === 'error' ? 'Ошибка' : type === 'warning' ? 'Внимание' : 'Инфо'),
      message,
      type,
      createdAt: new Date().toISOString(),
      read: false
    };
    storage.set(StorageKeys.NOTIFICATIONS, [newNotif, ...notifications]);
  },
  getCompanyConfig: (companyId: string = 'repetitor_tj'): Company => {
    const companies = storage.get<Company[]>(StorageKeys.COMPANIES, []);
    const company = companies.find(c => c.id === companyId);
    if (company) return company;

    return {
      id: 'repetitor_tj',
      name: 'Repetitor.tj',
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
        calls: true,
        surveys: true,
        import: true,
        journal: true,
        tasks: true,
        branches: true,
        classes: true
      },
      dictionaries: {
        sources: ['Instagram', 'Facebook', 'Google', 'Рекомендация', 'Листовка', 'Проходил мимо'],
        grades: ['1 класс', '2 класс', '3 класс', '4 класс', '5 класс', '6 класс', '7 класс', '8 класс', '9 класс', '10 класс', '11 класс', 'Студент', 'Взрослый'],
        studyGoals: ['Подготовка к НЦТ', 'Для себя', 'Школьная программа', 'Международные экзамены'],
        leaveReasons: DEFAULT_LEAVE_REASONS,
        expenseCategories: ['Аренда', 'Зарплата', 'Маркетинг', 'Хозрасходы', 'Налоги']
      },
      sidebarConfig: DEFAULT_SIDEBAR,
      rolePermissions: {
        // Starts with empty permissions to be defined by Super Admin
      }
    };
  }
};
