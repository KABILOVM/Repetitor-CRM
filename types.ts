
export enum UserRole {
  Developer = 'Разработчик', // Hidden system role
  GeneralDirector = 'Гендиректор', // Level 6
  Director = 'Директор',         // Level 5
  Financier = 'Финансист',       // Level 4
  Admin = 'Администратор',       // Level 3
  Teacher = 'Преподаватель',     // Level 2
  Student = 'Ученик'             // Level 1
}

export const ALL_PERMISSIONS = [
  'CRM (Лиды)', 
  'Студенты', 
  'Группы', 
  'Расписание', 
  'Финансы', 
  'Аналитика', 
  'Настройки',
  'Сотрудники'
];

// --- SaaS Configuration Types ---

export interface ModuleConfig {
  crm: boolean;
  students: boolean;
  courses: boolean;
  employees: boolean;
  groups: boolean;
  schedule: boolean;
  finance: boolean;
  analytics: boolean;
  exams: boolean;
  violations: boolean;
  calls: boolean;
}

export interface DictionaryConfig {
  sources: string[];
  grades: string[];
  studyGoals: string[];
  leaveReasons: string[];
  expenseCategories: string[];
  [key: string]: string[]; // Allow dynamic expansion
}

// --- Dynamic Field System ---

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'boolean' | 'textarea' | 'email' | 'phone';

export interface FieldSchema {
  key: string; // The property name in the data object
  label: string;
  type: FieldType;
  required: boolean;
  hidden: boolean;
  dictionaryKey?: string; // If type is 'select', which dictionary to use
  placeholder?: string;
  readOnly?: boolean; // For system fields like ID
}

export interface FormTabSchema {
  id: string;
  label: string;
  icon?: string;
  fields: FieldSchema[];
}

export interface TableColumnSchema {
  key: string;
  label: string;
  visible: boolean;
  width?: string;
}

export interface ModuleSettings {
  students: {
    tableColumns: TableColumnSchema[];
    formTabs: FormTabSchema[];
  };
  // Future expansion for other modules
  [key: string]: any;
}

export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  domain?: string; // e.g., repetitor.tj
  modules: ModuleConfig;
  dictionaries: DictionaryConfig;
  moduleSettings?: ModuleSettings; // New: Detailed configuration
  createdAt: string;
  isActive: boolean;
}

// --------------------------------

export interface UserProfile {
  fullName: string;
  avatar?: string;
  role: UserRole;
  originalRole?: UserRole; // Keeps track of the real role when acting as someone else (for Devs)
  email: string;
  permissions: string[];
  branch?: Branch; // Assigned branch for the user
  companyId?: string; // Tenant ID
  subject?: string; // Legacy support
  subjects?: string[]; // For teachers (multiple)
  
  // Backup & Integrations
  googleDriveConnected?: boolean;
  backupFrequency?: 'daily' | 'weekly' | 'off';
  lastBackup?: string;
}

export enum Branch {
  Dushanbe_Vatan = 'Душанбе (Ватан)',
  Dushanbe_TSUM = 'Душанбе (ЦУМ)',
  Dushanbe_82 = 'Душанбе (82 мкр)',
  Dushanbe_9km = 'Душанбе (9 км)',
  Khujand_Coop = 'Худжанд (Кооператор)',
  Khujand_19 = 'Худжанд (19 мкр)',
  Isfara = 'Исфара',
  Tursunzade = 'Турсунзаде',
  Jabbor_Rasulov = 'Дж. Расулов'
}

export enum Cluster {
  C1 = '1 кластер',
  C2 = '2 кластер',
  C3 = '3 кластер',
  C4 = '4 кластер',
  C5 = '5 кластер',
  English = 'Английский язык',
  Math = 'Математика',
  IELTS = 'IELTS'
}

// Default fallback lists (can be overridden by Company Config)
export const DEFAULT_LEAVE_REASONS = [
  "Переход в другой наш филиал",
  "Болезнь ученика или члена семьи",
  "Семейные проблемы",
  "Отложил на следующий год",
  "Переезд в другой город/за границу",
  "Проблемы с оплатой",
  "Не справляется с учёбой",
  "Не понравились уроки",
  "Далеко добираться",
  "Проблемы с расписанием",
  "Временная пауза",
  "Переход в другой центр",
  "Закрыли группу",
  "Сдал экзамен",
  "Нашли дальтонизм"
];

export enum StudentStatus {
  Active = 'Активен',
  Archived = 'Неактивен',
  Presale = 'Предзапись',
  Dropped = 'Отвалился',
  Paused = 'Пауза'
}

export enum PipelineStage {
  New = 'Записан',
  Call = 'Тестирование',
  Trial = 'Пробный урок',
  Contract = 'Договор',
  Payment = 'Ожидает оплаты'
}

export interface CourseBook {
  id: string;
  name: string;
  price: number;
}

export interface BranchConfig {
  price: number;
  targetStudents: number; // Plan
  isActive: boolean; // Is course available in this branch
}

export interface Course {
  id: number;
  name: string;
  // Replaced global price/target with per-branch config
  branchConfig?: Record<string, BranchConfig>; 
  
  description?: string;
  duration?: string; // e.g. "3 months"
  scheduleDays?: string[]; // e.g. ["Mon", "Wed"]
  includedItems?: string[]; // "Certificate", "Book"
  
  icon?: string; // Icon name key
  color?: string; // Color key
  
  books: CourseBook[];
  receiptCode?: string; 
  
  // Legacy fields for backward compat (optional)
  price?: number; 
  branchPrices?: Record<string, number>; 
  targetStudents?: number;
}

