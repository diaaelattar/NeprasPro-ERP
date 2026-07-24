// ════════════════════════════════════════════════════════════════
//  Report Definition: كشف التطعيمات
//  قائمة طلاب مع خانات التطعيمات المختلفة للتأشير والمتابعة
// ════════════════════════════════════════════════════════════════
import React, { useState } from 'react';

const VACCINES_PRIMARY = [
  { id: 'dt',     label: 'دفتيريا\nكزاز',     short: 'DT'   },
  { id: 'mmr',    label: 'الحصبة\nحصبة ألم.',  short: 'MMR'  },
  { id: 'polio',  label: 'شلل\nالأطفال',       short: 'OPV'  },
  { id: 'hepb',   label: 'التهاب\nالكبد',       short: 'HepB' },
  { id: 'var',    label: 'جدري\nالماء',         short: 'VAR'  },
  { id: 'td',     label: 'تنشيط\nالكزاز',       short: 'TD'   },
];

function VaccinationsSheetPreview({ students, meta, schoolInfo }) {
  const { selectedGrade, selectedYear, selectedClassroom } = meta;
  const [vaccines, setVaccines] = useState(VACCINES_PRIMARY);
  const [newVaccineName, setNewVaccineName] = useState('');

  const addVaccine = () => {
    if (!newVaccineName.trim()) return;
    setVaccines(prev => [...prev, { id: `custom_${Date.now()}`, label: newVaccineName, short: newVaccineName.slice(0, 4) }]);
    setNewVaccineName('');
  };

  return (
    <div className="report-preview" id="print-area" data-orientation="landscape">
      {/* Controls */}
      <div className="no-print" style={{ marginBottom: 15 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label" style={{ fontSize: 12 }}>إضافة تطعيم آخر</label>
            <input
              className="form-control"
              style={{ fontSize: 12 }}
              placeholder="اسم التطعيم..."
              value={newVaccineName}
              onChange={e => setNewVaccineName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addVaccine()}
            />
          </div>
          <button className="btn btn-primary" style={{ fontSize: 12, height: 36 }} onClick={addVaccine}>
            + إضافة
          </button>
          <button className="btn btn-secondary" style={{ fontSize: 12, height: 36 }} onClick={() => setVaccines(VACCINES_PRIMARY)}>
            ↺ إعادة تعيين
          </button>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {vaccines.map((v, i) => (
            <span key={v.id} style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 10px', borderRadius: 12, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
              {v.label.replace('\n', ' ')}
              <button onClick={() => setVaccines(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
        </div>
      </div>

      {/* Official Header */}
      <div className="official-header">
        <div className="official-logo-box">
          <div className="logo-placeholder">شعار<br />المدرسة</div>
        </div>
        <div className="official-title-block">
          <div className="official-title" style={{ fontSize: 15 }}>
            كشف متابعة التطعيمات
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

      {/* Vaccination Grid */}
      <div className="register-table-wrap" style={{ marginTop: 10, overflowX: 'auto' }}>
        <table style={{ fontSize: 9, borderCollapse: 'collapse', width: '100%', direction: 'rtl' }}>
          <thead>
            <tr style={{ background: '#065f46', color: '#fff' }}>
              <th style={{ border: '1px solid #777', padding: '4px 6px', width: 32 }}>م</th>
              <th style={{ border: '1px solid #777', padding: '4px 8px', minWidth: 130, textAlign: 'right' }}>اسم الطالب</th>
              <th style={{ border: '1px solid #777', padding: '4px 6px', width: 90 }}>تاريخ الميلاد</th>
              {vaccines.map(v => (
                <th key={v.id} style={{ border: '1px solid #777', padding: '3px 2px', textAlign: 'center', fontSize: 8, width: 48, lineHeight: 1.3, whiteSpace: 'pre-line' }}>
                  {v.label}
                  <div style={{ fontSize: 7, opacity: 0.8 }}>({v.short})</div>
                </th>
              ))}
              <th style={{ border: '1px solid #777', padding: '4px', textAlign: 'center', fontSize: 9, width: 70 }}>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => {
              const birthDate = s.birth_date
                ? new Date(s.birth_date).toLocaleDateString('ar-EG')
                : '—';
              return (
                <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#f0fdf4' }}>
                  <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>{i + 1}</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{s.full_name_ar}</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center', fontSize: 9 }} dir="ltr">{birthDate}</td>
                  {vaccines.map(v => (
                    <td key={v.id} style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'center', height: 22 }}>
                      <span style={{ display: 'inline-block', width: 14, height: 14, border: '1px solid #999', verticalAlign: 'middle', background: '#f9fafb' }} />
                    </td>
                  ))}
                  <td style={{ border: '1px solid #ccc', padding: '4px', height: 22 }}></td>
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr>
                <td colSpan={vaccines.length + 4} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>
                  يرجى اختيار الفصل لعرض الطلاب
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 15, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <div>الممرضة: ..........................</div>
        <div>الأخصائي الاجتماعي: ..........................</div>
        <div>مدير المدرسة: ..........................</div>
      </div>
    </div>
  );
}

const vaccinationsSheet = {
  id:          'vaccinations_sheet',
  name:        'كشف متابعة التطعيمات',
  desc:        'قائمة طلاب مع خانات لتأشير حالة كل تطعيم على حدة مع إمكانية إضافة تطعيمات مخصصة',
  category:    'الصحة المدرسية',
  icon:        '💉',
  orientation: 'landscape',
  available:   true,

  filters: {
    requiresGrade:   true,
    requiresYear:    true,
    requiresSection: true,
    requiresStage:   true,
  },

  excelEndpoint: (f) =>
    `/api/students/export/class-list?gradeId=${f.gradeId}&academicYearId=${f.academicYearId}${f.classId ? '&classId=' + f.classId : ''}&status=all`,

  excelFileName: (f, meta) =>
    `كشف_تطعيمات_${meta.selectedGrade?.grade_name_ar || ''}_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  buildQuery: (f) => {
    const q = new URLSearchParams({
      gradeId: f.gradeId,
      academicYearId: f.academicYearId,
      limit: 500,
      status: 'all',
    });
    if (f.sectionId) q.set('sectionId', f.sectionId);
    if (f.classId)   q.set('classId',   f.classId);
    return q.toString();
  },

  PreviewComponent: VaccinationsSheetPreview,
};

export default vaccinationsSheet;
