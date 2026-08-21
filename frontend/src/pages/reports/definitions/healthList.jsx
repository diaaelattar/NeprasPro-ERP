// ════════════════════════════════════════════════════════════════
//  Report Definition: كشف متابعة الفحص الطبي المدرسي
//  الترويسة الثلاثية القياسية + الفرز بالنوع والفصول + التذييل الرسمي الرباعي
// ════════════════════════════════════════════════════════════════
import React, { useMemo } from 'react';
import { isBoy } from '../../../utils/studentSorter';

const HEALTH_CHECKS = [
  { id: 'vision',   label: 'البصر' },
  { id: 'hearing',  label: 'السمع' },
  { id: 'weight',   label: 'الوزن' },
  { id: 'height',   label: 'الطول' },
  { id: 'skin',     label: 'الجلدية' },
  { id: 'teeth',    label: 'الأسنان' },
  { id: 'chest',    label: 'الصدر' },
  { id: 'general',  label: 'الحالة العامة' },
];

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

function HealthListPreview({ students = [], meta = {}, schoolInfo = {} }) {
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

  return (
    <div className="report-preview printable-page-block" id="print-area" data-orientation="landscape" style={{
      padding: '12px 16px',
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
            كشف متابعة الفحص الطبي المدرسي
          </h2>
          <div className="report-subtitle-meta" style={{ fontSize: '11.5pt', fontWeight: 800, color: '#1e293b', marginTop: 2 }}>
            {targetLabel} | العام الدراسي: <strong>{academicYear} م</strong> | إجمالي الطلاب: <strong>{sortedStudents.length}</strong>
          </div>
        </div>

        <div className="header-col-left" style={{ textAlign: 'left', fontSize: '11.5pt', fontWeight: 700, lineHeight: 1.4 }}>
          <div>العام الدراسي: <strong>{academicYear} م</strong></div>
          <div>تاريخ الاعتماد: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></div>
          <div>كود الاستمارة: <strong>NEP-HEALTH-LIST</strong></div>
        </div>
      </div>

      {/* Health Grid */}
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
            <col style={{ width: '3.5%' }} />  {/* م */}
            <col style={{ width: '28%' }} />   {/* اسم الطالب بالكامل */}
            <col style={{ width: '14%' }} />   {/* الرقم القومي */}
            <col style={{ width: '5%' }} />    {/* النوع */}
            <col style={{ width: '6.5%' }} />  {/* الفصل */}
            {/* 8 الفحوصات الطبية */}
            <col style={{ width: '4.5%' }} />
            <col style={{ width: '4.5%' }} />
            <col style={{ width: '4.5%' }} />
            <col style={{ width: '4.5%' }} />
            <col style={{ width: '4.5%' }} />
            <col style={{ width: '4.5%' }} />
            <col style={{ width: '4.5%' }} />
            <col style={{ width: '4.5%' }} />
            {/* ملاحظات */}
            <col style={{ width: '7%' }} />
          </colgroup>
          <thead>
            <tr style={{ background: '#7c3aed', color: '#fff', fontWeight: 900, fontSize: '11pt' }}>
              <th style={{ border: '1.5px solid #000', padding: '6px 2px' }}>م</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'right' }}>اسم الطالب بالكامل</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 2px' }}>الرقم القومي</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 2px' }}>النوع</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 2px' }}>الفصل</th>
              {HEALTH_CHECKS.map(h => (
                <th key={h.id} style={{ border: '1.5px solid #000', padding: '4px 1px', fontSize: '9pt', whiteSpace: 'nowrap' }}>
                  {h.label}
                </th>
              ))}
              <th style={{ border: '1.5px solid #000', padding: '6px 2px', fontSize: '9.5pt' }}>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.length > 0 ? (
              sortedStudents.map((s, idx) => {
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
                      {s.gender || '—'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px 2px', fontWeight: 800, fontSize: '11pt', whiteSpace: 'nowrap' }}>
                      {s.classroom_name || s.class_name || '—'}
                    </td>
                    {HEALTH_CHECKS.map(h => (
                      <td key={h.id} style={{ border: '1px solid #000', padding: '3px 1px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', width: 14, height: 14, border: '1.5px solid #64748b', borderRadius: 2, verticalAlign: 'middle' }} />
                      </td>
                    ))}
                    <td style={{ border: '1px solid #000', padding: '4px 2px' }}></td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={HEALTH_CHECKS.length + 6} style={{ textAlign: 'center', padding: 25, color: '#64748b', fontWeight: 700, fontSize: '12pt' }}>
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
          <div>الطبيب الفاحص / الزائرة الصحية</div>
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

const healthList = {
  id:          'health-list',
  name:        'كشف متابعة الفحص الطبي المدرسي',
  desc:        'سجل نتائج الفحص الطبي الشامل للطلاب (البصر والسمع والأسنان والنمو والصحة العامة)',
  category:    'الصحة والسلامة المدرسية',
  icon:        '🩺',
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
    `/api/students/export/excel?academicYearId=${f.academicYearId}&gradeId=${f.gradeId}&classId=${f.classId || ''}&type=health`,

  excelFileName: (f, meta) =>
    `كشف_الفحص_الطبي_${meta.selectedGrade?.grade_name_ar || ''}_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

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

  PreviewComponent: HealthListPreview,
};

export default healthList;
