
import React from 'react';
import { storage, StorageKeys } from '../services/storage';
import { UserRole, UserProfile, Branch } from '../types';
import { ShieldAlert, RefreshCw, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Define dummy profiles for each role to simulate real user experience
const DUMMY_PROFILES: Partial<Record<UserRole, UserProfile>> = {
    [UserRole.GeneralDirector]: {
        fullName: 'Генеральный Директор',
        role: UserRole.GeneralDirector,
        email: 'ceo@repetitor.tj',
        permissions: ['All'],
        branch: undefined, // Global access
        avatar: 'https://ui-avatars.com/api/?name=Gen+Dir&background=ef4444&color=fff'
    },
    [UserRole.Director]: {
        fullName: 'Директор по Развитию',
        role: UserRole.Director,
        email: 'director@repetitor.tj',
        permissions: ['All'],
        branch: undefined, // Usually global or broad
        avatar: 'https://ui-avatars.com/api/?name=Director&background=f97316&color=fff'
    },
    [UserRole.Admin]: {
        fullName: 'Администратор Филиала',
        role: UserRole.Admin,
        email: 'admin.vatan@repetitor.tj',
        permissions: ['CRM', 'Students', 'Schedule', 'Finance'],
        branch: Branch.Dushanbe_Vatan, // Restricted to specific branch
        avatar: 'https://ui-avatars.com/api/?name=Admin+Vatan&background=8b5cf6&color=fff'
    },
    [UserRole.Financier]: {
        fullName: 'Главный Бухгалтер',
        role: UserRole.Financier,
        email: 'fin@repetitor.tj',
        permissions: ['Finance', 'Analytics', 'Students'],
        branch: undefined, // Global finance access
        avatar: 'https://ui-avatars.com/api/?name=Financier&background=10b981&color=fff'
    },
    [UserRole.Teacher]: {
        fullName: 'Васильева Елена', // Matches demo data for proper filtering
        role: UserRole.Teacher,
        email: 'elena@school.tj',
        permissions: ['Students', 'Schedule', 'Journal'],
        branch: Branch.Dushanbe_Vatan,
        subject: 'Математика',
        avatar: 'https://ui-avatars.com/api/?name=Elena+V&background=3b82f6&color=fff'
    },
    [UserRole.Student]: {
        fullName: 'Алиев Алишер',
        role: UserRole.Student,
        email: 'student@school.tj',
        permissions: ['Schedule', 'Journal'],
        branch: Branch.Dushanbe_Vatan,
        avatar: 'https://ui-avatars.com/api/?name=Alisher&background=64748b&color=fff'
    }
};

export const RoleSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { 
    fullName: 'Guest', 
    role: UserRole.Admin, 
    email: '', 
    permissions: [] 
  });

  // Only show if the user originally logged in as Developer
  if (user.originalRole !== UserRole.Developer) {
    return null;
  }

  const handleSwitch = (newRole: UserRole) => {
    const dummyProfile = DUMMY_PROFILES[newRole];
    
    // Construct the new profile: Use dummy data, but keep the originalRole flag
    // Also maintain the current Company ID if set
    const updatedUser: UserProfile = {
      ...dummyProfile!, // Force unwrapping as we know keys exist for selectable roles
      role: newRole, // Ensure role is set
      originalRole: UserRole.Developer, // CRITICAL: Persist Developer identity
      fullName: dummyProfile?.fullName || `Test ${newRole}`, // Fallback
      email: dummyProfile?.email || `test.${newRole.toLowerCase()}@demo.com`,
      permissions: dummyProfile?.permissions || [],
      companyId: user.companyId // Keep testing the same company
    };

    storage.set(StorageKeys.USER_PROFILE, updatedUser);
    window.location.href = '#/'; // Hard reload to reset state
    window.location.reload();
  };

  const returnToDev = () => {
      const devProfile: UserProfile = {
          fullName: 'Системный Разработчик',
          role: UserRole.Developer,
          originalRole: UserRole.Developer,
          email: 'dev@repetitor.tj',
          permissions: ['All'],
          avatar: 'https://ui-avatars.com/api/?name=Dev+Mode&background=0D8ABC&color=fff'
      };
      storage.set(StorageKeys.USER_PROFILE, devProfile);
      navigate('/developer');
      window.location.reload();
  };

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900 text-white px-4 py-2 rounded-b-xl shadow-xl border-x border-b border-slate-700 flex items-center gap-3">
      <div className="flex items-center gap-2 text-xs font-bold text-yellow-400">
        <ShieldAlert size={14} />
        DEV MODE
      </div>
      <div className="h-4 w-px bg-slate-700"></div>
      <span className="text-xs text-slate-400">Вид как:</span>
      <select 
        value={user.role === UserRole.Developer ? '' : user.role}
        onChange={(e) => handleSwitch(e.target.value as UserRole)}
        className="bg-slate-800 text-white text-xs border border-slate-600 rounded px-2 py-1 outline-none focus:border-blue-500 max-w-[120px]"
      >
        <option value="" disabled>-- Выберите роль --</option>
        {Object.values(UserRole).filter(r => r !== UserRole.Developer).map((role) => (
          <option key={role} value={role}>{role}</option>
        ))}
      </select>
      
      {user.role !== UserRole.Developer && (
          <button 
            onClick={returnToDev}
            className="ml-2 flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded transition-colors"
            title="Вернуться в панель разработчика"
          >
            <LogOut size={12} />
            Выйти
          </button>
      )}

      <button 
        onClick={() => window.location.reload()}
        className="ml-2 p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
        title="Обновить страницу"
      >
        <RefreshCw size={12} />
      </button>
    </div>
  );
};
