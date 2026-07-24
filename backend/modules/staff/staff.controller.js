const db = require('../../config/db');

// ─── sql.js helpers ───────────────────────────────────────────────────────────
const _all = (sqliteDb, sql, params = []) => {
  const stmt = sqliteDb.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
};

const _get = (sqliteDb, sql, params = []) => {
  const stmt = sqliteDb.prepare(sql);
  if (params.length) stmt.bind(params);
  const hasRow = stmt.step();
  const row = hasRow ? stmt.getAsObject() : null;
  stmt.free();
  return row;
};

const _run = (sqliteDb, sql, params = []) => {
  sqliteDb.run(sql, params);
};

const _lastId = (sqliteDb) => {
  const stmt = sqliteDb.prepare('SELECT last_insert_rowid() AS id');
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return row['last_insert_rowid()'] || row.id;
};

// ─── Helper: Calculate Official Egyptian Ministry Class Quota ─────────
const calculateClassQuota = (cadreTitle, stage, isSupervisor) => {
  if (!cadreTitle) return 0;
  const t = cadreTitle.trim();
  const st = (stage || 'إعدادي').trim();

  let quota = 0;
  if (t.includes('كبير')) {
    quota = st.includes('ابتدائ') ? 16 : st.includes('ثانو') ? 14 : 15;
  } else if (t.includes('خبير')) {
    quota = st.includes('ابتدائ') ? 18 : st.includes('ثانو') ? 16 : 17;
  } else if (t.includes('أول (أ)') || t.includes('أول أ')) {
    quota = st.includes('ابتدائ') ? 20 : st.includes('ثانو') ? 16 : 18;
  } else if (t.includes('أول')) {
    quota = st.includes('ابتدائ') ? 22 : st.includes('ثانو') ? 17 : 19;
  } else if (t.includes('معلم') || t.includes('مساعد')) {
    quota = st.includes('ابتدائ') ? 24 : st.includes('ثانو') ? 18 : 21;
  } else {
    return 0; // Non-teaching role
  }

  if (isSupervisor) quota = Math.max(0, quota - 2);
  return quota;
};

// ─── Helper: Calculate Cadre Promotion Eligibility ───────────────────────────
const calculatePromotionEligibility = (cadreDate, hireDate) => {
  const refDateStr = cadreDate || hireDate;
  if (!refDateStr) return { eligible: false, years: 0, statusLabel: 'غير محدد' };

  const refDate = new Date(refDateStr);
  if (isNaN(refDate.getTime())) return { eligible: false, years: 0, statusLabel: 'تاريخ غير صالح' };

  const diffMs = Date.now() - refDate.getTime();
  const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  const eligible = years >= 5;

  return {
    eligible,
    years: Math.floor(years),
    statusLabel: eligible
      ? `مستحق للترقية (مرّت ${Math.floor(years)} سنوات)`
      : `متبقٍ ${Math.ceil(5 - years)} سنة على الترقية`
  };
};

