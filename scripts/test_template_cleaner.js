const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function testCleanZip(filePath) {
  if (!fs.existsSync(filePath)) return;
  console.log('\n--- Cleaning zip template:', path.basename(filePath));
  const zip = await JSZip.loadAsync(fs.readFileSync(filePath));

  // 1. Check & clean calcChain.xml and its relationship
  if (zip.file('xl/calcChain.xml')) {
    zip.remove('xl/calcChain.xml');
  }

  if (zip.file('[Content_Types].xml')) {
    let ct = await zip.file('[Content_Types].xml').async('string');
    ct = ct.replace(/<Override PartName="\/xl\/calcChain\.xml"[^>]*\/>/g, '');
    zip.file('[Content_Types].xml', ct);
  }

  if (zip.file('xl/_rels/workbook.xml.rels')) {
    let rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
    rels = rels.replace(/<Relationship [^>]*Target="calcChain\.xml"[^>]*\/>/g, '');
    zip.file('xl/_rels/workbook.xml.rels', rels);
  }

  // 2. Check & clean broken definedNames in xl/workbook.xml (#REF! or draft names)
  if (zip.file('xl/workbook.xml')) {
    let wbXml = await zip.file('xl/workbook.xml').async('string');
    if (wbXml.includes('#REF!') || wbXml.includes('lolo') || wbXml.includes('ty_u')) {
      console.log('Found broken definedNames in xl/workbook.xml!');
      // Remove definedNames that contain #REF! or draft names
      wbXml = wbXml.replace(/<definedName [^>]*>.*?#REF!.*?<\/definedName>/g, '');
      wbXml = wbXml.replace(/<definedName name="lolo[^"]*"[^>]*>.*?<\/definedName>/g, '');
      wbXml = wbXml.replace(/<definedName name="ty_u[^"]*"[^>]*>.*?<\/definedName>/g, '');
      // Clean empty <definedNames></definedNames> if empty
      wbXml = wbXml.replace(/<definedNames>\s*<\/definedNames>/g, '');
      zip.file('xl/workbook.xml', wbXml);
      console.log('Cleaned broken definedNames from xl/workbook.xml');
    }
  }

  const outBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const outPath = path.join(__dirname, 'perfect_' + path.basename(filePath).replace('.xltm', '.xlsm').replace('.xltx', '.xlsx'));
  fs.writeFileSync(outPath, outBuf);
  console.log('Saved perfect file:', outPath, 'Size:', outBuf.length);
}

async function run() {
  await testCleanZip('frontend/public/كشف_رصد_صفوف_أولى_بالطول.xltm');
  await testCleanZip('frontend/public/كشف_رصد_صفوف_أولى_بالعرض.xltm');
  await testCleanZip('register_template.xltx');
}

run().catch(console.error);
