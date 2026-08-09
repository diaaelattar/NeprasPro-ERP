const fs = require('fs');
const filePath = 'd:/NeprasPro/backend/modules/students/students.controller.js';

let content = fs.readFileSync(filePath, 'utf8');

// 1. Require excelReportEngine at top
if (!content.includes("excelReportEngine")) {
  content = `const excelReportEngine = require('../../services/excelReportEngine');\n` + content;
}

// 2. Define exportFullClassListExcel before exportClassListExcel
const fullClassListFunc = `
const exportFullClassListExcel = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const { search, sectionId, stageId, gradeId, classId, status, academicYearId, genderOrder } = req.query;
    const where  = ['1=1'];
    const params = [];
    if (search) {
      where.push('(s.full_name_ar LIKE ? OR s.student_code LIKE ? OR s.national_id LIKE ?)');
      params.push(\`%\${search}%\`, \`%\${search}%\`, \`%\${search}%\`);
    }
    if (sectionId) { where.push('s.section_id = ?'); params.push(sectionId); }
    if (stageId)   { where.push('s.stage_id = ?');   params.push(stageId); }
    if (gradeId && gradeId !== 'all_stage' && gradeId !== 'all') {
      where.push('s.grade_id = ?');
      params.push(gradeId);
    }
    if (classId && classId !== 'all' && classId !== 'all_grade' && classId !== 'all_stage') {
      where.push('EXISTS (SELECT 1 FROM class_enrollments ce WHERE ce.student_id = s.id AND ce.class_id = ?)');
      params.push(classId);
    }
    if (status === 'all') {}
    else if (status) { where.push('s.status = ?'); params.push(status); }
    else { where.push("s.status != 'suspended'"); }
    if (academicYearId) { where.push('s.academic_year_id = ?'); params.push(academicYearId); }

    let genderSortClause = 's.full_name_ar ASC';
    if (genderOrder === 'boys_first') {
      genderSortClause = \`(CASE WHEN s.gender = 'ذكر' THEN 1 WHEN s.gender = 'أنثى' THEN 2 ELSE 3 END) ASC, s.full_name_ar ASC\`;
    } else if (genderOrder === 'girls_first') {
      genderSortClause = \`(CASE WHEN s.gender = 'أنثى' THEN 1 WHEN s.gender = 'ذكر' THEN 2 ELSE 3 END) ASC, s.full_name_ar ASC\`;
    }

    const whereStr = where.join(' AND ');
    const students = _all(sqliteDb, \`
      SELECT s.*, 
             c.class_name AS classroom_name,
             g.grade_name_ar,
             ay.year_label AS academic_year
      FROM students s
      LEFT JOIN grades_lookup g   ON g.id   = s.grade_id
      LEFT JOIN academic_years ay ON ay.id  = s.academic_year_id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.academic_year_id = s.academic_year_id
      LEFT JOIN classes c ON c.id = ce.class_id
      WHERE \${whereStr}
      ORDER BY \${genderSortClause}
    \`, params);

    const school = _get(sqliteDb, 'SELECT school_name, governorate, directorate FROM institution_config LIMIT 1') || {};
    const classroom = classId ? _get(sqliteDb, 'SELECT class_name FROM classes WHERE id = ?', [classId]) : null;
    const year = academicYearId ? _get(sqliteDb, 'SELECT year_label FROM academic_years WHERE id = ?', [academicYearId]) : null;

    const classNameLabel = classroom?.class_name || (students[0] ? students[0].classroom_name : 'عام');
    const yearLabel = year?.year_label || (students[0] ? students[0].academic_year : '');

    const buffer = await excelReportEngine.generateFullClassListReport({
      classNameLabel,
      school,
      yearLabel,
      students
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', \`attachment; filename=full_class_list_\${encodeURIComponent(classNameLabel)}.xlsx\`);
    return res.send(buffer);
  } catch (err) {
    console.error('Failed to export full class list Excel:', err);
    return res.status(500).json({ success: false, error: 'فشل تصدير قائمة الفصل الكاملة.' });
  }
};
`;

// Insert exportFullClassListExcel before exportClassListExcel
const classListPos = content.indexOf('const exportClassListExcel = async (req, res) => {');
if (classListPos !== -1) {
  content = content.substring(0, classListPos) + fullClassListFunc + '\n' + content.substring(classListPos);
}

