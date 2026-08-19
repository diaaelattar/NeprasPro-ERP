// ════════════════════════════════════════════════════════════════
//  Report Definition: سجل حصر الطلاب من أبناء العاملين بالتربية والتعليم
//  الترويسة الثلاثية القياسية + الفرز الشامل + التذييل الرسمي الرباعي
// ════════════════════════════════════════════════════════════════
import React, { useMemo } from 'react';

const toArNum = (num) => {
  if (num === 0 || num === '0' || num === null || num === undefined || num === '') return '-';
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (d) => digits[d]);
};

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

function ParentStaffAffiliationPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear, selectedClassroom } = meta;

  const cleanSchool = (schoolInfo.schoolName || schoolInfo.school_name || '').replace(/^مدرسة\s*/, '').trim();
  const rawAdmin = schoolInfo.directorate || schoolInfo.administration || '';
  const cleanAdmin = rawAdmin.replace(/^إدارة\s*/, '').replace(/التعليمية\s*$/, '').trim();
  const governorate = schoolInfo.governorate || 'الجيزة';
  const academicYear = selectedYear?.year_label || schoolInfo.academicYear || '2025/2026';

  // ── Filter Staff Children ──
  const staffChildrenList = useMemo(() => {
    const list = (students || []).filter(s => {
      const staffFlag = s.is_staff_child === 1 || s.is_staff === 1 || s.is_staff_child === true;
      const jobText = `${s.guardian_job || ''} ${s.father_job || ''} ${s.mother_job || ''} ${s.fee_discount_category || ''} ${s.special_case_name || ''} ${s.notes || ''}`.toLowerCase();
      return staffFlag || jobText.includes('تربية وتعليم') || jobText.includes('تعليم') || jobText.includes('معلم') || jobText.includes('مدرس') || jobText.includes('إداري') || jobText.includes('عاملين');
    });

    const order = meta.genderOrder || meta.filters?.genderOrder || 'none';

    return list.sort((a, b) => {
      // 1. فرز الفصول تصاعدياً
      const clsA = a.classroom_name || a.class_name || '';
      const clsB = b.classroom_name || b.class_name || '';
      if (clsA !== clsB) {
        const numA = extractClassNum(clsA);
        const numB = extractClassNum(clsB);
        if (numA !== numB) return numA - numB;
        const cCompare = String(clsA).localeCompare(String(clsB), 'ar', { numeric: true });
        if (cCompare !== 0) return cCompare;
      }

      // 2. فرز النوع
      const isBoyA = (a.gender || '').trim() === 'ذكر' || (a.gender || '').trim() === 'بنين';
      const isBoyB = (b.gender || '').trim() === 'ذكر' || (b.gender || '').trim() === 'بنين';

      if (order === 'boys_first') {
        if (isBoyA && !isBoyB) return -1;
        if (!isBoyA && isBoyB) return 1;
      } else if (order === 'girls_first') {
        if (!isBoyA && isBoyB) return -1;
        if (isBoyA && !isBoyB) return 1;
      }

      return String(a.full_name_ar || '').localeCompare(String(b.full_name_ar || ''), 'ar', { sensitivity: 'base' });
    });
  }, [students, meta.genderOrder, meta.filters]);

  const targetLabel = selectedClassroom?.class_name
    ? `${selectedGrade?.grade_name_ar || ''} — فصل ${selectedClassroom.class_name}`
    : `${selectedGrade?.grade_name_ar || 'جميع صفوف وفصول المدرسة'}`;

  return (
    <div className="report-preview printable-page-block" id="print-area" data-orientation="landscape" style={{
      padding: '10px 14px',
      background: '#fff',
      color: '#000',
      fontFamily: 'Cairo, Tahoma, Arial, sans-serif'
    }}>
      {/* ══ الترويسة الثلاثية القياسية الرسمية ══ */}
      <div className="report-official-header" style={{
        marginBottom: 8,
        paddingBottom: 6,
        borderBottom: '2px solid #000',
        display: 'grid',
        gridTemplateColumns: '32% 38% 30%',
        alignItems: 'center',
        gap: 10,
        direction: 'rtl'
      }}>
        <div className="header-col-right" style={{ textAlign: 'right', fontSize: '11.5pt', lineHeight: 1.4, fontWeight: 700 }}>
          <div>مديرية التربية والتعليم بمحافظة: <strong>{governorate || '................'}</strong></div>
          <div>إدارة: <strong>{cleanAdmin ? `${cleanAdmin} التعليمية` : '................'}</strong></div>
          <div>مدرسة: <strong>{cleanSchool || '................'}</strong></div>
        </div>

        <div className="header-col-center" style={{ textAlign: 'center' }}>
          <h2 className="report-title-main" style={{
            fontSize: '15pt',
            fontWeight: 900,
            color: '#000',
            margin: 0,
            textDecoration: 'underline'
          }}>
            سجل حصر الطلاب من أبناء العاملين بالتربية والتعليم
          </h2>
          <div className="report-subtitle-meta" style={{ fontSize: '11.5pt', fontWeight: 800, color: '#1e293b', marginTop: 2 }}>
            {targetLabel} | العام الدراسي: <strong>{academicYear} م</strong> | الإجمالي: <strong>{staffChildrenList.length}</strong> طالب
          </div>
        </div>

        <div className="header-col-left" style={{ textAlign: 'left', fontSize: '11.5pt', fontWeight: 700, lineHeight: 1.4 }}>
          <div>العام الدراسي: <strong>{academicYear} م</strong></div>
          <div>تاريخ الاعتماد: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></div>
          <div>كود الاستمارة: <strong>NEP-STAFF-CHILDREN</strong></div>
        </div>
      </div>

      {/* Metric Badge */}
      <div style={{ display: 'flex', gap: 10, margin: '6px 0 10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <div style={{ padding: '4px 14px', background: '#0f172a', color: '#fff', borderRadius: 6, fontSize: '11pt', fontWeight: 800 }}>
          إجمالي أبناء العاملين بالتربية والتعليم: <span style={{ fontSize: '13pt', fontWeight: 900, marginRight: 6, color: '#38bdf8' }}>{toArNum(staffChildrenList.length)}</span>
        </div>
        <div style={{ padding: '4px 14px', background: '#4338ca', color: '#fff', borderRadius: 6, fontSize: '11pt', fontWeight: 800 }}>
          نسبة الخصم المقررة رسمياً: <span style={{ fontSize: '12pt', fontWeight: 900, marginRight: 4, color: '#c7d2fe' }}>خصم 50% لأبناء العاملين</span>
        </div>
      </div>

      {/* Table */}
      <div className="register-table-wrap" style={{ width: '100%', overflowX: 'hidden' }}>
        <table className="register-table" dir="rtl" style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1.5px solid #000',
          fontSize: '10.5pt',
          textAlign: 'center',
          tableLayout: 'fixed'
        }}>
          <colgroup>
            <col style={{ width: '3.5%' }} />  {/* م */}
            <col style={{ width: '23%' }} />   {/* اسم الطالب بالكامل */}
            <col style={{ width: '13%' }} />   {/* الرقم القومي للطالب */}
            <col style={{ width: '9%' }} />    {/* الصف */}
            <col style={{ width: '5.5%' }} />  {/* الفصل */}
            <col style={{ width: '16%' }} />   {/* اسم ولي الأمر */}
            <col style={{ width: '13%' }} />   {/* الرقم القومي لولي الأمر */}
            <col style={{ width: '10%' }} />   {/* جهة العمل */}
            <col style={{ width: '8.5%' }} />  {/* الوظيفة */}
            <col style={{ width: '8.5%' }} />  {/* نسبة الخصم */}
          </colgroup>
          <thead>
            <tr style={{ background: '#4338ca', color: '#fff', fontWeight: 900, fontSize: '11pt' }}>
              <th style={{ border: '1.5px solid #000', padding: '6px 2px' }}>م</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'right' }}>اسم الطالب بالكامل</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 2px' }}>الرقم القومي للطالب</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 2px' }}>الصف الدراسي</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 2px' }}>الفصل</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 4px' }}>اسم ولي الأمر (الموظف)</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 2px' }}>الرقم القومي لولي الأمر</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 2px' }}>جهة العمل / الإدارة</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 2px' }}>الوظيفة</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 2px' }}>نسبة الخصم</th>
            </tr>
          </thead>
          <tbody>
            {staffChildrenList.length > 0 ? (
              staffChildrenList.map((s, idx) => {
                const parentName = s.guardian_name || s.father_name || 'ولي الأمر';
                const parentNId = s.guardian_national_id || s.father_national_id || '—';
                const workplace = s.guardian_workplace || s.guardian_job_place || 'الإدارة التعليمية';
                const jobTitle = s.guardian_job || s.father_job || 'معلم / موظف';

                return (
                  <tr key={s.id || idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : '#fff' }}>
                    <td style={{ border: '1px solid #000', padding: '4px 2px', fontWeight: 800 }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'right', fontWeight: 800, fontSize: '11.5pt', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      {s.full_name_ar}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px 2px', fontFamily: 'monospace', fontSize: '10.5pt', fontWeight: 700, whiteSpace: 'nowrap' }} dir="ltr">
                      {s.national_id || '—'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px 2px', fontWeight: 700 }}>
                      {s.grade_name_ar || '—'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px 2px', fontWeight: 800, fontSize: '11pt', whiteSpace: 'nowrap' }}>
                      {s.classroom_name || s.class_name || '—'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px 4px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      {parentName}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px 2px', fontFamily: 'monospace', fontSize: '10pt', fontWeight: 700 }} dir="ltr">
                      {parentNId}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px 2px', fontWeight: 700, fontSize: '10pt' }}>
                      {workplace}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px 2px', fontWeight: 700, fontSize: '10pt' }}>
                      {jobTitle}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px 2px', fontWeight: 900, color: '#4338ca', background: '#eef2ff' }}>
                      خصم 50%
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: 25, color: '#64748b', fontWeight: 700, fontSize: '12pt' }}>
                  لا توجد حالات مسجلة لأبناء العاملين بالتربية والتعليم مطابقة لفلاتر البحث
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4-Part Official Signatures Footer */}
      <div className="official-signatures-footer" style={{
        marginTop: 14,
        paddingTop: 6,
        borderTop: '2px solid #000',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        textAlign: 'center',
        fontSize: '11.5pt',
        fontWeight: 800
      }}>
        <div>
          <div>مسؤول شؤون العاملين</div>
          <div style={{ marginTop: 14, color: '#000' }}>التوقيع: ..........................</div>
        </div>
        <div>
          <div>الأخصائي الاجتماعي</div>
          <div style={{ marginTop: 14, color: '#000' }}>التوقيع: ..........................</div>
        </div>
        <div>
          <div>وكيل شؤون الطلاب والتعليم</div>
          <div style={{ marginTop: 14, color: '#000' }}>التوقيع: ..........................</div>
        </div>
        <div>
          <div>مدير المدرسة (يعتمد وخاتم المدرسة)</div>
          <div style={{ marginTop: 14, color: '#000' }}>التوقيع: ..........................</div>
        </div>
      </div>

    </div>
  );
}

const parentStaffAffiliation = {
  id:          'parent-staff-affiliation',
  name:        'سجل حصر أبناء العاملين بالتربية والتعليم',
  desc:        'سجل حصر الطلاب من أبناء العاملين بقطاع التعليم والتربية والتعليم ومتابعة نسب الخصم والقرارات المعتمدة',
  category:    'السجلات المتخصصة',
  icon:        '👨‍🏫',
  orientation: 'landscape',
  available:   true,

  filters: {
    requiresGrade:   false,
    showClass:       true,
    requiresYear:    true,
    requiresSection: false,
    requiresStage:   false,
  },

  excelEndpoint: (f) =>
    `/api/students/export/excel?academicYearId=${f.academicYearId}&gradeId=${f.gradeId || ''}&classId=${f.classId || ''}&type=staff-children`,

  excelFileName: (f, meta) =>
    `سجل_أبناء_العاملين_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  buildQuery: (f) => {
    const q = new URLSearchParams({
      limit: 'all',
      status: 'all',
    });
    if (f.academicYearId) q.set('academicYearId', f.academicYearId);
    if (f.sectionId)      q.set('sectionId', f.sectionId);
    if (f.stageId)        q.set('stageId',   f.stageId);
    if (f.gradeId && f.gradeId !== 'all_stage') q.set('gradeId', f.gradeId);
    if (f.classId && f.classId !== 'all' && f.classId !== 'all_grade') q.set('classId', f.classId);
    if (f.genderOrder && f.genderOrder !== 'none') q.set('genderOrder', f.genderOrder);
    return q.toString();
  },

  PreviewComponent: ParentStaffAffiliationPreview,
};

export default parentStaffAffiliation;
