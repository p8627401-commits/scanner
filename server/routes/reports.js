const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Daily Class Attendance Sheet for printing
router.get('/daily-sheet', (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const grade_class = req.query.grade_class;

  let studentsQuery = "SELECT * FROM students WHERE status = 'active'";
  const params = [];

  if (grade_class && grade_class !== 'all') {
    studentsQuery += ' AND grade_class = ?';
    params.push(grade_class);
  }

  studentsQuery += ' ORDER BY grade_class ASC, first_name ASC, last_name ASC';
  const students = db.prepare(studentsQuery).all(...params);

  // Fetch all attendance for this date
  const attendanceRecords = db.prepare(`
    SELECT * FROM attendance WHERE date = ?
  `).all(date);

  const attendanceMap = {};
  for (const record of attendanceRecords) {
    if (!attendanceMap[record.student_id]) {
      attendanceMap[record.student_id] = {};
    }
    attendanceMap[record.student_id][record.type] = record;
  }

  const reportStudents = students.map((s, index) => {
    const studentAtt = attendanceMap[s.id] || {};
    const checkIn = studentAtt.check_in;
    const checkOut = studentAtt.check_out;

    let overallStatus = 'Absent';
    if (checkIn) {
      overallStatus = checkIn.status === 'late' ? 'Late' : 'Present';
    }

    return {
      no: index + 1,
      id: s.id,
      student_id: s.student_id,
      card_uid: s.card_uid,
      name: `${s.first_name} ${s.last_name}`,
      grade_class: s.grade_class,
      check_in_time: checkIn ? checkIn.time : '-',
      check_out_time: checkOut ? checkOut.time : '-',
      status: overallStatus,
      notes: checkIn ? checkIn.notes : ''
    };
  });

  const schoolNameSetting = db.prepare("SELECT value FROM settings WHERE key = 'school_name'").get();
  const schoolSubtitleSetting = db.prepare("SELECT value FROM settings WHERE key = 'school_subtitle'").get();

  const total = reportStudents.length;
  const present = reportStudents.filter(s => s.status === 'Present').length;
  const late = reportStudents.filter(s => s.status === 'Late').length;
  const absent = reportStudents.filter(s => s.status === 'Absent').length;

  return res.json({
    school_name: schoolNameSetting ? schoolNameSetting.value : 'School Attendance System',
    school_subtitle: schoolSubtitleSetting ? schoolSubtitleSetting.value : '',
    date,
    grade_class: grade_class || 'All Classes',
    summary: { total, present, late, absent, attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0 },
    students: reportStudents
  });
});

// Student attendance matrix over date range
router.get('/matrix', (req, res) => {
  const { start_date, end_date, grade_class } = req.query;
  const today = new Date().toISOString().split('T')[0];
  const start = start_date || today;
  const end = end_date || today;

  let studentsQuery = "SELECT * FROM students WHERE status = 'active'";
  const params = [];
  if (grade_class && grade_class !== 'all') {
    studentsQuery += ' AND grade_class = ?';
    params.push(grade_class);
  }
  studentsQuery += ' ORDER BY grade_class ASC, first_name ASC';
  const students = db.prepare(studentsQuery).all(...params);

  // Distinct dates in range from attendance
  const dateList = db.prepare(`
    SELECT DISTINCT date FROM attendance 
    WHERE date >= ? AND date <= ? 
    ORDER BY date ASC
  `).all(start, end).map(d => d.date);

  // If no dates have attendance, use today or range
  const daysTracked = Math.max(1, dateList.length);

  const report = students.map(s => {
    const records = db.prepare(`
      SELECT * FROM attendance 
      WHERE student_id = ? AND date >= ? AND date <= ? AND type = 'check_in'
    `).all(s.id, start, end);

    const onTimeCount = records.filter(r => r.status === 'on_time').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    const presentTotal = onTimeCount + lateCount;
    const absentCount = Math.max(0, daysTracked - presentTotal);
    const rate = Math.round((presentTotal / daysTracked) * 100);

    return {
      student_id: s.student_id,
      name: `${s.first_name} ${s.last_name}`,
      grade_class: s.grade_class,
      card_uid: s.card_uid,
      days_tracked: daysTracked,
      on_time: onTimeCount,
      late: lateCount,
      present_total: presentTotal,
      absent: absentCount,
      rate
    };
  });

  return res.json({
    start_date: start,
    end_date: end,
    daysTracked,
    report
  });
});

module.exports = router;
