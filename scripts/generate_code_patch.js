// ─── Generate composite student code ─────────────────────────────────────────
// Format: [section.code][stage.code (2d)][grade.code (2d)][class.code (2d)][serial (3d)]
// Example: section=1, stage=3(Primary), grade=5, class=2, serial=1 => "1030502001"
const _generateCode = (sqliteDb, sectionId, stageId, gradeId, classId) => {
  const sec = _get(sqliteDb, 'SELECT code FROM sections WHERE id = ?', [sectionId]);
  const stg = _get(sqliteDb, 'SELECT code FROM stages_lookup WHERE id = ?', [stageId]);
  const grd = _get(sqliteDb, 'SELECT code FROM grades_lookup WHERE id = ?', [gradeId]);
  const cls = classId ? _get(sqliteDb, 'SELECT class_code FROM classes WHERE id = ?', [classId]) : null;

  const secCode = String(sec ? sec.code || 0 : 0);
  const stgCode = String(stg ? stg.code || 0 : 0).padStart(2, '0');
  const grdCode = String(grd ? grd.code || 0 : 0).padStart(2, '0');
  const clsCode = String((cls && cls.class_code) ? cls.class_code : 0).padStart(2, '0');

  // Serial = count of active students in same section+stage+grade+class + 1
  const countRow = _get(sqliteDb,
    `SELECT COUNT(*) AS cnt FROM students
     WHERE section_id=? AND stage_id=? AND grade_id=?
       AND ((?=0 AND class_id IS NULL) OR class_id=?) AND is_deleted=0`,
    [sectionId, stageId, gradeId, classId || 0, classId || null]
  );
  const serial = String(((countRow && countRow.cnt) || 0) + 1).padStart(3, '0');

  return `${secCode}${stgCode}${grdCode}${clsCode}${serial}`;
};

// ─── Compute student_serial_in_class and student_serial_in_grade ──────────────
const _computeSerials = (sqliteDb, sectionId, stageId, gradeId, classId) => {
  const inClass = classId ? (_get(sqliteDb,
    'SELECT COUNT(*) AS cnt FROM students WHERE class_id=? AND is_deleted=0',
    [classId]) || { cnt: 0 }) : { cnt: 0 };

  const inGrade = _get(sqliteDb,
    'SELECT COUNT(*) AS cnt FROM students WHERE section_id=? AND stage_id=? AND grade_id=? AND is_deleted=0',
    [sectionId, stageId, gradeId]
  ) || { cnt: 0 };

  return {
    student_serial_in_class: (inClass.cnt || 0) + 1,
    student_serial_in_grade: (inGrade.cnt || 0) + 1
  };
};
