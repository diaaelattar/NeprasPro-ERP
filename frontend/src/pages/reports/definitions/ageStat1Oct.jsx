// ════════════════════════════════════════════════════════════════
//  Report Definition: إحصاء السن في 1 أكتوبر الرسمي (مصفوفة الفئات العمرية)
//  توزيع تكراري رسمي للسن في أول أكتوبر حسب المراحل والصفوف (بنين / بنات / جملة)
// ════════════════════════════════════════════════════════════════
import React, { useState, useMemo } from 'react';
import { calculateAgeOnOct1st } from '../../../constants/lookupOptions';

// دالة تحويل الأرقام إلى أرقام عربية مشرقية مطابقة لنموذج الوزارة
const toArNum = (num) => {
  if (num === 0 || num === '0' || num === null || num === undefined || num === '') return '-';
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (d) => digits[d]);
};

// الفئات العمرية القياسية المعتمدة من وزارة التربية والتعليم
const AGE_BRACKETS = [
  { id: 'under_6', label: 'أقل من ٦ سنوات', min: 0, max: 5.999 },
  { id: 'age_6',   label: '٦ إلى أقل من ٧',  min: 6, max: 6.999 },
  { id: 'age_7',   label: '٧ إلى أقل من ٨',  min: 7, max: 7.999 },
  { id: 'age_8',   label: '٨ إلى أقل من ٩',  min: 8, max: 8.999 },
  { id: 'age_9',   label: '٩ إلى أقل من ١٠', min: 9, max: 9.999 },
  { id: 'age_10',  label: '١٠ إلى أقل من ١١', min: 10, max: 10.999 },
  { id: 'age_11',  label: '١١ إلى أقل من ١٢', min: 11, max: 11.999 },
  { id: 'age_12',  label: '١٢ إلى أقل من ١٣', min: 12, max: 12.999 },
  { id: 'age_13',  label: '١٣ إلى أقل من ١٤', min: 13, max: 13.999 },
  { id: 'age_14',  label: '١٤ إلى أقل من ١٥', min: 14, max: 14.999 },
  { id: 'age_15',  label: '١٥ إلى أقل من ١٦', min: 15, max: 15.999 },
  { id: 'age_16',  label: '١٦ إلى أقل من ١٧', min: 16, max: 16.999 },
  { id: 'age_17',  label: '١٧ إلى أقل من ١٨', min: 17, max: 17.999 },
  { id: 'over_18', label: '١٨ سنة فأكثر',    min: 18, max: 99 },
];

