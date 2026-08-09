const fs = require('fs');
const JSZip = require('jszip');

async function inspect() {
  for (const filename of ['كشف_رصد_صفوف_أولى_بالطول.xltm', 'كشف_رصد_صفوف_أولى_بالعرض.xltm']) {
    console.log('\n========================================');
    console.log('FILE:', filename);
    console.log('========================================');
    const buf = fs.readFileSync('d:/NeprasPro/frontend/public/' + filename);
    const zip = await JSZip.loadAsync(buf);

    for (let i = 1; i <= 5; i++) {
      const entryName = `xl/worksheets/sheet${i}.xml`;
      const file = zip.file(entryName);
      if (!file) continue;
      const xml = await file.async('string');
      
      const rows = [];
      const rowRegex = /<row r="(\d+)"[^>]*>/g;
      let match;
      while ((match = rowRegex.exec(xml)) !== null) {
        rows.push(parseInt(match[1]));
      }

      console.log(`\n--- ${entryName} ---`);
      console.log('Total rows:', rows.length);
      console.log('Min row:', rows.length ? Math.min(...rows) : 'none');
      console.log('Max row:', rows.length ? Math.max(...rows) : 'none');
      console.log('First 20 rows:', rows.slice(0, 20).join(', '));
      console.log('Last 10 rows:', rows.slice(-10).join(', '));
      
      // Let's also check if sharedStrings is used in template!
      const ssFile = zip.file('xl/sharedStrings.xml');
      console.log('Has sharedStrings.xml:', !!ssFile);
    }
  }
}

inspect().catch(console.error);
