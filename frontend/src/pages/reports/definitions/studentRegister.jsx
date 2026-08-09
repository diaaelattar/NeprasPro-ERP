// ════════════════════════════════════════════════════════════════
//  Report Definition: سجل قيد تلاميذ الصف (سجل 41 د - الطباعة الرسمية)
// ════════════════════════════════════════════════════════════════
import React from 'react';

/* ── helpers ───────────────────────────────────────────────────── */
const calculateAgeOnOct1st = (birthDateStr, yearLabel) => {
  if (!birthDateStr) return { days: '', months: '', years: '' };
  let targetYear = new Date().getFullYear();
  if (yearLabel) {
    const match = yearLabel.match(/(\d{4})/);
    if (match) targetYear = parseInt(match[1]);
  }
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return { days: '', months: '', years: '' };
  const target = new Date(targetYear, 9, 1);
  let years  = target.getFullYear() - birth.getFullYear();
  let months = target.getMonth()    - birth.getMonth();
  let days   = target.getDate()     - birth.getDate();
  if (days   < 0) { months--; days   += new Date(target.getFullYear(), target.getMonth(), 0).getDate(); }
  if (months < 0) { years--;  months += 12; }
  return { days, months, years };
};

const STATUS_LABELS = {
  promoted: 'منقول',
  retained: 'باقٍ للإعادة',
  suspended: 'موقوف قيده',
  active: 'قيد',
};

const PAGE_SIZE = 20; // 20 students per page chunk for official register print

