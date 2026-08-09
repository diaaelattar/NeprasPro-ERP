const db = require('./backend/config/db.js');
const studentsController = require('./backend/modules/students/students.controller.js');

async function runDirectTest() {
  console.log('--- 1. Initializing DB ---');
  // Wait 1 sec for DB restore
  await new Promise(r => setTimeout(r, 1000));

  const sqliteDb = db.getSQLiteDb();
  if (!sqliteDb) {
    console.error('DB failed to initialize');
    process.exit(1);
  }

  // Create mock res
  const makeMockRes = (label) => ({
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      console.log(`[Response ${label}] (Status ${this.statusCode || 200}):`, data);
      return data;
    }
  });

  // Get Form Options
  console.log('\n--- 2. Fetching Form Options ---');
  let formOpts = {};
  await studentsController.getFormOptions({}, {
    status: () => ({ json: (d) => d }),
    json: (d) => { formOpts = d; return d; }
  });

  const section = formOpts.sections[0] || { id: 1 };
  const currentYear = formOpts.academicYears?.find(y => y.is_current) || formOpts.academicYears[0];
  const primaryGrade = formOpts.grades?.find(g => g.grade_name_ar.includes('الأول') && g.grade_name_ar.includes('ابتدائي')) || formOpts.grades[0];
  const secondaryGrade = formOpts.grades?.find(g => (g.grade_name_ar.includes('الثاني') || g.grade_name_ar.includes('2')) && (g.grade_name_ar.includes('ثانوي') || g.grade_name_ar.includes('الثانوي'))) || formOpts.grades[formOpts.grades.length - 1];
  const egyptNat = formOpts.nationalities?.find(n => n.code === 'EGY') || { id: 1 };

  console.log(`Section ID: ${section?.id}`);
  console.log(`Primary Grade ID: ${primaryGrade?.id} (${primaryGrade?.grade_name_ar})`);
  console.log(`Secondary Grade ID: ${secondaryGrade?.id} (${secondaryGrade?.grade_name_ar})`);
  console.log(`Academic Year ID: ${currentYear?.id} (${currentYear?.year_label})`);

  // Student 1: 1st Primary (الصف الأول الابتدائي)
  console.log('\n--- 3. Registering Student 1 (1st Primary - All Fields) ---');
  const reqPrimary = {
    body: {
      sectionId: String(section.id),
      stageId: String(primaryGrade.stage_id),
      gradeId: String(primaryGrade.id),
      academicYearId: String(currentYear.id),
      fullNameAr: 'أحمد محمود إبراهيم السيد الحادق',
      fullNameEn: 'Ahmed Mahmoud Ibrahim El-Hadek',
      nationalId: '31905151201458', // Valid 14 digit NID (May 15, 2019)
      birthDate: '2019-05-15',
      birthPlace: 'القاهرة - مصر الجديدة',
      nationalityId: String(egyptNat.id),
      gender: 'ذكر',
      religion: 'مسلم',
      guardianName: 'محمود إبراهيم السيد الحادق',
      guardianRelation: 'أب',
      guardianNationalId: '28509121402319',
      guardianPhone: '01012345678',
      guardianPhone2: '01123456789',
      guardianJob: 'مهندس برمجة وتطوير',
      motherName: 'مريم علي عبد الفتاح',
      motherNationalityId: String(egyptNat.id),
      motherNationalId: '29003151409824',
      address: 'القاهرة - مصر الجديدة - 14 شارع الميرغني',
      studentPhone: '01012345678',
      status: 'promoted',
      schoolTrack: 'عام',
      schoolSpecialization: 'عام',
      firstLanguage: 'عربي',
      secondLanguage: 'لا يوجد',
      academicSystem: 'رسمي عربي',
      isMerged: false,
      isTalented: true,
      talentCategory: 'موهبة علمية وتكنولوجية',
      talentDescription: 'المركز الأول في الحساب الذهني 2025',
      isReturnedFromAbroad: false,
      isTransferred: false,
      emisStudentCode: '202600101'
    }
  };
  await studentsController.createStudent(reqPrimary, makeMockRes('1st Primary Student'));

  // Student 2: 2nd Secondary (الصف الثاني الثانوي)
  console.log('\n--- 4. Registering Student 2 (2nd Secondary - All Fields) ---');
  const reqSecondary = {
    body: {
      sectionId: String(section.id),
      stageId: String(secondaryGrade.stage_id),
      gradeId: String(secondaryGrade.id),
      academicYearId: String(currentYear.id),
      fullNameAr: 'فاطمة الزهراء عمر الشريف',
      fullNameEn: 'Fatma Al-Zahraa Omar El-Sherif',
      nationalId: '30810201608922', // Valid 14 digit NID (Oct 20, 2008)
      birthDate: '2008-10-20',
      birthPlace: 'الجيزة - الدقي',
      nationalityId: String(egyptNat.id),
      gender: 'أنثى',
      religion: 'مسلم',
      guardianName: 'عمر الشريف مصطفى',
      guardianRelation: 'أب',
      guardianNationalId: '27804101400291',
      guardianPhone: '01298765432',
      guardianPhone2: '01598765432',
      guardianJob: 'طبيب استشاري جراحة',
      motherName: 'هدى مصطفى كامل',
      motherNationalityId: String(egyptNat.id),
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
    }
  };
  await studentsController.createStudent(reqSecondary, makeMockRes('2nd Secondary Student'));

  process.exit(0);
}

runDirectTest().catch(e => {
  console.error('Test execution error:', e);
  process.exit(1);
});
