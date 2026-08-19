// ════════════════════════════════════════════════════════════════
//  Report Definition: سجل التوائم
//  يُظهر الطلاب التوائم المسجلين في المدرسة مرتبين معاً
// ════════════════════════════════════════════════════════════════
import React from 'react';
import RegisterStatsPage from '../RegisterStatsPage';

function TwinsRegisterPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear } = meta;

  // Clean School & Administration names
  const cleanSchool = (schoolInfo.schoolName || '').replace(/^مدرسة\s*/, '').trim();
  const rawAdmin = schoolInfo.directorate || '';
  const cleanAdmin = rawAdmin.replace(/التعليمية\s*$/, '').trim();
  const governorate = schoolInfo.governorate || 'الجيزة';

  // Group twins: same parent_name + same birth_date = likely twins
  const twinStudents = students.filter(s => s.is_twin === 1 || s.is_twin === true);

  // Try grouping by family name + birth year as fallback
  const groupedByParent = {};
  students.forEach(s => {
    const key = `${s.guardian_name || s.parent_name || ''}__${s.birth_date?.slice(0, 7) || ''}`;
    if (!groupedByParent[key]) groupedByParent[key] = [];
    groupedByParent[key].push(s);
  });

  // Pairs where same parent has 2+ students with same birth month/year
  const detectedTwinGroups = Object.values(groupedByParent).filter(group => group.length >= 2);

  // Merge is_twin flagged + detected
  const allTwinIds = new Set(twinStudents.map(s => s.id));
  detectedTwinGroups.forEach(group => group.forEach(s => allTwinIds.add(s.id)));
  const allTwins = students.filter(s => allTwinIds.has(s.id));

  // Re-group for display
  const displayGroups = {};
  allTwins.forEach(s => {
    const key = `${s.guardian_name || s.parent_name || s.full_name_ar.split(' ').slice(1).join(' ')}__${s.birth_date?.slice(0, 7) || ''}`;
    if (!displayGroups[key]) displayGroups[key] = [];
    displayGroups[key].push(s);
  });

  const groups = Object.values(displayGroups);

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
              سجل الطلاب التوائم - {selectedGrade?.grade_name_ar || 'جميع الصفوف'}
            </h2>
            <div className="report-subtitle-meta" style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', marginTop: 2 }}>
              للعام الدراسي {selectedYear?.year_label || '...............'} | إجمالي التوائم: <strong>{allTwins.length}</strong> طالب ({groups.length} مجموعات)
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

        {/* Summary Badges */}
        <div style={{ display: 'flex', gap: 12, margin: '8px 0 12px', justifyContent: 'center' }}>
          <div style={{ padding: '4px 14px', background: '#1e293b', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
            إجمالي التوائم: <span style={{ fontSize: 13, marginRight: 4 }}>{allTwins.length}</span>
          </div>
          <div style={{ padding: '4px 14px', background: '#059669', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
            عدد مجموعات التوائم: <span style={{ fontSize: 13, marginRight: 4 }}>{groups.length}</span>
          </div>
        </div>

        {groups.length > 0 ? (
          <div className="register-table-wrap" style={{ width: '100%', overflowX: 'hidden' }}>
            <table className="register-table" dir="rtl" style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', fontSize: 10, textAlign: 'center', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: '#e2e8f0', color: '#000', fontWeight: 800 }}>
                  <th style={{ border: '1px solid #000', padding: '4px 2px', width: 30 }}>م</th>
                  <th style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'right', width: 180 }}>اسم التلميذ</th>
                  <th style={{ border: '1px solid #000', padding: '4px 2px', width: 35 }}>النوع</th>
                  <th style={{ border: '1px solid #000', padding: '4px 2px', width: 35 }}>السن</th>
                  <th style={{ border: '1px solid #000', padding: '4px 2px', width: 75 }}>تاريخ الميلاد</th>
                  <th style={{ border: '1px solid #000', padding: '4px 2px', width: 110 }}>الرقم القومي</th>
                  <th style={{ border: '1px solid #000', padding: '4px 2px', width: 90 }}>الصف</th>
                  <th style={{ border: '1px solid #000', padding: '4px 2px', width: 50 }}>الفصل</th>
                  <th style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'right', width: 160 }}>ولي الأمر</th>
                  <th style={{ border: '1px solid #000', padding: '4px 2px', width: 95 }}>رقم الهاتف</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group, gi) => (
                  <React.Fragment key={gi}>
                    <tr>
                      <td colSpan={10} style={{
                        background: '#dbeafe',
                        fontWeight: 900,
                        fontSize: 11,
                        padding: '4px 12px',
                        border: '1px solid #000',
                        color: '#1e40af',
                        textAlign: 'right'
                      }}>
                        👥 توأم عائلة: {group[0]?.guardian_name || group[0]?.parent_name || group[0]?.full_name_ar.split(' ').slice(1).join(' ')} ({group.length} طلاب)
                      </td>
                    </tr>
                    {group.map((s, si) => (
                      <tr key={s.id || si} style={{ background: si % 2 === 1 ? '#f8fafc' : '#fff' }}>
                        <td style={{ border: '1px solid #000', padding: '3px 2px', fontWeight: 700 }}>{si + 1}</td>
                        <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'right', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.full_name_ar}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '3px 2px', fontWeight: 700 }}>{s.gender === 'ذكر' ? 'ذكر' : 'أنثى'}</td>
                        <td style={{ border: '1px solid #000', padding: '3px 2px' }}>{calcAge(s.birth_date)}</td>
                        <td style={{ border: '1px solid #000', padding: '3px 2px', fontFamily: 'monospace', fontSize: 9.5 }}>{s.birth_date || '—'}</td>
                        <td style={{ border: '1px solid #000', padding: '3px 2px', fontFamily: 'monospace', fontSize: 9.5 }}>{s.national_id || '—'}</td>
                        <td style={{ border: '1px solid #000', padding: '3px 2px' }}>{s.grade_name_ar || '—'}</td>
                        <td style={{ border: '1px solid #000', padding: '3px 2px', direction: 'ltr' }}>{s.classroom_name || s.class_name || '—'}</td>
                        <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.guardian_name || s.parent_name || '—'}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '3px 2px', fontFamily: 'monospace', fontSize: 9 }} dir="ltr">
                          {s.guardian_phone || s.parent_phone || '—'}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 28, color: '#64748b', fontWeight: 700, border: '1px dashed #cbd5e1', borderRadius: 8 }}>
            لا يوجد طلاب توائم مسجلون في هذا البحث
          </div>
        )}

        {/* Official Signatures Footer */}
        <div className="official-signatures-footer" style={{ marginTop: 16, paddingTop: 6, borderTop: '1px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontWeight: 800 }}>
          <div>الأخصائي الاجتماعي: ..........................</div>
          <div>مسؤول شئون الطلاب: ..........................</div>
          <div>يعتمد مدير المدرسة: ..........................</div>
        </div>
      </div>

      {/* ══ صفحة الإحصاء الختامي المستقلة تماماً ══ */}
      <RegisterStatsPage
        title="سجل الطلاب التوائم"
        subTitle={selectedGrade?.grade_name_ar ? `للصف: ${selectedGrade.grade_name_ar}` : ''}
        registerCode="استمارة توائم ش.ط"
        students={allTwins}
        meta={meta}
        schoolInfo={schoolInfo}
        pageIndex={2}
        totalPages={2}
      />
    </div>
  );
}

const twinsRegister = {
  id:          'twins_register',
  name:        'سجل الطلاب التوائم',
  desc:        'يُظهر الطلاب التوائم المسجلين في المدرسة مرتبين ومجمعين معاً في كشف واحد',
  category:    'السجلات المتخصصة',
  icon:        '👥',
  orientation: 'landscape',
  available:   true,

  filters: {
    requiresGrade: false,
    showClass:     true,
  },

  excelEndpoint: (f) =>
    `/api/students/export/excel?academicYearId=${f.academicYearId || ''}&isTwin=true`,

  excelFileName: (f, meta) =>
    `سجل_التوائم_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  buildQuery: (f) => {
    const q = new URLSearchParams({
      limit: 'all',
      status: 'all',
    });
    if (f.academicYearId) q.set('academicYearId', f.academicYearId);
    if (f.sectionId) q.set('sectionId', f.sectionId);
    if (f.stageId)   q.set('stageId', f.stageId);
    if (f.gradeId && f.gradeId !== 'all_stage')   q.set('gradeId', f.gradeId);
    return q.toString();
  },

  PreviewComponent: TwinsRegisterPreview,
};

export default twinsRegister;
