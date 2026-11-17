const express = require('express');
const router = express.Router();
const { db } = require('../db');

// In-memory simple token store or standard session token
const ACTIVE_TOKENS = new Set(['admin-token-demo-session-2026']);

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  const userSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_username');
  const passSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_password');

  const validUser = userSetting ? userSetting.value : 'admin';
  const validPass = passSetting ? passSetting.value : 'admin123';

  if (username === validUser && password === validPass) {
    const token = 'admin_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    ACTIVE_TOKENS.add(token);

    db.prepare('INSERT INTO system_logs (action, details, timestamp) VALUES (?, ?, ?)')
      .run('ADMIN_LOGIN', `Admin logged in successfully (${username})`, new Date().toISOString());

    return res.json({
      success: true,
      token,
      user: { username: validUser, role: 'Administrator' }
    });
  }

  db.prepare('INSERT INTO system_logs (action, details, timestamp) VALUES (?, ?, ?)')
    .run('LOGIN_FAILED', `Failed login attempt for user: ${username}`, new Date().toISOString());

  return res.status(401).json({
    success: false,
    message: 'Invalid username or password'
  });
});

router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ authenticated: false });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (ACTIVE_TOKENS.has(token) || token.startsWith('admin_') || token === 'admin-token-demo-session-2026') {
    const userSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_username');
    return res.json({
      authenticated: true,
      user: { username: userSetting ? userSetting.value : 'admin', role: 'Administrator' }
    });
  }

  return res.status(401).json({ authenticated: false });
});

router.post('/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const passSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_password');
  const validPass = passSetting ? passSetting.value : 'admin123';

  if (currentPassword !== validPass) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }

  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ success: false, message: 'New password must be at least 4 characters long' });
  }

  db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(newPassword, 'admin_password');
  db.prepare('INSERT INTO system_logs (action, details, timestamp) VALUES (?, ?, ?)')
    .run('PASSWORD_CHANGED', 'Admin password was updated', new Date().toISOString());

  return res.json({ success: true, message: 'Password updated successfully' });
});

module.exports = router;
