const express = require('express');
const router = express.Router();
const { db } = require('../db');

// List attendance logs with multi-parameter filtering
router.get('/', (req, res) => {
  const {
    date,
    start_date,
    end_date,
    grade_class,
    status,
    type,
    search,
    limit,
    offset
  } = req.query;

  let query = `
    SELECT 
      a.id, a.student_id, a.card_uid, a.type, a.timestamp, a.date, a.time,
      a.status, a.device_source, a.notes,
      s.student_id as student_code, s.first_name, s.last_name, s.grade_class,
      s.department, s.photo_url
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

  if (type && type !== 'all') {
    query += ' AND a.type = ?';
    params.push(type);
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query += ' AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.student_id LIKE ? OR a.card_uid LIKE ?)';
    params.push(term, term, term, term);
  }

  query += ' ORDER BY a.date DESC, a.time DESC';

  if (limit) {
    query += ' LIMIT ?';
    params.push(Number(limit));
    if (offset) {
      query += ' OFFSET ?';
      params.push(Number(offset));
    }
  }

  const logs = db.prepare(query).all(...params);
  return res.json(logs);
});

// Manual attendance entry
router.post('/manual', (req, res) => {
  const { student_id, type, date, time, status, notes } = req.body;

  if (!student_id || !type || !date || !time) {
    return res.status(400).json({ success: false, message: 'Student ID, Type, Date, and Time are required' });
  }

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  const timestamp = `${date}T${time}.000Z`;
  const insert = db.prepare(`
    INSERT INTO attendance (
      student_id, card_uid, type, timestamp, date, time, status, device_source, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insert.run(
    student.id,
    student.card_uid,
    type,
    timestamp,
    date,
    time,
    status || 'manual',
    'manual_admin_entry',
    notes || 'Manually logged by administrator'
  );

  const newRecord = db.prepare(`
    SELECT a.*, s.student_id as student_code, s.first_name, s.last_name, s.grade_class
    FROM attendance a JOIN students s ON a.student_id = s.id
    WHERE a.id = ?
  `).get(Number(result.lastInsertRowid));

  db.prepare('INSERT INTO system_logs (action, details, timestamp) VALUES (?, ?, ?)')
    .run('MANUAL_ATTENDANCE_CREATED', `Manual ${type} entry added for ${student.first_name} ${student.last_name} on ${date} at ${time}`, new Date().toISOString());

  return res.status(201).json({ success: true, record: newRecord });
});

// Update attendance record
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM attendance WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Attendance record not found' });
  }

  const { type, date, time, status, notes } = req.body;

  const update = db.prepare(`
    UPDATE attendance SET
      type = ?,
      date = ?,
      time = ?,
      timestamp = ?,
      status = ?,
      notes = ?
    WHERE id = ?
  `);

  const newDate = date || existing.date;
  const newTime = time || existing.time;
  const newTimestamp = `${newDate}T${newTime}.000Z`;

  update.run(
    type || existing.type,
    newDate,
    newTime,
    newTimestamp,
    status || existing.status,
    notes !== undefined ? notes : existing.notes,
    id
  );

  const updated = db.prepare(`
    SELECT a.*, s.student_id as student_code, s.first_name, s.last_name, s.grade_class
    FROM attendance a JOIN students s ON a.student_id = s.id
    WHERE a.id = ?
  `).get(id);

  db.prepare('INSERT INTO system_logs (action, details, timestamp) VALUES (?, ?, ?)')
    .run('ATTENDANCE_UPDATED', `Attendance log #${id} updated`, new Date().toISOString());

  return res.json({ success: true, record: updated });
});

// Delete attendance record
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM attendance WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Record not found' });
  }

  db.prepare('DELETE FROM attendance WHERE id = ?').run(id);

  db.prepare('INSERT INTO system_logs (action, details, timestamp) VALUES (?, ?, ?)')
    .run('ATTENDANCE_DELETED', `Deleted attendance log #${id}`, new Date().toISOString());

  return res.json({ success: true, message: 'Attendance log deleted successfully' });
});

// Dashboard stats
router.get('/stats/summary', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const queryDate = req.query.date || today;

  const totalStudents = db.prepare("SELECT COUNT(*) as count FROM students WHERE status = 'active'").get().count;

  const checkInsToday = db.prepare(`
    SELECT COUNT(DISTINCT student_id) as count 
    FROM attendance 
    WHERE date = ? AND type = 'check_in'
  `).get(queryDate).count;

  const onTimeToday = db.prepare(`
    SELECT COUNT(DISTINCT student_id) as count 
    FROM attendance 
    WHERE date = ? AND type = 'check_in' AND status = 'on_time'
  `).get(queryDate).count;

  const lateToday = db.prepare(`
    SELECT COUNT(DISTINCT student_id) as count 
    FROM attendance 
    WHERE date = ? AND type = 'check_in' AND status = 'late'
  `).get(queryDate).count;

  const checkedOutToday = db.prepare(`
    SELECT COUNT(DISTINCT student_id) as count 
    FROM attendance 
    WHERE date = ? AND type = 'check_out'
  `).get(queryDate).count;

  const absentToday = Math.max(0, totalStudents - checkInsToday);
  const attendanceRate = totalStudents > 0 ? Math.round((checkInsToday / totalStudents) * 100) : 0;

  // By class breakdown
  const classBreakdown = db.prepare(`
    SELECT 
      s.grade_class,
      COUNT(DISTINCT s.id) as total_students,
      COUNT(DISTINCT CASE WHEN a.type = 'check_in' THEN a.student_id END) as present_count,
      COUNT(DISTINCT CASE WHEN a.type = 'check_in' AND a.status = 'late' THEN a.student_id END) as late_count
    FROM students s
    LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ?
    WHERE s.status = 'active'
    GROUP BY s.grade_class
    ORDER BY s.grade_class ASC
  `).all(queryDate);

  // Hourly check-in activity for chart
  const hourlyActivity = db.prepare(`
    SELECT 
      substr(time, 1, 2) as hour,
      COUNT(*) as count
    FROM attendance
    WHERE date = ? AND type = 'check_in'
    GROUP BY substr(time, 1, 2)
    ORDER BY hour ASC
  `).all(queryDate);

  // Recent system logs
  const recentLogs = db.prepare(`
    SELECT * FROM system_logs ORDER BY id DESC LIMIT 10
  `).all();

  return res.json({
    date: queryDate,
    totalStudents,
    checkInsToday,
    onTimeToday,
    lateToday,
    absentToday,
    checkedOutToday,
    attendanceRate,
    classBreakdown,
    hourlyActivity,
    recentLogs
  });
});

module.exports = router;
