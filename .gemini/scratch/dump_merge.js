const ExcelJS = require('exceljs');
const fs = require('fs');

async function dump() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('backend/templates/reports/سجل_الطلاب_المدمجين.xltx');
  const ws = wb.worksheets[0];
  const rows = [];

  ws.eachRow((row, rowNum) => {
    if (rowNum <= 15) {
      const rowVals = [];
      row.eachCell((cell, colNum) => {
        rowVals.push({ col: colNum, val: cell.text || cell.value });
      });
      rows.push({ row: rowNum, cells: rowVals });
    }
  });

  fs.writeFileSync('d:/NeprasPro/.gemini/scratch/merge_template_dump.json', JSON.stringify(rows, null, 2));
  console.log('DUMP COMPLETE!');
}

dump().catch(err => console.error(err));
