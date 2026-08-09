const fs = require('fs');
const file = 'd:\\NeprasPro\\backend\\services\\excelReportEngine.js';
let code = fs.readFileSync(file, 'utf8');

const newFunc = `
/**
 * Generates unified Macro Grades Reports (Portrait & Landscape) (.xlsm)
 */
async function generateMacroGradesReport({ templateName, school, className, yearLabel, students }) {
  const templatePath = resolveTemplatePath('students', templateName);
  if (!templatePath) throw new Error(\`قالب \${templateName} غير موجود\`);

  const tempPath = createTempTemplateCopy(templatePath, '.xlsm');

  try {
    const rawData = fs.readFileSync(tempPath);
    const zip = await JSZip.loadAsync(rawData);

    await patchContentTypeToWorkbook(zip);

    let sheet1 = await zip.file('xl/worksheets/sheet1.xml').async('string');
    
    // Inject headers:
    sheet1 = setInlineStringCell(sheet1, 'A1', \`محافظة : \${school.governorate || ''}\`);
    sheet1 = setInlineStringCell(sheet1, 'D2', \`مدرسة : \${school.school_name || ''}\`);
    sheet1 = setInlineStringCell(sheet1, 'B3', \`للعام الدراسي \${yearLabel}\`);

    const STATUS_LABELS = { promoted: 'منقول', retained: 'باقٍ للإعادة', suspended: 'موقوف قيده' };

    students.forEach((s, i) => {
      const statusText = STATUS_LABELS[s.status] || s.status || '';
      if (i < 25) {
        const r = 5 + i;
        sheet1 = setInlineStringCell(sheet1, \`A\${r}\`, i + 1);
        sheet1 = setInlineStringCell(sheet1, \`B\${r}\`, s.full_name_ar || '');
        sheet1 = setInlineStringCell(sheet1, \`C\${r}\`, statusText);
      } else if (i < 50) {
        const r = 5 + (i - 25);
        sheet1 = setInlineStringCell(sheet1, \`D\${r}\`, i + 1);
        sheet1 = setInlineStringCell(sheet1, \`E\${r}\`, s.full_name_ar || '');
        sheet1 = setInlineStringCell(sheet1, \`F\${r}\`, statusText);
      }
    });

    zip.file('xl/worksheets/sheet1.xml', sheet1);

    const rawBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return await finalizeCleanBuffer(rawBuf);
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}
`;

code = code.replace('module.exports = {', newFunc + '\nmodule.exports = {');
code = code.replace('generateFullClassListReport', 'generateFullClassListReport,\n  generateMacroGradesReport');

fs.writeFileSync(file, code);
console.log('excelReportEngine updated successfully');
