// ════════════════════════════════════════════════════════════════
//  Report Definition: سجل التوائم
//  يُظهر الطلاب التوائم المسجلين في المدرسة مرتبين معاً
// ════════════════════════════════════════════════════════════════
import React from 'react';

function TwinsRegisterPreview({ students, meta, schoolInfo }) {
  const { selectedGrade, selectedYear } = meta;

  // Group twins: same parent_name + same birth_date = likely twins
  // Also check is_twin field if exists
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
      <div className="official-header">
        <div className="official-logo-box"><div className="logo-placeholder">شعار<br />المدرسة</div></div>
        <div className="official-title-block">
          <div className="official-title" style={{ fontSize: 16 }}>سجل الطلاب التوائم</div>
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

      {/* Summary */}
      <div style={{ display: 'flex', gap: 16, margin: '10px 0' }}>
        <div style={{ padding: '6px 14px', background: '#1e3a5f', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
          إجمالي التوائم: <span style={{ fontSize: 15 }}>{allTwins.length}</span>
        </div>
        <div style={{ padding: '6px 14px', background: '#059669', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
          عدد مجموعات التوائم: <span style={{ fontSize: 15 }}>{groups.length}</span>
        </div>
      </div>

      {groups.length > 0 ? (
        <table className="register-table" dir="rtl" style={{ fontSize: 10.5 }}>
          <thead>
            <tr>
              <th style={{ width: 32 }}>م</th>
              <th>اسم الطالب</th>
              <th style={{ width: 35 }}>النوع</th>
              <th style={{ width: 40 }}>السن</th>
              <th style={{ width: 100 }}>تاريخ الميلاد</th>
              <th style={{ width: 110 }}>الرقم القومي</th>
              <th style={{ width: 90 }}>الصف</th>
              <th style={{ width: 70 }}>الفصل</th>
              <th>ولي الأمر</th>
              <th style={{ width: 100 }}>التليفون</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, gi) => (
              <React.Fragment key={gi}>
                <tr>
                  <td colSpan={10} style={{
                    background: '#dbeafe',
                    fontWeight: 800,
                    fontSize: 11,
                    padding: '4px 12px',
                    borderTop: '2px solid #3b82f6',
                    color: '#1e40af',
                  }}>
                    👥 المجموعة {gi + 1} — {group[0]?.guardian_name || group[0]?.parent_name || 'عائلة مشتركة'} — عدد التوائم: {group.length}
                  </td>
                </tr>
                {group.map((s, i) => (
                  <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#eff6ff' }}>
                    <td className="cell-num">{i + 1}</td>
                    <td className="cell-name" style={{ textAlign: 'right', fontWeight: 600 }}>{s.full_name_ar}</td>
                    <td className="cell-sm">{s.gender === 'ذكر' ? 'م' : 'أ'}</td>
                    <td className="cell-sm">{calcAge(s.birth_date)}</td>
                    <td className="cell-sm" dir="ltr" style={{ fontSize: 9.5 }}>
                      {s.birth_date ? new Date(s.birth_date).toLocaleDateString('ar-EG') : '—'}
                    </td>
                    <td className="cell-id" dir="ltr">{s.national_id || '—'}</td>
                    <td>{s.grade_name_ar || '—'}</td>
                    <td>{s.class_name || '—'}</td>
                    <td>{s.guardian_name || s.parent_name || '—'}</td>
                    <td>{s.guardian_phone || s.parent_phone || '—'}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280', fontSize: 14 }}>
          لا يوجد توائم مسجلون في هذا الصف
          <br />
          <small style={{ fontSize: 11 }}>يتم التعرف عليهم من حقل "توأم" في بيانات الطالب أو عبر مطابقة ولي الأمر + تاريخ الميلاد</small>
        </div>
      )}

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <div>الأخصائي الاجتماعي: ..........................</div>
        <div>يعتمد مدير المدرسة: ..........................</div>
      </div>
    </div>
  );
}

const twinsRegister = {
  id:          'twins_register',
  name:        'سجل الطلاب التوائم',
  desc:        'يُظهر التوائم مجمعين معاً مع بيانات ولي الأمر — يدعم الاكتشاف التلقائي بالتاريخ والولي',
  category:    'إحصائيات',
  icon:        '👥',
  orientation: 'landscape',
  available:   true,

  filters: {
    requiresYear:    true,
    requiresSection: true,
    requiresStage:   true,
  },

  excelEndpoint: (f) =>
    `/api/students/export/excel?academicYearId=${f.academicYearId}&isTwin=true`,

  excelFileName: (f, meta) =>
    `سجل_التوائم_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

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

  PreviewComponent: TwinsRegisterPreview,
};

export default twinsRegister;
