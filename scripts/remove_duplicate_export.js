const fs = require('fs');
const code = fs.readFileSync('d:/NeprasPro/backend/modules/students/students.controller.js', 'utf8');
const lines = code.split('\n');

// Find closing }; after line 1671 (0-indexed: 1670)
let depth = 0;
let started = false;
let closeLine = -1;
for (let i = 1670; i < lines.length; i++) {
  const line = lines[i];
  for (const ch of line) {
    if (ch === '{') { depth++; started = true; }
    if (ch === '}') { depth--; }
  }
  if (started && depth === 0) {
    closeLine = i + 1; // 1-indexed
    console.log('Second exportClassListExcel closes at line:', closeLine);
    console.log('Content:', lines[i]);
    break;
  }
}

if (closeLine === -1) {
  console.error('Could not find closing line!');
  process.exit(1);
}

// Delete lines from 1670 to closeLine inclusive (comment line 1670 + function)
// 1-indexed: 1670 to closeLine
const startDelete = 1670 - 1; // 0-indexed
const endDelete   = closeLine; // 0-indexed exclusive

const newLines = [...lines.slice(0, startDelete), ...lines.slice(endDelete)];
fs.writeFileSync('d:/NeprasPro/backend/modules/students/students.controller.js', newLines.join('\n'), 'utf8');
console.log(`Deleted lines ${startDelete + 1} to ${endDelete} (${endDelete - startDelete} lines removed).`);
