import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  Printer, 
  FileText, 
  CreditCard, 
  Calendar, 
  Layers, 
  CheckCircle2, 
  Download,
  Check,
  QrCode
} from 'lucide-react';

export default function ReportsPrinting() {
  const [printMode, setPrintMode] = useState('daily_sheet'); // 'daily_sheet' | 'student_badges' | 'matrix'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [classesList, setClassesList] = useState([]);
  
  // Data
  const [sheetData, setSheetData] = useState(null);
  const [students, setStudents] = useState([]);
  const [qrCodes, setQrCodes] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (printMode === 'daily_sheet') {
      fetchDailySheet();
    } else if (printMode === 'student_badges') {
      fetchStudentsForBadges();
    }
  }, [printMode, selectedDate, selectedClass]);

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

  async function fetchDailySheet() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (selectedClass !== 'all') params.append('grade_class', selectedClass);

      const res = await fetch(`/api/reports/daily-sheet?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSheetData(data);
      }
    } catch (err) {
      console.error('Error loading daily sheet:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStudentsForBadges() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClass !== 'all') params.append('grade_class', selectedClass);
      params.append('status', 'active');

      const res = await fetch(`/api/students?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data);

        // Generate QR codes for each student badge
        const qrMap = {};
        for (const s of data) {
          try {
            const url = await QRCode.toDataURL(s.card_uid || s.student_id, {
              margin: 1,
              width: 120,
              color: { dark: '#000000', light: '#ffffff' }
            });
            qrMap[s.id] = url;
          } catch {}
        }
        setQrCodes(qrMap);
      }
    } catch (err) {
      console.error('Error loading students for badges:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleTriggerPrint() {
    window.print();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header (Hidden when printing) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Printer className="w-7 h-7 text-brand-400" />
            Printing & Reports Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Generate and print official attendance sheets, registers, and student tap badge cards
          </p>
        </div>

        <button
          onClick={handleTriggerPrint}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-brand-500/25 transition cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print Document (Ctrl+P)</span>
        </button>
      </div>

      {/* Mode Selector & Controls (Hidden when printing) */}
      <div className="no-print p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setPrintMode('daily_sheet')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                printMode === 'daily_sheet'
                  ? 'bg-brand-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Daily Attendance Sheet</span>
            </button>
            <button
              onClick={() => setPrintMode('student_badges')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                printMode === 'student_badges'
                  ? 'bg-brand-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Student ID Badges (QR / Tap)</span>
            </button>
          </div>

          {/* Date & Class Filters */}
          <div className="flex items-center gap-2">
            {printMode === 'daily_sheet' && (
              <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                <Calendar className="w-4 h-4 text-brand-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-white focus:outline-none cursor-pointer"
                />
              </div>
            )}

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
          </div>

        </div>
      </div>

      {/* PRINT VIEW CONTAINER (Styled for both Screen Preview & Clean White Paper Print) */}
      <div className="print-page bg-white text-slate-900 rounded-3xl p-8 sm:p-12 shadow-2xl min-h-[700px] border border-slate-200">
        
        {/* MODE 1: DAILY ATTENDANCE REGISTER */}
        {printMode === 'daily_sheet' && (
          <div>
            {/* School Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900">
                  {sheetData?.school_name || 'Lincoln Science & Technology High School'}
                </h2>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mt-0.5">
                  Official Daily Attendance Register & Tap Card Audit Sheet
                </p>
              </div>
              <div className="text-right sm:text-right">
                <span className="text-xs font-bold uppercase text-slate-500 block">Report Date</span>
                <span className="text-base font-extrabold text-slate-900 font-mono">{sheetData?.date || selectedDate}</span>
              </div>
            </div>

            {/* Summary Metadata Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-100 border border-slate-300 text-xs mb-6">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Class / Grade</span>
                <span className="font-extrabold text-slate-800">{sheetData?.grade_class}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Enrolled</span>
                <span className="font-extrabold text-slate-800">{sheetData?.summary?.total || 0}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Present (On Time)</span>
                <span className="font-extrabold text-emerald-700">{sheetData?.summary?.present || 0}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Late Arrivals</span>
                <span className="font-extrabold text-amber-700">{sheetData?.summary?.late || 0}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Turnout %</span>
                <span className="font-extrabold text-slate-900">{sheetData?.summary?.attendanceRate || 0}%</span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-300">
                <thead>
                  <tr className="bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b border-slate-300">
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center w-10">No.</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Student ID</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Card UID</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Student Full Name</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Class / Grade</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center">Time In</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center">Time Out</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Signature / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {sheetData?.students?.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-8 text-center text-slate-500">
                        No students enrolled in this class.
                      </td>
                    </tr>
                  ) : (
                    sheetData?.students?.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 border-r border-slate-300 text-center font-mono">{s.no}</td>
                        <td className="py-2 px-3 border-r border-slate-300 font-mono font-semibold">{s.student_id}</td>
                        <td className="py-2 px-3 border-r border-slate-300 font-mono text-[11px] text-slate-600">{s.card_uid}</td>
                        <td className="py-2 px-3 border-r border-slate-300 font-bold text-slate-900">{s.name}</td>
                        <td className="py-2 px-3 border-r border-slate-300 text-[11px]">{s.grade_class}</td>
                        <td className="py-2 px-3 border-r border-slate-300 text-center font-mono font-semibold">
                          {s.check_in_time !== '-' ? s.check_in_time : <span className="text-slate-400">-</span>}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-300 text-center font-mono">
                          {s.check_out_time !== '-' ? s.check_out_time : <span className="text-slate-400">-</span>}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-300 text-center font-bold text-[10px]">
                          <span className={`px-2 py-0.5 rounded ${
                            s.status === 'Present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.status === 'Late'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {s.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[10px] text-center italic">
                          {s.notes || ''}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Formal Signature Blocks */}
            <div className="mt-12 pt-8 border-t border-slate-300 grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs text-slate-700">
              <div>
                <p className="font-bold text-slate-900 mb-8">Class Teacher Signature:</p>
                <div className="border-b border-slate-400 w-44"></div>
                <p className="text-[10px] text-slate-500 mt-1">Date: ________________________</p>
              </div>
              <div>
                <p className="font-bold text-slate-900 mb-8">Attendance Officer / Supervisor:</p>
                <div className="border-b border-slate-400 w-44"></div>
                <p className="text-[10px] text-slate-500 mt-1">Date: ________________________</p>
              </div>
              <div className="hidden sm:block">
                <p className="font-bold text-slate-900 mb-8">Principal Verification Stamp:</p>
                <div className="border border-dashed border-slate-400 h-16 w-32 rounded flex items-center justify-center text-[10px] text-slate-400">
                  OFFICIAL SEAL
                </div>
              </div>
            </div>

          </div>
        )}

        {/* MODE 2: STUDENT TAP ID BADGES */}
        {printMode === 'student_badges' && (
          <div>
            <div className="border-b-2 border-slate-900 pb-3 mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
                  Student Physical Tap ID Badges
                </h2>
                <p className="text-xs text-slate-600">
                  Cut along dashed guidelines. Scannable with 13.56MHz RFID/NFC or QR Code Readers.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {students.length} Badges Ready to Print
              </span>
            </div>

            {/* Badges Grid (4 per row or 2x3 on standard A4) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {students.map((s) => (
                <div
                  key={s.id}
                  className="badge-card border-2 border-dashed border-slate-400 rounded-2xl p-4 bg-white flex flex-col justify-between shadow-sm relative overflow-hidden"
                  style={{ width: '100%', minHeight: '230px' }}
                >
                  {/* Top Bar with School Name */}
                  <div className="bg-slate-900 text-white p-2 rounded-xl mb-3 flex items-center justify-between">
                    <span className="font-black text-[11px] tracking-wide uppercase truncate">
                      Lincoln Academy
                    </span>
                    <span className="text-[9px] font-bold text-brand-300 uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-800">
                      STUDENT PASS
                    </span>
                  </div>

                  {/* Body: Photo, Info, and QR Code */}
                  <div className="flex items-center space-x-3 mb-3">
                    <img
                      src={s.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.student_id}`}
                      alt=""
                      className="w-16 h-16 rounded-xl object-cover border border-slate-300 bg-slate-100"
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-sm text-slate-900 truncate leading-tight">
                        {s.first_name} {s.last_name}
                      </h4>
                      <p className="text-[11px] font-semibold text-slate-600 truncate mt-0.5">
                        {s.grade_class}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        ID: <b className="text-slate-900">{s.student_id}</b>
                      </p>
                    </div>

                    {/* QR Code */}
                    {qrCodes[s.id] && (
                      <div className="border border-slate-200 p-0.5 rounded-lg bg-white">
                        <img src={qrCodes[s.id]} alt="QR" className="w-14 h-14" />
                      </div>
                    )}
                  </div>

                  {/* Card UID & Barcode representation */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px]">
                    <span className="font-mono text-slate-600 font-bold">
                      RFID: <span className="text-slate-900">{s.card_uid}</span>
                    </span>
                    <span className="font-bold text-slate-400 uppercase text-[9px]">
                      TAP TO CHECK IN
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
