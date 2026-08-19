// ════════════════════════════════════════════════════════════════
//  Report Definition: سجل المنقطعين وموقوفي القيد
//  يعرض الطلاب الذين لديهم حالة قيد "موقوف قيده" أو منقطعين
// ════════════════════════════════════════════════════════════════
import React from 'react';

const STATUS_LABELS = {
  promoted:  'منقول',
  retained:  'باقٍ للإعادة',
  suspended: 'موقوف قيده',
  active:    'قيد',
};

function DroppedStudentsReportPreview({ students, meta, schoolInfo }) {
  const { selectedGrade, selectedYear } = meta;
  
  // Filter for suspended (منقطعين وموقوفي القيد)
  const dropped = students.filter(s => s.status === 'suspended');

  return (
    <div className="report-preview" id="print-area" data-orientation="landscape">
      {/* Official Header */}
      <div className="official-header">
        <div className="official-logo-box">
          <div className="logo-placeholder">شعار<br />المدرسة</div>
        </div>
        <div className="official-title-block">
          <div className="official-title" style={{ fontSize: 16 }}>سجل الطلاب المنقطعين وموقوفي القيد</div>
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
        <div style={{ padding: '6px 14px', background: '#dc2626', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
          عدد الطلاب موقوفي القيد والمنقطعين: <span style={{ fontSize: 15 }}>{dropped.length}</span>
        </div>
      </div>

      {/* Main Table */}
      <table className="register-table" dir="rtl" style={{ fontSize: 10.5 }}>
        <thead>
          <tr>
            <th style={{ width: 32 }}>م</th>
            <th>اسم الطالب</th>
            <th style={{ width: 35 }}>النوع</th>
            <th style={{ width: 110 }}>الرقم القومي</th>
            <th style={{ width: 90 }}>الصف</th>
            <th style={{ width: 65 }}>الفصل</th>
            <th style={{ width: 100 }}>حالة القيد</th>
            <th>ولي الأمر</th>
            <th style={{ width: 100 }}>هاتف ولي الأمر</th>
            <th>ملاحظات وسبب الانقطاع</th>
          </tr>
        </thead>
        <tbody>
          {dropped.length > 0 ? (
            dropped.map((s, i) => (
              <tr key={s.id} className={i % 2 === 0 ? '' : 'cl-even'}>
                <td className="cell-num">{i + 1}</td>
                <td className="cell-name" style={{ textAlign: 'right', fontWeight: 600 }}>{s.full_name_ar}</td>
                <td className="cell-sm">{s.gender === 'ذكر' ? 'م' : 'أ'}</td>
                <td className="cell-id" dir="ltr">{s.national_id || '—'}</td>
                <td>{s.grade_name_ar || '—'}</td>
                <td>{s.class_name || '—'}</td>
                <td style={{ color: '#dc2626', fontWeight: 700 }}>{STATUS_LABELS[s.status] || s.status}</td>
                <td>{s.guardian_name || s.parent_name || '—'}</td>
                <td>{s.guardian_phone || s.parent_phone || '—'}</td>
                <td></td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={10} style={{ textAlign: 'center', padding: 30, color: '#6b7280' }}>
                لا يوجد طلاب منقطعين أو موقوفي قيد مسجلين حالياً.
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

const droppedStudentsReport = {
  id:          'dropped_students_report',
  name:        'سجل الطلاب المنقطعين وموقوفي القيد',
  desc:        'يُظهر الطلاب الموقوف قيدهم أو المنقطعين مع بيانات التواصل للاتصال بأولياء أمورهم',
  category:    'الإحصائيات والتحليلات الرسمية',
  icon:        '⚠️',
  orientation: 'landscape',
  available:   true,

  filters: {
    requiresYear:    true,
    requiresSection: true,
    requiresStage:   true,
  },

  excelEndpoint: (f) =>
    `/api/students/export/excel?academicYearId=${f.academicYearId}&status=suspended`,

  excelFileName: (f, meta) =>
    `سجل_المنقطعين_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  buildQuery: (f) => {
    const q = new URLSearchParams({
      academicYearId: f.academicYearId,
      limit: 'all',
      status: 'all', // Fetch all and filter client side, or status=suspended
    });
    if (f.sectionId) q.set('sectionId', f.sectionId);
    if (f.stageId)   q.set('stageId', f.stageId);
    if (f.gradeId)   q.set('gradeId', f.gradeId);
    return q.toString();
  },

  PreviewComponent: DroppedStudentsReportPreview,
};

export default droppedStudentsReport;
