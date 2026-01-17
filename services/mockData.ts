
import { Student, Group, Transaction, Lesson, Employee, Violation, CallTask, Course, UserRole, Branch } from '../types';
import { storage, StorageKeys } from './storage';

// Initialize with empty arrays to satisfy "remove fake data" requirement.
// Data will only populate if imported via SQL.

export const mockStudents: Student[] = storage.get<Student[]>(StorageKeys.STUDENTS, []);

export const mockGroups: Group[] = storage.get<Group[]>(StorageKeys.GROUPS, []);

export const mockTransactions: Transaction[] = storage.get<Transaction[]>(StorageKeys.TRANSACTIONS, []);

export const mockLessons: Lesson[] = storage.get<Lesson[]>(StorageKeys.LESSONS, []);

// --- PREDEFINED ACCOUNTS FOR TESTING ---
const initialEmployees: Employee[] = [
  {
    id: 1,
    fullName: 'Генеральный Директор',
    role: UserRole.GeneralDirector,
    login: 'admin',
    password: '123',
    email: 'ceo@repetitor.tj',
    phone: '992000000001',
    permissions: ['All'],
    salary: 5000,
    hireDate: '2023-01-01',
    branches: [],
    companyId: 'repetitor_tj'
  },
  {
    id: 2,
    fullName: 'Администратор Филиала',
    role: UserRole.Admin,
    login: 'branch',
    password: '123',
    email: 'admin.vatan@repetitor.tj',
    phone: '992000000002',
    branches: [Branch.Dushanbe_Vatan],
    permissions: ['CRM', 'Students', 'Schedule', 'Finance'],
    salary: 3000,
    hireDate: '2023-02-01',
    companyId: 'repetitor_tj'
  },
  {
    id: 3,
    fullName: 'Главный Бухгалтер',
    role: UserRole.Financier,
    login: 'fin',
    password: '123',
    email: 'finance@repetitor.tj',
    phone: '992000000003',
    permissions: ['Finance', 'Analytics', 'Students'],
    salary: 4000,
    hireDate: '2023-03-01',
    branches: [],
    companyId: 'repetitor_tj'
  },
  {
    id: 4,
    fullName: 'Васильева Елена',
    role: UserRole.Teacher,
    login: 'teacher',
    password: '123',
    email: 'elena@school.tj',
    phone: '992000000004',
    branches: [Branch.Dushanbe_Vatan],
    subject: 'Математика',
    subjects: ['Математика'],
    salary: 2500,
    hireDate: '2023-04-01',
    companyId: 'repetitor_tj'
  },
  {
    id: 5,
    fullName: 'Директор по развитию',
    role: UserRole.Director,
    login: 'director',
    password: '123',
    email: 'director@repetitor.tj',
    phone: '992000000005',
    branches: [],
    permissions: ['All'],
    salary: 4500,
    hireDate: '2023-01-15',
    companyId: 'repetitor_tj'
  }
];

// Initialize Employees with predefined accounts if empty
if (!localStorage.getItem(StorageKeys.EMPLOYEES)) {
  storage.set(StorageKeys.EMPLOYEES, initialEmployees);
}
export const mockEmployees: Employee[] = storage.get<Employee[]>(StorageKeys.EMPLOYEES, initialEmployees);

export const mockViolations: Violation[] = storage.get<Violation[]>(StorageKeys.VIOLATIONS, []);

export const mockCalls: CallTask[] = storage.get<CallTask[]>(StorageKeys.CALLS, []);

// Initial courses setup based on user request: Химия, биология, Физика, таджикский язык, математика, история, право, английский язык
// REFACTORED for new BranchConfig structure
const initialCourses: Course[] = [
  { 
      id: 1, name: 'Химия', books: [], 
      icon: 'FlaskConical', color: 'purple', duration: '6 месяцев', includedItems: ['Учебник', 'Лабораторные'],
      branchConfig: {
          [Branch.Dushanbe_Vatan]: { price: 500, targetStudents: 50, isActive: true },
          [Branch.Khujand_Coop]: { price: 400, targetStudents: 30, isActive: true }
      } 
  },
  { 
      id: 2, name: 'Биология', books: [], 
      icon: 'Dna', color: 'emerald', duration: '6 месяцев', includedItems: ['Атлас анатомии'],
      branchConfig: {
          [Branch.Dushanbe_Vatan]: { price: 500, targetStudents: 50, isActive: true },
          [Branch.Khujand_Coop]: { price: 400, targetStudents: 30, isActive: true }
      }
  },
  { 
      id: 3, name: 'Физика', books: [], 
      icon: 'Atom', color: 'indigo', duration: '9 месяцев',
      branchConfig: {
          [Branch.Dushanbe_Vatan]: { price: 300, targetStudents: 50, isActive: true },
          [Branch.Isfara]: { price: 250, targetStudents: 20, isActive: true }
      }
  },
  { 
      id: 4, name: 'Таджикский язык', books: [], 
      icon: 'Languages', color: 'cyan', duration: '3 месяца',
      branchConfig: {
          [Branch.Dushanbe_Vatan]: { price: 250, targetStudents: 50, isActive: true }
      }
  },
  { 
      id: 5, name: 'Математика', books: [], 
      icon: 'Calculator', color: 'blue', duration: '12 месяцев', includedItems: ['Сборник задач'],
      branchConfig: {
          [Branch.Dushanbe_Vatan]: { price: 350, targetStudents: 100, isActive: true },
          [Branch.Dushanbe_82]: { price: 300, targetStudents: 80, isActive: true },
          [Branch.Khujand_Coop]: { price: 300, targetStudents: 50, isActive: true }
      }
  },
  { 
      id: 6, name: 'История', books: [], 
      icon: 'Scroll', color: 'amber', duration: '5 месяцев',
      branchConfig: {
          [Branch.Dushanbe_Vatan]: { price: 400, targetStudents: 40, isActive: true }
      }
  },
  { 
      id: 7, name: 'Право', books: [], 
      icon: 'Gavel', color: 'rose', duration: '4 месяца',
      branchConfig: {
          [Branch.Dushanbe_Vatan]: { price: 400, targetStudents: 40, isActive: true }
      }
  },
  { 
      id: 8, name: 'Английский язык', books: [], 
      icon: 'Globe', color: 'sky', duration: 'Level-based', includedItems: ['Oxford Book', 'Certificate'],
      branchConfig: {
          [Branch.Dushanbe_Vatan]: { price: 350, targetStudents: 100, isActive: true },
          [Branch.Khujand_19]: { price: 300, targetStudents: 60, isActive: true }
      }
  }
];

// Load or set default
if (!localStorage.getItem(StorageKeys.COURSES)) {
  storage.set(StorageKeys.COURSES, initialCourses);
}
export const mockCourses: Course[] = storage.get<Course[]>(StorageKeys.COURSES, initialCourses);
