// ════════════════════════════════════════════════════════════════
//  Report Definition: الإحصاء العام الشامل للمقيدين
//  مطابق للمصفوفة الوزارية الشاملة (مسلم / مسيحي / الإجمالي العام / حالة القيد / الجنسية / الدمج)
// ════════════════════════════════════════════════════════════════
import React from 'react';

function GeneralEnrolledCensusPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedYear } = meta;
  
  const cleanSchool = (schoolInfo.schoolName || schoolInfo.school_name || '').replace(/^مدرسة\s*/, '').trim();
  const rawAdmin = schoolInfo.directorate || schoolInfo.administration || '';
  const cleanAdmin = rawAdmin.replace(/^إدارة\s*/, '').replace(/التعليمية\s*$/, '').trim();
  const governorate = schoolInfo.governorate || 'الجيزة';
  const currentActiveYear = selectedYear?.year_label || schoolInfo.academicYear || schoolInfo.academic_year || '2025/2026';

  // Compute Groupings and Matrix
  const computedData = React.useMemo(() => {
    let grandTotal = {
      classesCount: 0,
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

    const stagesMap = new Map();

    students.forEach(s => {
      const stageName = (s.stage_name || 'المرحلة الدراسية').trim();
      const stageId = s.stage_id || stageName;
      const gradeName = (s.grade_name_ar || 'الصف').trim();
      const gradeId = s.grade_id || gradeName;

      if (!stagesMap.has(stageId)) {
        stagesMap.set(stageId, {
          stageId,
          stageName: stageName.startsWith('اجمالى') || stageName.startsWith('إجمالي') ? stageName : `إجمالي مرحلة ${stageName.replace(/المرحلة/g, '').trim()}`,
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

      const gradeRows = Array.from(stg.gradesMap.values()).map(grd => {
        const gradeStudents = grd.students;

        // Distinct classes
        const distinctClasses = new Set(gradeStudents.map(s => s.classroom_name || s.class_name || s.classroom_id).filter(Boolean));
        const classesCount = distinctClasses.size || (gradeStudents.length > 0 ? Math.ceil(gradeStudents.length / 35) : 0);

        let promoted = 0, retained = 0;
        let egyptians = 0, foreigners = 0;
        let muslimBoys = 0, muslimGirls = 0;
        let christianBoys = 0, christianGirls = 0;
        let merged = 0;

        gradeStudents.forEach(s => {
          const isBoy = (s.gender || '').trim() === 'ذكر' || (s.gender || '').trim() === 'بنين';
          const isMuslim = (s.religion || '').trim().includes('مسلم');
          const isChristian = (s.religion || '').trim().includes('مسيح');
          
          const isRetained = (s.enrollment_status || '').includes('باق') || (s.status || '').includes('باق') || s.registration_status_id === 3;
          const isPromoted = !isRetained;

          const isForeign = (s.nationality_id && s.nationality_id !== 1 && !(s.nationality_name || '').includes('مصر')) ||
                            (s.nationality_name && !s.nationality_name.includes('مصر') && s.nationality_name !== 'مصري');
          const isMerged = s.is_merged === 1 || s.is_merged === '1' || s.disability_id > 0;

          if (isMuslim) {
            if (isBoy) muslimBoys++;
            else muslimGirls++;
          } else if (isChristian) {
            if (isBoy) christianBoys++;
            else christianGirls++;
          } else {
            if (isBoy) muslimBoys++;
            else muslimGirls++;
          }

          if (isRetained) retained++;
          else promoted++;

          if (isForeign) foreigners++;
          else egyptians++;

          if (isMerged) merged++;
        });

        const muslimTotal = muslimBoys + muslimGirls;
        const christianTotal = christianBoys + christianGirls;
        const boys = muslimBoys + christianBoys;
        const girls = muslimGirls + christianGirls;
        const total = boys + girls;

        stageSubtotal.classesCount += classesCount;
        stageSubtotal.promoted += promoted;
        stageSubtotal.retained += retained;
        stageSubtotal.egyptians += egyptians;
        stageSubtotal.foreigners += foreigners;
        stageSubtotal.muslimBoys += muslimBoys;
        stageSubtotal.muslimGirls += muslimGirls;
        stageSubtotal.muslimTotal += muslimTotal;
        stageSubtotal.christianBoys += christianBoys;
        stageSubtotal.christianGirls += christianGirls;
        stageSubtotal.christianTotal += christianTotal;
        stageSubtotal.boys += boys;
        stageSubtotal.girls += girls;
        stageSubtotal.total += total;
        stageSubtotal.merged += merged;

        return {
          name: grd.gradeName,
          classesCount,
          promoted,
          retained,
          egyptians,
          foreigners,
          muslimBoys,
          muslimGirls,
          muslimTotal,
          christianBoys,
          christianGirls,
          christianTotal,
          boys,
          girls,
          total,
          merged
        };
      });

      grandTotal.classesCount += stageSubtotal.classesCount;
      grandTotal.promoted += stageSubtotal.promoted;
      grandTotal.retained += stageSubtotal.retained;
      grandTotal.egyptians += stageSubtotal.egyptians;
      grandTotal.foreigners += stageSubtotal.foreigners;
      grandTotal.muslimBoys += stageSubtotal.muslimBoys;
      grandTotal.muslimGirls += stageSubtotal.muslimGirls;
      grandTotal.muslimTotal += stageSubtotal.muslimTotal;
      grandTotal.christianBoys += stageSubtotal.christianBoys;
      grandTotal.christianGirls += stageSubtotal.christianGirls;
      grandTotal.christianTotal += stageSubtotal.christianTotal;
      grandTotal.boys += stageSubtotal.boys;
      grandTotal.girls += stageSubtotal.girls;
      grandTotal.total += stageSubtotal.total;
      grandTotal.merged += stageSubtotal.merged;

      return {
        stageName: stg.stageName,
        grades: gradeRows,
        subtotal: stageSubtotal
      };
    });

    return { stagesResult, grandTotal };
  }, [students]);

  const cellBorder = { border: '1.5px solid #000' };
  const thStyle = { ...cellBorder, background: '#0d9488', padding: '6px 3px', textAlign: 'center', fontWeight: 900, fontSize: '13.5pt', color: '#fff' };
  const thSubStyle = { ...cellBorder, background: '#0f766e', padding: '5px 2px', textAlign: 'center', fontWeight: 800, fontSize: '12.5pt', color: '#fff' };
  const tdStyle = { ...cellBorder, padding: '4px 2px', textAlign: 'center', fontSize: '12.5pt', color: '#000', fontWeight: 700 };
  const subtotalTdStyle = { ...cellBorder, background: '#ccfbf1', padding: '5px 2px', textAlign: 'center', fontSize: '13pt', fontWeight: 800, color: '#000' };
  const grandTotalTdStyle = { ...cellBorder, background: '#5eead4', padding: '6px 2px', textAlign: 'center', fontSize: '13.5pt', fontWeight: 900, color: '#000' };

  return (
    <div className="report-preview" id="print-area" data-orientation="landscape" style={{ background: '#fff', color: '#000', fontFamily: 'Cairo, Tahoma, Arial, sans-serif' }}>
      <div className="printable-page-block" style={{ padding: '10px 14px', boxSizing: 'border-box' }}>

        {/* ── Standard 3-Column Ministerial Header ── */}
        <div className="report-official-header" style={{ marginBottom: 8, paddingBottom: 6, borderBottom: '2px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Right Column: Directorate, Administration, School only */}
          <div className="header-col-right" style={{ textAlign: 'right', fontSize: '13pt', lineHeight: 1.5, fontWeight: 700, width: '33%' }}>
            <div>مديرية التربية والتعليم بمحافظة: <strong>{governorate || '...............'}</strong></div>
            <div>إدارة: <strong>{cleanAdmin ? `${cleanAdmin} التعليمية` : '...............'}</strong></div>
            <div>مدرسة: <strong>{cleanSchool || '...............'}</strong></div>
          </div>

          {/* Center Column: Document Title */}
          <div className="header-col-center" style={{ textAlign: 'center', flex: 1, padding: '0 10px' }}>
            <h2 className="report-title-main" style={{ fontSize: '16pt', fontWeight: 900, margin: 0, textDecoration: 'underline', color: '#000' }}>
              الإحصاء العام الشامل للمقيدين
            </h2>
            <div className="report-subtitle-meta" style={{ fontSize: '13.5pt', fontWeight: 800, color: '#1e293b', marginTop: 3 }}>
              لجميع الصفوف والمراحل الدراسية
            </div>
            <div style={{ fontSize: '12.5pt', fontWeight: 700, color: '#334155', marginTop: 2 }}>
              إجمالي الطلاب المقيدين: <strong>{students.length}</strong> طالب
            </div>
          </div>

          {/* Left Column: Academic Year, Date, Official Code */}
          <div className="header-col-left" style={{ textAlign: 'left', fontSize: '13pt', lineHeight: 1.4, fontWeight: 700, width: '30%' }}>
            <div>العام الدراسي: <strong>{currentActiveYear} م</strong></div>
            <div>الفصل الدراسي: <strong>العام بالكامل</strong></div>
            <div>تاريخ الطباعة: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></div>
            <div>كود النموذج: <strong>استمارة إحصاء شامل</strong></div>
          </div>
        </div>

        {/* ── Summary Badges ── */}
        <div style={{ display: 'flex', gap: 10, margin: '6px 0 10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ padding: '3px 12px', background: '#0f172a', color: '#fff', borderRadius: 6, fontSize: '12.5pt', fontWeight: 800 }}>
            إجمالي المقيدين: <span style={{ fontSize: '13.5pt', marginRight: 4 }}>{computedData.grandTotal.total}</span>
          </div>
          <div style={{ padding: '3px 12px', background: '#1d4ed8', color: '#fff', borderRadius: 6, fontSize: '12.5pt', fontWeight: 800 }}>
            بنين: <span style={{ fontSize: '13.5pt', marginRight: 4 }}>{computedData.grandTotal.boys}</span> | بنات: <span style={{ fontSize: '13.5pt', marginRight: 4 }}>{computedData.grandTotal.girls}</span>
          </div>
          <div style={{ padding: '3px 12px', background: '#047857', color: '#fff', borderRadius: 6, fontSize: '12.5pt', fontWeight: 800 }}>
            مسلم: <span style={{ fontSize: '13.5pt', marginRight: 4 }}>{computedData.grandTotal.muslimTotal}</span> | مسيحي: <span style={{ fontSize: '13.5pt', marginRight: 4 }}>{computedData.grandTotal.christianTotal}</span>
          </div>
          <div style={{ padding: '3px 12px', background: '#7c3aed', color: '#fff', borderRadius: 6, fontSize: '12.5pt', fontWeight: 800 }}>
            منقول: <span style={{ fontSize: '13.5pt', marginRight: 4 }}>{computedData.grandTotal.promoted}</span> | باق: <span style={{ fontSize: '13.5pt', marginRight: 4 }}>{computedData.grandTotal.retained}</span>
          </div>
          <div style={{ padding: '3px 12px', background: '#b45309', color: '#fff', borderRadius: 6, fontSize: '12.5pt', fontWeight: 800 }}>
            مصري: <span style={{ fontSize: '13.5pt', marginRight: 4 }}>{computedData.grandTotal.egyptians}</span> | وافد: <span style={{ fontSize: '13.5pt', marginRight: 4 }}>{computedData.grandTotal.foreigners}</span>
          </div>
          <div style={{ padding: '3px 12px', background: '#dc2626', color: '#fff', borderRadius: 6, fontSize: '12.5pt', fontWeight: 800 }}>
            دمج: <span style={{ fontSize: '13.5pt', marginRight: 4 }}>{computedData.grandTotal.merged}</span>
          </div>
        </div>

        {/* ── Comprehensive General Census Matrix Table (Matching Exact Layout) ── */}
        <div style={{ width: '100%', overflowX: 'hidden', direction: 'rtl' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', direction: 'rtl', fontSize: '12pt', textAlign: 'center' }}>
            <thead>
              {/* Header Row 1 */}
              <tr>
                <th rowSpan="2" style={{ ...thStyle, width: '20%', textAlign: 'right', paddingRight: '8px' }}>الصف الدراسي</th>
                <th colSpan="2" style={{ ...thStyle, background: '#0e7490' }}>حالة القيد</th>
                <th colSpan="2" style={{ ...thStyle, background: '#0e7490' }}>الجنسية</th>
                <th colSpan="3" style={{ ...thStyle, background: '#0d9488' }}>مسلم</th>
                <th colSpan="3" style={{ ...thStyle, background: '#0d9488' }}>مسيحي</th>
                <th colSpan="3" style={{ ...thStyle, background: '#0f766e' }}>الإجمالي العام</th>
                <th rowSpan="2" style={{ ...thStyle, width: '60px', background: '#be123c' }}>طلاب<br />الدمج</th>
              </tr>
              {/* Header Row 2 */}
              <tr>
                <th style={{ ...thSubStyle, width: '50px' }}>منقول</th>
                <th style={{ ...thSubStyle, width: '50px' }}>باق</th>
                <th style={{ ...thSubStyle, width: '50px' }}>مصري</th>
                <th style={{ ...thSubStyle, width: '50px' }}>وافد</th>
                <th style={{ ...thSubStyle, width: '50px' }}>بنين</th>
                <th style={{ ...thSubStyle, width: '50px' }}>بنات</th>
                <th style={{ ...thSubStyle, width: '54px', background: '#115e59' }}>جملة</th>
                <th style={{ ...thSubStyle, width: '50px' }}>بنين</th>
                <th style={{ ...thSubStyle, width: '50px' }}>بنات</th>
                <th style={{ ...thSubStyle, width: '54px', background: '#115e59' }}>جملة</th>
                <th style={{ ...thSubStyle, width: '52px' }}>بنين</th>
                <th style={{ ...thSubStyle, width: '52px' }}>بنات</th>
                <th style={{ ...thSubStyle, width: '60px', background: '#134e4a' }}>الجملة</th>
              </tr>
            </thead>
            <tbody>
              {computedData.stagesResult.length > 0 ? (
                computedData.stagesResult.map((stg, stgIdx) => (
                  <React.Fragment key={stg.stageName || stgIdx}>
                    {/* Grade Rows */}
                    {stg.grades.map((grd, gIdx) => (
                      <tr key={grd.name || gIdx} style={{ background: gIdx % 2 === 1 ? '#f8fafc' : '#fff' }}>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, paddingRight: '8px', fontSize: '13pt' }}>{grd.name}</td>
                        <td style={tdStyle}>{grd.promoted || '-'}</td>
                        <td style={tdStyle}>{grd.retained || '-'}</td>
                        <td style={tdStyle}>{grd.egyptians || '-'}</td>
                        <td style={tdStyle}>{grd.foreigners || '-'}</td>
                        <td style={tdStyle}>{grd.muslimBoys || '-'}</td>
                        <td style={tdStyle}>{grd.muslimGirls || '-'}</td>
                        <td style={{ ...tdStyle, fontWeight: 800, background: '#f0fdfa' }}>{grd.muslimTotal || '-'}</td>
                        <td style={tdStyle}>{grd.christianBoys || '-'}</td>
                        <td style={tdStyle}>{grd.christianGirls || '-'}</td>
                        <td style={{ ...tdStyle, fontWeight: 800, background: '#f0fdfa' }}>{grd.christianTotal || '-'}</td>
                        <td style={tdStyle}>{grd.boys || '-'}</td>
                        <td style={tdStyle}>{grd.girls || '-'}</td>
                        <td style={{ ...tdStyle, fontWeight: 900, background: '#e0f2fe' }}>{grd.total || '-'}</td>
                        <td style={{ ...tdStyle, color: grd.merged > 0 ? '#b91c1c' : '#000', fontWeight: grd.merged > 0 ? 800 : 700 }}>{grd.merged || '-'}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={15} style={{ textAlign: 'center', padding: 28, color: '#64748b', fontWeight: 800, fontSize: '13.5pt' }}>
                    لا توجد بيانات طلاب مسجلة في هذا البحث
                  </td>
                </tr>
              )}

              {/* ── Grand Total Row ── */}
              <tr style={{ background: '#5eead4', borderTop: '2.5px solid #000', borderBottom: '2.5px solid #000' }}>
                <td style={{ ...grandTotalTdStyle, textAlign: 'right', paddingRight: '8px' }}>الإجمالي العام للمدرسة</td>
                <td style={grandTotalTdStyle}>{computedData.grandTotal.promoted}</td>
                <td style={grandTotalTdStyle}>{computedData.grandTotal.retained}</td>
                <td style={grandTotalTdStyle}>{computedData.grandTotal.egyptians}</td>
                <td style={grandTotalTdStyle}>{computedData.grandTotal.foreigners}</td>
                <td style={grandTotalTdStyle}>{computedData.grandTotal.muslimBoys}</td>
                <td style={grandTotalTdStyle}>{computedData.grandTotal.muslimGirls}</td>
                <td style={{ ...grandTotalTdStyle, fontWeight: 900 }}>{computedData.grandTotal.muslimTotal}</td>
                <td style={grandTotalTdStyle}>{computedData.grandTotal.christianBoys}</td>
                <td style={grandTotalTdStyle}>{computedData.grandTotal.christianGirls}</td>
                <td style={{ ...grandTotalTdStyle, fontWeight: 900 }}>{computedData.grandTotal.christianTotal}</td>
                <td style={grandTotalTdStyle}>{computedData.grandTotal.boys}</td>
                <td style={grandTotalTdStyle}>{computedData.grandTotal.girls}</td>
                <td style={{ ...grandTotalTdStyle, background: '#2dd4bf', fontWeight: 900 }}>{computedData.grandTotal.total}</td>
                <td style={grandTotalTdStyle}>{computedData.grandTotal.merged}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── 4-Part Official Ministerial Footer ── */}
        <div className="official-signatures-footer" style={{ marginTop: 20, paddingTop: 8, borderTop: '1.5px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13pt', fontWeight: 800 }}>
          <div>مسؤول شؤون الطلاب: ..........................</div>
          <div>مسؤول الإحصاء: ..........................</div>
          <div>وكيل شؤون الطلاب والتعليم: ..........................</div>
          <div>يعتمد مدير المدرسة وخاتم الشعار: ..........................</div>
        </div>

      </div>
    </div>
  );
}

const generalEnrolledCensus = {
  id: 'general-enrolled-census',
  name: 'الإحصاء العام الشامل',
  desc: 'مصفوفة الإحصاء العام الشامل للمقيدين (الصف - الفصول - حالة القيد - الجنسية - مسلم - مسيحي - الإجمالي العام - طلاب الدمج)',
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
    q.set('status', 'all');
    if (f.academicYearId) q.set('academicYearId', f.academicYearId);
    if (f.sectionId)      q.set('sectionId', f.sectionId);
    if (f.stageId)        q.set('stageId', f.stageId);
    if (f.gradeId && f.gradeId !== 'all_stage') q.set('gradeId', f.gradeId);
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
  excelFileName: (f, meta) =>
    `الإحصاء_العام_الشامل_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,
  PreviewComponent: GeneralEnrolledCensusPreview,
};

export default generalEnrolledCensus;
