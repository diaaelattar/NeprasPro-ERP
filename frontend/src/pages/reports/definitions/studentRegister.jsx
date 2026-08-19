// ════════════════════════════════════════════════════════════════
//  Report Definition: سجل قيد تلاميذ الصف (سجل 41 د - الطباعة الرسمية)
// ════════════════════════════════════════════════════════════════
import React from 'react';
import RegisterStatsPage from '../RegisterStatsPage';
import { calculateAgeOnOct1st } from '../../../constants/lookupOptions';

const STATUS_LABELS = {
  promoted: 'منقول',
  retained: 'باقٍ للإعادة',
  suspended: 'موقوف قيده',
  active: 'مقيد',
};

const PAGE_SIZE = 22; // 22 students per page chunk for official register print

/* ── Preview Component ─────────────────────────────────────────── */
function StudentRegisterPreview({ students = [], meta = {}, schoolInfo = {} }) {
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
    let promotedCount = 0;
    let retainedCount = 0;
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
      if (s.status === 'promoted' || s.status === 'active') promotedCount++;
      if (s.status === 'retained') retainedCount++;

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
      promotedCount,
      retainedCount,
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
                سجل قيد تلاميذ الصف (سجل 41 د) - {selectedGrade?.grade_name_ar || '...............'}
              </h2>
              <div className="report-subtitle-meta" style={{ fontSize: 10, fontWeight: 800, color: '#334155', marginTop: 2 }}>
                إجمالي الطلاب المقيدين: <strong>{students.length}</strong> طالب
              </div>
            </div>

            <div className="header-col-left" style={{ textAlign: 'left', fontSize: 9.5, fontWeight: 700, width: '30%', lineHeight: 1.35 }}>
              <div>العام الدراسي: <strong>{selectedYear?.year_label || '2024 / 2025'}</strong></div>
              <div>الفصل الدراسي: <strong>العام بالكامل</strong></div>
              <div>تاريخ الطباعة: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></div>
              <div>كود النموذج: <strong>استمارة 41 د المعتمدة</strong></div>
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
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '1px 0', width: 22, writingMode: 'vertical-rl', fontSize: 8.5 }}>الفصل</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '1px 0', width: 24, writingMode: 'vertical-rl', fontSize: 8.5 }}>الديانة</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '1px 0', width: 24, writingMode: 'vertical-rl', fontSize: 8.5 }}>الجنسية</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '1px 0', width: 34, fontSize: 8, lineHeight: 1.15 }}>حالة<br/>القيد</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '1px 0', width: 22, writingMode: 'vertical-rl', fontSize: 8.5 }}>الدمج</th>
                  <th colSpan="2" style={{ border: '1px solid #000', padding: '1px 2px', width: 145, background: '#cbd5e1' }}>ولي الأمر</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '2px 0', width: 70 }}>الهاتف</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', width: 150 }}>العـنـوان</th>
                </tr>
                <tr style={{ background: '#f1f5f9', color: '#000', fontWeight: 800, fontSize: 8.5 }}>
                  <th style={{ border: '1px solid #000', padding: '1px 0', width: 19 }}>يوم</th>
                  <th style={{ border: '1px solid #000', padding: '1px 0', width: 19 }}>شهر</th>
                  <th style={{ border: '1px solid #000', padding: '1px 0', width: 19 }}>سنة</th>
                  <th style={{ border: '1px solid #000', padding: '1px 3px', textAlign: 'right', width: 95 }}>الاسم</th>
                  <th style={{ border: '1px solid #000', padding: '1px 2px', textAlign: 'right', width: 50 }}>المهنة</th>
                </tr>
              </thead>
              <tbody>
                {pageStudents.map((s, idx) => {
                  const globalIdx = pageIndex * PAGE_SIZE + idx + 1;
                  const age = calculateAgeOnOct1st(s.birth_date, selectedYear?.year_label);
                  return (
                    <tr key={s.id || idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : '#fff' }}>
                      <td style={{ border: '1px solid #000', padding: '2px 0', fontWeight: 700 }}>{globalIdx}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 3px', textAlign: 'right', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 9.5 }}>
                        {s.full_name_ar}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px 0', fontFamily: 'monospace', fontSize: 9, whiteSpace: 'nowrap' }}>
                        {s.national_id || '—'}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px 0', fontFamily: 'monospace', fontSize: 8.5, whiteSpace: 'nowrap' }}>
                        {s.birth_date || '—'}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px 0', fontSize: 8.5 }}>{age.days}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 0', fontSize: 8.5 }}>{age.months}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 0', fontSize: 8.5 }}>{age.years}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 0', fontWeight: 700, fontSize: 9 }}>{s.gender || '—'}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 0', direction: 'ltr', fontSize: 9 }}>{s.classroom_name || s.class_number || '—'}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 0', fontSize: 8.5 }}>{s.religion || '—'}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 0', fontSize: 8.5 }}>{s.nationality_name || 'مصري'}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 0', fontSize: 8.5 }}>
                        {STATUS_LABELS[s.status] || s.enrollment_status || 'منقول'}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px 0', fontSize: 8 }}>
                        {s.is_merged === 1 ? (s.merge_type || 'مدمج') : ''}
                      </td>
                      {/* Guardian Name & Job */}
                      <td style={{ border: '1px solid #000', padding: '2px 3px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 9 }}>
                        {s.guardian_name || '—'}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px 2px', textAlign: 'right', fontSize: 8.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.guardian_job || '—'}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px 0', fontFamily: 'monospace', fontSize: 8, whiteSpace: 'nowrap' }} dir="ltr">
                        {s.guardian_phone || s.guardian_phone_2 || '—'}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontSize: 8.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.address || '—'}
                      </td>
                    </tr>
                  );
                })}

                {/* Empty filler rows to complete full page layout if needed */}
                {Array.from({ length: Math.max(0, PAGE_SIZE - pageStudents.length) }, (_, idx) => (
                  <tr key={`filler-${idx}`} style={{ height: 19 }}>
                    <td style={{ border: '1px solid #000', padding: '2px 0' }}>{pageIndex * PAGE_SIZE + pageStudents.length + idx + 1}</td>
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

          {/* Standard Official 4-Column Signatures Footer (Repeated on every student page) */}
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
            صفحة ({pageIndex + 1}) من ({totalPages + 1})
          </div>
        </div>
      ))}

      {/* ══ صفحة الإحصاء الختامي المستقلة تماماً (صفحة خاصة منفصلة في نهاية السجل) ══ */}
      <RegisterStatsPage
        title="سجل قيد تلاميذ الصف"
        subTitle={selectedGrade?.grade_name_ar ? `للصف: ${selectedGrade.grade_name_ar}` : ''}
        registerCode="سجل 41 د"
        students={students}
        meta={meta}
        schoolInfo={schoolInfo}
        pageIndex={totalPages + 1}
        totalPages={totalPages + 1}
      />
    </div>
  );
}

/* ── Report Definition Object ──────────────────────────────────── */
const studentRegister = {
  id:          'student_register',
  name:        'سجل القيد',
  desc:        'سجل قيد تلاميذ الصف المعتمد والمفصل',
  category:    'سجلات القيد والمناداة',
  icon:        '📋',
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
    q.set('templateName', 'sgl_all');
    return `/api/students/export/excel?${q.toString()}`;
  },

  excelFileName: (filters, meta) => {
    const gradeName = meta.selectedGrade?.grade_name_ar || 'الصف';
    return `سجل_قيد_الطلاب_${gradeName}.xlsm`;
  },

  PreviewComponent: StudentRegisterPreview
};

export default studentRegister;
