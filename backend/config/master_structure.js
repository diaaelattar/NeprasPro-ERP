/**
 * Master Preset Seeder for Standard Sections, Stages, and Grades
 * Code Structure: [Section (1-3)][Stage (1-4)][Grade (1-6)]
 */

const MASTER_STRUCTURE = [
  {
    section_code: 1,
    name: 'القسم العربي',
    type: 'arabic',
    education_type: 'عربي',
    stages: [
      {
        stage_code: 0,
        stage_name: 'تمهيدي',
        years_count: 1,
        display_order: 0,
        grades: [
          { grade_number: 1, grade_code: 101, grade_name_ar: 'الصف الأول التمهيدي' }
        ]
      },
      {
        stage_code: 1,
        stage_name: 'رياض أطفال',
        years_count: 2,
        display_order: 1,
        grades: [
          { grade_number: 1, grade_code: 111, grade_name_ar: 'الصف الأول الرياض أطفال' },
          { grade_number: 2, grade_code: 112, grade_name_ar: 'الصف الثاني الرياض أطفال' }
        ]
      },
      {
        stage_code: 2,
        stage_name: 'ابتدائي',
        years_count: 6,
        display_order: 2,
        grades: [
          { grade_number: 1, grade_code: 121, grade_name_ar: 'الصف الأول الابتدائي' },
          { grade_number: 2, grade_code: 122, grade_name_ar: 'الصف الثاني الابتدائي' },
          { grade_number: 3, grade_code: 123, grade_name_ar: 'الصف الثالث الابتدائي' },
          { grade_number: 4, grade_code: 124, grade_name_ar: 'الصف الرابع الابتدائي' },
          { grade_number: 5, grade_code: 125, grade_name_ar: 'الصف الخامس الابتدائي' },
          { grade_number: 6, grade_code: 126, grade_name_ar: 'الصف السادس الابتدائي' }
        ]
      },
      {
        stage_code: 3,
        stage_name: 'إعدادي',
        years_count: 3,
        display_order: 3,
        grades: [
          { grade_number: 1, grade_code: 131, grade_name_ar: 'الصف الأول الإعدادي' },
          { grade_number: 2, grade_code: 132, grade_name_ar: 'الصف الثاني الإعدادي' },
          { grade_number: 3, grade_code: 133, grade_name_ar: 'الصف الثالث الإعدادي' }
        ]
      },
      {
        stage_code: 4,
        stage_name: 'ثانوي',
        years_count: 3,
        display_order: 4,
        grades: [
          { grade_number: 1, grade_code: 141, grade_name_ar: 'الصف الأول الثانوي' },
          { grade_number: 2, grade_code: 142, grade_name_ar: 'الصف الثاني الثانوي' },
          { grade_number: 3, grade_code: 143, grade_name_ar: 'الصف الثالث الثانوي' }
        ]
      }
    ]
  },
  {
    section_code: 2,
    name: 'قسم اللغات',
    type: 'languages',
    education_type: 'لغات',
    stages: [
      {
        stage_code: 0,
        stage_name: 'تمهيدي لغات',
        years_count: 1,
        display_order: 0,
        grades: [
          { grade_number: 1, grade_code: 201, grade_name_ar: 'الصف الأول التمهيدي - لغات' }
        ]
      },
      {
        stage_code: 1,
        stage_name: 'رياض أطفال لغات',
        years_count: 2,
        display_order: 1,
        grades: [
          { grade_number: 1, grade_code: 211, grade_name_ar: 'الصف الأول الرياض أطفال - لغات' },
          { grade_number: 2, grade_code: 212, grade_name_ar: 'الصف الثاني الرياض أطفال - لغات' }
        ]
      },
      {
        stage_code: 2,
        stage_name: 'ابتدائي لغات',
        years_count: 6,
        display_order: 2,
        grades: [
          { grade_number: 1, grade_code: 221, grade_name_ar: 'الصف الأول الابتدائي - لغات' },
          { grade_number: 2, grade_code: 222, grade_name_ar: 'الصف الثاني الابتدائي - لغات' },
          { grade_number: 3, grade_code: 223, grade_name_ar: 'الصف الثالث الابتدائي - لغات' },
          { grade_number: 4, grade_code: 224, grade_name_ar: 'الصف الرابع الابتدائي - لغات' },
          { grade_number: 5, grade_code: 225, grade_name_ar: 'الصف الخامس الابتدائي - لغات' },
          { grade_number: 6, grade_code: 226, grade_name_ar: 'الصف السادس الابتدائي - لغات' }
        ]
      },
      {
        stage_code: 3,
        stage_name: 'إعدادي لغات',
        years_count: 3,
        display_order: 3,
        grades: [
          { grade_number: 1, grade_code: 231, grade_name_ar: 'الصف الأول الإعدادي - لغات' },
          { grade_number: 2, grade_code: 232, grade_name_ar: 'الصف الثاني الإعدادي - لغات' },
          { grade_number: 3, grade_code: 233, grade_name_ar: 'الصف الثالث الإعدادي - لغات' }
        ]
      },
      {
        stage_code: 4,
        stage_name: 'ثانوي لغات',
        years_count: 3,
        display_order: 4,
        grades: [
          { grade_number: 1, grade_code: 241, grade_name_ar: 'الصف الأول الثانوي - لغات' },
          { grade_number: 2, grade_code: 242, grade_name_ar: 'الصف الثاني الثانوي - لغات' },
          { grade_number: 3, grade_code: 243, grade_name_ar: 'الصف الثالث الثانوي - لغات' }
        ]
      }
    ]
  },
  {
    section_code: 3,
    name: 'القسم الدولي',
    type: 'languages',
    education_type: 'دولي',
    stages: [
      {
        stage_code: 1,
        stage_name: 'رياض أطفال دولي',
        years_count: 2,
        display_order: 1,
        grades: [
          { grade_number: 1, grade_code: 311, grade_name_ar: 'الصف الأول الرياض أطفال - دولي' },
          { grade_number: 2, grade_code: 312, grade_name_ar: 'الصف الثاني الرياض أطفال - دولي' }
        ]
      },
      {
        stage_code: 2,
        stage_name: 'ابتدائي دولي',
        years_count: 6,
        display_order: 2,
        grades: [
          { grade_number: 1, grade_code: 321, grade_name_ar: 'الصف الأول الابتدائي - دولي' },
          { grade_number: 2, grade_code: 322, grade_name_ar: 'الصف الثاني الابتدائي - دولي' },
          { grade_number: 3, grade_code: 323, grade_name_ar: 'الصف الثالث الابتدائي - دولي' },
          { grade_number: 4, grade_code: 324, grade_name_ar: 'الصف الرابع الابتدائي - دولي' },
          { grade_number: 5, grade_code: 325, grade_name_ar: 'الصف الخامس الابتدائي - دولي' },
          { grade_number: 6, grade_code: 326, grade_name_ar: 'الصف السادس الابتدائي - دولي' }
        ]
      },
      {
        stage_code: 3,
        stage_name: 'إعدادي دولي',
        years_count: 3,
        display_order: 3,
        grades: [
          { grade_number: 1, grade_code: 331, grade_name_ar: 'الصف الأول الإعدادي - دولي' },
          { grade_number: 2, grade_code: 332, grade_name_ar: 'الصف الثاني الإعدادي - دولي' },
          { grade_number: 3, grade_code: 333, grade_name_ar: 'الصف الثالث الإعدادي - دولي' }
        ]
      },
      {
        stage_code: 4,
        stage_name: 'ثانوي دولي',
        years_count: 3,
        display_order: 4,
        grades: [
          { grade_number: 1, grade_code: 341, grade_name_ar: 'الصف الأول الثانوي - دولي' },
          { grade_number: 2, grade_code: 342, grade_name_ar: 'الصف الثاني الثانوي - دولي' },
          { grade_number: 3, grade_code: 343, grade_name_ar: 'الصف الثالث الثانوي - دولي' }
        ]
      }
    ]
  }
];

module.exports = { MASTER_STRUCTURE };
