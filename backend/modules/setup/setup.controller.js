const bcrypt = require('bcryptjs');
const db = require('../../config/db');

const getStatus = async (req, res) => {
  const isDbReady = db.isConfigured();

  if (!isDbReady) {
    return res.json({ success: true, databaseConfigured: false, initialized: false });
  }

  try {
    let row;
    if (db.getMode() === 'sqlite') {
      const sqliteDb = db.getSQLiteDb();
      const stmt = sqliteDb.prepare(
        'SELECT is_initialized, school_name, governorate, directorate, logo_url FROM institution_config LIMIT 1'
      );
      if (stmt.step()) {
        const raw = stmt.getAsObject();
        // Decode any Uint8Array fields (Arabic text) to proper UTF-8 strings
        const td = new (require('util').TextDecoder)('utf-8');
        row = {};
        for (const [k, v] of Object.entries(raw)) {
          row[k] = v instanceof Uint8Array ? td.decode(v) : v;
        }
      }
      stmt.free();
    } else {
      const result = await db.query(
        'SELECT is_initialized, school_name, governorate, directorate, logo_url FROM institution_config LIMIT 1'
      );
      row = result.rows[0];
    }

    if (row && (row.is_initialized === true || row.is_initialized === 1)) {
      return res.json({
        success: true,
        databaseConfigured: true,
        initialized: true,
        dbMode: db.getMode(),
        schoolName: row.school_name,
        governorate: row.governorate || '',
        directorate: row.directorate || '',
        logoUrl: row.logo_url || null,
      });
    }
    return res.json({ success: true, databaseConfigured: true, initialized: false, dbMode: db.getMode() });
  } catch (err) {
    console.error('[getStatus Error]', err.message);
    return res.json({ success: true, databaseConfigured: true, initialized: false, error: err.message });
  }
};


