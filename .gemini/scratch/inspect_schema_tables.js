const fs = require('fs');
const path = require('path');
const os = require('os');
const initSqlJs = require('sql.js');

async function inspectDb() {
  const SQL = await initSqlJs();
  const dbPath = path.join(os.homedir(), '.nepraspro', 'nepraspro.db');
  if (!fs.existsSync(dbPath)) {
    console.log('DB file not found at:', dbPath);
    return;
  }
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);

  const tables = [];
  const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  while (stmt.step()) {
    tables.push(stmt.getAsObject().name);
  }
  stmt.free();

  console.log(`=== LIVE DATABASE TABLES COUNT: ${tables.length} ===`);
  for (const tbl of tables) {
    const colStmt = db.prepare(`PRAGMA table_info(${tbl})`);
    const cols = [];
    while (colStmt.step()) {
      const c = colStmt.getAsObject();
      cols.push(`${c.name} (${c.type}${c.pk ? ' PK' : ''}${c.notnull ? ' NOT NULL' : ''})`);
    }
    colStmt.free();

    const fkStmt = db.prepare(`PRAGMA foreign_key_list(${tbl})`);
    const fks = [];
    while (fkStmt.step()) {
      const fk = fkStmt.getAsObject();
      fks.push(`${fk.from} -> ${fk.table}(${fk.to})`);
    }
    fkStmt.free();

    console.log(`\nTABLE [${tbl}] (${cols.length} columns, ${fks.length} FKs):`);
    console.log('  Cols:', cols.join(', '));
    if (fks.length > 0) console.log('  FKs:', fks.join(' | '));
  }
}

inspectDb().catch(console.error);
