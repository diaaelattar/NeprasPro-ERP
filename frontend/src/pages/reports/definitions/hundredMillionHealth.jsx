// ════════════════════════════════════════════════════════════════
//  Report Definition: كشف مبادرة 100 مليون صحة (المسح الطبي الشامل)
//  مطابق للنموذج الرسمي لحملة 100 مليون صحة لعلاج السمنة والأنيميا والتقزم
// ════════════════════════════════════════════════════════════════
import React, { useMemo } from 'react';
import { isBoy } from '../../../utils/studentSorter';

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

function HundredMillionHealthPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear, selectedClassroom } = meta;

  const cleanSchool = (schoolInfo.schoolName || schoolInfo.school_name || '').replace(/^مدرسة\s*/, '').trim();
  const rawAdmin = schoolInfo.directorate || schoolInfo.administration || '';
  const cleanAdmin = rawAdmin.replace(/^إدارة\s*/, '').replace(/التعليمية\s*$/, '').trim();
  const governorate = schoolInfo.governorate || 'الجيزة';
  const academicYear = selectedYear?.year_label || schoolInfo.academicYear || '2025/2026';

  // ── Sort Students (by Class ascending + Gender Preference) ──
  const sortedStudents = useMemo(() => {
    const list = [...(students || [])];
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

      // 2. فرز النوع المختار
      const isBoyA = isBoy(a);
      const isBoyB = isBoy(b);

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
    : `${selectedGrade?.grade_name_ar || 'جميع فصول الصف'}`;

  const border = '1.5px solid #000';
  const thStyle = { border, padding: '4px 2px', textAlign: 'center', fontWeight: 900, fontSize: '11pt', color: '#000' };
  const tdStyle = { border: '1px solid #000', padding: '4px 2px', textAlign: 'center', fontSize: '11pt', color: '#000', fontWeight: 700 };

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
            كشف مبادرة 100 مليون صحة (المسح الطبي)
          </h2>
          <div className="report-subtitle-meta" style={{ fontSize: '11.5pt', fontWeight: 800, color: '#1e293b', marginTop: 2 }}>
            {targetLabel} | العام الدراسي: <strong>{academicYear} م</strong> | إجمالي الطلاب: <strong>{sortedStudents.length}</strong>
          </div>
        </div>

        <div className="header-col-left" style={{ textAlign: 'left', fontSize: '11.5pt', fontWeight: 700, lineHeight: 1.4 }}>
          <div>العام الدراسي: <strong>{academicYear} م</strong></div>
          <div>تاريخ الاعتماد: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></div>
          <div>كود الاستمارة: <strong>NEP-100M-HEALTH</strong></div>
        </div>
      </div>

      {/* ══ 100 Million Health Multi-Level Table ══ */}
      <div className="register-table-wrap" style={{ width: '100%', overflowX: 'hidden' }}>
        <table className="register-table" dir="rtl" style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1.5px solid #000',
          fontSize: '10pt',
          textAlign: 'center',
          tableLayout: 'fixed'
        }}>
          <colgroup>
            <col style={{ width: '3%' }} />   {/* م */}
            <col style={{ width: '26%' }} />  {/* اسم التلميذ رباعياً */}
            <col style={{ width: '5.5%' }} /> {/* الفصل */}
            <col style={{ width: '12.5%' }} />{/* الرقم القومي */}
            <col style={{ width: '10%' }} />  {/* التليفون */}
            {/* نتائج المسح */}
            <col style={{ width: '5.5%' }} /> {/* هيموجلوبين */}
            <col style={{ width: '4.5%' }} /> {/* طول */}
            {/* نتائج التسجيل */}
            <col style={{ width: '4.5%' }} /> {/* الكتلة */}
            <col style={{ width: '4%' }} />   {/* سلبي */}
            <col style={{ width: '4%' }} />   {/* إيجابي */}
            {/* الإحالة للعيادة */}
            <col style={{ width: '5.5%' }} /> {/* تاريخ */}
            <col style={{ width: '5.5%' }} /> {/* زيارة سابقة */}
            {/* متابعة الزائرة */}
            <col style={{ width: '4.5%' }} /> {/* سلبي */}
            <col style={{ width: '4.5%' }} /> {/* إيجابي */}
          </colgroup>
          <thead>
            {/* ── Row 1 ── */}
            <tr>
              <th rowSpan="3" style={{ ...thStyle, background: '#dcfce7' }}>م</th>
              <th rowSpan="3" style={{ ...thStyle, textAlign: 'right', paddingRight: '8px', background: '#dcfce7' }}>اسم التلميذ رباعياً</th>
              <th rowSpan="3" style={{ ...thStyle, background: '#dcfce7' }}>الفصل</th>
              <th rowSpan="3" style={{ ...thStyle, background: '#dcfce7' }}>الرقم القومى</th>
              <th rowSpan="3" style={{ ...thStyle, background: '#dcfce7' }}>التليفون</th>
              <th colSpan="2" rowSpan="2" style={{ ...thStyle, background: '#ffedd5' }}>نتائج المسح</th>
              <th colSpan="5" style={{ ...thStyle, background: '#e0f2fe' }}>تملأ بواسطة إدارة النظم بالفرع</th>
              <th colSpan="2" style={{ ...thStyle, background: '#fef9c3' }}>متابعة الزائرة</th>
            </tr>
            {/* ── Row 2 ── */}
            <tr>
              <th colSpan="3" style={{ ...thStyle, background: '#bae6fd' }}>نتائج التسجيل</th>
              <th colSpan="2" style={{ ...thStyle, background: '#bae6fd' }}>الإحالة للعيادة</th>
              <th colSpan="2" style={{ ...thStyle, background: '#fef08a' }}>نتيجة الإحالة للعيادة</th>
            </tr>
            {/* ── Row 3 ── */}
            <tr>
              <th style={{ ...thStyle, background: '#fed7aa', fontSize: '9pt' }}>هيموجلوبين</th>
              <th style={{ ...thStyle, background: '#fed7aa', fontSize: '9pt' }}>طول</th>
              <th style={{ ...thStyle, background: '#7dd3fc', fontSize: '9pt' }}>الكتلة</th>
              <th style={{ ...thStyle, background: '#7dd3fc', fontSize: '9pt' }}>سلبى</th>
              <th style={{ ...thStyle, background: '#7dd3fc', fontSize: '9pt' }}>إيجابى</th>
              <th style={{ ...thStyle, background: '#7dd3fc', fontSize: '9pt' }}>تاريخ</th>
              <th style={{ ...thStyle, background: '#7dd3fc', fontSize: '9pt' }}>زيارة سابقة</th>
              <th style={{ ...thStyle, background: '#fde047', fontSize: '9pt' }}>سلبى</th>
              <th style={{ ...thStyle, background: '#fde047', fontSize: '9pt' }}>إيجابى</th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.length > 0 ? (
              sortedStudents.map((s, idx) => {
                const phone = s.emergency_phone || s.guardian_phone || s.phone || s.mother_phone || '—';
                return (
                  <tr key={s.id || idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : '#fff' }}>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>{idx + 1}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', paddingRight: '8px', fontWeight: 800, fontSize: '11.5pt', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      {s.full_name_ar}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 800, fontSize: '11pt', whiteSpace: 'nowrap' }}>
                      {s.classroom_name || s.class_name || '—'}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '10.5pt', fontWeight: 700, whiteSpace: 'nowrap' }} dir="ltr">
                      {s.national_id || '—'}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '10pt', fontWeight: 700, whiteSpace: 'nowrap' }} dir="ltr">
                      {phone}
                    </td>
                    {/* نتائج المسح */}
                    <td style={{ ...tdStyle, height: 26 }}></td>
                    <td style={{ ...tdStyle, height: 26 }}></td>
                    {/* نتائج التسجيل */}
                    <td style={{ ...tdStyle, height: 26 }}></td>
                    <td style={{ ...tdStyle, height: 26 }}></td>
                    <td style={{ ...tdStyle, height: 26 }}></td>
                    {/* الإحالة للعيادة */}
                    <td style={{ ...tdStyle, height: 26 }}></td>
                    <td style={{ ...tdStyle, height: 26 }}></td>
                    {/* متابعة الزائرة */}
                    <td style={{ ...tdStyle, height: 26 }}></td>
                    <td style={{ ...tdStyle, height: 26 }}></td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="14" style={{ textAlign: 'center', padding: 25, color: '#64748b', fontWeight: 700, fontSize: '12pt' }}>
                  لا توجد بيانات مسجلة مطابقة لفلاتر البحث
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
          <div>الزائرة الصحية ومسؤول الحملة</div>
          <div style={{ marginTop: 14, color: '#000' }}>التوقيع: ..........................</div>
        </div>
        <div>
          <div>المراجع والأخصائي</div>
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

