const excelReportEngine = require('../../services/excelReportEngine');
const db = require('../../config/db');
const { formatClassroomLabel, extractClassNumber } = require('../../utils/classroomFormatter');
const { getSchoolMasterInfo, calculateAgeOnOct1st, detectSiblingsAndTwins, autoLinkSiblingsAndTwins } = require('../../utils/schoolHelper');

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

const _run = (sqliteDb, sql, params = []) => {
  if (params && params.length) {
    sqliteDb.run(sql, params);
  } else {
    sqliteDb.run(sql);
  }
};

// ─── Generate student code ─────────────────────────────────────────────────
const _generateCode = (sqliteDb, sectionId, stageId) => {
  let counter = _get(sqliteDb,
    'SELECT id, prefix, last_serial FROM stage_serial_counters WHERE section_id = ? AND stage_id = ?',
    [sectionId || 1, stageId || 1]
  );

  if (!counter) {
    // Auto-create missing counter for section & stage
    try {
      const stageObj = _get(sqliteDb, 'SELECT stage_name FROM stages_lookup WHERE id = ?', [stageId || 1]);
      const stageName = stageObj?.stage_name || '';
      const prefix = stageName.includes('ابتدائ') ? 'PRI' :
                     stageName.includes('اعداد') || stageName.includes('إعداد') ? 'PREP' :
                     stageName.includes('ثانو') ? 'SEC' :
                     stageName.includes('روض') || stageName.includes('طفل') ? 'KG' : 'STU';

      sqliteDb.run(
        'INSERT OR IGNORE INTO stage_serial_counters (section_id, stage_id, prefix, last_serial) VALUES (?, ?, ?, 0)',
        [sectionId || 1, stageId || 1, prefix]
      );
      db.flushSQLite();

      counter = _get(sqliteDb,
        'SELECT id, prefix, last_serial FROM stage_serial_counters WHERE section_id = ? AND stage_id = ?',
        [sectionId || 1, stageId || 1]
      );
    } catch (e) {
      console.error('[DB] Counter auto-create error:', e.message);
    }
  }

  if (!counter) {
    counter = { id: 0, prefix: 'STU', last_serial: Math.floor(Math.random() * 8000) };
  }

  const year = new Date().getFullYear();
  const next = (counter.last_serial || 0) + 1;

  if (counter.id > 0) {
    try {
      sqliteDb.run('UPDATE stage_serial_counters SET last_serial = ? WHERE id = ?', [next, counter.id]);
      db.flushSQLite();
    } catch (_) {}
  }

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
  const str = String(val).trim();
  if (str === '2' || str.includes('مسيح') || str.includes('نصران') || str.toLowerCase().includes('christian')) {
    return 'مسيحي';
  }
  if (str === '1' || str.includes('مسلم') || str.toLowerCase().includes('muslim')) {
    return 'مسلم';
  }
  if (str === '3' || str.includes('أخر') || str.includes('اخر') || str.toLowerCase().includes('other')) {
    return 'أخرى';
  }
  const direct = RELIGION_MAP[str];
  if (direct) return direct;
  const normalized = normalizeAr(str);
  return RELIGION_MAP[normalized] || str;
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
    const sections      = _all(sqliteDb, 'SELECT id, name, type FROM sections WHERE is_active = 1 ORDER BY id ASC');
    const stages        = _all(sqliteDb, `
      SELECT id, section_id, stage_name, stage_name AS name, stage_name AS stage_name_ar, stage_code, years_count, display_order
      FROM stages_lookup
      WHERE (is_active = 1 OR is_active IS NULL)
      ORDER BY display_order ASC, id ASC
    `);
    const grades        = _all(sqliteDb, `
      SELECT gl.id, gl.stage_id, gl.grade_number, gl.grade_name_ar, gl.grade_name_ar AS name, gl.secondary_system 
      FROM grades_lookup gl
      WHERE (gl.is_active = 1 OR gl.is_active IS NULL)
      ORDER BY gl.id ASC
    `);
    const nationalities = _all(sqliteDb, 'SELECT id, name FROM nationalities ORDER BY name');
    let academicYears = _all(sqliteDb, 'SELECT id, year_label, is_current FROM academic_years WHERE is_current = 1 ORDER BY id DESC LIMIT 1');
    if (!academicYears || academicYears.length === 0) {
      academicYears = _all(sqliteDb, 'SELECT id, year_label, is_current FROM academic_years ORDER BY id DESC LIMIT 1');
      if (academicYears && academicYears.length > 0) {
        sqliteDb.run('UPDATE academic_years SET is_current = 1 WHERE id = ?', [academicYears[0].id]);
        academicYears[0].is_current = 1;
      }
    }
    const caseTypes     = _all(sqliteDb, 'SELECT id, code, name_ar FROM special_case_types WHERE is_active = 1 ORDER BY name_ar');
    const enrollmentStatuses = _all(sqliteDb, 'SELECT id, code, name_ar, color, sort_order FROM enrollment_status_lookup ORDER BY sort_order');
    const foreignLanguages   = _all(sqliteDb, 'SELECT id, code, name_ar AS name FROM foreign_languages_lookup ORDER BY sort_order');
    const specialNeeds       = _all(sqliteDb, 'SELECT id, code, name_ar FROM special_needs_types_lookup ORDER BY sort_order');
    const schoolTracks       = _all(sqliteDb, 'SELECT id, code, name_ar FROM school_tracks_lookup ORDER BY sort_order');
    const schoolSpecializations = _all(sqliteDb, 'SELECT id, code, name_ar, track_code FROM school_specializations_lookup ORDER BY sort_order');
    const religions          = [{ id: 1, name: 'مسلم' }, { id: 2, name: 'مسيحي' }];
    const genders            = [{ id: 1, name: 'ذكر' }, { id: 2, name: 'أنثى' }];
    const guardianRelations  = [
      { id: 1, name: 'أب', name_ar: 'أب', label: 'أب' },
      { id: 2, name: 'أم', name_ar: 'أم', label: 'أم' },
      { id: 3, name: 'جد', name_ar: 'جد', label: 'جد' },
      { id: 4, name: 'جدة', name_ar: 'جدة', label: 'جدة' },
      { id: 5, name: 'عم', name_ar: 'عم', label: 'عم' },
      { id: 6, name: 'عمة', name_ar: 'عمة', label: 'عمة' },
      { id: 7, name: 'خال', name_ar: 'خال', label: 'خال' },
      { id: 8, name: 'خالة', name_ar: 'خالة', label: 'خالة' },
      { id: 9, name: 'أخ', name_ar: 'أخ', label: 'أخ' },
      { id: 10, name: 'أخت', name_ar: 'أخت', label: 'أخت' },
      { id: 11, name: 'وصي قانوني', name_ar: 'وصي قانوني', label: 'وصي قانوني' }
    ];

    return res.json({
      success: true,
      sections,
      stages,
      grades,
      nationalities,
      academicYears,
      caseTypes,
      enrollmentStatuses,
      foreignLanguages,
      specialNeeds,
      schoolTracks,
      schoolSpecializations,
      religions,
      genders,
      guardianRelations
    });
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
    const merged       = _get(sqliteDb, `SELECT COUNT(*) AS n FROM students s WHERE ${baseFilter} AND (s.is_merged = 1 OR s.is_merged = '1')`, params)?.n || 0;
    // عدد التحويلات الصادرة والواردة النشطة (pending أو completed في العام المحدد)
    const transfersParams = academicYearId ? [academicYearId] : [];
    const transfersFilter = academicYearId ? 'WHERE academic_year_id = ?' : '';
    const transfers = _get(sqliteDb, `SELECT COUNT(*) AS n FROM student_transfers ${transfersFilter}`, transfersParams)?.n || 0;
    
    const bySection = _all(sqliteDb, `
      SELECT sec.name, COUNT(s.id) AS cnt
      FROM students s JOIN sections sec ON sec.id = s.section_id
      WHERE ${activeFilter}
      GROUP BY s.section_id`, params);

    return res.json({ success: true, stats: { total, promoted, retained, disconnected, suspended, excluded, deleted, male, female, bySection, merged, transfers } });
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
      isMerged, isOrphan, isTwin, isSpecialCase, isTalented, nationalityId // new: merge / nationality filters
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
        where.push("(s.status IN ('disconnected', 'منقطع') OR s.enrollment_status = 'منقطع' OR s.registration_status_id = 5)");
      } else if (activeMode === 'suspended') {
        where.push("(s.status IN ('suspended', 'موقوف قيده') OR s.enrollment_status = 'موقوف قيده' OR s.registration_status_id = 4)");
      } else if (activeMode === 'excluded') {
        where.push("(s.status IN ('excluded', 'مستبعد') OR s.enrollment_status = 'مستبعد' OR s.registration_status_id = 6)");
      } else if (activeMode === 'new' || activeMode === 'مستجد') {
        where.push("(s.status IN ('new', 'مستجد') OR s.enrollment_status = 'مستجد' OR s.registration_status_id = 1)");
      } else if (activeMode === 'promoted' || activeMode === 'منقول') {
        where.push("(s.status IN ('promoted', 'منقول') OR s.enrollment_status = 'منقول' OR s.registration_status_id = 2)");
      } else if (activeMode === 'retained' || activeMode === 'باق') {
        where.push("(s.status IN ('retained', 'باق') OR s.enrollment_status LIKE '%باق%' OR s.registration_status_id = 3)");
      } else if (activeMode === 'merged' || activeMode === 'دمج') {
        where.push("(s.is_merged = 1 OR s.is_merged = '1')");
      } else if (activeMode === 'orphans' || activeMode === 'أيتام') {
        where.push("(s.is_orphan = 1 OR s.father_status = 'متوفى' OR s.mother_status = 'متوفاة' OR s.orphan_type IS NOT NULL)");
      } else if (activeMode === 'talented' || activeMode === 'gifted' || activeMode === 'موهوبين') {
        where.push(`(s.is_talented = 1 OR (s.talent_description IS NOT NULL AND s.talent_description != '') OR EXISTS (SELECT 1 FROM student_special_cases ssc JOIN special_case_types sct ON sct.id = ssc.case_type_id WHERE ssc.student_id = s.id AND ssc.is_active = 1 AND sct.code IN ('sport_talent', 'art_talent', 'quran_hafiz', 'national_merit', 'gifted', 'scholarship')) )`);
      } else if (activeMode === 'special_cases' || activeMode === 'discount_cases') {
        where.push(`(
          s.parent_staff_id IS NOT NULL 
          OR s.is_orphan = 1 
          OR s.father_status = 'متوفى' 
          OR s.mother_status = 'متوفاة' 
          OR s.is_merged = 1 
          OR s.is_talented = 1 
          OR s.is_twin = 1 
          OR s.twin_student_id IS NOT NULL 
          OR (s.sibling_student_ids IS NOT NULL AND s.sibling_student_ids != '' AND s.sibling_student_ids != '[]')
          OR EXISTS (SELECT 1 FROM student_special_cases ssc WHERE ssc.student_id = s.id AND ssc.is_active = 1)
        )`);
      } else if (activeMode === 'active' || activeMode === 'normal') {
        where.push("(s.status IN ('new', 'promoted', 'retained', 'مستجد', 'منقول', 'باق', 'active', 'نشط') OR s.status IS NULL OR s.status = '' OR s.enrollment_status IN ('مستجد', 'منقول', 'باق') OR s.enrollment_status IS NULL OR s.enrollment_status = '') AND (s.status NOT IN ('excluded', 'disconnected', 'suspended', 'مستبعد', 'منقطع', 'موقوف قيده') AND (s.enrollment_status NOT IN ('مستبعد', 'منقطع', 'موقوف قيده') OR s.enrollment_status IS NULL))");
      } else if (activeMode === 'all') {
        // All non-deleted students
      } else {
        // Main registry by default: all active students (new, promoted, retained)
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
    if (isOrphan === '1' || isOrphan === 'true')  { where.push("(s.is_orphan = 1 OR s.father_status = 'متوفى' OR s.mother_status = 'متوفاة' OR s.orphan_type IS NOT NULL)"); }
    if (isTwin === '1' || isTwin === 'true')      { where.push('(s.is_twin = 1 OR s.twin_student_id IS NOT NULL)'); }
    if (isTalented === '1' || isTalented === 'true') {
      where.push(`(s.is_talented = 1 OR (s.talent_description IS NOT NULL AND s.talent_description != '') OR EXISTS (SELECT 1 FROM student_special_cases ssc JOIN special_case_types sct ON sct.id = ssc.case_type_id WHERE ssc.student_id = s.id AND ssc.is_active = 1 AND sct.code IN ('sport_talent', 'art_talent', 'quran_hafiz', 'national_merit', 'gifted', 'scholarship')) )`);
    }
    if (isSpecialCase === '1' || isSpecialCase === 'true') {
      where.push(`(
        s.parent_staff_id IS NOT NULL 
        OR s.is_orphan = 1 
        OR s.father_status = 'متوفى' 
        OR s.mother_status = 'متوفاة' 
        OR s.is_merged = 1 
        OR s.is_talented = 1 
        OR s.is_twin = 1 
        OR s.twin_student_id IS NOT NULL 
        OR (s.sibling_student_ids IS NOT NULL AND s.sibling_student_ids != '' AND s.sibling_student_ids != '[]')
        OR EXISTS (SELECT 1 FROM student_special_cases ssc WHERE ssc.student_id = s.id AND ssc.is_active = 1)
      )`);
    }

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
      SELECT s.id, s.student_code, s.full_name_ar, s.gender, s.status, s.enrollment_status,
             s.birth_date, s.birth_place, s.guardian_phone, s.guardian_phone_2, s.enrollment_date,
             s.secondary_track, s.second_language, s.language_id_1, s.language_id_2,
             s.national_id, s.religion, s.guardian_name, s.guardian_job, s.guardian_relation, s.guardian_national_id, s.address,
             s.mother_name, s.mother_national_id,
             s.is_orphan, s.orphan_type, s.father_status, s.mother_status, s.social_research_number, s.social_research_date, s.orphan_notes,
             s.is_twin, s.twin_student_id, s.sibling_student_ids,
             s.parent_staff_id, s.is_talented, s.talent_description,
             s.is_returned_from_abroad, s.country_from, s.transferred_from_school,
             s.is_merged, s.merge_type, s.disability_id, s.merge_decision_number, s.merge_decision_date, s.merge_notes,
             s.nationality_id, s.registration_status_id, n.name AS nationality_name,
             s.section_id, sec.name AS section_name, sec.type AS section_type,
             s.stage_id, st.stage_name,
             s.grade_id, g.grade_name_ar, g.grade_number,
             s.academic_year_id, ay.year_label AS academic_year,
             c.class_name AS classroom_name,
             c.class_number,
             c.id AS classroom_id,
             s.deletion_reason,
             (SELECT GROUP_CONCAT(sct.name_ar, ' • ') 
              FROM student_special_cases ssc 
              JOIN special_case_types sct ON sct.id = ssc.case_type_id 
              WHERE ssc.student_id = s.id AND ssc.is_active = 1) AS special_cases_names,
             stf.full_name_ar AS staff_parent_name
      FROM students s
      LEFT JOIN sections      sec ON sec.id = s.section_id
      LEFT JOIN stages_lookup st  ON st.id  = s.stage_id
      LEFT JOIN grades_lookup g   ON g.id   = s.grade_id
      LEFT JOIN academic_years ay ON ay.id  = s.academic_year_id
      LEFT JOIN nationalities  n  ON n.id   = s.nationality_id
      LEFT JOIN staff          stf ON stf.id = s.parent_staff_id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.academic_year_id = s.academic_year_id
      LEFT JOIN classes c ON c.id = COALESCE(ce.class_id, s.class_id)
      WHERE ${whereStr}
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?
    `, [...params, queryLimit, offset]);

    for (const s of students) {
      if (s.classroom_name || s.class_number) {
        s.classroom_name = formatClassroomLabel({
          classNumber: s.class_number || s.classroom_name,
          className: s.classroom_name,
          gradeNumber: s.grade_number || 1,
          stageName: s.stage_name || '',
          sectionType: s.section_type || 'general'
        });
      }
    }

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
             g.grade_name_ar, g.grade_number, g.secondary_system,
             ay.year_label AS academic_year,
             n.name  AS nationality_name,
             mn.name AS mother_nationality_name,
             mg.grade_name_ar AS merged_grade_name,
             c.class_name AS classroom_name,
             c.class_number,
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

    if (student.classroom_name || student.class_number) {
      student.classroom_name = formatClassroomLabel({
        classNumber: student.class_number || student.classroom_name,
        className: student.classroom_name,
        gradeNumber: student.grade_number || 1,
        stageName: student.stage_name || '',
        sectionType: student.section_type || 'general'
      });
    }

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

// Helper status mapper — مطابق لمعايير وزارة التربية والتعليم الرسمية الـ 6
const mapStudentStatus = (rawStatus) => {
  if (!rawStatus) return { status: 'promoted', enrollment: 'منقول', registration_status_id: 2, is_excluded: 0 };
  const s = String(rawStatus).trim();
  const clean = s
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, '') // إزالة التشكيل
    .replace(/\u0640/g, '')           // إزالة التطويل
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ة/g, 'ه');

  // 1. باق (راسب، باق للإعادة، دور ثان، راسب سنة أولى...) -> 3
  if (
    clean.includes('باق') ||
    clean.includes('اعاده') ||
    clean.includes('راسب') ||
    clean.includes('دور ثان') ||
    clean.includes('دور 2') ||
    clean.includes('يكمل') ||
    clean === 'retained' ||
    clean === '3'
  ) {
    return { status: 'retained', enrollment: 'باق', registration_status_id: 3, is_excluded: 0 };
  }

  // 2. مستجد (مستجد، جديد، قيد أول مرة...) -> 1
  if (
    clean.includes('مستجد') ||
    clean.includes('جديد') ||
    clean === 'new' ||
    clean === 'fresh' ||
    clean === '1'
  ) {
    return { status: 'new', enrollment: 'مستجد', registration_status_id: 1, is_excluded: 0 };
  }

  // 3. منقطع (انقطاع، تارك...) -> 4
  if (
    clean.includes('منقطع') ||
    clean.includes('انقطاع') ||
    clean.includes('تارك') ||
    clean === 'disconnected' ||
    clean === 'absent' ||
    clean === '4'
  ) {
    return { status: 'disconnected', enrollment: 'منقطع', registration_status_id: 4, is_excluded: 0 };
  }

  // 4. موقوف قيده / مفصول -> 5
  if (
    clean.includes('موقوف') ||
    clean.includes('مفصول') ||
    clean.includes('فصل') ||
    clean === 'suspended' ||
    clean === 'dismissed' ||
    clean === '5'
  ) {
    return { status: 'suspended', enrollment: 'موقوف قيده', registration_status_id: 5, is_excluded: 0 };
  }

  // 5. مستبعد / معفى -> 6
  if (
    clean.includes('مستبعد') ||
    clean.includes('استبعاد') ||
    clean.includes('معف') ||
    clean === 'excluded' ||
    clean === 'exempt' ||
    clean === '6'
  ) {
    return { status: 'excluded', enrollment: 'مستبعد', registration_status_id: 6, is_excluded: 1 };
  }

  // 6. منقول (ناجح ومنقول / محول / الافتراضي) -> 2
  if (
    clean.includes('منقول') ||
    clean.includes('ناجح') ||
    clean.includes('محول') ||
    clean.includes('تحويل') ||
    clean.includes('مرق') ||
    clean === 'promoted' ||
    clean === 'transferred' ||
    clean === '2'
  ) {
    return { status: 'promoted', enrollment: 'منقول', registration_status_id: 2, is_excluded: 0 };
  }

  return { status: 'promoted', enrollment: 'منقول', registration_status_id: 2, is_excluded: 0 };
};

// ─── POST /api/students ────────────────────────────────────────────────────
const createStudent = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });

  const {
    sectionId, stageId, gradeId, academicYearId,
    fullNameAr: rawFullNameAr, fullNameEn, birthDate, birthPlace,
    nationalityId, nationalId, gender, religion,
    guardianName, guardianRelation, guardianNationalId, guardianPhone, guardianPhone2, guardianJob,
    motherName: rawMotherName, motherNationalityId, motherNationalId,
    address, studentPhone, secondLanguage, secondaryTrack, secondaryElective,
    isMerged, mergedGradeId, mergeType, mergeDecisionNumber, mergeDecisionDate, mergeNotes, enrollmentDate,
    status, specialCases, emisStudentCode,
    isReturnedFromAbroad, countryFrom, is_returned_from_abroad, country_from,
    parentStaffId, siblingStudentIds, twinStudentId, isTalented, talentDescription,
    transferredFromSchool, transferredFromDirectorate, transferredFromGovernorate,
    // 4-part name fields & Ministry EMIS fields
    firstName, fatherName, gFatherName, familyName,
    motherFirstName, motherSecondName, motherThirdName, motherForthName,
    birthGovernorateId, fatherNationalityId, studyTypeId, registrationStatusId,
    divisionId, specializationId, languageId1, languageId2, disabilityId,
    isOrphan, orphanType, is_orphan, orphan_type,
    fatherStatus, father_status, motherStatus, mother_status,
    socialResearchNumber, social_research_number, socialResearchDate, social_research_date,
    orphanNotes, orphan_notes
  } = req.body;

  // Build composite names with fallback
  let fullNameAr = (rawFullNameAr || '').trim();
  const fName = (firstName || '').trim();
  const faName = (fatherName || '').trim();
  const gfName = (gFatherName || '').trim();
  const famName = (familyName || '').trim();

  if (!fullNameAr && (fName || faName)) {
    fullNameAr = [fName, faName, gfName, famName].filter(Boolean).join(' ');
  }

  let motherName = (rawMotherName || '').trim();
  const m1 = (motherFirstName || '').trim();
  const m2 = (motherSecondName || '').trim();
  const m3 = (motherThirdName || '').trim();
  const m4 = (motherForthName || '').trim();

  if (!motherName && (m1 || m2)) {
    motherName = [m1, m2, m3, m4].filter(Boolean).join(' ');
  }

  if (!fullNameAr || !sectionId || !stageId || !gradeId || !academicYearId || !gender) {
    return res.status(400).json({ success: false, error: 'يرجى استكمال الحقول الإلزامية: الاسم، القسم، المرحلة، الصف، العام الدراسي، الجنس.' });
  }

  const mapped = mapStudentStatus(status);
  const returnedAbroadVal = (isReturnedFromAbroad || is_returned_from_abroad) ? 1 : 0;
  const countryFromVal = countryFrom || country_from || null;
  const isOrphanVal = (isOrphan || is_orphan) ? 1 : 0;
  const orphanTypeVal = orphanType || orphan_type || null;
  const fatherStatusVal = fatherStatus || father_status || (isOrphanVal && (orphanTypeVal === 'يتيم الأب' || orphanTypeVal === 'يتيم الوالدين (الأب والأم)') ? 'متوفى' : 'على قيد الحياة');
  const motherStatusVal = motherStatus || mother_status || (isOrphanVal && (orphanTypeVal === 'يتيم الأم' || orphanTypeVal === 'يتيم الوالدين (الأب والأم)') ? 'متوفاة' : 'على قيد الحياة');
  const socResNumVal = socialResearchNumber || social_research_number || null;
  const socResDateVal = socialResearchDate || social_research_date || null;
  const orphanNotesVal = orphanNotes || orphan_notes || null;

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
          status, enrollment_status, is_excluded, emis_student_code,
          is_returned_from_abroad, country_from,
          parent_staff_id, sibling_student_ids, twin_student_id, is_talented, talent_description,
          transferred_from_school, transferred_from_directorate, transferred_from_governorate,
          first_name, father_name, grandfather_name, family_name,
          mother_first_name, mother_second_name, mother_third_name, mother_fourth_name,
          birth_governorate_id, father_nationality_id, study_type_id, registration_status_id,
          division_id, specialization_id, language_id_1, language_id_2, disability_id,
          is_orphan, orphan_type, father_status, mother_status,
          social_research_number, social_research_date, orphan_notes
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
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
        emisStudentCode || null,
        returnedAbroadVal, countryFromVal,
        parentStaffId||null, siblingStudentIds||null, twinStudentId||null, isTalented ? 1 : 0, talentDescription||null,
        transferredFromSchool||null, transferredFromDirectorate||null, transferredFromGovernorate||null,
        fName||null, faName||null, gfName||null, famName||null,
        m1||null, m2||null, m3||null, m4||null,
        birthGovernorateId||null, fatherNationalityId||null, studyTypeId||null, registrationStatusId||null,
        divisionId||null, specializationId||null, languageId1||null, languageId2||null, disabilityId||null,
        isOrphanVal, orphanTypeVal, fatherStatusVal, motherStatusVal,
        socResNumVal, socResDateVal, orphanNotesVal
      ]);
      studentId = _lastId(sqliteDb);
      for (const caseTypeId of (specialCases || [])) {
        sqliteDb.run('INSERT OR IGNORE INTO student_special_cases (student_id, case_type_id) VALUES (?,?)', [studentId, caseTypeId]);
      }
      if (isOrphanVal === 1) {
        const orphanCase = _get(sqliteDb, `SELECT id FROM special_case_types WHERE code = 'orphan' OR name_ar LIKE '%أيتام%' OR name_ar LIKE '%يتيم%'`);
        if (orphanCase && orphanCase.id) {
          sqliteDb.run('INSERT OR IGNORE INTO student_special_cases (student_id, case_type_id) VALUES (?,?)', [studentId, orphanCase.id]);
        }
      }
      if (transferredFromSchool) {
        const transCase = _get(sqliteDb, `SELECT id FROM special_case_types WHERE code = 'transferred_in' OR name_ar LIKE '%تحويل%' OR name_ar LIKE '%محول%'`);
        if (transCase && transCase.id) {
          sqliteDb.run('INSERT OR IGNORE INTO student_special_cases (student_id, case_type_id) VALUES (?,?)', [studentId, transCase.id]);
        }
      }
    });
    db.flushSQLite();

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
    fullNameAr: rawFullNameAr, fullNameEn, birthDate, birthPlace,
    nationalityId, nationalId, gender, religion,
    guardianName, guardianRelation, guardianNationalId, guardianPhone, guardianPhone2, guardianJob,
    motherName: rawMotherName, motherNationalityId, motherNationalId,
    address, studentPhone, secondLanguage, secondaryTrack, secondaryElective,
    isMerged, mergedGradeId, mergeType, mergeDecisionNumber, mergeDecisionDate, mergeNotes, status, specialCases,
    emisStudentCode,
    isReturnedFromAbroad, countryFrom, is_returned_from_abroad, country_from,
    parentStaffId, siblingStudentIds, twinStudentId, isTalented, talentDescription,
    transferredFromSchool, transferredFromDirectorate, transferredFromGovernorate,
    firstName, fatherName, gFatherName, familyName,
    motherFirstName, motherSecondName, motherThirdName, motherForthName,
    birthGovernorateId, fatherNationalityId, studyTypeId, registrationStatusId,
    divisionId, specializationId, languageId1, languageId2, disabilityId,
    isOrphan, orphanType, is_orphan, orphan_type,
    fatherStatus, father_status, motherStatus, mother_status,
    socialResearchNumber, social_research_number, socialResearchDate, social_research_date,
    orphanNotes, orphan_notes
  } = req.body;

  let fullNameAr = (rawFullNameAr || '').trim();
  const fName = (firstName || '').trim();
  const faName = (fatherName || '').trim();
  const gfName = (gFatherName || '').trim();
  const famName = (familyName || '').trim();

  if (!fullNameAr && (fName || faName)) {
    fullNameAr = [fName, faName, gfName, famName].filter(Boolean).join(' ');
  }

  let motherName = (rawMotherName || '').trim();
  const m1 = (motherFirstName || '').trim();
  const m2 = (motherSecondName || '').trim();
  const m3 = (motherThirdName || '').trim();
  const m4 = (motherForthName || '').trim();

  if (!motherName && (m1 || m2)) {
    motherName = [m1, m2, m3, m4].filter(Boolean).join(' ');
  }

  const mapped = mapStudentStatus(status);
  const returnedAbroadVal = (isReturnedFromAbroad || is_returned_from_abroad) ? 1 : 0;
  const countryFromVal = countryFrom || country_from || null;
  const isOrphanVal = (isOrphan || is_orphan) ? 1 : 0;
  const orphanTypeVal = orphanType || orphan_type || null;
  const fatherStatusVal = fatherStatus || father_status || (isOrphanVal && (orphanTypeVal === 'يتيم الأب' || orphanTypeVal === 'يتيم الوالدين (الأب والأم)') ? 'متوفى' : 'على قيد الحياة');
  const motherStatusVal = motherStatus || mother_status || (isOrphanVal && (orphanTypeVal === 'يتيم الأم' || orphanTypeVal === 'يتيم الوالدين (الأب والأم)') ? 'متوفاة' : 'على قيد الحياة');
  const socResNumVal = socialResearchNumber || social_research_number || null;
  const socResDateVal = socialResearchDate || social_research_date || null;
  const orphanNotesVal = orphanNotes || orphan_notes || null;

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
          emis_student_code=?,
          is_returned_from_abroad=?, country_from=?,
          parent_staff_id=?, sibling_student_ids=?, twin_student_id=?, is_talented=?, talent_description=?,
          transferred_from_school=?, transferred_from_directorate=?, transferred_from_governorate=?,
          first_name=?, father_name=?, grandfather_name=?, family_name=?,
          mother_first_name=?, mother_second_name=?, mother_third_name=?, mother_fourth_name=?,
          birth_governorate_id=?, father_nationality_id=?, study_type_id=?, registration_status_id=?,
          division_id=?, specialization_id=?, language_id_1=?, language_id_2=?, disability_id=?,
          is_orphan=?, orphan_type=?, father_status=?, mother_status=?,
          social_research_number=?, social_research_date=?, orphan_notes=?
        WHERE id=?
      `, [
        fullNameAr, fullNameEn||null, birthDate||null, birthPlace||null,
        nationalityId||null, nationalId||null, gender, religion||null,
        guardianName||null, guardianRelation||null, guardianNationalId||null,
        guardianPhone||null, guardianPhone2||null, guardianJob||null,
        address||null, studentPhone||null, secondLanguage||null, secondaryTrack||null, secondaryElective||null,
        isMerged ? 1 : 0, mergedGradeId||null, mergeType||null, mergeDecisionNumber||null, mergeDecisionDate||null, mergeNotes||null,
        mapped.status, mapped.enrollment, mapped.is_excluded,
        emisStudentCode||null,
        returnedAbroadVal, countryFromVal,
        parentStaffId||null, siblingStudentIds||null, twinStudentId||null, isTalented ? 1 : 0, talentDescription||null,
        transferredFromSchool||null, transferredFromDirectorate||null, transferredFromGovernorate||null,
        fName||null, faName||null, gfName||null, famName||null,
        m1||null, m2||null, m3||null, m4||null,
        birthGovernorateId||null, fatherNationalityId||null, studyTypeId||null, registrationStatusId||null,
        divisionId||null, specializationId||null, languageId1||null, languageId2||null, disabilityId||null,
        isOrphanVal, orphanTypeVal, fatherStatusVal, motherStatusVal,
        socResNumVal, socResDateVal, orphanNotesVal,
        id
      ]);
      if (specialCases !== undefined) {
        sqliteDb.run('UPDATE student_special_cases SET is_active = 0 WHERE student_id = ?', [id]);
        for (const caseTypeId of specialCases) {
          sqliteDb.run(`INSERT INTO student_special_cases (student_id, case_type_id, is_active) VALUES (?,?,1)
            ON CONFLICT(student_id, case_type_id) DO UPDATE SET is_active = 1`, [id, caseTypeId]);
        }
      }
      if (isOrphanVal === 1) {
        const orphanCase = _get(sqliteDb, `SELECT id FROM special_case_types WHERE code = 'orphan' OR name_ar LIKE '%أيتام%' OR name_ar LIKE '%يتيم%'`);
        if (orphanCase && orphanCase.id) {
          sqliteDb.run(`INSERT INTO student_special_cases (student_id, case_type_id, is_active) VALUES (?,?,1)
            ON CONFLICT(student_id, case_type_id) DO UPDATE SET is_active = 1`, [id, orphanCase.id]);
        }
      }
    });
    db.flushSQLite();
    return res.json({ success: true, message: 'تم تحديث بيانات الطالب بنجاح.' });
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

