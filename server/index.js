const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initSchema } = require('./db');

// Ensure db schema is ready
initSchema();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static uploads directory
const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/scanner', require('./routes/scanner'));
app.use('/api/students', require('./routes/students'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/export', require('./routes/exports'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/settings', require('./routes/settings'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    system: 'SmartCard Student Attendance System'
  });
});

// Serve static frontend build if it exists
const publicDir = path.resolve(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(publicDir, 'index.html'));
    }
    next();
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 SmartCard Attendance System running on port ${PORT}`);
  console.log(`📡 API Endpoints: http://localhost:${PORT}/api/`);
  console.log(`💳 Scanner Kiosk:  http://localhost:${PORT}/`);
  console.log(`🔒 Admin Portal:  http://localhost:${PORT}/admin`);
  console.log(`===================================================`);
});
