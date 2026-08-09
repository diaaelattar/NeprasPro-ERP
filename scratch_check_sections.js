const db = require('d:/NeprasPro/backend/config/db');
(async () => {
  // wait 1 sec for _restoreFromConfig
  await new Promise(r => setTimeout(r, 1500));
  console.log('isConfigured:', db.isConfigured());
  if (!db.isConfigured()) {
    console.log('Not configured, trying default path');
    const path = require('path');
    const os = require('os');
    const dbPath = path.join(os.homedir(), '.nepraspro', 'nepraspro.db');
    await db.initSQLiteMode(dbPath);
  }
  const s = db.getSQLiteDb();
  const stmt = s.prepare('SELECT id, name, type, is_active, code FROM sections');
  const rows = [];
  while(stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
})();
