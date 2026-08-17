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
import transfersReport          from './definitions/transfersReport';
import foreignStudentsReport    from './definitions/foreignStudentsReport';
import mergeStudentsReport      from './definitions/mergeStudentsReport';
import twinsRegister            from './definitions/twinsRegister';
import orphansRegister          from './definitions/orphansRegister';

// ── قوائم وتوزيع الفصول ─────────────────────────────────────────
import mergeClassList           from './definitions/mergeClassList';
import absenceSheet             from './definitions/absenceSheet';
import absenceSheet20           from './definitions/absenceSheet20';
import booksList                from './definitions/booksList';
import emergencyPhonesList      from './definitions/emergencyPhonesList';

// ── تقارير مخصصة وحالات خاصة ──────────────────────────────────────
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

// ── سجلات رصد أعمال السنة (التمبلت المخصص) ──────────────────────────
import primaryLandscapeSheet     from './definitions/primaryLandscapeSheet';
import primaryPortraitSheet      from './definitions/primaryPortraitSheet';
import upperPrimaryLandscapeSheet from './definitions/upperPrimaryLandscapeSheet';
import upperPrimaryPortraitSheet from './definitions/upperPrimaryPortraitSheet';
import prepLandscapeSheet        from './definitions/prepLandscapeSheet';
import prepPortraitSheet         from './definitions/prepPortraitSheet';
import secLandscapeSheet         from './definitions/secLandscapeSheet';
import secPortraitSheet          from './definitions/secPortraitSheet';
import gradesSheet               from './definitions/gradesSheet';

// ── الإحصائيات والتحليلات الرسمية ──────────────────────────────────
import generalEnrolledCensus     from './definitions/generalEnrolledCensus';
import enrollmentStatusCensus    from './definitions/enrollmentStatusCensus';
import ageStat1Oct               from './definitions/ageStat1Oct';
import classCapacityStat         from './definitions/classCapacityStat';
import religionGenderDistribution from './definitions/religionGenderDistribution';

const REPORTS = [
  // ── تقارير مخصصة ────────────────────────────────────────────
  guardianJobsReport,
  specialCasesFeeDiscount,
  outstandingStudentsRegister,
  seatingNumbersList,

  // ── سجلات القيد ─────────────────────────────────────────────
  studentRegister,
  studentRegister41,
  disconnectedRegister,
  suspendedRegister,
  mergeStudentsReport,
  twinsRegister,
  orphansRegister,

  // ── قوائم وتوزيع الفصول (بأعلى جودة مطابقة لتسكين الفصول) ───────
  fullClassList,
  classList,
  callList,
  absenceSheet,
  absenceSheet20,
  booksList,
  emergencyPhonesList,

  // ── سجلات رصد أعمال السنة (تصدير التمبلت المخصص) ───────────────
  primaryPortraitSheet,
  primaryLandscapeSheet,
  upperPrimaryPortraitSheet,
  upperPrimaryLandscapeSheet,
  prepPortraitSheet,
  prepLandscapeSheet,
  secPortraitSheet,
  secLandscapeSheet,
  gradesSheet,

  // ── المطبوعات والنماذج الرسمية ───────────────────────────────
  schoolPrints,
  absenceNotice,
  expulsionNotice,
  transferNotice,
  guardianSummonsNotice,
  parentStaffAffiliation,
  martyrsChildren,
  excludedRegister,
  transfersReport,
  foreignStudentsReport,

  // ── الإحصائيات والتحليلات الرسمية ──────────────────────────────
  generalEnrolledCensus,
  enrollmentStatusCensus,
  ageStat1Oct,
  classCapacityStat,
  religionGenderDistribution,
];

export default REPORTS;

