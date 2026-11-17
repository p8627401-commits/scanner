import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  Lock, 
  Volume2, 
  Clock, 
  School, 
  ShieldCheck, 
  CheckCircle2, 
  Key, 
  Radio 
} from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    school_name: '',
    school_subtitle: '',
    late_cutoff_time: '08:00',
    checkout_cutoff_time: '15:00',
    scanner_sound: 'true',
    scanner_mode: 'auto',
    kiosk_exit_pin: '1234'
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [savingSettings, setSavingSettings] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [passwordMessage, setPasswordMessage] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (e) {
      console.warn('Error fetching settings:', e);
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    setSavingSettings(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();

      if (data.success) {
        setStatusMessage({ type: 'success', text: 'School settings saved successfully!' });
      } else {
        setStatusMessage({ type: 'error', text: data.message || 'Error saving settings' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Network error: ' + err.message });
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
    }

    if (passwordForm.newPassword.length < 4) {
      return setPasswordMessage({ type: 'error', text: 'Password must be at least 4 characters' });
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const data = await res.json();

      if (data.success) {
        setPasswordMessage({ type: 'success', text: 'Admin password changed successfully!' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordMessage({ type: 'error', text: data.message || 'Failed to change password' });
      }
    } catch (err) {
      setPasswordMessage({ type: 'error', text: 'Network error: ' + err.message });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-brand-400" />
          System Settings & Policies
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure school identity, tardiness thresholds, scanner audio, and security PINs
        </p>
      </div>

      {/* Main Settings Form */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center space-x-2 pb-4 border-b border-slate-800 mb-6">
          <School className="w-5 h-5 text-brand-400" />
          <h2 className="text-base font-bold text-white">General & Attendance Configuration</h2>
        </div>

        {statusMessage && (
          <div className={`mb-6 p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border-red-500/30 text-red-300'
          }`}>
            <CheckCircle2 className="w-4 h-4" />
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
          
          {/* School Name & Subtitle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">School / Institution Name</label>
              <input
                type="text"
                required
                value={settings.school_name}
                onChange={(e) => setSettings({ ...settings, school_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">School Subtitle / Campus</label>
              <input
                type="text"
                value={settings.school_subtitle}
                onChange={(e) => setSettings({ ...settings, school_subtitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Time Thresholds */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Late Arrival Cutoff Time (24h)
              </label>
              <input
                type="time"
                required
                value={settings.late_cutoff_time}
                onChange={(e) => setSettings({ ...settings, late_cutoff_time: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-brand-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">Check-ins scanned after this time are marked as Late</p>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                Normal Check-Out Cutoff Time (24h)
              </label>
              <input
                type="time"
                required
                value={settings.checkout_cutoff_time}
                onChange={(e) => setSettings({ ...settings, checkout_cutoff_time: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-brand-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">Check-outs prior to this time are marked as Early Departure</p>
            </div>
          </div>

          {/* Scanner Kiosk Defaults */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-brand-400" />
                Scanner Kiosk Audio Chimes
              </label>
              <select
                value={settings.scanner_sound}
                onChange={(e) => setSettings({ ...settings, scanner_sound: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="true">Enabled (Success chime & warning)</option>
                <option value="false">Muted (Silent mode)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                Default Scanner Mode
              </label>
              <select
                value={settings.scanner_mode}
                onChange={(e) => setSettings({ ...settings, scanner_mode: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="auto">Auto Toggle (Smart In/Out)</option>
                <option value="check_in">Check-In Only</option>
                <option value="check_out">Check-Out Only</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Kiosk Exit PIN Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={settings.kiosk_exit_pin}
                onChange={(e) => setSettings({ ...settings, kiosk_exit_pin: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold tracking-widest focus:outline-none focus:border-brand-500"
                placeholder="1234"
              />
              <p className="text-[10px] text-slate-500 mt-1">Prevents kiosk users from switching to admin</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-500/25 transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>

        </form>
      </div>

      {/* Admin Password Change Form */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center space-x-2 pb-4 border-b border-slate-800 mb-6">
          <Key className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-bold text-white">Administrator Security Credentials</h2>
        </div>

        {passwordMessage && (
          <div className={`mb-6 p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
            passwordMessage.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border-red-500/30 text-red-300'
          }`}>
            <CheckCircle2 className="w-4 h-4" />
            <span>{passwordMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 text-xs max-w-md">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Current Password</label>
            <input
              type="password"
              required
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-500"
              placeholder="Current admin password"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">New Password</label>
            <input
              type="password"
              required
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-500"
              placeholder="At least 4 characters"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Confirm New Password</label>
            <input
              type="password"
              required
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-500"
              placeholder="Confirm new password"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingPassword}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-500/25 transition flex items-center gap-2"
            >
              <Key className="w-4 h-4" />
              <span>{savingPassword ? 'Updating...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
