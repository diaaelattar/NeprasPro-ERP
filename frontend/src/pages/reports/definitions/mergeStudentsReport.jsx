// ════════════════════════════════════════════════════════════════
//  Report Definition: سجل طلاب الدمج والتربية الخاصة (مقسم صفوفاً كشوفاً منفصلة)
// ════════════════════════════════════════════════════════════════
import React from 'react';

const PAGE_SIZE = 20; // 20 students per page chunk for official register print

/* ── Preview Component ─────────────────────────────────────────── */
function MergeStudentsPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear } = meta;
  
  // 1. Filter for merged students
  const mergedList = students.filter(s => s.is_merged === 1 || s.is_merged === '1' || s.is_merged === true);

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
        <div key={sectionIdx} className="printable-page-block">
          
          {/* Standard Official Header with Grade Name */}
          <div className="report-official-header">
            <div className="header-col-right">
              <div>مديرية التربية والتعليم بمحافظة: <strong>{schoolInfo.governorate || '................'}</strong></div>
              <div>إدارة: <strong>{schoolInfo.directorate || '................'} التعليمية</strong></div>
              <div>مدرسة: <strong>{schoolInfo.schoolName || '................'}</strong></div>
            </div>

            <div className="header-col-center">
              <h2 className="report-title-main" style={{ color: '#0369a1' }}>
                سجل الطلاب المدمجين - {sec.gradeName}
              </h2>
              <div className="report-subtitle-meta">
                الصف: <strong>{sec.gradeName}</strong> | العام الدراسي: {selectedYear?.year_label || '...............'} | إجمالي طلاب الصف: {sec.totalInGrade} طالب
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

          {/* Table with Original Merge Columns + Decision Number & Date */}
          <div className="register-table-wrap">
            <table className="register-table" dir="rtl">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>م</th>
                  <th style={{ width: 195 }}>اسم الطالب بالكامل</th>
                  <th style={{ width: 130 }}>الرقم القومي</th>
                  <th style={{ width: 100 }}>الصف الدراسي</th>
                  <th style={{ width: 65 }}>الفصل</th>
                  <th style={{ width: 125 }}>نوع الإعاقة (الدمج)</th>
                  <th style={{ width: 110 }}>رقم قرار الدمج</th>
                  <th style={{ width: 110 }}>تاريخ قرار الدمج</th>
                  <th>ملاحظات وتوقيع ولي الأمر</th>
                </tr>
              </thead>
              <tbody>
                {sec.students.map((s, idx) => {
                  const classIdx = sec.startIndex + idx;
                  return (
                    <tr key={s.id || idx}>
                      <td className="cell-num">{classIdx}</td>
                      <td className="cell-name" style={{ fontWeight: 800 }}>{s.full_name_ar}</td>
                      <td className="cell-id" dir="ltr" style={{ fontFamily: 'Cairo, monospace' }}>{s.national_id || '—'}</td>
                      <td className="cell-sm">{s.grade_name_ar || sec.gradeName}</td>
                      <td className="cell-sm" style={{ direction: 'ltr', fontWeight: 700 }}>{s.classroom_name || 'غير مسكن'}</td>
                      <td className="cell-sm" style={{ fontWeight: 800, color: '#047857' }}>{s.merge_type || 'دمج تعليمي'}</td>
                      <td className="cell-sm" style={{ fontWeight: 800, color: '#1e1b4b' }}>{s.merge_decision_number || s.merge_decision_num || '—'}</td>
                      <td className="cell-sm" style={{ fontFamily: 'Cairo, monospace' }}>{s.merge_decision_date || '—'}</td>
                      <td className="cell-addr" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.merge_notes || s.notes || '—'}</td>
                    </tr>
                  );
                })}

                {/* Empty filler rows to complete full 20 rows on the page */}
                {Array.from({ length: Math.max(0, PAGE_SIZE - sec.students.length) }, (_, idx) => (
                  <tr key={`filler-${idx}`}>
                    <td className="cell-num">{sec.startIndex + sec.students.length + idx}</td>
                    <td /><td /><td />
                    <td /><td /><td />
                    <td /><td />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Official Signatures Footer (Repeated on every page) */}
          <div className="official-signatures-footer">
            <div style={{ textAlign: 'center' }}>
              <div>أخصائي التربية الخاصة / الدمج</div>
              <div style={{ marginTop: 32, color: '#64748b' }}>....................................</div>
            </div>

            <div style={{ textAlign: 'center', fontSize: 11, color: '#475569' }}>
              الصف ({sec.gradeName}) — صفحة ({sec.gradePage}) من ({sec.totalGradePages}) | إجمالي الصفحات: ({sec.globalPageIndex} / {totalGlobalPages})
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
const mergeStudentsReport = {
  id:          'merge_students_report',
  name:        'سجل طلاب الدمج والتربية الخاصة',
  desc:        'السجل الرسمي المعتمد لطلاب الدمج مقسماً كشوفاً منفصلة لكل صف ومستندات القرار',
  category:    'سجلات القيد',
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
    `&gradeId=${f.gradeId || ''}&sectionId=${f.sectionId || ''}&stageId=${f.stageId || ''}&status=all&isMerged=1&templateName=سجل_الطلاب_المدمجين&genderOrder=${f.genderOrder || 'none'}`,

  excelFileName: (f, meta) =>
    `سجل_الطلاب_المدمجين_${meta.selectedGrade?.grade_name_ar || ''}_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  buildQuery: (f) => {
    const q = new URLSearchParams({
      academicYearId: f.academicYearId,
      limit: '10000',
      status: 'all',
      isMerged: '1',
    });
    if (f.sectionId)   q.set('sectionId',   f.sectionId);
    if (f.stageId)     q.set('stageId',     f.stageId);
    if (f.gradeId)     q.set('gradeId',     f.gradeId);
    if (f.classId)     q.set('classId',     f.classId);
    if (f.genderOrder) q.set('genderOrder', f.genderOrder);
    return q.toString();
  },

  PreviewComponent: MergeStudentsPreview,
};

export default mergeStudentsReport;
