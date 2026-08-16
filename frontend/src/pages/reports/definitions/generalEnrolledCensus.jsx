// ════════════════════════════════════════════════════════════════
//  Report Definition: إحصاء عام بعدد التلاميذ المقيدين (MS Access Dynamic Replica)
// ════════════════════════════════════════════════════════════════
import React from 'react';

// دالة تحويل الأرقام إلى أرقام عربية مشرقية مطابقة لنموذج أكسيس
const toArNum = (num) => {
  if (num === 0 || num === '0' || num === null || num === undefined || num === '') return '-';
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (d) => digits[d]);
};

function GeneralEnrolledCensusPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedYear, formOpts = {} } = meta;
  
  // 1. العام الدراسي الفعلي النشط بالنظام (لا أعوام متداخلة)
  const currentActiveYear = selectedYear?.year_label || (meta.selectedYear?.year_label) || schoolInfo.academicYear || 'العام الحالي';

  // 2. بناء واستخراج المراحل والصفوف الدراسية ديناميكياً 100% من قاعدة البيانات
  const computedData = React.useMemo(() => {
    let grandTotal = {
      classesCount: 0,
      boys: 0,
      girls: 0,
      muslimBoys: 0,
      muslimGirls: 0,
      muslimTotal: 0,
      christianBoys: 0,
      christianGirls: 0,
      christianTotal: 0,
      total: 0,
      foreigners: 0,
      overCapacity: 0
    };

    // استخراج المراحل الفريدة الموجودة فعلياً في بيانات المدرسة الحالية
    const stagesMap = new Map();

    // تجميع الطلاب حسب المرحلة والصف الفعلي في قاعدة البيانات
    students.forEach(s => {
      const stageName = (s.stage_name || 'المرحلة الدراسية').trim();
      const stageId = s.stage_id || stageName;
      const gradeName = (s.grade_name_ar || 'الصف').trim();
      const gradeId = s.grade_id || gradeName;

      if (!stagesMap.has(stageId)) {
        stagesMap.set(stageId, {
          stageId,
          stageName: stageName.startsWith('اجمالى') || stageName.startsWith('إجمالي') ? stageName : `اجمالى مرحلة ${stageName.replace(/المرحلة/g, '').trim()}`,
          rawStageName: stageName,
          gradesMap: new Map()
        });
      }

      const stageObj = stagesMap.get(stageId);
      if (!stageObj.gradesMap.has(gradeId)) {
        stageObj.gradesMap.set(gradeId, {
          gradeId,
          gradeName,
          students: []
        });
      }

      stageObj.gradesMap.get(gradeId).students.push(s);
    });

    const stagesResult = Array.from(stagesMap.values()).map(stg => {
      let stageSubtotal = {
        classesCount: 0,
        boys: 0,
        girls: 0,
        muslimBoys: 0,
        muslimGirls: 0,
        muslimTotal: 0,
        christianBoys: 0,
        christianGirls: 0,
        christianTotal: 0,
        total: 0,
        foreigners: 0,
        overCapacity: 0
      };

      const gradeRows = Array.from(stg.gradesMap.values()).map(grd => {
        const gradeStudents = grd.students;

        // حساب عدد الفصول الفعلية المسجلة
        const distinctClasses = new Set(gradeStudents.map(s => s.classroom_name || s.class_name || s.classroom_id).filter(Boolean));
        const classesCount = distinctClasses.size || (gradeStudents.length > 0 ? Math.ceil(gradeStudents.length / 35) : 0);

        let boys = 0, girls = 0;
        let muslimBoys = 0, muslimGirls = 0;
        let christianBoys = 0, christianGirls = 0;
        let foreigners = 0, overCapacity = 0;

        gradeStudents.forEach(s => {
          const isBoy = (s.gender || '').trim() === 'ذكر' || (s.gender || '').trim() === 'بنين';
          const isMuslim = (s.religion || '').trim().includes('مسلم');
          const isChristian = (s.religion || '').trim().includes('مسيح');
          const isForeign = (s.nationality_id && s.nationality_id !== 1 && !(s.nationality_name || '').includes('مصر')) ||
                            (s.nationality_name && !s.nationality_name.includes('مصر') && s.nationality_name !== 'مصري');
          const isOver = s.is_over_capacity === 1 || s.is_over_capacity === true;

          if (isBoy) {
            boys++;
            if (isMuslim) muslimBoys++;
            else if (isChristian) christianBoys++;
            else muslimBoys++;
          } else {
            girls++;
            if (isMuslim) muslimGirls++;
            else if (isChristian) christianGirls++;
            else muslimGirls++;
          }

          if (isForeign) foreigners++;
          if (isOver) overCapacity++;
        });

        const muslimTotal = muslimBoys + muslimGirls;
        const christianTotal = christianBoys + christianGirls;
        const total = boys + girls;

        stageSubtotal.classesCount += classesCount;
        stageSubtotal.boys += boys;
        stageSubtotal.girls += girls;
        stageSubtotal.muslimBoys += muslimBoys;
        stageSubtotal.muslimGirls += muslimGirls;
        stageSubtotal.muslimTotal += muslimTotal;
        stageSubtotal.christianBoys += christianBoys;
        stageSubtotal.christianGirls += christianGirls;
        stageSubtotal.christianTotal += christianTotal;
        stageSubtotal.total += total;
        stageSubtotal.foreigners += foreigners;
        stageSubtotal.overCapacity += overCapacity;

        return {
          name: grd.gradeName,
          classesCount,
          boys,
          girls,
          muslimBoys,
          muslimGirls,
          muslimTotal,
          christianBoys,
          christianGirls,
          christianTotal,
          total,
          foreigners,
          overCapacity
        };
      });

      grandTotal.classesCount += stageSubtotal.classesCount;
      grandTotal.boys += stageSubtotal.boys;
      grandTotal.girls += stageSubtotal.girls;
      grandTotal.muslimBoys += stageSubtotal.muslimBoys;
      grandTotal.muslimGirls += stageSubtotal.muslimGirls;
      grandTotal.muslimTotal += stageSubtotal.muslimTotal;
      grandTotal.christianBoys += stageSubtotal.christianBoys;
      grandTotal.christianGirls += stageSubtotal.christianGirls;
      grandTotal.christianTotal += stageSubtotal.christianTotal;
      grandTotal.total += stageSubtotal.total;
      grandTotal.foreigners += stageSubtotal.foreigners;
      grandTotal.overCapacity += stageSubtotal.overCapacity;

      return {
        stageName: stg.stageName,
        grades: gradeRows,
        subtotal: stageSubtotal
      };
    });

    return { stagesResult, grandTotal };
  }, [students]);

  const cellBorder = { border: '1.5px solid #000' };
  const thStyle = { ...cellBorder, background: '#e2e8f0', padding: '5px 2px', textAlign: 'center', fontWeight: 800, fontSize: '14px', color: '#0f172a' };
  const tdStyle = { ...cellBorder, padding: '4px 2px', textAlign: 'center', fontSize: '13px', color: '#000', fontWeight: 700 };
  const subtotalTdStyle = { ...cellBorder, background: '#cffafe', padding: '5px 2px', textAlign: 'center', fontSize: '14px', fontWeight: 800, color: '#000' };
  const grandTotalTdStyle = { ...cellBorder, background: '#93c5fd', padding: '6px 2px', textAlign: 'center', fontSize: '15px', fontWeight: 900, color: '#000' };

  return (
    <div className="report-preview" id="print-area" data-orientation="portrait" style={{ background: '#fff', color: '#000', fontFamily: "'Amiri', 'Segoe UI', Tahoma, sans-serif" }}>
      <div className="printable-page-block" style={{ padding: '10px 15px', minHeight: 'auto', boxSizing: 'border-box' }}>

        {/* ── الترويسة الرسمية للتقرير ────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', direction: 'rtl', marginBottom: 12 }}>
          
          {/* الجانب الأيمن: بيانات المحافظة والإدارة والمدرسة الفعلية */}
          <div style={{ textAlign: 'right', fontSize: '14px', lineHeight: '1.6', fontWeight: 700, minWidth: '180px' }}>
            <div>محافظة: <strong>{schoolInfo.governorate || '................'}</strong></div>
            <div>إدارة: <strong>{schoolInfo.directorate ? `${schoolInfo.directorate} التعليمية` : '................'}</strong></div>
            <div>مدرسة: <strong>{schoolInfo.schoolName || '................'}</strong></div>
          </div>

          {/* المنتصف: عنوان التقرير والعام الدراسي الفعلي */}
          <div style={{ textAlign: 'center', flex: 1, padding: '0 10px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 900, margin: '0 0 4px 0', textDecoration: 'underline', color: '#000', letterSpacing: '0.3px' }}>
              إحصاء عام بعدد التلاميذ المقيدين
            </h2>
            <div style={{ fontSize: '15px', fontWeight: 800, textDecoration: 'underline', color: '#000' }}>
              للعام الدراسي: {currentActiveYear} م
            </div>
          </div>

          {/* الجانب الأيسر: الشعار والتاريخ والوقت */}
          <div style={{ textAlign: 'left', minWidth: '180px' }}>
            {schoolInfo.logoUrl ? (
              <img src={schoolInfo.logoUrl} alt="Logo" style={{ maxHeight: 48, maxWidth: 90, objectFit: 'contain' }} />
            ) : (
              <div style={{ display: 'inline-block', textAlign: 'center', border: '1px dashed #cbd5e1', padding: '4px 8px', borderRadius: 4 }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#334155' }}>شعار المدرسة</div>
              </div>
            )}
            <div style={{ fontSize: '11px', color: '#334155', marginTop: 4, direction: 'rtl', textAlign: 'left', fontWeight: 600 }}>
              {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} {new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* ── الجدول الإحصائي الرئيسي المطابق للأكسيس ──────────────────────── */}
        <div style={{ width: '100%', overflowX: 'auto', direction: 'rtl' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', direction: 'rtl' }}>
            <thead>
              {/* السطر الأول من رأس الجدول */}
              <tr>
                <th rowSpan="2" style={{ ...thStyle, width: '210px', textAlign: 'center' }}>الصف</th>
                <th rowSpan="2" style={{ ...thStyle, width: '45px' }}>عدد<br />الفصول</th>
                <th colSpan="2" style={{ ...thStyle, background: '#cbd5e1' }}>مقيدون</th>
                <th colSpan="2" style={{ ...thStyle, background: '#cbd5e1' }}>مسلم</th>
                <th rowSpan="2" style={{ ...thStyle, width: '50px' }}>اجمالى<br />مسلم</th>
                <th colSpan="2" style={{ ...thStyle, background: '#cbd5e1' }}>مسيحى</th>
                <th rowSpan="2" style={{ ...thStyle, width: '50px' }}>إجمالى<br />مسيحى</th>
                <th rowSpan="2" style={{ ...thStyle, width: '55px', background: '#bfdbfe' }}>الإجمالى</th>
                <th rowSpan="2" style={{ ...thStyle, width: '40px' }}>وافد</th>
                <th rowSpan="2" style={{ ...thStyle, width: '50px' }}>فوق<br />الكثافة</th>
              </tr>
              {/* السطر الثاني من رأس الجدول (الفرعي) */}
              <tr>
                <th style={{ ...thStyle, width: '38px' }}>بنون</th>
                <th style={{ ...thStyle, width: '38px' }}>بنات</th>
                <th style={{ ...thStyle, width: '38px' }}>بنون</th>
                <th style={{ ...thStyle, width: '38px' }}>بنات</th>
                <th style={{ ...thStyle, width: '38px' }}>بنون</th>
                <th style={{ ...thStyle, width: '38px' }}>بنات</th>
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
                        <td style={tdStyle}>{toArNum(grd.boys)}</td>
                        <td style={tdStyle}>{toArNum(grd.girls)}</td>
                        <td style={tdStyle}>{toArNum(grd.muslimBoys)}</td>
                        <td style={tdStyle}>{toArNum(grd.muslimGirls)}</td>
                        <td style={{ ...tdStyle, fontWeight: 800 }}>{toArNum(grd.muslimTotal)}</td>
                        <td style={tdStyle}>{toArNum(grd.christianBoys)}</td>
                        <td style={tdStyle}>{toArNum(grd.christianGirls)}</td>
                        <td style={{ ...tdStyle, fontWeight: 800 }}>{toArNum(grd.christianTotal)}</td>
                        <td style={{ ...tdStyle, fontWeight: 800, background: '#eff6ff' }}>{toArNum(grd.total)}</td>
                        <td style={tdStyle}>{toArNum(grd.foreigners)}</td>
                        <td style={tdStyle}>{toArNum(grd.overCapacity)}</td>
                      </tr>
                    ))}

                    {/* سطر إجمالي المرحلة الفعلي */}
                    <tr style={{ background: '#cffafe' }}>
                      <td style={{ ...subtotalTdStyle, textAlign: 'right', paddingRight: '8px' }}>{stg.stageName}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.classesCount)}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.boys)}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.girls)}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.muslimBoys)}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.muslimGirls)}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.muslimTotal)}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.christianBoys)}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.christianGirls)}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.christianTotal)}</td>
                      <td style={{ ...subtotalTdStyle, background: '#bae6fd' }}>{toArNum(stg.subtotal.total)}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.foreigners)}</td>
                      <td style={subtotalTdStyle}>{toArNum(stg.subtotal.overCapacity)}</td>
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
                <td style={grandTotalTdStyle}>{toArNum(computedData.grandTotal.boys)}</td>
                <td style={grandTotalTdStyle}>{toArNum(computedData.grandTotal.girls)}</td>
                <td style={grandTotalTdStyle}>{toArNum(computedData.grandTotal.muslimBoys)}</td>
                <td style={grandTotalTdStyle}>{toArNum(computedData.grandTotal.muslimGirls)}</td>
                <td style={grandTotalTdStyle}>{toArNum(computedData.grandTotal.muslimTotal)}</td>
                <td style={grandTotalTdStyle}>{toArNum(computedData.grandTotal.christianBoys)}</td>
                <td style={grandTotalTdStyle}>{toArNum(computedData.grandTotal.christianGirls)}</td>
                <td style={grandTotalTdStyle}>{toArNum(computedData.grandTotal.christianTotal)}</td>
                <td style={{ ...grandTotalTdStyle, background: '#60a5fa', color: '#000' }}>{toArNum(computedData.grandTotal.total)}</td>
                <td style={grandTotalTdStyle}>{toArNum(computedData.grandTotal.foreigners)}</td>
                <td style={grandTotalTdStyle}>{toArNum(computedData.grandTotal.overCapacity)}</td>
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

const generalEnrolledCensus = {
  id: 'general-enrolled-census',
  name: 'إحصاء عام',
  category: 'إحصائيات',
  icon: '📊',
  orientation: 'portrait',
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
    return `/api/students/export/excel?type=general-census&${q.toString()}`;
  },
  excelFileName: () => 'إحصاء عام بعدد التلاميذ المقيدين.xlsx',
  PreviewComponent: GeneralEnrolledCensusPreview,
};

export default generalEnrolledCensus;
