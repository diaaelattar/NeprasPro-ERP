// ════════════════════════════════════════════════════════════════
//  Report Definition: إحصاء تصنيف وتوزيع الطلاب حسب الديانة والنوع
//  مصفوفة التوزيع الإحصائي المجمعة (مسلم / مسيحي / بنين / بنات) لكل مرحلة وصف وفصل
// ════════════════════════════════════════════════════════════════
import React, { useState, useMemo } from 'react';
import { sortStudentsByGenderAndName } from '../../../utils/studentSorter';

// تحويل الأرقام إلى أرقام عربية مشرقية معتمدة
const toArNum = (num) => {
  if (num === 0 || num === '0' || num === null || num === undefined || num === '') return '-';
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (d) => digits[d]);
};

// تحويل الأرقام العربية إلى إنجليزية للفرز
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

function ReligionGenderDistributionPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear } = meta;
  const [viewMode, setViewMode] = useState('matrix'); // 'matrix' or 'detailed'

  const cleanSchool = (schoolInfo.schoolName || schoolInfo.school_name || '').replace(/^مدرسة\s*/, '').trim();
  const rawAdmin = schoolInfo.directorate || schoolInfo.administration || '';
  const cleanAdmin = rawAdmin.replace(/^إدارة\s*/, '').replace(/التعليمية\s*$/, '').trim();
  const governorate = schoolInfo.governorate || 'الجيزة';
  const academicYear = selectedYear?.year_label || schoolInfo.academicYear || '2025/2026';

  // ── 1. Calculate Aggregated Matrix (Stage -> Grade -> Class) ──
  const { stagesData, grandTotal } = useMemo(() => {
    const stagesMap = new Map();

    const gTotal = {
      classesCount: 0,
      muslimBoys: 0,
      muslimGirls: 0,
      muslimTotal: 0,
      christianBoys: 0,
      christianGirls: 0,
      christianTotal: 0,
      totalBoys: 0,
      totalGirls: 0,
      totalStudents: 0
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
            muslimGirls: 0,
            muslimTotal: 0,
            christianBoys: 0,
            christianGirls: 0,
            christianTotal: 0,
            totalBoys: 0,
            totalGirls: 0,
            totalStudents: 0
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
            muslimGirls: 0,
            muslimTotal: 0,
            christianBoys: 0,
            christianGirls: 0,
            christianTotal: 0,
            totalBoys: 0,
            totalGirls: 0,
            totalStudents: 0
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
          muslimGirls: 0,
          muslimTotal: 0,
          christianBoys: 0,
          christianGirls: 0,
          christianTotal: 0,
          totalBoys: 0,
          totalGirls: 0,
          totalStudents: 0
        });
      }

      const cls = grd.classesMap.get(classId);
      const isBoy = (s.gender || '').trim() === 'ذكر' || (s.gender || '').trim() === 'بنين';
      const isMuslim = (s.religion || '').trim().includes('مسلم');
      const isChristian = (s.religion || '').trim().includes('مسيح');

      if (isMuslim) {
        if (isBoy) { cls.muslimBoys++; cls.totalBoys++; }
        else { cls.muslimGirls++; cls.totalGirls++; }
        cls.muslimTotal++;
      } else if (isChristian) {
        if (isBoy) { cls.christianBoys++; cls.totalBoys++; }
        else { cls.christianGirls++; cls.totalGirls++; }
        cls.christianTotal++;
      } else {
        // افتراضي مسلم
        if (isBoy) { cls.muslimBoys++; cls.totalBoys++; }
        else { cls.muslimGirls++; cls.totalGirls++; }
        cls.muslimTotal++;
      }
      cls.totalStudents++;
    });

    const stagesResult = Array.from(stagesMap.values()).map(stg => {
      const gradesResult = Array.from(stg.gradesMap.values()).map(grd => {
        const classesList = Array.from(grd.classesMap.values());

        // فرز الفصول تصاعدياً بشكل حسابي صارم
        classesList.sort((a, b) => {
          const numA = extractClassNum(a.className);
          const numB = extractClassNum(b.className);
          if (numA !== numB) return numA - numB;
          return String(a.className).localeCompare(String(b.className), 'ar', { numeric: true });
        });

        classesList.forEach(cls => {
          grd.subtotal.classesCount++;
          grd.subtotal.muslimBoys += cls.muslimBoys;
          grd.subtotal.muslimGirls += cls.muslimGirls;
          grd.subtotal.muslimTotal += cls.muslimTotal;
          grd.subtotal.christianBoys += cls.christianBoys;
          grd.subtotal.christianGirls += cls.christianGirls;
          grd.subtotal.christianTotal += cls.christianTotal;
          grd.subtotal.totalBoys += cls.totalBoys;
          grd.subtotal.totalGirls += cls.totalGirls;
          grd.subtotal.totalStudents += cls.totalStudents;
        });

        stg.subtotal.classesCount += grd.subtotal.classesCount;
        stg.subtotal.muslimBoys += grd.subtotal.muslimBoys;
        stg.subtotal.muslimGirls += grd.subtotal.muslimGirls;
        stg.subtotal.muslimTotal += grd.subtotal.muslimTotal;
        stg.subtotal.christianBoys += grd.subtotal.christianBoys;
        stg.subtotal.christianGirls += grd.subtotal.christianGirls;
        stg.subtotal.christianTotal += grd.subtotal.christianTotal;
        stg.subtotal.totalBoys += grd.subtotal.totalBoys;
        stg.subtotal.totalGirls += grd.subtotal.totalGirls;
        stg.subtotal.totalStudents += grd.subtotal.totalStudents;

        return { ...grd, classes: classesList };
      });

      gTotal.classesCount += stg.subtotal.classesCount;
      gTotal.muslimBoys += stg.subtotal.muslimBoys;
      gTotal.muslimGirls += stg.subtotal.muslimGirls;
      gTotal.muslimTotal += stg.subtotal.muslimTotal;
      gTotal.christianBoys += stg.subtotal.christianBoys;
      gTotal.christianGirls += stg.subtotal.christianGirls;
      gTotal.christianTotal += stg.subtotal.christianTotal;
      gTotal.totalBoys += stg.subtotal.totalBoys;
      gTotal.totalGirls += stg.subtotal.totalGirls;
      gTotal.totalStudents += stg.subtotal.totalStudents;

      return { ...stg, grades: gradesResult };
    });

    return { stagesData: stagesResult, grandTotal: gTotal };
  }, [students]);

  // ── 2. Sort Students for Detailed Nominal View ──
  const sortedStudents = useMemo(() => {
    return sortStudentsByGenderAndName(students, meta.genderOrder || meta.filters?.genderOrder || 'none');
  }, [students, meta.genderOrder, meta.filters]);

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
            إحصاء تصنيف وتوزيع الطلاب حسب الديانة والنوع
          </h2>
          <div className="report-subtitle-meta" style={{ fontSize: '12pt', fontWeight: 800, color: '#1e293b', marginTop: 3 }}>
            العام الدراسي: <strong>{academicYear} م</strong> | إجمالي الفصول: <strong>{grandTotal.classesCount}</strong> | إجمالي المقيدين: <strong>{grandTotal.totalStudents}</strong> طالب
          </div>
        </div>

        <div className="header-col-left" style={{ textAlign: 'left', fontSize: '12.5pt', fontWeight: 700, width: '30%', lineHeight: 1.5 }}>
          <div>العام الدراسي: <strong>{academicYear} م</strong></div>
          <div>تاريخ الاعتماد: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></div>
          <div>كود الاستمارة: <strong>NEP-RELIGION-GENDER</strong></div>
        </div>
      </div>

      {/* Metric Cards Banner with High-Contrast Large Fonts */}
      <div style={{ display: 'flex', gap: 10, margin: '8px 0 12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <div style={{ padding: '6px 14px', background: '#0f172a', color: '#fff', borderRadius: 6, fontSize: '11.5pt', fontWeight: 800 }}>
          إجمالي المقيدين: <span style={{ fontSize: '14pt', fontWeight: 900, marginRight: 6, color: '#38bdf8' }}>{toArNum(grandTotal.totalStudents)}</span>
        </div>
        <div style={{ padding: '6px 14px', background: '#047857', color: '#fff', borderRadius: 6, fontSize: '11.5pt', fontWeight: 800 }}>
          مسلم (بنين: <span style={{ color: '#a7f3d0' }}>{toArNum(grandTotal.muslimBoys)}</span> | بنات: <span style={{ color: '#a7f3d0' }}>{toArNum(grandTotal.muslimGirls)}</span>): <span style={{ fontSize: '14pt', fontWeight: 900, marginRight: 4, color: '#6ee7b7' }}>{toArNum(grandTotal.muslimTotal)}</span>
        </div>
        <div style={{ padding: '6px 14px', background: '#4338ca', color: '#fff', borderRadius: 6, fontSize: '11.5pt', fontWeight: 800 }}>
          مسيحي (بنين: <span style={{ color: '#c7d2fe' }}>{toArNum(grandTotal.christianBoys)}</span> | بنات: <span style={{ color: '#c7d2fe' }}>{toArNum(grandTotal.christianGirls)}</span>): <span style={{ fontSize: '14pt', fontWeight: 900, marginRight: 4, color: '#93c5fd' }}>{toArNum(grandTotal.christianTotal)}</span>
        </div>
        <div style={{ padding: '6px 14px', background: '#1e3a8a', color: '#fff', borderRadius: 6, fontSize: '11.5pt', fontWeight: 800 }}>
          إجمالي البنين: <span style={{ fontSize: '14pt', fontWeight: 900, marginRight: 4, color: '#bfdbfe' }}>{toArNum(grandTotal.totalBoys)}</span> | إجمالي البنات: <span style={{ fontSize: '14pt', fontWeight: 900, marginRight: 4, color: '#fbcfe8' }}>{toArNum(grandTotal.totalGirls)}</span>
        </div>
      </div>

      {/* View Mode Toggle Buttons (No-print) */}
      <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 10, justifyContent: 'flex-start' }}>
        <button
          onClick={() => setViewMode('matrix')}
          style={{
            padding: '5px 14px',
            borderRadius: 6,
            fontSize: '11.5pt',
            fontWeight: 800,
            cursor: 'pointer',
            background: viewMode === 'matrix' ? '#0f766e' : '#f1f5f9',
            color: viewMode === 'matrix' ? '#fff' : '#334155',
            border: '1.5px solid #0f766e'
          }}
        >
          📊 مصفوفة التوزيع الإحصائي المجمعة
        </button>
        <button
          onClick={() => setViewMode('detailed')}
          style={{
            padding: '5px 14px',
            borderRadius: 6,
            fontSize: '11.5pt',
            fontWeight: 800,
            cursor: 'pointer',
            background: viewMode === 'detailed' ? '#0f766e' : '#f1f5f9',
            color: viewMode === 'detailed' ? '#fff' : '#334155',
            border: '1.5px solid #0f766e'
          }}
        >
          📋 الكشف التفصيلي للطلاب بالديانة والنوع
        </button>
      </div>

      {/* ══ 1. OFFICIAL AGGREGATE MATRIX VIEW ══ */}
      {viewMode === 'matrix' ? (
        <div className="register-table-wrap" style={{ width: '100%', overflowX: 'hidden' }}>
          <table className="register-table" dir="rtl" style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', fontSize: '11.5pt', textAlign: 'center' }}>
            <thead>
              <tr style={{ background: '#0f766e', color: '#fff', fontWeight: 900, fontSize: '12pt' }}>
                <th rowSpan="2" style={{ border: '1.5px solid #000', padding: '6px 2px', width: 32 }}>م</th>
                <th rowSpan="2" style={{ border: '1.5px solid #000', padding: '6px 4px', width: '14%' }}>الصف الدراسي</th>
                <th rowSpan="2" style={{ border: '1.5px solid #000', padding: '6px 4px', width: 80 }}>الفصل</th>
                <th colSpan="3" style={{ border: '1.5px solid #000', padding: '5px', background: '#047857' }}>مسلم</th>
                <th colSpan="3" style={{ border: '1.5px solid #000', padding: '5px', background: '#4338ca' }}>مسيحي</th>
                <th colSpan="3" style={{ border: '1.5px solid #000', padding: '5px', background: '#1e3a8a' }}>إجمالي النوع</th>
                <th rowSpan="2" style={{ border: '1.5px solid #000', padding: '6px 3px', width: 85, background: '#0d9488', fontWeight: 900 }}>الجملة العامة</th>
                <th rowSpan="2" style={{ border: '1.5px solid #000', padding: '6px 3px', width: 75 }}>نسبة المسلمين</th>
                <th rowSpan="2" style={{ border: '1.5px solid #000', padding: '6px 3px', width: 75 }}>نسبة المسيحيين</th>
              </tr>
              <tr style={{ background: '#134e4a', color: '#fff', fontWeight: 900, fontSize: '11pt' }}>
                <th style={{ border: '1.5px solid #000', padding: '4px 2px', width: 45 }}>بنين</th>
                <th style={{ border: '1.5px solid #000', padding: '4px 2px', width: 45 }}>بنات</th>
                <th style={{ border: '1.5px solid #000', padding: '4px 2px', width: 55, background: '#065f46', fontWeight: 900 }}>جملة</th>
                <th style={{ border: '1.5px solid #000', padding: '4px 2px', width: 45 }}>بنين</th>
                <th style={{ border: '1.5px solid #000', padding: '4px 2px', width: 45 }}>بنات</th>
                <th style={{ border: '1.5px solid #000', padding: '4px 2px', width: 55, background: '#3730a3', fontWeight: 900 }}>جملة</th>
                <th style={{ border: '1.5px solid #000', padding: '4px 2px', width: 50 }}>بنين</th>
                <th style={{ border: '1.5px solid #000', padding: '4px 2px', width: 50 }}>بنات</th>
                <th style={{ border: '1.5px solid #000', padding: '4px 2px', width: 55, background: '#172554', fontWeight: 900 }}>إجمالي</th>
              </tr>
            </thead>
            <tbody>
              {stagesData.length > 0 ? (
                stagesData.map((stg, sIdx) => (
                  <React.Fragment key={stg.stageId || sIdx}>
                    {stg.grades.map((grd, gIdx) => (
                      <React.Fragment key={grd.gradeId || gIdx}>
                        {grd.classes.map((cls, cIdx) => {
                          const muslimPct = cls.totalStudents > 0 ? `${Math.round((cls.muslimTotal / cls.totalStudents) * 100)}%` : '—';
                          const christianPct = cls.totalStudents > 0 ? `${Math.round((cls.christianTotal / cls.totalStudents) * 100)}%` : '—';

                          return (
                            <tr key={cls.classId || cIdx} style={{ background: cIdx % 2 === 1 ? '#f8fafc' : '#fff' }}>
                              <td style={{ border: '1px solid #000', padding: '5px 2px', fontWeight: 800 }}>{cIdx + 1}</td>
                              <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right', fontWeight: 800 }}>{grd.gradeName}</td>
                              <td style={{ border: '1px solid #000', padding: '5px 4px', fontWeight: 900, fontSize: '12pt' }}>{cls.className}</td>
                              <td style={{ border: '1px solid #000', padding: '5px 2px', fontSize: '12pt', fontWeight: 700 }}>{toArNum(cls.muslimBoys)}</td>
                              <td style={{ border: '1px solid #000', padding: '5px 2px', fontSize: '12pt', fontWeight: 700 }}>{toArNum(cls.muslimGirls)}</td>
                              <td style={{ border: '1px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '12.5pt', background: '#dcfce7', color: '#166534' }}>{toArNum(cls.muslimTotal)}</td>
                              <td style={{ border: '1px solid #000', padding: '5px 2px', fontSize: '12pt', fontWeight: 700 }}>{toArNum(cls.christianBoys)}</td>
                              <td style={{ border: '1px solid #000', padding: '5px 2px', fontSize: '12pt', fontWeight: 700 }}>{toArNum(cls.christianGirls)}</td>
                              <td style={{ border: '1px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '12.5pt', background: '#e0e7ff', color: '#3730a3' }}>{toArNum(cls.christianTotal)}</td>
                              <td style={{ border: '1px solid #000', padding: '5px 2px', fontWeight: 800, fontSize: '12pt', background: '#f1f5f9' }}>{toArNum(cls.totalBoys)}</td>
                              <td style={{ border: '1px solid #000', padding: '5px 2px', fontWeight: 800, fontSize: '12pt', background: '#f1f5f9' }}>{toArNum(cls.totalGirls)}</td>
                              <td style={{ border: '1px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '12.5pt', background: '#e2e8f0' }}>{toArNum(cls.totalStudents)}</td>
                              <td style={{ border: '1px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '13pt', background: '#e0f2fe', color: '#0369a1' }}>{toArNum(cls.totalStudents)}</td>
                              <td style={{ border: '1px solid #000', padding: '5px 2px', fontSize: '11pt', fontWeight: 700 }}>{muslimPct}</td>
                              <td style={{ border: '1px solid #000', padding: '5px 2px', fontSize: '11pt', fontWeight: 700 }}>{christianPct}</td>
                            </tr>
                          );
                        })}
                        {/* Grade Subtotal */}
                        <tr style={{ background: '#e2e8f0', fontWeight: 900, fontSize: '12pt' }}>
                          <td colSpan="3" style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'right' }}>
                            إجمالي {grd.gradeName} ({grd.classes.length} فصول)
                          </td>
                          <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12.5pt' }}>{toArNum(grd.subtotal.muslimBoys)}</td>
                          <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12.5pt' }}>{toArNum(grd.subtotal.muslimGirls)}</td>
                          <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '13pt', background: '#bbf7d0', color: '#14532d' }}>{toArNum(grd.subtotal.muslimTotal)}</td>
                          <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12.5pt' }}>{toArNum(grd.subtotal.christianBoys)}</td>
                          <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12.5pt' }}>{toArNum(grd.subtotal.christianGirls)}</td>
                          <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '13pt', background: '#c7d2fe', color: '#312e81' }}>{toArNum(grd.subtotal.christianTotal)}</td>
                          <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '12.5pt' }}>{toArNum(grd.subtotal.totalBoys)}</td>
                          <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '12.5pt' }}>{toArNum(grd.subtotal.totalGirls)}</td>
                          <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '13pt', background: '#cbd5e1' }}>{toArNum(grd.subtotal.totalStudents)}</td>
                          <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '13.5pt', background: '#bfdbfe', color: '#1e3a8a' }}>{toArNum(grd.subtotal.totalStudents)}</td>
                          <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '11pt' }}>{grd.subtotal.totalStudents > 0 ? `${Math.round((grd.subtotal.muslimTotal / grd.subtotal.totalStudents) * 100)}%` : '—'}</td>
                          <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '11pt' }}>{grd.subtotal.totalStudents > 0 ? `${Math.round((grd.subtotal.christianTotal / grd.subtotal.totalStudents) * 100)}%` : '—'}</td>
                        </tr>
                      </React.Fragment>
                    ))}
                    {/* Stage Subtotal */}
                    <tr style={{ background: '#fef3c7', fontWeight: 900, fontSize: '12.5pt', borderTop: '2px solid #000' }}>
                      <td colSpan="3" style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'right' }}>
                        إجمالي {stg.stageName} ({stg.subtotal.classesCount} فصول)
                      </td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12.5pt' }}>{toArNum(stg.subtotal.muslimBoys)}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12.5pt' }}>{toArNum(stg.subtotal.muslimGirls)}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '13pt', background: '#86efac', color: '#14532d' }}>{toArNum(stg.subtotal.muslimTotal)}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12.5pt' }}>{toArNum(stg.subtotal.christianBoys)}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12.5pt' }}>{toArNum(stg.subtotal.christianGirls)}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '13pt', background: '#a5b4fc', color: '#312e81' }}>{toArNum(stg.subtotal.christianTotal)}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '13pt' }}>{toArNum(stg.subtotal.totalBoys)}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '13pt' }}>{toArNum(stg.subtotal.totalGirls)}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontWeight: 900, fontSize: '13.5pt', background: '#fde68a' }}>{toArNum(stg.subtotal.totalStudents)}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '13.5pt', background: '#fde68a', color: '#78350f' }}>{toArNum(stg.subtotal.totalStudents)}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '11pt' }}>{stg.subtotal.totalStudents > 0 ? `${Math.round((stg.subtotal.muslimTotal / stg.subtotal.totalStudents) * 100)}%` : '—'}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '11pt' }}>{stg.subtotal.totalStudents > 0 ? `${Math.round((stg.subtotal.christianTotal / stg.subtotal.totalStudents) * 100)}%` : '—'}</td>
                    </tr>
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="15" style={{ textAlign: 'center', padding: 28, color: '#64748b', fontWeight: 700, fontSize: '12pt' }}>
                    لا توجد بيانات مسجلة مطابقة لفلاتر البحث
                  </td>
                </tr>
              )}
            </tbody>
            {/* Grand Total Footer Row */}
            <tfoot>
              <tr style={{ background: '#cbd5e1', color: '#000', fontWeight: 900, borderTop: '2.5px solid #000', fontSize: '13pt' }}>
                <td colSpan="3" style={{ border: '1.5px solid #000', padding: '7px 8px', textAlign: 'right' }}>
                  الإجمالي العام للمدرسة بالكامل ({grandTotal.classesCount} فصل)
                </td>
                <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '13pt' }}>{toArNum(grandTotal.muslimBoys)}</td>
                <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '13pt' }}>{toArNum(grandTotal.muslimGirls)}</td>
                <td style={{ border: '1.5px solid #000', padding: '5px 2px', background: '#4ade80', fontSize: '13.5pt', color: '#052e16' }}>{toArNum(grandTotal.muslimTotal)}</td>
                <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '13pt' }}>{toArNum(grandTotal.christianBoys)}</td>
                <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '13pt' }}>{toArNum(grandTotal.christianGirls)}</td>
                <td style={{ border: '1.5px solid #000', padding: '5px 2px', background: '#818cf8', fontSize: '13.5pt', color: '#1e1b4b' }}>{toArNum(grandTotal.christianTotal)}</td>
                <td style={{ border: '1.5px solid #000', padding: '5px 2px', background: '#94a3b8', fontSize: '13.5pt' }}>{toArNum(grandTotal.totalBoys)}</td>
                <td style={{ border: '1.5px solid #000', padding: '5px 2px', background: '#94a3b8', fontSize: '13.5pt' }}>{toArNum(grandTotal.totalGirls)}</td>
                <td style={{ border: '1.5px solid #000', padding: '5px 2px', background: '#93c5fd', fontSize: '14pt', color: '#1e3a8a' }}>{toArNum(grandTotal.totalStudents)}</td>
                <td style={{ border: '1.5px solid #000', padding: '5px 2px', background: '#93c5fd', fontSize: '14pt', color: '#1e3a8a' }}>{toArNum(grandTotal.totalStudents)}</td>
                <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12pt' }}>{grandTotal.totalStudents > 0 ? `${Math.round((grandTotal.muslimTotal / grandTotal.totalStudents) * 100)}%` : '—'}</td>
                <td style={{ border: '1.5px solid #000', padding: '5px 2px', fontSize: '12pt' }}>{grandTotal.totalStudents > 0 ? `${Math.round((grandTotal.christianTotal / grandTotal.totalStudents) * 100)}%` : '—'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        /* ══ 2. DETAILED NOMINAL LIST VIEW ══ */
        <div className="register-table-wrap" style={{ width: '100%', overflowX: 'hidden' }}>
          <table className="register-table" dir="rtl" style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', fontSize: '11.5pt', textAlign: 'center' }}>
            <thead>
              <tr style={{ background: '#0f766e', color: '#fff', fontWeight: 900, fontSize: '12pt' }}>
                <th style={{ border: '1.5px solid #000', padding: '6px 3px', width: 32 }}>م</th>
                <th style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'right', width: '32%' }}>اسم الطالب بالكامل</th>
                <th style={{ border: '1.5px solid #000', padding: '6px 4px', width: 140 }}>الرقم القومي</th>
                <th style={{ border: '1.5px solid #000', padding: '6px 4px', width: 70 }}>النوع</th>
                <th style={{ border: '1.5px solid #000', padding: '6px 4px', width: 85, background: '#0d9488' }}>الديانة</th>
                <th style={{ border: '1.5px solid #000', padding: '6px 4px', width: 110 }}>الصف الدراسي</th>
                <th style={{ border: '1.5px solid #000', padding: '6px 4px', width: 80 }}>الفصل</th>
                <th style={{ border: '1.5px solid #000', padding: '6px 4px', width: 90 }}>حالة القيد</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.length > 0 ? (
                sortedStudents.map((s, idx) => {
                  const isMuslim = (s.religion || '').trim().includes('مسلم');
                  return (
                    <tr key={s.id || idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : '#fff' }}>
                      <td style={{ border: '1px solid #000', padding: '5px 2px', fontWeight: 800 }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'right', fontWeight: 800, fontSize: '12pt', whiteSpace: 'nowrap' }}>{s.full_name_ar}</td>
                      <td style={{ border: '1px solid #000', padding: '5px 2px', fontFamily: 'monospace', fontSize: '11pt', fontWeight: 700 }} dir="ltr">{s.national_id || '—'}</td>
                      <td style={{ border: '1px solid #000', padding: '5px 2px', fontWeight: 700 }}>{s.gender || '—'}</td>
                      <td style={{ border: '1px solid #000', padding: '5px 2px', fontWeight: 900, color: isMuslim ? '#15803d' : '#4338ca', background: isMuslim ? '#f0fdf4' : '#eef2ff' }}>
                        {s.religion || 'مسلم'}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '5px 4px', fontWeight: 700 }}>{s.grade_name_ar || '—'}</td>
                      <td style={{ border: '1px solid #000', padding: '5px 4px', fontWeight: 800 }}>{s.classroom_name || '—'}</td>
                      <td style={{ border: '1px solid #000', padding: '5px 2px', fontWeight: 700 }}>{s.enrollment_status || s.status || 'منقول'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: 28, color: '#64748b', fontWeight: 700, fontSize: '12pt' }}>
                    لا توجد بيانات مسجلة مطابقة لفلاتر البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 4-Part Official Signatures Footer */}
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

const religionGenderDistribution = {
  id:          'religion-gender-distribution',
  name:        'إحصاء تصنيف الطلاب حسب الديانة والنوع',
  desc:        'مصفوفة الإحصاء التكراري المجمعة لتوزيع الطلاب حسب الديانة (مسلم / مسيحي) والنوع (بنين / بنات) ونسب التوزيع لكل مرحلة وصف وفصل',
  category:    'الإحصائيات والتحليلات الرسمية',
  icon:        '📊',
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
    if (f.genderOrder && f.genderOrder !== 'none') q.set('genderOrder', f.genderOrder);
    return q.toString();
  },

  excelEndpoint: (f) =>
    `/api/students/export/excel?academicYearId=${f.academicYearId || ''}&type=general-census`,

  excelFileName: (f, meta) =>
    `إحصاء_الديانة_والنوع_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  PreviewComponent: ReligionGenderDistributionPreview,
};

export default religionGenderDistribution;
