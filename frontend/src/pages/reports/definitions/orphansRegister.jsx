// ════════════════════════════════════════════════════════════════
//  Report Definition: سجل الأيتام
//  يعرض الطلاب الذين فقدوا أحد الوالدين (يتيم الأب / يتيم الأم / كليهما)
// ════════════════════════════════════════════════════════════════
import React from 'react';
import RegisterStatsPage from '../RegisterStatsPage';

function OrphansRegisterPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear } = meta;

  // Clean School & Administration names
  const cleanSchool = (schoolInfo.schoolName || '').replace(/^مدرسة\s*/, '').trim();
  const rawAdmin = schoolInfo.directorate || '';
  const cleanAdmin = rawAdmin.replace(/التعليمية\s*$/, '').trim();
  const governorate = schoolInfo.governorate || 'الجيزة';

  // Filter orphaned students — check is_orphan / orphan_type / father_status / mother_status fields
  const orphans = students.filter(s => {
    const fatherDeceased = s.father_status === 'متوفى' || s.father_status === 'deceased' || s.father_deceased === 1 || (s.is_orphan && (s.orphan_type === 'يتيم الأب' || s.orphan_type === 'يتيم الوالدين (الأب والأم)'));
    const motherDeceased = s.mother_status === 'متوفاة' || s.mother_status === 'deceased' || s.mother_deceased === 1 || (s.is_orphan && (s.orphan_type === 'يتيم الأم' || s.orphan_type === 'يتيم الوالدين (الأب والأم)'));
    return Boolean(s.is_orphan === 1 || s.is_orphan === true || fatherDeceased || motherDeceased || s.orphan_type);
  });

  const fatherOrphans = orphans.filter(s => {
    const fd = s.father_status === 'متوفى' || s.father_status === 'deceased' || s.father_deceased === 1 || s.orphan_type === 'يتيم الأب';
    const md = s.mother_status === 'متوفاة' || s.mother_status === 'deceased' || s.mother_deceased === 1 || s.orphan_type === 'يتيم الأم';
    return (fd && !md) || s.orphan_type === 'يتيم الأب';
  });
  const motherOrphans = orphans.filter(s => {
    const fd = s.father_status === 'متوفى' || s.father_status === 'deceased' || s.father_deceased === 1 || s.orphan_type === 'يتيم الأب';
    const md = s.mother_status === 'متوفاة' || s.mother_status === 'deceased' || s.mother_deceased === 1 || s.orphan_type === 'يتيم الأم';
    return (md && !fd) || s.orphan_type === 'يتيم الأم';
  });
  const bothOrphans = orphans.filter(s => {
    const fd = s.father_status === 'متوفى' || s.father_status === 'deceased' || s.father_deceased === 1;
    const md = s.mother_status === 'متوفاة' || s.mother_status === 'deceased' || s.mother_deceased === 1;
    return (fd && md) || s.orphan_type === 'يتيم الوالدين (الأب والأم)';
  });

  const calcAge = (bd) => {
    if (!bd) return '—';
    const diff = new Date() - new Date(bd);
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  };

  return (
    <div className="report-preview" id="print-area" data-orientation="landscape">
      <div className="printable-page-block" style={{ padding: '12px 16px', boxSizing: 'border-box' }}>
        
        {/* Standard Official Header */}
        <div className="report-official-header" style={{ marginBottom: 10, paddingBottom: 6, borderBottom: '1.5px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="header-col-right" style={{ textAlign: 'right', fontSize: 11.5, lineHeight: 1.4, fontWeight: 700 }}>
            <div>محافظة: <strong>{governorate || '................'}</strong></div>
            <div>إدارة: <strong>{cleanAdmin ? `${cleanAdmin} التعليمية` : '................'}</strong></div>
            <div>مدرسة: <strong>{cleanSchool || '................'}</strong></div>
          </div>

          <div className="header-col-center" style={{ textAlign: 'center', flex: 1 }}>
            <h2 className="report-title-main" style={{ fontSize: 16, fontWeight: 900, margin: 0, textDecoration: 'underline', color: '#0f172a' }}>
              سجل الطلاب الأيتام - {selectedGrade?.grade_name_ar || 'جميع الصفوف'}
            </h2>
            <div className="report-subtitle-meta" style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', marginTop: 2 }}>
              للعام الدراسي {selectedYear?.year_label || '...............'} | إجمالي الأيتام: <strong>{orphans.length}</strong> طالب
            </div>
          </div>

          <div className="header-col-left" style={{ textAlign: 'left' }}>
            {schoolInfo.logoUrl ? (
              <img src={schoolInfo.logoUrl} alt="Logo" style={{ maxHeight: 42, maxWidth: 85, objectFit: 'contain' }} />
            ) : (
              <div style={{ border: '1px dashed #94a3b8', borderRadius: 4, padding: '3px 6px', fontSize: 9.5, color: '#64748b', textAlign: 'center', background: '#f8fafc' }}>
                شعار المدرسة
              </div>
            )}
            <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
          </div>
        </div>

        {/* Summary Stats Cards */}
        <div style={{ display: 'flex', gap: 12, margin: '8px 0 12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { label: 'إجمالي الأيتام',     val: orphans.length,       bg: '#1e293b', border: '#0f172a' },
            { label: 'يتيم الأب فقط',      val: fatherOrphans.length, bg: '#dc2626', border: '#b91c1c' },
            { label: 'يتيم الأم فقط',     val: motherOrphans.length, bg: '#7c3aed', border: '#6d28d9' },
            { label: 'يتيم الوالدين معاً', val: bothOrphans.length,   bg: '#0f766e', border: '#115e59' },
          ].map(s => (
            <div key={s.label} style={{ padding: '4px 14px', background: s.bg, color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 800, border: `1px solid ${s.border}` }}>
              {s.label}: <span style={{ fontSize: 13, marginRight: 4 }}>{s.val}</span>
            </div>
          ))}
        </div>

        {/* Main Table */}
        <div className="register-table-wrap" style={{ width: '100%', overflowX: 'hidden' }}>
          <table className="register-table" dir="rtl" style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', fontSize: 10, textAlign: 'center', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#e2e8f0', color: '#000', fontWeight: 800 }}>
                <th style={{ border: '1px solid #000', padding: '4px 2px', width: 28 }}>م</th>
                <th style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'right', width: 175 }}>اسم التلميذ</th>
                <th style={{ border: '1px solid #000', padding: '4px 2px', width: 32 }}>النوع</th>
                <th style={{ border: '1px solid #000', padding: '4px 2px', width: 34 }}>السن</th>
                <th style={{ border: '1px solid #000', padding: '4px 2px', width: 110 }}>الرقم القومي</th>
                <th style={{ border: '1px solid #000', padding: '4px 2px', width: 85 }}>الصف</th>
                <th style={{ border: '1px solid #000', padding: '4px 2px', width: 45 }}>الفصل</th>
                <th style={{ border: '1px solid #000', padding: '4px 2px', width: 55, background: '#fee2e2', color: '#991b1b' }}>يتيم أب</th>
                <th style={{ border: '1px solid #000', padding: '4px 2px', width: 55, background: '#ede9fe', color: '#6b21a8' }}>يتيم أم</th>
                <th style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'right', width: 155 }}>ولي الأمر الحالي</th>
                <th style={{ border: '1px solid #000', padding: '4px 2px', width: 95 }}>رقم الهاتف</th>
                <th style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'right', width: 110 }}>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {orphans.length > 0 ? (
                orphans.map((s, i) => (
                  <tr key={s.id || i} style={{ background: i % 2 === 1 ? '#f8fafc' : '#fff' }}>
                    <td style={{ border: '1px solid #000', padding: '3px 2px', fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'right', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.full_name_ar}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3px 2px', fontWeight: 700 }}>{s.gender === 'ذكر' ? 'ذكر' : 'أنثى'}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 2px' }}>{calcAge(s.birth_date)}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 2px', fontFamily: 'monospace', fontSize: 9.5 }}>{s.national_id || '—'}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 2px' }}>{s.grade_name_ar || '—'}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 2px', direction: 'ltr' }}>{s.classroom_name || s.class_name || '—'}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 2px', color: '#dc2626', fontWeight: 900, fontSize: 13, background: '#fff5f5' }}>
                      {s.father_status === 'متوفى' || s.father_deceased === 1 || s.orphan_type === 'يتيم الأب' || s.orphan_type === 'يتيم الوالدين (الأب والأم)' ? '✓' : ''}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3px 2px', color: '#7c3aed', fontWeight: 900, fontSize: 13, background: '#faf5ff' }}>
                      {s.mother_status === 'متوفاة' || s.mother_deceased === 1 || s.orphan_type === 'يتيم الأم' || s.orphan_type === 'يتيم الوالدين (الأب والأم)' ? '✓' : ''}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.guardian_name || s.parent_name || '—'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3px 2px', fontFamily: 'monospace', fontSize: 9 }} dir="ltr">
                      {s.guardian_phone || s.parent_phone || '—'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'right' }}></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: 24, color: '#64748b', fontWeight: 700 }}>
                    لا يوجد طلاب أيتام مسجلون في هذا البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Official Signatures Footer */}
        <div className="official-signatures-footer" style={{ marginTop: 16, paddingTop: 6, borderTop: '1px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontWeight: 800 }}>
          <div>الأخصائي الاجتماعي: ..........................</div>
          <div>مسؤول شئون الطلاب: ..........................</div>
          <div>يعتمد مدير المدرسة: ..........................</div>
        </div>
      </div>

      {/* ══ صفحة الإحصاء الختامي المستقلة تماماً ══ */}
      <RegisterStatsPage
        title="سجل الطلاب الأيتام"
        subTitle={selectedGrade?.grade_name_ar ? `للصف: ${selectedGrade.grade_name_ar}` : ''}
        registerCode="استمارة أيتام ش.ط"
        students={orphans}
        meta={meta}
        schoolInfo={schoolInfo}
        pageIndex={2}
        totalPages={2}
      />
    </div>
  );
}

