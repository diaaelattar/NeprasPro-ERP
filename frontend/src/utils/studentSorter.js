/**
 * Unified Student Sorting & Gender Normalization for NeprasPro ERP
 * Supports:
 *  - 'boys_first': Boys (ذكر / Code 1) first, then Girls (أنثى / Code 2), sorted alphabetically within each gender
 *  - 'girls_first': Girls (أنثى / Code 2) first, then Boys (ذكر / Code 1), sorted alphabetically within each gender
 *  - 'none' / 'alphabetical': Pure alphabetical order by Arabic full name
 */

export function normalizeStudentGender(val, nationalId = null) {
  const cleanStr = String(val || '').trim().toLowerCase();

  // Male variations
  if (['ذكر', 'بنين', 'ذكور', 'ولد', '1', 'male', 'm'].includes(cleanStr)) {
    return { name: 'ذكر', code: 1, isValid: true };
  }

  // Female variations
  if (['أنثى', 'انثى', 'أنثي', 'انثي', 'بنات', 'إناث', 'بنت', '2', 'female', 'f'].includes(cleanStr)) {
    return { name: 'أنثى', code: 2, isValid: true };
  }

  // Auto-extraction from 14-digit Egyptian National ID if available
  const cleanNId = String(nationalId || '').trim();
  if (cleanNId.length === 14 && /^\d{14}$/.test(cleanNId)) {
    const digit13 = parseInt(cleanNId[12], 10);
    if (!isNaN(digit13)) {
      return digit13 % 2 === 1
        ? { name: 'ذكر', code: 1, isValid: true, derivedFromNationalId: true }
        : { name: 'أنثى', code: 2, isValid: true, derivedFromNationalId: true };
    }
  }

  return { name: val || 'غير محدد', code: 0, isValid: false };
}

export function isBoy(student) {
  const norm = normalizeStudentGender(student?.gender, student?.national_id || student?.nationalId);
  return norm.code === 1;
}

export function isGirl(student) {
  const norm = normalizeStudentGender(student?.gender, student?.national_id || student?.nationalId);
  return norm.code === 2;
}

/**
 * Sorts students list according to the requested genderOrder and Arabic alphabetical name
 * @param {Array} students
 * @param {'boys_first' | 'girls_first' | 'alphabetical' | 'none'} [genderOrder='none']
 * @returns {Array} sorted students copy
 */
export function sortStudentsByGenderAndName(students = [], genderOrder = 'none') {
  if (!Array.isArray(students)) return [];
  const list = [...students];

  return list.sort((a, b) => {
    const isBoyA = isBoy(a);
    const isBoyB = isBoy(b);

    if (genderOrder === 'boys_first') {
      if (isBoyA && !isBoyB) return -1;
      if (!isBoyA && isBoyB) return 1;
    } else if (genderOrder === 'girls_first') {
      if (!isBoyA && isBoyB) return -1;
      if (isBoyA && !isBoyB) return 1;
    }

    // Secondary / Alphabetical sort by Arabic name
    const nameA = String(a?.full_name_ar || a?.fullNameAr || a?.name || '').trim();
    const nameB = String(b?.full_name_ar || b?.fullNameAr || b?.name || '').trim();
    return nameA.localeCompare(nameB, 'ar', { sensitivity: 'base' });
  });
}
