// ════════════════════════════════════════════════════════════════
//  Report Definition: كشف استلام الكتب
//  قائمة بالطلاب مع خانة توقيع على استلام الكتب الدراسية
// ════════════════════════════════════════════════════════════════
import React, { useState } from 'react';

const BOOK_SETS_BY_STAGE = {
  primary: [
    'العربي', 'رياضيات', 'علوم', 'دراسات', 'دين', 'انجليزي',
  ],
  preparatory: [
    'العربي', 'انجليزي', 'رياضيات', 'علوم', 'فيزياء', 'كيمياء',
    'أحياء', 'تاريخ', 'جغرافيا', 'دين',
  ],
};

function BooksListPreview({ students, meta, schoolInfo }) {
  const { selectedGrade, selectedYear, selectedClassroom } = meta;
  const [stage, setStage] = useState('primary');
  const [term, setTerm] = useState(1);

  const books = BOOK_SETS_BY_STAGE[stage] || BOOK_SETS_BY_STAGE.primary;
  const termLabel = term === 1 ? 'الترم الأول' : 'الترم الثاني';

  return (
    <div className="report-preview" id="print-area" data-orientation="landscape">
      {/* Controls */}
      <div className="no-print" style={{ marginBottom: 15, display: 'flex', gap: 15, alignItems: 'center' }}>
        <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>المرحلة:</label>
        <select className="form-control" style={{ width: 'auto', fontSize: 13 }} value={stage} onChange={e => setStage(e.target.value)}>
          <option value="primary">ابتدائي</option>
          <option value="preparatory">إعدادي</option>
        </select>
        <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>الترم:</label>
        <select className="form-control" style={{ width: 'auto', fontSize: 13 }} value={term} onChange={e => setTerm(parseInt(e.target.value))}>
          <option value={1}>الترم الأول</option>
          <option value={2}>الترم الثاني</option>
        </select>
      </div>

      {/* Official Header */}
      <div className="official-header">
        <div className="official-logo-box">
          <div className="logo-placeholder">شعار<br />المدرسة</div>
        </div>
        <div className="official-title-block">
          <div className="official-title" style={{ fontSize: 15 }}>
            كشف استلام الكتب الدراسية — {termLabel}
          </div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            {selectedGrade?.grade_name_ar} — {selectedClassroom?.class_name || '...'} — {selectedYear?.year_label}
          </div>
        </div>
        <div className="official-school-info">
          <div>محافظة: <span>{schoolInfo.governorate || '....'}</span></div>
          <div>إدارة: <span>{schoolInfo.directorate || '....'}</span></div>
          <div>مدرسة: <span>{schoolInfo.schoolName || '....'}</span></div>
        </div>
      </div>

      {/* Books Grid */}
      <div className="register-table-wrap" style={{ marginTop: 10, overflowX: 'auto' }}>
        <table style={{ fontSize: 10, borderCollapse: 'collapse', width: '100%', direction: 'rtl' }}>
          <thead>
            <tr style={{ background: '#1e3a5f', color: '#fff' }}>
              <th style={{ border: '1px solid #666', padding: '5px 6px', width: 32 }}>م</th>
              <th style={{ border: '1px solid #666', padding: '5px 8px', minWidth: 130, textAlign: 'right' }}>اسم الطالب</th>
              {books.map(book => (
                <th key={book} style={{ border: '1px solid #666', padding: '4px 2px', textAlign: 'center', fontSize: 9, width: 55 }}>
                  {book}
                </th>
              ))}
              <th style={{ border: '1px solid #666', padding: '5px', textAlign: 'center', fontSize: 9, width: 70, background: '#0d2b3e' }}>
                توقيع ولي الأمر
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                <td style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ border: '1px solid #ddd', padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>{s.full_name_ar}</td>
                {books.map(book => (
                  <td key={book} style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'center', height: 24 }}>
                    {/* Empty checkbox for manual signature */}
                    <span style={{ display: 'inline-block', width: 14, height: 14, border: '1px solid #999', verticalAlign: 'middle' }} />
                  </td>
                ))}
                <td style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'center', height: 24 }}></td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={books.length + 3} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>
                  يرجى اختيار الفصل لعرض الطلاب
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 15, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <div>أمين المكتبة: ..........................</div>
        <div>مسؤول الكتب: ..........................</div>
        <div>يعتمد مدير المدرسة: ..........................</div>
      </div>
    </div>
  );
}

const booksList = {
  id:          'books_list',
  name:        'كشف استلام الكتب الدراسية',
  desc:        'قائمة بالطلاب مع خانات تأشير على استلام كل كتاب دراسي',
  category:    'قوائم الفصول',
  icon:        '📚',
  orientation: 'landscape',
  available:   true,

  filters: {
    requiresGrade:   true,
    requiresYear:    true,
    requiresClass:   true,
    requiresSection: true,
    requiresStage:   true,
  },

  excelEndpoint: (f) =>
    `/api/students/export/class-list?classId=${f.classId}&gradeId=${f.gradeId}&academicYearId=${f.academicYearId}&status=all`,

  excelFileName: (f, meta) =>
    `كشف_كتب_${meta.selectedClassroom?.class_name || ''}_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  buildQuery: (f) => {
    const q = new URLSearchParams({
      gradeId: f.gradeId,
      academicYearId: f.academicYearId,
      classId: f.classId,
      limit: 60,
      status: 'all',
    });
    if (f.sectionId) q.set('sectionId', f.sectionId);
    return q.toString();
  },

  PreviewComponent: BooksListPreview,
};

export default booksList;
