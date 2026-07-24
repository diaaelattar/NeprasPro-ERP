// ════════════════════════════════════════════════════════════════
//  Report Definition: كشف الفحص الطبي (قوائم الصحة)
//  قائمة بحالة الفحص الطبي لكل طالب في الفصل
// ════════════════════════════════════════════════════════════════
import React from 'react';

const HEALTH_CHECKS = [
  { id: 'vision',   label: 'البصر' },
  { id: 'hearing',  label: 'السمع' },
  { id: 'weight',   label: 'الوزن' },
  { id: 'height',   label: 'الطول' },
  { id: 'skin',     label: 'الجلد' },
  { id: 'teeth',    label: 'الأسنان' },
  { id: 'chest',    label: 'الصدر' },
  { id: 'general',  label: 'الحالة العامة' },
];

function HealthListPreview({ students, meta, schoolInfo }) {
  const { selectedGrade, selectedYear, selectedClassroom } = meta;

  return (
    <div className="report-preview" id="print-area" data-orientation="landscape">
      {/* Official Header */}
      <div className="official-header">
        <div className="official-logo-box">
          <div className="logo-placeholder">شعار<br />المدرسة</div>
        </div>
        <div className="official-title-block">
          <div className="official-title" style={{ fontSize: 15 }}>
            كشف الفحص الطبي المدرسي
          </div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            {selectedGrade?.grade_name_ar} — {selectedClassroom?.class_name || '...'} — {selectedYear?.year_label}
          </div>
        </div>
        <div className="official-school-info">
          <div>محافظة: <span>{schoolInfo.governorate || '....'}</span></div>
          <div>إدارة: <span>{schoolInfo.directorate || '....'}</span></div>
          <div>مدرسة: <span>{schoolInfo.schoolName || '....'}</span></div>
        </div>
      </div>

      {/* Health Grid */}
      <div className="register-table-wrap" style={{ marginTop: 10, overflowX: 'auto' }}>
        <table style={{ fontSize: 9.5, borderCollapse: 'collapse', width: '100%', direction: 'rtl' }}>
          <thead>
            <tr style={{ background: '#7c3aed', color: '#fff' }}>
              <th style={{ border: '1px solid #6d28d9', padding: '4px 6px', width: 32 }}>م</th>
              <th style={{ border: '1px solid #6d28d9', padding: '4px 8px', minWidth: 130, textAlign: 'right' }}>اسم الطالب</th>
              <th style={{ border: '1px solid #6d28d9', padding: '4px', width: 85 }}>ت. الميلاد</th>
              <th style={{ border: '1px solid #6d28d9', padding: '4px', width: 35, textAlign: 'center' }}>النوع</th>
              {HEALTH_CHECKS.map(h => (
                <th key={h.id} style={{ border: '1px solid #6d28d9', padding: '4px 2px', textAlign: 'center', width: 55, fontSize: 9 }}>
                  {h.label}
                </th>
              ))}
              <th style={{ border: '1px solid #6d28d9', padding: '4px', textAlign: 'center', width: 80 }}>ملاحظات الطبيب</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => {
              const birthDate = s.birth_date ? new Date(s.birth_date).toLocaleDateString('ar-EG') : '—';
              return (
                <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#faf5ff' }}>
                  <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{i + 1}</td>
                  <td style={{ border: '1px solid #ddd', padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{s.full_name_ar}</td>
                  <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center', fontSize: 8 }} dir="ltr">{birthDate}</td>
                  <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>
                    {s.gender === 'ذكر' ? '♂' : '♀'}
                  </td>
                  {HEALTH_CHECKS.map(h => (
                    <td key={h.id} style={{ border: '1px solid #ddd', padding: '3px', textAlign: 'center', height: 22 }}>
                      <span style={{ display: 'inline-block', width: 14, height: 14, border: '1px solid #999', verticalAlign: 'middle' }} />
                    </td>
                  ))}
                  <td style={{ border: '1px solid #ddd', padding: '4px', height: 22 }}></td>
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr>
                <td colSpan={HEALTH_CHECKS.length + 5} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>
                  يرجى اختيار الفصل لعرض الطلاب
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 15, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <div>الطبيب الفاحص: ..........................</div>
        <div>الممرضة المدرسية: ..........................</div>
        <div>مدير المدرسة: ..........................</div>
      </div>
    </div>
  );
}

const healthList = {
  id:          'health_list',
  name:        'كشف الفحص الطبي المدرسي',
  desc:        'قائمة طلاب مع خانات الفحص الطبي الشامل (بصر، سمع، أسنان، وزن، طول...)',
  category:    'الصحة المدرسية',
  icon:        '🏥',
  orientation: 'landscape',
  available:   true,

  filters: {
    requiresGrade:   true,
    requiresYear:    true,
    requiresSection: true,
    requiresStage:   true,
  },

  excelEndpoint: (f) =>
    `/api/students/export/class-list?gradeId=${f.gradeId}&academicYearId=${f.academicYearId}${f.classId ? '&classId=' + f.classId : ''}&status=all`,

  excelFileName: (f, meta) =>
    `كشف_فحص_طبي_${meta.selectedGrade?.grade_name_ar || ''}_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  buildQuery: (f) => {
    const q = new URLSearchParams({
      gradeId: f.gradeId,
      academicYearId: f.academicYearId,
      limit: 500,
      status: 'all',
    });
    if (f.sectionId) q.set('sectionId', f.sectionId);
    if (f.classId)   q.set('classId', f.classId);
    return q.toString();
  },

  PreviewComponent: HealthListPreview,
};

export default healthList;
