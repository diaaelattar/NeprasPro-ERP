/**
 * سكريبت الاكتشاف — يُشغَّل مرة واحدة يدويًا قبل بناء الـ Mapper.
 * يعرض كل الجداول والأعمدة الفعلية في ملف المصدر (سواء SQLite أو Access)
 * حتى نستبدل أسماء الحقول الافتراضية في mapper.js بالأسماء الحقيقية.
 *
 * تشغيل: npm run discover
 */
const config = require('./config');
const { snapshotSourceDb, cleanupSnapshot } = require('./copy-source');

async function discoverSqlite(snapshotPath) {
  const Database = require('better-sqlite3');
  const db = new Database(snapshotPath, { readonly: true, fileMustExist: true });

  const tables = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
  ).all();

  for (const t of tables) {
    console.log(`\n=== جدول: ${t.name} ===`);
    const columns = db.prepare(`PRAGMA table_info(${t.name})`).all();
    columns.forEach(c => console.log(`  ${c.name}  (${c.type})`));
  }
  db.close();
}

async function discoverAccess(snapshotPath) {
  const odbc = require('odbc');
  const connStr = `Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=${snapshotPath};`;
  const conn = await odbc.connect(connStr);

  const tables = await conn.tables(null, null, null, 'TABLE');
  for (const t of tables) {
    const tableName = t.TABLE_NAME;
    console.log(`\n=== جدول: ${tableName} ===`);
    const columns = await conn.columns(null, null, tableName, null);
    columns.forEach(c => console.log(`  ${c.COLUMN_NAME}  (${c.TYPE_NAME})`));
  }
  await conn.close();
}

async function main() {
  const snapshotPath = snapshotSourceDb(config.source.path, config.snapshotDir);
  try {
    if (config.source.type === 'sqlite') {
      await discoverSqlite(snapshotPath);
    } else if (config.source.type === 'access') {
      await discoverAccess(snapshotPath);
    } else {
      throw new Error(`Unknown SOURCE_DB_TYPE: ${config.source.type}`);
    }
  } finally {
    cleanupSnapshot(snapshotPath);
  }
}

main().catch(err => {
  console.error('Discovery failed:', err);
  process.exit(1);
});
