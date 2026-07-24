const fs = require('fs');
const path = require('path');

const defsDir = 'd:/NeprasPro/frontend/src/pages/reports/definitions';

const extraReports = [
  {
    fileName: 'disconnectedRegister.jsx',
    id: 'disconnected-register',
    name: 'سجل المنقطعين وتتبع الغياب الرسمي',
    category: 'سجلات القيد',
    icon: '⚠️',
    desc: 'حصر رسمى للطلاب المنقطعين أكثر من شهرين وتتبع الإنذارات الموجهة لهم',
    orientation: 'landscape',
    filters: { requiresYear: true },
    title: 'سجل الطلاب المنقطعين عن الدراسة وتتبع الإنذارات الرسمية'
  },
  {
    fileName: 'suspendedRegister.jsx',
    id: 'suspended-register',
    name: 'سجل الموقوف قيدهم رسمياً',
    category: 'سجلات القيد',
    icon: '🛑',
    desc: 'سجل حصر الطلاب الموقوف قيدهم لغيب سنة دراسية كاملة أو أكثر',
    orientation: 'landscape',
    filters: { requiresYear: true },
    title: 'سجل حصر الطلاب الموقوف قيدهم رسمياً بالمدارس'
  },
  {
    fileName: 'excludedRegister.jsx',
    id: 'excluded-register',
    name: 'سجل الطلاب المستبعدين والمحولين خارجياً',
    category: 'سجلات القيد',
    icon: '🚫',
    desc: 'سجل تتبع الطلاب المستبعدين من القيد المدرسي والمحولين لمدارس أخرى',
    orientation: 'landscape',
    filters: { requiresYear: true },
    title: 'سجل حصر الطلاب المستبعدين والمحولين خارج المدرسة'
  },
  {
    fileName: 'callList.jsx',
    id: 'call-list',
    name: 'كشف المناداة الأبجدي الرسمي للمدرسة',
    category: 'سجلات القيد',
    icon: '📢',
    desc: 'كشف المناداة الأبجدي الرسمي لجميع الطلاب المنتظمين بالمدرسة',
    orientation: 'portrait',
    filters: { requiresYear: true },
    title: 'كشف المناداة الأبجدي الرسمي لجميع الطلاب'
  },
  {
    fileName: 'secondLanguageSheet.jsx',
    id: 'second-language-sheet',
    name: 'كشف توزيع اللغة الأجنبية الثانية',
    category: 'قوائم الفصول',
    icon: '🌍',
    desc: 'كشف حصر وتوزيع الطلاب حسب اللغة الثانية (فرنسي/ألماني/إيطالي/إسباني)',
    orientation: 'landscape',
    filters: { requiresYear: true, requiresStage: false },
    title: 'كشف حصر وتوزيع الطلاب حسب اللغة الأجنبية الثانية'
  },
  {
    fileName: 'secondaryTracksSheet.jsx',
    id: 'secondary-tracks-sheet',
    name: 'كشف مسارات البكالوريا والثانوية العامة',
    category: 'قوائم الفصول',
    icon: '🎯',
    desc: 'حصر طلاب المرحلتين الثانوية والبكالوريا حسب المسارات والشعب التعليمية',
    orientation: 'landscape',
    filters: { requiresYear: true },
    title: 'كشف حصر وتوزيع طلاب مسارات الثانوية العامة والبكالوريا'
  },
  {
    fileName: 'emergencyPhonesList.jsx',
    id: 'emergency-phones-list',
    name: 'سجل هواتف ولي الأمر والطوارئ',
    category: 'قوائم الفصول',
    icon: '📞',
    desc: 'سجل حصر بيانات ولي الأمر وهواتف الطوارئ والعنوان لجميع الطلاب',
    orientation: 'landscape',
    filters: { requiresYear: true },
    title: 'سجل حصر بيانات أسر الطلاب وهواتف الاتصال في الطوارئ'
  },
  {
    fileName: 'medicalExemptionList.jsx',
    id: 'medical-exemption-list',
    name: 'كشف الإعفاء الطبي والتربية الرياضية',
    category: 'الصحة المدرسية',
    icon: '🏥',
    desc: 'كشف حصر الطلاب المعفين من الأنشطة والتربية الرياضية بقرارات طبية',
    orientation: 'portrait',
    filters: { requiresYear: true },
    title: 'كشف حصر الطلاب المعفين من التربية الرياضية بقرارات طبية معتمدة'
  },
  {
    fileName: 'expulsionNotice.jsx',
    id: 'expulsion-notice',
    name: 'إشعار فصل طالب وتنبيه إعادة القيد',
    category: 'المطبوعات والنماذج',
    icon: '📜',
    desc: 'نموذج إشعار قرار فصل طالب لتجاوز نسبة الغياب القانونية وتنبيه إعادة القيد',
    orientation: 'portrait',
    filters: { requiresYear: true },
    title: 'إشعار قرار فصل طالب لتجاوز نسبة الغياب المقررة قانوناً'
  },
  {
    fileName: 'transferNotice.jsx',
    id: 'transfer-notice',
    name: 'إشعار وموافقة نقل طالب إلى مدرسة أخرى',
    category: 'المطبوعات والنماذج',
    icon: '📄',
    desc: 'نموذج موافقة رسمية لنقل الطالب واعتماد إخلاء طرفه لمدرسة أخرى',
    orientation: 'portrait',
    filters: { requiresYear: true },
    title: 'نموذج إشعار وموافقة نقل طالب وإخلاء طرف مدرسي'
  },
  {
    fileName: 'guardianSummonsNotice.jsx',
    id: 'guardian-summons-notice',
    name: 'إشعار استدعاء ولي أمر طالب رسمي',
    category: 'المطبوعات والنماذج',
    icon: '📩',
    desc: 'نموذج استدعاء رسمى لولي الأمر لمقابلة إدارة المدرسة وشؤون الطلاب',
    orientation: 'portrait',
    filters: { requiresYear: true },
    title: 'نموذج إشعار استدعاء رسمى لولي أمر الطالب'
  },
  {
    fileName: 'parentStaffAffiliation.jsx',
    id: 'parent-staff-affiliation',
    name: 'سجل حصر أبناء العاملين بالتربية والتعليم',
    category: 'المطبوعات والنماذج',
    icon: '👨‍🏫',
    desc: 'حصر رسمي للطلاب من أبناء المعلمين والعاملين بوزارة التربية والتعليم',
    orientation: 'landscape',
    filters: { requiresYear: true },
    title: 'سجل حصر الطلاب من أبناء العاملين بوزارة التربية والتعليم'
  },
  {
    fileName: 'martyrsChildren.jsx',
    id: 'martyrs-children',
    name: 'سجل حصر أبناء الشهداء ومصابي العمليات',
    category: 'المطبوعات والنماذج',
    icon: '🎖️',
    desc: 'سجل حصر رسمي لأبناء الشهداء ومصابي العمليات الأمنية والعسكرية',
    orientation: 'landscape',
    filters: { requiresYear: true },
    title: 'سجل حصر الطلاب من أبناء الشهداء ومصابي العمليات'
  },
  {
    fileName: 'seatingNumbersList.jsx',
    id: 'seating-numbers-list',
    name: 'كشف أرقام الجلوس وتوزيع اللجان (12 د)',
    category: 'الكنترول والامتحانات',
    icon: '🎫',
    desc: 'كشف أرقام الجلوس الرسمي وسجل 12 د امتحانات المعتمد',
    orientation: 'landscape',
    filters: { requiresYear: true },
    title: 'كشف أرقام الجلوس المعتمدة وتوزيع لجان الامتحانات (سجل 12 د)'
  },
  {
    fileName: 'committeeDistributionList.jsx',
    id: 'committee-distribution-list',
    name: 'كشف توزيع الطلاب على مقار اللجان الامتحانية',
    category: 'الكنترول والامتحانات',
    icon: '📋',
    desc: 'كشف تفصيلي بتوزيع الطلاب وأرقام جلوسهم على مقار لجان الامتحانات',
    orientation: 'landscape',
    filters: { requiresYear: true },
    title: 'كشف توزيع الطلاب وأرقام الجلوس على لجان الاختبارات'
  },
  {
    fileName: 'examAbsenceList.jsx',
    id: 'exam-absence-list',
    name: 'كشف حصر غياب الامتحانات اليومي',
    category: 'الكنترول والامتحانات',
    icon: '📝',
    desc: 'نموذج محضر ورصد غياب الطلاب اليومي أثناء فترات الامتحانات الرسمية',
    orientation: 'portrait',
    filters: { requiresYear: true },
    title: 'كشف ومحضر حصر الطلاب الغائبين باللجان الامتحانية'
  },
  {
    fileName: 'statisticalStatement1.jsx',
    id: 'statistical-statement-1',
    name: 'البيان الإحصائي العام للمدرسة (بيان 1)',
    category: 'إحصائيات',
    icon: '📊',
    desc: 'البيان الإحصائي العام المعتمد لجميع الصفوف والمراحل الدراسية',
    orientation: 'landscape',
    filters: { requiresYear: true },
    title: 'البيان الإحصائي الموحد لإجمالي أعداد الطلاب والمراحل (بيان 1)'
  },
  {
    fileName: 'ageStat1Oct.jsx',
    id: 'age-stat-1oct',
    name: 'إحصاء الأعمار والسن في 1 أكتوبر الرسمي',
    category: 'إحصائيات',
    icon: '🎂',
    desc: 'بيان التوزيع التكراري لأعمار الطلاب وحساب السن في أول أكتوبر',
    orientation: 'landscape',
    filters: { requiresYear: true },
    title: 'إحصاء التوزيع التكراري لأعمار الطلاب والسن في أول أكتوبر'
  },
  {
    fileName: 'specialCasesFeeDiscount.jsx',
    id: 'special-cases-fee-discount',
    name: 'سجل الحالات المستحقة لخصومات المصروفات',
    category: 'إحصائيات',
    icon: '⭐',
    desc: 'سجل حصر الطلاب من ذوي الحالات الخاصة والمستحقين للإعفاء والخصومات',
    orientation: 'landscape',
    filters: { requiresYear: true },
    title: 'سجل حصر الحالات الخاصة والمستحقين للإعفاءات والخصومات المدرسية'
  },
  {
    fileName: 'religionGenderDistribution.jsx',
    id: 'religion-gender-distribution',
    name: 'كشف تصنيف الطلاب حسب الديانة والنوع',
    category: 'إحصائيات',
    icon: '☪️',
    desc: 'بيان إحصائي بتصنيف طلاب المدرسة حسب النوع (ذكور/إناث) والديانة (مسلم/مسيحي)',
    orientation: 'landscape',
    filters: { requiresYear: true },
    title: 'كشف الإحصاء التفصيلي لطلاب المدرسة حسب الديانة والنوع'
  },
  {
    fileName: 'classCapacityStat.jsx',
    id: 'class-capacity-stat',
    name: 'إحصاء السعة الاستيعابية للفصول والكثافة',
    category: 'إحصائيات',
    icon: '🏫',
    desc: 'تقرير مؤشرات الكثافة المدرسية والسعة الاستيعابية المقررة لكل فصل',
    orientation: 'landscape',
    filters: { requiresYear: true },
    title: 'تقرير مؤشرات الكثافة الدراسية والسعة الاستيعابية للفصول'
  },
  {
    fileName: 'emisSummary.jsx',
    id: 'emis-summary',
    name: 'بيان الإحصاء السنوي لوزارة التربية والتعليم (EMIS)',
    category: 'إحصائيات',
    icon: '🏛️',
    desc: 'بيان الإحصاء الاستماري الشامل المعتمد للعرض على بوابة EMIS الوزارية',
    orientation: 'landscape',
    filters: { requiresYear: true },
    title: 'بيان التقرير الإحصائي السنوي المعتمد لبوابة وزارة التربية والتعليم'
  },
  {
    fileName: 'outstandingStudentsRegister.jsx',
    id: 'outstanding-students-register',
    name: 'سجل الطلاب الفائقين والموهوبين',
    category: 'إحصائيات',
    icon: '🏆',
    desc: 'سجل حصر التكريم والطلاب الموهوبين والفائقين علمياً ورياضياً وثقافياً',
    orientation: 'landscape',
    filters: { requiresYear: true },
    title: 'سجل حصر ورعاية الطلاب الموهوبين والفائقين علمياً ورياضياً'
  }
];

