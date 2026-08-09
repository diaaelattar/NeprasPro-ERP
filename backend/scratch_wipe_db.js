const path = require('path');
const os = require('os');
const db = require('./config/db');

async function wipeDatabase() {
  console.log('⏳ Starting complete database reset...');
  try {
    const dbPath = path.join(os.homedir(), '.nepraspro', 'nepraspro.db');
    await db.initSQLiteMode(dbPath);
    const sqliteDb = db.getSQLiteDb();

    if (!sqliteDb) {
      console.error('❌ SQLite DB instance not found.');
      process.exit(1);
    }

    const tablesToWipe = [
      'control_marks',
      'control_committees',
      'control_students',
      'exam_subjects',
      'students',
      'classes',
      'grades_lookup',
      'stages_lookup',
      'sections',
      'academic_years',
      'users',
      'institution_config',
      'stage_serial_counters',
      'settings_audit_log',
      'system_custom_fields'
    ];

    db.runTransaction(() => {
      tablesToWipe.forEach(table => {
        try {
          sqliteDb.run(`DELETE FROM ${table}`);
          console.log(`✓ Wiped table: ${table}`);
        } catch (e) {
          console.warn(`⚠️ Warning wiping ${table}:`, e.message);
        }
      });
    });

    db.flushSQLite();
    console.log('🎉 Database wiped and saved to disk cleanly!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Reset error:', err);
    process.exit(1);
  }
}

wipeDatabase();
