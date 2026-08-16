// ════════════════════════════════════════════════════════════════
//  Report Definition: سجل 41 مستجدين (النموذج الرسمي المعتمد للمستجدين)
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
function StudentRegister41Preview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear } = meta;
  
  // Clean School & Administration names
  const cleanSchool = (schoolInfo.schoolName || '').replace(/^مدرسة\s*/, '').trim();
  const rawAdmin = schoolInfo.directorate || '';
  const cleanAdmin = rawAdmin.replace(/التعليمية\s*$/, '').trim();
  const governorate = schoolInfo.governorate || 'الجيزة';

  // Calculate overall statistical summary for all students in the grade
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
        <div key={pageIndex} className="printable-page-block" style={{ padding: '8px 12px', boxSizing: 'border-box' }}>
          
          {/* Standard Official 3-Column Ministerial Header (Repeated on every page) */}
          <div className="report-official-header" style={{ marginBottom: 6, paddingBottom: 5, borderBottom: '2px solid #1e3a8a', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="header-col-right" style={{ textAlign: 'right', fontSize: 10, lineHeight: 1.35, fontWeight: 700, width: '32%' }}>
              <div>جمهورية مصر العربية</div>
              <div>وزارة التربية والتعليم والتعليم الفني</div>
              <div>مديرية التربية والتعليم بمحافظة: <strong>{governorate || '................'}</strong></div>
              <div>إدارة: <strong>{cleanAdmin ? `${cleanAdmin} التعليمية` : '................'}</strong></div>
              <div>مدرسة: <strong>{cleanSchool || '................'}</strong></div>
            </div>

            <div className="header-col-center" style={{ textAlign: 'center', flex: 1 }}>
              <h2 className="report-title-main" style={{ fontSize: 15, fontWeight: 900, color: '#1e3a8a', margin: 0, textDecoration: 'underline' }}>
                سجل 41 مستجدين - {selectedGrade?.grade_name_ar || '...............'}
              </h2>
              <div className="report-subtitle-meta" style={{ fontSize: 10, fontWeight: 800, color: '#334155', marginTop: 2 }}>
                إجمالي الطلاب المستجدين: <strong>{students.length}</strong> طالب
              </div>
            </div>

            <div className="header-col-left" style={{ textAlign: 'left', fontSize: 9.5, fontWeight: 700, width: '30%', lineHeight: 1.35 }}>
              <div>العام الدراسي: <strong>{selectedYear?.year_label || '2024 / 2025'}</strong></div>
              <div>الفصل الدراسي: <strong>العام بالكامل</strong></div>
              <div>تاريخ الطباعة: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></div>
              <div>كود النموذج: <strong>استمارة 41 ش.ط</strong></div>
            </div>
          </div>

          {/* Table */}
          <div className="register-table-wrap" style={{ width: '100%', overflowX: 'hidden' }}>
            <table className="register-table" dir="rtl" style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', fontSize: 9, textAlign: 'center', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: '#e2e8f0', color: '#000', fontWeight: 800 }}>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '2px 0', width: 20 }}>م</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '2px 3px', textAlign: 'right', width: 140 }}>اسم التلميذ</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '2px 0', width: 95 }}>الرقم القومي</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '2px 0', width: 65 }}>تاريخ الميلاد</th>
                  <th colSpan="3" style={{ border: '1px solid #000', padding: '1px 0', width: 57 }}>السن في 1/10</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '1px 0', width: 22, writingMode: 'vertical-rl', fontSize: 8.5 }}>النوع</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '1px 0', width: 26, writingMode: 'vertical-rl', fontSize: 8.5 }}>الديانة</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '1px 0', width: 28, writingMode: 'vertical-rl', fontSize: 8.5 }}>الجنسية</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '2px 3px', textAlign: 'right', width: 115 }}>اسم ولي الأمر</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '2px 3px', textAlign: 'right', width: 75 }}>مهنة ولي الأمر</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '2px 3px', textAlign: 'right', width: 110 }}>محل الإقامة / العنوان</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '2px 0', width: 40 }}>الفصل</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '2px 0', width: 45 }}>حالة القيد</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '2px 0', width: 50 }}>ملاحظات</th>
                </tr>
                <tr style={{ background: '#f1f5f9', color: '#000', fontSize: 8 }}>
                  <th style={{ border: '1px solid #000', padding: '1px 0' }}>ي</th>
                  <th style={{ border: '1px solid #000', padding: '1px 0' }}>ش</th>
                  <th style={{ border: '1px solid #000', padding: '1px 0' }}>س</th>
                </tr>
              </thead>
              <tbody>
                {pageStudents.map((s, idx) => {
                  const globalIdx = pageIndex * PAGE_SIZE + idx + 1;
                  const age = calculateAgeOnOct1st(s.birth_date, selectedYear?.year_label);
                  return (
                    <tr key={s.id || idx} style={{ height: 21, background: idx % 2 === 1 ? '#f8fafc' : '#fff' }}>
                      <td style={{ border: '1px solid #000', padding: '1px 0', fontWeight: 800 }}>{globalIdx}</td>
                      <td style={{ border: '1px solid #000', padding: '1px 3px', textAlign: 'right', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.full_name_ar}
                        {s.is_merged === 1 && <span style={{ marginRight: 3, color: '#0369a1', fontSize: 8 }}>♿</span>}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '1px 0', fontFamily: 'monospace', letterSpacing: -0.5, fontSize: 8.5 }}>{s.national_id || '—'}</td>
                      <td style={{ border: '1px solid #000', padding: '1px 0', fontSize: 8.5 }}>{s.birth_date || '—'}</td>
                      <td style={{ border: '1px solid #000', padding: '1px 0', fontSize: 8.5 }}>{age.days}</td>
                      <td style={{ border: '1px solid #000', padding: '1px 0', fontSize: 8.5 }}>{age.months}</td>
                      <td style={{ border: '1px solid #000', padding: '1px 0', fontSize: 8.5, fontWeight: 700 }}>{age.years}</td>
                      <td style={{ border: '1px solid #000', padding: '1px 0' }}>{s.gender === 'أنثى' ? 'بنت' : 'ولد'}</td>
                      <td style={{ border: '1px solid #000', padding: '1px 0' }}>{s.religion || 'مسلم'}</td>
                      <td style={{ border: '1px solid #000', padding: '1px 0' }}>{s.nationality || 'مصري'}</td>
                      <td style={{ border: '1px solid #000', padding: '1px 3px', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.guardian_name || '—'}</td>
                      <td style={{ border: '1px solid #000', padding: '1px 3px', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.guardian_job || '—'}</td>
                      <td style={{ border: '1px solid #000', padding: '1px 3px', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.address || '—'}</td>
                      <td style={{ border: '1px solid #000', padding: '1px 0', fontWeight: 700 }}>{s.classroom_name || s.class_name || '—'}</td>
                      <td style={{ border: '1px solid #000', padding: '1px 0', fontSize: 8.5 }}>{s.enrollment_status || s.status || 'مستجد'}</td>
                      <td style={{ border: '1px solid #000', padding: '1px 0', fontSize: 8, color: '#475569' }}>
                        {s.is_merged === 1 ? 'دمج' : (s.notes || '—')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Statistical Summary Box (Rendered ONLY on the Last Page) */}
          {pageIndex === totalPages - 1 && (
            <div className="register-summary-box" style={{ marginTop: 6, border: '1.5px solid #000', padding: 3, background: '#f8fafc' }}>
              <div style={{ fontWeight: 900, fontSize: 10, marginBottom: 2, textAlign: 'right', color: '#1e3a8a' }}>
                📊 الإحصاء العام الإجمالي لطلاب الصف ({selectedGrade?.grade_name_ar || 'المرحلة'}):
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: 8.5, border: '1px solid #000' }}>
                <thead>
                  <tr style={{ background: '#e2e8f0', fontWeight: 800 }}>
                    <th style={{ border: '1px solid #000', padding: '2px', width: 60 }}>عدد الفصول</th>
                    <th style={{ border: '1px solid #000', padding: '2px', width: 45 }}>مسلم بنين</th>
                    <th style={{ border: '1px solid #000', padding: '2px', width: 45 }}>مسلم بنات</th>
                    <th style={{ border: '1px solid #000', padding: '2px', width: 55, background: '#f1f5f9' }}>جملة المسلمين</th>
                    <th style={{ border: '1px solid #000', padding: '2px', width: 45 }}>مسيحي بنين</th>
                    <th style={{ border: '1px solid #000', padding: '2px', width: 45 }}>مسيحي بنات</th>
                    <th style={{ border: '1px solid #000', padding: '2px', width: 55, background: '#f1f5f9' }}>جملة المسيحيين</th>
                    <th style={{ border: '1px solid #000', padding: '2px', width: 50, background: '#dbeafe' }}>جملة البنين</th>
                    <th style={{ border: '1px solid #000', padding: '2px', width: 50, background: '#dbeafe' }}>جملة البنات</th>
                    <th style={{ border: '1px solid #000', padding: '2px', width: 60, background: '#93c5fd', fontWeight: 900 }}>الجملة</th>
                    <th style={{ border: '1px solid #000', padding: '2px', width: 55 }}>طلاب دمج</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ fontWeight: 800, fontSize: 10, background: '#fff' }}>
                    <td style={{ border: '1px solid #000', padding: '2px' }}>{stats.classesCount}</td>
                    <td style={{ border: '1px solid #000', padding: '2px' }}>{stats.muslimBoys}</td>
                    <td style={{ border: '1px solid #000', padding: '2px' }}>{stats.muslimGirls}</td>
                    <td style={{ border: '1px solid #000', padding: '2px', background: '#f8fafc' }}>{stats.muslimTotal}</td>
                    <td style={{ border: '1px solid #000', padding: '2px' }}>{stats.christianBoys}</td>
                    <td style={{ border: '1px solid #000', padding: '2px' }}>{stats.christianGirls}</td>
                    <td style={{ border: '1px solid #000', padding: '2px', background: '#f8fafc' }}>{stats.christianTotal}</td>
                    <td style={{ border: '1px solid #000', padding: '2px', background: '#eff6ff' }}>{stats.boys}</td>
                    <td style={{ border: '1px solid #000', padding: '2px', background: '#eff6ff' }}>{stats.girls}</td>
                    <td style={{ border: '1px solid #000', padding: '2px', background: '#bfdbfe', fontSize: 11, fontWeight: 900 }}>{stats.total}</td>
                    <td style={{ border: '1px solid #000', padding: '2px' }}>{stats.mergedCount}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Standard Official 4-Column Signatures Footer (Repeated on every page) */}
          <div className="official-signatures-footer" style={{ marginTop: 8, paddingTop: 4, borderTop: '1.5px solid #1e3a8a', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'center', fontSize: 9.5, fontWeight: 800 }}>
            <div>
              <div>مسؤول شئون الطلاب (كاتب السجل)</div>
              <div style={{ marginTop: 14, color: '#000' }}>التوقيع: ..........................</div>
            </div>
            <div>
              <div>المراجع / الأخصائي</div>
              <div style={{ marginTop: 14, color: '#000' }}>التوقيع: ..........................</div>
            </div>
            <div>
              <div>وكيل شؤون الطلاب والتعليم</div>
              <div style={{ marginTop: 14, color: '#000' }}>التوقيع: ..........................</div>
            </div>
            <div>
              <div>مدير المدرسة (يعتمد) وخاتم المدرسة</div>
              <div style={{ marginTop: 14, color: '#000' }}>التوقيع: ..........................</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: 8.5, color: '#64748b', marginTop: 2 }}>
            صفحة ({pageIndex + 1}) من ({totalPages})
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Report Definition Object ──────────────────────────────────── */
const studentRegister41 = {
  id:          'student_register_41',
  name:        'سجل 41 مستجدين',
  desc:        'السجل الرسمي المعتمد للمستجدين والطلاب المنقولين',
  category:    'سجلات القيد',
  icon:        '📚',
  orientation: 'landscape',
  available:   true,

  filters: {
    requiresGrade: true,
    showClass:     true
  },

  buildQuery: (filters) => {
    const q = new URLSearchParams();
    if (filters.academicYearId) q.set('academicYearId', filters.academicYearId);
    if (filters.sectionId)      q.set('sectionId', filters.sectionId);
    if (filters.stageId)        q.set('stageId', filters.stageId);
    if (filters.gradeId && filters.gradeId !== 'all_stage') q.set('gradeId', filters.gradeId);
    if (filters.classId && filters.classId !== 'all_grade' && filters.classId !== 'all_stage') q.set('classId', filters.classId);
    if (filters.genderOrder)    q.set('genderOrder', filters.genderOrder);
    q.set('limit', 'all');
    return q.toString();
  },

  excelEndpoint: (filters) => {
    const q = new URLSearchParams();
    if (filters.academicYearId) q.set('academicYearId', filters.academicYearId);
    if (filters.stageId)        q.set('stageId', filters.stageId);
    if (filters.gradeId && filters.gradeId !== 'all_stage') q.set('gradeId', filters.gradeId);
    if (filters.classId && filters.classId !== 'all_grade' && filters.classId !== 'all_stage') q.set('classId', filters.classId);
    return `/api/students/export/excel?${q.toString()}`;
  },

  excelFileName: (filters, meta) => {
    const gradeName = meta.selectedGrade?.grade_name_ar || 'الصف';
    return `سجل_41_مستجدين_${gradeName}.xlsx`;
  },

  PreviewComponent: StudentRegister41Preview
};

export default studentRegister41;
