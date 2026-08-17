const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Ensure require() resolves modules from the backend's own directory.
// This is critical when backend/server.js is required from electron/main.js
// in production builds where __dirname is the electron folder.
const backendDir = __dirname;
module.paths.unshift(path.join(backendDir, 'node_modules'));

const app = express();
const PORT = process.env.PORT || 3001;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false,
}));
app.options('*', cors());
app.use(helmet({
  contentSecurityPolicy: false, // Allow local embedded assets
  crossOriginResourcePolicy: false,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Setup and Initialization Routes
try {
  const setupRoutes = require('./modules/setup/setup.routes');
  app.use('/api/setup', setupRoutes);
  console.log('Setup routes registered successfully.');
} catch (err) {
  console.error('Failed to load setup routes:', err.message);
  app.use('/api/setup', (req, res) => {
    res.status(500).json({ success: false, error: `Server module load error: ${err.message}` });
  });
}

// Students Routes
try {
  const studentsRoutes = require('./modules/students/students.routes');
  app.use('/api/students', studentsRoutes);
  console.log('Students routes registered successfully.');
} catch (err) {
  console.error('Failed to load students routes:', err.message);
  app.use('/api/students', (req, res) => {
    res.status(500).json({ success: false, error: `Students module load error: ${err.message}` });
  });
}

// Staff Routes
try {
  const staffRoutes = require('./modules/staff/staff.routes');
  app.use('/api/staff', staffRoutes);
  console.log('Staff routes registered successfully.');
} catch (err) {
  console.error('Failed to load staff routes:', err.message);
  app.use('/api/staff', (req, res) => {
    res.status(500).json({ success: false, error: `Staff module load error: ${err.message}` });
  });
}

// Settings Routes
try {
  const settingsRoutes = require('./modules/settings/settings.routes');
  app.use('/api/settings', settingsRoutes);
  console.log('Settings routes registered successfully.');
} catch (err) {
  console.error('Failed to load settings routes:', err.message);
  app.use('/api/settings', (req, res) => {
    res.status(500).json({ success: false, error: `Settings module load error: ${err.message}` });
  });
}

// Control Room & Exams Routes
try {
  const controlRoutes = require('./modules/control/control.routes');
  app.use('/api/control', controlRoutes);
  console.log('Control routes registered successfully.');
} catch (err) {
  console.error('Failed to load control routes:', err.message);
  app.use('/api/control', (req, res) => {
    res.status(500).json({ success: false, error: `Control module load error: ${err.message}` });
  });
}

// License & Trial Routes
try {
  const licenseRoutes = require('./modules/license/license.routes');
  app.use('/api/license', licenseRoutes);
  console.log('License routes registered successfully.');
} catch (err) {
  console.error('Failed to load license routes:', err.message);
  app.use('/api/license', (req, res) => {
    res.status(500).json({ success: false, error: `License module load error: ${err.message}` });
  });
}

// System & Online Updater Routes
try {
  const systemRoutes = require('./modules/system/system.routes');
  app.use('/api/system', systemRoutes);
  console.log('System routes registered successfully.');
} catch (err) {
  console.error('Failed to load system routes:', err.message);
  app.use('/api/system', (req, res) => {
    res.status(500).json({ success: false, error: `System module load error: ${err.message}` });
  });
}

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'NeprasPro Local API is running',
    timestamp: new Date().toISOString()
  });
});

const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Express server running on http://0.0.0.0:${PORT} (Accessible locally and across LAN/Wi-Fi network)`);
});

// Global error handler — always return JSON, never HTML
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

process.on('uncaughtException', (err) => {
  console.error('[Server Uncaught Exception]', err ? err.message : err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Server Unhandled Rejection]', reason);
});

module.exports = app;
