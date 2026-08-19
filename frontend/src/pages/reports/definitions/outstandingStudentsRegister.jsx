// ════════════════════════════════════════════════════════════════
//  Report Definition: سجل الطلاب الموهوبين والفائقين
//  الكشف الرسمي لحصر ورعاية الطلاب الموهوبين في شتى المجالات (علمية، رياضية، فنية...)
// ════════════════════════════════════════════════════════════════
import React from 'react';
import RegisterStatsPage from '../RegisterStatsPage';

function getTalentDetails(s) {
  let domain = 'موهبة عامة وتفوق';
  let desc = s.talent_description || '';
  let achievement = 'مشارك في الأنشطة المدرسية';

  if (s.special_cases_names) {
    if (s.special_cases_names.includes('رياضي')) {
      domain = 'موهبة رياضية وبطولات';
    } else if (s.special_cases_names.includes('قرآن')) {
      domain = 'حفظ القرآن الكريم وتجويده';
    } else if (s.special_cases_names.includes('فني')) {
      domain = 'موهبة فنية وتشكيلية';
    } else if (s.special_cases_names.includes('وطني') || s.special_cases_names.includes('منحة')) {
      domain = 'تفوق علمي وأكاديمي';
    }
  }

  if (s.talent_description) {
    const td = s.talent_description.toLowerCase();
    if (td.includes('رسم') || td.includes('فن') || td.includes('عزف') || td.includes('مسرح')) {
      domain = 'موهبة فنية وثقافية';
    } else if (td.includes('سباح') || td.includes('كرة') || td.includes('كاراتيه') || td.includes('جمباز') || td.includes('رياض')) {
      domain = 'موهبة رياضية وبطولات';
    } else if (td.includes('قرآن') || td.includes('دين') || td.includes('تلاوة')) {
      domain = 'حفظ القرآن الكريم';
    } else if (td.includes('برمج') || td.includes('روبوت') || td.includes('ذكاء') || td.includes('علوم') || td.includes('رياضيات')) {
      domain = 'موهبة علمية وتكنولوجية';
    } else if (td.includes('إلقاء') || td.includes('شعر') || td.includes('خطابة') || td.includes('كتابة')) {
      domain = 'موهبة أدبية ولغوية';
    }
  }

  return {
    domain,
    desc: desc || (s.special_cases_names ? `حالة معتمدة: ${s.special_cases_names}` : 'موهوب ومعتمد بقسم رعاية الموهوبين'),
    achievement: achievement
  };
}

function OutstandingStudentsPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear } = meta;

  const cleanSchool = (schoolInfo.schoolName || '').replace(/^مدرسة\s*/, '').trim();
  const rawAdmin = schoolInfo.directorate || '';
  const cleanAdmin = rawAdmin.replace(/التعليمية\s*$/, '').trim();
  const governorate = schoolInfo.governorate || 'الجيزة';
  const academicYear = selectedYear?.year_label || schoolInfo.academicYear || '2025/2026';

  // Filter only talented / gifted students
  const talentedStudents = students.filter(s => 
    s.is_talented === 1 || 
    s.is_talented === true || 
    (s.talent_description && s.talent_description.trim() !== '') ||
    (s.special_cases_names && (
      s.special_cases_names.includes('موهب') || 
      s.special_cases_names.includes('رياض') || 
      s.special_cases_names.includes('فن') || 
      s.special_cases_names.includes('قرآن') || 
      s.special_cases_names.includes('تفوق')
    ))
  );

  // Category counts
  const sportsCount = talentedStudents.filter(s => getTalentDetails(s).domain.includes('رياضي')).length;
  const scientificCount = talentedStudents.filter(s => getTalentDetails(s).domain.includes('علمي') || getTalentDetails(s).domain.includes('أكاديمي')).length;
  const artsQuranCount = talentedStudents.filter(s => getTalentDetails(s).domain.includes('فني') || getTalentDetails(s).domain.includes('قرآن') || getTalentDetails(s).domain.includes('أدبي')).length;

  return (
    <div className="report-preview" id="print-area" data-orientation="landscape">
      <div className="printable-page-block" style={{ padding: '10px 14px', boxSizing: 'border-box' }}>
        
        {/* Standard Ministerial 3-Column Header */}
        <div className="report-official-header" style={{ marginBottom: 8, paddingBottom: 6, borderBottom: '1.5px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="header-col-right" style={{ textAlign: 'right', fontSize: 11, lineHeight: 1.35, fontWeight: 700 }}>
            <div>جمهورية مصر العربية</div>
            <div>وزارة التربية والتعليم والتعليم الفني</div>
            <div>مديرية: <strong>{governorate || '................'}</strong> | إدارة: <strong>{cleanAdmin ? `${cleanAdmin} التعليمية` : '................'}</strong></div>
            <div>مدرسة: <strong>{cleanSchool || '................'}</strong></div>
          </div>

          <div className="header-col-center" style={{ textAlign: 'center', flex: 1 }}>
            <h2 className="report-title-main" style={{ fontSize: 16, fontWeight: 900, margin: 0, textDecoration: 'underline', color: '#0f172a' }}>
              سجل حصر ورعاية الطلاب الموهوبين والفائقين
            </h2>
            <div className="report-subtitle-meta" style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginTop: 2 }}>
              {selectedGrade?.grade_name_ar ? `للصف: ${selectedGrade.grade_name_ar}` : 'لجميع الصفوف الدراسية'} | العام الدراسي: <strong>{academicYear}</strong> | إجمالي الموهوبين: <strong>{talentedStudents.length}</strong> طالب
            </div>
          </div>

          <div className="header-col-left" style={{ textAlign: 'left' }}>
            {schoolInfo.logoUrl ? (
              <img src={schoolInfo.logoUrl} alt="Logo" style={{ maxHeight: 38, maxWidth: 80, objectFit: 'contain' }} />
            ) : (
              <div style={{ border: '1px dashed #94a3b8', borderRadius: 4, padding: '2px 5px', fontSize: 9, color: '#64748b', textAlign: 'center', background: '#f8fafc' }}>
                شعار المدرسة
              </div>
            )}
            <div style={{ fontSize: 8.5, color: '#64748b', marginTop: 2 }}>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: '#047857' }}>استمارة رعاية الموهوبين</div>
          </div>
        </div>

        {/* Metric Badges */}
        <div style={{ display: 'flex', gap: 10, margin: '6px 0 10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ padding: '3px 12px', background: '#1e293b', color: '#fff', borderRadius: 5, fontSize: 10.5, fontWeight: 800 }}>
            إجمالي الموهوبين: <span style={{ fontSize: 12.5, marginRight: 4 }}>{talentedStudents.length}</span>
          </div>
          <div style={{ padding: '3px 12px', background: '#2563eb', color: '#fff', borderRadius: 5, fontSize: 10.5, fontWeight: 800 }}>
            علمي وتكنولوجي: <span style={{ fontSize: 12.5, marginRight: 4 }}>{scientificCount}</span>
          </div>
          <div style={{ padding: '3px 12px', background: '#059669', color: '#fff', borderRadius: 5, fontSize: 10.5, fontWeight: 800 }}>
            رياضي وبطولات: <span style={{ fontSize: 12.5, marginRight: 4 }}>{sportsCount}</span>
          </div>
          <div style={{ padding: '3px 12px', background: '#d97706', color: '#fff', borderRadius: 5, fontSize: 10.5, fontWeight: 800 }}>
            فني وأدبي وقرآن: <span style={{ fontSize: 12.5, marginRight: 4 }}>{artsQuranCount}</span>
          </div>
        </div>

        {/* Talented Students Main Table */}
        <div className="register-table-wrap" style={{ width: '100%', overflowX: 'hidden' }}>
          <table className="register-table" dir="rtl" style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', fontSize: 9.5, textAlign: 'center' }}>
            <thead>
              <tr style={{ background: '#e2e8f0', color: '#000', fontWeight: 900 }}>
                <th style={{ border: '1px solid #000', padding: '4px 2px', width: 30 }}>م</th>
                <th style={{ border: '1px solid #000', padding: '4px 4px', width: 75 }}>كود الطالب</th>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', minWidth: 140 }}>اسم الطالب بالكامل</th>
                <th style={{ border: '1px solid #000', padding: '4px 2px', width: 80 }}>الصف / الفصل</th>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', width: 130 }}>مجال الموهبة / التصنيف</th>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', minWidth: 150 }}>توصيف الموهبة والأنشطة</th>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', width: 120 }}>بيانات التواصل مع ولي الأمر</th>
                <th style={{ border: '1px solid #000', padding: '4px 4px', width: 85 }}>خطة الرعاية والمتابعة</th>
              </tr>
            </thead>
            <tbody>
              {talentedStudents.length > 0 ? (
                talentedStudents.map((s, idx) => {
                  const talent = getTalentDetails(s);
                  return (
                    <tr key={s.id || idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : '#fff' }}>
                      <td style={{ border: '1px solid #000', padding: '3px 2px', fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #000', padding: '3px 2px', fontFamily: 'monospace', fontSize: 9 }}>{s.student_code || '—'}</td>
                      <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'right', fontWeight: 800 }}>{s.full_name_ar}</td>
                      <td style={{ border: '1px solid #000', padding: '3px 2px', fontSize: 9 }}>{s.grade_name_ar || '—'} ({s.classroom_name || '—'})</td>
                      <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'right', fontWeight: 800, color: '#1e3a8a', background: '#eff6ff' }}>
                        {talent.domain}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'right', fontSize: 9, color: '#0f172a' }}>
                        {talent.desc}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'right', fontSize: 8.5 }}>
                        <div>{s.guardian_name || s.parent_name || '—'}</div>
                        <div style={{ color: '#64748b', fontFamily: 'monospace' }} dir="ltr">{s.guardian_phone || s.student_phone || '—'}</div>
                      </td>
                      <td style={{ border: '1px solid #000', padding: '3px 4px', fontSize: 8.5, color: '#059669', fontWeight: 700 }}>
                        مُدرج بالرعاية المدرسية
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#64748b', fontWeight: 700 }}>
                    لا توجد بيانات طلاب موهوبين مسجلة في هذا البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4-Part Official Ministerial Footer */}
        <div className="official-signatures-footer" style={{ marginTop: 16, paddingTop: 6, borderTop: '1px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, fontWeight: 800 }}>
          <div>مسؤول رعاية الموهوبين والأنشطة: ..........................</div>
          <div>الأخصائي الاجتماعي / النفسي: ..........................</div>
          <div>وكيل شؤون الطلاب: ..........................</div>
          <div>يعتمد مدير المدرسة وخاتم الشعار: ..........................</div>
        </div>

      </div>

      {/* Page 2: Summary Stats */}
      <RegisterStatsPage
        title="سجل الطلاب الموهوبين والفائقين"
        subTitle={selectedGrade?.grade_name_ar ? `للصف: ${selectedGrade.grade_name_ar}` : ''}
        registerCode="استمارة رعاية الموهوبين"
        students={talentedStudents}
        meta={meta}
        schoolInfo={schoolInfo}
        pageIndex={2}
        totalPages={2}
      />
    </div>
  );
}

