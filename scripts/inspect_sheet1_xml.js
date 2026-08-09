const fs = require('fs');
const JSZip = require('jszip');

async function inspectSheet() {
  const templatePath = 'frontend/public/كشف_رصد_صفوف_أولى_بالطول.xltm';
  const zip = await JSZip.loadAsync(fs.readFileSync(templatePath));
  const s1 = await zip.file('xl/worksheets/sheet1.xml').async('string');

  console.log('--- Searching for rows 1 to 10 in sheet1.xml ---');
  for (let r = 1; r <= 10; r++) {
    const rowMatch = s1.match(new RegExp(`<row r="${r}"[^>]*>(.*?)</row>`, 's'));
    if (rowMatch) {
      console.log(`Row ${r}:`, rowMatch[0]);
    } else {
      console.log(`Row ${r}: NOT FOUND in XML`);
    }
  }
}

inspectSheet().catch(console.error);
