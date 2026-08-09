/**
 * control.reports.registry.js — Independent Control Module Reports Registry
 * NeprasPro - Control Module Reports Specification & Metadata
 */

const path = require('path');
const fs = require('fs');

/**
 * Helper to resolve template file path:
 * 1. User profile custom directory (%USERPROFILE%/.nepraspro/templates/control/)
 * 2. Default app directory (backend/modules/control/reports/excel_templates/)
 */
function resolveControlExcelTemplate(filename) {
  const userHome = process.env.USERPROFILE || process.env.HOME || '';
  const customPath = path.join(userHome, '.nepraspro', 'templates', 'control', filename);
  if (fs.existsSync(customPath)) {
    return customPath;
  }

  const defaultPath = path.join(__dirname, 'excel_templates', filename);
  if (fs.existsSync(defaultPath)) {
    return defaultPath;
  }

  return null;
}

const CONTROL_REPORTS_REGISTRY = {
  // ─── 1. شيت الرصد المجمّع الرئيسي (12 د) ─────────────────────────────────
  'marks_sheet_12d': {
    id: 'marks_sheet_12d',
    title: 'شيت الرصد المجمّع الرئيسي (12 د)',
    category: 'رصد النتائج',
    description: 'كشف مجمّع لجميع درجات المواد، أعمال السنة، التحريري، والمجموع الكلي مع تقديرات ونسب الطلاب.',
    requiresPin: true, // Sensitive report requiring Master PIN
    exportFormats: ['excel', 'pdf'],
    orientation: 'landscape',
    pageSize: 'A3',
    excelTemplate: 'control_marks_12d_template.xlsx',
    getTemplatePath: () => resolveControlExcelTemplate('control_marks_12d_template.xlsx')
  },

  // ─── 2. كشف الأرقام السرية وتوزيع اللجان ─────────────────────────────────
  'secret_codes_list': {
    id: 'secret_codes_list',
    title: 'كشف تجميع الأرقام السرية وتوزيع اللجان',
    category: 'السرّية واللجان',
    description: 'كشف ربط أسماء الطلاب بأرقامهم السرية، ورقم الجلوس، وقاعة اللجنة المخصصة.',
    requiresPin: true, // Sensitive report requiring Master PIN
    exportFormats: ['excel', 'pdf'],
    orientation: 'portrait',
    pageSize: 'A4',
    excelTemplate: 'secret_codes_template.xlsx',
    getTemplatePath: () => resolveControlExcelTemplate('secret_codes_template.xlsx')
  },

  // ─── 3. كشف المناداة وأرقام الجلوس (41 د) ──────────────────────────────────
  'seating_call_list': {
    id: 'seating_call_list',
    title: 'كشف المناداة وأرقام الجلوس (41 د)',
    category: 'اللجان والمناداة',
    description: 'كشف رسمي بأرقام الجلوس وأسماء الطلاب مجمعين حسب الفصول واللجان للتعليق.',
    requiresPin: false,
    exportFormats: ['excel', 'pdf'],
    orientation: 'portrait',
    pageSize: 'A4',
    excelTemplate: 'seating_list_template.xlsx',
    getTemplatePath: () => resolveControlExcelTemplate('seating_list_template.xlsx')
  },

  // ─── 4. شهادات نواتج التقييم ونصف العام ───────────────────────────────────
  'student_certificates': {
    id: 'student_certificates',
    title: 'شهادات الطلاب ونواتج التقييم',
    category: 'النتائج والشهادات',
    description: 'شهادات إشعار نتيجة الطالب لنصف العام / نهاية العام مع التقديرات والألوان.',
    requiresPin: false,
    exportFormats: ['pdf', 'excel'],
    orientation: 'portrait',
    pageSize: 'A4',
    excelTemplate: 'student_certificate_template.xlsx',
    getTemplatePath: () => resolveControlExcelTemplate('student_certificate_template.xlsx')
  },

  // ─── 5. كشف الطلاب الأوائل والمتفوقين ─────────────────────────────────────
  'top_students_list': {
    id: 'top_students_list',
    title: 'كشف الأوائل والمتفوقين بالصف',
    category: 'الإحصائيات والنتائج',
    description: 'ترتيب الطلاب الأوائل بالصف الدراسي حسب المجموع الكلي والنسبة المئوية.',
    requiresPin: false,
    exportFormats: ['excel', 'pdf'],
    orientation: 'portrait',
    pageSize: 'A4',
    excelTemplate: 'top_students_template.xlsx',
    getTemplatePath: () => resolveControlExcelTemplate('top_students_template.xlsx')
  },

  // ─── 6. كشف الطلاب الراسبين والمستحقين للدور الثاني ───────────────────────
  'failing_students_list': {
    id: 'failing_students_list',
    title: 'كشف الطلاب المستحقين لدور ثاني',
    category: 'النتائج والشهادات',
    description: 'حصر بالطلاب الذين لم يحققوا نسبة النجاح ومواد الرسوب لكل طالب.',
    requiresPin: true,
    exportFormats: ['excel', 'pdf'],
    orientation: 'portrait',
    pageSize: 'A4',
    excelTemplate: 'failing_students_template.xlsx',
    getTemplatePath: () => resolveControlExcelTemplate('failing_students_template.xlsx')
  }
};

module.exports = {
  CONTROL_REPORTS_REGISTRY,
  resolveControlExcelTemplate
};
