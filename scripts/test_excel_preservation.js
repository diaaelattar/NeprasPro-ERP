const fs = require('fs');
const JSZip = require('jszip');

async function testPreservation() {
  const buf = fs.readFileSync('d:/NeprasPro/frontend/public/كشف_رصد_صفوف_أولى_بالطول.xltm');
  const zip = await JSZip.loadAsync(buf);

  // Smart setCell that preserves existing cell style 's="..."' attribute!
  const setCellPreserve = (xml, cellRef, text) => {
    if (text === null || text === undefined) text = '';
    const esc = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Regex to match existing cell tag <c r="Ref" ...> ... </c> or <c r="Ref" ... />
    const cellRegex = new RegExp(`<c r="${cellRef}"([^>]*?)>(.*?)</c>|<c r="${cellRef}"([^>]*?)/?>`, 's');
    const match = xml.match(cellRegex);

    if (match) {
      const attrs = match[1] || match[3] || '';
      // Preserve existing style attribute s="..." if present!
      const styleMatch = attrs.match(/\bs="[^"]*"/);
      const styleAttr = styleMatch ? ` ${styleMatch[0]}` : '';

      const replacement = `<c r="${cellRef}"${styleAttr} t="inlineStr"><is><t>${esc}</t></is></c>`;
      return xml.replace(cellRegex, replacement);
    } else {
      // Row must exist, insert before closing </row> or append inside row
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
  
  console.log('Original B5 in sheet1:');
  const origB5 = sheet1.match(/<c r="B5"[^>]*>.*?<\/c>|<c r="B5"[^>]*\/>/s);
  console.log(origB5 ? origB5[0] : 'not found');

  sheet1 = setCellPreserve(sheet1, 'B5', 'أحمد محمود إبراهيم');

  console.log('\nModified B5 in sheet1:');
  const modB5 = sheet1.match(/<c r="B5"[^>]*>.*?<\/c>|<c r="B5"[^>]*\/>/s);
  console.log(modB5 ? modB5[0] : 'not found');
}

testPreservation().catch(console.error);
