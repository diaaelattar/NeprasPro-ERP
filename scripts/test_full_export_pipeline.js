const fs = require('fs');
const JSZip = require('jszip');

async function testFullExportPipeline() {
  const templatePath = 'frontend/public/كشف_رصد_صفوف_أولى_بالطول.xltm';
  const zip = await JSZip.loadAsync(fs.readFileSync(templatePath));

  let sharedStringsXml = zip.file('xl/sharedStrings.xml') ? await zip.file('xl/sharedStrings.xml').async('string') : '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="0" uniqueCount="0"></sst>';
  const stringMap = new Map();
  const existingMatches = [...sharedStringsXml.matchAll(/<t[^>]*>(.*?)<\/t>/g)];
  existingMatches.forEach((m, idx) => {
    stringMap.set(m[1], idx);
  });
  let stringCount = existingMatches.length;

  const addSharedString = (text) => {
    if (text === null || text === undefined) text = '';
    const strText = String(text);
    if (stringMap.has(strText)) {
      return stringMap.get(strText);
    }
    const esc = strText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const newIdx = stringCount++;
    stringMap.set(strText, newIdx);
    sharedStringsXml = sharedStringsXml.replace('</sst>', `<si><t>${esc}</t></si></sst>`);
    return newIdx;
  };

  const setCell = (xml, cellRef, text) => {
    const sIdx = addSharedString(text);
    const cellRegex = new RegExp(`<c r="${cellRef}"([^>]*?)>(.*?)</c>|<c r="${cellRef}"([^>]*?)/?>`, 's');
    const match = xml.match(cellRegex);

    if (match) {
      const attrs = match[1] || match[3] || '';
      const styleMatch = attrs.match(/\bs="[^"]*"/);
      const styleAttr = styleMatch ? ` ${styleMatch[0]}` : '';
      const replacement = `<c r="${cellRef}"${styleAttr} t="s"><v>${sIdx}</v></c>`;
      return xml.replace(cellRegex, replacement);
    } else {
      const rowNum = cellRef.match(/\d+/)[0];
      const rowOpenRegex = new RegExp(`(<row r="${rowNum}"[^>]*>)`);
      const newCellXml = `<c r="${cellRef}" t="s"><v>${sIdx}</v></c>`;
      if (rowOpenRegex.test(xml)) {
        return xml.replace(rowOpenRegex, `$1${newCellXml}`);
      }
      return xml.replace('</sheetData>', `<row r="${rowNum}">${newCellXml}</row></sheetData>`);
    }
  };

  let sheet1 = await zip.file('xl/worksheets/sheet1.xml').async('string');
  sheet1 = setCell(sheet1, 'A1', 'محافظة : الجيزة');
  sheet1 = setCell(sheet1, 'A2', 'إدارة : العمرانية');
  sheet1 = setCell(sheet1, 'A3', 'مدرسة : الشهيد محمد سليمان سلامة ع');
  sheet1 = setCell(sheet1, 'C2', 'فصل : 1 / 14 ع');
  sheet1 = setCell(sheet1, 'C3', 'للعام الدراسي : 2026/2027');

  // Fill student data
  for (let i = 0; i < 25; i++) {
    const r = 5 + i;
    sheet1 = setCell(sheet1, `A${r}`, i + 1);
    sheet1 = setCell(sheet1, `B${r}`, `أحمد محمود السيد - طالب ${i + 1}`);
    sheet1 = setCell(sheet1, `C${r}`, 'منقول');
  }

  sharedStringsXml = sharedStringsXml.replace(/count="\d+"/, `count="${stringCount}"`);
  sharedStringsXml = sharedStringsXml.replace(/uniqueCount="\d+"/, `uniqueCount="${stringCount}"`);
  zip.file('xl/sharedStrings.xml', sharedStringsXml);
  zip.file('xl/worksheets/sheet1.xml', sheet1);

  zip.remove('xl/calcChain.xml');
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

  const finalBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync('final_perfect_export.xlsm', finalBuf);
  console.log('✅ Final export file generated: final_perfect_export.xlsm, size:', finalBuf.length);

  // Verification checks
  const checkZip = await JSZip.loadAsync(finalBuf);
  console.log('Has calcChain.xml:', Boolean(checkZip.file('xl/calcChain.xml')));
  const finalRels = await checkZip.file('xl/_rels/workbook.xml.rels').async('string');
  console.log('Rels has calcChain ref:', finalRels.includes('calcChain'));
  const finalSheet1 = await checkZip.file('xl/worksheets/sheet1.xml').async('string');
  console.log('B5 cell XML in final sheet1:', finalSheet1.match(/<c r="B5"[^>]*>.*?<\/c>/)[0]);
}

testFullExportPipeline().catch(console.error);