// ─── Initialize SQLite (embedded mode, no external server) ────────────────────
const configureSQLite = async (req, res) => {
  try {
    await db.initSQLiteMode();
    return res.json({ success: true, mode: 'sqlite', message: 'تم تهيئة قاعدة البيانات المدمجة بنجاح! لا حاجة لأي إعداد خارجي.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Configure PostgreSQL (network mode) ──────────────────────────────────────
const configurePostgres = async (req, res) => {
  const { host, port, user, password, database } = req.body;
  if (!host || !port || !user || !database) {
    return res.status(400).json({ success: false, error: 'جميع حقول الاتصال مطلوبة.' });
  }

  try {
    // Test first
    const test = await db.testPostgresConnection({ host, port, user, password, database });
    if (!test.success) {
      return res.status(400).json({ success: false, error: `فشل الاتصال: ${test.error}` });
    }
    await db.initPostgresMode({ host, port: parseInt(port), user, password, database });
    return res.json({ success: true, mode: 'postgres', message: 'تم تهيئة قاعدة البيانات PostgreSQL وإنشاء الجداول بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Setup Wizard (Steps 2-5: School info, Sections, Language, Admin) ─────────
const runWizard = async (req, res) => {
  if (!db.isConfigured()) {
    return res.status(400).json({ success: false, error: 'يرجى تهيئة قاعدة البيانات أولاً.' });
  }

  const {
    schoolCode, schoolName, schoolNameEn, governorate, directorate, address, phone, email, website,
    sections,
    adminUsername, adminNationalId, adminFullName, adminPassword,
    secondLanguage,
  } = req.body;

  if (!schoolCode || !schoolName || !schoolName.trim() || !adminUsername || !adminNationalId || !adminFullName || !adminPassword) {
    return res.status(400).json({ success: false, error: 'اسم المدرسة والأقسام المقررة حقول إيجابية ملزمة.' });
  }

  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    return res.status(400).json({ success: false, error: 'اسم المدرسة والأقسام المقررة حقول إيجابية ملزمة.' });
  }

  try {
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    if (db.getMode() === 'sqlite') {
      const sqliteDb = db.getSQLiteDb();
      
      // sql.js requires step() before getAsObject() for SELECT statements
      const _sqliteGet = (sDb, sql, params = []) => {
        const stmt = sDb.prepare(sql);
        if (params.length) stmt.bind(params);
        const hasRow = stmt.step();
        const row = hasRow ? stmt.getAsObject() : {};
        stmt.free();
        return row;
      };

      const _getLastInsertId = (sDb) => {
        const row = _sqliteGet(sDb, 'SELECT last_insert_rowid() AS id');
        const id = row['last_insert_rowid()'] || row.id;
        if (!id) throw new Error('فشل الحصول على آخر معرف مُدرج (last_insert_rowid)');
        return id;
      };

      db.runTransaction(() => {
        console.log('[Wizard] Starting SQLite transaction...');

        // Institution config
        const existingInst = _sqliteGet(sqliteDb, 'SELECT id FROM institution_config LIMIT 1');
        if (existingInst && existingInst.id) {
          sqliteDb.run(`
            UPDATE institution_config 
            SET school_code = ?, school_name = ?, school_name_en = ?, governorate = ?, directorate = ?, address = ?, phone = ?, email = ?, website = ?, is_initialized = 1
            WHERE id = ?
          `, [schoolCode, schoolName, schoolNameEn || '', governorate || '', directorate || '', address || '', phone || '', email || '', website || '', existingInst.id]);
          console.log('[Wizard] institution_config updated.');
        } else {
          sqliteDb.run(`
            INSERT INTO institution_config (school_code, school_name, school_name_en, governorate, directorate, address, phone, email, website, is_initialized)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          `, [schoolCode, schoolName, schoolNameEn || '', governorate || '', directorate || '', address || '', phone || '', email || '', website || '']);
          console.log('[Wizard] institution_config inserted.');
        }

        // Cleanup any legacy fake sections
        try {
          sqliteDb.run("DELETE FROM sections WHERE name LIKE 'مرحلة %'");
        } catch (_) {}

        // Deactivate all sections and stages first
        sqliteDb.run('UPDATE sections SET is_active = 0');
        sqliteDb.run('UPDATE stages_lookup SET is_active = 0');

        // Activate selected Sections, stages, grades
        for (const sec of (sections || [])) {
          let secRow = _sqliteGet(sqliteDb, "SELECT id FROM sections WHERE name = ? OR (code IS NOT NULL AND code = ?)", [sec.name, sec.code || 0]);
          let sectionId;
          if (secRow && secRow.id) {
            sectionId = secRow.id;
            sqliteDb.run(`
              UPDATE sections SET is_active = 1, type = ?, education_type = COALESCE(NULLIF(?, ''), education_type), legal_status = COALESCE(NULLIF(?, ''), legal_status) WHERE id = ?
            `, [sec.type, sec.educationType || '', sec.legalStatus || '', sectionId]);
            console.log(`[Wizard] Section "${sec.name}" activated with id=${sectionId}`);
          } else {
            sqliteDb.run(`
              INSERT INTO sections (name, type, education_type, legal_status, is_active) VALUES (?, ?, ?, ?, 1)
            `, [sec.name, sec.type, sec.educationType || '', sec.legalStatus || '']);
            sectionId = _getLastInsertId(sqliteDb);
            console.log(`[Wizard] Section "${sec.name}" inserted & activated with id=${sectionId}`);
          }

          for (const stageName of (sec.stages || [])) {
            let yearsCount = 3, displayOrder = 1;
            if (stageName === 'ابتدائي' || stageName.includes('ابتدائي'))  { yearsCount = 6; displayOrder = 2; }
            else if (stageName === 'إعدادي' || stageName.includes('إعدادي'))  { yearsCount = 3; displayOrder = 3; }
            else if (stageName === 'ثانوي' || stageName.includes('ثانوي'))   { yearsCount = 3; displayOrder = 4; }
            else if (stageName.includes('رياض')) { yearsCount = 2; displayOrder = 1; }
            else if (stageName.includes('تمهيدي'))  { yearsCount = 1; displayOrder = 0; }

            let stgRow = _sqliteGet(sqliteDb, "SELECT id FROM stages_lookup WHERE section_id = ? AND stage_name = ?", [sectionId, stageName]);
            let stageId;
            if (stgRow && stgRow.id) {
              stageId = stgRow.id;
              sqliteDb.run(`UPDATE stages_lookup SET is_active = 1, years_count = ?, display_order = ? WHERE id = ?`, [yearsCount, displayOrder, stageId]);
            } else {
              sqliteDb.run(`
                INSERT INTO stages_lookup (section_id, stage_name, years_count, display_order, is_active) VALUES (?, ?, ?, ?, 1)
              `, [sectionId, stageName, yearsCount, displayOrder]);
              stageId = _getLastInsertId(sqliteDb);
            }
            console.log(`[Wizard]   Stage "${stageName}" activated with id=${stageId}`);

            const prefix = (sec.type === 'arabic' ? 'AR' : sec.type === 'languages' ? 'LN' : 'KG') +
                           (stageName.includes('ابتدائي') ? '-PR' : stageName.includes('إعدادي') ? '-PP' : stageName.includes('ثانوي') ? '-SC' : stageName.includes('رياض') ? '-KG' : '-TM');
            sqliteDb.run(`
              INSERT OR IGNORE INTO stage_serial_counters (section_id, stage_id, prefix) VALUES (?, ?, ?)
            `, [sectionId, stageId, prefix]);

            const arabicNumerals = ['الأول','الثاني','الثالث','الرابع','الخامس','السادس'];
            for (let year = 1; year <= yearsCount; year++) {
              const isLang = sec.type === 'languages' || sec.type === 'international';
              const gradeNameAr = stageName.includes('رياض')
                ? `الصف ${arabicNumerals[year-1] || year} الرياض أطفال` + (isLang ? ' - لغات' : '')
                : stageName.includes('تمهيدي')
                ? `الصف الأول التمهيدي` + (isLang ? ' - لغات' : '')
                : `الصف ${arabicNumerals[year-1] || year} ال${stageName}`;
              
              let grdRow = _sqliteGet(sqliteDb, "SELECT id FROM grades_lookup WHERE stage_id = ? AND (grade_number = ? OR grade_name_ar = ?)", [stageId, year, gradeNameAr]);
              if (!grdRow || !grdRow.id) {
                sqliteDb.run(`
                  INSERT INTO grades_lookup (stage_id, grade_number, grade_name_ar, is_active) VALUES (?, ?, ?, 1)
                `, [stageId, year, gradeNameAr]);
              } else {
                sqliteDb.run(`UPDATE grades_lookup SET is_active = 1 WHERE id = ?`, [grdRow.id]);
              }
            }
          }
        }

        // Super admin user
        let existingUser = _sqliteGet(sqliteDb, "SELECT id FROM users WHERE username = ? OR (national_id IS NOT NULL AND national_id = ?)", [adminUsername, adminNationalId]);
        let adminUserId;
        if (existingUser && existingUser.id) {
          adminUserId = existingUser.id;
          sqliteDb.run(`
            UPDATE users SET username = ?, national_id = ?, full_name = ?, password_hash = ?, is_active = 1 WHERE id = ?
          `, [adminUsername, adminNationalId, adminFullName, passwordHash, adminUserId]);
          console.log(`[Wizard] Admin user updated with id=${adminUserId}`);
        } else {
          sqliteDb.run(`
            INSERT INTO users (username, national_id, full_name, password_hash, is_active) VALUES (?, ?, ?, ?, 1)
          `, [adminUsername, adminNationalId, adminFullName, passwordHash]);
          adminUserId = _getLastInsertId(sqliteDb);
          console.log(`[Wizard] Admin user inserted with id=${adminUserId}`);
        }

        // Assign super_admin role
        const roleRow = _sqliteGet(sqliteDb, "SELECT id FROM roles WHERE role_name = 'super_admin'");
        if (roleRow && roleRow.id) {
          sqliteDb.run('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [adminUserId, roleRow.id]);
          console.log(`[Wizard] Admin role assigned. role_id=${roleRow.id}`);
        } else {
          console.warn('[Wizard] super_admin role not found in DB — skipping role assignment.');
        }

        // Default academic year
        const startYearNum = req.body.startYear ? parseInt(req.body.startYear) : new Date().getFullYear();
        const yearLabel = `${startYearNum}/${startYearNum + 1}`;
        const startDate = `${startYearNum}-09-01`;
        const endDate = `${startYearNum + 1}-08-31`;

        sqliteDb.run('UPDATE academic_years SET is_current = 0');
        const existingAY = _sqliteGet(sqliteDb, "SELECT id FROM academic_years WHERE year_label = ?", [yearLabel]);
        if (existingAY && existingAY.id) {
          sqliteDb.run('UPDATE academic_years SET start_date = ?, end_date = ?, is_current = 1 WHERE id = ?', [startDate, endDate, existingAY.id]);
        } else {
          sqliteDb.run(`
            INSERT INTO academic_years (year_label, start_date, end_date, is_current) VALUES (?, ?, ?, 1)
          `, [yearLabel, startDate, endDate]);
        }
        sqliteDb.run(`
          INSERT INTO settings_audit_log (setting_area, setting_key, old_value, new_value, changed_by)
          VALUES ('academic_years', 'create_year', NULL, ?, 'admin')
        `, [`label:${yearLabel},current:1`]);
        console.log(`[Wizard] Academic year set to ${yearLabel} (${startDate} to ${endDate}).`);


        // Second language custom field
        if (secondLanguage && secondLanguage !== 'لا يوجد') {
          sqliteDb.run(`
            INSERT OR IGNORE INTO system_custom_fields (entity_type, field_name, label_ar, field_type, options, is_required)
            VALUES ('students', 'second_language', 'اللغة الأجنبية الثانية', 'select', ?, 1)
          `, [JSON.stringify([secondLanguage])]);
        }

        console.log('[Wizard] Transaction complete. Committing...');
      });

      return res.json({ success: true, message: 'تم إكمال معالج التأسيس بنجاح!' });

    } else {
      // PostgreSQL mode
      const pool = db.getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const existingInst = await client.query('SELECT id FROM institution_config LIMIT 1');
        if (existingInst.rowCount > 0) {
          await client.query(`
            UPDATE institution_config 
            SET school_code = $1, school_name = $2, school_name_en = $3, governorate = $4, directorate = $5, address = $6, phone = $7, email = $8, website = $9, is_initialized = true
            WHERE id = $10
          `, [schoolCode, schoolName, schoolNameEn || '', governorate || '', directorate || '', address || '', phone || '', email || '', website || '', existingInst.rows[0].id]);
        } else {
          await client.query(`
            INSERT INTO institution_config (school_code, school_name, school_name_en, governorate, directorate, address, phone, email, website, is_initialized)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
          `, [schoolCode, schoolName, schoolNameEn || '', governorate || '', directorate || '', address || '', phone || '', email || '', website || '']);
        }

        for (const sec of (sections || [])) {
          let sectionId;
          const secCheck = await client.query('SELECT id FROM sections WHERE name = $1', [sec.name]);
          if (secCheck.rowCount > 0) {
            sectionId = secCheck.rows[0].id;
            await client.query('UPDATE sections SET type=$1, education_type=COALESCE(NULLIF($2, \'\'), education_type), legal_status=COALESCE(NULLIF($3, \'\'), legal_status) WHERE id=$4', [sec.type, sec.educationType || '', sec.legalStatus || '', sectionId]);
          } else {
            const secRes = await client.query(
              'INSERT INTO sections (name, type, education_type, legal_status) VALUES ($1,$2,$3,$4) RETURNING id',
              [sec.name, sec.type, sec.educationType || '', sec.legalStatus || '']
            );
            sectionId = secRes.rows[0].id;
          }

          for (const stageName of (sec.stages || [])) {
            let yearsCount = 3, displayOrder = 1;
            if (stageName === 'ابتدائي') { yearsCount = 6; displayOrder = 2; }
            else if (stageName === 'إعدادي') { yearsCount = 3; displayOrder = 3; }
            else if (stageName === 'ثانوي') { yearsCount = 3; displayOrder = 4; }
            else if (stageName.includes('رياض')) { yearsCount = 2; displayOrder = 1; }
            else if (stageName === 'تمهيدي') { yearsCount = 1; displayOrder = 0; }

            let stageId;
            const stgCheck = await client.query('SELECT id FROM stages_lookup WHERE section_id=$1 AND stage_name=$2', [sectionId, stageName]);
            if (stgCheck.rowCount > 0) {
              stageId = stgCheck.rows[0].id;
            } else {
              const stageRes = await client.query(
                'INSERT INTO stages_lookup (section_id, stage_name, years_count, display_order) VALUES ($1,$2,$3,$4) RETURNING id',
                [sectionId, stageName, yearsCount, displayOrder]
              );
              stageId = stageRes.rows[0].id;
            }

            const arabicNumerals = ['الأول','الثاني','الثالث','الرابع','الخامس','السادس'];
            for (let year = 1; year <= yearsCount; year++) {
              const gradeNameAr = stageName.includes('رياض')
                ? `الصف ${arabicNumerals[year-1] || year} الرياض أطفال`
                : stageName === 'تمهيدي'
                ? `الصف الأول التمهيدي`
                : `الصف ${arabicNumerals[year-1] || year} ال${stageName}`;

              const grdCheck = await client.query('SELECT id FROM grades_lookup WHERE stage_id=$1 AND (grade_number=$2 OR grade_name_ar=$3)', [stageId, year, gradeNameAr]);
              if (grdCheck.rowCount === 0) {
                await client.query(
                  'INSERT INTO grades_lookup (stage_id, grade_number, grade_name_ar) VALUES ($1,$2,$3)',
                  [stageId, year, gradeNameAr]
                );
              }
            }
          }
        }

        const userRes = await client.query(
          'INSERT INTO users (username, national_id, full_name, password_hash, is_active) VALUES ($1,$2,$3,$4,true) RETURNING id',
          [adminUsername, adminNationalId, adminFullName, passwordHash]
        );
        const adminUserId = userRes.rows[0].id;
        const roleRes = await client.query("SELECT id FROM roles WHERE role_name = 'super_admin'");
        if (roleRes.rowCount > 0) {
          await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2)', [adminUserId, roleRes.rows[0].id]);
        }

        const currentYear = new Date().getFullYear();
        await client.query(
          'INSERT INTO academic_years (year_label, start_date, end_date, is_current) VALUES ($1,$2,$3,true)',
          [`${currentYear}/${currentYear+1}`, `${currentYear}-09-01`, `${currentYear+1}-08-31`]
        );

        await client.query('COMMIT');
        return res.json({ success: true, message: 'تم إكمال معالج التأسيس بنجاح!' });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const loginUser = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'اسم المستخدم وكلمة المرور مطلوبان.' });
  }

  const trimmedUsername = username.trim();

  try {
    const userResult = await db.query(
      'SELECT id, username, password_hash, full_name, is_active FROM users WHERE username = $1',
      [trimmedUsername]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({ success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });
    }

    const user = userResult.rows[0];

    // sql.js may return TEXT columns as Uint8Array — decode them first
    const _td = new (require('util').TextDecoder)('utf-8');
    const decodeField = (v) => (v instanceof Uint8Array ? _td.decode(v) : v);
    const passwordHash = decodeField(user.password_hash);
    const fullName     = decodeField(user.full_name);

    const isActiveVal = (user.is_active === 1 || user.is_active === true);
    if (!isActiveVal) {
      return res.status(403).json({ success: false, error: 'هذا الحساب معطل.' });
    }

    const match = await bcrypt.compare(password, passwordHash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });
    }

    const rolesResult = await db.query(`
      SELECT r.role_name, r.role_name_ar, ur.section_id, s.name AS section_name
      FROM user_roles ur 
      JOIN roles r ON r.id = ur.role_id 
      LEFT JOIN sections s ON s.id = ur.section_id
      WHERE ur.user_id = $1
    `, [user.id]);

    const roleScopes = rolesResult.rows.map(r => {
      // Decode section_name if it is a Uint8Array (safety fallback)
      let secName = r.section_name;
      if (secName instanceof Uint8Array) {
        secName = _td.decode(secName);
      }
      return {
        roleName: decodeField(r.role_name),
        roleNameAr: decodeField(r.role_name_ar),
        sectionId: r.section_id,
        sectionName: secName
      };
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        full_name: fullName,
        roles: rolesResult.rows.map(r => decodeField(r.role_name)),
        roleScopes
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getDashboardStats = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const activeResult = await db.query(`
      SELECT COUNT(*) as count FROM students 
      WHERE (is_deleted IS NULL OR is_deleted = 0) 
        AND (status NOT IN ('excluded', 'disconnected', 'suspended', 'مستبعد', 'منقطع', 'موقوف قيده') AND (enrollment_status NOT IN ('مستبعد', 'منقطع', 'موقوف قيده') OR enrollment_status IS NULL))
    `);
    const totalResult = await db.query(
      'SELECT COUNT(*) as count FROM students WHERE (is_deleted IS NULL OR is_deleted = 0)'
    );
    const staffResult = await db.query(
      'SELECT COUNT(*) as count FROM staff'
    );

    const activeCount = activeResult.rows[0]?.count || 0;
    const totalCount  = totalResult.rows[0]?.count || 0;
    const staffCount  = staffResult.rows[0]?.count || 0;

    return res.json({
      success: true,
      stats: {
        students: activeCount,
        totalStudents: totalCount,
        staff: staffCount,
        revenue: '0.00'
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const resetInstitution = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { confirmText } = req.body;
  if (confirmText !== 'إعادة تهيئة النظام بالكامل') {
    return res.status(400).json({ success: false, error: 'يرجى كتابة جملة التأكيد بشكل صحيح: "إعادة تهيئة النظام بالكامل"' });
  }
  try {
    if (db.getMode() === 'sqlite') {
      const sqliteDb = db.getSQLiteDb();
      db.runTransaction(() => {
        // Control & Exam data
        sqliteDb.run('DELETE FROM control_marks_audit;');
        sqliteDb.run('DELETE FROM control_results_summary;');
        sqliteDb.run('DELETE FROM control_marks;');
        sqliteDb.run('DELETE FROM control_students;');
        sqliteDb.run('DELETE FROM control_committees;');
        sqliteDb.run('DELETE FROM exam_subjects;');
        sqliteDb.run('DELETE FROM control_security_log;');

        // Students & Classes
        sqliteDb.run('DELETE FROM student_special_cases;');
        sqliteDb.run('DELETE FROM student_transfers;');
        sqliteDb.run('DELETE FROM class_enrollments;');
        sqliteDb.run('DELETE FROM student_absence_records;');
        sqliteDb.run('DELETE FROM student_absence_warnings;');
        sqliteDb.run('DELETE FROM students;');
        sqliteDb.run('DELETE FROM classes;');

        // Staff & Payroll
        sqliteDb.run('DELETE FROM staff_leaves;');
        sqliteDb.run('DELETE FROM staff_payroll;');
        sqliteDb.run('DELETE FROM staff;');

        // Finance
        sqliteDb.run('DELETE FROM student_payments;');
        sqliteDb.run('DELETE FROM fee_structures;');

        // Custom Institution Architecture Structure
        sqliteDb.run('DELETE FROM institution_grades;');
        sqliteDb.run('DELETE FROM institution_stages;');
        sqliteDb.run('DELETE FROM institution_sections;');

        // Legacy lookup structure
        sqliteDb.run('DELETE FROM grades_lookup;');
        sqliteDb.run('DELETE FROM stages_lookup;');
        sqliteDb.run('DELETE FROM sections;');
        sqliteDb.run('DELETE FROM academic_years;');
        sqliteDb.run('DELETE FROM stage_serial_counters;');
        
        sqliteDb.run('DELETE FROM institution_config;');
      });
    } else {
      await db.query('BEGIN');
      try {
        await db.query('DELETE FROM student_special_cases');
        await db.query('DELETE FROM student_transfers');
        await db.query('DELETE FROM class_enrollments');
        await db.query('DELETE FROM students');
        await db.query('DELETE FROM classes');
        await db.query('DELETE FROM grades_lookup');
        await db.query('DELETE FROM stages_lookup');
        await db.query('DELETE FROM sections');
        await db.query('DELETE FROM academic_years');
        await db.query('DELETE FROM stage_serial_counters');
        
        const superAdminRoleRes = await db.query("SELECT id FROM roles WHERE role_name = 'super_admin' LIMIT 1");
        const superAdminRoleId = superAdminRoleRes.rows[0]?.id;
        
        if (superAdminRoleId) {
          const adminUserRes = await db.query(`
            SELECT u.id FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            WHERE ur.role_id = $1 OR u.username = 'admin'
            LIMIT 1
          `, [superAdminRoleId]);
          const adminUserId = adminUserRes.rows[0]?.id;
          if (adminUserId) {
            await db.query('DELETE FROM user_roles WHERE user_id != $1', [adminUserId]);
            await db.query('DELETE FROM users WHERE id != $1', [adminUserId]);
          } else {
            await db.query('DELETE FROM user_roles');
            await db.query('DELETE FROM users');
          }
        } else {
          await db.query('DELETE FROM user_roles');
          await db.query('DELETE FROM users');
        }
        await db.query('DELETE FROM institution_config');
        await db.query('COMMIT');
      } catch (err) {
        await db.query('ROLLBACK');
        throw err;
      }
    }
    return res.json({ success: true, message: 'تم إعادة تهيئة النظام والمؤسسة بالكامل بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
// ─── Recover Admin Password (Emergency Account Recovery) ─────────────────────
const recoverPassword = async (req, res) => {
  const { schoolCode, nationalId, newPassword, recoveryKey } = req.body;

  if (!schoolCode || !newPassword) {
    return res.status(400).json({ success: false, error: 'يرجى إدخال كود المدرسة وكلمة السر الجديدة.' });
  }

  if (!nationalId && !recoveryKey) {
    return res.status(400).json({ success: false, error: 'يرجى إدخال الرقم القومي المسجل أو كود الطوارئ الماستر.' });
  }

  try {
    const crypto = require('crypto');
    const SECRET_SALT = 'NEPRAS_PRO_ENTERPRISE_SECRET_KEY_2026';
    const cleanCode = schoolCode.toString().trim().toUpperCase();

    // Generate expected Master Emergency Key for this school code
    const masterHash = crypto.createHash('sha256').update(`RECOVERY-${cleanCode}-${SECRET_SALT}`).digest('hex').toUpperCase();
    const expectedMasterKey = `${masterHash.substring(0, 5)}-${masterHash.substring(5, 10)}-${masterHash.substring(10, 15)}-${masterHash.substring(15, 20)}`;

    const isMasterKeyValid = recoveryKey && (recoveryKey.trim().toUpperCase() === expectedMasterKey || recoveryKey.trim().toUpperCase() === masterHash);

    const passwordHash = await bcrypt.hash(newPassword, 12);

    if (db.getMode() === 'sqlite') {
      const sqliteDb = db.getSQLiteDb();

      const _sqliteGet = (sDb, sql, params = []) => {
        const stmt = sDb.prepare(sql);
        if (params.length) stmt.bind(params);
        const hasRow = stmt.step();
        if (!hasRow) { stmt.free(); return null; }
        const raw = stmt.getAsObject();
        stmt.free();
        const td = new (require('util').TextDecoder)('utf-8');
        const row = {};
        for (const [k, v] of Object.entries(raw)) {
          row[k] = v instanceof Uint8Array ? td.decode(v) : v;
        }
        return row;
      };

      // Verify school code
      const inst = _sqliteGet(sqliteDb, 'SELECT school_code FROM institution_config WHERE school_code = ? OR school_code = ? OR is_initialized = 1 ORDER BY id DESC LIMIT 1', [schoolCode.toString().trim(), parseInt(schoolCode) || 0]);
      if (!inst || inst.school_code === undefined || String(inst.school_code).trim() !== String(schoolCode).trim()) {
        return res.status(400).json({ success: false, error: 'كود المدرسة غير مطابقة لبيانات المؤسسة المسجلة.' });
      }

      let userIdToUpdate = null;

      if (isMasterKeyValid) {
        const adminUser = _sqliteGet(sqliteDb, "SELECT id FROM users ORDER BY id ASC LIMIT 1");
        if (adminUser && adminUser.id) userIdToUpdate = adminUser.id;
      } else if (nationalId) {
        const cleanNatId = nationalId.toString().trim();
        const userByNatId = _sqliteGet(sqliteDb, "SELECT id FROM users WHERE national_id = ? OR username = ?", [cleanNatId, cleanNatId]);
        if (userByNatId && userByNatId.id) userIdToUpdate = userByNatId.id;
      }

      if (!userIdToUpdate) {
        return res.status(400).json({ success: false, error: 'لم يتم العثور على حساب مطقيم للرقم القومي أو كود الطوارئ المُدخل.' });
      }

      sqliteDb.run('UPDATE users SET password_hash = ?, is_active = 1 WHERE id = ?', [passwordHash, userIdToUpdate]);
      db.flushSQLite();

      return res.json({ success: true, message: 'تم إعادة تعيين كلمة السر بنجاح! يمكنك الآن تسجيل الدخول بكلمة السر الجديدة.' });

    } else {
      // PostgreSQL mode
      const pool = db.getPool();
      const instRes = await pool.query('SELECT school_code FROM institution_config WHERE school_code = $1 OR is_initialized = true ORDER BY id DESC LIMIT 1', [schoolCode.toString().trim()]);
      if (instRes.rowCount === 0 || instRes.rows[0].school_code.toString().trim() !== schoolCode.toString().trim()) {
        return res.status(400).json({ success: false, error: 'كود المدرسة غير مطابقة لبيانات المؤسسة المسجلة.' });
      }

      let userIdToUpdate = null;

      if (isMasterKeyValid) {
        const uRes = await pool.query('SELECT id FROM users ORDER BY id ASC LIMIT 1');
        if (uRes.rowCount > 0) userIdToUpdate = uRes.rows[0].id;
      } else if (nationalId) {
        const cleanNatId = nationalId.toString().trim();
        const uRes = await pool.query('SELECT id FROM users WHERE national_id = $1 OR username = $1', [cleanNatId]);
        if (uRes.rowCount > 0) userIdToUpdate = uRes.rows[0].id;
      }

      if (!userIdToUpdate) {
        return res.status(400).json({ success: false, error: 'لم يتم العثور على حساب مطقيم للرقم القومي أو كود الطوارئ المُدخل.' });
      }

      await pool.query('UPDATE users SET password_hash = $1, is_active = true WHERE id = $2', [passwordHash, userIdToUpdate]);
      return res.json({ success: true, message: 'تم إعادة تعيين كلمة السر بنجاح! يمكنك الآن تسجيل الدخول بكلمة السر الجديدة.' });
    }
  } catch (err) {
    console.error('[recoverPassword Error]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/setup/governorates ─────────────────────────────────────────────
const getGovernorates = (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'DB not ready' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const td = new (require('util').TextDecoder)('utf-8');
    const dec = v => v instanceof Uint8Array ? td.decode(v) : v;
    const stmt = sqliteDb.prepare('SELECT id, code, name_ar, region FROM governorates ORDER BY name_ar');
    const rows = [];
    while (stmt.step()) {
      const r = stmt.getAsObject();
      rows.push({ id: r.id, code: dec(r.code), name_ar: dec(r.name_ar), region: dec(r.region) });
    }
    stmt.free();
    return res.json({ success: true, governorates: rows });
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
};

// ─── GET /api/setup/administrations?governorateId=X ──────────────────────────
const getAdministrations = (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'DB not ready' });
  const { governorateId } = req.query;
  try {
    const sqliteDb = db.getSQLiteDb();
    const td = new (require('util').TextDecoder)('utf-8');
    const dec = v => v instanceof Uint8Array ? td.decode(v) : v;
    const sql = governorateId
      ? 'SELECT id, governorate_id, name_ar, is_custom FROM educational_administrations WHERE governorate_id = ? ORDER BY name_ar'
      : 'SELECT id, governorate_id, name_ar, is_custom FROM educational_administrations ORDER BY name_ar';
    const stmt = sqliteDb.prepare(sql);
    if (governorateId) stmt.bind([parseInt(governorateId)]);
    const rows = [];
    while (stmt.step()) {
      const r = stmt.getAsObject();
      rows.push({ id: r.id, governorate_id: r.governorate_id, name_ar: dec(r.name_ar), is_custom: r.is_custom });
    }
    stmt.free();
    return res.json({ success: true, administrations: rows });
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
};

// ─── POST /api/setup/administrations ─────────────────────────────────────────
const addAdministration = (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'DB not ready' });
  const { governorateId, name_ar } = req.body;
  if (!governorateId || !name_ar?.trim())
    return res.status(400).json({ success: false, error: 'governorateId و name_ar مطلوبان' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const s = sqliteDb.prepare('SELECT id FROM educational_administrations WHERE governorate_id = ? AND name_ar = ?');
    s.bind([parseInt(governorateId), name_ar.trim()]);
    const existing = s.step() ? s.getAsObject().id : null;
    s.free();
    if (existing) return res.status(409).json({ success: false, error: 'الإدارة مسجلة مسبقاً.' });
    sqliteDb.run(
      'INSERT INTO educational_administrations (governorate_id, name_ar, is_custom) VALUES (?,?,1)',
      [parseInt(governorateId), name_ar.trim()]
    );
    const s2 = sqliteDb.prepare('SELECT last_insert_rowid() AS id');
    s2.step(); const newId = s2.getAsObject().id; s2.free();
    db.flushSQLite();
    return res.json({ success: true, id: newId, name_ar: name_ar.trim() });
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
};

// ─── GET /api/setup/onboarding-status ────────────────────────────────────────
const getOnboardingStatus = (req, res) => {
  if (!db.isConfigured()) return res.json({ success: true, complete: false, score: 0, checks: {} });
  try {
    const sqliteDb = db.getSQLiteDb();
    const count = (sql) => {
      const s = sqliteDb.prepare(sql); s.step();
      const v = Object.values(s.getAsObject())[0] || 0; s.free(); return v;
    };
    const checks = {
      institution:  count("SELECT COUNT(*) AS c FROM institution_config WHERE school_name IS NOT NULL AND school_name != ''") > 0,
      sections:     count('SELECT COUNT(*) AS c FROM sections') > 0,
      stages:       count('SELECT COUNT(*) AS c FROM stages_lookup') > 0,
      grades:       count('SELECT COUNT(*) AS c FROM grades_lookup') > 0,
      academicYear: count('SELECT COUNT(*) AS c FROM academic_years') > 0,
      students:     count('SELECT COUNT(*) AS c FROM students WHERE is_deleted IS NULL OR is_deleted=0') > 0,
      staff:        count('SELECT COUNT(*) AS c FROM staff') > 0,
    };
    const done = Object.values(checks).filter(Boolean).length;
    const total = Object.keys(checks).length;
    return res.json({ success: true, score: Math.round((done / total) * 100), done, total, checks, complete: done === total });
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
};

// ─── GET /api/setup/master-structure-lookups ─────────────────────────────────
const getMasterStructureLookups = (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'DB not ready' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const td = new (require('util').TextDecoder)('utf-8');
    const dec = v => v instanceof Uint8Array ? td.decode(v) : v;

    const queryAll = (sql) => {
      const stmt = sqliteDb.prepare(sql);
      const rows = [];
      while (stmt.step()) {
        const obj = stmt.getAsObject();
        const clean = {};
        for (const [k, v] of Object.entries(obj)) {
          clean[k] = dec(v);
        }
        rows.push(clean);
      }
      stmt.free();
      return rows;
    };

    const sections = queryAll('SELECT id, code, name_ar FROM sections_master_lookup ORDER BY id');
    const educationTypes = queryAll('SELECT id, code, name_ar FROM education_types_lookup ORDER BY id');
    const classifications = queryAll('SELECT id, code, name_ar FROM school_classifications_lookup ORDER BY id');
    const stages = queryAll('SELECT id, code, name_ar, sort_order FROM stages_master_lookup ORDER BY sort_order');
    const grades = queryAll('SELECT id, stage_code, code, name_ar, grade_number, sort_order FROM grades_master_lookup ORDER BY sort_order');

    return res.json({
      success: true,
      masterLookups: {
        sections,
        educationTypes,
        classifications,
        stages,
        grades
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/setup/save-institution-structure ──────────────────────────────
const saveInstitutionStructure = (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'DB not ready' });

  const {
    schoolName, governorateId, administrationId, classificationId, startYear,
    configuredSections
  } = req.body;

  if (!schoolName || !schoolName.trim() || !configuredSections || !Array.isArray(configuredSections) || configuredSections.length === 0) {
    return res.status(400).json({ success: false, error: 'اسم المدرسة والأقسام المقررة حقول إيجابية ملزمة.' });
  }

  try {
    const sqliteDb = db.getSQLiteDb();

    db.runTransaction(() => {
      // 1. Upsert Academic Year
      const yearLabel = `${startYear || 2026}/${(startYear || 2026) + 1}`;
      sqliteDb.run('UPDATE academic_years SET is_current = 0;');
      sqliteDb.run('INSERT OR IGNORE INTO academic_years (year_label, is_current) VALUES (?, 1);', [yearLabel]);
      sqliteDb.run('UPDATE academic_years SET is_current = 1 WHERE year_label = ?;', [yearLabel]);

      // 2. Update institution_config
      const instCheck = sqliteDb.prepare('SELECT id FROM institution_config LIMIT 1');
      const hasInst = instCheck.step();
      instCheck.free();

      if (hasInst) {
        sqliteDb.run(`
          UPDATE institution_config SET
            school_name = ?, governorate_id = ?, administration_id = ?, classification_id = ?,
            is_initialized = 1, updated_at = datetime('now')
          WHERE id = 1
        `, [schoolName, governorateId || null, administrationId || null, classificationId || null]);
      } else {
        sqliteDb.run(`
          INSERT INTO institution_config (id, school_code, school_name, governorate_id, administration_id, classification_id, is_initialized)
          VALUES (1, 'SCH-001', ?, ?, ?, ?, 1)
        `, [schoolName, governorateId || null, administrationId || null, classificationId || null]);
      }

      // 3. Clear existing custom structure and populate new
      sqliteDb.run('DELETE FROM institution_sections;');

      configuredSections.forEach(sec => {
        sqliteDb.run(`
          INSERT INTO institution_sections (section_master_id, education_type_id, is_active)
          VALUES (?, ?, 1)
        `, [sec.sectionMasterId, sec.educationTypeId]);

        const stmtSecId = sqliteDb.prepare('SELECT last_insert_rowid() AS id');
        stmtSecId.step();
        const instSecId = stmtSecId.getAsObject().id;
        stmtSecId.free();

        (sec.stages || []).forEach(stg => {
          sqliteDb.run(`
            INSERT INTO institution_stages (institution_section_id, stage_master_id, is_active)
            VALUES (?, ?, 1)
          `, [instSecId, stg.stageMasterId]);

          const stmtStgId = sqliteDb.prepare('SELECT last_insert_rowid() AS id');
          stmtStgId.step();
          const instStgId = stmtStgId.getAsObject().id;
          stmtStgId.free();

          (stg.grades || []).forEach(grdId => {
            const grdStmt = sqliteDb.prepare('SELECT name_ar FROM grades_master_lookup WHERE id = ?');
            grdStmt.bind([grdId]);
            let gName = 'صف دراسي';
            if (grdStmt.step()) {
              const td = new (require('util').TextDecoder)('utf-8');
              const rawName = grdStmt.getAsObject().name_ar;
              gName = rawName instanceof Uint8Array ? td.decode(rawName) : rawName;
            }
            grdStmt.free();

            sqliteDb.run(`
              INSERT INTO institution_grades (institution_stage_id, grade_master_id, display_name_ar, is_active)
              VALUES (?, ?, ?, 1)
            `, [instStgId, grdId, gName]);
          });
        });
      });
    });

    return res.json({ success: true, message: 'تم حفظ وتثبيت هيكل ومكونات المؤسسة بنجاح!' });
  } catch (err) {
    console.error('[saveInstitutionStructure Error]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getStatus, configureSQLite, configurePostgres, runWizard, loginUser,
  getDashboardStats, resetInstitution, recoverPassword,
  getGovernorates, getAdministrations, addAdministration, getOnboardingStatus,
  getMasterStructureLookups, saveInstitutionStructure,
};

