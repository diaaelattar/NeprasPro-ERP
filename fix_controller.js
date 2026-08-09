const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'backend/modules/students/students.controller.js');
let code = fs.readFileSync(targetFile, 'utf8');

const startMarker = 'const exportFullClassListExcel = async (req, res) => {';
const endMarker = '// ─── GET /api/students/import/template';

const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found!', { startIdx, endIdx });
  process.exit(1);
}

const replacementCode = `const exportFullClassListExcel = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const excelReportEngine = require('../../services/excelReportEngine');
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
      where.push('s.grade_id = ?'); params.push(gradeId);
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

const exportClassListExcel = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const JSZip = require('jszip');
    const excelReportEngine = require('../../services/excelReportEngine');
    const pdfReportEngine = require('../../services/pdfReportEngine');
    const sqliteDb = db.getSQLiteDb();
    
    // Parse query params
    const { search, sectionId, stageId, gradeId, classId, status, academicYearId, secondaryTrack, mode, includePdf } = req.query;

    const school = _get(sqliteDb, 'SELECT school_name, governorate, directorate FROM institution_config LIMIT 1') || {};
    const yearObj = academicYearId ? _get(sqliteDb, 'SELECT year_label FROM academic_years WHERE id = ?', [academicYearId]) : null;
    const yearLabel = yearObj?.year_label || '';

    // If batch mode is requested or classId === 'all', query all classes
    let targetClasses = [];
    if (classId && classId !== 'all') {
      const cls = _get(sqliteDb, 'SELECT id, class_name FROM classes WHERE id = ?', [classId]);
      if (cls) targetClasses.push(cls);
      else targetClasses.push({ id: classId, class_name: 'فصل' });
    } else {
      // Find classes matching gradeId or stageId
      let clsQuery = 'SELECT id, class_name FROM classes WHERE 1=1';
      const clsParams = [];
      if (gradeId) { clsQuery += ' AND grade_id = ?'; clsParams.push(gradeId); }
      clsQuery += ' ORDER BY class_name ASC';
      targetClasses = _all(sqliteDb, clsQuery, clsParams);
      if (targetClasses.length === 0) {
        targetClasses.push({ id: null, class_name: 'جميع_الطلاب' });
      }
    }

    const isZipResult = (targetClasses.length > 1) || (includePdf === 'true' || includePdf === '1');
    const zip = isZipResult ? new JSZip() : null;

    let singleBuffer = null;
    let singleFileName = '';

    for (const cls of targetClasses) {
      const where = ['1=1'];
      const params = [];
      if (search) {
        where.push('(s.full_name_ar LIKE ? OR s.student_code LIKE ? OR s.national_id LIKE ?)');
        params.push(\`%\${search}%\`, \`%\${search}%\`, \`%\${search}%\`);
      }
      if (sectionId) { where.push('s.section_id = ?'); params.push(sectionId); }
      if (stageId)   { where.push('s.stage_id = ?');   params.push(stageId); }
      if (gradeId)   { where.push('s.grade_id = ?');   params.push(gradeId); }
      if (cls.id) {
        where.push('EXISTS (SELECT 1 FROM class_enrollments ce WHERE ce.student_id = s.id AND ce.class_id = ?)');
        params.push(cls.id);
      }
      if (status === 'all') {
        // All
      } else if (status) {
        where.push('s.status = ?'); params.push(status);
      } else {
        where.push("s.status != 'suspended'");
      }
      if (academicYearId) { where.push('s.academic_year_id = ?'); params.push(academicYearId); }
      if (secondaryTrack) { where.push('s.secondary_track = ?');  params.push(secondaryTrack); }

      const students = _all(sqliteDb, \`
        SELECT s.*, n.name AS nationality_name, c.class_name AS classroom_name
        FROM students s
        LEFT JOIN nationalities n ON n.id = s.nationality_id
        LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.academic_year_id = s.academic_year_id
        LEFT JOIN classes c ON c.id = ce.class_id
        WHERE \${where.join(' AND ')}
        ORDER BY s.full_name_ar ASC
      \`, params);

      const className = cls.class_name || 'فصل';

      if (mode === 'primary_portrait') {
        const xlsmBuf = await excelReportEngine.generatePrimaryPortraitSheet({ school, className, yearLabel, students });
        const xlsmName = \`كشف_رصد_صفوف_أولى_بالطول_\${className}.xlsm\`;

        if (zip) {
          zip.file(xlsmName, xlsmBuf);
          if (includePdf === 'true' || includePdf === '1') {
            try {
              const pdfBuf = await pdfReportEngine.generatePrimaryPortraitPdf({ school, className, yearLabel, students });
              zip.file(\`كشف_رصد_صفوف_أولى_بالطول_\${className}.pdf\`, pdfBuf);
            } catch (pdfErr) {
              console.error('[PDF Error]', pdfErr);
            }
          }
        } else {
          singleBuffer = xlsmBuf;
          singleFileName = xlsmName;
        }
      } else if (mode === 'primary_landscape') {
        const xlsmBuf = await excelReportEngine.generatePrimaryLandscapeSheet({ school, className, yearLabel, students });
        const xlsmName = \`كشف_رصد_صفوف_أولى_بالعرض_\${className}.xlsm\`;

        if (zip) {
          zip.file(xlsmName, xlsmBuf);
        } else {
          singleBuffer = xlsmBuf;
          singleFileName = xlsmName;
        }
      } else if (mode === 'full_class_list') {
        const xlsxBuf = await excelReportEngine.generateFullClassListReport({ classNameLabel: className, school, yearLabel, students });
        const xlsxName = \`قائمة_فصل_كاملة_البيانات_\${className}.xlsx\`;
        if (zip) zip.file(xlsxName, xlsxBuf);
        else { singleBuffer = xlsxBuf; singleFileName = xlsxName; }
      } else {
        // Fallback: standard primary portrait
        const xlsmBuf = await excelReportEngine.generatePrimaryPortraitSheet({ school, className, yearLabel, students });
        const xlsmName = \`كشف_رصد_\${className}.xlsm\`;
        if (zip) zip.file(xlsxName, xlsmBuf);
        else { singleBuffer = xlsmBuf; singleFileName = xlsmName; }
      }
    }

    if (zip) {
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename=nepras_reports_batch.zip');
      return res.send(zipBuffer);
    } else {
      res.setHeader('Content-Type', singleFileName.endsWith('.xlsm') ? 'application/vnd.ms-excel.sheet.macroEnabled.12' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', \`attachment; filename="\${encodeURIComponent(singleFileName)}"\`);
      return res.send(singleBuffer);
    }
  } catch (err) {
    console.error('Failed to export class list:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};\n\n`;

code = code.substring(0, startIdx) + replacementCode + code.substring(endIdx);
fs.writeFileSync(targetFile, code, 'utf8');
console.log('✅ Controller patched cleanly!');
