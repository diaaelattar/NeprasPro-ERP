/**
 * Unified School Helper Utility
 * Provides a single source of truth for institution/school metadata
 * across reports, exports, PDFs, control modules, and UI headers.
 */

const _get = (sqliteDb, sql, params = []) => {
  try {
    const stmt = sqliteDb.prepare(sql);
    if (params.length) stmt.bind(params);
    const hasRow = stmt.step();
    const row = hasRow ? stmt.getAsObject() : null;
    stmt.free();
    return row;
  } catch (_) {
    return null;
  }
};

function getSchoolMasterInfo(sqliteDb) {
  if (!sqliteDb) return getDefaultSchoolInfo();

  try {
    const inst = _get(sqliteDb, `
      SELECT ic.*,
             COALESCE(NULLIF(ic.governorate, ''), g.name_ar, '') AS governorate_name,
             COALESCE(NULLIF(ic.directorate, ''), ea.name_ar, '') AS directorate_name,
             st.full_name_ar AS staff_director_name
      FROM institution_config ic
      LEFT JOIN governorates g ON g.id = ic.governorate_id
      LEFT JOIN educational_administrations ea ON ea.id = ic.administration_id
      LEFT JOIN staff st ON (st.id = ic.director_id OR (st.position_title LIKE '%مدير%' AND ic.director_name IS NULL))
      ORDER BY ic.id ASC
      LIMIT 1
    `) || _get(sqliteDb, 'SELECT * FROM institution_config LIMIT 1');

    if (!inst) return getDefaultSchoolInfo();

    const gov = (inst.governorate_name || inst.governorate || '').trim();
    const dir = (inst.directorate_name || inst.directorate || '').trim();
    const name = (inst.school_name || '').trim();
    const director = (inst.staff_director_name || inst.director_name || '').trim();
    const activeYearRow = _get(sqliteDb, `SELECT name_ar, name_en, year_label FROM academic_years WHERE is_active = 1 ORDER BY id DESC LIMIT 1`)
      || _get(sqliteDb, `SELECT name_ar, name_en, year_label FROM academic_years ORDER BY id DESC LIMIT 1`);
    const activeYearName = activeYearRow?.year_label || activeYearRow?.name_ar || '2026 / 2027';

    return {
      id: inst.id || 1,
      school_code: inst.school_code || '',
      school_name: name,
      school_name_en: inst.school_name_en || '',
      governorate: gov,
      directorate: dir,
      academic_year_name: activeYearName,
      academicYear: activeYearName,
      governorate_id: inst.governorate_id || null,
      administration_id: inst.administration_id || null,
      education_type: inst.education_type || 'رسمي',
      director_name: director,
      address: inst.address || '',
      phone: inst.phone || '',
      email: inst.email || '',
      website: inst.website || '',
      logo_url: inst.logo_url || '',
      is_initialized: Boolean(inst.is_initialized),
      // camelCase aliases for JSON API consistency
      schoolCode: inst.school_code || '',
      schoolName: name,
      schoolNameEn: inst.school_name_en || '',
      governorateId: inst.governorate_id || null,
      administrationId: inst.administration_id || null,
      educationType: inst.education_type || 'رسمي',
      directorName: director,
      logoUrl: inst.logo_url || '',
      // Standard ministerial header strings
      headerRight: `محافظة: ${gov || '................'}\nإدارة: ${dir || '................'}\nمدرسة: ${name || '................'}`,
      headerGovDir: `مديرية التربية والتعليم بمحافظة: ${gov || '................'} - إدارة: ${dir || '................'} التعليمية`
    };
  } catch (_) {
    return getDefaultSchoolInfo();
  }
}

function getDefaultSchoolInfo() {
  return {
    id: 1,
    school_code: '',
    school_name: '',
    school_name_en: '',
    governorate: '',
    directorate: '',
    governorate_id: null,
    administration_id: null,
    education_type: 'رسمي',
    director_name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo_url: '',
    is_initialized: false,
    schoolCode: '',
    schoolName: '',
    schoolNameEn: '',
    governorateId: null,
    administrationId: null,
    educationType: 'رسمي',
    directorName: '',
    logoUrl: '',
    headerRight: 'محافظة: ................\nإدارة: ................\nمدرسة: ................',
    headerGovDir: 'مديرية التربية والتعليم بمحافظة: ................ - إدارة: ................ التعليمية'
  };
}

/**
 * حساب السن في 1 أكتوبر بدقة متناهية وفق اللوائح الوزارية المصرية
 * @param {string} birthDate - تاريخ الميلاد بصيغة YYYY-MM-DD أو رقم قومي مكون من 14 رقم
 * @param {string|number} academicYear - العام الدراسي (مثال: '2025/2026' أو 2025)
 * @param {string|number} fallbackYear - سنة احتياطية في حال عدم توفر العام الدراسي
 * @returns {{ years: number|string, months: number|string, days: number|string }}
 */
