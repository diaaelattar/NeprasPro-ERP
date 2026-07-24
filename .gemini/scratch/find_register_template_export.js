const fs = require('fs');

const content = fs.readFileSync('d:/NeprasPro/backend/modules/students/students.controller.js', 'utf8');
const lines = content.split('\n');

lines.forEach((l, idx) => {
  if (l.includes('register_template') || l.includes('exportExcelTemplate') || l.includes('export/excel')) {
    console.log(`Line ${idx + 1}: ${l.trim()}`);
  }
});
