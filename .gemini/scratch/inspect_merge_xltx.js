const ExcelJS = require('exceljs');
const path = require('path');

async function inspectMergeTemplate() {
  const wb = new ExcelJS.Workbook();
  const filePath = path.join(__dirname, '../backend/templates/reports/سجل_الطلاب_المدمجين.xltx');
  await wb.xlsx.readFile(filePath);
  const ws = wb.worksheets[0];

  console.log('Worksheet Name:', ws.name);
  console.log('Total Rows:', ws.rowCount);

  // Inspect first 10 rows
  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= 10) {
      const values = row.values.map(v => typeof v === 'object' ? (v?.result || v?.richText?.map(t => t.text).join('') || JSON.stringify(v)) : v);
      console.log(`Row ${rowNumber}:`, values.slice(1));
    }
  });
}

inspectMergeTemplate().catch(console.error);
