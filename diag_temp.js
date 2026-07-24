const db = require('./backend/config/db');
setTimeout(() => {
  try {
    const s = db.getSQLiteDb();
    function all(q, p) { p=p||[]; var st=s.prepare(q); st.bind(p); var r=[]; while(st.step())r.push(st.getAsObject()); st.free(); return r; }

    // Check control_students columns
    var cols = all('PRAGMA table_info(control_students)');
    console.log('control_students columns:', cols.map(function(c){return c.name;}).join(', '));

    // Check control_committees for grade 1
    var comms = all('SELECT * FROM control_committees WHERE grade_id = ? LIMIT 5', [1]);
    console.log('\ncontrol_committees grade 1:', JSON.stringify(comms, null, 2));

    // Check how many control_students have committee_id set
    var assigned = all('SELECT COUNT(*) as c FROM control_students WHERE committee_id IS NOT NULL');
    console.log('\nassigned students (committee_id NOT NULL):', assigned[0].c);

    // Run getCommitteesStats query manually
    var stats = all('SELECT c.id, c.committee_name, c.building_name, c.room_number, c.max_capacity, COUNT(cs.ROWID) AS total_assigned FROM control_committees c LEFT JOIN control_students cs ON cs.committee_id = c.id WHERE c.grade_id = ? GROUP BY c.id ORDER BY c.id ASC LIMIT 5', [1]);
    console.log('\nStats with ROWID:', JSON.stringify(stats, null, 2));

    // Also check original query with cs.id (might fail)
    try {
      var stats2 = all('SELECT c.id, c.committee_name, COUNT(cs.id) AS total_assigned FROM control_committees c LEFT JOIN control_students cs ON cs.committee_id = c.id WHERE c.grade_id = ? GROUP BY c.id LIMIT 5', [1]);
      console.log('\nStats with cs.id:', JSON.stringify(stats2, null, 2));
    } catch(e2) {
      console.log('\nERROR with cs.id:', e2.message);
    }

  } catch(e) { console.log('Error:', e.message); }
  process.exit(0);
}, 3500);
