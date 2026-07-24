const fs = require('fs');
const path = require('path');

function search(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (!f.includes('node_modules') && !f.includes('.git') && !f.includes('dist')) {
        search(full);
      }
    } else if (f.endsWith('.xlsx') || f.endsWith('.xltx') || f.endsWith('.xls')) {
      console.log('Found template file:', full);
    }
  }
}

search('d:/NeprasPro');
