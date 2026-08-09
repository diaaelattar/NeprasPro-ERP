import React from 'react';
import MacroGradesPreview from './MacroGradesPreview';

const secLandscapeSheet = {
  id:          'sec_landscape',
  name:        'سجل أعمال السنة للمرحلة الثانوية (عرضي)',
  desc:        'سجل رصد وتقييمات أعمال السنة للمرحلة الثانوية بالمظهر العرضي (ماكرو إكسيل)',
  category:    'سجلات رصد أعمال السنة',
  icon:        '📄',
  orientation: 'landscape',
  available:   true,
  excelOnly:   true,

  filters: {
    requiresSection: true,
    requiresStage:   true,
    requiresGrade:   true,
    requiresYear:    true,
    requiresClass:   true,
  },

  excelEndpoint: (f) =>
    `/api/students/export/class-list?classId=${f.classId}&gradeId=${f.gradeId}&academicYearId=${f.academicYearId}&mode=sec_landscape&status=all`,

  excelFileName: (f, meta) =>
    `سجل_أعمال_السنة_ثانوي_عرضي_${meta.selectedClassroom?.class_name || 'الفصل'}.xlsm`,

  buildQuery: (f) => {
    const q = new URLSearchParams({
      status: 'all',
      limit: 100,
      mode: 'sec_landscape',
    });
    if (f.classId)        q.set('classId', f.classId);
    if (f.gradeId)        q.set('gradeId', f.gradeId);
    if (f.academicYearId) q.set('academicYearId', f.academicYearId);
    if (f.sectionId)      q.set('sectionId', f.sectionId);
    if (f.stageId)        q.set('stageId', f.stageId);
    return q.toString();
  },

  PreviewComponent: (props) => (
    <MacroGradesPreview {...props} title="سجل أعمال السنة للمرحلة الثانوية (عرضي)" />
  ),
};

export default secLandscapeSheet;
