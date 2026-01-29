
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { CRM } from './pages/CRM';
import { Students } from './pages/Students';
import { Groups } from './pages/Groups';
import { Schedule } from './pages/Schedule';
import { Finance } from './pages/Finance';
import { Employees } from './pages/Employees';
import { Courses } from './pages/Courses';
import { Analytics } from './pages/Analytics';
import { ImportData } from './pages/ImportData';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { Classes } from './pages/Classes';
import { Exams } from './pages/Exams';
import { Violations } from './pages/Violations';
import { Calls } from './pages/Calls';
import { Surveys } from './pages/Surveys';
import { Branches } from './pages/Branches';
import { Tasks } from './pages/Tasks';
import { storage, StorageKeys } from './services/storage';
import { UserProfile } from './types';

// Add ProtectedRoute component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = storage.get<UserProfile | null>(StorageKeys.USER_PROFILE, null);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/crm" element={<CRM />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/students" element={<Students />} />
                  <Route path="/groups" element={<Groups />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/finance" element={<Finance />} />
                  <Route path="/employees" element={<Employees />} />
                  <Route path="/courses" element={<Courses />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/import" element={<ImportData />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/classes" element={<Classes />} />
                  <Route path="/exams" element={<Exams />} />
                  <Route path="/violations" element={<Violations />} />
                  <Route path="/calls" element={<Calls />} />
                  <Route path="/surveys" element={<Surveys />} />
                  <Route path="/branches" element={<Branches />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
