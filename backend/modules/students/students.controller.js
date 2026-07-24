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

const _lastId = (sqliteDb) => {
  const stmt = sqliteDb.prepare('SELECT last_insert_rowid() AS id');
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return row['last_insert_rowid()'] || row.id;
};

// ─── Generate student code ─────────────────────────────────────────────────
const _generateCode = (sqliteDb, sectionId, stageId) => {
  const counter = _get(sqliteDb,
    'SELECT id, prefix, last_serial FROM stage_serial_counters WHERE section_id = ? AND stage_id = ?',
    [sectionId, stageId]
  );
  if (!counter) throw new Error('لم يتم العثور على كاونتر التسلسل للقسم والمرحلة المحددَين.');
  const year = new Date().getFullYear();
  const next = (counter.last_serial || 0) + 1;
  sqliteDb.run('UPDATE stage_serial_counters SET last_serial = ? WHERE id = ?', [next, counter.id]);
  return `${counter.prefix}-${year}-${String(next).padStart(4, '0')}`;
};

// ─── Arabic text normalizer ───────────────────────────────────────────────────
// Converts common Arabic typo variants so DB CHECK constraints are never
// violated by inconsistent spelling (e.g. مسيحى → مسيحي).
const normalizeAr = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str
    .trim()
    .replace(/ى(?=[\s,،.؟!]|$)/g, 'ي')   // alef maqsura at word end → ya
    .replace(/ى/g, 'ي')                    // alef maqsura anywhere → ya (safer)
    .replace(/[أإآ]/g, 'ا')               // all hamza-alef variants → bare alef
    .replace(/ة/g, 'ة')                   // keep ta marbuta as-is (already correct)
    .replace(/\u0640/g, '')               // remove tatweel (kashida)
    .trim();
};

// Religion value normalizer — maps any common spelling to the exact DB enum
const RELIGION_MAP = {
  'مسلم': 'مسلم',
  'مسلمة': 'مسلم',
  'مسيحي': 'مسيحي',
  'مسيحى': 'مسيحي',
  'مسيحية': 'مسيحي',
  'مسيحيه': 'مسيحي',
  'مسيحيى': 'مسيحي',
  'نصراني': 'مسيحي',
  'نصرانى': 'مسيحي',
  'christian': 'مسيحي',
  'muslim': 'مسلم',
  'أخرى': 'أخرى',
  'اخرى': 'أخرى',
  'اخري': 'أخرى',
  'أخري': 'أخرى',
  'other': 'أخرى',
};

const normalizeReligion = (val) => {
  if (!val) return null;
  const cleaned = normalizeAr(val).toLowerCase().trim();
  // Try exact map first
  const direct = RELIGION_MAP[val.trim()];
  if (direct) return direct;
  // Try after normalization
  const normalized = normalizeAr(val.trim());
  return RELIGION_MAP[normalized] || normalized || null;
};

const parseNationalId = (nid) => {
  if (!nid) return null;
  const clean = nid.toString().trim();
  if (clean.length !== 14 || !/^\d{14}$/.test(clean)) return null;

  const centuryDigit = parseInt(clean[0]);
  const yy = clean.slice(1, 3);
  const mm = clean.slice(3, 5);
  const dd = clean.slice(5, 7);
  const gov = clean.slice(7, 9);
  const genderDigit = parseInt(clean[12]);

  let century = '';
  if (centuryDigit === 2) century = '19';
  else if (centuryDigit === 3) century = '20';
  else return null;

  const birthDate = `${century}${yy}-${mm}-${dd}`;
  const gender = (genderDigit % 2 === 1) ? 'ذكر' : 'أنثى';

  const govMap = {
    '01': 'القاهرة', '02': 'الإسكندرية', '03': 'بورسعيد', '04': 'السويس',
    '11': 'دمياط', '12': 'الدقهلية', '13': 'الشرقية', '14': 'القليوبية',
    '15': 'كفر الشيخ', '16': 'الغربية', '17': 'المنوفية', '18': 'البحيرة',
    '19': 'الإسماعيلية', '21': 'الجيزة', '22': 'بني سويف', '23': 'الفيوم',
    '24': 'المنيا', '25': 'أسيوط', '26': 'سوهاج', '27': 'قنا', '28': 'أسوان',
    '29': 'الأقصر', '31': 'البحر الأحمر', '32': 'الوادي الجديد', '33': 'مطروح',
    '34': 'شمال سيناء', '35': 'جنوب سيناء', '88': 'خارج الجمهورية'
  };
  const birthPlace = govMap[gov] || 'أخرى';

  return { birthDate, gender, birthPlace };
};

// ─── GET /api/students/form-options ───────────────────────────────────────────
const getFormOptions = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const sections      = _all(sqliteDb, 'SELECT id, name, type FROM sections ORDER BY name');
    const stages        = _all(sqliteDb, 'SELECT id, section_id, stage_name, years_count FROM stages_lookup ORDER BY section_id, display_order');
    const grades        = _all(sqliteDb, 'SELECT id, stage_id, grade_number, grade_name_ar, secondary_system FROM grades_lookup ORDER BY stage_id, grade_number');
    const nationalities = _all(sqliteDb, 'SELECT id, name FROM nationalities ORDER BY name');
    const academicYears = _all(sqliteDb, 'SELECT id, year_label, is_current FROM academic_years ORDER BY id DESC');
    const caseTypes     = _all(sqliteDb, 'SELECT id, code, name_ar FROM special_case_types WHERE is_active = 1 ORDER BY name_ar');
    return res.json({ success: true, sections, stages, grades, nationalities, academicYears, caseTypes });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/students/stats ───────────────────────────────────────────────
