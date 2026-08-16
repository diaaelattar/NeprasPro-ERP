const db = require('../../config/db');
const bcrypt = require('bcryptjs');
const { TextDecoder } = require('util');
const { getSchoolMasterInfo } = require('../../utils/schoolHelper');

// Decode sql.js getAsObject() rows — converts Uint8Array fields to UTF-8 strings
const _td = new TextDecoder('utf-8');
const _decodeRow = (row) => {
  if (!row) return null;
  const decoded = {};
  for (const [k, v] of Object.entries(row)) {
    decoded[k] = v instanceof Uint8Array ? _td.decode(v) : v;
  }
  return decoded;
};

// Helper to query all rows in sql.js
const _all = (sqliteDb, sql, params = []) => {
  const stmt = sqliteDb.prepare(sql);
  try {
    if (params.length) stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(_decodeRow(stmt.getAsObject()));
    return rows;
  } finally {
    stmt.free();
  }
};

// Helper to query single row in sql.js
const _get = (sqliteDb, sql, params = []) => {
  const stmt = sqliteDb.prepare(sql);
  try {
    if (params.length) stmt.bind(params);
    return stmt.step() ? _decodeRow(stmt.getAsObject()) : null;
  } finally {
    stmt.free();
  }
};

// Helper to get last insert ID
const _lastId = (sqliteDb) => {
  const stmt = sqliteDb.prepare('SELECT last_insert_rowid() AS id');
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return row['last_insert_rowid()'] || row.id;
};

// GET /api/settings/users
const getUsers = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const users = _all(sqliteDb, `
      SELECT u.id, u.username, u.national_id, u.full_name, u.is_active, u.created_at
      FROM users u
      ORDER BY u.created_at DESC
    `);

    // For each user, attach their roles with section_id
    for (const u of users) {
      const userRoles = _all(sqliteDb, `
        SELECT r.id, r.role_name, r.role_name_ar, ur.section_id, s.name AS section_name
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        LEFT JOIN sections s ON s.id = ur.section_id
        WHERE ur.user_id = ?
      `, [u.id]);
      
      u.roles = userRoles.map(r => ({
        id: r.id,
        role_name: r.role_name,
        role_name_ar: r.role_name_ar,
        section_id: r.section_id,
        section_name: r.section_name
      }));
    }

    return res.json({ success: true, users });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/settings/users
