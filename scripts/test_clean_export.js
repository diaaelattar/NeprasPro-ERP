const fs = require('fs');
const JSZip = require('jszip');

async function testCleanExport() {
  const templatePath = 'frontend/public/كشف_رصد_صفوف_أولى_بالطول.xltm';
  if (!fs.existsSync(templatePath)) {
    console.log('Template not found at', templatePath);
    return;
  }

  const zip = await JSZip.loadAsync(fs.readFileSync(templatePath));

  // 1. Remove calcChain.xml file
  zip.remove('xl/calcChain.xml');

  // 2. Remove calcChain override from [Content_Types].xml
  if (zip.file('[Content_Types].xml')) {
    let ct = await zip.file('[Content_Types].xml').async('string');
    ct = ct.replace(/<Override PartName="\/xl\/calcChain\.xml"[^>]*\/>/g, '');
    zip.file('[Content_Types].xml', ct);
  }

  // 3. CRITICAL: Remove calcChain relationship from xl/_rels/workbook.xml.rels
  if (zip.file('xl/_rels/workbook.xml.rels')) {
    let rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
    rels = rels.replace(/<Relationship [^>]*Target="calcChain\.xml"[^>]*\/>/g, '');
    zip.file('xl/_rels/workbook.xml.rels', rels);
  }

  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync('clean_excel_test.xlsm', buf);
  console.log('✅ clean_excel_test.xlsm generated successfully! Size:', buf.length);
}

testCleanExport().catch(console.error);
