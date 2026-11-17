const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'attendance.db');
const db = new DatabaseSync(dbPath);

// Initialize Tables
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      room TEXT,
      teacher TEXT
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT UNIQUE NOT NULL,
      card_uid TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      gender TEXT DEFAULT 'Other',
      grade_class TEXT NOT NULL,
      department TEXT,
      email TEXT,
      phone TEXT,
      parent_phone TEXT,
      photo_url TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      card_uid TEXT NOT NULL,
      type TEXT NOT NULL, -- 'check_in' or 'check_out'
      timestamp TEXT NOT NULL,
      date TEXT NOT NULL, -- YYYY-MM-DD
      time TEXT NOT NULL, -- HH:mm:ss
      status TEXT NOT NULL, -- 'on_time', 'late', 'early_departure', 'manual'
      device_source TEXT DEFAULT 'usb_hardware_kiosk',
      notes TEXT,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_students_card ON students(card_uid);
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
    CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
  `);

  // Default Settings
  const defaultSettings = [
    ['school_name', 'Lincoln Science & Technology High School'],
    ['school_subtitle', 'SmartCard Attendance System'],
    ['late_cutoff_time', '08:00'],
    ['checkout_cutoff_time', '15:00'],
    ['scanner_sound', 'true'],
    ['scanner_mode', 'auto'], // 'auto', 'check_in', 'check_out'
    ['admin_username', 'admin'],
    ['admin_password', 'admin123'],
    ['kiosk_exit_pin', '1234']
  ];

  const getSetting = db.prepare('SELECT value FROM settings WHERE key = ?');
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');

  for (const [key, value] of defaultSettings) {
    insertSetting.run(key, value);
  }

  // Seed sample classes if empty
  const countClasses = db.prepare('SELECT COUNT(*) as count FROM classes').get();
  if (countClasses.count === 0) {
    const insertClass = db.prepare('INSERT INTO classes (name, room, teacher) VALUES (?, ?, ?)');
    insertClass.run('Grade 10-A (Science)', 'Room 101', 'Dr. Alan Grant');
    insertClass.run('Grade 10-B (Arts)', 'Room 102', 'Ms. Sarah Connor');
    insertClass.run('Grade 11-A (Engineering)', 'Lab 201', 'Mr. Tony Stark');
    insertClass.run('Grade 11-B (Business)', 'Room 202', 'Prof. Charles Xavier');
    insertClass.run('Grade 12-A (Advanced Placement)', 'Auditorium A', 'Dr. Bruce Banner');
  }

  // Seed sample students if empty
  const countStudents = db.prepare('SELECT COUNT(*) as count FROM students').get();
  if (countStudents.count === 0) {
    const insertStudent = db.prepare(`
      INSERT INTO students (
        student_id, card_uid, first_name, last_name, gender,
        grade_class, department, email, phone, parent_phone,
        photo_url, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    const sampleStudents = [
      ['STU-2026-001', '1098234751', 'Sophia', 'Vandeth', 'Female', 'Grade 10-A (Science)', 'STEM', 'sophia.v@lincoln.edu', '+1 555-0101', '+1 555-0199', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces', 'active', now],
      ['STU-2026-002', '04A8F91B2C', 'Phally', 'Kosal', 'Male', 'Grade 11-A (Engineering)', 'Engineering', 'phally.k@lincoln.edu', '+1 555-0102', '+1 555-0198', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces', 'active', now],
      ['STU-2026-003', 'CARD-001', 'Marcus', 'Chen', 'Male', 'Grade 10-A (Science)', 'STEM', 'marcus.c@lincoln.edu', '+1 555-0103', '+1 555-0197', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces', 'active', now],
      ['STU-2026-004', 'CARD-002', 'Emma', 'Watson', 'Female', 'Grade 12-A (Advanced Placement)', 'Humanities', 'emma.w@lincoln.edu', '+1 555-0104', '+1 555-0196', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces', 'active', now],
      ['STU-2026-005', 'CARD-003', 'Lucas', 'Silva', 'Male', 'Grade 10-B (Arts)', 'Visual Arts', 'lucas.s@lincoln.edu', '+1 555-0105', '+1 555-0195', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces', 'active', now],
      ['STU-2026-006', 'CARD-004', 'Aria', 'Montgomery', 'Female', 'Grade 11-B (Business)', 'Economics', 'aria.m@lincoln.edu', '+1 555-0106', '+1 555-0194', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=faces', 'active', now],
      ['STU-2026-007', 'CARD-005', 'David', 'Kim', 'Male', 'Grade 11-A (Engineering)', 'Robotics', 'david.k@lincoln.edu', '+1 555-0107', '+1 555-0193', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&h=200&fit=crop&crop=faces', 'active', now],
      ['STU-2026-008', 'CARD-006', 'Elena', 'Rostova', 'Female', 'Grade 12-A (Advanced Placement)', 'STEM', 'elena.r@lincoln.edu', '+1 555-0108', '+1 555-0192', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop&crop=faces', 'active', now],
      ['STU-2026-009', '12345678', 'Jordan', 'Taylor', 'Other', 'Grade 10-B (Arts)', 'Media', 'jordan.t@lincoln.edu', '+1 555-0109', '+1 555-0191', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces', 'active', now],
      ['STU-2026-010', 'A1B2C3D4', 'Noah', 'Wilson', 'Male', 'Grade 11-B (Business)', 'Management', 'noah.w@lincoln.edu', '+1 555-0110', '+1 555-0190', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop&crop=faces', 'active', now]
    ];

    for (const s of sampleStudents) {
      insertStudent.run(...s);
    }

    // Seed some initial attendance for today and yesterday so stats look rich immediately
    const today = new Date().toISOString().split('T')[0];
    const insertAtt = db.prepare(`
      INSERT INTO attendance (student_id, card_uid, type, timestamp, date, time, status, device_source, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Sophia checked in on time today at 07:42
    insertAtt.run(1, '1098234751', 'check_in', `${today}T07:42:15.000Z`, today, '07:42:15', 'on_time', 'usb_hardware_kiosk', 'Morning check-in');
    // Phally checked in on time today at 07:51
    insertAtt.run(2, '04A8F91B2C', 'check_in', `${today}T07:51:30.000Z`, today, '07:51:30', 'on_time', 'usb_hardware_kiosk', 'Morning check-in');
    // Marcus arrived late at 08:14
    insertAtt.run(3, 'CARD-001', 'check_in', `${today}T08:14:02.000Z`, today, '08:14:02', 'late', 'usb_hardware_kiosk', 'Late arrival');
    // Emma checked in at 07:35
    insertAtt.run(4, 'CARD-002', 'check_in', `${today}T07:35:50.000Z`, today, '07:35:50', 'on_time', 'usb_hardware_kiosk', 'Morning check-in');
  }

  // Log system startup
  const insertLog = db.prepare('INSERT INTO system_logs (action, details, timestamp) VALUES (?, ?, ?)');
  insertLog.run('SYSTEM_START', 'Database initialized successfully', new Date().toISOString());
}

initSchema();

module.exports = {
  db,
  dbPath,
  initSchema
};
