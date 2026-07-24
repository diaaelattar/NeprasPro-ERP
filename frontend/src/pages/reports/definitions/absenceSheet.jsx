// ════════════════════════════════════════════════════════════════
//  Report Definition: كشف رصد الغياب اليومي
//  شبكة أيام × طلاب للتأشير يدوياً على الحضور والغياب
// ════════════════════════════════════════════════════════════════
import React, { useState } from 'react';

// Days in a month for the attendance grid
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function AbsenceSheetPreview({ students, meta, schoolInfo }) {
  const { selectedGrade, selectedYear, selectedClassroom } = meta;
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const MONTHS = [
    { value: 9,  label: 'سبتمبر' }, { value: 10, label: 'أكتوبر' },
    { value: 11, label: 'نوفمبر' }, { value: 12, label: 'ديسمبر' },
    { value: 1,  label: 'يناير'  }, { value: 2,  label: 'فبراير' },
    { value: 3,  label: 'مارس'   }, { value: 4,  label: 'أبريل'  },
    { value: 5,  label: 'مايو'   }, { value: 6,  label: 'يونيو'  },
  ];

  const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || '';

  // Get number of days in selected month
  const year = selectedMonth >= 9 ? 2024 : 2025; // Academic year calculation
  const daysInMonth = new Date(year, selectedMonth, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="report-preview" id="print-area" data-orientation="landscape">
      {/* Month selector - hidden when printing */}
      <div className="no-print" style={{ marginBottom: 15, display: 'flex', gap: 12, alignItems: 'center' }}>
        <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>اختر الشهر للطباعة:</label>
        <select
          className="form-control"
          style={{ width: 'auto', fontSize: 13 }}
          value={selectedMonth}
          onChange={e => setSelectedMonth(parseInt(e.target.value))}
        >
          {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {/* Official Header */}
      <div className="official-header">
        <div className="official-logo-box">
          <div className="logo-placeholder">شعار<br />المدرسة</div>
        </div>
        <div className="official-title-block">
          <div className="official-title" style={{ fontSize: 15 }}>
            كشف رصد الغياب — شهر {monthLabel}
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

      {/* Attendance Grid */}
      <div className="register-table-wrap" style={{ marginTop: 10, overflowX: 'auto' }}>
        <table style={{ fontSize: 9, borderCollapse: 'collapse', width: '100%', direction: 'rtl' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #333', padding: '4px 6px', background: '#f3f4f6', width: 35 }}>م</th>
              <th style={{ border: '1px solid #333', padding: '4px 8px', background: '#f3f4f6', minWidth: 120, textAlign: 'right' }}>اسم الطالب</th>
              {days.map(d => (
                <th key={d} style={{ border: '1px solid #333', padding: '3px', background: '#f3f4f6', width: 20, textAlign: 'center' }}>
                  {d}
                </th>
              ))}
              <th style={{ border: '1px solid #333', padding: '4px', background: '#e5e7eb', width: 35, textAlign: 'center' }}>مجموع الغياب</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.id}>
                <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{s.full_name_ar}</td>
                {days.map(d => (
                  <td key={d} style={{ border: '1px solid #ccc', padding: '2px', textAlign: 'center', minWidth: 20, height: 18 }}></td>
                ))}
                <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center', background: '#fef9c3' }}></td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={days.length + 3} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>
                  يرجى اختيار الفصل لعرض الطلاب
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 15, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <div>معلم الفصل: ..........................</div>
        <div>الأخصائي الاجتماعي: ..........................</div>
        <div>مدير المدرسة: ..........................</div>
      </div>
    </div>
  );
}

const absenceSheet = {
  id:          'absence_sheet',
  name:        'كشف رصد الغياب الشهري',
  desc:        'شبكة يومية للتأشير على الحضور والغياب لكل طالب في الفصل',
  category:    'قوائم الفصول',
  icon:        '📅',
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
    `كشف_غياب_${meta.selectedClassroom?.class_name || ''}_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

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

  PreviewComponent: AbsenceSheetPreview,
};

export default absenceSheet;
