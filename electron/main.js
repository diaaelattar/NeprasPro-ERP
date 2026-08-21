const { app, BrowserWindow, dialog, ipcMain, shell, session } = require('electron');
const path = require('path');
const net  = require('net');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Configure stable Chromium flags
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('disable-features', 'NetworkService,NetworkServiceInProcess');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-setuid-sandbox');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

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

// ── Start Express Backend ───────────────────────────────────────────────────────
async function startBackend() {
  if (isDev) return; // In Dev mode, backend server is started by concurrently
  const portFree = await isPortFree(3001);
  if (portFree) {
    try {
      require('../backend/server.js');
      console.log('[Main] Embedded Express server started on port 3001.');
    } catch (error) {
      console.error('[Main] Failed to start Express server:', error.message);
    }
  }
}

// ── Create Main Window ─────────────────────────────────────────────────────────
let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
    show: true,
    autoHideMenuBar: true,
  });

  const devUrl = 'http://localhost:5173';

  if (isDev) {
    mainWindow.loadURL(devUrl);

    // Auto-retry loading if Vite dev server is still compiling/starting
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.log(`[Main] Page failed to load (${errorCode}: ${errorDescription}), retrying in 1.5s...`);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(devUrl).catch(() => {});
        }
      }, 1500);
    });
  } else {
    const indexPath = path.join(__dirname, '../frontend/dist/index.html');
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('[Main] Failed to load index.html:', err);
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error(`[Main] Production page failed to load (${errorCode}: ${errorDescription})`);
    });
  }

  // Allow F12 to toggle DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
      }
    }
  });

  mainWindow.show();
  mainWindow.focus();
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── IPC Portal Handlers ───────────────────────────────────────────────────────
const fs = require('fs');

ipcMain.on('emis:clear-session', () => {
  session.fromPartition('persist:emis-session').clearStorageData({
    storages: ['cookies', 'localstorage', 'sessionstorage', 'cachestorage', 'indexdb']
  }).catch(() => {});
});

ipcMain.handle('emis:get-registered-codes', async () => {
  try {
    try {
      const res = await fetch('http://localhost:3001/api/students/emis/registered-codes');
      if (res.ok) return await res.json();
    } catch (_) {}
    const res2 = await fetch('http://127.0.0.1:3001/api/students/emis/registered-codes');
    if (res2.ok) return await res2.json();
  } catch (err) {
    console.error('[Main IPC Registered Codes Exception]:', err.message);
  }
  return { success: false, allIdentifiers: [] };
});

ipcMain.handle('emis:sync-data-promise', async (event, payload) => {
  try {
    const bodyStr = JSON.stringify(payload || {});
    try {
      const res = await fetch('http://localhost:3001/api/students/emis/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
      });
      if (res.ok) {
        const json = await res.json();
        return json;
      }
    } catch (_) {}

    const res2 = await fetch('http://127.0.0.1:3001/api/students/emis/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
    });
    if (res2.ok) {
      const json2 = await res2.json();
      return json2;
    }
    return { success: false, error: 'Could not connect to backend server.' };
  } catch (err) {
    console.error('[EMIS IPC Sync Exception]:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.on('emis:sync-data', async (event, payload) => {
  try {
    const bodyStr = JSON.stringify(payload || {});
    const res = await fetch('http://localhost:3001/api/students/emis/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
    }).catch(() => fetch('http://127.0.0.1:3001/api/students/emis/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
    }));
    if (res && res.ok) {
      const json = await res.json();
      event.reply('emis:sync-reply', { success: true, results: json.results });
    } else {
      event.reply('emis:sync-reply', { success: false, error: 'Backend error' });
    }
  } catch (err) {
    console.error('[EMIS IPC Exception]:', err.message);
    event.reply('emis:sync-reply', { success: false, error: err.message });
  }
});

