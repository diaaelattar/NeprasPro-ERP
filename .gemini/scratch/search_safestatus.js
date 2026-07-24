const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) search(full);
    else if (f.endsWith('.js') || f.endsWith('.jsx')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('safeStatus')) {
        console.log('FOUND safeStatus in:', full);
        const lines = content.split('\n');
        lines.forEach((l, idx) => {
          if (l.includes('safeStatus')) console.log(`  Line ${idx + 1}: ${l.trim()}`);
        });
      }
    }
  }
}

search('d:/NeprasPro/backend');
search('d:/NeprasPro/frontend');
