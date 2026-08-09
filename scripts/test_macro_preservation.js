const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const excelReportEngine = require('../backend/services/excelReportEngine');

async function testMacroExport() {
  console.log('🧪 Testing Native Direct Template Export & VBA Macro Preservation...');

  const sampleSchool = { school_name: 'مدرسة النجاح الرسمية', governorate: 'الجيزة', directorate: 'العمرانية' };
  const sampleStudents = [];
  for (let i = 1; i <= 35; i++) {
    sampleStudents.push({
      id: i,
      full_name_ar: `طالب تجريبي ${i}`,
      national_id: `301010101010${i < 10 ? '0' + i : i}`,
      gender: i % 2 === 0 ? 'أنثى' : 'ذكر',
      status: 'promoted',
      birth_date: '2015-05-15',
      classroom_name: '1 / 1 ع'
    });
  }

  // 1. Generate Portrait XLSM
  const portraitBuf = await excelReportEngine.generatePrimaryPortraitSheet({
    school: sampleSchool,
    className: '1 / 14 ع',
    yearLabel: '2026/2027',
    students: sampleStudents
  });

  fs.writeFileSync('test_portrait_macro.xlsm', portraitBuf);
  console.log('✅ Generated test_portrait_macro.xlsm (size:', portraitBuf.length, 'bytes)');

  // 2. Verify VBA Macro File Integrity
  const zip = await JSZip.loadAsync(portraitBuf);

  const hasVba = zip.file('xl/vbaProject.bin') !== null;
  const contentType = await zip.file('[Content_Types].xml').async('string');
  const isMacroSheetCT = contentType.includes('application/vnd.ms-excel.sheet.macroEnabled.main+xml');
  const sheet1Xml = await zip.file('xl/worksheets/sheet1.xml').async('string');
  const hasInlineStr = sheet1Xml.includes('t="inlineStr"');

  console.log('\n--- OpenXML Macro Integrity Check ---');
  console.log(`  1. VBA Macro Binary (xl/vbaProject.bin): ${hasVba ? '✅ PRESENT & INTACT' : '❌ MISSING'}`);
  console.log(`  2. ContentType Sheet Macro Transformation: ${isMacroSheetCT ? '✅ CORRECT (.xlsm)' : '❌ INCORRECT'}`);
  console.log(`  3. Inline String Data Injection (t="inlineStr"): ${hasInlineStr ? '✅ VERIFIED' : '❌ MISSING'}`);

  if (hasVba && isMacroSheetCT && hasInlineStr) {
    console.log('\n🎉 MACRO TEMPLATE EXPORT IS 100% VALIDATED & READY!');
  } else {
    console.error('\n❌ MACRO VALIDATION FAILED!');
  }
}

testMacroExport().catch(console.error);
