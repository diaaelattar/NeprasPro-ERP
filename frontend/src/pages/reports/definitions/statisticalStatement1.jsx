// ════════════════════════════════════════════════════════════════
//  Report Definition: البيان الإحصائي العام للمدرسة (بيان 1)
//  مطابق للمصفوفة الإحصائية الرسمية الدقيقة (في صفحة واحدة A4 عرضي بدون تداخل)
// ════════════════════════════════════════════════════════════════
import React, { useMemo } from 'react';

const toArNum = (num) => {
  if (num === 0 || num === '0' || num === null || num === undefined || num === '') return '-';
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (d) => digits[d]);
};

function StatisticalStatement1Preview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedYear } = meta;

  const cleanSchool = (schoolInfo.schoolName || schoolInfo.school_name || '').replace(/^مدرسة\s*/, '').trim();
  const rawAdmin = schoolInfo.directorate || schoolInfo.administration || '';
  const cleanAdmin = rawAdmin.replace(/^إدارة\s*/, '').replace(/التعليمية\s*$/, '').trim();
  const governorate = schoolInfo.governorate || 'الجيزة';
  const currentActiveYear = selectedYear?.year_label || schoolInfo.academicYear || schoolInfo.academic_year || '2025/2026';

  // ── Compute Statistical Matrix by Stage & Grade (Excluding Pre-KG) ──
  const { stagesResult, grandTotal } = useMemo(() => {
    const stagesMap = new Map();

    const gTotal = {
      classesCount: 0,
      totalStudents: 0,
      muslimBoys: 0,
      christianBoys: 0,
      boys: 0,
      muslimGirls: 0,
      christianGirls: 0,
      girls: 0,
      promotedBoys: 0,
      retainedBoys: 0,
      boysRegTotal: 0,
      promotedGirls: 0,
      retainedGirls: 0,
      girlsRegTotal: 0,
      mergedMuslim: 0,
      mergedChristian: 0,
      mergedTotal: 0,
      dropped: 0,
      foreigners: 0,
      returning: 0,
    };

    students.forEach(s => {
      const stageName = (s.stage_name || 'المرحلة التعليمية').trim();
      const gradeName = (s.grade_name_ar || 'الصف').trim();

      // استبعاد التمهيدي (Pre-KG) حيث يعرض مستقلاً إن وجد ولا يدرج في الإحصاء العام للمراحل
      const isPreKG = stageName.includes('تمهيدي') || stageName.toLowerCase().includes('pre-kg') ||
                      gradeName.includes('تمهيدي') || gradeName.toLowerCase().includes('pre-kg');
      if (isPreKG) return;

      const stageId = s.stage_id || stageName;
      const gradeId = s.grade_id || gradeName;
      const className = (s.classroom_name || s.class_name || 'فصل').trim();
      const classId = s.classroom_id || className;

      if (!stagesMap.has(stageId)) {
        stagesMap.set(stageId, {
          stageId,
          stageName,
          gradesMap: new Map(),
          subtotal: {
            classesCount: 0,
            totalStudents: 0,
            muslimBoys: 0,
            christianBoys: 0,
            boys: 0,
            muslimGirls: 0,
            christianGirls: 0,
            girls: 0,
            promotedBoys: 0,
            retainedBoys: 0,
            boysRegTotal: 0,
            promotedGirls: 0,
            retainedGirls: 0,
            girlsRegTotal: 0,
            mergedMuslim: 0,
            mergedChristian: 0,
            mergedTotal: 0,
            dropped: 0,
            foreigners: 0,
            returning: 0,
          }
        });
      }

      const stg = stagesMap.get(stageId);
      if (!stg.gradesMap.has(gradeId)) {
        stg.gradesMap.set(gradeId, {
          gradeId,
          gradeName,
          classesSet: new Set(),
          muslimBoys: 0,
          christianBoys: 0,
          boys: 0,
          muslimGirls: 0,
          christianGirls: 0,
          girls: 0,
          promotedBoys: 0,
          retainedBoys: 0,
          boysRegTotal: 0,
          promotedGirls: 0,
          retainedGirls: 0,
          girlsRegTotal: 0,
          mergedMuslim: 0,
          mergedChristian: 0,
          mergedTotal: 0,
          dropped: 0,
          foreigners: 0,
          returning: 0,
          totalStudents: 0
        });
      }

      const grd = stg.gradesMap.get(gradeId);
      grd.classesSet.add(classId);

      const isBoy = (s.gender || '').trim() === 'ذكر' || (s.gender || '').trim() === 'بنين';
      const isMuslim = (s.religion || '').trim().includes('مسلم');
      const isChristian = (s.religion || '').trim().includes('مسيح');
      
      const rawStatus = (s.enrollment_status || s.status || s.registration_status || '').trim();
      const regId = s.registration_status_id || s.enrollment_status_id || 0;
      const isRetained = regId === 3 || rawStatus.includes('باق') || rawStatus === 'retained';
      const isDropped = regId === 4 || rawStatus.includes('منقطع') || rawStatus === 'disconnected';
      const isForeign = (s.nationality_id && s.nationality_id !== 1 && !(s.nationality_name || '').includes('مصر')) ||
                        (s.nationality_name && !s.nationality_name.includes('مصر') && s.nationality_name !== 'مصري') || rawStatus.includes('وافد');
      const isReturning = rawStatus.includes('عائد') || rawStatus === 'returning';
      const isMerged = s.is_merged === 1 || s.is_merged === '1' || s.disability_id > 0;

      // 1. الديانة
      if (isMuslim) {
        if (isBoy) { grd.muslimBoys++; grd.boys++; }
        else { grd.muslimGirls++; grd.girls++; }
      } else if (isChristian) {
        if (isBoy) { grd.christianBoys++; grd.boys++; }
        else { grd.christianGirls++; grd.girls++; }
      } else {
        if (isBoy) { grd.muslimBoys++; grd.boys++; }
        else { grd.muslimGirls++; grd.girls++; }
      }

      // 2. حالة القيد
      if (isBoy) {
        if (isRetained) grd.retainedBoys++;
        else grd.promotedBoys++;
        grd.boysRegTotal++;
      } else {
        if (isRetained) grd.retainedGirls++;
        else grd.promotedGirls++;
        grd.girlsRegTotal++;
      }

      // 3. الدمج
      if (isMerged) {
        if (isMuslim) grd.mergedMuslim++;
        else if (isChristian) grd.mergedChristian++;
        else grd.mergedMuslim++;
        grd.mergedTotal++;
      }

      // 4. منقطع / وافد / عائد
      if (isDropped) grd.dropped++;
      if (isForeign) grd.foreigners++;
      if (isReturning) grd.returning++;

      grd.totalStudents++;
    });

    const stagesArr = Array.from(stagesMap.values()).map(stg => {
      const gradesArr = Array.from(stg.gradesMap.values()).map(grd => {
        const classesCount = grd.classesSet.size || 1;

        stg.subtotal.classesCount += classesCount;
        stg.subtotal.totalStudents += grd.totalStudents;
        stg.subtotal.muslimBoys += grd.muslimBoys;
        stg.subtotal.christianBoys += grd.christianBoys;
        stg.subtotal.boys += grd.boys;
        stg.subtotal.muslimGirls += grd.muslimGirls;
        stg.subtotal.christianGirls += grd.christianGirls;
        stg.subtotal.girls += grd.girls;
        stg.subtotal.promotedBoys += grd.promotedBoys;
        stg.subtotal.retainedBoys += grd.retainedBoys;
        stg.subtotal.boysRegTotal += grd.boysRegTotal;
        stg.subtotal.promotedGirls += grd.promotedGirls;
        stg.subtotal.retainedGirls += grd.retainedGirls;
        stg.subtotal.girlsRegTotal += grd.girlsRegTotal;
        stg.subtotal.mergedMuslim += grd.mergedMuslim;
        stg.subtotal.mergedChristian += grd.mergedChristian;
        stg.subtotal.mergedTotal += grd.mergedTotal;
        stg.subtotal.dropped += grd.dropped;
        stg.subtotal.foreigners += grd.foreigners;
        stg.subtotal.returning += grd.returning;

        return { ...grd, classesCount };
      });

      gTotal.classesCount += stg.subtotal.classesCount;
      gTotal.totalStudents += stg.subtotal.totalStudents;
      gTotal.muslimBoys += stg.subtotal.muslimBoys;
      gTotal.christianBoys += stg.subtotal.christianBoys;
      gTotal.boys += stg.subtotal.boys;
      gTotal.muslimGirls += stg.subtotal.muslimGirls;
      gTotal.christianGirls += stg.subtotal.christianGirls;
      gTotal.girls += stg.subtotal.girls;
      gTotal.promotedBoys += stg.subtotal.promotedBoys;
      gTotal.retainedBoys += stg.subtotal.retainedBoys;
      gTotal.boysRegTotal += stg.subtotal.boysRegTotal;
      gTotal.promotedGirls += stg.subtotal.promotedGirls;
      gTotal.retainedGirls += stg.subtotal.retainedGirls;
      gTotal.girlsRegTotal += stg.subtotal.girlsRegTotal;
      gTotal.mergedMuslim += stg.subtotal.mergedMuslim;
      gTotal.mergedChristian += stg.subtotal.mergedChristian;
      gTotal.mergedTotal += stg.subtotal.mergedTotal;
      gTotal.dropped += stg.subtotal.dropped;
      gTotal.foreigners += stg.subtotal.foreigners;
      gTotal.returning += stg.subtotal.returning;

      return { ...stg, grades: gradesArr };
    });

    return { stagesResult: stagesArr, grandTotal: gTotal };
  }, [students]);

  const cellBorder = { border: '1px solid #000' };
  const thStyle = { ...cellBorder, background: '#0f766e', padding: '3px 1px', textAlign: 'center', fontWeight: 900, fontSize: '9.5pt', color: '#fff', lineHeight: 1.15 };
  const thSubStyle = { ...cellBorder, background: '#115e59', padding: '2px 1px', textAlign: 'center', fontWeight: 800, fontSize: '8.5pt', color: '#fff', lineHeight: 1.1 };
  const tdStyle = { ...cellBorder, padding: '2px 1px', textAlign: 'center', fontSize: '10.5pt', color: '#000', fontWeight: 700, lineHeight: 1.15 };

  return (
    <div className="report-preview printable-page-block single-page-landscape" id="print-area" data-orientation="landscape" style={{
      padding: '6px 10px',
      background: '#fff',
      color: '#000',
      fontFamily: 'Cairo, Tahoma, Arial, sans-serif',
      pageBreakInside: 'avoid',
      breakInside: 'avoid',
      boxSizing: 'border-box',
      width: '100%',
      maxWidth: '100%'
    }}>
      {/* ══ الترويسة الثلاثية القياسية الرسمية المدمجة ══ */}
      <div className="report-official-header" style={{
        marginBottom: 4,
        paddingBottom: 4,
        borderBottom: '1.5px solid #000',
        display: 'grid',
        gridTemplateColumns: '32% 38% 30%',
        alignItems: 'center',
        gap: 8,
        direction: 'rtl'
      }}>
        <div className="header-col-right" style={{ textAlign: 'right', fontSize: '10.5pt', lineHeight: 1.3, fontWeight: 700 }}>
          <div>مديرية التربية والتعليم: <strong>{governorate || '................'}</strong></div>
          <div>إدارة: <strong>{cleanAdmin ? `${cleanAdmin} التعليمية` : '................'}</strong></div>
          <div>مدرسة: <strong>{cleanSchool || '................'}</strong></div>
        </div>

        <div className="header-col-center" style={{ textAlign: 'center' }}>
          <h2 className="report-title-main" style={{
            fontSize: '13.5pt',
            fontWeight: 900,
            color: '#000',
            margin: 0,
            textDecoration: 'underline'
          }}>
            البيان الإحصائي العام للمدرسة (بيان 1)
          </h2>
          <div className="report-subtitle-meta" style={{ fontSize: '10pt', fontWeight: 800, color: '#1e293b', marginTop: 1 }}>
            العام الدراسي: <strong>{currentActiveYear} م</strong> | إجمالي الفصول: <strong>{grandTotal.classesCount}</strong> | إجمالي المقيدين: <strong>{grandTotal.totalStudents}</strong> طالب
          </div>
        </div>

        <div className="header-col-left" style={{ textAlign: 'left', fontSize: '10.5pt', fontWeight: 700, lineHeight: 1.3 }}>
          <div>العام الدراسي: <strong>{currentActiveYear} م</strong></div>
          <div>تاريخ الاعتماد: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></div>
          <div>كود الاستمارة: <strong>NEP-STAT-1</strong></div>
        </div>
      </div>

      {/* ══ Matrix Table (Single-Page Fit Guaranteed) ══ */}
      <div className="register-table-wrap" style={{ width: '100%', overflow: 'hidden' }}>
        <table className="register-table" dir="rtl" style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1.5px solid #000',
          fontSize: '10pt',
          textAlign: 'center',
          tableLayout: 'fixed'
        }}>
          <colgroup>
            <col style={{ width: '11%' }} /> {/* الصف */}
            <col style={{ width: '4%' }} />  {/* عدد الفصول */}
            <col style={{ width: '5.5%' }} />{/* إجمالي الطلاب */}
            {/* بنون ديانة */}
            <col style={{ width: '4%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '4.5%' }} />
            {/* بنات ديانة */}
            <col style={{ width: '4%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '4.5%' }} />
            {/* بنون قيد */}
            <col style={{ width: '5.5%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '4.5%' }} />
            {/* بنات قيد */}
            <col style={{ width: '5.5%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '4.5%' }} />
            {/* دمج */}
            <col style={{ width: '4%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '4.5%' }} />
            {/* منقطع / وافد / عائد */}
            <col style={{ width: '4.5%' }} />
            <col style={{ width: '4.5%' }} />
            <col style={{ width: '4.5%' }} />
          </colgroup>
          <thead>
            {/* Header Row 1 */}
            <tr>
              <th rowSpan="2" style={{ ...thStyle, textAlign: 'right', paddingRight: '4px' }}>الصف</th>
              <th rowSpan="2" style={thStyle}>عدد<br />الفصول</th>
              <th rowSpan="2" style={{ ...thStyle, background: '#0d9488', fontWeight: 900 }}>إجمالي<br />الطلاب</th>
              <th colSpan="3" style={{ ...thStyle, background: '#0284c7' }}>بنون</th>
              <th colSpan="3" style={{ ...thStyle, background: '#0369a1' }}>بنات</th>
              <th colSpan="3" style={{ ...thStyle, background: '#4f46e5' }}>بنون (حالة القيد)</th>
              <th colSpan="3" style={{ ...thStyle, background: '#4338ca' }}>بنات (حالة القيد)</th>
              <th colSpan="3" style={{ ...thStyle, background: '#b45309' }}>دمج</th>
              <th rowSpan="2" style={thStyle}>منقطع</th>
              <th rowSpan="2" style={thStyle}>وافد</th>
              <th rowSpan="2" style={thStyle}>عائد</th>
            </tr>
            {/* Header Row 2 */}
            <tr>
              <th style={thSubStyle}>مسلم</th>
              <th style={thSubStyle}>مسيحي</th>
              <th style={{ ...thSubStyle, background: '#0369a1', fontWeight: 900 }}>جملة</th>
              <th style={thSubStyle}>مسلم</th>
              <th style={thSubStyle}>مسيحي</th>
              <th style={{ ...thSubStyle, background: '#075985', fontWeight: 900 }}>جملة</th>
              <th style={thSubStyle}>منقول/مستجد</th>
              <th style={thSubStyle}>باق</th>
              <th style={{ ...thSubStyle, background: '#3730a3', fontWeight: 900 }}>جملة</th>
              <th style={thSubStyle}>منقول/مستجد</th>
              <th style={thSubStyle}>باق</th>
              <th style={{ ...thSubStyle, background: '#312e81', fontWeight: 900 }}>جملة</th>
              <th style={thSubStyle}>مسلم</th>
              <th style={thSubStyle}>مسيحي</th>
              <th style={{ ...thSubStyle, background: '#92400e', fontWeight: 900 }}>جملة</th>
            </tr>
          </thead>
          <tbody>
            {stagesResult.length > 0 ? (
              stagesResult.map((stg, stgIdx) => (
                <React.Fragment key={stg.stageId || stgIdx}>
                  {/* Grade Rows */}
                  {stg.grades.map((grd, gIdx) => (
                    <tr key={grd.gradeId || gIdx} style={{ background: gIdx % 2 === 1 ? '#f8fafc' : '#fff' }}>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, paddingRight: '4px', whiteSpace: 'nowrap', overflow: 'hidden' }}>{grd.gradeName}</td>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{toArNum(grd.classesCount)}</td>
                      <td style={{ ...tdStyle, fontWeight: 900, background: '#e0f2fe', color: '#0369a1', fontSize: '11pt' }}>{toArNum(grd.totalStudents)}</td>
                      <td style={tdStyle}>{toArNum(grd.muslimBoys)}</td>
                      <td style={tdStyle}>{toArNum(grd.christianBoys)}</td>
                      <td style={{ ...tdStyle, fontWeight: 900, background: '#f1f5f9' }}>{toArNum(grd.boys)}</td>
                      <td style={tdStyle}>{toArNum(grd.muslimGirls)}</td>
                      <td style={tdStyle}>{toArNum(grd.christianGirls)}</td>
                      <td style={{ ...tdStyle, fontWeight: 900, background: '#f1f5f9' }}>{toArNum(grd.girls)}</td>
                      <td style={tdStyle}>{toArNum(grd.promotedBoys)}</td>
                      <td style={tdStyle}>{toArNum(grd.retainedBoys)}</td>
                      <td style={{ ...tdStyle, fontWeight: 900, background: '#eef2ff' }}>{toArNum(grd.boysRegTotal)}</td>
                      <td style={tdStyle}>{toArNum(grd.promotedGirls)}</td>
                      <td style={tdStyle}>{toArNum(grd.retainedGirls)}</td>
                      <td style={{ ...tdStyle, fontWeight: 900, background: '#eef2ff' }}>{toArNum(grd.girlsRegTotal)}</td>
                      <td style={tdStyle}>{toArNum(grd.mergedMuslim)}</td>
                      <td style={tdStyle}>{toArNum(grd.mergedChristian)}</td>
                      <td style={{ ...tdStyle, fontWeight: 900, background: '#fef3c7' }}>{toArNum(grd.mergedTotal)}</td>
                      <td style={tdStyle}>{toArNum(grd.dropped)}</td>
                      <td style={tdStyle}>{toArNum(grd.foreigners)}</td>
                      <td style={tdStyle}>{toArNum(grd.returning)}</td>
                    </tr>
                  ))}
                  {/* Stage Subtotal */}
                  <tr style={{ background: '#fef3c7', fontWeight: 900, fontSize: '10.5pt' }}>
                    <td colSpan="2" style={{ ...tdStyle, textAlign: 'right', paddingRight: '4px', fontWeight: 900 }}>إجمالي {stg.stageName}</td>
                    <td style={{ ...tdStyle, background: '#fde68a', color: '#78350f', fontSize: '11.5pt', fontWeight: 900 }}>{toArNum(stg.subtotal.totalStudents)}</td>
                    <td style={tdStyle}>{toArNum(stg.subtotal.muslimBoys)}</td>
                    <td style={tdStyle}>{toArNum(stg.subtotal.christianBoys)}</td>
                    <td style={{ ...tdStyle, background: '#cbd5e1', fontWeight: 900 }}>{toArNum(stg.subtotal.boys)}</td>
                    <td style={tdStyle}>{toArNum(stg.subtotal.muslimGirls)}</td>
                    <td style={tdStyle}>{toArNum(stg.subtotal.christianGirls)}</td>
                    <td style={{ ...tdStyle, background: '#cbd5e1', fontWeight: 900 }}>{toArNum(stg.subtotal.girls)}</td>
                    <td style={tdStyle}>{toArNum(stg.subtotal.promotedBoys)}</td>
                    <td style={tdStyle}>{toArNum(stg.subtotal.retainedBoys)}</td>
                    <td style={{ ...tdStyle, background: '#c7d2fe', fontWeight: 900 }}>{toArNum(stg.subtotal.boysRegTotal)}</td>
                    <td style={tdStyle}>{toArNum(stg.subtotal.promotedGirls)}</td>
                    <td style={tdStyle}>{toArNum(stg.subtotal.retainedGirls)}</td>
                    <td style={{ ...tdStyle, background: '#c7d2fe', fontWeight: 900 }}>{toArNum(stg.subtotal.girlsRegTotal)}</td>
                    <td style={tdStyle}>{toArNum(stg.subtotal.mergedMuslim)}</td>
                    <td style={tdStyle}>{toArNum(stg.subtotal.mergedChristian)}</td>
                    <td style={{ ...tdStyle, background: '#fde68a', fontWeight: 900 }}>{toArNum(stg.subtotal.mergedTotal)}</td>
                    <td style={tdStyle}>{toArNum(stg.subtotal.dropped)}</td>
                    <td style={tdStyle}>{toArNum(stg.subtotal.foreigners)}</td>
                    <td style={tdStyle}>{toArNum(stg.subtotal.returning)}</td>
                  </tr>
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan="21" style={{ textAlign: 'center', padding: 18, color: '#64748b', fontWeight: 700, fontSize: '11pt' }}>
                  لا توجد بيانات مسجلة مطابقة لفلاتر البحث
                </td>
              </tr>
            )}
          </tbody>
          {/* Grand Total Footer Row */}
          <tfoot>
            <tr style={{ background: '#cbd5e1', color: '#000', fontWeight: 900, borderTop: '2px solid #000', fontSize: '11pt' }}>
              <td colSpan="2" style={{ ...tdStyle, textAlign: 'right', paddingRight: '4px', fontWeight: 900 }}>
                الإجمالي العام ({grandTotal.classesCount} فصل)
              </td>
              <td style={{ ...tdStyle, background: '#93c5fd', color: '#1e3a8a', fontSize: '12pt', fontWeight: 900 }}>{toArNum(grandTotal.totalStudents)}</td>
              <td style={{ ...tdStyle, fontWeight: 900 }}>{toArNum(grandTotal.muslimBoys)}</td>
              <td style={{ ...tdStyle, fontWeight: 900 }}>{toArNum(grandTotal.christianBoys)}</td>
              <td style={{ ...tdStyle, background: '#94a3b8', fontSize: '11.5pt', fontWeight: 900 }}>{toArNum(grandTotal.boys)}</td>
              <td style={{ ...tdStyle, fontWeight: 900 }}>{toArNum(grandTotal.muslimGirls)}</td>
              <td style={{ ...tdStyle, fontWeight: 900 }}>{toArNum(grandTotal.christianGirls)}</td>
              <td style={{ ...tdStyle, background: '#94a3b8', fontSize: '11.5pt', fontWeight: 900 }}>{toArNum(grandTotal.girls)}</td>
              <td style={{ ...tdStyle, fontWeight: 900 }}>{toArNum(grandTotal.promotedBoys)}</td>
              <td style={{ ...tdStyle, fontWeight: 900 }}>{toArNum(grandTotal.retainedBoys)}</td>
              <td style={{ ...tdStyle, background: '#818cf8', color: '#1e1b4b', fontSize: '11.5pt', fontWeight: 900 }}>{toArNum(grandTotal.boysRegTotal)}</td>
              <td style={{ ...tdStyle, fontWeight: 900 }}>{toArNum(grandTotal.promotedGirls)}</td>
              <td style={{ ...tdStyle, fontWeight: 900 }}>{toArNum(grandTotal.retainedGirls)}</td>
              <td style={{ ...tdStyle, background: '#818cf8', color: '#1e1b4b', fontSize: '11.5pt', fontWeight: 900 }}>{toArNum(grandTotal.girlsRegTotal)}</td>
              <td style={{ ...tdStyle, fontWeight: 900 }}>{toArNum(grandTotal.mergedMuslim)}</td>
              <td style={{ ...tdStyle, fontWeight: 900 }}>{toArNum(grandTotal.mergedChristian)}</td>
              <td style={{ ...tdStyle, background: '#f59e0b', color: '#78350f', fontSize: '11.5pt', fontWeight: 900 }}>{toArNum(grandTotal.mergedTotal)}</td>
              <td style={{ ...tdStyle, fontWeight: 900 }}>{toArNum(grandTotal.dropped)}</td>
              <td style={{ ...tdStyle, fontWeight: 900 }}>{toArNum(grandTotal.foreigners)}</td>
              <td style={{ ...tdStyle, fontWeight: 900 }}>{toArNum(grandTotal.returning)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 4-Part Official Signatures Footer (Compact) */}
      <div className="official-signatures-footer" style={{
        marginTop: 8,
        paddingTop: 4,
        borderTop: '1.5px solid #000',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        textAlign: 'center',
        fontSize: '10.5pt',
        fontWeight: 800
      }}>
        <div>
          <div>مسؤول الإحصاء وتوزيع الفصول</div>
          <div style={{ marginTop: 8, color: '#000' }}>التوقيع: ..........................</div>
        </div>
        <div>
          <div>المراجع والأخصائي</div>
          <div style={{ marginTop: 8, color: '#000' }}>التوقيع: ..........................</div>
        </div>
        <div>
          <div>وكيل شؤون الطلاب والتعليم</div>
          <div style={{ marginTop: 8, color: '#000' }}>التوقيع: ..........................</div>
        </div>
        <div>
          <div>مدير المدرسة (يعتمد وخاتم المدرسة)</div>
          <div style={{ marginTop: 8, color: '#000' }}>التوقيع: ..........................</div>
        </div>
      </div>

    </div>
  );
}

const statisticalStatement1 = {
  id:          'statistical-statement-1',
  name:        'البيان الإحصائي العام للمدرسة (بيان 1)',
  desc:        'البيان الإحصائي الموحد والشامل لأعداد الطلاب والفصول وحالات القيد والديانة والدمج والوافدين لكل مرحلة وصف دراسي',
  category:    'الإحصائيات والتحليلات الرسمية',
  icon:        '📊',
  orientation: 'landscape',
  available:   true,

  filters: {
    requiresGrade: false,
    showClass:     false,
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
    return q.toString();
  },

  excelEndpoint: (f) =>
    `/api/students/export/excel?academicYearId=${f.academicYearId || ''}&type=general-census`,

  excelFileName: (f, meta) =>
    `البيان_الإحصائي_العام_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  PreviewComponent: StatisticalStatement1Preview,
};

export default statisticalStatement1;
