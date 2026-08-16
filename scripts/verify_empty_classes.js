const path = require('path');
const os = require('os');
const fs = require('fs');

async function execute() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const dbPath = path.join(os.homedir(), '.nepraspro', 'nepraspro.db');
  if (!fs.existsSync(dbPath)) return;

  const db = new SQL.Database(fs.readFileSync(dbPath));

  // 1. Clear any rows in classes
  db.run("DELETE FROM classes;");

  // 2. Ensure columns section_id, stage_id, class_code exist
  const cols = [];
  const stmt = db.prepare("PRAGMA table_info(classes)");
  while (stmt.step()) cols.push(stmt.getAsObject().name);
  stmt.free();

  if (!cols.includes('section_id')) db.run("ALTER TABLE classes ADD COLUMN section_id INTEGER;");
  if (!cols.includes('stage_id')) db.run("ALTER TABLE classes ADD COLUMN stage_id INTEGER;");
  if (!cols.includes('class_code')) db.run("ALTER TABLE classes ADD COLUMN class_code INTEGER;");

  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log('[SUCCESS] classes table verified empty & linked to section_id, stage_id, grade_id.');

  const checkStmt = db.prepare("PRAGMA table_info(classes)");
  const finalCols = [];
  while (checkStmt.step()) finalCols.push(checkStmt.getAsObject().name);
  checkStmt.free();
  console.log('Classes Table Columns:', finalCols.join(', '));
}

execute().catch(console.error);
