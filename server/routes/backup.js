const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { db, dbPath, initSchema } = require('../db');

const upload = multer({
  dest: path.resolve(__dirname, '../uploads/temp'),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Download full system backup as JSON
router.get('/download-json', (req, res) => {
  const students = db.prepare('SELECT * FROM students').all();
  const attendance = db.prepare('SELECT * FROM attendance').all();
  const classes = db.prepare('SELECT * FROM classes').all();
  const settings = db.prepare('SELECT * FROM settings').all();
  const system_logs = db.prepare('SELECT * FROM system_logs ORDER BY id DESC LIMIT 500').all();

  const now = new Date();
  const timestamp = now.toISOString();
  const fileDate = timestamp.replace(/[:.]/g, '-').slice(0, 19);

  const backupPayload = {
    app: 'SmartCard Attendance System',
    version: '1.0.0',
    timestamp,
    counts: {
      students: students.length,
      attendance: attendance.length,
      classes: classes.length,
      settings: settings.length
    },
    data: {
      students,
      attendance,
      classes,
      settings,
      system_logs
    }
  };

  const jsonStr = JSON.stringify(backupPayload, null, 2);
  const filename = `attendance_backup_${fileDate}.json`;

  db.prepare('INSERT INTO system_logs (action, details, timestamp) VALUES (?, ?, ?)')
    .run('BACKUP_DOWNLOADED', `Full JSON backup generated with ${students.length} students and ${attendance.length} attendance records`, timestamp);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(jsonStr);
});

// Download raw SQLite .db file directly
router.get('/download-db', (req, res) => {
  if (!fs.existsSync(dbPath)) {
    return res.status(404).json({ success: false, message: 'Database file not found' });
  }

  const filename = `attendance_database_${Date.now()}.db`;
  res.download(dbPath, filename, (err) => {
    if (!err) {
      db.prepare('INSERT INTO system_logs (action, details, timestamp) VALUES (?, ?, ?)')
        .run('DB_FILE_DOWNLOADED', 'Raw SQLite database binary downloaded', new Date().toISOString());
    }
  });
});

// Restore from uploaded JSON backup file
router.post('/restore', upload.single('backup_file'), (req, res) => {
  try {
    let payload;

    if (req.file) {
      const fileContent = fs.readFileSync(req.file.path, 'utf8');
      payload = JSON.parse(fileContent);
      fs.unlinkSync(req.file.path); // cleanup temp
    } else if (req.body && req.body.data) {
      payload = req.body;
    } else {
      return res.status(400).json({ success: false, message: 'No backup file or data provided' });
    }

    if (!payload.data || !payload.data.students) {
      return res.status(400).json({ success: false, message: 'Invalid backup format: missing students data' });
    }

    const { students = [], attendance = [], classes = [], settings = [] } = payload.data;

    // Begin restoring tables
    db.exec('BEGIN TRANSACTION;');

    try {
      // Clear current data
      db.exec('DELETE FROM attendance;');
      db.exec('DELETE FROM students;');
      db.exec('DELETE FROM classes;');

      // Restore classes
      const insertClass = db.prepare('INSERT INTO classes (id, name, room, teacher) VALUES (?, ?, ?, ?)');
      for (const c of classes) {
        insertClass.run(c.id, c.name, c.room || '', c.teacher || '');
      }

      // Restore students
      const insertStudent = db.prepare(`
        INSERT INTO students (
          id, student_id, card_uid, first_name, last_name, gender,
          grade_class, department, email, phone, parent_phone,
          photo_url, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of students) {
        insertStudent.run(
          s.id,
          s.student_id,
          s.card_uid,
          s.first_name,
          s.last_name,
          s.gender || 'Other',
          s.grade_class,
          s.department || '',
          s.email || '',
          s.phone || '',
          s.parent_phone || '',
          s.photo_url || '',
          s.status || 'active',
          s.created_at || new Date().toISOString()
        );
      }

      // Restore attendance
      const insertAtt = db.prepare(`
        INSERT INTO attendance (
          id, student_id, card_uid, type, timestamp, date, time, status, device_source, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const a of attendance) {
        insertAtt.run(
          a.id,
          a.student_id,
          a.card_uid,
          a.type,
          a.timestamp,
          a.date,
          a.time,
          a.status,
          a.device_source || 'restored_backup',
          a.notes || ''
        );
      }

      // Restore settings (optional update)
      const updateSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      for (const st of settings) {
        updateSetting.run(st.key, st.value);
      }

      const logStmt = db.prepare('INSERT INTO system_logs (action, details, timestamp) VALUES (?, ?, ?)');
      logStmt.run('RESTORE_SUCCESS', `Restored ${students.length} students and ${attendance.length} attendance records from backup dated ${payload.timestamp || 'unknown'}`, new Date().toISOString());

      db.exec('COMMIT;');

      return res.json({
        success: true,
        message: 'System restored successfully!',
        stats: {
          students: students.length,
          attendance: attendance.length,
          classes: classes.length
        }
      });
    } catch (innerErr) {
      db.exec('ROLLBACK;');
      throw innerErr;
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Restore failed: ' + err.message });
  }
});

// Reset database with fresh demo data
router.post('/reset-demo', (req, res) => {
  try {
    db.exec('BEGIN TRANSACTION;');
    db.exec('DELETE FROM attendance;');
    db.exec('DELETE FROM students;');
    db.exec('DELETE FROM classes;');
    db.exec('DELETE FROM settings;');
    db.exec('DELETE FROM system_logs;');
    db.exec('COMMIT;');

    initSchema();

    return res.json({ success: true, message: 'Database reset to initial demo state successfully' });
  } catch (err) {
    db.exec('ROLLBACK;');
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
