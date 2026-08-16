const fs = require('fs');

const filePath = 'd:\\NeprasPro\\backend\\modules\\students\\students.controller.js';
let content = fs.readFileSync(filePath, 'utf8');

// Use line index approach since Arabic content can cause match issues
const lines = content.split('\n');

const startMarker = '// \u2500\u2500\u2500 Generate student code \u2500';
const startIdx = lines.findIndex(l => l.includes('Generate student code'));
let endIdx = -1;
if (startIdx >= 0) {
  // Find the closing }; after startIdx (the end of the function block)
  let braceDepth = 0;
  let started = false;
  for (let i = startIdx; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') { braceDepth++; started = true; }
      if (ch === '}') { braceDepth--; }
    }
    if (started && braceDepth === 0) {
      endIdx = i;
      break;
    }
  }
}

if (startIdx < 0 || endIdx < 0) {
  console.error('Could not find _generateCode block. startIdx:', startIdx, 'endIdx:', endIdx);
  process.exit(1);
}

console.log(`Replacing lines ${startIdx + 1} to ${endIdx + 1}`);

const newBlock = `// \u2500\u2500\u2500 Generate composite student code \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Format: [section.code][stage.code 2d][grade.code 2d][class.code 2d][serial 3d]
// Example: section=1, stage=Primary(3), grade=5, class=2, serial=1 => "1030502001"
const _generateCode = (sqliteDb, sectionId, stageId, gradeId, classId) => {
  const sec = _get(sqliteDb, 'SELECT code FROM sections WHERE id = ?', [sectionId]);
  const stg = _get(sqliteDb, 'SELECT code FROM stages_lookup WHERE id = ?', [stageId]);
  const grd = _get(sqliteDb, 'SELECT code FROM grades_lookup WHERE id = ?', [gradeId]);
  const cls = classId ? _get(sqliteDb, 'SELECT class_code FROM classes WHERE id = ?', [classId]) : null;

  const secCode = String(sec ? sec.code || 0 : 0);
  const stgCode = String(stg ? stg.code || 0 : 0).padStart(2, '0');
  const grdCode = String(grd ? grd.code || 0 : 0).padStart(2, '0');
  const clsCode = String((cls && cls.class_code) ? cls.class_code : 0).padStart(2, '0');

  const countRow = _get(sqliteDb,
    'SELECT COUNT(*) AS cnt FROM students WHERE section_id=? AND stage_id=? AND grade_id=? AND is_deleted=0',
    [sectionId, stageId, gradeId]
  );
  const serial = String(((countRow && countRow.cnt) || 0) + 1).padStart(3, '0');

  return secCode + stgCode + grdCode + clsCode + serial;
};

// \u2500\u2500\u2500 Compute student_serial_in_class and student_serial_in_grade \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
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
};`;

const newLines = lines.slice(0, startIdx)
  .concat(newBlock.split('\n'))
  .concat(lines.slice(endIdx + 1));

fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log('SUCCESS: _generateCode patched to composite version.');
