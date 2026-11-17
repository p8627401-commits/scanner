const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../db');

// Setup file uploads directory
const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueName = 'student_' + Date.now() + '_' + Math.round(Math.random() * 1E9) + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload student photo
router.post('/upload-photo', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  return res.json({ success: true, photo_url: fileUrl, filename: req.file.filename });
});

// List all classes
router.get('/classes', (req, res) => {
  const classes = db.prepare('SELECT * FROM classes ORDER BY name ASC').all();
  return res.json(classes);
});

// Add a new class
router.post('/classes', (req, res) => {
  const { name, room, teacher } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Class name is required' });
  }

  try {
    const insert = db.prepare('INSERT INTO classes (name, room, teacher) VALUES (?, ?, ?)');
    const result = insert.run(name.trim(), room || '', teacher || '');
    const newClass = db.prepare('SELECT * FROM classes WHERE id = ?').get(Number(result.lastInsertRowid));
    return res.status(201).json(newClass);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message.includes('UNIQUE') ? 'Class name already exists' : err.message });
  }
});

// List students with filter and search
router.get('/', (req, res) => {
  const { search, grade_class, status } = req.query;

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

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query += ' AND (first_name LIKE ? OR last_name LIKE ? OR student_id LIKE ? OR card_uid LIKE ? OR email LIKE ?)';
    params.push(term, term, term, term, term);
  }

  query += ' ORDER BY first_name ASC, last_name ASC';

  const students = db.prepare(query).all(...params);
  return res.json(students);
});

// Get single student
router.get('/:id', (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  // Also fetch attendance summary for this student
  const attendanceHistory = db.prepare(`
    SELECT * FROM attendance 
    WHERE student_id = ? 
    ORDER BY date DESC, time DESC 
    LIMIT 30
  `).all(student.id);

  return res.json({ student, attendanceHistory });
});

// Create new student
router.post('/', (req, res) => {
  const {
    student_id, card_uid, first_name, last_name, gender,
    grade_class, department, email, phone, parent_phone,
    photo_url, status
  } = req.body;

  if (!student_id || !card_uid || !first_name || !last_name || !grade_class) {
    return res.status(400).json({
      success: false,
      message: 'Student ID, Card UID, First Name, Last Name, and Class are required.'
    });
  }

  // Check unique constraints
  const existingId = db.prepare('SELECT id FROM students WHERE UPPER(student_id) = UPPER(?)').get(student_id.trim());
  if (existingId) {
    return res.status(400).json({ success: false, message: `Student ID "${student_id}" is already assigned to another student.` });
  }

  const existingCard = db.prepare('SELECT id, first_name, last_name FROM students WHERE UPPER(card_uid) = UPPER(?)').get(card_uid.trim());
  if (existingCard) {
    return res.status(400).json({
      success: false,
      message: `Card UID "${card_uid}" is already assigned to ${existingCard.first_name} ${existingCard.last_name}.`
    });
  }

  const now = new Date().toISOString();
  const defaultPhoto = photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student_id)}`;

  try {
    const insert = db.prepare(`
      INSERT INTO students (
        student_id, card_uid, first_name, last_name, gender,
        grade_class, department, email, phone, parent_phone,
        photo_url, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      student_id.trim(),
      card_uid.trim(),
      first_name.trim(),
      last_name.trim(),
      gender || 'Other',
      grade_class.trim(),
      department || 'General',
      email || '',
      phone || '',
      parent_phone || '',
      defaultPhoto,
      status || 'active',
      now
    );

    const newStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(Number(result.lastInsertRowid));

    db.prepare('INSERT INTO system_logs (action, details, timestamp) VALUES (?, ?, ?)')
      .run('STUDENT_CREATED', `Added student ${newStudent.first_name} ${newStudent.last_name} (${newStudent.student_id}) with Card UID: ${newStudent.card_uid}`, now);

    return res.status(201).json({ success: true, student: newStudent });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Update student
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  const {
    student_id, card_uid, first_name, last_name, gender,
    grade_class, department, email, phone, parent_phone,
    photo_url, status
  } = req.body;

  // Check unique constraints if changed
  if (student_id && student_id.trim().toUpperCase() !== existing.student_id.toUpperCase()) {
    const clashId = db.prepare('SELECT id FROM students WHERE UPPER(student_id) = UPPER(?) AND id != ?').get(student_id.trim(), id);
    if (clashId) {
      return res.status(400).json({ success: false, message: `Student ID "${student_id}" is already assigned to another student.` });
    }
  }

  if (card_uid && card_uid.trim().toUpperCase() !== existing.card_uid.toUpperCase()) {
    const clashCard = db.prepare('SELECT id, first_name, last_name FROM students WHERE UPPER(card_uid) = UPPER(?) AND id != ?').get(card_uid.trim(), id);
    if (clashCard) {
      return res.status(400).json({
        success: false,
        message: `Card UID "${card_uid}" is already assigned to ${clashCard.first_name} ${clashCard.last_name}.`
      });
    }
  }

  try {
    const update = db.prepare(`
      UPDATE students SET
        student_id = ?,
        card_uid = ?,
        first_name = ?,
        last_name = ?,
        gender = ?,
        grade_class = ?,
        department = ?,
        email = ?,
        phone = ?,
        parent_phone = ?,
        photo_url = ?,
        status = ?
      WHERE id = ?
    `);

    update.run(
      student_id ? student_id.trim() : existing.student_id,
      card_uid ? card_uid.trim() : existing.card_uid,
      first_name ? first_name.trim() : existing.first_name,
      last_name ? last_name.trim() : existing.last_name,
      gender || existing.gender,
      grade_class ? grade_class.trim() : existing.grade_class,
      department !== undefined ? department : existing.department,
      email !== undefined ? email : existing.email,
      phone !== undefined ? phone : existing.phone,
      parent_phone !== undefined ? parent_phone : existing.parent_phone,
      photo_url !== undefined ? photo_url : existing.photo_url,
      status || existing.status,
      id
    );

    const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(id);

    db.prepare('INSERT INTO system_logs (action, details, timestamp) VALUES (?, ?, ?)')
      .run('STUDENT_UPDATED', `Updated student ${updated.first_name} ${updated.last_name} (${updated.student_id})`, new Date().toISOString());

    return res.json({ success: true, student: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Delete student
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  // Delete student attendance and student record
  db.prepare('DELETE FROM attendance WHERE student_id = ?').run(id);
  db.prepare('DELETE FROM students WHERE id = ?').run(id);

  db.prepare('INSERT INTO system_logs (action, details, timestamp) VALUES (?, ?, ?)')
    .run('STUDENT_DELETED', `Deleted student ${existing.first_name} ${existing.last_name} (${existing.student_id}) and related attendance`, new Date().toISOString());

  return res.json({ success: true, message: 'Student deleted successfully' });
});

module.exports = router;
