const Database = require('better-sqlite3');

/**
 * يقرأ كل صفوف جدول الطلاب من نسخة SQLite المؤقتة (Read-only).
 * لا يُستخدم أبدًا على الملف الحي مباشرة.
 */
function readStudents(snapshotPath, tableName) {
  const db = new Database(snapshotPath, { readonly: true, fileMustExist: true });
  const rows = db.prepare(`SELECT * FROM "${tableName}"`).all();
  db.close();
  return rows;
}

module.exports = { readStudents };
