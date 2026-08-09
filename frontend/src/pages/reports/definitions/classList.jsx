// ════════════════════════════════════════════════════════════════
//  Report Definition: قائمة أسماء طلاب الفصل (عمودين مزدوجين)
// ════════════════════════════════════════════════════════════════
import React from 'react';

const STATUS_LABELS = {
  promoted:  'منقول',
  retained:  'باقٍ للإعادة',
  suspended: 'موقوف قيده',
  active:    'قيد',
};

/* ── Preview Component ─────────────────────────────────────────── */
function ClassListPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear, selectedClassroom } = meta;
  const totalStudents = students.length;
  const perPage = 50;
  const half    = 25;
  const pageCount = Math.ceil(totalStudents / perPage) || 1;

  return (
    <div className="report-preview" id="print-area" data-orientation="portrait">
      {Array.from({ length: pageCount }).map((_, pageIdx) => {
        const pageStudents = students.slice(pageIdx * perPage, (pageIdx + 1) * perPage);
        return (
          <div key={pageIdx} className="printable-page-block">

            {/* Standard Official Header */}
            <div className="report-official-header">
              <div className="header-col-right">
                <div>مديرية التربية والتعليم بمحافظة: <strong>{schoolInfo.governorate || '................'}</strong></div>
                <div>إدارة: <strong>{schoolInfo.directorate || '................'} التعليمية</strong></div>
                <div>مدرسة: <strong>{schoolInfo.schoolName || '................'}</strong></div>
              </div>

              <div className="header-col-center">
                <h2 className="report-title-main">
                  قائمة طلاب الفصل
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

            {/* Dual 25-Student Columns Table */}
            <div className="register-table-wrap" style={{ marginTop: 10 }}>
              <table className="register-table" style={{ fontSize: 11.5, borderCollapse: 'collapse', width: '100%', direction: 'rtl' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #000 !important', padding: '4px', background: '#f1f5f9', width: 26 }}>م</th>
                    <th style={{ border: '1px solid #000 !important', padding: '4px 6px', background: '#f1f5f9', minWidth: 160, textAlign: 'right' }}>اسم التلميذ</th>
                    <th style={{ border: '1px solid #000 !important', padding: '4px', background: '#f1f5f9', width: 45 }}>الديانة</th>
                    <th style={{ border: '1px solid #000 !important', borderLeft: '2px solid #000 !important', padding: '4px', background: '#f1f5f9', width: 55 }}>حالة القيد</th>

                    <th style={{ border: '1px solid #000 !important', padding: '4px', background: '#f1f5f9', width: 26 }}>م</th>
                    <th style={{ border: '1px solid #000 !important', padding: '4px 6px', background: '#f1f5f9', minWidth: 160, textAlign: 'right' }}>اسم التلميذ</th>
                    <th style={{ border: '1px solid #000 !important', padding: '4px', background: '#f1f5f9', width: 45 }}>الديانة</th>
                    <th style={{ border: '1px solid #000 !important', padding: '4px', background: '#f1f5f9', width: 55 }}>حالة القيد</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: half }).map((_, rowIdx) => {
                    const left  = pageStudents[rowIdx];
                    const right = pageStudents[rowIdx + half];
                    const leftNum  = pageIdx * perPage + rowIdx + 1;
                    const rightNum = pageIdx * perPage + rowIdx + half + 1;
                    return (
                      <tr key={rowIdx}>
                        <td style={{ border: '1px solid #000 !important', padding: '3px', textAlign: 'center' }}>{left ? leftNum : ''}</td>
                        <td style={{ border: '1px solid #000 !important', padding: '3px 6px', textAlign: 'right', fontWeight: 800, whiteSpace: 'nowrap' }}>{left ? left.full_name_ar : ''}</td>
                        <td style={{ border: '1px solid #000 !important', padding: '3px', textAlign: 'center' }}>{left ? (left.religion || '') : ''}</td>
                        <td style={{ border: '1px solid #000 !important', borderLeft: '2px solid #000 !important', padding: '3px', textAlign: 'center' }}>{left ? (STATUS_LABELS[left.status] || left.status || '') : ''}</td>

                        <td style={{ border: '1px solid #000 !important', padding: '3px', textAlign: 'center' }}>{right ? rightNum : ''}</td>
                        <td style={{ border: '1px solid #000 !important', padding: '3px 6px', textAlign: 'right', fontWeight: 800, whiteSpace: 'nowrap' }}>{right ? right.full_name_ar : ''}</td>
                        <td style={{ border: '1px solid #000 !important', padding: '3px', textAlign: 'center' }}>{right ? (right.religion || '') : ''}</td>
                        <td style={{ border: '1px solid #000 !important', padding: '3px', textAlign: 'center' }}>{right ? (STATUS_LABELS[right.status] || right.status || '') : ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Page Footer */}
            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, padding: '0 20px' }}>
              <div>مسؤول شئون الطلاب: ..........................</div>
              <div>صفحة ({pageIdx + 1}) من ({pageCount})</div>
              <div>يعتمد مدير المدرسة: ..........................</div>
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
  name:        'قائمة الفصل الرسمية (عمودين)',
  desc:        'قائمة أسماء طلاب الفصل في عمودين متجاورين (50 طالب بالصفحة — نموذج فصل.xltx)',
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
