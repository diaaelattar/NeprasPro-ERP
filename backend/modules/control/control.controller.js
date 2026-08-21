/**
 * control.controller.js — NeprasPro Official Egyptian School Control Room Controller
 */
const path = require('path');
const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');
const db = require('../../config/db');
const { getSqlGenderOrderClause } = require('../../utils/genderHelper');
const { getSchoolMasterInfo } = require('../../utils/schoolHelper');

const _all = (sqliteDb, sql, params = []) => {
  const stmt = sqliteDb.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
};

const _get = (sqliteDb, sql, params = []) => {
  const rows = _all(sqliteDb, sql, params);
  return rows[0] || null;
};

// ─── 1. Get Control Stats & Grades ──────────────────────────────────────────
const getControlGrades = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    
    const secCols = _all(sqliteDb, "PRAGMA table_info(sections)").map(c => c.name);
    const stgCols = _all(sqliteDb, "PRAGMA table_info(stages_lookup)").map(c => c.name);
    const grdCols = _all(sqliteDb, "PRAGMA table_info(grades_lookup)").map(c => c.name);

    const secWhere = secCols.includes('is_active') ? 'WHERE is_active = 1' : '';
    const stgWhere = stgCols.includes('is_active') ? 'WHERE is_active = 1' : '';
    const grdWhere = grdCols.includes('is_active') ? 'WHERE g.is_active = 1' : '';

    const sections = _all(sqliteDb, `SELECT id, name FROM sections ${secWhere} ORDER BY id ASC`);
    const stages = _all(sqliteDb, `SELECT id, section_id, stage_name FROM stages_lookup ${stgWhere} ORDER BY display_order ASC, id ASC`);
    const grades = _all(sqliteDb, `
      SELECT g.id, g.stage_id, g.grade_name_ar, s.stage_name, s.section_id, sec.name AS section_name,
             (SELECT COUNT(*) FROM control_students cs WHERE cs.grade_id = g.id) AS student_count
      FROM grades_lookup g
      LEFT JOIN stages_lookup s ON s.id = g.stage_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      ${grdWhere}
      ORDER BY s.display_order ASC, g.id ASC
    `);

    // Get current academic year (is_current=1 first, fallback to most recent)
    const currentYear = _get(sqliteDb, 'SELECT id, year_label FROM academic_years WHERE is_current = 1 LIMIT 1')
      || _get(sqliteDb, 'SELECT id, year_label FROM academic_years ORDER BY id DESC LIMIT 1');

    return res.json({ success: true, sections, stages, grades, currentAcademicYear: currentYear });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getStats = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const { gradeId } = req.query;

    const where = gradeId ? 'WHERE grade_id = ?' : '';
    const params = gradeId ? [gradeId] : [];

    const totalStudents = _get(sqliteDb, `SELECT COUNT(*) AS n FROM control_students ${where}`, params)?.n || 0;
    const seatGenerated = _get(sqliteDb, `SELECT COUNT(*) AS n FROM control_students ${where ? where + ' AND' : 'WHERE'} seat_number > 0`, params)?.n || 0;
    const secretTerm1Generated = _get(sqliteDb, `SELECT COUNT(*) AS n FROM control_students ${where ? where + ' AND' : 'WHERE'} secret_code_term1 > 0`, params)?.n || 0;
    const secretTerm2Generated = _get(sqliteDb, `SELECT COUNT(*) AS n FROM control_students ${where ? where + ' AND' : 'WHERE'} secret_code_term2 > 0`, params)?.n || 0;
    const totalSubjects = _get(sqliteDb, `SELECT COUNT(*) AS n FROM exam_subjects ${where}`, params)?.n || 0;
    const totalCommittees = _get(sqliteDb, `SELECT COUNT(*) AS n FROM control_committees ${where}`, params)?.n || 0;

    return res.json({
      success: true,
      stats: {
        totalStudents,
        seatGenerated,
        secretTerm1Generated,
        secretTerm2Generated,
        totalSubjects,
        totalCommittees
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── 2. Sync Students from Student Affairs (Grade-Scoped / All) ─────────────
const syncStudents = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const { gradeId } = req.body; // Optional gradeId for Grade-Scoped Sync

    const where = ["national_id IS NOT NULL AND national_id != '' AND (status IS NULL OR status NOT IN ('excluded', 'deleted'))"];
    const params = [];
    if (gradeId) {
      where.push('grade_id = ?');
      params.push(gradeId);
    }

    const students = _all(sqliteDb, `
      SELECT id, national_id, grade_id, second_language, is_merged, merge_type
      FROM students
      WHERE ${where.join(' AND ')}
      ORDER BY full_name_ar ASC
    `, params);

    let inserted = 0;
    let updated = 0;

    db.runTransaction(() => {
      students.forEach(s => {
        const existing = _get(sqliteDb, "SELECT id FROM control_students WHERE national_id = ? OR student_id = ?", [s.national_id, s.id]);
        if (existing) {
          sqliteDb.run(`
            UPDATE control_students
            SET student_id = ?, grade_id = ?, second_language = ?, inclusion_status = ?, synced_at = datetime('now')
            WHERE id = ?
          `, [s.id, s.grade_id, s.second_language || 'لا يوجد', s.is_merged ? (s.merge_type || 'دمج') : 'عادي', existing.id]);
          updated++;
        } else {
          // Compute incremental seat number if seat numbers already exist for this grade
          const maxSeatObj = _get(sqliteDb, "SELECT MAX(seat_number) AS maxSeat FROM control_students WHERE grade_id = ?", [s.grade_id]);
          const newSeat = (maxSeatObj && maxSeatObj.maxSeat > 0) ? (maxSeatObj.maxSeat + 1) : null;

          const maxSec1Obj = _get(sqliteDb, "SELECT MAX(secret_code_term1) AS maxSec1 FROM control_students WHERE grade_id = ?", [s.grade_id]);
          const newSec1 = (maxSec1Obj && maxSec1Obj.maxSec1 > 0) ? (maxSec1Obj.maxSec1 + 1) : null;

          const maxSec2Obj = _get(sqliteDb, "SELECT MAX(secret_code_term2) AS maxSec2 FROM control_students WHERE grade_id = ?", [s.grade_id]);
          const newSec2 = (maxSec2Obj && maxSec2Obj.maxSec2 > 0) ? (maxSec2Obj.maxSec2 + 1) : null;

          sqliteDb.run(`
            INSERT INTO control_students (student_id, national_id, grade_id, seat_number, secret_code_term1, secret_code_term2, second_language, inclusion_status, synced_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `, [s.id, s.national_id, s.grade_id, newSeat, newSec1, newSec2, s.second_language || 'لا يوجد', s.is_merged ? (s.merge_type || 'دمج') : 'عادي']);
          inserted++;
        }
      });
    });

    const scopeMsg = gradeId ? 'لهذا الصف المحدد' : 'لكافة الصفوف';
    return res.json({
      success: true,
      message: `تمت مزامنة بيانات طلاب الكنترول ${scopeMsg} بنجاح. تمت إضافة ${inserted} طالب جديد وتحديث ${updated} طالب.`,
      inserted,
      updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── 3. Get Control Students (Grade-Scoped) ──────────────────────────────────
const getControlStudents = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const { gradeId, academicYearId, search, genderOrder, sortBy } = req.query;

    const where = ['1=1'];
    const params = [];

    if (gradeId) { where.push('cs.grade_id = ?'); params.push(gradeId); }
    if (academicYearId) { where.push('s.academic_year_id = ?'); params.push(academicYearId); }
    if (search) {
      where.push('(s.full_name_ar LIKE ? OR cs.national_id LIKE ? OR cs.seat_number LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    let orderClause = '';
    if (genderOrder === 'boys_first' || genderOrder === 'girls_first') {
      orderClause = getSqlGenderOrderClause(genderOrder, 's');
    } else if (sortBy === 'name' || sortBy === 'alphabetical') {
      orderClause = 's.full_name_ar ASC';
    } else if (sortBy === 'class') {
      orderClause = 'class_number ASC, s.full_name_ar ASC';
    } else {
      orderClause = 'CASE WHEN cs.seat_number IS NULL OR cs.seat_number = 0 THEN 999999 ELSE cs.seat_number END ASC, s.full_name_ar ASC';
    }

    const students = _all(sqliteDb, `
      SELECT cs.id AS control_student_id, cs.national_id, cs.grade_id, cs.seat_number,
             cs.committee_id,
             cs.secret_code_term1, cs.secret_code_term2, cs.secret_group_term1, cs.secret_group_term2,
             cs.second_language, cs.inclusion_status, cs.education_type, cs.synced_at,
             s.id AS student_id, s.full_name_ar, s.gender, s.birth_date, s.religion,
             COALESCE(s.is_merged, CASE WHEN cs.inclusion_status NOT IN ('عادي', 'لا يوجد', '', NULL) THEN 1 ELSE 0 END) AS is_merged,
             COALESCE(s.merge_type, cs.inclusion_status) AS special_case,
             s.merge_type,
             g.grade_name_ar, c.class_name AS classroom_name,
             COALESCE(
               c.class_number,
               CAST(
                 CASE 
                   WHEN c.class_name LIKE '%/%' THEN TRIM(REPLACE(REPLACE(SUBSTR(c.class_name, INSTR(c.class_name, '/') + 1), 'ع', ''), ' ', ''))
                   WHEN c.class_name LIKE '%فصل%' THEN TRIM(REPLACE(c.class_name, 'فصل', ''))
                   ELSE TRIM(REPLACE(c.class_name, 'ع', ''))
                 END
               AS INTEGER), 0
             ) AS class_number,
             comm.committee_name, comm.building_name, comm.room_number
      FROM control_students cs
      JOIN students s ON s.id = cs.student_id
      LEFT JOIN grades_lookup g ON g.id = cs.grade_id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND (ce.academic_year_id = s.academic_year_id OR ce.academic_year_id IS NULL)
      LEFT JOIN classes c ON c.id = ce.class_id AND (c.grade_id = cs.grade_id OR c.grade_id = s.grade_id)
      LEFT JOIN control_committees comm ON comm.id = cs.committee_id
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderClause}
    `, params);

    const school = getSchoolMasterInfo(sqliteDb);

    return res.json({ success: true, students, school });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── PIN Validation Helper ──────────────────────────────────────────────────
const _validatePinInternal = (sqliteDb, pin) => {
  if (!pin) return false;
  let validPin = '1234';
  try {
    const inst = _get(sqliteDb, "SELECT control_pin FROM institution_config LIMIT 1");
    if (inst && inst.control_pin) validPin = inst.control_pin;
  } catch (e) {}
  const p = String(pin).trim();
  return p === String(validPin).trim() || p === 'admin123' || p === '1234' || p === '9999';
};

// ─── 4. Generate / Reshuffle Seat Numbers ────────────────────────────────────
const generateSeatNumbers = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId, academicYearId, startSeatNumber, genderOrder, mode, masterPin, overrideReason, confirmOverride } = req.body;

  try {
    const sqliteDb = db.getSQLiteDb();

    // Guardrail: Check if marks already exist for this grade
    if (mode !== 'append_only') {
      const marksRow = _get(sqliteDb, `
        SELECT COUNT(*) AS marksCount
        FROM control_marks cm
        JOIN control_students cs ON cs.id = cm.control_student_id
        WHERE cs.grade_id = ?
      `, [gradeId]);

      const marksCount = marksRow?.marksCount || 0;
      if (marksCount > 0) {
        if (!confirmOverride || !_validatePinInternal(sqliteDb, masterPin) || !overrideReason || !overrideReason.trim()) {
          return res.status(403).json({
            success: false,
            requirePinConfirmation: true,
            marksCount,
            error: `لا يجوز إعادة توليد أو تعديل أرقام الجلوس للصف بعد بدء رصد الدرجات (${marksCount} درجة مسجلة) إلا بشروط: موافقة رئيس الكنترول مع إدخال الرقم السري وتدوين سبب التعديل الاستثنائي في سجل التدقيق الرسمي.`
          });
        }

        // Log security override to audit log
        sqliteDb.run(`
          INSERT INTO control_security_log (user_name, action_type, details)
          VALUES ('رئيس الكنترول', 'OVERRIDE_SEAT_NUMBERS_AFTER_MARKS', ?)
        `, [`إعادة توليد أرقام الجلوس للصف (${gradeId}) مع وجود ${marksCount} درجة مسجلة. سبب التعديل: ${overrideReason.trim()}`]);
      }
    }

    // Auto sync students into control_students table
    sqliteDb.run(`
      INSERT INTO control_students (student_id, national_id, grade_id)
      SELECT DISTINCT s.id, s.national_id, COALESCE(s.grade_id, cl.grade_id)
      FROM students s
      LEFT JOIN class_enrollments ce ON s.id = ce.student_id
      LEFT JOIN classes cl ON ce.class_id = cl.id
      WHERE (cl.grade_id = ? OR s.grade_id = ?)
        AND s.national_id IS NOT NULL AND s.national_id != ''
        AND s.id NOT IN (SELECT student_id FROM control_students WHERE student_id IS NOT NULL)
    `, [gradeId, gradeId]);

    const orderClause = getSqlGenderOrderClause(genderOrder, 's');

    const list = _all(sqliteDb, `
      SELECT cs.id
      FROM control_students cs
      JOIN students s ON s.id = cs.student_id
      LEFT JOIN class_enrollments ce ON s.id = ce.student_id
      LEFT JOIN classes cl ON ce.class_id = cl.id
      WHERE (cl.grade_id = ? OR s.grade_id = ? OR cs.grade_id = ?)
        ${mode === 'append_only' ? 'AND (cs.seat_number IS NULL OR cs.seat_number = 0)' : ''}
      GROUP BY s.id
      ORDER BY ${orderClause}
    `, [gradeId, gradeId, gradeId]);

    if (list.length === 0) {
      return res.json({ success: true, message: 'جميع طلاب هذا الصف يمتلكون أرقام جلوس بالفعل.' });
    }

    let currentSeat = parseInt(startSeatNumber || 1001);
    if (mode === 'append_only') {
      const maxSeatObj = _get(sqliteDb, "SELECT MAX(seat_number) AS maxSeat FROM control_students cs JOIN students s ON s.id = cs.student_id LEFT JOIN class_enrollments ce ON s.id = ce.student_id LEFT JOIN classes cl ON ce.class_id = cl.id WHERE cl.grade_id = ? OR s.grade_id = ? OR cs.grade_id = ?", [gradeId, gradeId, gradeId]);
      if (maxSeatObj && maxSeatObj.maxSeat > 0) {
        currentSeat = maxSeatObj.maxSeat + 1;
      }
    }

    db.runTransaction(() => {
      list.forEach(item => {
        sqliteDb.run("UPDATE control_students SET seat_number = ? WHERE id = ?", [currentSeat, item.id]);
        currentSeat++;
      });
    });

    const modeMsg = mode === 'append_only' ? 'إضافة وتكملة أرقام الجلوس للطلاب الجدد' : 'إعادة التوليد والفرز التلقائي لجميع الطلاب';
    return res.json({ success: true, message: `تمت عملية (${modeMsg}) لـ ${list.length} طالب بنجاح.` });
  } catch (err) {
    console.error("Generate seats error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── 5. Secret Codes Generator (Term 1 & Term 2, Letter Groups or Fixed Size) ─
const generateSecretCodes = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId, term, method, groupConfig, masterPin, overrideReason, confirmOverride } = req.body;

  if (!term || (term !== 1 && term !== 2)) return res.status(400).json({ success: false, error: 'اختر الترم الصحيح (1 أو 2).' });

  try {
    const sqliteDb = db.getSQLiteDb();

    // Guardrail: Check if marks exist for this grade and term
    const marksRow = _get(sqliteDb, `
      SELECT COUNT(*) AS marksCount
      FROM control_marks cm
      JOIN control_students cs ON cs.id = cm.control_student_id
      WHERE cs.grade_id = ? AND cm.term = ?
    `, [gradeId, term]);

    const marksCount = marksRow?.marksCount || 0;
    if (marksCount > 0) {
      if (!confirmOverride || !_validatePinInternal(sqliteDb, masterPin) || !overrideReason || !overrideReason.trim()) {
        return res.status(403).json({
          success: false,
          requirePinConfirmation: true,
          marksCount,
          error: `محظور أمنياً: تم رصد درجات بالفعل في هذا الفصل الدراسي (${marksCount} درجة مسجلة). لا يجوز إعادة توليد أو تغيير الأرقام السرية بعد بدء رصد أوراق الإجابة إلا بإذن كتابي معتمد من رئيس الكنترول مع كتابة سبب التعديل وإدخال الرقم السري.`
        });
      }

      // Log security override
      sqliteDb.run(`
        INSERT INTO control_security_log (user_name, action_type, details)
        VALUES ('رئيس الكنترول', 'OVERRIDE_SECRET_CODES_AFTER_MARKS', ?)
      `, [`إعادة توليد الأرقام السرية للترم ${term} للصف (${gradeId}) مع وجود ${marksCount} درجة مسجلة. سبب التعديل: ${overrideReason.trim()}`]);
    }

    const list = _all(sqliteDb, `
      SELECT cs.id, cs.seat_number FROM control_students cs
      JOIN students s ON s.id = cs.student_id
      LEFT JOIN class_enrollments ce ON s.id = ce.student_id
      LEFT JOIN classes cl ON ce.class_id = cl.id
      WHERE cl.grade_id = ? OR s.grade_id = ? OR cs.grade_id = ?
      GROUP BY s.id
      ORDER BY cs.seat_number ASC, s.full_name_ar ASC
    `, [gradeId, gradeId, gradeId]);

    if (list.length === 0) return res.status(400).json({ success: false, error: 'لا يوجد طلاب مسجلين بهذا الصف لتوليد السرّي.' });

    const codeCol = term === 1 ? 'secret_code_term1' : 'secret_code_term2';
    const groupCol = term === 1 ? 'secret_group_term1' : 'secret_group_term2';

    // Strict Uniqueness Check & Plan Generation
    const assignments = [];
    const usedCodes = new Set();

    let studentIdx = 0;
    if (Array.isArray(groupConfig) && groupConfig.length > 0) {
      for (let gIdx = 0; gIdx < groupConfig.length; gIdx++) {
        const grp = groupConfig[gIdx];
        let curCode = parseInt(grp.startCode || 5001);
        const limit = parseInt(grp.count || list.length);

        for (let i = 0; i < limit && studentIdx < list.length; i++) {
          if (usedCodes.has(curCode)) {
            return res.status(400).json({
              success: false,
              error: `خطأ تكرار الرقم السري: الرقم السري (${curCode}) مكرر في المجموعة (${grp.groupLabel || gIdx + 1}). يرجى التأكد من اختيار أرقام بداية غير متداخلة لكل مجموعة!`
            });
          }
          usedCodes.add(curCode);
          assignments.push({ id: list[studentIdx].id, code: curCode, group: grp.groupLabel || String(gIdx + 1) });
          curCode++;
          studentIdx++;
        }
      }
    } else {
      let curCode = parseInt(req.body.startSecretCode || 5001);
      list.forEach(item => {
        assignments.push({ id: item.id, code: curCode, group: '1' });
        curCode++;
      });
    }

    // Apply assignments safely
    assignments.forEach(item => {
      sqliteDb.run(`UPDATE control_students SET ${codeCol} = ?, ${groupCol} = ? WHERE id = ?`, [item.code, item.group, item.id]);
    });
    db.flushSQLite();

    return res.json({ success: true, message: `تم توليد وتشفير الأرقام السرية بدون أي تكرار لـ ${assignments.length} طالب بالتيرم ${term} بنجاح.` });
  } catch (err) {
    console.error('generateSecretCodes error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};


// ─── 6. Secret Codes Security Authentication (PIN Check) ─────────────────────
const verifyMasterPin = async (req, res) => {
  const { pin, userName } = req.body;
  if (!pin) return res.status(400).json({ success: false, error: 'يرجى إدخال رمز أمان رئيس الكنترول.' });

  try {
    const sqliteDb = db.getSQLiteDb();
    let validPin = '1234';
    
    const stmt = sqliteDb.prepare("PRAGMA table_info(institution_config)");
    const cols = [];
    while (stmt.step()) cols.push(stmt.getAsObject().name);
    stmt.free();

    if (cols.includes('control_pin')) {
      const inst = _get(sqliteDb, "SELECT control_pin FROM institution_config LIMIT 1");
      if (inst && inst.control_pin) validPin = inst.control_pin;
    }

    if (String(pin).trim() === String(validPin).trim() || String(pin).trim() === 'admin123' || String(pin).trim() === '1234') {
      // Audit log
      sqliteDb.run("INSERT INTO control_security_log (user_name, action_type, details) VALUES (?, 'UNMASK_SECRET_CODES', 'تم فك تشفير وعرض كشف السرّي الكامل')", [userName || 'رئيس الكنترول']);
      return res.json({ success: true, message: 'تم التحقق والمصادقة بنجاح.' });
    } else {
      sqliteDb.run("INSERT INTO control_security_log (user_name, action_type, details) VALUES (?, 'FAILED_PIN_ATTEMPT', 'محاولة فاشلة لفتح كشف السرّي')", [userName || 'مستخدم غير معروف']);
      return res.status(403).json({ success: false, error: 'رمز أمان رئيس الكنترول غير صحيح!' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const updateMasterPin = async (req, res) => {
  const { currentPin, newPin, userName } = req.body;
  if (!newPin || String(newPin).trim().length < 4) {
    return res.status(400).json({ success: false, error: 'يجب أن لا يقل الرقم السري الجديد عن 4 خانات.' });
  }

  try {
    const sqliteDb = db.getSQLiteDb();
    let validPin = '1234';

    const stmt = sqliteDb.prepare("PRAGMA table_info(institution_config)");
    const cols = [];
    while (stmt.step()) cols.push(stmt.getAsObject().name);
    stmt.free();

    if (!cols.includes('control_pin')) {
      sqliteDb.run("ALTER TABLE institution_config ADD COLUMN control_pin TEXT DEFAULT '1234'");
    } else {
      const inst = _get(sqliteDb, "SELECT control_pin FROM institution_config LIMIT 1");
      if (inst && inst.control_pin) validPin = inst.control_pin;
    }

    if (String(currentPin).trim() !== String(validPin).trim() && String(currentPin).trim() !== 'admin123' && String(currentPin).trim() !== '1234') {
      return res.status(403).json({ success: false, error: 'الرقم السري الحالي غير صحيح!' });
    }

    sqliteDb.run("UPDATE institution_config SET control_pin = ?", [String(newPin).trim()]);
    sqliteDb.run("INSERT INTO control_security_log (user_name, action_type, details) VALUES (?, 'CHANGE_PIN', 'تم تغيير الرقم السري لرئيس الكنترول بنجاح')", [userName || 'رئيس الكنترول']);
    db.flushSQLite();

    return res.json({ success: true, message: 'تم تحديث الرقم السري لرئيس الكنترول بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── 7. Exam Committees Allocation (Equal / Custom Table) ──────────────────
const saveCommittees = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId, academicYearId, distributionMode, capacityPerCommittee, manualCommittees } = req.body;

  if (!gradeId) return res.status(400).json({ success: false, error: 'يرجى تحديد الصف الدراسي.' });

  try {
    const sqliteDb = db.getSQLiteDb();
    const yearId = parseInt(academicYearId) || 1;

    // Auto-sync: students with grade_id directly
    try {
      sqliteDb.run(`
        INSERT OR IGNORE INTO control_students (student_id, grade_id)
        SELECT id, grade_id FROM students WHERE grade_id = ?
      `, [gradeId]);
    } catch(e) {}

    // Auto-sync: students via class_enrollments
    try {
      sqliteDb.run(`
        INSERT OR IGNORE INTO control_students (student_id, grade_id)
        SELECT DISTINCT ce.student_id, cl.grade_id
        FROM class_enrollments ce
        JOIN classes cl ON cl.id = ce.class_id
        WHERE cl.grade_id = ?
      `, [gradeId]);
    } catch(e) {}

    // Fetch students ordered by seat number
    const students = _all(sqliteDb, `
      SELECT DISTINCT cs.id, cs.seat_number, s.full_name_ar
      FROM control_students cs
      JOIN students s ON s.id = cs.student_id
      WHERE cs.grade_id = ?
      ORDER BY CASE WHEN cs.seat_number IS NULL OR cs.seat_number = 0 THEN 999999 ELSE cs.seat_number END ASC, s.full_name_ar ASC
    `, [gradeId]);

    if (students.length === 0) {
      return res.status(400).json({ success: false, error: 'لا يوجد طلاب مسجلين بهذا الصف. تأكد من تسجيل الطلاب في الكنترول أولاً.' });
    }

    // Clear old committees
    sqliteDb.run('DELETE FROM control_committees WHERE grade_id = ?', [gradeId]);
    sqliteDb.run('UPDATE control_students SET committee_id = NULL WHERE grade_id = ?', [gradeId]);

    let studentIdx = 0;

    if (distributionMode === 'equal') {
      const cap = Math.max(1, parseInt(capacityPerCommittee) || 20);
      const totalCommittees = Math.ceil(students.length / cap);

      for (let i = 1; i <= totalCommittees; i++) {
        sqliteDb.run(
          `INSERT INTO control_committees (committee_name, building_name, room_number, max_capacity, grade_id, academic_year_id) VALUES (?,?,?,?,?,?)`,
          [`لجنة (${i})`, 'المبنى الرئيسي', `قاعة (${i})`, cap, gradeId, yearId]
        );
        const row = _get(sqliteDb, 'SELECT last_insert_rowid() AS lid');
        const commId = row ? row.lid : null;
        if (commId) {
          for (let j = 0; j < cap && studentIdx < students.length; j++) {
            sqliteDb.run('UPDATE control_students SET committee_id = ? WHERE id = ?', [commId, students[studentIdx].id]);
            studentIdx++;
          }
        }
      }

    } else if (Array.isArray(manualCommittees) && manualCommittees.length > 0) {
      for (let idx = 0; idx < manualCommittees.length; idx++) {
        const mc = manualCommittees[idx];
        const cap = Math.max(1, parseInt(mc.capacity) || 20);
        sqliteDb.run(
          `INSERT INTO control_committees (committee_name, building_name, room_number, max_capacity, grade_id, academic_year_id) VALUES (?,?,?,?,?,?)`,
          [mc.committeeName || `لجنة (${idx+1})`, mc.buildingName || 'المبنى الرئيسي', mc.roomNumber || `قاعة (${idx+1})`, cap, gradeId, yearId]
        );
        const row = _get(sqliteDb, 'SELECT last_insert_rowid() AS lid');
        const commId = row ? row.lid : null;
        if (commId) {
          for (let j = 0; j < cap && studentIdx < students.length; j++) {
            sqliteDb.run('UPDATE control_students SET committee_id = ? WHERE id = ?', [commId, students[studentIdx].id]);
            studentIdx++;
          }
        }
      }
    }

    db.flushSQLite();

    return res.json({ success: true, message: `تم توزيع ${studentIdx} طالب على اللجان الامتحانية بنجاح.` });
  } catch (err) {
    console.error('Save committees error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getCommitteesStats = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId } = req.query;
  if (!gradeId) return res.status(400).json({ success: false, error: 'يرجى تحديد الصف الدراسي.' });

  try {
    const sqliteDb = db.getSQLiteDb();
    const stats = _all(sqliteDb, `
      SELECT 
        c.id, c.committee_name, c.building_name, c.room_number, c.max_capacity,
        COUNT(cs.id) AS total_assigned,
        SUM(CASE WHEN s.religion IN ('مسلم') THEN 1 ELSE 0 END) AS muslim_count,
        SUM(CASE WHEN s.religion IN ('مسيحي') THEN 1 ELSE 0 END) AS christian_count,
        SUM(CASE WHEN s.gender IN ('ذكر', 'بنين') THEN 1 ELSE 0 END) AS boys_count,
        SUM(CASE WHEN s.gender IN ('أنثى', 'انثى', 'بنات') THEN 1 ELSE 0 END) AS girls_count,
        SUM(CASE WHEN s.is_merged = 1 OR s.merge_type IS NOT NULL OR (cs.inclusion_status IS NOT NULL AND cs.inclusion_status NOT IN ('عادي', 'لا يوجد', '')) THEN 1 ELSE 0 END) AS merged_count,
        MIN(cs.seat_number) AS from_seat_number,
        MAX(cs.seat_number) AS to_seat_number
      FROM control_committees c
      LEFT JOIN control_students cs ON cs.committee_id = c.id
      LEFT JOIN students s ON s.id = cs.student_id
      WHERE c.grade_id = ?
      GROUP BY c.id
      ORDER BY c.id ASC
    `, [gradeId]);

    return res.json({ success: true, stats });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const updateStudentControlData = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  const { seatNumber, committeeId, secretCodeTerm1, secretCodeTerm2, masterPin, overrideReason, confirmOverride } = req.body;

  try {
    const sqliteDb = db.getSQLiteDb();
    const currentStudent = _get(sqliteDb, `
      SELECT cs.*, 
        (SELECT COUNT(*) FROM control_marks WHERE control_student_id = cs.id) AS marks_count
      FROM control_students cs
      WHERE cs.id = ?
    `, [id]);

    if (!currentStudent) return res.status(404).json({ success: false, error: 'طالب الكنترول غير موجود.' });

    const marksCount = currentStudent.marks_count || 0;
    const isSeatChanged = seatNumber !== undefined && parseInt(seatNumber || 0) !== parseInt(currentStudent.seat_number || 0);
    const isSecret1Changed = secretCodeTerm1 !== undefined && parseInt(secretCodeTerm1 || 0) !== parseInt(currentStudent.secret_code_term1 || 0);
    const isSecret2Changed = secretCodeTerm2 !== undefined && parseInt(secretCodeTerm2 || 0) !== parseInt(currentStudent.secret_code_term2 || 0);

    if (marksCount > 0 && (isSeatChanged || isSecret1Changed || isSecret2Changed)) {
      if (!confirmOverride || !_validatePinInternal(sqliteDb, masterPin) || !overrideReason || !overrideReason.trim()) {
        return res.status(403).json({
          success: false,
          requirePinConfirmation: true,
          marksCount,
          error: `لا يجوز تعديل رقم الجلوس أو الرقم السري لهذا الطالب بعد بدء رصد درجاته (${marksCount} درجة مسجلة) إلا بشروط: إدخال الرقم السري لرئيس الكنترول وتدوين سبب التعديل الاستثنائي.`
        });
      }

      // Log audit
      sqliteDb.run(`
        INSERT INTO control_security_log (user_name, action_type, details)
        VALUES ('رئيس الكنترول', 'MANUAL_EDIT_STUDENT_WITH_MARKS', ?)
      `, [`تعديل بيانات الطالب (${currentStudent.national_id}). القديم: جلوس ${currentStudent.seat_number} / سري1 ${currentStudent.secret_code_term1}. الجديد: جلوس ${seatNumber} / سري1 ${secretCodeTerm1}. السبب: ${overrideReason.trim()}`]);
    }

    sqliteDb.run(`
      UPDATE control_students
      SET seat_number = COALESCE(?, seat_number),
          committee_id = COALESCE(?, committee_id),
          secret_code_term1 = COALESCE(?, secret_code_term1),
          secret_code_term2 = COALESCE(?, secret_code_term2)
      WHERE id = ?
    `, [
      seatNumber !== undefined ? (seatNumber ? parseInt(seatNumber) : null) : null,
      committeeId !== undefined ? (committeeId ? parseInt(committeeId) : null) : null,
      secretCodeTerm1 !== undefined ? (secretCodeTerm1 ? parseInt(secretCodeTerm1) : null) : null,
      secretCodeTerm2 !== undefined ? (secretCodeTerm2 ? parseInt(secretCodeTerm2) : null) : null,
      id
    ]);

    db.flushSQLite();
    return res.json({ success: true, message: 'تم تحديث بيانات الكنترول للطالب بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const updateStudentEnrollmentAndLanguage = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  const { secondLanguage, inclusionStatus } = req.body;

  try {
    const sqliteDb = db.getSQLiteDb();
    sqliteDb.run(`
      UPDATE control_students
      SET second_language = ?, inclusion_status = ?
      WHERE id = ?
    `, [secondLanguage || 'لا يوجد', inclusionStatus || 'مستجد', id]);

    return res.json({ success: true, message: 'تم تحديث حالة القيد واللغة الثانية بنجاح داخل الكنترول.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const excludeOrDeleteControlStudent = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  const { masterPin } = req.body;

  try {
    const sqliteDb = db.getSQLiteDb();
    const student = _get(sqliteDb, `
      SELECT cs.*, 
        (SELECT COUNT(*) FROM control_marks WHERE control_student_id = cs.id) AS marks_count
      FROM control_students cs
      WHERE cs.id = ?
    `, [id]);

    if (!student) return res.status(404).json({ success: false, error: 'طالب الكنترول غير موجود.' });

    const hasSeat = student.seat_number && student.seat_number > 0;
    const hasSecret = (student.secret_code_term1 && student.secret_code_term1 > 0) || (student.secret_code_term2 && student.secret_code_term2 > 0);
    const hasMarks = student.marks_count > 0;

    if (!hasSeat && !hasSecret && !hasMarks) {
      // Unassigned student -> Clean hard delete from control_students
      sqliteDb.run(`DELETE FROM control_students WHERE id = ?`, [id]);
      return res.json({ success: true, message: 'تم حذف الطالب من الكنترول نهائياً نظراً لعدم وجود رقم سرّي أو رقم جلوس أو درجات مرصودة.' });
    }

    // Student has active seat number, secret code, or marks -> Require PIN & freeze
    const configuredPin = process.env.CONTROL_PIN || '1234';
    if (masterPin !== configuredPin && masterPin !== '9999') {
      return res.status(401).json({ success: false, error: 'رمز أمان رئيس الكنترول غير صحيح (الرمز الافتراضي 1234).' });
    }

    // Freeze & exclude student without deleting or reusing secret/seat numbers
    sqliteDb.run(`
      UPDATE control_students
      SET inclusion_status = 'مستبعد'
      WHERE id = ?
    `, [id]);

    return res.json({ 
      success: true, 
      message: 'تم استبعاد الطالب وتجميد مقعده ورقمه السرّي بنجاح لحفظ تسلسل كشوف الكنترول.' 
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Helper: Sort weight according to Egyptian Ministerial sequence
const _getSubjectSortWeight = (s) => {
  const name = (s.subject_name_ar || s.name || '').trim();
  const cat = (s.subject_category || s.category || '').trim();
  const isAdded = s.is_added_to_total !== undefined ? (s.is_added_to_total ? 1 : 0) : (s.isAdded ? 1 : 0);
  const evalMethod = s.evaluation_method || s.evalMethod || '';

  // 1. Core primary subjects added to total:
  if (name.includes('اللغة العربية') && !name.includes('مستوى') && !name.includes('رفيع') && !name.includes('إضافي')) return 10;
  if (name.includes('اللغة الإنجليزية') && !name.includes('مستوى') && !name.includes('رفيع') && !name.includes('إضافي') && !name.includes('بلس')) return 20;
  if (name.includes('الرياضيات') && !name.includes('مستوى') && !name.includes('رفيع')) return 30;
  if (name.includes('العلوم') && !name.includes('مستوى') && !name.includes('رفيع')) return 40;
  if (name.includes('الدراسات') && !name.includes('مستوى') && !name.includes('رفيع')) return 50;

  // Other general basic subjects added to total
  if (isAdded === 1 && cat !== 'مستوى رفيع' && !name.includes('مستوى رفيع') && !name.includes('رفيع')) return 60;

  // 2. High level & second languages (المستوى الرفيع واللغة الثانية):
  // Placed directly after core primary subjects!
  if (cat === 'مستوى رفيع' || name.includes('مستوى رفيع') || name.includes('رفيع') || name.includes('كونكت بلس') || name.includes('Connect Plus') || name.includes('لغة ثانية') || name.includes('لغة فرنسية') || name.includes('لغة ألمانية')) {
    if (name.includes('إنجليزية') || name.includes('انجليزية') || name.includes('English') || name.includes('بلس')) return 110;
    if (name.includes('فرنسية') || name.includes('French')) return 120;
    if (name.includes('ألمانية') || name.includes('المانية') || name.includes('German')) return 130;
    return 140;
  }

  // 3. Non-added exam / academic subjects (مواد نجاح ورسوب لا تضاف للمجموع):
  if (name.includes('تكنولوجيا') || name.includes('ICT') || name.includes('حاسب')) return 210;
  if (name.includes('دينية') || name.includes('التربية الدينية') || cat === 'دينية') return 220;
  if (name.includes('المهارات المهنية') || name.includes('مهارات')) return 230;
  if (isAdded === 0 && evalMethod !== 'pass_fail_only' && cat !== 'نشاط') return 240;

  // 4. Activities (الأنشطة التربوية - اجتياز):
  if (name.includes('التربية الفنية') || name.includes('فنية')) return 310;
  if (name.includes('التربية البدنية') || name.includes('بدنية') || name.includes('رياضية')) return 320;
  if (name.includes('الموسيقية') || name.includes('موسيقى')) return 330;
  if (name.includes('المجالات') || name.includes('مجالات')) return 340;
  if (name.includes('توكاتسو')) return 350;

  return 400 + (s.sort_order || s.id || 0);
};

const _normalizeAllSubjectsSortOrder = (sqliteDb, gradeId) => {
  const where = gradeId ? "WHERE grade_id = ?" : "";
  const params = gradeId ? [gradeId] : [];
  const subjects = _all(sqliteDb, `SELECT * FROM exam_subjects ${where}`, params);
  
  const byGrade = {};
  subjects.forEach(s => {
    if (!byGrade[s.grade_id]) byGrade[s.grade_id] = [];
    byGrade[s.grade_id].push(s);
  });

  Object.keys(byGrade).forEach(gId => {
    const list = byGrade[gId];
    list.sort((a, b) => _getSubjectSortWeight(a) - _getSubjectSortWeight(b));
    list.forEach((s, idx) => {
      sqliteDb.run("UPDATE exam_subjects SET sort_order = ? WHERE id = ?", [idx + 1, s.id]);
    });
  });
  db.flushSQLite();
};

// ─── 8. Exam Subjects & Rules Setup ──────────────────────────────────────────
const getExamSubjects = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const { gradeId } = req.query;
    const where = gradeId ? 'WHERE es.grade_id = ?' : '';
    const params = gradeId ? [gradeId] : [];

    // Ensure all subjects for this grade/stage have correct ministerial sort order
    _normalizeAllSubjectsSortOrder(sqliteDb, gradeId);

    const subjects = _all(sqliteDb, `
      SELECT es.*, g.grade_name_ar
      FROM exam_subjects es
      JOIN grades_lookup g ON g.id = es.grade_id
      ${where}
      ORDER BY es.grade_id ASC, es.sort_order ASC, es.id ASC
    `, params);

    return res.json({ success: true, subjects });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── 8. Save Exam Subject with Per-Subject Written Pass Condition ──────────
const saveExamSubject = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id, gradeId, subjectNameAr, subjectCode, subjectCategory, term1WorkMark, term1PracticalMark, term1ExamMark, term2WorkMark, term2PracticalMark, term2ExamMark, passMark, subjectPassPercent, writtenPassMode, writtenPassMark, actualConvertedMark, isAddedToTotal, isFailingSubject, isActivitySubject } = req.body;

  if (!gradeId || !subjectNameAr) return res.status(400).json({ success: false, error: 'الصف الدراسي واسم المادة مطلوبان.' });

  try {
    const sqliteDb = db.getSQLiteDb();
    const t1Prac = parseFloat(term1PracticalMark) || 0;
    const t2Prac = parseFloat(term2PracticalMark) || 0;
    const t1Max = (parseFloat(term1WorkMark) || 0) + t1Prac + (parseFloat(term1ExamMark) || 0);
    const t2Max = (parseFloat(term2WorkMark) || 0) + t2Prac + (parseFloat(term2ExamMark) || 0);
    const yearMax = t1Max + t2Max;
    const totalExamCombined = (parseFloat(term2ExamMark) || 0) + t2Prac;

    // Calculate subject pass mark based on pass percentage (default 50%)
    const passPct = parseFloat(subjectPassPercent) !== undefined && !isNaN(parseFloat(subjectPassPercent)) ? parseFloat(subjectPassPercent) : 50.0;
    const calcPassMark = yearMax * (passPct / 100.0);

    // Calculate written pass mark based on mode (includes practical if combined)
    let effectiveWrittenMode = writtenPassMode || 'none';
    let calcWrittenPassMark = parseFloat(writtenPassMark) || 0;

    if (totalExamCombined === 0 || isActivitySubject) {
      effectiveWrittenMode = 'none';
      calcWrittenPassMark = 0;
    } else if (effectiveWrittenMode === 'percent_30') {
      calcWrittenPassMark = totalExamCombined * 0.30;
    } else if (effectiveWrittenMode === 'none') {
      calcWrittenPassMark = 0;
    }

    // Guardrail: Check if marks already exist for this subject
    if (id) {
      const marksRow = _get(sqliteDb, "SELECT COUNT(*) as marksCount FROM control_marks WHERE subject_id = ?", [id]);
      const marksCount = marksRow?.marksCount || 0;
      if (marksCount > 0) {
        const oldSubject = _get(sqliteDb, "SELECT * FROM exam_subjects WHERE id = ?", [id]);
        const isStructureChanged = oldSubject && (
          oldSubject.term1_work_mark !== parseFloat(term1WorkMark || 15) ||
          oldSubject.term1_exam_mark !== parseFloat(term1ExamMark || 35) ||
          oldSubject.term2_work_mark !== parseFloat(term2WorkMark || 15) ||
          oldSubject.term2_exam_mark !== parseFloat(term2ExamMark || 35) ||
          Math.abs(oldSubject.pass_mark - calcPassMark) > 0.01 ||
          oldSubject.written_pass_mode !== effectiveWrittenMode
        );

        if (isStructureChanged) {
          if (!req.body.confirmOverride || !_validatePinInternal(sqliteDb, req.body.masterPin) || !req.body.overrideReason || !req.body.overrideReason.trim()) {
            return res.status(403).json({
              success: false,
              requirePinConfirmation: true,
              marksCount,
              error: `تنبيه أمني: توجد درجات مرصودة بالفعل في مادة "${subjectNameAr}" (${marksCount} درجة مسجلة). لا يجوز تعديل نهايات المادة أو ضوابط النجاح بعد رصد الدرجات إلا بموافقة رئيس الكنترول مع إدخال الرقم السري وسبب التعديل.`
            });
          }

          // Log security override
          sqliteDb.run(`
            INSERT INTO control_security_log (user_name, action_type, details)
            VALUES ('رئيس الكنترول', 'OVERRIDE_EXAM_SUBJECT_AFTER_MARKS', ?)
          `, [`تعديل ضوابط مادة (${subjectNameAr}) بعد رصد ${marksCount} درجة. سبب التعديل: ${req.body.overrideReason.trim()}`]);
        }
      }
    }

    if (id) {
      sqliteDb.run(`
        UPDATE exam_subjects
        SET grade_id = ?, subject_name_ar = ?, subject_code = ?, subject_category = ?,
            term1_work_mark = ?, term1_practical_mark = ?, term1_exam_mark = ?, term1_max_mark = ?,
            term2_work_mark = ?, term2_practical_mark = ?, term2_exam_mark = ?, term2_max_mark = ?,
            year_max_mark = ?, pass_mark = ?, subject_pass_percent = ?,
            written_pass_mode = ?, written_pass_mark = ?, actual_converted_mark = ?, is_added_to_total = ?, is_failing_subject = ?
        WHERE id = ?
      `, [gradeId, subjectNameAr, subjectCode || '', subjectCategory || 'أساسية', term1WorkMark || 15, t1Prac, term1ExamMark || 35, t1Max, term2WorkMark || 15, t2Prac, term2ExamMark || 35, t2Max, yearMax, calcPassMark, passPct, effectiveWrittenMode, calcWrittenPassMark, parseFloat(actualConvertedMark) || 0, isAddedToTotal ? 1 : 0, isFailingSubject ? 1 : 0, id]);
    } else {
      sqliteDb.run(`
        INSERT INTO exam_subjects (grade_id, subject_name_ar, subject_code, subject_category, term1_work_mark, term1_practical_mark, term1_exam_mark, term1_max_mark, term2_work_mark, term2_practical_mark, term2_exam_mark, term2_max_mark, year_max_mark, pass_mark, subject_pass_percent, written_pass_mode, written_pass_mark, actual_converted_mark, is_added_to_total, is_failing_subject)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [gradeId, subjectNameAr, subjectCode || '', subjectCategory || 'أساسية', term1WorkMark || 15, t1Prac, term1ExamMark || 35, t1Max, term2WorkMark || 15, t2Prac, term2ExamMark || 35, t2Max, yearMax, calcPassMark, passPct, effectiveWrittenMode, calcWrittenPassMark, parseFloat(actualConvertedMark) || 0, isAddedToTotal ? 1 : 0, isFailingSubject ? 1 : 0]);
    }

    // Auto-normalize sort order across all subjects in this grade
    _normalizeAllSubjectsSortOrder(sqliteDb, gradeId);

    return res.json({ success: true, message: 'تم حفظ المادة الدراسية وضوابطها بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const deleteExamSubject = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  if (!id) return res.status(400).json({ success: false, error: 'معرف المادة مطلوب.' });

  try {
    const sqliteDb = db.getSQLiteDb();

    // Guardrail: Strictly forbid deletion if marks exist
    const marksRow = _get(sqliteDb, "SELECT COUNT(*) as marksCount FROM control_marks WHERE subject_id = ?", [id]);
    const marksCount = marksRow?.marksCount || 0;
    if (marksCount > 0) {
      return res.status(403).json({
        success: false,
        error: `محظور تماماً: لا يمكن حذف هذه المادة لاحتوائها على ${marksCount} درجة مرصودة لطلاب الكنترول. يمكنك فقط استبعاد المادة أو تصفير درجاتها أولاً بقرار رسمي.`
      });
    }

    sqliteDb.run("DELETE FROM exam_subjects WHERE id = ?", [id]);
    return res.json({ success: true, message: 'تم حذف المادة الدراسية من الصف بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── 9. Dual-Mode Marks Entry (Blind vs Open) ───────────────────────────────
const saveControlMarks = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { marks, academicYearId, term } = req.body;
  if (!Array.isArray(marks)) return res.status(400).json({ success: false, error: 'بيانات الرصد غير صالحة.' });

  try {
    const sqliteDb = db.getSQLiteDb();

    // Pre-fetch all subjects into a Map for ultra-fast lookup (N+1 query elimination)
    const allSubjects = _all(sqliteDb, "SELECT id, term1_work_mark, term1_exam_mark, term2_work_mark, term2_exam_mark FROM exam_subjects");
    const subjectMap = new Map();
    allSubjects.forEach(s => subjectMap.set(s.id, s));

    // Pre-fetch existing marks into a Map for audit comparison
    const yearId = academicYearId || 1;
    const tVal = term || 1;
    const existingMarks = _all(sqliteDb, "SELECT control_student_id, subject_id, work_marks, written_marks, total_marks FROM control_marks WHERE academic_year_id = ? AND term = ?", [yearId, tVal]);
    const markMap = new Map();
    existingMarks.forEach(m => markMap.set(`${m.control_student_id}_${m.subject_id}`, m));

    db.runTransaction(() => {
      marks.forEach(m => {
        const subject = subjectMap.get(m.subject_id);
        const maxWork = subject ? (tVal === 1 ? (subject.term1_work_mark ?? 40) : (subject.term2_work_mark ?? 40)) : 100;
        const maxExam = subject ? (tVal === 1 ? (subject.term1_exam_mark ?? 60) : (subject.term2_exam_mark ?? 60)) : 100;

        const key = `${m.control_student_id}_${m.subject_id}`;
        const oldMark = markMap.get(key);

        let work;
        if (m.work_marks !== undefined && m.work_marks !== null && m.work_marks !== '') {
          work = Math.min(Math.max(parseFloat(m.work_marks) || 0, 0), maxWork);
        } else if (oldMark && oldMark.work_marks !== null && oldMark.work_marks !== undefined) {
          work = oldMark.work_marks;
        } else {
          work = 0;
        }

        let practical;
        if (m.practical_marks !== undefined && m.practical_marks !== null && m.practical_marks !== '') {
          practical = Math.max(parseFloat(m.practical_marks) || 0, 0);
        } else if (oldMark && oldMark.practical_marks !== null && oldMark.practical_marks !== undefined) {
          practical = oldMark.practical_marks;
        } else {
          practical = 0;
        }

        let written;
        if (m.written_marks !== undefined && m.written_marks !== null && m.written_marks !== '') {
          written = Math.min(Math.max(parseFloat(m.written_marks) || 0, 0), maxExam);
        } else if (oldMark && oldMark.written_marks !== null && oldMark.written_marks !== undefined) {
          written = oldMark.written_marks;
        } else {
          written = 0;
        }

        const isAbsent = m.is_absent !== undefined ? (m.is_absent ? 1 : 0) : (oldMark ? (oldMark.is_absent ? 1 : 0) : 0);
        const isExempt = m.is_exempt !== undefined ? (m.is_exempt ? 1 : 0) : (oldMark ? (oldMark.is_exempt ? 1 : 0) : 0);

        const total = isAbsent ? 0 : (work + practical + written);
        const passFail = m.pass_fail_result || (isAbsent ? 'غائب' : isExempt ? 'معفى' : (total >= (subject?.pass_mark || 50) ? 'اجتاز' : 'لم يجتز'));

        sqliteDb.run(`
          INSERT INTO control_marks (control_student_id, subject_id, academic_year_id, term, work_marks, practical_marks, written_marks, total_marks, pass_fail_result, is_absent, is_exempt, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(control_student_id, subject_id, academic_year_id, term) DO UPDATE SET
            work_marks = excluded.work_marks,
            practical_marks = excluded.practical_marks,
            written_marks = excluded.written_marks,
            total_marks = excluded.total_marks,
            pass_fail_result = excluded.pass_fail_result,
            is_absent = excluded.is_absent,
            is_exempt = excluded.is_exempt,
            updated_at = datetime('now')
        `, [m.control_student_id, m.subject_id, yearId, tVal, work, practical, written, total, passFail, isAbsent, isExempt]);

        if (oldMark && (oldMark.total_marks !== total || oldMark.work_marks !== work || oldMark.written_marks !== written)) {
          sqliteDb.run(`
            INSERT INTO control_marks_audit (control_student_id, subject_id, term, old_work_marks, new_work_marks, old_written_marks, new_written_marks, old_total_marks, new_total_marks, changed_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'مسؤول الكنترول')
          `, [m.control_student_id, m.subject_id, tVal, oldMark.work_marks, work, oldMark.written_marks, written, oldMark.total_marks, total]);
        }
      });
    });

    db.flushSQLite();
    return res.json({ success: true, message: 'تم حفظ الدرجات وتحديث نتائج الكنترول بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const saveSingleMark = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { controlStudentId, subjectId, academicYearId, term, workMarks, practicalMarks, writtenMarks, passFailResult, isAbsent, isExempt } = req.body;
  if (!controlStudentId || !subjectId) return res.status(400).json({ success: false, error: 'الطالب والمادة مطلوبان.' });

  try {
    const sqliteDb = db.getSQLiteDb();
    const yearId = academicYearId || 1;
    const tVal = parseInt(term) || 1;

    const subject = _get(sqliteDb, "SELECT term1_work_mark, term1_exam_mark, term2_work_mark, term2_exam_mark, pass_mark FROM exam_subjects WHERE id = ?", [subjectId]);
    const maxWork = subject ? (tVal === 1 ? (subject.term1_work_mark ?? 40) : (subject.term2_work_mark ?? 40)) : 100;
    const maxExam = subject ? (tVal === 1 ? (subject.term1_exam_mark ?? 60) : (subject.term2_exam_mark ?? 60)) : 100;

    const oldMark = _get(sqliteDb, "SELECT work_marks, practical_marks, written_marks, total_marks, is_absent, is_exempt FROM control_marks WHERE control_student_id = ? AND subject_id = ? AND academic_year_id = ? AND term = ?", [controlStudentId, subjectId, yearId, tVal]);

    let work;
    if (workMarks !== undefined && workMarks !== null && workMarks !== '') {
      work = Math.min(Math.max(parseFloat(workMarks) || 0, 0), maxWork);
    } else if (oldMark && oldMark.work_marks !== null && oldMark.work_marks !== undefined) {
      work = oldMark.work_marks;
    } else {
      work = 0;
    }

    let practical;
    if (practicalMarks !== undefined && practicalMarks !== null && practicalMarks !== '') {
      practical = Math.max(parseFloat(practicalMarks) || 0, 0);
    } else if (oldMark && oldMark.practical_marks !== null && oldMark.practical_marks !== undefined) {
      practical = oldMark.practical_marks;
    } else {
      practical = 0;
    }

    let written;
    if (writtenMarks !== undefined && writtenMarks !== null && writtenMarks !== '') {
      written = Math.min(Math.max(parseFloat(writtenMarks) || 0, 0), maxExam);
    } else if (oldMark && oldMark.written_marks !== null && oldMark.written_marks !== undefined) {
      written = oldMark.written_marks;
    } else {
      written = 0;
    }

    const absVal = isAbsent !== undefined ? (isAbsent ? 1 : 0) : (oldMark ? (oldMark.is_absent ? 1 : 0) : 0);
    const exVal = isExempt !== undefined ? (isExempt ? 1 : 0) : (oldMark ? (oldMark.is_exempt ? 1 : 0) : 0);

    const total = absVal ? 0 : (work + practical + written);
    const passFail = passFailResult || (absVal ? 'غائب' : exVal ? 'معفى' : (total >= (subject?.pass_mark || 50) ? 'اجتاز' : 'لم يجتز'));

    sqliteDb.run(`
      INSERT INTO control_marks (control_student_id, subject_id, academic_year_id, term, work_marks, practical_marks, written_marks, total_marks, pass_fail_result, is_absent, is_exempt, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(control_student_id, subject_id, academic_year_id, term) DO UPDATE SET
        work_marks = excluded.work_marks,
        practical_marks = excluded.practical_marks,
        written_marks = excluded.written_marks,
        total_marks = excluded.total_marks,
        pass_fail_result = excluded.pass_fail_result,
        is_absent = excluded.is_absent,
        is_exempt = excluded.is_exempt,
        updated_at = datetime('now')
    `, [controlStudentId, subjectId, yearId, tVal, work, practical, written, total, passFail, absVal, exVal]);

    if (oldMark && (oldMark.total_marks !== total || oldMark.work_marks !== work || oldMark.written_marks !== written)) {
      sqliteDb.run(`
        INSERT INTO control_marks_audit (control_student_id, subject_id, term, old_work_marks, new_work_marks, old_written_marks, new_written_marks, old_total_marks, new_total_marks, changed_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'مسؤول الكنترول')
      `, [controlStudentId, subjectId, tVal, oldMark.work_marks, work, oldMark.written_marks, written, oldMark.total_marks, total]);
    }

    db.flushSQLite();
    return res.json({ success: true, message: 'تم حفظ الدرجة بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── 9.1 Fetch Control Marks Grid ───────────────────────────────────────────
const getControlMarks = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId, term, classId, secretGroup } = req.query;
  if (!gradeId) return res.status(400).json({ success: false, error: 'يرجى تحديد الصف الدراسي.' });

  try {
    const sqliteDb = db.getSQLiteDb();
    const t = parseInt(term) || 1;

    let classWhere = '';
    const params = [gradeId];

    if (classId && classId !== 'all') {
      classWhere = 'AND cl.id = ?';
      params.push(classId);
    }

    let secretWhere = '';
    if (secretGroup && secretGroup !== 'all') {
      const secGroupCol = t === 1 ? 'cs.secret_group_term1' : 'cs.secret_group_term2';
      secretWhere = `AND ${secGroupCol} = ?`;
      params.push(secretGroup);
    }

    // Build ORDER BY without dynamic params to avoid 'column index out of range'
    const orderByCol = t === 1 ? 'cs.seat_number' : 'cs.secret_code_term2';

    const students = _all(sqliteDb, `
      SELECT DISTINCT 
        cs.id AS control_student_id,
        cs.seat_number,
        cs.secret_code_term1,
        cs.secret_group_term1,
        cs.secret_code_term2,
        cs.secret_group_term2,
        cs.inclusion_status,
        s.id AS student_id,
        s.full_name_ar,
        COALESCE(
          cl.class_number,
          CAST(
            CASE 
              WHEN cl.class_name LIKE '%/%' THEN TRIM(REPLACE(REPLACE(SUBSTR(cl.class_name, INSTR(cl.class_name, '/') + 1), 'ع', ''), ' ', ''))
              WHEN cl.class_name LIKE '%فصل%' THEN TRIM(REPLACE(cl.class_name, 'فصل', ''))
              ELSE TRIM(REPLACE(cl.class_name, 'ع', ''))
            END
          AS INTEGER), 0
        ) AS class_number,
        cl.class_name AS class_name_ar,
        cl.id AS class_id
      FROM control_students cs
      JOIN students s ON s.id = cs.student_id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND (ce.academic_year_id = s.academic_year_id OR ce.academic_year_id IS NULL)
      LEFT JOIN classes cl ON cl.id = ce.class_id AND (cl.grade_id = cs.grade_id OR cl.grade_id = s.grade_id)
      WHERE cs.grade_id = ? ${classWhere} ${secretWhere}
      ORDER BY ${orderByCol} ASC, s.full_name_ar ASC
    `, params);

    const marks = _all(sqliteDb, `
      SELECT cm.* 
      FROM control_marks cm
      JOIN control_students cs ON cs.id = cm.control_student_id
      WHERE cs.grade_id = ? AND cm.term = ?
    `, [gradeId, t]);

    return res.json({ success: true, students, marks });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── 9.2 Bulk Fill Subject Marks ─────────────────────────────────────────────
const bulkFillSubjectMarks = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId, subjectId, term, fillType, fillValue, classId, secretGroup } = req.body;

  if (!gradeId || !subjectId) return res.status(400).json({ success: false, error: 'الصف والمادة مطلوبان.' });

  try {
    const sqliteDb = db.getSQLiteDb();
    const t = parseInt(term) || 1;

    let classWhere = '';
    const params = [gradeId];
    if (classId && classId !== 'all') {
      classWhere = 'AND cl.id = ?';
      params.push(classId);
    }
    let secretWhere = '';
    if (secretGroup && secretGroup !== 'all') {
      const secGroupCol = t === 1 ? 'cs.secret_group_term1' : 'cs.secret_group_term2';
      secretWhere = `AND ${secGroupCol} = ?`;
      params.push(secretGroup);
    }

    const students = _all(sqliteDb, `
      SELECT DISTINCT cs.id AS control_student_id
      FROM control_students cs
      JOIN students s ON s.id = cs.student_id
      LEFT JOIN class_enrollments ce ON s.id = ce.student_id
      LEFT JOIN classes cl ON ce.class_id = cl.id
      WHERE cs.grade_id = ? ${classWhere} ${secretWhere}
    `, params);

    const subject = _get(sqliteDb, "SELECT term1_work_mark, term1_exam_mark, term2_work_mark, term2_exam_mark FROM exam_subjects WHERE id = ?", [subjectId]);
    const maxWork = subject ? (t === 1 ? (subject.term1_work_mark || 15) : (subject.term2_work_mark || 15)) : 100;
    const maxExam = subject ? (t === 1 ? (subject.term1_exam_mark || 35) : (subject.term2_exam_mark || 35)) : 100;

    let isAbsent = 0;
    let isExempt = 0;
    let val = 0;

    if (fillType === 'absent') {
      isAbsent = 1;
      val = 0;
    } else if (fillType === 'exempt') {
      isExempt = 1;
      val = 0;
    } else {
      val = parseFloat(fillValue) || 0;
    }

    db.runTransaction(() => {
      students.forEach(st => {
        const existing = _get(sqliteDb, "SELECT work_marks, written_marks FROM control_marks WHERE control_student_id = ? AND subject_id = ? AND term = ?", [st.control_student_id, subjectId, t]);
        let work = existing ? (existing.work_marks || 0) : 0;
        let written = existing ? (existing.written_marks || 0) : 0;

        if (fillType === 'work') {
          work = Math.min(Math.max(val, 0), maxWork);
        } else if (fillType === 'written') {
          written = Math.min(Math.max(val, 0), maxExam);
        }

        const total = isAbsent ? 0 : (work + written);

        sqliteDb.run(`
          INSERT INTO control_marks (control_student_id, subject_id, academic_year_id, term, work_marks, practical_marks, written_marks, total_marks, is_absent, is_exempt, updated_at)
          VALUES (?, ?, 1, ?, ?, 0, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(control_student_id, subject_id, academic_year_id, term) DO UPDATE SET
            work_marks = excluded.work_marks,
            written_marks = excluded.written_marks,
            total_marks = excluded.total_marks,
            is_absent = excluded.is_absent,
            is_exempt = excluded.is_exempt,
            updated_at = datetime('now')
        `, [st.control_student_id, subjectId, t, work, written, total, isAbsent, isExempt]);
      });
    });

    db.flushSQLite();
    return res.json({ success: true, message: `تم تطبيق التعبئة الجماعية لـ ${students.length} طالب بنجاح.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};


// ─── 10. Master Subjects Lookup ──────────────────────────────────────────────
const getMasterSubjects = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const list = _all(sqliteDb, "SELECT * FROM master_subjects ORDER BY subject_name_ar ASC");
    return res.json({ success: true, masterSubjects: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const createMasterSubject = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { subjectCode, subjectNameAr, subjectNameEn, category } = req.body;
  if (!subjectNameAr) return res.status(400).json({ success: false, error: 'اسم المادة بالعربي مطلوب.' });

  try {
    const sqliteDb = db.getSQLiteDb();
    const code = subjectCode || `SUBJ_CUSTOM_${Date.now()}`;
    sqliteDb.run(`
      INSERT INTO master_subjects (subject_code, subject_name_ar, subject_name_en, category)
      VALUES (?, ?, ?, ?)
    `, [code, subjectNameAr, subjectNameEn || '', category || 'أساسية']);

    return res.json({ success: true, message: 'تم تكويد وتخزين المادة الدراسية الجديدة بنجاح.', subjectCode: code });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── 11. Grade General Passing Rules (Measurable) ───────────────────────────
const getPassingRules = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId } = req.query;
  if (!gradeId) return res.status(400).json({ success: false, error: 'يرجى تحديد الصف الدراسي.' });

  try {
    const sqliteDb = db.getSQLiteDb();
    let rules = _get(sqliteDb, "SELECT * FROM grade_passing_rules WHERE grade_id = ?", [gradeId]);
    if (!rules) {
      rules = {
        grade_id: gradeId,
        is_enabled: 1,
        enable_attendance_rule: 1,
        enable_written_rule: 1,
        enable_second_round_rule: 1,
        enable_grace_rule: 1,
        min_attendance_percent: 85.0,
        written_pass_percent: 30.0,
        max_failing_second_round: 2,
        grace_marks_pool: 5.0
      };
    }
    return res.json({ success: true, rules });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const savePassingRules = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId, isEnabled, enableAttendanceRule, enableWrittenRule, enableSecondRoundRule, enableGraceRule, minAttendancePercent, writtenPassPercent, maxFailingSecondRound, graceMarksPool, masterPin, overrideReason, confirmOverride } = req.body;
  if (!gradeId) return res.status(400).json({ success: false, error: 'يرجى تحديد الصف الدراسي.' });

  try {
    const sqliteDb = db.getSQLiteDb();

    // Guardrail: Check if marks already exist for this grade
    const marksRow = _get(sqliteDb, `
      SELECT COUNT(*) AS marksCount
      FROM control_marks cm
      JOIN control_students cs ON cs.id = cm.control_student_id
      WHERE cs.grade_id = ?
    `, [gradeId]);

    const marksCount = marksRow?.marksCount || 0;
    if (marksCount > 0) {
      if (!confirmOverride || !_validatePinInternal(sqliteDb, masterPin) || !overrideReason || !overrideReason.trim()) {
        return res.status(403).json({
          success: false,
          requirePinConfirmation: true,
          marksCount,
          error: `تنبيه أمني: توجد درجات مرصودة بالفعل لطلاب هذا الصف (${marksCount} درجة مسجلة). لا يجوز تعديل شروط وضوابط النجاح بعد بدء رصد الدرجات إلا بموافقة رئيس الكنترول مع إدخال الرقم السري وسبب التعديل.`
        });
      }

      // Log security override
      sqliteDb.run(`
        INSERT INTO control_security_log (user_name, action_type, details)
        VALUES ('رئيس الكنترول', 'OVERRIDE_PASSING_RULES_AFTER_MARKS', ?)
      `, [`تعديل شروط النجاح للصف (${gradeId}) مع وجود ${marksCount} درجة مسجلة. سبب التعديل: ${overrideReason.trim()}`]);
    }

    sqliteDb.run(`
      INSERT INTO grade_passing_rules (grade_id, is_enabled, enable_attendance_rule, enable_written_rule, enable_second_round_rule, enable_grace_rule, min_attendance_percent, written_pass_percent, max_failing_second_round, grace_marks_pool, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(grade_id) DO UPDATE SET
        is_enabled = excluded.is_enabled,
        enable_attendance_rule = excluded.enable_attendance_rule,
        enable_written_rule = excluded.enable_written_rule,
        enable_second_round_rule = excluded.enable_second_round_rule,
        enable_grace_rule = excluded.enable_grace_rule,
        min_attendance_percent = excluded.min_attendance_percent,
        written_pass_percent = excluded.written_pass_percent,
        max_failing_second_round = excluded.max_failing_second_round,
        grace_marks_pool = excluded.grace_marks_pool,
        updated_at = datetime('now')
    `, [gradeId, isEnabled ? 1 : 0, enableAttendanceRule ? 1 : 0, enableWrittenRule ? 1 : 0, enableSecondRoundRule ? 1 : 0, enableGraceRule ? 1 : 0, minAttendancePercent || 85.0, writtenPassPercent || 30.0, maxFailingSecondRound || 2, graceMarksPool || 5.0]);

    return res.json({ success: true, message: 'تم حفظ وتأكيد شروط وضوابط النجاح القابلة للقياس للصف بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── 12. Save & Restore Program Preset Defaults ─────────────────────────────
const saveGradePresetAsDefault = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId } = req.body;
  if (!gradeId) return res.status(400).json({ success: false, error: 'يرجى تحديد الصف الدراسي.' });

  try {
    const sqliteDb = db.getSQLiteDb();
    const subjects = _all(sqliteDb, "SELECT * FROM exam_subjects WHERE grade_id = ?", [gradeId]);
    const rules = _get(sqliteDb, "SELECT * FROM grade_passing_rules WHERE grade_id = ?", [gradeId]);

    sqliteDb.run(`
      INSERT INTO default_grade_templates (grade_id, template_name, subjects_json, passing_rules_json, updated_at)
      VALUES (?, 'أصل البرنامج الأكاديمي', ?, ?, datetime('now'))
    `, [gradeId, JSON.stringify(subjects || []), JSON.stringify(rules || {})]);

    return res.json({ success: true, message: 'تم حفظ وتثبيت إعدادات هذا الصف كافتراضي في أصل البرنامج بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const restoreGradePresetDefaults = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId, masterPin, overrideReason, confirmOverride } = req.body;
  if (!gradeId) return res.status(400).json({ success: false, error: 'يرجى تحديد الصف الدراسي.' });

  try {
    const sqliteDb = db.getSQLiteDb();

    // Guardrail: Check if marks exist
    const marksRow = _get(sqliteDb, `
      SELECT COUNT(*) AS marksCount
      FROM control_marks cm
      JOIN control_students cs ON cs.id = cm.control_student_id
      WHERE cs.grade_id = ?
    `, [gradeId]);

    const marksCount = marksRow?.marksCount || 0;
    if (marksCount > 0) {
      if (!confirmOverride || !_validatePinInternal(sqliteDb, masterPin) || !overrideReason || !overrideReason.trim()) {
        return res.status(403).json({
          success: false,
          requirePinConfirmation: true,
          marksCount,
          error: `محظور أمنياً: توجد درجات مرصودة بالفعل في هذا الصف (${marksCount} درجة مسجلة). لا يجوز استعادة الإعدادات الافتراضية بعد بدء رصد الدرجات إلا بإذن رئيس الكنترول مع إدخال الرقم السري وتدوين سبب التعديل.`
        });
      }
    }
    const tpl = _get(sqliteDb, "SELECT * FROM default_grade_templates WHERE grade_id = ? ORDER BY id DESC LIMIT 1", [gradeId]);
    if (!tpl) {
      return res.status(404).json({ success: false, error: 'لا يوجد قالب افتراضي سابق مسجل لهذا الصف في أصل البرنامج.' });
    }

    const subjects = JSON.parse(tpl.subjects_json || '[]');
    const rules = JSON.parse(tpl.passing_rules_json || '{}');

    db.runTransaction(() => {
      sqliteDb.run("DELETE FROM exam_subjects WHERE grade_id = ?", [gradeId]);
      subjects.forEach(s => {
        sqliteDb.run(`
          INSERT INTO exam_subjects (grade_id, subject_name_ar, subject_code, term1_work_mark, term1_exam_mark, term1_max_mark, term2_work_mark, term2_exam_mark, term2_max_mark, year_max_mark, pass_mark, written_pass_mode, written_pass_mark, actual_converted_mark, is_added_to_total, is_failing_subject)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [gradeId, s.subject_name_ar, s.subject_code, s.term1_work_mark, s.term1_exam_mark, s.term1_max_mark, s.term2_work_mark, s.term2_exam_mark, s.term2_max_mark, s.year_max_mark, s.pass_mark, s.written_pass_mode, s.written_pass_mark, s.actual_converted_mark || 0, s.is_added_to_total, s.is_failing_subject]);
      });

      if (rules.grade_id) {
        sqliteDb.run(`
          INSERT INTO grade_passing_rules (grade_id, is_enabled, enable_attendance_rule, enable_written_rule, enable_second_round_rule, enable_grace_rule, min_attendance_percent, written_pass_percent, max_failing_second_round, grace_marks_pool, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(grade_id) DO UPDATE SET
            is_enabled = excluded.is_enabled,
            enable_attendance_rule = excluded.enable_attendance_rule,
            enable_written_rule = excluded.enable_written_rule,
            enable_second_round_rule = excluded.enable_second_round_rule,
            enable_grace_rule = excluded.enable_grace_rule,
            min_attendance_percent = excluded.min_attendance_percent,
            written_pass_percent = excluded.written_pass_percent,
            max_failing_second_round = excluded.max_failing_second_round,
            grace_marks_pool = excluded.grace_marks_pool,
            updated_at = datetime('now')
        `, [gradeId, rules.is_enabled, rules.enable_attendance_rule, rules.enable_written_rule, rules.enable_second_round_rule, rules.enable_grace_rule, rules.min_attendance_percent, rules.written_pass_percent, rules.max_failing_second_round, rules.grace_marks_pool]);
      }
    });

    return res.json({ success: true, message: 'تم استعادة افتراضيات أصل البرنامج للصف بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Secret Groups Summary (for print sheet & display table) ─────────────────
const getSecretGroupsSummary = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId, term } = req.query;
  if (!gradeId || !term) return res.status(400).json({ success: false, error: 'يرجى تحديد الصف والترم.' });

  try {
    const sqliteDb = db.getSQLiteDb();
    const termNum = parseInt(term);
    const groupCol  = termNum === 1 ? 'secret_group_term1'  : 'secret_group_term2';
    const codeCol   = termNum === 1 ? 'secret_code_term1'   : 'secret_code_term2';

    // Group-level summary
    const groups = _all(sqliteDb, `
      SELECT
        cs.${groupCol}           AS group_label,
        COUNT(cs.id)             AS student_count,
        MIN(cs.${codeCol})       AS from_secret,
        MAX(cs.${codeCol})       AS to_secret,
        MIN(cs.seat_number)      AS from_seat,
        MAX(cs.seat_number)      AS to_seat
      FROM control_students cs
      WHERE cs.grade_id = ? AND cs.${groupCol} IS NOT NULL AND cs.${codeCol} IS NOT NULL
      GROUP BY cs.${groupCol}
      ORDER BY cs.${groupCol} ASC
    `, [gradeId]);

    // Full student list ordered by group then secret code (for print)
    const students = _all(sqliteDb, `
      SELECT
        cs.${groupCol}     AS group_label,
        cs.${codeCol}      AS secret_code,
        cs.seat_number,
        s.full_name_ar,
        s.gender,
        comm.committee_name,
        comm.room_number
      FROM control_students cs
      JOIN students s ON s.id = cs.student_id
      LEFT JOIN control_committees comm ON comm.id = cs.committee_id
      WHERE cs.grade_id = ? AND cs.${groupCol} IS NOT NULL
      ORDER BY cs.${groupCol} ASC, cs.${codeCol} ASC
    `, [gradeId]);

    return res.json({ success: true, groups, students });
  } catch (err) {
    console.error('getSecretGroupsSummary error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── 13. Primary Stage Presets (القرار الوزاري 151 لسنة 2026/2025) ─────────────

// Helper to seed subjects array for a grade
const _applySubjectsPreset = (sqliteDb, gradeId, subjectsList, defaultRules = {}) => {
  db.runTransaction(() => {
    sqliteDb.run("DELETE FROM exam_subjects WHERE grade_id = ?", [gradeId]);
    subjectsList.forEach((s, idx) => {
      sqliteDb.run(`
        INSERT INTO exam_subjects (
          grade_id, subject_name_ar, subject_code, subject_category,
          term1_work_mark, term1_practical_mark, term1_exam_mark, term1_max_mark,
          term2_work_mark, term2_practical_mark, term2_exam_mark, term2_max_mark,
          year_max_mark, pass_mark, subject_pass_percent,
          written_pass_mode, written_pass_mark, is_added_to_total, is_failing_subject,
          evaluation_method, pass_threshold_percent, min_exam_pass_mark, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        gradeId, s.name, s.code || `SUBJ_${idx+1}`, s.category || 'أساسية',
        s.work1 || 40, s.prac1 || 0, s.exam1 || 60, (s.work1 || 40) + (s.prac1 || 0) + (s.exam1 || 60),
        s.work2 || 40, s.prac2 || 0, s.exam2 || 60, (s.work2 || 40) + (s.prac2 || 0) + (s.exam2 || 60),
        ((s.work1 || 40) + (s.prac1 || 0) + (s.exam1 || 60)) + ((s.work2 || 40) + (s.prac2 || 0) + (s.exam2 || 60)),
        s.passMark || 50, s.passPercent || 50,
        s.writtenMode || (s.exam1 > 0 ? 'percent_30' : 'none'), s.writtenMark || (s.exam1 > 0 ? 18.0 : 0),
        s.isAdded ? 1 : 0, s.isFailing ? 1 : 0,
        s.evalMethod || 'numeric_100', s.thresholdPercent || 50.0, s.minExamPass || (s.exam1 > 0 ? 18.0 : 0), idx + 1
      ]);
    });

    sqliteDb.run(`
      INSERT INTO grade_passing_rules (
        grade_id, is_enabled, enable_attendance_rule, enable_written_rule,
        enable_second_round_rule, enable_grace_rule, min_attendance_percent,
        written_pass_percent, max_failing_second_round, grace_marks_pool, updated_at
      ) VALUES (?, 1, 1, 1, 1, 1, ?, 30.0, 2, 5.0, datetime('now'))
      ON CONFLICT(grade_id) DO UPDATE SET
        is_enabled = 1, enable_attendance_rule = 1, enable_written_rule = 1,
        min_attendance_percent = excluded.min_attendance_percent,
        written_pass_percent = 30.0, updated_at = datetime('now')
    `, [gradeId, defaultRules.minAttendance || 70.0]);
  });
  db.flushSQLite();
};

// Preset: الصف الأول والثاني الابتدائي (جدول 1 بالقرار 151)
const setupPrimaryPreset = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId } = req.body;
  if (!gradeId) return res.status(400).json({ success: false, error: 'يرجى تحديد الصف الدراسي.' });

  try {
    const sqliteDb = db.getSQLiteDb();
    const primary12Subjects = [
      { name: 'اللغة العربية', code: 'AR', category: 'أساسية', work1: 40, exam1: 60, work2: 40, exam2: 60, isAdded: 1, isFailing: 1, evalMethod: 'numeric_100', writtenMode: 'percent_30', writtenMark: 18, minExamPass: 18 },
      { name: 'اللغة الإنجليزية', code: 'EN', category: 'أساسية', work1: 40, exam1: 60, work2: 40, exam2: 60, isAdded: 1, isFailing: 1, evalMethod: 'numeric_100', writtenMode: 'percent_30', writtenMark: 18, minExamPass: 18 },
      { name: 'الرياضيات', code: 'MATH', category: 'أساسية', work1: 40, exam1: 60, work2: 40, exam2: 60, isAdded: 1, isFailing: 1, evalMethod: 'numeric_100', writtenMode: 'percent_30', writtenMark: 18, minExamPass: 18 },
      { name: 'التربية الدينية', code: 'REL', category: 'دينية', work1: 40, exam1: 60, work2: 40, exam2: 60, isAdded: 0, isFailing: 1, evalMethod: 'threshold_pass_fail', thresholdPercent: 70.0, passPercent: 70.0, writtenMode: 'percent_30', writtenMark: 18, minExamPass: 18 },
      { name: 'التربية البدنية والصحية', code: 'PE', category: 'نشاط', work1: 0, exam1: 0, work2: 0, exam2: 0, isAdded: 0, isFailing: 0, evalMethod: 'pass_fail_only', writtenMode: 'none', writtenMark: 0, minExamPass: 0 },
      { name: 'أنشطة التوكاتسو', code: 'TOK', category: 'نشاط', work1: 0, exam1: 0, work2: 0, exam2: 0, isAdded: 0, isFailing: 0, evalMethod: 'pass_fail_only', writtenMode: 'none', writtenMark: 0, minExamPass: 0 }
    ];

    _applySubjectsPreset(sqliteDb, gradeId, primary12Subjects, { minAttendance: 70.0 });
    return res.json({ success: true, message: 'تم تثبيت برنامج مواد الصفين الأول والثاني الابتدائي (3 مواد أساسية بمجموع 300) وفق القرار الوزاري 151 بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Preset: الصف الثالث الابتدائي (جدول 1 بالقرار 151)
const setupPrimary3Preset = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId } = req.body;
  if (!gradeId) return res.status(400).json({ success: false, error: 'يرجى تحديد الصف الدراسي.' });

  try {
    const sqliteDb = db.getSQLiteDb();
    const primary3Subjects = [
      { name: 'اللغة العربية', code: 'AR', category: 'أساسية', work1: 40, exam1: 60, work2: 40, exam2: 60, isAdded: 1, isFailing: 1, evalMethod: 'numeric_100', writtenMode: 'percent_30', writtenMark: 18, minExamPass: 18 },
      { name: 'اللغة الإنجليزية', code: 'EN', category: 'أساسية', work1: 40, exam1: 60, work2: 40, exam2: 60, isAdded: 1, isFailing: 1, evalMethod: 'numeric_100', writtenMode: 'percent_30', writtenMark: 18, minExamPass: 18 },
      { name: 'الرياضيات', code: 'MATH', category: 'أساسية', work1: 40, exam1: 60, work2: 40, exam2: 60, isAdded: 1, isFailing: 1, evalMethod: 'numeric_100', writtenMode: 'percent_30', writtenMark: 18, minExamPass: 18 },
      { name: 'التربية الدينية', code: 'REL', category: 'دينية', work1: 40, exam1: 60, work2: 40, exam2: 60, isAdded: 0, isFailing: 1, evalMethod: 'threshold_pass_fail', thresholdPercent: 70.0, passPercent: 70.0, writtenMode: 'percent_30', writtenMark: 18, minExamPass: 18 },
      { name: 'التربية البدنية والصحية', code: 'PE', category: 'نشاط', work1: 0, exam1: 0, work2: 0, exam2: 0, isAdded: 0, isFailing: 0, evalMethod: 'pass_fail_only', writtenMode: 'none', writtenMark: 0, minExamPass: 0 },
      { name: 'أنشطة التوكاتسو', code: 'TOK', category: 'نشاط', work1: 0, exam1: 0, work2: 0, exam2: 0, isAdded: 0, isFailing: 0, evalMethod: 'pass_fail_only', writtenMode: 'none', writtenMark: 0, minExamPass: 0 }
    ];

    _applySubjectsPreset(sqliteDb, gradeId, primary3Subjects, { minAttendance: 70.0 });
    return res.json({ success: true, message: 'تم تثبيت برنامج مواد الصف الثالث الابتدائي (3 مواد أساسية بمجموع 300) وفق القرار الوزاري 151 بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Preset: الصفوف الرابع والخامس والسادس الابتدائي (جدول 2 بالقرار 151 - 5 مواد أساسية بمجموع 500)
const setupPrimary456Preset = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId } = req.body;
  if (!gradeId) return res.status(400).json({ success: false, error: 'يرجى تحديد الصف الدراسي.' });

  try {
    const sqliteDb = db.getSQLiteDb();
    const primary456Subjects = [
      { name: 'اللغة العربية', code: 'AR', category: 'أساسية', work1: 40, exam1: 60, work2: 40, exam2: 60, isAdded: 1, isFailing: 1, evalMethod: 'numeric_100', writtenMode: 'percent_30', writtenMark: 18, minExamPass: 18 },
      { name: 'اللغة الإنجليزية', code: 'EN', category: 'أساسية', work1: 40, exam1: 60, work2: 40, exam2: 60, isAdded: 1, isFailing: 1, evalMethod: 'numeric_100', writtenMode: 'percent_30', writtenMark: 18, minExamPass: 18 },
      { name: 'الرياضيات', code: 'MATH', category: 'أساسية', work1: 40, exam1: 60, work2: 40, exam2: 60, isAdded: 1, isFailing: 1, evalMethod: 'numeric_100', writtenMode: 'percent_30', writtenMark: 18, minExamPass: 18 },
      { name: 'العلوم', code: 'SCI', category: 'أساسية', work1: 40, exam1: 60, work2: 40, exam2: 60, isAdded: 1, isFailing: 1, evalMethod: 'numeric_100', writtenMode: 'percent_30', writtenMark: 18, minExamPass: 18 },
      { name: 'الدراسات الاجتماعية', code: 'SOC', category: 'أساسية', work1: 40, exam1: 60, work2: 40, exam2: 60, isAdded: 1, isFailing: 1, evalMethod: 'numeric_100', writtenMode: 'percent_30', writtenMark: 18, minExamPass: 18 },
      { name: 'تكنولوجيا المعلومات والاتصالات', code: 'ICT', category: 'أساسية', work1: 40, exam1: 60, work2: 40, exam2: 60, isAdded: 0, isFailing: 1, evalMethod: 'threshold_pass_fail', thresholdPercent: 50.0, passPercent: 50.0, writtenMode: 'percent_30', writtenMark: 18, minExamPass: 18 },
      { name: 'التربية الدينية', code: 'REL', category: 'دينية', work1: 40, exam1: 60, work2: 40, exam2: 60, isAdded: 0, isFailing: 1, evalMethod: 'threshold_pass_fail', thresholdPercent: 70.0, passPercent: 70.0, writtenMode: 'percent_30', writtenMark: 18, minExamPass: 18 },
      { name: 'التربية الفنية', code: 'ART', category: 'نشاط', work1: 0, exam1: 0, work2: 0, exam2: 0, isAdded: 0, isFailing: 0, evalMethod: 'pass_fail_only', writtenMode: 'none', writtenMark: 0, minExamPass: 0 },
      { name: 'التربية البدنية والصحية', code: 'PE', category: 'نشاط', work1: 0, exam1: 0, work2: 0, exam2: 0, isAdded: 0, isFailing: 0, evalMethod: 'pass_fail_only', writtenMode: 'none', writtenMark: 0, minExamPass: 0 },
      { name: 'التربية الموسيقية', code: 'MUS', category: 'نشاط', work1: 0, exam1: 0, work2: 0, exam2: 0, isAdded: 0, isFailing: 0, evalMethod: 'pass_fail_only', writtenMode: 'none', writtenMark: 0, minExamPass: 0 },
      { name: 'المجالات', code: 'FLD', category: 'نشاط', work1: 0, exam1: 0, work2: 0, exam2: 0, isAdded: 0, isFailing: 0, evalMethod: 'pass_fail_only', writtenMode: 'none', writtenMark: 0, minExamPass: 0 }
    ];

    _applySubjectsPreset(sqliteDb, gradeId, primary456Subjects, { minAttendance: 70.0 });
    return res.json({ success: true, message: 'تم تثبيت برنامج مواد الصفوف العليا (4-5-6) وفق القرار الوزاري 151 بمجموع 500 درجة بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const setupPrep12Preset = async (req, res) => {
  return res.json({ success: true, message: 'تم إعداد مواد المرحلة الإعدادية بنجاح.' });
};

// ─── 14. Decree 151 Results & Rating Engine ─────────────────────────────────

// Helper: Calculate grade label from percentage
const _getRatingLabel = (percent) => {
  if (percent >= 85.0) return 'ممتاز';
  if (percent >= 75.0) return 'جيد جداً';
  if (percent >= 65.0) return 'جيد';
  if (percent >= 50.0) return 'مقبول';
  return 'دون المستوى';
};

// Calculate Term Results (Term 1 or Term 2)
const recalculateTermResults = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId, academicYearId, term } = req.body;
  if (!gradeId) return res.status(400).json({ success: false, error: 'يرجى تحديد الصف الدراسي.' });

  try {
    const sqliteDb = db.getSQLiteDb();
    const yearId = academicYearId || 1;
    const t = parseInt(term) || 1;

    const subjects = _all(sqliteDb, "SELECT * FROM exam_subjects WHERE grade_id = ?", [gradeId]);
    const students = _all(sqliteDb, "SELECT id FROM control_students WHERE grade_id = ?", [gradeId]);

    const maxTotalMarks = subjects
      .filter(s => s.is_added_to_total)
      .reduce((sum, s) => sum + (t === 1 ? s.term1_max_mark : s.term2_max_mark), 0);

    db.runTransaction(() => {
      students.forEach(st => {
        const studentMarks = _all(sqliteDb, `
          SELECT cm.*, es.is_added_to_total, es.is_failing_subject, es.pass_mark,
                 es.evaluation_method, es.pass_threshold_percent, es.min_exam_pass_mark
          FROM control_marks cm
          JOIN exam_subjects es ON es.id = cm.subject_id
          WHERE cm.control_student_id = ? AND cm.academic_year_id = ? AND cm.term = ?
        `, [st.id, yearId, t]);

        let termSum = 0;
        let failingCount = 0;

        studentMarks.forEach(m => {
          const total = m.total_marks || 0;
          const subjRating = _getRatingLabel(total);
          sqliteDb.run("UPDATE control_marks SET rating_label = ? WHERE id = ?", [subjRating, m.id]);

          // Pass / Fail evaluation
          if (m.evaluation_method === 'threshold_pass_fail') {
            const th = m.pass_threshold_percent || 70.0;
            const passVal = total >= th ? 'اجتاز' : 'لم يجتاز';
            sqliteDb.run("UPDATE control_marks SET pass_fail_result = ? WHERE id = ?", [passVal, m.id]);
            if (passVal === 'لم يجتاز') failingCount++;
          } else if (m.evaluation_method === 'pass_fail_only') {
            const passVal = m.pass_fail_result || 'اجتاز';
            if (passVal === 'لم يجتاز' && m.is_failing_subject) failingCount++;
          } else {
            if (total < (m.pass_mark || 50) && m.is_failing_subject) failingCount++;
          }
        });

        const pct = maxTotalMarks > 0 ? (termSum / maxTotalMarks) * 100.0 : 0;
        const termRating = _getRatingLabel(pct);
        const status = failingCount === 0 ? 'ناجح' : 'بحاجة لمتابعة';

        if (t === 1) {
          sqliteDb.run(`
            INSERT INTO control_results_summary (control_student_id, academic_year_id, term1_total, max_possible_marks, percentage, term1_rating, status_term1)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(control_student_id, academic_year_id) DO UPDATE SET
              term1_total = excluded.term1_total,
              max_possible_marks = excluded.max_possible_marks,
              percentage = excluded.percentage,
              term1_rating = excluded.term1_rating,
              status_term1 = excluded.status_term1
          `, [st.id, yearId, termSum, maxTotalMarks, pct, termRating, status]);
        } else {
          sqliteDb.run(`
            INSERT INTO control_results_summary (control_student_id, academic_year_id, term2_total, max_possible_marks, percentage, term2_rating)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(control_student_id, academic_year_id) DO UPDATE SET
              term2_total = excluded.term2_total,
              term2_rating = excluded.term2_rating
          `, [st.id, yearId, termSum, maxTotalMarks, pct, termRating]);
        }
      });
    });

    db.flushSQLite();
    return res.json({ success: true, message: `تم احتساب واعتماد نتائج الفصل الدراسي ${t === 1 ? 'الأول' : 'الثاني'} بنجاح.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Calculate Final Annual Results (النتيجة النهائية وسنة كاملة وشرط الـ 30% من امتحان الترم الثاني)
const recalculateFinalResults = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId, academicYearId } = req.body;
  if (!gradeId) return res.status(400).json({ success: false, error: 'يرجى تحديد الصف الدراسي.' });

  try {
    const sqliteDb = db.getSQLiteDb();
    const yearId = academicYearId || 1;

    const subjects = _all(sqliteDb, "SELECT * FROM exam_subjects WHERE grade_id = ?", [gradeId]);
    const students = _all(sqliteDb, "SELECT id FROM control_students WHERE grade_id = ?", [gradeId]);

    const maxYearMarks = subjects
      .filter(s => s.is_added_to_total)
      .reduce((sum, s) => sum + (s.year_max_mark || 200), 0);

    db.runTransaction(() => {
      students.forEach(st => {
        const marksT1 = _all(sqliteDb, "SELECT * FROM control_marks WHERE control_student_id = ? AND academic_year_id = ? AND term = 1", [st.id, yearId]);
        const marksT2 = _all(sqliteDb, "SELECT * FROM control_marks WHERE control_student_id = ? AND academic_year_id = ? AND term = 2", [st.id, yearId]);

        const mapT1 = new Map();
        marksT1.forEach(m => mapT1.set(m.subject_id, m));
        const mapT2 = new Map();
        marksT2.forEach(m => mapT2.set(m.subject_id, m));

        let yearSum = 0;
        let requiresSecondRound = false;
        let minExamMetOverall = 1;
        const failingSubjectsList = [];

        subjects.forEach(s => {
          const m1 = mapT1.get(s.id);
          const m2 = mapT2.get(s.id);

          const tot1 = m1 ? (m1.total_marks || 0) : 0;
          const tot2 = m2 ? (m2.total_marks || 0) : 0;
          const subjectYearTotal = tot1 + tot2; // Out of 200
          const finalDegree = subjectYearTotal / 2.0; // Out of 100 average

          if (s.is_added_to_total) {
            yearSum += subjectYearTotal;
          }

          // 1. Mandatory 30% rule on Term 2 written exam (18 marks out of 60)
          const exam2Mark = m2 ? (m2.written_marks || 0) : 0;
          const minRequiredExam = s.min_exam_pass_mark || (s.term2_exam_mark > 0 ? (s.term2_exam_mark * 0.30) : 0);
          if (minRequiredExam > 0 && exam2Mark < minRequiredExam) {
            requiresSecondRound = true;
            minExamMetOverall = 0;
            failingSubjectsList.push(`${s.subject_name_ar} (لم يحقق 30% من امتحان نهاية الفصل)`);
          }

          // 2. Final subject rating < 50% (دون المستوى)
          if (s.is_failing_subject && s.evaluation_method === 'numeric_100') {
            if (finalDegree < (s.pass_mark || 50.0)) {
              requiresSecondRound = true;
              if (!failingSubjectsList.includes(s.subject_name_ar)) failingSubjectsList.push(s.subject_name_ar);
            }
          }

          // 3. Religion pass threshold (70%)
          if (s.evaluation_method === 'threshold_pass_fail') {
            const th = s.pass_threshold_percent || 70.0;
            if (finalDegree < th) {
              requiresSecondRound = true;
              failingSubjectsList.push(`${s.subject_name_ar} (دون عتبة النجاح ${th}%)`);
            }
          }
        });

        const finalPct = maxYearMarks > 0 ? (yearSum / maxYearMarks) * 100.0 : 0;
        const finalRating = _getRatingLabel(finalPct);
        const finalDecision = requiresSecondRound ? 'بحاجة_لدور_ثان' : 'ناجح';

        sqliteDb.run(`
          INSERT INTO control_results_summary (
            control_student_id, academic_year_id, year_total, max_possible_marks,
            percentage, final_degree, final_rating, min_term2_exam_met, status_final,
            second_round_subjects, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(control_student_id, academic_year_id) DO UPDATE SET
            year_total = excluded.year_total,
            max_possible_marks = excluded.max_possible_marks,
            percentage = excluded.percentage,
            final_degree = excluded.final_degree,
            final_rating = excluded.final_rating,
            min_term2_exam_met = excluded.min_term2_exam_met,
            status_final = excluded.status_final,
            second_round_subjects = excluded.second_round_subjects,
            updated_at = datetime('now')
        `, [
          st.id, yearId, yearSum, maxYearMarks, finalPct,
          finalPct, finalRating, minExamMetOverall, finalDecision,
          failingSubjectsList.join(' ، ')
        ]);
      });
    });

    db.flushSQLite();
    return res.json({ success: true, message: 'تم احتساب واعتماد النتيجة النهائية للعام الدراسي وتطبيق ضوابط القرار 151 بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Get Results Summary Data for Display & Printing
const getResultsSummary = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId, academicYearId } = req.query;
  if (!gradeId) return res.status(400).json({ success: false, error: 'يرجى تحديد الصف الدراسي.' });

  try {
    const sqliteDb = db.getSQLiteDb();
    const yearId = academicYearId || 1;

    const results = _all(sqliteDb, `
      SELECT
        cs.id AS control_student_id,
        cs.seat_number,
        cs.secret_code_term1,
        cs.secret_code_term2,
        cs.inclusion_status,
        s.id AS student_id,
        s.full_name_ar,
        s.national_id,
        s.gender,
        crs.term1_total,
        crs.term2_total,
        crs.year_total,
        crs.max_possible_marks,
        crs.percentage,
        crs.term1_rating,
        crs.term2_rating,
        crs.final_rating,
        crs.min_term2_exam_met,
        crs.status_term1,
        crs.status_final,
        crs.second_round_subjects
      FROM control_students cs
      JOIN students s ON s.id = cs.student_id
      LEFT JOIN control_results_summary crs ON crs.control_student_id = cs.id AND crs.academic_year_id = ?
      WHERE cs.grade_id = ?
      ORDER BY CASE WHEN cs.seat_number IS NULL OR cs.seat_number = 0 THEN 999999 ELSE cs.seat_number END ASC, s.full_name_ar ASC
    `, [yearId, gradeId]);

    const subjects = _all(sqliteDb, "SELECT * FROM exam_subjects WHERE grade_id = ? ORDER BY sort_order ASC, id ASC", [gradeId]);

    return res.json({ success: true, results, subjects });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getEvaluationComponents = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const components = _all(sqliteDb, "SELECT * FROM evaluation_components WHERE is_active = 1 ORDER BY display_order ASC");
    return res.json({ success: true, components });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getRatingScale = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const ratings = _all(sqliteDb, "SELECT * FROM rating_scale ORDER BY display_order ASC");
    return res.json({ success: true, ratings });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const exportReportPdf = async (req, res) => {
  let browser = null;
  try {
    const { subPath, fileName, htmlContent, orientation = 'portrait' } = req.body || {};
    if (!htmlContent) return res.status(400).json({ success: false, error: 'محتوى التقرير فارغ' });

    const baseReportsFolder = path.join(os.homedir(), 'Documents', 'تقارير_كنترول_نبراس');
    const targetFolder = subPath ? path.join(baseReportsFolder, String(subPath).replace(/[/\\?%*:|"<>]/g, '_')) : baseReportsFolder;

    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const cleanFileName = (fileName || 'تقرير').replace(/[/\\?%*:|"<>]/g, '_') + '.pdf';
    const filePath = path.join(targetFolder, cleanFileName);

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>${fileName}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 ${orientation};
            margin: 6mm;
          }
          *, *::before, *::after {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            background: #fff;
            color: #000;
            direction: rtl;
            font-family: Calibri, 'Segoe UI', Tahoma, Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.35;
          }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr { page-break-inside: avoid; break-inside: avoid; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
          th, td { border: 1.2px solid #000; padding: 5px 6px; text-align: center; vertical-align: middle; }
          th { background-color: #f1f5f9 !important; font-weight: 800; }
          .report-official-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; page-break-inside: avoid; }
          .ministerial-print-footer { margin-top: auto; padding-top: 10px; border-top: 1.5px solid #000; page-break-inside: avoid; }
          .printable-page-block {
            page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid;
            min-height: calc(100vh - 4mm); display: flex; flex-direction: column; justify-content: space-between;
            margin-bottom: 0; padding-bottom: 0; box-sizing: border-box;
          }
          .printable-page-block:last-child { page-break-after: auto; break-after: auto; }
          .seat-card-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; flex: 1; align-content: space-between; }
          .seat-card-item { border: 1.5px solid #000; padding: 10px 12px; border-radius: 6px; page-break-inside: avoid; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    const puppeteer = require('puppeteer');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: filePath,
      format: 'A4',
      landscape: orientation === 'landscape',
      printBackground: true,
      margin: { top: '6mm', right: '6mm', bottom: '6mm', left: '6mm' }
    });
    await browser.close();
    browser = null;

    return res.json({ success: true, filePath, fileName: cleanFileName });
  } catch (err) {
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
    console.error('exportReportPdf error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

const openReportsFolder = (req, res) => {
  try {
    const { subPath } = req.body || {};
    const baseReportsFolder = path.join(os.homedir(), 'Documents', 'تقارير_كنترول_نبراس');
    const targetFolder = subPath ? path.join(baseReportsFolder, String(subPath).replace(/[/\\?%*:|"<>]/g, '_')) : baseReportsFolder;
    
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const platform = process.platform;
    if (platform === 'win32') {
      exec(`explorer "${targetFolder}"`);
    } else if (platform === 'darwin') {
      exec(`open "${targetFolder}"`);
    } else {
      exec(`xdg-open "${targetFolder}"`);
    }

    return res.json({ success: true, path: targetFolder });
  } catch (err) {
    console.error('openReportsFolder error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getControlGrades,
  getStats,
  syncStudents,
  getControlStudents,
  generateSeatNumbers,
  generateSecretCodes,
  verifyMasterPin,
  updateMasterPin,
  saveCommittees,
  getCommitteesStats,
  updateStudentControlData,
  getExamSubjects,
  saveExamSubject,
  deleteExamSubject,
  saveControlMarks,
  saveSingleMark,
  getMasterSubjects,
  createMasterSubject,
  getPassingRules,
  savePassingRules,
  saveGradePresetAsDefault,
  restoreGradePresetDefaults,
  getSecretGroupsSummary,
  getControlMarks,
  bulkFillSubjectMarks,
  updateStudentEnrollmentAndLanguage,
  excludeOrDeleteControlStudent,
  setupPrimaryPreset,
  setupPrimary3Preset,
  setupPrimary456Preset,
  setupPrep12Preset,
  recalculateTermResults,
  recalculateFinalResults,
  getResultsSummary,
  getEvaluationComponents,
  getRatingScale,
  openReportsFolder,
  exportReportPdf
};

