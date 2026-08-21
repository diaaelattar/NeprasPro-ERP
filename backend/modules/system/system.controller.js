const path = require('path');
const https = require('https');
const http = require('http');
const packageJson = require('../../package.json');

const GITHUB_REPO = 'diaaelattar/NeprasPro-ERP';
const GITHUB_API_LATEST = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const PORTAL_URL = 'https://unified-school-tools-website.vercel.app';

// Semantic version comparator: returns >0 if v1 > v2, <0 if v1 < v2, 0 if equal
function compareVersions(v1, v2) {
  const clean1 = (v1 || '').replace(/^v/i, '').trim();
  const clean2 = (v2 || '').replace(/^v/i, '').trim();
  const parts1 = clean1.split('.').map(n => parseInt(n, 10) || 0);
  const parts2 = clean2.split('.').map(n => parseInt(n, 10) || 0);
  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

// Fetch helper with User-Agent and timeout
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'NeprasPro-ERP-Updater/1.3',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 8000
    }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('انتهت مهلة الاتصال بالخادم'));
    });

    req.on('error', err => {
      reject(err);
    });
  });
}

// ─── GET /api/system/info ──────────────────────────────────────────────────
const getSystemInfo = async (req, res) => {
  return res.json({
    success: true,
    name: packageJson.name,
    productName: packageJson.build?.productName || 'NeprasPro ERP',
    productNameAr: packageJson.build?.extraMetadata?.productNameAr || 'منظومة نبراس برو التعليمية',
    version: packageJson.version,
    author: packageJson.author,
    portalUrl: PORTAL_URL,
    githubUrl: `https://github.com/${GITHUB_REPO}`,
  });
};

// ─── GET /api/system/check-updates ─────────────────────────────────────────
const checkUpdates = async (req, res) => {
  const currentVersion = packageJson.version || '1.0.0';
  try {
    let releaseData;
    try {
      releaseData = await fetchJson(GITHUB_API_LATEST);
    } catch (fetchErr) {
      // Handle HTTP 404: no published releases yet
      if (fetchErr.message && fetchErr.message.includes('HTTP 404')) {
        return res.json({
          success: true,
          currentVersion,
          latestVersion: currentVersion,
          hasUpdate: false,
          releaseTitle: `الإصدار ${currentVersion} (لا توجد إصدارات منشورة بعد)`,
          releaseNotes: 'لم يتم نشر أي إصدار رسمي على GitHub بعد. أنت تستخدم النسخة الحالية من المنظومة.',
          publishedAt: null,
          downloadUrl: `https://github.com/${GITHUB_REPO}`,
          fileName: null,
          fileSizeBytes: 0,
          portalUrl: PORTAL_URL,
          githubReleaseUrl: `https://github.com/${GITHUB_REPO}/releases`,
          noReleasesYet: true
        });
      }
      throw fetchErr; // Re-throw other errors (network, timeout, etc.)
    }

    const remoteTag = releaseData.tag_name || releaseData.name || '';
    const remoteVersion = remoteTag.replace(/^v/i, '').trim();

    // If remoteVersion is empty, treat as no update available
    if (!remoteVersion) {
      return res.json({
        success: true,
        currentVersion,
        latestVersion: currentVersion,
        hasUpdate: false,
        releaseTitle: 'لا توجد إصدارات منشورة حالياً',
        releaseNotes: 'لم يتم نشر أي إصدار رسمي على GitHub بعد.',
        publishedAt: null,
        downloadUrl: `https://github.com/${GITHUB_REPO}/releases`,
        fileName: null,
        fileSizeBytes: 0,
        portalUrl: PORTAL_URL,
        githubReleaseUrl: `https://github.com/${GITHUB_REPO}/releases`,
        noReleasesYet: true
      });
    }

    // Find Windows installer asset (.exe)
    const exeAsset = (releaseData.assets || []).find(a =>
      a.name.endsWith('.exe') && !a.name.endsWith('.blockmap')
    ) || (releaseData.assets || [])[0] || null;

    const hasUpdate = compareVersions(remoteVersion, currentVersion) > 0;

    return res.json({
      success: true,
      currentVersion,
      latestVersion: remoteVersion,
      hasUpdate,
      releaseTitle: releaseData.name || `الإصدار ${remoteTag}`,
      releaseNotes: releaseData.body || 'تحسينات وإصلاحات عامة في أداء المنظومة.',
      publishedAt: releaseData.published_at || null,
      downloadUrl: exeAsset ? exeAsset.browser_download_url : releaseData.html_url,
      fileName: exeAsset ? exeAsset.name : `NeprasPro-ERP-Setup-${remoteVersion}.exe`,
      fileSizeBytes: exeAsset ? exeAsset.size : 0,
      portalUrl: PORTAL_URL,
      githubReleaseUrl: releaseData.html_url
    });
  } catch (err) {
    console.warn('[System Updater Check]:', err.message);
    return res.json({
      success: false,
      currentVersion,
      hasUpdate: false,
      error: 'تعذر الاتصال بخادم التحديثات أو لا يتوفر اتصال بالإنترنت حالياً.',
      details: err.message
    });
  }
};

module.exports = {
  getSystemInfo,
  checkUpdates,
  compareVersions
};
