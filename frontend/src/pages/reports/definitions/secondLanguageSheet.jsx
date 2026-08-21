// ════════════════════════════════════════════════════════════════
//  Report Definition: كشف حصر وتوزيع طلاب اللغة الأجنبية الثانية
// ════════════════════════════════════════════════════════════════
import React from 'react';
import { sortStudentsByGenderAndName } from '../../../utils/studentSorter';

function SecondLanguageSheetPreview({ students = [], meta = {}, schoolInfo = {} }) {
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

  // تجميع إحصائية اللغات الثانية
  const langStats = React.useMemo(() => {
    let french = 0, german = 0, italian = 0, spanish = 0, other = 0;
    students.forEach(s => {
      const l = (s.second_language || s.second_language_name || s.second_lang || s.language_2 || '').trim();
      if (l.includes('ألمان') || l.includes('المان') || l.toLowerCase().includes('german')) german++;
      else if (l.includes('إيطال') || l.includes('ايطال') || l.toLowerCase().includes('italian')) italian++;
      else if (l.includes('إسبان') || l.includes('اسبان') || l.toLowerCase().includes('spanish')) spanish++;
      else if (l.includes('فرنس') || l.toLowerCase().includes('french')) french++;
      else if (l) other++;
      else french++; // افتراضي في المدارس المصرية
    });
    return { french, german, italian, spanish, other, total: students.length };
  }, [students]);

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
            كشف حصر وتوزيع طلاب اللغة الأجنبية الثانية
          </h2>
          <div className="report-subtitle-meta" style={{ fontSize: '12.5pt', fontWeight: 800, color: '#1e293b', marginTop: 3 }}>
            {selectedGrade?.grade_name_ar || 'جميع الصفوف'} {classroomLabel || selectedClassroom?.class_name ? `| فصل: ${classroomLabel || selectedClassroom?.class_name}` : ''} | إجمالي الطلاب: <strong>{students.length}</strong>
          </div>
        </div>

        <div className="header-col-left" style={{ textAlign: 'left', fontSize: '12.5pt', fontWeight: 700, width: '30%', lineHeight: 1.5 }}>
          <div>العام الدراسي: <strong>{academicYearLabel} م</strong></div>
          <div>تاريخ الاعتماد: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></div>
          <div>كود الكشف: <strong>NEP-2ND-LANG</strong></div>
        </div>
      </div>

      {/* ══ جدول توزيع الطلاب ══ */}
      <div className="register-table-wrap" style={{ marginTop: 8, overflowX: 'hidden' }}>
        <table className="register-table" style={{ fontSize: '11pt', borderCollapse: 'collapse', width: '100%', direction: 'rtl', border: '1.5px solid #000' }}>
          <thead>
            <tr style={{ background: '#0f766e', color: '#fff', fontWeight: 900, fontSize: '11.5pt' }}>
              <th style={{ border: '1.5px solid #000', padding: '6px 3px', width: 28, textAlign: 'center' }}>م</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'right', width: '30%' }}>اسم الطالب بالكامل</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 3px', width: 125, textAlign: 'center' }}>الرقم القومي</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 3px', width: 50, textAlign: 'center' }}>النوع</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 3px', width: 95, textAlign: 'center' }}>الصف الدراسي</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 3px', width: 65, textAlign: 'center' }}>الفصل</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 4px', width: 130, textAlign: 'center', background: '#0d9488' }}>اللغة الأجنبية الثانية</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 3px', width: 75, textAlign: 'center' }}>حالة القيد</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 4px', textAlign: 'center' }}>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.map((s, idx) => {
              const lang = (s.second_language || s.second_language_name || s.second_lang || s.language_2 || 'فرنسي').trim();
              return (
                <tr key={s.id || idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : '#fff' }}>
                  <td style={{ border: '1px solid #000', padding: '5px 2px', textAlign: 'center', fontWeight: 800 }}>{idx + 1}</td>
                  <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'right', fontWeight: 800, fontSize: '11.5pt', whiteSpace: 'nowrap' }}>{s.full_name_ar}</td>
                  <td style={{ border: '1px solid #000', padding: '5px 2px', textAlign: 'center', fontFamily: 'monospace', fontSize: '10.5pt', whiteSpace: 'nowrap' }} dir="ltr">{s.national_id || '—'}</td>
                  <td style={{ border: '1px solid #000', padding: '5px 2px', textAlign: 'center', fontSize: '10.5pt', whiteSpace: 'nowrap' }}>{s.gender || '—'}</td>
                  <td style={{ border: '1px solid #000', padding: '5px 2px', textAlign: 'center', fontSize: '10.5pt', whiteSpace: 'nowrap' }}>{s.grade_name_ar || selectedGrade?.grade_name_ar || '—'}</td>
                  <td style={{ border: '1px solid #000', padding: '5px 2px', textAlign: 'center', fontWeight: 800, fontSize: '10.5pt', whiteSpace: 'nowrap' }}>{s.classroom_name || classroomLabel || selectedClassroom?.class_name || '—'}</td>
                  <td style={{ border: '1px solid #000', padding: '5px 3px', textAlign: 'center', fontWeight: 900, background: '#f0fdfa', color: '#0f766e', fontSize: '12pt', whiteSpace: 'nowrap' }}>
                    {lang}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '5px 2px', textAlign: 'center', fontSize: '10.5pt', whiteSpace: 'nowrap' }}>
                    {s.enrollment_status || s.status || 'منقول'}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '5px 3px', textAlign: 'center', fontSize: '10pt', wordBreak: 'break-word' }}>{s.notes || ''}</td>
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 25, color: '#6b7280', fontSize: '12pt' }}>
                  يرجى اختيار الصف والفصل للبدء في عرض وطباعة كشف اللغة الثانية
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ══ بطاقة الإحصاء التلخيصي لتوزيع اللغات ══ */}
      <div style={{
        marginTop: 10,
        padding: '8px 14px',
        border: '1.5px solid #000',
        borderRadius: 4,
        background: '#f8fafc',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11.5pt',
        fontWeight: 800
      }}>
        <div>📊 <strong>إحصاء توزيع اللغات:</strong></div>
        <div>🇫🇷 لغة فرنسية: <strong style={{ color: '#0369a1' }}>{langStats.french}</strong></div>
        <div>🇩🇪 لغة ألمانية: <strong style={{ color: '#047857' }}>{langStats.german}</strong></div>
        <div>🇮🇹 لغة إيطالية: <strong style={{ color: '#b45309' }}>{langStats.italian}</strong></div>
        <div>🇪🇸 لغة إسبانية: <strong style={{ color: '#b91c1c' }}>{langStats.spanish}</strong></div>
        <div>الإجمالي العام: <strong style={{ textDecoration: 'underline', color: '#1e3a8a' }}>{langStats.total} طالباً</strong></div>
      </div>

      {/* ══ التذييل الرباعي الرسمي المعتمد ══ */}
      <div className="official-signatures-footer" style={{
        marginTop: 18,
        paddingTop: 8,
        borderTop: '2px solid #000',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        textAlign: 'center',
        fontSize: '12pt',
        fontWeight: 800
      }}>
        <div>
          <div>معلم المادة (اللغة الثانية)</div>
          <div style={{ marginTop: 18, color: '#000' }}>التوقيع: ..........................</div>
        </div>
        <div>
          <div>الأخصائي / شؤون الطلاب</div>
          <div style={{ marginTop: 18, color: '#000' }}>التوقيع: ..........................</div>
        </div>
        <div>
          <div>وكيل شؤون الطلاب والتعليم</div>
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

