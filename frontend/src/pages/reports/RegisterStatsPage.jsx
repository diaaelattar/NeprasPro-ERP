// ════════════════════════════════════════════════════════════════
//  RegisterStatsPage.jsx — صفحة الإحصاء الختامي المستقلة لسجلات القيد
// ════════════════════════════════════════════════════════════════
//  معتمدة ومطابقة للنماذج الوزارية الرسمية لوزارة التربية والتعليم (مقسمة إلى جزئين)
// ════════════════════════════════════════════════════════════════
import React from 'react';

// دالة تفقيط الأعداد بالعربية للأعداد حتى 9999
export const tafqeetArabic = (num) => {
  const n = parseInt(num, 10);
  if (isNaN(n) || n === 0) return 'صفر';
  if (n < 0) return 'سالب ' + tafqeetArabic(-n);

  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  if (n < 20) return ones[n];
  if (n < 100) {
    const o = n % 10;
    const t = Math.floor(n / 10);
    return (o > 0 ? ones[o] + ' و' : '') + tens[t];
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    return hundreds[h] + (rem > 0 ? ' و' + tafqeetArabic(rem) : '');
  }
  if (n < 10000) {
    const th = Math.floor(n / 1000);
    const rem = n % 1000;
    let thWord = '';
    if (th === 1) thWord = 'ألف';
    else if (th === 2) thWord = 'ألفان';
    else if (th >= 3 && th <= 10) thWord = ones[th] + ' آلاف';
    else thWord = tafqeetArabic(th) + ' ألفاً';
    return thWord + (rem > 0 ? ' و' + tafqeetArabic(rem) : '');
  }
  return String(n);
};

