const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      searchDir(full);
    } else if (f.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf8');
      const matches = content.match(/SELECT\s+.*FROM\s+students[^\n]*/gi);
      if (matches) {
        console.log(`\nFile: ${full}`);
        matches.forEach(m => console.log('  ', m.trim()));
      }
    }
  }
}

searchDir('d:/NeprasPro/backend');
