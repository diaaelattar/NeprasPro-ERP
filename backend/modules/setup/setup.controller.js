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

  if (!schoolCode || !schoolName || !adminUsername || !adminNationalId || !adminFullName || !adminPassword) {
    return res.status(400).json({ success: false, error: 'يرجى استكمال الحقول الإلزامية.' });
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
        sqliteDb.run(`
          INSERT INTO institution_config (school_code, school_name, school_name_en, governorate, directorate, address, phone, email, website, is_initialized)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [schoolCode, schoolName, schoolNameEn || '', governorate || '', directorate || '', address || '', phone || '', email || '', website || '']);
        console.log('[Wizard] institution_config inserted.');

        // Sections, stages, grades
        for (const sec of (sections || [])) {
          sqliteDb.run(`
            INSERT INTO sections (name, type, education_type, legal_status) VALUES (?, ?, ?, ?)
          `, [sec.name, sec.type, sec.educationType || '', sec.legalStatus || '']);
          const sectionId = _getLastInsertId(sqliteDb);
          console.log(`[Wizard] Section "${sec.name}" inserted with id=${sectionId}`);

          for (const stageName of (sec.stages || [])) {
            let yearsCount = 3, displayOrder = 1;
            if (stageName === 'ابتدائي')  { yearsCount = 6; displayOrder = 1; }
            else if (stageName === 'إعدادي')  { yearsCount = 3; displayOrder = 2; }
            else if (stageName === 'ثانوي')   { yearsCount = 3; displayOrder = 3; }
            else if (stageName === 'تمهيدي')  { yearsCount = 2; displayOrder = 0; }

            sqliteDb.run(`
              INSERT INTO stages_lookup (section_id, stage_name, years_count, display_order) VALUES (?, ?, ?, ?)
            `, [sectionId, stageName, yearsCount, displayOrder]);
            const stageId = _getLastInsertId(sqliteDb);
            console.log(`[Wizard]   Stage "${stageName}" inserted with id=${stageId}`);

            const prefix = (sec.type === 'arabic' ? 'AR' : sec.type === 'languages' ? 'LN' : 'KG') +
                           (stageName === 'ابتدائي' ? '-PR' : stageName === 'إعدادي' ? '-PP' : stageName === 'ثانوي' ? '-SC' : '-KG');
            sqliteDb.run(`
              INSERT INTO stage_serial_counters (section_id, stage_id, prefix) VALUES (?, ?, ?)
            `, [sectionId, stageId, prefix]);

            const arabicNumerals = ['الأول','الثاني','الثالث','الرابع','الخامس','السادس'];
            for (let year = 1; year <= yearsCount; year++) {
              const gradeNameAr = `الصف ${arabicNumerals[year-1] || year} ال${stageName}`;
              sqliteDb.run(`
                INSERT INTO grades_lookup (stage_id, grade_number, grade_name_ar) VALUES (?, ?, ?)
              `, [stageId, year, gradeNameAr]);
            }
          }
        }

        // Super admin user
        sqliteDb.run(`
          INSERT INTO users (username, national_id, full_name, password_hash, is_active) VALUES (?, ?, ?, ?, 1)
        `, [adminUsername, adminNationalId, adminFullName, passwordHash]);
        const adminUserId = _getLastInsertId(sqliteDb);
        console.log(`[Wizard] Admin user inserted with id=${adminUserId}`);

        // Assign super_admin role
        const roleRow = _sqliteGet(sqliteDb, "SELECT id FROM roles WHERE role_name = 'super_admin'");
        if (roleRow && roleRow.id) {
          sqliteDb.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [adminUserId, roleRow.id]);
          console.log(`[Wizard] Admin role assigned. role_id=${roleRow.id}`);
        } else {
          console.warn('[Wizard] super_admin role not found in DB — skipping role assignment.');
        }

        // Default academic year
        const currentYear = new Date().getFullYear();
        sqliteDb.run(`
          INSERT OR IGNORE INTO academic_years (year_label, start_date, end_date, is_current) VALUES (?, ?, ?, 1)
        `, [`${currentYear}/${currentYear + 1}`, `${currentYear}-09-01`, `${currentYear + 1}-08-31`]);
        console.log('[Wizard] Academic year inserted.');

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

        await client.query(`
          INSERT INTO institution_config (school_code, school_name, school_name_en, governorate, directorate, address, phone, email, website, is_initialized)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
        `, [schoolCode, schoolName, schoolNameEn || '', governorate, directorate, address || '', phone || '', email || '', website || '']);

        for (const sec of (sections || [])) {
          const secRes = await client.query(
            'INSERT INTO sections (name, type, education_type, legal_status) VALUES ($1,$2,$3,$4) RETURNING id',
            [sec.name, sec.type, sec.educationType, sec.legalStatus]
          );
          const sectionId = secRes.rows[0].id;
          for (const stageName of (sec.stages || [])) {
            let yearsCount = 3, displayOrder = 1;
            if (stageName === 'ابتدائي') { yearsCount = 6; displayOrder = 1; }
            else if (stageName === 'إعدادي') { yearsCount = 3; displayOrder = 2; }
            else if (stageName === 'ثانوي') { yearsCount = 3; displayOrder = 3; }
            else if (stageName === 'تمهيدي') { yearsCount = 2; displayOrder = 0; }

            const stageRes = await client.query(
              'INSERT INTO stages_lookup (section_id, stage_name, years_count, display_order) VALUES ($1,$2,$3,$4) RETURNING id',
              [sectionId, stageName, yearsCount, displayOrder]
            );
            const stageId = stageRes.rows[0].id;

            const arabicNumerals = ['الأول','الثاني','الثالث','الرابع','الخامس','السادس'];
            for (let year = 1; year <= yearsCount; year++) {
              const gradeNameAr = `الصف ${arabicNumerals[year-1] || year} ال${stageName}`;
              await client.query(
                'INSERT INTO grades_lookup (stage_id, grade_number, grade_name_ar) VALUES ($1,$2,$3)',
                [stageId, year, gradeNameAr]
              );
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
        sqliteDb.run('DELETE FROM student_special_cases');
        sqliteDb.run('DELETE FROM student_transfers');
        sqliteDb.run('DELETE FROM class_enrollments');
        sqliteDb.run('DELETE FROM students');
        sqliteDb.run('DELETE FROM classes');
        sqliteDb.run('DELETE FROM grades_lookup');
        sqliteDb.run('DELETE FROM stages_lookup');
        sqliteDb.run('DELETE FROM sections');
        sqliteDb.run('DELETE FROM academic_years');
        sqliteDb.run('DELETE FROM stage_serial_counters');
        
        const stmt = sqliteDb.prepare("SELECT id FROM roles WHERE role_name = 'super_admin'");
        let superAdminRoleId = null;
        if (stmt.step()) {
          superAdminRoleId = stmt.getAsObject().id;
        }
        stmt.free();
        
        if (superAdminRoleId) {
          const uStmt = sqliteDb.prepare(`
            SELECT u.id FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            WHERE ur.role_id = ? OR u.username = 'admin'
            LIMIT 1
          `, [superAdminRoleId]);
          let adminUserId = null;
          if (uStmt.step()) {
            adminUserId = uStmt.getAsObject().id;
          }
          uStmt.free();
          
          if (adminUserId) {
            sqliteDb.run('DELETE FROM user_roles WHERE user_id != ?', [adminUserId]);
            sqliteDb.run('DELETE FROM users WHERE id != ?', [adminUserId]);
          } else {
            sqliteDb.run('DELETE FROM user_roles');
            sqliteDb.run('DELETE FROM users');
          }
        } else {
          sqliteDb.run('DELETE FROM user_roles');
          sqliteDb.run('DELETE FROM users');
        }

        sqliteDb.run('DELETE FROM institution_config');
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

module.exports = { getStatus, configureSQLite, configurePostgres, runWizard, loginUser, getDashboardStats, resetInstitution };
