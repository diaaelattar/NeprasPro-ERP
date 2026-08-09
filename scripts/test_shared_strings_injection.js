const fs = require('fs');
const JSZip = require('jszip');

async function testSharedStringsInjection() {
  const templatePath = 'frontend/public/كشف_رصد_صفوف_أولى_بالطول.xltm';
  const zip = await JSZip.loadAsync(fs.readFileSync(templatePath));

  let sharedStringsXml = await zip.file('xl/sharedStrings.xml').async('string');
  let sheet1 = await zip.file('xl/worksheets/sheet1.xml').async('string');

  // Helper to add string to sharedStrings.xml and return index
  const stringMap = new Map();
  // Parse existing sharedStrings
  const matches = [...sharedStringsXml.matchAll(/<t[^>]*>(.*?)<\/t>/g)];
  matches.forEach((m, idx) => {
    stringMap.set(m[1], idx);
  });
  let stringCount = matches.length;

  const addString = (text) => {
    if (text === null || text === undefined) text = '';
    const strText = String(text);
    if (stringMap.has(strText)) {
      return stringMap.get(strText);
    }
    const esc = strText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const newIdx = stringCount++;
    stringMap.set(strText, newIdx);
    // Append to sharedStringsXml before </sst>
    sharedStringsXml = sharedStringsXml.replace('</sst>', `<si><t>${esc}</t></si></sst>`);
    return newIdx;
  };

  // Replace setCell with Shared String t="s"
  const setCellStr = (xml, cellRef, text) => {
    const sIdx = addString(text);
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

  // Test setCellStr on sheet1
  sheet1 = setCellStr(sheet1, 'A1', 'محافظة : الجيزة');
  sheet1 = setCellStr(sheet1, 'A2', 'إدارة : العمرانية');
  sheet1 = setCellStr(sheet1, 'A3', 'مدرسة : الشهيد محمد سليمان سلامة ع');
  sheet1 = setCellStr(sheet1, 'C2', 'فصل : 1 / 14 ع');
  sheet1 = setCellStr(sheet1, 'C3', 'للعام الدراسي : 2026/2027');

  // Fill student names in B5:B30 and E5:E30
  for (let i = 0; i < 25; i++) {
    const r = 5 + i;
    sheet1 = setCellStr(sheet1, `A${r}`, String(i + 1));
    sheet1 = setCellStr(sheet1, `B${r}`, `طالب تجريبي ${i + 1}`);
    sheet1 = setCellStr(sheet1, `C${r}`, 'منقول');
  }

  // Update sharedStrings count and uniqueCount in XML
  sharedStringsXml = sharedStringsXml.replace(/count="\d+"/, `count="${stringCount}"`);
  sharedStringsXml = sharedStringsXml.replace(/uniqueCount="\d+"/, `uniqueCount="${stringCount}"`);

  zip.file('xl/sharedStrings.xml', sharedStringsXml);
  zip.file('xl/worksheets/sheet1.xml', sheet1);

  // Clean calcChain.xml and workbook.xml.rels
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

  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync('all_sheets_perfect_test.xlsm', buf);
  console.log('✅ Generated all_sheets_perfect_test.xlsm with Shared Strings! Size:', buf.length);
}

testSharedStringsInjection().catch(console.error);
