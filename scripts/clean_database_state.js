const db = require('../backend/config/db');

async function cleanDatabaseState() {
  await db.initSQLiteMode();
  const sqliteDb = db.getSQLiteDb();

  db.runTransaction(() => {
    // 1. Keep ONLY single active academic year
    const activeYear = db._get ? db._get('SELECT id FROM academic_years WHERE is_current = 1 LIMIT 1') : null;
    if (activeYear) {
      sqliteDb.run('DELETE FROM academic_years WHERE is_current = 0 AND id NOT IN (SELECT DISTINCT academic_year_id FROM students WHERE academic_year_id IS NOT NULL);');
    }

    // 2. Keep ONLY main active section
    sqliteDb.run("UPDATE sections SET is_active = 0 WHERE id > 1 AND code != 100 AND name != 'القسم العربي';");
    sqliteDb.run("UPDATE sections SET is_active = 1 WHERE id = 1 OR code = 100 OR name = 'القسم العربي';");

    // 3. Deactivate stages that were auto-populated without user adding them
    sqliteDb.run("UPDATE stages_lookup SET is_active = 0 WHERE id NOT IN (SELECT DISTINCT stage_id FROM classrooms WHERE stage_id IS NOT NULL);");
  });

  db.flushSQLite();
  console.log('DATABASE_CLEANUP_SUCCESS: Single academic year and user-selected sections/stages active.');
  process.exit(0);
}

cleanDatabaseState().catch(err => {
  console.error('DATABASE_CLEANUP_ERROR:', err);
  process.exit(1);
});
