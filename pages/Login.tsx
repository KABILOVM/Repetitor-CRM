
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { storage, StorageKeys } from '../services/storage';
import { Lock, User, ArrowRight, AlertCircle, Info, KeyRound, Building2 } from 'lucide-react';
import { Employee, UserRole, UserProfile, Branch } from '../types';
import { Logo } from '../components/Logo';

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
  }
];

export const Login: React.FC = () => {
  const [companyId, setCompanyId] = useState('repetitor_tj');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingUser, setPendingUser] = useState<Employee | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Проверка токена приглашения при загрузке
  useEffect(() => {
    const params = new URLSearchParams(location.search || window.location.hash.split('?')[1]);
    const token = params.get('token');

    if (token) {
        const employees = storage.get<Employee[]>(StorageKeys.EMPLOYEES, []);
        const foundByToken = employees.find(e => e.inviteToken === token);
        
        if (foundByToken) {
            setPendingUser(foundByToken);
            setCompanyId(foundByToken.companyId);
            setShowChangePassword(true);
            storage.notify(`Добро пожаловать, ${foundByToken.fullName}! Пожалуйста, установите пароль.`, 'info');
        } else {
            setError('Ссылка приглашения недействительна или уже использована');
        }
    }
  }, [location]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username === 'dev' && password === 'dev') {
        const devProfile: UserProfile = {
            fullName: 'Системный Разработчик',
            role: UserRole.Developer,
            originalRole: UserRole.Developer,
            email: 'dev@repetitor.tj',
            permissions: ['All'],
            companyId: companyId,
            avatar: 'https://ui-avatars.com/api/?name=Dev+Mode&background=0D8ABC&color=fff'
        };
        storage.set(StorageKeys.USER_PROFILE, devProfile);
        navigate('/developer');
        return;
    }

    let employees = storage.get<Employee[]>(StorageKeys.EMPLOYEES, []);

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

    const foundUser = employees.find(emp => 
        (emp.login === username || emp.email === username) && 
        emp.password === password && 
        (emp.companyId === companyId)
    );

    if (foundUser) {
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
          const allEmployees = storage.get<Employee[]>(StorageKeys.EMPLOYEES, []);
          const updatedEmployees = allEmployees.map(emp => {
              if (emp.id === pendingUser.id) {
                  // При установке пароля также аннулируем inviteToken
                  return { ...emp, password: newPassword, mustChangePassword: false, inviteToken: undefined };
              }
              return emp;
          });
          storage.set(StorageKeys.EMPLOYEES, updatedEmployees);
          proceedToDashboard({ ...pendingUser, password: newPassword, mustChangePassword: false });
      }
  };

  const proceedToDashboard = (user: Employee) => {
        let userBranch = user.branch;
        if (user.branches && user.branches.length > 0) {
            userBranch = user.branches[0];
        }

        const userProfile: UserProfile = {
            fullName: user.fullName,
            role: user.role as UserRole,
            email: user.email,
            permissions: user.permissions || [],
            branch: userBranch as Branch,
            subject: user.subject, 
            subjects: user.subjects,
            companyId: user.companyId,
            avatar: `https://ui-avatars.com/api/?name=${user.fullName.replace(' ', '+')}&background=random`
        };
        storage.set(StorageKeys.USER_PROFILE, userProfile);
        navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 antialiased">
      <style>{`
        .bg-blue-600 { background-color: #28A9E7 !important; }
        .hover\\:bg-blue-700:hover { background-color: #1d92c9 !important; }
        .focus\\:ring-blue-500:focus { --tw-ring-color: #28A9E7 !important; }
        .focus\\:border-blue-500:focus { border-color: #28A9E7 !important; }
        .shadow-blue-600\\/30 { box-shadow: 0 10px 15px -3px rgba(40, 169, 231, 0.3) !important; }
        .text-blue-600 { color: #28A9E7 !important; }
      `}</style>

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
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">ID Компании</label>
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
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Придумайте пароль</h2>
                <p className="text-sm text-slate-500 mb-6">Для безопасности вашего аккаунта установите новый пароль.</p>
                
                {pendingUser && (
                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-blue-600 font-bold">
                            {pendingUser.fullName.charAt(0)}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight">{pendingUser.fullName}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">{pendingUser.email}</p>
                        </div>
                    </div>
                )}

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
        <p className="text-xs text-slate-400">© 2024 Repetitor.tj — CRM & LMS</p>
      </div>
    </div>
  );
};
