// ════════════════════════════════════════════════════════════════
//  Report Definition: قائمة الفصل (دمج وغير دمج)
//  يعرض الطلاب مقسمين لفئتين: المدمجون وغير المدمجون
// ════════════════════════════════════════════════════════════════
import React from 'react';

const STATUS_LABELS = {
  promoted:  'منقول',
  retained:  'باقٍ للإعادة',
  suspended: 'موقوف قيده',
  active:    'قيد',
};

function MergeClassListPreview({ students, meta, schoolInfo }) {
  const { selectedGrade, selectedYear, selectedClassroom } = meta;
  const merged    = students.filter(s => s.is_merged === 1 || s.is_merged === true);
  const nonMerged = students.filter(s => !s.is_merged || s.is_merged === 0);

  const renderSection = (list, title, color) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ background: color, color: '#fff', padding: '6px 16px', fontWeight: 700, fontSize: 13, marginBottom: 8, borderRadius: 4 }}>
        {title} — العدد: {list.length}
      </div>
      <table className="register-table" dir="rtl" style={{ fontSize: 11, marginBottom: 0 }}>
        <thead>
          <tr>
            <th style={{ width: 35 }}>م</th>
            <th>اسم الطالب</th>
            <th style={{ width: 110 }}>الرقم القومي</th>
            <th style={{ width: 50 }}>النوع</th>
            <th style={{ width: 55 }}>الديانة</th>
            <th style={{ width: 80 }}>حالة القيد</th>
            {merged.length > 0 && title.includes('الدمج') && <th>نوع الإعاقة</th>}
            <th>ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          {list.map((s, i) => (
            <tr key={s.id} className={i % 2 === 0 ? '' : 'cl-even'}>
              <td className="cell-num">{i + 1}</td>
              <td className="cell-name" style={{ textAlign: 'right', fontWeight: 600 }}>{s.full_name_ar}</td>
              <td className="cell-id" dir="ltr">{s.national_id || '—'}</td>
              <td className="cell-sm">{s.gender === 'ذكر' ? 'م' : 'أ'}</td>
              <td className="cell-sm">{s.religion || 'مسلم'}</td>
              <td className="cell-sm">{STATUS_LABELS[s.status] || ''}</td>
              {merged.length > 0 && title.includes('الدمج') && <td>{s.merge_type || 'دمج تعليمي'}</td>}
              <td></td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr><td colSpan="8" style={{ textAlign: 'center', padding: 10, color: '#6b7280' }}>لا يوجد</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="report-preview" id="print-area" data-orientation="portrait">
      {/* Official Header */}
      <div className="official-header">
        <div className="official-logo-box">
          <div className="logo-placeholder">شعار<br />المدرسة</div>
        </div>
        <div className="official-title-block">
          <div className="official-title" style={{ fontSize: 15 }}>
            قائمة فصل — مدمجون وغير مدمجون
          </div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            {selectedGrade?.grade_name_ar} — {selectedClassroom?.class_name || 'كل الفصول'} — {selectedYear?.year_label}
          </div>
        </div>
        <div className="official-school-info">
          <div>محافظة: <span>{schoolInfo.governorate || '....'}</span></div>
          <div>إدارة: <span>{schoolInfo.directorate || '....'}</span></div>
          <div>مدرسة: <span>{schoolInfo.schoolName || '....'}</span></div>
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 20, margin: '10px 0', fontSize: 12, fontWeight: 700 }}>
        <span>الإجمالي: {students.length}</span>
        <span style={{ color: '#dc2626' }}>مدمجون: {merged.length}</span>
        <span style={{ color: '#059669' }}>غير مدمجون: {nonMerged.length}</span>
      </div>

      {renderSection(nonMerged, '✅ الطلاب غير المدمجون', '#059669')}
      {renderSection(merged,    '♿ الطلاب المدمجون (ذوو الاحتياجات الخاصة)', '#dc2626')}

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <div>مسؤول شئون الطلاب: ..........................</div>
        <div>يعتمد مدير المدرسة: ..........................</div>
      </div>
    </div>
  );
}

const mergeClassList = {
  id:          'merge_class_list',
  name:        'قائمة الفصل (دمج وغير دمج)',
  desc:        'قائمة مقسمة إلى طلاب مدمجين وغير مدمجين في الفصل',
  category:    'قوائم الفصول',
  icon:        '♿',
  orientation: 'portrait',
  available:   true,

  filters: {
    requiresGrade:   true,
    requiresYear:    true,
    requiresSection: true,
    requiresStage:   true,
  },

  excelEndpoint: (f) =>
    `/api/students/export/class-list?gradeId=${f.gradeId}&academicYearId=${f.academicYearId}&status=all`,

  excelFileName: (f, meta) =>
    `قائمة_دمج_${meta.selectedGrade?.grade_name_ar || ''}_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  buildQuery: (f) => {
    const q = new URLSearchParams({
      gradeId: f.gradeId,
      academicYearId: f.academicYearId,
      limit: 500,
      status: 'all',
    });
    if (f.sectionId) q.set('sectionId', f.sectionId);
    if (f.stageId)   q.set('stageId',   f.stageId);
    if (f.classId)   q.set('classId',   f.classId);
    return q.toString();
  },

  PreviewComponent: MergeClassListPreview,
};

export default mergeClassList;
