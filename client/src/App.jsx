import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

// Pages
import ScannerKiosk from './pages/ScannerKiosk';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AttendanceLogs from './pages/admin/AttendanceLogs';
import StudentsManager from './pages/admin/StudentsManager';
import ReportsPrinting from './pages/admin/ReportsPrinting';
import ExportCenter from './pages/admin/ExportCenter';
import BackupRestore from './pages/admin/BackupRestore';
import SettingsPage from './pages/admin/SettingsPage';

// Protected Route Guard for Admin Portal
function ProtectedAdminRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-brand-400 text-sm">
        Verifying administrator session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <div className="flex-1">
        <Routes>
          {/* Dedicated Hardware Scanner Kiosk */}
          <Route path="/" element={<ScannerKiosk />} />
          <Route path="/scanner" element={<ScannerKiosk />} />

          {/* Admin Authentication */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected Admin Portal */}
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <Navigate to="/admin/dashboard" replace />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/attendance"
            element={
              <ProtectedAdminRoute>
                <AttendanceLogs />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <ProtectedAdminRoute>
                <StudentsManager />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/printing"
            element={
              <ProtectedAdminRoute>
                <ReportsPrinting />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/exports"
            element={
              <ProtectedAdminRoute>
                <ExportCenter />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/backup"
            element={
              <ProtectedAdminRoute>
                <BackupRestore />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedAdminRoute>
                <SettingsPage />
              </ProtectedAdminRoute>
            }
          />

          {/* Catch-all redirect to scanner */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}