function calculateAgeOnOct1st(birthDate, academicYear, fallbackYear) {
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
  // اليوم المستهدف = 1
  // الشهر المستهدف = 10 (أكتوبر)
  // السنة المستهدفة = targetYear
  let days = 1 - bDay;
  let months = 10 - bMonth;
  let years = targetYear - bYear;

  if (days < 0) {
    // استلاف شهر من أكتوبر (سبتمبر فيه 30 يوماً): 1 + 30 - bDay
    days += 30;
    months -= 1;
  }

  if (months < 0) {
    // استلاف سنة من targetYear (12 شهراً)
    months += 12;
    years -= 1;
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days)
  };
}

/**
 * تطبيع النص العربي لإزالة الفروق الإملائية والتشكيل والمسافات الزائدة
 */
function normalizeArabic(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '') // إزالة التشكيل
    .replace(/[إأآٱ]/g, 'ا')              // توحيد الألفات
    .replace(/ى/g, 'ي')                   // توحيد الياء واللينة
    .replace(/ة/g, 'ه')                   // توحيد التاء المربوطة والهاء
    .replace(/عبد\s+/g, 'عبد')            // دمج مقطع عبد
    .replace(/أبو\s+/g, 'ابو')
    .replace(/ابو\s+/g, 'ابو')
    .replace(/الله/g, 'الله')
    .replace(/\s+/g, ' ');                // توحيد المسافات
}

/**
 * استخراج بصمة الأب والجد (من المقطع الثاني لاسم الطالب فصاعداً، أو اسم ولي الأمر)
 */
function extractFatherSignature(fullName, guardianName) {
  const normFull = normalizeArabic(fullName);
  const normGuardian = normalizeArabic(guardianName);

  let parts = [];
  if (normGuardian && normGuardian.split(' ').length >= 2) {
    parts = normGuardian.split(' ');
  } else if (normFull) {
    const fullParts = normFull.split(' ');
    if (fullParts.length >= 2) {
      parts = fullParts.slice(1); // إزالة الاسم الأول للطالب
    }
  }

  return parts.slice(0, 4).join(' ');
}

function cleanPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 8 ? digits.slice(-10) : '';
}

/**
 * اكتشاف جميع مجموعات الإخوة والتوائم في المدرسة
 */
function detectSiblingsAndTwins(sqliteDb) {
  if (!sqliteDb) return { groups: [], totalSiblingsCount: 0, totalTwinsCount: 0 };

  const stmt = sqliteDb.prepare(`
    SELECT s.id, s.full_name_ar, s.student_code, s.national_id, s.birth_date,
           s.gender, s.guardian_name, s.guardian_national_id, s.guardian_phone,
           s.mother_name, s.mother_national_id, s.address, s.twin_student_id,
           s.sibling_student_ids,
           g.grade_name_ar, c.class_name AS classroom_name, ay.year_label AS academic_year
    FROM students s
    LEFT JOIN grades_lookup g ON g.id = s.grade_id
    LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.academic_year_id = s.academic_year_id
    LEFT JOIN classes c ON c.id = ce.class_id
    LEFT JOIN academic_years ay ON ay.id = s.academic_year_id
    WHERE s.deleted_at IS NULL
    ORDER BY s.full_name_ar ASC
  `);

  const students = [];
  while (stmt.step()) {
    students.push(stmt.getAsObject());
  }
  stmt.free();

  const groupsMap = new Map();

  students.forEach(stu => {
    let groupKey = null;
    let matchType = '';
    let confidence = 0;

    const gNid = stu.guardian_national_id ? String(stu.guardian_national_id).trim() : '';
    const mNid = stu.mother_national_id ? String(stu.mother_national_id).trim() : '';
    const phone = cleanPhone(stu.guardian_phone);
    const fatherSig = extractFatherSignature(stu.full_name_ar, stu.guardian_name);

    // 1. المعيار الأقوى: الرقم القومي للأب أو الأم (14 رقماً)
    if (gNid && gNid.length === 14 && /^\d{14}$/.test(gNid)) {
      groupKey = `NID_FATHER_${gNid}`;
      matchType = 'تطابق الرقم القومي للأب (100%)';
      confidence = 100;
    } else if (mNid && mNid.length === 14 && /^\d{14}$/.test(mNid)) {
      groupKey = `NID_MOTHER_${mNid}`;
      matchType = 'تطابق الرقم القومي للأم (100%)';
      confidence = 100;
    } else if (fatherSig && fatherSig.split(' ').length >= 3) {
      // 2. الخوارزمية الذكية: بصمة اسم الأب المنقحة + الهاتف
      if (phone) {
        groupKey = `SIG_${fatherSig}_PH_${phone}`;
        matchType = 'تطابق اسم الأب ورقم الهاتف (98%)';
        confidence = 98;
      } else if (fatherSig.split(' ').length >= 4) {
        groupKey = `SIG4_${fatherSig}`;
        matchType = 'تطابق اسم الأب الرباعي الكامل (92%)';
        confidence = 92;
      } else {
        groupKey = `SIG3_${fatherSig}`;
        matchType = 'تطابق اسم الأب الثلاثي (80%)';
        confidence = 80;
      }
    }

    if (groupKey) {
      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          groupKey,
          matchType,
          confidence,
          fatherName: fatherSig || stu.guardian_name || '—',
          guardianPhone: stu.guardian_phone || '—',
          students: []
        });
      }
      groupsMap.get(groupKey).students.push(stu);
    }
  });

  const validGroups = [];
  let totalSiblingsCount = 0;
  let totalTwinsCount = 0;

  groupsMap.forEach(group => {
    if (group.students.length >= 2) {
      const birthDateCounts = {};
      group.students.forEach(s => {
        const bd = s.birth_date || 'unknown';
        birthDateCounts[bd] = (birthDateCounts[bd] || 0) + 1;
      });

      let hasTwins = false;
      const twinsList = [];
      const nonTwinsList = [];

      group.students.forEach(s => {
        const isTwinInGroup = s.birth_date && birthDateCounts[s.birth_date] >= 2;
        if (isTwinInGroup) {
          hasTwins = true;
          twinsList.push(s);
          totalTwinsCount++;
        } else {
          nonTwinsList.push(s);
          totalSiblingsCount++;
        }
      });

      validGroups.push({
        ...group,
        hasTwins,
        type: hasTwins ? (nonTwinsList.length > 0 ? 'إخوة وتوائم معاً' : 'توائم (Twins)') : 'إخوة (Siblings)',
        studentsCount: group.students.length,
        twinsCount: twinsList.length,
        twinsList,
        nonTwinsList
      });
    }
  });

  validGroups.sort((a, b) => {
    if (a.hasTwins && !b.hasTwins) return -1;
    if (!a.hasTwins && b.hasTwins) return 1;
    return b.confidence - a.confidence || b.studentsCount - a.studentsCount;
  });

  return {
    groups: validGroups,
    groupsCount: validGroups.length,
    totalSiblingsCount,
    totalTwinsCount
  };
}

