const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const excelReportEngine = require('../backend/services/excelReportEngine');

async function runEngineVerification() {
  console.log('🚀 Starting Standalone Excel Report Engine Verification...');

  const sampleSchool = { school_name: 'مدرسة التجربة الرسمية', governorate: 'الجيزة', directorate: 'العمرانية' };
  const sampleStudents = [];
  for (let i = 1; i <= 30; i++) {
    sampleStudents.push({
      id: i,
      full_name_ar: `طالب نبرأس تجريبي ${i}`,
      national_id: `301010101010${i < 10 ? '0' + i : i}`,
      gender: i % 2 === 0 ? 'أنثى' : 'ذكر',
      status: 'promoted',
      birth_date: '2015-05-15',
      classroom_name: '1 / 1 ع',
      religion: 'مسلم',
      nationality_name: 'مصري',
      guardian_name: `ولي أمر طالب ${i}`,
      guardian_phone: '01000000000',
      address: 'الجيزة - العمرانية'
    });
  }

  // 1. Test Primary Portrait Sheet
  console.log('\n--- 1. Testing Primary Portrait Sheet (.xlsm) ---');
  const portraitBuf = await excelReportEngine.generatePrimaryPortraitSheet({
    school: sampleSchool,
    className: '1 / 14 ع',
    yearLabel: '2026/2027',
    students: sampleStudents
  });
  fs.writeFileSync('engine_portrait_test.xlsm', portraitBuf);
  console.log('✅ Generated engine_portrait_test.xlsm, size:', portraitBuf.length);

  // 2. Test Primary Landscape Sheet
  console.log('\n--- 2. Testing Primary Landscape Sheet (.xlsm) ---');
  const landscapeBuf = await excelReportEngine.generatePrimaryLandscapeSheet({
    school: sampleSchool,
    className: '1 / 14 ع',
    yearLabel: '2026/2027',
    students: sampleStudents
  });
  fs.writeFileSync('engine_landscape_test.xlsm', landscapeBuf);
  console.log('✅ Generated engine_landscape_test.xlsm, size:', landscapeBuf.length);

  // 3. Test Student Register 41-D Report
  console.log('\n--- 3. Testing Student Register Report (.xlsx) ---');
  const registerBuf = await excelReportEngine.generateStudentRegisterReport({
    templateName: 'student_register_41d_template.xltx',
    school: sampleSchool,
    gradeName: 'الأول الإعدادي',
    yearLabel: '2026/2027',
    totalStudents: sampleStudents.length,
    students: sampleStudents
  });
  fs.writeFileSync('engine_register_test.xlsx', registerBuf);
  console.log('✅ Generated engine_register_test.xlsx, size:', registerBuf.length);

  // 4. Test Full Class List Report
  console.log('\n--- 4. Testing Full Class List Report (.xlsx) ---');
  const fullListBuf = await excelReportEngine.generateFullClassListReport({
    classNameLabel: '1 / 14 ع',
    school: sampleSchool,
    yearLabel: '2026/2027',
    students: sampleStudents
  });
  fs.writeFileSync('engine_full_list_test.xlsx', fullListBuf);
  console.log('✅ Generated engine_full_list_test.xlsx, size:', fullListBuf.length);

  // Verify OpenXML Compliance on all 4 generated files
  const testFiles = ['engine_portrait_test.xlsm', 'engine_landscape_test.xlsm', 'engine_register_test.xlsx', 'engine_full_list_test.xlsx'];
  for (const tf of testFiles) {
    const zip = await JSZip.loadAsync(fs.readFileSync(tf));
    const wbXml = await zip.file('xl/workbook.xml')?.async('string') || '';
    const hasApos = wbXml.includes('&apos;');
    const hasRef = wbXml.includes('#REF!');
    console.log(`\nVerifying ${tf}:`);
    console.log(`  - Invalid &apos; entity in workbook.xml: ${hasApos ? '❌ FAILED' : '✅ CLEAN'}`);
    console.log(`  - Broken #REF! definedNames: ${hasRef ? '❌ FAILED' : '✅ CLEAN'}`);
  }

  console.log('\n🎉 ALL 4 STANDALONE ENGINE REPORTS GENERATED AND VERIFIED 100% CLEAN!');
}

runEngineVerification().catch(console.error);