const hundredMillionHealth = {
  id:          'hundred-million-health',
  name:        'كشف 100 مليون صحة (المسح الطبي)',
  desc:        'كشف مبادرة 100 مليون صحة للمسح الطبي الشامل لطلاب المدارس (السمنة والأنيميا والتقزم ونتائج الإحالة)',
  category:    'الصحة والسلامة المدرسية',
  icon:        '🏥',
  orientation: 'landscape',
  available:   true,

  filters: {
    requiresGrade:   true,
    showClass:       true,
    requiresYear:    true,
    requiresSection: false,
    requiresStage:   false,
  },

  excelEndpoint: (f) =>
    `/api/students/export/excel?academicYearId=${f.academicYearId}&gradeId=${f.gradeId}&classId=${f.classId || ''}&type=100-million-health`,

  excelFileName: (f, meta) =>
    `كشف_100_مليون_صحة_${meta.selectedGrade?.grade_name_ar || ''}_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  buildQuery: (f) => {
    const q = new URLSearchParams({
      gradeId: f.gradeId,
      academicYearId: f.academicYearId,
      limit: 'all',
      status: 'all',
    });
    if (f.sectionId) q.set('sectionId', f.sectionId);
    if (f.stageId)   q.set('stageId',   f.stageId);
    if (f.classId && f.classId !== 'all' && f.classId !== 'all_grade') q.set('classId', f.classId);
    if (f.genderOrder && f.genderOrder !== 'none') q.set('genderOrder', f.genderOrder);
    return q.toString();
  },

  PreviewComponent: HundredMillionHealthPreview,
};

export default hundredMillionHealth;
