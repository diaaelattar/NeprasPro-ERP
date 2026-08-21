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
            
            <div className="report-official-header" dir="rtl" style={{
              display: 'grid',
              gridTemplateColumns: '32% 38% 30%',
              alignItems: 'start',
              paddingBottom: 8,
              borderBottom: '2px solid #1e293b',
              marginBottom: 10,
              fontSize: 12
            }}>
              <div className="header-col-right" style={{ textAlign: 'right', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 700 }}>جمهورية مصر العربية</div>
                <div>وزارة التربية والتعليم والتعليم الفني</div>
                <div>مديرية التربية والتعليم بـ <strong>{schoolInfo.governorate || '................'}</strong></div>
                <div>إدارة <strong>{schoolInfo.directorate || '................'}</strong> التعليمية</div>
                <div>مدرسة: <strong>{schoolInfo.schoolName || schoolInfo.school_name || '................'}</strong></div>
              </div>

              <div className="header-col-center" style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: '#0f172a',
                  borderBottom: '1.5px solid #0f172a',
                  display: 'inline-block',
                  paddingBottom: 2,
                  marginBottom: 6
                }}>
                  {title}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a', marginBottom: 3 }}>
                  فصل: {classroomLabel || selectedClassroom?.class_name || selectedGrade?.grade_name_ar || 'جميع الفصول'}
                </div>
                <div style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                  العام الدراسي: {selectedYear?.year_label || '................'} | عدد الطلاب: {totalStudents} طالب
                </div>
              </div>

              <div className="header-col-left" style={{ textAlign: 'left', lineHeight: 1.6 }}>
                <div>الصف: <strong>{selectedGrade?.grade_name_ar || 'المرحلة الابتدائية'}</strong></div>
                <div>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>كود النموذج: REC-PRIM-01</div>
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
