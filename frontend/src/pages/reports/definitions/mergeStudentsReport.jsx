// ════════════════════════════════════════════════════════════════
//  Report Definition: سجل طلاب الدمج والتربية الخاصة (مقسم صفوفاً كشوفاً منفصلة)
// ════════════════════════════════════════════════════════════════
import React from 'react';
import RegisterStatsPage from '../RegisterStatsPage';

const PAGE_SIZE = 22; // 22 students per page chunk for official register print

/* ── Preview Component ─────────────────────────────────────────── */
function MergeStudentsPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear } = meta;

  // Clean School & Administration names
  const cleanSchool = (schoolInfo.schoolName || '').replace(/^مدرسة\s*/, '').trim();
  const rawAdmin = schoolInfo.directorate || '';
  const cleanAdmin = rawAdmin.replace(/التعليمية\s*$/, '').trim();
  const governorate = schoolInfo.governorate || 'الجيزة';
  
  // 1. Filter and sort merged students by user preference
  const order = meta.genderOrder || meta.filters?.genderOrder || 'none';
  const rawMerged = students.filter(s => s.is_merged === 1 || s.is_merged === '1' || s.is_merged === true);

  const mergedList = rawMerged.sort((a, b) => {
    const isBoyA = (a.gender || '').trim() === 'ذكر' || (a.gender || '').trim() === 'بنين';
    const isBoyB = (b.gender || '').trim() === 'ذكر' || (b.gender || '').trim() === 'بنين';

    if (order === 'boys_first') {
      if (isBoyA && !isBoyB) return -1;
      if (!isBoyA && isBoyB) return 1;
    } else if (order === 'girls_first') {
      if (!isBoyA && isBoyB) return -1;
      if (isBoyA && !isBoyB) return 1;
    }

    return String(a.full_name_ar || '').localeCompare(String(b.full_name_ar || ''), 'ar', { sensitivity: 'base' });
  });

  // 2. Group students by Grade (الصف الدراسي داخل المرحلة)
  const groupedByGrade = {};
  mergedList.forEach(s => {
    const gradeName = s.grade_name_ar || selectedGrade?.grade_name_ar || 'غير محدد';
    if (!groupedByGrade[gradeName]) {
      groupedByGrade[gradeName] = [];
    }
    groupedByGrade[gradeName].push(s);
  });

  const gradeNames = Object.keys(groupedByGrade);
  if (gradeNames.length === 0) {
    gradeNames.push(selectedGrade?.grade_name_ar || 'غير محدد');
    groupedByGrade[selectedGrade?.grade_name_ar || 'غير محدد'] = [];
  }

  // 3. Build printable page sections per Grade
  const pageSections = [];
  let globalPageIndex = 1;

  gradeNames.forEach(gradeName => {
    const gradeStudents = groupedByGrade[gradeName] || [];
    const totalGradePages = Math.ceil(gradeStudents.length / PAGE_SIZE) || 1;

    for (let p = 0; p < totalGradePages; p++) {
      pageSections.push({
        globalPageIndex,
        gradeName,
        gradePage: p + 1,
        totalGradePages,
        students: gradeStudents.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE),
        totalInGrade: gradeStudents.length,
        startIndex: p * PAGE_SIZE + 1
      });
      globalPageIndex++;
    }
  });

  const totalGlobalPages = pageSections.length;

  return (
    <div className="report-preview" id="print-area" data-orientation="landscape">
      {pageSections.map((sec, sectionIdx) => (
        <div key={sectionIdx} className="printable-page-block" style={{ padding: '10px 14px', boxSizing: 'border-box' }}>
          
          {/* Standard Official Header with Grade Name */}
          <div className="report-official-header" style={{ marginBottom: 8, paddingBottom: 6, borderBottom: '1.5px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="header-col-right" style={{ textAlign: 'right', fontSize: 11, lineHeight: 1.4, fontWeight: 700 }}>
              <div>محافظة: <strong>{governorate || '................'}</strong></div>
              <div>إدارة: <strong>{cleanAdmin ? `${cleanAdmin} التعليمية` : '................'}</strong></div>
              <div>مدرسة: <strong>{cleanSchool || '................'}</strong></div>
            </div>

            <div className="header-col-center" style={{ textAlign: 'center', flex: 1 }}>
              <h2 className="report-title-main" style={{ fontSize: 15.5, fontWeight: 900, margin: 0, textDecoration: 'underline', color: '#0369a1' }}>
                سجل الطلاب المدمجين - {sec.gradeName}
              </h2>
              <div className="report-subtitle-meta" style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginTop: 2 }}>
                الصف: <strong>{sec.gradeName}</strong> | العام الدراسي: {selectedYear?.year_label || '...............'} | إجمالي طلاب الدمج: <strong>{sec.totalInGrade}</strong> طالب
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

          {/* Table with Original Merge Columns + Decision Number & Date */}
          <div className="register-table-wrap" style={{ width: '100%', overflowX: 'hidden' }}>
            <table className="register-table" dir="rtl" style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', fontSize: '10pt', textAlign: 'center' }}>
              <thead>
                <tr style={{ background: '#0f766e', color: '#fff', fontWeight: 900 }}>
                  <th style={{ border: '1px solid #000', padding: '6px 2px', width: 28 }}>م</th>
                  <th style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'right', width: '25%' }}>اسم الطالب بالكامل</th>
                  <th style={{ border: '1px solid #000', padding: '6px 2px', width: 125 }}>الرقم القومي</th>
                  <th style={{ border: '1px solid #000', padding: '6px 2px', width: 95 }}>الصف الدراسي</th>
                  <th style={{ border: '1px solid #000', padding: '6px 2px', width: 55 }}>الفصل</th>
                  <th style={{ border: '1px solid #000', padding: '6px 4px', width: 135 }}>نوع الإعاقة (الدمج)</th>
                  <th style={{ border: '1px solid #000', padding: '6px 2px', width: 105 }}>رقم قرار الدمج</th>
                  <th style={{ border: '1px solid #000', padding: '6px 2px', width: 90 }}>تاريخ القرار</th>
                  <th style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'right' }}>ملاحظات وتوقيع ولي الأمر</th>
                </tr>
              </thead>
              <tbody>
                {sec.students.length > 0 ? (
                  sec.students.map((s, idx) => {
                    const classIdx = sec.startIndex + idx;
                    return (
                      <tr key={s.id || idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : '#fff' }}>
                        <td style={{ border: '1px solid #000', padding: '5px 2px', fontWeight: 800 }}>{classIdx}</td>
                        <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right', fontWeight: 800, fontSize: '11pt', overflow: 'visible' }}>
                          {s.full_name_ar}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '5px 2px', fontFamily: 'monospace', fontSize: '10pt', whiteSpace: 'nowrap' }} dir="ltr">
                          {s.national_id || '—'}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '5px 2px', fontSize: '10pt', whiteSpace: 'nowrap' }}>{s.grade_name_ar || sec.gradeName}</td>
                        <td style={{ border: '1px solid #000', padding: '5px 2px', direction: 'ltr', fontWeight: 800, fontSize: '10pt', whiteSpace: 'nowrap' }}>{s.classroom_name || s.class_number || '—'}</td>
                        <td style={{ border: '1px solid #000', padding: '5px 4px', fontWeight: 800, color: '#047857', fontSize: '10.5pt' }}>{s.merge_type || 'دمج تعليمي'}</td>
                        <td style={{ border: '1px solid #000', padding: '5px 2px', fontWeight: 800, color: '#1e1b4b', fontSize: '10pt' }}>{s.merge_decision_number || s.merge_decision_num || '—'}</td>
                        <td style={{ border: '1px solid #000', padding: '5px 2px', fontFamily: 'monospace', fontSize: '9.5pt', whiteSpace: 'nowrap' }}>{s.merge_decision_date || '—'}</td>
                        <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right', fontSize: '9.5pt', wordBreak: 'break-word', overflow: 'visible' }}>
                          {s.merge_notes || s.notes || '—'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 24, color: '#64748b', fontWeight: 700 }}>
                      لا يوجد طلاب دمج مسجلون في هذا الصف
                    </td>
                  </tr>
                )}

                {/* Empty filler rows to complete full 22 rows on the page */}
                {Array.from({ length: Math.max(0, PAGE_SIZE - sec.students.length) }, (_, idx) => (
                  <tr key={`filler-${idx}`} style={{ height: 22 }}>
                    <td style={{ border: '1px solid #000', padding: '2px 1px' }}>{sec.startIndex + sec.students.length + idx}</td>
                    <td style={{ border: '1px solid #000' }} /><td style={{ border: '1px solid #000' }} /><td style={{ border: '1px solid #000' }} />
                    <td style={{ border: '1px solid #000' }} /><td style={{ border: '1px solid #000' }} /><td style={{ border: '1px solid #000' }} />
                    <td style={{ border: '1px solid #000' }} /><td style={{ border: '1px solid #000' }} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Official Signatures Footer (Repeated on every page) */}
          <div className="official-signatures-footer" style={{ marginTop: 12, paddingTop: 6, borderTop: '1.5px solid #000', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'center', fontSize: '11pt', fontWeight: 800 }}>
            <div>
              <div>أخصائي التربية الخاصة / الدمج</div>
              <div style={{ marginTop: 16 }}>................................</div>
            </div>
            <div>
              <div>مسؤول الكنترول وشؤون الامتحانات</div>
              <div style={{ marginTop: 16 }}>................................</div>
            </div>
            <div>
              <div>وكيل شؤون الطلاب والتعليم</div>
              <div style={{ marginTop: 16 }}>................................</div>
            </div>
            <div>
              <div>مدير المدرسة (يعتمد وخاتم المدرسة)</div>
              <div style={{ marginTop: 16 }}>................................</div>
            </div>
          </div>
        </div>
      ))}

      {/* ══ صفحة الإحصاء الختامي المستقلة تماماً ══ */}
      <RegisterStatsPage
        students={mergedList}
        meta={meta}
        schoolInfo={schoolInfo}
        registerName="سجل كشوف طلاب الدمج والتربية الخاصة للامتحانات والكنترول"
        formCode="استمارة دمج / كنترول"
        titleGrade={selectedGrade?.grade_name_ar || 'جميع الصفوف'}
        showClassBreakdown={false}
      />
    </div>
  );
}

