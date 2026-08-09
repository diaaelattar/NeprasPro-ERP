const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, '../backend/modules/students/students.controller.js');
let code = fs.readFileSync(controllerPath, 'utf8');

// Replace primary_landscape section with clean formula-preserving implementation
const cleanLandscapeCode = `  if (req.query.mode === 'primary_landscape') {
    const fs = require('fs');
    const path = require('path');
    const JSZip = require('jszip');
    const sqliteDb = db.getSQLiteDb();

    const publicDir = path.join(__dirname, '../../../frontend/public');
    let templatePath = '';
    if (fs.existsSync(publicDir)) {
      const files = fs.readdirSync(publicDir);
      const target = files.find(f => f.includes('بالعرض') && (f.endsWith('.xltm') || f.endsWith('.xlsm') || f.endsWith('.xlsx')));
      if (target) templatePath = path.join(publicDir, target);
    }
    if (!templatePath) {
      templatePath = path.join(publicDir, 'كشف_رصد_صفوف_أولى_بالعرض.xltm');
    }

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
    if (status === 'all') {
    } else if (status) {
      where.push('s.status = ?');
      params.push(status);
    } else {
      where.push("s.status != 'suspended'");
    }
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

    const zip = await JSZip.loadAsync(fs.readFileSync(templatePath));

    // Smart setCell preserving existing cell formatting/style (s="..." attribute)
    const setCell = (xml, cellRef, text) => {
      if (text === null || text === undefined) text = '';
      const esc = String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      const cellRegex = new RegExp(\`<c r="\${cellRef}"([^>]*?)>(.*?)</c>|<c r="\${cellRef}"([^>]*?)/?>\`, 's');
      const match = xml.match(cellRegex);

      if (match) {
        const attrs = match[1] || match[3] || '';
        const styleMatch = attrs.match(/\\\\bs="[^"]*"/);
        const styleAttr = styleMatch ? \` \${styleMatch[0]}\` : '';
        const replacement = \`<c r="\${cellRef}"\${styleAttr} t="inlineStr"><is><t>\${esc}</t></is></c>\`;
        return xml.replace(cellRegex, replacement);
      } else {
        const rowNum = cellRef.match(/\\\\d+/)[0];
        const rowOpenRegex = new RegExp(\`(<row r="\${rowNum}"[^>]*>)\`);
        const newCellXml = \`<c r="\${cellRef}" t="inlineStr"><is><t>\${esc}</t></is></c>\`;
        if (rowOpenRegex.test(xml)) {
          return xml.replace(rowOpenRegex, \`\$1\${newCellXml}\`);
        }
        return xml.replace('</sheetData>', \`<row r="\${rowNum}">\${newCellXml}</row></sheetData>\`);
      }
    };

    let sheet1 = await zip.file('xl/worksheets/sheet1.xml').async('string');
    let sheet2 = zip.file('xl/worksheets/sheet2.xml') ? await zip.file('xl/worksheets/sheet2.xml').async('string') : null;
    let sheet3 = zip.file('xl/worksheets/sheet3.xml') ? await zip.file('xl/worksheets/sheet3.xml').async('string') : null;

    sheet1 = setCell(sheet1, 'F2', \`سجل غياب فصل / \${className} - العام الدراسي: \${yearLabel} - مدرسة: \${school.school_name || ''}\`);
    if (sheet3) {
      sheet3 = setCell(sheet3, 'C2', \`كشف متوسط تقييمات الفصل الدراسي الأول ونسبة الحضور فصل : \${className} - العام الدراسي: \${yearLabel}\`);
    }

    // Fill sheet 1 ONLY — sheet 2 & 3 have native Excel formulas linked to sheet 1
    students.forEach((s, idx) => {
      if (idx < 50) {
        const r = 8 + idx;
        sheet1 = setCell(sheet1, \`A\${r}\`, idx + 1);
        sheet1 = setCell(sheet1, \`B\${r}\`, s.full_name_ar || '');
      }
    });

    zip.file('xl/worksheets/sheet1.xml', sheet1);
    if (sheet3) zip.file('xl/worksheets/sheet3.xml', sheet3);

    zip.remove('xl/calcChain.xml');

    let contentTypesStr = await zip.file('[Content_Types].xml').async('string');
    contentTypesStr = contentTypesStr.replace(
      'application/vnd.ms-excel.template.macroEnabled.main+xml',
      'application/vnd.ms-excel.sheet.macroEnabled.main+xml'
    );
    contentTypesStr = contentTypesStr.replace(/<Override PartName="\/xl\/calcChain\.xml"[^>]*\/>/g, '');
    zip.file('[Content_Types].xml', contentTypesStr);

    const finalBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    const safeClassName = (className || 'general').replace(/[\\\\u0600-\\\\u06FF\\\\s\\\\/\\\\\\\\:*?"<>|]/g, '_');
    const arabicFileName = encodeURIComponent(\`كشف_رصد_صفوف_أولى_بالعرض_فصل_\${(className || 'عام').replace(/[\\\\/\\\\\\\\:*?"<>|]/g, '_')}.xlsm\`);
    res.setHeader('Content-Type', 'application/vnd.ms-excel.sheet.macroEnabled.12');
    res.setHeader('Content-Disposition', \`attachment; filename="primary_landscape_\${safeClassName}.xlsm"; filename*=UTF-8''\${arabicFileName}\`);
    return res.send(finalBuffer);
  }`;