export interface Invoice {
  id: number;
  studentId: number;
  studentName: string;
  amount: number;
  month: string; // Format "2024-03"
  status: 'Оплачен' | 'Ожидает';
  createdAt: string;
  subjects?: string[];
}

export interface AuditLog {
  id: number;
  userId: string;
  userName: string;
  action: string; 
  details: string; 
  timestamp: string;
  entityId?: number; 
}

export interface StudentBook {
  bookId: string;
  name: string;
  price: number;
  isPaid: boolean;
  isIssued: boolean;
  issuedDate?: string;
}

export interface ParentInfo {
  name: string;
  role: string; // 'Мама', 'Папа', 'Другое' (or custom string)
  phone: string;
  email?: string;
}

export interface Student {
  id: number;
  fullName: string;
  phone: string;
  source: string;
  status: StudentStatus | string; // Allowing string for compatibility during import
  pipelineStage: PipelineStage;
  avatar?: string; // New avatar field
  
  // Legacy parent fields (kept for backward compatibility, sync with parents[0])
  parentName?: string;
  parentPhone: string;
  parentEmail?: string;
  
  // New Array for multiple parents
  parents?: ParentInfo[];

  school?: string;
  grade?: string;
  birthYear?: string;
  
  subjects: string[]; // Supports multiple subjects (up to 5)
  groupIds?: number[]; // IDs of groups the student is enrolled in
  
  branch?: Branch;
  cluster?: Cluster;
  
  targetUniversity?: 'Local' | 'Foreign'; 
  studyLanguage?: string;
  materialsIssued?: boolean; 
  assignedBooks?: StudentBook[]; 

  presaleDate?: string; // Date added as Presale
  primaryAdaptation?: boolean; 
  platformAccount?: string; 
  contract?: boolean;
  
  language?: string; 
  studyGoal?: string; 
  
  startDate?: string; // Date became Active
  endDate?: string; // Date became Inactive (from Active)
  dropOffDate?: string; // Date became Dropped (from Presale)
  leaveReason?: string;
  
  balance: number;
  monthlyFee: number;
  discountPercent?: number;
  discountReason?: string; // Rename logic handled in UI, keeping key for compatibility
  discountDuration?: number; // Number of months the discount is valid
  presaleStatus?: string; 
  note?: string;
  isColorBlind?: boolean; 
  
  // Debt Promise Fields
  debtPromise?: string;
  debtPromiseDeadline?: string;
  
  lastAttendance?: string;
  consecutiveAbsences: number;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  
  [key: string]: any; // Allow dynamic fields
}

export interface Group {
  id: number;
  name: string;
  subject: string;
  teacher: string;
  schedule: string; // Legacy string description
  scheduleDays?: string[]; // e.g. ["Пн", "Ср"]
  scheduleTime?: string; // e.g. "14:00"
  room?: string; // e.g. "101"
  studentsCount: number;
  maxStudents: number;
  branch?: Branch; // Group belongs to a branch
}

export interface Transaction {
  id: number;
  studentId: number;
  studentName: string;
  amount: number;
  date: string;
  type: 'Payment' | 'Refund';
  purpose: string;
  paymentMethod?: 'Наличные' | 'Алиф' | 'DC' | 'Карта' | 'Перевод';
  createdBy?: string;
}

export interface Lesson {
  id: number;
  groupId: number;
  groupName: string;
  date: string;
  topic: string;
  completed: boolean;
}

// Renamed and Expanded from Teacher
export interface Employee {
  id: number;
  fullName: string;
  role: UserRole | string;
  phone: string;
  email: string;
  birthYear?: string; // New: Birth Year
  
  status?: 'Active' | 'Fired'; // New: Status
  firingDate?: string; // New
  firingReason?: string; // New
  mustChangePassword?: boolean; // New

  companyId: string; // Tenant ID to isolate users

  branches?: Branch[]; // Changed from single 'branch' to array
  branch?: Branch; 
  
  // Dynamic fields based on role
  subjects?: string[]; // New: Multiple subjects
  subject?: string; // Deprecated but kept for compatibility
  permissions?: string[]; // For Admins/Managers
  
  salary?: number;
  login?: string;
  password?: string;
  hireDate?: string;
}

// Alias for compatibility if needed
export type Teacher = Employee;

export interface Violation {
  id: number;
  studentId: number;
  studentName: string;
  date: string;
  type: 'Опоздание' | 'Поведение' | 'Успеваемость' | 'ДЗ'; // 'ДЗ' kept for backward compat
  comment: string;
  subject?: string; // Optional: Subject context
  reporter?: string; // Optional: Who reported it
}

export interface CallHistoryItem {
  date: string;
  result: string;
  timestamp: string;
}

export interface CallTask {
  id: number;
  studentId: number;
  studentName: string;
  studentPhone?: string; // New
  parentName?: string; // New
  parentPhone: string;
  reason: string;
  status: 'Ожидает' | 'Выполнено';
  date: string;
  result?: string; // Latest result
  history?: CallHistoryItem[]; // History of attempts
}

export interface ExamResult {
  id: number;
  studentId: number;
  studentName: string;
  subject: string;
  date: string;
  score: number;
  maxScore: number;
  feedback?: string;
}

// --- New Interfaces for Call Journals ---

export interface RetentionLog {
  id: number;
  date: string;
  studentName: string;
  parentName?: string;
  phone: string;
  method: string;
  topic: string;
  courses?: string;
  branch: string;
  admin: string;
  result: string;
  comment?: string;
}

export interface AttractionLog {
  id: number;
  date: string;
  fullName: string;
  phone: string;
  channel: string;
  source: string;
  request: string;
  branch: string;
  admin: string;
  result: 'Записался' | 'Подумает' | 'Отказ' | 'Недозвон';
  refusalReason?: string;
  comment?: string;
}
