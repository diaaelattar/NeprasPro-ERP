const fs = require('fs');
const path = require('path');

/**
 * ينسخ ملف قاعدة البيانات المصدر (SQLite/Access) لمجلد مؤقت قبل القراءة،
 * لتفادي تعارض القفل (File Locking) مع البرنامج الحي أثناء استخدام الموظفين له.
 * لا تقرأ من sourcePath مباشرة أبدًا في أي وحدة أخرى.
 */
function snapshotSourceDb(sourcePath, snapshotDir) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source DB file not found: ${sourcePath}`);
  }
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  const ext = path.extname(sourcePath);
  const tmpPath = path.join(snapshotDir, `snapshot_${Date.now()}${ext}`);

  fs.copyFileSync(sourcePath, tmpPath);
  return tmpPath;
}

/** تنظيف النسخ المؤقتة القديمة بعد انتهاء المزامنة */
function cleanupSnapshot(snapshotPath) {
  try {
    if (fs.existsSync(snapshotPath)) fs.unlinkSync(snapshotPath);
  } catch (err) {
    console.warn(`Could not clean up snapshot ${snapshotPath}:`, err.message);
  }
}

module.exports = { snapshotSourceDb, cleanupSnapshot };
