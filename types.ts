
export interface ExamResult {
  id: number;
  studentId: number;
  studentName: string;
  subject: string;
  date: string;
  score: number;
  maxScore: number;
  feedback?: string;
  isExtra?: boolean; // Флаг: предмет не входит в основную программу ученика
}

export enum UserRole {
  GeneralDirector = 'Генеральный Директор',
  Director = 'Директор',
  Admin = 'Администратор',
  Financier = 'Финансист',
  Teacher = 'Преподаватель',
  Student = 'Ученик',
  Developer = 'Разработчик'
}

export enum Branch {
  Dushanbe_Vatan = 'Душанбе (Ватан)',
  Dushanbe_Rudaki = 'Душанбе (Рудаки)',
  Khujand = 'Худжанд',
  Kulob = 'Кулоб',
  Bokhtar = 'Бохтар'
}

export enum Cluster {
  Cluster1 = 'Кластер 1',
  Cluster2 = 'Кластер 2',
  Cluster3 = 'Кластер 3',
  Cluster4 = 'Кластер 4',
  Cluster5 = 'Кластер 5'
}

export enum StudentStatus {
  Active = 'Активен',
  Archived = 'Неактивен',
  Paused = 'Пауза',
  Dropped = 'Отвал',
  Presale = 'Предзапись'
}

export enum PipelineStage {
  New = 'Новая запись',
  Call = 'Тестирование',
  Trial = 'Пробный урок',
  Contract = 'Договор',
  Payment = 'Оплата'
}

export interface ParentInfo {
  name: string;
  role: string;
  phone: string;
  email?: string;
}

export interface StudentBook {
  bookId: string;
  name: string;
  price: number;
  isPaid: boolean;
  isIssued: boolean;
  issuedDate?: string;
}

export interface Student {
  id: number;
  fullName: string;
  phone: string;
  status: StudentStatus | string;
  pipelineStage?: PipelineStage;
  balance: number;
  monthlyFee: number;
  discountPercent?: number;
  discountReason?: string;
  discountDuration?: number;
  consecutiveAbsences: number;
  source: string;
  studyLanguage?: string;
  subjects?: string[];
  assignedBooks?: StudentBook[];
  groupIds?: number[];
  cluster?: string;
  branch?: Branch | string;
  startDate?: string;
  endDate?: string;
  presaleDate?: string;
  dropOffDate?: string;
  leaveReason?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  parents?: ParentInfo[];
  school?: string;
  grade?: string;
  birthYear?: string;
  note?: string;
  platformAccount?: string;
  isColorBlind?: boolean;
  debtPromise?: string;
  debtPromiseDeadline?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  [key: string]: any;
}

export interface UserProfile {
  fullName: string;
  role: UserRole;
  originalRole?: UserRole;
  email: string;
  permissions: string[];
  branch?: Branch;
  avatar?: string;
  themeColor?: string;
  organization_id?: string;
  companyId?: string;
  subject?: string;
  subjects?: string[];
}

export interface SidebarItem {
  id: string;
  path: string;
  label: string;
  icon: string;
  roles: UserRole[];
  visible: boolean;
  parentId?: string;
  isGroup?: boolean;
  isCustom?: boolean;
}

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
  surveys: boolean;
  import: boolean;
  journal: boolean;
  tasks: boolean;
  branches: boolean;
  classes: boolean;
}

export interface Company {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  modules: ModuleConfig;
  dictionaries: {
    sources: string[];
    grades: string[];
    studyGoals: string[];
    leaveReasons: string[];
    expenseCategories: string[];
  };
  sidebarConfig?: SidebarItem[];
  /* Fix: Updated rolePermissions to allow any value to support granular permission objects in addition to legacy string arrays */
  rolePermissions?: Record<string, any>;
}

export interface AuditLog {
  id: number;
  organization_id?: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  entityId?: number | string;
}

export interface Transaction {
  id: number;
  studentId: number;
  studentName: string;
  amount: number;
  date: string;
  type: 'Payment' | 'Refund';
  purpose: string;
  paymentMethod?: string;
  createdBy: string;
}

export interface CourseBook {
  id: string;
  name: string;
  price: number;
}

export interface CourseTopic {
  id: string;
  title: string;
}

export interface BranchConfig {
  isActive: boolean;
  price: number;
}

export interface CourseThematic {
  id: string;
  name: string;
  topicIds: string[];
  branchPrices: Record<number | string, number>;
}

export interface Course {
  id: number;
  name: string;
  description?: string;
  price: number;
  maxExamScore?: number;
  targetStudents?: number;
  color?: string;
  icon?: string;
  books: CourseBook[];
  topics?: CourseTopic[];
  thematics?: CourseThematic[];
  branchConfig?: Record<string, BranchConfig>;
  branchPrices?: Record<string, number>;
  includedItems?: string[];
  scheduleDays?: string[];
}

