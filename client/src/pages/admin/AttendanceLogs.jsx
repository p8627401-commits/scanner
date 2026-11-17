import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  LogOut, 
  FileText,
  XCircle,
  CreditCard
} from 'lucide-react';

export default function AttendanceLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Filter States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useRange, setUseRange] = useState(false);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [classesList, setClassesList] = useState([]);

  // Modal States
  const [showManualModal, setShowManualModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeLog, setActiveLog] = useState(null);
  const [studentsList, setStudentsList] = useState([]);

  // Manual Log Form State
  const [manualForm, setManualForm] = useState({
    student_id: '',
    type: 'check_in',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 8),
    status: 'manual',
    notes: 'Excused / manual entry by admin'
  });

  // Edit Log Form State
  const [editForm, setEditForm] = useState({
    type: '',
    date: '',
    time: '',
    status: '',
    notes: ''
  });

  useEffect(() => {
    fetchClasses();
    fetchStudents();
  }, []);

  useEffect(() => {
    fetchLogs();

    let interval = null;
    if (autoRefresh) {
      interval = setInterval(fetchLogs, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedDate, startDate, endDate, useRange, selectedClass, selectedStatus, searchTerm, autoRefresh]);

  async function fetchClasses() {
    try {
      const res = await fetch('/api/students/classes');
      if (res.ok) {
        const data = await res.json();
        setClassesList(data);
      }
    } catch (e) {
      console.warn('Error fetching classes:', e);
    }
  }

  async function fetchStudents() {
    try {
      const res = await fetch('/api/students');
      if (res.ok) {
        const data = await res.json();
        setStudentsList(data);
      }
    } catch (e) {
      console.warn('Error fetching students:', e);
    }
  }

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (useRange) {
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
      } else {
        if (selectedDate) params.append('date', selectedDate);
      }

      if (selectedClass !== 'all') params.append('grade_class', selectedClass);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await fetch(`/api/attendance?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    if (!manualForm.student_id) return alert('Please select a student');

    try {
      const res = await fetch('/api/attendance/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowManualModal(false);
        fetchLogs();
      } else {
        alert(data.message || 'Error creating manual attendance');
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!activeLog) return;

    try {
      const res = await fetch(`/api/attendance/${activeLog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        fetchLogs();
      } else {
        alert(data.message || 'Error updating log');
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  }

  async function handleDeleteLog(id) {
    if (!confirm(`Are you sure you want to delete attendance record #${id}?`)) return;

    try {
      const res = await fetch(`/api/attendance/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchLogs();
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  }

  function openEditModal(log) {
    setActiveLog(log);
    setEditForm({
      type: log.type,
      date: log.date,
      time: log.time,
      status: log.status,
      notes: log.notes || ''
    });
    setShowEditModal(true);
  }

  function downloadCsv() {
    const params = new URLSearchParams();
    if (useRange) {
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
    } else {
      if (selectedDate) params.append('date', selectedDate);
    }
    if (selectedClass !== 'all') params.append('grade_class', selectedClass);
    if (selectedStatus !== 'all') params.append('status', selectedStatus);

    window.open(`/api/export/attendance.csv?${params.toString()}`, '_blank');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-brand-400" />
            Attendance Tracking Logs
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Complete audit trail of physical USB card taps and manual check-ins
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              autoRefresh
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>{autoRefresh ? 'Live (10s)' : 'Auto-Refresh Off'}</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={downloadCsv}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5 text-brand-400" />
            <span>Export CSV</span>
          </button>

          {/* Manual Entry Button */}
          <button
            onClick={() => {
              setManualForm({
                student_id: studentsList[0]?.id || '',
                type: 'check_in',
                date: new Date().toISOString().split('T')[0],
                time: new Date().toTimeString().slice(0, 8),
                status: 'manual',
                notes: 'Manual entry by administrator'
              });
              setShowManualModal(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Entry</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name, ID, or card UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Date Mode Toggle */}
          <button
            onClick={() => setUseRange(!useRange)}
            className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition"
          >
            {useRange ? 'Switch to Single Date' : 'Switch to Date Range'}
          </button>

          {/* Single Date or Date Range Input */}
          {!useRange ? (
            <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
              <Calendar className="w-4 h-4 text-brand-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
              />
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                placeholder="Start Date"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                placeholder="End Date"
              />
            </div>
          )}

          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Classes / Grades</option>
            {classesList.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="on_time">On Time</option>
            <option value="late">Late</option>
            <option value="checked_out">Checked Out</option>
            <option value="early_departure">Early Departure</option>
            <option value="manual">Manual Entry</option>
          </select>

        </div>
      </div>

      {/* Attendance Logs Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Found <b>{logs.length}</b> attendance records</span>
          <span>Showing latest first</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 bg-slate-950/60 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Student</th>
                <th className="py-3 px-4 font-semibold">Class / Grade</th>
                <th className="py-3 px-4 font-semibold">Card UID</th>
                <th className="py-3 px-4 font-semibold">Date & Time</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Device</th>
                <th className="py-3 px-4 font-semibold">Notes</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-400" />
                    Loading attendance records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-500">
                    <FileText className="w-8 h-8 opacity-40 mx-auto mb-2" />
                    No attendance records match the selected criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isOnTime = log.status === 'on_time';
                  const isLate = log.status === 'late';
                  const isCheckOut = log.type === 'check_out';

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      
                      {/* Student */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={log.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${log.student_code}`}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover border border-slate-700 bg-slate-800"
                          />
                          <div>
                            <span className="font-bold text-white block">
                              {log.first_name} {log.last_name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {log.student_code}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="py-3 px-4 font-medium text-slate-300">
                        {log.grade_class}
                      </td>

                      {/* Card UID */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-brand-300 bg-brand-950/60 px-2 py-0.5 rounded border border-brand-800/50">
                          {log.card_uid}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-medium text-slate-200">{log.time}</div>
                        <div className="text-[11px] text-slate-400">{log.date}</div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isCheckOut
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {log.type === 'check_in' ? 'Check-In' : 'Check-Out'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isOnTime
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : isLate
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {log.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Device */}
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {log.device_source}
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-4 text-slate-400 text-[11px] max-w-[160px] truncate" title={log.notes}>
                        {log.notes || '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => openEditModal(log)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Edit Record"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl animate-card-pop">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Add Manual Attendance Log</h3>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Student</label>
                <select
                  required
                  value={manualForm.student_id}
                  onChange={(e) => setManualForm({ ...manualForm, student_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="">-- Choose Student --</option>
                  {studentsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} ({s.student_id}) - {s.grade_class}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Action Type</label>
                  <select
                    value={manualForm.type}
                    onChange={(e) => setManualForm({ ...manualForm, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="check_in">Check-In</option>
                    <option value="check_out">Check-Out</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status</label>
                  <select
                    value={manualForm.status}
                    onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="on_time">On Time</option>
                    <option value="late">Late</option>
                    <option value="manual">Manual</option>
                    <option value="early_departure">Early Departure</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={manualForm.date}
                    onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Time</label>
                  <input
                    type="text"
                    required
                    value={manualForm.time}
                    onChange={(e) => setManualForm({ ...manualForm, time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-brand-500"
                    placeholder="08:00:00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notes / Reason</label>
                <input
                  type="text"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  placeholder="e.g. Forgot card at home, excused note"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-lg shadow-brand-500/20"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Log Modal */}
      {showEditModal && activeLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl animate-card-pop">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Edit Attendance Record #{activeLog.id}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center space-x-3 text-xs">
              <img
                src={activeLog.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeLog.student_code}`}
                alt=""
                className="w-9 h-9 rounded-full object-cover"
              />
              <div>
                <p className="font-bold text-white">{activeLog.first_name} {activeLog.last_name}</p>
                <p className="text-slate-400 font-mono">{activeLog.student_code} • {activeLog.grade_class}</p>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Action Type</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="check_in">Check-In</option>
                    <option value="check_out">Check-Out</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="on_time">On Time</option>
                    <option value="late">Late</option>
                    <option value="checked_out">Checked Out</option>
                    <option value="early_departure">Early Departure</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Time</label>
                  <input
                    type="text"
                    required
                    value={editForm.time}
                    onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notes</label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
