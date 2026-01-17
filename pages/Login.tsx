
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage, StorageKeys } from '../services/storage';
import { Lock, User, ArrowRight, AlertCircle, Info, KeyRound, Building2 } from 'lucide-react';
import { Employee, UserRole, UserProfile, Branch } from '../types';
import { Logo } from '../components/Logo';

// Hardcoded demo users to guarantee access
const DEMO_USERS: Employee[] = [
  {
    id: 1,
    fullName: 'Генеральный Директор',
    role: UserRole.GeneralDirector,
    login: 'admin',
    password: '123',
    email: 'ceo@repetitor.tj',
    phone: '992000000001',
    permissions: ['All'],
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
    permissions: ['All'],
    branches: [],
    companyId: 'repetitor_tj'
  },
  {
    id: 6,
    fullName: 'Алиев Алишер',
    role: UserRole.Student,
    login: 'student',
    password: '123',
    email: 'student@school.tj',
    phone: '992000000006',
    branches: [Branch.Dushanbe_Vatan],
    companyId: 'repetitor_tj'
  }
];

export const Login: React.FC = () => {
  const [companyId, setCompanyId] = useState('repetitor_tj');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // New Password State
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingUser, setPendingUser] = useState<Employee | null>(null);

  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Check Developer Backdoor (Global)
    if (username === 'dev' && password === 'dev') {
        const devProfile: UserProfile = {
            fullName: 'Системный Разработчик',
            role: UserRole.Developer,
            originalRole: UserRole.Developer,
            email: 'dev@repetitor.tj',
            permissions: ['All'],
            companyId: companyId, // Dev enters as if in this company context
            avatar: 'https://ui-avatars.com/api/?name=Dev+Mode&background=0D8ABC&color=fff'
        };
        storage.set(StorageKeys.USER_PROFILE, devProfile);
        navigate('/developer'); // Direct to developer panel
        return;
    }

    // 2. Fetch Employees
    let employees = storage.get<Employee[]>(StorageKeys.EMPLOYEES, []);

    // 3. AUTO-SEED Default Company users if missing
    let requiresUpdate = false;
    DEMO_USERS.forEach(demoUser => {
        if (!employees.some(e => e.login === demoUser.login && e.companyId === 'repetitor_tj')) {
            employees.push(demoUser);
            requiresUpdate = true;
        }
    });

    if (requiresUpdate) {
        storage.set(StorageKeys.EMPLOYEES, employees);
    }

    // 4. Authenticate
    // Check login, password AND Company ID
    const foundUser = employees.find(emp => 
        (emp.login === username || emp.email === username) && 
        emp.password === password && 
        (emp.companyId === companyId)
    );

    if (foundUser) {
        // Check if password change is required
        if (foundUser.mustChangePassword) {
            setPendingUser(foundUser);
            setShowChangePassword(true);
            return;
        }

        proceedToDashboard(foundUser);
    } else {
        setError('Неверный логин, пароль или ID компании');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
          setError('Пароли не совпадают');
          return;
      }
      if (newPassword.length < 6) {
          setError('Пароль должен быть не менее 6 символов');
          return;
      }
      
      if (pendingUser) {
          // Update user in storage
          const allEmployees = storage.get<Employee[]>(StorageKeys.EMPLOYEES, []);
          const updatedEmployees = allEmployees.map(emp => {
              if (emp.id === pendingUser.id) {
                  return { ...emp, password: newPassword, mustChangePassword: false };
              }
              return emp;
          });
          storage.set(StorageKeys.EMPLOYEES, updatedEmployees);
          
          // Proceed with updated user object
          proceedToDashboard({ ...pendingUser, password: newPassword, mustChangePassword: false });
      }
  };

  const proceedToDashboard = (user: Employee) => {
        // Handle migration from old 'branch' string to 'branches' array if needed
        let userBranch = user.branch;
        if (user.branches && user.branches.length > 0) {
            userBranch = user.branches[0];
        }

        const userProfile: UserProfile = {
            fullName: user.fullName,
            role: user.role as UserRole,
            email: user.email,
            permissions: user.permissions || [],
            branch: userBranch, // Set the primary branch for session context
            subject: user.subject, 
            subjects: user.subjects,
            companyId: user.companyId, // Important: Set the tenant
            avatar: `https://ui-avatars.com/api/?name=${user.fullName.replace(' ', '+')}&background=random`
        };
        storage.set(StorageKeys.USER_PROFILE, userProfile);
        navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center flex flex-col items-center">
        <Logo className="h-20 w-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Система управления образовательным центром</p>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
        {!showChangePassword ? (
            <>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Вход в систему</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">ID Компании (Tenant)</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                value={companyId}
                                onChange={e => setCompanyId(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white transition-all font-mono"
                                placeholder="repetitor_tj"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Логин / Email</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white transition-all"
                                placeholder="Введите логин или email"
                                autoFocus
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Пароль</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="password" 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white transition-all"
                                placeholder="Введите пароль"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl animate-in fade-in slide-in-from-top-1">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
                    >
                        Войти <ArrowRight size={18} />
                    </button>
                </form>
            </>
        ) : (
            <>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Смена пароля</h2>
                <p className="text-sm text-slate-500 mb-6">Для безопасности вашего аккаунта необходимо сменить временный пароль.</p>
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Новый пароль</label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="password" 
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white transition-all"
                                placeholder="Новый пароль"
                                autoFocus
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Подтвердите пароль</label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="password" 
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white transition-all"
                                placeholder="Повторите пароль"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl animate-in fade-in slide-in-from-top-1">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
                    >
                        Сохранить и войти <ArrowRight size={18} />
                    </button>
                </form>
            </>
        )}
      </div>

      <div className="mt-8 text-center max-w-md w-full">
        {!showChangePassword && (
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl text-left border border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                    <Info size={14}/> Демо-доступ (Пароль: 123)
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600 cursor-pointer hover:border-blue-400" onClick={() => { setUsername('admin'); setPassword('123'); }}>
                        <span className="font-bold text-slate-800 dark:text-white">admin</span>
                        <span className="block text-slate-500">Гендиректор</span>
                    </div>
                    <div className="bg-white dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600 cursor-pointer hover:border-blue-400" onClick={() => { setUsername('director'); setPassword('123'); }}>
                        <span className="font-bold text-slate-800 dark:text-white">director</span>
                        <span className="block text-slate-500">Директор</span>
                    </div>
                    <div className="bg-white dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600 cursor-pointer hover:border-blue-400" onClick={() => { setUsername('branch'); setPassword('123'); }}>
                        <span className="font-bold text-slate-800 dark:text-white">branch</span>
                        <span className="block text-slate-500">Админ фил.</span>
                    </div>
                    <div className="bg-white dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600 cursor-pointer hover:border-blue-400" onClick={() => { setUsername('fin'); setPassword('123'); }}>
                        <span className="font-bold text-slate-800 dark:text-white">fin</span>
                        <span className="block text-slate-500">Финансист</span>
                    </div>
                    <div className="bg-white dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600 cursor-pointer hover:border-blue-400" onClick={() => { setUsername('teacher'); setPassword('123'); }}>
                        <span className="font-bold text-slate-800 dark:text-white">teacher</span>
                        <span className="block text-slate-500">Учитель</span>
                    </div>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 italic">ID Компании по умолчанию: repetitor_tj</div>
            </div>
        )}
        <p className="mt-4 text-xs text-slate-400">© 2024 Repetitor CRM</p>
      </div>
    </div>
  );
};
