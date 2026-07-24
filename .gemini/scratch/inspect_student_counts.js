const fs = require('fs');
const initSqlJs = require('sql.js');

async function inspect() {
  const SQL = await initSqlJs();
  const dbPath = 'C:/Users/diaa_elattar/.nepraspro/nepraspro.db';
  if (!fs.existsSync(dbPath)) {
    console.log('Database file not found at:', dbPath);
    return;
  }
  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);

  console.log('=== STUDENTS TABLE DATA AUDIT ===');

  // 1. Total rows
  let stmt = db.prepare('SELECT COUNT(*) as cnt FROM students');
  stmt.step();
  console.log('Total rows in students table:', stmt.getAsObject().cnt);
  stmt.free();

  // 2. is_deleted breakdown
  stmt = db.prepare('SELECT is_deleted, COUNT(*) as cnt FROM students GROUP BY is_deleted');
  console.log('\nis_deleted breakdown:');
  while (stmt.step()) console.log(stmt.getAsObject());
  stmt.free();

  // 3. status column breakdown
  stmt = db.prepare('SELECT status, COUNT(*) as cnt FROM students GROUP BY status');
  console.log('\nstatus column breakdown:');
  while (stmt.step()) console.log(stmt.getAsObject());
  stmt.free();

  // 4. enrollment_status column breakdown
  stmt = db.prepare('SELECT enrollment_status, COUNT(*) as cnt FROM students GROUP BY enrollment_status');
  console.log('\nenrollment_status column breakdown:');
  while (stmt.step()) console.log(stmt.getAsObject());
  stmt.free();

  // 5. Combination of status AND enrollment_status AND is_deleted
  stmt = db.prepare('SELECT status, enrollment_status, is_deleted, COUNT(*) as cnt FROM students GROUP BY status, enrollment_status, is_deleted');
  console.log('\nCombination breakdown (status, enrollment_status, is_deleted):');
  while (stmt.step()) console.log(stmt.getAsObject());
  stmt.free();

  // 6. Demographics breakdown
  stmt = db.prepare('SELECT gender, COUNT(*) as cnt FROM students GROUP BY gender');
  console.log('\ngender breakdown:');
  while (stmt.step()) console.log(stmt.getAsObject());
  stmt.free();

  stmt = db.prepare('SELECT religion, COUNT(*) as cnt FROM students GROUP BY religion');
  console.log('\nreligion breakdown:');
  while (stmt.step()) console.log(stmt.getAsObject());
  stmt.free();

  db.close();
}

inspect().catch(console.error);