// Replace primary_portrait section with clean formula-preserving implementation
const cleanPortraitCode = `  if (req.query.mode === 'primary_portrait') {
    const fs = require('fs');
    const path = require('path');
    const JSZip = require('jszip');
    const sqliteDb = db.getSQLiteDb();
    
    const publicDir = path.join(__dirname, '../../../frontend/public');
    let templatePath = '';
    if (fs.existsSync(publicDir)) {
      const files = fs.readdirSync(publicDir);
      const target = files.find(f => f.includes('بالطول') && (f.endsWith('.xltm') || f.endsWith('.xlsm') || f.endsWith('.xlsx')));
      if (target) templatePath = path.join(publicDir, target);
    }
    if (!templatePath) {
      templatePath = path.join(publicDir, 'كشف_رصد_صفوف_أولى_بالطول.xltm');
    }

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
    if (status === 'all') {
    } else if (status) {
      where.push('s.status = ?');
      params.push(status);
    } else {
      where.push("s.status != 'suspended'");
    }
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

    const zip = await JSZip.loadAsync(fs.readFileSync(templatePath));

    // Smart setCell preserving existing cell formatting/style (s="..." attribute)
    const setCell = (xml, cellRef, text) => {
      if (text === null || text === undefined) text = '';
      const esc = String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      const cellRegex = new RegExp(\`<c r="\${cellRef}"([^>]*?)>(.*?)</c>|<c r="\${cellRef}"([^>]*?)/?>\`, 's');
      const match = xml.match(cellRegex);

      if (match) {
        const attrs = match[1] || match[3] || '';
        const styleMatch = attrs.match(/\\\\bs="[^"]*"/);
        const styleAttr = styleMatch ? \` \${styleMatch[0]}\` : '';
        const replacement = \`<c r="\${cellRef}"\${styleAttr} t="inlineStr"><is><t>\${esc}</t></is></c>\`;
        return xml.replace(cellRegex, replacement);
      } else {
        const rowNum = cellRef.match(/\\\\d+/)[0];
        const rowOpenRegex = new RegExp(\`(<row r="\${rowNum}"[^>]*>)\`);
        const newCellXml = \`<c r="\${cellRef}" t="inlineStr"><is><t>\${esc}</t></is></c>\`;
        if (rowOpenRegex.test(xml)) {
          return xml.replace(rowOpenRegex, \`\$1\${newCellXml}\`);
        }
        return xml.replace('</sheetData>', \`<row r="\${rowNum}">\${newCellXml}</row></sheetData>\`);
      }
    };

    let sheet1 = await zip.file('xl/worksheets/sheet1.xml').async('string');
    let sheet2 = zip.file('xl/worksheets/sheet2.xml') ? await zip.file('xl/worksheets/sheet2.xml').async('string') : null;
    let sheet3 = zip.file('xl/worksheets/sheet3.xml') ? await zip.file('xl/worksheets/sheet3.xml').async('string') : null;

    sheet1 = setCell(sheet1, 'A1', \`محافظة : \${school.governorate || ''}\`);
    sheet1 = setCell(sheet1, 'A2', \`إدارة : \${school.directorate || ''}\`);
    sheet1 = setCell(sheet1, 'A3', \`مدرسة : \${school.school_name || ''}\`);
    sheet1 = setCell(sheet1, 'C2', \`فصل : \${className}\`);
    sheet1 = setCell(sheet1, 'C3', \`للعام الدراسي : \${yearLabel}\`);

    if (sheet2) {
      sheet2 = setCell(sheet2, 'F2', \`سجل غياب فصل / \${className} - العام الدراسي: \${yearLabel} - مدرسة: \${school.school_name || ''}\`);
    }
    if (sheet3) {
      sheet3 = setCell(sheet3, 'C2', \`كشف متوسط تقييمات الفصل الدراسي الأول ونسبة الحضور فصل : \${className} - العام الدراسي: \${yearLabel}\`);
    }

    const STATUS_LABELS = {
      promoted: 'منقول',
      retained: 'باقٍ للإعادة',
      suspended: 'موقوف قيده'
    };

    // Fill sheet 1 ONLY — sheet 2 & 3 have native Excel formulas linked to sheet 1
    students.forEach((s, i) => {
      if (i < 25) {
        const r = 5 + i;
        sheet1 = setCell(sheet1, \`A\${r}\`, i + 1);
        sheet1 = setCell(sheet1, \`B\${r}\`, s.full_name_ar || '');
        sheet1 = setCell(sheet1, \`C\${r}\`, STATUS_LABELS[s.status] || s.status || '');
      } else if (i < 50) {
        const r = 5 + (i - 25);
        sheet1 = setCell(sheet1, \`D\${r}\`, i + 1);
        sheet1 = setCell(sheet1, \`E\${r}\`, s.full_name_ar || '');
        sheet1 = setCell(sheet1, \`F\${r}\`, STATUS_LABELS[s.status] || s.status || '');
      }
    });

    zip.file('xl/worksheets/sheet1.xml', sheet1);
    if (sheet2) zip.file('xl/worksheets/sheet2.xml', sheet2);
    if (sheet3) zip.file('xl/worksheets/sheet3.xml', sheet3);

    zip.remove('xl/calcChain.xml');

    let contentTypesStr = await zip.file('[Content_Types].xml').async('string');
    contentTypesStr = contentTypesStr.replace(
      'application/vnd.ms-excel.template.macroEnabled.main+xml',
      'application/vnd.ms-excel.sheet.macroEnabled.main+xml'
    );
    contentTypesStr = contentTypesStr.replace(/<Override PartName="\/xl\/calcChain\.xml"[^>]*\/>/g, '');
    zip.file('[Content_Types].xml', contentTypesStr);

    const finalBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    const safeClassName = (className || 'general').replace(/[\\\\u0600-\\\\u06FF\\\\s\\\\/\\\\\\\\:*?"<>|]/g, '_');
    const arabicFileName = encodeURIComponent(\`كشف_رصد_صفوف_أولى_بالطول_فصل_\${(className || 'عام').replace(/[\\\\/\\\\\\\\:*?"<>|]/g, '_')}.xlsm\`);
    res.setHeader('Content-Type', 'application/vnd.ms-excel.sheet.macroEnabled.12');
    res.setHeader('Content-Disposition', \`attachment; filename="primary_portrait_\${safeClassName}.xlsm"; filename*=UTF-8''\${arabicFileName}\`);
    return res.send(finalBuffer);
  }`;

// Apply landscape replacement
const landscapeStart = code.indexOf("if (req.query.mode === 'primary_landscape') {");
const portraitStart  = code.indexOf("if (req.query.mode === 'primary_portrait') {");
const excelJsStart    = code.indexOf("try {\n    const ExcelJS = require('exceljs');");

if (landscapeStart !== -1 && portraitStart !== -1 && excelJsStart !== -1) {
  const before = code.substring(0, landscapeStart);
  const after  = code.substring(excelJsStart);
  code = before + cleanLandscapeCode + "\n\n  " + cleanPortraitCode + "\n\n  " + after;
  fs.writeFileSync(controllerPath, code, 'utf8');
  console.log('✅ Successfully patched students.controller.js with native formula & style preservation!');
} else {
  console.error('ERROR: Could not locate block positions in controller code!');
}
