const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Get all settings
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settingsObj = {};
  for (const r of rows) {
    settingsObj[r.key] = r.value;
  }
  // Exclude raw admin password from public settings view
  delete settingsObj.admin_password;

  return res.json(settingsObj);
});

// Update settings
router.put('/', (req, res) => {
  const updates = req.body;
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }

  const updateStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  for (const [key, value] of Object.entries(updates)) {
    if (key !== 'admin_password') { // Password updated via /auth/change-password
      updateStmt.run(key, String(value));
    }
  }

  db.prepare('INSERT INTO system_logs (action, details, timestamp) VALUES (?, ?, ?)')
    .run('SETTINGS_UPDATED', `Updated system settings: ${Object.keys(updates).join(', ')}`, new Date().toISOString());

  return res.json({ success: true, message: 'Settings saved successfully' });
});

// Get system logs
router.get('/logs', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const logs = db.prepare('SELECT * FROM system_logs ORDER BY id DESC LIMIT ?').all(limit);
  return res.json(logs);
});

module.exports = router;
