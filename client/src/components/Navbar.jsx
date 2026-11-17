import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  CreditCard, 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  Printer, 
  Download, 
  Database, 
  Settings, 
  LogOut, 
  ExternalLink,
  Shield,
  Radio
} from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isScanner = location.pathname === '/' || location.pathname === '/scanner';

  // Do not show full admin navbar on the dedicated scanner page (scanner has its own sleek kiosk header)
  if (isScanner) {
    return null;
  }

  const navLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/attendance', label: 'Attendance Logs', icon: ClipboardList },
    { to: '/admin/students', label: 'Students', icon: Users },
    { to: '/admin/printing', label: 'Printing Center', icon: Printer },
    { to: '/admin/exports', label: 'Exports', icon: Download },
    { to: '/admin/backup', label: 'Backup & Restore', icon: Database },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="no-print bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                SmartCard <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 font-semibold border border-brand-500/30">ADMIN</span>
              </span>
              <p className="text-xs text-slate-400 hidden sm:block">Hardware Card Attendance Portal</p>
            </div>
          </div>

          {/* Nav Links */}
          {isAuthenticated && (
            <div className="hidden lg:flex items-center space-x-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right Action buttons */}
          <div className="flex items-center space-x-3">
            {/* Launch Kiosk Button */}
            <Link
              to="/"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all shadow-sm"
              title="Switch to dedicated USB hardware card tap kiosk"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Launch Scanner Kiosk</span>
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                <span className="text-xs text-slate-400 hidden md:inline">
                  {user?.username}
                </span>
                <button
                  onClick={() => {
                    logout();
                    navigate('/admin/login');
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/admin/login"
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
              >
                Admin Login
              </Link>
            )}
          </div>

        </div>

        {/* Mobile Nav Links */}
        {isAuthenticated && (
          <div className="lg:hidden flex overflow-x-auto space-x-1 py-2 border-t border-slate-800 scrollbar-none">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs whitespace-nowrap font-medium transition ${
                    isActive
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}

      </div>
    </nav>
  );
}
