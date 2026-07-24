const initSqlJs = require('sql.js');
const fs = require('fs');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = 'C:/Users/diaa_elattar/.nepraspro/nepraspro.db';
  const filebuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(filebuffer);

  const res = db.exec('SELECT * FROM institution_config');
  console.log('Columns:', res[0]?.columns);
  console.log('Values:', res[0]?.values);
}

main().catch(console.error);
