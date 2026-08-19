/**
 * NeprasPro - Single Source of Truth for all Dropdown Lookups & Enums
 * تم توحيد هذا الملف ليكون المرجع المركزي الوحيد لكافة القوائم المنسدلة في النظام
 */

// ── 1. حالات القيد الرسمية الصارمة الـ 6 ─────────────────────────────────────
export const ENROLLMENT_STATUS_OPTIONS = [
  { id: 1, value: 'new',          label: 'مستجد',     name_ar: 'مستجد',     badgeColor: '#3b82f6', isActiveRegistry: true },
  { id: 2, value: 'promoted',     label: 'منقول',      name_ar: 'منقول',      badgeColor: '#10b981', isActiveRegistry: true },
  { id: 3, value: 'retained',     label: 'باق',        name_ar: 'باق',        badgeColor: '#f59e0b', isActiveRegistry: true },
  { id: 4, value: 'disconnected', label: 'منقطع',      name_ar: 'منقطع',      badgeColor: '#8b5cf6', isActiveRegistry: false },
  { id: 5, value: 'suspended',    label: 'موقوف قيده', name_ar: 'موقوف قيده', badgeColor: '#ef4444', isActiveRegistry: false },
  { id: 6, value: 'excluded',     label: 'مستبعد',     name_ar: 'مستبعد',     badgeColor: '#6b7280', isActiveRegistry: false },
];

export const ENROLLMENT_STATUS_BY_ID = Object.fromEntries(ENROLLMENT_STATUS_OPTIONS.map(s => [s.id, s]));
export const ENROLLMENT_STATUS_BY_VALUE = Object.fromEntries(ENROLLMENT_STATUS_OPTIONS.map(s => [s.value, s]));

// ── 2. الديانة (مسلم ومسيحي فقط) ───────────────────────────────────────────
export const RELIGIONS = [
  { id: 1, name: 'مسلم',   label: 'مسلم',   icon: '☪️' },
  { id: 2, name: 'مسيحي', label: 'مسيحي', icon: '✝️' },
];

// ── 3. النوع ───────────────────────────────────────────────────────────────
export const GENDERS = [
  { id: 1, name: 'ذكر',  label: 'ذكر',  icon: '👦' },
  { id: 2, name: 'أنثى', label: 'أنثى', icon: '👧' },
];

// ── 4. اللغات الأجنبية ────────────────────────────────────────────────────
export const FOREIGN_LANGUAGES = [
  { id: 1, code: 'en',   name: 'الإنجليزية', label: 'الإنجليزية' },
  { id: 2, code: 'fr',   name: 'الفرنسية',   label: 'الفرنسية' },
  { id: 3, code: 'de',   name: 'الألمانية',  label: 'الألمانية' },
  { id: 4, code: 'it',   name: 'الإيطالية',  label: 'الإيطالية' },
  { id: 5, code: 'es',   name: 'الإسبانية',  label: 'الإسبانية' },
  { id: 6, code: 'ru',   name: 'الروسية',    label: 'الروسية' },
  { id: 7, code: 'zh',   name: 'الصينية',    label: 'الصينية' },
  { id: 8, code: 'ar',   name: 'عربي',       label: 'عربي' },
  { id: 9, code: 'none', name: 'لا يوجد',    label: 'لا يوجد / معفى' },
];

// ── 5. حالات الدمج والإعاقات الرقمية المعتمدة بوزارة التربية والتعليم ──────
export const DISABILITY_TYPES = [
  { id: 0, code: 'NONE',     name: '0 - غير مدمج / سليم',                           label: '0 - غير مدمج / سليم',                           isMerged: false, typeName: null },
  { id: 1, code: 'VISUAL',   name: '1 - إعاقة بصرية (ضعاف بصر / مكفوفين)',          label: '1 - إعاقة بصرية (ضعاف بصر / مكفوفين)',          isMerged: true,  typeName: 'إعاقة بصرية' },
  { id: 2, code: 'HEARING',  name: '2 - إعاقة سمعية (ضعاف سمع / صم / زارعي قوقعة)', label: '2 - إعاقة سمعية (ضعاف سمع / صم / زارعي قوقعة)', isMerged: true,  typeName: 'إعاقة سمعية' },
  { id: 3, code: 'MENTAL',   name: '3 - إعاقة ذهنية بسيطة',                         label: '3 - إعاقة ذهنية بسيطة',                         isMerged: true,  typeName: 'إعاقة ذهنية' },
  { id: 4, code: 'CP',       name: '4 - شلل دماغي',                                 label: '4 - شلل دماغي',                                 isMerged: true,  typeName: 'شلل دماغي' },
  { id: 5, code: 'AUTISM',   name: '5 - طيف توحد (أوتيزم)',                         label: '5 - طيف توحد (أوتيزم)',                         isMerged: true,  typeName: 'طيف توحد' },
  { id: 6, code: 'DOWN',     name: '6 - متلازمة داون',                              label: '6 - متلازمة داون',                              isMerged: true,  typeName: 'متلازمة داون' },
  { id: 7, code: 'PHYSICAL', name: '7 - إعاقة حركية',                               label: '7 - إعاقة حركية',                               isMerged: true,  typeName: 'إعاقة حركية' },
  { id: 8, code: 'LEARNING', name: '8 - بطء تعلم / صعوبات تعلم',                    label: '8 - بطء تعلم / صعوبات تعلم',                    isMerged: true,  typeName: 'بطء تعلم' },
  { id: 9, code: 'MULTIPLE', name: '9 - إعاقة أخرى متعددة',                         label: '9 - إعاقة أخرى متعددة',                         isMerged: true,  typeName: 'أخرى' },
];

