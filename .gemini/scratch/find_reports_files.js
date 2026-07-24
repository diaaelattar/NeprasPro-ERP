const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) search(full);
    else if (f.toLowerCase().includes('report')) {
      console.log('Report file:', full);
    }
  }
}

search('d:/NeprasPro/frontend/src');
