
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { storage, StorageKeys } from '../services/storage';
import { supabase } from '../services/supabase';
import { Employee, UserRole, UserProfile } from '../types';
import { Logo } from '../components/Logo';
import { Lock, ShieldCheck, KeyRound, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export const UpdatePassword: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [employee, setEmployee] = useState<Employee | null>(null);
    
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Пытаемся найти сессию или токен
        const params = new URLSearchParams(location.search || window.location.hash.split('?')[1]);
        const token = params.get('token');

        if (token) {
            const employees = storage.get<Employee[]>(StorageKeys.EMPLOYEES, []);
            const found = employees.find(e => e.inviteToken === token);
            if (found) {
                setEmployee(found);
            } else {
                setError('Ссылка приглашения недействительна');
            }
        } else {
            // Если нет токена, проверяем, есть ли залогиненный юзер (Supabase Auth Flow)
            const checkSession = async () => {
                const { data } = await supabase.auth.getSession();
                if (!data.session) {
                    // Если и сессии нет, просим войти
                    // navigate('/login');
                }
            };
            checkSession();
        }
    }, [location]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (password.length < 6) {
            setError('Пароль должен содержать минимум 6 символов');
            return;
        }
        if (password !== confirmPassword) {
            setError('Пароли не совпадают');
            return;
        }

        setLoading(true);
        try {
            // 1. Обновляем пароль в Supabase Auth (если используется)
            const { error: authError } = await supabase.auth.updateUser({ password });
            
            if (authError) throw authError;

            // 2. Обновляем локальную базу сотрудников (для совместимости с текущей логикой)
            if (employee) {
                const allEmployees = storage.get<Employee[]>(StorageKeys.EMPLOYEES, []);
                const updated = allEmployees.map(emp => {
                    if (emp.id === employee.id) {
                        return { ...emp, password, mustChangePassword: false, inviteToken: undefined };
                    }
                    return emp;
                });
                storage.set(StorageKeys.EMPLOYEES, updated);

                // Автоматический вход
                const profile: UserProfile = {
                    fullName: employee.fullName,
                    role: employee.role as UserRole,
                    email: employee.email,
                    permissions: employee.permissions || [],
                    companyId: employee.companyId,
                    avatar: `https://ui-avatars.com/api/?name=${employee.fullName.replace(' ', '+')}&background=random`
                };
                storage.set(StorageKeys.USER_PROFILE, profile);
            }

            storage.notify('Пароль успешно установлен!', 'success');
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Произошла ошибка при обновлении пароля');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 antialiased">
            <div className="mb-10 text-center flex flex-col items-center">
                <Logo className="h-16 w-auto mb-4" />
                <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Добро пожаловать в команду!</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Активируйте ваш аккаунт, установив личный пароль</p>
            </div>

            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 p-10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
                
                {employee && (
                    <div className="mb-8 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-blue-600 font-bold shadow-sm border border-blue-50 dark:border-slate-700">
                            {employee.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight truncate">{employee.fullName}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{employee.role}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleUpdate} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Новый пароль</label>
                        <div className="relative group">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input 
                                type="password" 
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none text-slate-800 dark:text-white font-bold transition-all shadow-inner"
                                placeholder="••••••••"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Подтвердите пароль</label>
                        <div className="relative group">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input 
                                type="password" 
                                required
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none text-slate-800 dark:text-white font-bold transition-all shadow-inner"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-2xl border border-rose-100 dark:border-rose-900/30 animate-in shake duration-300">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>Сохранить и войти <ArrowRight size={18} /></>
                        )}
                    </button>
                </form>
            </div>

            <div className="mt-12 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">© 2024 Repetitor.tj — CRM & LMS</p>
            </div>
        </div>
    );
};
