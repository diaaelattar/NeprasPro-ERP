// ════════════════════════════════════════════════════════════════
//  Report Definition: كشف 12 د (استمارة 12 د رسمية)
//  مطابق للمواصفات الوزارية المعتمدة والترويسة الثلاثية القياسية
// ════════════════════════════════════════════════════════════════
import React from 'react';
import { calculateAgeOnOct1st } from '../../../constants/lookupOptions';

function SeatingNumbers12DPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear } = meta;

  const cleanSchool = (schoolInfo.schoolName || schoolInfo.school_name || '').replace(/^مدرسة\s*/, '').trim();
  const rawAdmin = schoolInfo.directorate || schoolInfo.administration || '';
  const cleanAdmin = rawAdmin.replace(/^إدارة\s*/, '').replace(/التعليمية\s*$/, '').trim();
  const governorate = schoolInfo.governorate || 'الجيزة';
  const academicYear = selectedYear?.year_label || schoolInfo.academicYear || schoolInfo.academic_year || '2025/2026';

  // Statistical Counts for Badges
  const totalBoys = students.filter(s => (s.gender || '').trim() === 'ذكر' || (s.gender || '').trim() === 'بنين').length;
  const totalGirls = students.filter(s => (s.gender || '').trim() === 'أنثى' || (s.gender || '').trim() === 'بنات').length;
  const muslims = students.filter(s => (s.religion || '').trim().includes('مسلم')).length;
  const christians = students.filter(s => (s.religion || '').trim().includes('مسيح')).length;
  const mergedCount = students.filter(s => s.is_merged === 1 || s.is_merged === '1' || s.disability_id > 0).length;

  // ── Sort Students according to user preference (genderOrder: boys_first / girls_first / alphabetical) ──
  const sortedStudents = React.useMemo(() => {
    const list = [...(students || [])];
    const order = meta.genderOrder || meta.filters?.genderOrder || 'none';

    return list.sort((a, b) => {
      const isBoyA = (a.gender || '').trim() === 'ذكر' || (a.gender || '').trim() === 'بنين';
      const isBoyB = (b.gender || '').trim() === 'ذكر' || (b.gender || '').trim() === 'بنين';

      if (order === 'boys_first') {
        if (isBoyA && !isBoyB) return -1;
        if (!isBoyA && isBoyB) return 1;
      } else if (order === 'girls_first') {
        if (!isBoyA && isBoyB) return -1;
        if (isBoyA && !isBoyB) return 1;
      }

      // Sort alphabetically by Arabic name
      return String(a.full_name_ar || '').localeCompare(String(b.full_name_ar || ''), 'ar', { sensitivity: 'base' });
    });
  }, [students, meta.genderOrder, meta.filters]);

  // ── Compute Statistics Matrix for Page 2 (Grouped by Class / Grade) ──
  const statsMatrix = React.useMemo(() => {
    const groupsMap = new Map();
    let grandTotal = {
      promoted: 0,
      retained: 0,
      egyptians: 0,
      foreigners: 0,
      muslimBoys: 0,
      muslimGirls: 0,
      muslimTotal: 0,
      christianBoys: 0,
      christianGirls: 0,
      christianTotal: 0,
      boys: 0,
      girls: 0,
      total: 0,
      merged: 0
    };

    students.forEach(s => {
      const clsName = (s.classroom_name || s.class_name || (selectedGrade?.grade_name_ar ? `${selectedGrade.grade_name_ar}` : 'عام')).trim();
      if (!groupsMap.has(clsName)) {
        groupsMap.set(clsName, {
          name: clsName,
          promoted: 0,
          retained: 0,
          egyptians: 0,
          foreigners: 0,
          muslimBoys: 0,
          muslimGirls: 0,
          muslimTotal: 0,
          christianBoys: 0,
          christianGirls: 0,
          christianTotal: 0,
          boys: 0,
          girls: 0,
          total: 0,
          merged: 0
        });
      }

      const row = groupsMap.get(clsName);
      const isBoy = (s.gender || '').trim() === 'ذكر' || (s.gender || '').trim() === 'بنين';
      const isMuslim = (s.religion || '').trim().includes('مسلم');
      const isChristian = (s.religion || '').trim().includes('مسيح');
      const isRetained = (s.enrollment_status || '').includes('باق') || (s.status || '').includes('باق') || s.registration_status_id === 3;
      const isForeign = (s.nationality_id && s.nationality_id !== 1 && !(s.nationality_name || '').includes('مصر')) ||
                        (s.nationality_name && !s.nationality_name.includes('مصر') && s.nationality_name !== 'مصري');
      const isMerged = s.is_merged === 1 || s.is_merged === '1' || s.disability_id > 0;

      if (isMuslim) {
        if (isBoy) { row.muslimBoys++; grandTotal.muslimBoys++; }
        else { row.muslimGirls++; grandTotal.muslimGirls++; }
      } else if (isChristian) {
        if (isBoy) { row.christianBoys++; grandTotal.christianBoys++; }
        else { row.christianGirls++; grandTotal.christianGirls++; }
      } else {
        if (isBoy) { row.muslimBoys++; grandTotal.muslimBoys++; }
        else { row.muslimGirls++; grandTotal.muslimGirls++; }
      }

      if (isRetained) { row.retained++; grandTotal.retained++; }
      else { row.promoted++; grandTotal.promoted++; }

      if (isForeign) { row.foreigners++; grandTotal.foreigners++; }
      else { row.egyptians++; grandTotal.egyptians++; }

      if (isMerged) { row.merged++; grandTotal.merged++; }
    });

    const extractClassNum = (name) => {
      if (!name) return 99999;
      const match = String(name).match(/\d+/g);
      if (match) return parseInt(match[match.length - 1], 10);
      return 99999;
    };

    const rows = Array.from(groupsMap.values()).map(r => {
      r.muslimTotal = r.muslimBoys + r.muslimGirls;
      r.christianTotal = r.christianBoys + r.christianGirls;
      r.boys = r.muslimBoys + r.christianBoys;
      r.girls = r.muslimGirls + r.christianGirls;
      r.total = r.boys + r.girls;
      return r;
    });

    // Sort strictly ascending (1, 2, 3 ... 10, 11, 12 ...)
    rows.sort((a, b) => {
      const numA = extractClassNum(a.name);
      const numB = extractClassNum(b.name);
      if (numA !== numB) return numA - numB;
      return String(a.name).localeCompare(String(b.name), 'ar', { numeric: true });
    });

    grandTotal.muslimTotal = grandTotal.muslimBoys + grandTotal.muslimGirls;
    grandTotal.christianTotal = grandTotal.christianBoys + grandTotal.christianGirls;
    grandTotal.boys = grandTotal.muslimBoys + grandTotal.christianBoys;
    grandTotal.girls = grandTotal.muslimGirls + grandTotal.christianGirls;
    grandTotal.total = grandTotal.boys + grandTotal.girls;

    return { rows, grandTotal };
  }, [students, selectedGrade]);

  const cellBorder = { border: '1.5px solid #000' };
  const thStyle = { ...cellBorder, background: '#0d9488', padding: '6px 3px', textAlign: 'center', fontWeight: 900, fontSize: '13.5pt', color: '#fff' };
  const thSubStyle = { ...cellBorder, background: '#0f766e', padding: '5px 2px', textAlign: 'center', fontWeight: 800, fontSize: '12.5pt', color: '#fff' };
  const tdStyle = { ...cellBorder, padding: '4px 2px', textAlign: 'center', fontSize: '12.5pt', color: '#000', fontWeight: 700 };
  const grandTotalTdStyle = { ...cellBorder, background: '#5eead4', padding: '6px 2px', textAlign: 'center', fontSize: '13.5pt', fontWeight: 900, color: '#000' };

  return (
    <div className="report-preview" id="print-area" data-orientation="landscape">
      
      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── PAGE 1: كشف 12 د الاسمي المعتمد ─────────────────────────── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div className="printable-page-block" style={{ padding: '12px 16px', boxSizing: 'border-box', fontFamily: 'Cairo, Tahoma, Arial, sans-serif' }}>
        
        {/* ── Standard 3-Column Ministerial Header ── */}
        <div className="report-official-header" style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '2px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Right Column: Directorate, Administration, School only */}
          <div className="header-col-right" style={{ textAlign: 'right', fontSize: '13pt', lineHeight: 1.5, fontWeight: 700, width: '33%' }}>
            <div>مديرية التربية والتعليم بمحافظة: <strong>{governorate || '...............'}</strong></div>
            <div>إدارة: <strong>{cleanAdmin ? `${cleanAdmin} التعليمية` : '...............'}</strong></div>
            <div>مدرسة: <strong>{cleanSchool || '...............'}</strong></div>
          </div>

          {/* Center Column: Document Title & Grade */}
          <div className="header-col-center" style={{ textAlign: 'center', flex: 1, padding: '0 10px' }}>
            <h2 className="report-title-main" style={{ fontSize: '16pt', fontWeight: 900, margin: 0, textDecoration: 'underline', color: '#000' }}>
              كشف 12 د {selectedGrade?.grade_name_ar ? `(${selectedGrade.grade_name_ar})` : ''}
            </h2>
            <div className="report-subtitle-meta" style={{ fontSize: '13pt', fontWeight: 800, color: '#334155', marginTop: 4 }}>
              إجمالي الطلاب المقيدين: <strong>{students.length}</strong> طالب
            </div>
          </div>

          {/* Left Column: Academic Year, Date, Official Code */}
          <div className="header-col-left" style={{ textAlign: 'left', fontSize: '13pt', lineHeight: 1.4, fontWeight: 700, width: '30%' }}>
            <div>العام الدراسي: <strong>{academicYear} م</strong></div>
            <div>الفصل الدراسي: <strong>العام بالكامل</strong></div>
            <div>تاريخ الطباعة: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></div>
            <div>كود النموذج: <strong>استمارة 12 د</strong></div>
          </div>
        </div>

        {/* ── Summary Metric Badges ── */}
        <div style={{ display: 'flex', gap: 12, margin: '8px 0 12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ padding: '4px 14px', background: '#0f172a', color: '#fff', borderRadius: 6, fontSize: '13pt', fontWeight: 800 }}>
            إجمالي الطلاب: <span style={{ fontSize: '14pt', marginRight: 4 }}>{students.length}</span>
          </div>
          <div style={{ padding: '4px 14px', background: '#1d4ed8', color: '#fff', borderRadius: 6, fontSize: '13pt', fontWeight: 800 }}>
            بنين: <span style={{ fontSize: '14pt', marginRight: 4 }}>{totalBoys}</span> | بنات: <span style={{ fontSize: '14pt', marginRight: 4 }}>{totalGirls}</span>
          </div>
          <div style={{ padding: '4px 14px', background: '#047857', color: '#fff', borderRadius: 6, fontSize: '13pt', fontWeight: 800 }}>
            مسلم: <span style={{ fontSize: '14pt', marginRight: 4 }}>{muslims}</span> | مسيحي: <span style={{ fontSize: '14pt', marginRight: 4 }}>{christians}</span>
          </div>
          <div style={{ padding: '4px 14px', background: '#b45309', color: '#fff', borderRadius: 6, fontSize: '13pt', fontWeight: 800 }}>
            طلاب الدمج: <span style={{ fontSize: '14pt', marginRight: 4 }}>{mergedCount}</span>
          </div>
        </div>

        {/* ── 12-D Main Table: Expanded Name Column, Compact Minor Cols ── */}
        <div className="register-table-wrap" style={{ width: '100%', overflowX: 'hidden' }}>
          <table className="register-table" dir="rtl" style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', fontSize: '13pt', textAlign: 'center' }}>
            <thead>
              <tr style={{ background: '#e2e8f0', color: '#000', fontWeight: 900, fontSize: '13.5pt' }}>
                <th rowSpan={2} style={{ border: '1.5px solid #000', padding: '6px 2px', width: 38 }}>م</th>
                <th rowSpan={2} style={{ border: '1.5px solid #000', padding: '6px 12px', textAlign: 'right', width: '38%' }}>الاسم</th>
                <th rowSpan={2} style={{ border: '1.5px solid #000', padding: '6px 2px', width: 55, fontSize: '12pt' }}>الديانة</th>
                <th rowSpan={2} style={{ border: '1.5px solid #000', padding: '6px 2px', width: 65, fontSize: '12pt' }}>حالة القيد</th>
                <th rowSpan={2} style={{ border: '1.5px solid #000', padding: '6px 2px', width: 55, fontSize: '12pt' }}>الجنسية</th>
                <th rowSpan={2} style={{ border: '1.5px solid #000', padding: '6px 4px', width: 165 }}>الرقم القومي</th>
                <th colSpan={3} style={{ border: '1.5px solid #000', padding: '4px 2px', background: '#cbd5e1', width: 130 }}>السن في أول أكتوبر</th>
                <th rowSpan={2} style={{ border: '1.5px solid #000', padding: '6px 4px', width: 85, fontSize: '12pt' }}>الدمج</th>
              </tr>
              <tr style={{ background: '#f1f5f9', color: '#000', fontWeight: 800, fontSize: '12pt' }}>
                <th style={{ border: '1.5px solid #000', padding: '3px 1px', width: 43 }}>سنة</th>
                <th style={{ border: '1.5px solid #000', padding: '3px 1px', width: 43 }}>شهر</th>
                <th style={{ border: '1.5px solid #000', padding: '3px 1px', width: 44 }}>يوم</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.length > 0 ? (
                sortedStudents.map((s, idx) => {
                  const age = calculateAgeOnOct1st(s.birth_date || s.national_id, academicYear);
                  const isMerged = s.is_merged === 1 || s.is_merged === '1' || s.disability_id > 0;
                  const mergeLabel = isMerged ? (s.merge_type ? `مدمج (${s.merge_type})` : 'مدمج') : 'غير مدمج';
                  const nationalityLabel = (s.nationality_id && s.nationality_id !== 1 && !(s.nationality_name || '').includes('مصر')) ? (s.nationality_name || 'وافد') : 'مصري';

                  return (
                    <tr key={s.id || idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : '#fff', height: 32 }}>
                      {/* 1. م */}
                      <td style={{ border: '1px solid #000', padding: '3px 1px', fontWeight: 800, fontSize: '12.5pt' }}>
                        {idx + 1}
                      </td>

                      {/* 2. الاسم (Expanded, nowrap, font 14pt bold) */}
                      <td style={{ border: '1px solid #000', padding: '3px 10px', textAlign: 'right', fontWeight: 800, fontSize: '14pt', color: '#000', whiteSpace: 'nowrap' }}>
                        {s.full_name_ar}
                      </td>

                      {/* 3. الديانة (Font 12pt) */}
                      <td style={{ border: '1px solid #000', padding: '3px 2px', fontWeight: 700, fontSize: '12pt' }}>
                        {s.religion || 'مسلم'}
                      </td>

                      {/* 4. حالة القيد (Font 12pt) */}
                      <td style={{ border: '1px solid #000', padding: '3px 2px', fontWeight: 700, fontSize: '12pt' }}>
                        {s.enrollment_status || s.status || 'منقول'}
                      </td>

                      {/* 5. الجنسية (Font 12pt) */}
                      <td style={{ border: '1px solid #000', padding: '3px 2px', fontSize: '12pt', fontWeight: 700 }}>
                        {nationalityLabel}
                      </td>

                      {/* 6. الرقم القومي */}
                      <td style={{ border: '1px solid #000', padding: '3px 2px', fontFamily: 'monospace', fontSize: '13.5pt', fontWeight: 800, letterSpacing: '0.5px' }} dir="ltr">
                        {s.national_id || '—'}
                      </td>

                      {/* 7. السن في أول أكتوبر: سنة / شهر / يوم */}
                      <td style={{ border: '1px solid #000', padding: '3px 1px', fontWeight: 800, fontSize: '12.5pt' }}>
                        {age.years !== '' ? age.years : '—'}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '3px 1px', fontWeight: 800, fontSize: '12.5pt' }}>
                        {age.months !== '' ? age.months : '—'}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '3px 1px', fontWeight: 800, fontSize: '12.5pt' }}>
                        {age.days !== '' ? age.days : '—'}
                      </td>

                      {/* 8. الدمج (Font 12pt) */}
                      <td style={{ border: '1px solid #000', padding: '3px 2px', fontSize: '12pt', fontWeight: isMerged ? 800 : 600, color: isMerged ? '#b91c1c' : '#334155', background: isMerged ? '#fef2f2' : 'transparent' }}>
                        {mergeLabel}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 28, color: '#64748b', fontWeight: 800, fontSize: '14pt' }}>
                    لا توجد بيانات مسجلة مطابقة لفلاتر البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── 4-Part Official Ministerial Footer ── */}
        <div className="official-signatures-footer" style={{ marginTop: 22, paddingTop: 10, borderTop: '1.5px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13pt', fontWeight: 800 }}>
          <div>مسؤول شؤون الطلاب: ..........................</div>
          <div>المراجع والأخصائي: ..........................</div>
          <div>وكيل شؤون الطلاب: ..........................</div>
          <div>يعتمد مدير المدرسة وخاتم الشعار: ..........................</div>
        </div>

      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── PAGE 2: الإحصاء الختامي الشامل لكشف 12 د (الإجمالي فقط) ──── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div className="printable-page-block" style={{ padding: '16px 20px', boxSizing: 'border-box', marginTop: 24, fontFamily: 'Cairo, Tahoma, Arial, sans-serif' }}>
        
        {/* ── Standard 3-Column Ministerial Header (صارم) ── */}
        <div className="report-official-header" style={{ marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* اليمين: المديرية والإدارة والمدرسة فقط */}
          <div className="header-col-right" style={{ textAlign: 'right', fontSize: '13pt', lineHeight: 1.5, fontWeight: 700, width: '33%' }}>
            <div>مديرية التربية والتعليم بمحافظة: <strong>{governorate || '...............'}</strong></div>
            <div>إدارة: <strong>{cleanAdmin ? `${cleanAdmin} التعليمية` : '...............'}</strong></div>
            <div>مدرسة: <strong>{cleanSchool || '...............'}</strong></div>
          </div>

          {/* الوسط: عنوان الوثيقة الرسمي مسطر */}
          <div className="header-col-center" style={{ textAlign: 'center', flex: 1, padding: '0 10px' }}>
            <h2 className="report-title-main" style={{ fontSize: '16pt', fontWeight: 900, margin: 0, textDecoration: 'underline', color: '#000' }}>
              الإحصاء الختامي الشامل — كشف 12 د
            </h2>
            <div className="report-subtitle-meta" style={{ fontSize: '13.5pt', fontWeight: 800, color: '#1e293b', marginTop: 4 }}>
              {selectedGrade?.grade_name_ar ? `للصف: ${selectedGrade.grade_name_ar}` : 'لجميع الصفوف المقيدة'}
            </div>
            <div style={{ fontSize: '12.5pt', fontWeight: 700, color: '#334155', marginTop: 2 }}>
              إجمالي الطلاب المسجلين: <strong>{students.length}</strong> طالباً
            </div>
          </div>

          {/* اليسار: البيانات الإحصائية والتوثيق */}
          <div className="header-col-left" style={{ textAlign: 'left', fontSize: '13pt', lineHeight: 1.5, fontWeight: 700, width: '30%' }}>
            <div>العام الدراسي: <strong>{academicYear} م</strong></div>
            <div>الفصل الدراسي: <strong>العام بالكامل</strong></div>
            <div>تاريخ الاعتماد: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></div>
            <div>كود النموذج: <strong>استمارة 12 د إحصاء</strong></div>
          </div>
        </div>

        {/* ── جدول الإحصاء الشامل: صف واحد فقط للإجمالي ── */}
        <div style={{ width: '100%', overflowX: 'hidden', direction: 'rtl', marginTop: 18 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', direction: 'rtl', fontSize: '13pt', textAlign: 'center' }}>
            <thead>
              {/* Header Row 1 */}
              <tr>
                <th rowSpan="2" style={{ ...thStyle, width: '22%', textAlign: 'center' }}>البيان</th>
                <th colSpan="2" style={{ ...thStyle, background: '#0e7490' }}>حالة القيد</th>
                <th colSpan="2" style={{ ...thStyle, background: '#0e7490' }}>الجنسية</th>
                <th colSpan="3" style={{ ...thStyle, background: '#0d9488' }}>مسلم</th>
                <th colSpan="3" style={{ ...thStyle, background: '#0d9488' }}>مسيحي</th>
                <th colSpan="3" style={{ ...thStyle, background: '#0f766e' }}>الإجمالي العام</th>
                <th rowSpan="2" style={{ ...thStyle, width: '70px', background: '#be123c' }}>طلاب<br />الدمج</th>
              </tr>
              {/* Header Row 2 */}
              <tr>
                <th style={{ ...thSubStyle, width: '55px' }}>منقول</th>
                <th style={{ ...thSubStyle, width: '55px' }}>باق</th>
                <th style={{ ...thSubStyle, width: '55px' }}>مصري</th>
                <th style={{ ...thSubStyle, width: '55px' }}>وافد</th>
                <th style={{ ...thSubStyle, width: '55px' }}>بنين</th>
                <th style={{ ...thSubStyle, width: '55px' }}>بنات</th>
                <th style={{ ...thSubStyle, width: '60px', background: '#115e59' }}>جملة</th>
                <th style={{ ...thSubStyle, width: '55px' }}>بنين</th>
                <th style={{ ...thSubStyle, width: '55px' }}>بنات</th>
                <th style={{ ...thSubStyle, width: '60px', background: '#115e59' }}>جملة</th>
                <th style={{ ...thSubStyle, width: '58px' }}>بنين</th>
                <th style={{ ...thSubStyle, width: '58px' }}>بنات</th>
                <th style={{ ...thSubStyle, width: '68px', background: '#134e4a' }}>الجملة</th>
              </tr>
            </thead>
            <tbody>
              {/* سطر واحد فقط للإجمالي العام الشامل */}
              <tr style={{ background: '#5eead4', height: 48 }}>
                <td style={{ ...grandTotalTdStyle, textAlign: 'center', fontWeight: 900, fontSize: '14pt' }}>
                  {selectedGrade?.grade_name_ar ? `إجمالي ${selectedGrade.grade_name_ar}` : 'الإجمالي العام للمدرسة'}
                </td>
                <td style={grandTotalTdStyle}>{statsMatrix.grandTotal.promoted}</td>
                <td style={grandTotalTdStyle}>{statsMatrix.grandTotal.retained}</td>
                <td style={grandTotalTdStyle}>{statsMatrix.grandTotal.egyptians}</td>
                <td style={grandTotalTdStyle}>{statsMatrix.grandTotal.foreigners}</td>
                <td style={grandTotalTdStyle}>{statsMatrix.grandTotal.muslimBoys}</td>
                <td style={grandTotalTdStyle}>{statsMatrix.grandTotal.muslimGirls}</td>
                <td style={{ ...grandTotalTdStyle, fontWeight: 900 }}>{statsMatrix.grandTotal.muslimTotal}</td>
                <td style={grandTotalTdStyle}>{statsMatrix.grandTotal.christianBoys}</td>
                <td style={grandTotalTdStyle}>{statsMatrix.grandTotal.christianGirls}</td>
                <td style={{ ...grandTotalTdStyle, fontWeight: 900 }}>{statsMatrix.grandTotal.christianTotal}</td>
                <td style={grandTotalTdStyle}>{statsMatrix.grandTotal.boys}</td>
                <td style={grandTotalTdStyle}>{statsMatrix.grandTotal.girls}</td>
                <td style={{ ...grandTotalTdStyle, background: '#2dd4bf', fontWeight: 900, fontSize: '14.5pt' }}>{statsMatrix.grandTotal.total}</td>
                <td style={grandTotalTdStyle}>{statsMatrix.grandTotal.merged}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── 4-Part Official Ministerial Footer for Page 2 ── */}
        <div className="official-signatures-footer" style={{ marginTop: 32, paddingTop: 12, borderTop: '1.5px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13pt', fontWeight: 800 }}>
          <div>مسؤول شؤون الطلاب: ..........................</div>
          <div>المراجع والأخصائي: ..........................</div>
          <div>وكيل شؤون الطلاب: ..........................</div>
          <div>يعتمد مدير المدرسة وخاتم الشعار: ..........................</div>
        </div>

      </div>

    </div>
  );
}

const seatingNumbersList = {
  id:          'seating-numbers-list',
  name:        'كشف 12 د',
  desc:        'استمارة وكشف 12 د الرسمية المعتمدة (م - الاسم - الديانة - حالة القيد - الجنسية - الرقم القومي - السن في 1 أكتوبر - الدمج) مع الإحصاء الشامل',
  category:    'الكنترول والامتحانات',
  icon:        '📋',
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
    `كشف_12_د_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  PreviewComponent: SeatingNumbers12DPreview,
};

export default seatingNumbersList;
