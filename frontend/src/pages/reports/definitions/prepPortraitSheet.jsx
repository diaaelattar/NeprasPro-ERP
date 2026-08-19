import React from 'react';
import MacroGradesPreview from './MacroGradesPreview';

const prepPortraitSheet = {
  id:          'prep_portrait',
  name:        'سجل أعمال السنة للمرحلة الإعدادية (طولي)',
  desc:        'سجل رصد وتقييمات أعمال السنة للمرحلة الإعدادية بالمظهر الطولي (ماكرو إكسيل)',
  category:    'سجلات رصد أعمال السنة',
  icon:        '📋',
  orientation: 'portrait',
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
    `/api/students/export/class-list?classId=${f.classId}&gradeId=${f.gradeId}&academicYearId=${f.academicYearId}&mode=prep_portrait&status=all`,

  excelFileName: (f, meta) =>
    `سجل_أعمال_السنة_إعدادي_طولي_${meta.selectedClassroom?.class_name || 'الفصل'}.xlsm`,

  buildQuery: (f) => {
    const q = new URLSearchParams({
      status: 'all',
      limit: 'all',
      mode: 'prep_portrait',
    });
    if (f.classId)        q.set('classId', f.classId);
    if (f.gradeId)        q.set('gradeId', f.gradeId);
    if (f.academicYearId) q.set('academicYearId', f.academicYearId);
    if (f.sectionId)      q.set('sectionId', f.sectionId);
    if (f.stageId)        q.set('stageId', f.stageId);
    return q.toString();
  },

  PreviewComponent: (props) => (
    <MacroGradesPreview {...props} title="سجل أعمال السنة للمرحلة الإعدادية (طولي)" />
  ),
};

export default prepPortraitSheet;
