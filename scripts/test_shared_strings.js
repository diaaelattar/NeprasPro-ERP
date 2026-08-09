const fs = require('fs');
const JSZip = require('jszip');

async function testSharedStringsVsInlineStr() {
  const templatePath = 'frontend/public/كشف_رصد_صفوف_أولى_بالطول.xltm';
  const zip = await JSZip.loadAsync(fs.readFileSync(templatePath));

  // Load sharedStrings.xml
  let sharedStringsXml = await zip.file('xl/sharedStrings.xml').async('string');
  console.log('Original sharedStrings count attribute:', sharedStringsXml.match(/count="(\d+)"/));
  console.log('Original uniqueCount attribute:', sharedStringsXml.match(/uniqueCount="(\d+)"/));
}

testSharedStringsVsInlineStr().catch(console.error);
