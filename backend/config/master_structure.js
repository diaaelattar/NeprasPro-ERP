/**
 * Master Preset Seeder for Standard Sections, Stages, and Grades
 * Code Structure (Exact User Specification):
 *   - Sections (3): 1 (القسم العربي), 2 (قسم اللغات), 3 (القسم الدولي)
 *   - Stages (5): 1 (رياض أطفال), 2 (ابتدائي), 3 (إعدادي), 4 (ثانوي), 5 (تمهيدي)
 *   - Grades (15): 1 إلى 15
 */

const UNIFIED_STAGES = [
  {
    code: 1,
    id: 1,
    stage_name: 'رياض أطفال',
    stage_name_en: 'Kindergarten',
    years_count: 2,
    display_order: 1,
    grades: [
      { id: 1, grade_number: 1, grade_code: 1, grade_name_ar: 'الصف الأول', grade_name_en: 'KG 1' },
      { id: 2, grade_number: 2, grade_code: 2, grade_name_ar: 'الصف الثاني', grade_name_en: 'KG 2' }
    ]
  },
  {
    code: 2,
    id: 2,
    stage_name: 'ابتدائي',
    stage_name_en: 'Primary',
    years_count: 6,
    display_order: 2,
    grades: [
      { id: 3, grade_number: 1, grade_code: 1, grade_name_ar: 'الصف الأول', grade_name_en: 'Primary 1' },
      { id: 4, grade_number: 2, grade_code: 2, grade_name_ar: 'الصف الثاني', grade_name_en: 'Primary 2' },
      { id: 5, grade_number: 3, grade_code: 3, grade_name_ar: 'الصف الثالث', grade_name_en: 'Primary 3' },
      { id: 6, grade_number: 4, grade_code: 4, grade_name_ar: 'الصف الرابع', grade_name_en: 'Primary 4' },
      { id: 7, grade_number: 5, grade_code: 5, grade_name_ar: 'الصف الخامس', grade_name_en: 'Primary 5' },
      { id: 8, grade_number: 6, grade_code: 6, grade_name_ar: 'الصف السادس', grade_name_en: 'Primary 6' }
    ]
  },
  {
    code: 3,
    id: 3,
    stage_name: 'إعدادي',
    stage_name_en: 'Preparatory',
    years_count: 3,
    display_order: 3,
    grades: [
      { id: 9,  grade_number: 1, grade_code: 1, grade_name_ar: 'الصف الأول', grade_name_en: 'Prep 1' },
      { id: 10, grade_number: 2, grade_code: 2, grade_name_ar: 'الصف الثاني', grade_name_en: 'Prep 2' },
      { id: 11, grade_number: 3, grade_code: 3, grade_name_ar: 'الصف الثالث', grade_name_en: 'Prep 3' }
    ]
  },
  {
    code: 4,
    id: 4,
    stage_name: 'ثانوي',
    stage_name_en: 'Secondary',
    years_count: 3,
    display_order: 4,
    grades: [
      { id: 12, grade_number: 1, grade_code: 1, grade_name_ar: 'الصف الأول', grade_name_en: 'Secondary 1' },
      { id: 13, grade_number: 2, grade_code: 2, grade_name_ar: 'الصف الثاني', grade_name_en: 'Secondary 2' },
      { id: 14, grade_number: 3, grade_code: 3, grade_name_ar: 'الصف الثالث', grade_name_en: 'Secondary 3' }
    ]
  },
  {
    code: 5,
    id: 5,
    stage_name: 'تمهيدي',
    stage_name_en: 'Pre-school',
    years_count: 1,
    display_order: 5,
    grades: [
      { id: 15, grade_number: 1, grade_code: 1, grade_name_ar: 'الصف الأول', grade_name_en: 'Pre-school 1' }
    ]
  }
];

const MASTER_STRUCTURE = [
  {
    section_code: 1,
    id: 1,
    name: 'القسم العربي',
    type: 'arabic',
    education_type: 'عربي',
    stages: UNIFIED_STAGES
  },
  {
    section_code: 2,
    id: 2,
    name: 'قسم اللغات',
    type: 'languages',
    education_type: 'لغات',
    stages: UNIFIED_STAGES
  },
  {
    section_code: 3,
    id: 3,
    name: 'القسم الدولي',
    type: 'international',
    education_type: 'دولي',
    stages: UNIFIED_STAGES
  }
];

module.exports = {
  MASTER_STRUCTURE,
  UNIFIED_STAGES
};
