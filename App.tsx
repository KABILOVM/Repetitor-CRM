import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { Employees } from './pages/Employees';
import { Groups } from './pages/Groups';
import { Schedule } from './pages/Schedule';
import { Attendance } from './pages/Attendance';
import { Calls } from './pages/Calls';
import { Violations } from './pages/Violations';
import { Finance } from './pages/Finance';
import { CRM } from './pages/CRM';
import { Analytics } from './pages/Analytics';
import { ImportData } from './pages/ImportData';
import { Exams } from './pages/Exams';
import { Courses } from './pages/Courses';
import { Profile } from './pages/Profile';
import { Developer } from './pages/Developer';
import { Login } from './pages/Login';
import { storage, StorageKeys } from './services/storage';
import { UserRole, UserProfile } from './types';
import { supabase } from './services/supabase';

// Protected Route Wrapper
const ProtectedRoute = ({ children, roleRequired }: { children?: React.ReactNode, roleRequired?: UserRole }) => {
  const user = storage.get(StorageKeys.USER_PROFILE, null);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (roleRequired && user.role !== roleRequired) {
      return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);
  
  // Initialize Cloud Sync & Handle OAuth Redirect
  useEffect(() => {
    storage.initCloud();

    // Check for OAuth redirect fragment (e.g. #access_token=...)
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
        setIsAuthProcessing(true);
        
        // Give Supabase a moment to parse the hash from the URL
        supabase.auth.getSession().then(({ data, error }) => {
            if (!error && data.session) {
                // Successful OAuth login
                const currentProfile = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { 
                    fullName: 'User', role: UserRole.Admin, email: '', permissions: [] 
                });
                
                // Update local profile to mark as connected
                const updatedProfile = { 
                    ...currentProfile, 
                    googleDriveConnected: true
                };
                storage.set(StorageKeys.USER_PROFILE, updatedProfile);

                // Redirect to profile page to show success and clean URL
                window.location.hash = '#/profile';
            } else {
                // Failed or invalid token, clean URL and go to root
                console.error('Auth Error:', error);
                window.location.hash = '#/';
            }
            setIsAuthProcessing(false);
        });
    }
  }, []);

  if (isAuthProcessing) {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Завершение авторизации...</p>
              </div>
          </div>
      );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
        <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
        <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
        <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
        <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
        <Route path="/calls" element={<ProtectedRoute><Calls /></ProtectedRoute>} />
        <Route path="/violations" element={<ProtectedRoute><Violations /></ProtectedRoute>} />
        <Route path="/exams" element={<ProtectedRoute><Exams /></ProtectedRoute>} />
        <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
        <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/import" element={<ProtectedRoute><ImportData /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        
        {/* Developer Route */}
        <Route path="/developer" element={<ProtectedRoute roleRequired={UserRole.Developer}><Developer /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;