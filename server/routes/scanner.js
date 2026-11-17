const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Helper to pad numbers
const pad = (n) => String(n).padStart(2, '0');

// Get current local date and time strings
function getNowStrings() {
  const now = new Date();
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  const date = `${year}-${month}-${day}`;
  const time = `${hours}:${minutes}:${seconds}`;
  const timestamp = now.toISOString();

  return { now, date, time, timestamp, hours: now.getHours(), minutes: now.getMinutes() };
}

// Generate friendly greeting
function getGreeting(firstName, type, status) {
  const now = new Date();
  const hour = now.getHours();

  if (type === 'check_out') {
    return `Goodbye, ${firstName}! Have a wonderful rest of your day!`;
  }

  if (status === 'late') {
    return `Welcome, ${firstName}. You are marked as Late today. Please proceed to class.`;
  }

  if (hour < 12) {
    return `Good morning, ${firstName}! Have an inspiring and productive day!`;
  } else if (hour < 17) {
    return `Good afternoon, ${firstName}! Great to see you today!`;
  } else {
    return `Good evening, ${firstName}! Welcome to evening study session!`;
  }
}

// Main Card Tap endpoint
router.post('/tap', (req, res) => {
  const rawUid = req.body.card_uid;
  const requestedMode = req.body.scan_type || 'auto'; // 'auto' | 'check_in' | 'check_out'
  const deviceSource = req.body.device_source || 'usb_hardware_kiosk';

  if (!rawUid || typeof rawUid !== 'string' || !rawUid.trim()) {
    return res.status(400).json({
      success: false,
      error: 'EMPTY_CARD_UID',
      message: 'No card UID received from scanner'
    });
  }

  const cleanUid = rawUid.trim();

  // Find student by card_uid OR student_id
  const student = db.prepare(`
    SELECT * FROM students 
    WHERE UPPER(card_uid) = UPPER(?) OR UPPER(student_id) = UPPER(?)
  `).get(cleanUid, cleanUid);

  const { date, time, timestamp, hours, minutes } = getNowStrings();

  if (!student) {
    // Log unrecognized card
    db.prepare('INSERT INTO system_logs (action, details, timestamp) VALUES (?, ?, ?)')
      .run('SCAN_UNKNOWN_CARD', `Unregistered card tap: [${cleanUid}] on ${deviceSource}`, timestamp);

    return res.status(404).json({
      success: false,
      error: 'CARD_NOT_FOUND',
      card_uid: cleanUid,
      audio: 'error',
      message: `Card [${cleanUid}] is not registered in the system. Please register it in the Admin portal.`
    });
  }

  if (student.status !== 'active') {
    return res.status(403).json({
      success: false,
      error: 'STUDENT_INACTIVE',
      student: {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        status: student.status
      },
      audio: 'error',
      message: `Student account for ${student.first_name} ${student.last_name} is currently ${student.status}.`
    });
  }

  // Get settings for late cutoff & checkout cutoff
  const lateCutoffSetting = db.prepare("SELECT value FROM settings WHERE key = 'late_cutoff_time'").get();
  const lateCutoff = lateCutoffSetting ? lateCutoffSetting.value : '08:00';

  const checkoutCutoffSetting = db.prepare("SELECT value FROM settings WHERE key = 'checkout_cutoff_time'").get();
  const checkoutCutoff = checkoutCutoffSetting ? checkoutCutoffSetting.value : '15:00';

  // Check today's existing attendance records for this student
  const todayRecords = db.prepare(`
    SELECT * FROM attendance 
    WHERE student_id = ? AND date = ? 
    ORDER BY id DESC
  `).all(student.id, date);

  const checkInRecord = todayRecords.find(r => r.type === 'check_in');
  const checkOutRecord = todayRecords.find(r => r.type === 'check_out');

  // Debounce check: if tapped within last 25 seconds with same recent action
  if (todayRecords.length > 0) {
    const lastRecord = todayRecords[0];
    const lastTime = new Date(lastRecord.timestamp).getTime();
    const nowTime = new Date(timestamp).getTime();
    const diffSeconds = (nowTime - lastTime) / 1000;

    if (diffSeconds < 25) {
      return res.json({
        success: true,
        debounced: true,
        action: lastRecord.type,
        audio: 'warning',
        student: {
          id: student.id,
          student_id: student.student_id,
          card_uid: student.card_uid,
          first_name: student.first_name,
          last_name: student.last_name,
          grade_class: student.grade_class,
          department: student.department,
          photo_url: student.photo_url
        },
        attendance: lastRecord,
        greeting: `Card already tapped just now (${Math.round(diffSeconds)}s ago)!`,
        message: `Already recorded: ${lastRecord.type === 'check_in' ? 'Checked In' : 'Checked Out'} at ${lastRecord.time}`
      });
    }
  }

  // Determine action: check_in or check_out
  let actionType = 'check_in';
  if (requestedMode === 'check_out') {
    actionType = 'check_out';
  } else if (requestedMode === 'check_in') {
    actionType = 'check_in';
  } else {
    // Auto Mode:
    if (!checkInRecord) {
      actionType = 'check_in';
    } else if (!checkOutRecord) {
      actionType = 'check_out';
    } else {
      // Both exist; default to check_in again or check_out
      actionType = 'check_out';
    }
  }

  // Determine status
  let status = 'on_time';
  let audio = 'success';

  if (actionType === 'check_in') {
    const [cutH, cutM] = lateCutoff.split(':').map(Number);
    const lateThresholdMinutes = cutH * 60 + cutM;
    const currentMinutes = hours * 60 + minutes;

    if (currentMinutes > lateThresholdMinutes) {
      status = 'late';
      audio = 'warning';
    } else {
      status = 'on_time';
      audio = 'success';
    }
  } else {
    // Check out
    const [cutOutH, cutOutM] = checkoutCutoff.split(':').map(Number);
    const checkoutThresholdMinutes = cutOutH * 60 + cutOutM;
    const currentMinutes = hours * 60 + minutes;

    if (currentMinutes < checkoutThresholdMinutes) {
      status = 'early_departure';
      audio = 'checkout';
    } else {
      status = 'checked_out';
      audio = 'checkout';
    }
  }

  // Insert attendance record
  const insertStmt = db.prepare(`
    INSERT INTO attendance (
      student_id, card_uid, type, timestamp, date, time, status, device_source, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insertStmt.run(
    student.id,
    cleanUid,
    actionType,
    timestamp,
    date,
    time,
    status,
    deviceSource,
    actionType === 'check_in' ? (status === 'late' ? 'Late arrival' : 'On-time arrival') : 'Regular tap check-out'
  );

  const newRecordId = Number(result.lastInsertRowid);
  const attendanceRecord = db.prepare('SELECT * FROM attendance WHERE id = ?').get(newRecordId);

  // System log
  db.prepare('INSERT INTO system_logs (action, details, timestamp) VALUES (?, ?, ?)')
    .run(
      'SCAN_ATTENDANCE',
      `Card [${cleanUid}] - ${student.first_name} ${student.last_name} (${student.student_id}) - ${actionType.toUpperCase()} [${status}]`,
      timestamp
    );

  const greeting = getGreeting(student.first_name, actionType, status);

  return res.json({
    success: true,
    action: actionType,
    status,
    audio,
    student: {
      id: student.id,
      student_id: student.student_id,
      card_uid: student.card_uid,
      first_name: student.first_name,
      last_name: student.last_name,
      grade_class: student.grade_class,
      department: student.department,
      photo_url: student.photo_url
    },
    attendance: attendanceRecord,
    greeting,
    message: `${actionType === 'check_in' ? 'Check-in' : 'Check-out'} recorded successfully at ${time}`
  });
});

// Get recent scans for live kiosk ticker
router.get('/recent', (req, res) => {
  const { date } = getNowStrings();
  const limit = Math.min(Number(req.query.limit) || 12, 50);

  const scans = db.prepare(`
    SELECT 
      a.id, a.type, a.timestamp, a.date, a.time, a.status, a.card_uid,
      s.id as student_id, s.student_id as student_code, s.first_name, s.last_name,
      s.grade_class, s.photo_url, s.department
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    WHERE a.date = ?
    ORDER BY a.id DESC
    LIMIT ?
  `).all(date, limit);

  return res.json({
    date,
    scans
  });
});

// Quick kiosk summary stats
router.get('/stats', (req, res) => {
  const { date } = getNowStrings();

  const totalStudents = db.prepare("SELECT COUNT(*) as count FROM students WHERE status = 'active'").get().count;

  const presentToday = db.prepare(`
    SELECT COUNT(DISTINCT student_id) as count 
    FROM attendance 
    WHERE date = ? AND type = 'check_in'
  `).get(date).count;

  const lateToday = db.prepare(`
    SELECT COUNT(DISTINCT student_id) as count 
    FROM attendance 
    WHERE date = ? AND type = 'check_in' AND status = 'late'
  `).get(date).count;

  const onTimeToday = Math.max(0, presentToday - lateToday);
  const absentToday = Math.max(0, totalStudents - presentToday);
  const attendanceRate = totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0;

  return res.json({
    date,
    totalStudents,
    presentToday,
    onTimeToday,
    lateToday,
    absentToday,
    attendanceRate
  });
});

// Verify Kiosk Exit PIN
router.post('/verify-pin', (req, res) => {
  const { pin } = req.body;
  const pinSetting = db.prepare("SELECT value FROM settings WHERE key = 'kiosk_exit_pin'").get();
  const validPin = pinSetting ? pinSetting.value : '1234';

  if (String(pin).trim() === String(validPin).trim()) {
    return res.json({ success: true, message: 'PIN verified' });
  }

  return res.status(403).json({ success: false, message: 'Invalid Kiosk PIN' });
});

module.exports = router;