/* ── Preview Component ─────────────────────────────────────────── */
function StudentRegisterPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear } = meta;
  
  // Calculate total pages (at least 1 page)
  const totalPages = Math.ceil(students.length / PAGE_SIZE) || 1;
  const pageChunks = [];
  
  for (let i = 0; i < totalPages; i++) {
    const pageStudents = students.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE);
    pageChunks.push({
      pageIndex: i,
      students: pageStudents
    });
  }

  return (
    <div className="report-preview" id="print-area" data-orientation="landscape">
      {pageChunks.map(({ pageIndex, students: pageStudents }) => (
        <div key={pageIndex} className="printable-page-block">
          
          {/* Standard Official Header (Repeated on every page) */}
          <div className="report-official-header">
            <div className="header-col-right">
              <div>مديرية التربية والتعليم بمحافظة: <strong>{schoolInfo.governorate || '................'}</strong></div>
              <div>إدارة: <strong>{schoolInfo.directorate || '................'} التعليمية</strong></div>
              <div>مدرسة: <strong>{schoolInfo.schoolName || '................'}</strong></div>
            </div>

            <div className="header-col-center">
              <h2 className="report-title-main">
                سجل قيد تلاميذ {selectedGrade?.grade_name_ar || '...............'}
              </h2>
              <div className="report-subtitle-meta">
                للعام الدراسي {selectedYear?.year_label || '...............'} | إجمالي المسجلين: {students.length} طالب
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

          {/* Table */}
          <div className="register-table-wrap">
            <table className="register-table" dir="rtl">
              <thead>
                <tr>
                  <th rowSpan="2" style={{ width: 26 }}>م</th>
                  <th rowSpan="2" style={{ width: 175 }}>اسم التلميذ</th>
                  <th rowSpan="2" style={{ width: 108 }}>الرقم القومي</th>
                  <th rowSpan="2" style={{ width: 78 }}>تاريخ الميلاد</th>
                  <th colSpan="3" style={{ width: 82 }}>السن في 1/10</th>
                  <th rowSpan="2" style={{ width: 36 }}>النوع</th>
                  <th rowSpan="2" style={{ width: 42 }}>الفصل</th>
                  <th rowSpan="2" style={{ width: 42 }}>الديانة</th>
                  <th rowSpan="2" style={{ width: 50 }}>الجنسية</th>
                  <th rowSpan="2" style={{ width: 58 }}>حالة القيد</th>
                  <th rowSpan="2" style={{ width: 40 }}>الدمج</th>
                  <th colSpan="2">ولي أمر التلميذ</th>
                  <th rowSpan="2" style={{ width: 85 }}>رقم الهاتف</th>
                  <th rowSpan="2" style={{ width: 105 }}>العـنـوان</th>
                </tr>
                <tr>
                  <th style={{ width: 26 }}>يوم</th>
                  <th style={{ width: 26 }}>شهر</th>
                  <th style={{ width: 30 }}>سنة</th>
                  <th style={{ width: 185 }}>الاسم</th>
                  <th style={{ width: 105 }}>الوظيفة</th>
                </tr>
              </thead>
              <tbody>
                {pageStudents.map((s, idx) => {
                  const globalIdx = pageIndex * PAGE_SIZE + idx + 1;
                  const age = calculateAgeOnOct1st(s.birth_date, selectedYear?.year_label);
                  return (
                    <tr key={s.id || idx}>
                      <td className="cell-num">{globalIdx}</td>
                      <td className="cell-name" style={{ fontWeight: 800 }}>{s.full_name_ar}</td>
                      <td className="cell-id" dir="ltr" style={{ fontFamily: 'Cairo, monospace' }}>{s.national_id || '—'}</td>
                      <td className="cell-id" style={{ fontFamily: 'Cairo, monospace' }}>{s.birth_date || '—'}</td>
                      <td className="cell-sm">{age.days}</td>
                      <td className="cell-sm">{age.months}</td>
                      <td className="cell-sm">{age.years}</td>
                      <td className="cell-sm" style={{ fontWeight: 700 }}>{s.gender || '—'}</td>
                      <td className="cell-sm" style={{ direction: 'ltr' }}>{s.classroom_name || '—'}</td>
                      <td className="cell-sm">{s.religion || '—'}</td>
                      <td className="cell-sm">{s.nationality_name || '—'}</td>
                      <td className="cell-sm">{STATUS_LABELS[s.status] || s.enrollment_status || 'منقول'}</td>
                      <td className="cell-sm">{s.is_merged === 1 ? (s.merge_type || 'مدمج') : 'لا يوجد'}</td>
                      <td className="cell-name">{s.guardian_name || '—'}</td>
                      <td className="cell-sm">{s.guardian_job || '—'}</td>
                      <td className="cell-phone" dir="ltr">{s.guardian_phone || '—'}</td>
                      <td className="cell-addr" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.address || '—'}</td>
                    </tr>
                  );
                })}

                {/* Empty filler rows to complete full 20 rows on the page */}
                {Array.from({ length: Math.max(0, PAGE_SIZE - pageStudents.length) }, (_, idx) => (
                  <tr key={`filler-${idx}`}>
                    <td className="cell-num">{pageIndex * PAGE_SIZE + pageStudents.length + idx + 1}</td>
                    <td /><td /><td />
                    <td /><td /><td />
                    <td /><td /><td />
                    <td /><td /><td />
                    <td /><td /><td />
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Official Signatures Footer (Repeated on every page) */}
          <div className="official-signatures-footer">
            <div style={{ textAlign: 'center' }}>
              <div>وكيل شئون الطلاب</div>
              <div style={{ marginTop: 32, color: '#64748b' }}>....................................</div>
            </div>

            <div style={{ textAlign: 'center', fontSize: 11, color: '#475569' }}>
              صفحة ({pageIndex + 1}) من ({totalPages})
            </div>

            <div style={{ textAlign: 'center' }}>
              <div>مدير المدرسة (يعتمد)</div>
              <div style={{ marginTop: 32, color: '#64748b' }}>....................................</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Report Definition Object ──────────────────────────────────── */
const studentRegister = {
  id:          'student_register',
  name:        'سجل القيد',
  desc:        'النموذج الرسمي المعتمد من الوزارة لسجل قيد الطلاب',
  category:    'سجلات القيد',
  icon:        '📖',
  orientation: 'landscape',
  available:   true,

  filters: {
    requiresGrade:   true,
    requiresYear:    true,
    requiresClass:   false,
    requiresSection: true,
    requiresStage:   true,
  },

  // URL لتصدير Excel من الـ backend
  excelEndpoint: (f) =>
    `/api/students/export/excel?gradeId=${f.gradeId}&academicYearId=${f.academicYearId}` +
    `&sectionId=${f.sectionId || ''}&stageId=${f.stageId || ''}&status=all&genderOrder=${f.genderOrder || 'none'}`,

  excelFileName: (f, meta) =>
    `سجل_قيد_${meta.selectedGrade?.grade_name_ar || 'الصف'}_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  // دالة تحميل البيانات للمعاينة
  buildQuery: (f) => {
    const q = new URLSearchParams({
      gradeId: f.gradeId,
      academicYearId: f.academicYearId,
      limit: '10000',
      status: 'all',
    });
    if (f.sectionId)   q.set('sectionId',   f.sectionId);
    if (f.stageId)     q.set('stageId',     f.stageId);
    if (f.genderOrder) q.set('genderOrder', f.genderOrder);
    return q.toString();
  },

  PreviewComponent: StudentRegisterPreview,
};

export default studentRegister;
