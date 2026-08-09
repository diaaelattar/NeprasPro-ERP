const fs = require('fs');
const file = 'd:\\NeprasPro\\backend\\modules\\students\\students.controller.js';
let code = fs.readFileSync(file, 'utf8');

const mappingStr = `
    const MACRO_TEMPLATES = {
      'primary_portrait': 'كشف_رصد_صفوف_أولى_بالطول.xltm',
      'primary_landscape': 'كشف_رصد_صفوف_أولى_بالعرض.xltm',
      'upper_primary_portrait': 'كشف_رصد_صفوف_عليا_بالطول.xltm',
      'upper_primary_landscape': 'كشف_رصد_صفوف_عليا_بالعرض.xltm',
      'prep_portrait': 'كشف_رصد_اعدادى_بالطول.xltm',
      'prep_landscape': 'كشف_رصد_اعدادى_بالعرض.xltm',
      'sec_portrait': 'كشف_رصد_ثانوى_بالطول.xltm',
      'sec_landscape': 'كشف_رصد_ثانوى_بالعرض.xltm',
    };
`;

// 1. Patch exportReportPdf
code = code.replace(/const reportMode = mode \|\| 'primary_portrait';\s+let xlsmBuf;\s+if \(reportMode === 'primary_portrait'\) \{[\s\S]*?\} else \{[\s\S]*?\}/, 
`const reportMode = mode || 'primary_portrait';
    let xlsmBuf;
    ${mappingStr}
    
    if (MACRO_TEMPLATES[reportMode]) {
      xlsmBuf = await excelReportEngine.generateMacroGradesReport({ templateName: MACRO_TEMPLATES[reportMode], school, className, yearLabel, students });
    } else if (reportMode === 'full_class_list') {
      xlsmBuf = await excelReportEngine.generateFullClassListReport({ classNameLabel: className, school, yearLabel, students });
    } else {
      xlsmBuf = await excelReportEngine.generateMacroGradesReport({ templateName: MACRO_TEMPLATES['primary_portrait'], school, className, yearLabel, students });
    }`);

// 2. Patch openInExcel
code = code.replace(/const reportMode = mode \|\| 'primary_portrait';\s+let xlsmBuf;\s+if \(reportMode === 'primary_portrait'\) \{[\s\S]*?\} else \{[\s\S]*?\}/, 
`const reportMode = mode || 'primary_portrait';
    let xlsmBuf;
    ${mappingStr}
    
    if (MACRO_TEMPLATES[reportMode]) {
      xlsmBuf = await excelReportEngine.generateMacroGradesReport({ templateName: MACRO_TEMPLATES[reportMode], school, className, yearLabel, students });
    } else if (reportMode === 'full_class_list') {
      xlsmBuf = await excelReportEngine.generateFullClassListReport({ classNameLabel: className, school, yearLabel, students });
    } else {
      xlsmBuf = await excelReportEngine.generateMacroGradesReport({ templateName: MACRO_TEMPLATES['primary_portrait'], school, className, yearLabel, students });
    }`);

// 3. Patch exportClassListExcel
code = code.replace(/if \(mode === 'primary_portrait'\) \{[\s\S]*?\} else if \(mode === 'full_class_list'\)/, 
`${mappingStr}
      if (MACRO_TEMPLATES[mode]) {
        const xlsmBuf = await excelReportEngine.generateMacroGradesReport({ templateName: MACRO_TEMPLATES[mode], school, className, yearLabel, students });
        const xlsmName = \`\${MACRO_TEMPLATES[mode].replace('.xltm', '')}_\${className}.xlsm\`;

        if (zip) {
          zip.file(xlsmName, xlsmBuf);
          if (includePdf === 'true' || includePdf === '1') {
            try {
              const pdfBuf = await excelToPdfConverter.convertXlsmToPdf(xlsmBuf, { school, className, yearLabel, students });
              zip.file(\`\${MACRO_TEMPLATES[mode].replace('.xltm', '')}_\${className}.pdf\`, pdfBuf);
            } catch (pdfErr) {
              console.error('[PDF Convert Error]', pdfErr);
            }
          }
        } else {
          singleBuffer = xlsmBuf;
          singleFileName = xlsmName;
        }
      } else if (mode === 'full_class_list')`);

code = code.replace(/\} else \{\s+\/\/\s*Fallback: standard primary portrait[\s\S]*?\}\s+\}/,
`} else {
        // Fallback
        const xlsmBuf = await excelReportEngine.generateMacroGradesReport({ templateName: 'كشف_رصد_صفوف_أولى_بالطول.xltm', school, className, yearLabel, students });
        const xlsmName = \`كشف_رصد_\${className}.xlsm\`;
        if (zip) zip.file(xlsmName, xlsmBuf);
        else { singleBuffer = xlsmBuf; singleFileName = xlsmName; }
      }
    }`);

fs.writeFileSync(file, code);
console.log('students.controller.js updated successfully');