export interface ScheduleSlot {
  id: string;
  day: string;
  time: string;
  endTime: string;
  room?: string;
}

export interface Group {
  id: number;
  name: string;
  subject: string;
  teacher: string;
  schedule: string;
  scheduleDays?: string[];
  scheduleTime?: string;
  studentsCount: number;
  maxStudents: number;
  branch?: Branch | string;
  room?: string;
  courseProgramId?: string;
  scheduleSlots?: ScheduleSlot[];
}

export interface Violation {
  id: number;
  studentId: number;
  studentName: string;
  type: 'Опоздание' | 'Поведение' | 'Успеваемость' | 'ДЗ';
  date: string;
  comment: string;
  reporter: string;
  subject?: string;
}

export interface Employee {
  id: number;
  fullName: string;
  role: UserRole | string;
  login: string;
  password?: string;
  email: string;
  phone: string;
  permissions?: string[];
  branches?: Branch[];
  branch?: Branch; // Deprecated but still used in some places
  status?: 'Active' | 'Fired';
  subjects?: string[];
  subject?: string; // Primary subject
  companyId: string;
  avatar?: string;
  birthYear?: string;
  hireDate?: string;
  firingDate?: string;
  firingReason?: string;
  mustChangePassword?: boolean;
}

export interface CourseProgram {
  id: string;
  name: string;
  description?: string;
  subjectIds: number[];
  subjectThematicIds?: Record<string, string>;
  icon?: string;
  color?: string;
  duration?: string;
  branchConfig?: Record<string, any>;
}

export interface Invoice {
  id: number;
  studentId: number;
  studentName: string;
  amount: number;
  month: string;
  status: 'Оплачен' | 'Ожидает';
}

export interface AttractionLog {
  id: number;
  fullName: string;
  phone: string;
  date: string;
  channel: string;
  source: string;
  request: string;
  result: 'Записался' | 'Подумает' | 'Отказ' | 'Недозвон';
  admin: string;
  branch: string;
  comment?: string;
}

export interface RetentionLog {
  id: number;
  studentName: string;
  phone: string;
  parentName?: string;
  date: string;
  method: string;
  topic: string;
  result: string;
  admin: string;
  branch: string;
  courses?: string;
  comment?: string;
}

export interface LearningSection {
  id: string;
  subjectId: string;
  title: string;
  order: number;
}

export interface LearningTopic {
  id: string;
  sectionId: string;
  title: string;
  order: number;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export interface LearningLesson {
  id: string;
  topicId: string;
  title: string;
  order: number;
  contentText?: string;
  videoUrl?: string;
  slidesUrl?: string;
  quiz?: QuizQuestion[];
}

export interface StudentProgress {
  studentId: number;
  lessonId: string;
  isCompleted: boolean;
  quizScore?: number;
  lastAttemptAt: string;
}

export enum SurveyQuestionType {
  SingleChoice = 'SingleChoice',
  MultipleChoice = 'MultipleChoice',
  Text = 'Text',
  Rating = 'Rating'
}

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  text: string;
  options?: string[];
  required: boolean;
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
  targetRoles: UserRole[];
  questions: SurveyQuestion[];
}

export interface SurveyAnswer {
  questionId: string;
  value: any;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  submittedAt: string;
  answers: SurveyAnswer[];
}

export enum TaskStatus {
  Todo = 'НУЖНО СДЕЛАТЬ',
  InProgress = 'В РАБОТЕ',
  Done = 'ГОТОВО'
}

export enum TaskPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Urgent = 'Urgent'
}

export type TaskType = 'Run' | 'Change';

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: TaskPriority;
  type: TaskType;
  assigneeIds: number[];
  subtasks: SubTask[];
  teamId?: string;
  sprintId?: string;
  createdAt: string;
  dueDate?: string;
  tags: string[];
}

export interface Team {
  id: string;
  name: string;
  memberIds: number[];
}

export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'planned';
}

export interface Classroom {
  id: string;
  name: string;
  capacity: number;
}

export interface BranchEntity {
  id: number;
  name: string;
  address: string;
  phone: string;
  manager: string;
  isActive: boolean;
  classrooms: Classroom[];
}

export interface FieldSchema {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  options?: string[];
  required: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
  read: boolean;
  link?: string;
}

export const ALL_PERMISSIONS = ['CRM', 'Students', 'Groups', 'Schedule', 'Finance', 'Employees', 'Courses', 'Branches', 'Exams', 'Violations', 'Calls', 'Surveys', 'Analytics', 'Import', 'Journal', 'Tasks'];

export const DEFAULT_LEAVE_REASONS = ['Окончание курса', 'Переезд', 'Финансовые трудности', 'Неуспеваемость', 'Личные причины', 'Другое'];
