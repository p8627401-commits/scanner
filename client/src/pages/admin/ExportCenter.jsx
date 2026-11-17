import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, Users, Calendar, Filter, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function ExportCenter() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useRange, setUseRange] = useState(false);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [classesList, setClassesList] = useState([]);

  useEffect(() => {
    fetch('/api/students/classes')
      .then(res => res.json())
      .then(data => setClassesList(data))
      .catch(() => {});
  }, []);

  function handleExportAttendance() {
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

  function handleExportStudents() {
    const params = new URLSearchParams();
    if (selectedClass !== 'all') params.append('grade_class', selectedClass);
    if (selectedStatus !== 'all') params.append('status', selectedStatus);

    window.open(`/api/export/students.csv?${params.toString()}`, '_blank');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Download className="w-7 h-7 text-brand-400" />
          Data Export Center
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Export full attendance audit trails and student registries to CSV (Microsoft Excel & Google Sheets ready)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Attendance Logs Export */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Attendance Audit Logs (CSV)</h2>
            <p className="text-xs text-slate-400 mt-1">
              Includes Log ID, date, time, check-in/out type, on-time/late status, student name, ID, class, and physical card UID.
            </p>

            {/* Filters */}
            <div className="mt-5 space-y-3 p-4 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Filter Export Range:</span>
                <button
                  onClick={() => setUseRange(!useRange)}
                  className="text-brand-400 hover:underline"
                >
                  {useRange ? 'Single Date' : 'Date Range'}
                </button>
              </div>

              {!useRange ? (
                <div>
                  <label className="block text-slate-400 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Class / Grade</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white"
                  >
                    <option value="all">All Classes</option>
                    {classesList.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white"
                  >
                    <option value="all">All Statuses</option>
                    <option value="on_time">On Time</option>
                    <option value="late">Late</option>
                    <option value="checked_out">Checked Out</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleExportAttendance}
            className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-brand-500/25 transition flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Attendance CSV</span>
          </button>
        </div>

        {/* Card 2: Students Registry Export */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Student & Card Registry (CSV)</h2>
            <p className="text-xs text-slate-400 mt-1">
              Complete student roster with assigned hardware Card UIDs, contact details, parent numbers, and registration dates.
            </p>

            <div className="mt-5 space-y-3 p-4 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Class / Grade</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white"
                >
                  <option value="all">All Classes</option>
                  {classesList.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Student Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="suspended">Suspended Only</option>
                </select>
              </div>

              <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Formatted with UTF-8 BOM for direct double-click opening in Microsoft Excel.
              </div>
            </div>
          </div>

          <button
            onClick={handleExportStudents}
            className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Students Registry CSV</span>
          </button>
        </div>

      </div>

    </div>
  );
}
