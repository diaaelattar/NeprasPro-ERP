/**
 * control.reports.controller.js — Control Module Reports Execution Engine
 * NeprasPro - Independent Control Reports Controller
 */

const ExcelJS = require('exceljs');
const db = require('../../../config/db');
const { getSchoolMasterInfo } = require('../../../utils/schoolHelper');
const { CONTROL_REPORTS_REGISTRY } = require('./control.reports.registry');

// SQLite helpers
const _all = (sqliteDb, sql, params = []) => {
  const stmt = sqliteDb.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
};

const _get = (sqliteDb, sql, params = []) => {
  const rows = _all(sqliteDb, sql, params);
  return rows.length > 0 ? rows[0] : null;
};

// ─── 1. List Available Control Reports ─────────────────────────────────────
const listControlReports = async (req, res) => {
  try {
    const reportsList = Object.values(CONTROL_REPORTS_REGISTRY).map(r => ({
      id: r.id,
      title: r.title,
      category: r.category,
      description: r.description,
      requiresPin: r.requiresPin,
      exportFormats: r.exportFormats,
      orientation: r.orientation,
      pageSize: r.pageSize
    }));
    return res.json({ success: true, reports: reportsList });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── 2. Fetch Control Report JSON Data ──────────────────────────────────────
const getControlReportData = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { reportId } = req.params;
  const { gradeId, term, classId } = req.query;

  const reportMeta = CONTROL_REPORTS_REGISTRY[reportId];
  if (!reportMeta) return res.status(404).json({ success: false, error: 'التقرير المطلوب غير موجود.' });

  try {
    const sqliteDb = db.getSQLiteDb();
    const gId = parseInt(gradeId) || 1;
    const tVal = parseInt(term) || 1;

    // Fetch Grade info
    const grade = _get(sqliteDb, "SELECT id, grade_name_ar FROM grades_lookup WHERE id = ?", [gId]);

    // Fetch Exam Subjects for this grade
    const subjects = _all(sqliteDb, `
      SELECT id, subject_name_ar, subject_code, subject_category,
             term1_work_mark, term1_practical_mark, term1_exam_mark, term1_max_mark,
             term2_work_mark, term2_practical_mark, term2_exam_mark, term2_max_mark,
             year_max_mark, pass_mark, subject_pass_percent, is_added_to_total, is_activity_subject, sort_order
      FROM exam_subjects 
      WHERE grade_id = ?
      ORDER BY sort_order ASC, id ASC
    `, [gId]);

    // Fetch Control Students
    let classFilter = '';
    const params = [gId];
    if (classId && classId !== 'all') {
      classFilter = 'AND cl.id = ?';
      params.push(parseInt(classId));
    }

    const students = _all(sqliteDb, `
      SELECT 
        cs.id AS control_student_id,
        cs.student_id,
        cs.seat_number,
        cs.secret_code_term1,
        cs.secret_group_term1,
        cs.secret_code_term2,
        cs.secret_group_term2,
        cc.committee_name,
        cs.inclusion_status,
        s.full_name_ar,
        s.national_id,
        s.gender,
        s.second_language,
        cl.class_name AS class_name_ar
      FROM control_students cs
      JOIN students s ON s.id = cs.student_id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND (ce.academic_year_id = s.academic_year_id OR ce.academic_year_id IS NULL)
      LEFT JOIN classes cl ON cl.id = ce.class_id AND (cl.grade_id = cs.grade_id OR cl.grade_id = s.grade_id)
      LEFT JOIN control_committees cc ON cc.id = cs.committee_id
      WHERE cs.grade_id = ? ${classFilter}
      ORDER BY cs.seat_number ASC, s.full_name_ar ASC
    `, params);

    // Fetch Control Marks
    const marks = _all(sqliteDb, `
      SELECT cm.* 
      FROM control_marks cm
      JOIN control_students cs ON cs.id = cm.control_student_id
      WHERE cs.grade_id = ? AND cm.term = ?
    `, [gId, tVal]);

    return res.json({
      success: true,
      report: reportMeta,
      data: {
        school: getSchoolMasterInfo(sqliteDb),
        grade,
        term: tVal,
        subjects,
        students,
        marks
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── 3. Export Control Report to Formatted Excel Template ───────────────────
const exportControlReportExcel = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { reportId } = req.params;
  const { gradeId, term, classId } = req.query;

  const reportMeta = CONTROL_REPORTS_REGISTRY[reportId];
  if (!reportMeta) return res.status(404).json({ success: false, error: 'التقرير المطلوب غير موجود.' });

  try {
    const sqliteDb = db.getSQLiteDb();
    const gId = parseInt(gradeId) || 1;
    const tVal = parseInt(term) || 1;

    const grade = _get(sqliteDb, "SELECT grade_name_ar FROM grades_lookup WHERE id = ?", [gId]);
    const gradeName = grade ? grade.grade_name_ar : 'الصف الدراسي';

    const subjects = _all(sqliteDb, `
      SELECT id, subject_name_ar, subject_code, subject_category,
             term1_work_mark, term1_practical_mark, term1_exam_mark, term1_max_mark,
             term2_work_mark, term2_practical_mark, term2_exam_mark, term2_max_mark,
             year_max_mark, pass_mark, subject_pass_percent, is_added_to_total, is_activity_subject, sort_order
      FROM exam_subjects 
      WHERE grade_id = ? 
      ORDER BY sort_order ASC, id ASC
    `, [gId]);
    
    let classFilter = '';
    const params = [gId];
    if (classId && classId !== 'all') {
      classFilter = 'AND cl.id = ?';
      params.push(parseInt(classId));
    }

    const students = _all(sqliteDb, `
      SELECT 
        cs.id AS control_student_id,
        cs.seat_number,
        cs.secret_code_term1,
        cs.secret_code_term2,
        cc.committee_name,
        s.full_name_ar,
        s.national_id,
        cl.class_name AS class_name_ar
      FROM control_students cs
      JOIN students s ON s.id = cs.student_id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND (ce.academic_year_id = s.academic_year_id OR ce.academic_year_id IS NULL)
      LEFT JOIN classes cl ON cl.id = ce.class_id AND (cl.grade_id = cs.grade_id OR cl.grade_id = s.grade_id)
      LEFT JOIN control_committees cc ON cc.id = cs.committee_id
      WHERE cs.grade_id = ? ${classFilter}
      ORDER BY cs.seat_number ASC, s.full_name_ar ASC
    `, params);

    const marks = _all(sqliteDb, `
      SELECT cm.* 
      FROM control_marks cm
      JOIN control_students cs ON cs.id = cm.control_student_id
      WHERE cs.grade_id = ? AND cm.term = ?
    `, [gId, tVal]);

    const marksMap = new Map();
    marks.forEach(m => marksMap.set(`${m.control_student_id}_${m.subject_id}`, m));

    // Build Excel Workbook
    const wb = new ExcelJS.Workbook();
    const templatePath = reportMeta.getTemplatePath();

    if (templatePath) {
      await wb.xlsx.readFile(templatePath);
    } else {
      // Dynamic fallback workbook creation with official formatting
      const ws = wb.addWorksheet(reportMeta.title, { pageSetup: { orientation: reportMeta.orientation, paperSize: 9 } });
      ws.views = [{ rtl: true }];

      // Header Title
      ws.mergeCells('A1:G1');
      const titleCell = ws.getCell('A1');
      titleCell.value = `جمهورية مصر العربية — وزارة التربية والتعليم\n${reportMeta.title} — ${gradeName}`;
      titleCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      titleCell.font = { name: 'Cairo', size: 14, bold: true, color: { argb: 'FF1E1B4B' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
      ws.getRow(1).height = 45;

      // Table Headers
      const headers = ['م', 'رقم الجلوس', 'اسم الطالب', 'الفصل'];
      if (reportId === 'secret_codes_list') {
        headers.push('الرقم السرّي', 'اللجنة');
      } else {
        subjects.forEach(s => headers.push(s.subject_name_ar));
        headers.push('المجموع الكلي', 'النتيجة');
      }

      const headerRow = ws.addRow(headers);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Cairo', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });

      // Data Rows
      students.forEach((st, idx) => {
        const rowVal = [idx + 1, st.seat_number || '-', st.full_name_ar, st.class_name_ar || '-'];
        let totalSum = 0;

        if (reportId === 'secret_codes_list') {
          const secCode = tVal === 1 ? (st.secret_code_term1 || '🔒') : (st.secret_code_term2 || '🔒');
          rowVal.push(secCode, st.committee_name || '-');
        } else {
          subjects.forEach(s => {
            const m = marksMap.get(`${st.control_student_id}_${s.id}`);
            if (m) {
              if (m.is_absent) rowVal.push('غائب');
              else if (m.is_exempt) rowVal.push('معفى');
              else {
                const markVal = (m.work_marks || 0) + (m.written_marks || 0);
                totalSum += markVal;
                rowVal.push(markVal);
              }
            } else {
              rowVal.push('');
            }
          });
          rowVal.push(totalSum, totalSum > 0 ? 'ناجح' : '-');
        }

        const dataRow = ws.addRow(rowVal);
        dataRow.height = 22;
        dataRow.eachCell((cell, colNum) => {
          cell.font = { name: 'Cairo', size: 10, bold: colNum === 2 || colNum === 3 };
          cell.alignment = { vertical: 'middle', horizontal: colNum === 3 ? 'right' : 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
          if (idx % 2 === 1) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          }
        });
      });

      // Auto-fit column widths
      ws.columns.forEach((col, i) => {
        col.width = i === 2 ? 28 : (i === 1 || i === 4 ? 16 : 14);
      });
    }

    // Set Response Headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(reportMeta.title)}_${gId}.xlsx"`);

    const buffer = await wb.xlsx.writeBuffer();
    return res.send(Buffer.from(buffer));
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  listControlReports,
  getControlReportData,
  exportControlReportExcel
};