export default function RegisterStatsPage({
  title = 'سجل القيد',
  subTitle = '',
  registerCode = 'استمارة 41 ش.ط',
  students = [],
  meta = {},
  schoolInfo = {},
  pageIndex = 1,
  totalPages = 1,
  showClassBreakdown = false,
}) {
  const { selectedGrade, selectedYear } = meta;

  const cleanSchool = (schoolInfo.schoolName || schoolInfo.school_name || '').replace(/^مدرسة\s*/, '').trim();
  const rawAdmin = schoolInfo.directorate || schoolInfo.administration || '';
  const cleanAdmin = rawAdmin.replace(/^إدارة\s*/, '').replace(/التعليمية\s*$/, '').trim();
  const governorate = schoolInfo.governorate || 'الجيزة';
  const academicYearLabel = selectedYear?.year_label || schoolInfo.academicYear || schoolInfo.academic_year || '2025 / 2026';

  // ── حساب المصفوفة الإحصائية الدقيقة بجميع التفريعات ──
  const { classRows, grandTotal } = React.useMemo(() => {
    let grand = {
      classesCount: 0,
      total: 0,
      // الديانة
      muslimBoys: 0,
      christianBoys: 0,
      boysTotal: 0,
      muslimGirls: 0,
      christianGirls: 0,
      girlsTotal: 0,
      // حالة القيد
      promotedBoys: 0,
      retainedBoys: 0,
      promotedGirls: 0,
      retainedGirls: 0,
      // فئات خاصة
      mergedMuslim: 0,
      mergedChristian: 0,
      mergedTotal: 0,
      dropped: 0,
      foreigners: 0,
      returning: 0,
    };

    const classesMap = new Map();

    students.forEach(s => {
      const isMale = (s.gender || '').trim() === 'ذكر' || (s.gender || '').trim() === 'بنين';
      const isMuslim = (s.religion || '').trim().includes('مسلم') || s.religion === '1';
      const isChristian = (s.religion || '').trim().includes('مسيح') || s.religion === '2';

      // ── تصنيف دقيق لحالات القيد الوزارية الرسمية ──
      const stStr = `${s.enrollment_status || ''} ${s.status || ''} ${s.status_name || ''}`.trim();
      const stId = Number(s.registration_status_id || s.enrollment_status_id || 0);

      const isDropped = stStr.includes('منقطع') || stStr.includes('انقطاع') || stStr.includes('dropped') || stStr.includes('disconnected') || stId === 4;
      const isSuspended = stStr.includes('مفصول') || stStr.includes('فصل') || stStr.includes('موقوف') || stStr.includes('وقف قيد') || stStr.includes('suspended') || stStr.includes('expelled') || stId === 5;
      const isReturning = stStr.includes('عائد') || stStr.includes('عودة') || stStr.includes('returning') || stId === 7;
      const isRetained = (!isDropped && !isSuspended) && (stStr.includes('باق') || stStr.includes('إعادة') || stStr.includes('retained') || stId === 3);
      const isPromoted = (!isDropped && !isSuspended && !isRetained) && (stStr.includes('منقول') || stStr.includes('مستجد') || stStr.includes('new') || stStr.includes('promoted') || stStr.includes('active') || stId === 1 || stId === 2 || (!stStr && !stId));

      const isForeign = (s.nationality_id && s.nationality_id !== 1 && !(s.nationality_name || '').includes('مصر')) ||
                        (s.nationality_name && !s.nationality_name.includes('مصر') && s.nationality_name !== 'مصري');
      const isMerged = s.is_merged === 1 || s.is_merged === '1' || s.disability_id > 0;

      const clsName = (s.classroom_name || s.class_name || (selectedGrade?.grade_name_ar ? `${selectedGrade.grade_name_ar}` : 'عام')).trim();

      if (!classesMap.has(clsName)) {
        classesMap.set(clsName, {
          name: clsName,
          classesCount: 1,
          total: 0,
          muslimBoys: 0,
          christianBoys: 0,
          boysTotal: 0,
          muslimGirls: 0,
          christianGirls: 0,
          girlsTotal: 0,
          promotedBoys: 0,
          retainedBoys: 0,
          promotedGirls: 0,
          retainedGirls: 0,
          mergedMuslim: 0,
          mergedChristian: 0,
          mergedTotal: 0,
          dropped: 0,
          foreigners: 0,
          returning: 0,
        });
      }

      const row = classesMap.get(clsName);
      row.total++;
      grand.total++;

      // الديانة
      if (isMale) {
        row.boysTotal++;
        grand.boysTotal++;
        if (isMuslim) { row.muslimBoys++; grand.muslimBoys++; }
        else if (isChristian) { row.christianBoys++; grand.christianBoys++; }
        else { row.muslimBoys++; grand.muslimBoys++; }

        // حالة القيد بنين
        if (isRetained) { row.retainedBoys++; grand.retainedBoys++; }
        else if (isPromoted) { row.promotedBoys++; grand.promotedBoys++; }
      } else {
        row.girlsTotal++;
        grand.girlsTotal++;
        if (isMuslim) { row.muslimGirls++; grand.muslimGirls++; }
        else if (isChristian) { row.christianGirls++; grand.christianGirls++; }
        else { row.muslimGirls++; grand.muslimGirls++; }

        // حالة القيد بنات
        if (isRetained) { row.retainedGirls++; grand.retainedGirls++; }
        else if (isPromoted) { row.promotedGirls++; grand.promotedGirls++; }
      }

      // الدمج
      if (isMerged) {
        row.mergedTotal++;
        grand.mergedTotal++;
        if (isMuslim) { row.mergedMuslim++; grand.mergedMuslim++; }
        else if (isChristian) { row.mergedChristian++; grand.mergedChristian++; }
        else { row.mergedMuslim++; grand.mergedMuslim++; }
      }

      // منقطع / وافد / عائد
      if (isDropped) { row.dropped++; grand.dropped++; }
      if (isForeign) { row.foreigners++; grand.foreigners++; }
      if (isReturning) { row.returning++; grand.returning++; }
    });

    const extractClassNum = (name) => {
      if (!name) return 99999;
      const match = String(name).match(/\d+/g);
      if (match) return parseInt(match[match.length - 1], 10);
      return 99999;
    };

    const rows = Array.from(classesMap.values());
    rows.sort((a, b) => {
      const numA = extractClassNum(a.className);
      const numB = extractClassNum(b.className);
      if (numA !== numB) return numA - numB;
      return String(a.className).localeCompare(String(b.className), 'ar', { numeric: true });
    });
    grand.classesCount = rows.length || 1;

    return { classRows: rows, grandTotal: grand };
  }, [students, selectedGrade]);

  const totalWords = tafqeetArabic(grandTotal.total);

  const cellBorder = { border: '1.5px solid #000' };
  const thStyle = { ...cellBorder, background: '#0d9488', padding: '5px 3px', textAlign: 'center', fontWeight: 900, fontSize: '12.5pt', color: '#fff' };
  const thSubStyle = { ...cellBorder, background: '#0f766e', padding: '4px 2px', textAlign: 'center', fontWeight: 800, fontSize: '11.5pt', color: '#fff' };
  const tdStyle = { ...cellBorder, padding: '4px 2px', textAlign: 'center', fontSize: '12pt', color: '#000', fontWeight: 700 };
  const grandTotalTdStyle = { ...cellBorder, background: '#5eead4', padding: '5px 2px', textAlign: 'center', fontSize: '12.5pt', fontWeight: 900, color: '#000' };

  return (
    <div className="printable-page-block register-standalone-stats-page" style={{
      padding: '12px 16px',
      boxSizing: 'border-box',
      pageBreakBefore: 'always',
      pageBreakInside: 'avoid',
      background: '#fff',
      color: '#000',
      fontFamily: 'Cairo, Tahoma, Arial, sans-serif'
    }}>
      
      {/* ══ الترويسة الثلاثية الرسمية (الأسطر الثلاثة الصارمة) ══ */}
      <div className="report-official-header" style={{
        marginBottom: 10,
        paddingBottom: 8,
        borderBottom: '2px solid #000',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        direction: 'rtl'
      }}>
        {/* اليمين */}
        <div className="header-col-right" style={{ textAlign: 'right', fontSize: '13pt', lineHeight: 1.5, fontWeight: 700, width: '33%' }}>
          <div>مديرية التربية والتعليم بمحافظة: <strong>{governorate || '................'}</strong></div>
          <div>إدارة: <strong>{cleanAdmin ? `${cleanAdmin} التعليمية` : '................'}</strong></div>
          <div>مدرسة: <strong>{cleanSchool || '................'}</strong></div>
        </div>

        {/* الوسط */}
        <div className="header-col-center" style={{ textAlign: 'center', flex: 1 }}>
          <h2 className="report-title-main" style={{
            fontSize: '16pt',
            fontWeight: 900,
            color: '#000',
            margin: 0,
            textDecoration: 'underline'
          }}>
            الإحصاء الختامي الشامل — {title}
          </h2>
          <div className="report-subtitle-meta" style={{ fontSize: '13pt', fontWeight: 800, color: '#1e293b', marginTop: 3 }}>
            {subTitle || (selectedGrade?.grade_name_ar ? `للصف: ${selectedGrade.grade_name_ar}` : 'لجميع الصفوف المقيدة')} | إجمالي المسجلين: <strong>{grandTotal.total}</strong> طالباً
          </div>
        </div>

        {/* اليسار */}
        <div className="header-col-left" style={{ textAlign: 'left', fontSize: '13pt', fontWeight: 700, width: '30%', lineHeight: 1.5 }}>
          <div>العام الدراسي: <strong>{academicYearLabel} م</strong></div>
          <div>تاريخ الاعتماد: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></div>
          <div>كود النموذج: <strong>{registerCode}</strong></div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── الجزء الأول: التوزيع العددي والديانة (بنين وبنات) ──────────── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div style={{ margin: '10px 0' }}>
        <div style={{ fontWeight: 900, fontSize: '13pt', marginBottom: 4, textAlign: 'right', color: '#0f766e' }}>
          📌 الجزء الأول: التوزيع العددي وتصنيف الديانة (بنين / بنات):
        </div>
        <div style={{ width: '100%', overflowX: 'hidden', direction: 'rtl' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', fontSize: '12pt', textAlign: 'center' }}>
            <thead>
              {/* Header Row 1 */}
              <tr>
                <th rowSpan="2" style={{ ...thStyle, width: '22%', textAlign: 'right', paddingRight: '8px' }}>الصف / الفصل</th>
                <th rowSpan="2" style={{ ...thStyle, width: '50px' }}>عدد<br />الفصول</th>
                <th rowSpan="2" style={{ ...thStyle, width: '70px', background: '#0e7490' }}>إجمالي<br />الطلاب</th>
                <th colSpan="3" style={{ ...thStyle, background: '#0d9488' }}>بنون</th>
                <th colSpan="3" style={{ ...thStyle, background: '#0d9488' }}>بنات</th>
              </tr>
              {/* Header Row 2 */}
              <tr>
                <th style={{ ...thSubStyle, width: '55px' }}>مسلم</th>
                <th style={{ ...thSubStyle, width: '55px' }}>مسيحي</th>
                <th style={{ ...thSubStyle, width: '60px', background: '#115e59' }}>جملة</th>
                <th style={{ ...thSubStyle, width: '55px' }}>مسلم</th>
                <th style={{ ...thSubStyle, width: '55px' }}>مسيحي</th>
                <th style={{ ...thSubStyle, width: '60px', background: '#115e59' }}>جملة</th>
              </tr>
            </thead>
            <tbody>
              {showClassBreakdown && classRows.map((r, idx) => (
                <tr key={r.name || idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : '#fff' }}>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, paddingRight: '8px' }}>{r.name}</td>
                  <td style={tdStyle}>{r.classesCount || 1}</td>
                  <td style={{ ...tdStyle, fontWeight: 900, background: '#e0f2fe' }}>{r.total}</td>
                  <td style={tdStyle}>{r.muslimBoys || '-'}</td>
                  <td style={tdStyle}>{r.christianBoys || '-'}</td>
                  <td style={{ ...tdStyle, fontWeight: 800, background: '#f0fdfa' }}>{r.boysTotal}</td>
                  <td style={tdStyle}>{r.muslimGirls || '-'}</td>
                  <td style={tdStyle}>{r.christianGirls || '-'}</td>
                  <td style={{ ...tdStyle, fontWeight: 800, background: '#f0fdfa' }}>{r.girlsTotal}</td>
                </tr>
              ))}
              {/* صف الإجمالي العام للجزء الأول */}
              <tr style={{ background: '#5eead4', borderTop: showClassBreakdown ? '2.5px solid #000' : 'none' }}>
                <td style={{ ...grandTotalTdStyle, textAlign: 'right', paddingRight: '8px', fontSize: '13pt' }}>
                  {selectedGrade?.grade_name_ar ? `إجمالي ${selectedGrade.grade_name_ar}` : (title ? `إجمالي ${title}` : 'الإجمالي العام')}
                </td>
                <td style={{ ...grandTotalTdStyle, fontSize: '13pt' }}>{grandTotal.classesCount}</td>
                <td style={{ ...grandTotalTdStyle, background: '#2dd4bf', fontWeight: 900, fontSize: '13.5pt' }}>{grandTotal.total}</td>
                <td style={{ ...grandTotalTdStyle, fontSize: '13pt' }}>{grandTotal.muslimBoys}</td>
                <td style={{ ...grandTotalTdStyle, fontSize: '13pt' }}>{grandTotal.christianBoys}</td>
                <td style={{ ...grandTotalTdStyle, fontWeight: 900, fontSize: '13pt' }}>{grandTotal.boysTotal}</td>
                <td style={{ ...grandTotalTdStyle, fontSize: '13pt' }}>{grandTotal.muslimGirls}</td>
                <td style={{ ...grandTotalTdStyle, fontSize: '13pt' }}>{grandTotal.christianGirls}</td>
                <td style={{ ...grandTotalTdStyle, fontWeight: 900, fontSize: '13pt' }}>{grandTotal.girlsTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── الجزء الثاني: حالة القيد والفئات الخاصة (دمج، وافد، منقطع، عائد) */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div style={{ margin: '14px 0 10px' }}>
        <div style={{ fontWeight: 900, fontSize: '13pt', marginBottom: 4, textAlign: 'right', color: '#0e7490' }}>
          📌 الجزء الثاني: حالة القيد والفئات الخاصة (دمج / وافد / منقطع / عائد):
        </div>
        <div style={{ width: '100%', overflowX: 'hidden', direction: 'rtl' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', fontSize: '12pt', textAlign: 'center' }}>
            <thead>
              {/* Header Row 1 */}
              <tr>
                <th rowSpan="2" style={{ ...thStyle, width: '20%', textAlign: 'right', paddingRight: '8px', background: '#0e7490' }}>الصف / الفصل</th>
                <th colSpan="3" style={{ ...thStyle, background: '#0d9488' }}>حالة القيد - بنون</th>
                <th colSpan="3" style={{ ...thStyle, background: '#0d9488' }}>حالة القيد - بنات</th>
                <th colSpan="3" style={{ ...thStyle, background: '#be123c' }}>دمج</th>
                <th rowSpan="2" style={{ ...thStyle, width: '48px', background: '#475569' }}>منقطع</th>
                <th rowSpan="2" style={{ ...thStyle, width: '48px', background: '#475569' }}>وافد</th>
                <th rowSpan="2" style={{ ...thStyle, width: '48px', background: '#475569' }}>عائد</th>
              </tr>
              {/* Header Row 2 */}
              <tr>
                <th style={{ ...thSubStyle, width: '50px' }}>منقول/مستجد</th>
                <th style={{ ...thSubStyle, width: '45px' }}>باق</th>
                <th style={{ ...thSubStyle, width: '50px', background: '#115e59' }}>جملة</th>
                <th style={{ ...thSubStyle, width: '50px' }}>منقول/مستجد</th>
                <th style={{ ...thSubStyle, width: '45px' }}>باق</th>
                <th style={{ ...thSubStyle, width: '50px', background: '#115e59' }}>جملة</th>
                <th style={{ ...thSubStyle, width: '45px', background: '#9f1239' }}>مسلم</th>
                <th style={{ ...thSubStyle, width: '45px', background: '#9f1239' }}>مسيحي</th>
                <th style={{ ...thSubStyle, width: '50px', background: '#881337' }}>جملة</th>
              </tr>
            </thead>
            <tbody>
              {showClassBreakdown && classRows.map((r, idx) => (
                <tr key={r.name || idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : '#fff' }}>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, paddingRight: '8px' }}>{r.name}</td>
                  <td style={tdStyle}>{r.promotedBoys || '-'}</td>
                  <td style={tdStyle}>{r.retainedBoys || '-'}</td>
                  <td style={{ ...tdStyle, fontWeight: 800, background: '#f0fdfa' }}>{(r.promotedBoys + r.retainedBoys) || '-'}</td>
                  <td style={tdStyle}>{r.promotedGirls || '-'}</td>
                  <td style={tdStyle}>{r.retainedGirls || '-'}</td>
                  <td style={{ ...tdStyle, fontWeight: 800, background: '#f0fdfa' }}>{(r.promotedGirls + r.retainedGirls) || '-'}</td>
                  <td style={tdStyle}>{r.mergedMuslim || '-'}</td>
                  <td style={tdStyle}>{r.mergedChristian || '-'}</td>
                  <td style={{ ...tdStyle, fontWeight: 800, color: r.mergedTotal > 0 ? '#b91c1c' : '#000', background: r.mergedTotal > 0 ? '#fef2f2' : 'transparent' }}>{r.mergedTotal || '-'}</td>
                  <td style={tdStyle}>{r.dropped || '-'}</td>
                  <td style={tdStyle}>{r.foreigners || '-'}</td>
                  <td style={tdStyle}>{r.returning || '-'}</td>
                </tr>
              ))}
              {/* صف الإجمالي العام للجزء الثاني */}
              <tr style={{ background: '#5eead4', borderTop: showClassBreakdown ? '2.5px solid #000' : 'none' }}>
                <td style={{ ...grandTotalTdStyle, textAlign: 'right', paddingRight: '8px', fontSize: '13pt' }}>
                  {selectedGrade?.grade_name_ar ? `إجمالي ${selectedGrade.grade_name_ar}` : (title ? `إجمالي ${title}` : 'الإجمالي العام')}
                </td>
                <td style={{ ...grandTotalTdStyle, fontSize: '13pt' }}>{grandTotal.promotedBoys}</td>
                <td style={{ ...grandTotalTdStyle, fontSize: '13pt' }}>{grandTotal.retainedBoys}</td>
                <td style={{ ...grandTotalTdStyle, fontWeight: 900, fontSize: '13pt' }}>{grandTotal.promotedBoys + grandTotal.retainedBoys}</td>
                <td style={{ ...grandTotalTdStyle, fontSize: '13pt' }}>{grandTotal.promotedGirls}</td>
                <td style={{ ...grandTotalTdStyle, fontSize: '13pt' }}>{grandTotal.retainedGirls}</td>
                <td style={{ ...grandTotalTdStyle, fontWeight: 900, fontSize: '13pt' }}>{grandTotal.promotedGirls + grandTotal.retainedGirls}</td>
                <td style={{ ...grandTotalTdStyle, fontSize: '13pt' }}>{grandTotal.mergedMuslim}</td>
                <td style={{ ...grandTotalTdStyle, fontSize: '13pt' }}>{grandTotal.mergedChristian}</td>
                <td style={{ ...grandTotalTdStyle, fontWeight: 900, background: '#fecaca', color: '#991b1b', fontSize: '13pt' }}>{grandTotal.mergedTotal}</td>
                <td style={{ ...grandTotalTdStyle, fontSize: '13pt' }}>{grandTotal.dropped}</td>
                <td style={{ ...grandTotalTdStyle, fontSize: '13pt' }}>{grandTotal.foreigners}</td>
                <td style={{ ...grandTotalTdStyle, fontSize: '13pt' }}>{grandTotal.returning}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ بطاقة الإقرار الرسمي والتفقيط ══ */}
      <div style={{
        margin: '10px 0',
        padding: '8px 14px',
        border: '1.5px solid #000',
        borderRadius: 4,
        background: '#f8fafc',
        fontSize: '12.5pt',
        fontWeight: 800,
        lineHeight: 1.5,
        textAlign: 'right'
      }}>
        <div>
          📜 <strong>إقرار وتفقيط رسمي:</strong> نقر نحن الموقعين أدناه بصحة جميع البيانات والإحصائيات الواردة بهذا السجل، وأن جملة التلاميذ المقيدين به هي:
          <span style={{ margin: '0 6px', color: '#1e3a8a', fontSize: '13pt', textDecoration: 'underline' }}>
            ( {grandTotal.total} ) طالباً — فقط وقدره « {totalWords} طالباً » لا غير
          </span>
          ، ومطابقة لواقع شهادات الميلاد والملفات الرسمية المعتمدة لدى إدارة المدرسة.
        </div>
      </div>

      {/* ══ التذييل الرباعي الرسمي المعتمد ══ */}
      <div className="official-signatures-footer" style={{
        marginTop: 10,
        paddingTop: 8,
        borderTop: '2px solid #000',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        textAlign: 'center',
        fontSize: '12.5pt',
        fontWeight: 800
      }}>
        <div>
          <div>المسؤول المختص (كاتب السجل)</div>
          <div style={{ marginTop: 16, color: '#000' }}>التوقيع: ..........................</div>
        </div>
        <div>
          <div>المراجع والأخصائي</div>
          <div style={{ marginTop: 16, color: '#000' }}>التوقيع: ..........................</div>
        </div>
        <div>
          <div>وكيل شؤون الطلاب والتعليم</div>
          <div style={{ marginTop: 16, color: '#000' }}>التوقيع: ..........................</div>
        </div>
        <div>
          <div>مدير المدرسة (يعتمد وخاتم المدرسة)</div>
          <div style={{ marginTop: 16, color: '#000' }}>التوقيع: ..........................</div>
        </div>
      </div>

    </div>
  );
}