const getStats = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const { academicYearId, sectionId } = req.query;
    
    const conditions = ['1=1'];
    const params = [];
    
    if (academicYearId) {
      conditions.push('s.academic_year_id = ?');
      params.push(academicYearId);
    }
    if (sectionId) {
      conditions.push('s.section_id = ?');
      params.push(sectionId);
    }
    
    const condStr = conditions.join(' AND ');
    const baseFilter = `${condStr} AND (s.is_deleted IS NULL OR s.is_deleted = 0)`;

    // Active base filter (main registry: promoted + retained only, excluding disconnected, suspended, excluded)
    const activeFilter = `${baseFilter} AND (s.status NOT IN ('excluded', 'disconnected', 'suspended', 'مستبعد', 'منقطع', 'موقوف قيده') AND (s.enrollment_status NOT IN ('مستبعد', 'منقطع', 'موقوف قيده') OR s.enrollment_status IS NULL))`;

    const total        = _get(sqliteDb, `SELECT COUNT(*) AS n FROM students s WHERE ${activeFilter}`, params)?.n || 0;
    const promoted     = _get(sqliteDb, `SELECT COUNT(*) AS n FROM students s WHERE ${activeFilter} AND (s.status IN ('promoted', 'منقول') OR s.enrollment_status = 'منقول')`, params)?.n || 0;
    const retained     = _get(sqliteDb, `SELECT COUNT(*) AS n FROM students s WHERE ${activeFilter} AND (s.status IN ('retained', 'باق') OR s.enrollment_status = 'باق')`, params)?.n || 0;
    const disconnected = _get(sqliteDb, `SELECT COUNT(*) AS n FROM students s WHERE ${baseFilter} AND (s.status IN ('disconnected', 'منقطع') OR s.enrollment_status = 'منقطع')`, params)?.n || 0;
    const suspended    = _get(sqliteDb, `SELECT COUNT(*) AS n FROM students s WHERE ${baseFilter} AND (s.status IN ('suspended', 'موقوف قيده') OR s.enrollment_status = 'موقوف قيده')`, params)?.n || 0;
    const excluded     = _get(sqliteDb, `SELECT COUNT(*) AS n FROM students s WHERE ${baseFilter} AND (s.status IN ('excluded', 'مستبعد') OR s.enrollment_status = 'مستبعد')`, params)?.n || 0;
    const deleted      = _get(sqliteDb, `SELECT COUNT(*) AS n FROM students s WHERE s.is_deleted = 1 AND ${condStr}`, params)?.n || 0;
    const male         = _get(sqliteDb, `SELECT COUNT(*) AS n FROM students s WHERE s.gender='ذكر' AND ${activeFilter}`, params)?.n || 0;
    const female       = _get(sqliteDb, `SELECT COUNT(*) AS n FROM students s WHERE s.gender='أنثى' AND ${activeFilter}`, params)?.n || 0;
    
    const bySection = _all(sqliteDb, `
      SELECT sec.name, COUNT(s.id) AS cnt
      FROM students s JOIN sections sec ON sec.id = s.section_id
      WHERE ${activeFilter}
      GROUP BY s.section_id`, params);

    return res.json({ success: true, stats: { total, promoted, retained, disconnected, suspended, excluded, deleted, male, female, bySection } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/students ─────────────────────────────────────────────────────
const getStudents = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const {
      search, sectionId, stageId, gradeId, classId, status, viewMode,
      academicYearId, secondaryTrack, deleted, page = 1, limit = 30,
      sortBy, sortDir, genderOrder,  // new: gender ordering option
      gender, religion,       // new: demographic filters
      isMerged, nationalityId // new: merge / nationality filters
    } = req.query;

    const where  = ['1=1'];
    const params = [];

    const activeMode = viewMode || status;

    // Soft-delete filter
    if (deleted === 'true' || activeMode === 'deleted') {
      where.push('s.is_deleted = 1');
    } else {
      where.push('(s.is_deleted IS NULL OR s.is_deleted = 0)');

      if (activeMode === 'disconnected') {
        where.push("(s.status IN ('disconnected', 'منقطع') OR s.enrollment_status = 'منقطع')");
      } else if (activeMode === 'suspended') {
        where.push("(s.status IN ('suspended', 'موقوف قيده') OR s.enrollment_status = 'موقوف قيده')");
      } else if (activeMode === 'excluded') {
        where.push("(s.status IN ('excluded', 'مستبعد') OR s.enrollment_status = 'مستبعد')");
      } else if (activeMode === 'active' || activeMode === 'normal' || activeMode === 'promoted' || activeMode === 'retained') {
        where.push("(s.status IN ('promoted', 'retained', 'منقول', 'باق', 'منقولين', 'باقون', 'active', 'نشط') OR s.status IS NULL OR s.status = '' OR s.enrollment_status IN ('منقول', 'باق', 'منقولين', 'باقون') OR s.enrollment_status IS NULL OR s.enrollment_status = '') AND (s.status NOT IN ('excluded', 'disconnected', 'suspended', 'مستبعد', 'منقطع', 'موقوف قيده') AND (s.enrollment_status NOT IN ('مستبعد', 'منقطع', 'موقوف قيده') OR s.enrollment_status IS NULL))");
      } else {
        // Main registry by default: promoted + retained only
        where.push("(s.status NOT IN ('excluded', 'disconnected', 'suspended', 'مستبعد', 'منقطع', 'موقوف قيده') AND (s.enrollment_status NOT IN ('مستبعد', 'منقطع', 'موقوف قيده') OR s.enrollment_status IS NULL))");
      }
    }

    if (search)        { where.push('(s.full_name_ar LIKE ? OR s.student_code LIKE ? OR s.national_id LIKE ? OR s.emis_student_code LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
    if (sectionId)     { where.push('s.section_id = ?');       params.push(sectionId); }
    if (stageId)       { where.push('s.stage_id = ?');         params.push(stageId); }
    if (gradeId)       { where.push('s.grade_id = ?');         params.push(gradeId); }

    if (classId) {
      where.push('EXISTS (SELECT 1 FROM class_enrollments ce WHERE ce.student_id = s.id AND ce.class_id = ?)');
      params.push(classId);
    }

    if (academicYearId){ where.push('s.academic_year_id = ?'); params.push(academicYearId); }
    if (secondaryTrack){ where.push('s.secondary_track = ?');  params.push(secondaryTrack); }

    // ── New demographic & merge filters ───────────────────────
    if (gender)       { where.push('s.gender = ?');          params.push(gender); }
    if (religion)     { where.push('s.religion = ?');        params.push(religion); }
    if (nationalityId){ where.push('s.nationality_id = ?');  params.push(nationalityId); }
    if (isMerged === '1' || isMerged === 'true')  { where.push('s.is_merged = 1'); }
    if (isMerged === '0' || isMerged === 'false') { where.push('(s.is_merged IS NULL OR s.is_merged = 0)'); }

    // ── Dynamic ORDER BY (Boys first / Girls first / Alphabetical) ────
    let orderClause = '';
    if (genderOrder === 'boys_first') {
      orderClause = `(CASE WHEN s.gender = 'ذكر' THEN 1 WHEN s.gender = 'أنثى' THEN 2 ELSE 3 END) ASC, s.full_name_ar ASC`;
    } else if (genderOrder === 'girls_first') {
      orderClause = `(CASE WHEN s.gender = 'أنثى' THEN 1 WHEN s.gender = 'ذكر' THEN 2 ELSE 3 END) ASC, s.full_name_ar ASC`;
    } else {
      const ALLOWED_SORT = {
        name:     's.full_name_ar',
        gender:   's.gender',
        status:   's.status',
        grade:    's.grade_id',
        date:     's.created_at',
        religion: 's.religion',
      };
      const sortCol = ALLOWED_SORT[sortBy] || 's.full_name_ar';
      const sortDirection = sortDir === 'asc' ? 'ASC' : 'DESC';
      orderClause = sortCol === 's.full_name_ar'
        ? `${sortCol} ${sortDirection}`
        : `${sortCol} ${sortDirection}, s.full_name_ar ASC`;
    }

    const whereStr = where.join(' AND ');
    const total    = _get(sqliteDb, `SELECT COUNT(*) AS n FROM students s WHERE ${whereStr}`, params)?.n || 0;
    const queryLimit = limit === 'all' ? 100000 : (parseInt(limit) || 30);
    const offset = (parseInt(page) - 1) * queryLimit;

    const students = _all(sqliteDb, `
      SELECT s.id, s.student_code, s.full_name_ar, s.gender, s.status,
             s.birth_date, s.guardian_phone, s.enrollment_date,
             s.secondary_track, s.second_language,
             s.national_id, s.religion, s.guardian_name, s.guardian_job, s.address,
             s.is_merged, s.merge_type, s.merge_decision_number, s.merge_decision_date, s.merge_notes,
             n.name AS nationality_name,
             sec.name  AS section_name,
             st.stage_name,
             g.grade_name_ar,
             ay.year_label AS academic_year,
             c.class_name AS classroom_name,
             c.id AS classroom_id,
             s.deletion_reason
      FROM students s
      LEFT JOIN sections      sec ON sec.id = s.section_id
      LEFT JOIN stages_lookup st  ON st.id  = s.stage_id
      LEFT JOIN grades_lookup g   ON g.id   = s.grade_id
      LEFT JOIN academic_years ay ON ay.id  = s.academic_year_id
      LEFT JOIN nationalities  n  ON n.id   = s.nationality_id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.academic_year_id = s.academic_year_id
      LEFT JOIN classes c ON c.id = ce.class_id
      WHERE ${whereStr}
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?
    `, [...params, queryLimit, offset]);

    return res.json({ success: true, students, total, page: parseInt(page), limit: queryLimit });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/students/:id ────────────────────────────────────────────────
const getStudent = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const student = _get(sqliteDb, `
      SELECT s.*,
             sec.name AS section_name, sec.type AS section_type,
             st.stage_name,
             g.grade_name_ar, g.secondary_system,
             ay.year_label AS academic_year,
             n.name  AS nationality_name,
             mn.name AS mother_nationality_name,
             mg.grade_name_ar AS merged_grade_name,
             c.class_name AS classroom_name,
             c.id AS classroom_id
      FROM students s
      LEFT JOIN sections      sec ON sec.id  = s.section_id
      LEFT JOIN stages_lookup st  ON st.id   = s.stage_id
      LEFT JOIN grades_lookup g   ON g.id    = s.grade_id
      LEFT JOIN academic_years ay ON ay.id   = s.academic_year_id
      LEFT JOIN nationalities  n  ON n.id    = s.nationality_id
      LEFT JOIN nationalities  mn ON mn.id   = s.mother_nationality_id
      LEFT JOIN grades_lookup  mg ON mg.id   = s.merged_grade_id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.academic_year_id = s.academic_year_id
      LEFT JOIN classes c ON c.id = ce.class_id
      WHERE s.id = ?`, [req.params.id]);

    if (!student) return res.status(404).json({ success: false, error: 'الطالب غير موجود.' });

    const specialCases = _all(sqliteDb, `
      SELECT ssc.*, sct.name_ar AS case_name, sct.code AS case_code
      FROM student_special_cases ssc
      JOIN special_case_types sct ON sct.id = ssc.case_type_id
      WHERE ssc.student_id = ? AND ssc.is_active = 1`, [req.params.id]);

    const documents = _all(sqliteDb, `
      SELECT sd.*, dt.name AS doc_type_name
      FROM student_documents sd
      LEFT JOIN document_types dt ON dt.id = sd.doc_type_id
      WHERE sd.student_id = ?`, [req.params.id]);

    const transfers = _all(sqliteDb, `
      SELECT str.*, ay.year_label
      FROM student_transfers str
      LEFT JOIN academic_years ay ON ay.id = str.academic_year_id
      WHERE str.student_id = ?
      ORDER BY str.transfer_date DESC`, [req.params.id]);

    return res.json({ success: true, student, specialCases, documents, transfers });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getDuplicateStudents = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const duplicates = _all(sqliteDb, `
      SELECT full_name_ar, national_id, COUNT(*) as count 
      FROM students 
      WHERE national_id IS NOT NULL AND national_id != '' 
      GROUP BY national_id 
      HAVING count > 1`);
    return res.json({ success: true, duplicates });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Helper status mapper
const mapStudentStatus = (rawStatus) => {
  const s = (rawStatus || 'promoted').trim();
  const MAP = {
    promoted:       { status: 'promoted', enrollment: 'منقول', is_excluded: 0 },
    retained:       { status: 'retained', enrollment: 'باق', is_excluded: 0 },
    disconnected:   { status: 'disconnected', enrollment: 'منقطع', is_excluded: 0 },
    suspended:      { status: 'suspended', enrollment: 'موقوف قيده', is_excluded: 0 },
    excluded:       { status: 'excluded', enrollment: 'مستبعد', is_excluded: 1 },
    'منقول':        { status: 'promoted', enrollment: 'منقول', is_excluded: 0 },
    'باق':          { status: 'retained', enrollment: 'باق', is_excluded: 0 },
    'باقٍ للإعادة': { status: 'retained', enrollment: 'باق', is_excluded: 0 },
    'منقطع':        { status: 'disconnected', enrollment: 'منقطع', is_excluded: 0 },
    'موقوف قيده':   { status: 'suspended', enrollment: 'موقوف قيده', is_excluded: 0 },
    'مستبعد':       { status: 'excluded', enrollment: 'مستبعد', is_excluded: 1 },
  };
  return MAP[s] || { status: 'promoted', enrollment: 'منقول', is_excluded: 0 };
};

// ─── POST /api/students ────────────────────────────────────────────────────
const createStudent = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });

  const {
    sectionId, stageId, gradeId, academicYearId,
    fullNameAr, fullNameEn, birthDate, birthPlace,
    nationalityId, nationalId, gender, religion,
    guardianName, guardianRelation, guardianNationalId, guardianPhone, guardianPhone2, guardianJob,
    motherName, motherNationalityId, motherNationalId,
    address, studentPhone, secondLanguage, secondaryTrack, secondaryElective,
    isMerged, mergedGradeId, mergeType, mergeDecisionNumber, mergeDecisionDate, mergeNotes, enrollmentDate,
    status, specialCases, emisStudentCode
  } = req.body;

  if (!fullNameAr || !sectionId || !stageId || !gradeId || !academicYearId || !gender) {
    return res.status(400).json({ success: false, error: 'يرجى استكمال الحقول الإلزامية: الاسم، القسم، المرحلة، الصف، العام الدراسي، الجنس.' });
  }

  const mapped = mapStudentStatus(status);

  try {
    const sqliteDb = db.getSQLiteDb();
    let studentId, studentCode;

    db.runTransaction(() => {
      studentCode = _generateCode(sqliteDb, parseInt(sectionId), parseInt(stageId));
      sqliteDb.run(`
        INSERT INTO students (
          section_id, stage_id, grade_id, academic_year_id, student_code,
          full_name_ar, full_name_en, birth_date, birth_place,
          nationality_id, national_id, gender, religion,
          guardian_name, guardian_relation, guardian_national_id,
          guardian_phone, guardian_phone_2, guardian_job,
          mother_name, mother_nationality_id, mother_national_id,
          address, student_phone, second_language, secondary_track, secondary_elective,
          is_merged, merged_grade_id, merge_type, merge_decision_number, merge_decision_date, merge_notes, enrollment_date,
          status, enrollment_status, is_excluded, emis_student_code
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `, [
        sectionId, stageId, gradeId, academicYearId, studentCode,
        fullNameAr, fullNameEn||null, birthDate||null, birthPlace||null,
        nationalityId||null, nationalId||null, gender, religion||null,
        guardianName||null, guardianRelation||null, guardianNationalId||null,
        guardianPhone||null, guardianPhone2||null, guardianJob||null,
        motherName||null, motherNationalityId||null, motherNationalId||null,
        address||null, studentPhone||null, secondLanguage||null, secondaryTrack||null, secondaryElective||null,
        isMerged ? 1 : 0, mergedGradeId||null, mergeType||null, mergeDecisionNumber||null, mergeDecisionDate||null, mergeNotes||null,
        enrollmentDate || new Date().toISOString().split('T')[0],
        mapped.status, mapped.enrollment, mapped.is_excluded,
        emisStudentCode || null
      ]);
      studentId = _lastId(sqliteDb);
      for (const caseTypeId of (specialCases || [])) {
        sqliteDb.run('INSERT OR IGNORE INTO student_special_cases (student_id, case_type_id) VALUES (?,?)', [studentId, caseTypeId]);
      }
    });

    console.log(`[Students] Created "${fullNameAr}" → ${studentCode}`);
    return res.status(201).json({ success: true, message: `تم تسجيل الطالب بنجاح. كود الطالب: ${studentCode}`, studentId, studentCode });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── PUT /api/students/:id ────────────────────────────────────────────────
const updateStudent = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  const {
    fullNameAr, fullNameEn, birthDate, birthPlace,
    nationalityId, nationalId, gender, religion,
    guardianName, guardianRelation, guardianNationalId, guardianPhone, guardianPhone2, guardianJob,
    motherName, motherNationalityId, motherNationalId,
    address, studentPhone, secondLanguage, secondaryTrack, secondaryElective,
    isMerged, mergedGradeId, mergeType, mergeDecisionNumber, mergeDecisionDate, mergeNotes, status, specialCases,
    emisStudentCode
  } = req.body;

  const mapped = mapStudentStatus(status);

  try {
    const sqliteDb = db.getSQLiteDb();
    db.runTransaction(() => {
      sqliteDb.run(`
        UPDATE students SET
          full_name_ar=?, full_name_en=?, birth_date=?, birth_place=?,
          nationality_id=?, national_id=?, gender=?, religion=?,
          guardian_name=?, guardian_relation=?, guardian_national_id=?,
          guardian_phone=?, guardian_phone_2=?, guardian_job=?,
          mother_name=?, mother_nationality_id=?, mother_national_id=?,
          address=?, student_phone=?, second_language=?, secondary_track=?, secondary_elective=?,
          is_merged=?, merged_grade_id=?, merge_type=?, merge_decision_number=?, merge_decision_date=?, merge_notes=?,
          status=?, enrollment_status=?, is_excluded=?,
          emis_student_code=?
        WHERE id=?
      `, [
        fullNameAr, fullNameEn||null, birthDate||null, birthPlace||null,
        nationalityId||null, nationalId||null, gender, religion||null,
        guardianName||null, guardianRelation||null, guardianNationalId||null,
        guardianPhone||null, guardianPhone2||null, guardianJob||null,
        motherName||null, motherNationalityId||null, motherNationalId||null,
        address||null, studentPhone||null, secondLanguage||null, secondaryTrack||null, secondaryElective||null,
        isMerged ? 1 : 0, mergedGradeId||null, mergeType||null, mergeDecisionNumber||null, mergeDecisionDate||null, mergeNotes||null,
        mapped.status, mapped.enrollment, mapped.is_excluded,
        emisStudentCode||null,
        id
      ]);
      if (specialCases !== undefined) {
        sqliteDb.run('UPDATE student_special_cases SET is_active = 0 WHERE student_id = ?', [id]);
        for (const caseTypeId of specialCases) {
          sqliteDb.run(`INSERT INTO student_special_cases (student_id, case_type_id, is_active) VALUES (?,?,1)
            ON CONFLICT(student_id, case_type_id) DO UPDATE SET is_active = 1`, [id, caseTypeId]);
        }
      }
    });
    return res.json({ success: true, message: 'تم تحديث بيانات الطالب بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/students/:id/transfers ────────────────────────
const createTransfer = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  const {
    transferType, fromSchool, fromDirectorate,
    toSchool, toDirectorate, reason, transferDate,
    academicYearId, notes
  } = req.body;

  if (!transferType || !academicYearId || !reason) {
    return res.status(400).json({ success: false, error: 'نوع التحويل والعام الدراسي والسبب مطلوبة.' });
  }

  try {
    const sqliteDb = db.getSQLiteDb();
    const student  = _get(sqliteDb, 'SELECT id, status FROM students WHERE id = ?', [id]);
    if (!student) return res.status(404).json({ success: false, error: 'الطالب غير موجود.' });

    db.runTransaction(() => {
      sqliteDb.run(`
        INSERT INTO student_transfers
          (student_id, academic_year_id, transfer_type,
           from_school, from_directorate, to_school, to_directorate,
           reason, transfer_date, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)
      `, [
        id, academicYearId, transferType,
        fromSchool||null, fromDirectorate||null,
        toSchool||null, toDirectorate||null,
        reason, transferDate || new Date().toISOString().split('T')[0], notes||null
      ]);

      // If outgoing transfer: mark student as suspended (no longer active)
      if (transferType === 'out') {
        sqliteDb.run("UPDATE students SET status = 'suspended' WHERE id = ?", [id]);
      }
    });

    return res.status(201).json({ success: true, message: 'تم تسجيل التحويل بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── PUT /api/students/:id/transfers/:tid/complete ────────────
const completeTransfer = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id, tid } = req.params;
  try {
    const sqliteDb = db.getSQLiteDb();
    db.runTransaction(() => {
      sqliteDb.run(`
        UPDATE student_transfers
        SET is_completed = 1, completed_date = date('now')
        WHERE id = ? AND student_id = ?
      `, [tid, id]);
    });
    return res.json({ success: true, message: 'تم إتمام التحويل.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/students/export/excel (Backend exceljs populated template) ─────
const colLetterToNum = (letter) => {
  let num = 0;
  for (let i = 0; i < letter.length; i++) {
    num = num * 26 + (letter.charCodeAt(i) - 64);
  }
  return num;
};

const parseRange = (rangeStr) => {
  const [start, end] = rangeStr.split(':');
  const startMatch = start.match(/^([A-Z]+)(\d+)$/);
  const endMatch = end.match(/^([A-Z]+)(\d+)$/);
  return {
    startRow: parseInt(startMatch[2]),
    startCol: colLetterToNum(startMatch[1]),
    endRow: parseInt(endMatch[2]),
    endCol: colLetterToNum(endMatch[1])
  };
};

const calculateAgeOnOct1st = (birthDateStr, yearLabel) => {
  if (!birthDateStr) return { days: '', months: '', years: '' };
  const bd = new Date(birthDateStr);
  if (isNaN(bd.getTime())) return { days: '', months: '', years: '' };
  
  const startYear = parseInt(yearLabel?.split('/')?.[0]) || bd.getFullYear();
  const targetDate = new Date(startYear, 9, 1);
  
  let years = targetDate.getFullYear() - bd.getFullYear();
  let months = targetDate.getMonth() - bd.getMonth();
  let days = targetDate.getDate() - bd.getDate();
  
  if (days < 0) {
    months--;
    days += 30;
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  return { days, months, years };
};

const exportExcelTemplate = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const ExcelJS = require('exceljs');
    const sqliteDb = db.getSQLiteDb();
    
    // Parse query params
    const { search, sectionId, stageId, gradeId, classId, status, academicYearId, secondaryTrack, isMerged, isOrphan, isForeign, isTwin, genderOrder } = req.query;
    const where  = ['1=1'];
    const params = [];
    if (search) {
      where.push('(s.full_name_ar LIKE ? OR s.student_code LIKE ? OR s.national_id LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (sectionId)     { where.push('s.section_id = ?');       params.push(sectionId); }
    if (stageId)       { where.push('s.stage_id = ?');         params.push(stageId); }
    if (gradeId)       { where.push('s.grade_id = ?');         params.push(gradeId); }
    if (classId) {
      where.push('EXISTS (SELECT 1 FROM class_enrollments ce WHERE ce.student_id = s.id AND ce.class_id = ?)');
      params.push(classId);
    }
    if (status === 'all') {
      // All statuses
    } else if (status) {
      where.push('s.status = ?');
      params.push(status);
    } else {
      where.push("s.status != 'suspended'");
    }
    if (academicYearId){ where.push('s.academic_year_id = ?'); params.push(academicYearId); }
    if (secondaryTrack){ where.push('s.secondary_track = ?');  params.push(secondaryTrack); }
    
    // Custom report filters
    if (isMerged === '1' || isMerged === 'true') {
      where.push('(s.is_merged = 1 OR s.is_merged = 1)');
    }
    if (isOrphan === '1' || isOrphan === 'true') {
      where.push("(s.father_status = 'متوفى' OR s.father_deceased = 1 OR s.mother_status = 'متوفاة' OR s.mother_deceased = 1)");
    }
    if (isForeign === '1' || isForeign === 'true') {
      where.push("(n.name != 'مصري' AND n.name IS NOT NULL AND n.name != '')");
    }
    if (isTwin === '1' || isTwin === 'true') {
      where.push('(s.is_twin = 1 OR s.is_twin = 1)');
    }
    
    let orderClause = 's.full_name_ar ASC';
    if (genderOrder === 'boys_first') {
      orderClause = `(CASE WHEN s.gender = 'ذكر' THEN 1 WHEN s.gender = 'أنثى' THEN 2 ELSE 3 END) ASC, s.full_name_ar ASC`;
    } else if (genderOrder === 'girls_first') {
      orderClause = `(CASE WHEN s.gender = 'أنثى' THEN 1 WHEN s.gender = 'ذكر' THEN 2 ELSE 3 END) ASC, s.full_name_ar ASC`;
    }
    
    const whereStr = where.join(' AND ');
    
    const students = _all(sqliteDb, `
      SELECT s.id, s.student_code, s.full_name_ar, s.gender, s.status,
             s.birth_date, s.guardian_phone, s.enrollment_date,
             s.secondary_track, s.second_language,
             s.national_id, s.religion, s.guardian_name, s.guardian_job, s.address,
             s.is_merged, s.merge_type, s.merge_decision_number, s.merge_decision_date, s.merge_notes,
             n.name AS nationality_name,
             sec.name  AS section_name,
             st.stage_name,
             g.grade_name_ar,
             ay.year_label AS academic_year,
             c.class_name AS classroom_name
      FROM students s
      LEFT JOIN sections      sec ON sec.id = s.section_id
      LEFT JOIN stages_lookup st  ON st.id  = s.stage_id
      LEFT JOIN grades_lookup g   ON g.id   = s.grade_id
      LEFT JOIN academic_years ay ON ay.id  = s.academic_year_id
      LEFT JOIN nationalities  n  ON n.id   = s.nationality_id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.academic_year_id = s.academic_year_id
      LEFT JOIN classes c ON c.id = ce.class_id
      WHERE ${whereStr}
      ORDER BY ${orderClause}
    `, params);

    const school = _get(sqliteDb, 'SELECT school_name, governorate, directorate FROM institution_config LIMIT 1') || {};
    const grade = gradeId ? _get(sqliteDb, 'SELECT grade_name_ar FROM grades_lookup WHERE id = ?', [gradeId]) : null;
    const year = academicYearId ? _get(sqliteDb, 'SELECT year_label FROM academic_years WHERE id = ?', [academicYearId]) : null;
    
    const wb = new ExcelJS.Workbook();
    const path = require('path');
    const fs = require('fs');

    const templateNameParam = req.query.templateName;
    let templateFileName = 'student_register_41d_template.xltx';

    if (templateNameParam) {
      templateFileName = (templateNameParam.endsWith('.xltx') || templateNameParam.endsWith('.xlsx')) 
        ? templateNameParam 
        : `${templateNameParam}.xltx`;
    } else if (isMerged === '1' || isMerged === 'true') {
      templateFileName = 'سجل_الطلاب_المدمجين.xltx';
    }

    const templatePath = path.join(__dirname, `../../templates/reports/${templateFileName}`);
    const defaultTemplatePath = path.join(__dirname, '../../templates/reports/student_register_41d_template.xltx');
    const fallbackPath = path.join(__dirname, '../../../register_template.xltx');

    if (fs.existsSync(templatePath)) {
      await wb.xlsx.readFile(templatePath);
    } else if (fs.existsSync(defaultTemplatePath)) {
      await wb.xlsx.readFile(defaultTemplatePath);
    } else {
      await wb.xlsx.readFile(fallbackPath);
    }
    const ws = wb.worksheets[0];
    
    const originalMerges = [...(ws.model.merges || [])];
    const totalStudents = students.length;
    const pageSize = 20;
    const numPages = Math.ceil(totalStudents / pageSize) || 1;
    
    // Duplicate page ranges dynamically
    for (let p = 2; p <= numPages; p++) {
      const sourceStart = 1;
      const targetStart = (p - 1) * 30 + 1;
      
      for (let offset = 0; offset < 30; offset++) {
        const srcRowIdx = sourceStart + offset;
        const tgtRowIdx = targetStart + offset;
        
        const srcRow = ws.getRow(srcRowIdx);
        const tgtRow = ws.getRow(tgtRowIdx);
        
        tgtRow.height = srcRow.height;
        
        srcRow.eachCell({ includeEmpty: true }, (srcCell, colNumber) => {
          const tgtCell = tgtRow.getCell(colNumber);
          tgtCell.value = srcCell.value;
          if (srcCell.style) {
            tgtCell.style = JSON.parse(JSON.stringify(srcCell.style));
          }
        });
      }
      
      originalMerges.forEach(rangeStr => {
        const range = parseRange(rangeStr);
        if (range.startRow >= sourceStart && range.endRow <= sourceStart + 29) {
          const sRow = range.startRow - sourceStart + targetStart;
          const eRow = range.endRow - sourceStart + targetStart;
          ws.mergeCells(sRow, range.startCol, eRow, range.endCol);
        }
      });
      
      const prevPageFooterRow = (p - 1) * 30;
      ws.getRow(prevPageFooterRow).addPageBreak();
    }
    
    const STATUS_LABELS = {
      promoted: 'منقول',
      retained: 'باقٍ للإعادة',
      suspended: 'موقوف قيده'
    };
    
    const gradeName = grade?.grade_name_ar || '';
    const yearLabel = year?.year_label || '';
    const isMergeTemplate = templateFileName.includes('مدمجين') || templateFileName.includes('الدمج') || isMerged === '1' || isMerged === 'true';
    
    if (isMergeTemplate) {
      // Populate merge template headers
      try { ws.getCell('A1').value = `مديرية التربية والتعليم بمحافظة ${school.governorate || '...............'}`; } catch(e){}
      try { ws.getCell('A2').value = `إدارة: ${school.directorate || '...............'} التعليمية`; } catch(e){}
      try { ws.getCell('A3').value = `مدرسة : ${school.school_name || '...............'}`; } catch(e){}
      try { ws.getCell('A4').value = `الصف: ${gradeName || 'جميع الصفوف'}   |   العام الدراسي: ${yearLabel || '...............'}   |   إجمالي طلاب الدمج : ${totalStudents} طالب`; } catch(e){}

      // Populate student data rows starting at row 7
      students.forEach((s, i) => {
        const r = 7 + i;
        const setVal = (colIdx, val) => {
          try {
            const cell = ws.getRow(r).getCell(colIdx);
            cell.value = val !== undefined && val !== null ? val : '';
          } catch (e) {}
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
      // Fill metadata headers for each page in 41-D template
      for (let p = 1; p <= numPages; p++) {
        const startRow = (p - 1) * 30 + 1;
        const getCellAndUpdate = (cellRef, val) => {
          const cell = ws.getCell(cellRef);
          cell.value = String(val || '');
        };
        
        getCellAndUpdate(`B${startRow + 1}`, `محافظة : ${school.governorate || ''}`);
        getCellAndUpdate(`B${startRow + 2}`, `إدارة : ${school.directorate || ''}`);
        getCellAndUpdate(`B${startRow + 3}`, `مدرسة : ${school.school_name || ''}`);
        getCellAndUpdate(`E${startRow + 2}`, `سجل قيد تلاميذ الصف ${gradeName} للعام الدراسي ${yearLabel}`);
      }
      
      // Fill students data cells for 41-D template
      students.forEach((s, i) => {
        const p = Math.floor(i / pageSize) + 1;
        const offset = i % pageSize;
        const r = (p - 1) * 30 + 8 + offset;
        
        const age = calculateAgeOnOct1st(s.birth_date, yearLabel);
        
        const setVal = (cellRef, val) => {
          const cell = ws.getCell(cellRef);
          cell.value = val;
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
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=register_report.xlsx`);
    
    const buffer = await wb.xlsx.writeBuffer();
    return res.send(buffer);
  } catch (err) {
    console.error('Failed to export Excel register template:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/students/export/class-list (Backend class list template populator) 
const exportClassListExcel = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const ExcelJS = require('exceljs');
    const sqliteDb = db.getSQLiteDb();
    
    // Parse query params
    const { search, sectionId, stageId, gradeId, classId, status, academicYearId, secondaryTrack } = req.query;
    const where  = ['1=1'];
    const params = [];
    if (search) {
      where.push('(s.full_name_ar LIKE ? OR s.student_code LIKE ? OR s.national_id LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (sectionId)     { where.push('s.section_id = ?');       params.push(sectionId); }
    if (stageId)       { where.push('s.stage_id = ?');         params.push(stageId); }
    if (gradeId)       { where.push('s.grade_id = ?');         params.push(gradeId); }
    if (classId) {
      where.push('EXISTS (SELECT 1 FROM class_enrollments ce WHERE ce.student_id = s.id AND ce.class_id = ?)');
      params.push(classId);
    }
    if (status === 'all') {
      // Include all
    } else if (status) {
      where.push('s.status = ?');
      params.push(status);
    } else {
      where.push("s.status != 'suspended'");
    }
    if (academicYearId){ where.push('s.academic_year_id = ?'); params.push(academicYearId); }
    if (secondaryTrack){ where.push('s.secondary_track = ?');  params.push(secondaryTrack); }
    
    const whereStr = where.join(' AND ');
    
    const students = _all(sqliteDb, `
      SELECT s.id, s.student_code, s.full_name_ar, s.gender, s.status,
             s.birth_date, s.guardian_phone, s.enrollment_date,
             s.secondary_track, s.second_language,
             s.national_id, s.religion, s.guardian_name, s.guardian_job, s.address,
             s.is_merged, s.merge_type,
             n.name AS nationality_name,
             sec.name  AS section_name,
             st.stage_name,
             g.grade_name_ar,
             ay.year_label AS academic_year,
             c.class_name AS classroom_name
      FROM students s
      LEFT JOIN sections      sec ON sec.id = s.section_id
      LEFT JOIN stages_lookup st  ON st.id  = s.stage_id
      LEFT JOIN grades_lookup g   ON g.id   = s.grade_id
      LEFT JOIN academic_years ay ON ay.id  = s.academic_year_id
      LEFT JOIN nationalities  n  ON n.id   = s.nationality_id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.academic_year_id = s.academic_year_id
      LEFT JOIN classes c ON c.id = ce.class_id
      WHERE ${whereStr}
      ORDER BY s.full_name_ar ASC
    `, params);

    const school = _get(sqliteDb, 'SELECT school_name, governorate, directorate FROM institution_config LIMIT 1') || {};
    const classroom = classId ? _get(sqliteDb, 'SELECT class_name FROM classes WHERE id = ?', [classId]) : null;
    const year = academicYearId ? _get(sqliteDb, 'SELECT year_label FROM academic_years WHERE id = ?', [academicYearId]) : null;
    
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('d:/NeprasPro/class_list_template.xltx');
    const ws = wb.worksheets[0];
    
    const originalMerges = [...(ws.model.merges || [])];
    const totalStudents = students.length;
    const pageSize = 50;
    const numPages = Math.ceil(totalStudents / pageSize) || 1;
    
    // Duplicate page ranges dynamically
    for (let p = 2; p <= numPages; p++) {
      const sourceStart = 1;
      const targetStart = (p - 1) * 32 + 1;
      
      for (let offset = 0; offset < 32; offset++) {
        const srcRowIdx = sourceStart + offset;
        const tgtRowIdx = targetStart + offset;
        
        const srcRow = ws.getRow(srcRowIdx);
        const tgtRow = ws.getRow(tgtRowIdx);
        
        tgtRow.height = srcRow.height;
        
        srcRow.eachCell({ includeEmpty: true }, (srcCell, colNumber) => {
          const tgtCell = tgtRow.getCell(colNumber);
          tgtCell.value = srcCell.value;
          if (srcCell.style) {
            tgtCell.style = JSON.parse(JSON.stringify(srcCell.style));
          }
        });
      }
      
      originalMerges.forEach(rangeStr => {
        const range = parseRange(rangeStr);
        if (range.startRow >= sourceStart && range.endRow <= sourceStart + 31) {
          const sRow = range.startRow - sourceStart + targetStart;
          const eRow = range.endRow - sourceStart + targetStart;
          ws.mergeCells(sRow, range.startCol, eRow, range.endCol);
        }
      });
      
      const prevPageFooterRow = (p - 1) * 32;
      ws.getRow(prevPageFooterRow).addPageBreak();
    }
    
    const STATUS_LABELS = {
      promoted: 'منقول',
      retained: 'باقٍ للإعادة',
      suspended: 'موقوف قيده'
    };
    
    const className = classroom?.class_name || '';
    const yearLabel = year?.year_label || '';
    
    // Fill metadata headers for each page
    for (let p = 1; p <= numPages; p++) {
      const startRow = (p - 1) * 32 + 1;
      const getCellAndUpdate = (cellRef, val) => {
        const cell = ws.getCell(cellRef);
        cell.value = String(val || '');
      };
      
      getCellAndUpdate(`A${startRow}`, `مديرية : ${school.governorate || ''}`);
      getCellAndUpdate(`A${startRow + 1}`, `إدارة : ${school.directorate || ''}`);
      getCellAndUpdate(`A${startRow + 2}`, `مدرسة : ${school.school_name || ''}`);
      getCellAndUpdate(`C${startRow + 1}`, `قائمة تلاميذ فصل: ${className}`);
      getCellAndUpdate(`C${startRow + 3}`, `العام الدراسى : ${yearLabel}`);
    }
    
    // Fill students data cells (Left/Right side, 25 students per side)
    students.forEach((s, i) => {
      const p = Math.floor(i / pageSize) + 1;
      const offset = i % pageSize;
      
      const setVal = (cellRef, val) => {
        const cell = ws.getCell(cellRef);
        cell.value = val;
      };
      
      if (offset < 25) {
        // Left Column (A-D)
        const r = (p - 1) * 32 + 6 + offset;
        setVal(`A${r}`, i + 1);
        setVal(`B${r}`, s.full_name_ar || '');
        setVal(`C${r}`, s.religion || '');
        setVal(`D${r}`, STATUS_LABELS[s.status] || '');
      } else {
        // Right Column (E-H)
        const r = (p - 1) * 32 + 6 + (offset - 25);
        setVal(`E${r}`, i + 1);
        setVal(`F${r}`, s.full_name_ar || '');
        setVal(`G${r}`, s.religion || '');
        setVal(`H${r}`, STATUS_LABELS[s.status] || '');
      }
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=class_list_report.xlsx`);
    
    const buffer = await wb.xlsx.writeBuffer();
    return res.send(buffer);
  } catch (err) {
    console.error('Failed to export Excel class list template:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};


// ─── GET /api/students/import/template ────────────────────────────────────
const downloadImportTemplate = async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'نبراس برو ERP';
    wb.created = new Date();

    const ws = wb.addWorksheet('بيانات الطلاب', {
      views: [{ rightToLeft: true }]
    });

    // ── Column definitions ──
    const COLS = [
      { header: 'اسم الطالب بالعربي *',        key: 'full_name_ar',       width: 28 },
      { header: 'اسم الطالب بالإنجليزية',       key: 'full_name_en',       width: 24 },
      { header: 'الجنس * (ذكر/أنثى)',           key: 'gender',             width: 14 },
      { header: 'تاريخ الميلاد (YYYY-MM-DD)',   key: 'birth_date',         width: 20 },
      { header: 'محل الميلاد',                  key: 'birth_place',        width: 16 },
      { header: 'الرقم القومي (14 رقم)',         key: 'national_id',        width: 20 },
      { header: 'الجنسية',                       key: 'nationality',        width: 14 },
      { header: 'الديانة',                       key: 'religion',           width: 12 },
      { header: 'اسم القسم *',                  key: 'section_name',       width: 20 },
      { header: 'اسم المرحلة *',                key: 'stage_name',         width: 18 },
      { header: 'اسم الصف *',                   key: 'grade_name',         width: 24 },
      { header: 'العام الدراسي *',              key: 'academic_year',      width: 16 },
      { header: 'اسم ولي الأمر',               key: 'guardian_name',      width: 22 },
      { header: 'صفة ولي الأمر',               key: 'guardian_relation',  width: 14 },
      { header: 'رقم هاتف ولي الأمر',          key: 'guardian_phone',     width: 18 },
      { header: 'الوظيفة',                      key: 'guardian_job',       width: 16 },
      { header: 'الرقم القومي لولي الأمر',      key: 'guardian_national_id', width: 22 },
      { header: 'اسم الأم',                     key: 'mother_name',        width: 22 },
      { header: 'العنوان',                       key: 'address',            width: 28 },
      { header: 'رقم هاتف الطالب',             key: 'student_phone',      width: 18 },
      { header: 'اللغة الأجنبية الثانية',       key: 'second_language',    width: 20 },
      { header: 'تاريخ القيد (YYYY-MM-DD)',     key: 'enrollment_date',    width: 20 },
    ];

    ws.columns = COLS;

    // ── Style header row ──
    const headerRow = ws.getRow(1);
    headerRow.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.height = 36;

    COLS.forEach((col, i) => {
      const cell = ws.getRow(1).getCell(i + 1);
      const isRequired = col.header.includes('*');
      if (isRequired) {
        cell.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FFFFFF00' } };
      }
    });

    // ── Sample data row ──
    ws.addRow({
      full_name_ar: 'محمد أحمد علي',
      full_name_en: 'Mohamed Ahmed Ali',
      gender: 'ذكر',
      birth_date: '2012-03-15',
      birth_place: 'القاهرة',
      national_id: '31203150012345',
      nationality: 'مصرية',
      religion: 'مسلم',
      section_name: 'القسم العربي',
      stage_name: 'ابتدائي',
      grade_name: 'الصف الأول الابتدائي',
      academic_year: '2024-2025',
      guardian_name: 'أحمد علي محمد',
      guardian_relation: 'أب',
      guardian_phone: '01012345678',
      guardian_job: 'مهندس',
      guardian_national_id: '79012345678901',
      mother_name: 'فاطمة محمود حسن',
      address: 'القاهرة، مدينة نصر، شارع 9',
      student_phone: '',
      second_language: 'فرنسي',
      enrollment_date: new Date().toISOString().split('T')[0],
    });

    const sampleRow = ws.getRow(2);
    sampleRow.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF666666' } };
    sampleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
    sampleRow.alignment = { vertical: 'middle', horizontal: 'right' };
    sampleRow.height = 22;

    // ── Notes sheet ──
    const wsNotes = wb.addWorksheet('تعليمات الاستيراد', { views: [{ rightToLeft: true }] });
    wsNotes.columns = [{ width: 80 }];
    const notes = [
      ['تعليمات استيراد بيانات الطلاب'],
      [''],
      ['الحقول المطلوبة (مميزة بـ * في قالب البيانات):'],
      ['  • اسم الطالب بالعربي'],
      ['  • الجنس: يجب أن يكون "ذكر" أو "أنثى" فقط'],
      ['  • اسم القسم: يجب أن يطابق اسم القسم في النظام بالضبط'],
      ['  • اسم المرحلة: يجب أن يطابق اسم المرحلة في النظام بالضبط'],
      ['  • اسم الصف: يجب أن يطابق اسم الصف في النظام بالضبط'],
      ['  • العام الدراسي: بصيغة 2024-2025'],
      [''],
      ['ملاحظات مهمة:'],
      ['  • تاريخ الميلاد وتاريخ القيد: بصيغة YYYY-MM-DD مثل 2012-03-15'],
      ['  • الرقم القومي المصري: 14 رقماً بالضبط'],
      ['  • الصف الأول يُضاف تلقائياً كمثال وليس للاستيراد - احذفه واستبدله ببياناتك'],
      ['  • كود الطالب يُولَّد تلقائياً ولا حاجة لإدخاله'],
    ];
    notes.forEach((row, i) => {
      const r = wsNotes.addRow(row);
      if (i === 0) {
        r.font = { bold: true, size: 14, color: { argb: 'FF1E3A5F' } };
        r.height = 30;
      } else if (row[0].startsWith('الحقول') || row[0].startsWith('ملاحظات')) {
        r.font = { bold: true, size: 11 };
      } else {
        r.font = { size: 10 };
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="student_import_template.xlsx"');
    const buffer = await wb.xlsx.writeBuffer();
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/students/import/preview ──────────────────────────────────────
// Validates uploaded Excel without saving. Returns per-row results.
const importPreview = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  if (!req.file) return res.status(400).json({ success: false, error: 'لم يتم رفع ملف.' });

  try {
    const ExcelJS = require('exceljs');
    const sqliteDb = db.getSQLiteDb();

    // Load lookup maps for fast matching
    const sections    = _all(sqliteDb, 'SELECT id, name FROM sections');
    const stages      = _all(sqliteDb, 'SELECT id, section_id, stage_name FROM stages_lookup');
    const grades      = _all(sqliteDb, 'SELECT id, stage_id, grade_name_ar FROM grades_lookup');
    const years       = _all(sqliteDb, 'SELECT id, year_label FROM academic_years');
    const nats        = _all(sqliteDb, 'SELECT id, name FROM nationalities');

    const secMap   = Object.fromEntries(sections.map(s => [s.name.trim(), s.id]));
    const stageMap = {};
    stages.forEach(s => {
      const key = `${s.section_id}||${s.stage_name.trim()}`;
      stageMap[key] = s.id;
    });
    const gradeMap = {};
    grades.forEach(g => {
      const key = `${g.stage_id}||${g.grade_name_ar.trim()}`;
      gradeMap[key] = g.id;
    });
    const yearMap  = Object.fromEntries(years.map(y => [y.year_label.trim(), y.id]));
    const natMap   = Object.fromEntries(nats.map(n => [n.name.trim(), n.id]));

    // Column mapping from uploaded file header row
    const { mapping, mode } = req.body; // mode: 'new' | 'update'
    const importMode = mode || 'new';
    const colMap = mapping ? JSON.parse(mapping) : null;

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);
    const ws = wb.worksheets[0];

    // Get headers from row 1
    const headerRow = ws.getRow(1);
    const headers = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col - 1] = (cell.value || '').toString().trim();
    });

    // Extract first 5 data rows' raw cell values for preview
    const preview = [];
    ws.eachRow({ includeEmpty: true }, (row, rowNum) => {
      if (rowNum <= 6) { // header row (1) + up to 5 data rows
        const rowVals = [];
        // Iterate through all columns up to the length of headers
        for (let colIdx = 1; colIdx <= headers.length; colIdx++) {
          const cell = row.getCell(colIdx);
          let v = cell.value;
          if (v === null || v === undefined) v = '';
          else if (typeof v === 'object' && v.richText) v = v.richText.map(r => r.text).join('');
          else if (v instanceof Date) v = v.toISOString().split('T')[0];
          rowVals.push(v.toString().trim());
        }
        preview.push(rowVals);
      }
    });

    // Build field mapping: fieldName → colIndex(0-based)
    // AUTO_MAP: ordered from MOST SPECIFIC to LEAST SPECIFIC (longer patterns first)
    // This prevents "الرقم القومي" from matching "الرقم القومي لولي الأمر"
    const AUTO_MAP = [
      // Most specific patterns first
      { pattern: 'كود الطالب على الحكومة الإلكترونية', field: 'emis_student_code' },
      { pattern: 'كود الطالب على الحكومة الالكترونية', field: 'emis_student_code' },
      { pattern: 'كود الحكومة الإلكترونية',    field: 'emis_student_code'     },
      { pattern: 'كود الحكومة الالكترونية',    field: 'emis_student_code'     },
      { pattern: 'كود الوزارة',                 field: 'emis_student_code'     },
      { pattern: 'كود EMIS',                    field: 'emis_student_code'     },
      { pattern: 'كود إميس',                    field: 'emis_student_code'     },
      { pattern: 'الرقم القومي لولي الأمر',    field: 'guardian_national_id' },
      { pattern: 'رقم هاتف ولي الأمر',          field: 'guardian_phone'        },
      { pattern: 'اسم الطالب بالعربي',           field: 'full_name_ar'          },
      { pattern: 'اسم الطالب بالانجليزية',       field: 'full_name_en'          },
      { pattern: 'اسم الطالب بالإنجليزية',       field: 'full_name_en'          },
      { pattern: 'اللغة الأجنبية الثانية',       field: 'second_language'       },
      { pattern: 'صفة ولي الأمر',                field: 'guardian_relation'     },
      { pattern: 'اسم ولي الأمر',               field: 'guardian_name'         },
      { pattern: 'رقم هاتف الطالب',             field: 'student_phone'         },
      { pattern: 'تاريخ الميلاد',               field: 'birth_date'            },
      { pattern: 'محل الميلاد',                  field: 'birth_place'           },
      { pattern: 'تاريخ القيد',                  field: 'enrollment_date'       },
      { pattern: 'العام الدراسي',               field: 'academic_year'         },
      { pattern: 'اسم الفصل',                   field: 'classroom_name'        },
      { pattern: 'الفصل',                       field: 'classroom_name'        },
      { pattern: 'اسم القسم',                   field: 'section_name'          },

      { pattern: 'اسم المرحلة',                 field: 'stage_name'            },
      { pattern: 'اسم الصف',                    field: 'grade_name'            },
      { pattern: 'الرقم القومي',                field: 'national_id'           },
      { pattern: 'الجنسية',                      field: 'nationality'           },
      { pattern: 'الديانة',                      field: 'religion'              },
      { pattern: 'الوظيفة',                      field: 'guardian_job'          },
      { pattern: 'اسم الأم',                    field: 'mother_name'           },
      { pattern: 'العنوان',                       field: 'address'               },
      { pattern: 'الجنس',                        field: 'gender'                },
      // Update-mode specific
      { pattern: 'كود الطالب',                  field: 'student_code'          },
      { pattern: 'حالة القيد',                  field: 'status'                },
      { pattern: 'الحالة',                       field: 'status'                },
    ];

    // Status label → DB value mapping
    const STATUS_MAP = {
      'منقول': 'promoted',
      'ناجح': 'promoted',
      'باق للإعادة': 'retained',
      'باق للاعادة': 'retained',
      'راسب': 'retained',
      'منقطع': 'disconnected',
      'مستبعد': 'excluded',
      'موقوف قيده': 'suspended',
      'موقوف': 'suspended',
      'محول': 'promoted',
    };

    // fieldKey → colIndex(0-based)
    const fieldToCol = {};
    if (colMap) {
      Object.entries(colMap).forEach(([colIdx, fieldKey]) => {
        if (fieldKey) fieldToCol[fieldKey] = parseInt(colIdx);
      });
    } else {
      // Two-pass auto-detect:
      // Pass 1: exact match (cleanHeader === pattern)
      // Pass 2: partial match for still-unassigned headers
      const assignedCols = new Set();
      // Pass 1 — exact
      headers.forEach((h, idx) => {
        const cleanH = h.replace(/\s*\(.*?\)/g, '').replace(/\*/g, '').trim();
        for (const { pattern, field } of AUTO_MAP) {
          if (fieldToCol[field] !== undefined) continue;
          if (assignedCols.has(idx)) continue;
          if (cleanH === pattern) {
            fieldToCol[field] = idx;
            assignedCols.add(idx);
            break;
          }
        }
      });
      // Pass 2 — partial (only for unassigned cols and unresolved fields)
      headers.forEach((h, idx) => {
        if (assignedCols.has(idx)) return;
        const cleanH = h.replace(/\s*\(.*?\)/g, '').replace(/\*/g, '').trim();
        for (const { pattern, field } of AUTO_MAP) {
          if (fieldToCol[field] !== undefined) continue;
          if (assignedCols.has(idx)) continue;
          if (cleanH.includes(pattern)) {
            fieldToCol[field] = idx;
            assignedCols.add(idx);
            break;
          }
        }
      });
    }

    const getVal = (row, field) => {
      const idx = fieldToCol[field];
      if (idx === undefined) return '';
      const cell = row.getCell(idx + 1);
      const v = cell.value;
      if (v === null || v === undefined) return '';
      if (typeof v === 'object' && v.richText) return v.richText.map(r => r.text).join('').trim();
      if (v instanceof Date) return v.toISOString().split('T')[0];
      return v.toString().trim();
    };

    const results = [];
    let rowIdx = 0;

    ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
      if (rowNum === 1) return; // skip header
      rowIdx++;

      const fullNameAr    = getVal(row, 'full_name_ar');
      let gender          = getVal(row, 'gender');
      const sectionName   = getVal(row, 'section_name');
      const stageName     = getVal(row, 'stage_name');
      const gradeName     = getVal(row, 'grade_name');
      const academicYear  = getVal(row, 'academic_year');
      const nationalId    = getVal(row, 'national_id');
      const nationality   = getVal(row, 'nationality');
      const studentCode   = getVal(row, 'student_code');
      const statusRaw     = getVal(row, 'status');
      const classroomName = getVal(row, 'classroom_name');

      let birthDateVal    = getVal(row, 'birth_date');
      let birthPlaceVal   = getVal(row, 'birth_place');

      // National ID auto-extraction for missing fields
      if (nationalId && nationalId.length === 14) {
        const extracted = parseNationalId(nationalId);
        if (extracted) {
          if (!gender) gender = extracted.gender;
          if (!birthDateVal) birthDateVal = extracted.birthDate;
          if (!birthPlaceVal) birthPlaceVal = extracted.birthPlace;
        }
      }

      const errors = [];
      const warnings = [];

      // ── UPDATE MODE ──────────────────────────────────────────────────────
      if (importMode === 'update') {
        // Require at least one match key
        if (!nationalId && !studentCode) {
          errors.push('يجب توفير الرقم القومي أو كود الطالب للمطابقة');
        }

        // Resolve status
        let resolvedStatus = null;
        if (statusRaw) {
          resolvedStatus = STATUS_MAP[statusRaw.trim()] || null;
          if (!resolvedStatus) {
            errors.push(`حالة القيد "${statusRaw}" غير معروفة (منقول / باق للإعادة / موقوف قيده)`);
          }
        } else {
          errors.push('حالة القيد مطلوبة (منقول / باق للإعادة / موقوف قيده)');
        }

        // Find existing student
        let matchedStudent = null;
        if (nationalId) {
          matchedStudent = _get(sqliteDb, `
            SELECT s.id, s.full_name_ar, s.student_code, s.status,
                   g.grade_name_ar, ay.year_label
            FROM students s
            LEFT JOIN grades_lookup g ON s.grade_id = g.id
            LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
            WHERE s.national_id = ?
          `, [nationalId]);
        }
        if (!matchedStudent && studentCode) {
          matchedStudent = _get(sqliteDb, `
            SELECT s.id, s.full_name_ar, s.student_code, s.status,
                   g.grade_name_ar, ay.year_label
            FROM students s
            LEFT JOIN grades_lookup g ON s.grade_id = g.id
            LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
            WHERE s.student_code = ?
          `, [studentCode]);
        }

        if (!matchedStudent && (nationalId || studentCode)) {
          errors.push(`لم يتم العثور على طالب بهذا ${nationalId ? 'الرقم القومي' : 'الكود'}: ${nationalId || studentCode}`);
        }

        if (matchedStudent && resolvedStatus && matchedStudent.status === resolvedStatus) {
          warnings.push(`حالة الطالب مسجلة بالفعل كـ "${statusRaw}" — لا تغيير مطلوب`);
        }

        results.push({
          rowNum,
          data: {
            // Match keys
            nationalId,
            studentCode: matchedStudent?.student_code || studentCode,
            // Status update
            status: resolvedStatus,
            statusLabel: statusRaw,
            // Matched student info
            matchedStudentId: matchedStudent?.id || null,
            matchedName: matchedStudent?.full_name_ar || fullNameAr || '—',
            matchedGrade: matchedStudent?.grade_name_ar || gradeName || '—',
            matchedYear: matchedStudent?.year_label || academicYear || '—',
            currentStatus: matchedStudent?.status || null,
          },
          errors,
          warnings,
          status: errors.length === 0 ? 'valid' : 'error',
        });
        return; // skip new-student logic below
      }

      // ── NEW STUDENT MODE ─────────────────────────────────────────────────
      // Required fields
      if (!fullNameAr) errors.push('اسم الطالب بالعربي مطلوب');
      if (!gender) errors.push('الجنس مطلوب');
      else if (!['ذكر', 'أنثى'].includes(gender)) errors.push(`الجنس غير صحيح: "${gender}" (يجب ذكر أو أنثى)`);
      if (!sectionName) errors.push('اسم القسم مطلوب');
      if (!stageName) errors.push('اسم المرحلة مطلوب');
      if (!gradeName) errors.push('اسم الصف مطلوب');
      if (!academicYear) errors.push('العام الدراسي مطلوب');

      // Lookup resolution
      let sectionId = null, stageId = null, gradeId = null, academicYearId = null, nationalityId = null, classId = null;

      if (sectionName) {
        sectionId = secMap[sectionName];
        if (!sectionId) errors.push(`القسم "${sectionName}" غير موجود في النظام`);
      }
      if (stageName && sectionId) {
        stageId = stageMap[`${sectionId}||${stageName}`];
        if (!stageId) errors.push(`المرحلة "${stageName}" غير موجودة ضمن هذا القسم`);
      }
      if (gradeName && stageId) {
        gradeId = gradeMap[`${stageId}||${gradeName}`];
        if (!gradeId) errors.push(`الصف "${gradeName}" غير موجود ضمن هذه المرحلة`);
      }
      if (academicYear) {
        academicYearId = yearMap[academicYear];
        if (!academicYearId) errors.push(`العام الدراسي "${academicYear}" غير موجود في النظام`);
      }
      if (nationality) {
        nationalityId = natMap[nationality];
        // Not an error if nationality not found — just warning
      }
      if (classroomName && gradeId && academicYearId) {
        const cls = _get(sqliteDb, 'SELECT id FROM classes WHERE grade_id = ? AND academic_year_id = ? AND class_name = ?', [gradeId, academicYearId, classroomName.trim()]);
        if (cls) {
          classId = cls.id;
        } else {
          warnings.push(`الفصل "${classroomName}" غير موجود في هذا الصف لنفس العام الدراسي وسيتم تركه فارغاً.`);
        }
      }

      // Duplicate national ID check
      if (nationalId && nationalId.length === 14) {
        const existing = _get(sqliteDb, 'SELECT id, full_name_ar FROM students WHERE national_id = ?', [nationalId]);
        if (existing) warnings.push(`الرقم القومي موجود مسبقاً للطالب: ${existing.full_name_ar}`);
      }

      results.push({
        rowNum,
        data: {
          fullNameAr,
          fullNameEn:          getVal(row, 'full_name_en'),
          gender,
          birthDate:           birthDateVal || null,
          birthPlace:          birthPlaceVal || null,
          nationalId,
          nationality,
          religion:            normalizeReligion(getVal(row, 'religion')),
          sectionName,
          stageName,
          gradeName,
          academicYear,
          classroomName,
          guardianName:        getVal(row, 'guardian_name'),
          guardianRelation:    getVal(row, 'guardian_relation') || 'أب',
          guardianPhone:       getVal(row, 'guardian_phone'),
          guardianJob:         getVal(row, 'guardian_job'),
          guardianNationalId:  getVal(row, 'guardian_national_id'),
          motherName:          getVal(row, 'mother_name'),
          address:             getVal(row, 'address'),
          studentPhone:        getVal(row, 'student_phone'),
          secondLanguage:      getVal(row, 'second_language'),
          enrollmentDate:      getVal(row, 'enrollment_date') || new Date().toISOString().split('T')[0],
          // resolved ids
          sectionId, stageId, gradeId, academicYearId, nationalityId, classId,
        },
        errors,
        warnings,
        status: errors.length === 0 ? 'valid' : 'error',
      });
    });

    const validCount = results.filter(r => r.status === 'valid').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    // Return headers so frontend can show column mapping UI
    return res.json({
      success: true,
      headers,
      fieldToCol,
      preview,
      results,
      summary: { total: results.length, valid: validCount, errors: errorCount }
    });
  } catch (err) {
    console.error('Import preview error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/students/import/execute ──────────────────────────────────────
// Executes batch insert (new) or batch update (update mode) for pre-validated rows
const importExecute = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });

  const { rows, mode } = req.body;
  const importMode = mode || 'new';

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, error: 'لا توجد بيانات للاستيراد.' });
  }

  try {
    const sqliteDb = db.getSQLiteDb();
    const importResults = [];

    // ── UPDATE MODE ──────────────────────────────────────────────────────
    if (importMode === 'update') {
      db.runTransaction(() => {
        for (const row of rows) {
          const { matchedStudentId, matchedName, studentCode, status, statusLabel } = row;
          if (!matchedStudentId) {
            importResults.push({ name: matchedName || '—', code: studentCode || '—', error: 'لم يتم إيجاد الطالب', status: 'failed' });
            continue;
          }
          try {
            sqliteDb.run(
              'UPDATE students SET status = ? WHERE id = ?',
              [status, matchedStudentId]
            );
            importResults.push({
              name: matchedName,
              code: studentCode || '—',
              id: matchedStudentId,
              newStatus: statusLabel,
              status: 'success',
            });
          } catch (rowErr) {
            importResults.push({ name: matchedName, code: studentCode || '—', error: rowErr.message, status: 'failed' });
          }
        }
      });

      const successCount = importResults.filter(r => r.status === 'success').length;
      const failedCount  = importResults.filter(r => r.status === 'failed').length;
      console.log(`[Import-Update] Updated ${successCount} students, failed ${failedCount}`);
      return res.json({
        success: true,
        message: `تم تحديث حالة القيد لـ ${successCount} طالب بنجاح${failedCount > 0 ? `، وفشل ${failedCount} سجل` : ''}`,
        results: importResults,
        summary: { success: successCount, failed: failedCount },
      });
    }

    // ── NEW STUDENT MODE ─────────────────────────────────────────────────
    db.runTransaction(() => {
      for (const row of rows) {
        const {
          fullNameAr, fullNameEn, gender, birthDate, birthPlace,
          nationalId, nationalityId, religion,
          sectionId, stageId, gradeId, academicYearId,
          guardianName, guardianRelation, guardianPhone, guardianJob, guardianNationalId,
          motherName, address, studentPhone, secondLanguage, enrollmentDate,
          classId, emisStudentCode,
        } = row;

        try {
          const studentCode = _generateCode(sqliteDb, parseInt(sectionId), parseInt(stageId));

          sqliteDb.run(`
            INSERT INTO students (
              section_id, stage_id, grade_id, academic_year_id, student_code,
              full_name_ar, full_name_en, birth_date, birth_place,
              nationality_id, national_id, gender, religion,
              guardian_name, guardian_relation, guardian_national_id,
              guardian_phone, guardian_job,
              mother_name, address, student_phone, second_language,
              enrollment_date, status, emis_student_code
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          `, [
            sectionId, stageId, gradeId, academicYearId, studentCode,
            fullNameAr, fullNameEn||null, birthDate||null, birthPlace||null,
            nationalityId||null, nationalId||null, gender, normalizeReligion(religion)||null,
            guardianName||null, guardianRelation||'أب', guardianNationalId||null,
            guardianPhone||null, guardianJob||null,
            motherName||null, address||null, studentPhone||null, secondLanguage||null,
            enrollmentDate || new Date().toISOString().split('T')[0],
            'promoted',
            emisStudentCode||null
          ]);

          const studentId = _lastId(sqliteDb);

          if (classId) {
            sqliteDb.run(
              'INSERT INTO class_enrollments (class_id, student_id, academic_year_id) VALUES (?, ?, ?)',
              [classId, studentId, academicYearId]
            );
          }

          importResults.push({ name: fullNameAr, code: studentCode, id: studentId, status: 'success' });
        } catch (rowErr) {
          importResults.push({ name: fullNameAr, error: rowErr.message, status: 'failed' });
        }
      }
    });

    const successCount = importResults.filter(r => r.status === 'success').length;
    const failedCount  = importResults.filter(r => r.status === 'failed').length;

    console.log(`[Import] Imported ${successCount} students, failed ${failedCount}`);
    return res.json({
      success: true,
      message: `تم استيراد ${successCount} طالب بنجاح${failedCount > 0 ? `، وفشل ${failedCount} سجل` : ''}`,
      results: importResults,
      summary: { success: successCount, failed: failedCount }
    });
  } catch (err) {
    console.error('Import execute error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};


// ─── DELETE (Soft) / RESTORE students ────────────────────────────────────────
// POST /api/students/bulk-delete   { ids: [1,2,3], reason: '...' }
const deleteStudents = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { ids, reason } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0)
    return res.status(400).json({ success: false, error: 'يجب تحديد طلاب للحذف.' });

  try {
    const sqliteDb = db.getSQLiteDb();
    const now = new Date().toISOString();
    db.runTransaction(() => {
      for (const id of ids) {
        sqliteDb.run(
          'UPDATE students SET is_deleted = 1, deleted_at = ?, deletion_reason = ? WHERE id = ?',
          [now, reason || 'حذف يدوي', id]
        );
      }
    });
    db.flushSQLite();
    return res.json({ success: true, message: `تم حذف ${ids.length} طالب بنجاح.`, deleted: ids.length });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/students/bulk-restore  { ids: [1,2,3] }
const restoreStudents = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0)
    return res.status(400).json({ success: false, error: 'يجب تحديد طلاب لاستعادتهم.' });

  try {
    const sqliteDb = db.getSQLiteDb();
    db.runTransaction(() => {
      for (const id of ids) {
        sqliteDb.run(
          'UPDATE students SET is_deleted = 0, deleted_at = NULL, deletion_reason = NULL WHERE id = ?',
          [id]
        );
      }
    });
    db.flushSQLite();
    return res.json({ success: true, message: `تم استعادة ${ids.length} طالب بنجاح.`, restored: ids.length });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── BULK UPDATE ──────────────────────────────────────────────────────────────
// PUT /api/students/bulk-update
// Body: { ids: [1,2,3], field: 'status'|'second_language'|'grade_id'|'section_id', value: '...' }
const BULK_ALLOWED_FIELDS = {
  status:          { col: 'status',          check: v => ['promoted','retained','suspended'].includes(v) },
  second_language: { col: 'second_language', check: v => ['فرنسي','ألماني','إيطالي','إسباني','لا يوجد',null,''].includes(v) },
  grade_id:        { col: 'grade_id',        check: v => Number.isInteger(+v) && +v > 0 },
  section_id:      { col: 'section_id',      check: v => Number.isInteger(+v) && +v > 0 },
  academic_year_id:{ col: 'academic_year_id',check: v => Number.isInteger(+v) && +v > 0 },
};

const bulkUpdate = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { ids, field, value } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0)
    return res.status(400).json({ success: false, error: 'يجب تحديد طلاب للتعديل.' });

  const allowed = BULK_ALLOWED_FIELDS[field];
  if (!allowed)
    return res.status(400).json({ success: false, error: `الحقل "${field}" غير مسموح بتعديله جماعياً.` });

  const finalVal = (value === '' || value === null || value === undefined) ? null : value;
  if (!allowed.check(finalVal !== null ? finalVal : ''))
    return res.status(400).json({ success: false, error: `القيمة "${value}" غير صالحة لهذا الحقل.` });

  try {
    const sqliteDb = db.getSQLiteDb();
    db.runTransaction(() => {
      for (const id of ids) {
        sqliteDb.run(
          `UPDATE students SET ${allowed.col} = ? WHERE id = ? AND (is_deleted IS NULL OR is_deleted = 0)`,
          [finalVal, id]
        );
      }
    });
    db.flushSQLite();
    return res.json({ success: true, message: `تم تعديل ${ids.length} طالب بنجاح.`, updated: ids.length });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/students/bulk-extract-national-id
const bulkExtractNationalIdInfo = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    
    // Select all students who have a national ID
    const students = _all(sqliteDb, 'SELECT id, national_id, birth_date, gender, birth_place FROM students WHERE national_id IS NOT NULL AND (is_deleted IS NULL OR is_deleted = 0)');
    
    let updatedCount = 0;
    db.runTransaction(() => {
      for (const s of students) {
        const info = parseNationalId(s.national_id);
        if (info) {
          // Fill only if empty/null, or update anyway to correct spelling/formatting
          const newBirthDate = s.birth_date ? s.birth_date : info.birthDate;
          const newGender = s.gender ? s.gender : info.gender;
          const newBirthPlace = s.birth_place ? s.birth_place : info.birthPlace;

          if (newBirthDate !== s.birth_date || newGender !== s.gender || newBirthPlace !== s.birth_place) {
            sqliteDb.run(
              'UPDATE students SET birth_date = ?, gender = ?, birth_place = ? WHERE id = ?',
              [newBirthDate, newGender, newBirthPlace, s.id]
            );
            updatedCount++;
          }
        }
      }
    });

    db.flushSQLite();
    return res.json({
      success: true,
      message: `تم استخلاص البيانات وتحديث ${updatedCount} طالب بنجاح استناداً إلى الرقم القومي.`,
      updated: updatedCount
    });
  } catch (err) {
    console.error('Bulk extract national ID error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};


// ══════════════════════════════════════════════════════════════════════════════
//  EMIS INTEGRATION  — تكامل منظومة بيانات التلميذ
// ══════════════════════════════════════════════════════════════════════════════

// ─── خريطة تحويل أعمدة EMIS إلى حقول نبراس ─────────────────────────────────
const _emisColumnMap = (row) => {
  const g = (keys) => {
    for (const k of keys) {
      const v = row[k];
      if (v && String(v).trim()) return String(v).trim();
    }
    return '';
  };

  // بناء الاسم الكامل — قد يأتي مدموجاً أو موزعاً
  let fullNameAr = g(['الاسم بالكامل']);
  if (!fullNameAr) {
    const parts = [
      g(['الاسم الأول*', 'الاسم الأول']),
      g(['اسم الوالد*', 'اسم الوالد']),
      g(['اسم الجد*', 'اسم الجد']),
      g(['اللقب / العائله*', 'اللقب / العائله', 'اللقب']),
    ].filter(Boolean);
    fullNameAr = parts.join(' ');
  }

  // اسم الأم
  let motherName = g(['اسم الأم', 'اسم الام']);
  if (!motherName) {
    const mParts = [
      g(['اسم الام الأول*', 'اسم الام الأول']),
      g(['اسم الوالد للام*', 'اسم الوالد للام']),
      g(['اسم الجد للام*', 'اسم الجد للام']),
      g(['اللقب / العائله للام', 'اللقب للام']),
    ].filter(Boolean);
    motherName = mParts.join(' ');
  }

  // الجنس
  const genderRaw = g(['النوع*', 'النوع', 'الجنس']);
  const genderMap = { 'ذكر': 'ذكر', 'أنثى': 'أنثى', 'انثى': 'أنثى', 'male': 'ذكر', 'female': 'أنثى', '1': 'ذكر', '2': 'أنثى' };
  const gender = genderMap[genderRaw] || genderRaw;

  // حالة القيد
  const statusRaw = g(['حالة قيد الطالب*', 'حالة القيد', 'الحالة']);
  const statusMap = {
    'منقول': 'promoted', 'مرقى': 'promoted', 'ناجح': 'promoted',
    'راسب': 'retained', 'باق للإعادة': 'retained', 'يكمل': 'retained',
    'موقوف': 'suspended', 'موقوف قيده': 'suspended', 'محذوف': 'suspended',
  };
  const status = statusMap[statusRaw] || null;

  // الديانة
  const religionRaw = g(['الديانه*', 'الديانة']);
  const religionMap = { 'مسلم': 'مسلم', 'مسلمة': 'مسلم', 'مسيحي': 'مسيحي', 'مسيحية': 'مسيحي', 'مسيحى': 'مسيحي' };
  const religion = religionMap[religionRaw] || religionRaw;

  // اللغة الثانية
  const lang2Raw = g(['اللغه الاجنبية الثانية*', 'اللغة الثانية', 'اللغه الثانيه']);
  const lang2Map = { 'فرنسي': 'فرنسي', 'فرنسية': 'فرنسي', 'ألماني': 'ألماني', 'إيطالي': 'إيطالي', 'لا يوجد': null };
  const secondLanguage = lang2Map[lang2Raw] !== undefined ? lang2Map[lang2Raw] : lang2Raw;

  // الموقف من الدمج
  const mergeTypeRaw = g(['الموقف من الدمج*', 'الموقف من الدمج', 'نوع الدمج']);
  const mergeMap = { 'مدمج': 'مدمج', 'غير مدمج': 'غير مدمج', 'لا يوجد': null };
  const mergeType = mergeMap[mergeTypeRaw] !== undefined ? mergeMap[mergeTypeRaw] : mergeTypeRaw;

  // القسم — من نظام التعليم
  const sectionRaw = g(['نظام التعليم*', 'نظام التعليم', 'القسم', 'الشعبه*', 'الشعبة']);
  const sectionMap = {
    'عربي': 'عربي', 'حكومي': 'عربي', 'عام': 'عربي',
    'لغات': 'لغات', 'مكثف': 'لغات',
    'إيهاب': 'عربي',
  };
  const sectionName = sectionMap[sectionRaw] || sectionRaw;

  return {
    fullNameAr:       fullNameAr || null,
    nationalId:       g(['الرقم القومى*', 'الرقم القومى', 'الرقم القومي']) || null,
    emisStudentCode:  g(['كود التلميذ', 'الكود', 'كود الطالب']) || null,
    gender:           gender || null,
    birthDate:        g(['yyyy-mm-dd', 'تاريخ الميلاد*', 'تاريخ الميلاد']) || null,
    birthPlace:       g(['محافظة الميلاد*', 'محافظة الميلاد', 'مكان الميلاد']) || null,
    nationality:      g(['الجنسيه*', 'الجنسية']) || null,
    religion:         religion || null,
    motherName:       motherName || null,
    address:          g(['العنوان']) || null,
    gradeName:        g(['الصف*', 'الصف', 'الفرقة']) || null,
    sectionName:      sectionName || null,
    classroomName:    g(['الفصل*', 'الفصل']) || null,
    secondLanguage:   secondLanguage || null,
    mergeType:        mergeType || null,
    guardianPhone:    g(['رقم التليفون', 'رقم المحمول', 'تليفون']) || null,
    status:           status || null,
    statusRaw:        statusRaw || null,
  };
};

// ─── POST /api/students/emis/sync ────────────────────────────────────────────
const emisSync = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { students = [], source = 'extension' } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ success: false, error: 'لا توجد بيانات طلاب.' });
  }

  try {
    const sqliteDb = db.getSQLiteDb();
    const results = { matched: 0, new: 0, conflict: 0, skipped: 0 };

    for (const rawRow of students) {
      try {
        const mapped = _emisColumnMap(rawRow);
        const { nationalId, emisStudentCode, fullNameAr, gradeName, sectionName } = mapped;

        if (!nationalId && !emisStudentCode) {
          results.skipped++;
          continue;
        }

        // البحث في قاعدة البيانات بالرقم القومي أولاً ثم كود EMIS
        let existing = null;
        if (nationalId) {
          const stmt = sqliteDb.prepare('SELECT id, full_name_ar, national_id, gender, birth_date, emis_student_code FROM students WHERE national_id = ? AND is_deleted = 0 LIMIT 1');
          stmt.bind([nationalId]);
          existing = stmt.step() ? stmt.getAsObject() : null;
          stmt.free();
        }
        if (!existing && emisStudentCode) {
          const stmt2 = sqliteDb.prepare('SELECT id, full_name_ar, national_id, gender, birth_date, emis_student_code FROM students WHERE emis_student_code = ? AND is_deleted = 0 LIMIT 1');
          stmt2.bind([emisStudentCode]);
          existing = stmt2.step() ? stmt2.getAsObject() : null;
          stmt2.free();
        }

        // التحقق من وجود سجل في emis_sync_log لهذا الطالب
        const logKey = nationalId || emisStudentCode;
        const existingLog = sqliteDb.prepare('SELECT id FROM emis_sync_log WHERE (national_id = ? OR emis_code = ?) LIMIT 1');
        existingLog.bind([logKey, logKey]);
        const logExists = existingLog.step();
        existingLog.free();
        if (logExists) { results.skipped++; continue; }

        let syncStatus = 'new';
        let conflictFields = null;
        let neprasStudentId = null;

        if (existing) {
          neprasStudentId = existing.id;
          // مقارنة الحقول الأساسية
          const conflicts = [];
          if (fullNameAr && existing.full_name_ar && fullNameAr !== existing.full_name_ar) conflicts.push('الاسم');
          if (mapped.gender && existing.gender && mapped.gender !== existing.gender) conflicts.push('الجنس');
          if (mapped.birthDate && existing.birth_date && mapped.birthDate !== existing.birth_date) conflicts.push('تاريخ الميلاد');

          if (conflicts.length > 0) {
            syncStatus = 'conflict';
            conflictFields = JSON.stringify(conflicts);
            results.conflict++;
          } else {
            syncStatus = 'matched';
            results.matched++;
            // تحديث كود EMIS إذا لم يكن محفوظاً
            if (emisStudentCode && !existing.emis_student_code) {
              sqliteDb.run('UPDATE students SET emis_student_code = ? WHERE id = ?', [emisStudentCode, existing.id]);
              db.flushSQLite();
            }
          }
        } else {
          syncStatus = 'new';
          results.new++;
        }

        // حفظ في سجل المزامنة
        sqliteDb.run(`
          INSERT INTO emis_sync_log (emis_code, national_id, full_name_ar, grade_name, section_name, sync_status, conflict_fields, raw_data, nepras_student_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          emisStudentCode, nationalId, fullNameAr, gradeName, sectionName,
          syncStatus, conflictFields, JSON.stringify(mapped), neprasStudentId
        ]);
        db.flushSQLite();

      } catch (rowErr) {
        console.error('[EMIS Sync] Row error:', rowErr.message);
        results.skipped++;
      }
    }

    return res.json({ success: true, results, received: students.length });
  } catch (err) {
    console.error('[EMIS Sync] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/students/emis/status ────────────────────────────────────────────
const emisStatus = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const countRow = (status) => {
      const s = sqliteDb.prepare('SELECT COUNT(*) as cnt FROM emis_sync_log WHERE sync_status = ?');
      s.bind([status]);
      const r = s.step() ? s.getAsObject() : { cnt: 0 };
      s.free();
      return r.cnt || 0;
    };
    const totalS = sqliteDb.prepare('SELECT COUNT(*) as cnt FROM emis_sync_log');
    totalS.step();
    const total = totalS.getAsObject().cnt || 0;
    totalS.free();

    const matched  = countRow('matched');
    const newCount = countRow('new');
    const conflict = countRow('conflict');
    const added    = countRow('added');
    const skipped  = countRow('skipped');

    // قائمة الطلاب الجدد
    const newStudentsS = sqliteDb.prepare(`SELECT id, emis_code, national_id, full_name_ar, grade_name, section_name, raw_data, created_at FROM emis_sync_log WHERE sync_status = 'new' ORDER BY id DESC LIMIT 500`);
    const newStudents = [];
    while (newStudentsS.step()) {
      const r = newStudentsS.getAsObject();
      try { r.mapped = JSON.parse(r.raw_data || '{}'); } catch { r.mapped = {}; }
      newStudents.push(r);
    }
    newStudentsS.free();

    // قائمة التعارضات
    const conflictsS = sqliteDb.prepare(`SELECT id, emis_code, national_id, full_name_ar, grade_name, conflict_fields, raw_data, nepras_student_id, created_at FROM emis_sync_log WHERE sync_status = 'conflict' ORDER BY id DESC LIMIT 500`);
    const conflicts = [];
    while (conflictsS.step()) {
      const r = conflictsS.getAsObject();
      try { r.mapped = JSON.parse(r.raw_data || '{}'); } catch { r.mapped = {}; }
      try { r.conflictFieldsList = JSON.parse(r.conflict_fields || '[]'); } catch { r.conflictFieldsList = []; }
      conflicts.push(r);
    }
    conflictsS.free();

    return res.json({ success: true, stats: { total, matched, new: newCount, conflict, added, skipped }, newStudents, conflicts });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/students/emis/approve/:logId ───────────────────────────────────
const emisApprove = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { logId } = req.params;
  const { sectionId, stageId, gradeId, academicYearId } = req.body;
  if (!sectionId || !stageId || !gradeId || !academicYearId) {
    return res.status(400).json({ success: false, error: 'يجب تحديد القسم والمرحلة والصف والعام الدراسي.' });
  }
  try {
    const sqliteDb = db.getSQLiteDb();
    const logS = sqliteDb.prepare('SELECT * FROM emis_sync_log WHERE id = ? LIMIT 1');
    logS.bind([logId]);
    const logRow = logS.step() ? logS.getAsObject() : null;
    logS.free();
    if (!logRow) return res.status(404).json({ success: false, error: 'سجل غير موجود.' });

    let mapped;
    try { mapped = JSON.parse(logRow.raw_data || '{}'); } catch { mapped = {}; }

    const studentCode = _generateCode(sqliteDb, sectionId, stageId);
    sqliteDb.run(`
      INSERT INTO students (
        student_code, full_name_ar, gender, birth_date, birth_place,
        national_id, nationality, religion, mother_name, address,
        second_language, merge_type, guardian_phone, student_phone,
        emis_student_code, enrollment_date,
        section_id, stage_id, grade_id, academic_year_id, status
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      studentCode,
      mapped.fullNameAr || logRow.full_name_ar,
      mapped.gender || 'ذكر',
      mapped.birthDate || null,
      mapped.birthPlace || null,
      mapped.nationalId || logRow.national_id,
      mapped.nationality || 'مصري',
      mapped.religion || null,
      mapped.motherName || null,
      mapped.address || null,
      mapped.secondLanguage || null,
      mapped.mergeType || null,
      mapped.guardianPhone || null,
      null,
      mapped.emisStudentCode || logRow.emis_code,
      new Date().toISOString().split('T')[0],
      sectionId, stageId, gradeId, academicYearId,
      mapped.status || 'promoted',
    ]);
    const newId = _lastId(sqliteDb);
    sqliteDb.run('UPDATE emis_sync_log SET sync_status = ?, nepras_student_id = ?, updated_at = datetime(\'now\') WHERE id = ?', ['added', newId, logId]);
    db.flushSQLite();

    return res.json({ success: true, studentCode, newStudentId: newId });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/students/emis/approve-all ─────────────────────────────────────
const emisApproveAll = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { sectionId, stageId, gradeId, academicYearId } = req.body;
  if (!sectionId || !stageId || !gradeId || !academicYearId) {
    return res.status(400).json({ success: false, error: 'يجب تحديد القسم والمرحلة والصف والعام الدراسي.' });
  }
  try {
    const sqliteDb = db.getSQLiteDb();
    const newS = sqliteDb.prepare("SELECT * FROM emis_sync_log WHERE sync_status = 'new'");
    const newRows = [];
    while (newS.step()) newRows.push(newS.getAsObject());
    newS.free();

    let added = 0, errors = 0;
    for (const logRow of newRows) {
      try {
        let mapped;
        try { mapped = JSON.parse(logRow.raw_data || '{}'); } catch { mapped = {}; }
        const studentCode = _generateCode(sqliteDb, sectionId, stageId);
        sqliteDb.run(`
          INSERT INTO students (
            student_code, full_name_ar, gender, birth_date, birth_place,
            national_id, nationality, religion, mother_name, address,
            second_language, merge_type, guardian_phone,
            emis_student_code, enrollment_date,
            section_id, stage_id, grade_id, academic_year_id, status
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `, [
          studentCode,
          mapped.fullNameAr || logRow.full_name_ar,
          mapped.gender || 'ذكر',
          mapped.birthDate || null,
          mapped.birthPlace || null,
          mapped.nationalId || logRow.national_id,
          mapped.nationality || 'مصري',
          mapped.religion || null,
          mapped.motherName || null,
          mapped.address || null,
          mapped.secondLanguage || null,
          mapped.mergeType || null,
          mapped.guardianPhone || null,
          mapped.emisStudentCode || logRow.emis_code,
          new Date().toISOString().split('T')[0],
          sectionId, stageId, gradeId, academicYearId,
          mapped.status || 'promoted',
        ]);
        const newId = _lastId(sqliteDb);
        sqliteDb.run("UPDATE emis_sync_log SET sync_status = 'added', nepras_student_id = ?, updated_at = datetime('now') WHERE id = ?", [newId, logRow.id]);
        added++;
      } catch { errors++; }
    }
    db.flushSQLite();
    return res.json({ success: true, added, errors });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── DELETE /api/students/emis/session ───────────────────────────────────────
const emisClearSession = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    sqliteDb.run('DELETE FROM emis_sync_log');
    db.flushSQLite();
    return res.json({ success: true, message: 'تم مسح جلسة المزامنة.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/students/transfers/list ────────────────────────────────────────
const getTransfersList = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const stmt = sqliteDb.prepare(`
      SELECT t.*, s.full_name_ar, s.student_code, s.national_id, g.grade_name_ar
      FROM student_transfers t
      JOIN students s ON s.id = t.student_id
      LEFT JOIN grades_lookup g ON g.id = s.grade_id
      ORDER BY t.id DESC
    `);
    
    const transfers = [];
    while (stmt.step()) {
      transfers.push(stmt.getAsObject());
    }
    stmt.free();

    return res.json({ success: true, transfers });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/students/export/transfers ──────────────────────────────────────
const exportTransfersExcel = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const ExcelJS = require('exceljs');
    const sqliteDb = db.getSQLiteDb();
    
    const stmt = sqliteDb.prepare(`
      SELECT t.*, s.full_name_ar, s.student_code, s.national_id, g.grade_name_ar
      FROM student_transfers t
      JOIN students s ON s.id = t.student_id
      LEFT JOIN grades_lookup g ON g.id = s.grade_id
      ORDER BY t.id DESC
    `);
    
    const transfers = [];
    while (stmt.step()) {
      transfers.push(stmt.getAsObject());
    }
    stmt.free();

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('حركة التحويلات');
    ws.views = [{ rtl: true }];
    ws.showGridLines = true;

    // Title Row
    ws.addRow([]);
    ws.addRow(['سجل حركة تحويلات الطلاب (الصادرة والواردة)']);
    ws.mergeCells('A2:K2');
    const titleCell = ws.getCell('A2');
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A5FFF' } };
    ws.getRow(2).height = 40;

    ws.addRow([]); // Blank spacer

    // Header Row
    const headers = [
      'م', 'اسم الطالب', 'الرقم القومي', 'كود الطالب', 'الصف الدراسي',
      'نوع الحركة', 'المدرسة المرتبطة', 'الإدارة التعليمية', 'تاريخ التحويل',
      'السبب', 'ملاحظات'
    ];
    ws.addRow(headers);
    const headerRow = ws.getRow(4);
    headerRow.height = 28;
    headerRow.eachCell(cell => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2C3E50FF' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF999999' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF999999' } },
        right: { style: 'thin', color: { argb: 'FF999999' } }
      };
    });

    // Data Rows
    transfers.forEach((t, index) => {
      const rowData = [
        index + 1,
        t.full_name_ar || '',
        t.national_id || '',
        t.student_code || '',
        t.grade_name_ar || '',
        t.transfer_type === 'in' ? 'تحويل وارد' : 'تحويل صادر',
        t.transfer_type === 'in' ? (t.from_school || '') : (t.to_school || ''),
        t.transfer_type === 'in' ? (t.from_directorate || '') : (t.to_directorate || ''),
        t.transfer_date || '',
        t.reason || '',
        t.notes || ''
      ];
      ws.addRow(rowData);
      
      const rIdx = index + 5;
      const row = ws.getRow(rIdx);
      row.height = 22;
      
      const isEven = index % 2 === 0;
      const bgColor = isEven ? 'FFFFFFFF' : 'F9F9F9FF';
      
      row.eachCell((cell, cIdx) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        };
        // Alignment
        if (cIdx === 2 || cIdx === 7 || cIdx === 10 || cIdx === 11) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        // Style "Type" column
        if (cIdx === 6) {
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: t.transfer_type === 'in' ? 'FF10B981' : 'FFF59E0B' } };
        }
      });
    });

    // Column widths
    ws.columns.forEach((col, idx) => {
      const maxLen = 12;
      col.width = idx === 1 ? 25 : idx === 2 ? 18 : idx === 6 ? 16 : idx === 9 ? 16 : maxLen;
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=transfers_report.xlsx');
    
    const buffer = await wb.xlsx.writeBuffer();
    return res.send(buffer);
  } catch (err) {
    console.error('Failed to export transfers Excel:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/students/purge-all
const purgeAllStudents = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { confirmText } = req.body;
  if (confirmText !== 'حذف جميع الطلاب') {
    return res.status(400).json({ success: false, error: 'يرجى كتابة نص التأكيد بشكل صحيح: "حذف جميع الطلاب"' });
  }
  try {
    const sqliteDb = db.getSQLiteDb();
    db.runTransaction(() => {
      sqliteDb.run('DELETE FROM student_special_cases');
      sqliteDb.run('DELETE FROM student_transfers');
      sqliteDb.run('DELETE FROM class_enrollments');
      sqliteDb.run('DELETE FROM students');
    });
    return res.json({ success: true, message: 'تم حذف جميع بيانات الطلاب بالكامل وتصفير الجدول.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/students/:id/permanent
const deleteStudentPermanently = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { id } = req.params;
  try {
    const sqliteDb = db.getSQLiteDb();
    db.runTransaction(() => {
      sqliteDb.run('DELETE FROM student_special_cases WHERE student_id = ?', [id]);
      sqliteDb.run('DELETE FROM student_transfers WHERE student_id = ?', [id]);
      sqliteDb.run('DELETE FROM class_enrollments WHERE student_id = ?', [id]);
      sqliteDb.run('DELETE FROM students WHERE id = ?', [id]);
    });
    return res.json({ success: true, message: 'تم حذف الطالب نهائياً من قاعدة البيانات.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Bulk Permanent Delete (trash items) ─────────────────────────────────────
const bulkDeletePermanently = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0)
    return res.status(400).json({ success: false, error: 'لا يوجد طلاب محددون للحذف.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const placeholders = ids.map(() => '?').join(',');
    db.runTransaction(() => {
      sqliteDb.run(`DELETE FROM student_special_cases WHERE student_id IN (${placeholders})`, ids);
      sqliteDb.run(`DELETE FROM student_transfers WHERE student_id IN (${placeholders})`, ids);
      sqliteDb.run(`DELETE FROM class_enrollments WHERE student_id IN (${placeholders})`, ids);
      sqliteDb.run(`DELETE FROM students WHERE id IN (${placeholders})`, ids);
    });
    return res.json({ success: true, message: `تم حذف ${ids.length} طالب نهائياً من قاعدة البيانات.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Student Absence Warnings (إنذارات الغياب القانونية) ─────────────────────
const getAbsenceWarnings = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const warnings = _all(sqliteDb, `
      SELECT w.*, s.full_name_ar, s.national_id, s.emis_student_code
      FROM student_absence_warnings w
      JOIN students s ON w.student_id = s.id
      ORDER BY w.id DESC
    `);
    return res.json({ success: true, warnings });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const recordStudentAbsence = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const { student_id, absence_date, absence_type, notes } = req.body;
    if (!student_id || !absence_date) {
      return res.status(400).json({ success: false, error: 'مطلوب تحديد الطالب وتاريخ الغياب.' });
    }

    _run(sqliteDb, `
      INSERT INTO student_absence_records (student_id, absence_date, absence_type, notes)
      VALUES (?, ?, ?, ?)
    `, [student_id, absence_date, absence_type || 'بدون عذر', notes || null]);

    // Check total unexcused absence days for warning generation
    const totalAbsentObj = _get(sqliteDb, `
      SELECT COUNT(*) AS total FROM student_absence_records
      WHERE student_id = ? AND absence_type = 'بدون عذر'
    `, [student_id]);
    const totalAbsent = totalAbsentObj ? totalAbsentObj.total : 0;

    let warningGenerated = null;
    if (totalAbsent >= 15) {
      warningGenerated = 'إنذار فصل وتنبيه (15 يوماً متصلة أو 30 يوماً منفصلة)';
    } else if (totalAbsent >= 12) {
      warningGenerated = 'إنذار ثاني (12 يوماً غياب)';
    } else if (totalAbsent >= 7) {
      warningGenerated = 'إنذار أول (7 أيام غياب)';
    }

    if (warningGenerated) {
      _run(sqliteDb, `
        INSERT INTO student_absence_warnings (student_id, warning_type, total_absent_days, notes)
        VALUES (?, ?, ?, ?)
      `, [student_id, warningGenerated, totalAbsent, `تم التوليد التلقائي لبلوع الغياب ${totalAbsent} يوماً`]);
    }

    db.flushSQLite();
    return res.json({ success: true, message: 'تم تسجيل غياب الطالب بنجاح.', totalAbsent, warningGenerated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Exam Seating Numbers & Committees (أرقام الجلوس ولجان 12 د) ───────────────
const generateSeatingNumbers = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const { start_number = 1001, students_per_committee = 20 } = req.body;

    const students = _all(sqliteDb, `
      SELECT id, full_name_ar FROM students
      WHERE is_deleted = 0
      ORDER BY full_name_ar ASC
    `);

    let currentNum = parseInt(start_number);
    let committeeIdx = 1;

    db.runTransaction(() => {
      sqliteDb.run('DELETE FROM student_seating_numbers');
      students.forEach((st, idx) => {
        if (idx > 0 && idx % parseInt(students_per_committee) === 0) {
          committeeIdx++;
        }
        const committeeName = `لجنة ${committeeIdx} (قاعة الامتحانات ${committeeIdx})`;
        sqliteDb.run(`
          INSERT INTO student_seating_numbers (student_id, seating_number, committee_name)
          VALUES (?, ?, ?)
        `, [st.id, currentNum, committeeName]);
        currentNum++;
      });
    });

    db.flushSQLite();
    return res.json({ success: true, message: `تم توليد أرقام الجلوس وتوزيع اللجان لعدد ${students.length} طالب بنجاح.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getSeatingLists = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const seatingList = _all(sqliteDb, `
      SELECT sn.seating_number, sn.committee_name, s.id as student_id, s.full_name_ar, s.national_id, s.emis_student_code
      FROM student_seating_numbers sn
      JOIN students s ON sn.student_id = s.id
      ORDER BY sn.seating_number ASC
    `);
    return res.json({ success: true, seatingList });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getFormOptions,
  getStats,
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  createTransfer,
  completeTransfer,
  getTransfersList,
  exportExcelTemplate,
  exportClassListExcel,
  exportTransfersExcel,
  downloadImportTemplate,
  importPreview,
  importExecute,
  deleteStudents,
  restoreStudents,
  bulkUpdate,
  bulkExtractNationalIdInfo,
  purgeAllStudents,
  deleteStudentPermanently,
  bulkDeletePermanently,
  emisSync,
  emisStatus,
  emisApprove,
  emisApproveAll,
  emisClearSession,
  getAbsenceWarnings,
  recordStudentAbsence,
  generateSeatingNumbers,
  getSeatingLists,
  getDuplicateStudents
};