/* ── Report Definition Object ──────────────────────────────────── */
const mergeStudentsReport = {
  id:          'merge_students_report',
  name:        'كشف حالات الدمج تفصيلاً',
  desc:        'كشف حصر تفصيلي لطلاب الدمج والتربية الخاصة وأرقام وقرارات الدمج للامتحانات والكنترول',
  category:    'الكنترول والامتحانات',
  icon:        '♿',
  orientation: 'landscape',
  available:   true,

  filters: {
    requiresGrade:   false,
    requiresYear:    true,
    requiresSection: true,
    requiresStage:   true,
  },

  excelEndpoint: (f) =>
    `/api/students/export/excel?academicYearId=${f.academicYearId}` +
    `&gradeId=${f.gradeId || ''}&sectionId=${f.sectionId || ''}&stageId=${f.stageId || ''}&status=all&isMerged=1&templateName=كشف_حالات_الدمج_تفصيلا&genderOrder=${f.genderOrder || 'none'}`,

  excelFileName: (f, meta) =>
    `كشف_حالات_الدمج_تفصيلا_${meta.selectedGrade?.grade_name_ar || ''}_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  buildQuery: (f) => {
    const q = new URLSearchParams({
      limit: 'all',
      status: 'all',
      isMerged: '1',
    });
    if (f.academicYearId) q.set('academicYearId', f.academicYearId);
    if (f.sectionId)   q.set('sectionId',   f.sectionId);
    if (f.stageId)     q.set('stageId',     f.stageId);
    if (f.gradeId && f.gradeId !== 'all_stage')     q.set('gradeId',     f.gradeId);
    if (f.classId && f.classId !== 'all_grade' && f.classId !== 'all_stage')     q.set('classId',     f.classId);
    if (f.genderOrder) q.set('genderOrder', f.genderOrder);
    return q.toString();
  },

  PreviewComponent: MergeStudentsPreview,
};

export default mergeStudentsReport;
