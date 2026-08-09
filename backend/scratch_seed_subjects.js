const path = require('path');
const os = require('os');
const db = require('./config/db');

async function seedSubjectsNow() {
  console.log('⏳ Auto-populating default subjects for all grades...');
  try {
    const dbPath = path.join(os.homedir(), '.nepraspro', 'nepraspro.db');
    await db.initSQLiteMode(dbPath);
    db.flushSQLite();
    console.log('🎉 Default subjects populated and saved to disk cleanly!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
}

seedSubjectsNow();
