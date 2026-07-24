const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) search(full);
    else if (f.endsWith('.js') || f.endsWith('.jsx')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('export/excel') || content.includes('studentRegister') || content.includes('studentsRegister') || content.includes('excelEndpoint')) {
        console.log('Found reference in:', full);
      }
    }
  }
}

search('d:/NeprasPro/backend');
search('d:/NeprasPro/frontend');
