// ════════════════════════════════════════════════════════════════
//  Report Definition: سجل الحالات الخاصة والمستحقة لخصومات المصروفات
//  يحصر الطلاب المستحقين للخصومات والإعفاءات (أبناء عاملين، أيتام، دمج، إخوة...)
// ════════════════════════════════════════════════════════════════
import React from 'react';
import RegisterStatsPage from '../RegisterStatsPage';

function getStudentDiscountInfo(s) {
  const reasons = [];
  const docs = [];
  let discountType = 'خصم / إعفاء معتمد';

  if (s.parent_staff_id || s.staff_parent_name) {
    reasons.push('أبناء عاملين بالمدرسة');
    docs.push(s.staff_parent_name ? `إفادة عمل: ${s.staff_parent_name}` : 'إفادة عمل كادر');
    discountType = 'خصم أبناء عاملين (50%)';
  }

  if (s.is_orphan === 1 || s.is_orphan === true || s.orphan_type || s.father_status === 'متوفى' || s.mother_status === 'متوفاة') {
    const oType = s.orphan_type || (s.father_status === 'متوفى' && s.mother_status === 'متوفاة' ? 'يتيم الوالدين' : s.father_status === 'متوفى' ? 'يتيم الأب' : 'يتيم الأم');
    reasons.push(`طالب يتيم (${oType})`);
    docs.push(s.social_research_number ? `بحث شؤون رقم ${s.social_research_number}` : (s.social_research_date ? `قرار بتاريخ ${s.social_research_date}` : 'شهادة وفاة / بحث تكافل'));
    if (!discountType.includes('50%')) discountType = 'إعفاء تكافل اجتماعي';
  }

  if (s.is_merged === 1 || s.is_merged === true) {
    reasons.push(`دمج تعليمي (${s.merge_type || 'تربية خاصة'})`);
    docs.push(s.merge_decision_number ? `قرار دمج رقم ${s.merge_decision_number}` : 'قرار وزاري للدمج');
  }

  if (s.is_twin === 1 || s.twin_student_id || (s.sibling_student_ids && s.sibling_student_ids !== '[]' && s.sibling_student_ids !== '')) {
    reasons.push(s.is_twin ? 'توأم مسجل بالمدرسة' : 'إخوة مسجلون بالمدرسة');
    docs.push('شهادة قيد إخوة');
    if (!discountType.includes('50%') && !discountType.includes('إعفاء')) discountType = 'خصم إخوة وتوائم';
  }

  if (s.is_talented === 1 || s.is_talented === true) {
    reasons.push(`موهوب وذو تفوق (${s.talent_description || 'موهبة عامة'})`);
    docs.push('شهادة تفوق / بطولات');
    if (!discountType.includes('50%') && !discountType.includes('إعفاء')) discountType = 'منحة تفوق ورعاية';
  }

  if (s.special_cases_names) {
    reasons.push(s.special_cases_names);
  }

  return {
    isEligible: reasons.length > 0,
    caseName: reasons.join(' • '),
    document: docs.filter(Boolean).join(' | ') || (s.orphan_notes || 'مستندات معتمدة بالإدارة'),
    discountType: discountType
  };
}

