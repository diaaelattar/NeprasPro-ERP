const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), '.nepraspro', 'nepraspro.db');

initSqlJs().then(SQL => {
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);
  const tables = [
    'sections_master_lookup',
    'education_types_lookup',
    'school_classifications_lookup',
    'stages_master_lookup',
    'grades_master_lookup',
    'stage_serial_counters',
    'institution_sections',
    'institution_stages',
    'institution_grades',
    'students',
    'sections',
    'stages_lookup'
  ];
  tables.forEach(t => {
    try {
      const s = db.prepare(`SELECT COUNT(*) as n FROM ${t}`);
      s.step();
      const r = s.getAsObject();
      s.free();
      console.log(`✅ ${t}: ${r.n} rows`);
    } catch(e) {
      console.log(`❌ ${t}: MISSING — ${e.message}`);
    }
  });
  db.close();
});
