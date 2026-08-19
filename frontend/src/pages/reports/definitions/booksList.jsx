// ════════════════════════════════════════════════════════════════
//  Report Definition: كشف استلام الكتب
//  قائمة بالطلاب مع خانة توقيع على استلام الكتب الدراسية
// ════════════════════════════════════════════════════════════════
import React, { useState } from 'react';

const BOOK_SLOTS = Array.from({ length: 9 }, (_, i) => i + 1);

function BooksListPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear, selectedClassroom, classroomLabel } = meta;

  return (
    <div className="report-preview" id="print-area" data-orientation="landscape">
      {/* Standard Official Header */}
      <div className="report-official-header">
        <div className="header-col-right">
          <div>مديرية التربية والتعليم بمحافظة: <strong>{schoolInfo.governorate || '................'}</strong></div>
          <div>إدارة: <strong>{schoolInfo.directorate || '................'} التعليمية</strong></div>
          <div>مدرسة: <strong>{schoolInfo.schoolName || '................'}</strong></div>
        </div>

        <div className="header-col-center">
          <h2 className="report-title-main">
            كشف تسليم واستلام الكتب المدرسية
          </h2>
          <div className="report-subtitle-meta">
            {selectedGrade?.grade_name_ar} | فصل: {classroomLabel || selectedClassroom?.class_name || '...'} | للعام الدراسي: {selectedYear?.year_label}
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

      {/* Books Grid (9 Blank Columns) */}
      <div className="register-table-wrap" style={{ marginTop: 10 }}>
        <table className="register-table" style={{ fontSize: 11.5, borderCollapse: 'collapse', width: '100%', direction: 'rtl' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #000 !important', padding: '4px', background: '#f1f5f9', width: 32 }}>م</th>
              <th style={{ border: '1px solid #000 !important', padding: '4px 8px', background: '#f1f5f9', minWidth: 160, textAlign: 'right' }}>اسم الطالب</th>
              {BOOK_SLOTS.map(slot => (
                <th key={slot} style={{ border: '1px solid #000 !important', padding: '4px 2px', background: '#f1f5f9', width: 55, textAlign: 'center' }}>
                  كتاب {slot}
                </th>
              ))}
              <th style={{ border: '1px solid #000 !important', padding: '4px', background: '#e2e8f0', width: 90, textAlign: 'center' }}>
                توقيع المستلم
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.id || i}>
                <td style={{ border: '1px solid #000 !important', padding: '4px', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ border: '1px solid #000 !important', padding: '4px 8px', textAlign: 'right', fontWeight: 800, whiteSpace: 'nowrap' }}>{s.full_name_ar}</td>
                {BOOK_SLOTS.map(slot => (
                  <td key={slot} style={{ border: '1px solid #000 !important', padding: '4px', textAlign: 'center', height: 22 }}>
                    
                  </td>
                ))}
                <td style={{ border: '1px solid #000 !important', padding: '4px', textAlign: 'center', height: 22 }}></td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>
                  يرجى اختيار الفصل لعرض الطلاب
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, padding: '0 20px' }}>
        <div>مسؤول الكتب بالمدرسة: ..........................</div>
        <div>أمين المكتبة: ..........................</div>
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
      limit: 'all',
      status: 'all',
    });
    if (f.sectionId) q.set('sectionId', f.sectionId);
    return q.toString();
  },

  PreviewComponent: BooksListPreview,
};

export default booksList;
