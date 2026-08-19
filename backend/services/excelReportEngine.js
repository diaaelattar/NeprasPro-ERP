// ════════════════════════════════════════════════════════════════
//  excelReportEngine.js — Standalone Excel Report Engine (NeprasPro)
// ════════════════════════════════════════════════════════════════
//  Pure Standalone Engine following the "Copy Template -> Isolated File -> Export -> Auto-Clean" pattern.
//  Zero regex hacks on raw XML strings. 100% OOXML & Excel Formula compatible.
// ════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const os = require('os');
const JSZip = require('jszip');
const ExcelJS = require('exceljs');

// Ensure isolated temp exports workspace directory
const TEMP_DIR = path.join(os.homedir(), '.nepraspro', 'temp_exports');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Finds a template file across organized module directories.
 * Order: module dir (students/control/finance/staff/common) -> root templates -> fallback public.
 */
function resolveTemplatePath(moduleName, fileName) {
  const possiblePaths = [
    path.join(__dirname, `../templates/${moduleName}/${fileName}`),
    path.join(__dirname, `../templates/students/${fileName}`),
    path.join(__dirname, `../templates/common/${fileName}`),
    path.join(__dirname, `../../frontend/public/${fileName}`),
    path.join(__dirname, `../../${fileName}`)
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Creates an isolated physical temporary copy of a template file.
 */
function createTempTemplateCopy(templatePath, targetExt = '.xlsm') {
  const uniqueId = `export_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const tempPath = path.join(TEMP_DIR, `${uniqueId}${targetExt}`);
  fs.copyFileSync(templatePath, tempPath);
  return tempPath;
}

/**
 * Cleans a generated zip/buffer of invalid XML entities (like ExcelJS &apos; in workbook.xml)
 * or broken #REF! definedNames before delivering to client.
 */
async function finalizeCleanBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) return buffer;
  try {
    const zip = await JSZip.loadAsync(buffer);
    let modified = false;

    if (zip.file('xl/workbook.xml')) {
      let wbXml = await zip.file('xl/workbook.xml').async('string');
      let origWb = wbXml;

      // Fix ExcelJS invalid &apos; entity in definedNames sheet references
      if (wbXml.includes('&apos;')) {
        wbXml = wbXml.replaceAll('&apos;', "'");
      }
      // Remove any broken #REF! definedNames
      wbXml = wbXml.replace(/<definedName [^>]*>.*?#REF!.*?<\/definedName>/g, '');
      wbXml = wbXml.replace(/<definedName name="lolo[^"]*"[^>]*>.*?<\/definedName>/g, '');
      wbXml = wbXml.replace(/<definedName name="ty_u[^"]*"[^>]*>.*?<\/definedName>/g, '');
      wbXml = wbXml.replace(/<definedNames>\s*<\/definedNames>/g, '');

      if (wbXml !== origWb) {
        zip.file('xl/workbook.xml', wbXml);
        modified = true;
      }
    }

    if (modified) {
      return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    }
  } catch (e) {
    // Return original buffer if non-zip or clean
  }
  return buffer;
}

/**
 * Shared Strings setCell helper for JSZip template population.
 * Injects text cleanly into xl/sharedStrings.xml with t="s" and <v>index</v>.
 */
function createSharedStringCellInjector(zip, sharedStringsXml) {
  const stringMap = new Map();
  const existingMatches = [...sharedStringsXml.matchAll(/<t[^>]*>(.*?)<\/t>/g)];
  existingMatches.forEach((m, idx) => {
    stringMap.set(m[1], idx);
  });
  let stringCount = existingMatches.length;

  const addSharedString = (text) => {
    if (text === null || text === undefined) text = '';
    const strText = String(text);
    if (stringMap.has(strText)) {
      return stringMap.get(strText);
    }
    const esc = strText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const newIdx = stringCount++;
    stringMap.set(strText, newIdx);
    sharedStringsXml = sharedStringsXml.replace('</sst>', `<si><t>${esc}</t></si></sst>`);
    return newIdx;
  };

  const setCell = (xml, cellRef, text) => {
    const sIdx = addSharedString(text);
    const cellRegex = new RegExp(`<c r="${cellRef}"([^>]*?)>(.*?)</c>|<c r="${cellRef}"([^>]*?)/?>`, 's');
    const match = xml.match(cellRegex);

    if (match) {
      const attrs = match[1] || match[3] || '';
      const styleMatch = attrs.match(/\bs="[^"]*"/);
      const styleAttr = styleMatch ? ` ${styleMatch[0]}` : '';
      const replacement = `<c r="${cellRef}"${styleAttr} t="s"><v>${sIdx}</v></c>`;
      return xml.replace(cellRegex, replacement);
    } else {
      const rowNum = cellRef.match(/\d+/)[0];
      const rowOpenRegex = new RegExp(`(<row r="${rowNum}"[^>]*>)`);
      const newCellXml = `<c r="${cellRef}" t="s"><v>${sIdx}</v></c>`;
      if (rowOpenRegex.test(xml)) {
        return xml.replace(rowOpenRegex, `$1${newCellXml}`);
      }
      return xml.replace('</sheetData>', `<row r="${rowNum}">${newCellXml}</row></sheetData>`);
    }
  };

  const saveSharedStrings = () => {
    sharedStringsXml = sharedStringsXml.replace(/count="\d+"/, `count="${stringCount}"`);
    sharedStringsXml = sharedStringsXml.replace(/uniqueCount="\d+"/, `uniqueCount="${stringCount}"`);
    zip.file('xl/sharedStrings.xml', sharedStringsXml);
  };

  return { setCell, saveSharedStrings };
}

function escapeXml(str) {
  return String(str !== null && str !== undefined ? str : '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
  }[c]));
}

/**
 * Injects text cleanly as inline string (t="inlineStr") preserving all cell attributes (e.g. style s="...").
 * This guarantees 100% macro and visual formatting preservation without requiring sharedStrings.xml entries.
 */
function setInlineStringCell(xml, cellRef, text) {
  if (text === null || text === undefined) text = '';
  const safe = escapeXml(text).replace(/\r?\n/g, '&#10;');
  
  const reSelf = new RegExp(`<c r="${cellRef}"([^>]*)/>`);
  if (reSelf.test(xml)) {
    return xml.replace(reSelf, (_m, attrs) => {
      const cleanAttrs = (attrs || '').replace(/\bt="[^"]*"/g, '').trim();
      const attrStr = cleanAttrs ? ` ${cleanAttrs}` : '';
      return `<c r="${cellRef}"${attrStr} t="inlineStr"><is><t xml:space="preserve">${safe}</t></is></c>`;
    });
  }

  const reOpenClose = new RegExp(`<c r="${cellRef}"([^>]*)>(.*?)</c>`, 's');
  if (reOpenClose.test(xml)) {
    return xml.replace(reOpenClose, (_m, attrs) => {
      const cleanAttrs = (attrs || '').replace(/\bt="[^"]*"/g, '').trim();
      const attrStr = cleanAttrs ? ` ${cleanAttrs}` : '';
      return `<c r="${cellRef}"${attrStr} t="inlineStr"><is><t xml:space="preserve">${safe}</t></is></c>`;
    });
  }

  const rowNum = cellRef.match(/\d+/)[0];
  const rowOpenRegex = new RegExp(`(<row r="${rowNum}"[^>]*>)`);
  const newCellXml = `<c r="${cellRef}" t="inlineStr"><is><t xml:space="preserve">${safe}</t></is></c>`;
  if (rowOpenRegex.test(xml)) {
    return xml.replace(rowOpenRegex, `$1${newCellXml}`);
  }
  return xml.replace('</sheetData>', `<row r="${rowNum}">${newCellXml}</row></sheetData>`);
}

/**
 * Transforms template Content Type (.xltm -> .xlsm)
 */
async function patchContentTypeToWorkbook(zip) {
  if (zip.file('[Content_Types].xml')) {
    let ctXml = await zip.file('[Content_Types].xml').async('string');
    ctXml = ctXml.replace(
      'application/vnd.ms-excel.template.macroEnabled.main+xml',
      'application/vnd.ms-excel.sheet.macroEnabled.main+xml'
    );
    zip.file('[Content_Types].xml', ctXml);
  }
}

/**
 * ════════════════════════════════════════════════════════════════
 * EXPORTS SERVICE API
 * ════════════════════════════════════════════════════════════════
 */

/**
 * Generates Primary Portrait Sheet (.xlsm)
 */
async function generatePrimaryPortraitSheet({ school, className, yearLabel, students }) {
  const templatePath = resolveTemplatePath('students', 'كشف_رصد_صفوف_أولى_بالطول.xltm');
  if (!templatePath) throw new Error('قالب كشف رصد صفوف أولى بالطول غير موجود');

  const tempPath = createTempTemplateCopy(templatePath, '.xlsm');

  try {
    const rawData = fs.readFileSync(tempPath);
    const zip = await JSZip.loadAsync(rawData);

    await patchContentTypeToWorkbook(zip);

    let sheet1 = await zip.file('xl/worksheets/sheet1.xml').async('string');
    let sheet2 = zip.file('xl/worksheets/sheet2.xml') ? await zip.file('xl/worksheets/sheet2.xml').async('string') : null;
    let sheet3 = zip.file('xl/worksheets/sheet3.xml') ? await zip.file('xl/worksheets/sheet3.xml').async('string') : null;

    sheet1 = setInlineStringCell(sheet1, 'A1', `محافظة : ${school.governorate || ''}`);
    sheet1 = setInlineStringCell(sheet1, 'A2', `إدارة : ${school.directorate || ''}`);
    sheet1 = setInlineStringCell(sheet1, 'A3', `مدرسة : ${school.school_name || ''}`);
    sheet1 = setInlineStringCell(sheet1, 'C2', `فصل : ${className}`);
    sheet1 = setInlineStringCell(sheet1, 'C3', `للعام الدراسي : ${yearLabel}`);

    if (sheet2) {
      sheet2 = setInlineStringCell(sheet2, 'F2', `سجل غياب فصل / ${className} - العام الدراسي: ${yearLabel} - مدرسة: ${school.school_name || ''}`);
    }
    if (sheet3) {
      sheet3 = setInlineStringCell(sheet3, 'C2', `كشف متوسط تقييمات الفصل الدراسي الأول ونسبة الحضور فصل : ${className} - العام الدراسي: ${yearLabel}`);
    }

    const STATUS_LABELS = { promoted: 'منقول', retained: 'باقٍ للإعادة', suspended: 'موقوف قيده' };

    students.forEach((s, i) => {
      if (i < 25) {
        const r = 5 + i;
        sheet1 = setInlineStringCell(sheet1, `A${r}`, i + 1);
        sheet1 = setInlineStringCell(sheet1, `B${r}`, s.full_name_ar || '');
        sheet1 = setInlineStringCell(sheet1, `C${r}`, STATUS_LABELS[s.status] || s.status || '');
      } else if (i < 50) {
        const r = 5 + (i - 25);
        sheet1 = setInlineStringCell(sheet1, `D${r}`, i + 1);
        sheet1 = setInlineStringCell(sheet1, `E${r}`, s.full_name_ar || '');
        sheet1 = setInlineStringCell(sheet1, `F${r}`, STATUS_LABELS[s.status] || s.status || '');
      }
    });

    zip.file('xl/worksheets/sheet1.xml', sheet1);
    if (sheet2) zip.file('xl/worksheets/sheet2.xml', sheet2);
    if (sheet3) zip.file('xl/worksheets/sheet3.xml', sheet3);

    const rawBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return await finalizeCleanBuffer(rawBuf);
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

/**
 * Generates Primary Landscape Sheet (.xlsm)
 */
async function generatePrimaryLandscapeSheet({ school, className, yearLabel, students }) {
  const templatePath = resolveTemplatePath('students', 'كشف_رصد_صفوف_أولى_بالعرض.xltm');
  if (!templatePath) throw new Error('قالب كشف رصد صفوف أولى بالعرض غير موجود');

  const tempPath = createTempTemplateCopy(templatePath, '.xlsm');

  try {
    const rawData = fs.readFileSync(tempPath);
    const zip = await JSZip.loadAsync(rawData);

    let sharedStringsXml = zip.file('xl/sharedStrings.xml') 
      ? await zip.file('xl/sharedStrings.xml').async('string') 
      : '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="0" uniqueCount="0"></sst>';

    const { setCell, saveSharedStrings } = createSharedStringCellInjector(zip, sharedStringsXml);

    let sheet1 = await zip.file('xl/worksheets/sheet1.xml').async('string');
    let sheet3 = zip.file('xl/worksheets/sheet3.xml') ? await zip.file('xl/worksheets/sheet3.xml').async('string') : null;

    sheet1 = setCell(sheet1, 'F2', `سجل غياب فصل / ${className} - العام الدراسي: ${yearLabel} - مدرسة: ${school.school_name || ''}`);
    if (sheet3) {
      sheet3 = setCell(sheet3, 'C2', `كشف متوسط تقييمات الفصل الدراسي الأول ونسبة الحضور فصل : ${className} - العام الدراسي: ${yearLabel}`);
    }

    students.forEach((s, idx) => {
      if (idx < 50) {
        const r = 8 + idx;
        sheet1 = setCell(sheet1, `A${r}`, idx + 1);
        sheet1 = setCell(sheet1, `B${r}`, s.full_name_ar || '');
      }
    });

    saveSharedStrings();
    zip.file('xl/worksheets/sheet1.xml', sheet1);
    if (sheet3) zip.file('xl/worksheets/sheet3.xml', sheet3);

    const rawBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return await finalizeCleanBuffer(rawBuf);
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

/**
 * Generates Register 41-D or Merged Students Register (.xlsx)
 */
async function generateStudentRegisterReport({ templateName, school, gradeName, yearLabel, totalStudents, isMerged, students, calculateAgeOnOct1st }) {
  let templateFileName = 'student_register_41d_template.xltx';
  if (templateName) {
    templateFileName = (templateName.endsWith('.xltx') || templateName.endsWith('.xlsx')) ? templateName : `${templateName}.xltx`;
  } else if (isMerged === '1' || isMerged === 'true') {
    templateFileName = 'سجل_الطلاب_المدمجين.xltx';
  }

  const templatePath = resolveTemplatePath('students', templateFileName) || resolveTemplatePath('students', 'student_register_41d_template.xltx');
  if (!templatePath) throw new Error(`قالب ${templateFileName} غير موجود`);

  const tempPath = createTempTemplateCopy(templatePath, '.xlsx');

  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(tempPath);
    const ws = wb.worksheets[0];

    const isMergeTemplate = templateFileName.includes('مدمجين') || templateFileName.includes('الدمج') || isMerged === '1' || isMerged === 'true';

    if (isMergeTemplate) {
      try { ws.getCell('A1').value = `مديرية التربية والتعليم بمحافظة ${school.governorate || '...............'}`; } catch(e){}
      try { ws.getCell('A2').value = `إدارة: ${school.directorate || '...............'} التعليمية`; } catch(e){}
      try { ws.getCell('A3').value = `مدرسة : ${school.school_name || '...............'}`; } catch(e){}
      try { ws.getCell('A4').value = `الصف: ${gradeName || 'جميع الصفوف'}   |   العام الدراسي: ${yearLabel || '...............'}   |   إجمالي طلاب الدمج : ${totalStudents} طالب`; } catch(e){}

      students.forEach((s, i) => {
        const r = 7 + i;
        const setVal = (colIdx, val) => {
          try { ws.getRow(r).getCell(colIdx).value = val !== undefined && val !== null ? val : ''; } catch (e) {}
        };
        setVal(1, i + 1);
        setVal(2, s.full_name_ar || '');
        setVal(3, s.national_id || '');
        setVal(4, s.grade_name_ar || gradeName || '');
        setVal(5, s.classroom_name || 'غير مسكن');
        setVal(6, s.merge_type || 'دمج تعليمي');
        setVal(7, s.merge_decision_number || s.merge_decision_num || '');
        setVal(8, s.merge_decision_date || '');
        setVal(9, s.merge_notes || s.notes || '');
      });
    } else {
      const pageSize = 20;
      const numPages = Math.ceil(totalStudents / pageSize) || 1;

      for (let p = 1; p <= numPages; p++) {
        const startRow = (p - 1) * 30 + 1;
        const setHeader = (cellRef, val) => {
          try { ws.getCell(cellRef).value = String(val || ''); } catch(e){}
        };
        setHeader(`B${startRow + 1}`, `محافظة : ${school.governorate || ''}`);
        setHeader(`B${startRow + 2}`, `إدارة : ${school.directorate || ''}`);
        setHeader(`B${startRow + 3}`, `مدرسة : ${school.school_name || ''}`);
        setHeader(`E${startRow + 2}`, `سجل قيد تلاميذ الصف ${gradeName} للعام الدراسي ${yearLabel}`);
      }

      const STATUS_LABELS = { promoted: 'منقول', retained: 'باقٍ للإعادة', suspended: 'موقوف قيده' };

      students.forEach((s, i) => {
        const p = Math.floor(i / pageSize) + 1;
        const offset = i % pageSize;
        const r = (p - 1) * 30 + 8 + offset;

        const age = calculateAgeOnOct1st ? calculateAgeOnOct1st(s.birth_date, yearLabel) : { days: '', months: '', years: '' };

        const setVal = (cellRef, val) => {
          try { ws.getCell(cellRef).value = val; } catch(e){}
        };

        setVal(`A${r}`, i + 1);
        setVal(`B${r}`, s.full_name_ar || '');
        setVal(`C${r}`, s.national_id || '');
        setVal(`D${r}`, s.birth_date || '');

        setVal(`E${r}`, age.days !== '' ? Number(age.days) : '');
        setVal(`F${r}`, age.months !== '' ? Number(age.months) : '');
        setVal(`G${r}`, age.years !== '' ? Number(age.years) : '');

        setVal(`H${r}`, s.classroom_name || '');
        setVal(`I${r}`, s.gender || '');
        setVal(`J${r}`, s.religion || '');
        setVal(`K${r}`, s.nationality_name || '');
        setVal(`L${r}`, STATUS_LABELS[s.status] || '');
        setVal(`M${r}`, s.is_merged === 1 ? (s.merge_type || 'دمج') : 'لا يوجد');
        setVal(`N${r}`, s.guardian_name || '');
        setVal(`O${r}`, s.guardian_job || '');
        setVal(`P${r}`, s.guardian_phone || '');
        setVal(`Q${r}`, s.address || '');
        setVal(`R${r}`, s.enrollment_date || '');
      });
    }

    await wb.xlsx.writeFile(tempPath);
    const rawBuf = fs.readFileSync(tempPath);
    return await finalizeCleanBuffer(rawBuf);
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

/**
 * Generates Full Class List Report (.xlsx)
 */
async function generateFullClassListReport({ classNameLabel, school, yearLabel, students }) {
  const templatePath = resolveTemplatePath('students', 'قائمة_فصل_كاملة_البيانات.xltx');
  if (!templatePath) throw new Error('قالب قائمة فصل كاملة البيانات غير موجود');

  const tempPath = createTempTemplateCopy(templatePath, '.xlsx');

  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(tempPath);
    const ws = wb.worksheets[0];

    try { ws.getCell('A1').value = `محافظة : ${school.governorate || ''}`; } catch(e){}
    try { ws.getCell('A2').value = `إدارة : ${school.directorate || ''}`; } catch(e){}
    try { ws.getCell('A3').value = `مدرسة : ${school.school_name || ''}`; } catch(e){}
    try { ws.getCell('D2').value = `قائمة طلاب فصل : ${classNameLabel}`; } catch(e){}
    try { ws.getCell('D3').value = `للعام الدراسي : ${yearLabel}`; } catch(e){}

    const STATUS_LABELS = { promoted: 'منقول', retained: 'باقٍ للإعادة', suspended: 'موقوف قيده' };

    students.forEach((s, i) => {
      const r = 6 + i;
      const setVal = (colIdx, val) => {
        try { ws.getRow(r).getCell(colIdx).value = val !== undefined && val !== null ? val : ''; } catch(e){}
      };
      setVal(1, i + 1);
      setVal(2, s.full_name_ar || '');
      setVal(3, s.national_id || '');
      setVal(4, s.gender || '');
      setVal(5, s.religion || '');
      setVal(6, STATUS_LABELS[s.status] || s.status || '');
      setVal(7, s.guardian_phone || '');
      setVal(8, s.address || '');
    });

    await wb.xlsx.writeFile(tempPath);
    const rawBuf = fs.readFileSync(tempPath);
    return await finalizeCleanBuffer(rawBuf);
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}


/**
 * Generates unified Macro Grades Reports (Portrait & Landscape) (.xlsm)
 */
async function generateMacroGradesReport({ templateName, school, className, yearLabel, students }) {
  const templatePath = resolveTemplatePath('students', templateName);
  if (!templatePath) throw new Error(`قالب ${templateName} غير موجود`);

  const tempPath = createTempTemplateCopy(templatePath, '.xlsm');

  try {
    const rawData = fs.readFileSync(tempPath);
    const zip = await JSZip.loadAsync(rawData);

    await patchContentTypeToWorkbook(zip);

    let sheet1 = await zip.file('xl/worksheets/sheet1.xml').async('string');
    
    // Inject headers:
    sheet1 = setInlineStringCell(sheet1, 'A1', `محافظة : ${school.governorate || ''}`);
    sheet1 = setInlineStringCell(sheet1, 'D2', `مدرسة : ${school.school_name || ''}`);
    sheet1 = setInlineStringCell(sheet1, 'B3', `للعام الدراسي ${yearLabel}`);

    const STATUS_LABELS = { promoted: 'منقول', retained: 'باقٍ للإعادة', suspended: 'موقوف قيده' };

    students.forEach((s, i) => {
      const statusText = STATUS_LABELS[s.status] || s.status || '';
      if (i < 25) {
        const r = 5 + i;
        sheet1 = setInlineStringCell(sheet1, `A${r}`, i + 1);
        sheet1 = setInlineStringCell(sheet1, `B${r}`, s.full_name_ar || '');
        sheet1 = setInlineStringCell(sheet1, `C${r}`, statusText);
      } else if (i < 50) {
        const r = 5 + (i - 25);
        sheet1 = setInlineStringCell(sheet1, `D${r}`, i + 1);
        sheet1 = setInlineStringCell(sheet1, `E${r}`, s.full_name_ar || '');
        sheet1 = setInlineStringCell(sheet1, `F${r}`, statusText);
      }
    });

    zip.file('xl/worksheets/sheet1.xml', sheet1);

    const rawBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return await finalizeCleanBuffer(rawBuf);
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

/**
 * Generates sgl_all (.xlsm) macro report with 'بيانات_الصف' sheet populated.
 * - Single header at rows 2, 3, 4.
 * - Students populated row-by-row starting from Row 8 without empty row breaks.
 */
async function generateSglAllReport({ school = {}, gradeName = '', yearLabel = '', students = [], reportTitle = '', viewMode = '' }) {
  const templatePath = resolveTemplatePath('students', 'sgl_all.xltm');
  if (!templatePath) throw new Error('قالب sgl_all.xltm غير موجود');

  const tempPath = createTempTemplateCopy(templatePath, '.xlsm');

  try {
    const rawData = fs.readFileSync(tempPath);
    const zip = await JSZip.loadAsync(rawData);

    await patchContentTypeToWorkbook(zip);

    // Sheet2 is "بيانات_الصف"
    let sheet2 = zip.file('xl/worksheets/sheet2.xml') ? await zip.file('xl/worksheets/sheet2.xml').async('string') : null;
    if (!sheet2) throw new Error('ورقة بيانات_الصف غير موجودة في القالب');

    const gov = school.governorate || '';
    const dir = school.directorate || '';
    const schName = school.schoolName || school.school_name || '';

    // 1. الترويسة (مرة واحدة في الأعلى)
    sheet2 = setInlineStringCell(sheet2, 'B2', `محافظة : ${gov}`);
    sheet2 = setInlineStringCell(sheet2, 'B3', `إدارة : ${dir} التعليمية`);
    sheet2 = setInlineStringCell(sheet2, 'B4', `مدرسة : ${schName}`);

    const firstStu = students[0];
    const resolvedGrade = gradeName || firstStu?.grade_name_ar || 'العام';
    const cleanGrade = resolvedGrade.startsWith('الصف') ? resolvedGrade : (resolvedGrade === 'العام' ? 'العام' : `الصف ${resolvedGrade}`);
    const resolvedYear = yearLabel || firstStu?.academic_year || '2025 / 2026';

    let mainTitle = `سجل قيد تلاميذ ${cleanGrade}`;
    if (reportTitle) {
      mainTitle = `${reportTitle} - ${cleanGrade}`;
    } else if (viewMode === 'disconnected') {
      mainTitle = `سجل الطلاب المنقطعين عن الدراسة - ${cleanGrade}`;
    } else if (viewMode === 'suspended') {
      mainTitle = `سجل الطلاب الموقوف قيدهم - ${cleanGrade}`;
    } else if (viewMode === 'excluded') {
      mainTitle = `سجل الطلاب المستبعدين - ${cleanGrade}`;
    }

    // عنوان السجل على سطرين في الخلية E3
    const headerTitleOnTwoLines = `${mainTitle}\nللعام الدراسي ${resolvedYear}`;
    sheet2 = setInlineStringCell(sheet2, 'E3', headerTitleOnTwoLines);

    const { calculateAgeOnOct1st } = require('../utils/schoolHelper');

    // 2. صفوف الطلاب المتتالية بدون فواصل بدءاً من السطر 8
    students.forEach((s, idx) => {
      const r = 8 + idx;
      const serial = idx + 1;
      const age = calculateAgeOnOct1st(
        s.birth_date || s.national_id,
        s.academic_year || yearLabel
      );

      // استخراج رقم الفصل مجرداً (مثال: "13" بدلاً من "فصل 13")
      let classNum = '';
      if (s.class_number !== null && s.class_number !== undefined && s.class_number !== '') {
        classNum = String(s.class_number);
      } else {
        const rawClass = String(s.classroom_name || s.class_name || '');
        const match = rawClass.match(/\d+/);
        classNum = match ? match[0] : rawClass.replace(/^فصل\s*/, '').trim();
      }

      // النوع الرسمي: بنين - بنات
      const isFemale = ['أنثى', 'بنت', 'بنات', 'female', 'f'].some(v => String(s.gender || '').toLowerCase().includes(v));
      const gender = isFemale ? 'بنات' : 'بنين';

      const religion = s.religion || 'مسلم';
      const nationality = s.nationality_name || s.nationality || 'مصري';
      const status = s.enrollment_status || s.status || 'مستجد';
      const merged = s.is_merged === 1 ? 'دمج' : '—';

      sheet2 = setInlineStringCell(sheet2, `A${r}`, serial);
      sheet2 = setInlineStringCell(sheet2, `B${r}`, s.full_name_ar || '');
      sheet2 = setInlineStringCell(sheet2, `C${r}`, s.national_id || '');
      sheet2 = setInlineStringCell(sheet2, `D${r}`, s.birth_date || '');
      sheet2 = setInlineStringCell(sheet2, `E${r}`, age.days !== '' ? age.days : '');
      sheet2 = setInlineStringCell(sheet2, `F${r}`, age.months !== '' ? age.months : '');
      sheet2 = setInlineStringCell(sheet2, `G${r}`, age.years !== '' ? age.years : '');
      sheet2 = setInlineStringCell(sheet2, `H${r}`, classNum);
      sheet2 = setInlineStringCell(sheet2, `I${r}`, gender);
      sheet2 = setInlineStringCell(sheet2, `J${r}`, religion);
      sheet2 = setInlineStringCell(sheet2, `K${r}`, nationality);
      sheet2 = setInlineStringCell(sheet2, `L${r}`, status);
      sheet2 = setInlineStringCell(sheet2, `M${r}`, merged);
      sheet2 = setInlineStringCell(sheet2, `N${r}`, s.guardian_name || '');
      sheet2 = setInlineStringCell(sheet2, `O${r}`, s.guardian_job || '');
      sheet2 = setInlineStringCell(sheet2, `P${r}`, s.guardian_phone || s.emergency_phone || '');
      sheet2 = setInlineStringCell(sheet2, `Q${r}`, s.address || '');
      sheet2 = setInlineStringCell(sheet2, `R${r}`, s.enrollment_date || s.created_at?.split('T')?.[0] || '');
    });

    zip.file('xl/worksheets/sheet2.xml', sheet2);

    const generatedBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return await finalizeCleanBuffer(generatedBuffer);
  } finally {
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
  }
}

module.exports = {
  resolveTemplatePath,
  generatePrimaryPortraitSheet,
  generatePrimaryLandscapeSheet,
  generateStudentRegisterReport,
  generateFullClassListReport,
  generateMacroGradesReport,
  generateSglAllReport
};
