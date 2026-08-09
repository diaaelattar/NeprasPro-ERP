const db = require('../backend/config/db');
const bcrypt = require('../backend/node_modules/bcryptjs');

async function resetAdmin() {
  // Wait a bit for async init inside db.js to finish
  await new Promise(r => setTimeout(r, 1000));
  
  // Get users
  const res = await db.query('SELECT id, username, full_name FROM users');
  console.log('Current users:');
  console.log(res.rows);

  if (res.rows.length > 0) {
    const admin = res.rows[0];
    const newPassword = 'admin'; // default password
    const hash = await bcrypt.hash(newPassword, 10);
    
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, admin.id]);
    console.log(`Password for user '${admin.username}' reset to '${newPassword}'`);
    
    // In sql.js, we must save the DB
    if (db.getMode() === 'sqlite') {
      db.flushSQLite();
      console.log('Saved sqlite db');
    }
  } else {
    console.log('No users found in database!');
  }
}

resetAdmin().catch(console.error);
