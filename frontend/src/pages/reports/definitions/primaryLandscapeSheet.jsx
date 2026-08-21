import React from 'react';
import MacroGradesPreview from './MacroGradesPreview';

const primaryLandscapeSheet = {
  id:          'primary_landscape',
  name:        'سجل أعمال السنة للمرحلة الابتدائية (عرضي)',
  desc:        'سجل رصد وتقييمات أعمال السنة لطلاب المرحلة الابتدائية بالمظهر العرضي (ماكرو إكسيل)',
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
    `/api/students/export/class-list?classId=${f.classId}&gradeId=${f.gradeId}&academicYearId=${f.academicYearId}&mode=primary_landscape&status=all`,

  excelFileName: (f, meta) =>
    `سجل_أعمال_السنة_ابتدائي_عرضي_${meta.selectedClassroom?.class_name || 'الفصل'}.xlsm`,

  buildQuery: (f) => {
    const q = new URLSearchParams({
      status: 'all',
      limit: 'all',
      mode: 'primary_landscape',
    });
    if (f.classId)        q.set('classId', f.classId);
    if (f.gradeId)        q.set('gradeId', f.gradeId);
    if (f.academicYearId) q.set('academicYearId', f.academicYearId);
    if (f.sectionId)      q.set('sectionId', f.sectionId);
    if (f.stageId)        q.set('stageId', f.stageId);
    return q.toString();
  },

  PreviewComponent: (props) => (
    <MacroGradesPreview {...props} title="سجل أعمال السنة للمرحلة الابتدائية (عرضي)" />
  ),
};

export default primaryLandscapeSheet;
