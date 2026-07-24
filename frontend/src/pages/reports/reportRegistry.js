// ════════════════════════════════════════════════════════════════
//  Reports Registry — NeprasPro (40+ Official Ministry Reports)
// ════════════════════════════════════════════════════════════════

// ── سجلات القيد والمناداة ─────────────────────────────────────────
import studentRegister          from './definitions/studentRegister';
import studentRegister41        from './definitions/studentRegister41';
import callList                 from './definitions/callList';
import classList                from './definitions/classList';
import disconnectedRegister     from './definitions/disconnectedRegister';
import suspendedRegister        from './definitions/suspendedRegister';
import excludedRegister         from './definitions/excludedRegister';
import transfersReport          from './definitions/transfersReport';
import foreignStudentsReport    from './definitions/foreignStudentsReport';
import mergeStudentsReport      from './definitions/mergeStudentsReport';

// ── قوائم وتوزيع الفصول ─────────────────────────────────────────
import mergeClassList           from './definitions/mergeClassList';
import absenceSheet             from './definitions/absenceSheet';
import gradesSheet              from './definitions/gradesSheet';
import secondLanguageSheet      from './definitions/secondLanguageSheet';
import secondaryTracksSheet     from './definitions/secondaryTracksSheet';
import booksList                from './definitions/booksList';
import emergencyPhonesList      from './definitions/emergencyPhonesList';

// ── الصحة والسلامة المدرسية ──────────────────────────────────────
import vaccinationsSheet        from './definitions/vaccinationsSheet';
import healthList               from './definitions/healthList';
import medicalExemptionList     from './definitions/medicalExemptionList';

// ── المطبوعات والنماذج الرسمية ───────────────────────────────────
import schoolPrints             from './definitions/schoolPrints';
import absenceNotice            from './definitions/absenceNotice';
import expulsionNotice          from './definitions/expulsionNotice';
import transferNotice           from './definitions/transferNotice';
import guardianSummonsNotice    from './definitions/guardianSummonsNotice';
import parentStaffAffiliation   from './definitions/parentStaffAffiliation';
import martyrsChildren          from './definitions/martyrsChildren';

// ── الكنترول والامتحانات ─────────────────────────────────────────
import seatingNumbersList       from './definitions/seatingNumbersList';
import committeeDistributionList from './definitions/committeeDistributionList';
import examAbsenceList          from './definitions/examAbsenceList';

// ── الإحصائيات والتحليلات الرسمية ──────────────────────────────────
import statisticalStatement1    from './definitions/statisticalStatement1';
import ageStat1Oct              from './definitions/ageStat1Oct';
import orphansRegister          from './definitions/orphansRegister';
import twinsRegister            from './definitions/twinsRegister';
import droppedStudentsReport    from './definitions/droppedStudentsReport';
import specialCasesFeeDiscount  from './definitions/specialCasesFeeDiscount';
import religionGenderDistribution from './definitions/religionGenderDistribution';
import classCapacityStat        from './definitions/classCapacityStat';
import emisSummary              from './definitions/emisSummary';
import outstandingStudentsRegister from './definitions/outstandingStudentsRegister';

const REPORTS = [
  // ── سجلات القيد والمناداة ─────────────────────────────────────
  studentRegister,
  studentRegister41,
  callList,
  classList,
  disconnectedRegister,
  suspendedRegister,
  excludedRegister,
  transfersReport,
  foreignStudentsReport,
  mergeStudentsReport,

  // ── قوائم وتوزيع الفصول ─────────────────────────────────────
  mergeClassList,
  absenceSheet,
  gradesSheet,
  secondLanguageSheet,
  secondaryTracksSheet,
  booksList,
  emergencyPhonesList,

  // ── الصحة والسلامة المدرسية ──────────────────────────────────
  vaccinationsSheet,
  healthList,
  medicalExemptionList,

  // ── المطبوعات والنماذج الرسمية ───────────────────────────────
  schoolPrints,
  absenceNotice,
  expulsionNotice,
  transferNotice,
  guardianSummonsNotice,
  parentStaffAffiliation,
  martyrsChildren,

  // ── الكنترول والامتحانات ─────────────────────────────────────
  seatingNumbersList,
  committeeDistributionList,
  examAbsenceList,

  // ── الإحصائيات والتحليلات الرسمية ──────────────────────────────
  statisticalStatement1,
  ageStat1Oct,
  orphansRegister,
  twinsRegister,
  droppedStudentsReport,
  specialCasesFeeDiscount,
  religionGenderDistribution,
  classCapacityStat,
  emisSummary,
  outstandingStudentsRegister,
];

export default REPORTS;
