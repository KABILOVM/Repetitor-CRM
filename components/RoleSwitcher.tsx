
import React from 'react';
import { storage, StorageKeys } from '../services/storage';
import { UserRole, UserProfile, Branch } from '../types';
import { ShieldAlert, RefreshCw, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DUMMY_PROFILES: Partial<Record<UserRole, UserProfile>> = {
    [UserRole.GeneralDirector]: {
        fullName: 'Генеральный Директор',
        role: UserRole.GeneralDirector,
        email: 'ceo@repetitor.tj',
        permissions: ['All'],
        branch: undefined, 
        avatar: 'https://ui-avatars.com/api/?name=Gen+Dir&background=ef4444&color=fff'
    },
    [UserRole.Director]: {
        fullName: 'Директор по Развитию',
        role: UserRole.Director,
        email: 'director@repetitor.tj',
        permissions: ['All'],
        branch: undefined,
        avatar: 'https://ui-avatars.com/api/?name=Director&background=f97316&color=fff'
    },
    [UserRole.Admin]: {
        fullName: 'Администратор',
        role: UserRole.Admin,
        email: 'admin@repetitor.tj',
        permissions: ['CRM', 'Students', 'Schedule', 'Finance'],
        branch: undefined, 
        avatar: 'https://ui-avatars.com/api/?name=Admin&background=8b5cf6&color=fff'
    },
    [UserRole.Teacher]: {
        fullName: 'Преподаватель',
        role: UserRole.Teacher,
        email: 'teacher@school.tj',
        permissions: ['Students', 'Schedule', 'Journal'],
        branch: undefined,
        subject: 'Математика',
        avatar: 'https://ui-avatars.com/api/?name=Elena+V&background=3b82f6&color=fff'
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

  if (user.originalRole !== UserRole.Developer) {
    return null;
  }

  const handleSwitch = (newRole: UserRole) => {
    const dummyProfile = DUMMY_PROFILES[newRole];
    
    const updatedUser: UserProfile = {
      ...dummyProfile!,
      role: newRole,
      originalRole: UserRole.Developer,
      fullName: dummyProfile?.fullName || `Test ${newRole}`,
      email: dummyProfile?.email || `test.${newRole.toLowerCase()}@demo.com`,
      permissions: dummyProfile?.permissions || [],
      companyId: user.companyId
    };

    storage.set(StorageKeys.USER_PROFILE, updatedUser);
    window.location.hash = '#/';
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
        <option value="" disabled>-- Роль --</option>
        {(Object.values(UserRole) as UserRole[]).filter(r => r !== UserRole.Developer).map((role) => (
          <option key={role} value={role}>{role}</option>
        ))}
      </select>
      
      {user.role !== UserRole.Developer && (
          <button 
            onClick={returnToDev}
            className="ml-2 flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded transition-colors"
          >
            <LogOut size={12} />
            Выйти
          </button>
      )}

      <button 
        onClick={() => window.location.reload()}
        className="ml-2 p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
      >
        <RefreshCw size={12} />
      </button>
    </div>
  );
};