function SpecialCasesFeeDiscountPreview({ students = [], meta = {}, schoolInfo = {} }) {
  const { selectedGrade, selectedYear } = meta;

  const cleanSchool = (schoolInfo.schoolName || '').replace(/^مدرسة\s*/, '').trim();
  const rawAdmin = schoolInfo.directorate || '';
  const cleanAdmin = rawAdmin.replace(/التعليمية\s*$/, '').trim();
  const governorate = schoolInfo.governorate || 'الجيزة';

  // Filter only eligible students
  const eligibleStudents = students.filter(s => {
    const info = getStudentDiscountInfo(s);
    return info.isEligible;
  });

  // Category counts
  const staffChildrenCount = eligibleStudents.filter(s => s.parent_staff_id || s.staff_parent_name).length;
  const orphansCount = eligibleStudents.filter(s => s.is_orphan === 1 || s.is_orphan === true || s.orphan_type || s.father_status === 'متوفى' || s.mother_status === 'متوفاة').length;
  const mergedCount = eligibleStudents.filter(s => s.is_merged === 1 || s.is_merged === true).length;
  const siblingsCount = eligibleStudents.filter(s => s.is_twin === 1 || s.twin_student_id || (s.sibling_student_ids && s.sibling_student_ids !== '[]' && s.sibling_student_ids !== '')).length;

  return (
    <div className="report-preview" id="print-area" data-orientation="landscape">
      <div className="printable-page-block" style={{ padding: '12px 16px', boxSizing: 'border-box' }}>
        
        {/* Standard Official Header */}
        <div className="report-official-header" style={{ marginBottom: 10, paddingBottom: 6, borderBottom: '1.5px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="header-col-right" style={{ textAlign: 'right', fontSize: 11.5, lineHeight: 1.4, fontWeight: 700 }}>
            <div>محافظة: <strong>{governorate || '................'}</strong></div>
            <div>إدارة: <strong>{cleanAdmin ? `${cleanAdmin} التعليمية` : '................'}</strong></div>
            <div>مدرسة: <strong>{cleanSchool || '................'}</strong></div>
          </div>

          <div className="header-col-center" style={{ textAlign: 'center', flex: 1 }}>
            <h2 className="report-title-main" style={{ fontSize: 16, fontWeight: 900, margin: 0, textDecoration: 'underline', color: '#0f172a' }}>
              سجل حصر الحالات الخاصة والمستحقين للإعفاءات والخصومات المدرسية
            </h2>
            <div className="report-subtitle-meta" style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', marginTop: 2 }}>
              للعام الدراسي {selectedYear?.year_label || '...............'} | إجمالي المستحقين: <strong>{eligibleStudents.length}</strong> طالب
            </div>
          </div>

          <div className="header-col-left" style={{ textAlign: 'left' }}>
            {schoolInfo.logoUrl ? (
              <img src={schoolInfo.logoUrl} alt="Logo" style={{ maxHeight: 42, maxWidth: 85, objectFit: 'contain' }} />
            ) : (
              <div style={{ border: '1px dashed #94a3b8', borderRadius: 4, padding: '3px 6px', fontSize: 9.5, color: '#64748b', textAlign: 'center', background: '#f8fafc' }}>
                شعار المدرسة
              </div>
            )}
            <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div style={{ display: 'flex', gap: 10, margin: '8px 0 12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ padding: '4px 14px', background: '#1e293b', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
            إجمالي الحالات: <span style={{ fontSize: 13, marginRight: 4 }}>{eligibleStudents.length}</span>
          </div>
          <div style={{ padding: '4px 14px', background: '#2563eb', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
            أبناء العاملين: <span style={{ fontSize: 13, marginRight: 4 }}>{staffChildrenCount}</span>
          </div>
          <div style={{ padding: '4px 14px', background: '#e11d48', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
            الأيتام والتكافل: <span style={{ fontSize: 13, marginRight: 4 }}>{orphansCount}</span>
          </div>
          <div style={{ padding: '4px 14px', background: '#d97706', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
            الدمج والتربية الخاصة: <span style={{ fontSize: 13, marginRight: 4 }}>{mergedCount}</span>
          </div>
          <div style={{ padding: '4px 14px', background: '#059669', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
            الإخوة والتوائم: <span style={{ fontSize: 13, marginRight: 4 }}>{siblingsCount}</span>
          </div>
        </div>

        {/* Main Register Table */}
        <div className="register-table-wrap" style={{ width: '100%', overflowX: 'hidden' }}>
          <table className="register-table" dir="rtl" style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', fontSize: 10, textAlign: 'center' }}>
            <thead>
              <tr style={{ background: '#e2e8f0', color: '#000', fontWeight: 800 }}>
                <th style={{ border: '1px solid #000', padding: '4px 2px', width: 30 }}>م</th>
                <th style={{ border: '1px solid #000', padding: '4px 4px', width: 75 }}>كود الطالب</th>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', width: 140 }}>اسم الطالب بالكامل</th>
                <th style={{ border: '1px solid #000', padding: '4px 2px', width: 75 }}>الصف / الفصل</th>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', width: 150 }}>تصنيف الحالة الخاصة / سبب الخصم</th>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', width: 130 }}>المستند المؤيد / القرار</th>
                <th style={{ border: '1px solid #000', padding: '4px 4px', width: 110 }}>نوع الخصم المعتمد</th>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', width: 110 }}>ولي الأمر والوظيفة</th>
                <th style={{ border: '1px solid #000', padding: '4px 4px', width: 65 }}>الملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {eligibleStudents.length > 0 ? (
                eligibleStudents.map((s, idx) => {
                  const info = getStudentDiscountInfo(s);
                  return (
                    <tr key={s.id || idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : '#fff' }}>
                      <td style={{ border: '1px solid #000', padding: '3px 2px', fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #000', padding: '3px 2px', fontFamily: 'monospace', fontSize: 9.5 }}>{s.student_code || '—'}</td>
                      <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'right', fontWeight: 800 }}>{s.full_name_ar}</td>
                      <td style={{ border: '1px solid #000', padding: '3px 2px', fontSize: 9.5 }}>{s.grade_name_ar || '—'} ({s.classroom_name || '—'})</td>
                      <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'right', fontWeight: 700, color: '#1e3a8a' }}>
                        {info.caseName}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'right', fontSize: 9 }}>
                        {info.document}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: 800, color: '#047857', background: '#f0fdf4' }}>
                        {info.discountType}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'right', fontSize: 9 }}>
                        <div>{s.guardian_name || '—'}</div>
                        <div style={{ color: '#64748b', fontSize: 8.5 }}>{s.guardian_job || '—'}</div>
                      </td>
                      <td style={{ border: '1px solid #000', padding: '3px 4px', fontSize: 8.5, color: '#475569' }}>
                        {s.orphan_notes || 'معتمد'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 24, color: '#64748b', fontWeight: 700 }}>
                    لا توجد حالات خاصة أو مستحقة لخصومات مسجلة في هذا البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4-Part Official Signatures Footer */}
        <div className="official-signatures-footer" style={{ marginTop: 18, paddingTop: 6, borderTop: '1px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontWeight: 800 }}>
          <div>الأخصائي الاجتماعي: ..........................</div>
          <div>المسؤول المالي ومراجع الخصومات: ..........................</div>
          <div>وكيل شؤون الطلاب: ..........................</div>
          <div>يعتمد مدير المدرسة: ..........................</div>
        </div>

      </div>

      {/* Page 2: Summary Stats */}
      <RegisterStatsPage
        title="سجل الحالات الخاصة والخصومات"
        subTitle={selectedGrade?.grade_name_ar ? `للصف: ${selectedGrade.grade_name_ar}` : ''}
        registerCode="استمارة خصومات وإعفاءات"
        students={eligibleStudents}
        meta={meta}
        schoolInfo={schoolInfo}
        pageIndex={2}
        totalPages={2}
      />
    </div>
  );
}

const specialCasesFeeDiscount = {
  id: 'special-cases-fee-discount',
  name: 'سجل الحالات الخاصة والمستحقة لخصومات المصروفات',
  desc: 'يُظهر حصر الطلاب المستحقين لخصومات المصروفات (أبناء عاملين، أيتام، دمج، إخوة...) مع نوع الخصم والمستندات',
  category: 'السجلات المتخصصة',
  icon: '⭐',
  orientation: 'landscape',
  available: true,

  filters: {
    requiresGrade: false,
    showClass: true,
  },

  buildQuery: (f) => {
    const q = new URLSearchParams({
      limit: 'all',
      status: 'all',
      isSpecialCase: 'true'
    });
    if (f.academicYearId) q.set('academicYearId', f.academicYearId);
    if (f.sectionId)      q.set('sectionId', f.sectionId);
    if (f.stageId)        q.set('stageId', f.stageId);
    if (f.gradeId && f.gradeId !== 'all_stage') q.set('gradeId', f.gradeId);
    if (f.classId && f.classId !== 'all_grade' && f.classId !== 'all') q.set('classId', f.classId);
    return q.toString();
  },

  excelEndpoint: (f) =>
    `/api/students/export/excel?academicYearId=${f.academicYearId || ''}&isSpecialCase=true`,

  excelFileName: (f, meta) =>
    `سجل_الخصومات_والحالات_الخاصة_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,

  PreviewComponent: SpecialCasesFeeDiscountPreview,
};

export default specialCasesFeeDiscount;