const outstandingStudentsRegister = {
  id:          'outstanding-students-register',
  name:        'سجل الطلاب الموهوبين والفائقين',
  desc:        'سجل حصر ورعاية الطلاب الموهوبين والفائقين مع بيان مجالات الموهبة والتوصيف وخطة الرعاية المدرسية',
  category:    'السجلات المتخصصة',
  icon:        '🏆',
  orientation: 'landscape',
  available:   true,

  filters: {
    requiresGrade: false,
    showClass:     true,
  },

  buildQuery: (f) => {
    const q = new URLSearchParams({
      limit: 'all',
      status: 'all',
      isTalented: 'true'
    });
    if (f.academicYearId) q.set('academicYearId', f.academicYearId);
    if (f.sectionId)      q.set('sectionId', f.sectionId);
    if (f.stageId)        q.set('stageId', f.stageId);
    if (f.gradeId && f.gradeId !== 'all_stage') q.set('gradeId', f.gradeId);
    if (f.classId && f.classId !== 'all_grade' && f.classId !== 'all') q.set('classId', f.classId);
    return q.toString();
  },

  excelEndpoint: (f) =>
    `/api/students/export/excel?academicYearId=${f.academicYearId || ''}&isTalented=true`,

  excelFileName: (f, meta) =>
    `سجل_الموهوبين_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  PreviewComponent: OutstandingStudentsPreview,
};

export default outstandingStudentsRegister;
