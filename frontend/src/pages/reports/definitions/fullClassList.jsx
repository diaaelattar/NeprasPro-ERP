// ════════════════════════════════════════════════════════════════
//  Report Definition: قائمة فصل كاملة البيانات (8 أعمدة تفصيلية)
// ════════════════════════════════════════════════════════════════
import React from 'react';

const STATUS_LABELS = {
  promoted:     'منقول',
  retained:     'باقٍ للإعادة',
  suspended:    'موقوف قيده',
  disconnected: 'منقطع',
  excluded:     'مستبعد',
  active:       'نشط / قيد',
};

/* ── Preview Component ─────────────────────────────────────────── */
function FullClassListPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear, selectedClassroom, classroomLabel } = meta;
  const totalStudents = students.length;
  const perPage = 30; // 30 students per page for landscape/detailed print
  const pageCount = Math.ceil(totalStudents / perPage) || 1;

  return (
    <div className="report-preview full-class-list-preview" id="print-area" data-orientation="landscape">
      {Array.from({ length: pageCount }).map((_, pageIdx) => {
        const pageStudents = students.slice(pageIdx * perPage, (pageIdx + 1) * perPage);
        return (
          <div key={pageIdx} className={`printable-page-block${pageIdx > 0 ? ' page-break-before' : ''}`}>

            {/* ── Official Header ── */}
            <div className="report-official-header" dir="rtl">
              <div className="header-col-right">
                <div>وزارة التربية والتعليم</div>
                <div>محافظة: <strong>{schoolInfo.governorate || '................'}</strong></div>
                <div>إدارة: <strong>{schoolInfo.directorate || '................'} التعليمية</strong></div>
                <div>مدرسة: <strong>{schoolInfo.schoolName || '................'}</strong></div>
              </div>

              <div className="header-col-center">
                <h2 className="report-title-main">
                  قائمة تلاميذ فصل: {classroomLabel || selectedClassroom?.class_name || selectedGrade?.grade_name_ar || '................'}
                </h2>
                <div className="report-subtitle-meta">
                  للعام الدراسي: {selectedYear?.year_label || '................'} | إجمالي الطلاب: {totalStudents} طالب
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
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                  التاريخ: {new Date().toLocaleDateString('ar-EG')}
                </div>
              </div>
            </div>

            {/* ── Table (8 Detailed Columns matching قائمة_فصل_كاملة_البيانات.xltx) ── */}
            <div className="register-table-wrap" style={{ marginTop: 12 }}>
              <table className="register-table" dir="rtl" style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', textAlign: 'center' }}>
                    <th style={{ width: 35 }}>م</th>
                    <th style={{ width: 220 }}>اسم الطالب</th>
                    <th style={{ width: 130 }}>الرقم القومي</th>
                    <th style={{ width: 100 }}>تاريخ الميلاد</th>
                    <th style={{ width: 65 }}>الديانة</th>
                    <th style={{ width: 85 }}>الجنسية</th>
                    <th style={{ width: 85 }}>حالة القيد</th>
                    <th style={{ width: 100 }}>تاريخ التسجيل</th>
                  </tr>
                </thead>
                <tbody>
                  {pageStudents.map((s, idx) => {
                    const rowNum = pageIdx * perPage + idx + 1;
                    const regDate = s.enrollment_date || (s.created_at ? s.created_at.split('T')[0] : '—');
                    return (
                      <tr key={s.id || idx} style={{ textAlign: 'center' }}>
                        <td className="cell-num">{rowNum}</td>
                        <td className="cell-name" style={{ textAlign: 'right', fontWeight: 800, paddingRight: 8 }}>{s.full_name_ar}</td>
                        <td className="cell-id" dir="ltr" style={{ fontFamily: 'monospace' }}>{s.national_id || '—'}</td>
                        <td className="cell-id" style={{ fontFamily: 'monospace' }}>{s.birth_date || '—'}</td>
                        <td>{s.religion || 'مسلم'}</td>
                        <td>{s.nationality_name || 'مصري'}</td>
                        <td>{STATUS_LABELS[s.status] || s.enrollment_status || 'منقول'}</td>
                        <td dir="ltr" style={{ fontFamily: 'monospace' }}>{regDate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Signatures Footer ── */}
            <div className="official-signatures-footer" style={{ marginTop: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div>مسؤول شؤون الطلاب</div>
                <div style={{ marginTop: 28, color: '#64748b' }}>....................................</div>
              </div>

              <div style={{ textAlign: 'center', fontSize: 11, color: '#475569' }}>
                صفحة ({pageIdx + 1}) من ({pageCount})
              </div>

              <div style={{ textAlign: 'center' }}>
                <div>يعتمد؛ مدير المدرسة</div>
                <div style={{ marginTop: 28, color: '#64748b' }}>....................................</div>
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}

/* ── Report Definition Object ──────────────────────────────────── */
const fullClassList = {
  id:          'full_class_list',
  name:        'قائمة فصل كاملة البيانات (8 أعمدة)',
  desc:        'كشف تفصيلي شامل لكافة بيانات طلاب الفصل (مطابق لنموذج قائمة_فصل_كاملة_البيانات.xltx)',
  category:    'قوائم الفصول',
  icon:        '📋',
  orientation: 'landscape',
  available:   true,

  filters: {
    requiresGrade:   true,
    requiresYear:    true,
    requiresClass:   true,
    requiresSection: true,
    requiresStage:   true,
  },

  excelEndpoint: (f) =>
    `/api/students/export/class-list?mode=full&classId=${f.classId || ''}&gradeId=${f.gradeId || ''}` +
    `&stageId=${f.stageId || ''}&academicYearId=${f.academicYearId}&genderOrder=${f.genderOrder || 'none'}&status=all`,

  excelFileName: (f, meta) =>
    `قائمة_فصل_كاملة_${meta.selectedClassroom?.class_name || meta.selectedGrade?.grade_name_ar || 'الفصل'}_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  buildQuery: (f) => {
    const q = new URLSearchParams({
      academicYearId: f.academicYearId,
      limit: '10000',
      status: 'all',
    });
    if (f.gradeId && f.gradeId !== 'all_stage') q.set('gradeId', f.gradeId);
    if (f.stageId)     q.set('stageId',     f.stageId);
    if (f.classId)     q.set('classId',     f.classId);
    if (f.sectionId)   q.set('sectionId',   f.sectionId);
    if (f.genderOrder) q.set('genderOrder', f.genderOrder);
    return q.toString();
  },

  PreviewComponent: FullClassListPreview,
};

export default fullClassList;
