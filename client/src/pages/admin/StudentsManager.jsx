import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  CreditCard, 
  Printer, 
  Edit3, 
  Trash2, 
  Camera, 
  Upload, 
  Check, 
  XCircle, 
  Zap, 
  Radio, 
  Sparkles,
  Phone,
  Mail,
  GraduationCap
} from 'lucide-react';
import { useHardwareScanner } from '../../hooks/useHardwareScanner';

export default function StudentsManager() {
  const [students, setStudents] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isScanningForCard, setIsScanningForCard] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Student Form
  const [form, setForm] = useState({
    student_id: '',
    card_uid: '',
    first_name: '',
    last_name: '',
    gender: 'Male',
    grade_class: '',
    department: 'STEM',
    email: '',
    phone: '',
    parent_phone: '',
    photo_url: '',
    status: 'active'
  });

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, [selectedClass, selectedStatus, searchTerm]);

  async function fetchStudents() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClass !== 'all') params.append('grade_class', selectedClass);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await fetch(`/api/students?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchClasses() {
    try {
      const res = await fetch('/api/students/classes');
      if (res.ok) {
        const data = await res.json();
        setClassesList(data);
        if (data.length > 0 && !form.grade_class) {
          setForm(prev => ({ ...prev, grade_class: data[0].name }));
        }
      }
    } catch (e) {
      console.warn('Error fetching classes:', e);
    }
  }

  // Intercept USB Hardware scanner specifically when user is assigning card in the modal
  useHardwareScanner((scannedUid) => {
    if (showModal && isScanningForCard) {
      setForm(prev => ({ ...prev, card_uid: scannedUid.trim() }));
      setIsScanningForCard(false);
    }
  }, { enabled: showModal && isScanningForCard });

  function openAddModal() {
    setEditingStudent(null);
    const randomId = 'STU-2026-' + String(Math.floor(Math.random() * 900) + 100);
    setForm({
      student_id: randomId,
      card_uid: '',
      first_name: '',
      last_name: '',
      gender: 'Male',
      grade_class: classesList[0]?.name || 'Grade 10-A (Science)',
      department: 'STEM',
      email: '',
      phone: '',
      parent_phone: '',
      photo_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomId}`,
      status: 'active'
    });
    setIsScanningForCard(false);
    setShowModal(true);
  }

  function openEditModal(s) {
    setEditingStudent(s);
    setForm({
      student_id: s.student_id,
      card_uid: s.card_uid,
      first_name: s.first_name,
      last_name: s.last_name,
      gender: s.gender || 'Male',
      grade_class: s.grade_class,
      department: s.department || 'STEM',
      email: s.email || '',
      phone: s.phone || '',
      parent_phone: s.parent_phone || '',
      photo_url: s.photo_url || '',
      status: s.status || 'active'
    });
    setIsScanningForCard(false);
    setShowModal(true);
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await fetch('/api/students/upload-photo', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setForm(prev => ({ ...prev, photo_url: data.photo_url }));
      } else {
        alert(data.message || 'Photo upload failed');
      }
    } catch (err) {
      alert('Upload error: ' + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.student_id.trim() || !form.card_uid.trim() || !form.first_name.trim() || !form.last_name.trim()) {
      return alert('Student ID, Card UID, First Name, and Last Name are required.');
    }

    try {
      const url = editingStudent ? `/api/students/${editingStudent.id}` : '/api/students';
      const method = editingStudent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setShowModal(false);
        fetchStudents();
      } else {
        alert(data.message || 'Error saving student');
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  }

  async function handleDelete(s) {
    if (!confirm(`Delete student ${s.first_name} ${s.last_name} (${s.student_id}) and all their attendance logs?`)) return;

    try {
      const res = await fetch(`/api/students/${s.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchStudents();
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-brand-400" />
            Student & SmartCard Registry
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Enroll students, map physical USB RFID/NFC cards, and manage profiles
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/25 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Student</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center gap-3">
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

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Students Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Registered Students: <b>{students.length}</b></span>
          <span>Physical cards mapped</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 bg-slate-950/60 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Student</th>
                <th className="py-3 px-4 font-semibold">Student ID</th>
                <th className="py-3 px-4 font-semibold">Physical Card UID</th>
                <th className="py-3 px-4 font-semibold">Class / Grade</th>
                <th className="py-3 px-4 font-semibold">Department</th>
                <th className="py-3 px-4 font-semibold">Contact</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    Loading student directory...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    No students found matching your filters.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition">
                    
                    {/* Student Photo & Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={s.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.student_id}`}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover border border-slate-700 bg-slate-800"
                        />
                        <div>
                          <span className="font-bold text-white block">
                            {s.first_name} {s.last_name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {s.gender}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Student ID */}
                    <td className="py-3 px-4 font-mono font-semibold text-slate-200">
                      {s.student_id}
                    </td>

                    {/* Physical Card UID */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-brand-300 bg-brand-950/80 px-2 py-0.5 rounded-lg border border-brand-800/60 font-semibold">
                        <CreditCard className="w-3 h-3 text-brand-400" />
                        {s.card_uid}
                      </span>
                    </td>

                    {/* Class */}
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      {s.grade_class}
                    </td>

                    {/* Department */}
                    <td className="py-3 px-4 text-slate-400">
                      {s.department || '-'}
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      <div>{s.email || '-'}</div>
                      <div className="text-slate-500">{s.phone || '-'}</div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        s.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/15 text-red-400 border border-red-500/30'
                      }`}>
                        {s.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Edit Student"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                          title="Delete Student"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Add / Edit Student Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl animate-card-pop my-8">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-brand-400" />
                <h3 className="text-lg font-bold text-white">
                  {editingStudent ? 'Edit Student Profile' : 'Enroll New Student & Map Tap Card'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {/* Photo & Scanner Assistant */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="relative group">
                  <img
                    src={form.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${form.student_id}`}
                    alt="Preview"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-700 bg-slate-900"
                  />
                  <label className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition">
                    <Camera className="w-5 h-5 text-white" />
                    <span className="text-[9px] text-white mt-1">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <h4 className="font-bold text-slate-200">Student Profile Photo</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click avatar to upload JPEG/PNG photo, or avatar will generate automatically.
                  </p>
                  {uploadingPhoto && <p className="text-[11px] text-brand-400 font-medium">Uploading image...</p>}
                </div>
              </div>

              {/* USB Hardware Card UID Scanner Trigger */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-950/80 to-indigo-950/80 border border-brand-500/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white uppercase tracking-wider text-[11px]">Physical USB Card Reader Helper</span>
                  </div>
                  {isScanningForCard ? (
                    <span className="text-amber-400 font-semibold animate-pulse flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5" /> Tap card on USB hardware now...
                    </span>
                  ) : (
                    <span className="text-slate-400">Ready</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <CreditCard className="w-4 h-4 text-brand-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1098234751 or 04A8F91B2C"
                      value={form.card_uid}
                      onChange={(e) => setForm({ ...form, card_uid: e.target.value })}
                      className="w-full bg-slate-900 border border-brand-500/40 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white font-bold focus:outline-none focus:border-brand-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsScanningForCard(!isScanningForCard)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                      isScanningForCard
                        ? 'bg-amber-500 text-slate-950 animate-pulse'
                        : 'bg-brand-600 hover:bg-brand-500 text-white'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>{isScanningForCard ? 'Listening...' : 'Tap Card to Read'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const randomUid = 'CARD-' + Math.floor(100000 + Math.random() * 900000);
                      setForm(prev => ({ ...prev, card_uid: randomUid }));
                    }}
                    className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                    title="Generate Random Card UID"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  Click "Tap Card to Read" and tap the RFID/NFC card on your USB hardware scanner to auto-fill the card number!
                </p>
              </div>

              {/* Student ID & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Student ID Code</label>
                  <input
                    type="text"
                    required
                    value={form.student_id}
                    onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-brand-500"
                    placeholder="STU-2026-001"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Account Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* First & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Gender & Class */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Class / Grade</label>
                  <select
                    required
                    value={form.grade_class}
                    onChange={(e) => setForm({ ...form, grade_class: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  >
                    {classesList.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                    placeholder="student@school.edu"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Parent Phone</label>
                  <input
                    type="text"
                    value={form.parent_phone}
                    onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                    placeholder="+1 555-0199"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-lg shadow-brand-500/25"
                >
                  {editingStudent ? 'Save Changes' : 'Enroll Student'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
