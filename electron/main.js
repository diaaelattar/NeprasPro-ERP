const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const net  = require('net');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// ── Single Instance Lock ───────────────────────────────────────────────────────
// Prevents two copies of the installed app running simultaneously.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  dialog.showErrorBox(
    'NeprasPro — نسخة أخرى تعمل',
    'البرنامج يعمل بالفعل في هذا الجهاز.\nيرجى التحقق من شريط المهام.'
  );
  app.quit();
}

// ── Helper: Check if a port is free ───────────────────────────────────────────
function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => tester.close(() => resolve(true)));
    tester.listen(port, '127.0.0.1');
  });
}

// ── Start Express Backend (Production Only) ────────────────────────────────────
async function startBackend() {
  if (isDev) return; // Dev: backend started separately via concurrently

  const portFree = await isPortFree(3001);
  if (!portFree) {
    dialog.showErrorBox(
      'NeprasPro — تعارض في المنافذ',
      'البورت 3001 مشغول بعملية أخرى.\n\nيرجى:\n1. إغلاق أي نسخة أخرى من البرنامج.\n2. إغلاق بيئة التطوير إن كانت تعمل.\n3. إعادة تشغيل البرنامج.'
    );
    app.quit();
    return;
  }

  try {
    require('../backend/server.js');
    console.log('[Main] Embedded Express server started on port 3001.');
  } catch (error) {
    console.error('[Main] Failed to start Express server:', error);
    dialog.showErrorBox(
      'NeprasPro — خطأ في تشغيل الخادم',
      `فشل تشغيل الخادم الداخلي:\n${error.message}\n\nيرجى إعادة تثبيت البرنامج أو التواصل مع الدعم الفني.`
    );
    app.quit();
  }
}

// ── Create Main Window ─────────────────────────────────────────────────────────
let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    autoHideMenuBar: true,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App Lifecycle ──────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  await startBackend();
  if (!app.isQuitting) {
    createMainWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });

  // Focus existing window if user tries to open a second instance
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
