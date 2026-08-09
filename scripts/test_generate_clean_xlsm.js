const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function generateTestSheet() {
  const templatePath = 'd:/NeprasPro/frontend/public/كشف_رصد_صفوف_أولى_بالطول.xltm';
  const buf = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(buf);

  // Set cell while preserving existing cell style s="..."
  const setCell = (xml, cellRef, text) => {
    if (text === null || text === undefined) text = '';
    const esc = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const cellRegex = new RegExp(`<c r="${cellRef}"([^>]*?)>(.*?)</c>|<c r="${cellRef}"([^>]*?)/?>`, 's');
    const match = xml.match(cellRegex);

    if (match) {
      const attrs = match[1] || match[3] || '';
      const styleMatch = attrs.match(/\bs="[^"]*"/);
      const styleAttr = styleMatch ? ` ${styleMatch[0]}` : '';
      const replacement = `<c r="${cellRef}"${styleAttr} t="inlineStr"><is><t>${esc}</t></is></c>`;
      return xml.replace(cellRegex, replacement);
    } else {
      const rowNum = cellRef.match(/\d+/)[0];
      const rowOpenRegex = new RegExp(`(<row r="${rowNum}"[^>]*>)`);
      const newCellXml = `<c r="${cellRef}" t="inlineStr"><is><t>${esc}</t></is></c>`;
      if (rowOpenRegex.test(xml)) {
        return xml.replace(rowOpenRegex, `$1${newCellXml}`);
      }
      return xml.replace('</sheetData>', `<row r="${rowNum}">${newCellXml}</row></sheetData>`);
    }
  };

  let sheet1 = await zip.file('xl/worksheets/sheet1.xml').async('string');
  sheet1 = setCell(sheet1, 'A1', 'محافظة : الدقهلية');
  sheet1 = setCell(sheet1, 'A2', 'إدارة : المنصورة');
  sheet1 = setCell(sheet1, 'A3', 'مدرسة : نبرأس الرسمية');
  sheet1 = setCell(sheet1, 'C2', 'فصل : 1 / 1');
  sheet1 = setCell(sheet1, 'C3', 'للعام الدراسي : 2025/2026');

  // Fill 50 sample students ONLY in sheet1 (فصل)
  for (let i = 0; i < 25; i++) {
    const r = 5 + i;
    sheet1 = setCell(sheet1, `A${r}`, i + 1);
    sheet1 = setCell(sheet1, `B${r}`, `طالب اختبار ${i + 1}`);
    sheet1 = setCell(sheet1, `C${r}`, 'منقول');
  }
  for (let i = 25; i < 50; i++) {
    const r = 5 + (i - 25);
    sheet1 = setCell(sheet1, `D${r}`, i + 1);
    sheet1 = setCell(sheet1, `E${r}`, `طالب اختبار ${i + 1}`);
    sheet1 = setCell(sheet1, `F${r}`, 'منقول');
  }

  zip.file('xl/worksheets/sheet1.xml', sheet1);
  zip.remove('xl/calcChain.xml');

  let contentTypesStr = await zip.file('[Content_Types].xml').async('string');
  contentTypesStr = contentTypesStr.replace(
    'application/vnd.ms-excel.template.macroEnabled.main+xml',
    'application/vnd.ms-excel.sheet.macroEnabled.main+xml'
  );
  contentTypesStr = contentTypesStr.replace(/<Override PartName="\/xl\/calcChain\.xml"[^>]*\/>/g, '');
  zip.file('[Content_Types].xml', contentTypesStr);

  const finalBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const outPath = 'd:/NeprasPro/test_portrait_output.xlsm';
  fs.writeFileSync(outPath, finalBuffer);
  console.log('✅ Generated clean test file:', outPath);
}

generateTestSheet().catch(console.error);
