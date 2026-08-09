const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

async function testExcelJSExport() {
  const templatePath = path.join(__dirname, '../register_template.xltx');
  if (!fs.existsSync(templatePath)) {
    console.log('Template not found:', templatePath);
    return;
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  
  console.log('Defined names in template:', wb.definedNames);

  // Write to test file
  const testPath = path.join(__dirname, 'exceljs_test_output.xlsx');
  await wb.xlsx.writeFile(testPath);
  console.log('✅ Generated exceljs_test_output.xlsx successfully!');
}

testExcelJSExport().catch(console.error);
