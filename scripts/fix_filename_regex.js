// Fix ALL remaining double-escaped regex patterns in setCell functions
const fs = require('fs');
const filePath = 'd:/NeprasPro/backend/modules/students/students.controller.js';

let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

let fixCount = 0;

lines.forEach((line, i) => {
  const lineNum = i + 1;

  // Fix \\bs= -> \bs= in attrs.match regex (word boundary)
  if (line.includes('attrs.match') && line.includes('\\\\bs=')) {
    const oldLine = line;
    lines[i] = line.replace('\\\\bs=', '\\bs=');
    console.log(`Fixed line ${lineNum}: \\\\bs= -> \\bs=`);
    console.log(`  OLD: ${oldLine.trim()}`);
    console.log(`  NEW: ${lines[i].trim()}`);
    fixCount++;
  }

  // Fix \\d+ -> \d+ in cellRef.match regex (digits)
  if (line.includes('.match(/') && line.includes('\\\\d+')) {
    const oldLine = line;
    lines[i] = line.replace('\\\\d+', '\\d+');
    console.log(`Fixed line ${lineNum}: \\\\d+ -> \\d+`);
    console.log(`  OLD: ${oldLine.trim()}`);
    console.log(`  NEW: ${lines[i].trim()}`);
    fixCount++;
  }
});

content = lines.join('\n');
fs.writeFileSync(filePath, content, 'utf8');
console.log(`\n✅ Total fixes applied: ${fixCount}`);
