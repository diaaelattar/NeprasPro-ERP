const fs = require('fs');
const JSZip = require('jszip');

async function inspect() {
  const buf = fs.readFileSync('d:/NeprasPro/frontend/public/كشف_رصد_صفوف_أولى_بالطول.xltm');
  const zip = await JSZip.loadAsync(buf);

  for (let s = 1; s <= 3; s++) {
    const xml = await zip.file(`xl/worksheets/sheet${s}.xml`).async('string');
    console.log(`\n=================== SHEET${s}.XML ===================`);
    
    // Find row 5 or row 8
    const row5Match = xml.match(/<row r="5"[^>]*>[\s\S]*?<\/row>/);
    const row8Match = xml.match(/<row r="8"[^>]*>[\s\S]*?<\/row>/);
    
    if (row5Match) console.log('ROW 5:', row5Match[0]);
    if (row8Match) console.log('ROW 8:', row8Match[0]);
  }
}

inspect().catch(console.error);
