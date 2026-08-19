// ════════════════════════════════════════════════════════════════
//  siblingDetector.js — محرك اكتشاف وربط الإخوة والتوائم الذكي (NeprasPro)
// ════════════════════════════════════════════════════════════════
//  1. الفيصل الرئيسي: الرقم القومي للأب/ولي الأمر (14 رقماً).
//  2. الخوارزمية الذكية: تطبيع النص العربي + بصمة اسم الأب + الهاتف/العنوان.
//  3. التمييز الدقيق: نفس تاريخ الميلاد = توائم (Twins) / تواريخ مختلفة = إخوة (Siblings).
// ════════════════════════════════════════════════════════════════

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

  // الاحتفاظ بأول 3 إلى 4 مقاطع من اسم الأب
  return parts.slice(0, 4).join(' ');
}

function cleanPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 8 ? digits.slice(-10) : '';
}

function detectSiblingsAndTwins(sqliteDb) {
  if (!sqliteDb) return { groups: [], totalSiblingsCount: 0, totalTwinsCount: 0 };

  const stmt = sqliteDb.prepare(`
    SELECT s.id, s.full_name_ar, s.student_code, s.national_id, s.birth_date,
           s.gender, s.guardian_name, s.guardian_national_id, s.guardian_phone,
           s.mother_name, s.mother_national_id, s.address, s.is_twin, s.twin_student_id,
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
  normalizeArabic,
  extractFatherSignature,
  detectSiblingsAndTwins,
  autoLinkSiblingsAndTwins
};
