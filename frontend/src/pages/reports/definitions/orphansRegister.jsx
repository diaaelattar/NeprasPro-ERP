// ════════════════════════════════════════════════════════════════
//  Report Definition: سجل الأيتام
//  يعرض الطلاب الذين فقدوا أحد الوالدين (يتيم الأب / يتيم الأم / كليهما)
// ════════════════════════════════════════════════════════════════
import React from 'react';

function OrphansRegisterPreview({ students, meta, schoolInfo }) {
  const { selectedGrade, selectedYear } = meta;

  // Filter orphaned students — check father_status / mother_status fields
  const orphans = students.filter(s => {
    const fatherDeceased = s.father_status === 'متوفى' || s.father_status === 'deceased' || s.father_deceased === 1;
    const motherDeceased = s.mother_status === 'متوفاة' || s.mother_status === 'deceased' || s.mother_deceased === 1;
    return fatherDeceased || motherDeceased;
  });

  const fatherOrphans = orphans.filter(s => {
    const fd = s.father_status === 'متوفى' || s.father_status === 'deceased' || s.father_deceased === 1;
    const md = s.mother_status === 'متوفاة' || s.mother_status === 'deceased' || s.mother_deceased === 1;
    return fd && !md;
  });
  const motherOrphans = orphans.filter(s => {
    const fd = s.father_status === 'متوفى' || s.father_status === 'deceased' || s.father_deceased === 1;
    const md = s.mother_status === 'متوفاة' || s.mother_status === 'deceased' || s.mother_deceased === 1;
    return md && !fd;
  });
  const bothOrphans = orphans.filter(s => {
    const fd = s.father_status === 'متوفى' || s.father_status === 'deceased' || s.father_deceased === 1;
    const md = s.mother_status === 'متوفاة' || s.mother_status === 'deceased' || s.mother_deceased === 1;
    return fd && md;
  });

  const calcAge = (bd) => {
    if (!bd) return '—';
    const diff = new Date() - new Date(bd);
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  };

  const renderRow = (s, i) => (
    <tr key={s.id} className={i % 2 === 0 ? '' : 'cl-even'}>
      <td className="cell-num">{i + 1}</td>
      <td className="cell-name" style={{ textAlign: 'right', fontWeight: 600 }}>{s.full_name_ar}</td>
      <td className="cell-sm">{s.gender === 'ذكر' ? 'م' : 'أ'}</td>
      <td className="cell-sm">{calcAge(s.birth_date)}</td>
      <td className="cell-id" dir="ltr">{s.national_id || '—'}</td>
      <td>{s.grade_name_ar || '—'}</td>
      <td>{s.class_name || '—'}</td>
      <td style={{ color: '#dc2626', fontWeight: 700 }}>
        {s.father_status === 'متوفى' || s.father_deceased === 1 ? '✓' : ''}
      </td>
      <td style={{ color: '#7c3aed', fontWeight: 700 }}>
        {s.mother_status === 'متوفاة' || s.mother_deceased === 1 ? '✓' : ''}
      </td>
      <td>{s.guardian_name || s.parent_name || '—'}</td>
      <td>{s.guardian_phone || s.parent_phone || '—'}</td>
      <td></td>
    </tr>
  );

  return (
    <div className="report-preview" id="print-area" data-orientation="landscape">
      {/* Official Header */}
      <div className="official-header">
        <div className="official-logo-box">
          <div className="logo-placeholder">شعار<br />المدرسة</div>
        </div>
        <div className="official-title-block">
          <div className="official-title" style={{ fontSize: 16 }}>سجل الطلاب الأيتام</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            {selectedGrade?.grade_name_ar || 'جميع الصفوف'} — {selectedYear?.year_label}
          </div>
        </div>
        <div className="official-school-info">
          <div>محافظة: <span>{schoolInfo.governorate || '....'}</span></div>
          <div>إدارة: <span>{schoolInfo.directorate || '....'}</span></div>
          <div>مدرسة: <span>{schoolInfo.schoolName || '....'}</span></div>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'flex', gap: 16, margin: '10px 0', flexWrap: 'wrap' }}>
        {[
          { label: 'إجمالي الأيتام',     val: orphans.length,       color: '#1e3a5f' },
          { label: 'يتيم الأب فقط',      val: fatherOrphans.length, color: '#dc2626' },
          { label: 'يتيمة الأم فقط',     val: motherOrphans.length, color: '#7c3aed' },
          { label: 'يتيم الوالدين معاً', val: bothOrphans.length,   color: '#0f766e' },
        ].map(s => (
          <div key={s.label} style={{ padding: '6px 14px', background: s.color, color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
            {s.label}: <span style={{ fontSize: 15 }}>{s.val}</span>
          </div>
        ))}
      </div>

      {/* Main Table */}
      <table className="register-table" dir="rtl" style={{ fontSize: 10.5 }}>
        <thead>
          <tr>
            <th style={{ width: 32 }}>م</th>
            <th>اسم الطالب</th>
            <th style={{ width: 35 }}>النوع</th>
            <th style={{ width: 40 }}>السن</th>
            <th style={{ width: 110 }}>الرقم القومي</th>
            <th style={{ width: 90 }}>الصف</th>
            <th style={{ width: 65 }}>الفصل</th>
            <th style={{ width: 55, background: '#fee2e2' }}>يتيم أب</th>
            <th style={{ width: 55, background: '#ede9fe' }}>يتيم أم</th>
            <th>ولي الأمر</th>
            <th style={{ width: 100 }}>التليفون</th>
            <th>ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          {orphans.length > 0
            ? orphans.map((s, i) => renderRow(s, i))
            : (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: 30, color: '#6b7280' }}>
                  لا يوجد طلاب أيتام مسجلون في هذا الصف
                  <br />
                  <small style={{ fontSize: 11 }}>يتم التعرف عليهم من حقل حالة الأب/الأم في بيانات الطالب</small>
                </td>
              </tr>
            )
          }
        </tbody>
      </table>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <div>الأخصائي الاجتماعي: ..........................</div>
        <div>يعتمد مدير المدرسة: ..........................</div>
      </div>
    </div>
  );
}

const orphansRegister = {
  id:          'orphans_register',
  name:        'سجل الطلاب الأيتام',
  desc:        'يُظهر الطلاب الذين فقدوا الأب أو الأم أو كليهما مع بيانات الولي وإحصاء تلخيصي',
  category:    'إحصائيات',
  icon:        '🕊️',
  orientation: 'landscape',
  available:   true,

  filters: {
    requiresYear:    true,
    requiresSection: true,
    requiresStage:   true,
  },

  excelEndpoint: (f) =>
    `/api/students/export/excel?academicYearId=${f.academicYearId}&isOrphan=true`,

  excelFileName: (f, meta) =>
    `سجل_الأيتام_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  buildQuery: (f) => {
    const q = new URLSearchParams({
      academicYearId: f.academicYearId,
      limit: 2000,
      status: 'all',
    });
    if (f.sectionId) q.set('sectionId', f.sectionId);
    if (f.stageId)   q.set('stageId', f.stageId);
    if (f.gradeId)   q.set('gradeId', f.gradeId);
    return q.toString();
  },

  PreviewComponent: OrphansRegisterPreview,
};

export default orphansRegister;
