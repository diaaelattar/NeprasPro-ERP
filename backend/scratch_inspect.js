const path = require('path');
const os = require('os');
const db = require('./config/db');

async function inspectDb() {
  const dbPath = path.join(os.homedir(), '.nepraspro', 'nepraspro.db');
  await db.initSQLiteMode(dbPath);
  const sqliteDb = db.getSQLiteDb();
  
  const users = db.query("SELECT * FROM users");
  const config = db.query("SELECT * FROM institution_config");
  
  console.log('--- USERS ---');
  console.log(JSON.stringify(users, null, 2));
  console.log('--- INSTITUTION CONFIG ---');
  console.log(JSON.stringify(config, null, 2));
  process.exit(0);
}

inspectDb();