// ─── GET /api/staff ───────────────────────────────────────────────────────────
exports.getAllStaff = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const { search, status, employment_type, staff_category, promotion_eligible, page = 1, limit = 50 } = req.query;

    const where = ['1=1'];
    const params = [];

    if (search) {
      where.push('(full_name_ar LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR national_id LIKE ? OR subject LIKE ? OR title LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    if (employment_type && employment_type !== 'all') {
      where.push('employment_type = ?');
      params.push(employment_type);
    }
    if (staff_category && staff_category !== 'all') {
      where.push('staff_category = ?');
      params.push(staff_category);
    }

    const whereStr = where.join(' AND ');
    const total = _get(sqliteDb, `SELECT COUNT(*) AS n FROM staff WHERE ${whereStr}`, params)?.n || 0;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let staffList = _all(sqliteDb, `
      SELECT id, national_id, full_name_ar, first_name, middle_name, last_name, gender, birth_date,
             hire_date, title, status, phone, email, employment_type, staff_category, cadre_title,
             financial_grade, cadre_date, qualification, teaching_stage, subject, org_name, address, is_supervisor
      FROM staff
      WHERE ${whereStr}
      ORDER BY id ASC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    // Attach Class Quota and Promotion Eligibility to each staff member
    staffList = staffList.map(st => {
      const classQuota = calculateClassQuota(st.cadre_title || st.title, st.teaching_stage, st.is_supervisor === 1);
      const promo = calculatePromotionEligibility(st.cadre_date, st.hire_date);
      return { ...st, class_quota: classQuota, promotion_info: promo };
    });

    if (promotion_eligible === 'true') {
      staffList = staffList.filter(st => st.promotion_info.eligible);
    }

    return res.json({ success: true, staff: staffList, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/staff/:id ───────────────────────────────────────────────────────
exports.getStaffById = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const staff = _get(sqliteDb, `SELECT * FROM staff WHERE id = ?`, [req.params.id]);
    if (!staff) return res.status(404).json({ success: false, error: 'لم يتم العثور على الموظف.' });

    const classQuota = calculateClassQuota(staff.cadre_title || staff.title, staff.teaching_stage, staff.is_supervisor === 1);
    const promo = calculatePromotionEligibility(staff.cadre_date, staff.hire_date);

    // Fetch leaves summary
    const leaves = _all(sqliteDb, `SELECT * FROM staff_leaves WHERE staff_id = ? ORDER BY start_date DESC`, [req.params.id]);
    const casualLeavesUsed = leaves.filter(l => l.leave_type === 'عارضة').reduce((acc, l) => acc + (l.days_count || 0), 0);
    const annualLeavesUsed = leaves.filter(l => l.leave_type === 'اعتيادية').reduce((acc, l) => acc + (l.days_count || 0), 0);

    return res.json({
      success: true,
      staff: {
        ...staff,
        class_quota: classQuota,
        promotion_info: promo,
        leaves,
        casual_leaves_used: casualLeavesUsed,
        casual_leaves_remaining: Math.max(0, 7 - casualLeavesUsed),
        annual_leaves_used: annualLeavesUsed
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/staff ──────────────────────────────────────────────────────────
exports.createStaff = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const {
      full_name_ar, national_id, first_name, middle_name, last_name, gender, birth_date,
      hire_date, title, base_salary, status, notes, address, phone, email, religion,
      birth_place, marital_status, marital_status_date, address_gov, phone_land,
      work_start_date, hire_type, job_class, qualification_type, qualification,
      qualification_entity, qualification_date, teaching_stage, subject, org_name,
      employment_type, staff_category, cadre_title, financial_grade, cadre_date, is_supervisor
    } = req.body;

    if (!national_id || national_id.length !== 14) {
      return res.status(400).json({ success: false, error: 'الرقم القومي يجب أن يكون 14 رقماً.' });
    }

    const finalFullName = full_name_ar || [first_name, middle_name, last_name].filter(Boolean).join(' ');
    const nameTokens = finalFullName.split(/\s+/).filter(Boolean);
    const fName = first_name || nameTokens[0] || finalFullName;
    const lName = last_name || nameTokens[nameTokens.length - 1] || '';
    const mName = middle_name || nameTokens.slice(1, nameTokens.length - 1).join(' ') || '';

    _run(sqliteDb, `
      INSERT INTO staff (
        full_name_ar, national_id, first_name, middle_name, last_name, gender, birth_date,
        hire_date, title, base_salary, status, notes, address, phone, email, religion,
        birth_place, marital_status, marital_status_date, address_gov, phone_land,
        work_start_date, hire_type, job_class, qualification_type, qualification,
        qualification_entity, qualification_date, teaching_stage, subject, org_name,
        employment_type, staff_category, cadre_title, financial_grade, cadre_date, is_supervisor
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      finalFullName, national_id, fName, mName, lName, gender || null, birth_date || null,
      hire_date || null, title || null, base_salary || 0, status || 'نشط', notes || null,
      address || null, phone || null, email || null, religion || null,
      birth_place || null, marital_status || null, marital_status_date || null, address_gov || null, phone_land || null,
      work_start_date || null, hire_type || null, job_class || null, qualification_type || null, qualification || null,
      qualification_entity || null, qualification_date || null, teaching_stage || null, subject || null, org_name || null,
      employment_type || 'قوة أساسية', staff_category || 'معلم', cadre_title || null, financial_grade || null, cadre_date || null,
      is_supervisor ? 1 : 0
    ]);

    const id = _lastId(sqliteDb);
    db.flushSQLite();
    return res.json({ success: true, message: 'تم إضافة الموظف بنجاح.', id });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed: staff.national_id')) {
      return res.status(400).json({ success: false, error: 'الرقم القومي مسجل بالفعل.' });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── PUT /api/staff/:id ───────────────────────────────────────────────────────
exports.updateStaff = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const { id } = req.params;
    const {
      full_name_ar, national_id, first_name, middle_name, last_name, gender, birth_date,
      hire_date, title, base_salary, status, notes, address, phone, email, religion,
      birth_place, marital_status, marital_status_date, address_gov, phone_land,
      work_start_date, hire_type, job_class, qualification_type, qualification,
      qualification_entity, qualification_date, teaching_stage, subject, org_name,
      employment_type, staff_category, cadre_title, financial_grade, cadre_date, is_supervisor
    } = req.body;

    if (!national_id || national_id.length !== 14) {
      return res.status(400).json({ success: false, error: 'الرقم القومي يجب أن يكون 14 رقماً.' });
    }

    const finalFullName = full_name_ar || [first_name, middle_name, last_name].filter(Boolean).join(' ');
    const nameTokens = finalFullName.split(/\s+/).filter(Boolean);
    const fName = first_name || nameTokens[0] || finalFullName;
    const lName = last_name || nameTokens[nameTokens.length - 1] || '';
    const mName = middle_name || nameTokens.slice(1, nameTokens.length - 1).join(' ') || '';

    _run(sqliteDb, `
      UPDATE staff SET
        full_name_ar = ?, national_id = ?, first_name = ?, middle_name = ?, last_name = ?, gender = ?,
        birth_date = ?, hire_date = ?, title = ?, base_salary = ?, status = ?,
        notes = ?, address = ?, phone = ?, email = ?, religion = ?,
        birth_place = ?, marital_status = ?, marital_status_date = ?, address_gov = ?, phone_land = ?,
        work_start_date = ?, hire_type = ?, job_class = ?, qualification_type = ?, qualification = ?,
        qualification_entity = ?, qualification_date = ?, teaching_stage = ?, subject = ?, org_name = ?,
        employment_type = ?, staff_category = ?, cadre_title = ?, financial_grade = ?, cadre_date = ?,
        is_supervisor = ?
      WHERE id = ?
    `, [
      finalFullName, national_id, fName, mName, lName, gender || null, birth_date || null,
      hire_date || null, title || null, base_salary || 0, status || 'نشط', notes || null,
      address || null, phone || null, email || null, religion || null,
      birth_place || null, marital_status || null, marital_status_date || null, address_gov || null, phone_land || null,
      work_start_date || null, hire_type || null, job_class || null, qualification_type || null, qualification || null,
      qualification_entity || null, qualification_date || null, teaching_stage || null, subject || null, org_name || null,
      employment_type || 'قوة أساسية', staff_category || 'معلم', cadre_title || null, financial_grade || null, cadre_date || null,
      is_supervisor ? 1 : 0,
      id
    ]);

    db.flushSQLite();
    return res.json({ success: true, message: 'تم تحديث بيانات الموظف بنجاح.' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed: staff.national_id')) {
      return res.status(400).json({ success: false, error: 'الرقم القومي مسجل بالفعل.' });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── DELETE /api/staff/:id ────────────────────────────────────────────────────
exports.deleteStaff = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const { id } = req.params;
    _run(sqliteDb, `DELETE FROM staff WHERE id = ?`, [id]);
    db.flushSQLite();
    return res.json({ success: true, message: 'تم حذف الموظف بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/staff/:id/leaves ───────────────────────────────────────────────
exports.addStaffLeave = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const staffId = req.params.id;
    const { leave_type, start_date, end_date, days_count, reason } = req.body;

    if (!leave_type || !start_date || !end_date || !days_count) {
      return res.status(400).json({ success: false, error: 'جميع بيانات الأجازة تكميلية ومطلوبة.' });
    }

    _run(sqliteDb, `
      INSERT INTO staff_leaves (staff_id, leave_type, start_date, end_date, days_count, reason, approval_status)
      VALUES (?, ?, ?, ?, ?, ?, 'مقبول')
    `, [staffId, leave_type, start_date, end_date, parseInt(days_count), reason || null]);

    const leaveId = _lastId(sqliteDb);
    db.flushSQLite();
    return res.json({ success: true, message: 'تم تسجيل الأجازة بنجاح.', leaveId });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