const secondLanguageSheet = {
  id:          'second-language-sheet',
  name:        'كشف حصر وتوزيع اللغة الأجنبية الثانية',
  desc:        'كشف تفصيلي بتوزيع الطلاب حسب اللغة الأجنبية الثانية المختارة (فرنسي، ألماني، إيطالي، إسباني) مع الإحصاء المجمع',
  category:    'قوائم وتوزيع الفصول',
  icon:        '🌍',
  orientation: 'landscape',
  available:   true,

  filters: {
    requiresGrade:   true,
    requiresYear:    true,
    requiresClass:   false,
    requiresSection: true,
    requiresStage:   true,
  },

  buildQuery: (f) => {
    const q = new URLSearchParams();
    if (f.academicYearId) q.set('academicYearId', f.academicYearId);
    if (f.sectionId)      q.set('sectionId', f.sectionId);
    if (f.stageId)        q.set('stageId', f.stageId);
    if (f.gradeId)        q.set('gradeId', f.gradeId);
    if (f.classId)        q.set('classId', f.classId);
    if (f.genderOrder && f.genderOrder !== 'none') q.set('genderOrder', f.genderOrder);
    q.set('limit', 'all');
    q.set('status', 'all');
    return q.toString();
  },

  excelEndpoint: (f) =>
    `/api/students/export/excel?academicYearId=${f.academicYearId || ''}&gradeId=${f.gradeId || ''}&classId=${f.classId || ''}`,

  excelFileName: () => 'كشف_توزيع_اللغة_الأجنبية_الثانية.xlsx',

  PreviewComponent: SecondLanguageSheetPreview,
};

export default secondLanguageSheet;
