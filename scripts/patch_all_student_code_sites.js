/**
 * Patch students.controller.js:
 * 1. Add classId to createStudent destructuring
 * 2. Update 4 _generateCode call sites to new signature
 * 3. Add class_id, student_serial_in_class, student_serial_in_grade to INSERT statements (sites 1, 3, 4)
 * 4. Log student_academic_history after every successful INSERT
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join('d:\\NeprasPro', 'backend', 'modules', 'students', 'students.controller.js');
let content = fs.readFileSync(filePath, 'utf8');
const CRLF = content.includes('\r\n');
const EOL  = CRLF ? '\r\n' : '\n';

let changed = 0;

// ── Helper: replace first occurrence ─────────────────────────────────────────
const replaceOnce = (src, oldStr, newStr, label) => {
  const idx = src.indexOf(oldStr);
  if (idx === -1) {
    console.warn(`[WARN] Not found: ${label}`);
    return src;
  }
  changed++;
  console.log(`[OK] Patched: ${label}`);
  return src.slice(0, idx) + newStr + src.slice(idx + oldStr.length);
};

// ════════════════════════════════════════════════════════════════════════════
// 1. Add classId to createStudent destructuring  (line ~428)
// ════════════════════════════════════════════════════════════════════════════
content = replaceOnce(
  content,
  `    sectionId, stageId, gradeId, academicYearId,\r\n    fullNameAr,`,
  `    sectionId, stageId, gradeId, classId, academicYearId,\r\n    fullNameAr,`,
  'Add classId to createStudent destructuring'
);

// ════════════════════════════════════════════════════════════════════════════
// 2. Site 1: createStudent — update generateCode call + INSERT + history log
// ════════════════════════════════════════════════════════════════════════════
content = replaceOnce(
  content,
  `      studentCode = _generateCode(sqliteDb, parseInt(sectionId), parseInt(stageId));\r\n      sqliteDb.run(\`\r\n        INSERT INTO students (\r\n          section_id, stage_id, grade_id, academic_year_id, student_code,\r\n          full_name_ar, full_name_en, birth_date, birth_place,\r\n          nationality_id, national_id, gender, religion,\r\n          guardian_name, guardian_relation, guardian_national_id,\r\n          guardian_phone, guardian_phone_2, guardian_job,\r\n          mother_name, mother_nationality_id, mother_national_id,\r\n          address, student_phone, second_language, secondary_track, secondary_elective,\r\n          is_merged, merged_grade_id, merge_type, merge_decision_number, merge_decision_date, merge_notes, enrollment_date,\r\n          status, enrollment_status, is_excluded, emis_student_code\r\n        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)\r\n      \`, [\r\n        sectionId, stageId, gradeId, academicYearId, studentCode,\r\n        fullNameAr, fullNameEn||null, birthDate||null, birthPlace||null,\r\n        nationalityId||null, nationalId||null, gender, religion||null,\r\n        guardianName||null, guardianRelation||null, guardianNationalId||null,\r\n        guardianPhone||null, guardianPhone2||null, guardianJob||null,\r\n        motherName||null, motherNationalityId||null, motherNationalId||null,\r\n        address||null, studentPhone||null, secondLanguage||null, secondaryTrack||null, secondaryElective||null,\r\n        isMerged ? 1 : 0, mergedGradeId||null, mergeType||null, mergeDecisionNumber||null, mergeDecisionDate||null, mergeNotes||null,\r\n        enrollmentDate || new Date().toISOString().split('T')[0],\r\n        mapped.status, mapped.enrollment, mapped.is_excluded,\r\n        emisStudentCode || null\r\n      ]);\r\n      studentId = _lastId(sqliteDb);\r\n      for (const caseTypeId of (specialCases || [])) {\r\n        sqliteDb.run('INSERT OR IGNORE INTO student_special_cases (student_id, case_type_id) VALUES (?,?)', [studentId, caseTypeId]);\r\n      }`,
  `      const _cid = classId ? parseInt(classId) : null;
      studentCode = _generateCode(sqliteDb, parseInt(sectionId), parseInt(stageId), parseInt(gradeId), _cid);
      const { student_serial_in_class: _sic, student_serial_in_grade: _sig } = _computeSerials(sqliteDb, parseInt(sectionId), parseInt(stageId), parseInt(gradeId), _cid);
      sqliteDb.run(\`
        INSERT INTO students (
          section_id, stage_id, grade_id, class_id, academic_year_id, student_code,
          student_serial_in_class, student_serial_in_grade,
          full_name_ar, full_name_en, birth_date, birth_place,
          nationality_id, national_id, gender, religion,
          guardian_name, guardian_relation, guardian_national_id,
          guardian_phone, guardian_phone_2, guardian_job,
          mother_name, mother_nationality_id, mother_national_id,
          address, student_phone, second_language, secondary_track, secondary_elective,
          is_merged, merged_grade_id, merge_type, merge_decision_number, merge_decision_date, merge_notes, enrollment_date,
          status, enrollment_status, is_excluded, emis_student_code
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      \`, [
        sectionId, stageId, gradeId, _cid, academicYearId, studentCode,
        _sic, _sig,
        fullNameAr, fullNameEn||null, birthDate||null, birthPlace||null,
        nationalityId||null, nationalId||null, gender, religion||null,
        guardianName||null, guardianRelation||null, guardianNationalId||null,
        guardianPhone||null, guardianPhone2||null, guardianJob||null,
        motherName||null, motherNationalityId||null, motherNationalId||null,
        address||null, studentPhone||null, secondLanguage||null, secondaryTrack||null, secondaryElective||null,
        isMerged ? 1 : 0, mergedGradeId||null, mergeType||null, mergeDecisionNumber||null, mergeDecisionDate||null, mergeNotes||null,
        enrollmentDate || new Date().toISOString().split('T')[0],
        mapped.status, mapped.enrollment, mapped.is_excluded,
        emisStudentCode || null
      ]);
      studentId = _lastId(sqliteDb);
      // Log academic history
      sqliteDb.run(\`INSERT OR IGNORE INTO student_academic_history
        (student_id, academic_year_id, section_id, stage_id, grade_id, class_id, student_serial_in_class, student_serial_in_grade, enrollment_status)
        VALUES (?,?,?,?,?,?,?,?,?)\`,
        [studentId, academicYearId, sectionId, stageId, gradeId, _cid, _sic, _sig, mapped.enrollment]
      );
      for (const caseTypeId of (specialCases || [])) {
        sqliteDb.run('INSERT OR IGNORE INTO student_special_cases (student_id, case_type_id) VALUES (?,?)', [studentId, caseTypeId]);
      }`,
  'Site 1: createStudent INSERT + history log'
);

// ════════════════════════════════════════════════════════════════════════════
// 3. Site 2: bulk import (line ~1553) — update generateCode signature only
//    (bulk import has its own row data; no classId typically)
// ════════════════════════════════════════════════════════════════════════════
content = replaceOnce(
  content,
  `          const studentCode = _generateCode(sqliteDb, parseInt(sectionId), parseInt(stageId));\r\n          \r\n          sqliteDb.run(\`\r\n            INSERT INTO students (\r\n              section_id, stage_id, grade_id, academic_year_id, student_code,`,
  `          const studentCode = _generateCode(sqliteDb, parseInt(sectionId), parseInt(stageId), parseInt(gradeId), null);
          const { student_serial_in_class: _bsic, student_serial_in_grade: _bsig } = _computeSerials(sqliteDb, parseInt(sectionId), parseInt(stageId), parseInt(gradeId), null);
          
          sqliteDb.run(\`
            INSERT INTO students (
              section_id, stage_id, grade_id, academic_year_id, student_code,`,
  'Site 2: bulk import generateCode update'
);

// ════════════════════════════════════════════════════════════════════════════
// 4. Site 3: quick-add (line ~2011)
// ════════════════════════════════════════════════════════════════════════════
content = replaceOnce(
  content,
  `    const studentCode = _generateCode(sqliteDb, sectionId, stageId);\r\n\r\n      INSERT INTO students (\r\n        student_code, full_name_ar, gender, birth_date, birth_place,`,
  `    const studentCode = _generateCode(sqliteDb, sectionId, stageId, gradeId, null);
    const { student_serial_in_class: _qsic, student_serial_in_grade: _qsig } = _computeSerials(sqliteDb, sectionId, stageId, gradeId, null);

      INSERT INTO students (
        student_code, full_name_ar, gender, birth_date, birth_place,`,
  'Site 3: quick-add generateCode update'
);

// ════════════════════════════════════════════════════════════════════════════
// 5. Site 4: quick-add batch (line ~2069)
// ════════════════════════════════════════════════════════════════════════════
content = replaceOnce(
  content,
  `          const studentCode = _generateCode(sqliteDb, sectionId, stageId);\r\n\r\n            INSERT INTO students (\r\n              student_code, full_name_ar, gender, birth_date, birth_place,`,
  `          const studentCode = _generateCode(sqliteDb, sectionId, stageId, gradeId, null);
          const { student_serial_in_class: _qbsic, student_serial_in_grade: _qbsig } = _computeSerials(sqliteDb, sectionId, stageId, gradeId, null);

            INSERT INTO students (
              student_code, full_name_ar, gender, birth_date, birth_place,`,
  'Site 4: quick-add batch generateCode update'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log(`\nDone. ${changed}/5 patches applied.`);
