// ════════════════════════════════════════════════════════════════
//  Report Definition: إحصاء حالات القيد
//  الأعمدة: الصف - عدد الفصول - إجمالي المقيدين - بنون - بنات - مسلم - مسيحي - مستجد - منقول - باق - منقطع - وافد - عائد
// ════════════════════════════════════════════════════════════════
import React, { useMemo } from 'react';

// تحويل الأرقام الإنجليزية إلى أرقام عربية مشرقية رسمية
const toArNum = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '٠';
  const arDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (d) => arDigits[+d]);
};

function EnrollmentStatusCensusPreview({ students, meta, schoolInfo }) {
  const { formOpts } = meta;

  // استخراج العام الدراسي المعتمد والنشط حالياً
  const currentActiveYear = useMemo(() => {
    if (formOpts?.academicYears && formOpts.academicYears.length > 0) {
      const active = formOpts.academicYears.find(y => y.is_current === 1) || formOpts.academicYears[0];
      return active?.year_label || 'العام الحالي';
    }
    return 'العام الحالي';
  }, [formOpts]);

  // حساب التجميعات المتقدمة والمصفوفة الإحصائية
  const computedData = useMemo(() => {
    const stagesMap = new Map();

    (students || []).forEach(s => {
      const stageName = s.stage_name || 'المرحلة التعليمية';
      const stageId = s.stage_id || 1;
      const gradeName = s.grade_name_ar || s.grade_name || 'الصف';
      const gradeId = s.grade_id || 1;

      if (!stagesMap.has(stageId)) {
        stagesMap.set(stageId, {
          stageId,
          stageName,
          gradesMap: new Map()
        });
      }

      const stg = stagesMap.get(stageId);
      if (!stg.gradesMap.has(gradeId)) {
        stg.gradesMap.set(gradeId, {
          gradeId,
          gradeName,
          students: []
        });
      }

      stg.gradesMap.get(gradeId).students.push(s);
    });

    const stagesResult = [];
    const grandTotal = {
      classesCount: 0,
      total: 0,
      boys: 0,
      girls: 0,
      muslim: 0,
      christian: 0,
      newlyRegistered: 0, // مستجد
      transferred: 0,      // منقول
      repeater: 0,         // باق للإعادة
      disconnected: 0,     // منقطع
      foreigners: 0,       // وافد
      returnedAbroad: 0    // عائد
    };

    stagesMap.forEach(stg => {
      const gradesList = [];
      const stageSubtotal = {
        classesCount: 0,
        total: 0,
        boys: 0,
        girls: 0,
        muslim: 0,
        christian: 0,
        newlyRegistered: 0,
        transferred: 0,
        repeater: 0,
        disconnected: 0,
        foreigners: 0,
        returnedAbroad: 0
      };

      stg.gradesMap.forEach(grd => {
        const gradeStudents = grd.students;
        
        // حساب عدد الفصول
        const distinctClasses = new Set(gradeStudents.map(s => s.classroom_name || s.class_name || s.class_id || s.classroom_id).filter(Boolean));
        const classesCount = distinctClasses.size || (gradeStudents.length > 0 ? Math.ceil(gradeStudents.length / 35) : 0);

        let boys = 0;
        let girls = 0;
        let muslim = 0;
        let christian = 0;
        let newlyRegistered = 0;
        let transferred = 0;
        let repeater = 0;
        let disconnected = 0;
        let foreigners = 0;
        let returnedAbroad = 0;

        gradeStudents.forEach(s => {
          const isBoy = (s.gender || '').trim() === 'ذكر' || (s.gender || '').trim() === 'بنين';
          const isMuslim = (s.religion || '').trim().includes('مسلم');
          const isChristian = (s.religion || '').trim().includes('مسيح');

          // الوافد
          const isForeign = (s.nationality_id && s.nationality_id !== 1 && !(s.nationality_name || '').includes('مصر')) ||
                            (s.nationality_name && !s.nationality_name.includes('مصر') && s.nationality_name !== 'مصري');

          // العائد
          const isReturned = s.is_returned_from_abroad === 1 || Boolean(s.country_from);

          // حالة القيد والتسجيل
          const rawStatus = (s.status || '').trim().toLowerCase();
          const regStatus = (s.enrollment_status || '').trim().toLowerCase();
          const regId = Number(s.registration_status_id);

          let isDisc = false, isRep = false, isNew = false;

          if (regId === 5 || rawStatus === 'disconnected' || rawStatus === 'absent' || regStatus.includes('منقطع')) {
            isDisc = true;
          } else if (regId === 3 || rawStatus === 'retained' || rawStatus === 'repeater' || regStatus.includes('باق')) {
            isRep = true;
          } else if (regId === 1 || rawStatus === 'new' || regStatus.includes('مستجد')) {
            isNew = true;
          }

          if (isBoy) boys++; else girls++;
          if (isMuslim) muslim++; else if (isChristian) christian++; else muslim++;

          if (isDisc) disconnected++;
          else if (isRep) repeater++;
          else if (isNew) newlyRegistered++;
          else transferred++;

          if (isForeign) foreigners++;
          if (isReturned) returnedAbroad++;
        });

        const total = boys + girls;

        // تجميعات المرحلة
        stageSubtotal.classesCount += classesCount;
        stageSubtotal.total += total;
        stageSubtotal.boys += boys;
        stageSubtotal.girls += girls;
        stageSubtotal.muslim += muslim;
        stageSubtotal.christian += christian;
        stageSubtotal.newlyRegistered += newlyRegistered;
        stageSubtotal.transferred += transferred;
        stageSubtotal.repeater += repeater;
        stageSubtotal.disconnected += disconnected;
        stageSubtotal.foreigners += foreigners;
        stageSubtotal.returnedAbroad += returnedAbroad;

        gradesList.push({
          name: grd.gradeName,
          classesCount,
          total,
          boys,
          girls,
          muslim,
          christian,
          newlyRegistered,
          transferred,
          repeater,
          disconnected,
          foreigners,
          returnedAbroad
        });
      });

      // الإجمالي العام
      grandTotal.classesCount += stageSubtotal.classesCount;
      grandTotal.total += stageSubtotal.total;
      grandTotal.boys += stageSubtotal.boys;
      grandTotal.girls += stageSubtotal.girls;
      grandTotal.muslim += stageSubtotal.muslim;
      grandTotal.christian += stageSubtotal.christian;
      grandTotal.newlyRegistered += stageSubtotal.newlyRegistered;
      grandTotal.transferred += stageSubtotal.transferred;
      grandTotal.repeater += stageSubtotal.repeater;
      grandTotal.disconnected += stageSubtotal.disconnected;
      grandTotal.foreigners += stageSubtotal.foreigners;
      grandTotal.returnedAbroad += stageSubtotal.returnedAbroad;

      stagesResult.push({
        stageName: stg.stageName,
        grades: gradesList,
        subtotal: stageSubtotal
      });
    });

    return { stagesResult, grandTotal };
  }, [students]);

  const cellBorder = { border: '1.5px solid #000' };
  const thStyle = { ...cellBorder, background: '#e2e8f0', padding: '6px 2px', textAlign: 'center', fontWeight: 800, fontSize: '14px', color: '#0f172a' };
  const tdStyle = { ...cellBorder, padding: '5px 2px', textAlign: 'center', fontSize: '13px', color: '#000', fontWeight: 700 };
  const subtotalTdStyle = { ...cellBorder, background: '#cffafe', padding: '6px 2px', textAlign: 'center', fontSize: '14px', fontWeight: 800, color: '#000' };
  const grandTotalTdStyle = { ...cellBorder, background: '#93c5fd', padding: '7px 2px', textAlign: 'center', fontSize: '15px', fontWeight: 900, color: '#000' };

  return (
    <div className="report-preview" id="print-area" data-orientation="landscape" style={{ background: '#fff', color: '#000', fontFamily: "'Amiri', 'Segoe UI', Tahoma, sans-serif" }}>
      <div className="printable-page-block" style={{ padding: '10px 15px', minHeight: 'auto', boxSizing: 'border-box' }}>

        {/* ── الترويسة القياسية الرسمية للتقرير ────────────────────────────────────── */}
        <div className="report-official-header" style={{
          marginBottom: 10,
          paddingBottom: 8,
          borderBottom: '2px solid #000',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          direction: 'rtl'
        }}>
          {/* الجانب الأيمن: بيانات المحافظة والإدارة والمدرسة الفعلية */}
          <div className="header-col-right" style={{ textAlign: 'right', fontSize: '12.5pt', lineHeight: 1.5, fontWeight: 700, width: '33%' }}>
            <div>مديرية التربية والتعليم بمحافظة: <strong>{schoolInfo.governorate || '................'}</strong></div>
            <div>إدارة: <strong>{schoolInfo.directorate ? `${schoolInfo.directorate.replace(/^إدارة\s*/, '').replace(/التعليمية\s*$/, '')} التعليمية` : '................'}</strong></div>
            <div>مدرسة: <strong>{(schoolInfo.schoolName || schoolInfo.school_name || '').replace(/^مدرسة\s*/, '') || '................'}</strong></div>
          </div>

          {/* المنتصف: عنوان التقرير والعام الدراسي الفعلي */}
          <div className="header-col-center" style={{ textAlign: 'center', flex: 1 }}>
            <h2 className="report-title-main" style={{ fontSize: '16pt', fontWeight: 900, margin: 0, textDecoration: 'underline', color: '#000' }}>
              إحصاء حالات القيد والتسجيل للتلاميذ
            </h2>
            <div className="report-subtitle-meta" style={{ fontSize: '12.5pt', fontWeight: 800, color: '#1e293b', marginTop: 3 }}>
              للعام الدراسي: <strong>{currentActiveYear} م</strong> | إجمالي الطلاب المقيدين: <strong>{students?.length || 0}</strong> طالب
            </div>
          </div>

          {/* الجانب الأيسر: العام والتاريخ وكود النموذج */}
          <div className="header-col-left" style={{ textAlign: 'left', fontSize: '12.5pt', fontWeight: 700, width: '30%', lineHeight: 1.5 }}>
            <div>العام الدراسي: <strong>{currentActiveYear} م</strong></div>
            <div>تاريخ الاعتماد: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></div>
            <div>كود الاستمارة: <strong>NEP-ENROLLMENT-STATUS</strong></div>
          </div>
        </div>

        {/* ── الجدول الإحصائي الرئيسي المطابق للبيانات المطلوبة ─────────────── */}
        <div style={{ width: '100%', overflowX: 'auto', direction: 'rtl' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', direction: 'rtl' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '180px', textAlign: 'center' }}>الصف</th>
                <th style={{ ...thStyle, width: '50px' }}>عدد<br />الفصول</th>
                <th style={{ ...thStyle, width: '65px', background: '#bfdbfe' }}>إجمالى<br />المقيدون</th>
                <th style={{ ...thStyle, width: '45px' }}>بنون</th>
                <th style={{ ...thStyle, width: '45px' }}>بنات</th>
                <th style={{ ...thStyle, width: '50px' }}>مسلم</th>
                <th style={{ ...thStyle, width: '50px' }}>مسيحى</th>
                <th style={{ ...thStyle, width: '50px', background: '#dcfce7' }}>مستجد</th>
                <th style={{ ...thStyle, width: '50px', background: '#fef9c3' }}>منقول</th>
                <th style={{ ...thStyle, width: '50px', background: '#fee2e2' }}>باق</th>
                <th style={{ ...thStyle, width: '50px', background: '#f1f5f9' }}>منقطع</th>
                <th style={{ ...thStyle, width: '45px' }}>وافد</th>
                <th style={{ ...thStyle, width: '45px' }}>عائد</th>
              </tr>
            </thead>
            <tbody>
              {computedData.stagesResult.length > 0 ? (
                computedData.stagesResult.map((stg, stgIdx) => (
                  <React.Fragment key={stgIdx}>
                    {/* صفوف الصفوف الدراسية الفعلية */}
                    {stg.grades.map((grd, grdIdx) => (
                      <tr key={grdIdx}>
                        <td style={{ ...tdStyle, textAlign: 'right', paddingRight: '8px', fontWeight: 800 }}>{grd.name}</td>
                        <td style={tdStyle}>{toArNum(grd.classesCount)}</td>
                        <td style={{ ...tdStyle, fontWeight: 900, background: '#eff6ff' }}>{toArNum(grd.total)}</td>
                        <td style={tdStyle}>{toArNum(grd.boys)}</td>
                        <td style={tdStyle}>{toArNum(grd.girls)}</td>
                        <td style={tdStyle}>{toArNum(grd.muslim)}</td>
                        <td style={tdStyle}>{toArNum(grd.christian)}</td>
                        <td style={{ ...tdStyle, background: '#f0fdf4' }}>{toArNum(grd.newlyRegistered)}</td>
                        <td style={{ ...tdStyle, background: '#fefce8' }}>{toArNum(grd.transferred)}</td>
                        <td style={{ ...tdStyle, background: '#fef2f2' }}>{toArNum(grd.repeater)}</td>
                        <td style={{ ...tdStyle, background: '#f8fafc' }}>{toArNum(grd.disconnected)}</td>
                        <td style={tdStyle}>{toArNum(grd.foreigners)}</td>
                        <td style={tdStyle}>{toArNum(grd.returnedAbroad)}</td>
                      </tr>
                    ))}

                    {/* سطر إجمالي المرحلة الفعلي */}
                    <tr style={{ background: '#cffafe' }}>
                      <td style={{ ...subtotalTdStyle, textAlign: 'right', paddingRight: '8px' }}>{stg.stageName}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.classesCount)}</td>
                      <td style={{ ...subtotalTdStyle, background: '#bae6fd' }}>{toArNum(stg.subtotal.total)}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.boys)}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.girls)}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.muslim)}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.christian)}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.newlyRegistered)}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.transferred)}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.repeater)}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.disconnected)}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.foreigners)}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.returnedAbroad)}</td>
                    </tr>
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="13" style={{ textAlign: 'center', padding: '25px', color: '#64748b', fontSize: '14px' }}>
                    لا توجد بيانات طلاب مسجلة في العام الدراسي الحالي
                  </td>
                </tr>
              )}

              {/* سطر الإجمالي العام النهائي */}
              <tr style={{ background: '#93c5fd' }}>
                <td style={{ ...grandTotalTdStyle, textAlign: 'center', letterSpacing: '1px' }}>الإجمالى العام</td>
                <td style={grandTotalTdStyle}>{toArNum(computedData.grandTotal.classesCount)}</td>
                <td style={{ ...grandTotalTdStyle, background: '#60a5fa' }}>{toArNum(computedData.grandTotal.total)}</td>
                <td style={grandTotalTdStyle}>{toArNum(computedData.grandTotal.boys)}</td>
                <td style={grandTotalTdStyle}>{toArNum(computedData.grandTotal.girls)}</td>
                <td style={grandTotalTdStyle}>{toArNum(computedData.grandTotal.muslim)}</td>
                <td style={grandTotalTdStyle}>{toArNum(computedData.grandTotal.christian)}</td>
                <td style={grandTotalTdStyle}>{toArNum(computedData.grandTotal.newlyRegistered)}</td>
                <td style={grandTotalTdStyle}>{toArNum(computedData.grandTotal.transferred)}</td>
                <td style={grandTotalTdStyle}>{toArNum(computedData.grandTotal.repeater)}</td>
                <td style={grandTotalTdStyle}>{toArNum(computedData.grandTotal.disconnected)}</td>
                <td style={grandTotalTdStyle}>{toArNum(computedData.grandTotal.foreigners)}</td>
                <td style={grandTotalTdStyle}>{toArNum(computedData.grandTotal.returnedAbroad)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── خانة التوقيعات والاعتماد أسفل التقرير ────────────────────── */}
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', direction: 'rtl', padding: '0 10px', fontSize: '14px', fontWeight: 800 }}>
          
          {/* الجانب الأيمن: سكرتير المدرسة وشئون الطلبة */}
          <div style={{ textAlign: 'right', lineHeight: '2.2' }}>
            <div>
              <span style={{ textDecoration: 'underline', color: '#1e3a8a' }}>سكرتير المدرسة :</span>&nbsp;&nbsp;
              <span>{schoolInfo.secretaryName || '................................'}</span>
            </div>
            <div>
              <span style={{ textDecoration: 'underline', color: '#1e3a8a' }}>وكيل شئون الطلبة :</span>&nbsp;&nbsp;
              <span>{schoolInfo.studentAffairsHead || '................................'}</span>
            </div>
          </div>

          {/* الجانب الأيسر: اعتماد مدير المدرسة */}
          <div style={{ textAlign: 'center', lineHeight: '2.2' }}>
            <div style={{ textDecoration: 'underline', color: '#1e3a8a', fontWeight: 900 }}>
              يعتمده: مدير المدرسة
            </div>
            <div style={{ fontWeight: 900, marginTop: 4 }}>
              {schoolInfo.principalName || '................................'}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

