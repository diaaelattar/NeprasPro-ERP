// ════════════════════════════════════════════════════════════════
//  Report Definition: كشف هواتف الطوارئ والتواصل ومحل الإقامة
// ════════════════════════════════════════════════════════════════
import React from 'react';
import { sortStudentsByGenderAndName } from '../../../utils/studentSorter';

function EmergencyPhonesListPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear, selectedClassroom, classroomLabel } = meta;

  const cleanSchool = (schoolInfo.schoolName || schoolInfo.school_name || '').replace(/^مدرسة\s*/, '').trim();
  const rawAdmin = schoolInfo.directorate || schoolInfo.administration || '';
  const cleanAdmin = rawAdmin.replace(/^إدارة\s*/, '').replace(/التعليمية\s*$/, '').trim();
  const governorate = schoolInfo.governorate || 'الجيزة';
  const academicYearLabel = selectedYear?.year_label || schoolInfo.academicYear || '2025 / 2026';

  // ── Sort Students according to user preference (genderOrder: boys_first / girls_first / alphabetical) ──
  const sortedStudents = React.useMemo(() => {
    return sortStudentsByGenderAndName(students, meta.genderOrder || meta.filters?.genderOrder || 'none');
  }, [students, meta.genderOrder, meta.filters]);

  return (
    <div className="report-preview printable-page-block" id="print-area" data-orientation="landscape" style={{
      padding: '12px 16px',
      background: '#fff',
      color: '#000',
      fontFamily: 'Cairo, Tahoma, Arial, sans-serif'
    }}>
      {/* ══ الترويسة الثلاثية الرسمية ══ */}
      <div className="report-official-header" style={{
        marginBottom: 10,
        paddingBottom: 8,
        borderBottom: '2px solid #000',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        direction: 'rtl'
      }}>
        <div className="header-col-right" style={{ textAlign: 'right', fontSize: '12.5pt', lineHeight: 1.5, fontWeight: 700, width: '33%' }}>
          <div>مديرية التربية والتعليم بمحافظة: <strong>{governorate || '................'}</strong></div>
          <div>إدارة: <strong>{cleanAdmin ? `${cleanAdmin} التعليمية` : '................'}</strong></div>
          <div>مدرسة: <strong>{cleanSchool || '................'}</strong></div>
        </div>

        <div className="header-col-center" style={{ textAlign: 'center', flex: 1 }}>
          <h2 className="report-title-main" style={{
            fontSize: '16pt',
            fontWeight: 900,
            color: '#000',
            margin: 0,
            textDecoration: 'underline'
          }}>
            كشف هواتف وعناوين أولياء الأمور للطوارئ والتواصل
          </h2>
          <div className="report-subtitle-meta" style={{ fontSize: '12.5pt', fontWeight: 800, color: '#1e293b', marginTop: 3 }}>
            الصف: <strong>{selectedGrade?.grade_name_ar || '...'}</strong> | فصل: <strong>{classroomLabel || selectedClassroom?.class_name || '...'}</strong> | إجمالي الطلاب: <strong>{students.length}</strong>
          </div>
        </div>

        <div className="header-col-left" style={{ textAlign: 'left', fontSize: '12.5pt', fontWeight: 700, width: '30%', lineHeight: 1.5 }}>
          <div>العام الدراسي: <strong>{academicYearLabel} م</strong></div>
          <div>تاريخ الطباعة: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></div>
          <div>كود الكشف: <strong>NEP-EMERGENCY-PHONES</strong></div>
        </div>
      </div>

      {/* ══ جدول بيانات الهواتف والعناوين ══ */}
      <div className="register-table-wrap" style={{ marginTop: 8, overflowX: 'hidden' }}>
        <table className="register-table" style={{ fontSize: '11pt', borderCollapse: 'collapse', width: '100%', direction: 'rtl', border: '1.5px solid #000' }}>
          <thead>
            <tr style={{ background: '#0f766e', color: '#fff', fontWeight: 900, fontSize: '11.5pt' }}>
              <th style={{ border: '1.5px solid #000', padding: '6px 3px', width: 28, textAlign: 'center' }}>م</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'right', width: '24%' }}>اسم الطالب بالكامل</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 3px', width: 105, textAlign: 'center' }}>هاتف ولي الأمر (1)</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 3px', width: 105, textAlign: 'center' }}>هاتف طوارئ (2)</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 5px', width: 110, textAlign: 'right' }}>وظيفة ولي الأمر</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'right' }}>العنوان ومحل الإقامة بالتفصيل</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 3px', width: 60, textAlign: 'center' }}>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.map((s, i) => {
              const fullAddress = s.address || s.detailed_address || s.guardian_address || s.street_address || s.home_address || '—';
              const p1 = s.guardian_phone || s.father_phone || s.phone || '—';
              const p2 = s.mother_phone || s.emergency_phone || s.guardian_phone_2 || (s.student_phone && s.student_phone !== p1 ? s.student_phone : '') || '—';

              return (
                <tr key={s.id || i} style={{ background: i % 2 === 1 ? '#f8fafc' : '#fff' }}>
                  <td style={{ border: '1px solid #000', padding: '5px 2px', textAlign: 'center', fontWeight: 800 }}>{i + 1}</td>
                  <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'right', fontWeight: 800, fontSize: '11.5pt', whiteSpace: 'nowrap' }}>{s.full_name_ar}</td>
                  <td style={{ border: '1px solid #000', padding: '5px 2px', textAlign: 'center', fontFamily: 'monospace', fontSize: '11pt', fontWeight: 700, whiteSpace: 'nowrap' }} dir="ltr">{p1}</td>
                  <td style={{ border: '1px solid #000', padding: '5px 2px', textAlign: 'center', fontFamily: 'monospace', fontSize: '11pt', whiteSpace: 'nowrap' }} dir="ltr">{p2}</td>
                  <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right', fontSize: '10.5pt', whiteSpace: 'nowrap' }}>{s.guardian_job || s.father_job || '—'}</td>
                  <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'right', fontWeight: 600, fontSize: '10pt', lineHeight: 1.25, wordBreak: 'break-word' }}>{fullAddress}</td>
                  <td style={{ border: '1px solid #000', padding: '5px 2px', textAlign: 'center', fontSize: '9.5pt' }}>{s.notes || ''}</td>
                </tr>
              );
            })}
            {sortedStudents.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 25, color: '#6b7280', fontSize: '12pt' }}>
                  يرجى اختيار الصف والفصل للبدء في عرض وطباعة كشف الهواتف والعناوين
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ══ التذييل الرباعي الرسمي المعتمد ══ */}
      <div className="official-signatures-footer" style={{
        marginTop: 20,
        paddingTop: 10,
        borderTop: '2px solid #000',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        textAlign: 'center',
        fontSize: '12pt',
        fontWeight: 800
      }}>
        <div>
          <div>رائد الفصل</div>
          <div style={{ marginTop: 18, color: '#000' }}>التوقيع: ..........................</div>
        </div>
        <div>
          <div>الأخصائي الاجتماعي</div>
          <div style={{ marginTop: 18, color: '#000' }}>التوقيع: ..........................</div>
        </div>
        <div>
          <div>وكيل شؤون الطلاب</div>
          <div style={{ marginTop: 18, color: '#000' }}>التوقيع: ..........................</div>
        </div>
        <div>
          <div>مدير المدرسة (يعتمد وخاتم المدرسة)</div>
          <div style={{ marginTop: 18, color: '#000' }}>التوقيع: ..........................</div>
        </div>
      </div>
    </div>
  );
}

const emergencyPhonesList = {
  id:          'emergency_phones_list',
  name:        'كشف هواتف الطوارئ وعناوين أولياء الأمور',
  desc:        'كشف حصر أسماء الطلاب وتليفونات ولي الأمر الأساسية والبديلة وعنوان الإقامة بالتفصيل للطوارئ',
  category:    'قوائم وتوزيع الفصول',
  icon:        '📞',
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
    `كشف_هواتف_وعناوين_طوارئ_${meta.selectedClassroom?.class_name || ''}_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  buildQuery: (f) => {
    const q = new URLSearchParams({
      gradeId: f.gradeId,
      academicYearId: f.academicYearId,
      classId: f.classId,
      limit: 'all',
      status: 'all',
    });
    if (f.sectionId) q.set('sectionId', f.sectionId);
    if (f.stageId)   q.set('stageId', f.stageId);
    if (f.genderOrder && f.genderOrder !== 'none') q.set('genderOrder', f.genderOrder);
    return q.toString();
  },

  PreviewComponent: EmergencyPhonesListPreview,
};

export default emergencyPhonesList;
