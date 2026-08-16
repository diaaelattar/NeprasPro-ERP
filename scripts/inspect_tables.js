const path = require('path');
const os = require('os');
const fs = require('fs');

async function check() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const dbPath = path.join(os.homedir(), '.nepraspro', 'nepraspro.db');
  if (!fs.existsSync(dbPath)) {
    console.log('DB not found at:', dbPath);
    return;
  }
  const db = new SQL.Database(fs.readFileSync(dbPath));
  const tables = ['sections', 'stages_lookup', 'grades_lookup', 'classes'];

  for (const t of tables) {
    console.log(`\n=================== ${t.toUpperCase()} ===================`);
    const stmtInfo = db.prepare(`PRAGMA table_info(${t})`);
    const cols = [];
    while (stmtInfo.step()) cols.push(stmtInfo.getAsObject().name);
    stmtInfo.free();
    console.log('Columns:', cols.join(', '));

    const stmtData = db.prepare(`SELECT * FROM ${t}`);
    const rows = [];
    while (stmtData.step()) rows.push(stmtData.getAsObject());
    stmtData.free();
    console.log(`Count: ${rows.length}`);
    console.log('Rows:', JSON.stringify(rows, null, 2));
  }
  db.close();
}

check().catch(console.error);
