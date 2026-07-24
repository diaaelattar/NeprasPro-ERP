const fs = require('fs');
const initSqlJs = require('sql.js');

async function fixColumn() {
  const SQL = await initSqlJs();
  const dbPath = 'C:/Users/diaa_elattar/.nepraspro/nepraspro.db';
  if (!fs.existsSync(dbPath)) return console.log('DB file not found');

  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);

  const stmt = db.prepare("PRAGMA table_info(students)");
  const cols = [];
  while (stmt.step()) cols.push(stmt.getAsObject().name);
  stmt.free();

  console.log('Current columns in students table:', cols.join(', '));

  if (!cols.includes('is_excluded')) {
    console.log('Adding missing is_excluded column...');
    db.run("ALTER TABLE students ADD COLUMN is_excluded INTEGER DEFAULT 0;");
  }

  // Sync is_excluded values for excluded students
  db.run("UPDATE students SET is_excluded = 1 WHERE status IN ('excluded', 'مستبعد') OR enrollment_status = 'مستبعد';");

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  console.log('Successfully added and populated is_excluded column in nepraspro.db!');

  db.close();
}

fixColumn().catch(console.error);
