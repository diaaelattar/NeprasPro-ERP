const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const db = require(path.join(ROOT, 'backend/config/db.js'));

const dbPath = 'C:\\Users\\diaa_elattar\\.nepraspro\\nepraspro.db';
if (!require('fs').existsSync(dbPath)) { console.error('DB file not found at:', dbPath); process.exit(1); }
console.log('Using DB:', dbPath);

db.initSQLiteMode(dbPath);
const sqliteDb = db.getSQLiteDb();

// Check columns
const cols = [];
const s = sqliteDb.prepare('PRAGMA table_info(students)');
while (s.step()) cols.push(s.getAsObject().name);
s.free();

['class_id', 'student_serial_in_class', 'student_serial_in_grade'].forEach(c => {
  console.log(c + ':', cols.includes(c) ? '✓ OK' : '✗ MISSING');
});

// Check history table
const t = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='student_academic_history'");
const exists = t.step();
t.free();
console.log('student_academic_history table:', exists ? '✓ OK' : '✗ MISSING');

// Check index
const i = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_students_dedicated_lookup'");
const idxExists = i.step();
i.free();
console.log('idx_students_dedicated_lookup index:', idxExists ? '✓ OK' : '✗ MISSING');

