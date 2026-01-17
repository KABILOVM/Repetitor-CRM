
import React, { useEffect } from 'react';
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
import { UserRole } from './types';

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
  
  // Initialize Cloud Sync
  useEffect(() => {
    storage.initCloud();
  }, []);

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
