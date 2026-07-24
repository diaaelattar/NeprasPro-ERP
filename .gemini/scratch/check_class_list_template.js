const fs = require('fs');
const path = require('path');

const rootFiles = fs.readdirSync('d:/NeprasPro');
console.log('Root xltx/xlsx files:');
rootFiles.forEach(f => {
  if (f.endsWith('.xltx') || f.endsWith('.xlsx')) {
    console.log(' -', f);
  }
});

const reportTemplatesDir = 'd:/NeprasPro/backend/templates/reports';
if (fs.existsSync(reportTemplatesDir)) {
  console.log('Templates in backend/templates/reports:');
  fs.readdirSync(reportTemplatesDir).forEach(f => console.log(' -', f));
}
