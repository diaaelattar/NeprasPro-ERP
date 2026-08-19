// ════════════════════════════════════════════════════════════════
//  Report Definition: كشف متابعة التطعيمات المدرسية
//  الترويسة الثلاثية القياسية + الفرز بالنوع والفصول + التذييل الرسمي الرباعي
// ════════════════════════════════════════════════════════════════
import React, { useState, useMemo } from 'react';

const VACCINES_PRIMARY = [
  { id: 'dt',     label: 'دفتيريا\nكزاز',     short: 'DT'   },
  { id: 'mmr',    label: 'الحصبة\nالشاملة',   short: 'MMR'  },
  { id: 'polio',  label: 'شلل\nالأطفال',      short: 'OPV'  },
  { id: 'hepb',   label: 'التهاب\nالكبد B',   short: 'HepB' },
  { id: 'mening', label: 'السحائي\nالمدرسي',  short: 'MEN'  },
  { id: 'td',     label: 'ثنائي\nالمدارس',    short: 'TD'   },
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

function VaccinationsSheetPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear, selectedClassroom } = meta;
  const [vaccines, setVaccines] = useState(VACCINES_PRIMARY);
  const [newVaccineName, setNewVaccineName] = useState('');

  const cleanSchool = (schoolInfo.schoolName || schoolInfo.school_name || '').replace(/^مدرسة\s*/, '').trim();
  const rawAdmin = schoolInfo.directorate || schoolInfo.administration || '';
  const cleanAdmin = rawAdmin.replace(/^إدارة\s*/, '').replace(/التعليمية\s*$/, '').trim();
  const governorate = schoolInfo.governorate || 'الجيزة';
  const academicYear = selectedYear?.year_label || schoolInfo.academicYear || '2025/2026';

  const addVaccine = () => {
    if (!newVaccineName.trim()) return;
    setVaccines(prev => [...prev, { id: `custom_${Date.now()}`, label: newVaccineName, short: newVaccineName.slice(0, 4) }]);
    setNewVaccineName('');
  };

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
            كشف متابعة التطعيمات المدرسية
          </h2>
          <div className="report-subtitle-meta" style={{ fontSize: '11.5pt', fontWeight: 800, color: '#1e293b', marginTop: 2 }}>
            {targetLabel} | العام الدراسي: <strong>{academicYear} م</strong> | إجمالي الطلاب: <strong>{sortedStudents.length}</strong>
          </div>
        </div>

        <div className="header-col-left" style={{ textAlign: 'left', fontSize: '11.5pt', fontWeight: 700, lineHeight: 1.4 }}>
          <div>العام الدراسي: <strong>{academicYear} م</strong></div>
          <div>تاريخ الاعتماد: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></div>
          <div>كود الاستمارة: <strong>NEP-VACC-SHEET</strong></div>
        </div>
      </div>

      {/* Controls (No Print) */}
      <div className="no-print" style={{ margin: '8px 0 10px', background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', gap: 8 }}>
            <input
              style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #cbd5e1', fontSize: '11pt', flex: 1 }}
              placeholder="إضافة نوع تطعيم جديد..."
              value={newVaccineName}
              onChange={e => setNewVaccineName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addVaccine()}
            />
            <button onClick={addVaccine} style={{ padding: '4px 14px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
              + إضافة تطعيم
            </button>
            <button onClick={() => setVaccines(VACCINES_PRIMARY)} style={{ padding: '4px 12px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
              ↺ إعادة ضبط
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {vaccines.map((v, i) => (
              <span key={v.id} style={{ background: '#ccfbf1', color: '#0f766e', padding: '2px 10px', borderRadius: 12, fontSize: '10pt', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                {v.label.replace('\n', ' ')}
                <button onClick={() => setVaccines(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Vaccination Table */}
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
            <col style={{ width: '30%' }} />   {/* اسم الطالب بالكامل */}
            <col style={{ width: '14%' }} />   {/* الرقم القومي */}
            <col style={{ width: '5%' }} />    {/* النوع */}
            <col style={{ width: '6.5%' }} />  {/* الفصل */}
            {/* التطعيمات */}
            {vaccines.map(v => (
              <col key={v.id} style={{ width: `${33 / (vaccines.length || 1)}%` }} />
            ))}
            {/* ملاحظات */}
            <col style={{ width: '8%' }} />
          </colgroup>
          <thead>
            <tr style={{ background: '#0f766e', color: '#fff', fontWeight: 900, fontSize: '11pt' }}>
              <th style={{ border: '1.5px solid #000', padding: '6px 2px' }}>م</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'right' }}>اسم الطالب بالكامل</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 2px' }}>الرقم القومي</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 2px' }}>النوع</th>
              <th style={{ border: '1.5px solid #000', padding: '6px 2px' }}>الفصل</th>
              {vaccines.map(v => (
                <th key={v.id} style={{ border: '1.5px solid #000', padding: '4px 1px', fontSize: '9pt', lineHeight: 1.15, whiteSpace: 'pre-line' }}>
                  {v.label}
                  <div style={{ fontSize: '7.5pt', opacity: 0.85 }}>({v.short})</div>
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
                    {vaccines.map(v => (
                      <td key={v.id} style={{ border: '1px solid #000', padding: '3px 1px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', width: 14, height: 14, border: '1.5px solid #64748b', borderRadius: 2, verticalAlign: 'middle' }} />
                      </td>
                    ))}
                    <td style={{ border: '1px solid #000', padding: '4px 2px' }}></td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={vaccines.length + 6} style={{ textAlign: 'center', padding: 25, color: '#64748b', fontWeight: 700, fontSize: '12pt' }}>
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
          <div>الزائرة الصحية / مسؤول الصحة</div>
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

const vaccinationsSheet = {
  id:          'vaccinations-sheet',
  name:        'كشف متابعة التطعيمات المدرسية',
  desc:        'سجل متابعة التطعيمات والجرعات الوقائية الدورية لطلاب الصفوف والفصول',
  category:    'الصحة والسلامة المدرسية',
  icon:        '💉',
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
    `/api/students/export/excel?academicYearId=${f.academicYearId}&gradeId=${f.gradeId}&classId=${f.classId || ''}&type=vaccinations`,

  excelFileName: (f, meta) =>
    `كشف_التطعيمات_${meta.selectedGrade?.grade_name_ar || ''}_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

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

  PreviewComponent: VaccinationsSheetPreview,
};

export default vaccinationsSheet;
