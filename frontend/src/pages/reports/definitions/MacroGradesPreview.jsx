import React from 'react';

export default function MacroGradesPreview({ students = [], meta = {}, schoolInfo = {}, title = 'سجل التقييمات' }) {
  const { selectedGrade, selectedYear, selectedClassroom, classroomLabel } = meta;
  const totalStudents = students.length;
  const perPage = 25;
  const pageCount = Math.ceil(totalStudents / perPage) || 1;

  return (
    <div className="report-preview" id="print-area">
      {Array.from({ length: pageCount }).map((_, pageIdx) => {
        const pageStudents = students.slice(pageIdx * perPage, (pageIdx + 1) * perPage);
        return (
          <div key={pageIdx} className={`printable-page-block${pageIdx > 0 ? ' page-break-before' : ''}`}>
            
            <div className="report-official-header" dir="rtl">
              <div className="header-col-right">
                <div>وزارة التربية والتعليم</div>
                <div>محافظة: <strong>{schoolInfo.governorate || '................'}</strong></div>
                <div>إدارة: <strong>{schoolInfo.directorate || '................'} التعليمية</strong></div>
                <div>مدرسة: <strong>{schoolInfo.schoolName || '................'}</strong></div>
              </div>

              <div className="header-col-center">
                <h2 className="report-title-main">
                  {title} — فصل: {classroomLabel || selectedClassroom?.class_name || selectedGrade?.grade_name_ar || '................'}
                </h2>
                <div className="report-subtitle-meta">
                  العام الدراسي: {selectedYear?.year_label || '................'} | عدد الطلاب: {totalStudents} طالب
                </div>
              </div>

              <div className="header-col-left">
                <div style={{ fontSize: 11, color: '#475569' }}>الصف: <strong>{selectedGrade?.grade_name_ar || 'جميع الصفوف'}</strong></div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
              </div>
            </div>

            <div className="register-table-wrap" style={{ marginTop: 12, overflowX: 'auto' }}>
              <table className="register-table" dir="rtl" style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', textAlign: 'center' }}>
                    <th style={{ width: 40 }}>م</th>
                    <th style={{ textAlign: 'right', paddingRight: 15 }}>اسم الطالب</th>
                    <th style={{ width: 120 }}>حالة القيد</th>
                    <th style={{ width: 150 }}>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {pageStudents.map((s, idx) => {
                    const rowNum = pageIdx * perPage + idx + 1;
                    return (
                      <tr key={s.id || idx} style={{ textAlign: 'center' }}>
                        <td className="cell-num" style={{fontWeight: 'bold', color:'#64748b'}}>{rowNum}</td>
                        <td className="cell-name" style={{ textAlign: 'right', fontWeight: 700, paddingRight: 15, fontSize: 14 }}>{s.full_name_ar}</td>
                        <td style={{ color: '#475569' }}>
                          {s.status === 'promoted' ? 'منقول' : s.status === 'retained' ? 'باقٍ للإعادة' : s.status === 'suspended' ? 'موقوف قيده' : 'مستجد'}
                        </td>
                        <td style={{ color: '#94a3b8' }}>—</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{textAlign:'center', marginTop:15, padding: 10, background: '#f1f5f9', color:'#334155', borderRadius: 8, fontSize:13, fontWeight:600}}>
                ⚠️ هذه المعاينة مبسطة لعرض الأسماء فقط. يرجى تصدير التقرير إلى الإكسيل لمعاينة وفتح الشيت الأصلي.
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}
