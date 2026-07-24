// ════════════════════════════════════════════════════════════════
//  Report Definition: رصد درجات أعمال السنة
//  شبكة المواد × الطلاب لإدخال درجات أعمال السنة
// ════════════════════════════════════════════════════════════════
import React, { useState } from 'react';

// Primary school subjects by stage
const SUBJECTS_BY_STAGE = {
  primary: [
    'اللغة العربية', 'الرياضيات', 'العلوم', 'الدراسات الاجتماعية',
    'التربية الدينية', 'اللغة الإنجليزية', 'التربية الفنية', 'التربية الرياضية',
  ],
  preparatory: [
    'اللغة العربية', 'اللغة الإنجليزية', 'الرياضيات', 'العلوم', 'الفيزياء',
    'الكيمياء', 'الأحياء', 'التاريخ', 'الجغرافيا', 'الحاسب الآلي',
    'التربية الدينية', 'التربية الفنية', 'التربية الرياضية',
  ],
};

function GradesSheetPreview({ students, meta, schoolInfo }) {
  const { selectedGrade, selectedYear, selectedClassroom } = meta;
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [stage, setStage] = useState('primary');

  const subjects = SUBJECTS_BY_STAGE[stage] || SUBJECTS_BY_STAGE.primary;
  const termLabel = selectedTerm === 1 ? 'الترم الأول' : 'الترم الثاني';

  return (
    <div className="report-preview" id="print-area" data-orientation="landscape">
      {/* Controls - hidden when printing */}
      <div className="no-print" style={{ marginBottom: 15, display: 'flex', gap: 15, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>الترم:</label>
        <select
          className="form-control"
          style={{ width: 'auto', fontSize: 13 }}
          value={selectedTerm}
          onChange={e => setSelectedTerm(parseInt(e.target.value))}
        >
          <option value={1}>الترم الأول</option>
          <option value={2}>الترم الثاني</option>
        </select>

        <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>المرحلة:</label>
        <select
          className="form-control"
          style={{ width: 'auto', fontSize: 13 }}
          value={stage}
          onChange={e => setStage(e.target.value)}
        >
          <option value="primary">ابتدائي</option>
          <option value="preparatory">إعدادي</option>
        </select>
      </div>

      {/* Official Header */}
      <div className="official-header">
        <div className="official-logo-box">
          <div className="logo-placeholder">شعار<br />المدرسة</div>
        </div>
        <div className="official-title-block">
          <div className="official-title" style={{ fontSize: 15 }}>
            رصد درجات أعمال السنة — {termLabel}
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

      {/* Grades Grid */}
      <div className="register-table-wrap" style={{ marginTop: 10, overflowX: 'auto' }}>
        <table style={{ fontSize: 9, borderCollapse: 'collapse', width: '100%', direction: 'rtl' }}>
          <thead>
            <tr style={{ background: '#1e3a5f', color: '#fff' }}>
              <th style={{ border: '1px solid #999', padding: '4px 6px', width: 30 }}>م</th>
              <th style={{ border: '1px solid #999', padding: '4px 8px', minWidth: 130, textAlign: 'right' }}>اسم الطالب</th>
              {subjects.map(subj => (
                <th key={subj} style={{ border: '1px solid #999', padding: '3px 2px', textAlign: 'center', fontSize: 8, width: 45 }}>
                  {subj}
                </th>
              ))}
              <th style={{ border: '1px solid #999', padding: '4px', background: '#0d2b3e', width: 45, textAlign: 'center', fontSize: 9 }}>المجموع</th>
              <th style={{ border: '1px solid #999', padding: '4px', background: '#0d2b3e', width: 45, textAlign: 'center', fontSize: 9 }}>التقدير</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center', fontSize: 9 }}>{i + 1}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'right', fontWeight: 600, fontSize: 9 }}>{s.full_name_ar}</td>
                {subjects.map(subj => (
                  <td key={subj} style={{ border: '1px solid #ccc', padding: '2px', textAlign: 'center', minWidth: 35, height: 20 }}></td>
                ))}
                <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center', background: '#fef9c3' }}></td>
                <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center', background: '#fef9c3' }}></td>
              </tr>
            ))}
            {/* Max row */}
            <tr style={{ fontWeight: 700, background: '#e0f2fe' }}>
              <td colSpan={2} style={{ border: '1px solid #999', padding: '4px 8px', textAlign: 'center', fontSize: 10 }}>الدرجة العظمى</td>
              {subjects.map(subj => (
                <td key={subj} style={{ border: '1px solid #999', padding: '4px', textAlign: 'center', fontSize: 9 }}>100</td>
              ))}
              <td style={{ border: '1px solid #999', textAlign: 'center', background: '#bae6fd' }}>{subjects.length * 100}</td>
              <td style={{ border: '1px solid #999', textAlign: 'center', background: '#bae6fd' }}>ممتاز</td>
            </tr>
            {students.length === 0 && (
              <tr>
                <td colSpan={subjects.length + 4} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>
                  يرجى اختيار الفصل لعرض الطلاب
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 15, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <div>توقيع معلم الفصل: ..........................</div>
        <div>يعتمد مدير المدرسة: ..........................</div>
      </div>
    </div>
  );
}

const gradesSheet = {
  id:          'grades_sheet',
  name:        'رصد درجات أعمال السنة',
  desc:        'شبكة المواد والدرجات لكل طالب في الفصل لرصد أعمال السنة',
  category:    'قوائم الفصول',
  icon:        '📝',
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
    `رصد_درجات_${meta.selectedClassroom?.class_name || ''}_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

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

  PreviewComponent: GradesSheetPreview,
};

export default gradesSheet;