const exportExcelTemplate = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  if (req.query.type === 'general-census' || req.query.report === 'general-census') {
    return exportGeneralCensusExcel(req, res);
  }
  if (req.query.type === 'enrollment-status-census' || req.query.report === 'enrollment-status-census') {
    return exportEnrollmentStatusCensusExcel(req, res);
  }
  try {
    const sqliteDb = db.getSQLiteDb();
    const { search, sectionId, stageId, gradeId, classId, status, academicYearId, secondaryTrack, isMerged, isOrphan, isForeign, isTwin, isSpecialCase, isTalented, genderOrder, templateName, viewMode, reportTitle } = req.query;
    const where  = ['s.deleted_at IS NULL'];
    const params = [];
    if (search) {
      where.push('(s.full_name_ar LIKE ? OR s.student_code LIKE ? OR s.national_id LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (sectionId && sectionId !== 'all') { where.push('s.section_id = ?'); params.push(sectionId); }
    if (stageId && stageId !== 'all')     { where.push('s.stage_id = ?');   params.push(stageId); }
    if (gradeId && gradeId !== 'all_stage' && gradeId !== 'all') {
      where.push('s.grade_id = ?');
      params.push(gradeId);
    }
    if (classId && classId !== 'all' && classId !== 'all_grade' && classId !== 'all_stage') {
      where.push('EXISTS (SELECT 1 FROM class_enrollments ce WHERE ce.student_id = s.id AND ce.class_id = ?)');
      params.push(classId);
    }

    if (viewMode === 'disconnected') {
      where.push("s.status = 'disconnected'");
    } else if (viewMode === 'suspended') {
      where.push("s.status = 'suspended'");
    } else if (viewMode === 'excluded') {
      where.push("s.status = 'excluded'");
    } else if (status === 'all') {
      // no status filter
    } else if (status) {
      where.push('s.status = ?');
      params.push(status);
    } else {
      where.push("s.status != 'suspended'");
    }

    if (academicYearId && academicYearId !== 'all') { where.push('s.academic_year_id = ?'); params.push(academicYearId); }
    if (secondaryTrack && secondaryTrack !== 'all') { where.push('s.secondary_track = ?');  params.push(secondaryTrack); }

    if (isMerged === '1' || isMerged === 'true') where.push('(s.is_merged = 1 OR s.is_special_case = 1)');
    if (isOrphan === '1' || isOrphan === 'true') where.push("(s.is_orphan = 1 OR s.father_status = 'متوفى' OR s.mother_status = 'متوفاة' OR s.orphan_type IS NOT NULL)");
    if (isForeign === '1' || isForeign === 'true') where.push("(s.nationality_id IS NOT NULL AND s.nationality_id != '' AND s.nationality_id != 'EG')");
    if (isTwin === '1' || isTwin === 'true') where.push('(s.is_twin = 1 OR s.twin_student_id IS NOT NULL)');
    if (isTalented === '1' || isTalented === 'true') {
      where.push(`(s.is_talented = 1 OR (s.talent_description IS NOT NULL AND s.talent_description != '') OR EXISTS (SELECT 1 FROM student_special_cases ssc JOIN special_case_types sct ON sct.id = ssc.case_type_id WHERE ssc.student_id = s.id AND ssc.is_active = 1 AND sct.code IN ('sport_talent', 'art_talent', 'quran_hafiz', 'national_merit', 'gifted', 'scholarship')) )`);
    }

    let genderSortClause = 's.full_name_ar ASC';
    if (genderOrder === 'boys_first') {
      genderSortClause = `(CASE WHEN s.gender = 'ذكر' THEN 1 WHEN s.gender = 'أنثى' THEN 2 ELSE 3 END) ASC, s.full_name_ar ASC`;
    } else if (genderOrder === 'girls_first') {
      genderSortClause = `(CASE WHEN s.gender = 'أنثى' THEN 1 WHEN s.gender = 'ذكر' THEN 2 ELSE 3 END) ASC, s.full_name_ar ASC`;
    }

    let orderClause = genderSortClause;
    if (!classId || classId === 'all' || classId === 'all_grade' || classId === 'all_stage') {
      if (!gradeId || gradeId === 'all_stage' || gradeId === 'all') {
        orderClause = `st.stage_name ASC, g.grade_number ASC, COALESCE(c.class_name, '') ASC, ${genderSortClause}`;
      } else {
        orderClause = `COALESCE(c.class_name, '') ASC, ${genderSortClause}`;
      }
    }

    const whereStr = where.join(' AND ');
    const students = _all(sqliteDb, `
      SELECT s.*, 
             c.class_name AS classroom_name,
             g.grade_name_ar,
             ay.year_label AS academic_year,
             nl.name_ar AS nationality_name
      FROM students s
      LEFT JOIN grades_lookup g          ON g.id = s.grade_id
      LEFT JOIN stages_lookup st         ON st.id = s.stage_id
      LEFT JOIN academic_years ay        ON ay.id = s.academic_year_id
      LEFT JOIN nationalities_lookup nl  ON nl.id = s.nationality_id
      LEFT JOIN class_enrollments ce     ON ce.student_id = s.id AND ce.academic_year_id = s.academic_year_id
      LEFT JOIN classes c                ON c.id = ce.class_id
      WHERE ${whereStr}
      ORDER BY ${orderClause}
    `, params);

    const school = getSchoolMasterInfo(sqliteDb);
    const grade = gradeId ? _get(sqliteDb, 'SELECT grade_name_ar FROM grades_lookup WHERE id = ?', [gradeId]) : null;
    const year = academicYearId ? _get(sqliteDb, 'SELECT year_label FROM academic_years WHERE id = ?', [academicYearId]) : null;

    // Use sgl_all by default for student register and students list exports, or when templateName='sgl_all'
    const useSglAll = templateName === 'sgl_all' || req.query.format === 'sgl_all' || req.query.type === 'student-register' || req.query.type === 'sgl_all' || viewMode || (!templateName && !req.query.type);

    let buffer;
    let fileName;
    let contentType;

    if (useSglAll) {
      let filePrefix = 'سجل_بيانات_الصف';
      if (viewMode === 'disconnected') filePrefix = 'سجل_المنقطعين';
      else if (viewMode === 'suspended') filePrefix = 'سجل_الموقوف_قيدهم';
      else if (viewMode === 'excluded') filePrefix = 'سجل_المستبعدين';
      else if (reportTitle) filePrefix = reportTitle.replace(/\s+/g, '_');

      buffer = await excelReportEngine.generateSglAllReport({
        school,
        gradeName: grade?.grade_name_ar || '',
        yearLabel: year?.year_label || '',
        students,
        reportTitle,
        viewMode
      });
      fileName = encodeURIComponent(`${filePrefix}_${grade?.grade_name_ar || 'العام'}.xlsm`);
      contentType = 'application/vnd.ms-excel.sheet.macroEnabled.12';
    } else {
      buffer = await excelReportEngine.generateStudentRegisterReport({
        templateName,
        school,
        gradeName: grade?.grade_name_ar || '',
        yearLabel: year?.year_label || '',
        totalStudents: students.length,
        isMerged,
        students,
        calculateAgeOnOct1st
      });
      fileName = encodeURIComponent(`سجل_الطلاب_${grade?.grade_name_ar || 'عام'}.xlsx`);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${fileName}`);
    return res.send(buffer);
  } catch (err) {
    console.error('Failed to export Excel register template:', err);
    return res.status(500).json({ success: false, error: 'فشل تصدير ملف الإكسيل الرئيسي: ' + err.message });
  }
};

const exportFullClassListExcel = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const excelReportEngine = require('../../services/excelReportEngine');
    const sqliteDb = db.getSQLiteDb();
    const { search, sectionId, stageId, gradeId, classId, status, academicYearId, genderOrder } = req.query;
    const where  = ['1=1'];
    const params = [];
    if (search) {
      where.push('(s.full_name_ar LIKE ? OR s.student_code LIKE ? OR s.national_id LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (sectionId) { where.push('s.section_id = ?'); params.push(sectionId); }
    if (stageId)   { where.push('s.stage_id = ?');   params.push(stageId); }
    if (gradeId && gradeId !== 'all_stage' && gradeId !== 'all') {
      where.push('s.grade_id = ?'); params.push(gradeId);
    }
    if (classId && classId !== 'all' && classId !== 'all_grade' && classId !== 'all_stage') {
      where.push('EXISTS (SELECT 1 FROM class_enrollments ce WHERE ce.student_id = s.id AND ce.class_id = ?)');
      params.push(classId);
    }
    if (status === 'all') {}
    else if (status) { where.push('s.status = ?'); params.push(status); }
    else { where.push("s.status != 'suspended'"); }
    if (academicYearId) { where.push('s.academic_year_id = ?'); params.push(academicYearId); }

    let genderSortClause = 's.full_name_ar ASC';
    if (genderOrder === 'boys_first') {
      genderSortClause = `(CASE WHEN s.gender = 'ذكر' THEN 1 WHEN s.gender = 'أنثى' THEN 2 ELSE 3 END) ASC, s.full_name_ar ASC`;
    } else if (genderOrder === 'girls_first') {
      genderSortClause = `(CASE WHEN s.gender = 'أنثى' THEN 1 WHEN s.gender = 'ذكر' THEN 2 ELSE 3 END) ASC, s.full_name_ar ASC`;
    }

    const whereStr = where.join(' AND ');
    const students = _all(sqliteDb, `
      SELECT s.*, 
             c.class_name AS classroom_name,
             g.grade_name_ar,
             ay.year_label AS academic_year
      FROM students s
      LEFT JOIN grades_lookup g   ON g.id   = s.grade_id
      LEFT JOIN academic_years ay ON ay.id  = s.academic_year_id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.academic_year_id = s.academic_year_id
      LEFT JOIN classes c ON c.id = ce.class_id
      WHERE ${whereStr}
      ORDER BY ${genderSortClause}
    `, params);

    const school = getSchoolMasterInfo(sqliteDb);
    const classroom = classId ? _get(sqliteDb, 'SELECT class_name FROM classes WHERE id = ?', [classId]) : null;
    const year = academicYearId ? _get(sqliteDb, 'SELECT year_label FROM academic_years WHERE id = ?', [academicYearId]) : null;

    const classNameLabel = classroom?.class_name || (students[0] ? students[0].classroom_name : 'عام');
    const yearLabel = year?.year_label || (students[0] ? students[0].academic_year : '');

    const buffer = await excelReportEngine.generateFullClassListReport({
      classNameLabel,
      school,
      yearLabel,
      students
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=full_class_list_${encodeURIComponent(classNameLabel)}.xlsx`);
    return res.send(buffer);
  } catch (err) {
    console.error('Failed to export full class list Excel:', err);
    return res.status(500).json({ success: false, error: 'فشل تصدير قائمة الفصل الكاملة.' });
  }
};

const exportClassListExcel = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const JSZip = require('jszip');
    const excelReportEngine = require('../../services/excelReportEngine');
    const pdfReportEngine = require('../../services/pdfReportEngine');
    const excelToPdfConverter = require('../../services/excelToPdfConverter');
    const sqliteDb = db.getSQLiteDb();
    
    // Parse query params
    const { search, sectionId, stageId, gradeId, classId, status, academicYearId, secondaryTrack, mode, includePdf, format, preview, religion } = req.query;

    const school = getSchoolMasterInfo(sqliteDb);
    const yearObj = academicYearId ? _get(sqliteDb, 'SELECT year_label FROM academic_years WHERE id = ?', [academicYearId]) : null;
    const yearLabel = yearObj?.year_label || '';

    // If batch mode is requested or classId === 'all', query all classes
    let targetClasses = [];
    const _getClsQuery = `
      SELECT c.id, c.class_name, c.class_number, g.grade_number, s.stage_name, sec.type AS section_type
      FROM classes c
      LEFT JOIN grades_lookup g ON g.id = c.grade_id
      LEFT JOIN stages_lookup s ON s.id = g.stage_id
      LEFT JOIN sections sec ON sec.id = s.section_id
    `;
    if (classId && classId !== 'all') {
      const cls = _get(sqliteDb, `${_getClsQuery} WHERE c.id = ?`, [classId]);
      if (cls) targetClasses.push(cls);
      else targetClasses.push({ id: classId, class_name: 'فصل' });
    } else {
      let clsQuery = `${_getClsQuery} WHERE 1=1`;
      const clsParams = [];
      if (gradeId) { clsQuery += ' AND c.grade_id = ?'; clsParams.push(gradeId); }
      clsQuery += ' ORDER BY g.grade_number ASC, COALESCE(c.class_number, CAST(c.class_name AS INTEGER), c.id) ASC';
      targetClasses = _all(sqliteDb, clsQuery, clsParams);
      if (targetClasses.length === 0) {
        targetClasses.push({ id: null, class_name: 'جميع_الطلاب' });
      }
    }

    const isZipResult = (targetClasses.length > 1) || (includePdf === 'true' || includePdf === '1');
    const zip = isZipResult ? new JSZip() : null;

    let singleBuffer = null;
    let singleFileName = '';
    let lastStudentList = [];

    for (let clsIdx = 0; clsIdx < targetClasses.length; clsIdx++) {
      const cls = targetClasses[clsIdx];
      const where = ['1=1'];
      const params = [];
      if (search) {
        where.push('(s.full_name_ar LIKE ? OR s.student_code LIKE ? OR s.national_id LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (sectionId) { where.push('s.section_id = ?'); params.push(sectionId); }
      if (stageId)   { where.push('s.stage_id = ?');   params.push(stageId); }
      if (gradeId)   { where.push('s.grade_id = ?');   params.push(gradeId); }
      if (cls.id) {
        where.push('EXISTS (SELECT 1 FROM class_enrollments ce WHERE ce.student_id = s.id AND ce.class_id = ?)');
        params.push(cls.id);
      }
      if (status === 'all') {
        // All
      } else if (status) {
        where.push('s.status = ?'); params.push(status);
      } else {
        where.push("s.status != 'suspended'");
      }
      if (academicYearId) { where.push('s.academic_year_id = ?'); params.push(academicYearId); }
      if (secondaryTrack) { where.push('s.secondary_track = ?');  params.push(secondaryTrack); }
      if (religion && religion !== 'all') { where.push('s.religion = ?'); params.push(religion); }

      const students = _all(sqliteDb, `
        SELECT s.*, n.name AS nationality_name, c.class_name AS classroom_name
        FROM students s
        LEFT JOIN nationalities n ON n.id = s.nationality_id
        LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.academic_year_id = s.academic_year_id
        LEFT JOIN classes c ON c.id = ce.class_id
        WHERE ${where.join(' AND ')}
        ORDER BY s.full_name_ar ASC
      `, params);
      lastStudentList = students;

      let className = (cls.class_name || 'فصل').trim();
      const stageSuffix = cls.stage_name?.includes('إعداد') ? 'ع'
        : cls.stage_name?.includes('ثانو') ? 'ث'
        : cls.stage_name?.includes('ابتدائ') ? 'ب'
        : cls.stage_name?.includes('رياض') ? 'ك' : 'ع';
      const gNum = cls.grade_number || 1;

      if (!/^\d+-\d+\s*[\u0600-\u06FF]+$/.test(className)) {
        const nums = className.match(/\d+/g);
        let subNum = (clsIdx + 1);
        if (nums && nums.length >= 2) {
          subNum = nums[1];
        } else if (nums && nums.length === 1 && nums[0] !== String(gNum)) {
          subNum = nums[0];
        }
        className = `${gNum}-${subNum} ${stageSuffix}`;
      }

      
    const MACRO_TEMPLATES = {
      'primary_portrait': 'كشف_رصد_صفوف_أولى_بالطول.xltm',
      'primary_landscape': 'كشف_رصد_صفوف_أولى_بالعرض.xltm',
      'upper_primary_portrait': 'كشف_رصد_صفوف_عليا_بالطول.xltm',
      'upper_primary_landscape': 'كشف_رصد_صفوف_عليا_بالعرض.xltm',
      'prep_portrait': 'كشف_رصد_اعدادى_بالطول.xltm',
      'prep_landscape': 'كشف_رصد_اعدادى_بالعرض.xltm',
      'sec_portrait': 'كشف_رصد_ثانوى_بالطول.xltm',
      'sec_landscape': 'كشف_رصد_ثانوى_بالعرض.xltm',
    };

      if (MACRO_TEMPLATES[mode]) {
        const xlsmBuf = await excelReportEngine.generateMacroGradesReport({ templateName: MACRO_TEMPLATES[mode], school, className, yearLabel, students });
        const xlsmName = `${MACRO_TEMPLATES[mode].replace('.xltm', '')}_${className}.xlsm`;

        if (zip) {
          zip.file(xlsmName, xlsmBuf);
          if (includePdf === 'true' || includePdf === '1') {
            try {
              const pdfBuf = await excelToPdfConverter.convertXlsmToPdf(xlsmBuf, { school, className, yearLabel, students });
              zip.file(`${MACRO_TEMPLATES[mode].replace('.xltm', '')}_${className}.pdf`, pdfBuf);
            } catch (pdfErr) {
              console.error('[PDF Convert Error]', pdfErr);
            }
          }
        } else {
          singleBuffer = xlsmBuf;
          singleFileName = xlsmName;
        }
      } else if (mode === 'full_class_list') {
        const xlsxBuf = await excelReportEngine.generateFullClassListReport({ classNameLabel: className, school, yearLabel, students });
        const xlsxName = `قائمة_فصل_كاملة_البيانات_${className}.xlsx`;
        if (zip) zip.file(xlsxName, xlsxBuf);
        else { singleBuffer = xlsxBuf; singleFileName = xlsxName; }
      } else {
        // Fallback
        const xlsmBuf = await excelReportEngine.generateMacroGradesReport({ templateName: 'كشف_رصد_صفوف_أولى_بالطول.xltm', school, className, yearLabel, students });
        const xlsmName = `كشف_رصد_${className}.xlsm`;
        if (zip) zip.file(xlsmName, xlsmBuf);
        else { singleBuffer = xlsmBuf; singleFileName = xlsmName; }
      }
    }

    if (zip) {
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename=nepras_reports_batch.zip');
      return res.send(zipBuffer);
    } else {
      res.setHeader('Content-Type', singleFileName.endsWith('.xlsm') ? 'application/vnd.ms-excel.sheet.macroEnabled.12' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(singleFileName)}"`);
      return res.send(singleBuffer);
    }
  } catch (err) {
    console.error('Failed to export class list:', err);
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
      grade_name: 'الصف الأول',
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
      // Tool & Ministry exact headers for 100% automatic zero-click matching
      { pattern: 'الرقم القومى*',                field: 'national_id'           },
      { pattern: 'الرقم القومى',                 field: 'national_id'           },
      { pattern: 'الرقم القومي',                 field: 'national_id'           },
      { pattern: 'كود الطالب*',                 field: 'emis_student_code'     },
      { pattern: 'كود الطالب',                  field: 'emis_student_code'     },
      { pattern: 'كود التلميذ*',                 field: 'emis_student_code'     },
      { pattern: 'كود التلميذ',                  field: 'emis_student_code'     },
      { pattern: 'الكود*',                      field: 'emis_student_code'     },
      { pattern: 'الكود',                       field: 'emis_student_code'     },
      { pattern: 'كود',                         field: 'emis_student_code'     },
      { pattern: 'الكود الوزاري',                field: 'emis_student_code'     },
      { pattern: 'الكود الوزارى',                field: 'emis_student_code'     },
      { pattern: 'رقم كود الطالب',               field: 'emis_student_code'     },
      { pattern: 'كود_الطالب',                  field: 'emis_student_code'     },
      { pattern: 'كود الطالب على الحكومة الإلكترونية', field: 'emis_student_code' },
      { pattern: 'كود الطالب على الحكومة الالكترونية', field: 'emis_student_code' },
      { pattern: 'كود الحكومة الإلكترونية',    field: 'emis_student_code'     },
      { pattern: 'كود الحكومة الالكترونية',    field: 'emis_student_code'     },
      { pattern: 'كود الوزارة',                 field: 'emis_student_code'     },
      { pattern: 'كود EMIS',                    field: 'emis_student_code'     },
      { pattern: 'كود إميس',                    field: 'emis_student_code'     },
      { pattern: 'الرقم القومي لولي الأمر',    field: 'guardian_national_id' },
      { pattern: 'رقم هاتف ولي الأمر',          field: 'guardian_phone'        },
      { pattern: 'الاسم بالكامل',               field: 'full_name_ar'          },
      { pattern: 'اسم الطالب بالعربي',           field: 'full_name_ar'          },
      { pattern: 'الاسم الأول*',                field: 'first_name'            },
      { pattern: 'الاسم الأول',                 field: 'first_name'            },
      { pattern: 'اسم الوالد*',                 field: 'father_name'           },
      { pattern: 'اسم الوالد',                  field: 'father_name'           },
      { pattern: 'اسم الجد*',                  field: 'gfather_name'          },
      { pattern: 'اسم الجد',                   field: 'gfather_name'          },
      { pattern: 'اللقب / العائله*',            field: 'family_name'           },
      { pattern: 'اللقب / العائله',             field: 'family_name'           },
      { pattern: 'اللقب',                       field: 'family_name'           },
      { pattern: 'اسم الام الأول*',             field: 'mother_first_name'     },
      { pattern: 'اسم الام الأول',              field: 'mother_first_name'     },
      { pattern: 'اسم الوالد للام*',            field: 'mother_second_name'    },
      { pattern: 'اسم الوالد للام',             field: 'mother_second_name'    },
      { pattern: 'اسم الجد للام*',             field: 'mother_third_name'     },
      { pattern: 'اسم الجد للام',              field: 'mother_third_name'     },
      { pattern: 'اللقب / العائله للام',        field: 'mother_forth_name'     },
      { pattern: 'اسم الطالب بالانجليزية',       field: 'full_name_en'          },
      { pattern: 'اسم الطالب بالإنجليزية',       field: 'full_name_en'          },
      { pattern: 'اللغة الأجنبية الثانية',       field: 'second_language'       },
      { pattern: 'صفة ولي الأمر',                field: 'guardian_relation'     },
      { pattern: 'اسم ولي الأمر',               field: 'guardian_name'         },
      { pattern: 'رقم هاتف الطالب',             field: 'student_phone'         },
      { pattern: 'yyyy-mm-dd',                  field: 'birth_date'            },
      { pattern: 'تاريخ الميلاد*',               field: 'birth_date'            },
      { pattern: 'تاريخ الميلاد',               field: 'birth_date'            },
      { pattern: 'محل الميلاد*',                 field: 'birth_place'           },
      { pattern: 'محل الميلاد',                  field: 'birth_place'           },
      { pattern: 'تاريخ القيد',                  field: 'enrollment_date'       },
      { pattern: 'العام الدراسي',               field: 'academic_year'         },
      { pattern: 'الصف*',                       field: 'grade_name'            },
      { pattern: 'الصف',                        field: 'grade_name'            },
      { pattern: 'الفصل*',                      field: 'classroom_name'        },
      { pattern: 'الفصل',                       field: 'classroom_name'        },
      { pattern: 'نظام التعليم*',               field: 'section_name'          },
      { pattern: 'نظام التعليم',                field: 'section_name'          },
      { pattern: 'اسم القسم',                   field: 'section_name'          },
      { pattern: 'اسم المرحلة',                 field: 'stage_name'            },
      { pattern: 'اسم الصف',                    field: 'grade_name'            },
      { pattern: 'الجنسية*',                     field: 'nationality'           },
      { pattern: 'الجنسية',                      field: 'nationality'           },
      { pattern: 'الديانة*',                     field: 'religion'              },
      { pattern: 'الديانة',                      field: 'religion'              },
      { pattern: 'الوظيفة',                      field: 'guardian_job'          },
      { pattern: 'اسم الأم',                    field: 'mother_name'           },
      { pattern: 'العنوان',                       field: 'address'               },
      { pattern: 'النوع*',                       field: 'gender'                },
      { pattern: 'النوع',                        field: 'gender'                },
      { pattern: 'الجنس',                        field: 'gender'                },
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
      const emisStudentCode = getVal(row, 'emis_student_code') || getVal(row, 'student_code') || '';
      const studentCode   = emisStudentCode;
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

      // Default missing Academic Year to active DB academic year
      const defaultActiveYear = _get(sqliteDb, 'SELECT id, year_label FROM academic_years WHERE is_current = 1 LIMIT 1') || years[0];
      const resolvedAcademicYear = academicYear || defaultActiveYear?.year_label || '2025/2026';

      // Lookup resolution
      let sectionId = null, stageId = null, gradeId = null, academicYearId = null, nationalityId = null, classId = null;

      // ── 1. Section Matching (عربي / لغات / دولي) ──
      if (sectionName) {
        const cleanSec = sectionName.trim();
        sectionId = secMap[cleanSec];
        if (!sectionId) {
          if (cleanSec.includes('دول')) sectionId = Object.entries(secMap).find(([k]) => k.includes('دول'))?.[1];
          else if (cleanSec.includes('لغ') || cleanSec.includes('مكثف')) sectionId = secMap['لغات'];
          else if (cleanSec.includes('عرب') || cleanSec.includes('حكوم') || cleanSec.includes('عام')) sectionId = secMap['عربي'] || secMap['عربي '];
        }
      }

      // ── 2. Stage Matching (مطابقة دقيقة لمنع الاختيار الخاطئ) ──
      const searchStageStr = (stageName || gradeName || '').trim();
      if (searchStageStr) {
        let matchedStage = null;
        if (sectionId) {
          matchedStage = stages.find(s => s.section_id === sectionId && s.stage_name.trim() === searchStageStr);
        }
        if (!matchedStage) {
          matchedStage = stages.find(s => {
            if (sectionId && s.section_id !== sectionId) return false;
            const dbName = s.stage_name.trim();
            if (searchStageStr.includes('ابتدائ') && dbName.includes('ابتدائ')) return true;
            if ((searchStageStr.includes('اعداد') || searchStageStr.includes('إعداد')) && !searchStageStr.includes('دول') && (dbName.includes('اعداد') || dbName.includes('إعداد')) && !dbName.includes('دول')) return true;
            if (searchStageStr.includes('دول') && dbName.includes('دول')) return true;
            if (searchStageStr.includes('ثانو') && dbName.includes('ثانو')) return true;
            if ((searchStageStr.includes('روض') || searchStageStr.includes('طفل')) && (dbStage.includes('روض') || dbStage.includes('طفل'))) return true;
            return false;
          });
        }
        if (!matchedStage) {
          matchedStage = stages.find(s => {
            const dbName = s.stage_name.trim();
            if (searchStageStr.includes('ابتدائ') && dbName.includes('ابتدائ')) return true;
            if ((searchStageStr.includes('اعداد') || searchStageStr.includes('إعداد')) && !searchStageStr.includes('دول') && (dbName.includes('اعداد') || dbName.includes('إعداد')) && !dbName.includes('دول')) return true;
            if (searchStageStr.includes('دول') && dbName.includes('دول')) return true;
            if (searchStageStr.includes('ثانو') && dbName.includes('ثانو')) return true;
            if ((searchStageStr.includes('روض') || searchStageStr.includes('طفل')) && (dbName.includes('روض') || dbName.includes('طفل'))) return true;
            return false;
          });
        }
        if (matchedStage) {
          stageId = matchedStage.id;
          sectionId = matchedStage.section_id;
        }
      }

      if (!sectionId) sectionId = Object.values(secMap)[0] || 1;
      if (!stageId) {
        const nationalStage = stages.find(s => !s.stage_name.includes('دول'));
        stageId = nationalStage?.id || stages[0]?.id || null;
      }

      // ── 3. Grade Matching (مطابقة مسميات الصفوف كـ "الصف الأول" بصفوف نبراس الثابتة) ──
      if (gradeName && stageId) {
        const cleanGrade = gradeName.trim();
        gradeId = gradeMap[`${stageId}||${cleanGrade}`];
        if (!gradeId) {
          const getGradeNum = (str) => {
            if (str.includes('أول') || str.includes('اول') || str.includes('1')) return 1;
            if (str.includes('ثان') || str.includes('ثان') || str.includes('2')) return 2;
            if (str.includes('ثالث') || str.includes('3')) return 3;
            if (str.includes('رابع') || str.includes('4')) return 4;
            if (str.includes('خامس') || str.includes('5')) return 5;
            if (str.includes('سادس') || str.includes('6')) return 6;
            return 0;
          };
          const targetNum = getGradeNum(cleanGrade);
          const matchedGradeKey = Object.keys(gradeMap).find(key => {
            if (!key.startsWith(`${stageId}||`)) return false;
            const dbGrade = key.split('||')[1];
            if (targetNum > 0 && getGradeNum(dbGrade) === targetNum) return true;
            const normClean = cleanGrade.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, '');
            const normDb = dbGrade.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, '');
            return normDb.includes(normClean) || normClean.includes(normDb);
          });
          if (matchedGradeKey) gradeId = gradeMap[matchedGradeKey];
        }
      }

      if (!stageId) errors.push(`المرحلة "${stageName || 'غير المحددة'}" لم تطابق مسميات المنظومة`);
      if (!gradeId) errors.push(`الصف "${gradeName || 'غير المحدد'}" لم يطابق مسميات المنظومة`);

      academicYearId = yearMap[academicYear] || defaultActiveYear?.id || 1;

      if (nationality) {
        nationalityId = natMap[nationality];
      }

      // ── Flexible Classroom Matching & Auto-Creation ──
      if (classroomName && gradeId && academicYearId) {
        const cleanCls = classroomName.trim();
        let cls = _get(sqliteDb, `
          SELECT id FROM classes
          WHERE grade_id = ? AND academic_year_id = ?
            AND (class_name = ? OR class_name = ? OR class_name = ? OR class_name = ?)
        `, [gradeId, academicYearId, cleanCls, `فصل ${cleanCls}`, `فصل (${cleanCls})`, `${cleanCls}/1`]);

        if (!cls) {
          const allCls = _all(sqliteDb, 'SELECT id, class_name FROM classes WHERE grade_id = ? AND academic_year_id = ?', [gradeId, academicYearId]);
          cls = allCls.find(c => {
            const cn = c.class_name.trim();
            return cn.includes(cleanCls) || cleanCls.includes(cn);
          });
        }

        if (!cls) {
          // Auto-create classroom in DB so student is assigned cleanly!
          try {
            sqliteDb.run('INSERT INTO classes (class_name, grade_id, academic_year_id) VALUES (?, ?, ?)', [cleanCls, gradeId, academicYearId]);
            db.flushSQLite();
            cls = _get(sqliteDb, 'SELECT id FROM classes WHERE grade_id = ? AND academic_year_id = ? AND class_name = ?', [gradeId, academicYearId, cleanCls]);
          } catch (_) {}
        }

        if (cls) {
          classId = cls.id;
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
          emisStudentCode:     emisStudentCode || null,
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

          const sParts = (fullNameAr || '').trim().split(/\s+/);
          const fn  = row.firstName   || sParts[0] || null;
          const fa  = row.fatherName  || sParts[1] || null;
          const gf  = row.gFatherName || sParts[2] || null;
          const fam = row.familyName  || sParts.slice(3).join(' ') || null;

          const mParts = (motherName || '').trim().split(/\s+/);
          const mFn  = row.motherFirstName  || mParts[0] || null;
          const mSn  = row.motherSecondName || mParts[1] || null;
          const mTn  = row.motherThirdName  || mParts[2] || null;
          const mFn4 = row.motherForthName  || mParts.slice(3).join(' ') || null;

          const finalGuardianName = guardianName || [fa, gf, fam].filter(Boolean).join(' ') || null;

          sqliteDb.run(`
            INSERT INTO students (
              section_id, stage_id, grade_id, academic_year_id, student_code,
              full_name_ar, full_name_en, first_name, father_name, gfather_name, family_name,
              birth_date, birth_place,
              nationality_id, national_id, gender, religion,
              guardian_name, guardian_relation, guardian_national_id,
              guardian_phone, guardian_job,
              mother_name, mother_first_name, mother_second_name, mother_third_name, mother_forth_name,
              address, student_phone, second_language,
              enrollment_date, status, emis_student_code
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          `, [
            sectionId, stageId, gradeId, academicYearId, studentCode,
            fullNameAr, fullNameEn||null, fn, fa, gf, fam,
            birthDate||null, birthPlace||null,
            nationalityId || 1, nationalId||null, gender || 'ذكر', normalizeReligion(religion) || 'مسلم',
            finalGuardianName, guardianRelation||'أب', guardianNationalId||null,
            guardianPhone||null, guardianJob||null,
            motherName||null, mFn, mSn, mTn, mFn4,
            address||null, studentPhone||null, secondLanguage||null,
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
      if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
    }
    return '';
  };

  // 4-part student name
  const firstName  = g(['firstName', 'الاسم الأول*', 'الاسم الأول', 'الاسم الاول*', 'الاسم الاول', 'txt_fn', 'txtFirstName']);
  const fatherName = g(['fatherName', 'اسم الوالد*', 'اسم الوالد', 'اسم الأب*', 'اسم الأب', 'اسم الاب*', 'اسم الاب', 'الاسم الثاني*', 'الاسم الثاني', 'txt_sn', 'txtFatherName']);
  const gFatherName= g(['gFatherName', 'اسم الجد*', 'اسم الجد', 'الاسم الثالث*', 'الاسم الثالث', 'txt_tn', 'txtGFatherName']);
  const familyName = g(['familyName', 'اللقب / العائله*', 'اللقب / العائلة*', 'اللقب / العائله', 'اللقب / العائلة', 'اللقب*', 'اللقب', 'العائلة', 'العائله', 'اسم العائلة', 'اسم العائله', 'الاسم الرابع*', 'الاسم الرابع', 'txt_l4', 'txtFamilyName']);

  let fullNameAr = g(['الاسم بالكامل', 'fullNameAr', 'اسم الطالب', 'اسم التلميذ']);
  if (!fullNameAr) {
    const parts = [firstName, fatherName, gFatherName, familyName].filter(Boolean);
    if (parts.length > 0) fullNameAr = parts.join(' ');
  }

  // 4-part mother name
  const motherFirstName  = g(['motherFirstName', 'اسم الام الأول*', 'اسم الام الأول', 'اسم الأم الأول*', 'اسم الأم الأول']);
  const motherSecondName = g(['motherSecondName', 'اسم الوالد للام*', 'اسم الوالد للام', 'اسم والد الأم']);
  const motherThirdName  = g(['motherThirdName', 'اسم الجد للام*', 'اسم الجد للام', 'اسم جد الأم']);
  const motherForthName  = g(['motherForthName', 'اللقب / العائله للام', 'اللقب / العائلة للام', 'اللقب للام', 'لقب الأم', 'لقب الام']);

  let motherName = g(['اسم الأم', 'اسم الام', 'motherName']);
  if (!motherName) {
    const mParts = [motherFirstName, motherSecondName, motherThirdName, motherForthName].filter(Boolean);
    if (mParts.length > 0) motherName = mParts.join(' ');
  }

  // الجنس
  const genderRaw = g(['sexId', 'النوع*', 'النوع', 'الجنس']);
  const genderMap = { '1': 'ذكر', '2': 'أنثى', 'ذكر': 'ذكر', 'أنثى': 'أنثى', 'انثى': 'أنثى', 'male': 'ذكر', 'female': 'أنثى' };
  const gender = genderMap[genderRaw] || genderRaw;

  // حالة القيد
  const statusRaw = g(['registrationId', 'registrationStatusId', 'حالة قيد الطالب*', 'حالة قيد الطالب', 'حالة القيد*', 'حالة القيد', 'الحالة', 'حالة الطالب', 'موقف القيد', 'الموقف', 'موقف الطالب']);
  const mappedStatus = mapStudentStatus(statusRaw);
  const status = mappedStatus.status;
  const enrollmentStatus = mappedStatus.enrollment;

  // الديانة
  const religionRaw = g(['religionId', 'الديانه*', 'الديانة', 'الديانه', 'ديانة الطالب', 'ديانة التلميذ', 'الديانة / المذهب', 'ديانة']);
  const religion = normalizeReligion(religionRaw);

  // اللغة الثانية
  const lang2Raw = g(['languageId2', 'اللغه الاجنبية الثانية*', 'اللغة الثانية', 'اللغه الثانيه']);
  const lang2Map = { '1': 'إنجليزية', '2': 'فرنسي', '3': 'ألماني', '4': 'إيطالي', '5': 'إسباني', '6': 'صيني', '7': 'معفي', '8': 'روسي', 'فرنسي': 'فرنسي', 'فرنسية': 'فرنسي', 'ألماني': 'ألماني', 'إيطالي': 'إيطالي', 'لا يوجد': null };
  const secondLanguage = lang2Map[lang2Raw] !== undefined ? lang2Map[lang2Raw] : lang2Raw;

  // الموقف من الدمج
  const mergeTypeRaw = g(['disabilityId', 'الموقف من الدمج*', 'الموقف من الدمج', 'نوع الدمج']);
  const mergeMap = {
    '0': null, '1': 'إعاقة بصرية', '2': 'إعاقة سمعية', '3': 'إعاقة ذهنية', '4': 'شلل دماغي',
    '5': 'توحد', '6': 'متلازمة داون', '7': 'إعاقة حركية', '8': 'بطء التعلم',
    'مدمج': 'مدمج', 'غير مدمج': 'غير مدمج', 'لا يوجد': null
  };
  const mergeType = mergeMap[mergeTypeRaw] !== undefined ? mergeMap[mergeTypeRaw] : mergeTypeRaw;

  // القسم — من نظام التعليم
  const sectionRaw = g(['studyTypeId', 'نظام التعليم*', 'نظام التعليم', 'القسم', 'الشعبه*', 'الشعبة']);
  const sectionMap = {
    'عربي': 'عربي', 'حكومي': 'عربي', 'عام': 'عربي',
    'لغات': 'لغات', 'مكثف': 'لغات',
    'إيهاب': 'عربي',
  };
  const sectionName = sectionMap[sectionRaw] || sectionRaw;

  let emisStudentCode = g([
    'code', 'كود التلميذ', 'الكود', 'كود الطالب', 'كود التلميذ*', 'كود الطالب*',
    'كود الطالب على الحكومة الإلكترونية', 'كود الطالب على الحكومة الالكترونية',
    'كود التلميذ على الحكومة الإلكترونية', 'كود التلميذ على الحكومة الالكترونية',
    'كود الحكومة الإلكترونية', 'كود الحكومة الالكترونية', 'كود الوزارة', 'كود إميس', 'كود EMIS',
    'الكود الوزاري', 'الكود الوزارى', 'رقم كود الطالب', 'كود_الطالب', 'emis_student_code',
    'emisStudentCode', 'txtCode', 'StudentCode', 'txt_code', 'st_code', 'الرقم المسلسل'
  ]) || null;

  if (!emisStudentCode) {
    for (const [k, val] of Object.entries(row)) {
      if (typeof val === 'string' || typeof val === 'number') {
        const strVal = String(val).trim();
        if (/^\d{6,11}$/.test(strVal)) {
          emisStudentCode = strVal;
          break;
        }
      }
    }
  }

  return {
    fullNameAr:       fullNameAr || null,
    firstName:        firstName || null,
    fatherName:       fatherName || null,
    gFatherName:      gFatherName || null,
    familyName:       familyName || null,
    nationalId:       g(['nationalId', 'الرقم القومى*', 'الرقم القومى', 'الرقم القومي', 'الرقم القومي للتلميذ', 'الرقم القومى للطفل', 'رقم الهوية']) || null,
    emisStudentCode:  emisStudentCode || null,
    gender:           gender || null,
    birthDate:        g(['birthDateObj', 'yyyy-mm-dd', 'تاريخ الميلاد*', 'تاريخ الميلاد']) || null,
    birthPlace:       g(['placeOfBirth', 'محافظة الميلاد*', 'محافظة الميلاد', 'مكان الميلاد']) || null,
    nationality:      g(['nationality', 'الجنسيه*', 'الجنسية']) || null,
    religion:         religion || null,
    motherName:       motherName || null,
    motherFirstName:  motherFirstName || null,
    motherSecondName: motherSecondName || null,
    motherThirdName:  motherThirdName || null,
    motherForthName:  motherForthName || null,
    address:          g(['address', 'العنوان']) || null,
    stageName:        g(['stageId', 'المرحلة*', 'المرحلة', 'اسم المرحلة', 'المرحلة التعليمية', 'مرحلة', 'stageName', 'stage', 'Stage', 'txtStage', 'ddlStage']) || null,
    gradeName:        g(['levelId', 'gradeId', 'الصف*', 'الصف', 'اسم الصف', 'الفرقة', 'gradeName', 'grade', 'txtGrade', 'ddlGrade', 'الصف المستهدف']) || null,
    sectionName:      sectionName || null,
    classroomName: (() => {
      let raw = g([
        'classId', 'الفصل*', 'الفصل', 'فصل', 'اسم الفصل', 'رقم الفصل',
        'classroomName', 'classroom', 'class_name', 'class', 'className',
        'فصل الطالب', 'فصل التلميذ', 'الفصل المقيد به', 'الفصل/الصف', 'الصف/الفصل',
        'ddlClass', 'ddl_class', 'ddlClassRoom', 'txtClass'
      ]);
      if (!raw) return null;
      raw = raw.trim();
      if (['اختر', 'اختيار', 'الكل', '-- اختر --', '0', '-- اختر الفصل --', '--اختر--', 'لا يوجد', 'null', 'undefined', 'undefined/1'].includes(raw)) {
        return null;
      }
      return raw;
    })(),
    secondLanguage:   secondLanguage || null,
    mergeType:        mergeType || null,
    guardianPhone:    g(['phoneNumber', 'mobileNumber', 'رقم التليفون', 'رقم المحمول', 'تليفون']) || null,
    fatherNationalId: g(['fatherNationalId', 'الرقم القومي للوالد*', 'الرقم القومي للوالد']) || null,
    motherNationalId: g(['motherNationalId', 'الرقم القومى للأم*', 'الرقم القومى للأم']) || null,
    status:           status || 'promoted',
    enrollmentStatus: enrollmentStatus || 'منقول',
    isExcluded:       mappedStatus.is_excluded || 0,
    statusRaw:        statusRaw || null,
  };
};

// ─── Helper: Link/Create Classroom & Enrollment ─────────────────────────────
const _syncStudentClassroom = (sqliteDb, studentId, gradeId, academicYearId, rawClassroomName) => {
  if (!studentId || !gradeId || !academicYearId || !rawClassroomName) return null;
  let cleanCls = String(rawClassroomName).trim();
  if (!cleanCls || ['اختر', 'اختيار', 'الكل', '-- اختر --', '0', '-- اختر الفصل --', '--اختر--', 'لا يوجد', 'null', 'undefined'].includes(cleanCls)) return null;

  // Clean prefix if "فصل" is present
  cleanCls = cleanCls.replace(/^فصل\s*[\(\[]?/i, '').replace(/[\)\]]$/, '').trim() || cleanCls;

  const numMatch = cleanCls.match(/\d+/);
  const classNum = numMatch ? parseInt(numMatch[0]) : null;

  let cls = _get(sqliteDb, `
    SELECT id FROM classes
    WHERE grade_id = ? AND academic_year_id = ?
      AND (class_name = ? OR class_name = ? OR class_name = ? OR class_name = ? OR class_name = ? OR (class_number IS NOT NULL AND class_number = ?))
  `, [gradeId, academicYearId, cleanCls, `فصل ${cleanCls}`, `فصل (${cleanCls})`, `${cleanCls}/1`, `1/${cleanCls}`, classNum]);

  if (!cls) {
    const allCls = _all(sqliteDb, 'SELECT id, class_name, class_number FROM classes WHERE grade_id = ? AND academic_year_id = ?', [gradeId, academicYearId]);
    cls = allCls.find(c => {
      const cn = String(c.class_name || '').trim();
      return cn === cleanCls || cn.includes(cleanCls) || cleanCls.includes(cn) || (classNum !== null && c.class_number === classNum);
    });
  }

  if (!cls) {
    try {
      const grp = _get(sqliteDb, 'SELECT stage_id FROM grades_lookup WHERE id = ?', [gradeId]);
      const stageId = grp?.stage_id || null;
      sqliteDb.run('INSERT INTO classes (class_name, class_number, grade_id, academic_year_id, stage_id) VALUES (?, ?, ?, ?, ?)', [cleanCls, classNum, gradeId, academicYearId, stageId]);
      db.flushSQLite();
      cls = _get(sqliteDb, 'SELECT id FROM classes WHERE grade_id = ? AND academic_year_id = ? AND (class_name = ? OR class_number = ?)', [gradeId, academicYearId, cleanCls, classNum]);
    } catch (_) {}
  }

  if (cls) {
    try {
      sqliteDb.run('DELETE FROM class_enrollments WHERE student_id = ? AND academic_year_id = ?', [studentId, academicYearId]);
      sqliteDb.run(
        'INSERT INTO class_enrollments (class_id, student_id, academic_year_id) VALUES (?, ?, ?)',
        [cls.id, studentId, academicYearId]
      );
      db.flushSQLite();
    } catch (_) {}
    return cls.id;
  }
  return null;
};

const _ensureEmisSyncLogTable = (sqliteDb) => {
  try {
    // Drop shadow log table completely
    sqliteDb.run('DROP TABLE IF EXISTS emis_sync_log;');

    // Intelligent auto-repair for missing/corrupted stages for existing students
    try {
      const activeStages = _all(sqliteDb, 'SELECT id, section_id, stage_name FROM stages_lookup WHERE is_active = 1 ORDER BY display_order ASC, id ASC');
      const primaryActiveStage = activeStages[0] || _get(sqliteDb, 'SELECT id, section_id, stage_name FROM stages_lookup ORDER BY id ASC LIMIT 1');
      
      if (primaryActiveStage) {
        const activeStageIds = activeStages.map(s => s.id);
        if (activeStageIds.length > 0) {
          const placeholders = activeStageIds.map(() => '?').join(',');
          // If student has stage_id that is NOT in active stages, repair to matching active stage
          const inactiveStudents = _all(sqliteDb, `SELECT id, stage_id, grade_id FROM students WHERE stage_id IS NULL OR stage_id = 0 OR stage_id NOT IN (${placeholders})`, activeStageIds);
          for (const st of inactiveStudents) {
            const grp = _get(sqliteDb, 'SELECT grade_number FROM grades_lookup WHERE id = ?', [st.grade_id]);
            const gNum = grp?.grade_number || 1;
            const targetGrade = _get(sqliteDb, 'SELECT id FROM grades_lookup WHERE stage_id = ? AND grade_number = ?', [primaryActiveStage.id, gNum])
                             || _get(sqliteDb, 'SELECT id FROM grades_lookup WHERE stage_id = ? ORDER BY id ASC LIMIT 1', [primaryActiveStage.id]);
            const targetGradeId = targetGrade?.id || st.grade_id;
            sqliteDb.run('UPDATE students SET stage_id = ?, section_id = ?, grade_id = ? WHERE id = ?', [primaryActiveStage.id, primaryActiveStage.section_id, targetGradeId, st.id]);
          }
        }
      }
      sqliteDb.run("UPDATE students SET nationality_id = 1 WHERE nationality_id IS NULL OR nationality_id = '' OR nationality_id = 0");
      sqliteDb.run("UPDATE students SET academic_year_id = (SELECT id FROM academic_years WHERE is_current = 1 LIMIT 1) WHERE academic_year_id IS NULL OR academic_year_id = 0");
      db.flushSQLite();
    } catch (repairErr) {
      console.warn('[DB Auto-Repair]', repairErr.message);
    }
  } catch (e) {
    console.error('[DB] Cleanup error:', e.message);
  }
};

// ─── POST /api/students/emis/sync ────────────────────────────────────────────
// Saves collected EMIS student data 100% DIRECTLY into main official students table (Zero Shadow Logs)
const emisSync = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { students = [] } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ success: false, error: 'لا توجد بيانات طلاب.' });
  }

  try {
    const sqliteDb = db.getSQLiteDb();
    _ensureEmisSyncLogTable(sqliteDb);
    const results = { matched: 0, new: 0, updated: 0, skipped: 0 };

    const activeYear = _get(sqliteDb, 'SELECT id FROM academic_years WHERE is_current = 1 LIMIT 1') || _get(sqliteDb, 'SELECT id FROM academic_years LIMIT 1');
    const defaultAcademicYearId = activeYear?.id || 1;

    for (const rawRow of students) {
      try {
        const mapped = _emisColumnMap(rawRow);
        let { nationalId, emisStudentCode, fullNameAr, stageName, gradeName, sectionName, classroomName } = mapped;

        if (!nationalId && emisStudentCode) {
          const m = String(emisStudentCode).match(/\b\d{14}\b/);
          if (m) {
            nationalId = m[0];
            mapped.nationalId = nationalId;
          }
        }

        if (!nationalId && !emisStudentCode && !fullNameAr) {
          results.skipped++;
          continue;
        }

        // البحث في جدول الطلاب الرئيسي مباشرة بالرقم القومي أولاً ثم كود الوزارة
        let existing = null;
        if (nationalId && nationalId.length === 14) {
          const stmt = sqliteDb.prepare('SELECT id, full_name_ar, emis_student_code, grade_id, academic_year_id, section_id, stage_id FROM students WHERE national_id = ? AND (is_deleted IS NULL OR is_deleted = 0) LIMIT 1');
          stmt.bind([nationalId]);
          existing = stmt.step() ? stmt.getAsObject() : null;
          stmt.free();
        }
        if (!existing && emisStudentCode) {
          const stmt2 = sqliteDb.prepare('SELECT id, full_name_ar, emis_student_code, grade_id, academic_year_id, section_id, stage_id FROM students WHERE emis_student_code = ? AND (is_deleted IS NULL OR is_deleted = 0) LIMIT 1');
          stmt2.bind([emisStudentCode]);
          existing = stmt2.step() ? stmt2.getAsObject() : null;
          stmt2.free();
        }

        // ─── تحديد المرحلة والصف بدقة تامة طبقاً لمراحل المدرسة المفعلة ───
        const activeStagesList = _all(sqliteDb, 'SELECT id, section_id, stage_name FROM stages_lookup WHERE is_active = 1 ORDER BY display_order ASC, id ASC');
        const defaultStage = activeStagesList[0] || _get(sqliteDb, 'SELECT id, section_id, stage_name FROM stages_lookup ORDER BY id ASC LIMIT 1');

        let sectionId = existing?.section_id || defaultStage?.section_id || 1;
        let stageId = existing?.stage_id || defaultStage?.id || 1;
        let gradeId = existing?.grade_id || null;

        const searchStageStr = (stageName || gradeName || sectionName || '').trim();
        if (searchStageStr) {
          const stagesToSearch = activeStagesList.length > 0 ? activeStagesList : _all(sqliteDb, 'SELECT id, section_id, stage_name FROM stages_lookup');
          const matchedStage = stagesToSearch.find(s => {
            const dbName = s.stage_name.trim();
            if ((searchStageStr.includes('اعداد') || searchStageStr.includes('إعداد')) && !searchStageStr.includes('دول') && (dbName.includes('اعداد') || dbName.includes('إعداد')) && !dbName.includes('دول')) return true;
            if (searchStageStr.includes('ابتدائ') && dbName.includes('ابتدائ')) return true;
            if (searchStageStr.includes('ثانو') && dbName.includes('ثانو')) return true;
            if ((searchStageStr.includes('روض') || searchStageStr.includes('طفل') || searchStageStr.includes('تمهيد')) && (dbName.includes('روض') || dbName.includes('طفل') || dbName.includes('تمهيد'))) return true;
            if (searchStageStr.includes('دول') && dbName.includes('دول')) return true;
            return false;
          });
          if (matchedStage) {
            stageId = matchedStage.id;
            sectionId = matchedStage.section_id;
          }
        }

        const gradesInStage = _all(sqliteDb, 'SELECT id, grade_name_ar, grade_number FROM grades_lookup WHERE stage_id = ? AND (is_active = 1 OR is_active IS NULL) ORDER BY grade_number ASC, id ASC', [stageId]);
        if (gradeName) {
          const getGradeNum = (str) => {
            if (str.includes('أول') || str.includes('اول') || str.includes('1')) return 1;
            if (str.includes('ثان') || str.includes('ثاني') || str.includes('2')) return 2;
            if (str.includes('ثالث') || str.includes('3')) return 3;
            if (str.includes('رابع') || str.includes('4')) return 4;
            if (str.includes('خامس') || str.includes('5')) return 5;
            if (str.includes('سادس') || str.includes('6')) return 6;
            return 0;
          };
          const targetNum = getGradeNum(gradeName);
          const matchedGrade = gradesInStage.find(g => {
            if (targetNum > 0 && (g.grade_number === targetNum || getGradeNum(g.grade_name_ar) === targetNum)) return true;
            return g.grade_name_ar.includes(gradeName) || gradeName.includes(g.grade_name_ar);
          });
          if (matchedGrade) {
            gradeId = matchedGrade.id;
          } else if (gradesInStage.length > 0) {
            gradeId = gradesInStage[0].id;
          }
        }
        if (!gradeId) {
          gradeId = gradesInStage.length > 0 ? gradesInStage[0].id : (existing?.grade_id || 1);
        }

          const sParts = (fullNameAr || '').trim().split(/\s+/);
          const fn  = mapped.firstName   || sParts[0] || null;
          const fa  = mapped.fatherName  || sParts[1] || null;
          const gf  = mapped.gFatherName || sParts[2] || null;
          const fam = mapped.familyName  || (sParts.length > 3 ? sParts.slice(3).join(' ') : null);

          // اسم ولي الأمر / الأب بالكامل (الوالد + الجد + اللقب / العائلة)
          let guardianName = [fa, gf, fam].filter(Boolean).join(' ');
          if (!guardianName && sParts.length > 1) {
            guardianName = sParts.slice(1).join(' ');
          }

          let genderVal = null;
          if (mapped.gender) {
            const gClean = String(mapped.gender).trim().toLowerCase();
            if (
              gClean.includes('انث') ||
              gClean.includes('أنث') ||
              gClean.includes('بنت') ||
              gClean.includes('بنات') ||
              gClean.includes('اناث') ||
              gClean.includes('إناث') ||
              gClean.includes('female') ||
              gClean === 'f' ||
              gClean === '2'
            ) {
              genderVal = 'أنثى';
            } else if (
              gClean.includes('ذكر') ||
              gClean.includes('ولد') ||
              gClean.includes('بنين') ||
              gClean.includes('ذكور') ||
              gClean.includes('male') ||
              gClean === 'm' ||
              gClean === '1'
            ) {
              genderVal = 'ذكر';
            }
          }
          if (!genderVal && nationalId && nationalId.length === 14) {
            const ext = parseNationalId(nationalId);
            if (ext && ext.gender) genderVal = ext.gender;
          }

          if (existing) {
            results.matched++;
            results.updated++;
            const targetAcademicYearId = existing.academic_year_id || defaultAcademicYearId;
            const targetGradeId = existing.grade_id || gradeId;

            const mParts = (mapped.motherName || '').trim().split(/\s+/);
            const mFn  = mapped.motherFirstName  || mParts[0] || null;
            const mSn  = mapped.motherSecondName || mParts[1] || null;
            const mTn  = mapped.motherThirdName  || mParts[2] || null;
            const mFn4 = mapped.motherForthName  || (mParts.length > 3 ? mParts.slice(3).join(' ') : null);

            // تحديث السجل بجدول الطلاب الرئيسي مباشرة بالرمز الوزاري والاسم واللقب واسم ولي الأمر وأي بيان جديد وارد
            sqliteDb.run(
              `UPDATE students SET 
                emis_student_code = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE emis_student_code END,
                full_name_ar = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE full_name_ar END,
                first_name = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE first_name END,
                father_name = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE father_name END,
                gfather_name = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE gfather_name END,
                grandfather_name = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE grandfather_name END,
                family_name = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE family_name END,
                guardian_name = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE guardian_name END,
                grade_id = CASE WHEN ? IS NOT NULL THEN ? ELSE grade_id END,
                stage_id = CASE WHEN ? IS NOT NULL THEN ? ELSE stage_id END,
                section_id = CASE WHEN ? IS NOT NULL THEN ? ELSE section_id END,
                religion = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE religion END,
                second_language = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE second_language END,
                is_merged = CASE WHEN ? IS NOT NULL THEN ? ELSE is_merged END,
                merge_type = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE merge_type END,
                guardian_phone = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE guardian_phone END,
                student_phone = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE student_phone END,
                address = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE address END,
                gender = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE gender END,
                birth_date = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE birth_date END,
                birth_place = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE birth_place END,
                mother_name = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE mother_name END,
                mother_first_name = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE mother_first_name END,
                mother_second_name = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE mother_second_name END,
                mother_third_name = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE mother_third_name END,
                mother_fourth_name = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE mother_fourth_name END,
                status = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE status END,
                enrollment_status = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE enrollment_status END,
                is_excluded = CASE WHEN ? IS NOT NULL THEN ? ELSE is_excluded END
               WHERE id = ?`,
              [
                emisStudentCode || null, emisStudentCode || null, emisStudentCode || null,
                fullNameAr || null, fullNameAr || null, fullNameAr || null,
                fn, fn, fn,
                fa, fa, fa,
                gf, gf, gf,
                gf, gf, gf,
                fam, fam, fam,
                guardianName || null, guardianName || null, guardianName || null,
                targetGradeId, targetGradeId,
                stageId, stageId,
                sectionId, sectionId,
                mapped.religion || null, mapped.religion || null, mapped.religion || null,
                mapped.secondLanguage || null, mapped.secondLanguage || null, mapped.secondLanguage || null,
                mapped.mergeType ? 1 : (mapped.isMerged !== undefined ? (mapped.isMerged ? 1 : 0) : null), mapped.mergeType ? 1 : (mapped.isMerged !== undefined ? (mapped.isMerged ? 1 : 0) : null),
                mapped.mergeType || null, mapped.mergeType || null, mapped.mergeType || null,
                mapped.guardianPhone || null, mapped.guardianPhone || null, mapped.guardianPhone || null,
                mapped.guardianPhone || null, mapped.guardianPhone || null, mapped.guardianPhone || null,
                mapped.address || null, mapped.address || null, mapped.address || null,
                genderVal || null, genderVal || null, genderVal || null,
                mapped.birthDate || null, mapped.birthDate || null, mapped.birthDate || null,
                mapped.birthPlace || null, mapped.birthPlace || null, mapped.birthPlace || null,
                mapped.motherName || null, mapped.motherName || null, mapped.motherName || null,
                mFn, mFn, mFn,
                mSn, mSn, mSn,
                mTn, mTn, mTn,
                mFn4, mFn4, mFn4,
                mapped.status || null, mapped.status || null, mapped.status || null,
                mapped.enrollmentStatus || null, mapped.enrollmentStatus || null, mapped.enrollmentStatus || null,
                mapped.isExcluded !== undefined ? mapped.isExcluded : null, mapped.isExcluded !== undefined ? mapped.isExcluded : null,
                existing.id
              ]
            );

            // مزامنة وتسجيل الفصل للطالب الحالي
            if (classroomName) {
              _syncStudentClassroom(sqliteDb, existing.id, targetGradeId, targetAcademicYearId, classroomName);
            }
          } else {
            results.new++;
            // إضافة الطالب مباشرة بجدول الطلاب الرئيسي بنفس اللحظة بأعلى دقة
            try {
              const academicYearId = defaultAcademicYearId;

              let nationalityId = 1;
              const natObj = _get(sqliteDb, 'SELECT id FROM nationalities WHERE name LIKE "%مصري%" LIMIT 1') || _get(sqliteDb, 'SELECT id FROM nationalities LIMIT 1');
              if (natObj) nationalityId = natObj.id;

              const studentCode = _generateCode(sqliteDb, sectionId, stageId);

              let genderVal = 'ذكر';
              if (mapped.gender) {
                const gClean = String(mapped.gender)
                  .trim()
                  .toLowerCase()
                  .replace(/[\u064B-\u0652]/g, '')
                  .replace(/\u0640/g, '')
                  .replace(/[أإآ]/g, 'ا')
                  .replace(/[ىي]/g, 'ي')
                  .replace(/ة/g, 'ه');

                if (
                  gClean.includes('انث') ||
                  gClean.includes('بنت') ||
                  gClean.includes('بنات') ||
                  gClean.includes('فتاه') ||
                  gClean.includes('طالبه') ||
                  gClean.includes('تلميذه') ||
                  gClean.includes('اناث') ||
                  gClean.includes('female') ||
                  gClean === 'f'
                ) {
                  genderVal = 'أنثى';
                } else if (
                  gClean.includes('ولد') ||
                  gClean.includes('بنين') ||
                  gClean.includes('ذكر') ||
                  gClean.includes('ذكور') ||
                  gClean.includes('male') ||
                  gClean === 'm'
                ) {
                  genderVal = 'ذكر';
                }
              }
              let birthDateVal = mapped.birthDate;
              if (nationalId && nationalId.length === 14) {
                const ext = parseNationalId(nationalId);
                if (ext) {
                  if (!mapped.gender && ext.gender) genderVal = ext.gender;
                  if (!birthDateVal) birthDateVal = ext.birthDate;
                }
              }

              const mParts = (mapped.motherName || '').trim().split(/\s+/);
              const mFn  = mapped.motherFirstName  || mParts[0] || null;
              const mSn  = mapped.motherSecondName || mParts[1] || null;
              const mTn  = mapped.motherThirdName  || mParts[2] || null;
              const mFn4 = mapped.motherForthName  || (mParts.length > 3 ? mParts.slice(3).join(' ') : null);

              sqliteDb.run(`
                INSERT INTO students (
                  section_id, stage_id, grade_id, academic_year_id, student_code,
                  full_name_ar, first_name, father_name, gfather_name, grandfather_name, family_name,
                  national_id, emis_student_code, gender, birth_date,
                  address, religion, nationality_id, guardian_name, guardian_phone,
                  mother_name, mother_first_name, mother_second_name, mother_third_name, mother_forth_name, mother_fourth_name,
                  second_language, status, enrollment_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                sectionId, stageId, gradeId, academicYearId, studentCode,
                fullNameAr || 'طالب جديد من الوزارة', fn, fa, gf, gf, fam,
                nationalId || null,
                emisStudentCode || null,
                genderVal || 'ذكر',
                birthDateVal || null,
                mapped.address || null,
                normalizeReligion(mapped.religion) || null,
                nationalityId,
                guardianName || null,
                mapped.guardianPhone || null,
                mapped.motherName || null, mFn, mSn, mTn, mFn4, mFn4,
                mapped.secondLanguage || null,
                'promoted',
                new Date().toISOString().split('T')[0]
              ]);

              const newStudentId = _lastId(sqliteDb);

              // تسجيل الفصل مباشرة للطالب الجديد
              if (classroomName && newStudentId) {
                _syncStudentClassroom(sqliteDb, newStudentId, gradeId, academicYearId, classroomName);
              }
            } catch (insertErr) {
              console.error('[EMIS Sync Auto-Insert Error]:', insertErr.message);
            }
          }
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
    _ensureEmisSyncLogTable(sqliteDb);
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

// ─── Ensure dedicated EMIS collector settings table ──────────────────────────
const _ensureEmisSettingsTable = (sqliteDb) => {
  try {
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS emis_collector_settings (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key  TEXT UNIQUE NOT NULL,
        setting_value TEXT,
        updated_at   TEXT DEFAULT (datetime('now'))
      );
    `);
  } catch (e) {
    console.error('[DB] _ensureEmisSettingsTable error:', e.message);
  }
};

// ─── GET /api/students/emis/config ─────────────────────────────────────────
const getEmisConfig = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    _ensureEmisSettingsTable(sqliteDb);
    const stmt = sqliteDb.prepare("SELECT setting_value FROM emis_collector_settings WHERE setting_key = 'emis_collector_config' LIMIT 1");
    let config = {
      delayMs: 1200,
      batchSize: 50,
      autoSync: true,
      matchBy: 'national_id',
      incrementalOnly: true,
      defaultSectionId: '',
      defaultStageId: '',
      defaultGradeId: '',
      defaultAcademicYearId: ''
    };
    if (stmt.step()) {
      try { config = { ...config, ...JSON.parse(stmt.getAsObject().setting_value || '{}') }; } catch {}
    }
    stmt.free();
    return res.json({ success: true, config });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/students/emis/config ────────────────────────────────────────
const updateEmisConfig = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const config = req.body || {};
  try {
    const sqliteDb = db.getSQLiteDb();
    _ensureEmisSettingsTable(sqliteDb);

    const stmt = sqliteDb.prepare("SELECT id FROM emis_collector_settings WHERE setting_key = 'emis_collector_config' LIMIT 1");
    const exists = stmt.step();
    stmt.free();

    if (exists) {
      sqliteDb.run("UPDATE emis_collector_settings SET setting_value = ?, updated_at = datetime('now') WHERE setting_key = 'emis_collector_config'", [JSON.stringify(config)]);
    } else {
      sqliteDb.run("INSERT INTO emis_collector_settings (setting_key, setting_value) VALUES ('emis_collector_config', ?)", [JSON.stringify(config)]);
    }
    db.flushSQLite();
    return res.json({ success: true, message: 'تم حفظ إعدادات أداة جامع البيانات بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/students/emis/diff ───────────────────────────────────────────
const getEmisDiff = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const { ministryList } = req.body || {};
  if (!Array.isArray(ministryList)) {
    return res.status(400).json({ success: false, error: 'قائمة الطلاب غير صالحة.' });
  }
  try {
    const sqliteDb = db.getSQLiteDb();
    
    // Fetch all existing national IDs & emis codes from Nepras students DB
    const existingNatStmt = sqliteDb.prepare("SELECT national_id, emis_student_code FROM students WHERE status != 'excluded'");
    const existingNatSet = new Set();
    const existingEmisSet = new Set();
    while (existingNatStmt.step()) {
      const row = existingNatStmt.getAsObject();
      if (row.national_id) existingNatSet.add(String(row.national_id).trim());
      if (row.emis_student_code) existingEmisSet.add(String(row.emis_student_code).trim());
    }
    existingNatStmt.free();

    const missingList = [];
    const existingList = [];

    for (const item of ministryList) {
      const nat = item.nationalId ? String(item.nationalId).trim() : '';
      const code = item.emisCode ? String(item.emisCode).trim() : '';
      
      const isExisting = (nat && existingNatSet.has(nat)) || (code && existingEmisSet.has(code));
      if (isExisting) {
        existingList.push(item);
      } else {
        missingList.push(item);
      }
    }

    return res.json({
      success: true,
      totalMinistryCount: ministryList.length,
      existingCount: existingList.length,
      missingCount: missingList.length,
      missingList,
      existingList
    });
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

// ─── Student Absence Warnings & Management (إنذارات الغياب والرصد الأسبوعي) ──────
const getAbsenceWarnings = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const warnings = _all(sqliteDb, `
      SELECT w.*, s.full_name_ar, s.national_id, s.emis_student_code, s.student_code,
             s.guardian_name, s.guardian_phone, s.guardian_phone_2, s.address,
             c.class_name, g.grade_name_ar
      FROM student_absence_warnings w
      JOIN students s ON w.student_id = s.id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id
      LEFT JOIN classes c ON c.id = ce.class_id
      LEFT JOIN grades_lookup g ON g.id = s.grade_id
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
      warningGenerated = 'إنذار نهائي وفصل (15 يوماً متصلة أو 30 يوماً منفصلة)';
    } else if (totalAbsent >= 12) {
      warningGenerated = 'إنذار ثانٍ (12 يوماً غياب بدون عذر)';
    } else if (totalAbsent >= 7) {
      warningGenerated = 'إنذار أول (7 أيام غياب بدون عذر)';
    }

    if (warningGenerated) {
      const existing = _get(sqliteDb, 'SELECT id FROM student_absence_warnings WHERE student_id = ? AND warning_type = ?', [student_id, warningGenerated]);
      if (!existing) {
        _run(sqliteDb, `
          INSERT INTO student_absence_warnings (student_id, warning_type, total_absent_days, issue_date, notes)
          VALUES (?, ?, ?, DATE('now'), ?)
        `, [student_id, warningGenerated, totalAbsent, `تم التوليد التلقائي لبلوغ الغياب ${totalAbsent} يوماً`]);
      }
    }

    db.flushSQLite();
    return res.json({ success: true, message: 'تم تسجيل غياب الطالب بنجاح.', totalAbsent, warningGenerated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/students/absence/weekly-class ───────────────────────────────
const getWeeklyClassAbsence = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const { classId, gradeId, dates } = req.query;
    
    if (!classId && !gradeId) {
      return res.status(400).json({ success: false, error: 'يرجى تحديد الفصل أو الصف.' });
    }

    const dateList = dates ? dates.split(',').map(d => d.trim()).filter(Boolean) : [];

    let studentsSql = `
      SELECT s.id, s.full_name_ar, s.national_id, s.student_code, s.gender, s.religion, s.is_merged,
             c.class_name, g.grade_name_ar
      FROM students s
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id
      LEFT JOIN classes c ON c.id = ce.class_id
      LEFT JOIN grades_lookup g ON g.id = s.grade_id
      WHERE (s.is_deleted IS NULL OR s.is_deleted = 0)
        AND (s.status NOT IN ('excluded', 'disconnected', 'suspended', 'مستبعد', 'منقطع', 'موقوف قيده') AND (s.enrollment_status NOT IN ('مستبعد', 'منقطع', 'موقوف قيده') OR s.enrollment_status IS NULL))
    `;
    const params = [];
    if (classId) {
      studentsSql += ' AND ce.class_id = ?';
      params.push(classId);
    } else if (gradeId) {
      studentsSql += ' AND s.grade_id = ?';
      params.push(gradeId);
    }
    studentsSql += ' ORDER BY s.full_name_ar ASC';

    const students = _all(sqliteDb, studentsSql, params);

    const studentIds = students.map(s => s.id);
    let absences = [];
    if (studentIds.length > 0 && dateList.length > 0) {
      const placeholders = studentIds.map(() => '?').join(',');
      const datePlaceholders = dateList.map(() => '?').join(',');
      absences = _all(sqliteDb, `
        SELECT student_id, absence_date, absence_type, notes
        FROM student_absence_records
        WHERE student_id IN (${placeholders}) AND absence_date IN (${datePlaceholders})
      `, [...studentIds, ...dateList]);
    }

    return res.json({ success: true, students, absences });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/students/absence/weekly-bulk ──────────────────────────────
const recordBulkWeeklyAbsence = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const { dates, records } = req.body;
    
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: 'لا توجد بيانات غياب للحفظ.' });
    }

    const dateList = Array.isArray(dates) ? dates : (dates ? dates.split(',') : []);
    const studentIds = [...new Set(records.map(r => r.student_id))];

    if (studentIds.length > 0 && dateList.length > 0) {
      const placeholders = studentIds.map(() => '?').join(',');
      const datePlaceholders = dateList.map(() => '?').join(',');
      _run(sqliteDb, `
        DELETE FROM student_absence_records
        WHERE student_id IN (${placeholders}) AND absence_date IN (${datePlaceholders})
      `, [...studentIds, ...dateList]);
    }

    let insertedCount = 0;
    const warningsGenerated = [];

    records.forEach(r => {
      if (r.status === 'absent_unexcused' || r.status === 'absent_excused' || r.status === 'غ' || r.status === 'ع') {
        const absenceType = (r.status === 'absent_excused' || r.status === 'ع') ? 'بعذر' : 'بدون عذر';
        _run(sqliteDb, `
          INSERT INTO student_absence_records (student_id, absence_date, absence_type, notes)
          VALUES (?, ?, ?, ?)
        `, [r.student_id, r.date, absenceType, r.notes || null]);
        insertedCount++;
      }
    });

    studentIds.forEach(sid => {
      const totalAbsentObj = _get(sqliteDb, `
        SELECT COUNT(*) AS total FROM student_absence_records
        WHERE student_id = ? AND absence_type = 'بدون عذر'
      `, [sid]);
      const totalAbsent = totalAbsentObj ? totalAbsentObj.total : 0;

      let warningType = null;
      if (totalAbsent >= 15) {
        warningType = 'إنذار نهائي وفصل (15 يوماً متصلة أو 30 يوماً منفصلة)';
      } else if (totalAbsent >= 12) {
        warningType = 'إنذار ثانٍ (12 يوماً غياب بدون عذر)';
      } else if (totalAbsent >= 7) {
        warningType = 'إنذار أول (7 أيام غياب بدون عذر)';
      }

      if (warningType) {
        const existing = _get(sqliteDb, `
          SELECT id FROM student_absence_warnings
          WHERE student_id = ? AND warning_type = ?
        `, [sid, warningType]);

        if (!existing) {
          _run(sqliteDb, `
            INSERT INTO student_absence_warnings (student_id, warning_type, total_absent_days, issue_date, notes)
            VALUES (?, ?, ?, DATE('now'), ?)
          `, [sid, warningType, totalAbsent, `تم التوليد التلقائي لبلوغ الغياب ${totalAbsent} يوماً`]);

          const sInfo = _get(sqliteDb, 'SELECT full_name_ar FROM students WHERE id = ?', [sid]);
          warningsGenerated.push({ studentName: sInfo?.full_name_ar, warningType, totalAbsent });
        }
      }
    });

    db.flushSQLite();
    return res.json({
      success: true,
      message: `تم حفظ سجلات الغياب بنجاح (${insertedCount} حالة غياب).`,
      warningsGenerated
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── PUT /api/students/:id/merge-info ──────────────────────────────────────
const updateStudentMergeInfo = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const { id } = req.params;
    const {
      is_merged,
      merge_type,
      disability_id,
      merge_decision_number,
      merge_decision_date,
      merge_notes
    } = req.body;

    const student = _get(sqliteDb, 'SELECT id FROM students WHERE id = ?', [id]);
    if (!student) {
      return res.status(404).json({ success: false, error: 'الطالب غير موجود.' });
    }

    _run(sqliteDb, `
      UPDATE students
      SET is_merged = ?,
          merge_type = ?,
          disability_id = ?,
          merge_decision_number = ?,
          merge_decision_date = ?,
          merge_notes = ?
      WHERE id = ?
    `, [
      is_merged ? 1 : 0,
      is_merged ? (merge_type || 'دمج تعليمي') : null,
      is_merged ? (disability_id !== undefined && disability_id !== null ? Number(disability_id) : null) : null,
      is_merged ? (merge_decision_number || null) : null,
      is_merged ? (merge_decision_date || null) : null,
      merge_notes || null,
      id
    ]);

    db.flushSQLite();
    return res.json({ success: true, message: 'تم حفظ وتحديث بيانات الدمج بنجاح.' });
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

// ─── GET /api/students/export/classes-for-export ─────────────────────────────
// Returns list of classes matching optional gradeId/stageId/sectionId filters.
// Used by frontend to build the batch-export iteration queue.
const getClassesForExport = (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const { gradeId, stageId, sectionId, academicYearId } = req.query;
    let query = `
      SELECT DISTINCT c.id, c.class_name, c.class_number, g.grade_name_ar, g.grade_number, g.id AS grade_id, g.stage_id, s.stage_name, sec.type AS section_type
      FROM classes c
      JOIN grades_lookup g ON g.id = c.grade_id
      JOIN stages_lookup s ON s.id = g.stage_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      WHERE 1=1
    `;
    const params = [];
    if (gradeId && gradeId !== 'all_stage' && gradeId !== 'all_grade') { query += ' AND c.grade_id = ?'; params.push(gradeId); }
    if (stageId) { query += ' AND g.stage_id = ?'; params.push(stageId); }
    if (sectionId) { query += ' AND s.section_id = ?'; params.push(sectionId); }
    if (academicYearId) { query += ' AND (c.academic_year_id = ? OR c.academic_year_id IS NULL OR c.academic_year_id = 0)'; params.push(academicYearId); }
    query += ' ORDER BY g.grade_number ASC, COALESCE(c.class_number, CAST(c.class_name AS INTEGER), c.id) ASC';
    let classes = _all(sqliteDb, query, params);

    classes = classes.map(c => {
      const formattedName = formatClassroomLabel({
        classNumber: c.class_number,
        className: c.class_name,
        gradeNumber: c.grade_number,
        stageCode: c.stage_id,
        stageName: c.stage_name,
        sectionType: c.section_type
      });
      return { ...c, class_name: formattedName, formatted_name: formattedName };
    });

    return res.json({ success: true, classes });
  } catch (err) {
    console.error('getClassesForExport error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/students/export/report-pdf ──────────────────────────────────────
// Generates a PDF of a single class using the Excel template as the layout source.
// Strategy: generate .xlsm → try macro `تصدير_PDF_تلقائي` → fallback ExportAsFixedFormat.
const exportReportPdf = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const excelReportEngine   = require('../../services/excelReportEngine');
    const excelToPdfConverter = require('../../services/excelToPdfConverter');
    const sqliteDb = db.getSQLiteDb();

    const { classId, gradeId, stageId, academicYearId, mode } = req.query;

    const school = getSchoolMasterInfo(sqliteDb);
    const yearObj  = academicYearId ? _get(sqliteDb, 'SELECT year_label FROM academic_years WHERE id = ?', [academicYearId]) : null;
    const yearLabel = yearObj?.year_label || '';
    const classObj  = classId ? _get(sqliteDb, 'SELECT class_name FROM classes WHERE id = ?', [classId]) : null;
    const className = classObj?.class_name || 'فصل';

    // ── Build student query ──────────────────────────────────────────────
    const where  = ['1=1'];
    const params = [];
    if (stageId)        { where.push('s.stage_id = ?');   params.push(stageId); }
    if (gradeId)        { where.push('s.grade_id = ?');   params.push(gradeId); }
    if (classId) {
      where.push('EXISTS (SELECT 1 FROM class_enrollments ce WHERE ce.student_id = s.id AND ce.class_id = ?)');
      params.push(classId);
    }
    where.push("s.status != 'suspended'");
    if (academicYearId) { where.push('s.academic_year_id = ?'); params.push(academicYearId); }

    const students = _all(sqliteDb, `
      SELECT s.*, n.name AS nationality_name, c.class_name AS classroom_name
      FROM students s
      LEFT JOIN nationalities n ON n.id = s.nationality_id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.academic_year_id = s.academic_year_id
      LEFT JOIN classes c ON c.id = ce.class_id
      WHERE ${where.join(' AND ')}
      ORDER BY s.full_name_ar ASC
    `, params);

    // ── Generate .xlsm from template ─────────────────────────────────────
    const reportMode = mode || 'primary_portrait';
    let xlsmBuf;
    
    const MACRO_TEMPLATES = {
      'primary_portrait': 'كشف_رصد_صفوف_أولى_بالطول.xltm',
      'primary_landscape': 'كشف_رصد_صفوف_أولى_بالعرض.xltm',
      'upper_primary_portrait': 'كشف_رصد_صفوف_عليا_بالطول.xltm',
      'upper_primary_landscape': 'كشف_رصد_صفوف_عليا_بالعرض.xltm',
      'prep_portrait': 'كشف_رصد_اعدادى_بالطول.xltm',
      'prep_landscape': 'كشف_رصد_اعدادى_بالعرض.xltm',
      'sec_portrait': 'كشف_رصد_ثانوى_بالطول.xltm',
      'sec_landscape': 'كشف_رصد_ثانوى_بالعرض.xltm',
    };

    
    if (MACRO_TEMPLATES[reportMode]) {
      xlsmBuf = await excelReportEngine.generateMacroGradesReport({ templateName: MACRO_TEMPLATES[reportMode], school, className, yearLabel, students });
    } else if (reportMode === 'full_class_list') {
      xlsmBuf = await excelReportEngine.generateFullClassListReport({ classNameLabel: className, school, yearLabel, students });
    } else {
      xlsmBuf = await excelReportEngine.generateMacroGradesReport({ templateName: MACRO_TEMPLATES['primary_portrait'], school, className, yearLabel, students });
    }

    // ── Convert to PDF (macro → ExportAsFixedFormat → LibreOffice → Puppeteer) ─
    const pdfBuf = await excelToPdfConverter.convertXlsmToPdf(xlsmBuf, { school, className, yearLabel, students });

    const safeName = encodeURIComponent(`تقرير_${className}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.setHeader('Cache-Control', 'no-cache');
    return res.send(pdfBuf);
  } catch (err) {
    console.error('exportReportPdf error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/students/export/open-in-excel ──────────────────────────────────
// Populates .xlsm from template and opens it directly in MS Excel on desktop.
const openInExcel = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const excelReportEngine   = require('../../services/excelReportEngine');
    const excelToPdfConverter = require('../../services/excelToPdfConverter');
    const sqliteDb = db.getSQLiteDb();

    const { classId, gradeId, stageId, academicYearId, mode } = req.query;

    const school = getSchoolMasterInfo(sqliteDb);
    const yearObj  = academicYearId ? _get(sqliteDb, 'SELECT year_label FROM academic_years WHERE id = ?', [academicYearId]) : null;
    const yearLabel = yearObj?.year_label || '';
    const classObj  = classId ? _get(sqliteDb, 'SELECT class_name FROM classes WHERE id = ?', [classId]) : null;
    const className = classObj?.class_name || 'فصل';

    const where  = ['1=1'];
    const params = [];
    if (stageId) { where.push('s.stage_id = ?'); params.push(stageId); }
    if (gradeId) { where.push('s.grade_id = ?'); params.push(gradeId); }
    if (classId) {
      where.push('EXISTS (SELECT 1 FROM class_enrollments ce WHERE ce.student_id = s.id AND ce.class_id = ?)');
      params.push(classId);
    }
    where.push("s.status != 'suspended'");
    if (academicYearId) { where.push('s.academic_year_id = ?'); params.push(academicYearId); }

    const students = _all(sqliteDb, `
      SELECT s.*, n.name AS nationality_name, c.class_name AS classroom_name
      FROM students s
      LEFT JOIN nationalities n ON n.id = s.nationality_id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.academic_year_id = s.academic_year_id
      LEFT JOIN classes c ON c.id = ce.class_id
      WHERE ${where.join(' AND ')}
      ORDER BY s.full_name_ar ASC
    `, params);

    const reportMode = mode || 'primary_portrait';
    let xlsmBuf;
    
    const MACRO_TEMPLATES = {
      'primary_portrait': 'كشف_رصد_صفوف_أولى_بالطول.xltm',
      'primary_landscape': 'كشف_رصد_صفوف_أولى_بالعرض.xltm',
      'upper_primary_portrait': 'كشف_رصد_صفوف_عليا_بالطول.xltm',
      'upper_primary_landscape': 'كشف_رصد_صفوف_عليا_بالعرض.xltm',
      'prep_portrait': 'كشف_رصد_اعدادى_بالطول.xltm',
      'prep_landscape': 'كشف_رصد_اعدادى_بالعرض.xltm',
      'sec_portrait': 'كشف_رصد_ثانوى_بالطول.xltm',
      'sec_landscape': 'كشف_رصد_ثانوى_بالعرض.xltm',
    };

    
    if (MACRO_TEMPLATES[reportMode]) {
      xlsmBuf = await excelReportEngine.generateMacroGradesReport({ templateName: MACRO_TEMPLATES[reportMode], school, className, yearLabel, students });
    } else if (reportMode === 'full_class_list') {
      xlsmBuf = await excelReportEngine.generateFullClassListReport({ classNameLabel: className, school, yearLabel, students });
    } else {
      xlsmBuf = await excelReportEngine.generateMacroGradesReport({ templateName: MACRO_TEMPLATES['primary_portrait'], school, className, yearLabel, students });
    }

    const fileNameHint = `كشف_رصد_${className}.xlsm`;
    excelToPdfConverter.openXlsmInExcel(xlsmBuf, fileNameHint);

    return res.json({ success: true, message: 'تم فتح الملف ببرنامج MS Excel بنجاح.' });
  } catch (err) {
    console.error('openInExcel error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/students/emis/registered-codes ────────────────────────────────
// Returns all registered emis_student_codes and national_ids in Nepras DB for fast one-click comparison
const getRegisteredEmisCodes = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const rows = _all(sqliteDb, `
      SELECT id, student_code, national_id, emis_student_code, full_name_ar
      FROM students
      WHERE (is_deleted IS NULL OR is_deleted = 0)
    `);

    const emisCodes = [];
    const nationalIds = [];
    const allIdentifiers = new Set();

    for (const r of rows) {
      if (r.emis_student_code && String(r.emis_student_code).trim()) {
        const code = String(r.emis_student_code).trim();
        emisCodes.push(code);
        allIdentifiers.add(code);
      }
      if (r.national_id && String(r.national_id).trim()) {
        const nid = String(r.national_id).trim();
        nationalIds.push(nid);
        allIdentifiers.add(nid);
      }
      if (r.student_code && String(r.student_code).trim()) {
        allIdentifiers.add(String(r.student_code).trim());
      }
    }

    return res.json({
      success: true,
      count: rows.length,
      emisCodes,
      nationalIds,
      allIdentifiers: Array.from(allIdentifiers),
    });
  } catch (err) {
    console.error('getRegisteredEmisCodes error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/students/export/general-census ─────────────────────────────────
const exportGeneralCensusExcel = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const ExcelJS = require('exceljs');
    const sqliteDb = db.getSQLiteDb();
    const { academicYearId, sectionId, stageId, gradeId } = req.query;

    const school = getSchoolMasterInfo(sqliteDb);
    const yearObj = academicYearId 
      ? _get(sqliteDb, 'SELECT year_label FROM academic_years WHERE id = ?', [academicYearId]) 
      : _get(sqliteDb, 'SELECT year_label FROM academic_years WHERE is_current = 1 LIMIT 1');
    const yearLabel = yearObj?.year_label || 'العام الحالي';

    let q = `
      SELECT 
        s.id, s.full_name_ar AS name, s.gender, s.religion, s.nationality_id, s.is_returned_from_abroad,
        nl.name_ar AS nationality_name,
        stg.id AS stage_id, stg.stage_name,
        g.id AS grade_id, g.grade_name_ar, g.grade_number,
        c.id AS classroom_id, c.class_name AS classroom_name
      FROM students s
      LEFT JOIN grades_lookup g          ON g.id = s.grade_id
      LEFT JOIN stages_lookup stg        ON stg.id = s.stage_id
      LEFT JOIN nationalities_lookup nl  ON nl.id = s.nationality_id
      LEFT JOIN class_enrollments ce     ON ce.student_id = s.id AND (s.academic_year_id IS NULL OR ce.academic_year_id = s.academic_year_id)
      LEFT JOIN classes c                ON c.id = ce.class_id
      WHERE (s.is_deleted IS NULL OR s.is_deleted = 0)
        AND s.status NOT IN ('excluded', 'disconnected', 'suspended', 'مستبعد', 'منقطع', 'موقوف قيده')
    `;
    const params = [];
    if (academicYearId) {
      q += ' AND s.academic_year_id = ?';
      params.push(academicYearId);
    }
    if (sectionId) {
      q += ' AND s.section_id = ?';
      params.push(sectionId);
    }
    if (stageId) {
      q += ' AND g.stage_id = ?';
      params.push(stageId);
    }
    if (gradeId) {
      q += ' AND s.grade_id = ?';
      params.push(gradeId);
    }

    q += ' ORDER BY stg.id ASC, g.grade_number ASC, s.full_name_ar ASC';
    const students = _all(sqliteDb, q, params);

    const stagesMap = new Map();
    students.forEach(s => {
      const stageName = (s.stage_name || 'المرحلة الدراسية').trim();
      const stageIdKey = s.stage_id || stageName;
      const gradeName = (s.grade_name_ar || 'الصف').trim();
      const gradeIdKey = s.grade_id || gradeName;

      if (!stagesMap.has(stageIdKey)) {
        stagesMap.set(stageIdKey, {
          stageId: stageIdKey,
          stageName: stageName.startsWith('اجمالى') || stageName.startsWith('إجمالي') ? stageName : `اجمالى مرحلة ${stageName.replace(/المرحلة/g, '').trim()}`,
          gradesMap: new Map()
        });
      }

      const stageObj = stagesMap.get(stageIdKey);
      if (!stageObj.gradesMap.has(gradeIdKey)) {
        stageObj.gradesMap.set(gradeIdKey, {
          gradeId: gradeIdKey,
          gradeName,
          students: []
        });
      }

      stageObj.gradesMap.get(gradeIdKey).students.push(s);
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('إحصاء عام المقيدين', {
      views: [{ rtl: true, showGridLines: true }],
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });

    ws.columns = [
      { width: 28 }, // A: الصف
      { width: 12 }, // B: عدد الفصول
      { width: 10 }, // C: مقيدون بنون
      { width: 10 }, // D: مقيدون بنات
      { width: 10 }, // E: مسلم بنون
      { width: 10 }, // F: مسلم بنات
      { width: 12 }, // G: إجمالي مسلم
      { width: 10 }, // H: مسيحي بنون
      { width: 10 }, // I: مسيحي بنات
      { width: 12 }, // J: إجمالي مسيحي
      { width: 14 }, // K: الإجمالي
      { width: 10 }, // L: وافد
      { width: 12 }, // M: فوق الكثافة
    ];

    const thinBorder = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
    const mediumBorder = {
      top: { style: 'medium' },
      bottom: { style: 'medium' },
      left: { style: 'medium' },
      right: { style: 'medium' }
    };

    // Header Rows
    ws.mergeCells('A1:C1');
    ws.getCell('A1').value = `محافظة: ${school.governorate || '...............'}\nإدارة: ${school.directorate ? `${school.directorate} التعليمية` : '...............'}\nمدرسة: ${school.school_name || '...............'}`;
    ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
    ws.getCell('A1').font = { name: 'Arial', size: 10, bold: true };
    ws.getRow(1).height = 42;

    ws.mergeCells('D1:K1');
    ws.getCell('D1').value = `إحصاء عام بعدد التلاميذ المقيدين\nللعام الدراسي: ${yearLabel}`;
    ws.getCell('D1').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    ws.getCell('D1').font = { name: 'Arial', size: 14, bold: true, underline: true };

    ws.mergeCells('L1:M1');
    ws.getCell('L1').value = new Date().toLocaleDateString('ar-EG');
    ws.getCell('L1').alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getCell('L1').font = { name: 'Arial', size: 9 };

    ws.addRow([]);

    // Table Header (Rows 3 & 4)
    ws.mergeCells('A3:A4'); ws.getCell('A3').value = 'الصف';
    ws.mergeCells('B3:B4'); ws.getCell('B3').value = 'عدد\nالفصول';
    ws.mergeCells('C3:D3'); ws.getCell('C3').value = 'مقيدون';
    ws.getCell('C4').value = 'بنون'; ws.getCell('D4').value = 'بنات';
    ws.mergeCells('E3:F3'); ws.getCell('E3').value = 'مسلم';
    ws.getCell('E4').value = 'بنون'; ws.getCell('F4').value = 'بنات';
    ws.mergeCells('G3:G4'); ws.getCell('G3').value = 'اجمالى\nمسلم';
    ws.mergeCells('H3:I3'); ws.getCell('H3').value = 'مسيحى';
    ws.getCell('H4').value = 'بنون'; ws.getCell('I4').value = 'بنات';
    ws.mergeCells('J3:J4'); ws.getCell('J3').value = 'إجمالى\nمسيحى';
    ws.mergeCells('K3:K4'); ws.getCell('K3').value = 'الإجمالى';
    ws.mergeCells('L3:L4'); ws.getCell('L3').value = 'وافد';
    ws.mergeCells('M3:M4'); ws.getCell('M3').value = 'فوق\nالكثافة';

    for (let r = 3; r <= 4; r++) {
      ws.getRow(r).height = 24;
      for (let c = 1; c <= 13; c++) {
        const cell = ws.getCell(r, c);
        cell.font = { name: 'Arial', size: 10, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        cell.border = thinBorder;
      }
    }

    let grandTotal = { classes: 0, boys: 0, girls: 0, mBoys: 0, mGirls: 0, mTot: 0, cBoys: 0, cGirls: 0, cTot: 0, total: 0, foreign: 0, over: 0 };

    stagesMap.forEach(stg => {
      let stageSubtotal = { classes: 0, boys: 0, girls: 0, mBoys: 0, mGirls: 0, mTot: 0, cBoys: 0, cGirls: 0, cTot: 0, total: 0, foreign: 0, over: 0 };

      stg.gradesMap.forEach(grd => {
        const gradeStudents = grd.students;
        const distinctClasses = new Set(gradeStudents.map(s => s.classroom_name || s.classroom_id).filter(Boolean));
        const classesCount = distinctClasses.size || (gradeStudents.length > 0 ? Math.ceil(gradeStudents.length / 35) : 0);

        let boys = 0, girls = 0, mBoys = 0, mGirls = 0, cBoys = 0, cGirls = 0, foreign = 0, over = 0;
        gradeStudents.forEach(s => {
          const isBoy = (s.gender || '').trim() === 'ذكر' || (s.gender || '').trim() === 'بنين';
          const isMuslim = (s.religion || '').trim().includes('مسلم');
          const isChristian = (s.religion || '').trim().includes('مسيح');
          const isForeign = (s.nationality_id && s.nationality_id !== 1 && !(s.nationality_name || '').includes('مصر')) ||
                            (s.nationality_name && !s.nationality_name.includes('مصر') && s.nationality_name !== 'مصري');
          const isOver = s.is_over_capacity === 1 || s.is_over_capacity === true;

          if (isBoy) {
            boys++;
            if (isMuslim) mBoys++; else if (isChristian) cBoys++; else mBoys++;
          } else {
            girls++;
            if (isMuslim) mGirls++; else if (isChristian) cGirls++; else mGirls++;
          }
          if (isForeign) foreign++;
          if (isOver) over++;
        });

        const mTot = mBoys + mGirls;
        const cTot = cBoys + cGirls;
        const total = boys + girls;

        stageSubtotal.classes += classesCount;
        stageSubtotal.boys += boys; stageSubtotal.girls += girls;
        stageSubtotal.mBoys += mBoys; stageSubtotal.mGirls += mGirls; stageSubtotal.mTot += mTot;
        stageSubtotal.cBoys += cBoys; stageSubtotal.cGirls += cGirls; stageSubtotal.cTot += cTot;
        stageSubtotal.total += total; stageSubtotal.foreign += foreign; stageSubtotal.over += over;

        const row = ws.addRow([
          grd.gradeName, classesCount, boys, girls, mBoys, mGirls, mTot, cBoys, cGirls, cTot, total, foreign, over
        ]);
        row.height = 20;
        row.eachCell((cell, colNum) => {
          cell.font = { name: 'Arial', size: 10, bold: colNum === 1 || colNum === 7 || colNum === 10 || colNum === 11 };
          cell.alignment = { vertical: 'middle', horizontal: colNum === 1 ? 'right' : 'center' };
          cell.border = thinBorder;
        });
      });

      grandTotal.classes += stageSubtotal.classes;
      grandTotal.boys += stageSubtotal.boys; grandTotal.girls += stageSubtotal.girls;
      grandTotal.mBoys += stageSubtotal.mBoys; grandTotal.mGirls += stageSubtotal.mGirls; grandTotal.mTot += stageSubtotal.mTot;
      grandTotal.cBoys += stageSubtotal.cBoys; grandTotal.cGirls += stageSubtotal.cGirls; grandTotal.cTot += stageSubtotal.cTot;
      grandTotal.total += stageSubtotal.total; grandTotal.foreign += stageSubtotal.foreign; grandTotal.over += stageSubtotal.over;

      const subRow = ws.addRow([
        stg.stageName, stageSubtotal.classes, stageSubtotal.boys, stageSubtotal.girls,
        stageSubtotal.mBoys, stageSubtotal.mGirls, stageSubtotal.mTot,
        stageSubtotal.cBoys, stageSubtotal.cGirls, stageSubtotal.cTot,
        stageSubtotal.total, stageSubtotal.foreign, stageSubtotal.over
      ]);
      subRow.height = 22;
      subRow.eachCell((cell, colNum) => {
        cell.font = { name: 'Arial', size: 10.5, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: colNum === 1 ? 'right' : 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCFFAFE' } };
        cell.border = thinBorder;
      });
    });

    const grandRow = ws.addRow([
      'الإجمالى العام', grandTotal.classes, grandTotal.boys, grandTotal.girls,
      grandTotal.mBoys, grandTotal.mGirls, grandTotal.mTot,
      grandTotal.cBoys, grandTotal.cGirls, grandTotal.cTot,
      grandTotal.total, grandTotal.foreign, grandTotal.over
    ]);
    grandRow.height = 25;
    grandRow.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 11, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF93C5FD' } };
      cell.border = mediumBorder;
    });

    ws.addRow([]);
    const sigRow1 = ws.addRow(['سكرتير المدرسة :', '', '', '', '', '', '', '', '', '', 'يعتمده: مدير المدرسة', '', '']);
    sigRow1.font = { name: 'Arial', size: 10.5, bold: true };
    const sigRow2 = ws.addRow(['وكيل شئون الطلبة :', '', '', '', '', '', '', '', '', '', '', '', '']);
    sigRow2.font = { name: 'Arial', size: 10.5, bold: true };

    const buffer = await wb.xlsx.writeBuffer();
    const encodedFileName = encodeURIComponent('إحصاء_عام_بعدد_التلاميذ_المقيدين.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
    return res.send(buffer);

  } catch (err) {
    console.error('[exportGeneralCensusExcel error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

const exportEnrollmentStatusCensusExcel = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const ExcelJS = require('exceljs');
    const sqliteDb = db.getSQLiteDb();
    const { academicYearId, sectionId, stageId, gradeId } = req.query;

    const school = getSchoolMasterInfo(sqliteDb);
    const yearObj = academicYearId 
      ? _get(sqliteDb, 'SELECT year_label FROM academic_years WHERE id = ?', [academicYearId]) 
      : _get(sqliteDb, 'SELECT year_label FROM academic_years WHERE is_current = 1 LIMIT 1');
    const yearLabel = yearObj?.year_label || 'العام الحالي';

    let q = `
      SELECT 
        s.id, s.full_name_ar AS name, s.gender, s.religion, s.nationality_id, s.is_returned_from_abroad,
        s.country_from, s.status, s.registration_status_id, s.enrollment_status,
        nl.name_ar AS nationality_name,
        stg.id AS stage_id, stg.stage_name,
        g.id AS grade_id, g.grade_name_ar, g.grade_number,
        c.id AS classroom_id, c.class_name AS classroom_name
      FROM students s
      LEFT JOIN grades_lookup g          ON g.id = s.grade_id
      LEFT JOIN stages_lookup stg        ON stg.id = s.stage_id
      LEFT JOIN nationalities_lookup nl  ON nl.id = s.nationality_id
      LEFT JOIN class_enrollments ce     ON ce.student_id = s.id AND (s.academic_year_id IS NULL OR ce.academic_year_id = s.academic_year_id)
      LEFT JOIN classes c                ON c.id = ce.class_id
      WHERE (s.is_deleted IS NULL OR s.is_deleted = 0)
        AND s.status NOT IN ('excluded', 'suspended', 'مستبعد', 'موقوف قيده')
    `;
    const params = [];
    if (academicYearId) {
      q += ' AND s.academic_year_id = ?';
      params.push(academicYearId);
    }
    if (sectionId) {
      q += ' AND s.section_id = ?';
      params.push(sectionId);
    }
    if (stageId) {
      q += ' AND g.stage_id = ?';
      params.push(stageId);
    }
    if (gradeId) {
      q += ' AND s.grade_id = ?';
      params.push(gradeId);
    }

    q += ' ORDER BY stg.id ASC, g.grade_number ASC, s.full_name_ar ASC';
    const students = _all(sqliteDb, q, params);

    const stagesMap = new Map();
    students.forEach(s => {
      const stageName = s.stage_name || 'المرحلة التعليمية';
      const sId = s.stage_id || 1;
      const gradeName = s.grade_name_ar || 'الصف';
      const gId = s.grade_id || 1;

      if (!stagesMap.has(sId)) {
        stagesMap.set(sId, { stageId: sId, stageName, gradesMap: new Map() });
      }
      const stg = stagesMap.get(sId);
      if (!stg.gradesMap.has(gId)) {
        stg.gradesMap.set(gId, { gradeId: gId, gradeName, students: [] });
      }
      stg.gradesMap.get(gId).students.push(s);
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'NeprasPro ERP';
    wb.created = new Date();
    const ws = wb.addWorksheet('إحصاء حالات القيد', {
      views: [{ rtl: true, showGridLines: true }],
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });

    // Column Widths (13 columns)
    ws.columns = [
      { key: 'grade',        width: 26 },
      { key: 'classesCount', width: 11 },
      { key: 'total',        width: 13 },
      { key: 'boys',         width: 10 },
      { key: 'girls',        width: 10 },
      { key: 'muslim',       width: 11 },
      { key: 'christian',    width: 11 },
      { key: 'new',          width: 11 },
      { key: 'transferred',  width: 11 },
      { key: 'repeater',     width: 11 },
      { key: 'disconnected', width: 11 },
      { key: 'foreign',      width: 10 },
      { key: 'returned',     width: 10 },
    ];

    // Header Meta
    ws.mergeCells('A1:C1');
    ws.getCell('A1').value = `محافظة: ${school.governorate || '................'}\nإدارة: ${school.directorate || '................'}\nمدرسة: ${school.school_name || '................'}`;
    ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
    ws.getCell('A1').font = { name: 'Arial', size: 10, bold: true };
    ws.getRow(1).height = 42;

    ws.mergeCells('D1:K1');
    ws.getCell('D1').value = `إحصاء حالات القيد والتسجيل للتلاميذ\nللعام الدراسي: ${yearLabel} م`;
    ws.getCell('D1').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    ws.getCell('D1').font = { name: 'Arial', size: 14, bold: true, underline: true };

    ws.mergeCells('L1:M1');
    ws.getCell('L1').value = new Date().toLocaleDateString('ar-EG');
    ws.getCell('L1').alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getCell('L1').font = { name: 'Arial', size: 9 };

    ws.addRow([]);

    // Table Header (Row 3)
    const headerRow = ws.addRow([
      'الصف', 'عدد\nالفصول', 'إجمالى\nالمقيدون', 'بنون', 'بنات', 'مسلم', 'مسيحى', 'مستجد', 'منقول', 'باق', 'منقطع', 'وافد', 'عائد'
    ]);
    headerRow.height = 28;
    headerRow.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 11, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'medium' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' }
      };
      if (colNum === 3) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFDBFE' } }; // Blue accent
      } else if (colNum === 8) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Green accent
      } else if (colNum === 9) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } }; // Yellow accent
      } else if (colNum === 10) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Red accent
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      }
    });

    const grandTotal = {
      classes: 0, total: 0, boys: 0, girls: 0, muslim: 0, christian: 0,
      newly: 0, trans: 0, rep: 0, disc: 0, foreign: 0, returned: 0
    };

    stagesMap.forEach(stg => {
      const stageSubtotal = {
        classes: 0, total: 0, boys: 0, girls: 0, muslim: 0, christian: 0,
        newly: 0, trans: 0, rep: 0, disc: 0, foreign: 0, returned: 0
      };

      stg.gradesMap.forEach(grd => {
        const gradeStudents = grd.students;
        const distinctClasses = new Set(gradeStudents.map(s => s.classroom_name || s.classroom_id).filter(Boolean));
        const classesCount = distinctClasses.size || (gradeStudents.length > 0 ? Math.ceil(gradeStudents.length / 35) : 0);

        let boys = 0, girls = 0, muslim = 0, christian = 0;
        let newly = 0, trans = 0, rep = 0, disc = 0, foreign = 0, returned = 0;

        gradeStudents.forEach(s => {
          const isBoy = (s.gender || '').trim() === 'ذكر' || (s.gender || '').trim() === 'بنين';
          const isMuslim = (s.religion || '').trim().includes('مسلم');
          const isChristian = (s.religion || '').trim().includes('مسيح');
          const isForeign = (s.nationality_id && s.nationality_id !== 1 && !(s.nationality_name || '').includes('مصر')) ||
                            (s.nationality_name && !s.nationality_name.includes('مصر') && s.nationality_name !== 'مصري');
          const isReturned = s.is_returned_from_abroad === 1 || Boolean(s.country_from);

          const rawStatus = (s.status || '').trim().toLowerCase();
          const regStatus = (s.enrollment_status || '').trim().toLowerCase();
          const regId = Number(s.registration_status_id);

          let isDisc = false, isRep = false, isNew = false;

          if (regId === 5 || rawStatus === 'disconnected' || rawStatus === 'absent' || regStatus.includes('منقطع')) {
            isDisc = true;
          } else if (regId === 3 || rawStatus === 'retained' || rawStatus === 'repeater' || regStatus.includes('باق')) {
            isRep = true;
          } else if (regId === 1 || rawStatus === 'new' || regStatus.includes('مستجد')) {
            isNew = true;
          }

          if (isBoy) boys++; else girls++;
          if (isMuslim) muslim++; else if (isChristian) christian++; else muslim++;

          if (isDisc) disc++;
          else if (isRep) rep++;
          else if (isNew) newly++;
          else trans++;

          if (isForeign) foreign++;
          if (isReturned) returned++;
        });

        const total = boys + girls;

        stageSubtotal.classes += classesCount;
        stageSubtotal.total += total;
        stageSubtotal.boys += boys; stageSubtotal.girls += girls;
        stageSubtotal.muslim += muslim; stageSubtotal.christian += christian;
        stageSubtotal.newly += newly; stageSubtotal.trans += trans;
        stageSubtotal.rep += rep; stageSubtotal.disc += disc;
        stageSubtotal.foreign += foreign; stageSubtotal.returned += returned;

        const row = ws.addRow([
          grd.gradeName, classesCount, total, boys, girls, muslim, christian, newly, trans, rep, disc, foreign, returned
        ]);
        row.height = 20;
        row.eachCell((cell, colNum) => {
          cell.font = { name: 'Arial', size: 10, bold: colNum === 1 || colNum === 3 };
          cell.alignment = { vertical: 'middle', horizontal: colNum === 1 ? 'right' : 'center' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          if (colNum === 3) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
        });
      });

      // Stage Subtotal Row
      grandTotal.classes += stageSubtotal.classes;
      grandTotal.total += stageSubtotal.total;
      grandTotal.boys += stageSubtotal.boys; grandTotal.girls += stageSubtotal.girls;
      grandTotal.muslim += stageSubtotal.muslim; grandTotal.christian += stageSubtotal.christian;
      grandTotal.newly += stageSubtotal.newly; grandTotal.trans += stageSubtotal.trans;
      grandTotal.rep += stageSubtotal.rep; grandTotal.disc += stageSubtotal.disc;
      grandTotal.foreign += stageSubtotal.foreign; grandTotal.returned += stageSubtotal.returned;

      const subRow = ws.addRow([
        stg.stageName, stageSubtotal.classes, stageSubtotal.total, stageSubtotal.boys, stageSubtotal.girls,
        stageSubtotal.muslim, stageSubtotal.christian, stageSubtotal.newly, stageSubtotal.trans,
        stageSubtotal.rep, stageSubtotal.disc, stageSubtotal.foreign, stageSubtotal.returned
      ]);
      subRow.height = 22;
      subRow.eachCell((cell, colNum) => {
        cell.font = { name: 'Arial', size: 10.5, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: colNum === 1 ? 'right' : 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colNum === 3 ? 'FFBAE6FD' : 'FFCFFAFE' } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });

    // Grand Total Row
    const grandRow = ws.addRow([
      'الإجمالى العام', grandTotal.classes, grandTotal.total, grandTotal.boys, grandTotal.girls,
      grandTotal.muslim, grandTotal.christian, grandTotal.newly, grandTotal.trans,
      grandTotal.rep, grandTotal.disc, grandTotal.foreign, grandTotal.returned
    ]);
    grandRow.height = 24;
    grandRow.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 11, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colNum === 3 ? 'FF60A5FA' : 'FF93C5FD' } };
      cell.border = { top: { style: 'medium' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } };
    });

    ws.addRow([]);
    ws.addRow([]);

    // Signatures
    const sigRow = ws.addRow([
      'سكرتير المدرسة', '', '', 'وكيل شئون الطلبة', '', '', '', '', '', 'مدير المدرسة', '', '', ''
    ]);
    sigRow.height = 24;
    sigRow.eachCell(cell => {
      cell.font = { name: 'Arial', size: 11, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const buffer = await wb.xlsx.writeBuffer();
    const encodedFileName = encodeURIComponent('إحصاء_حالات_القيد.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
    return res.send(buffer);

  } catch (err) {
    console.error('[exportEnrollmentStatusCensusExcel error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════
// ── STUDENT TRANSFERS (طلبات النقل وسجل المحولين) ─────────────────────────
// ══════════════════════════════════════════════════════════════════════════

// ─── POST /api/students/:id/transfers ─────────────────────────────────────
const createTransfer = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const studentId = parseInt(req.params.id, 10);
  const {
    transferType = 'out',
    toSchool, toDirectorate, toGradeId,
    fromSchool, fromDirectorate, fromGradeId,
    reason, transferDate, academicYearId, notes,
    feesStatus, booksStatus, durationInGrade,
    guardianName, guardianNationalId, guardianJob, guardianPhone, address
  } = req.body;

  try {
    const sqliteDb = db.getSQLiteDb();

    // Verify student exists
    const stRows = sqliteDb.exec('SELECT id, full_name_ar, academic_year_id FROM students WHERE id = ?', [studentId]);
    if (!stRows.length || !stRows[0].values.length) {
      return res.status(404).json({ success: false, error: 'لم يتم العثور على بيانات الطالب.' });
    }

    const effectiveAyId = academicYearId ? parseInt(academicYearId, 10) : stRows[0].values[0][2];
    const effDate = transferDate || new Date().toISOString().split('T')[0];

    db.runTransaction(() => {
      // 1. Insert into student_transfers table
      sqliteDb.run(`
        INSERT INTO student_transfers (
          student_id, academic_year_id, transfer_type,
          from_school, from_directorate, from_grade_id,
          to_school, to_directorate, to_grade_id,
          reason, transfer_date, is_completed, notes,
          fees_status, books_status, duration_in_grade
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
      `, [
        studentId, effectiveAyId, transferType,
        fromSchool || null, fromDirectorate || null, fromGradeId ? parseInt(fromGradeId, 10) : null,
        toSchool || null, toDirectorate || null, toGradeId ? parseInt(toGradeId, 10) : null,
        reason || null, effDate, notes || null,
        feesStatus || 'سدد', booksStatus || 'استلم', durationInGrade || 'سنة أولى (مستجد)'
      ]);

      // 2. Optionally update guardian and address information if provided
      if (guardianName || guardianNationalId || guardianPhone || address) {
        sqliteDb.run(`
          UPDATE students SET
            guardian_name = COALESCE(?, guardian_name),
            guardian_national_id = COALESCE(?, guardian_national_id),
            guardian_job = COALESCE(?, guardian_job),
            guardian_phone = COALESCE(?, guardian_phone),
            address = COALESCE(?, address)
          WHERE id = ?
        `, [
          guardianName || null,
          guardianNationalId || null,
          guardianJob || null,
          guardianPhone || null,
          address || null,
          studentId
        ]);
      }
    });

    db.flushSQLite();
    console.log(`[Transfers] Created transfer request for student ID ${studentId} -> ${toSchool}`);
    return res.status(201).json({ success: true, message: 'تم تسجيل طلب التحويل بنجاح.' });
  } catch (err) {
    console.error('[createTransfer error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/students/transfers/list ─────────────────────────────────────
const getTransfersList = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const sql = `
      SELECT 
        t.id, t.student_id, t.transfer_type,
        t.from_school, t.from_directorate, t.from_grade_id,
        t.to_school, t.to_directorate, t.to_grade_id,
        t.reason, t.transfer_date, t.is_completed, t.completed_date, t.notes, t.created_at,
        t.fees_status, t.books_status, t.duration_in_grade,
        s.full_name_ar, s.student_code, s.national_id, s.birth_date, s.gender, s.religion,
        COALESCE(NULLIF(s.guardian_name, ''), (CASE WHEN s.full_name_ar LIKE '% %' THEN SUBSTR(s.full_name_ar, INSTR(s.full_name_ar, ' ') + 1) ELSE 'ولي الأمر' END)) AS guardian_name,
        s.guardian_relation, s.guardian_national_id, s.guardian_job, s.guardian_phone, s.guardian_phone_2,
        s.address, s.status AS student_status, s.enrollment_status, s.class_id, s.student_serial_in_class,
        g.grade_name_ar, g.grade_number,
        c.class_name, c.class_number,
        ay.year_label
      FROM student_transfers t
      JOIN students s ON s.id = t.student_id
      LEFT JOIN grades_lookup g ON g.id = s.grade_id
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN academic_years ay ON ay.id = t.academic_year_id
      ORDER BY t.id DESC
    `;

    const rows = sqliteDb.exec(sql);
    if (!rows.length || !rows[0].values.length) {
      return res.json({ success: true, transfers: [] });
    }

    const cols = rows[0].columns;
    const transfers = rows[0].values.map(vals => {
      const obj = {};
      cols.forEach((col, idx) => {
        obj[col] = vals[idx];
      });
      return obj;
    });

    // Also get current institution settings from institution_config
    let inst = {};
    try {
      const instRows = sqliteDb.exec('SELECT school_name, governorate, directorate, logo_url FROM institution_config LIMIT 1');
      if (instRows.length && instRows[0].values.length) {
        inst = {
          schoolName: instRows[0].values[0][0],
          school_name: instRows[0].values[0][0],
          governorate: instRows[0].values[0][1],
          directorate: instRows[0].values[0][2],
          logoUrl: instRows[0].values[0][3]
        };
      }
    } catch (e) {}

    return res.json({ success: true, transfers, institution: inst });
  } catch (err) {
    console.error('[getTransfersList error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── PUT /api/students/transfers/:tid/complete ────────────────────────────
// تأكيد التحويل ونقل الطالب من سجل القيد (ترحيل)
const completeTransfer = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const tid = parseInt(req.params.tid || req.params.id, 10);
  const nowStr = new Date().toISOString().split('T')[0];

  try {
    const sqliteDb = db.getSQLiteDb();
    const tRows = sqliteDb.exec('SELECT student_id, to_school, transfer_type FROM student_transfers WHERE id = ?', [tid]);
    if (!tRows.length || !tRows[0].values.length) {
      return res.status(404).json({ success: false, error: 'طلب التحويل غير موجود.' });
    }

    const [studentId, toSchool, transferType] = tRows[0].values[0];

    db.runTransaction(() => {
      // 1. Mark transfer as completed
      sqliteDb.run(`
        UPDATE student_transfers SET
          is_completed = 1,
          completed_date = ?
        WHERE id = ?
      `, [nowStr, tid]);

      // 2. Transfer student out of active registry
      if (transferType === 'out') {
        sqliteDb.run(`
          UPDATE students SET
            status = 'transferred',
            enrollment_status = 'محول',
            is_excluded = 1,
            class_id = NULL
          WHERE id = ?
        `, [studentId]);
      } else if (transferType === 'in') {
        sqliteDb.run(`
          UPDATE students SET
            status = 'active',
            enrollment_status = 'مقيد',
            is_excluded = 0
          WHERE id = ?
        `, [studentId]);
      }
    });

    db.flushSQLite();
    console.log(`[Transfers] Completed transfer #${tid} for student #${studentId}`);
    return res.json({ success: true, message: 'تم تأكيد التحويل ونقل الطالب من سجل القيد بنجاح.' });
  } catch (err) {
    console.error('[completeTransfer error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── PUT /api/students/transfers/:tid/cancel ──────────────────────────────
// إلغاء التحويل وإعادة الطالب لسجل القيد مرة أخرى
const cancelTransfer = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const tid = parseInt(req.params.tid || req.params.id, 10);

  try {
    const sqliteDb = db.getSQLiteDb();
    const tRows = sqliteDb.exec('SELECT student_id, transfer_type FROM student_transfers WHERE id = ?', [tid]);
    if (!tRows.length || !tRows[0].values.length) {
      return res.status(404).json({ success: false, error: 'طلب التحويل غير موجود.' });
    }

    const [studentId, transferType] = tRows[0].values[0];

    db.runTransaction(() => {
      // 1. Mark transfer as pending / not completed
      sqliteDb.run(`
        UPDATE student_transfers SET
          is_completed = 0,
          completed_date = NULL
        WHERE id = ?
      `, [tid]);

      // 2. Restore student to active registry
      sqliteDb.run(`
        UPDATE students SET
          status = 'active',
          enrollment_status = 'مقيد',
          is_excluded = 0
        WHERE id = ?
      `, [studentId]);
    });

    db.flushSQLite();
    console.log(`[Transfers] Cancelled transfer #${tid}, restored student #${studentId} to active registry`);
    return res.json({ success: true, message: 'تم إلغاء التحويل وإعادة الطالب لسجل القيد بنجاح.' });
  } catch (err) {
    console.error('[cancelTransfer error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── DELETE /api/students/transfers/:tid ──────────────────────────────────
const deleteTransfer = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  const tid = parseInt(req.params.tid || req.params.id, 10);

  try {
    const sqliteDb = db.getSQLiteDb();
    sqliteDb.run('DELETE FROM student_transfers WHERE id = ?', [tid]);
    db.flushSQLite();
    return res.json({ success: true, message: 'تم حذف سجل التحويل بنجاح.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getDocumentTypes = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    _run(sqliteDb, `
      CREATE TABLE IF NOT EXISTS document_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );
      CREATE TABLE IF NOT EXISTS student_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        doc_type_id INTEGER,
        file_name TEXT,
        file_path TEXT,
        notes TEXT,
        uploaded_at TEXT DEFAULT (datetime('now')),
        verified_at TEXT
      );
    `);
    const types = _all(sqliteDb, `SELECT * FROM document_types ORDER BY id ASC`);
    return res.json({ success: true, types });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const addStudentDocument = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const studentId = Number(req.params.id);
    const { doc_type_id, doc_type_name, notes, file_name } = req.body;
    
    let docTypeId = doc_type_id;
    if (!docTypeId && doc_type_name) {
      const existing = _get(sqliteDb, `SELECT id FROM document_types WHERE name = ?`, [doc_type_name.trim()]);
      if (existing) {
        docTypeId = existing.id;
      } else {
        _run(sqliteDb, `INSERT INTO document_types (name) VALUES (?)`, [doc_type_name.trim()]);
        const created = _get(sqliteDb, `SELECT last_insert_rowid() as id`);
        docTypeId = created?.id;
      }
    }

    _run(sqliteDb, `
      INSERT INTO student_documents (student_id, doc_type_id, file_name, notes, uploaded_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `, [studentId, docTypeId || null, file_name || null, notes || null]);

    const docs = _all(sqliteDb, `
      SELECT sd.*, dt.name AS doc_type_name
      FROM student_documents sd
      LEFT JOIN document_types dt ON dt.id = sd.doc_type_id
      WHERE sd.student_id = ?
      ORDER BY sd.id DESC`, [studentId]);

    return res.json({ success: true, message: 'تم حفظ الوثيقة بنجاح.', documents: docs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const deleteStudentDocument = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const studentId = Number(req.params.id);
    const docId = Number(req.params.docId);
    _run(sqliteDb, `DELETE FROM student_documents WHERE id = ? AND student_id = ?`, [docId, studentId]);

    const docs = _all(sqliteDb, `
      SELECT sd.*, dt.name AS doc_type_name
      FROM student_documents sd
      LEFT JOIN document_types dt ON dt.id = sd.doc_type_id
      WHERE sd.student_id = ?
      ORDER BY sd.id DESC`, [studentId]);

    return res.json({ success: true, message: 'تم حذف الوثيقة بنجاح.', documents: docs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getRegister41Data = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const { gradeId, academicYearId } = req.query;

    let whereClause = "WHERE s.deleted_at IS NULL";
    const params = [];

    if (academicYearId) {
      whereClause += " AND s.academic_year_id = ?";
      params.push(Number(academicYearId));
    }
    if (gradeId) {
      whereClause += " AND s.grade_id = ?";
      params.push(Number(gradeId));
    } else {
      whereClause += " AND g.grade_number = 1";
    }

    whereClause += ` AND (s.enrollment_status IN ('new', 'promoted', 'مستجد', 'منقول')
      OR s.status IN ('new', 'promoted', 'مستجد', 'منقول', 'نشط', 'active')
      OR s.enrollment_status IS NULL
      OR s.enrollment_status = '')
      AND (s.enrollment_status NOT IN ('retained', 'باق', 'باق للإعادة', 'disconnected', 'منقطع', 'excluded', 'مستبعد')
      AND s.status NOT IN ('retained', 'باق', 'باق للإعادة', 'disconnected', 'منقطع', 'excluded', 'مستبعد'))`;

    const students = _all(sqliteDb, `
      SELECT
        s.id, s.student_code, s.full_name_ar, s.national_id, s.birth_date,
        s.gender, s.religion, s.enrollment_date, s.enrollment_status,
        s.guardian_name, s.guardian_relation, s.guardian_job, s.guardian_phone,
        s.guardian_national_id, s.address, s.is_merged, s.merge_type,
        g.grade_name_ar, g.grade_number,
        st.stage_name,
        c.class_name,
        ay.year_label AS academic_year
      FROM students s
      LEFT JOIN grades_lookup  g   ON g.id = s.grade_id
      LEFT JOIN stages_lookup  st  ON st.id = s.stage_id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.academic_year_id = s.academic_year_id
      LEFT JOIN classes        c   ON c.id = ce.class_id
      LEFT JOIN academic_years ay  ON ay.id = s.academic_year_id
      ${whereClause}
      ORDER BY s.full_name_ar ASC`, params);

    const currentYearRow = _get(sqliteDb, "SELECT year_label FROM academic_years WHERE is_current = 1 LIMIT 1") || _get(sqliteDb, "SELECT year_label FROM academic_years ORDER BY id DESC LIMIT 1");
    const activeYearLabel = currentYearRow?.year_label || '';

    const enriched = students.map((stu, idx) => {
      const yearForCalc = stu.academic_year || activeYearLabel || academicYearId;
      const age = calculateAgeOnOct1st(
        stu.birth_date || stu.national_id,
        yearForCalc,
        activeYearLabel
      );

      return {
        serial: idx + 1,
        ...stu,
        age_oct_years: age.years !== '' ? age.years : 0,
        age_oct_months: age.months !== '' ? age.months : 0,
        age_oct_days: age.days !== '' ? age.days : 0,
        fees_status: ''
      };
    });

    const school = getSchoolMasterInfo(sqliteDb);
    return res.json({ success: true, students: enriched, count: enriched.length, school, academicYear: activeYearLabel });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getOctoberCensusData = async (req, res) => {
  if (!db.isConfigured()) return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة.' });
  try {
    const sqliteDb = db.getSQLiteDb();
    const { academicYearId } = req.query;

    let yearId = academicYearId;
    if (!yearId) {
      const curYear = _get(sqliteDb, `SELECT id, year_label FROM academic_years WHERE is_current = 1 LIMIT 1`);
      yearId = curYear?.id || 1;
    }

    const currentYearInfo = _get(sqliteDb, `SELECT id, year_label FROM academic_years WHERE id = ?`, [yearId]);

    // 1. Detailed Class Rows
    const rows = _all(sqliteDb, `
      SELECT
        st.stage_name,
        g.id AS grade_id,
        g.grade_name_ar,
        g.grade_number,
        c.id AS class_id,
        c.class_name,
        COUNT(s.id) AS total_students,
        SUM(CASE WHEN s.gender = 'ذكر' OR s.gender = 'بنين' THEN 1 ELSE 0 END) AS boys_count,
        SUM(CASE WHEN s.gender = 'أنثى' OR s.gender = 'بنات' THEN 1 ELSE 0 END) AS girls_count,
        SUM(CASE WHEN s.religion LIKE '%مسلم%' OR s.religion = '1' THEN 1 ELSE 0 END) AS muslims_count,
        SUM(CASE WHEN s.religion LIKE '%مسيح%' OR s.religion = '2' THEN 1 ELSE 0 END) AS christians_count,
        SUM(CASE WHEN n.name = 'مصري' OR s.nationality_id = 1 OR s.nationality_id IS NULL THEN 1 ELSE 0 END) AS egyptian_count,
        SUM(CASE WHEN n.name IS NOT NULL AND n.name != 'مصري' AND s.nationality_id > 1 THEN 1 ELSE 0 END) AS foreign_count,
        SUM(CASE WHEN s.enrollment_status = 'new' OR s.status = 'مستجد' OR s.registration_status_id = 1 THEN 1 ELSE 0 END) AS new_count,
        SUM(CASE WHEN s.enrollment_status IN ('promoted', 'منقول', 'مقيد') OR s.status IN ('promoted', 'منقول', 'مقيد', 'نشط') OR s.registration_status_id = 2 OR (s.enrollment_status IS NULL AND (s.status IS NULL OR s.status = '')) THEN 1 ELSE 0 END) AS promoted_count,
        SUM(CASE WHEN s.enrollment_status IN ('retained', 'باق', 'باق للإعادة') OR s.status IN ('retained', 'باق', 'باق للإعادة') OR s.registration_status_id = 3 THEN 1 ELSE 0 END) AS retained_count,
        SUM(CASE WHEN s.enrollment_status IN ('disconnected', 'منقطع') OR s.status IN ('disconnected', 'منقطع') OR s.registration_status_id = 5 THEN 1 ELSE 0 END) AS disconnected_count,
        SUM(CASE WHEN s.is_merged = 1 THEN 1 ELSE 0 END) AS merged_count
      FROM students s
      JOIN grades_lookup g ON g.id = s.grade_id
      LEFT JOIN stages_lookup st ON st.id = s.stage_id
      LEFT JOIN nationalities n ON n.id = s.nationality_id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.academic_year_id = s.academic_year_id
      LEFT JOIN classes c ON c.id = ce.class_id
      WHERE s.deleted_at IS NULL AND (s.academic_year_id = ? OR ? IS NULL)
      GROUP BY g.id, c.id
      ORDER BY g.grade_number ASC, c.class_number ASC
    `, [yearId, yearId]);

    // 2. Grade & Stage Summary Rows
    const gradeSummaries = _all(sqliteDb, `
      SELECT
        st.stage_name,
        g.id AS grade_id,
        g.grade_name_ar,
        g.grade_number,
        COUNT(DISTINCT c.id) AS classes_count,
        COUNT(s.id) AS total_students,
        SUM(CASE WHEN s.gender = 'ذكر' OR s.gender = 'بنين' THEN 1 ELSE 0 END) AS boys_count,
        SUM(CASE WHEN s.gender = 'أنثى' OR s.gender = 'بنات' THEN 1 ELSE 0 END) AS girls_count,
        SUM(CASE WHEN s.religion LIKE '%مسلم%' OR s.religion = '1' THEN 1 ELSE 0 END) AS muslims_count,
        SUM(CASE WHEN s.religion LIKE '%مسيح%' OR s.religion = '2' THEN 1 ELSE 0 END) AS christians_count,
        SUM(CASE WHEN n.name = 'مصري' OR s.nationality_id = 1 OR s.nationality_id IS NULL THEN 1 ELSE 0 END) AS egyptian_count,
        SUM(CASE WHEN n.name IS NOT NULL AND n.name != 'مصري' AND s.nationality_id > 1 THEN 1 ELSE 0 END) AS foreign_count,
        SUM(CASE WHEN s.enrollment_status = 'new' OR s.status = 'مستجد' OR s.registration_status_id = 1 THEN 1 ELSE 0 END) AS new_count,
        SUM(CASE WHEN s.enrollment_status IN ('promoted', 'منقول', 'مقيد') OR s.status IN ('promoted', 'منقول', 'مقيد', 'نشط') OR s.registration_status_id = 2 OR (s.enrollment_status IS NULL AND (s.status IS NULL OR s.status = '')) THEN 1 ELSE 0 END) AS promoted_count,
        SUM(CASE WHEN s.enrollment_status IN ('retained', 'باق', 'باق للإعادة') OR s.status IN ('retained', 'باق', 'باق للإعادة') OR s.registration_status_id = 3 THEN 1 ELSE 0 END) AS retained_count,
        SUM(CASE WHEN s.enrollment_status IN ('disconnected', 'منقطع') OR s.status IN ('disconnected', 'منقطع') OR s.registration_status_id = 5 THEN 1 ELSE 0 END) AS disconnected_count,
        SUM(CASE WHEN s.is_merged = 1 THEN 1 ELSE 0 END) AS merged_count
      FROM students s
      JOIN grades_lookup g ON g.id = s.grade_id
      LEFT JOIN stages_lookup st ON st.id = s.stage_id
      LEFT JOIN nationalities n ON n.id = s.nationality_id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.academic_year_id = s.academic_year_id
      LEFT JOIN classes c ON c.id = ce.class_id
      WHERE s.deleted_at IS NULL AND (s.academic_year_id = ? OR ? IS NULL)
      GROUP BY g.id
      ORDER BY g.grade_number ASC
    `, [yearId, yearId]);

    const school = getSchoolMasterInfo(sqliteDb);
    return res.json({ success: true, rows, gradeSummaries, academicYear: currentYearInfo?.year_label || '', school });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Sibling & Twins Auto-Detection & Linking ──────────────────────────────
const getDetectedSiblings = (req, res) => {
  try {
    const sqliteDb = db.getSQLiteDb();
    const result = detectSiblingsAndTwins(sqliteDb);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ error: 'فشل اكتشاف الإخوة والتوائم: ' + err.message });
  }
};

const autoLinkSiblings = (req, res) => {
  try {
    const sqliteDb = db.getSQLiteDb();
    const { groupKeys } = req.body || {};
    const result = autoLinkSiblingsAndTwins(sqliteDb, groupKeys);
    db.flushSQLite();
    return res.json({ success: true, message: 'تم ربط الإخوة والتوائم بنجاح وتحديث السجلات', ...result });
  } catch (err) {
    return res.status(500).json({ error: 'فشل ربط الإخوة والتوائم: ' + err.message });
  }
};

module.exports = {
  createStudent,
  updateStudent,
  getStudent,
  getStudents,
  getFormOptions,
  getStats,
  createTransfer,
  completeTransfer,
  cancelTransfer,
  deleteTransfer,
  getTransfersList,
  exportExcelTemplate,
  exportGeneralCensusExcel,
  exportEnrollmentStatusCensusExcel,
  exportClassListExcel,
  exportFullClassListExcel,
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
  getRegisteredEmisCodes,
  emisSync,
  emisStatus,
  emisApprove,
  emisApproveAll,
  emisClearSession,
  getEmisConfig,
  updateEmisConfig,
  getEmisDiff,
  getAbsenceWarnings,
  recordStudentAbsence,
  getWeeklyClassAbsence,
  recordBulkWeeklyAbsence,
  updateStudentMergeInfo,
  generateSeatingNumbers,
  getSeatingLists,
  getDuplicateStudents,
  getClassesForExport,
  exportReportPdf,
  openInExcel,
  getDocumentTypes,
  addStudentDocument,
  deleteStudentDocument,
  getRegister41Data,
  getOctoberCensusData,
  getDetectedSiblings,
  autoLinkSiblings
};
