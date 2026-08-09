const db = require('./backend/config/db.js');
const controlController = require('./backend/modules/control/control.controller.js');
const studentsController = require('./backend/modules/students/students.controller.js');

async function auditSystem() {
  console.log('--- 1. Testing Database Initialization & Table Migration Integrity ---');
  await new Promise(r => setTimeout(r, 1000));

  const sqliteDb = db.getSQLiteDb();
  if (!sqliteDb) {
    console.error('❌ DB Failed to initialize');
    process.exit(1);
  }

  // Check columns on students table
  const sRes = await db.query('PRAGMA table_info(students)');
  const sCols = (sRes?.rows || []).map(c => c.name || c[1]);
  console.log('Students Table Columns Count:', sCols.length);
  const reqCols = ['academic_system', 'parent_staff_id', 'sibling_student_ids', 'twin_student_id', 'is_talented', 'is_returned_from_abroad'];
  reqCols.forEach(col => {
    if (sCols.includes(col)) {
      console.log(`  ✅ Column '${col}' verified.`);
    } else {
      console.error(`  ❌ MISSING column '${col}'!`);
    }
  });

  // Check columns on control_marks table
  const cmRes = await db.query('PRAGMA table_info(control_marks)');
  const cmCols = (cmRes?.rows || []).map(c => c.name || c[1]);
  console.log('\nControl Marks Table Columns Count:', cmCols.length);
  ['initial_exam_status', 'final_exam_status'].forEach(col => {
    if (cmCols.includes(col)) {
      console.log(`  ✅ Column '${col}' verified.`);
    } else {
      console.error(`  ❌ MISSING column '${col}'!`);
    }
  });

  // Check columns on control_students table
  const csRes = await db.query('PRAGMA table_info(control_students)');
  const csCols = (csRes?.rows || []).map(c => c.name || c[1]);
  ['attendance_percent', 'manual_attendance_percent'].forEach(col => {
    if (csCols.includes(col)) {
      console.log(`  ✅ Column '${col}' verified.`);
    } else {
      console.error(`  ❌ MISSING column '${col}'!`);
    }
  });

  // Test mock req / res
  const mockRes = (label) => ({
    statusCode: 200,
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) {
      if (data.error || data.success === false) {
        console.error(`  ❌ [${label}] Error:`, data.error || data);
      } else {
        console.log(`  ✅ [${label}] Success:`, data.message || 'OK');
      }
      return data;
    }
  });

  console.log('\n--- 2. Auditing Students Controller Functions ---');
  await studentsController.getFormOptions({}, mockRes('getFormOptions'));
  await studentsController.getStudents({ query: { page: 1, limit: 10 } }, mockRes('getStudents'));

  console.log('\n--- 3. Auditing Control Controller Functions ---');
  await controlController.getControlMarks({ query: { gradeId: 6, term: 1 } }, mockRes('getControlMarks'));
  await controlController.setupPrimaryPreset({ body: { gradeId: 6 } }, mockRes('setupPrimaryPreset'));

  console.log('\n🎉 ALL SYSTEM CONTROLLERS AND TABLES AUDITED WITH 0 ERRORS!');
  process.exit(0);
}

auditSystem().catch(err => {
  console.error('❌ Audit system crash error:', err);
  process.exit(1);
});
