const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const JSZip = require('jszip');

async function testRegisterExport() {
  const defaultTemplatePath = path.join(__dirname, '../backend/templates/reports/student_register_41d_template.xltx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(defaultTemplatePath);
  const ws = wb.worksheets[0];

  ws.getCell('B2').value = 'محافظة : الجيزة';
  ws.getCell('B3').value = 'إدارة : العمرانية';
  ws.getCell('B4').value = 'مدرسة : الشهيد محمد سليمان سلامة ع';

  for (let i = 0; i < 20; i++) {
    const r = 8 + i;
    ws.getCell(`A${r}`).value = i + 1;
    ws.getCell(`B${r}`).value = `طالب تجريبي ${i + 1}`;
    ws.getCell(`C${r}`).value = '30101010101010';
  }

  const buffer = await wb.xlsx.writeBuffer();
  fs.writeFileSync('exceljs_register_out.xlsx', buffer);
  console.log('✅ Generated exceljs_register_out.xlsx, size:', buffer.length);

  // Inspect the generated zip structure
  const zip = await JSZip.loadAsync(buffer);
  console.log('Has calcChain.xml:', Boolean(zip.file('xl/calcChain.xml')));
  console.log('Has definedNames in workbook.xml:');
  const wbXml = await zip.file('xl/workbook.xml').async('string');
  console.log(wbXml.match(/<definedNames>.*?<\/definedNames>/s)?.[0] || 'No definedNames');
}

testRegisterExport().catch(console.error);
