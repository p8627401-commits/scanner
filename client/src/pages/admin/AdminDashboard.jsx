import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Percent, 
  Printer, 
  Download, 
  Database, 
  PlusCircle, 
  Radio, 
  Calendar, 
  ArrowUpRight, 
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchDashboardStats(selectedDate);
  }, [selectedDate]);

  async function fetchDashboardStats(date) {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/stats/summary?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner & Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Attendance Overview
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time physical card tap statistics and student monitoring
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs">
            <Calendar className="w-4 h-4 text-brand-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            />
          </div>

          <Link
            to="/"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Open Kiosk</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        
        {/* Total Students */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Students</span>
            <Users className="w-4 h-4 text-brand-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-white">{stats?.totalStudents || 0}</span>
            <p className="text-[11px] text-slate-500 mt-1">Enrolled active</p>
          </div>
        </div>

        {/* Present Today */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Present</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-emerald-400">{stats?.checkInsToday || 0}</span>
            <p className="text-[11px] text-slate-500 mt-1">Tapped in today</p>
          </div>
        </div>

        {/* On-Time Today */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">On-Time</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-blue-400">{stats?.onTimeToday || 0}</span>
            <p className="text-[11px] text-slate-500 mt-1">Punctual arrivals</p>
          </div>
        </div>

        {/* Late Today */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Late Arrivals</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-amber-400">{stats?.lateToday || 0}</span>
            <p className="text-[11px] text-slate-500 mt-1">After cutoff time</p>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Turnout Rate</span>
            <Percent className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-purple-400">{stats?.attendanceRate || 0}%</span>
            <p className="text-[11px] text-slate-500 mt-1">{stats?.absentToday || 0} absent</p>
          </div>
        </div>

      </div>

      {/* Main Content Grid: Class Breakdown & Hourly Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Class Breakdown Progress */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-brand-400" />
              <h2 className="text-base font-bold text-white">Attendance By Class / Grade</h2>
            </div>
            <span className="text-xs text-slate-400">Date: {selectedDate}</span>
          </div>

          <div className="space-y-4">
            {stats?.classBreakdown?.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No student classes registered yet.</p>
            ) : (
              stats?.classBreakdown?.map((cls) => {
                const total = cls.total_students || 0;
                const present = cls.present_count || 0;
                const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

                return (
                  <div key={cls.grade_class} className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold text-slate-200">{cls.grade_class}</span>
                      <span className="font-medium text-slate-400">
                        <b className="text-white">{present}</b> / {total} present ({percentage}%)
                        {cls.late_count > 0 && <span className="text-amber-400 ml-2">({cls.late_count} late)</span>}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Shortcuts & Hourly Flow */}
        <div className="space-y-6">
          
          {/* Quick Actions Panel */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
            <h2 className="text-base font-bold text-white mb-4">Quick Management Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/admin/attendance"
                className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-brand-500/50 hover:bg-slate-800/60 transition group flex flex-col justify-between"
              >
                <Activity className="w-5 h-5 text-brand-400 mb-2 group-hover:scale-110 transition-transform" />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Attendance Logs</span>
                  <span className="text-[10px] text-slate-500">Live filters & edits</span>
                </div>
              </Link>

              <Link
                to="/admin/students"
                className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-brand-500/50 hover:bg-slate-800/60 transition group flex flex-col justify-between"
              >
                <PlusCircle className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Manage Students</span>
                  <span className="text-[10px] text-slate-500">Assign USB Cards</span>
                </div>
              </Link>

              <Link
                to="/admin/printing"
                className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-brand-500/50 hover:bg-slate-800/60 transition group flex flex-col justify-between"
              >
                <Printer className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Printing Center</span>
                  <span className="text-[10px] text-slate-500">Sheets & ID Badges</span>
                </div>
              </Link>

              <Link
                to="/admin/backup"
                className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-brand-500/50 hover:bg-slate-800/60 transition group flex flex-col justify-between"
              >
                <Database className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Backup & Restore</span>
                  <span className="text-[10px] text-slate-500">1-click JSON snapshot</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Hourly Tap Flow */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
            <h2 className="text-base font-bold text-white mb-2">Hourly Tap Activity</h2>
            <p className="text-xs text-slate-400 mb-4">Card check-in distribution by hour</p>

            {stats?.hourlyActivity?.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No scans recorded on this date.</p>
            ) : (
              <div className="space-y-2">
                {stats?.hourlyActivity?.map((h) => (
                  <div key={h.hour} className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-400">{h.hour}:00 - {h.hour}:59</span>
                    <div className="flex items-center space-x-2 flex-1 mx-3">
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-brand-500 h-full rounded-full"
                          style={{ width: `${Math.min(100, h.count * 20)}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="font-bold text-white">{h.count} taps</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Recent System Audit Logs */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <h2 className="text-base font-bold text-white">System Audit & Tap Logs</h2>
          <Link to="/admin/attendance" className="text-xs text-brand-400 hover:underline flex items-center gap-1">
            View Full Logs <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 bg-slate-950/50">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                <th className="py-2.5 px-4 font-semibold">Action</th>
                <th className="py-2.5 px-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {stats?.recentLogs?.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    {log.timestamp.replace('T', ' ').slice(0, 19)}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 font-semibold text-[10px] border border-brand-500/20">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-200">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