const orphansRegister = {
  id:          'orphans_register',
  name:        'سجل الطلاب الأيتام',
  desc:        'يُظهر الطلاب الذين فقدوا الأب أو الأم أو كليهما مع بيانات الولي وإحصاء تلخيصي',
  category:    'السجلات المتخصصة',
  icon:        '🕊️',
  orientation: 'landscape',
  available:   true,

  filters: {
    requiresGrade: false,
    showClass:     true,
  },

  excelEndpoint: (f) =>
    `/api/students/export/excel?academicYearId=${f.academicYearId || ''}&isOrphan=true`,

  excelFileName: (f, meta) =>
    `سجل_الأيتام_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  buildQuery: (f) => {
    const q = new URLSearchParams({
      limit: 'all',
      status: 'all',
      isOrphan: 'true'
    });
    if (f.academicYearId) q.set('academicYearId', f.academicYearId);
    if (f.sectionId) q.set('sectionId', f.sectionId);
    if (f.stageId)   q.set('stageId', f.stageId);
    if (f.gradeId && f.gradeId !== 'all_stage')   q.set('gradeId', f.gradeId);
    if (f.classId && f.classId !== 'all_grade' && f.classId !== 'all') q.set('classId', f.classId);
    return q.toString();
  },

  PreviewComponent: OrphansRegisterPreview,
};

export default orphansRegister;
