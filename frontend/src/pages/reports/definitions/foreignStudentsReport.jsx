// ════════════════════════════════════════════════════════════════
//  Report Definition: سجل الطلاب الوافدين (غير المصريين)
//  يعرض الطلاب الذين جنسيتهم غير مصرية
// ════════════════════════════════════════════════════════════════
import React from 'react';

function ForeignStudentsReportPreview({ students, meta, schoolInfo }) {
  const { selectedGrade, selectedYear } = meta;

  // Filter for students whose nationality is not Egyptian ("مصري" / "مصرية")
  const foreignStudents = students.filter(s => {
    if (!s.nationality_name) return false;
    const name = s.nationality_name.trim();
    return name !== 'مصري' && name !== 'مصرية' && name !== 'Egyptian';
  });

  return (
    <div className="report-preview" id="print-area" data-orientation="landscape">
      {/* Official Header */}
      <div className="official-header">
        <div className="official-logo-box">
          <div className="logo-placeholder">شعار<br />المدرسة</div>
        </div>
        <div className="official-title-block">
          <div className="official-title" style={{ fontSize: 16 }}>سجل الطلاب الوافدين (غير المصريين)</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            {selectedGrade?.grade_name_ar || 'جميع الصفوف'} — {selectedYear?.year_label}
          </div>
        </div>
        <div className="official-school-info">
          <div>محافظة: <span>{schoolInfo.governorate || '....'}</span></div>
          <div>إدارة: <span>{schoolInfo.directorate || '....'}</span></div>
          <div>مدرسة: <span>{schoolInfo.schoolName || '....'}</span></div>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'flex', gap: 16, margin: '10px 0' }}>
        <div style={{ padding: '6px 14px', background: '#0284c7', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
          إجمالي الطلاب الوافدين: <span style={{ fontSize: 15 }}>{foreignStudents.length}</span>
        </div>
      </div>

      {/* Main Table */}
      <table className="register-table" dir="rtl" style={{ fontSize: 10.5 }}>
        <thead>
          <tr>
            <th style={{ width: 32 }}>م</th>
            <th>اسم الطالب</th>
            <th style={{ width: 35 }}>النوع</th>
            <th style={{ width: 85 }}>الجنسية</th>
            <th style={{ width: 110 }}>الرقم القومي / جواز السفر</th>
            <th style={{ width: 90 }}>الصف</th>
            <th style={{ width: 65 }}>الفصل</th>
            <th>ولي الأمر</th>
            <th style={{ width: 100 }}>هاتف ولي الأمر</th>
            <th>العنوان بالتفصيل</th>
            <th>ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          {foreignStudents.length > 0 ? (
            foreignStudents.map((s, i) => (
              <tr key={s.id} className={i % 2 === 0 ? '' : 'cl-even'}>
                <td className="cell-num">{i + 1}</td>
                <td className="cell-name" style={{ textAlign: 'right', fontWeight: 600 }}>{s.full_name_ar}</td>
                <td className="cell-sm">{s.gender === 'ذكر' ? 'م' : 'أ'}</td>
                <td style={{ fontWeight: 700, color: '#0369a1' }}>{s.nationality_name}</td>
                <td className="cell-id" dir="ltr">{s.national_id || '—'}</td>
                <td>{s.grade_name_ar || '—'}</td>
                <td>{s.class_name || '—'}</td>
                <td>{s.guardian_name || s.parent_name || '—'}</td>
                <td>{s.guardian_phone || s.parent_phone || '—'}</td>
                <td>{s.address || '—'}</td>
                <td></td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={11} style={{ textAlign: 'center', padding: 30, color: '#6b7280' }}>
                لا يوجد طلاب وافدون مسجلون حالياً.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <div>الأخصائي الاجتماعي: ..........................</div>
        <div>يعتمد مدير المدرسة: ..........................</div>
      </div>
    </div>
  );
}

const foreignStudentsReport = {
  id:          'foreign_students_report',
  name:        'سجل الطلاب الوافدين',
  desc:        'سجل تفصيلي بالطلاب غير المصريين المسجلين في المدرسة موضحاً جنسياتهم وبيانات تواصلهم',
  category:    'السجلات المتخصصة',
  icon:        '🌍',
  orientation: 'landscape',
  available:   true,

  filters: {
    requiresYear:    true,
    requiresSection: true,
    requiresStage:   true,
  },

  excelEndpoint: (f) =>
    `/api/students/export/excel?academicYearId=${f.academicYearId}&isForeign=true`,

  excelFileName: (f, meta) =>
    `سجل_الوافدين_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  buildQuery: (f) => {
    const q = new URLSearchParams({
      academicYearId: f.academicYearId,
      limit: 'all',
      status: 'all',
    });
    if (f.sectionId) q.set('sectionId', f.sectionId);
    if (f.stageId)   q.set('stageId', f.stageId);
    if (f.gradeId)   q.set('gradeId', f.gradeId);
    return q.toString();
  },

  PreviewComponent: ForeignStudentsReportPreview,
};

export default foreignStudentsReport;
