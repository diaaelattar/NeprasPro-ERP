// ════════════════════════════════════════════════════════════════
//  Report Definition: كشف هواتف الطوارئ والتواصل
// ════════════════════════════════════════════════════════════════
import React from 'react';

function EmergencyPhonesListPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear, selectedClassroom } = meta;

  return (
    <div className="report-preview" id="print-area" data-orientation="portrait">
      {/* Standard Official Header */}
      <div className="report-official-header">
        <div className="header-col-right">
          <div>مديرية التربية والتعليم بمحافظة: <strong>{schoolInfo.governorate || '................'}</strong></div>
          <div>إدارة: <strong>{schoolInfo.directorate || '................'} التعليمية</strong></div>
          <div>مدرسة: <strong>{schoolInfo.schoolName || '................'}</strong></div>
        </div>

        <div className="header-col-center">
          <h2 className="report-title-main">
            كشف هواتف ولي الأمر والعناوين للطوارئ
          </h2>
          <div className="report-subtitle-meta">
            {selectedGrade?.grade_name_ar} | فصل: {selectedClassroom?.class_name || '...'} | للعام الدراسي: {selectedYear?.year_label}
          </div>
        </div>

        <div className="header-col-left">
          {schoolInfo.logoUrl ? (
            <img src={schoolInfo.logoUrl} alt="Logo" style={{ maxHeight: 55, maxWidth: 110, objectFit: 'contain' }} />
          ) : (
            <div style={{ border: '1.5px dashed #94a3b8', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: '#64748b', textAlign: 'center', background: '#f8fafc' }}>
              شعار المدرسة
            </div>
          )}
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
        </div>
      </div>

      {/* Emergency Table */}
      <div className="register-table-wrap" style={{ marginTop: 10 }}>
        <table className="register-table" style={{ fontSize: 12.5, borderCollapse: 'collapse', width: '100%', direction: 'rtl' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #000 !important', padding: '6px', background: '#f1f5f9', width: 35 }}>م</th>
              <th style={{ border: '1px solid #000 !important', padding: '6px 10px', background: '#f1f5f9', textAlign: 'right' }}>اسم الطالب بالكامل</th>
              <th style={{ border: '1px solid #000 !important', padding: '6px', background: '#f1f5f9', width: 130, textAlign: 'center' }}>تليفون الطالب</th>
              <th style={{ border: '1px solid #000 !important', padding: '6px', background: '#f1f5f9', width: 130, textAlign: 'center' }}>تليفون ولي الأمر</th>
              <th style={{ border: '1px solid #000 !important', padding: '6px 10px', background: '#f1f5f9', width: 160, textAlign: 'right' }}>وظيفة ولي الأمر</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.id || i}>
                <td style={{ border: '1px solid #000 !important', padding: '6px', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ border: '1px solid #000 !important', padding: '6px 10px', textAlign: 'right', fontWeight: 800 }}>{s.full_name_ar}</td>
                <td style={{ border: '1px solid #000 !important', padding: '6px', textAlign: 'center', fontFamily: 'Cairo, monospace' }} dir="ltr">{s.phone || s.student_phone || ''}</td>
                <td style={{ border: '1px solid #000 !important', padding: '6px', textAlign: 'center', fontFamily: 'Cairo, monospace' }} dir="ltr">{s.guardian_phone || ''}</td>
                <td style={{ border: '1px solid #000 !important', padding: '6px 10px', textAlign: 'right' }}>{s.guardian_job || ''}</td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 25, color: '#6b7280' }}>
                  يرجى اختيار الفصل لعرض أسماء الطلاب والهواتف
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 25, display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, padding: '0 20px' }}>
        <div>رائد الفصل: ..........................</div>
        <div>الأخصائي الاجتماعي: ..........................</div>
        <div>يعتمد مدير المدرسة: ..........................</div>
      </div>
    </div>
  );
}

const emergencyPhonesList = {
  id:          'emergency_phones_list',
  name:        'كشف هواتف الطوارئ والتواصل',
  desc:        'كشف حصر أسماء الطلاب وتليفون الطالب وتليفون ووظيفة ولي الأمر للطوارئ',
  category:    'قوائم الفصول',
  icon:        '📞',
  orientation: 'portrait',
  available:   true,

  filters: {
    requiresGrade:   true,
    requiresYear:    true,
    requiresClass:   true,
    requiresSection: true,
    requiresStage:   true,
  },

  excelEndpoint: (f) =>
    `/api/students/export/class-list?classId=${f.classId}&gradeId=${f.gradeId}&academicYearId=${f.academicYearId}&status=all`,

  excelFileName: (f, meta) =>
    `كشف_هواتف_طوارئ_${meta.selectedClassroom?.class_name || ''}_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  buildQuery: (f) => {
    const q = new URLSearchParams({
      gradeId: f.gradeId,
      academicYearId: f.academicYearId,
      classId: f.classId,
      limit: 60,
      status: 'all',
    });
    if (f.sectionId) q.set('sectionId', f.sectionId);
    return q.toString();
  },

  PreviewComponent: EmergencyPhonesListPreview,
};

export default emergencyPhonesList;