ipcMain.on('emis:open-portal', (event, target) => {
  const urlMap = {
    student: 'https://student.emis.gov.eg/',
    teacher: 'https://teacher.emis.gov.eg/login',
    services: 'https://services.emis.gov.eg/',
    office365: 'https://office365.emis.gov.eg/'
  };
  const url = urlMap[target] || 'https://student.emis.gov.eg/';
  
  const emisWin = new BrowserWindow({
    width: 1366,
    height: 850,
    title: target === 'teacher' ? 'منظومة نبراس — بوابة المعلمين والموارد البشرية (EMIS)' : 'منظومة نبراس — بوابة الطلاب الإلكترونية (EMIS)',
    webPreferences: {
      partition: 'persist:emis-session',
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: false,
    },
    autoHideMenuBar: true,
  });

  // Allow popups / redirects
  emisWin.webContents.setWindowOpenHandler(() => ({ action: 'allow' }));


  // Inject ExcelJS library and full original Smart Collector Panel on page load
  const injectCollectorScript = () => {
    let combinedScript = '';
    
    // 1. Inject Excel library (XLSX and ExcelJS) first
    const excelLibPaths = [
      path.join(__dirname, '../extension/xlsx.full.min.js'),
      path.join(__dirname, '../node_modules/exceljs/dist/exceljs.min.js'),
      path.join(__dirname, '../frontend/node_modules/xlsx/dist/xlsx.full.min.js'),
    ];
    for (const p of excelLibPaths) {
      if (fs.existsSync(p)) {
        try {
          combinedScript += fs.readFileSync(p, 'utf8') + ';\n';
        } catch (_) {}
      }
    }

    // 2. Inject original Collector Panel
    const collectorScriptPath = path.join(__dirname, 'injected', 'students-collector-panel.js');
    if (fs.existsSync(collectorScriptPath)) {
      try {
        combinedScript += fs.readFileSync(collectorScriptPath, 'utf8') + ';\n';
      } catch (err) {
        console.error('[EMIS Read Script Error]:', err);
      }
    }

    if (combinedScript) {
      emisWin.webContents.executeJavaScript(combinedScript).catch(err => {
        console.error('[EMIS Collector Injection Error]:', err);
      });
    }
  };

  emisWin.webContents.on('did-finish-load', injectCollectorScript);

  // ── فتح DevTools بـ F12 بصرف النظر عن حجب الموقع ─────────────────────────
  emisWin.webContents.on('before-input-event', (event, input) => {
    // F12 → تبديل DevTools
    if (input.key === 'F12' && input.type === 'keyDown') {
      if (emisWin.webContents.isDevToolsOpened()) {
        emisWin.webContents.closeDevTools();
      } else {
        emisWin.webContents.openDevTools({ mode: 'detach' });
      }
    }
    // Ctrl+Shift+Delete → مسح Cookies وإعادة التحميل
    if (input.key === 'Delete' && input.control && input.shift && input.type === 'keyDown') {
      session.fromPartition('persist:emis-session').clearStorageData({
        storages: ['cookies', 'localstorage', 'sessionstorage', 'cachestorage']
      }).then(() => {
        emisWin.reload();
        emisWin.webContents.executeJavaScript('alert("✅ تم مسح الجلسة والكوكيز — أعد تسجيل الدخول")').catch(() => {});
      });
    }
  });

  // ── إلغاء حجب كليك يمين وتحديد النص من قِبل الموقع ──────────────────────
  emisWin.webContents.on('did-finish-load', () => {
    emisWin.webContents.executeJavaScript(`
      document.addEventListener('contextmenu', e => e.stopPropagation(), true);
      document.addEventListener('selectstart', e => e.stopPropagation(), true);
      document.addEventListener('copy', e => e.stopPropagation(), true);
    `).catch(() => {});
  });

  emisWin.loadURL(url).catch(() => {
    shell.openExternal(url);
  });
});

ipcMain.on('emis:open-folder', () => {
  const docsFolder = path.join(require('os').homedir(), 'Documents', 'أدوات المدرسة الموحّدة');
  if (!fs.existsSync(docsFolder)) {
    fs.mkdirSync(docsFolder, { recursive: true });
  }
  shell.openPath(docsFolder);
});

