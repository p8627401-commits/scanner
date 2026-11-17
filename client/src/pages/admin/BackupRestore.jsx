import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  ShieldAlert, 
  CheckCircle2, 
  FileJson, 
  HardDrive, 
  AlertTriangle,
  History,
  Lock
} from 'lucide-react';

export default function BackupRestore() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [systemLogs, setSystemLogs] = useState([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    try {
      const res = await fetch('/api/settings/logs?limit=15');
      if (res.ok) {
        const data = await res.json();
        const backupLogs = data.filter(l => 
          l.action.includes('BACKUP') || 
          l.action.includes('RESTORE') || 
          l.action.includes('DB_FILE')
        );
        setSystemLogs(backupLogs);
      }
    } catch (e) {
      console.warn('Could not load logs:', e);
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setMessage(null);

    // Read and preview file content
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.data && parsed.data.students) {
          setFilePreview({
            valid: true,
            version: parsed.version || '1.0',
            timestamp: parsed.timestamp || 'unknown',
            studentsCount: parsed.data.students.length,
            attendanceCount: parsed.data.attendance?.length || 0,
            classesCount: parsed.data.classes?.length || 0,
            raw: parsed
          });
        } else {
          setFilePreview({ valid: false, error: 'File does not contain valid SmartCard system backup schema.' });
        }
      } catch (err) {
        setFilePreview({ valid: false, error: 'Failed to parse JSON: ' + err.message });
      }
    };
    reader.readAsText(file);
  }

  async function handleRestoreSubmit() {
    if (!filePreview || !filePreview.valid) {
      return alert('Please select a valid backup JSON file first.');
    }

    if (!confirm(`CAUTION: Restoring will overwrite existing attendance logs and student records with the backup file data (${filePreview.studentsCount} students, ${filePreview.attendanceCount} logs). Do you wish to proceed?`)) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filePreview.raw)
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: `System restored successfully! ${data.stats.students} students and ${data.stats.attendance} attendance records loaded.` });
        setSelectedFile(null);
        setFilePreview(null);
        fetchLogs();
      } else {
        setMessage({ type: 'error', text: 'Restore failed: ' + data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Restore error: ' + err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleResetDemo() {
    if (!confirm('Are you sure you want to reset all data back to the original demo sample state? Current live scans will be replaced with initial sample data.')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/backup/reset-demo', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'System successfully reset to initial demo state.' });
        fetchLogs();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Reset error: ' + err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Database className="w-7 h-7 text-amber-400" />
          Backup & Disaster Recovery
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Create snapshots, download offline SQLite binaries, and restore entire attendance records with 1 click
        </p>
      </div>

      {/* Status Alert Banner */}
      {message && (
        <div className={`p-4 rounded-2xl border flex items-center space-x-3 text-sm font-medium ${
          message.type === 'success'
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/15 border-red-500/30 text-red-300'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid: Download Backups & Restore System */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Create & Download Backups */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <Download className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Create System Backup</h2>
            <p className="text-xs text-slate-400 mt-1">
              Download comprehensive snapshots of all students, card mappings, attendance logs, classes, and system settings.
            </p>

            <div className="mt-6 space-y-4">
              
              {/* Option A: JSON Backup */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileJson className="w-6 h-6 text-brand-400" />
                  <div>
                    <h4 className="text-xs font-bold text-white">JSON System Snapshot</h4>
                    <p className="text-[11px] text-slate-400">Portable format, compatible with 1-click restore</p>
                  </div>
                </div>
                <a
                  href="/api/backup/download-json"
                  download
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>

              {/* Option B: Raw SQLite DB */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <HardDrive className="w-6 h-6 text-purple-400" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Raw SQLite Database (.db)</h4>
                    <p className="text-[11px] text-slate-400">Direct active binary copy of attendance.db</p>
                  </div>
                </div>
                <a
                  href="/api/backup/download-db"
                  download
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .db</span>
                </a>
              </div>

            </div>
          </div>

          {/* Quick Demo Reset */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-300 block">Reset Demo State</span>
                <span className="text-[10px] text-slate-500">Restore factory sample students and attendance</span>
              </div>
              <button
                onClick={handleResetDemo}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-800/60 text-xs font-medium transition flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Restore from Backup */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
              <Upload className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Restore from Backup File</h2>
            <p className="text-xs text-slate-400 mt-1">
              Upload a previously downloaded JSON backup snapshot to recover student cards and attendance history.
            </p>

            {/* Upload Selector */}
            <div className="mt-6">
              <label className="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-950/60 hover:bg-slate-950 transition text-center">
                <FileJson className="w-8 h-8 text-brand-400 mb-2" />
                <span className="text-xs font-bold text-slate-200">
                  {selectedFile ? selectedFile.name : 'Choose or drop JSON backup file here'}
                </span>
                <span className="text-[10px] text-slate-500 mt-1">
                  Supports .json backup snapshots
                </span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            {/* Validation Preview */}
            {filePreview && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs animate-card-pop">
                {filePreview.valid ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center text-emerald-400 font-bold gap-1 mb-2">
                      <CheckCircle2 className="w-4 h-4" /> Valid Backup Archive
                    </div>
                    <p className="text-slate-300">Timestamp: <span className="font-mono text-slate-400">{filePreview.timestamp.replace('T', ' ').slice(0, 19)}</span></p>
                    <p className="text-slate-300">Students to restore: <b className="text-white">{filePreview.studentsCount}</b></p>
                    <p className="text-slate-300">Attendance records: <b className="text-white">{filePreview.attendanceCount}</b></p>
                    <p className="text-slate-300">Classes: <b className="text-white">{filePreview.classesCount}</b></p>
                  </div>
                ) : (
                  <div className="text-red-400 font-medium">
                    {filePreview.error}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleRestoreSubmit}
            disabled={!filePreview || !filePreview.valid || loading}
            className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition flex items-center justify-center space-x-2"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Restoring System...' : 'Execute System Restore'}</span>
          </button>
        </div>

      </div>

      {/* Backup & Restore Audit Trail */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center space-x-2 pb-4 border-b border-slate-800 mb-4">
          <History className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">Backup & Recovery Audit Trail</h2>
        </div>

        {systemLogs.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No backup or restore events recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {systemLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-[10px] text-slate-500">
                    {log.timestamp.replace('T', ' ').slice(0, 19)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-mono text-[10px] border border-amber-500/20 font-bold">
                    {log.action}
                  </span>
                  <span className="text-slate-200">{log.details}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