const enrollmentStatusCensus = {
  id: 'enrollment-status-census',
  name: 'إحصاء حالات القيد',
  category: 'الإحصائيات والتحليلات الرسمية',
  icon: '📊',
  orientation: 'landscape',
  filters: {
    requiresYear: false,
    showSection: true,
    showStage: true,
    showGrade: true,
    requiresGrade: false,
    requiresClass: false,
    hideGenderOrder: true,
    hideBatchMode: true,
  },
  available: true,
  buildQuery: (f) => {
    const q = new URLSearchParams();
    q.set('limit', 'all');
    if (f.academicYearId) q.set('academicYearId', f.academicYearId);
    if (f.sectionId)      q.set('sectionId', f.sectionId);
    if (f.stageId)        q.set('stageId', f.stageId);
    if (f.gradeId)        q.set('gradeId', f.gradeId);
    return q.toString();
  },
  excelEndpoint: (f) => {
    const q = new URLSearchParams();
    if (f.academicYearId) q.set('academicYearId', f.academicYearId);
    if (f.sectionId)      q.set('sectionId', f.sectionId);
    if (f.stageId)        q.set('stageId', f.stageId);
    if (f.gradeId)        q.set('gradeId', f.gradeId);
    return `/api/students/export/excel?type=enrollment-status-census&${q.toString()}`;
  },
  excelFileName: () => 'إحصاء_حالات_القيد.xlsx',
  PreviewComponent: EnrollmentStatusCensusPreview,
};

export default enrollmentStatusCensus;