// 3. Update exportClassListExcel to delegate cleanly
const newClassListExcel = `const exportClassListExcel = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  if (req.query.mode === 'full' || req.query.type === 'full') {
    return exportFullClassListExcel(req, res);
  }

  try {
    const sqliteDb = db.getSQLiteDb();
    const { search, sectionId, stageId, gradeId, classId, status, academicYearId, genderOrder } = req.query;
    const where  = ['1=1'];
    const params = [];
    if (search) {
      where.push('(s.full_name_ar LIKE ? OR s.student_code LIKE ? OR s.national_id LIKE ?)');
      params.push(\`%\${search}%\`, \`%\${search}%\`, \`%\${search}%\`);
    }
    if (sectionId) { where.push('s.section_id = ?'); params.push(sectionId); }
    if (stageId)   { where.push('s.stage_id = ?');   params.push(stageId); }
    if (gradeId && gradeId !== 'all_stage' && gradeId !== 'all') {
      where.push('s.grade_id = ?');
      params.push(gradeId);
    }
    if (classId && classId !== 'all' && classId !== 'all_grade' && classId !== 'all_stage') {
      where.push('EXISTS (SELECT 1 FROM class_enrollments ce WHERE ce.student_id = s.id AND ce.class_id = ?)');
      params.push(classId);
    }
    if (status === 'all') {}
    else if (status) { where.push('s.status = ?'); params.push(status); }
    else { where.push("s.status != 'suspended'"); }
    if (academicYearId) { where.push('s.academic_year_id = ?'); params.push(academicYearId); }

    let genderSortClause = 's.full_name_ar ASC';
    if (genderOrder === 'boys_first') {
      genderSortClause = \`(CASE WHEN s.gender = 'ذكر' THEN 1 WHEN s.gender = 'أنثى' THEN 2 ELSE 3 END) ASC, s.full_name_ar ASC\`;
    } else if (genderOrder === 'girls_first') {
      genderSortClause = \`(CASE WHEN s.gender = 'أنثى' THEN 1 WHEN s.gender = 'ذكر' THEN 2 ELSE 3 END) ASC, s.full_name_ar ASC\`;
    }

    const whereStr = where.join(' AND ');
    const students = _all(sqliteDb, \`
      SELECT s.id, s.full_name_ar, s.status, s.gender,
             c.class_name AS classroom_name,
             g.grade_name_ar,
             ay.year_label AS academic_year
      FROM students s
      LEFT JOIN grades_lookup g   ON g.id   = s.grade_id
      LEFT JOIN academic_years ay ON ay.id  = s.academic_year_id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.academic_year_id = s.academic_year_id
      LEFT JOIN classes c ON c.id = ce.class_id
      WHERE \${whereStr}
      ORDER BY \${genderSortClause}
    \`, params);

    const school = _get(sqliteDb, 'SELECT school_name, governorate, directorate FROM institution_config LIMIT 1') || {};
    const classroom = classId ? _get(sqliteDb, 'SELECT class_name FROM classes WHERE id = ?', [classId]) : null;
    const year = academicYearId ? _get(sqliteDb, 'SELECT year_label FROM academic_years WHERE id = ?', [academicYearId]) : null;

    const className = classroom?.class_name || (students[0] ? students[0].classroom_name : '');
    const yearLabel = year?.year_label || (students[0] ? students[0].academic_year : '');

    let buffer;
    let filePrefix = 'primary_landscape';
    if (req.query.mode === 'primary_portrait') {
      buffer = await excelReportEngine.generatePrimaryPortraitSheet({ school, className, yearLabel, students });
      filePrefix = 'primary_portrait';
    } else {
      buffer = await excelReportEngine.generatePrimaryLandscapeSheet({ school, className, yearLabel, students });
    }

    const safeClassName = (className || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
    const arabicFileName = encodeURIComponent(\`كشف_فصل_\${(className || 'عام')}.xlsm\`);
    res.setHeader('Content-Type', 'application/vnd.ms-excel.sheet.macroEnabled.12');
    res.setHeader('Content-Disposition', \`attachment; filename="\${filePrefix}_\${safeClassName}.xlsm"; filename*=UTF-8''\${arabicFileName}\`);
    return res.send(buffer);
  } catch (err) {
    console.error('Failed to export class list Excel:', err);
    return res.status(500).json({ success: false, error: 'فشل تصدير كشف رصد الصفوف الأولي.' });
  }
};`;

// Replace exportClassListExcel body
const exportClassListStart = content.indexOf('const exportClassListExcel = async (req, res) => {');
const exportClassListEnd = content.indexOf('const injectXmlCellText = (sheetXml, cellRef, text) => {');

if (exportClassListStart !== -1 && exportClassListEnd !== -1) {
  content = content.substring(0, exportClassListStart) + newClassListExcel + '\n\n' + content.substring(exportClassListEnd);
}