export const DISABILITY_BY_ID = Object.fromEntries(DISABILITY_TYPES.map(d => [d.id, d]));

// ── 6. مسارات الثانوي العام والبكالوريا المصرية الدولية ────────────────────
export const SECONDARY_SPECIALIZATIONS = [
  { id: 1, code: 'GEN_GEN',  name_ar: 'عام',                              track_code: 'GEN', group: 'عام (الصف الأول الثانوي)' },
  { id: 2, code: 'SCI_MATH', name_ar: 'علمي رياضيات',                     track_code: 'SCI', group: 'الثانوي العام المصري' },
  { id: 3, code: 'SCI_BIO',  name_ar: 'علمي علوم',                        track_code: 'SCI', group: 'الثانوي العام المصري' },
  { id: 4, code: 'LIT_GEN',  name_ar: 'أدبي',                             track_code: 'LIT', group: 'الثانوي العام المصري' },
  { id: 5, code: 'BAC_MED',  name_ar: 'مسار الطب وعلوم الحياة (بكالوريا)',  track_code: 'SCI', group: 'مسارات البكالوريا المصرية والدولية' },
  { id: 6, code: 'BAC_ENG',  name_ar: 'مسار الهندسة وعلوم الحاسب (بكالوريا)', track_code: 'SCI', group: 'مسارات البكالوريا المصرية والدولية' },
  { id: 7, code: 'BAC_BUS',  name_ar: 'مسار الأعمال (بكالوريا)',           track_code: 'GEN', group: 'مسارات البكالوريا المصرية والدولية' },
  { id: 8, code: 'BAC_ART',  name_ar: 'مسار الآداب والفنون (بكالوريا)',    track_code: 'LIT', group: 'مسارات البكالوريا المصرية والدولية' },
];

// ── 7. صلة القرابة لولي الأمر ─────────────────────────────────────────────
export const GUARDIAN_RELATIONS = [
  { id: 1,  name: 'أب',          label: 'أب' },
  { id: 2,  name: 'أم',          label: 'أم' },
  { id: 3,  name: 'جد',          label: 'جد' },
  { id: 4,  name: 'جدة',         label: 'جدة' },
  { id: 5,  name: 'عم',          label: 'عم' },
  { id: 6,  name: 'عمة',         label: 'عمة' },
  { id: 7,  name: 'خال',         label: 'خال' },
  { id: 8,  name: 'خالة',        label: 'خالة' },
  { id: 9,  name: 'أخ',          label: 'أخ' },
  { id: 10, name: 'أخت',         label: 'أخت' },
  { id: 11, name: 'وصي قانوني',  label: 'وصي قانوني' },
];

// ── 8. خريطة أكواد المحافظات بالرقم القومي المصري ────────────────────────
export const GOVERNORATES_MAP = {
  '01': 'القاهرة',    '02': 'الإسكندرية', '03': 'بورسعيد',    '04': 'السويس',
  '06': 'الجيزة',    '08': 'القاهرة',   '11': 'دمياط',      '12': 'الدقهلية',
  '13': 'الشرقية',   '14': 'القليوبية',  '15': 'كفر الشيخ',  '16': 'الغربية',
  '17': 'المنوفية',  '18': 'البحيرة',    '19': 'الإسماعيلية','21': 'الجيزة',
  '22': 'بني سويف',  '23': 'الفيوم',     '24': 'المنيا',     '25': 'أسيوط',
  '26': 'سوهاج',     '27': 'قنا',        '28': 'أسوان',      '29': 'الأقصر',
  '31': 'البحر الأحمر','32': 'الوادي الجديد','33': 'مطروح',  '34': 'شمال سيناء',
  '35': 'جنوب سيناء','88': 'خارج مصر'
};

