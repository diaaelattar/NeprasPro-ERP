// ════════════════════════════════════════════════════════════════
//  Reports Registry — NeprasPro (Official Ministry & Custom Reports)
// ════════════════════════════════════════════════════════════════

// ── سجلات القيد والمناداة ─────────────────────────────────────────
import studentRegister          from './definitions/studentRegister';
import studentRegister41        from './definitions/studentRegister41';
import callList                 from './definitions/callList';
import classList                from './definitions/classList';
import fullClassList             from './definitions/fullClassList';
import disconnectedRegister     from './definitions/disconnectedRegister';
import suspendedRegister        from './definitions/suspendedRegister';
import excludedRegister         from './definitions/excludedRegister';
import foreignStudentsReport    from './definitions/foreignStudentsReport';
import mergeStudentsReport      from './definitions/mergeStudentsReport';
import twinsRegister            from './definitions/twinsRegister';
import orphansRegister          from './definitions/orphansRegister';

// ── قوائم وتوزيع الفصول ─────────────────────────────────────────
import absenceSheet             from './definitions/absenceSheet';
import absenceSheet20           from './definitions/absenceSheet20';
import booksList                from './definitions/booksList';
import emergencyPhonesList      from './definitions/emergencyPhonesList';
import secondLanguageSheet      from './definitions/secondLanguageSheet';
import secondaryTracksSheet     from './definitions/secondaryTracksSheet';

// ── تقارير مخصصة والكنترول ────────────────────────────────────────
import guardianJobsReport       from './definitions/guardianJobsReport';
import specialCasesFeeDiscount  from './definitions/specialCasesFeeDiscount';
import outstandingStudentsRegister from './definitions/outstandingStudentsRegister';
import seatingNumbersList       from './definitions/seatingNumbersList';

// ── المطبوعات والنماذج الرسمية ───────────────────────────────────
import schoolPrints             from './definitions/schoolPrints';
import absenceNotice            from './definitions/absenceNotice';
import expulsionNotice          from './definitions/expulsionNotice';
import transferNotice           from './definitions/transferNotice';
import guardianSummonsNotice    from './definitions/guardianSummonsNotice';
import parentStaffAffiliation   from './definitions/parentStaffAffiliation';
import martyrsChildren          from './definitions/martyrsChildren';

// ── الصحة والسلامة المدرسية ──────────────────────────────────────
import vaccinationsSheet        from './definitions/vaccinationsSheet';
import healthList               from './definitions/healthList';
import hundredMillionHealth     from './definitions/hundredMillionHealth';
import medicalExemptionList     from './definitions/medicalExemptionList';

// ── سجلات رصد أعمال السنة (التمبلت المخصص) ──────────────────────────
import primaryPortraitSheet      from './definitions/primaryPortraitSheet';
import primaryLandscapeSheet     from './definitions/primaryLandscapeSheet';
import prepPortraitSheet         from './definitions/prepPortraitSheet';
import prepLandscapeSheet        from './definitions/prepLandscapeSheet';
import secPortraitSheet          from './definitions/secPortraitSheet';
import secLandscapeSheet         from './definitions/secLandscapeSheet';
import gradesSheet               from './definitions/gradesSheet';

// ── الإحصائيات والتحليلات الرسمية ──────────────────────────────────
import statisticalStatement1     from './definitions/statisticalStatement1';
import generalEnrolledCensus     from './definitions/generalEnrolledCensus';
import enrollmentStatusCensus    from './definitions/enrollmentStatusCensus';
import ageStat1Oct               from './definitions/ageStat1Oct';
import classCapacityStat         from './definitions/classCapacityStat';
import religionGenderDistribution from './definitions/religionGenderDistribution';
import droppedStudentsReport     from './definitions/droppedStudentsReport';

const REPORTS = [
  // ── 1. سجلات القيد والمناداة ──────────────────────────────────
  studentRegister,
  studentRegister41,
  disconnectedRegister,
  suspendedRegister,

  // ── 2. قوائم وتوزيع الفصول ──────────────────────────────────
  fullClassList,
  classList,
  callList,
  absenceSheet,
  absenceSheet20,
  booksList,
  emergencyPhonesList,
  secondLanguageSheet,
  secondaryTracksSheet,

  // ── 3. الكنترول والامتحانات ─────────────────────────────────
  seatingNumbersList,
  mergeStudentsReport,

  // ── 4. سجلات رصد أعمال السنة (تصدير التمبلت المخصص) ────────────
  primaryPortraitSheet,
  primaryLandscapeSheet,
  prepPortraitSheet,
  prepLandscapeSheet,
  secPortraitSheet,
  secLandscapeSheet,
  gradesSheet,

  // ── 5. الإحصائيات والتحليلات الرسمية ───────────────────────────
  statisticalStatement1,
  generalEnrolledCensus,
  enrollmentStatusCensus,
  ageStat1Oct,
  classCapacityStat,
  religionGenderDistribution,
  droppedStudentsReport,

  // ── 6. المطبوعات والنماذج الرسمية ────────────────────────────
  schoolPrints,
  absenceNotice,
  expulsionNotice,
  transferNotice,
  guardianSummonsNotice,

  // ── 7. الصحة والسلامة المدرسية ───────────────────────────────
  hundredMillionHealth,
  vaccinationsSheet,
  healthList,
  medicalExemptionList,

  // ── 8. السجلات المتخصصة ─────────────────────────────────────
  outstandingStudentsRegister,
  specialCasesFeeDiscount,
  guardianJobsReport,
  twinsRegister,
  orphansRegister,
  martyrsChildren,
  parentStaffAffiliation,
  foreignStudentsReport,
  excludedRegister,
];

export default REPORTS;

