const fetch = require('node-fetch');

async function testCreateStudents() {
  const baseUrl = 'http://localhost:5000/api';

  console.log('--- 1. Fetching form options ---');
  const optsRes = await fetch(`${baseUrl}/students/form-options`);
  const opts = await optsRes.json();

  if (!opts.success) {
    console.error('Failed to load form options:', opts);
    process.exit(1);
  }

  const section = opts.sections[0] || { id: 1 };
  const currentYear = opts.academicYears?.find(y => y.is_current) || opts.academicYears[0];
  const primaryGrade = opts.grades?.find(g => g.grade_name_ar.includes('الأول') && g.grade_name_ar.includes('ابتدائي')) || opts.grades[0];
  const secondaryGrade = opts.grades?.find(g => (g.grade_name_ar.includes('الثاني') || g.grade_name_ar.includes('2')) && (g.grade_name_ar.includes('ثانوي') || g.grade_name_ar.includes('الثانوي'))) || opts.grades[opts.grades.length - 1];
  const egyptNat = opts.nationalities?.find(n => n.code === 'EGY') || opts.nationalities[0];

  console.log(`Primary Grade ID: ${primaryGrade?.id} (${primaryGrade?.grade_name_ar})`);
  console.log(`Secondary Grade ID: ${secondaryGrade?.id} (${secondaryGrade?.grade_name_ar})`);
  console.log(`Academic Year ID: ${currentYear?.id} (${currentYear?.year_label})`);

  // Student 1: 1st Primary (الصف الأول الابتدائي)
  const primaryStudentPayload = {
    sectionId: section.id,
    stageId: primaryGrade.stage_id,
    gradeId: primaryGrade.id,
    academicYearId: currentYear.id,
    fullNameAr: 'أحمد محمود إبراهيم السيد الحادق',
    fullNameEn: 'Ahmed Mahmoud Ibrahim El-Hadek',
    nationalId: '31905151201458', // Valid 14 digit NID (May 15, 2019)
    birthDate: '2019-05-15',
    birthPlace: 'القاهرة - مصر الجديدة',
    nationalityId: egyptNat ? egyptNat.id : 1,
    gender: 'ذكر',
    religion: 'مسلم',
    guardianName: 'محمود إبراهيم السيد الحادق',
    guardianRelation: 'أب',
    guardianNationalId: '28509121402319',
    guardianPhone: '01012345678',
    guardianPhone2: '01123456789',
    guardianJob: 'مهندس برمجة وتطوير',
    motherName: 'مريم علي عبد الفتاح',
    motherNationalityId: egyptNat ? egyptNat.id : 1,
    motherNationalId: '29003151409824',
    address: 'القاهرة - مصر الجديدة - 14 شارع الميرغني',
    studentPhone: '01012345678',
    status: 'promoted',
    schoolTrack: 'عام',
    schoolSpecialization: 'عام',
    firstLanguage: 'عربي',
    secondLanguage: 'لا يوجد',
    isMerged: false,
    isTalented: true,
    talentCategory: 'موهبة علمية وتكنولوجية',
    talentDescription: 'المركز الأول في الحساب الذهني 2025',
    isReturnedFromAbroad: false,
    isTransferred: false,
    emisStudentCode: '202600101'
  };

  console.log('\n--- 2. Registering Student 1 (1st Primary) ---');
  const res1 = await fetch(`${baseUrl}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(primaryStudentPayload)
  });
  const data1 = await res1.json();
  console.log('Response Student 1:', data1);

  // Student 2: 2nd Secondary (الصف الثاني الثانوي)
  const secondaryStudentPayload = {
    sectionId: section.id,
    stageId: secondaryGrade.stage_id,
    gradeId: secondaryGrade.id,
    academicYearId: currentYear.id,
    fullNameAr: 'فاطمة الزهراء عمر الشريف',
    fullNameEn: 'Fatma Al-Zahraa Omar El-Sherif',
    nationalId: '30810201608922', // Valid 14 digit NID (Oct 20, 2008)
    birthDate: '2008-10-20',
    birthPlace: 'الجيزة - الدقي',
    nationalityId: egyptNat ? egyptNat.id : 1,
    gender: 'أنثى',
    religion: 'مسلم',
    guardianName: 'عمر الشريف مصطفى',
    guardianRelation: 'أب',
    guardianNationalId: '27804101400291',
    guardianPhone: '01298765432',
    guardianPhone2: '01598765432',
    guardianJob: 'طبيب استشاري جراحة',
    motherName: 'هدى مصطفى كامل',
    motherNationalityId: egyptNat ? egyptNat.id : 1,
    motherNationalId: '28211051403218',
    address: 'الجيزة - الدقي - 25 شارع مصدق',
    studentPhone: '01298765432',
    status: 'promoted',
    secondaryTrack: 'science_math',
    secondaryElective: 'علمي رياضة',
    firstLanguage: 'عربي',
    secondLanguage: 'فرنسي',
    academicSystem: 'ثانوية عامة',
    isMerged: false,
    isTalented: true,
    talentCategory: 'موهبة علمية',
    talentDescription: 'أولمبياد الرياضيات الوطنية',
    isReturnedFromAbroad: true,
    countryFrom: 'المملكة العربية السعودية',
    isTransferred: true,
    transferredFromSchool: 'مدرسة الرياض النموذجية',
    transferredFromDirectorate: 'إدارة التعليم الأجنبي والمعادلات',
    transferredFromGovernorate: 'القاهرة',
    emisStudentCode: '202600202'
  };

  console.log('\n--- 3. Registering Student 2 (2nd Secondary) ---');
  const res2 = await fetch(`${baseUrl}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(secondaryStudentPayload)
  });
  const data2 = await res2.json();
  console.log('Response Student 2:', data2);

  if (data1.success && data2.success) {
    console.log('\n✅ BOTH STUDENTS REGISTERED SUCCESSFULLY WITH 0 ERRORS!');
  } else {
    console.error('\n❌ Registration failed:', data1.error || data2.error);
    process.exit(1);
  }
}

testCreateStudents().catch(e => {
  console.error('Execution error:', e);
  process.exit(1);
});
