import React from 'react';

const ageStat1oct = {
  id: 'age-stat-1oct',
  name: 'إحصاء الأعمار والسن في 1 أكتوبر الرسمي',
  category: 'إحصائيات',
  icon: '🎂',
  orientation: 'landscape',
  filters: {"requiresYear":true},
  available: true,
  buildQuery: (f) => {
    const q = new URLSearchParams();
    if (f.academicYearId) q.set('academicYearId', f.academicYearId);
    if (f.sectionId)      q.set('sectionId', f.sectionId);
    if (f.stageId)        q.set('stageId', f.stageId);
    if (f.gradeId)        q.set('gradeId', f.gradeId);
    if (f.classId)        q.set('classId', f.classId);
    return q.toString();
  },
  excelEndpoint: (f) => '/api/students/export/excel',
  excelFileName: () => 'إحصاء الأعمار والسن في 1 أكتوبر الرسمي.xlsx',

  PreviewComponent: ({ students = [], meta = {}, schoolInfo = {} }) => {
    return (
      <div className="report-page-printable">
        <div className="report-official-header">
          <div className="header-col-right">
            <div>وزارة التربية والتعليم والتعليم الفني</div>
            <div>مديرية التربية والتعليم: {schoolInfo.governorate || 'القاهرة'}</div>
            <div>إدارة: {schoolInfo.directorate || 'التعليمية'}</div>
            <div>مدرسة: {schoolInfo.schoolName || 'نبراس الخاصة'}</div>
          </div>
          <div className="header-col-center">
            <h2 className="report-title-main">إحصاء التوزيع التكراري لأعمار الطلاب والسن في أول أكتوبر</h2>
            <div className="report-subtitle-meta">العام الدراسي: {meta.selectedYear?.year_label || '2025-2026'} | العدد الإجمالي: {students.length} طالب</div>
          </div>
          <div className="header-col-left">
            <div>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
            <div>كود التقرير: NEP-AGE-STAT-1OCT</div>
          </div>
        </div>

        <table className="report-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>م</th>
              <th style={{ width: 120 }}>كود الطالب</th>
              <th>اسم الطالب بالكامل</th>
              <th style={{ width: 140 }}>الرقم القومي</th>
              <th style={{ width: 100 }}>النوع</th>
              <th style={{ width: 120 }}>الصف الدراسي</th>
              <th style={{ width: 90 }}>الفصل</th>
              <th style={{ width: 100 }}>حالة القيد</th>
            </tr>
          </thead>
          <tbody>
            {students.length > 0 ? (
              students.map((s, idx) => (
                <tr key={s.id || idx}>
                  <td>{idx + 1}</td>
                  <td><code style={{ fontFamily: 'monospace' }}>{s.student_code || '—'}</code></td>
                  <td style={{ fontWeight: 800 }}>{s.full_name_ar}</td>
                  <td dir="ltr" style={{ fontFamily: 'monospace' }}>{s.national_id || '—'}</td>
                  <td>{s.gender || '—'}</td>
                  <td>{s.grade_name_ar || '—'}</td>
                  <td>{s.classroom_name || '—'}</td>
                  <td><span className="cadre-badge">{s.enrollment_status || s.status || 'منقول'}</span></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                  لا توجد بيانات مسجلة مطابقة لفلاتر البحث المحددة
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="report-signatures" style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
          <div>
            <div style={{ fontWeight: 700 }}>مسؤول شئون الطلاب</div>
            <div style={{ marginTop: 35 }}>................................</div>
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>رئيس قسم الإحصاء</div>
            <div style={{ marginTop: 35 }}>................................</div>
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>مدير المدرسة (يعتمد)</div>
            <div style={{ marginTop: 35 }}>................................</div>
          </div>
        </div>
      </div>
    );
  }
};

export default ageStat1oct;
