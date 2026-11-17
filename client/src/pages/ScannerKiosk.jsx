import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { 
  CreditCard, 
  Volume2, 
  VolumeX, 
  Lock, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sparkles, 
  LogOut, 
  UserCheck, 
  Radio, 
  Cpu, 
  ChevronRight, 
  RotateCw,
  Maximize2,
  Minimize2,
  Keyboard,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { useHardwareScanner } from '../hooks/useHardwareScanner';
import { 
  playSuccessChime, 
  playWarningBeep, 
  playErrorBuzzer, 
  playCheckoutChime 
} from '../utils/audio';

export default function ScannerKiosk() {
  const navigate = useNavigate();

  // Settings & State
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scanMode, setScanMode] = useState('auto'); // 'auto', 'check_in', 'check_out'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [schoolSettings, setSchoolSettings] = useState({
    school_name: 'Lincoln Science & Technology High School',
    school_subtitle: 'SmartCard Attendance System',
    late_cutoff_time: '08:00'
  });

  // Recent scans & live stats
  const [recentScans, setRecentScans] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 10,
    presentToday: 4,
    onTimeToday: 3,
    lateToday: 1,
    attendanceRate: 40
  });

  // Scan Result Modal / Pop-up State
  const [scanResult, setScanResult] = useState(null); // { success, student, attendance, greeting, error, message, status }
  const [isProcessing, setIsProcessing] = useState(false);
  const autoDismissTimerRef = useRef(null);

  // Manual Test Simulator State
  const [manualUid, setManualUid] = useState('');
  const [showSimulator, setShowSimulator] = useState(false);

  // Pin lock modal for exiting to admin
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Digital clock update every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch school settings and initial recent scans & stats
  useEffect(() => {
    fetchSettings();
    fetchRecentScans();
    fetchStats();

    // Periodic refresh of recent scans every 15 seconds
    const interval = setInterval(() => {
      fetchRecentScans();
      fetchStats();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSchoolSettings(prev => ({ ...prev, ...data }));
        if (data.scanner_sound !== undefined) {
          setSoundEnabled(data.scanner_sound === 'true' || data.scanner_sound === true);
        }
        if (data.scanner_mode) {
          setScanMode(data.scanner_mode);
        }
      }
    } catch (e) {
      console.warn('Could not load settings:', e);
    }
  }

  async function fetchRecentScans() {
    try {
      const res = await fetch('/api/scanner/recent?limit=8');
      if (res.ok) {
        const data = await res.json();
        setRecentScans(data.scans || []);
      }
    } catch (e) {
      console.warn('Could not load recent scans:', e);
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/scanner/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.warn('Could not load stats:', e);
    }
  }

  // Handle Card Tap from USB hardware or simulator
  async function handleCardScan(rawCardUid) {
    if (!rawCardUid || isProcessing) return;
    setIsProcessing(true);

    // Clear any previous dismiss timer
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
    }

    try {
      const res = await fetch('/api/scanner/tap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_uid: rawCardUid,
          scan_type: scanMode,
          device_source: 'usb_hardware_kiosk'
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setScanResult(data);

        // Sound Feedback
        if (soundEnabled) {
          if (data.action === 'check_out') {
            playCheckoutChime();
          } else if (data.status === 'on_time') {
            playSuccessChime();
          } else {
            playWarningBeep();
          }
        }

        // Celebrate on-time check-in with confetti!
        if (data.action === 'check_in' && data.status === 'on_time' && !data.debounced) {
          try {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.65 }
            });
          } catch {}
        }

        // Refresh live stats & recent list
        fetchRecentScans();
        fetchStats();

      } else {
        // Unknown card or error
        setScanResult({
          success: false,
          error: data.error || 'SCAN_ERROR',
          card_uid: data.card_uid || rawCardUid,
          message: data.message || 'Card not recognized in the system'
        });

        if (soundEnabled) {
          playErrorBuzzer();
        }
      }
    } catch (err) {
      setScanResult({
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Could not communicate with attendance server: ' + err.message
      });
      if (soundEnabled) {
        playErrorBuzzer();
      }
    } finally {
      setIsProcessing(false);
      // Auto dismiss card reveal after 6 seconds
      autoDismissTimerRef.current = setTimeout(() => {
        setScanResult(null);
      }, 6000);
    }
  }

  // Hook up global hardware reader keystroke listener
  const { isScanning } = useHardwareScanner(handleCardScan, {
    enabled: !showPinModal,
    soundTick: soundEnabled
  });

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // Verify PIN to exit kiosk
  const handleVerifyPin = async (e) => {
    e.preventDefault();
    setPinError('');

    try {
      const res = await fetch('/api/scanner/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput })
      });
      const data = await res.json();

      if (data.success) {
        setShowPinModal(false);
        navigate('/admin/dashboard');
      } else {
        setPinError('Incorrect PIN. Default is 1234');
        if (soundEnabled) playErrorBuzzer();
      }
    } catch {
      setPinError('Connection error verifying PIN');
    }
  };

  // Format digital clock
  const timeFormatted = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dateFormatted = currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-brand-500 relative overflow-hidden select-none">
      
      {/* Background Decorative Radar Waves */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        
        {/* School Info & Branding */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/30 border border-brand-400/20">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              {schoolSettings.school_name}
            </h1>
            <p className="text-xs text-brand-300/80 font-medium tracking-wide">
              {schoolSettings.school_subtitle} • Late After: <span className="text-amber-400 font-semibold">{schoolSettings.late_cutoff_time || '08:00'}</span>
            </p>
          </div>
        </div>

        {/* Center Live Clock */}
        <div className="hidden md:flex flex-col items-center">
          <div className="text-2xl lg:text-3xl font-extrabold tracking-wider font-mono text-white flex items-center gap-2 drop-shadow">
            <Clock className="w-5 h-5 text-brand-400 animate-pulse" />
            {timeFormatted}
          </div>
          <div className="text-xs text-slate-400 font-medium">
            {dateFormatted}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-2">
          
          {/* Hardware Connection Indicator */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isScanning ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isScanning ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
            </span>
            <span className="text-slate-300 font-medium flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              {isScanning ? 'Reading Card...' : 'USB Scanner Ready'}
            </span>
          </div>

          {/* Audio Mute/Unmute */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-all ${
              soundEnabled
                ? 'bg-slate-800/80 border-slate-700 text-brand-400 hover:bg-slate-700'
                : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
            }`}
            title={soundEnabled ? 'Mute Audio Chimes' : 'Unmute Audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Toggle Fullscreen Kiosk Mode"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Lock / Exit to Admin */}
          <button
            onClick={() => {
              setPinInput('');
              setPinError('');
              setShowPinModal(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition shadow-sm"
            title="Exit Kiosk to Admin Portal"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Admin Portal</span>
          </button>

        </div>

      </header>

      {/* Main Kiosk Body */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-between p-6 gap-8 max-w-7xl mx-auto w-full">
        
        {/* Left / Center: Primary Card Tap Zone */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl py-6">
          
          {/* Scan Mode Selector */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl mb-8">
            <button
              onClick={() => setScanMode('auto')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                scanMode === 'auto'
                  ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Smart Auto Toggle</span>
            </button>
            <button
              onClick={() => setScanMode('check_in')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                scanMode === 'check_in'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Check-In Only</span>
            </button>
            <button
              onClick={() => setScanMode('check_out')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                scanMode === 'check_out'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Check-Out Only</span>
            </button>
          </div>

          {/* Interactive Card Tap Radar Target */}
          <div className="relative flex flex-col items-center justify-center my-4 group">
            
            {/* Concentric Pulsing Rings */}
            <div className={`absolute w-72 h-72 sm:w-88 sm:h-88 rounded-full border border-brand-500/20 transition-all duration-700 ${
              isScanning ? 'scale-110 border-brand-400/50' : 'animate-ping-slow'
            }`}></div>
            <div className="absolute w-60 h-60 sm:w-72 sm:h-72 rounded-full border border-indigo-500/20"></div>

            {/* Main Tap Orb */}
            <div className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-3xl p-1 bg-gradient-to-tr transition-all duration-500 shadow-2xl flex flex-col items-center justify-center text-center cursor-pointer ${
              isScanning
                ? 'from-amber-400 via-brand-500 to-indigo-500 scale-105 shadow-brand-500/40'
                : 'from-brand-600 via-indigo-600 to-slate-900 shadow-brand-600/20 hover:scale-102'
            }`}>
              <div className="w-full h-full bg-slate-950/80 rounded-[22px] flex flex-col items-center justify-center p-4 backdrop-blur-sm border border-white/10">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-300 ${
                  isScanning ? 'bg-amber-400/20 text-amber-300 scale-110' : 'bg-brand-500/20 text-brand-400 group-hover:scale-105'
                }`}>
                  <CreditCard className="w-8 h-8" />
                </div>
                <span className="text-sm font-bold text-white tracking-wide">
                  {isScanning ? 'READING CARD...' : 'TAP CARD HERE'}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
                  <Zap className="w-3 h-3 text-amber-400" /> USB RFID / NFC Active
                </span>
              </div>
            </div>

            <p className="mt-6 text-sm text-slate-400 text-center max-w-sm">
              Place your physical student tap card near the USB reader. The system records your attendance instantly.
            </p>
          </div>

          {/* Test Simulator Drawer Trigger */}
          <div className="mt-4 flex items-center space-x-3">
            <button
              onClick={() => setShowSimulator(!showSimulator)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition"
            >
              <Keyboard className="w-3.5 h-3.5 text-brand-400" />
              <span>{showSimulator ? 'Hide Test Tap Simulator' : 'Test Tap Card (No Reader Needed)'}</span>
            </button>
          </div>

          {/* On-screen Test Simulator Box */}
          {showSimulator && (
            <div className="mt-4 w-full max-w-lg p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl animate-card-pop">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-brand-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Tap Simulator & Quick Test</span>
                </div>
                <span className="text-[11px] text-slate-400">Emulates USB Hardware Burst</span>
              </div>

              {/* Quick Tap Buttons for Seeded Students */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <button
                  onClick={() => handleCardScan('1098234751')}
                  className="px-2.5 py-2 rounded-xl bg-slate-800/80 hover:bg-brand-600/30 border border-slate-700 hover:border-brand-500/50 text-left transition group"
                >
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">Sophia Vandeth</p>
                  <p className="text-[10px] text-brand-400 font-mono">1098234751</p>
                </button>
                <button
                  onClick={() => handleCardScan('04A8F91B2C')}
                  className="px-2.5 py-2 rounded-xl bg-slate-800/80 hover:bg-brand-600/30 border border-slate-700 hover:border-brand-500/50 text-left transition group"
                >
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">Phally Kosal</p>
                  <p className="text-[10px] text-brand-400 font-mono">04A8F91B2C</p>
                </button>
                <button
                  onClick={() => handleCardScan('CARD-001')}
                  className="px-2.5 py-2 rounded-xl bg-slate-800/80 hover:bg-brand-600/30 border border-slate-700 hover:border-brand-500/50 text-left transition group"
                >
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">Marcus Chen</p>
                  <p className="text-[10px] text-brand-400 font-mono">CARD-001</p>
                </button>
                <button
                  onClick={() => handleCardScan('9999999999')}
                  className="px-2.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/40 border border-red-800/50 text-left transition group"
                >
                  <p className="text-xs font-semibold text-red-300 truncate">Unknown Card</p>
                  <p className="text-[10px] text-red-400 font-mono">9999999999</p>
                </button>
              </div>

              {/* Custom UID Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualUid.trim()) {
                    handleCardScan(manualUid.trim());
                    setManualUid('');
                  }
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Enter custom card UID or barcode..."
                  value={manualUid}
                  onChange={(e) => setManualUid(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
                <button
                  type="submit"
                  disabled={!manualUid.trim()}
                  className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-xs font-semibold text-white transition"
                >
                  Simulate Tap
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Right: Live Today's Ticker & Stats Sidebar */}
        <div className="w-full lg:w-96 flex flex-col gap-4">
          
          {/* Today's KPI Counters */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col shadow-lg">
              <span className="text-[11px] text-slate-400 font-medium">Present</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{stats.presentToday || 0}</span>
              <span className="text-[10px] text-slate-500">of {stats.totalStudents || 0} students</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col shadow-lg">
              <span className="text-[11px] text-slate-400 font-medium">On-Time</span>
              <span className="text-xl sm:text-2xl font-black text-brand-400 mt-1">{stats.onTimeToday || 0}</span>
              <span className="text-[10px] text-slate-500">before {schoolSettings.late_cutoff_time || '08:00'}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col shadow-lg">
              <span className="text-[11px] text-slate-400 font-medium">Late</span>
              <span className="text-xl sm:text-2xl font-black text-amber-400 mt-1">{stats.lateToday || 0}</span>
              <span className="text-[10px] text-slate-500">tardy arrivals</span>
            </div>
          </div>

          {/* Live Recent Scans Stream */}
          <div className="rounded-3xl bg-slate-900/70 border border-slate-800 p-4 shadow-xl flex-1 flex flex-col min-h-[360px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Live Check-in Stream</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                Today
              </span>
            </div>

            <div className="mt-3 space-y-2 flex-1 overflow-y-auto max-h-[340px] pr-1">
              {recentScans.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-xs">
                  <CreditCard className="w-8 h-8 mb-2 opacity-30" />
                  <span>No card scans recorded yet today</span>
                </div>
              ) : (
                recentScans.map((scan) => {
                  const isOnTime = scan.status === 'on_time';
                  const isCheckOut = scan.type === 'check_out';

                  return (
                    <div
                      key={scan.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center space-x-2.5">
                        <img
                          src={scan.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${scan.student_code}`}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover border border-slate-700 bg-slate-800"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-100 leading-tight">
                            {scan.first_name} {scan.last_name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {scan.grade_class}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isCheckOut
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                            : isOnTime
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {isCheckOut ? 'OUT' : isOnTime ? 'ON TIME' : 'LATE'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {scan.time}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>

      </main>

      {/* Floating Card Reveal Pop-Up (When student scans card) */}
      {scanResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          
          <div className={`relative w-full max-w-lg p-6 sm:p-8 rounded-3xl border shadow-2xl transform transition-all animate-card-pop ${
            scanResult.success
              ? scanResult.action === 'check_out'
                ? 'bg-gradient-to-b from-slate-900 to-sky-950 border-sky-500/50 shadow-sky-500/20'
                : scanResult.status === 'on_time'
                ? 'bg-gradient-to-b from-slate-900 to-emerald-950 border-emerald-500/50 shadow-emerald-500/20'
                : 'bg-gradient-to-b from-slate-900 to-amber-950 border-amber-500/50 shadow-amber-500/20'
              : 'bg-gradient-to-b from-slate-900 to-red-950 border-red-500/50 shadow-red-500/20'
          }`}>
            
            {/* Close Button */}
            <button
              onClick={() => setScanResult(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <XCircle className="w-5 h-5" />
            </button>

            {scanResult.success ? (
              <div className="flex flex-col items-center text-center">
                
                {/* Status Badge */}
                <div className="mb-4">
                  {scanResult.action === 'check_out' ? (
                    <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/40">
                      <LogOut className="w-4 h-4" /> Check-Out Recorded
                    </span>
                  ) : scanResult.status === 'on_time' ? (
                    <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <CheckCircle2 className="w-4 h-4" /> Present • On Time
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <AlertTriangle className="w-4 h-4" /> Checked In • Late
                    </span>
                  )}
                </div>

                {/* Student Photo */}
                <div className="relative mb-4">
                  <img
                    src={scanResult.student.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${scanResult.student.student_id}`}
                    alt={scanResult.student.first_name}
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-white/20 shadow-xl bg-slate-800"
                  />
                  <div className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-brand-600 text-white shadow-lg">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>

                {/* Name & Class */}
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {scanResult.student.first_name} {scanResult.student.last_name}
                </h2>
                <p className="text-sm text-brand-300 font-semibold mt-0.5">
                  {scanResult.student.grade_class} • {scanResult.student.department || 'General'}
                </p>

                {/* IDs & Time */}
                <div className="mt-4 grid grid-cols-2 gap-3 w-full max-w-sm text-left">
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/10">
                    <p className="text-[10px] text-slate-400 font-medium">Student ID</p>
                    <p className="text-xs font-mono font-bold text-white mt-0.5">{scanResult.student.student_id}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/10">
                    <p className="text-[10px] text-slate-400 font-medium">Scan Time</p>
                    <p className="text-xs font-mono font-bold text-white mt-0.5">{scanResult.attendance.time}</p>
                  </div>
                </div>

                {/* Friendly Greeting */}
                <div className="mt-5 p-3 rounded-2xl bg-white/5 border border-white/10 w-full text-center">
                  <p className="text-sm font-medium text-slate-200 italic">
                    "{scanResult.greeting}"
                  </p>
                </div>

                {/* Auto dismiss progress bar */}
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-6 overflow-hidden">
                  <div className="h-full bg-brand-400 rounded-full animate-[progress_6s_linear_forwards] w-full"></div>
                </div>

              </div>
            ) : (
              /* Error / Unknown Card View */
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-4 border border-red-500/30">
                  <XCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-red-300">Unrecognized Card</h3>
                <p className="text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-red-900/50 text-red-200 mt-2">
                  UID: {scanResult.card_uid}
                </p>
                <p className="text-sm text-slate-300 mt-3 max-w-xs">
                  {scanResult.message}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Please contact the administrator to register this card.
                </p>
              </div>
            )}

          </div>

        </div>
      )}

      {/* Admin PIN Unlock Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl animate-card-pop">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Kiosk Exit PIN</h3>
              </div>
              <button
                onClick={() => setShowPinModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Enter the administrator security PIN to exit kiosk mode and access management portal. (Default: <span className="font-mono text-brand-300 font-bold">1234</span>)
            </p>

            <form onSubmit={handleVerifyPin}>
              <input
                type="password"
                maxLength={8}
                autoFocus
                placeholder="Enter PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full text-center text-2xl font-mono tracking-widest bg-slate-950 border border-slate-700 rounded-2xl py-3 text-white focus:outline-none focus:border-brand-500 mb-3"
              />

              {pinError && (
                <p className="text-xs text-red-400 text-center mb-3 font-medium">
                  {pinError}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition shadow-lg shadow-brand-500/25"
                >
                  Unlock Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Status Bar */}
      <footer className="relative z-10 px-6 py-3 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-4">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <Radio className="w-3.5 h-3.5 text-emerald-400" /> SmartCard Hardware Kiosk v1.0
          </span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span className="hidden sm:inline">Automatic Keystroke Buffer & Enter Terminator Wedge Active</span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="text-brand-400 hover:underline flex items-center gap-1 font-medium"
          >
            Direct to Admin Portal <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>

    </div>
  );
}
