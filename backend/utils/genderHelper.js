/**
 * Unified Gender Helper for NeprasPro ERP
 * Standards:
 *  - Standard Arabic: 'ذكر' (Male, Code 1) / 'أنثى' (Female, Code 2)
 *  - Code Integer: 1 (ذكر) / 2 (أنثى)
 *  - Auto-repair from Egyptian 14-digit National ID (Digit 13: Odd = Male/1, Even = Female/2)
 */

function normalizeGender(val, nationalId = null) {
  const cleanStr = String(val || '').trim().toLowerCase();

  // Male matches
  if (['ذكر', 'بنين', 'ذكور', 'ولد', '1', 'male', 'm'].includes(cleanStr)) {
    return { name: 'ذكر', code: 1, isValid: true };
  }

  // Female matches
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

  return { name: val || null, code: 0, isValid: false };
}

/**
 * Returns SQL CASE snippet for sorting by gender in SQLite queries
 * @param {'boys_first' | 'girls_first' | 'alphabetical' | string} genderOrder
 * @param {string} [tableAlias='s']
 * @returns {string}
 */
function getSqlGenderOrderClause(genderOrder, tableAlias = 's') {
  const g = `${tableAlias}.gender`;
  const nid = `${tableAlias}.national_id`;

  if (genderOrder === 'boys_first') {
    return `(CASE 
      WHEN ${g} IN ('ذكر', 'بنين', 'ذكور', 'ولد', '1', 'male', 'MALE', 'm', 'M') 
        OR (LENGTH(${nid}) = 14 AND CAST(SUBSTR(${nid}, 13, 1) AS INTEGER) % 2 = 1) THEN 1
      WHEN ${g} IN ('أنثى', 'انثى', 'أنثي', 'انثي', 'بنات', 'إناث', 'بنت', '2', 'female', 'FEMALE', 'f', 'F') 
        OR (LENGTH(${nid}) = 14 AND CAST(SUBSTR(${nid}, 13, 1) AS INTEGER) % 2 = 0) THEN 2
      ELSE 3
    END) ASC, ${tableAlias}.full_name_ar ASC`;
  }

  if (genderOrder === 'girls_first') {
    return `(CASE 
      WHEN ${g} IN ('أنثى', 'انثى', 'أنثي', 'انثي', 'بنات', 'إناث', 'بنت', '2', 'female', 'FEMALE', 'f', 'F') 
        OR (LENGTH(${nid}) = 14 AND CAST(SUBSTR(${nid}, 13, 1) AS INTEGER) % 2 = 0) THEN 1
      WHEN ${g} IN ('ذكر', 'بنين', 'ذكور', 'ولد', '1', 'male', 'MALE', 'm', 'M') 
        OR (LENGTH(${nid}) = 14 AND CAST(SUBSTR(${nid}, 13, 1) AS INTEGER) % 2 = 1) THEN 2
      ELSE 3
    END) ASC, ${tableAlias}.full_name_ar ASC`;
  }

  return `${tableAlias}.full_name_ar ASC`;
}

module.exports = {
  normalizeGender,
  getSqlGenderOrderClause
};
