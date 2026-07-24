const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Read zip file manually
const buf = fs.readFileSync('backend/templates/reports/سجل_الطلاب_المدمجين.xltx');

// Search for sharedStrings.xml content in zip
const str = buf.toString('utf8', 0, buf.length);
console.log('Zip file size:', buf.length, 'bytes');

// Let's use JSZip or AdmZip if available, or ExcelJS stream
const ExcelJS = require('exceljs');
const wb = new ExcelJS.Workbook();
wb.xlsx.readFile('backend/templates/reports/سجل_الطلاب_المدمجين.xltx').then(() => {
  const ws = wb.worksheets[0];
  console.log('Sheet Name:', ws.name);
  console.log('Row count:', ws.rowCount);
  for (let r = 1; r <= 10; r++) {
    const row = ws.getRow(r);
    const vals = [];
    row.eachCell((cell, col) => {
      vals.push(`Col ${col}: ${cell.text || cell.value}`);
    });
    console.log(`Row ${r}:`, vals.join(' | '));
  }
}).catch(console.error);
