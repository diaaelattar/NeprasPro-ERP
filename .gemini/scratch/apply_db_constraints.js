const fs = require('fs');
const initSqlJs = require('sql.js');

async function applyFix() {
  const SQL = await initSqlJs();
  const dbPath = 'C:/Users/diaa_elattar/.nepraspro/nepraspro.db';
  if (!fs.existsSync(dbPath)) return console.log('DB file not found');

  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);

  // Check columns
  const stmt = db.prepare("PRAGMA table_info(students)");
  const cols = [];
  while (stmt.step()) cols.push(stmt.getAsObject().name);
  stmt.free();

  console.log('Existing columns in students:', cols.join(', '));

  if (!cols.includes('enrollment_status')) {
    console.log('Adding column enrollment_status...');
    db.run("ALTER TABLE students ADD COLUMN enrollment_status TEXT DEFAULT 'منقول';");
  }

  // Update enrollment_status values
  console.log('Populating enrollment_status column...');
  db.run(`
    UPDATE students SET enrollment_status = CASE 
      WHEN status IN ('promoted', 'منقول') THEN 'منقول'
      WHEN status IN ('retained', 'باق') THEN 'باق'
      WHEN status IN ('disconnected', 'منقطع') THEN 'منقطع'
      WHEN status IN ('suspended', 'موقوف قيده') THEN 'موقوف قيده'
      WHEN status IN ('excluded', 'مستبعد') THEN 'مستبعد'
      ELSE 'منقول'
    END;
  `);

  // Write updated DB back to disk
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
  console.log('Database file successfully updated and saved!');

  db.close();
}

applyFix().catch(console.error);
