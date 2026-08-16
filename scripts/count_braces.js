/**
 * Precise brace-counting script with line tracking
 */

const fs = require('fs');
const content = fs.readFileSync('d:/NeprasPro/frontend/src/pages/settings/SettingsPage.jsx', 'utf8');
const lines = content.split('\n');

let depth = 0;
let maxDepth = 0;
let lastZeroLine = 0;
const issues = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Skip strings and comments roughly
  const stripped = line
    .replace(/`[^`]*`/g, '""')
    .replace(/"[^"]*"/g, '""')
    .replace(/'[^']*'/g, "''")
    .replace(/\/\/.*$/, '');

  for (const ch of stripped) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth < 0) {
      issues.push(`Line ${i + 1}: depth went negative! => ${line.trim().substring(0, 80)}`);
      depth = 0;
    }
    maxDepth = Math.max(maxDepth, depth);
  }

  if (depth === 0) lastZeroLine = i + 1;
}

console.log(`Final depth: ${depth} (should be 0 for valid JS)`);
console.log(`Max depth reached: ${maxDepth}`);
console.log(`Last line where depth was 0: ${lastZeroLine} of ${lines.length}`);
if (issues.length > 0) {
  console.log('\nNegative depth issues:');
  issues.forEach(i => console.log(' ', i));
} else {
  console.log('\nNo negative depth issues found.');
  if (depth > 0) {
    console.log(`\nWarning: ${depth} unclosed brace(s) - file may be incomplete!`);
  }
}
