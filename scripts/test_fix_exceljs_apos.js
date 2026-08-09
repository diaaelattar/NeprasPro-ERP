const fs = require('fs');
const JSZip = require('jszip');

async function fixExcelJSBuffer(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  let modified = false;

  // 1. Clean &apos; from xl/workbook.xml
  if (zip.file('xl/workbook.xml')) {
    let wbXml = await zip.file('xl/workbook.xml').async('string');
    if (wbXml.includes('&apos;')) {
      wbXml = wbXml.replaceAll('&apos;', "'");
      zip.file('xl/workbook.xml', wbXml);
      modified = true;
      console.log('  - Fixed &apos; to single quote in xl/workbook.xml');
    }
  }

  // 2. Clean calcChain.xml and its relationship if present
  if (zip.file('xl/calcChain.xml')) {
    zip.remove('xl/calcChain.xml');
    modified = true;
  }
  if (zip.file('[Content_Types].xml')) {
    let ct = await zip.file('[Content_Types].xml').async('string');
    if (ct.includes('calcChain.xml')) {
      ct = ct.replace(/<Override PartName="\/xl\/calcChain\.xml"[^>]*\/>/g, '');
      zip.file('[Content_Types].xml', ct);
      modified = true;
    }
  }
  if (zip.file('xl/_rels/workbook.xml.rels')) {
    let rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
    if (rels.includes('calcChain.xml')) {
      rels = rels.replace(/<Relationship [^>]*Target="calcChain\.xml"[^>]*\/>/g, '');
      zip.file('xl/_rels/workbook.xml.rels', rels);
      modified = true;
    }
  }

  if (modified) {
    return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }
  return buffer;
}

async function testFix() {
  const buf = fs.readFileSync('exceljs_register_out.xlsx');
  const cleanBuf = await fixExcelJSBuffer(buf);
  fs.writeFileSync('exceljs_register_fixed.xlsx', cleanBuf);
  console.log('✅ Generated exceljs_register_fixed.xlsx!');

  const checkZip = await JSZip.loadAsync(cleanBuf);
  const wbXml = await checkZip.file('xl/workbook.xml').async('string');
  console.log('Cleaned definedNames in workbook.xml:');
  console.log(wbXml.match(/<definedNames>.*?<\/definedNames>/s)?.[0] || 'No definedNames');
}

testFix().catch(console.error);
