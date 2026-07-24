const db = require('../backend/config/db');

db.initDb().then(() => {
  const sqliteDb = db.getSQLiteDb();
  const columns = sqliteDb.exec("PRAGMA table_info(students)");
  console.log('Students table columns:');
  if (columns && columns[0]) {
    columns[0].values.forEach(col => console.log(' -', col[1]));
  }
}).catch(console.error);
