const express = require('express');
const router = express.Router();
const { db } = require('../db');

function escapeCsv(field) {
  if (field === null || field === undefined) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

// Export Attendance Logs to CSV
router.get('/attendance.csv', (req, res) => {
  const { date, start_date, end_date, grade_class, status } = req.query;

  let query = `
    SELECT 
      a.id, a.date, a.time, a.type, a.status, a.card_uid, a.device_source, a.notes,
      s.student_id as student_code, s.first_name, s.last_name, s.grade_class, s.department
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (date) {
    query += ' AND a.date = ?';
    params.push(date);
  } else {
    if (start_date) {
      query += ' AND a.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND a.date <= ?';
      params.push(end_date);
    }
  }

  if (grade_class && grade_class !== 'all') {
    query += ' AND s.grade_class = ?';
    params.push(grade_class);
  }

  if (status && status !== 'all') {
    query += ' AND a.status = ?';
    params.push(status);
  }

  query += ' ORDER BY a.date DESC, a.time DESC';

  const rows = db.prepare(query).all(...params);

  const headers = [
    'Log ID',
    'Date',
    'Time',
    'Action Type',
    'Status',
    'Student ID',
    'First Name',
    'Last Name',
    'Class / Grade',
    'Department',
    'Physical Card UID',
    'Device Source',
    'Notes'
  ];

  let csv = '\uFEFF' + headers.map(escapeCsv).join(',') + '\r\n';

  for (const r of rows) {
    const line = [
      r.id,
      r.date,
      r.time,
      r.type.toUpperCase(),
      r.status.toUpperCase(),
      r.student_code,
      r.first_name,
      r.last_name,
      r.grade_class,
      r.department,
      r.card_uid,
      r.device_source,
      r.notes
    ].map(escapeCsv).join(',');
    csv += line + '\r\n';
  }

  const filename = `attendance_export_${date || start_date || 'all'}_${Date.now()}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(csv);
});

// Export Students list to CSV
router.get('/students.csv', (req, res) => {
  const { grade_class, status } = req.query;

  let query = 'SELECT * FROM students WHERE 1=1';
  const params = [];

  if (grade_class && grade_class !== 'all') {
    query += ' AND grade_class = ?';
    params.push(grade_class);
  }

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY grade_class ASC, first_name ASC';

  const rows = db.prepare(query).all(...params);

  const headers = [
    'Database ID',
    'Student ID',
    'Card UID',
    'First Name',
    'Last Name',
    'Gender',
    'Class / Grade',
    'Department',
    'Email',
    'Phone',
    'Parent Phone',
    'Status',
    'Created At'
  ];

  let csv = '\uFEFF' + headers.map(escapeCsv).join(',') + '\r\n';

  for (const r of rows) {
    const line = [
      r.id,
      r.student_id,
      r.card_uid,
      r.first_name,
      r.last_name,
      r.gender,
      r.grade_class,
      r.department,
      r.email,
      r.phone,
      r.parent_phone,
      r.status,
      r.created_at
    ].map(escapeCsv).join(',');
    csv += line + '\r\n';
  }

  const filename = `students_registry_${Date.now()}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(csv);
});

module.exports = router;