// 4. Update exportExcelTemplate to use excelReportEngine
const newExportExcelTemplate = `const exportExcelTemplate = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const { search, sectionId, stageId, gradeId, classId, status, academicYearId, secondaryTrack, isMerged, isOrphan, isForeign, isTwin, genderOrder, templateName } = req.query;
    const where  = ['1=1'];
    const params = [];
    if (search) {
      where.push('(s.full_name_ar LIKE ? OR s.student_code LIKE ? OR s.national_id LIKE ?)');
      params.push(\`%\${search}%\`, \`%\${search}%\`, \`%\${search}%\`);
    }
    if (sectionId)     { where.push('s.section_id = ?');       params.push(sectionId); }
    if (stageId)       { where.push('s.stage_id = ?');         params.push(stageId); }
    if (gradeId && gradeId !== 'all_stage' && gradeId !== 'all') {
      where.push('s.grade_id = ?');
      params.push(gradeId);
    }
    if (classId && classId !== 'all' && classId !== 'all_grade' && classId !== 'all_stage') {
      where.push('EXISTS (SELECT 1 FROM class_enrollments ce WHERE ce.student_id = s.id AND ce.class_id = ?)');
      params.push(classId);
    }
    if (status === 'all') {}
    else if (status)  { where.push('s.status = ?');           params.push(status); }
    else              { where.push("s.status != 'suspended'"); }

    if (academicYearId) { where.push('s.academic_year_id = ?'); params.push(academicYearId); }
    if (secondaryTrack) { where.push('s.secondary_track = ?');  params.push(secondaryTrack); }

    if (isMerged === '1' || isMerged === 'true') where.push('(s.is_merged = 1 OR s.is_special_case = 1)');
    if (isOrphan === '1' || isOrphan === 'true') where.push('s.is_orphan = 1');
    if (isForeign === '1' || isForeign === 'true') where.push("(s.nationality_id IS NOT NULL AND s.nationality_id != '' AND s.nationality_id != 'EG')");
    if (isTwin === '1' || isTwin === 'true') where.push('(s.is_twin = 1 OR s.twin_student_id IS NOT NULL)');

    let genderSortClause = 's.full_name_ar ASC';
    if (genderOrder === 'boys_first') {
      genderSortClause = \`(CASE WHEN s.gender = 'ذكر' THEN 1 WHEN s.gender = 'أنثى' THEN 2 ELSE 3 END) ASC, s.full_name_ar ASC\`;
    } else if (genderOrder === 'girls_first') {
      genderSortClause = \`(CASE WHEN s.gender = 'أنثى' THEN 1 WHEN s.gender = 'ذكر' THEN 2 ELSE 3 END) ASC, s.full_name_ar ASC\`;
    }

    let orderClause = genderSortClause;
    if (!classId || classId === 'all' || classId === 'all_grade' || classId === 'all_stage') {
      if (!gradeId || gradeId === 'all_stage' || gradeId === 'all') {
        orderClause = \`st.stage_name ASC, g.grade_number ASC, COALESCE(c.class_name, '') ASC, \${genderSortClause}\`;
      } else {
        orderClause = \`COALESCE(c.class_name, '') ASC, \${genderSortClause}\`;
      }
    }

    const whereStr = where.join(' AND ');
    const students = _all(sqliteDb, \`
      SELECT s.*, 
             c.class_name AS classroom_name,
             g.grade_name_ar,
             ay.year_label AS academic_year,
             nl.name_ar AS nationality_name
      FROM students s
      LEFT JOIN grades_lookup g          ON g.id = s.grade_id
      LEFT JOIN stages_lookup st         ON st.id = s.stage_id
      LEFT JOIN academic_years ay        ON ay.id = s.academic_year_id
      LEFT JOIN nationalities_lookup nl  ON nl.id = s.nationality_id
      LEFT JOIN class_enrollments ce     ON ce.student_id = s.id AND ce.academic_year_id = s.academic_year_id
      LEFT JOIN classes c                ON c.id = ce.class_id
      WHERE \${whereStr}
      ORDER BY \${orderClause}
    \`, params);

    const school = _get(sqliteDb, 'SELECT school_name, governorate, directorate FROM institution_config LIMIT 1') || {};
    const grade = gradeId ? _get(sqliteDb, 'SELECT grade_name_ar FROM grades_lookup WHERE id = ?', [gradeId]) : null;
    const year = academicYearId ? _get(sqliteDb, 'SELECT year_label FROM academic_years WHERE id = ?', [academicYearId]) : null;

    const buffer = await excelReportEngine.generateStudentRegisterReport({
      templateName,
      school,
      gradeName: grade?.grade_name_ar || '',
      yearLabel: year?.year_label || '',
      totalStudents: students.length,
      isMerged,
      students,
      calculateAgeOnOct1st
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', \`attachment; filename=register_report.xlsx\`);
    return res.send(buffer);
  } catch (err) {
    console.error('Failed to export Excel register template:', err);
    return res.status(500).json({ success: false, error: 'فشل تصدير ملف الإكسيل الرئيسي.' });
  }
};`;

const templateStart = content.indexOf('const exportExcelTemplate = async (req, res) => {');
const templateEnd = content.indexOf('const exportFullClassListExcel = async (req, res) => {');

if (templateStart !== -1 && templateEnd !== -1) {
  content = content.substring(0, templateStart) + newExportExcelTemplate + '\n\n' + content.substring(templateEnd);
}

// 5. Ensure exportFullClassListExcel is exported in module.exports
if (!content.includes('exportFullClassListExcel,')) {
  content = content.replace('  exportClassListExcel,\n', '  exportClassListExcel,\n  exportFullClassListExcel,\n');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Controller and routes patched successfully!');