const createUser = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { username, nationalId, fullName, password, roleIds, roles } = req.body;

  const trimmedUsername = username ? username.trim() : '';
  if (!trimmedUsername || !nationalId || !fullName || !password) {
    return res.status(400).json({ success: false, error: 'جميع الحقول مطلوبة.' });
  }

  try {
    const sqliteDb = db.getSQLiteDb();
    
    // Check if username already exists
    const exists = _get(sqliteDb, 'SELECT id FROM users WHERE username = ?', [trimmedUsername]);
    if (exists) return res.status(400).json({ success: false, error: 'اسم المستخدم مسجل بالفعل.' });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let userId;
    db.runTransaction(() => {
      sqliteDb.run(`
        INSERT INTO users (username, national_id, full_name, password_hash, is_active)
        VALUES (?, ?, ?, ?, 1)
      `, [trimmedUsername, nationalId, fullName, passwordHash]);
      userId = _lastId(sqliteDb);

      if (roles && Array.isArray(roles)) {
        for (const r of roles) {
          const secId = r.sectionId ? parseInt(r.sectionId) : null;
          sqliteDb.run('INSERT INTO user_roles (user_id, role_id, section_id) VALUES (?, ?, ?)', [userId, r.roleId, secId]);
        }
      } else if (roleIds && Array.isArray(roleIds)) {
        for (const roleId of roleIds) {
          sqliteDb.run('INSERT INTO user_roles (user_id, role_id, section_id) VALUES (?, ?, NULL)', [userId, roleId]);
        }
      }
    });

    return res.status(201).json({ success: true, message: 'تم إنشاء المستخدم بنجاح.', userId });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/settings/users/:id
const updateUser = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  const { fullName, nationalId, password, isActive, roleIds, roles } = req.body;

  try {
    const sqliteDb = db.getSQLiteDb();
    const user = _get(sqliteDb, 'SELECT id FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ success: false, error: 'المستخدم غير موجود.' });

    db.runTransaction(() => {
      // Update basic fields
      sqliteDb.run(`
        UPDATE users 
        SET full_name = ?, national_id = ?, is_active = ?
        WHERE id = ?
      `, [fullName, nationalId, isActive ? 1 : 0, id]);

      // Update password if provided
      if (password) {
        bcrypt.genSalt(10).then(salt => {
          bcrypt.hash(password, salt).then(hash => {
            sqliteDb.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
          });
        });
      }

      // Sync roles and scopes
      sqliteDb.run('DELETE FROM user_roles WHERE user_id = ?', [id]);
      if (roles && Array.isArray(roles)) {
        for (const r of roles) {
          const secId = r.sectionId ? parseInt(r.sectionId) : null;
          sqliteDb.run('INSERT INTO user_roles (user_id, role_id, section_id) VALUES (?, ?, ?)', [id, r.roleId, secId]);
        }
      } else if (roleIds && Array.isArray(roleIds)) {
        for (const roleId of roleIds) {
          sqliteDb.run('INSERT INTO user_roles (user_id, role_id, section_id) VALUES (?, ?, NULL)', [id, roleId]);
        }
      }
    });

    return res.json({ success: true, message: 'تم تحديث بيانات المستخدم بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/settings/users/:id
const deleteUser = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;

  try {
    const sqliteDb = db.getSQLiteDb();
    const user = _get(sqliteDb, 'SELECT id, username FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ success: false, error: 'المستخدم غير موجود.' });

    if (user.username === 'admin') {
      return res.status(400).json({ success: false, error: 'لا يمكن حذف الحساب الرئيسي للمدير.' });
    }

    db.runTransaction(() => {
      sqliteDb.run('DELETE FROM user_roles WHERE user_id = ?', [id]);
      sqliteDb.run('DELETE FROM users WHERE id = ?', [id]);
    });

    return res.json({ success: true, message: 'تم حذف المستخدم بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/settings/roles
const getRoles = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const roles = _all(sqliteDb, 'SELECT id, role_name, role_name_ar, description FROM roles ORDER BY id');
    
    // Attach permissions to each role
    for (const r of roles) {
      const perms = _all(sqliteDb, `
        SELECT p.id, p.perm_key, p.perm_name_ar
        FROM role_permissions rp
        JOIN permissions p ON p.id = rp.permission_id
        WHERE rp.role_id = ?
      `, [r.id]);
      r.permissions = perms;
    }

    return res.json({ success: true, roles });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/settings/permissions
const getPermissions = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const permissions = _all(sqliteDb, 'SELECT id, perm_key, perm_name_ar, category FROM permissions ORDER BY category, id');
    return res.json({ success: true, permissions });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/settings/roles/:id/permissions
const updateRolePermissions = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  const { permissionIds } = req.body;

  try {
    const sqliteDb = db.getSQLiteDb();
    const role = _get(sqliteDb, 'SELECT id, role_name FROM roles WHERE id = ?', [id]);
    if (!role) return res.status(404).json({ success: false, error: 'الدور الوظيفي غير موجود.' });

    if (role.role_name === 'super_admin') {
      return res.status(400).json({ success: false, error: 'لا يمكن تعديل صلاحيات المدير العام الكاملة.' });
    }

    db.runTransaction(() => {
      sqliteDb.run('DELETE FROM role_permissions WHERE role_id = ?', [id]);
      if (Array.isArray(permissionIds)) {
        for (const pId of permissionIds) {
          sqliteDb.run('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [id, pId]);
        }
      }
    });

    return res.json({ success: true, message: 'تم حفظ مصفوفة الصلاحيات بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/settings/roles
const createRole = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { roleName, roleNameAr, description, permissionIds } = req.body;
  if (!roleName || !roleNameAr) {
    return res.status(400).json({ success: false, error: 'اسم ومسمى الدور مطلوبان.' });
  }

  try {
    const sqliteDb = db.getSQLiteDb();
    const cleanKey = roleName.trim().toLowerCase().replace(/\s+/g, '_');
    const exists = _get(sqliteDb, 'SELECT id FROM roles WHERE role_name = ?', [cleanKey]);
    if (exists) return res.status(400).json({ success: false, error: 'هذا الدور موجود بالفعل.' });

    let newRoleId;
    db.runTransaction(() => {
      sqliteDb.run('INSERT INTO roles (role_name, role_name_ar, description) VALUES (?, ?, ?)', [cleanKey, roleNameAr.trim(), description || '']);
      newRoleId = _lastId(sqliteDb);
      if (Array.isArray(permissionIds)) {
        for (const pId of permissionIds) {
          sqliteDb.run('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [newRoleId, pId]);
        }
      }
    });

    return res.status(201).json({ success: true, message: 'تم إنشاء الدور الوظيفي بنجاح.', roleId: newRoleId });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/settings/roles/:id
const deleteRole = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;

  try {
    const sqliteDb = db.getSQLiteDb();
    const role = _get(sqliteDb, 'SELECT id, role_name FROM roles WHERE id = ?', [id]);
    if (!role) return res.status(404).json({ success: false, error: 'الدور غير موجود.' });

    if (['super_admin', 'data_entry', 'hr_officer', 'head_control', 'accountant', 'viewer'].includes(role.role_name)) {
      return res.status(400).json({ success: false, error: 'لا يمكن حذف الأدوار القياسية الأساسية للنظام.' });
    }

    db.runTransaction(() => {
      sqliteDb.run('DELETE FROM role_permissions WHERE role_id = ?', [id]);
      sqliteDb.run('DELETE FROM user_roles WHERE role_id = ?', [id]);
      sqliteDb.run('DELETE FROM roles WHERE id = ?', [id]);
    });

    return res.json({ success: true, message: 'تم حذف الدور الوظيفي بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const { formatClassroomLabel, extractClassNumber } = require('../../utils/classroomFormatter');

// GET /api/settings/classrooms
const getClassrooms = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId, academicYearId } = req.query;
  try {
    const sqliteDb = db.getSQLiteDb();
    let query = `
      SELECT c.id, c.grade_id, c.academic_year_id, c.class_name, c.class_number, c.display_order, c.class_code, c.capacity,
             g.grade_name_ar, g.grade_number, g.stage_id, st.section_id,
             st.stage_name,
             sec.name AS section_name, sec.type AS section_type,
             ay.year_label
      FROM classes c
      JOIN grades_lookup g ON g.id = c.grade_id
      LEFT JOIN stages_lookup st ON st.id = g.stage_id
      LEFT JOIN sections sec ON sec.id = st.section_id
      JOIN academic_years ay ON ay.id = c.academic_year_id
      WHERE 1=1
    `;
    const params = [];
    if (gradeId) {
      query += ' AND c.grade_id = ?';
      params.push(gradeId);
    }
    if (academicYearId) {
      query += ' AND c.academic_year_id = ?';
      params.push(academicYearId);
    }
    query += ' ORDER BY COALESCE(c.class_number, CAST(c.class_name AS INTEGER), c.id) ASC, c.id ASC';
    const classrooms = _all(sqliteDb, query, params);
    
    // For each classroom, calculate formatted_name and current enrolled students
    for (const c of classrooms) {
      const cnt = _get(sqliteDb, 'SELECT COUNT(*) as n FROM class_enrollments WHERE class_id = ?', [c.id])?.n || 0;
      c.enrolledCount = cnt;
      c.formatted_name = formatClassroomLabel({
        classNumber: c.class_number,
        className: c.class_name,
        gradeNumber: c.grade_number,
        stageCode: c.stage_id,
        stageName: c.stage_name,
        sectionType: c.section_type
      });
    }
    
    return res.json({ success: true, classrooms });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/settings/classrooms
const createClassroom = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId, academicYearId, classNumber, className, classCode, capacity } = req.body;
  if (!gradeId || !academicYearId) {
    return res.status(400).json({ success: false, error: 'الصف الدراسي والعام الدراسي حقول إلزامية.' });
  }
  try {
    const sqliteDb = db.getSQLiteDb();
    
    // Find grade, stage, and section info
    const grade = _get(sqliteDb, 'SELECT grade_number, stage_id FROM grades_lookup WHERE id = ?', [gradeId]);
    const gradeNum = grade?.grade_number || 1;
    const stage = grade ? _get(sqliteDb, 'SELECT stage_name, section_id FROM stages_lookup WHERE id = ?', [grade.stage_id]) : null;
    const section = stage ? _get(sqliteDb, 'SELECT name, code, type FROM sections WHERE id = ?', [stage.section_id]) : null;

    // Determine numeric classNumber
    let num = parseInt(classNumber, 10);
    if (!num || isNaN(num)) {
      const existingClasses = _all(sqliteDb, 'SELECT class_number FROM classes WHERE grade_id = ? AND academic_year_id = ? ORDER BY class_number DESC', [gradeId, academicYearId]);
      const maxNum = existingClasses && existingClasses.length > 0 ? Math.max(...existingClasses.map(c => c.class_number || 0)) : 0;
      num = maxNum + 1;
    }

    // Determine standard class_name
    let finalClassName = className ? String(className).trim() : '';
    if (!finalClassName) {
      finalClassName = formatClassroomLabel({
        classNumber: num,
        gradeNumber: gradeNum,
        stageCode: grade?.stage_id,
        stageName: stage?.stage_name,
        sectionType: section?.type || section?.code
      });
    }

    // Check unique constraint (by class_number or class_name)
    const exists = _get(sqliteDb, 'SELECT id FROM classes WHERE grade_id = ? AND academic_year_id = ? AND (class_name = ? OR class_number = ?)', [gradeId, academicYearId, finalClassName, num]);
    if (exists) {
      return res.status(400).json({ success: false, error: `الفصل رقم (${num}) أو الاسم (${finalClassName}) مسجل بالفعل في هذا الصف لنفس العام الدراسي.` });
    }

    let stageCode = 3;
    if (stage) {
      const sn = stage.stage_name || '';
      if (sn.includes('تمهيدي'))        stageCode = 1;
      else if (sn.includes('رياض') || sn.includes('حضانة')) stageCode = 2;
      else if (sn.includes('ابتدائي')) stageCode = 3;
      else if (sn.includes('إعدادي') || sn.includes('اعدادي')) stageCode = 4;
      else if (sn.includes('ثانوي'))   stageCode = 5;
    }

    let secCode = 1;
    if (section) {
      const secName = section.name || '';
      if (secName.includes('لغات') || section.code === 'languages') secCode = 2;
      else if (secName.includes('دولي') || section.code === 'international') secCode = 3;
    }

    let finalClassCode = classCode;
    if (!finalClassCode) {
      const classNumStr = String(num).padStart(2, '0');
      finalClassCode = `${secCode}${stageCode}${gradeNum}${classNumStr}`;
    }

    const safeCap = Math.min(49, Math.max(1, parseInt(capacity) || 40));

    sqliteDb.run(`
      INSERT INTO classes (grade_id, academic_year_id, class_name, class_number, display_order, class_code, capacity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [gradeId, academicYearId, finalClassName, num, num, finalClassCode, safeCap]);
    const classroomId = _lastId(sqliteDb);
    return res.status(201).json({
      success: true,
      message: `تم إضافة فصل (${finalClassName}) بنجاح.`,
      classroomId,
      classNumber: num,
      className: finalClassName,
      classCode: finalClassCode
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/settings/classrooms/:id
const updateClassroom = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  const { classNumber, className, classCode, capacity } = req.body;
  try {
    const sqliteDb = db.getSQLiteDb();
    const classroom = _get(sqliteDb, 'SELECT id, grade_id, academic_year_id, class_number, class_name FROM classes WHERE id = ?', [id]);
    if (!classroom) return res.status(404).json({ success: false, error: 'الفصل غير موجود.' });

    const newNum = classNumber ? parseInt(classNumber, 10) : classroom.class_number;

    // Check unique constraint if name or number changes
    if (className || classNumber) {
      const exists = _get(sqliteDb, 'SELECT id FROM classes WHERE grade_id = ? AND academic_year_id = ? AND (class_name = ? OR class_number = ?) AND id != ?', [
        classroom.grade_id, classroom.academic_year_id, className || classroom.class_name, newNum, id
      ]);
      if (exists) {
        return res.status(400).json({ success: false, error: 'هناك فصل آخر بنفس الرقم أو الاسم مسجل في هذا الصف.' });
      }
    }

    const safeCap = capacity ? Math.min(49, Math.max(1, parseInt(capacity) || 40)) : null;

    sqliteDb.run(`
      UPDATE classes
      SET class_name   = COALESCE(?, class_name),
          class_number = COALESCE(?, class_number),
          display_order= COALESCE(?, display_order),
          class_code   = COALESCE(?, class_code),
          capacity     = COALESCE(?, capacity)
      WHERE id = ?
    `, [className || null, newNum, newNum, classCode || null, safeCap, id]);

    return res.json({ success: true, message: 'تم تحديث بيانات الفصل بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/settings/classrooms/:id
const deleteClassroom = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  try {
    const sqliteDb = db.getSQLiteDb();
    const classroom = _get(sqliteDb, 'SELECT id FROM classes WHERE id = ?', [id]);
    if (!classroom) return res.status(404).json({ success: false, error: 'الفصل غير موجود.' });

    // Check if there are enrolled students in this classroom
    const enrolled = _get(sqliteDb, 'SELECT COUNT(*) as n FROM class_enrollments WHERE class_id = ?', [id])?.n || 0;
    if (enrolled > 0) {
      return res.status(400).json({ success: false, error: 'لا يمكن حذف هذا الفصل لوجود طلاب موزعون عليه حالياً.' });
    }

    sqliteDb.run('DELETE FROM classes WHERE id = ?', [id]);
    return res.json({ success: true, message: 'تم حذف الفصل بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/settings/classrooms/grade/:gradeId
const deleteGradeClassrooms = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId } = req.params;
  const { academicYearId, confirmUnenroll } = req.query;

  if (!gradeId || !academicYearId) {
    return res.status(400).json({ success: false, error: 'معرف الصف والعام الدراسي مطلوبان.' });
  }

  try {
    const sqliteDb = db.getSQLiteDb();

    // Find all classes for this grade and academic year
    const classes = _all(sqliteDb, 'SELECT id FROM classes WHERE grade_id = ? AND academic_year_id = ?', [gradeId, academicYearId]);
    if (!classes || classes.length === 0) {
      return res.status(404).json({ success: false, error: 'لا توجد فصول مسجلة لهذا الصف.' });
    }

    const classIds = classes.map(c => c.id);
    const placeholders = classIds.map(() => '?').join(',');

    // Check if students are enrolled in any of these classes
    const enrolled = _get(sqliteDb, `SELECT COUNT(*) as n FROM class_enrollments WHERE class_id IN (${placeholders})`, classIds)?.n || 0;

    if (enrolled > 0 && confirmUnenroll !== 'true') {
      return res.status(400).json({
        success: false,
        requiresConfirmation: true,
        enrolledCount: enrolled,
        error: `يوجد ${enrolled} طالب موزع على فصول هذا الصف. هل تريد فك تسكين/توزيع الطلاب وحذف جميع الفصول؟`
      });
    }

    db.runTransaction(() => {
      if (enrolled > 0) {
        sqliteDb.run(`DELETE FROM class_enrollments WHERE class_id IN (${placeholders})`, classIds);
      }
      sqliteDb.run(`DELETE FROM classes WHERE grade_id = ? AND academic_year_id = ?`, [gradeId, academicYearId]);
    });

    return res.json({
      success: true,
      message: `تم حذف جميع فصول الصف (${classes.length} فصل)${enrolled > 0 ? ` وفك تسكين ${enrolled} طالب` : ''} بنجاح.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/settings/classrooms/:id/enroll
// Assigns a student to a classroom (or moves them from their current classroom)
const enrollStudent = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id: classId } = req.params;
  const { studentId, academicYearId } = req.body;
  if (!studentId || !academicYearId) {
    return res.status(400).json({ success: false, error: 'معرف الطالب والعام الدراسي مطلوبان.' });
  }
  try {
    const sqliteDb = db.getSQLiteDb();
    const classroom = _get(sqliteDb, 'SELECT id, capacity FROM classes WHERE id = ?', [classId]);
    if (!classroom) return res.status(404).json({ success: false, error: 'الفصل غير موجود.' });

    // Remove any previous enrollment of this student in the same academic year
    sqliteDb.run(
      'DELETE FROM class_enrollments WHERE student_id = ? AND academic_year_id = ?',
      [studentId, academicYearId]
    );

    // Check capacity
    const currentCount = _get(sqliteDb, 'SELECT COUNT(*) as n FROM class_enrollments WHERE class_id = ? AND academic_year_id = ?', [classId, academicYearId])?.n || 0;
    if (classroom.capacity && currentCount >= classroom.capacity) {
      return res.status(400).json({ success: false, error: `الفصل ممتلئ بالفعل (${currentCount}/${classroom.capacity} طالب)` });
    }

    sqliteDb.run(
      'INSERT INTO class_enrollments (class_id, student_id, academic_year_id) VALUES (?, ?, ?)',
      [classId, studentId, academicYearId]
    );
    return res.json({ success: true, message: 'تم توزيع الطالب على الفصل بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/settings/classrooms/bulk-enroll
// Distributes multiple students to classrooms in bulk
const bulkEnrollStudents = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { enrollments } = req.body;
  if (!enrollments || !Array.isArray(enrollments) || enrollments.length === 0) {
    return res.status(400).json({ success: false, error: 'لم يتم تقديم أي بيانات توزيع.' });
  }

  try {
    const sqliteDb = db.getSQLiteDb();
    let enrolledCount = 0;

    db.runTransaction(() => {
      for (const item of enrollments) {
        const { studentId, classId, academicYearId } = item;
        if (!studentId || !academicYearId) continue;

        // Remove any previous enrollment of this student in the same academic year
        sqliteDb.run(
          'DELETE FROM class_enrollments WHERE student_id = ? AND academic_year_id = ?',
          [studentId, academicYearId]
        );

        // If classId is valid and not 'unassigned' or 0, insert new enrollment
        if (classId && classId !== 'unassigned' && classId !== 0 && classId !== '0') {
          sqliteDb.run(
            'INSERT INTO class_enrollments (class_id, student_id, academic_year_id) VALUES (?, ?, ?)',
            [classId, studentId, academicYearId]
          );
        }
        enrolledCount++;
      }
    });
    db.flushSQLite();

    return res.json({ success: true, message: `تم توزيع ${enrolledCount} طالب بنجاح.`, enrolled: enrolledCount });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};


// GET /api/settings/academic-years
const getAcademicYears = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    // جلب العام الدراسي الوحيد المعتمد والنشط بالنظام فقط
    let years = _all(sqliteDb, 'SELECT id, year_label, start_date, end_date, is_current FROM academic_years WHERE is_current = 1 ORDER BY id DESC LIMIT 1');
    if (!years || years.length === 0) {
      years = _all(sqliteDb, 'SELECT id, year_label, start_date, end_date, is_current FROM academic_years ORDER BY id DESC LIMIT 1');
      if (years && years.length > 0) {
        sqliteDb.run('UPDATE academic_years SET is_current = 1 WHERE id = ?', [years[0].id]);
        years[0].is_current = 1;
      }
    }
    return res.json({ success: true, academicYears: years });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/settings/academic-years
const createAcademicYear = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { yearLabel, startDate, endDate, isCurrent } = req.body;
  if (!yearLabel || !startDate || !endDate) {
    return res.status(400).json({ success: false, error: 'جميع الحقول مطلوبة.' });
  }
  try {
    const sqliteDb = db.getSQLiteDb();
    const exists = _get(sqliteDb, 'SELECT id FROM academic_years WHERE year_label = ?', [yearLabel]);
    if (exists) {
      return res.status(400).json({ success: false, error: 'هذا العام الدراسي مسجل بالفعل.' });
    }

    db.runTransaction(() => {
      sqliteDb.run('UPDATE academic_years SET is_current = 0');
      sqliteDb.run(`
        INSERT INTO academic_years (year_label, start_date, end_date, is_current)
        VALUES (?, ?, ?, 1)
      `, [yearLabel, startDate, endDate]);
      const yearId = _lastId(sqliteDb);

      // تحديث النظام بالكامل على هذا العام الجديد المعتمد
      sqliteDb.run('UPDATE students SET academic_year_id = ? WHERE is_deleted IS NULL OR is_deleted = 0', [yearId]);
      sqliteDb.run('UPDATE classes SET academic_year_id = ?', [yearId]);
      sqliteDb.run('UPDATE class_enrollments SET academic_year_id = ?', [yearId]);

      // إزالة أي أعوام متداخلة أخرى
      try {
        sqliteDb.run('DELETE FROM academic_years WHERE id != ?', [yearId]);
      } catch (_) {}

      sqliteDb.run(`
        INSERT INTO settings_audit_log (setting_area, setting_key, old_value, new_value, changed_by)
        VALUES ('academic_years', 'create_year', NULL, ?, 'admin')
      `, [`label:${yearLabel}`]);
    });
    return res.status(201).json({ success: true, message: 'تم اعتماد العام الدراسي للنظام بالكامل بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/settings/academic-years/:id
const updateAcademicYear = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  const { yearLabel, startDate, endDate, isCurrent } = req.body;
  if (!yearLabel || !startDate || !endDate) {
    return res.status(400).json({ success: false, error: 'جميع الحقول مطلوبة.' });
  }
  try {
    const sqliteDb = db.getSQLiteDb();
    const year = _get(sqliteDb, 'SELECT id FROM academic_years WHERE id = ?', [id]);
    if (!year) return res.status(404).json({ success: false, error: 'العام الدراسي غير موجود.' });

    const exists = _get(sqliteDb, 'SELECT id FROM academic_years WHERE year_label = ? AND id != ?', [yearLabel, id]);
    if (exists) {
      return res.status(400).json({ success: false, error: 'هناك عام دراسي آخر مسجل بنفس التسمية.' });
    }

    db.runTransaction(() => {
      sqliteDb.run('UPDATE academic_years SET is_current = 0');
      sqliteDb.run(`
        UPDATE academic_years
        SET year_label = ?, start_date = ?, end_date = ?, is_current = 1
        WHERE id = ?
      `, [yearLabel, startDate, endDate, id]);

      // تحديث كافة سجلات النظام والطلاب على هذا العام المحدث
      sqliteDb.run('UPDATE students SET academic_year_id = ? WHERE is_deleted IS NULL OR is_deleted = 0', [id]);
      sqliteDb.run('UPDATE classes SET academic_year_id = ?', [id]);
      sqliteDb.run('UPDATE class_enrollments SET academic_year_id = ?', [id]);

      // إزالة أي أعوام متداخلة أخرى
      try {
        sqliteDb.run('DELETE FROM academic_years WHERE id != ?', [id]);
      } catch (_) {}

      sqliteDb.run(`
        INSERT INTO settings_audit_log (setting_area, setting_key, old_value, new_value, changed_by)
        VALUES ('academic_years', 'update_year', ?, ?, 'admin')
      `, [`id:${id}`, `label:${yearLabel},current:1`]);
    });
    return res.json({ success: true, message: 'تم تحديث واعتماد العام الدراسي للنظام بالكامل بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/settings/academic-years/:id
const deleteAcademicYear = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  try {
    const sqliteDb = db.getSQLiteDb();
    const year = _get(sqliteDb, 'SELECT id, is_current FROM academic_years WHERE id = ?', [id]);
    if (!year) return res.status(404).json({ success: false, error: 'العام الدراسي غير موجود.' });

    if (year.is_current === 1 || year.is_current === true) {
      return res.status(400).json({ success: false, error: 'لا يمكن حذف العام الدراسي الحالي المعتمد.' });
    }

    sqliteDb.run('DELETE FROM academic_years WHERE id = ?', [id]);
    sqliteDb.run(`
      INSERT INTO settings_audit_log (setting_area, setting_key, old_value, new_value, changed_by)
      VALUES ('academic_years', 'delete_year', ?, NULL, 'admin')
    `, [`id:${id}`]);
    return res.json({ success: true, message: 'تم حذف العام الدراسي بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/settings/academic-years/:id/set-current
const setCurrentAcademicYear = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  try {
    const sqliteDb = db.getSQLiteDb();
    const year = _get(sqliteDb, 'SELECT id FROM academic_years WHERE id = ?', [id]);
    if (!year) return res.status(404).json({ success: false, error: 'العام الدراسي غير موجود.' });

    db.runTransaction(() => {
      sqliteDb.run('UPDATE academic_years SET is_current = 0');
      sqliteDb.run('UPDATE academic_years SET is_current = 1 WHERE id = ?', [id]);

      // تحديث كافة سجلات الطلاب والفصول لتكون على هذا العام المعتمد
      sqliteDb.run('UPDATE students SET academic_year_id = ? WHERE is_deleted IS NULL OR is_deleted = 0', [id]);
      sqliteDb.run('UPDATE classes SET academic_year_id = ?', [id]);
      sqliteDb.run('UPDATE class_enrollments SET academic_year_id = ?', [id]);

      // إزالة أي أعوام متداخلة أخرى
      try {
        sqliteDb.run('DELETE FROM academic_years WHERE id != ?', [id]);
      } catch (_) {}

      sqliteDb.run(`
        INSERT INTO settings_audit_log (setting_area, setting_key, old_value, new_value, changed_by)
        VALUES ('academic_years', 'set_current_year', NULL, ?, 'admin')
      `, [`id:${id}`]);
    });
    return res.json({ success: true, message: 'تم تعيين وتحديث النظام بالكامل على هذا العام الدراسي.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/settings/academic-years/set-single
const setSingleAcademicYear = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { startYear } = req.body;
  const yearNum = parseInt(startYear);
  if (!yearNum || yearNum < 2020 || yearNum > 2050) {
    return res.status(400).json({ success: false, error: 'سنة بدء العام الدراسي غير صالحة.' });
  }

  const endYearNum = yearNum + 1;
  const formattedLabel = `${yearNum} / ${endYearNum} م`;
  const startDate = `${yearNum}-09-01`;
  const endDate = `${endYearNum}-08-31`;

  try {
    const sqliteDb = db.getSQLiteDb();
    db.runTransaction(() => {
      sqliteDb.run('UPDATE academic_years SET is_current = 0');
      const existing = _get(sqliteDb, 'SELECT id FROM academic_years WHERE year_label LIKE ? OR year_label LIKE ? OR year_label LIKE ?', [
        `%${yearNum}%${endYearNum}%`,
        `${yearNum}/${endYearNum}`,
        formattedLabel
      ]);

      let yearId;
      if (existing) {
        yearId = existing.id;
        sqliteDb.run(
          'UPDATE academic_years SET year_label = ?, start_date = ?, end_date = ?, is_current = 1 WHERE id = ?',
          [formattedLabel, startDate, endDate, yearId]
        );
      } else {
        sqliteDb.run(
          'INSERT INTO academic_years (year_label, start_date, end_date, is_current) VALUES (?, ?, ?, 1)',
          [formattedLabel, startDate, endDate]
        );
        yearId = _lastId(sqliteDb);
      }

      // تحديث النظام بالكامل: الطلاب، الفصول، والتسجيلات على هذا العام المعتمد
      sqliteDb.run('UPDATE students SET academic_year_id = ? WHERE is_deleted IS NULL OR is_deleted = 0', [yearId]);
      sqliteDb.run('UPDATE classes SET academic_year_id = ?', [yearId]);
      sqliteDb.run('UPDATE class_enrollments SET academic_year_id = ?', [yearId]);

      // إزالة أي أعوام دراسية سابقة أو متداخلة لضمان بقاء عام واحد فقط
      try {
        sqliteDb.run('DELETE FROM academic_years WHERE id != ?', [yearId]);
      } catch (_) {}
    });

    return res.json({
      success: true,
      message: `تم اعتماد وتحديث النظام بالكامل على العام الدراسي ${formattedLabel}.`,
      yearLabel: formattedLabel
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/settings/institution
const getInstitution = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const inst = getSchoolMasterInfo(sqliteDb);
    
    // Fetch staff list to easily link/select school director
    const staffList = _all(sqliteDb, `
      SELECT id, full_name_ar, national_id, COALESCE(title, job_class, cadre_title, '') AS position_title, phone
      FROM staff
      WHERE status = 'نشط' OR status = 'active' OR status IS NULL
      ORDER BY full_name_ar ASC
    `);

    const governorates = _all(sqliteDb, `SELECT id, name_ar FROM governorates ORDER BY id ASC`);
    const administrations = _all(sqliteDb, `SELECT id, governorate_id, name_ar FROM educational_administrations ORDER BY name_ar ASC`);

    const EDUCATION_TYPES = [
      'رسمي',
      'رسمي لغات',
      'رسمي لغات متميز',
      'خاص عربي',
      'خاص لغات',
      'دولي',
      'ثقافي',
      'مجتمعي'
    ];

    return res.json({
      success: true,
      institution: inst || null,
      educationTypes: EDUCATION_TYPES,
      staffList: staffList || [],
      governorates: governorates || [],
      administrations: administrations || []
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/settings/institution
const updateInstitution = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const {
    schoolCode, schoolName, schoolNameEn, governorate, directorate,
    governorateId, administrationId, address, phone, email, website, logoUrl,
    educationType, directorName, directorId,
    sectionsCount, stagesCount, hasMultipleSections, sections
  } = req.body;

  if (!schoolCode || !schoolName || !governorate || !directorate) {
    return res.status(400).json({ success: false, error: 'كود المدرسة، اسم المدرسة، المحافظة والإدارة التعليمية حقول إلزامية.' });
  }

  try {
    const sqliteDb = db.getSQLiteDb();
    const exists = _get(sqliteDb, 'SELECT id FROM institution_config LIMIT 1');

    db.runTransaction(() => {
      if (exists) {
        sqliteDb.run(`
          UPDATE institution_config
          SET school_code = ?, school_name = ?, school_name_en = ?, governorate = ?, directorate = ?,
              governorate_id = ?, administration_id = ?, address = ?, phone = ?, email = ?, website = ?, logo_url = ?,
              education_type = ?, director_name = ?, director_id = ?,
              sections_count = ?, stages_count = ?, has_multiple_sections = ?
          WHERE id = ?
        `, [
          schoolCode, schoolName, schoolNameEn || '', governorate, directorate,
          governorateId ? parseInt(governorateId) : null, administrationId ? parseInt(administrationId) : null,
          address || '', phone || '', email || '', website || '', logoUrl || '',
          educationType || 'رسمي', directorName || '', directorId ? parseInt(directorId) : null,
          sectionsCount ? parseInt(sectionsCount) : null,
          stagesCount ? parseInt(stagesCount) : null,
          hasMultipleSections ? 1 : 0,
          exists.id
        ]);
      } else {
        sqliteDb.run(`
          INSERT INTO institution_config (
            school_code, school_name, school_name_en, governorate, directorate,
            governorate_id, administration_id, address, phone, email, website, logo_url,
            education_type, director_name, director_id,
            sections_count, stages_count, has_multiple_sections, is_initialized
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [
          schoolCode, schoolName, schoolNameEn || '', governorate, directorate,
          governorateId ? parseInt(governorateId) : null, administrationId ? parseInt(administrationId) : null,
          address || '', phone || '', email || '', website || '', logoUrl || '',
          educationType || 'رسمي', directorName || '', directorId ? parseInt(directorId) : null,
          sectionsCount ? parseInt(sectionsCount) : null,
          stagesCount ? parseInt(stagesCount) : null,
          hasMultipleSections ? 1 : 0
        ]);
      }

      sqliteDb.run(`
        INSERT INTO settings_audit_log (setting_area, setting_key, old_value, new_value, changed_by)
        VALUES ('institution', 'update_config', ?, ?, 'admin')
      `, ['institution_config', `code:${schoolCode},name:${schoolName}`]);

      // Sync sections
      if (sections && Array.isArray(sections)) {
        const keptIds = [];
        for (const s of sections) {
          const isRealId = s.id && !String(s.id).startsWith('temp');
          const secCode = s.code ? parseInt(s.code, 10) : (s.type === 'languages' ? 2 : (s.type === 'international' ? 3 : 1));
          if (isRealId) {
            sqliteDb.run(`
              UPDATE sections
              SET name = ?, type = ?, education_type = ?, legal_status = ?, code = ?, is_active = 1
              WHERE id = ?
            `, [s.name, s.type, s.educationType || s.education_type || educationType || '', s.legalStatus || s.legal_status || 'حكومي', secCode, parseInt(s.id, 10)]);
            keptIds.push(parseInt(s.id, 10));
          } else {
            const existingByNumericCode = _get(sqliteDb, 'SELECT id FROM sections WHERE code = ? OR id = ?', [secCode, parseInt(s.id, 10) || 0]);
            if (existingByNumericCode) {
              sqliteDb.run(`
                UPDATE sections
                SET name = ?, type = ?, education_type = ?, legal_status = ?, code = ?, is_active = 1
                WHERE id = ?
              `, [s.name, s.type, s.educationType || s.education_type || educationType || '', s.legalStatus || s.legal_status || 'حكومي', secCode, existingByNumericCode.id]);
              keptIds.push(existingByNumericCode.id);
            } else {
              sqliteDb.run(`
                INSERT INTO sections (name, type, education_type, legal_status, code, is_active)
                VALUES (?, ?, ?, ?, ?, 1)
              `, [s.name, s.type, s.educationType || s.education_type || educationType || '', s.legalStatus || s.legal_status || 'حكومي', secCode]);
              const newId = _lastId(sqliteDb);
              keptIds.push(newId);
            }
          }
        }
        if (keptIds.length > 0) {
          const placeholders = keptIds.map(() => '?').join(',');
          sqliteDb.run(`DELETE FROM sections WHERE id NOT IN (${placeholders})`, keptIds);
        }
      }
    });

    const updatedInst = getSchoolMasterInfo(sqliteDb);
    return res.json({ success: true, message: 'تم حفظ وتحديث بيانات المدرسة بنجاح.', institution: updatedInst });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const fs = require('fs');
const path = require('path');

// GET /api/settings/backups
const listBackups = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const config = db.getConfig();
    if (!config || config.mode !== 'sqlite') {
      return res.json({ success: true, backups: [], message: 'النسخ الاحتياطي متاح لقاعدة البيانات المدمجة فقط.' });
    }
    const backupDir = path.join(path.dirname(config.dbPath), 'Backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const files = fs.readdirSync(backupDir);
    const backups = files.filter(f => f.endsWith('.bak') || f.endsWith('.db')).map((f, i) => {
      const filePath = path.join(backupDir, f);
      const stat = fs.statSync(filePath);
      const fileTime = (stat.birthtime && stat.birthtime.getTime() > 0) ? stat.birthtime : stat.mtime;
      return {
        id: i + 1,
        filename: f,
        filePath,
        size: (stat.size / (1024 * 1024)).toFixed(2) + ' م.ب',
        createdAt: fileTime ? fileTime.toISOString().split('T')[0] : '—',
        createdTime: fileTime ? fileTime.toLocaleTimeString('ar-EG') : '—',
      };
    });
    return res.json({ success: true, backups, backupDir });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/settings/backups
const createBackup = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const config = db.getConfig();
    if (!config || config.mode !== 'sqlite') {
      return res.status(400).json({ success: false, error: 'النسخ الاحتياطي متاح لقاعدة البيانات المدمجة فقط.' });
    }
    // Make sure latest memory state is flushed to disk
    db.flushSQLite();

    const dbPath = config.dbPath;
    const backupDir = path.join(path.dirname(dbPath), 'Backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `nepraspro-backup-${timestamp}.bak`);
    
    fs.copyFileSync(dbPath, backupPath);

    return res.json({ success: true, message: 'تم إنشاء النسخة الاحتياطية بنجاح!' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/settings/backups/restore
const restoreBackup = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ success: false, error: 'اسم ملف النسخة الاحتياطية مطلوب.' });

  try {
    const config = db.getConfig();
    if (!config || config.mode !== 'sqlite') {
      return res.status(400).json({ success: false, error: 'الاستعادة متاحة لقاعدة البيانات المدمجة فقط.' });
    }
    
    const dbPath = config.dbPath;
    const backupDir = path.join(path.dirname(dbPath), 'Backups');
    const backupPath = path.join(backupDir, filename);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ success: false, error: 'ملف النسخة الاحتياطية غير موجود.' });
    }

    // Copy backup to main database file path
    fs.copyFileSync(backupPath, dbPath);

    // Reload the SQLite in-memory database
    await db.reloadSQLite();

    return res.json({ success: true, message: 'تم استعادة النسخة الاحتياطية بنجاح!' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/settings/backups/:filename
const deleteBackup = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { filename } = req.params;

  try {
    const config = db.getConfig();
    if (!config || config.mode !== 'sqlite') {
      return res.status(400).json({ success: false, error: 'النسخ الاحتياطي متاح لقاعدة البيانات المدمجة فقط.' });
    }
    const dbPath = config.dbPath;
    const backupDir = path.join(path.dirname(dbPath), 'Backups');
    const backupPath = path.join(backupDir, filename);

    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
    return res.json({ success: true, message: 'تم حذف ملف النسخة الاحتياطية بنجاح!' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/settings/backups/download/:filename
// Streams the backup file so the user can save it anywhere (USB, network folder, etc.)
const downloadBackup = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { filename } = req.params;

  // Security: only allow .bak and .db extensions, no path traversal
  if (!filename || !/^[\w\-\.]+$/.test(filename) || (!filename.endsWith('.bak') && !filename.endsWith('.db'))) {
    return res.status(400).json({ success: false, error: 'اسم الملف غير صالح.' });
  }

  try {
    const config = db.getConfig();
    const backupDir = path.join(path.dirname(config.dbPath), 'Backups');
    const backupPath = path.join(backupDir, filename);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ success: false, error: 'ملف النسخة الاحتياطية غير موجود.' });
    }

    // Flush latest state before download
    db.flushSQLite();

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', fs.statSync(backupPath).size);
    fs.createReadStream(backupPath).pipe(res);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/settings/backups/import
// Accepts an uploaded .db or .bak file (from USB/any location) and restores it
const importBackup = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'لم يتم إرسال ملف.' });
    }

    const config = db.getConfig();
    if (!config || config.mode !== 'sqlite') {
      return res.status(400).json({ success: false, error: 'الاستيراد متاح لقاعدة البيانات المدمجة فقط.' });
    }

    const uploadedBuffer = req.file.buffer;

    // Validate: SQLite files start with "SQLite format 3"
    const magic = uploadedBuffer.slice(0, 16).toString('utf8');
    if (!magic.startsWith('SQLite format 3')) {
      return res.status(400).json({ success: false, error: 'الملف المُرفق ليس قاعدة بيانات SQLite صالحة.' });
    }

    const dbPath = config.dbPath;
    const backupDir = path.join(path.dirname(dbPath), 'Backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    // Save a safety backup of current DB before overwriting
    const safetyTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    db.flushSQLite();
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, path.join(backupDir, `before-import-${safetyTimestamp}.bak`));
    }

    // Write uploaded file to DB path
    fs.writeFileSync(dbPath, uploadedBuffer);

    // Reload in-memory SQLite
    await db.reloadSQLite();

    return res.json({
      success: true,
      message: 'تم استيراد قاعدة البيانات من الملف بنجاح! تم حفظ نسخة احتياطية تلقائية من البيانات السابقة.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};


// GET /api/settings/sections
const getSections = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    try {
      sqliteDb.run(`
        DELETE FROM sections 
        WHERE id NOT IN (SELECT MIN(id) FROM sections GROUP BY type);
      `);
    } catch (_) {}
    const sections = _all(sqliteDb, "SELECT * FROM sections WHERE is_active = 1 AND name NOT LIKE 'مرحلة %' GROUP BY type ORDER BY id ASC");
    return res.json({ success: true, sections });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/settings/sections
const createSection = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const {
    name, type, educationType, legalStatus,
    sectionDirectorName, sectionDirectorQualification, sectionDirectorNationalId, sectionDirectorPhone,
    sectionDeputyName, sectionDeputyPhone, studentsViceName, studentsVicePhone, staffViceName, staffVicePhone
  } = req.body;
  if (!name || !type) return res.status(400).json({ success: false, error: 'اسم القسم ونوعه حقول مطلوبة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    db.runTransaction(() => {
      sqliteDb.run(`
        INSERT INTO sections (
          name, type, education_type, legal_status, is_active,
          section_director_name, section_director_qualification, section_director_national_id, section_director_phone,
          section_deputy_name, section_deputy_phone, students_vice_name, students_vice_phone, staff_vice_name, staff_vice_phone
        ) VALUES (?,?,?,?,1,?,?,?,?,?,?,?,?,?,?)
      `, [
        name, type, educationType || '', legalStatus || '',
        sectionDirectorName || null, sectionDirectorQualification || null, sectionDirectorNationalId || null, sectionDirectorPhone || null,
        sectionDeputyName || null, sectionDeputyPhone || null, studentsViceName || null, studentsVicePhone || null, staffViceName || null, staffVicePhone || null
      ]);
    });
    return res.json({ success: true, message: 'تم إضافة القسم الجديد بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/settings/sections/:id
const updateSection = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  const {
    name, type, educationType, legalStatus,
    sectionDirectorName, sectionDirectorQualification, sectionDirectorNationalId, sectionDirectorPhone,
    sectionDeputyName, sectionDeputyPhone, studentsViceName, studentsVicePhone, staffViceName, staffVicePhone
  } = req.body;
  if (!name || !type) return res.status(400).json({ success: false, error: 'اسم القسم ونوعه حقول مطلوبة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    db.runTransaction(() => {
      sqliteDb.run(`
        UPDATE sections SET
          name = ?, type = ?, education_type = ?, legal_status = ?,
          section_director_name = ?, section_director_qualification = ?, section_director_national_id = ?, section_director_phone = ?,
          section_deputy_name = ?, section_deputy_phone = ?, students_vice_name = ?, students_vice_phone = ?, staff_vice_name = ?, staff_vice_phone = ?
        WHERE id = ?
      `, [
        name, type, educationType || '', legalStatus || '',
        sectionDirectorName || null, sectionDirectorQualification || null, sectionDirectorNationalId || null, sectionDirectorPhone || null,
        sectionDeputyName || null, sectionDeputyPhone || null, studentsViceName || null, studentsVicePhone || null, staffViceName || null, staffVicePhone || null,
        id
      ]);
    });
    return res.json({ success: true, message: 'تم تحديث بيانات القسم بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PATCH /api/settings/sections/:id/toggle-active
const toggleSectionActive = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  try {
    const sqliteDb = db.getSQLiteDb();
    const section = _get(sqliteDb, 'SELECT id, is_active, name FROM sections WHERE id = ?', [id]);
    if (!section) return res.status(404).json({ success: false, error: 'القسم غير موجود.' });
    const newActive = section.is_active ? 0 : 1;
    db.runTransaction(() => {
      sqliteDb.run('UPDATE sections SET is_active = ? WHERE id = ?', [newActive, id]);
    });
    return res.json({
      success: true,
      is_active: newActive,
      message: newActive ? `تم تفعيل قسم "${section.name}" بنجاح.` : `تم تعطيل قسم "${section.name}" – لن يظهر في النظام.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/settings/sections/:id
const deleteSection = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  try {
    const sqliteDb = db.getSQLiteDb();
    // Check if section contains enrolled students or classrooms
    const directStudents = _get(sqliteDb, 'SELECT COUNT(*) as count FROM students WHERE section_id = ?', [id]);
    const enrolledStudents = _get(sqliteDb, `
      SELECT COUNT(*) as count FROM class_enrollments ce 
      JOIN classes c ON c.id = ce.class_id
      JOIN grades_lookup g ON g.id = c.grade_id
      JOIN stages_lookup s ON s.id = g.stage_id
      WHERE s.section_id = ?
    `, [id]);
    const totalCount = (directStudents?.count || 0) + (enrolledStudents?.count || 0);

    if (totalCount > 0) {
      return res.status(400).json({ success: false, error: `⚠️ لا يمكن حذف هذا القسم لأنه يحتوي على (${totalCount}) طالب مسجل بالنظام.` });
    }

    db.runTransaction(() => {
      sqliteDb.run('DELETE FROM sections WHERE id = ?', [id]);
    });
    return res.json({ success: true, message: 'تم حذف القسم بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/settings/stages
const getStages = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const stages = _all(sqliteDb, `
      SELECT sl.*, s.name as section_name, s.type as section_type 
      FROM stages_lookup sl
      JOIN sections s ON s.id = sl.section_id
      WHERE sl.is_active = 1 AND s.is_active = 1 AND s.name NOT LIKE 'مرحلة %'
      ORDER BY sl.display_order ASC, sl.id ASC
    `);
    return res.json({ success: true, stages });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PATCH /api/settings/stages/:id/toggle-active
const toggleStageActive = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  try {
    const sqliteDb = db.getSQLiteDb();
    const stage = _get(sqliteDb, 'SELECT id, is_active, stage_name FROM stages_lookup WHERE id = ?', [id]);
    if (!stage) return res.status(404).json({ success: false, error: 'المرحلة غير موجودة.' });
    const newActive = stage.is_active ? 0 : 1;
    db.runTransaction(() => {
      sqliteDb.run('UPDATE stages_lookup SET is_active = ? WHERE id = ?', [newActive, id]);
    });
    return res.json({
      success: true,
      is_active: newActive,
      message: newActive ? `تم تفعيل مرحلة "${stage.stage_name}" بنجاح.` : `تم تعطيل مرحلة "${stage.stage_name}" – لن تظهر في النظام.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/settings/stages
const createStage = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { sectionId, stageName, stageCode, yearsCount, displayOrder } = req.body;
  if (!sectionId || !stageName || !yearsCount) {
    return res.status(400).json({ success: false, error: 'القسم، اسم المرحلة، وعدد السنوات حقول مطلوبة.' });
  }
  try {
    const sqliteDb = db.getSQLiteDb();
    const section = _get(sqliteDb, 'SELECT type FROM sections WHERE id = ?', [sectionId]);
    if (!section) return res.status(400).json({ success: false, error: 'القسم المختار غير موجود.' });

    db.runTransaction(() => {
      // Upsert pattern: check if stage already exists for this section (by stage_name or stage_code)
      let existingStage = _get(
        sqliteDb,
        'SELECT id FROM stages_lookup WHERE section_id = ? AND (stage_name = ? OR stage_code = ? OR code = ?)',
        [sectionId, stageName, stageCode || null, stageCode || null]
      );

      let stageId;
      if (existingStage) {
        stageId = existingStage.id;
        sqliteDb.run(
          'UPDATE stages_lookup SET stage_name = ?, stage_code = ?, years_count = ?, display_order = ?, is_active = 1 WHERE id = ?',
          [stageName, stageCode || null, yearsCount, displayOrder || 0, stageId]
        );
      } else {
        sqliteDb.run(
          'INSERT INTO stages_lookup (section_id, stage_name, stage_code, years_count, display_order, is_active) VALUES (?,?,?,?,?,1)',
          [sectionId, stageName, stageCode || null, yearsCount, displayOrder || 0]
        );
        stageId = _lastId(sqliteDb);
      }

      // 1. Create/Update serial counter
      const type = section.type;
      const prefix = (type === 'arabic' ? 'AR' : type === 'languages' ? 'LN' : 'KG') +
                     (stageName === 'ابتدائي' ? '-PR' : stageName === 'إعدادي' ? '-PP' : stageName === 'ثانوي' ? '-SC' : '-KG');
      const counter = _get(sqliteDb, 'SELECT id FROM stage_serial_counters WHERE section_id = ? AND stage_id = ?', [sectionId, stageId]);
      if (!counter) {
        sqliteDb.run(
          'INSERT INTO stage_serial_counters (section_id, stage_id, prefix) VALUES (?,?,?)',
          [sectionId, stageId, prefix]
        );
      }

      // 2. Create grades if not existing
      const arabicNumerals = ['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر'];
      for (let year = 1; year <= yearsCount; year++) {
        const gradeNameAr = `الصف ${arabicNumerals[year-1] || year}`;
        const existingGrade = _get(sqliteDb, 'SELECT id FROM grades_lookup WHERE stage_id = ? AND grade_number = ?', [stageId, year]);
        if (existingGrade) {
          sqliteDb.run('UPDATE grades_lookup SET is_active = 1, grade_name_ar = ? WHERE id = ?', [gradeNameAr, existingGrade.id]);
        } else {
          sqliteDb.run(
            'INSERT INTO grades_lookup (stage_id, grade_number, grade_name_ar, is_active) VALUES (?,?,?,1)',
            [stageId, year, gradeNameAr]
          );
        }
      }

      // 3. Auto-activate the parent section when a stage is added to it
      sqliteDb.run('UPDATE sections SET is_active = 1 WHERE id = ?', [sectionId]);
    });

    return res.json({ success: true, message: 'تم إضافة وتفعيل المرحلة التعليمية والصفوف الدراسية التابعة لها بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/settings/stages/:id
const updateStage = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  const { 
    stageName, stageCode, displayOrder,
    stageDirectorName, stageDirectorQualification, stageDirectorNationalId, stageDirectorPhone,
    stageDeputyName, stageDeputyPhone,
    stageStudentsViceName, stageStudentsVicePhone,
    stageStaffViceName, stageStaffVicePhone
  } = req.body;
  if (!stageName) return res.status(400).json({ success: false, error: 'اسم المرحلة مطلوب.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    db.runTransaction(() => {
      sqliteDb.run(`
        UPDATE stages_lookup 
        SET stage_name = ?, stage_code = ?, display_order = ?,
            stage_director_name = ?, stage_director_qualification = ?,
            stage_director_national_id = ?, stage_director_phone = ?,
            stage_deputy_name = ?, stage_deputy_phone = ?,
            stage_students_vice_name = ?, stage_students_vice_phone = ?,
            stage_staff_vice_name = ?, stage_staff_vice_phone = ?
        WHERE id = ?
      `, [
        stageName, stageCode || null, displayOrder || 0,
        stageDirectorName || null, stageDirectorQualification || null,
        stageDirectorNationalId || null, stageDirectorPhone || null,
        stageDeputyName || null, stageDeputyPhone || null,
        stageStudentsViceName || null, stageStudentsVicePhone || null,
        stageStaffViceName || null, stageStaffVicePhone || null,
        id
      ]);
    });
    return res.json({ success: true, message: 'تم تحديث بيانات المرحلة بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/settings/stages/:id
const deleteStage = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  try {
    const sqliteDb = db.getSQLiteDb();
    // Check if stage has classrooms with enrolled students
    const check = _get(sqliteDb, `
      SELECT COUNT(*) as count FROM class_enrollments ce 
      JOIN classes c ON c.id = ce.class_id
      JOIN grades_lookup g ON g.id = c.grade_id
      WHERE g.stage_id = ?
    `, [id]);
    if (check && check.count > 0) {
      return res.status(400).json({ success: false, error: 'لا يمكن حذف المرحلة لوجود طلاب مسجلين بها.' });
    }

    db.runTransaction(() => {
      sqliteDb.run('DELETE FROM stages_lookup WHERE id = ?', [id]);
    });
    return res.json({ success: true, message: 'تم حذف المرحلة التعليمية بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getUsers, createUser, updateUser, deleteUser,
  getRoles, getPermissions, updateRolePermissions, createRole, deleteRole,
  getClassrooms, createClassroom, updateClassroom, deleteClassroom, deleteGradeClassrooms, enrollStudent, bulkEnrollStudents,
  getAcademicYears, createAcademicYear, updateAcademicYear, deleteAcademicYear, setCurrentAcademicYear, setSingleAcademicYear,
  getInstitution, updateInstitution,
  listBackups, createBackup, downloadBackup, importBackup, restoreBackup, deleteBackup,
  getSections, createSection, updateSection, deleteSection, toggleSectionActive,
  getStages, createStage, updateStage, deleteStage, toggleStageActive
};
