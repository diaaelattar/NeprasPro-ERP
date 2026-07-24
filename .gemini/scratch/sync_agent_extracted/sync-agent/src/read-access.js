const odbc = require('odbc');

/**
 * يقرأ كل صفوف جدول الطلاب من نسخة Access (.accdb/.mdb) المؤقتة (Read-only).
 * يتطلب: تشغيل هذا السكريبت على Windows، مع تثبيت
 * "Microsoft Access Database Engine Redistributable" على نفس الجهاز.
 * لا يعمل على Linux/macOS — استخدم قناة الـ API بدلاً منه في هذه الحالة.
 */
async function readStudents(snapshotPath, tableName) {
  const connStr = `Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=${snapshotPath};`;
  const conn = await odbc.connect(connStr);
  const rows = await conn.query(`SELECT * FROM [${tableName}]`);
  await conn.close();
  return rows;
}

module.exports = { readStudents };
