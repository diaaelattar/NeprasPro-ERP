const fs = require('fs');
const path = require('path');

console.log('--- Searching root directory d:/NeprasPro ---');
fs.readdirSync('d:/NeprasPro').forEach(f => {
  if (f.includes('مدمج') || f.includes('دمج') || f.endsWith('.xltx') || f.endsWith('.xlsx')) {
    console.log(' -', f);
  }
});

const reportDir = 'd:/NeprasPro/backend/templates/reports';
if (fs.existsSync(reportDir)) {
  console.log('\n--- Searching backend/templates/reports ---');
  fs.readdirSync(reportDir).forEach(f => {
    console.log(' -', f);
  });
}