extraReports.forEach(r => {
  const code = `import React from 'react';

const ${r.id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())} = {
  id: '${r.id}',
  name: '${r.name}',
  category: '${r.category}',
  icon: '${r.icon}',
  orientation: '${r.orientation}',
  filters: ${JSON.stringify(r.filters)},
  available: true,
  buildQuery: (f) => {
    const q = new URLSearchParams();
    if (f.academicYearId) q.set('academicYearId', f.academicYearId);
    if (f.sectionId)      q.set('sectionId', f.sectionId);
    if (f.stageId)        q.set('stageId', f.stageId);
    if (f.gradeId)        q.set('gradeId', f.gradeId);
    if (f.classId)        q.set('classId', f.classId);
    return q.toString();
  },
  excelEndpoint: (f) => '/api/students/export/excel',
  excelFileName: () => '${r.name}.xlsx',

  PreviewComponent: ({ students = [], meta = {}, schoolInfo = {} }) => {
    return (
      <div className="report-page-printable">
        <div className="report-official-header">
          <div className="header-col-right">
            <div>وزارة التربية والتعليم والتعليم الفني</div>
            <div>مديرية التربية والتعليم: {schoolInfo.governorate || 'القاهرة'}</div>
            <div>إدارة: {schoolInfo.directorate || 'التعليمية'}</div>
            <div>مدرسة: {schoolInfo.schoolName || 'نبراس الخاصة'}</div>
          </div>
          <div className="header-col-center">
            <h2 className="report-title-main">${r.title}</h2>
            <div className="report-subtitle-meta">العام الدراسي: {meta.selectedYear?.year_label || '2025-2026'} | العدد الإجمالي: {students.length} طالب</div>
          </div>
          <div className="header-col-left">
            <div>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
            <div>كود التقرير: NEP-${r.id.toUpperCase()}</div>
          </div>
        </div>

        <table className="report-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>م</th>
              <th style={{ width: 120 }}>كود الطالب</th>
              <th>اسم الطالب بالكامل</th>
              <th style={{ width: 140 }}>الرقم القومي</th>
              <th style={{ width: 100 }}>النوع</th>
              <th style={{ width: 120 }}>الصف الدراسي</th>
              <th style={{ width: 90 }}>الفصل</th>
              <th style={{ width: 100 }}>حالة القيد</th>
            </tr>
          </thead>
          <tbody>
            {students.length > 0 ? (
              students.map((s, idx) => (
                <tr key={s.id || idx}>
                  <td>{idx + 1}</td>
                  <td><code style={{ fontFamily: 'monospace' }}>{s.student_code || '—'}</code></td>
                  <td style={{ fontWeight: 800 }}>{s.full_name_ar}</td>
                  <td dir="ltr" style={{ fontFamily: 'monospace' }}>{s.national_id || '—'}</td>
                  <td>{s.gender || '—'}</td>
                  <td>{s.grade_name_ar || '—'}</td>
                  <td>{s.classroom_name || '—'}</td>
                  <td><span className="cadre-badge">{s.enrollment_status || s.status || 'منقول'}</span></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                  لا توجد بيانات مسجلة مطابقة لفلاتر البحث المحددة
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="report-signatures" style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
          <div>
            <div style={{ fontWeight: 700 }}>مسؤول شئون الطلاب</div>
            <div style={{ marginTop: 35 }}>................................</div>
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>رئيس قسم الإحصاء</div>
            <div style={{ marginTop: 35 }}>................................</div>
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>مدير المدرسة (يعتمد)</div>
            <div style={{ marginTop: 35 }}>................................</div>
          </div>
        </div>
      </div>
    );
  }
};

export default ${r.id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())};
`;

  const target = path.join(defsDir, r.fileName);
  fs.writeFileSync(target, code, 'utf8');
  console.log('Created report definition:', r.fileName);
});
