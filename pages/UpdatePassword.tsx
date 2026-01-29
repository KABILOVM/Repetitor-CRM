
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
    
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Проверяем сессию при загрузке страницы
        // Когда пользователь кликает по ссылке в письме, Supabase создает временную сессию
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // Если сессии нет, возможно токен в URL (recovery или invite)
                console.log("No active session found on update-password page");
            }
        };
        checkSession();
    }, []);

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
            // Обновление пароля в Supabase Auth для ТЕКУЩЕЙ сессии
            const { data, error: authError } = await supabase.auth.updateUser({ password });
            
            if (authError) throw authError;

            // После успешной смены пароля, получаем данные профиля из metadata
            const userData = data.user;
            if (userData) {
                const profile: UserProfile = {
                    fullName: userData.user_metadata?.full_name || 'Сотрудник',
                    role: (userData.user_metadata?.role as UserRole) || UserRole.Teacher,
                    email: userData.email || '',
                    permissions: [],
                    companyId: 'repetitor_tj', // По умолчанию
                    avatar: `https://ui-avatars.com/api/?name=${(userData.user_metadata?.full_name || 'User').replace(' ', '+')}&background=random`
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
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 antialiased">
            <div className="mb-10 text-center flex flex-col items-center animate-in fade-in duration-700">
                <Logo className="h-16 w-auto mb-4" />
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Установка пароля</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Придумайте надежный пароль для доступа к системе</p>
            </div>

            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 relative overflow-hidden transition-all duration-300 hover:shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
                
                <form onSubmit={handleUpdate} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Новый пароль</label>
                        <div className="relative group">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input 
                                type="password" 
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-xl outline-none text-slate-800 dark:text-white font-medium transition-all shadow-sm"
                                placeholder="Минимум 6 символов"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Повторите пароль</label>
                        <div className="relative group">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input 
                                type="password" 
                                required
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-xl outline-none text-slate-800 dark:text-white font-medium transition-all shadow-sm"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl border border-red-100 dark:border-red-900/30 animate-in shake duration-300">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-sm disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>Активировать аккаунт <ArrowRight size={18} /></>
                        )}
                    </button>
                </form>
            </div>

            <div className="mt-12 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">© 2024 Repetitor.tj — CRM & LMS System</p>
            </div>
        </div>
    );
};
