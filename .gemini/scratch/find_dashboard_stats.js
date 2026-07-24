const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) search(full);
    else if (f.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('students') && (content.includes('COUNT') || content.includes('stats'))) {
        console.log('Match in file:', full);
      }
    }
  }
}

search('d:/NeprasPro/backend');
