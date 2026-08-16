// ════════════════════════════════════════════════════════════════
//  Report Definition: سجل الطلاب الموقوف قيدهم
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

const PAGE_SIZE = 22; // 22 students per page chunk for official register print

/* ── Preview Component ─────────────────────────────────────────── */
function SuspendedRegisterPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear } = meta;

  // Clean School & Administration names
  const cleanSchool = (schoolInfo.schoolName || '').replace(/^مدرسة\s*/, '').trim();
  const rawAdmin = schoolInfo.directorate || '';
  const cleanAdmin = rawAdmin.replace(/التعليمية\s*$/, '').trim();
  const governorate = schoolInfo.governorate || 'الجيزة';

  // Calculate overall statistical summary
  const stats = React.useMemo(() => {
    let boys = 0;
    let girls = 0;
    let muslimBoys = 0;
    let muslimGirls = 0;
    let christianBoys = 0;
    let christianGirls = 0;
    let mergedCount = 0;
    const classroomsSet = new Set();

    students.forEach(s => {
      const isMale = s.gender === 'ذكر';
      const isMuslim = s.religion === 'مسلم';
      const isChristian = s.religion === 'مسيحي';

      if (isMale) {
        boys++;
        if (isMuslim) muslimBoys++;
        if (isChristian) christianBoys++;
      } else {
        girls++;
        if (isMuslim) muslimGirls++;
        if (isChristian) christianGirls++;
      }

      if (s.is_merged === 1) mergedCount++;
      if (s.classroom_name || s.class_name) {
        classroomsSet.add(s.classroom_name || s.class_name);
      }
    });

    return {
      total: students.length,
      boys,
      girls,
      muslimBoys,
      muslimGirls,
      muslimTotal: muslimBoys + muslimGirls,
      christianBoys,
      christianGirls,
      christianTotal: christianBoys + christianGirls,
      mergedCount,
      classesCount: classroomsSet.size || 1
    };
  }, [students]);

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
        <div key={pageIndex} className="printable-page-block" style={{ padding: '10px 14px', boxSizing: 'border-box' }}>
          
          {/* Standard Official Header (Repeated on every page) */}
          <div className="report-official-header" style={{ marginBottom: 8, paddingBottom: 6, borderBottom: '1.5px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="header-col-right" style={{ textAlign: 'right', fontSize: 11, lineHeight: 1.4, fontWeight: 700 }}>
              <div>محافظة: <strong>{governorate || '................'}</strong></div>
              <div>إدارة: <strong>{cleanAdmin ? `${cleanAdmin} التعليمية` : '................'}</strong></div>
              <div>مدرسة: <strong>{cleanSchool || '................'}</strong></div>
            </div>

            <div className="header-col-center" style={{ textAlign: 'center', flex: 1 }}>
              <h2 className="report-title-main" style={{ fontSize: 15.5, fontWeight: 900, margin: 0, textDecoration: 'underline', color: '#c2410c' }}>
                سجل الموقوف قيدهم - {selectedGrade?.grade_name_ar || 'جميع الصفوف'}
              </h2>
              <div className="report-subtitle-meta" style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginTop: 2 }}>
                للعام الدراسي {selectedYear?.year_label || '...............'} | إجمالي الموقوف قيدهم: <strong>{students.length}</strong> طالب
              </div>
            </div>

            <div className="header-col-left" style={{ textAlign: 'left' }}>
              {schoolInfo.logoUrl ? (
                <img src={schoolInfo.logoUrl} alt="Logo" style={{ maxHeight: 40, maxWidth: 85, objectFit: 'contain' }} />
              ) : (
                <div style={{ border: '1px dashed #94a3b8', borderRadius: 4, padding: '3px 6px', fontSize: 9.5, color: '#64748b', textAlign: 'center', background: '#f8fafc' }}>
                  شعار المدرسة
                </div>
              )}
              <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
            </div>
          </div>

          {/* Table */}
          <div className="register-table-wrap" style={{ width: '100%', overflowX: 'hidden' }}>
            <table className="register-table" dir="rtl" style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', fontSize: 9.5, textAlign: 'center', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: '#ffedd5', color: '#c2410c', fontWeight: 800 }}>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '3px 1px', width: 22 }}>م</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'right', width: 145 }}>اسم التلميذ</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '3px 1px', width: 95 }}>الرقم القومي</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '3px 1px', width: 68 }}>تاريخ الميلاد</th>
                  <th colSpan="3" style={{ border: '1px solid #000', padding: '2px 1px', width: 63 }}>السن في 1/10</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '3px 1px', width: 26 }}>النوع</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '3px 1px', width: 26 }}>الفصل</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '3px 1px', width: 28 }}>الديانة</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '3px 1px', width: 32 }}>الجنسية</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '3px 1px', width: 32 }}>الدمج</th>
                  <th colSpan="2" style={{ border: '1px solid #000', padding: '2px 4px', width: 195, background: '#fed7aa' }}>ولي الأمر</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '3px 1px', width: 75 }}>الهاتف</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'right', width: 85 }}>العـنـوان</th>
                </tr>
                <tr style={{ background: '#fff7ed', color: '#c2410c', fontWeight: 800, fontSize: 9 }}>
                  <th style={{ border: '1px solid #000', padding: '2px 0', width: 21 }}>يوم</th>
                  <th style={{ border: '1px solid #000', padding: '2px 0', width: 21 }}>شهر</th>
                  <th style={{ border: '1px solid #000', padding: '2px 0', width: 21 }}>سنة</th>
                  <th style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', width: 125 }}>الاسم</th>
                  <th style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', width: 70 }}>المهنة</th>
                </tr>
              </thead>
              <tbody>
                {pageStudents.map((s, idx) => {
                  const globalIdx = pageIndex * PAGE_SIZE + idx + 1;
                  const age = calculateAgeOnOct1st(s.birth_date, selectedYear?.year_label);
                  return (
                    <tr key={s.id || idx} style={{ background: idx % 2 === 1 ? '#fffaf5' : '#fff' }}>
                      <td style={{ border: '1px solid #000', padding: '2px 1px', fontWeight: 700 }}>{globalIdx}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 10 }}>
                        {s.full_name_ar}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px 1px', fontFamily: 'monospace', fontSize: 9.5, whiteSpace: 'nowrap' }}>
                        {s.national_id || '—'}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px 1px', fontFamily: 'monospace', fontSize: 9, whiteSpace: 'nowrap' }}>
                        {s.birth_date || '—'}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px 0', fontSize: 9 }}>{age.days}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 0', fontSize: 9 }}>{age.months}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 0', fontSize: 9 }}>{age.years}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1px', fontWeight: 700, fontSize: 9.5 }}>{s.gender || '—'}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1px', direction: 'ltr', fontSize: 9.5 }}>{s.classroom_name || s.class_number || '—'}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1px', fontSize: 9.5 }}>{s.religion || '—'}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1px', fontSize: 9.5 }}>{s.nationality_name || 'مصري'}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1px', fontSize: 8.5 }}>
                        {s.is_merged === 1 ? (s.merge_type || 'مدمج') : ''}
                      </td>
                      {/* Guardian Name & Job */}
                      <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 9.5 }}>
                        {s.guardian_name || '—'}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px 3px', textAlign: 'right', fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.guardian_job || '—'}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px 1px', fontFamily: 'monospace', fontSize: 8.5, whiteSpace: 'nowrap' }} dir="ltr">
                        {s.guardian_phone || s.guardian_phone_2 || '—'}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px 3px', textAlign: 'right', fontSize: 8.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.address || '—'}
                      </td>
                    </tr>
                  );
                })}

                {/* Empty filler rows to complete full page layout if needed */}
                {Array.from({ length: Math.max(0, PAGE_SIZE - pageStudents.length) }, (_, idx) => (
                  <tr key={`filler-${idx}`} style={{ height: 20 }}>
                    <td style={{ border: '1px solid #000', padding: '2px 1px' }}>{pageIndex * PAGE_SIZE + pageStudents.length + idx + 1}</td>
                    <td style={{ border: '1px solid #000' }} /><td style={{ border: '1px solid #000' }} /><td style={{ border: '1px solid #000' }} />
                    <td style={{ border: '1px solid #000' }} /><td style={{ border: '1px solid #000' }} /><td style={{ border: '1px solid #000' }} />
                    <td style={{ border: '1px solid #000' }} /><td style={{ border: '1px solid #000' }} /><td style={{ border: '1px solid #000' }} />
                    <td style={{ border: '1px solid #000' }} /><td style={{ border: '1px solid #000' }} /><td style={{ border: '1px solid #000' }} />
                    <td style={{ border: '1px solid #000' }} /><td style={{ border: '1px solid #000' }} /><td style={{ border: '1px solid #000' }} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Statistical Summary Table at the End of the Register (On the Last Page) ── */}
          {pageIndex === totalPages - 1 && (
            <div style={{ marginTop: 10, marginBottom: 6, pageBreakInside: 'avoid' }}>
              <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 3, textAlign: 'right', color: '#c2410c' }}>
                📊 إحصاء إجمالي الطلاب الموقوف قيدهم:
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', fontSize: 9.5, textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: '#ffedd5', fontWeight: 800 }}>
                    <th style={{ border: '1px solid #000', padding: '3px' }}>عدد الفصول</th>
                    <th colSpan="3" style={{ border: '1px solid #000', padding: '3px', background: '#fed7aa' }}>الديانة المسلمة</th>
                    <th colSpan="3" style={{ border: '1px solid #000', padding: '3px', background: '#fed7aa' }}>الديانة المسيحية</th>
                    <th colSpan="3" style={{ border: '1px solid #000', padding: '3px', background: '#bfdbfe' }}>الإجمالي العام</th>
                    <th style={{ border: '1px solid #000', padding: '3px' }}>الدمج</th>
                  </tr>
                  <tr style={{ background: '#fff7ed', fontWeight: 700, fontSize: 9 }}>
                    <th style={{ border: '1px solid #000', padding: '2px' }}>فصول</th>
                    <th style={{ border: '1px solid #000', padding: '2px', width: 45 }}>بنين</th>
                    <th style={{ border: '1px solid #000', padding: '2px', width: 45 }}>بنات</th>
                    <th style={{ border: '1px solid #000', padding: '2px', width: 50 }}>جملة</th>
                    <th style={{ border: '1px solid #000', padding: '2px', width: 45 }}>بنين</th>
                    <th style={{ border: '1px solid #000', padding: '2px', width: 45 }}>بنات</th>
                    <th style={{ border: '1px solid #000', padding: '2px', width: 50 }}>جملة</th>
                    <th style={{ border: '1px solid #000', padding: '2px', width: 50, background: '#dbeafe' }}>بنين</th>
                    <th style={{ border: '1px solid #000', padding: '2px', width: 50, background: '#dbeafe' }}>بنات</th>
                    <th style={{ border: '1px solid #000', padding: '2px', width: 60, background: '#93c5fd', fontWeight: 900 }}>الجملة</th>
                    <th style={{ border: '1px solid #000', padding: '2px', width: 55 }}>طلاب دمج</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ fontWeight: 800, fontSize: 10.5, background: '#fff' }}>
                    <td style={{ border: '1px solid #000', padding: '3px' }}>{stats.classesCount}</td>
                    <td style={{ border: '1px solid #000', padding: '3px' }}>{stats.muslimBoys}</td>
                    <td style={{ border: '1px solid #000', padding: '3px' }}>{stats.muslimGirls}</td>
                    <td style={{ border: '1px solid #000', padding: '3px', background: '#fff7ed' }}>{stats.muslimTotal}</td>
                    <td style={{ border: '1px solid #000', padding: '3px' }}>{stats.christianBoys}</td>
                    <td style={{ border: '1px solid #000', padding: '3px' }}>{stats.christianGirls}</td>
                    <td style={{ border: '1px solid #000', padding: '3px', background: '#fff7ed' }}>{stats.christianTotal}</td>
                    <td style={{ border: '1px solid #000', padding: '3px', background: '#eff6ff' }}>{stats.boys}</td>
                    <td style={{ border: '1px solid #000', padding: '3px', background: '#eff6ff' }}>{stats.girls}</td>
                    <td style={{ border: '1px solid #000', padding: '3px', background: '#bfdbfe', fontSize: 11.5, fontWeight: 900 }}>{stats.total}</td>
                    <td style={{ border: '1px solid #000', padding: '3px' }}>{stats.mergedCount}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Official Signatures Footer (Repeated on every page) */}
          <div className="official-signatures-footer" style={{ marginTop: 12, paddingTop: 6, borderTop: '1px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, fontWeight: 800 }}>
            <div style={{ textAlign: 'center' }}>
              <div>مسؤول شئون الطلاب</div>
              <div style={{ marginTop: 20, color: '#000' }}>التوقيع: ....................................</div>
            </div>

            <div style={{ textAlign: 'center', fontSize: 9.5, color: '#475569' }}>
              صفحة ({pageIndex + 1}) من ({totalPages})
            </div>

            <div style={{ textAlign: 'center' }}>
              <div>يعتمد، مدير المدرسة</div>
              <div style={{ marginTop: 20, color: '#000' }}>التوقيع: ....................................</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Report Definition Object ──────────────────────────────────── */
const suspendedRegister = {
  id:          'suspended_register',
  name:        'سجل الطلاب الموقوف قيدهم',
  desc:        'سجل تفصيلي بالطلاب الموقوف قيدهم مع بيانات ولي الأمر والعناوين',
  category:    'سجلات القيد',
  icon:        '🛑',
  orientation: 'landscape',
  available:   true,

  filters: {
    requiresGrade: false,
    showClass:     true
  },

  buildQuery: (filters) => {
    const q = new URLSearchParams();
    if (filters.academicYearId) q.set('academicYearId', filters.academicYearId);
    if (filters.sectionId)      q.set('sectionId', filters.sectionId);
    if (filters.stageId)        q.set('stageId', filters.stageId);
    if (filters.gradeId && filters.gradeId !== 'all_stage') q.set('gradeId', filters.gradeId);
    if (filters.classId && filters.classId !== 'all_grade' && filters.classId !== 'all_stage') q.set('classId', filters.classId);
    q.set('viewMode', 'suspended');
    q.set('limit', 'all');
    return q.toString();
  },

  excelEndpoint: (filters) => {
    const q = new URLSearchParams();
    if (filters.academicYearId) q.set('academicYearId', filters.academicYearId);
    if (filters.stageId)        q.set('stageId', filters.stageId);
    if (filters.gradeId && filters.gradeId !== 'all_stage') q.set('gradeId', filters.gradeId);
    q.set('viewMode', 'suspended');
    return `/api/students/export/excel?${q.toString()}`;
  },

  excelFileName: (filters, meta) => {
    const gradeName = meta.selectedGrade?.grade_name_ar || 'العام';
    return `سجل_الموقوف_قيدهم_${gradeName}.xlsx`;
  },

  PreviewComponent: SuspendedRegisterPreview
};

export default suspendedRegister;
