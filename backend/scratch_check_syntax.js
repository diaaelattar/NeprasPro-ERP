try {
  require('./modules/students/students.controller');
  console.log('✅ Syntax Check Passed: students.controller.js is valid!');
} catch (e) {
  console.error('❌ Syntax Check Failed:', e);
}
