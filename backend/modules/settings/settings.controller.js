const db = require('../../config/db');
const bcrypt = require('bcryptjs');
const { TextDecoder } = require('util');

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
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(_decodeRow(stmt.getAsObject()));
  stmt.free();
  return rows;
};

// Helper to query single row in sql.js
const _get = (sqliteDb, sql, params = []) => {
  const stmt = sqliteDb.prepare(sql);
  if (params.length) stmt.bind(params);
  const hasRow = stmt.step();
  const row = hasRow ? _decodeRow(stmt.getAsObject()) : null;
  stmt.free();
  return row;
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
    const permissions = _all(sqliteDb, 'SELECT id, perm_key, perm_name_ar FROM permissions ORDER BY perm_key');
    return res.json({ success: true, permissions });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/settings/classrooms
const getClassrooms = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId, academicYearId } = req.query;
  try {
    const sqliteDb = db.getSQLiteDb();
    let query = `
      SELECT c.id, c.grade_id, c.academic_year_id, c.class_name, c.capacity,
             g.grade_name_ar, ay.year_label
      FROM classes c
      JOIN grades_lookup g ON g.id = c.grade_id
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
    query += ' ORDER BY c.class_name';
    const classrooms = _all(sqliteDb, query, params);
    
    // For each classroom, we can also count current enrolled students
    for (const c of classrooms) {
      const cnt = _get(sqliteDb, 'SELECT COUNT(*) as n FROM class_enrollments WHERE class_id = ?', [c.id])?.n || 0;
      c.enrolledCount = cnt;
    }
    
    return res.json({ success: true, classrooms });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/settings/classrooms
const createClassroom = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { gradeId, academicYearId, className, capacity } = req.body;
  if (!gradeId || !academicYearId || !className) {
    return res.status(400).json({ success: false, error: 'الصف الدراسي، العام الدراسي، واسم الفصل حقول إلزامية.' });
  }
  try {
    const sqliteDb = db.getSQLiteDb();
    // Check unique constraint
    const exists = _get(sqliteDb, 'SELECT id FROM classes WHERE grade_id = ? AND academic_year_id = ? AND class_name = ?', [gradeId, academicYearId, className]);
    if (exists) {
      return res.status(400).json({ success: false, error: 'هذا الفصل مسجل بالفعل في هذا الصف لنفس العام الدراسي.' });
    }
    sqliteDb.run(`
      INSERT INTO classes (grade_id, academic_year_id, class_name, capacity)
      VALUES (?, ?, ?, ?)
    `, [gradeId, academicYearId, className, capacity || 40]);
    const classroomId = _lastId(sqliteDb);
    return res.status(201).json({ success: true, message: 'تم إضافة الفصل بنجاح.', classroomId });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/settings/classrooms/:id
const updateClassroom = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  const { className, capacity } = req.body;
  try {
    const sqliteDb = db.getSQLiteDb();
    const classroom = _get(sqliteDb, 'SELECT id, grade_id, academic_year_id FROM classes WHERE id = ?', [id]);
    if (!classroom) return res.status(404).json({ success: false, error: 'الفصل غير موجود.' });

    // Check unique constraint if name changes
    if (className) {
      const exists = _get(sqliteDb, 'SELECT id FROM classes WHERE grade_id = ? AND academic_year_id = ? AND class_name = ? AND id != ?', [classroom.grade_id, classroom.academic_year_id, className, id]);
      if (exists) {
        return res.status(400).json({ success: false, error: 'هناك فصل آخر بنفس الاسم مسجل في هذا الصف.' });
      }
    }

    sqliteDb.run(`
      UPDATE classes
      SET class_name = COALESCE(?, class_name), capacity = COALESCE(?, capacity)
      WHERE id = ?
    `, [className || null, capacity || null, id]);

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
    const years = _all(sqliteDb, 'SELECT id, year_label, start_date, end_date, is_current FROM academic_years ORDER BY id DESC');
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
      if (isCurrent) {
        sqliteDb.run('UPDATE academic_years SET is_current = 0');
      }
      sqliteDb.run(`
        INSERT INTO academic_years (year_label, start_date, end_date, is_current)
        VALUES (?, ?, ?, ?)
      `, [yearLabel, startDate, endDate, isCurrent ? 1 : 0]);
    });
    return res.status(201).json({ success: true, message: 'تم إضافة العام الدراسي بنجاح.' });
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
      if (isCurrent) {
        sqliteDb.run('UPDATE academic_years SET is_current = 0');
      }
      sqliteDb.run(`
        UPDATE academic_years
        SET year_label = ?, start_date = ?, end_date = ?, is_current = ?
        WHERE id = ?
      `, [yearLabel, startDate, endDate, isCurrent ? 1 : 0, id]);
    });
    return res.json({ success: true, message: 'تم تحديث العام الدراسي بنجاح.' });
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
      return res.status(400).json({ success: false, error: 'لا يمكن حذف العام الدراسي الحالي النشط.' });
    }

    const hasStudents = _get(sqliteDb, 'SELECT COUNT(*) as n FROM students WHERE academic_year_id = ?', [id])?.n || 0;
    const hasClassrooms = _get(sqliteDb, 'SELECT COUNT(*) as n FROM classes WHERE academic_year_id = ?', [id])?.n || 0;
    if (hasStudents > 0 || hasClassrooms > 0) {
      return res.status(400).json({ success: false, error: 'لا يمكن حذف العام الدراسي لوجود فصول أو طلاب مسجلين فيه.' });
    }

    sqliteDb.run('DELETE FROM academic_years WHERE id = ?', [id]);
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
    });
    return res.json({ success: true, message: 'تم تعيين العام الدراسي كالعام الحالي بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/settings/institution
const getInstitution = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const config = _get(sqliteDb, 'SELECT * FROM institution_config LIMIT 1');
    return res.json({ success: true, institution: config || null });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/settings/institution
const updateInstitution = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const {
    schoolCode, schoolName, schoolNameEn, governorate, directorate, address, phone, email, website, logoUrl,
    educationType, directorName, directorQualification, directorNationalId, directorPhone,
    sectionsCount, stagesCount, hasMultipleSections, sections
  } = req.body;
  if (!schoolCode || !schoolName || !governorate || !directorate) {
    return res.status(400).json({ success: false, error: 'كود المدرسة، اسم المدرسة، المحافظة والإدارة التعليمية حقول إلزامية.' });
  }
  try {
    if (db.getMode() === 'sqlite') {
      const sqliteDb = db.getSQLiteDb();
      const exists = _get(sqliteDb, 'SELECT id FROM institution_config LIMIT 1');
      
      db.runTransaction(() => {
        if (exists) {
          sqliteDb.run(`
            UPDATE institution_config
            SET school_code = ?, school_name = ?, school_name_en = ?, governorate = ?, directorate = ?,
                address = ?, phone = ?, email = ?, website = ?, logo_url = ?,
                education_type = ?, director_name = ?, director_qualification = ?,
                director_national_id = ?, director_phone = ?, sections_count = ?, stages_count = ?, has_multiple_sections = ?
            WHERE id = ?
          `, [
            schoolCode, schoolName, schoolNameEn || '', governorate, directorate, 
            address || '', phone || '', email || '', website || '', logoUrl || '',
            educationType || '', directorName || '', directorQualification || '',
            directorNationalId || '', directorPhone || '', 
            sectionsCount ? parseInt(sectionsCount) : null,
            stagesCount ? parseInt(stagesCount) : null,
            hasMultipleSections ? 1 : 0,
            exists.id
          ]);
        } else {
          sqliteDb.run(`
            INSERT INTO institution_config (
              school_code, school_name, school_name_en, governorate, directorate, address, phone, email, website, logo_url,
              education_type, director_name, director_qualification, director_national_id, director_phone,
              sections_count, stages_count, has_multiple_sections, is_initialized
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          `, [
            schoolCode, schoolName, schoolNameEn || '', governorate, directorate, 
            address || '', phone || '', email || '', website || '', logoUrl || '',
            educationType || '', directorName || '', directorQualification || '',
            directorNationalId || '', directorPhone || '',
            sectionsCount ? parseInt(sectionsCount) : null,
            stagesCount ? parseInt(stagesCount) : null,
            hasMultipleSections ? 1 : 0
          ]);
        }

        // Sync sections
        if (sections && Array.isArray(sections)) {
          const keptIds = [];
          for (const s of sections) {
            const isRealId = s.id && !String(s.id).startsWith('temp');
            if (isRealId) {
              sqliteDb.run(`
                UPDATE sections
                SET name = ?, type = ?, education_type = ?, legal_status = ?
                WHERE id = ?
              `, [s.name, s.type, s.educationType || s.education_type || '', s.legalStatus || s.legal_status || 'حكومي', s.id]);
              keptIds.push(parseInt(s.id));
            } else {
              sqliteDb.run(`
                INSERT INTO sections (name, type, education_type, legal_status)
                VALUES (?, ?, ?, ?)
              `, [s.name, s.type, s.educationType || s.education_type || '', s.legalStatus || s.legal_status || 'حكومي']);
              const newId = _lastId(sqliteDb);
              keptIds.push(newId);
            }
          }
          if (keptIds.length > 0) {
            const placeholders = keptIds.map(() => '?').join(',');
            sqliteDb.run(`DELETE FROM sections WHERE id NOT IN (${placeholders})`, keptIds);
          } else {
            sqliteDb.run(`DELETE FROM sections`);
          }
        }
      });
    } else {
      // PostgreSQL mode
      const pool = db.getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const existsRes = await client.query('SELECT id FROM institution_config LIMIT 1');
        const exists = existsRes.rows[0];
        
        if (exists) {
          await client.query(`
            UPDATE institution_config
            SET school_code = $1, school_name = $2, school_name_en = $3, governorate = $4, directorate = $5,
                address = $6, phone = $7, email = $8, website = $9, logo_url = $10,
                education_type = $11, director_name = $12, director_qualification = $13,
                director_national_id = $14, director_phone = $15, sections_count = $16, stages_count = $17, has_multiple_sections = $18
            WHERE id = $19
          `, [
            schoolCode, schoolName, schoolNameEn || '', governorate, directorate, 
            address || '', phone || '', email || '', website || '', logoUrl || '',
            educationType || '', directorName || '', directorQualification || '',
            directorNationalId || '', directorPhone || '', 
            sectionsCount ? parseInt(sectionsCount) : null,
            stagesCount ? parseInt(stagesCount) : null,
            hasMultipleSections ? 1 : 0,
            exists.id
          ]);
        } else {
          await client.query(`
            INSERT INTO institution_config (
              school_code, school_name, school_name_en, governorate, directorate, address, phone, email, website, logo_url,
              education_type, director_name, director_qualification, director_national_id, director_phone,
              sections_count, stages_count, has_multiple_sections, is_initialized
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, true)
          `, [
            schoolCode, schoolName, schoolNameEn || '', governorate, directorate, 
            address || '', phone || '', email || '', website || '', logoUrl || '',
            educationType || '', directorName || '', directorQualification || '',
            directorNationalId || '', directorPhone || '',
            sectionsCount ? parseInt(sectionsCount) : null,
            stagesCount ? parseInt(stagesCount) : null,
            hasMultipleSections ? 1 : 0
          ]);
        }

        // Sync sections
        if (sections && Array.isArray(sections)) {
          const keptIds = [];
          for (const s of sections) {
            const isRealId = s.id && !String(s.id).startsWith('temp');
            if (isRealId) {
              await client.query(`
                UPDATE sections
                SET name = $1, type = $2, education_type = $3, legal_status = $4
                WHERE id = $5
              `, [s.name, s.type, s.educationType || s.education_type || '', s.legalStatus || s.legal_status || 'حكومي', s.id]);
              keptIds.push(parseInt(s.id));
            } else {
              const insertRes = await client.query(`
                INSERT INTO sections (name, type, education_type, legal_status)
                VALUES ($1, $2, $3, $4)
                RETURNING id
              `, [s.name, s.type, s.educationType || s.education_type || '', s.legalStatus || s.legal_status || 'حكومي']);
              keptIds.push(insertRes.rows[0].id);
            }
          }
          if (keptIds.length > 0) {
            const placeholders = keptIds.map((_, i) => `$${i + 1}`).join(',');
            await client.query(`DELETE FROM sections WHERE id NOT IN (${placeholders})`, keptIds);
          } else {
            await client.query(`DELETE FROM sections`);
          }
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
    return res.json({ success: true, message: 'تم تحديث بيانات المؤسسة التعليمية بنجاح.' });
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
    const sections = _all(sqliteDb, 'SELECT * FROM sections ORDER BY id ASC');
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
          name, type, education_type, legal_status,
          section_director_name, section_director_qualification, section_director_national_id, section_director_phone,
          section_deputy_name, section_deputy_phone, students_vice_name, students_vice_phone, staff_vice_name, staff_vice_phone
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
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

// DELETE /api/settings/sections/:id
const deleteSection = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  try {
    const sqliteDb = db.getSQLiteDb();
    // Check if section contains classrooms or students
    const check = _get(sqliteDb, `
      SELECT COUNT(*) as count FROM class_enrollments ce 
      JOIN classes c ON c.id = ce.class_id
      JOIN grades_lookup g ON g.id = c.grade_id
      JOIN stages_lookup s ON s.id = g.stage_id
      WHERE s.section_id = ?
    `, [id]);
    if (check && check.count > 0) {
      return res.status(400).json({ success: false, error: 'لا يمكن حذف القسم لوجود طلاب مسجلين في صفوفه.' });
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
      ORDER BY sl.display_order ASC, sl.id ASC
    `);
    return res.json({ success: true, stages });
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
      sqliteDb.run(
        'INSERT INTO stages_lookup (section_id, stage_name, stage_code, years_count, display_order) VALUES (?,?,?,?,?)',
        [sectionId, stageName, stageCode || null, yearsCount, displayOrder || 0]
      );
      const stageId = _lastId(sqliteDb);

      // 1. Create serial counter
      const type = section.type;
      const prefix = (type === 'arabic' ? 'AR' : type === 'languages' ? 'LN' : 'KG') +
                     (stageName === 'ابتدائي' ? '-PR' : stageName === 'إعدادي' ? '-PP' : stageName === 'ثانوي' ? '-SC' : '-KG');
      sqliteDb.run(
        'INSERT INTO stage_serial_counters (section_id, stage_id, prefix) VALUES (?,?,?)',
        [sectionId, stageId, prefix]
      );

      // 2. Create grades
      const arabicNumerals = ['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر'];
      for (let year = 1; year <= yearsCount; year++) {
        const gradeNameAr = `الصف ${arabicNumerals[year-1] || year} ال${stageName}`;
        sqliteDb.run(
          'INSERT INTO grades_lookup (stage_id, grade_number, grade_name_ar) VALUES (?,?,?)',
          [stageId, year, gradeNameAr]
        );
      }
    });

    return res.json({ success: true, message: 'تم إضافة المرحلة التعليمية والصفوف الدراسية التابعة لها بنجاح.' });
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
  getRoles, getPermissions,
  getClassrooms, createClassroom, updateClassroom, deleteClassroom, enrollStudent, bulkEnrollStudents,
  getAcademicYears, createAcademicYear, updateAcademicYear, deleteAcademicYear, setCurrentAcademicYear,
  getInstitution, updateInstitution,
  listBackups, createBackup, restoreBackup, deleteBackup, downloadBackup, importBackup,
  getSections, createSection, updateSection, deleteSection,
  getStages, createStage, updateStage, deleteStage,
};

