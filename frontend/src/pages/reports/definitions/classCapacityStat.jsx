// ════════════════════════════════════════════════════════════════
//  Report Definition: إحصاء الكثافة الطلابية والسعة الاستيعابية للفصول
//  مصفوفة الكثافات الفعلية ومعدلات الإشغال ومتوسط الكثافة لكل مرحلة وصف
// ════════════════════════════════════════════════════════════════
import React, { useMemo } from 'react';

const toArNum = (num) => {
  if (num === 0 || num === '0' || num === null || num === undefined || num === '') return '-';
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (d) => digits[d]);
};

function ClassCapacityStatPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear } = meta;

  const cleanSchool = (schoolInfo.schoolName || '').replace(/^مدرسة\s*/, '').trim();
  const rawAdmin = schoolInfo.directorate || '';
  const cleanAdmin = rawAdmin.replace(/التعليمية\s*$/, '').trim();
  const governorate = schoolInfo.governorate || 'الجيزة';
  const academicYear = selectedYear?.year_label || schoolInfo.academicYear || '2025/2026';

  // Compute Class Density & Metrics
  const { stagesData, grandTotal, minDensity, maxDensity } = useMemo(() => {
    const stagesMap = new Map();
    let minD = 999;
    let maxD = 0;

    const gTotal = {
      classesCount: 0,
      muslimBoys: 0,
      christianBoys: 0,
      boys: 0,
      muslimGirls: 0,
      christianGirls: 0,
      girls: 0,
      mergedCount: 0,
      totalStudents: 0,
      standardCapacity: 0,
    };

    students.forEach(s => {
      const stageName = (s.stage_name || 'المرحلة الدراسية').trim();
      const stageId = s.stage_id || stageName;
      const gradeName = (s.grade_name_ar || 'الصف').trim();
      const gradeId = s.grade_id || gradeName;
      const className = (s.classroom_name || s.class_name || 'فصل عام').trim();
      const classId = s.classroom_id || className;

      if (!stagesMap.has(stageId)) {
        stagesMap.set(stageId, {
          stageId,
          stageName,
          gradesMap: new Map(),
          subtotal: {
            classesCount: 0,
            muslimBoys: 0,
            christianBoys: 0,
            boys: 0,
            muslimGirls: 0,
            christianGirls: 0,
            girls: 0,
            mergedCount: 0,
            totalStudents: 0,
            standardCapacity: 0,
          }
        });
      }

      const stg = stagesMap.get(stageId);
      if (!stg.gradesMap.has(gradeId)) {
        stg.gradesMap.set(gradeId, {
          gradeId,
          gradeName,
          classesMap: new Map(),
          subtotal: {
            classesCount: 0,
            muslimBoys: 0,
            christianBoys: 0,
            boys: 0,
            muslimGirls: 0,
            christianGirls: 0,
            girls: 0,
            mergedCount: 0,
            totalStudents: 0,
            standardCapacity: 0,
          }
        });
      }

      const grd = stg.gradesMap.get(gradeId);
      if (!grd.classesMap.has(classId)) {
        grd.classesMap.set(classId, {
          classId,
          className,
          gradeName,
          stageName,
          muslimBoys: 0,
          christianBoys: 0,
          boys: 0,
          muslimGirls: 0,
          christianGirls: 0,
          girls: 0,
          mergedCount: 0,
          totalStudents: 0,
          standardCapacity: 36, // Standard Egyptian classroom capacity
        });
      }

      const cls = grd.classesMap.get(classId);
      const isBoy = (s.gender || '').trim() === 'ذكر' || (s.gender || '').trim() === 'بنين';
      const isMuslim = (s.religion || '').trim().includes('مسلم');
      const isChristian = (s.religion || '').trim().includes('مسيح');
      const isMerged = s.is_merged === 1 || s.is_merged === '1' || s.disability_id > 0;

      if (isBoy) {
        cls.boys++;
        if (isMuslim) cls.muslimBoys++;
        if (isChristian) cls.christianBoys++;
      } else {
        cls.girls++;
        if (isMuslim) cls.muslimGirls++;
        if (isChristian) cls.christianGirls++;
      }

      if (isMerged) cls.mergedCount++;
      cls.totalStudents++;
    });

    // Natural Numeric Ascending Sorter for Classes (Supports English and Arabic-Indic Digits)
    const normalizeDigits = (str) => {
      if (!str) return '';
      const arDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      let res = String(str);
      for (let i = 0; i < 10; i++) {
        res = res.replaceAll(arDigits[i], String(i));
      }
      return res;
    };

    const extractClassNum = (name) => {
      if (!name) return 99999;
      const normalized = normalizeDigits(name);
      const match = normalized.match(/\d+/g);
      if (match && match.length > 0) {
        return parseInt(match[match.length - 1], 10) || 99999;
      }
      return 99999;
    };

    // Calculate Subtotals and Averages
    const stagesResult = Array.from(stagesMap.values()).map(stg => {
      const gradesResult = Array.from(stg.gradesMap.values()).map(grd => {
        const classesList = Array.from(grd.classesMap.values());
        
        // Sort strictly ascending (1, 2, 3, 4 ... 10, 11, 12 ...)
        classesList.sort((a, b) => {
          const numA = extractClassNum(a.className);
          const numB = extractClassNum(b.className);
          if (numA !== numB) return numA - numB;
          return String(a.className).localeCompare(String(b.className), 'ar', { numeric: true });
        });
        
        classesList.forEach(cls => {
          grd.subtotal.classesCount++;
          grd.subtotal.muslimBoys += cls.muslimBoys;
          grd.subtotal.christianBoys += cls.christianBoys;
          grd.subtotal.boys += cls.boys;
          grd.subtotal.muslimGirls += cls.muslimGirls;
          grd.subtotal.christianGirls += cls.christianGirls;
          grd.subtotal.girls += cls.girls;
          grd.subtotal.mergedCount += cls.mergedCount;
          grd.subtotal.totalStudents += cls.totalStudents;
          grd.subtotal.standardCapacity += cls.standardCapacity;

          if (cls.totalStudents < minD) minD = cls.totalStudents;
          if (cls.totalStudents > maxD) maxD = cls.totalStudents;
        });

        stg.subtotal.classesCount += grd.subtotal.classesCount;
        stg.subtotal.muslimBoys += grd.subtotal.muslimBoys;
        stg.subtotal.christianBoys += grd.subtotal.christianBoys;
        stg.subtotal.boys += grd.subtotal.boys;
        stg.subtotal.muslimGirls += grd.subtotal.muslimGirls;
        stg.subtotal.christianGirls += grd.subtotal.christianGirls;
        stg.subtotal.girls += grd.subtotal.girls;
        stg.subtotal.mergedCount += grd.subtotal.mergedCount;
        stg.subtotal.totalStudents += grd.subtotal.totalStudents;
        stg.subtotal.standardCapacity += grd.subtotal.standardCapacity;

        return {
          ...grd,
          classes: classesList,
          avgDensity: grd.subtotal.classesCount > 0 ? (grd.subtotal.totalStudents / grd.subtotal.classesCount).toFixed(1) : 0
        };
      });

      gTotal.classesCount += stg.subtotal.classesCount;
      gTotal.muslimBoys += stg.subtotal.muslimBoys;
      gTotal.christianBoys += stg.subtotal.christianBoys;
      gTotal.boys += stg.subtotal.boys;
      gTotal.muslimGirls += stg.subtotal.muslimGirls;
      gTotal.christianGirls += stg.subtotal.christianGirls;
      gTotal.girls += stg.subtotal.girls;
      gTotal.mergedCount += stg.subtotal.mergedCount;
      gTotal.totalStudents += stg.subtotal.totalStudents;
      gTotal.standardCapacity += stg.subtotal.standardCapacity;

      return {
        ...stg,
        grades: gradesResult,
        avgDensity: stg.subtotal.classesCount > 0 ? (stg.subtotal.totalStudents / stg.subtotal.classesCount).toFixed(1) : 0
      };
    });

    const schoolAvgDensity = gTotal.classesCount > 0 ? (gTotal.totalStudents / gTotal.classesCount).toFixed(1) : 0;

    return {
      stagesData: stagesResult,
      grandTotal: { ...gTotal, schoolAvgDensity },
      minDensity: minD === 999 ? 0 : minD,
      maxDensity: maxD
    };
  }, [students]);

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
            إحصاء الكثافة الطلابية والسعة الاستيعابية للفصول المدرسية
          </h2>
          <div className="report-subtitle-meta" style={{ fontSize: '12pt', fontWeight: 800, color: '#1e293b', marginTop: 3 }}>
            العام الدراسي: <strong>{academicYear} م</strong> | إجمالي الفصول: <strong>{grandTotal.classesCount}</strong> | إجمالي الطلاب: <strong>{grandTotal.totalStudents}</strong> | متوسط الكثافة: <strong>{grandTotal.schoolAvgDensity}</strong> طالب/فصل
          </div>
        </div>

        <div className="header-col-left" style={{ textAlign: 'left', fontSize: '12.5pt', fontWeight: 700, width: '30%', lineHeight: 1.5 }}>
          <div>العام الدراسي: <strong>{academicYear} م</strong></div>
          <div>تاريخ الاعتماد: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></div>
          <div>كود الاستمارة: <strong>NEP-CLASS-CAPACITY</strong></div>
        </div>
      </div>

      {/* Metric Cards Banner with Large Clear Numbers */}
      <div style={{ display: 'flex', gap: 12, margin: '8px 0 12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <div style={{ padding: '6px 16px', background: '#0f172a', color: '#fff', borderRadius: 6, fontSize: '12pt', fontWeight: 800 }}>
          إجمالي الفصول: <span style={{ fontSize: '14pt', fontWeight: 900, marginRight: 6, color: '#38bdf8' }}>{toArNum(grandTotal.classesCount)}</span>
        </div>
        <div style={{ padding: '6px 16px', background: '#1d4ed8', color: '#fff', borderRadius: 6, fontSize: '12pt', fontWeight: 800 }}>
          إجمالي المقيدين: <span style={{ fontSize: '14pt', fontWeight: 900, marginRight: 6, color: '#93c5fd' }}>{toArNum(grandTotal.totalStudents)}</span>
        </div>
        <div style={{ padding: '6px 16px', background: '#047857', color: '#fff', borderRadius: 6, fontSize: '12pt', fontWeight: 800 }}>
          متوسط الكثافة: <span style={{ fontSize: '14pt', fontWeight: 900, marginRight: 6, color: '#6ee7b7' }}>{grandTotal.schoolAvgDensity}</span> طالب/فصل
        </div>
        <div style={{ padding: '6px 16px', background: '#b45309', color: '#fff', borderRadius: 6, fontSize: '12pt', fontWeight: 800 }}>
          أعلى كثافة فصل: <span style={{ fontSize: '14pt', fontWeight: 900, marginRight: 6, color: '#fde68a' }}>{toArNum(maxDensity)}</span>
        </div>
        <div style={{ padding: '6px 16px', background: '#334155', color: '#fff', borderRadius: 6, fontSize: '12pt', fontWeight: 800 }}>
          أدنى كثافة فصل: <span style={{ fontSize: '14pt', fontWeight: 900, marginRight: 6, color: '#e2e8f0' }}>{toArNum(minDensity)}</span>
        </div>
      </div>

      {/* Main Matrix Table with Large Numerals */}
      <div className="register-table-wrap" style={{ width: '100%', overflowX: 'hidden' }}>
        <table className="register-table" dir="rtl" style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', fontSize: '11.5pt', textAlign: 'center' }}>
          <thead>
            <tr style={{ background: '#0f766e', color: '#fff', fontWeight: 900, fontSize: '12pt' }}>
              <th rowSpan="2" style={{ border: '1.5px solid #000', padding: '6px 2px', width: 32 }}>م</th>
              <th rowSpan="2" style={{ border: '1.5px solid #000', padding: '6px 4px', width: '12%' }}>الصف الدراسي</th>
              <th rowSpan="2" style={{ border: '1.5px solid #000', padding: '6px 4px', width: 75 }}>الفصل</th>
              <th colSpan="3" style={{ border: '1.5px solid #000', padding: '5px', background: '#115e59' }}>بنين</th>
              <th colSpan="3" style={{ border: '1.5px solid #000', padding: '5px', background: '#115e59' }}>بنات</th>
              <th rowSpan="2" style={{ border: '1.5px solid #000', padding: '6px 3px', width: 75, background: '#0d9488', fontWeight: 900 }}>الجملة الفعلية</th>
              <th rowSpan="2" style={{ border: '1.5px solid #000', padding: '6px 3px', width: 65 }}>طلاب الدمج</th>
              <th rowSpan="2" style={{ border: '1.5px solid #000', padding: '6px 3px', width: 70 }}>السعة المعتمدة</th>
              <th rowSpan="2" style={{ border: '1.5px solid #000', padding: '6px 3px', width: 75 }}>معدل الإشغال</th>
              <th rowSpan="2" style={{ border: '1.5px solid #000', padding: '6px 4px', width: 100 }}>مؤشر الكثافة</th>
            </tr>
            <tr style={{ background: '#134e4a', color: '#fff', fontWeight: 900, fontSize: '11pt' }}>
              <th style={{ border: '1.5px solid #000', padding: '4px 2px', width: 45 }}>مسلم</th>
              <th style={{ border: '1.5px solid #000', padding: '4px 2px', width: 45 }}>مسيحي</th>
              <th style={{ border: '1.5px solid #000', padding: '4px 2px', width: 55, background: '#042f2e', fontWeight: 900 }}>جملة</th>
              <th style={{ border: '1.5px solid #000', padding: '4px 2px', width: 45 }}>مسلم</th>
              <th style={{ border: '1.5px solid #000', padding: '4px 2px', width: 45 }}>مسيحي</th>
              <th style={{ border: '1.5px solid #000', padding: '4px 2px', width: 55, background: '#042f2e', fontWeight: 900 }}>جملة</th>
            </tr>
          </thead>
          <tbody>
            {stagesData.length > 0 ? (
              stagesData.map((stg, sIdx) => (
                <React.Fragment key={stg.stageId || sIdx}>
                  {stg.grades.map((grd, gIdx) => (
                    <React.Fragment key={grd.gradeId || gIdx}>
                      {grd.classes.map((cls, cIdx) => {
                        const occupancy = cls.standardCapacity > 0 ? Math.round((cls.totalStudents / cls.standardCapacity) * 100) : 100;
                        const densityBadge = cls.totalStudents > 45 ? 'مرتفعة جداً' : cls.totalStudents > 38 ? 'فوق المتوسط' : 'طبيعية ومعتدلة';
                        const badgeColor = cls.totalStudents > 45 ? '#b91c1c' : cls.totalStudents > 38 ? '#b45309' : '#047857';

                        return (
                          <tr key={cls.classId || cIdx} style={{ background: cIdx % 2 === 1 ? '#f8fafc' : '#fff' }}>
                            <td style={{ border: '1px solid #000', padding: '5px 2px', fontWeight: 800, fontSize: '11.5pt' }}>{cIdx + 1}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right', fontWeight: 800, fontSize: '11.5pt' }}>{grd.gradeName}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 4px', fontWeight: 900, fontSize: '12pt' }}>{cls.className}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 2px', fontSize: '12pt', fontWeight: 700 }}>{toArNum(cls.muslimBoys)}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 2px', fontSize: '12pt', fontWeight: 700 }}>{toArNum(cls.christianBoys)}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '12.5pt', background: '#f1f5f9' }}>{toArNum(cls.boys)}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 2px', fontSize: '12pt', fontWeight: 700 }}>{toArNum(cls.muslimGirls)}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 2px', fontSize: '12pt', fontWeight: 700 }}>{toArNum(cls.christianGirls)}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '12.5pt', background: '#f1f5f9' }}>{toArNum(cls.girls)}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '13pt', background: '#e0f2fe', color: '#0369a1' }}>{toArNum(cls.totalStudents)}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 2px', fontSize: '11.5pt', fontWeight: 700 }}>{toArNum(cls.mergedCount)}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 2px', fontSize: '11.5pt', fontWeight: 700, color: '#64748b' }}>{toArNum(cls.standardCapacity)}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 2px', fontWeight: 800, fontSize: '11.5pt' }}>{occupancy}%</td>
                            <td style={{ border: '1px solid #000', padding: '5px 3px', fontWeight: 900, color: badgeColor, fontSize: '11pt' }}>
                              {densityBadge}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Grade Subtotal */}
                      <tr style={{ background: '#e2e8f0', fontWeight: 900, fontSize: '12pt' }}>
                        <td colSpan="3" style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'right', fontSize: '12pt' }}>
                          إجمالي {grd.gradeName} ({grd.classes.length} فصول - متوسط: {grd.avgDensity})
                        </td>
                        <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12.5pt' }}>{toArNum(grd.subtotal.muslimBoys)}</td>
                        <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12.5pt' }}>{toArNum(grd.subtotal.christianBoys)}</td>
                        <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '13pt', background: '#cbd5e1' }}>{toArNum(grd.subtotal.boys)}</td>
                        <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12.5pt' }}>{toArNum(grd.subtotal.muslimGirls)}</td>
                        <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12.5pt' }}>{toArNum(grd.subtotal.christianGirls)}</td>
                        <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '13pt', background: '#cbd5e1' }}>{toArNum(grd.subtotal.girls)}</td>
                        <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '13.5pt', background: '#bfdbfe', color: '#1e3a8a' }}>{toArNum(grd.subtotal.totalStudents)}</td>
                        <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12pt' }}>{toArNum(grd.subtotal.mergedCount)}</td>
                        <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12pt' }}>{toArNum(grd.subtotal.standardCapacity)}</td>
                        <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12pt' }}>{grd.subtotal.standardCapacity > 0 ? `${Math.round((grd.subtotal.totalStudents / grd.subtotal.standardCapacity) * 100)}%` : '—'}</td>
                        <td style={{ border: '1.5px solid #000', padding: '5px 3px', fontSize: '11pt' }}>متوسط: {grd.avgDensity}</td>
                      </tr>
                    </React.Fragment>
                  ))}
                  {/* Stage Subtotal */}
                  <tr style={{ background: '#fef3c7', fontWeight: 900, fontSize: '12.5pt', borderTop: '2px solid #000' }}>
                    <td colSpan="3" style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'right' }}>
                      إجمالي {stg.stageName} ({stg.subtotal.classesCount} فصول - متوسط كثافة المرحلة: {stg.avgDensity})
                    </td>
                    <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12.5pt' }}>{toArNum(stg.subtotal.muslimBoys)}</td>
                    <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12.5pt' }}>{toArNum(stg.subtotal.christianBoys)}</td>
                    <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '13pt' }}>{toArNum(stg.subtotal.boys)}</td>
                    <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12.5pt' }}>{toArNum(stg.subtotal.muslimGirls)}</td>
                    <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12.5pt' }}>{toArNum(stg.subtotal.christianGirls)}</td>
                    <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '13pt' }}>{toArNum(stg.subtotal.girls)}</td>
                    <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '13.5pt', background: '#fde68a', color: '#78350f' }}>{toArNum(stg.subtotal.totalStudents)}</td>
                    <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12pt' }}>{toArNum(stg.subtotal.mergedCount)}</td>
                    <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12pt' }}>{toArNum(stg.subtotal.standardCapacity)}</td>
                    <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12pt' }}>{stg.subtotal.standardCapacity > 0 ? `${Math.round((stg.subtotal.totalStudents / stg.subtotal.standardCapacity) * 100)}%` : '—'}</td>
                    <td style={{ border: '1.5px solid #000', padding: '5px 3px', fontSize: '11pt' }}>متوسط: {stg.avgDensity}</td>
                  </tr>
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan="14" style={{ textAlign: 'center', padding: 28, color: '#64748b', fontWeight: 700, fontSize: '12pt' }}>
                  لا توجد بيانات مسجلة مطابقة لفلاتر البحث
                </td>
              </tr>
            )}
          </tbody>
          {/* Grand Total Footer Row */}
          <tfoot>
            <tr style={{ background: '#cbd5e1', color: '#000', fontWeight: 900, borderTop: '2.5px solid #000', fontSize: '13pt' }}>
              <td colSpan="3" style={{ border: '1.5px solid #000', padding: '7px 8px', textAlign: 'right' }}>
                الإجمالي العام للمدرسة بالكامل ({grandTotal.classesCount} فصل - متوسط الكثافة: {grandTotal.schoolAvgDensity})
              </td>
              <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '13pt' }}>{toArNum(grandTotal.muslimBoys)}</td>
              <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '13pt' }}>{toArNum(grandTotal.christianBoys)}</td>
              <td style={{ border: '1.5px solid #000', padding: '5px 2px', background: '#94a3b8', fontSize: '13.5pt' }}>{toArNum(grandTotal.boys)}</td>
              <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '13pt' }}>{toArNum(grandTotal.muslimGirls)}</td>
              <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '13pt' }}>{toArNum(grandTotal.christianGirls)}</td>
              <td style={{ border: '1.5px solid #000', padding: '5px 2px', background: '#94a3b8', fontSize: '13.5pt' }}>{toArNum(grandTotal.girls)}</td>
              <td style={{ border: '1.5px solid #000', padding: '5px 2px', background: '#93c5fd', fontSize: '14pt', color: '#1e3a8a' }}>{toArNum(grandTotal.totalStudents)}</td>
              <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12.5pt' }}>{toArNum(grandTotal.mergedCount)}</td>
              <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12.5pt' }}>{toArNum(grandTotal.standardCapacity)}</td>
              <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12.5pt' }}>{grandTotal.standardCapacity > 0 ? `${Math.round((grandTotal.totalStudents / grandTotal.standardCapacity) * 100)}%` : '—'}</td>
              <td style={{ border: '1.5px solid #000', padding: '5px 3px', fontSize: '11.5pt' }}>متوسط: {grandTotal.schoolAvgDensity}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 4-Part Official Ministerial Footer */}
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
          <div>مسؤول الإحصاء وتوزيع الفصول</div>
          <div style={{ marginTop: 18, color: '#000' }}>التوقيع: ..........................</div>
        </div>
        <div>
          <div>المراجع والأخصائي</div>
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

const classCapacityStat = {
  id:          'class-capacity-stat',
  name:        'إحصاء الكثافة الطلابية ومؤشرات سعة الفصول',
  desc:        'مصفوفة الإحصاء المجمعة لكثافات الفصول وسعة المقاعد ونسب الإشغال ومتوسط الكثافة لكل مرحلة وصف',
  category:    'الإحصائيات والتحليلات الرسمية',
  icon:        '🏫',
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
    `إحصاء_كثافة_الفصول_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  PreviewComponent: ClassCapacityStatPreview,
};

export default classCapacityStat;