ipcMain.on('control:open-reports-folder', (event, subPath) => {
  const baseReportsFolder = path.join(require('os').homedir(), 'Documents', 'تقارير_كنترول_نبراس');
  const targetFolder = subPath ? path.join(baseReportsFolder, String(subPath).replace(/[/\\?%*:|"<>]/g, '_')) : baseReportsFolder;
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }
  shell.openPath(targetFolder);
});

// ── Online Auto-Updater Handlers ─────────────────────────────────────────────
const https = require('https');
const http = require('http');
const { spawn } = require('child_process');

let activeDownloadReq = null;
let downloadedInstallerPath = null;

function downloadUpdateFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    let downloadedBytes = 0;
    let totalBytes = 0;
    let startTime = Date.now();

    const doRequest = (targetUrl) => {
      const parsedUrl = new URL(targetUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const req = client.get(targetUrl, {
        headers: { 'User-Agent': 'NeprasPro-ERP-Updater/1.3' }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return doRequest(res.headers.location);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(destPath, () => {});
          return reject(new Error(`Server returned status code ${res.statusCode}: ${res.statusMessage}`));
        }

        totalBytes = parseInt(res.headers['content-length'] || '0', 10);

        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          file.write(chunk);
          const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
          const elapsedSec = (Date.now() - startTime) / 1000;
          const speedBytesPerSec = elapsedSec > 0 ? Math.round(downloadedBytes / elapsedSec) : 0;
          if (onProgress) {
            onProgress({
              percent,
              downloadedBytes,
              totalBytes,
              speedBytesPerSec
            });
          }
        });

        res.on('end', () => {
          file.end();
          resolve(destPath);
        });

        res.on('error', (err) => {
          file.close();
          fs.unlink(destPath, () => {});
          reject(err);
        });
      });

      req.on('error', (err) => {
        file.close();
        fs.unlink(destPath, () => {});
        reject(err);
      });

      activeDownloadReq = req;
    };

    doRequest(url);
  });
}

ipcMain.handle('updater:check', async () => {
  try {
    let res;
    try {
      res = await fetch('http://localhost:3001/api/system/check-updates');
    } catch (_) {
      res = await fetch('http://127.0.0.1:3001/api/system/check-updates');
    }
    if (res.ok) {
      return await res.json();
    }
    return { success: false, error: 'Server returned error.' };
  } catch (err) {
    console.error('[Updater Check IPC Exception]:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('updater:download', async (event, { downloadUrl, fileName }) => {
  try {
    if (!downloadUrl) throw new Error('رابط التنزيل غير متوفر.');
    const safeName = (fileName || 'NeprasPro-ERP-Setup-latest.exe').replace(/[^\w\.\-\s]/gi, '_');
    const targetPath = path.join(app.getPath('temp'), safeName);
    
    downloadedInstallerPath = targetPath;

    await downloadUpdateFile(downloadUrl, targetPath, (progress) => {
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send('updater:progress', progress);
      }
    });

    activeDownloadReq = null;
    return { success: true, filePath: targetPath };
  } catch (err) {
    activeDownloadReq = null;
    console.error('[Updater Download Exception]:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.on('updater:cancel', () => {
  if (activeDownloadReq) {
    try { activeDownloadReq.destroy(); } catch (_) {}
    activeDownloadReq = null;
  }
  if (downloadedInstallerPath) {
    try { fs.unlinkSync(downloadedInstallerPath); } catch (_) {}
    downloadedInstallerPath = null;
  }
});

ipcMain.handle('updater:install', async () => {
  try {
    if (!downloadedInstallerPath || !fs.existsSync(downloadedInstallerPath)) {
      throw new Error('ملف التحديث غير موجود.');
    }
    // Launch installer detached and quit current instance
    const child = spawn(downloadedInstallerPath, [], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    app.quit();
    return { success: true };
  } catch (err) {
    console.error('[Updater Install Exception]:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.on('updater:open-url', (event, url) => {
  if (url) shell.openExternal(url);
});
// ── App Lifecycle ──────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Strip X-Frame-Options and CSP headers for EMIS portal pages
  session.defaultSession.webRequest.onHeadersReceived({ urls: ['*://*.emis.gov.eg/*', '*://*.gov.eg/*'] }, (details, callback) => {
    const responseHeaders = { ...(details.responseHeaders || {}) };
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    callback({ responseHeaders });
  });

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
