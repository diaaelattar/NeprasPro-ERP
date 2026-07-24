const initSqlJs = require('sql.js');
const fs = require('fs');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = 'C:/Users/diaa_elattar/.nepraspro/nepraspro.db';
  const filebuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(filebuffer);

  const res = db.exec('SELECT * FROM institution_config');
  const cols = res[0].columns;
  const vals = res[0].values[0];
  
  cols.forEach((col, i) => {
    console.log(`${col} = ${vals[i]}`);
  });
}

main().catch(console.error);
