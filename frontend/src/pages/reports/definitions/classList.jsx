// ════════════════════════════════════════════════════════════════
//  Report Definition: قائمة أسماء طلاب الفصل (عمودين)
// ════════════════════════════════════════════════════════════════
import React from 'react';

const STATUS_LABELS = {
  promoted:  'منقول',
  retained:  'باقٍ للإعادة',
  suspended: 'موقوف قيده',
  active:    'قيد',
};

/* ── Preview Component ─────────────────────────────────────────── */
function ClassListPreview({ students, meta, schoolInfo }) {
  const { selectedGrade, selectedYear, selectedClassroom } = meta;
  const totalStudents = students.length;
  const perPage = 50;
  const half    = 25;
  const pageCount = Math.ceil(totalStudents / perPage) || 1;

  return (
    <div className="report-preview class-list-preview" id="print-area" data-orientation="portrait">
      {Array.from({ length: pageCount }).map((_, pageIdx) => {
        const pageStudents = students.slice(pageIdx * perPage, (pageIdx + 1) * perPage);
        return (
          <div key={pageIdx} className={`class-list-page${pageIdx > 0 ? ' page-break-before' : ''}`}>

            {/* ── Header ── */}
            <div className="cl-header" dir="rtl">
              <div className="cl-header-top">
                <div className="cl-school-block">
                  <div>وزارة التربية والتعليم</div>
                  <div>مديرية التربية والتعليم: <strong>{schoolInfo.governorate || '....'}</strong></div>
                  <div>إدارة: <strong>{schoolInfo.directorate || '....'}</strong></div>
                  <div>مدرسة: <strong>{schoolInfo.schoolName || '....'}</strong></div>
                </div>
                <div className="cl-title-block">
                  <div className="cl-title">قائمة تلاميذ فصل</div>
                  <div className="cl-subtitle">
                    <span className="cl-fill">
                      {selectedClassroom?.class_name || selectedGrade?.grade_name_ar || '......'}
                    </span>
                  </div>
                  <div className="cl-year">
                    العام الدراسى: <span className="cl-fill">{selectedYear?.year_label || '......'}</span>
                  </div>
                </div>
                <div className="cl-logo-box">
                  <div className="logo-placeholder">شعار<br />المدرسة</div>
                </div>
              </div>
            </div>

            {/* ── Dual-column Table ── */}
            <table className="class-list-table" dir="rtl">
              <thead>
                <tr>
                  <th className="cl-num">م</th>
                  <th className="cl-name">اسم التلميذ</th>
                  <th className="cl-rel">الديانة</th>
                  <th className="cl-status">حالة القيد</th>
                  <th className="cl-divider cl-num">م</th>
                  <th className="cl-name">اسم التلميذ</th>
                  <th className="cl-rel">الديانة</th>
                  <th className="cl-status">حالة القيد</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: half }).map((_, rowIdx) => {
                  const left  = pageStudents[rowIdx];
                  const right = pageStudents[rowIdx + half];
                  const leftNum  = pageIdx * perPage + rowIdx + 1;
                  const rightNum = pageIdx * perPage + rowIdx + half + 1;
                  return (
                    <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'cl-even' : ''}>
                      <td className="cl-num">{left  ? leftNum  : ''}</td>
                      <td className="cl-name">{left  ? left.full_name_ar  : ''}</td>
                      <td className="cl-rel">{left  ? (left.religion   || '') : ''}</td>
                      <td className="cl-status">{left  ? (STATUS_LABELS[left.status]  || '') : ''}</td>
                      <td className="cl-divider cl-num">{right ? rightNum : ''}</td>
                      <td className="cl-name">{right ? right.full_name_ar : ''}</td>
                      <td className="cl-rel">{right ? (right.religion  || '') : ''}</td>
                      <td className="cl-status">{right ? (STATUS_LABELS[right.status] || '') : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ── Page Footer ── */}
            <div className="cl-footer" dir="rtl">
              <div className="sig-block">شؤون الطلاب<br /><span className="sig-line" /></div>
              <div className="sig-block">يعتمد؛ مدير المدرسة<br /><span className="sig-line" /></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Report Definition Object ──────────────────────────────────── */
const classList = {
  id:          'class_list',
  name:        'قائمة أسماء طلاب الفصل',
  desc:        'عمودان متجاوران — 50 طالب في الصفحة',
  category:    'قوائم الفصول',
  icon:        '📋',
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
    `/api/students/export/class-list?classId=${f.classId}&gradeId=${f.gradeId}` +
    `&academicYearId=${f.academicYearId}&status=all`,

  excelFileName: (f, meta) =>
    `قائمة_فصل_${meta.selectedClassroom?.class_name || 'الفصل'}_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  buildQuery: (f) => {
    const q = new URLSearchParams({
      gradeId: f.gradeId,
      academicYearId: f.academicYearId,
      classId: f.classId,
      limit: 500,
      status: 'all',
    });
    if (f.sectionId) q.set('sectionId', f.sectionId);
    if (f.stageId)   q.set('stageId',   f.stageId);
    return q.toString();
  },

  PreviewComponent: ClassListPreview,
};

export default classList;