/**
 * الربط التلقائي للإخوة والتوائم وتحديث قاعدة البيانات
 */
function autoLinkSiblingsAndTwins(sqliteDb, groupKeysToLink = null) {
  if (!sqliteDb) throw new Error('قاعدة البيانات غير مهيأة');

  const { groups } = detectSiblingsAndTwins(sqliteDb);
  const targetGroups = groupKeysToLink && groupKeysToLink.length > 0
    ? groups.filter(g => groupKeysToLink.includes(g.groupKey))
    : groups;

  let linkedCount = 0;
  let twinsLinkedCount = 0;

  sqliteDb.run('BEGIN TRANSACTION;');
  try {
    targetGroups.forEach(group => {
      const allIds = group.students.map(s => s.id);
      
      const birthDateMap = {};
      group.students.forEach(s => {
        if (s.birth_date) {
          if (!birthDateMap[s.birth_date]) birthDateMap[s.birth_date] = [];
          birthDateMap[s.birth_date].push(s.id);
        }
      });

      group.students.forEach(stu => {
        const otherSiblings = allIds.filter(id => id !== stu.id);
        const siblingJson = JSON.stringify(otherSiblings);

        let isTwinVal = 0;
        let twinPartnerId = null;
        if (stu.birth_date && birthDateMap[stu.birth_date] && birthDateMap[stu.birth_date].length >= 2) {
          isTwinVal = 1;
          const otherTwins = birthDateMap[stu.birth_date].filter(id => id !== stu.id);
          twinPartnerId = otherTwins.length > 0 ? otherTwins[0] : null;
          twinsLinkedCount++;
        }

        sqliteDb.run(`
          UPDATE students
          SET sibling_student_ids = ?,
              is_twin = ?,
              twin_student_id = ?
          WHERE id = ?
        `, [siblingJson, isTwinVal, twinPartnerId, stu.id]);

        linkedCount++;
      });
    });

    sqliteDb.run('COMMIT;');
    return {
      success: true,
      linkedCount,
      twinsLinkedCount,
      groupsCount: targetGroups.length
    };
  } catch (err) {
    sqliteDb.run('ROLLBACK;');
    throw err;
  }
}

module.exports = {
  getSchoolMasterInfo,
  getDefaultSchoolInfo,
  calculateAgeOnOct1st,
  normalizeArabic,
  extractFatherSignature,
  detectSiblingsAndTwins,
  autoLinkSiblingsAndTwins
};