// ── 9. مدقق ومستخرج بيانات الرقم القومي ──────────────────────────────────
export const parseEgyptianNationalId = (id) => {
  if (!id || typeof id !== 'string') return null;
  const clean = id.trim();
  if (clean.length !== 14 || !/^\d{14}$/.test(clean)) return null;

  const centuryCode = parseInt(clean[0], 10);
  if (centuryCode !== 2 && centuryCode !== 3) return null;

  const yearPart  = clean.substr(1, 2);
  const monthPart = clean.substr(3, 2);
  const dayPart   = clean.substr(5, 2);
  const m = parseInt(monthPart, 10);
  const d = parseInt(dayPart, 10);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  const fullYear    = centuryCode === 2 ? 1900 + parseInt(yearPart, 10) : 2000 + parseInt(yearPart, 10);
  const birthDate   = `${fullYear}-${monthPart}-${dayPart}`;
  const genderDigit = parseInt(clean.substr(12, 1), 10);
  const gender      = genderDigit % 2 === 0 ? 'أنثى' : 'ذكر';
  const govCode     = clean.substr(7, 2);
  const birthPlace  = GOVERNORATES_MAP[govCode] || 'أخرى';

  return { isValid: true, birthDate, gender, birthPlace };
};

// ── 10. منسق أرقام الفصول بصيغة رقمية بسيطة ومباشرة (1, 2, 3...) ────────
export const formatClassNumeric = (classNumber, className) => {
  if (classNumber !== null && classNumber !== undefined && classNumber !== '') {
    return String(classNumber);
  }
  if (!className) return '—';
  const numMatch = String(className).match(/\d+/);
  return numMatch ? numMatch[0] : String(className);
};

// ── 11. الخوارزمية القياسية المعتمدة للسن في 1 أكتوبر (وزارة التربية والتعليم) ──
export const calculateAgeOnOct1st = (birthDate, academicYear, fallbackYear) => {
  if (!birthDate) return { years: '', months: '', days: '' };

  let bYear, bMonth, bDay;

  const str = String(birthDate).trim();
  // إذا كان المدخل رقماً قومياً مصرياً من 14 رقم
  if (str.length === 14 && /^\d{14}$/.test(str)) {
    const century = parseInt(str[0], 10);
    const yPart = parseInt(str.substring(1, 3), 10);
    bYear = century === 2 ? 1900 + yPart : (century === 3 ? 2000 + yPart : null);
    bMonth = parseInt(str.substring(3, 5), 10);
    bDay = parseInt(str.substring(5, 7), 10);
  } else if (str.includes('-') || str.includes('/')) {
    // تحليل YYYY-MM-DD أو YYYY/MM/DD بالأرقام لتفادي مشاكل الـ Timezone
    const parts = str.split(/[-/]/).map(Number);
    if (parts.length >= 3) {
      if (parts[0] > 1900) { // YYYY-MM-DD
        bYear = parts[0];
        bMonth = parts[1];
        bDay = parts[2];
      } else if (parts[2] > 1900) { // DD-MM-YYYY
        bDay = parts[0];
        bMonth = parts[1];
        bYear = parts[2];
      }
    }
  }

  if (!bYear || !bMonth || !bDay || isNaN(bYear) || isNaN(bMonth) || isNaN(bDay) || bMonth < 1 || bMonth > 12 || bDay < 1 || bDay > 31) {
    return { years: '', months: '', days: '' };
  }

  // استخراج سنة بداية العام الدراسي (مثلاً 2025 من '2025/2026')
  let targetYear = null;
  if (academicYear) {
    const match = String(academicYear).match(/(\d{4})/);
    if (match) targetYear = parseInt(match[1], 10);
  }
  if (!targetYear && fallbackYear) {
    const match = String(fallbackYear).match(/(\d{4})/);
    if (match) targetYear = parseInt(match[1], 10);
  }
  if (!targetYear) {
    const now = new Date();
    targetYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  }

  // الحساب المعتمد لوزارة التربية والتعليم في 1 أكتوبر:
  let days = 1 - bDay;
  let months = 10 - bMonth;
  let years = targetYear - bYear;

  if (days < 0) {
    days += 30;
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days)
  };
};