function AgeStat1OctPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear } = meta;
  const [viewMode, setViewMode] = useState('matrix'); // 'matrix' or 'detailed'

  const cleanSchool = (schoolInfo.schoolName || '').replace(/^مدرسة\s*/, '').trim();
  const rawAdmin = schoolInfo.directorate || '';
  const cleanAdmin = rawAdmin.replace(/التعليمية\s*$/, '').trim();
  const governorate = schoolInfo.governorate || 'الجيزة';
  const academicYear = selectedYear?.year_label || schoolInfo.academicYear || '2025/2026';

  // Compute Ages & Group by Stage and Grade
  const { stagesData, activeBrackets, grandTotal } = useMemo(() => {
    const computedStudents = students.map(s => {
      const age = calculateAgeOnOct1st(s.birth_date || s.national_id, academicYear);
      const exactYears = age.years !== '' ? Number(age.years) + (Number(age.months || 0) / 12) + (Number(age.days || 0) / 365) : null;
      return { ...s, ageObj: age, exactYears };
    });

    // Check which age brackets have students (to keep matrix clean and compact)
    const presentBracketIds = new Set();
    computedStudents.forEach(s => {
      if (s.exactYears !== null) {
        const b = AGE_BRACKETS.find(br => s.exactYears >= br.min && s.exactYears <= br.max);
        if (b) presentBracketIds.add(b.id);
      }
    });

    // Filter brackets to show only relevant or standard range
    let filteredBrackets = AGE_BRACKETS.filter(b => presentBracketIds.has(b.id));
    if (filteredBrackets.length === 0) filteredBrackets = AGE_BRACKETS.slice(0, 8);

    // Grouping by Stage and Grade
    const stagesMap = new Map();
    const gTotal = {
      boys: 0,
      girls: 0,
      total: 0,
      byBracket: Object.fromEntries(filteredBrackets.map(b => [b.id, { boys: 0, girls: 0, total: 0 }]))
    };

    computedStudents.forEach(s => {
      const stageName = (s.stage_name || 'المرحلة الدراسية').trim();
      const stageId = s.stage_id || stageName;
      const gradeName = (s.grade_name_ar || 'الصف').trim();
      const gradeId = s.grade_id || gradeName;

      if (!stagesMap.has(stageId)) {
        stagesMap.set(stageId, {
          stageId,
          stageName,
          gradesMap: new Map(),
          subtotal: {
            boys: 0, girls: 0, total: 0,
            byBracket: Object.fromEntries(filteredBrackets.map(b => [b.id, { boys: 0, girls: 0, total: 0 }]))
          }
        });
      }

      const stg = stagesMap.get(stageId);
      if (!stg.gradesMap.has(gradeId)) {
        stg.gradesMap.set(gradeId, {
          gradeId,
          gradeName,
          boys: 0,
          girls: 0,
          total: 0,
          byBracket: Object.fromEntries(filteredBrackets.map(b => [b.id, { boys: 0, girls: 0, total: 0 }])),
          studentsList: []
        });
      }

      const grd = stg.gradesMap.get(gradeId);
      const isBoy = (s.gender || '').trim() === 'ذكر' || (s.gender || '').trim() === 'بنين';

      // Counts
      if (isBoy) {
        grd.boys++;
        stg.subtotal.boys++;
        gTotal.boys++;
      } else {
        grd.girls++;
        stg.subtotal.girls++;
        gTotal.girls++;
      }
      grd.total++;
      stg.subtotal.total++;
      gTotal.total++;

      // Age bracket placement
      if (s.exactYears !== null) {
        const bracket = filteredBrackets.find(br => s.exactYears >= br.min && s.exactYears <= br.max);
        if (bracket && grd.byBracket[bracket.id]) {
          if (isBoy) {
            grd.byBracket[bracket.id].boys++;
            stg.subtotal.byBracket[bracket.id].boys++;
            gTotal.byBracket[bracket.id].boys++;
          } else {
            grd.byBracket[bracket.id].girls++;
            stg.subtotal.byBracket[bracket.id].girls++;
            gTotal.byBracket[bracket.id].girls++;
          }
          grd.byBracket[bracket.id].total++;
          stg.subtotal.byBracket[bracket.id].total++;
          gTotal.byBracket[bracket.id].total++;
        }
      }

      grd.studentsList.push(s);
    });

    const stagesResult = Array.from(stagesMap.values()).map(stg => ({
      ...stg,
      grades: Array.from(stg.gradesMap.values())
    }));

    return {
      stagesData: stagesResult,
      activeBrackets: filteredBrackets,
      grandTotal: gTotal
    };
  }, [students, academicYear]);

  return (
    <div className="report-preview printable-page-block" id="print-area" data-orientation="landscape" style={{
      padding: '12px 16px',
      background: '#fff',
      color: '#000',
      fontFamily: 'Cairo, Tahoma, Arial, sans-serif'
    }}>
      {/* ══ الترويسة الثلاثية القياسية الرسمية ══ */}
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
            إحصاء السن في أول أكتوبر لتلاميذ المدرسة (التوزيع التكراري للأعمار)
          </h2>
          <div className="report-subtitle-meta" style={{ fontSize: '12pt', fontWeight: 800, color: '#1e293b', marginTop: 3 }}>
            العام الدراسي: <strong>{academicYear} م</strong> | في 1 أكتوبر | إجمالي الطلاب: <strong>{students.length}</strong> طالب
          </div>
        </div>

        <div className="header-col-left" style={{ textAlign: 'left', fontSize: '12.5pt', fontWeight: 700, width: '30%', lineHeight: 1.5 }}>
          <div>العام الدراسي: <strong>{academicYear} م</strong></div>
          <div>تاريخ الاعتماد: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></div>
          <div>كود الاستمارة: <strong>NEP-AGE-OCTOBER</strong></div>
        </div>
      </div>

        {/* View Mode Toggle (No-print) */}
        <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 8, justifyContent: 'flex-start' }}>
          <button
            onClick={() => setViewMode('matrix')}
            style={{
              padding: '4px 12px',
              borderRadius: 5,
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              background: viewMode === 'matrix' ? '#1e293b' : '#f1f5f9',
              color: viewMode === 'matrix' ? '#fff' : '#334155',
              border: '1px solid #cbd5e1'
            }}
          >
            📊 مصفوفة الإحصاء الرسمي المجمع
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            style={{
              padding: '4px 12px',
              borderRadius: 5,
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              background: viewMode === 'detailed' ? '#1e293b' : '#f1f5f9',
              color: viewMode === 'detailed' ? '#fff' : '#334155',
              border: '1px solid #cbd5e1'
            }}
          >
            📋 الكشف التفصيلي بأسماء الطلاب وتاريخ الميلاد
          </button>
        </div>

        {/* ══ 1. OFFICIAL AGGREGATE MATRIX VIEW ══ */}
        {viewMode === 'matrix' ? (
          <div className="register-table-wrap" style={{ width: '100%', overflowX: 'auto' }}>
            <table className="register-table" dir="rtl" style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', fontSize: 9.5, textAlign: 'center' }}>
              <thead>
                <tr style={{ background: '#e2e8f0', color: '#000', fontWeight: 900 }}>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '3px 2px', width: 28 }}>م</th>
                  <th rowSpan="2" style={{ border: '1px solid #000', padding: '3px 4px', minWidth: 100 }}>المرحلة والصف الدراسي</th>
                  {activeBrackets.map(b => (
                    <th key={b.id} colSpan="3" style={{ border: '1px solid #000', padding: '3px 2px', background: '#cbd5e1', fontSize: 9 }}>
                      {b.label}
                    </th>
                  ))}
                  <th colSpan="3" style={{ border: '1px solid #000', padding: '3px 2px', background: '#93c5fd', fontWeight: 900 }}>
                    الجملة العامة
                  </th>
                </tr>
                <tr style={{ background: '#f1f5f9', color: '#000', fontWeight: 800, fontSize: 8.5 }}>
                  {activeBrackets.map(b => (
                    <React.Fragment key={b.id}>
                      <th style={{ border: '1px solid #000', padding: '2px 1px', width: 26 }}>بنين</th>
                      <th style={{ border: '1px solid #000', padding: '2px 1px', width: 26 }}>بنات</th>
                      <th style={{ border: '1px solid #000', padding: '2px 1px', width: 28, background: '#e2e8f0', fontWeight: 900 }}>جملة</th>
                    </React.Fragment>
                  ))}
                  <th style={{ border: '1px solid #000', padding: '2px 2px', width: 34, background: '#dbeafe' }}>بنين</th>
                  <th style={{ border: '1px solid #000', padding: '2px 2px', width: 34, background: '#dbeafe' }}>بنات</th>
                  <th style={{ border: '1px solid #000', padding: '2px 2px', width: 38, background: '#bfdbfe', fontWeight: 900 }}>الجملة</th>
                </tr>
              </thead>
              <tbody>
                {stagesData.length > 0 ? (
                  stagesData.map((stg, sIdx) => (
                    <React.Fragment key={stg.stageId || sIdx}>
                      {stg.grades.map((grd, gIdx) => (
                        <tr key={grd.gradeId || gIdx} style={{ background: gIdx % 2 === 1 ? '#f8fafc' : '#fff' }}>
                          <td style={{ border: '1px solid #000', padding: '2px', fontWeight: 700 }}>{gIdx + 1}</td>
                          <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: 800 }}>
                            {grd.gradeName}
                          </td>
                          {activeBrackets.map(b => {
                            const val = grd.byBracket[b.id] || { boys: 0, girls: 0, total: 0 };
                            return (
                              <React.Fragment key={b.id}>
                                <td style={{ border: '1px solid #000', padding: '2px 1px' }}>{toArNum(val.boys)}</td>
                                <td style={{ border: '1px solid #000', padding: '2px 1px' }}>{toArNum(val.girls)}</td>
                                <td style={{ border: '1px solid #000', padding: '2px 1px', fontWeight: 800, background: '#f1f5f9' }}>{toArNum(val.total)}</td>
                              </React.Fragment>
                            );
                          })}
                          <td style={{ border: '1px solid #000', padding: '2px 2px', fontWeight: 800, background: '#eff6ff' }}>{toArNum(grd.boys)}</td>
                          <td style={{ border: '1px solid #000', padding: '2px 2px', fontWeight: 800, background: '#eff6ff' }}>{toArNum(grd.girls)}</td>
                          <td style={{ border: '1px solid #000', padding: '2px 2px', fontWeight: 900, background: '#dbeafe' }}>{toArNum(grd.total)}</td>
                        </tr>
                      ))}
                      {/* Stage Subtotal */}
                      <tr style={{ background: '#fef3c7', fontWeight: 900, borderTop: '1.5px solid #000' }}>
                        <td colSpan="2" style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'right' }}>
                          إجمالي {stg.stageName}
                        </td>
                        {activeBrackets.map(b => {
                          const val = stg.subtotal.byBracket[b.id] || { boys: 0, girls: 0, total: 0 };
                          return (
                            <React.Fragment key={b.id}>
                              <td style={{ border: '1px solid #000', padding: '2px 1px' }}>{toArNum(val.boys)}</td>
                              <td style={{ border: '1px solid #000', padding: '2px 1px' }}>{toArNum(val.girls)}</td>
                              <td style={{ border: '1px solid #000', padding: '2px 1px', fontWeight: 900 }}>{toArNum(val.total)}</td>
                            </React.Fragment>
                          );
                        })}
                        <td style={{ border: '1px solid #000', padding: '2px 2px' }}>{toArNum(stg.subtotal.boys)}</td>
                        <td style={{ border: '1px solid #000', padding: '2px 2px' }}>{toArNum(stg.subtotal.girls)}</td>
                        <td style={{ border: '1px solid #000', padding: '2px 2px', background: '#fde68a' }}>{toArNum(stg.subtotal.total)}</td>
                      </tr>
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={activeBrackets.length * 3 + 5} style={{ textAlign: 'center', padding: 24, color: '#64748b', fontWeight: 700 }}>
                      لا توجد بيانات مسجلة مطابقة لفلاتر البحث
                    </td>
                  </tr>
                )}
              </tbody>
              {/* Grand Total Footer Row */}
              <tfoot>
                <tr style={{ background: '#cbd5e1', color: '#000', fontWeight: 900, borderTop: '2px solid #000' }}>
                  <td colSpan="2" style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', fontSize: 10 }}>
                    الإجمالي العام للمدرسة بالكامل
                  </td>
                  {activeBrackets.map(b => {
                    const val = grandTotal.byBracket[b.id] || { boys: 0, girls: 0, total: 0 };
                    return (
                      <React.Fragment key={b.id}>
                        <td style={{ border: '1px solid #000', padding: '2px 1px' }}>{toArNum(val.boys)}</td>
                        <td style={{ border: '1px solid #000', padding: '2px 1px' }}>{toArNum(val.girls)}</td>
                        <td style={{ border: '1px solid #000', padding: '2px 1px', fontWeight: 900 }}>{toArNum(val.total)}</td>
                      </React.Fragment>
                    );
                  })}
                  <td style={{ border: '1px solid #000', padding: '2px 2px', background: '#bfdbfe' }}>{toArNum(grandTotal.boys)}</td>
                  <td style={{ border: '1px solid #000', padding: '2px 2px', background: '#bfdbfe' }}>{toArNum(grandTotal.girls)}</td>
                  <td style={{ border: '1px solid #000', padding: '2px 2px', background: '#93c5fd', fontSize: 10.5 }}>{toArNum(grandTotal.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          /* ══ 2. DETAILED STUDENT AGES LIST ══ */
          <div className="register-table-wrap" style={{ width: '100%', overflowX: 'hidden' }}>
            <table className="register-table" dir="rtl" style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', fontSize: 9.5, textAlign: 'center' }}>
              <thead>
                <tr style={{ background: '#e2e8f0', color: '#000', fontWeight: 800 }}>
                  <th rowSpan={2} style={{ border: '1px solid #000', width: 30 }}>م</th>
                  <th rowSpan={2} style={{ border: '1px solid #000', width: 80 }}>كود الطالب</th>
                  <th rowSpan={2} style={{ border: '1px solid #000', textAlign: 'right', width: 150 }}>اسم الطالب بالكامل</th>
                  <th rowSpan={2} style={{ border: '1px solid #000', width: 110 }}>الرقم القومي</th>
                  <th rowSpan={2} style={{ border: '1px solid #000', width: 50 }}>النوع</th>
                  <th rowSpan={2} style={{ border: '1px solid #000', width: 85 }}>تاريخ الميلاد</th>
                  <th colSpan={3} style={{ border: '1px solid #000', background: '#cbd5e1' }}>السن في 1 أكتوبر</th>
                  <th rowSpan={2} style={{ border: '1px solid #000', width: 85 }}>الصف الدراسي</th>
                  <th rowSpan={2} style={{ border: '1px solid #000', width: 75 }}>الفصل</th>
                </tr>
                <tr style={{ background: '#f1f5f9', fontWeight: 800, fontSize: 8.5 }}>
                  <th style={{ border: '1px solid #000', width: 35 }}>سنة</th>
                  <th style={{ border: '1px solid #000', width: 35 }}>شهر</th>
                  <th style={{ border: '1px solid #000', width: 35 }}>يوم</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => {
                  const age = calculateAgeOnOct1st(s.birth_date || s.national_id, academicYear);
                  return (
                    <tr key={s.id || idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : '#fff' }}>
                      <td style={{ border: '1px solid #000', padding: '2px' }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #000', fontFamily: 'monospace', fontSize: 9 }}>{s.student_code || '—'}</td>
                      <td style={{ border: '1px solid #000', textAlign: 'right', fontWeight: 800, padding: '2px 4px' }}>{s.full_name_ar}</td>
                      <td style={{ border: '1px solid #000', fontFamily: 'monospace', fontSize: 9 }} dir="ltr">{s.national_id || '—'}</td>
                      <td style={{ border: '1px solid #000' }}>{s.gender || '—'}</td>
                      <td style={{ border: '1px solid #000', fontFamily: 'monospace', fontSize: 9 }} dir="ltr">{s.birth_date || '—'}</td>
                      <td style={{ border: '1px solid #000', fontWeight: 800 }}>{age.years !== '' ? age.years : '—'}</td>
                      <td style={{ border: '1px solid #000', fontWeight: 800 }}>{age.months !== '' ? age.months : '—'}</td>
                      <td style={{ border: '1px solid #000', fontWeight: 800 }}>{age.days !== '' ? age.days : '—'}</td>
                      <td style={{ border: '1px solid #000' }}>{s.grade_name_ar || '—'}</td>
                      <td style={{ border: '1px solid #000' }}>{s.classroom_name || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4-Part Official Ministerial Footer */}
        <div className="official-signatures-footer" style={{ marginTop: 14, paddingTop: 6, borderTop: '1px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, fontWeight: 800 }}>
          <div>مسؤول الإحصاء وشؤون الطلاب: ..........................</div>
          <div>المراجع والأخصائي: ..........................</div>
          <div>وكيل شؤون التعليم: ..........................</div>
          <div>يعتمد مدير المدرسة وخاتم الشعار: ..........................</div>
        </div>

      </div>
  );
}

const ageStat1Oct = {
  id:          'age-stat-1oct',
  name:        'إحصاء السن في 1 أكتوبر الرسمي (مصفوفة الأعمار)',
  desc:        'مصفوفة الإحصاء التكراري المجمعة لأعمار الطلاب في أول أكتوبر بنين وبنات لكل مرحلة وصف دراسي',
  category:    'الإحصائيات والتحليلات الرسمية',
  icon:        '🎂',
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
    });
    if (f.academicYearId) q.set('academicYearId', f.academicYearId);
    if (f.sectionId)      q.set('sectionId', f.sectionId);
    if (f.stageId)        q.set('stageId', f.stageId);
    if (f.gradeId && f.gradeId !== 'all_stage') q.set('gradeId', f.gradeId);
    if (f.classId && f.classId !== 'all_grade' && f.classId !== 'all') q.set('classId', f.classId);
    return q.toString();
  },

  excelEndpoint: (f) =>
    `/api/students/export/excel?academicYearId=${f.academicYearId || ''}&type=general-census`,

  excelFileName: (f, meta) =>
    `إحصاء_السن_في_1_أكتوبر_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  PreviewComponent: AgeStat1OctPreview,
};

export default ageStat1Oct;
