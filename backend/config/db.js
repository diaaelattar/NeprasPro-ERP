/**
 * db.js — NeprasPro Dual-Mode Database Manager
 * Supports: SQLite (sql.js / embedded) and PostgreSQL (network/LAN).
 *
 * IMPORTANT DESIGN RULE:
 * - sqliteDb and pgPool are ONLY set after an explicit initialization call.
 * - We do NOT auto-create any database on startup unless a saved config exists AND
 *   the database file is present on disk.
 * - This ensures isConfigured() accurately reflects whether setup was done.
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const CONFIG_DIR  = path.join(os.homedir(), '.nepraspro');
const CONFIG_FILE = path.join(CONFIG_DIR, 'db_config.json');

// Ensure the app data directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// ─── State ────────────────────────────────────────────────────────────────────
let dbMode      = null;   // 'sqlite' | 'postgres'
let sqliteDb    = null;   // sql.js Database instance (in-memory, backed by file)
let pgPool      = null;   // pg Pool instance
let currentConfig = null;
let SQL         = null;   // sql.js WASM engine (loaded once)

// ─── sql.js Engine ────────────────────────────────────────────────────────────
const loadSqlEngine = async () => {
  if (!SQL) {
    const initSqlJs = require('sql.js');
    SQL = await initSqlJs();
    console.log('[DB] sql.js WASM engine loaded.');
  }
  return SQL;
};

// ─── Internal: Open / Create SQLite DB from file ──────────────────────────────
const _openSQLite = async (dbPath) => {
  await loadSqlEngine();
  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    sqliteDb = new SQL.Database(buf);
    sqliteDb.run('PRAGMA foreign_keys = ON;');
    console.log(`[DB] SQLite loaded from file: ${dbPath} (${buf.length} bytes)`);
  } else {
    sqliteDb = new SQL.Database();
    sqliteDb.run('PRAGMA foreign_keys = ON;');
    console.log(`[DB] SQLite new empty in-memory database created (file: ${dbPath})`);
  }
  dbMode = 'sqlite';
};

// ─── Internal: Save current in-memory SQLite state to disk (Debounced for HDD Safety) ───
let _flushTimer = null;

const _flushSQLite = (immediate = false) => {
  if (!sqliteDb || !currentConfig || !currentConfig.dbPath) return;
  
  const doWrite = () => {
    try {
      const data = sqliteDb.export();
      fs.writeFileSync(currentConfig.dbPath, Buffer.from(data));
    } catch (e) {
      console.error('[DB Flush Error]:', e.message);
    }
  };

  if (immediate) {
    if (_flushTimer) clearTimeout(_flushTimer);
    _flushTimer = null;
    doWrite();
  } else {
    if (_flushTimer) clearTimeout(_flushTimer);
    _flushTimer = setTimeout(doWrite, 500); // 500ms debounce for disk writes
  }
};

// Ensure disk is 100% updated before process exits
process.on('beforeExit', () => _flushSQLite(true));
process.on('exit', () => _flushSQLite(true));

// ─── Internal: Schema Migration for SQLite ────────────────────────────────────
const _migrateSQLiteSchema = (dbInstance) => {
  try {
    // 1. First ensure columns from previous migrations exist
    const stmtInfo = dbInstance.prepare("PRAGMA table_info(students)");
    const cols = [];
    while (stmtInfo.step()) {
      cols.push(stmtInfo.getAsObject().name);
    }
    stmtInfo.free();

    if (!cols.includes('student_phone')) {
      dbInstance.run("ALTER TABLE students ADD COLUMN student_phone TEXT;");
      console.log("[DB Migration] Added student_phone to students table.");
    }
    if (!cols.includes('merge_type')) {
      dbInstance.run("ALTER TABLE students ADD COLUMN merge_type TEXT;");
      console.log("[DB Migration] Added merge_type to students table.");
    }
    if (!cols.includes('merge_decision_number')) {
      dbInstance.run("ALTER TABLE students ADD COLUMN merge_decision_number TEXT;");
      console.log("[DB Migration] Added merge_decision_number to students table.");
    }
    if (!cols.includes('merge_decision_date')) {
      dbInstance.run("ALTER TABLE students ADD COLUMN merge_decision_date TEXT;");
      console.log("[DB Migration] Added merge_decision_date to students table.");
    }

    // 2. Safely ensure students table has no legacy restrictive CHECK constraints
    const stmtMaster = dbInstance.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='students'");
    let tableSql = "";
    if (stmtMaster.step()) {
      tableSql = stmtMaster.getAsObject().sql || "";
    }
    stmtMaster.free();

    if (tableSql && (
      tableSql.includes("CHECK (status IN") ||
      tableSql.includes("CHECK(status IN") ||
      tableSql.includes("secondary_track IN") ||
      tableSql.includes("second_language IN")
    )) {
      console.log("[DB Migration] Recreating students table cleanly without legacy CHECK constraints...");
      
      const cleanStudentsSql = `
        CREATE TABLE IF NOT EXISTS students (
          id                    INTEGER PRIMARY KEY AUTOINCREMENT,
          section_id            INTEGER NOT NULL REFERENCES sections(id),
          stage_id              INTEGER NOT NULL REFERENCES stages_lookup(id),
          grade_id              INTEGER NOT NULL REFERENCES grades_lookup(id),
          academic_year_id      INTEGER NOT NULL REFERENCES academic_years(id),
          student_code          TEXT UNIQUE,
          full_name_ar          TEXT NOT NULL,
          full_name_en          TEXT,
          birth_date            TEXT,
          birth_place           TEXT,
          nationality_id        INTEGER REFERENCES nationalities(id),
          national_id           TEXT UNIQUE,
          gender                TEXT CHECK (gender IN ('ذكر', 'أنثى')),
          religion              TEXT CHECK (religion IN ('مسلم', 'مسيحي', 'أخرى')),
          guardian_name         TEXT,
          guardian_relation     TEXT,
          guardian_national_id  TEXT,
          guardian_phone        TEXT,
          guardian_phone_2      TEXT,
          guardian_job          TEXT,
          mother_name           TEXT,
          mother_nationality_id INTEGER REFERENCES nationalities(id),
          mother_national_id    TEXT,
          address               TEXT,
          student_phone         TEXT,
          second_language       TEXT,
          secondary_track       TEXT,
          secondary_elective    TEXT,
          is_merged             INTEGER DEFAULT 0,
          merged_grade_id       INTEGER REFERENCES grades_lookup(id),
          merge_type            TEXT,
          merge_decision_number TEXT,
          merge_decision_date   TEXT,
          merge_notes           TEXT,
          academic_system               TEXT,
          parent_staff_id               INTEGER,
          sibling_student_ids           TEXT,
          twin_student_id               INTEGER,
          is_talented                   INTEGER DEFAULT 0,
          talent_description            TEXT,
          is_returned_from_abroad       INTEGER DEFAULT 0,
          country_from                  TEXT,
          transferred_from_school       TEXT,
          transferred_from_directorate  TEXT,
          transferred_from_governorate  TEXT,
          enrollment_date       TEXT DEFAULT (date('now')),
          status                TEXT DEFAULT 'promoted',
          created_at            TEXT DEFAULT (datetime('now'))
        );
      `;

      dbInstance.run("PRAGMA foreign_keys=OFF;");
      dbInstance.run("ALTER TABLE students RENAME TO students_migration_backup;");
      dbInstance.run(cleanStudentsSql);

      const stmtCols = dbInstance.prepare("PRAGMA table_info(students_migration_backup)");
      const existingCols = [];
      while (stmtCols.step()) {
        existingCols.push(stmtCols.getAsObject().name);
      }
      stmtCols.free();

      const colList = existingCols.join(', ');
      dbInstance.run(`INSERT INTO students (${colList}) SELECT ${colList} FROM students_migration_backup;`);
      dbInstance.run("DROP TABLE students_migration_backup;");
      dbInstance.run("PRAGMA foreign_keys=ON;");
      console.log("[DB Migration] Clean students table migration complete.");
    }

    // 3. Ensure 'classes' table exists (for existing DBs created before this feature)
    const classesStmt = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='classes'");
    const classesExists = classesStmt.step();
    classesStmt.free();
    if (!classesExists) {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS classes (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          grade_id         INTEGER NOT NULL REFERENCES grades_lookup(id),
          academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),
          class_name       TEXT NOT NULL,
          class_code       TEXT,
          capacity         INTEGER DEFAULT 40,
          UNIQUE (grade_id, academic_year_id, class_name)
        );
      `);
      console.log('[DB Migration] Created classes table.');
    } else {
      try {
        const clsCols = [];
        const clsInfo = dbInstance.prepare("PRAGMA table_info(classes)");
        while (clsInfo.step()) clsCols.push(clsInfo.getAsObject().name);
        clsInfo.free();
        if (!clsCols.includes('class_code')) {
          dbInstance.run("ALTER TABLE classes ADD COLUMN class_code TEXT;");
          console.log('[DB Migration] Added class_code column to classes table.');
        }
      } catch (_) {}
    }

    // 4. Ensure 'class_enrollments' table exists
    const ceStmt = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='class_enrollments'");
    const ceExists = ceStmt.step();
    ceStmt.free();
    if (!ceExists) {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS class_enrollments (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id       INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          class_id         INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
          academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),
          enrolled_at      TEXT DEFAULT (datetime('now')),
          UNIQUE (student_id, academic_year_id)
        );
      `);
      console.log('[DB Migration] Created class_enrollments table.');
    }

    // 5. Ensure soft-delete columns exist on students
    const stmtInfo2 = dbInstance.prepare("PRAGMA table_info(students)");
    const cols2 = [];
    while (stmtInfo2.step()) cols2.push(stmtInfo2.getAsObject().name);
    stmtInfo2.free();

    if (!cols2.includes('is_deleted')) {
      dbInstance.run("ALTER TABLE students ADD COLUMN is_deleted INTEGER DEFAULT 0;");
      console.log("[DB Migration] Added is_deleted to students.");
    }
    if (!cols2.includes('deleted_at')) {
      dbInstance.run("ALTER TABLE students ADD COLUMN deleted_at TEXT;");
      console.log("[DB Migration] Added deleted_at to students.");
    }
    if (!cols2.includes('deletion_reason')) {
      dbInstance.run("ALTER TABLE students ADD COLUMN deletion_reason TEXT;");
      console.log("[DB Migration] Added deletion_reason to students.");
    }

    // 6. Ensure all optional & special-case columns exist on students
    const studentColsToAdd = [
      ['emis_student_code', 'TEXT'],
      ['enrollment_status', "TEXT DEFAULT 'منقول'"],
      ['is_excluded', 'INTEGER DEFAULT 0'],
      ['academic_system', 'TEXT'],
      ['parent_staff_id', 'INTEGER'],
      ['sibling_student_ids', 'TEXT'],
      ['twin_student_id', 'INTEGER'],
      ['is_talented', 'INTEGER DEFAULT 0'],
      ['talent_description', 'TEXT'],
      ['is_returned_from_abroad', 'INTEGER DEFAULT 0'],
      ['country_from', 'TEXT'],
      ['transferred_from_school', 'TEXT'],
      ['transferred_from_directorate', 'TEXT'],
      ['transferred_from_governorate', 'TEXT']
    ];

    studentColsToAdd.forEach(([col, type]) => {
      if (!cols2.includes(col)) {
        try {
          dbInstance.run(`ALTER TABLE students ADD COLUMN ${col} ${type};`);
          console.log(`[DB Migration] Added ${col} to students table.`);
        } catch (e) {}
      }
    });

    // Sync existing enrollment_status values
    dbInstance.run(`
      UPDATE students SET enrollment_status = CASE 
        WHEN status IN ('promoted', 'منقول') THEN 'منقول'
        WHEN status IN ('retained', 'باق') THEN 'باق'
        WHEN status IN ('disconnected', 'منقطع') THEN 'منقطع'
        WHEN status IN ('suspended', 'موقوف قيده') THEN 'موقوف قيده'
        WHEN status IN ('excluded', 'مستبعد') THEN 'مستبعد'
        ELSE 'منقول'
      END WHERE enrollment_status IS NULL OR enrollment_status = '';
    `);

    // Ensure new fields for Academic System, Parent Staff, Special Cases exist on students
    if (!cols2.includes('academic_system')) {
      dbInstance.run("ALTER TABLE students ADD COLUMN academic_system TEXT DEFAULT 'ثانوية عامة';");
      console.log("[DB Migration] Added academic_system to students.");
    }
    if (!cols2.includes('parent_staff_id')) {
      dbInstance.run("ALTER TABLE students ADD COLUMN parent_staff_id INTEGER;");
      console.log("[DB Migration] Added parent_staff_id to students.");
    }
    if (!cols2.includes('sibling_student_ids')) {
      dbInstance.run("ALTER TABLE students ADD COLUMN sibling_student_ids TEXT;");
      console.log("[DB Migration] Added sibling_student_ids to students.");
    }
    if (!cols2.includes('twin_student_id')) {
      dbInstance.run("ALTER TABLE students ADD COLUMN twin_student_id INTEGER;");
      console.log("[DB Migration] Added twin_student_id to students.");
    }
    if (!cols2.includes('is_talented')) {
      dbInstance.run("ALTER TABLE students ADD COLUMN is_talented INTEGER DEFAULT 0;");
      console.log("[DB Migration] Added is_talented to students.");
    }
    if (!cols2.includes('talent_description')) {
      dbInstance.run("ALTER TABLE students ADD COLUMN talent_description TEXT;");
      console.log("[DB Migration] Added talent_description to students.");
    }
    if (!cols2.includes('is_returned_from_abroad')) {
      dbInstance.run("ALTER TABLE students ADD COLUMN is_returned_from_abroad INTEGER DEFAULT 0;");
      console.log("[DB Migration] Added is_returned_from_abroad to students.");
    }
    if (!cols2.includes('country_from')) {
      dbInstance.run("ALTER TABLE students ADD COLUMN country_from TEXT;");
      console.log("[DB Migration] Added country_from to students.");
    }
    if (!cols2.includes('transferred_from_school')) {
      dbInstance.run("ALTER TABLE students ADD COLUMN transferred_from_school TEXT;");
      console.log("[DB Migration] Added transferred_from_school to students.");
    }
    if (!cols2.includes('transferred_from_directorate')) {
      dbInstance.run("ALTER TABLE students ADD COLUMN transferred_from_directorate TEXT;");
      console.log("[DB Migration] Added transferred_from_directorate to students.");
    }
    if (!cols2.includes('transferred_from_governorate')) {
      dbInstance.run("ALTER TABLE students ADD COLUMN transferred_from_governorate TEXT;");
      console.log("[DB Migration] Added transferred_from_governorate to students.");
    }

    // Ensure special_needs_lookup table exists
    const snStmt = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='special_needs_lookup'");
    const snExists = snStmt.step();
    snStmt.free();
    if (!snExists) {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS special_needs_lookup (
          id       INTEGER PRIMARY KEY AUTOINCREMENT,
          name_ar  TEXT UNIQUE NOT NULL
        );
      `);
      const defaultNeeds = [
        'دمج حركي (إعاقة حركية)',
        'دمج بصري (ضعف بصر)',
        'دمج بصري (كف بصر)',
        'دمج سمعي (ضعف سمع)',
        'دمج سمعي (زارع قوقعة)',
        'دمج ذهني (إعاقة ذهنية بسيطة)',
        'طيف التوحد (أوتيزم)',
        'متلازمة داون',
        'صعوبات التعلم',
        'بطء التعلم',
        'تشتت الانتباه وفرط الحركة (ADHD)'
      ];
      for (const sn of defaultNeeds) {
        dbInstance.run('INSERT OR IGNORE INTO special_needs_lookup (name_ar) VALUES (?)', [sn]);
      }
      console.log('[DB Migration] Created special_needs_lookup table and seeded defaults.');
    }

    // 7. Ensure emis_sync_log table exists
    const emisStmt = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='emis_sync_log'");
    const emisExists = emisStmt.step();
    emisStmt.free();
    if (!emisExists) {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS emis_sync_log (
          id                  INTEGER PRIMARY KEY AUTOINCREMENT,
          emis_code           TEXT,
          national_id         TEXT,
          full_name_ar        TEXT,
          grade_name          TEXT,
          section_name        TEXT,
          sync_status         TEXT DEFAULT 'pending',
          conflict_fields     TEXT,
          raw_data            TEXT,
          nepras_student_id   INTEGER,
          created_at          TEXT DEFAULT (datetime('now')),
          updated_at          TEXT DEFAULT (datetime('now'))
        );
      `);
      console.log('[DB Migration] Created emis_sync_log table.');
    }

    // 8. Ensure special case tables exist
    const sctStmt = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='special_case_types'");
    const sctExists = sctStmt.step();
    sctStmt.free();
    if (!sctExists) {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS special_case_types (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          name_ar     TEXT UNIQUE NOT NULL,
          type_code   TEXT UNIQUE NOT NULL
        );
      `);
      console.log('[DB Migration] Created special_case_types table.');

      // Seed default types
      const types = [
        ['دمج', 'merged'],
        ['يتيم', 'orphan'],
        ['توأم / إخوة', 'twin'],
        ['منقطع', 'discontinued'],
        ['وافد', 'foreigner']
      ];
      for (const t of types) {
        dbInstance.run('INSERT OR IGNORE INTO special_case_types (name_ar, type_code) VALUES (?, ?)', t);
      }
    }

    const sscStmt = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='student_special_cases'");
    const sscExists = sscStmt.step();
    sscStmt.free();
    if (!sscExists) {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS student_special_cases (
          student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          case_type_id INTEGER NOT NULL REFERENCES special_case_types(id) ON DELETE CASCADE,
          PRIMARY KEY (student_id, case_type_id)
        );
      `);
      console.log('[DB Migration] Created student_special_cases table.');
    }

    // 9. Ensure student_transfers table exists
    const trStmt = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='student_transfers'");
    const trExists = trStmt.step();
    trStmt.free();
    if (!trExists) {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS student_transfers (
          id                INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id        INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          academic_year_id  INTEGER REFERENCES academic_years(id),
          transfer_type     TEXT CHECK (transfer_type IN ('in', 'out')),
          from_school       TEXT,
          from_directorate  TEXT,
          to_school         TEXT,
          to_directorate    TEXT,
          reason            TEXT,
          transfer_date     TEXT NOT NULL,
          notes             TEXT,
          is_completed      INTEGER DEFAULT 0,
          completed_date    TEXT,
          created_at        TEXT DEFAULT (datetime('now'))
        );
      `);
      console.log('[DB Migration] Created student_transfers table.');
    }

    // 10. Ensure institution_config has the new school settings columns
    const instStmt = dbInstance.prepare("PRAGMA table_info(institution_config)");
    const instCols = [];
    while (instStmt.step()) instCols.push(instStmt.getAsObject().name);
    instStmt.free();

    if (!instCols.includes('education_type')) {
      dbInstance.run("ALTER TABLE institution_config ADD COLUMN education_type TEXT;");
      console.log("[DB Migration] Added education_type to institution_config.");
    }
    if (!instCols.includes('director_name')) {
      dbInstance.run("ALTER TABLE institution_config ADD COLUMN director_name TEXT;");
      console.log("[DB Migration] Added director_name to institution_config.");
    }
    if (!instCols.includes('director_qualification')) {
      dbInstance.run("ALTER TABLE institution_config ADD COLUMN director_qualification TEXT;");
      console.log("[DB Migration] Added director_qualification to institution_config.");
    }
    if (!instCols.includes('director_national_id')) {
      dbInstance.run("ALTER TABLE institution_config ADD COLUMN director_national_id TEXT;");
      console.log("[DB Migration] Added director_national_id to institution_config.");
    }
    if (!instCols.includes('director_phone')) {
      dbInstance.run("ALTER TABLE institution_config ADD COLUMN director_phone TEXT;");
      console.log("[DB Migration] Added director_phone to institution_config.");
    }
    if (!instCols.includes('sections_count')) {
      dbInstance.run("ALTER TABLE institution_config ADD COLUMN sections_count INTEGER;");
      console.log("[DB Migration] Added sections_count to institution_config.");
    }
    if (!instCols.includes('stages_count')) {
      dbInstance.run("ALTER TABLE institution_config ADD COLUMN stages_count INTEGER;");
      console.log("[DB Migration] Added stages_count to institution_config.");
    }
    if (!instCols.includes('has_multiple_sections')) {
      dbInstance.run("ALTER TABLE institution_config ADD COLUMN has_multiple_sections INTEGER DEFAULT 0;");
      console.log("[DB Migration] Added has_multiple_sections to institution_config.");
    }
    if (!instCols.includes('school_name_en')) {
      dbInstance.run("ALTER TABLE institution_config ADD COLUMN school_name_en TEXT;");
      console.log("[DB Migration] Added school_name_en to institution_config.");
    }
    if (!instCols.includes('website')) {
      dbInstance.run("ALTER TABLE institution_config ADD COLUMN website TEXT;");
      console.log("[DB Migration] Added website to institution_config.");
    }

    // 11. Ensure stages_lookup and sections have leadership columns
    const secStmt = dbInstance.prepare("PRAGMA table_info(sections)");
    const secCols = [];
    while (secStmt.step()) secCols.push(secStmt.getAsObject().name);
    secStmt.free();

    const secAddCols = [
      ['section_director_name', 'TEXT'],
      ['section_director_qualification', 'TEXT'],
      ['section_director_national_id', 'TEXT'],
      ['section_director_phone', 'TEXT'],
      ['section_deputy_name', 'TEXT'],
      ['section_deputy_phone', 'TEXT'],
      ['students_vice_name', 'TEXT'],
      ['students_vice_phone', 'TEXT'],
      ['staff_vice_name', 'TEXT'],
      ['staff_vice_phone', 'TEXT'],
    ];

    secAddCols.forEach(([col, type]) => {
      if (!secCols.includes(col)) {
        dbInstance.run(`ALTER TABLE sections ADD COLUMN ${col} ${type};`);
        console.log(`[DB Migration] Added ${col} to sections.`);
      }
    });

    const stageStmt = dbInstance.prepare("PRAGMA table_info(stages_lookup)");
    const stageCols = [];
    while (stageStmt.step()) stageCols.push(stageStmt.getAsObject().name);
    stageStmt.free();

    const stageAddCols = [
      ['stage_code', 'TEXT'],
      ['stage_director_name', 'TEXT'],
      ['stage_director_qualification', 'TEXT'],
      ['stage_director_national_id', 'TEXT'],
      ['stage_director_phone', 'TEXT'],
      ['stage_deputy_name', 'TEXT'],
      ['stage_deputy_phone', 'TEXT'],
      ['stage_students_vice_name', 'TEXT'],
      ['stage_students_vice_phone', 'TEXT'],
      ['stage_staff_vice_name', 'TEXT'],
      ['stage_staff_vice_phone', 'TEXT'],
    ];

    stageAddCols.forEach(([col, type]) => {
      if (!stageCols.includes(col)) {
        dbInstance.run(`ALTER TABLE stages_lookup ADD COLUMN ${col} ${type};`);
        console.log(`[DB Migration] Added ${col} to stages_lookup.`);
      }
    });

    // Ensure staff table exists in SQLite
    const staffStmt = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='staff'");
    const staffExists = staffStmt.step();
    staffStmt.free();
    if (!staffExists) {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS staff (
          id                  INTEGER PRIMARY KEY AUTOINCREMENT,
          full_name_ar        TEXT,
          national_id         TEXT UNIQUE NOT NULL,
          first_name          TEXT NOT NULL,
          middle_name         TEXT,
          last_name           TEXT NOT NULL,
          gender              TEXT CHECK (gender IN ('ذكر','أنثى')),
          birth_date          TEXT,
          birth_place         TEXT,
          religion            TEXT,
          marital_status      TEXT,
          marital_status_date TEXT,
          address             TEXT,
          address_gov         TEXT,
          phone               TEXT,
          phone_land          TEXT,
          email               TEXT,
          hire_date           TEXT,
          work_start_date     TEXT,
          hire_type           TEXT,
          job_class           TEXT,
          title               TEXT,
          qualification_type  TEXT,
          qualification       TEXT,
          qualification_entity TEXT,
          qualification_date  TEXT,
          teaching_stage      TEXT,
          subject             TEXT,
          org_name            TEXT,
          employment_type     TEXT DEFAULT 'قوة أساسية',
          staff_category      TEXT DEFAULT 'معلم',
          cadre_title         TEXT,
          financial_grade     TEXT,
          cadre_date          TEXT,
          base_salary         REAL DEFAULT 0,
          status              TEXT DEFAULT 'نشط',
          notes               TEXT,
          created_at          TEXT DEFAULT (datetime('now'))
        );
      `);
      console.log('[DB Migration] Created staff table.');
    } else {
      const infoStmt = dbInstance.prepare("PRAGMA table_info(staff)");
      const existingCols = [];
      while (infoStmt.step()) existingCols.push(infoStmt.getAsObject().name);
      infoStmt.free();

      const newCols = [
        ['birth_place', 'TEXT'],
        ['marital_status_date', 'TEXT'],
        ['address_gov', 'TEXT'],
        ['phone_land', 'TEXT'],
        ['work_start_date', 'TEXT'],
        ['hire_type', 'TEXT'],
        ['job_class', 'TEXT'],
        ['qualification_type', 'TEXT'],
        ['qualification_entity', 'TEXT'],
        ['qualification_date', 'TEXT'],
        ['teaching_stage', 'TEXT'],
        ['subject', 'TEXT'],
        ['org_name', 'TEXT'],
        ['full_name_ar', 'TEXT'],
        ['employment_type', 'TEXT'],
        ['staff_category', 'TEXT'],
        ['cadre_title', 'TEXT'],
        ['financial_grade', 'TEXT'],
        ['cadre_date', 'TEXT'],
        ['is_supervisor', 'INTEGER DEFAULT 0']
      ];

      newCols.forEach(([col, type]) => {
        if (!existingCols.includes(col)) {
          dbInstance.run(`ALTER TABLE staff ADD COLUMN ${col} ${type};`);
          console.log(`[DB Migration] Added ${col} to staff table.`);
        }
      });
    }

    // 12. Create staff_leaves table
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS staff_leaves (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id            INTEGER NOT NULL,
        leave_type          TEXT NOT NULL,
        start_date          TEXT NOT NULL,
        end_date            TEXT NOT NULL,
        days_count          INTEGER NOT NULL,
        reason              TEXT,
        approval_status     TEXT DEFAULT 'مقبول',
        created_at          TEXT DEFAULT (datetime('now'))
      );
    `);

    // 13. Create student_absence_records table
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS student_absence_records (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id          INTEGER NOT NULL,
        absence_date        TEXT NOT NULL,
        absence_type        TEXT DEFAULT 'بدون عذر',
        notes               TEXT,
        created_at          TEXT DEFAULT (datetime('now'))
      );
    `);

    // 14. Create Egyptian Control Room & Exams tables
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS control_students (
        id                    INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id            INTEGER REFERENCES students(id) ON DELETE CASCADE,
        national_id           TEXT UNIQUE NOT NULL, /* DEPRECATED */
        grade_id              INTEGER REFERENCES grades_lookup(id),
        seat_number           INTEGER,
        secret_code_term1     INTEGER,
        secret_code_term2     INTEGER,
        secret_group_term1    TEXT,
        secret_group_term2    TEXT,
        second_language       TEXT,
        inclusion_status      TEXT,
        education_type        TEXT DEFAULT 'نظامي',
        committee_id          INTEGER,
        notes                 TEXT,
        synced_at             TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS control_committees (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        committee_name   TEXT NOT NULL,
        building_name    TEXT DEFAULT 'المبنى الرئيسي',
        room_number      TEXT,
        max_capacity     INTEGER DEFAULT 20,
        grade_id         INTEGER REFERENCES grades_lookup(id),
        academic_year_id INTEGER REFERENCES academic_years(id)
      );

      CREATE TABLE IF NOT EXISTS exam_subjects (
        id                 INTEGER PRIMARY KEY AUTOINCREMENT,
        grade_id           INTEGER NOT NULL REFERENCES grades_lookup(id),
        subject_name_ar    TEXT NOT NULL,
        subject_name_en    TEXT,
        term1_work_mark    REAL DEFAULT 15,
        term1_exam_mark    REAL DEFAULT 35,
        term1_max_mark     REAL DEFAULT 50,
        term2_work_mark    REAL DEFAULT 15,
        term2_exam_mark    REAL DEFAULT 35,
        term2_max_mark     REAL DEFAULT 50,
        year_max_mark      REAL DEFAULT 100,
        pass_mark          REAL DEFAULT 50,
        is_added_to_total  INTEGER DEFAULT 1,
        is_failing_subject INTEGER DEFAULT 1,
        sort_order         INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS control_marks (
        id                 INTEGER PRIMARY KEY AUTOINCREMENT,
        control_student_id INTEGER NOT NULL REFERENCES control_students(id) ON DELETE CASCADE,
        subject_id         INTEGER NOT NULL REFERENCES exam_subjects(id) ON DELETE CASCADE,
        academic_year_id   INTEGER NOT NULL REFERENCES academic_years(id),
        term               INTEGER NOT NULL CHECK (term IN (1, 2)),
        work_marks         REAL DEFAULT 0,
        practical_marks    REAL DEFAULT 0,
        written_marks      REAL DEFAULT 0,
        total_marks        REAL DEFAULT 0,
        is_absent          INTEGER DEFAULT 0,
        is_exempt          INTEGER DEFAULT 0,
        updated_at         TEXT DEFAULT (datetime('now')),
        UNIQUE(control_student_id, subject_id, academic_year_id, term)
      );

      CREATE TABLE IF NOT EXISTS control_results_summary (
        id                     INTEGER PRIMARY KEY AUTOINCREMENT,
        control_student_id     INTEGER NOT NULL REFERENCES control_students(id) ON DELETE CASCADE,
        academic_year_id       INTEGER NOT NULL REFERENCES academic_years(id),
        term1_total            REAL DEFAULT 0,
        term2_total            REAL DEFAULT 0,
        year_total             REAL DEFAULT 0,
        max_possible_marks     REAL DEFAULT 0,
        percentage             REAL DEFAULT 0,
        grade_label            TEXT,
        status_term1           TEXT DEFAULT 'ناجح',
        status_final           TEXT DEFAULT 'ناجح',
        second_round_subjects  TEXT,
        is_locked              INTEGER DEFAULT 0,
        created_at             TEXT DEFAULT (datetime('now')),
        UNIQUE(control_student_id, academic_year_id)
      );

      CREATE TABLE IF NOT EXISTS control_security_log (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name    TEXT,
        action_type  TEXT NOT NULL,
        details      TEXT,
        created_at   TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS settings_audit_log (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_area TEXT NOT NULL,
        setting_key  TEXT,
        old_value    TEXT,
        new_value    TEXT,
        changed_by   TEXT DEFAULT 'admin',
        created_at   TEXT DEFAULT (datetime('now'))
      );
    `);

    // Ensure all columns exist in control_marks for older databases
    const cmStmt = dbInstance.prepare("PRAGMA table_info(control_marks)");
    const cmCols = [];
    while (cmStmt.step()) cmCols.push(cmStmt.getAsObject().name);
    cmStmt.free();

    const cmAddCols = [
      ['work_marks', 'REAL DEFAULT 0'],
      ['practical_marks', 'REAL DEFAULT 0'],
      ['written_marks', 'REAL DEFAULT 0'],
      ['total_marks', 'REAL DEFAULT 0'],
      ['is_absent', 'INTEGER DEFAULT 0'],
      ['is_exempt', 'INTEGER DEFAULT 0'],
      ['initial_exam_status', "TEXT"],
      ['final_exam_status', "TEXT"]
    ];

    cmAddCols.forEach(([col, type]) => {
      if (!cmCols.includes(col)) {
        try {
          dbInstance.run(`ALTER TABLE control_marks ADD COLUMN ${col} ${type};`);
          console.log(`[DB Migration] Added ${col} to control_marks table.`);
        } catch (e) {}
      }
    });


    // Ensure enrollment_status exists in students table
    const stStmt = dbInstance.prepare("PRAGMA table_info(students)");
    const stCols = [];
    while (stStmt.step()) stCols.push(stStmt.getAsObject().name);
    stStmt.free();

    if (!stCols.includes('enrollment_status')) {
      try {
        dbInstance.run("ALTER TABLE students ADD COLUMN enrollment_status TEXT;");
        console.log("[DB Migration] Added enrollment_status to students table.");
      } catch (e) {}
    }

    // Ensure all relational columns exist in control_students (for DBs created before migration)
    const csStmt = dbInstance.prepare("PRAGMA table_info(control_students)");
    const csCols = [];
    while (csStmt.step()) csCols.push(csStmt.getAsObject().name);
    csStmt.free();

    const csAddCols = [
      ['grade_id', 'INTEGER REFERENCES grades_lookup(id)'],
      ['secret_group_term1', 'TEXT'],
      ['secret_group_term2', 'TEXT'],
      ['committee_id', 'INTEGER REFERENCES control_committees(id)'],
      ['second_language', 'TEXT'],
      ['inclusion_status', 'TEXT'],
      ['education_type', "TEXT DEFAULT 'نظامي'"],
      ['notes', 'TEXT'],
      ['attendance_percent', 'REAL DEFAULT 100.0'],
      ['manual_attendance_percent', 'REAL DEFAULT NULL'],
      ['synced_at', "TEXT DEFAULT (datetime('now'))"]
    ];

    csAddCols.forEach(([col, type]) => {
      if (!csCols.includes(col)) {
        try {
          dbInstance.run(`ALTER TABLE control_students ADD COLUMN ${col} ${type};`);
          console.log(`[DB Migration] Added ${col} to control_students table.`);
        } catch (e) {}
      }
    });

    // Ensure all relational columns exist in control_committees
    const ccStmt = dbInstance.prepare("PRAGMA table_info(control_committees)");
    const ccCols = [];
    while (ccStmt.step()) ccCols.push(ccStmt.getAsObject().name);
    ccStmt.free();

    const ccAddCols = [
      ['building_name', "TEXT DEFAULT 'المبنى الرئيسي'"],
      ['room_number', 'TEXT'],
      ['max_capacity', 'INTEGER DEFAULT 20'],
      ['grade_id', 'INTEGER REFERENCES grades_lookup(id)'],
      ['academic_year_id', 'INTEGER REFERENCES academic_years(id)']
    ];

    ccAddCols.forEach(([col, type]) => {
      if (!ccCols.includes(col)) {
        try {
          dbInstance.run(`ALTER TABLE control_committees ADD COLUMN ${col} ${type};`);
          console.log(`[DB Migration] Added ${col} to control_committees table.`);
        } catch (e) {}
      }
    });

    // Ensure all relational columns exist in exam_subjects
    const esStmt = dbInstance.prepare("PRAGMA table_info(exam_subjects)");
    const esCols = [];
    while (esStmt.step()) esCols.push(esStmt.getAsObject().name);
    esStmt.free();

    const esAddCols = [
      ['term1_work_mark', 'REAL DEFAULT 15'],
      ['term1_exam_mark', 'REAL DEFAULT 35'],
      ['term1_max_mark', 'REAL DEFAULT 50'],
      ['term2_work_mark', 'REAL DEFAULT 15'],
      ['term2_exam_mark', 'REAL DEFAULT 35'],
      ['term2_max_mark', 'REAL DEFAULT 50'],
      ['year_max_mark', 'REAL DEFAULT 100'],
      ['pass_mark', 'REAL DEFAULT 50'],
      ['written_pass_mark', 'REAL DEFAULT 0'],
      ['written_pass_mode', "TEXT DEFAULT 'none'"],
      ['subject_code', 'TEXT'],
      ['term1_practical_mark', 'REAL DEFAULT 0'],
      ['term2_practical_mark', 'REAL DEFAULT 0'],
      ['subject_category', "TEXT DEFAULT 'أساسية'"],
      ['actual_converted_mark', 'REAL DEFAULT 0'],
      ['subject_pass_percent', 'REAL DEFAULT 50.0'],
      ['is_added_to_total', 'INTEGER DEFAULT 1'],
      ['is_failing_subject', 'INTEGER DEFAULT 1'],
      ['is_activity_subject', 'INTEGER DEFAULT 0']
    ];

    esAddCols.forEach(([col, type]) => {
      if (!esCols.includes(col)) {
        try {
          dbInstance.run(`ALTER TABLE exam_subjects ADD COLUMN ${col} ${type};`);
          console.log(`[DB Migration] Added ${col} to exam_subjects table.`);
        } catch (e) {}
      }
    });

    // Create Master Subjects Lookup Table
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS master_subjects (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_code     TEXT UNIQUE NOT NULL,
        subject_name_ar  TEXT NOT NULL,
        subject_name_en  TEXT,
        category         TEXT DEFAULT 'أساسية',
        created_at       TEXT DEFAULT (datetime('now'))
      );
    `);

    // Seed Standard Master Subjects if empty
    const stmtCount = dbInstance.prepare("SELECT COUNT(*) AS cnt FROM master_subjects");
    let mSubjCount = 0;
    if (stmtCount.step()) mSubjCount = stmtCount.getAsObject().cnt || 0;
    stmtCount.free();

    if (mSubjCount === 0) {
      const defaultMasterSubjects = [
        ['SUBJ_AR', 'اللغة العربية', 'Arabic', 'أساسية'],
        ['SUBJ_EN', 'اللغة الإنجليزية', 'English', 'أساسية'],
        ['SUBJ_FR', 'اللغة الفرنسية', 'French', 'أساسية'],
        ['SUBJ_MATH', 'الرياضيات', 'Mathematics', 'أساسية'],
        ['SUBJ_SCI', 'العلوم', 'Science', 'أساسية'],
        ['SUBJ_SOC', 'الدراسات الاجتماعية', 'Social Studies', 'أساسية'],
        ['SUBJ_REL', 'التربية الدينية', 'Religious Education', 'دينية'],
        ['SUBJ_COMP', 'الحاسب الآلي وتكنولوجيا المعلومات', 'Computer & ICT', 'نشاط'],
        ['SUBJ_ART', 'التربية الفنية', 'Art Education', 'نشاط'],
        ['SUBJ_MUS', 'التربية الموسيقية', 'Music Education', 'نشاط'],
        ['SUBJ_PE', 'التربية الرياضية', 'Physical Education', 'نشاط'],
        ['SUBJ_CIV', 'التربية الوطنية', 'Civics', 'نشاط'],
        ['SUBJ_PHYS', 'الفيزياء', 'Physics', 'أساسية'],
        ['SUBJ_CHEM', 'الكيمياء', 'Chemistry', 'أساسية'],
        ['SUBJ_BIO', 'الأحياء', 'Biology', 'أساسية'],
        ['SUBJ_HIST', 'التاريخ', 'History', 'أساسية'],
        ['SUBJ_GEO', 'الجغرافيا', 'Geography', 'أساسية'],
        ['SUBJ_PHIL', 'الفلسفة والمنطق', 'Philosophy', 'أساسية']
      ];
      defaultMasterSubjects.forEach(([code, nameAr, nameEn, cat]) => {
        try {
          dbInstance.run("INSERT OR IGNORE INTO master_subjects (subject_code, subject_name_ar, subject_name_en, category) VALUES (?, ?, ?, ?)", [code, nameAr, nameEn, cat]);
        } catch (e) {}
      });
    }

    // Purge any old Islamic/Christian religion subjects and unify into single التربية الدينية
    try {
      dbInstance.run("DELETE FROM master_subjects WHERE subject_code IN ('SUBJ_REL_ISLAM', 'SUBJ_REL_CHRIST') OR subject_name_ar LIKE '%الإسلامية%' OR subject_name_ar LIKE '%المسيحية%';");
      dbInstance.run("INSERT OR IGNORE INTO master_subjects (subject_code, subject_name_ar, subject_name_en, category) VALUES ('SUBJ_REL', 'التربية الدينية', 'Religious Education', 'دينية');");
    } catch (e) {}

    // Create Grade General Passing Rules Table
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS grade_passing_rules (
        id                          INTEGER PRIMARY KEY AUTOINCREMENT,
        grade_id                    INTEGER NOT NULL UNIQUE REFERENCES grades_lookup(id),
        is_enabled                  INTEGER DEFAULT 1,
        enable_attendance_rule      INTEGER DEFAULT 1,
        enable_written_rule         INTEGER DEFAULT 1,
        enable_second_round_rule    INTEGER DEFAULT 1,
        enable_grace_rule           INTEGER DEFAULT 1,
        min_attendance_percent      REAL DEFAULT 85.0,
        written_pass_percent        REAL DEFAULT 30.0,
        max_failing_second_round    INTEGER DEFAULT 2,
        grace_marks_pool            REAL DEFAULT 5.0,
        updated_at                  TEXT DEFAULT (datetime('now'))
      );
    `);
    const gprStmt = dbInstance.prepare("PRAGMA table_info(grade_passing_rules)");
    const gprCols = [];
    while (gprStmt.step()) gprCols.push(gprStmt.getAsObject().name);
    gprStmt.free();

    const gprAddCols = [
      ['is_enabled', 'INTEGER DEFAULT 1'],
      ['enable_attendance_rule', 'INTEGER DEFAULT 1'],
      ['enable_written_rule', 'INTEGER DEFAULT 1'],
      ['enable_second_round_rule', 'INTEGER DEFAULT 1'],
      ['enable_grace_rule', 'INTEGER DEFAULT 1'],
      ['min_attendance_percent', 'REAL DEFAULT 85.0'],
      ['written_pass_percent', 'REAL DEFAULT 30.0'],
      ['max_failing_second_round', 'INTEGER DEFAULT 2'],
      ['grace_marks_pool', 'REAL DEFAULT 5.0']
    ];

    gprAddCols.forEach(([col, type]) => {
      if (!gprCols.includes(col)) {
        try {
          dbInstance.run(`ALTER TABLE grade_passing_rules ADD COLUMN ${col} ${type};`);
        } catch (e) {}
      }
    });

    // Create Default Program Preset Templates Table
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS default_grade_templates (
        id                 INTEGER PRIMARY KEY AUTOINCREMENT,
        grade_id           INTEGER REFERENCES grades_lookup(id),
        template_name      TEXT DEFAULT 'أصل البرنامج الأكاديمي',
        subjects_json      TEXT,
        passing_rules_json TEXT,
        updated_at         TEXT DEFAULT (datetime('now'))
      );
    `);

    // Ensure all relational columns exist in control_committees
    const commStmt = dbInstance.prepare("PRAGMA table_info(control_committees)");
    const commCols = [];
    while (commStmt.step()) commCols.push(commStmt.getAsObject().name);
    commStmt.free();

    const commAddCols = [
      ['building_name', "TEXT DEFAULT 'المبنى الرئيسي'"],
      ['room_number', 'TEXT'],
      ['max_capacity', 'INTEGER DEFAULT 20'],
      ['grade_id', 'INTEGER REFERENCES grades_lookup(id)'],
      ['academic_year_id', 'INTEGER REFERENCES academic_years(id)']
    ];

    commAddCols.forEach(([col, type]) => {
      if (!commCols.includes(col)) {
        try {
          dbInstance.run(`ALTER TABLE control_committees ADD COLUMN ${col} ${type};`);
          console.log(`[DB Migration] Added ${col} to control_committees table.`);
        } catch (e) {}
      }
    });

    console.log('[DB Migration] Full Egyptian Control Room & Exams tables initialized and validated.');

    // 15. Create Database Indexes for high performance
    dbInstance.run(`
      CREATE INDEX IF NOT EXISTS idx_control_students_grade ON control_students(grade_id);
      CREATE INDEX IF NOT EXISTS idx_exam_subjects_grade ON exam_subjects(grade_id);
      CREATE INDEX IF NOT EXISTS idx_control_students_seat ON control_students(seat_number);
      CREATE INDEX IF NOT EXISTS idx_control_students_sec1 ON control_students(secret_code_term1);
      CREATE INDEX IF NOT EXISTS idx_control_students_sec2 ON control_students(secret_code_term2);
      CREATE INDEX IF NOT EXISTS idx_control_marks_student ON control_marks(control_student_id);
      CREATE INDEX IF NOT EXISTS idx_control_marks_subject ON control_marks(subject_id);
      CREATE INDEX IF NOT EXISTS idx_control_marks_year_term ON control_marks(academic_year_id, term);
      CREATE INDEX IF NOT EXISTS idx_students_national_id ON students(national_id);
      CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade_id);
      CREATE INDEX IF NOT EXISTS idx_class_enrollments_student ON class_enrollments(student_id);
    `);
    console.log('[DB Migration] High-performance indexes verified.');

    // 16. Full Relational Architecture & Financial Module Tables
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS fee_structures (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        grade_id         INTEGER NOT NULL REFERENCES grades_lookup(id),
        academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),
        fee_name         TEXT NOT NULL,
        amount           REAL NOT NULL,
        due_date         TEXT,
        created_at       TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS student_payments (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id       INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        fee_structure_id INTEGER REFERENCES fee_structures(id),
        academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),
        receipt_number   TEXT UNIQUE NOT NULL,
        amount_paid      REAL NOT NULL,
        payment_method   TEXT DEFAULT 'نقدي',
        payment_date     TEXT DEFAULT (datetime('now')),
        received_by      INTEGER REFERENCES users(id),
        notes            TEXT
      );

      CREATE TABLE IF NOT EXISTS staff_payroll (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id         INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
        month            INTEGER NOT NULL,
        year             INTEGER NOT NULL,
        base_salary      REAL NOT NULL,
        allowances       REAL DEFAULT 0,
        deductions       REAL DEFAULT 0,
        net_salary       REAL NOT NULL,
        payment_status   TEXT DEFAULT 'مدفوع',
        payment_date     TEXT DEFAULT (datetime('now')),
        created_at       TEXT DEFAULT (datetime('now')),
        UNIQUE(staff_id, month, year)
      );

      CREATE INDEX IF NOT EXISTS idx_students_rel ON students(section_id, stage_id, grade_id, academic_year_id);
      CREATE INDEX IF NOT EXISTS idx_staff_national ON staff(national_id);
      CREATE INDEX IF NOT EXISTS idx_payments_student ON student_payments(student_id);
      CREATE INDEX IF NOT EXISTS idx_payroll_staff ON staff_payroll(staff_id, month, year);
    `);
    console.log('[DB Migration] Financial & Relational Architecture tables verified.');

    // 14. Create student_absence_warnings table
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS student_absence_warnings (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id          INTEGER NOT NULL,
        warning_type        TEXT NOT NULL,
        issue_date          TEXT DEFAULT (date('now')),
        total_absent_days   INTEGER NOT NULL,
        is_printed          INTEGER DEFAULT 0,
        notes               TEXT,
        created_at          TEXT DEFAULT (datetime('now'))
      );
    `);

    // 15. Create student_seating_numbers table
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS student_seating_numbers (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id          INTEGER UNIQUE NOT NULL,
        seating_number      INTEGER NOT NULL,
        committee_name      TEXT,
        academic_year       TEXT DEFAULT '2025/2026',
        created_at          TEXT DEFAULT (datetime('now'))
      );
    `);

    // 16. Ensure Master Preset Structure is migrated
    _migrateMasterPresetStructure(dbInstance);

    // ──────────────────────────────────────────────────────────────────────────
    // 17. Smart Academic Year Auto-Correction (runs on every startup)
    //     Logic: Egyptian school year starts Sep 1.
    //     - If month >= 9 → current year is  YYYY/YYYY+1
    //     - If month < 9  → current year is  (YYYY-1)/YYYY
    //     This ensures any shipped DB always has the correct is_current flag.
    // ──────────────────────────────────────────────────────────────────────────
    try {
      const now        = new Date();
      const month      = now.getMonth() + 1; // 1-12
      const year       = now.getFullYear();
      const startYear  = month >= 9 ? year : year - 1;
      const endYear    = startYear + 1;
      const label      = `${startYear}/${endYear}`;
      const startDate  = `${startYear}-09-01`;
      const endDate    = `${endYear}-08-31`;

      // Check if any academic year exists
      const countStmt = dbInstance.prepare('SELECT COUNT(*) AS cnt FROM academic_years');
      let totalYears = 0;
      if (countStmt.step()) totalYears = countStmt.getAsObject().cnt || 0;
      countStmt.free();

      if (totalYears === 0) {
        // No years at all → create the correct one
        dbInstance.run(
          'INSERT INTO academic_years (year_label, start_date, end_date, is_current) VALUES (?, ?, ?, 1)',
          [label, startDate, endDate]
        );
        console.log(`[DB Migration] Created academic year: ${label} (is_current=1)`);
      } else {
        // Check if the correct year exists
        const existsStmt = dbInstance.prepare('SELECT id FROM academic_years WHERE year_label = ?');
        existsStmt.bind([label]);
        let correctYearId = null;
        if (existsStmt.step()) correctYearId = existsStmt.getAsObject().id;
        existsStmt.free();

        if (!correctYearId) {
          // Correct year doesn't exist → create it and mark as current
          dbInstance.run('UPDATE academic_years SET is_current = 0');
          dbInstance.run(
            'INSERT INTO academic_years (year_label, start_date, end_date, is_current) VALUES (?, ?, ?, 1)',
            [label, startDate, endDate]
          );
          console.log(`[DB Migration] Auto-created missing academic year: ${label} and set as current.`);
        } else {
          // Correct year exists — ensure it's marked as current
          const curStmt = dbInstance.prepare('SELECT id FROM academic_years WHERE is_current = 1 AND year_label = ?');
          curStmt.bind([label]);
          const alreadyCurrent = curStmt.step();
          curStmt.free();

          if (!alreadyCurrent) {
            // Fix: set the correct year as current
            dbInstance.run('UPDATE academic_years SET is_current = 0');
            dbInstance.run('UPDATE academic_years SET is_current = 1 WHERE id = ?', [correctYearId]);
            console.log(`[DB Migration] Fixed is_current → academic year ${label} (id=${correctYearId}) is now current.`);
          }
        }
      }
    } catch (yearErr) {
      console.warn('[DB Migration] Academic year auto-correction skipped:', yearErr.message);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 18. Lookup Tables — Seed Master Reference Data (CODE-based architecture)
    //     All queries/filters/statistics use CODE not Arabic text → no typo errors.
    //     INSERT OR IGNORE ensures existing data is NEVER overwritten on update.
    // ──────────────────────────────────────────────────────────────────────────
    _seedLookupData(dbInstance);

    _flushSQLite();


  } catch (err) {
    console.error("[DB Migration Error]", err.message);
  }
};


// ─── Startup: Restore from saved config (ONLY if config file exists) ──────────
const _restoreFromConfig = async () => {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.log('[DB] No saved config found. Waiting for user setup.');
    return; // ← Leave sqliteDb = null. isConfigured() → false → user sees Step 1
  }

  try {
    currentConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    dbMode = currentConfig.mode;

    if (dbMode === 'sqlite') {
      if (currentConfig.dbPath && !fs.existsSync(currentConfig.dbPath)) {
        console.log('[DB] Saved SQLite db file missing on disk. Resetting state for clean initial setup.');
        sqliteDb = null;
        dbMode = null;
        currentConfig = null;
        return;
      }
      await _openSQLite(currentConfig.dbPath);
      _migrateSQLiteSchema(sqliteDb);
      console.log('[DB] SQLite restored from saved config.');
    } else if (dbMode === 'postgres') {
      const { Pool } = require('pg');
      pgPool = new Pool({
        host:                currentConfig.host,
        port:                currentConfig.port,
        user:                currentConfig.user,
        password:            currentConfig.password,
        database:            currentConfig.database,
        max:                 20,
        idleTimeoutMillis:   30000,
        connectionTimeoutMillis: 3000,
      });
      console.log('[DB] PostgreSQL pool restored from saved config.');
    }
  } catch (err) {
    console.error('[DB] Failed to restore from saved config:', err.message);
    // Reset everything — user will see Step 1 again
    sqliteDb = null;
    pgPool   = null;
    dbMode   = null;
    currentConfig = null;
  }
};

// ─── Public: State Accessors ──────────────────────────────────────────────────
const getMode     = ()  => dbMode;
const getConfig   = ()  => currentConfig;
const isConfigured = () => sqliteDb !== null || pgPool !== null;
const getSQLiteDb = ()  => sqliteDb;
const getPool     = ()  => pgPool;

// ─── Public: Initialize SQLite (Embedded Mode) ───────────────────────────────
const initSQLiteMode = async () => {
  const dbPath = path.join(CONFIG_DIR, 'nepraspro.db');

  // If the file exists from a previous (interrupted) setup, attempt to delete it so we start fresh
  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
      console.log('[DB] Deleted existing db file for clean init.');
    } catch (e) {
      console.warn('[DB] Could not unlink existing db file:', e.message);
    }
  }

  await _openSQLite(dbPath);  // Creates new in-memory empty db

  if (!sqliteDb) throw new Error('فشل إنشاء قاعدة البيانات المدمجة.');

  // Apply schema
  const schemaPath = path.join(__dirname, '../../database/schema_sqlite.sql');
  if (!fs.existsSync(schemaPath)) throw new Error(`Schema file not found: ${schemaPath}`);
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  sqliteDb.run(schemaSql);
  console.log('[DB] SQLite schema applied.');

  // Apply seed data
  _applySeed();
  console.log('[DB] SQLite seed data applied.');

  // Persist to disk
  currentConfig = { mode: 'sqlite', dbPath };
  _flushSQLite();
  console.log(`[DB] SQLite file written to disk: ${dbPath}`);

  // Save config file
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2));
  console.log('[DB] Config file saved.');

  return true;
};

// ─── Internal: Seed Data ─────────────────────────────────────────────────────
const _applySeed = () => {
  const roles = [
    ['super_admin',  'مدير النظام الأول',          'صلاحيات كاملة وغير مقيدة على كافة الوحدات'],
    ['hr_officer',   'مسؤول شئون العاملين',         'إدارة ملفات الموظفين والرواتب والإجازات'],
    ['data_entry',   'مدخل بيانات شئون الطلاب',    'قيد وتسجيل الطلاب وتوزيع الفصول'],
    ['accountant',   'مسؤول الحسابات والخزينة',     'إدارة الرسوم وتحصيل الأقساط وإيصالات الدفع'],
    ['head_control', 'رئيس الكنترول والامتحانات',   'رصد الدرجات واعتماد وإغلاق الفترات الامتحانية'],
    ['viewer',       'مشاهد',                        'عرض البيانات واستخراج التقارير فقط'],
  ];
  for (const r of roles) {
    sqliteDb.run(
      'INSERT OR IGNORE INTO roles (role_name, role_name_ar, description) VALUES (?,?,?)', r
    );
  }

  const perms = [
    ['manage_settings', 'إدارة إعدادات النظام'],
    ['enroll_student',  'تسجيل وقبول طالب جديد'],
    ['edit_student',    'تعديل بيانات الطلاب'],
    ['manage_staff',    'إدارة ملفات الموظفين'],
    ['collect_fees',    'تحصيل الرسوم وإصدار إيصالات'],
    ['input_grades',    'رصد درجات الطلاب'],
    ['lock_grades',     'اعتماد وإغلاق رصد الدرجات'],
    ['print_reports',   'استخراج التقارير والشهادات'],
    ['view_only',       'عرض واستعراض البيانات فقط'],
  ];
  for (const p of perms) {
    sqliteDb.run('INSERT OR IGNORE INTO permissions (perm_key, perm_name_ar) VALUES (?,?)', p);
  }

  for (const n of ['مصري','سعودي','إماراتي','كويتي','أردني','سوري','فلسطيني','سوداني','يمني','عراقي','لبناني','آخر']) {
    sqliteDb.run('INSERT OR IGNORE INTO nationalities (name) VALUES (?)', [n]);
  }

  for (const d of ['شهادة ميلاد كمبيوتر','بيان نجاح معتمد','إفادة قيد معتمدة','ملف طبي','صورة رقم قومي ولي الأمر','طلب التحاق رسمي','شهادة وفاة','إفادة عمل','إجازة قرآنية','تقرير طبي متخصص','شهادة الاتحاد الرياضي','قرار منحة دراسية','إفادة نقل من مدرسة','وثيقة العودة من الخارج']) {
    sqliteDb.run('INSERT OR IGNORE INTO document_types (name) VALUES (?)', [d]);
  }

  // Special Case Types (أنواع الحالات الخاصة)
  const cases = [
    ['sibling',       'أخوة في المدرسة',           'طالب لديه أخ/أخت مسجل/ة في نفس المدرسة',              0],
    ['twin',          'توأم',                       'طالب توأم مع طالب آخر في نفس العام الدراسي',          1],
    ['staff_child',   'أبناء العاملين',             'طالب ابن/بنت أحد العاملين بالمدرسة',                  1],
    ['orphan',        'أيتام',                      'طالب فقد أحد الوالدين أو كليهما',                     1],
    ['quran_hafiz',   'حفظة القرآن الكريم',         'طالب حافظ لكتاب الله كاملاً أو جزء معتمد',           1],
    ['special_needs', 'ذوو الاحتياجات الخاصة',     'طالب يحتاج دعماً خاصاً وفق تقرير طبي',               1],
    ['scholarship',   'منحة دراسية',                'طالب يدرس بموجب منحة رسمية',                          1],
    ['sport_talent',  'موهبة رياضية',               'طالب ذو موهبة رياضية معترف بها',                      1],
    ['art_talent',    'موهبة فنية',                 'طالب ذو موهبة فنية أو أدبية',                         0],
    ['national_merit','متفوق وطني',                 'طالب حاصل على تفوق/جائزة وطنية',                      1],
    ['merged',        'دمج',                        'طالب يدرس في فصل مختلف عن صفه الرسمي (دمج)',          0],
    ['transferred_in','محوّل وارد',                 'طالب انتقل من مدرسة أخرى إلى هذه المدرسة',           1],
    ['returnee',      'عائد من الخارج',             'طالب أتم جزءاً من تعليمه في الخارج',                  1],
    ['struggling',    'تعثر دراسي',                 'طالب يعاني من ضعف أكاديمي ويحتاج متابعة',             0],
    ['gifted',        'طالب موهوب',                 'طالب يحقق تفوقاً دراسياً استثنائياً',                 0],
  ];
  for (const [code, name_ar, description, requires_document] of cases) {
    sqliteDb.run(
      'INSERT OR IGNORE INTO special_case_types (code, name_ar, description, requires_document) VALUES (?,?,?,?)',
      [code, name_ar, description, requires_document]
    );
  }

  // ─── Baccalaureate Tracks (مسارات نظام البكالوريا) ───────────────────────
  const baccTracks = [
    ['medicine_life',   'مسار الطب وعلوم الحياة',
     'يدرس الطالب الأحياء والكيمياء بمستوى رفيع في الصف الثالث',
     'الطب البشري - طب الأسنان - الصيدلة - العلاج الطبيعي - العلوم - التمريض - الطب البيطري - الزراعة'],
    ['engineering_cs',  'مسار الهندسة وعلوم الحاسب',
     'يدرس الطالب الرياضيات والفيزياء بمستوى رفيع في الصف الثالث',
     'الهندسة بجميع تخصصاتها - الحاسبات والذكاء الاصطناعي - علوم الحاسب ونظم المعلومات - البرامج التكنولوجية'],
    ['business',        'مسار الأعمال',
     'يدرس الطالب الاقتصاد المتقدم والرياضيات في الصف الثالث',
     'التجارة وإدارة الأعمال - الاقتصاد والعلوم السياسية - اللوجستيات - العلوم الإدارية'],
    ['arts_humanities', 'مسار الآداب والفنون',
     'يدرس الطالب الجغرافيا بمستوى رفيع والإحصاء في الصف الثالث',
     'الألسن - الإعلام - الآثار - الحقوق - الآداب - الفنون الجميلة والتطبيقية - السياحة والفنادق'],
  ];
  for (const [code, name_ar, description, universities_ar] of baccTracks) {
    sqliteDb.run(
      'INSERT OR IGNORE INTO baccalaureate_tracks (code, name_ar, description, universities_ar) VALUES (?,?,?,?)',
      [code, name_ar, description, universities_ar]
    );
  }

  // ─── Baccalaureate Subjects (مواد نظام البكالوريا) ───────────────────────
  // Helper: get track id by code
  const getTrackId = (code) => {
    const stmt = sqliteDb.prepare('SELECT id FROM baccalaureate_tracks WHERE code = ?');
    stmt.bind([code]);
    const hasRow = stmt.step();
    const row = hasRow ? stmt.getAsObject() : {};
    stmt.free();
    return row.id || null;
  };

  // الصف الأول الثانوي — مشترك لجميع المسارات
  const grade1Common = [
    ['اللغة العربية',       'common',  1],
    ['اللغة الإنجليزية',   'common',  2],
    ['الرياضيات',           'common',  3],
    ['الفيزياء',            'common',  4],
    ['الكيمياء',            'common',  5],
    ['الأحياء',             'common',  6],
    ['الجيولوجيا',          'common',  7],
    ['التاريخ المصري',      'common',  8],
    ['الجغرافيا',           'common',  9],
    ['علم النفس والاجتماع', 'common', 10],
    ['المحاسبة',            'common', 11],
    ['التربية الدينية',     'outside', 12],
  ];
  for (const [subject_name_ar, subject_type, display_order] of grade1Common) {
    sqliteDb.run(
      'INSERT OR IGNORE INTO baccalaureate_subjects (track_id, grade_year, subject_name_ar, subject_type, counts_in_total, display_order) VALUES (?,?,?,?,?,?)',
      [null, 1, subject_name_ar, subject_type, subject_type === 'outside' ? 0 : 1, display_order]
    );
  }

  // الصف الثاني الثانوي — المواد المشتركة لكل المسارات
  const grade2Common = [
    ['اللغة العربية',    'common', 1],
    ['اللغة الإنجليزية','common', 2],
    ['التاريخ المصري',   'common', 3],
    ['التربية الدينية',  'outside', 9],
  ];
  for (const [subject_name_ar, subject_type, display_order] of grade2Common) {
    sqliteDb.run(
      'INSERT OR IGNORE INTO baccalaureate_subjects (track_id, grade_year, subject_name_ar, subject_type, counts_in_total, display_order) VALUES (?,?,?,?,?,?)',
      [null, 2, subject_name_ar, subject_type, subject_type === 'outside' ? 0 : 1, display_order]
    );
  }

  // الصف الثاني — المواد الاختيارية (elective) لكل مسار
  const grade2Electives = [
    // مسار الطب وعلوم الحياة
    ['medicine_life',  'الرياضيات (اختياري)',  'elective', 4],
    ['medicine_life',  'الفيزياء (اختياري)',   'elective', 5],
    // مسار الهندسة وعلوم الحاسب
    ['engineering_cs', 'الكيمياء (اختياري)',   'elective', 4],
    ['engineering_cs', 'البرمجة (اختياري)',    'elective', 5],
    // مسار الأعمال
    ['business',       'المحاسبة (اختياري)',   'elective', 4],
    ['business',       'إدارة الأعمال (اختياري)', 'elective', 5],
    // مسار الآداب والفنون
    ['arts_humanities','علم النفس (اختياري)',  'elective', 4],
    ['arts_humanities','اللغة الأجنبية الثانية (اختياري)', 'elective', 5],
  ];
  for (const [trackCode, subject_name_ar, subject_type, display_order] of grade2Electives) {
    const trackId = getTrackId(trackCode);
    if (trackId) {
      sqliteDb.run(
        'INSERT OR IGNORE INTO baccalaureate_subjects (track_id, grade_year, subject_name_ar, subject_type, counts_in_total, display_order) VALUES (?,?,?,?,?,?)',
        [trackId, 2, subject_name_ar, subject_type, 1, display_order]
      );
    }
  }

  // الصف الثالث — المواد المتخصصة (advanced) لكل مسار
  const grade3Advanced = [
    // مسار الطب وعلوم الحياة
    ['medicine_life',  'الأحياء (متقدم)',              'advanced', 1],
    ['medicine_life',  'الكيمياء (متقدم)',             'advanced', 2],
    ['medicine_life',  'التربية الدينية',              'outside',  9],
    // مسار الهندسة وعلوم الحاسب
    ['engineering_cs', 'الرياضيات (متقدم)',            'advanced', 1],
    ['engineering_cs', 'الفيزياء (متقدم)',             'advanced', 2],
    ['engineering_cs', 'التربية الدينية',              'outside',  9],
    // مسار الأعمال
    ['business',       'الاقتصاد (متقدم)',             'advanced', 1],
    ['business',       'الرياضيات',                   'advanced', 2],
    ['business',       'التربية الدينية',              'outside',  9],
    // مسار الآداب والفنون
    ['arts_humanities','الجغرافيا (متقدم)',            'advanced', 1],
    ['arts_humanities','الإحصاء',                      'advanced', 2],
    ['arts_humanities','التربية الدينية',              'outside',  9],
  ];
  for (const [trackCode, subject_name_ar, subject_type, display_order] of grade3Advanced) {
    const trackId = getTrackId(trackCode);
    if (trackId) {
      sqliteDb.run(
        'INSERT OR IGNORE INTO baccalaureate_subjects (track_id, grade_year, subject_name_ar, subject_type, counts_in_total, display_order) VALUES (?,?,?,?,?,?)',
        [trackId, 3, subject_name_ar, subject_type, subject_type === 'outside' ? 0 : 1, display_order]
      );
    }
  }

  // ─── Master Preset Structure Migration (3-Digit Standard Codes) ─────────
  _migrateMasterPresetStructure(sqliteDb);
  _flushSQLite();
};

const _migrateMasterPresetStructure = (dbInstance = sqliteDb) => {
  try {
    const targetDb = dbInstance || sqliteDb;
    if (!targetDb) return;
    const { MASTER_STRUCTURE } = require('./master_structure');

    const _all = (sql, params = []) => {
      const stmt = targetDb.prepare(sql);
      if (params.length) stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    };
    const _get = (sql, params = []) => _all(sql, params)[0] || null;

    const secCols = _all("PRAGMA table_info(sections)").map(c => c.name);
    if (!secCols.includes('code')) targetDb.run("ALTER TABLE sections ADD COLUMN code INTEGER;");
    if (!secCols.includes('is_active')) targetDb.run("ALTER TABLE sections ADD COLUMN is_active INTEGER DEFAULT 1;");

    // Ensure control_marks_audit table exists for auditing changes
    targetDb.run(`
      CREATE TABLE IF NOT EXISTS control_marks_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        control_student_id INTEGER REFERENCES control_students(id),
        subject_id INTEGER REFERENCES exam_subjects(id),
        term INTEGER,
        old_work_marks REAL,
        new_work_marks REAL,
        old_written_marks REAL,
        new_written_marks REAL,
        old_total_marks REAL,
        new_total_marks REAL,
        changed_by TEXT DEFAULT 'مسؤول الكنترول',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    const stgCols = _all("PRAGMA table_info(stages_lookup)").map(c => c.name);
    if (!stgCols.includes('code')) targetDb.run("ALTER TABLE stages_lookup ADD COLUMN code INTEGER;");
    if (!stgCols.includes('is_active')) targetDb.run("ALTER TABLE stages_lookup ADD COLUMN is_active INTEGER DEFAULT 1;");

    const grdCols = _all("PRAGMA table_info(grades_lookup)").map(c => c.name);
    if (!grdCols.includes('code')) targetDb.run("ALTER TABLE grades_lookup ADD COLUMN code INTEGER;");
    if (!grdCols.includes('is_active')) targetDb.run("ALTER TABLE grades_lookup ADD COLUMN is_active INTEGER DEFAULT 1;");

    // Cleanup invalid fake sections created by legacy setup wizard
    try {
      targetDb.run("DELETE FROM sections WHERE name LIKE 'مرحلة %'");
    } catch (_) {}

    MASTER_STRUCTURE.forEach(sec => {
      let existingSec = _get("SELECT * FROM sections WHERE code = ? OR name = ?", [sec.section_code, sec.name]);
      let secId;
      if (existingSec) {
        secId = existingSec.id;
        // Only update the code — do NOT override is_active set by user
        targetDb.run("UPDATE sections SET code = ? WHERE id = ?", [sec.section_code, secId]);
      } else {
        // Insert as INACTIVE (is_active=0) so it doesn't show in sidebar
        // The user must explicitly activate sections from Settings
        targetDb.run(
          "INSERT INTO sections (name, type, education_type, legal_status, code, is_active) VALUES (?, ?, ?, ?, ?, ?)",
          [sec.name, sec.type, sec.education_type, 'حكومي', sec.section_code, 0]
        );
        secId = _get("SELECT last_insert_rowid() AS id").id;
      }

      sec.stages.forEach(stg => {
        let existingStg = _get("SELECT * FROM stages_lookup WHERE section_id = ? AND (stage_name = ? OR code = ?)", [secId, stg.stage_name, stg.stage_code]);
        let stgId;
        if (existingStg) {
          stgId = existingStg.id;
          targetDb.run("UPDATE stages_lookup SET code = ?, is_active = COALESCE(is_active, 0) WHERE id = ?", [stg.stage_code, stgId]);
        } else {
          targetDb.run(
            "INSERT INTO stages_lookup (section_id, stage_name, years_count, display_order, code, is_active) VALUES (?, ?, ?, ?, ?, ?)",
            [secId, stg.stage_name, stg.years_count, stg.display_order, stg.stage_code, 0]
          );
          stgId = _get("SELECT last_insert_rowid() AS id").id;
        }

        stg.grades.forEach(grd => {
          let existingGrd = _get(
            "SELECT * FROM grades_lookup WHERE stage_id = ? AND (grade_number = ? OR grade_name_ar = ? OR code = ?)",
            [stgId, grd.grade_number, grd.grade_name_ar, grd.grade_code]
          );
          if (existingGrd) {
            targetDb.run("UPDATE grades_lookup SET code = ?, grade_name_ar = ?, is_active = COALESCE(is_active, 1) WHERE id = ?", [grd.grade_code, grd.grade_name_ar, existingGrd.id]);
          } else {
            targetDb.run(
              "INSERT INTO grades_lookup (stage_id, grade_number, grade_name_ar, code, is_active) VALUES (?, ?, ?, ?, ?)",
              [stgId, grd.grade_number, grd.grade_name_ar, grd.grade_code, 1]
            );
          }
        });
      });
    });

    console.log('[DB Migration] Master Standard Structure (Arabic, Languages, International with 3-digit Codes) verified.');
  } catch (err) {
    console.error('[DB Migration Error] Master structure migration:', err.message);
  }
};

// ─── Lookup Data Seeder ───────────────────────────────────────────────────────
const _seedLookupData = (dbInstance) => {
  if (!dbInstance) return;
  try {

    // ── Create lookup tables if not exist ──────────────────────────────────────

    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS governorates (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        code     TEXT UNIQUE NOT NULL,
        name_ar  TEXT NOT NULL,
        region   TEXT
      );
    `);

    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS educational_administrations (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        governorate_id  INTEGER NOT NULL REFERENCES governorates(id),
        name_ar         TEXT NOT NULL,
        is_custom       INTEGER DEFAULT 0,
        UNIQUE(governorate_id, name_ar)
      );
    `);

    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS enrollment_status_lookup (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        code     TEXT UNIQUE NOT NULL,
        name_ar  TEXT NOT NULL,
        color    TEXT DEFAULT '#6b7280',
        sort_order INTEGER DEFAULT 0
      );
    `);

    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS foreign_languages_lookup (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        code       TEXT UNIQUE NOT NULL,
        name_ar    TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
      );
    `);

    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS education_systems_lookup (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        code     TEXT UNIQUE NOT NULL,
        name_ar  TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
      );
    `);

    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS school_tracks_lookup (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        code     TEXT UNIQUE NOT NULL,
        name_ar  TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
      );
    `);

    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS school_specializations_lookup (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        code        TEXT UNIQUE NOT NULL,
        name_ar     TEXT NOT NULL,
        track_code  TEXT,
        sort_order  INTEGER DEFAULT 0
      );
    `);

    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS special_needs_types_lookup (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        code     TEXT UNIQUE NOT NULL,
        name_ar  TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
      );
    `);

    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS guardian_relations_lookup (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        code       TEXT UNIQUE NOT NULL,
        name_ar    TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
      );
    `);

    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS nationalities_lookup (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        code     TEXT UNIQUE NOT NULL,
        name_ar  TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
      );
    `);

    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS religion_lookup (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        code     TEXT UNIQUE NOT NULL,
        name_ar  TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
      );
    `);

    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS gender_lookup (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        code     TEXT UNIQUE NOT NULL,
        name_ar  TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
      );
    `);

    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS academic_terms_lookup (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        code     TEXT UNIQUE NOT NULL,
        name_ar  TEXT NOT NULL,
        term_number INTEGER,
        sort_order INTEGER DEFAULT 0
      );
    `);

    // ── 1. Master Section Lookup (ثابت مرجعي) ──────────────────────────────
    dbInstance.run(`
        CREATE TABLE IF NOT EXISTS sections_master_lookup (
          id       INTEGER PRIMARY KEY AUTOINCREMENT,
          code     TEXT UNIQUE NOT NULL,
          name_ar  TEXT UNIQUE NOT NULL
        );
      `);

      // ── 2. Master Education Types Lookup (ثابت مرجعي) ────────────────────────
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS education_types_lookup (
          id       INTEGER PRIMARY KEY AUTOINCREMENT,
          code     TEXT UNIQUE NOT NULL,
          name_ar  TEXT UNIQUE NOT NULL
        );
      `);

      // ── 3. Master School Classifications Lookup (ثابت مرجعي) ───────────────
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS school_classifications_lookup (
          id       INTEGER PRIMARY KEY AUTOINCREMENT,
          code     TEXT UNIQUE NOT NULL,
          name_ar  TEXT UNIQUE NOT NULL
        );
      `);

      // ── 4. Master Stages Lookup (ثابت مرجعي) ───────────────────────────────
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS stages_master_lookup (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          code       TEXT UNIQUE NOT NULL,
          name_ar    TEXT UNIQUE NOT NULL,
          sort_order INTEGER DEFAULT 0
        );
      `);

      // ── 5. Master Grades Lookup (ثابت مرجعي مرتبط بالمرحلة) ───────────────
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS grades_master_lookup (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          stage_code   TEXT NOT NULL,
          code         TEXT UNIQUE NOT NULL,
          name_ar      TEXT UNIQUE NOT NULL,
          grade_number INTEGER NOT NULL,
          sort_order   INTEGER DEFAULT 0
        );
      `);

      // Ensure stage_code column exists for existing databases
      try {
        const gCols = [];
        const gStmt = dbInstance.prepare('PRAGMA table_info(grades_master_lookup)');
        while (gStmt.step()) gCols.push(gStmt.getAsObject().name);
        gStmt.free();
        if (!gCols.includes('stage_code')) {
          dbInstance.run("ALTER TABLE grades_master_lookup ADD COLUMN stage_code TEXT DEFAULT 'primary';");
        }
      } catch(_) {}

      // ── 6. Institution Configured Structure (تخصيص المؤسسة) ─────────────────
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS institution_sections (
          id                      INTEGER PRIMARY KEY AUTOINCREMENT,
          section_master_id       INTEGER NOT NULL REFERENCES sections_master_lookup(id),
          education_type_id       INTEGER NOT NULL REFERENCES education_types_lookup(id),
          is_active               INTEGER DEFAULT 1,
          UNIQUE(section_master_id)
        );
      `);

      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS institution_stages (
          id                      INTEGER PRIMARY KEY AUTOINCREMENT,
          institution_section_id  INTEGER NOT NULL REFERENCES institution_sections(id) ON DELETE CASCADE,
          stage_master_id         INTEGER NOT NULL REFERENCES stages_master_lookup(id),
          is_active               INTEGER DEFAULT 1,
          UNIQUE(institution_section_id, stage_master_id)
        );
      `);

      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS institution_grades (
          id                      INTEGER PRIMARY KEY AUTOINCREMENT,
          institution_stage_id    INTEGER NOT NULL REFERENCES institution_stages(id) ON DELETE CASCADE,
          grade_master_id         INTEGER NOT NULL REFERENCES grades_master_lookup(id),
          display_name_ar         TEXT NOT NULL,
          is_active               INTEGER DEFAULT 1,
          UNIQUE(institution_stage_id, grade_master_id)
        );
      `);

      // Seed Master Sections
      const masterSecs = [
        ['arabic', 'القسم العربي'],
        ['languages', 'قسم اللغات'],
        ['international', 'القسم الدولي']
      ];
      masterSecs.forEach(([c, n]) => {
        dbInstance.run('INSERT OR IGNORE INTO sections_master_lookup (code, name_ar) VALUES (?,?)', [c, n]);
      });

      // Seed Master Education Types
      const masterEduTypes = [
        ['official', 'رسمي'],
        ['official_languages', 'رسمي لغات'],
        ['official_distinguished', 'رسمي مميز'],
        ['private_arabic', 'خاص عربي'],
        ['private_languages', 'خاص لغات'],
        ['international', 'دولي'],
        ['cultural', 'ثقافي'],
        ['community', 'مجتمعي']
      ];
      masterEduTypes.forEach(([c, n]) => {
        dbInstance.run('INSERT OR IGNORE INTO education_types_lookup (code, name_ar) VALUES (?,?)', [c, n]);
      });

      // Seed Master School Classifications
      const masterClassifications = [
        ['public_general', 'حكومي عام'],
        ['private_tuition', 'خاص بمصروفات'],
        ['community', 'مجتمعي'],
        ['cultural', 'ثقافي']
      ];
      masterClassifications.forEach(([c, n]) => {
        dbInstance.run('INSERT OR IGNORE INTO school_classifications_lookup (code, name_ar) VALUES (?,?)', [c, n]);
      });

      // Seed Master Stages
      const masterStages = [
        ['preliminary', 'تمهيدي', 1],
        ['kindergarten', 'رياض أطفال', 2],
        ['primary', 'ابتدائي', 3],
        ['preparatory', 'إعدادي', 4],
        ['secondary', 'ثانوي', 5]
      ];
      masterStages.forEach(([c, n, s]) => {
        dbInstance.run('INSERT OR IGNORE INTO stages_master_lookup (code, name_ar, sort_order) VALUES (?,?,?)', [c, n, s]);
      });

      // Seed Master Grades (مخصصة لكل مرحلة حصراً)
      const masterGrades = [
        // تمهيدي
        ['preliminary', 'nursery_0', 'تمهيدي', 0, 1],

        // رياض أطفال
        ['kindergarten', 'kg_1', 'الأول رياض أطفال (KG1)', 1, 2],
        ['kindergarten', 'kg_2', 'الثاني رياض أطفال (KG2)', 2, 3],

        // ابتدائي
        ['primary', 'pri_1', 'الأول الابتدائي', 1, 4],
        ['primary', 'pri_2', 'الثاني الابتدائي', 2, 5],
        ['primary', 'pri_3', 'الثالث الابتدائي', 3, 6],
        ['primary', 'pri_4', 'الرابع الابتدائي', 4, 7],
        ['primary', 'pri_5', 'الخامس الابتدائي', 5, 8],
        ['primary', 'pri_6', 'السادس الابتدائي', 6, 9],

        // إعدادي
        ['preparatory', 'prep_1', 'الأول الإعدادي', 1, 10],
        ['preparatory', 'prep_2', 'الثاني الإعدادي', 2, 11],
        ['preparatory', 'prep_3', 'الثالث الإعدادي', 3, 12],

        // ثانوي
        ['secondary', 'sec_1', 'الأول الثانوي', 1, 13],
        ['secondary', 'sec_2', 'الثاني الثانوي', 2, 14],
        ['secondary', 'sec_3', 'الثالث الثانوي', 3, 15]
      ];
      masterGrades.forEach(([stgCode, c, n, g, s]) => {
        dbInstance.run(
          'INSERT OR IGNORE INTO grades_master_lookup (stage_code, code, name_ar, grade_number, sort_order) VALUES (?,?,?,?,?)',
          [stgCode, c, n, g, s]
        );
      });

    // Add governorate_id / administration_id / classification_id to institution_config if missing
    try {
      const icCols = [];
      const icStmt = dbInstance.prepare('PRAGMA table_info(institution_config)');
      while (icStmt.step()) icCols.push(icStmt.getAsObject().name);
      icStmt.free();
      if (!icCols.includes('governorate_id'))
        dbInstance.run('ALTER TABLE institution_config ADD COLUMN governorate_id INTEGER REFERENCES governorates(id);');
      if (!icCols.includes('administration_id'))
        dbInstance.run('ALTER TABLE institution_config ADD COLUMN administration_id INTEGER REFERENCES educational_administrations(id);');
      if (!icCols.includes('classification_id'))
        dbInstance.run('ALTER TABLE institution_config ADD COLUMN classification_id INTEGER REFERENCES school_classifications_lookup(id);');
    } catch(_) {}

    // ── Seed: حالات القيد (6 حالات + code) ───────────────────────────────────
    const enrollmentStatuses = [
      ['NEW',       'مستجد',          '#3b82f6', 1],
      ['PROMOTED',  'منقول',           '#10b981', 2],
      ['RETAINED',  'باقٍ للإعادة',    '#f59e0b', 3],
      ['SUSPENDED', 'موقوف قيده',      '#ef4444', 4],
      ['ABSENT',    'منقطع',           '#8b5cf6', 5],
      ['EXCLUDED',  'مستبعد',          '#6b7280', 6],
    ];
    enrollmentStatuses.forEach(([code, name_ar, color, sort]) => {
      dbInstance.run(
        'INSERT OR IGNORE INTO enrollment_status_lookup (code, name_ar, color, sort_order) VALUES (?,?,?,?)',
        [code, name_ar, color, sort]
      );
    });

    // ── Seed: اللغات الأجنبية ─────────────────────────────────────────────────
    const languages = [
      ['EN',  'إنجليزي',  1], ['FR', 'فرنسي',   2],
      ['DE',  'ألماني',   3], ['IT', 'إيطالي',  4],
      ['ES',  'إسباني',   5], ['JA', 'ياباني',  6],
      ['ZH',  'صيني',     7], ['NONE', 'لا يوجد', 8],
    ];
    languages.forEach(([code, name_ar, sort]) => {
      dbInstance.run(
        'INSERT OR IGNORE INTO foreign_languages_lookup (code, name_ar, sort_order) VALUES (?,?,?)',
        [code, name_ar, sort]
      );
    });

    // ── Seed: نظام التعليم ────────────────────────────────────────────────────
    const eduSystems = [
      ['REGULAR',  'نظامي',           1],
      ['HOME',     'منازل',            2],
      ['EG_BAC',   'بكالوريا مصرية',  3],
      ['US_DIP',   'دبلوم أمريكي',    4],
      ['UK_DIP',   'دبلوم بريطاني',   5],
      ['IB',       'ثانوية دولية IB', 6],
    ];
    eduSystems.forEach(([code, name_ar, sort]) => {
      dbInstance.run(
        'INSERT OR IGNORE INTO education_systems_lookup (code, name_ar, sort_order) VALUES (?,?,?)',
        [code, name_ar, sort]
      );
    });

    // ── Seed: الشعبة (3) ─────────────────────────────────────────────────────
    const tracks = [
      ['GEN', 'عام',    1],
      ['SCI', 'علمي',   2],
      ['LIT', 'أدبي',   3],
    ];
    tracks.forEach(([code, name_ar, sort]) => {
      dbInstance.run(
        'INSERT OR IGNORE INTO school_tracks_lookup (code, name_ar, sort_order) VALUES (?,?,?)',
        [code, name_ar, sort]
      );
    });

    // ── Seed: التخصص / المسار ────────────────────────────────────────────────
    const specs = [
      ['GEN_GEN',  'عام',                       'GEN', 0],
      ['SCI_MATH', 'علمي رياضيات',              'SCI', 1],
      ['SCI_BIO',  'علمي علوم',                 'SCI', 2],
      ['LIT_GEN',  'أدبي',                      'LIT', 3],
      ['BAC_MED',  'طب وعلوم حياة (بكالوريا)',  'SCI', 4],
      ['BAC_ENG',  'هندسة وحاسب (بكالوريا)',    'SCI', 5],
      ['BAC_BUS',  'أعمال (بكالوريا)',           'GEN', 6],
      ['BAC_ART',  'آداب وفنون (بكالوريا)',      'LIT', 7],
    ];
    specs.forEach(([code, name_ar, track_code, sort]) => {
      dbInstance.run(
        'INSERT OR IGNORE INTO school_specializations_lookup (code, name_ar, track_code, sort_order) VALUES (?,?,?,?)',
        [code, name_ar, track_code, sort]
      );
    });

    // ── Seed: ذوو الاحتياجات الخاصة (الدمج) ──────────────────────────────────
    const specialNeeds = [
      ['HEARING',   'إعاقة سمعية',         1],
      ['VISUAL',    'إعاقة بصرية',         2],
      ['PHYSICAL',  'إعاقة حركية',         3],
      ['MENTAL',    'إعاقة ذهنية',         4],
      ['AUTISM',    'توحد',               5],
      ['SPEECH',    'اضطراب نطق',         6],
      ['LEARNING',  'صعوبات تعلم',        7],
      ['MULTIPLE',  'إعاقات متعددة',      8],
    ];
    specialNeeds.forEach(([code, name_ar, sort]) => {
      dbInstance.run(
        'INSERT OR IGNORE INTO special_needs_types_lookup (code, name_ar, sort_order) VALUES (?,?,?)',
        [code, name_ar, sort]
      );
    });

    // ── Seed: صفة ولي الأمر (11 صفة) ─────────────────────────────────────────
    const guardianRels = [
      ['FATHER',   'الأب',          1], ['MOTHER',   'الأم',         2],
      ['GFATHER',  'الجد',          3], ['GMOTHER',  'الجدة',        4],
      ['UNCLE_P',  'العم',          5], ['UNCLE_M',  'الخال',        6],
      ['BROTHER',  'الأخ',          7], ['SISTER',   'الأخت',        8],
      ['HUSBAND',  'الزوج',         9], ['WIFE',     'الزوجة',      10],
      ['GUARDIAN', 'الوصي القانوني',11],
    ];
    guardianRels.forEach(([code, name_ar, sort]) => {
      dbInstance.run(
        'INSERT OR IGNORE INTO guardian_relations_lookup (code, name_ar, sort_order) VALUES (?,?,?)',
        [code, name_ar, sort]
      );
    });

    // ── Seed: الجنسيات الشائعة ────────────────────────────────────────────────
    const nationalities = [
      ['EGY','مصري',1],['SAU','سعودي',2],['LBY','ليبي',3],['SDN','سوداني',4],
      ['SYR','سوري',5],['YEM','يمني',6],['JOR','أردني',7],['PAL','فلسطيني',8],
      ['LBN','لبناني',9],['IRQ','عراقي',10],['KWT','كويتي',11],
      ['ARE','إماراتي',12],['QAT','قطري',13],['BHR','بحريني',14],
      ['OMN','عماني',15],['MAR','مغربي',16],['TUN','تونسي',17],
      ['DZA','جزائري',18],['OTHER','أخرى',99],
    ];
    nationalities.forEach(([code, name_ar, sort]) => {
      dbInstance.run(
        'INSERT OR IGNORE INTO nationalities_lookup (code, name_ar, sort_order) VALUES (?,?,?)',
        [code, name_ar, sort]
      );
    });

    // ── Seed: الديانات ────────────────────────────────────────────────────────
    const religions = [
      ['MUSLIM', 'مسلم', 1], ['CHRISTIAN', 'مسيحي', 2], ['OTHER', 'أخرى', 3],
    ];
    religions.forEach(([code, name_ar, sort]) => {
      dbInstance.run(
        'INSERT OR IGNORE INTO religion_lookup (code, name_ar, sort_order) VALUES (?,?,?)',
        [code, name_ar, sort]
      );
    });

    // ── Seed: الجنس ──────────────────────────────────────────────────────────
    const genders = [['MALE','ذكر',1],['FEMALE','أنثى',2]];
    genders.forEach(([code, name_ar, sort]) => {
      dbInstance.run(
        'INSERT OR IGNORE INTO gender_lookup (code, name_ar, sort_order) VALUES (?,?,?)',
        [code, name_ar, sort]
      );
    });

    // ── Seed: الفصول الدراسية ─────────────────────────────────────────────────
    const terms = [
      ['TERM1', 'الفصل الدراسي الأول', 1, 1],
      ['TERM2', 'الفصل الدراسي الثاني', 2, 2],
    ];
    terms.forEach(([code, name_ar, term_number, sort]) => {
      dbInstance.run(
        'INSERT OR IGNORE INTO academic_terms_lookup (code, name_ar, term_number, sort_order) VALUES (?,?,?,?)',
        [code, name_ar, term_number, sort]
      );
    });

    // ── Seed: 27 محافظة مصرية ────────────────────────────────────────────────
    const governorates = [
      ['CAI','القاهرة','العاصمة'],           ['GIZ','الجيزة','العاصمة'],
      ['ALX','الإسكندرية','شمال'],           ['LXR','الأقصر','صعيد'],
      ['ASW','أسوان','صعيد'],                ['ASY','أسيوط','صعيد'],
      ['BHR','البحيرة','دلتا'],              ['BNS','بني سويف','صعيد'],
      ['DKH','الدقهلية','دلتا'],             ['DMT','دمياط','دلتا'],
      ['FYM','الفيوم','صعيد'],               ['GHR','الغربية','دلتا'],
      ['ISM','الإسماعيلية','قناة'],          ['KFS','كفر الشيخ','دلتا'],
      ['MNY','المنيا','صعيد'],               ['MNF','المنوفية','دلتا'],
      ['MTR','مطروح','حدود'],                ['NVL','الوادي الجديد','حدود'],
      ['PSD','بورسعيد','قناة'],              ['QHR','القليوبية','العاصمة'],
      ['QNA','قنا','صعيد'],                  ['RBH','البحر الأحمر','حدود'],
      ['SGH','سوهاج','صعيد'],                ['SHR','الشرقية','دلتا'],
      ['SIN','شمال سيناء','حدود'],           ['SSN','جنوب سيناء','حدود'],
      ['SUZ','السويس','قناة'],
    ];
    governorates.forEach(([code, name_ar, region]) => {
      dbInstance.run(
        'INSERT OR IGNORE INTO governorates (code, name_ar, region) VALUES (?,?,?)',
        [code, name_ar, region]
      );
    });

    // ── Seed: إدارات تعليمية رئيسية ─────────────────────────────────────────
    // Helper to get governorate id by code
    const getGovId = (code) => {
      try {
        const s = dbInstance.prepare('SELECT id FROM governorates WHERE code = ?');
        s.bind([code]);
        const r = s.step() ? s.getAsObject().id : null;
        s.free();
        return r;
      } catch(_) { return null; }
    };

    const administrations = [
      // القاهرة
      ['CAI',['إدارة القاهرة التعليمية الأولى','إدارة القاهرة التعليمية الثانية','إدارة مصر الجديدة','إدارة النزهة','إدارة مدينة نصر الأولى','إدارة مدينة نصر الثانية','إدارة الزيتون','إدارة عين شمس','إدارة المطرية','إدارة حلوان','إدارة المعادي','إدارة التبين']],
      // الجيزة
      ['GIZ',['إدارة الجيزة التعليمية','إدارة إمبابة','إدارة بولاق الدكرور','إدارة الهرم','إدارة العجوزة','إدارة الشيخ زايد','إدارة أكتوبر']],
      // الإسكندرية
      ['ALX',['إدارة الإسكندرية التعليمية الأولى','إدارة الإسكندرية التعليمية الثانية','إدارة المنتزه','إدارة العامرية','إدارة برج العرب']],
      // الشرقية
      ['SHR',['إدارة الزقازيق','إدارة بلبيس','إدارة منيا القمح','إدارة أبوحماد','إدارة القنايات','إدارة الإسماعيلية التعليمية']],
      // الدقهلية
      ['DKH',['إدارة المنصورة الأولى','إدارة المنصورة الثانية','إدارة ميت غمر','إدارة بنها','إدارة شربين']],
      // الغربية
      ['GHR',['إدارة طنطا','إدارة المحلة الكبرى','إدارة كفر الزيات','إدارة زفتى','إدارة سمنود']],
      // البحيرة
      ['BHR',['إدارة دمنهور','إدارة كوم حمادة','إدارة أبوحمص','إدارة إيتاي البارود','إدارة الدلنجات']],
      // كفر الشيخ
      ['KFS',['إدارة كفر الشيخ','إدارة دسوق','إدارة بيلا','إدارة فوة']],
      // المنوفية
      ['MNF',['إدارة شبين الكوم','إدارة منوف','إدارة أشمون','إدارة الباجور']],
      // القليوبية
      ['QHR',['إدارة بنها','إدارة القناطر الخيرية','إدارة شبرا الخيمة','إدارة طوخ','إدارة الخانكة']],
      // الإسماعيلية
      ['ISM',['إدارة الإسماعيلية التعليمية','إدارة فايد','إدارة القنطرة']],
      // السويس
      ['SUZ',['إدارة السويس التعليمية']],
      // بورسعيد
      ['PSD',['إدارة بورسعيد التعليمية']],
      // دمياط
      ['DMT',['إدارة دمياط','إدارة فارسكور','إدارة رأس البر']],
      // الأقصر
      ['LXR',['إدارة الأقصر التعليمية','إدارة إسنا']],
      // أسوان
      ['ASW',['إدارة أسوان التعليمية','إدارة كوم أمبو','إدارة إدفو']],
      // أسيوط
      ['ASY',['إدارة أسيوط التعليمية','إدارة ديروط','إدارة منفلوط','إدارة أبنوب']],
      // سوهاج
      ['SGH',['إدارة سوهاج التعليمية','إدارة طهطا','إدارة أخميم','إدارة جرجا']],
      // قنا
      ['QNA',['إدارة قنا التعليمية','إدارة نجع حمادي','إدارة دشنا']],
      // المنيا
      ['MNY',['إدارة المنيا التعليمية','إدارة ملوي','إدارة سمالوط','إدارة مغاغة']],
      // بني سويف
      ['BNS',['إدارة بني سويف التعليمية','إدارة الفشن','إدارة ناصر']],
      // الفيوم
      ['FYM',['إدارة الفيوم التعليمية','إدارة إطسا','إدارة يوسف الصديق']],
      // شمال سيناء
      ['SIN',['إدارة العريش','إدارة الشيخ زويد','إدارة بئر العبد']],
      // جنوب سيناء
      ['SSN',['إدارة طور سيناء','إدارة شرم الشيخ','إدارة دهب']],
      // مطروح
      ['MTR',['إدارة مرسى مطروح','إدارة سيوة','إدارة الضبعة']],
      // البحر الأحمر
      ['RBH',['إدارة الغردقة','إدارة سفاجا','إدارة القصير']],
      // الوادي الجديد
      ['NVL',['إدارة الخارجة','إدارة الداخلة','إدارة الفرافرة']],
    ];

    administrations.forEach(([govCode, admList]) => {
      const govId = getGovId(govCode);
      if (!govId) return;
      admList.forEach(name_ar => {
        dbInstance.run(
          'INSERT OR IGNORE INTO educational_administrations (governorate_id, name_ar, is_custom) VALUES (?,?,0)',
          [govId, name_ar]
        );
      });
    });

    console.log('[DB Seed] Lookup data seeded (governorates, administrations, statuses, languages, systems, tracks, specializations, special needs, guardian relations, nationalities, religions, genders, terms).');
    
    // Auto-seed default ministerial subjects for all grades if empty
    seedDefaultExamSubjects(dbInstance);
  } catch (err) {
    console.error('[DB Seed Error]:', err.message);
  }
};

const _allSqlite = (dbInstance, sql, params = []) => {
  const stmt = dbInstance.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
};

const _getSqlite = (dbInstance, sql, params = []) => {
  const rows = _allSqlite(dbInstance, sql, params);
  return rows.length > 0 ? rows[0] : null;
};

const seedDefaultExamSubjects = (dbInstance) => {
  try {
    const grades = _allSqlite(dbInstance, "SELECT id, grade_name_ar FROM grades_lookup");
    if (!grades || grades.length === 0) return;

    grades.forEach(g => {
      const existing = _getSqlite(dbInstance, "SELECT COUNT(*) as cnt FROM exam_subjects WHERE grade_id = ?", [g.id]);
      if (existing && existing.cnt > 0) return; // Subjects already populated for this grade

      const gName = g.grade_name_ar || '';

      let subList = [];
      if (gName.includes('الأول الابتدائي') || gName.includes('الثاني الابتدائي')) {
        // Primary 1 & 2
        subList = [
          { name: 'لغة عربية',     code: 'AR',   cat: 'أساسية',     work: 100, exam: 0,  added: 1, passPercent: 50.0, activity: false },
          { name: 'رياضيات',       code: 'MATH', cat: 'أساسية',     work: 100, exam: 0,  added: 1, passPercent: 50.0, activity: false },
          { name: 'لغة إنجليزية', code: 'ENG',  cat: 'أساسية',     work: 100, exam: 0,  added: 1, passPercent: 50.0, activity: false },
          { name: 'تربية دينية',  code: 'REL',  cat: 'أساسية',     work: 100, exam: 0,  added: 1, passPercent: 70.0, activity: false },
          { name: 'تربية بدنية',  code: 'PE',   cat: 'نشاط',       work: 0,   exam: 0,  added: 0, passPercent: 50.0, activity: true  },
          { name: 'تربية فنية',   code: 'ART',  cat: 'نشاط',       work: 0,   exam: 0,  added: 0, passPercent: 50.0, activity: true  },
          { name: 'موسيقى',       code: 'MUS',  cat: 'نشاط',       work: 0,   exam: 0,  added: 0, passPercent: 50.0, activity: true  },
          { name: 'مستوى رفيع',   code: 'AL',   cat: 'مستوى رفيع', work: 100, exam: 0,  added: 0, passPercent: 50.0, activity: false }
        ];
      } else if (gName.includes('الثالث الابتدائي')) {
        // Primary 3
        subList = [
          { name: 'اللغة العربية',     code: 'AR',   cat: 'أساسية',     work: 40, exam: 60, added: 1, passPercent: 50.0, activity: false },
          { name: 'اللغة الإنجليزية', code: 'ENG',  cat: 'أساسية',     work: 40, exam: 60, added: 1, passPercent: 50.0, activity: false },
          { name: 'الرياضيات',        code: 'MATH', cat: 'أساسية',     work: 40, exam: 60, added: 1, passPercent: 50.0, activity: false },
          { name: 'التربية الدينية',  code: 'REL',  cat: 'دينية',      work: 40, exam: 60, added: 0, passPercent: 70.0, activity: false },
          { name: 'المهارات المهنية',code: 'VOC',  cat: 'نشاط',       work: 0,  exam: 0,  added: 0, passPercent: 50.0, activity: true  },
          { name: 'التربية البدنية والصحية', code: 'PE', cat: 'نشاط',  work: 0,  exam: 0,  added: 0, passPercent: 50.0, activity: true  },
          { name: 'مستوى رفيع',      code: 'AL',   cat: 'مستوى رفيع', work: 40, exam: 60, added: 0, passPercent: 50.0, activity: false }
        ];
      } else if (gName.includes('الرابع الابتدائي') || gName.includes('الخامس الابتدائي') || gName.includes('السادس الابتدائي')) {
        // Primary 4, 5, 6
        subList = [
          { name: 'اللغة العربية',            code: 'AR',    cat: 'أساسية',     work: 40, exam: 60, added: 1, passPercent: 50.0, activity: false },
          { name: 'اللغة الإنجليزية',        code: 'ENG',   cat: 'أساسية',     work: 40, exam: 60, added: 1, passPercent: 50.0, activity: false },
          { name: 'الرياضيات',               code: 'MATH',  cat: 'أساسية',     work: 40, exam: 60, added: 1, passPercent: 50.0, activity: false },
          { name: 'العلوم',                  code: 'SCI',   cat: 'أساسية',     work: 40, exam: 60, added: 1, passPercent: 50.0, activity: false },
          { name: 'الدراسات الاجتماعية',    code: 'SOC',   cat: 'أساسية',     work: 40, exam: 60, added: 1, passPercent: 50.0, activity: false },
          { name: 'التربية الدينية',         code: 'REL',   cat: 'دينية',      work: 40, exam: 60, added: 0, passPercent: 70.0, activity: false },
          { name: 'تكنولوجيا المعلومات والاتصالات', code: 'ICT', cat: 'إضافية', work: 40, exam: 60, added: 0, passPercent: 50.0, activity: false },
          { name: 'المهارات المهنية',       code: 'VOC',   cat: 'نشاط',       work: 0,  exam: 0,  added: 0, passPercent: 50.0, activity: true  },
          { name: 'القيم واحترام الآخر',     code: 'VAL',   cat: 'نشاط',       work: 0,  exam: 0,  added: 0, passPercent: 50.0, activity: true  },
          { name: 'التربية الفنية',          code: 'ART',   cat: 'نشاط',       work: 0,  exam: 0,  added: 0, passPercent: 50.0, activity: true  },
          { name: 'التربية الموسيقية',      code: 'MUS',   cat: 'نشاط',       work: 0,  exam: 0,  added: 0, passPercent: 50.0, activity: true  },
          { name: 'التربية البدنية والصحية',  code: 'PE',    cat: 'نشاط',       work: 0,  exam: 0,  added: 0, passPercent: 50.0, activity: true  },
          { name: 'مستوى رفيع (لغة أولى)',   code: 'AL1',   cat: 'مستوى رفيع', work: 40, exam: 60, added: 0, passPercent: 50.0, activity: false },
          { name: 'مستوى رفيع (لغة ثانية)',  code: 'AL2',   cat: 'مستوى رفيع', work: 40, exam: 60, added: 0, passPercent: 50.0, activity: false }
        ];
      } else if (gName.includes('الإعدادي')) {
        // Prep 1, 2, 3
        subList = [
          { name: 'اللغة العربية',            code: 'AR',    cat: 'أساسية',     work: 40, exam: 60, added: 1, passPercent: 50.0, activity: false },
          { name: 'اللغة الإنجليزية',        code: 'ENG',   cat: 'أساسية',     work: 40, exam: 60, added: 1, passPercent: 50.0, activity: false },
          { name: 'الرياضيات',               code: 'MATH',  cat: 'أساسية',     work: 40, exam: 60, added: 1, passPercent: 50.0, activity: false },
          { name: 'العلوم',                  code: 'SCI',   cat: 'أساسية',     work: 40, exam: 60, added: 1, passPercent: 50.0, activity: false },
          { name: 'الدراسات الاجتماعية',    code: 'SOC',   cat: 'أساسية',     work: 40, exam: 60, added: 1, passPercent: 50.0, activity: false },
          { name: 'التربية الدينية',         code: 'REL',   cat: 'دينية',      work: 40, exam: 60, added: 0, passPercent: 70.0, activity: false },
          { name: 'التربية الفنية',          code: 'ART',   cat: 'نشاط',       work: 40, exam: 60, added: 0, passPercent: 50.0, activity: false },
          { name: 'تكنولوجيا المعلومات والاتصالات', code: 'ICT', cat: 'إضافية', work: 40, exam: 60, added: 0, passPercent: 50.0, activity: false },
          { name: 'التربية الموسيقية',      code: 'MUS',   cat: 'نشاط',       work: 0,  exam: 0,  added: 0, passPercent: 50.0, activity: true  },
          { name: 'التربية الرياضية',        code: 'PE',    cat: 'نشاط',       work: 0,  exam: 0,  added: 0, passPercent: 50.0, activity: true  },
          { name: 'مستوى رفيع',             code: 'AL',    cat: 'مستوى رفيع', work: 40, exam: 60, added: 0, passPercent: 50.0, activity: false }
        ];
      }

      let order = 1;
      subList.forEach(s => {
        const termMax = s.activity ? 0 : (s.work + s.exam);
        const yearMax = s.activity ? 0 : (termMax * 2);
        const passMark = s.activity ? 0 : (yearMax * s.passPercent) / 100.0;
        dbInstance.run(`
          INSERT INTO exam_subjects (
            grade_id, subject_name_ar, subject_code, subject_category,
            term1_work_mark, term1_practical_mark, term1_exam_mark, term1_max_mark,
            term2_work_mark, term2_practical_mark, term2_exam_mark, term2_max_mark,
            year_max_mark, pass_mark, subject_pass_percent, written_pass_mode, written_pass_mark,
            actual_converted_mark, is_added_to_total, is_failing_subject, is_activity_subject, sort_order
          ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 0, ?, ?, ?, ?, ?, 'none', 0, 100, ?, 1, ?, ?)
        `, [
          g.id, s.name, s.code, s.cat,
          s.activity ? 0 : s.work,
          s.activity ? 0 : s.exam,
          termMax,
          s.activity ? 0 : s.work,
          s.activity ? 0 : s.exam,
          termMax,
          yearMax, passMark, s.passPercent,
          s.added, s.activity ? 1 : 0, order
        ]);
        order++;
      });
    });
    console.log('[DB Seed] Standard ministerial exam subjects seeded automatically for all grades.');
  } catch (err) {
    console.error('[DB Seed Default Subjects Error]:', err.message);
  }
};


const initPostgresMode = async (config) => {
  const { Pool } = require('pg');

  // Create DB if not exists
  const admin = new Pool({
    host: config.host, port: parseInt(config.port),
    user: config.user, password: config.password,
    database: 'postgres', connectionTimeoutMillis: 5000,
  });
  const ac = await admin.connect();
  const check = await ac.query('SELECT 1 FROM pg_database WHERE datname=$1', [config.database]);
  if (check.rowCount === 0) await ac.query(`CREATE DATABASE "${config.database}"`);
  ac.release();
  await admin.end();

  // Apply schema + seed
  const target = new Pool({
    host: config.host, port: parseInt(config.port),
    user: config.user, password: config.password,
    database: config.database, connectionTimeoutMillis: 10000,
  });
  const tc = await target.connect();
  tc.query(fs.readFileSync(path.join(__dirname, '../../database/schema.sql'), 'utf8'));
  if (fs.existsSync(path.join(__dirname, '../../database/seed.sql'))) {
    tc.query(fs.readFileSync(path.join(__dirname, '../../database/seed.sql'), 'utf8'));
  }
  tc.release();
  await target.end();

  if (pgPool) await pgPool.end();
  pgPool = new Pool({
    host: config.host, port: parseInt(config.port),
    user: config.user, password: config.password,
    database: config.database, max: 20,
    idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000,
  });
  sqliteDb = null;
  dbMode = 'postgres';
  currentConfig = { mode: 'postgres', ...config };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2));
  console.log('[DB] PostgreSQL mode initialized.');
  return true;
};

// ─── Public: Test PostgreSQL Connection ──────────────────────────────────────
const testPostgresConnection = async (config) => {
  const { Pool } = require('pg');
  const tmp = new Pool({
    host: config.host, port: parseInt(config.port),
    user: config.user, password: config.password,
    database: 'postgres', connectionTimeoutMillis: 5000,
  });
  try {
    const c = await tmp.connect();
    c.release();
    await tmp.end();
    return { success: true };
  } catch (err) {
    await tmp.end();
    return { success: false, error: err.message };
  }
};

// ─── Internal: Decode sql.js row to handle Uint8Array as UTF-8 strings ────────
// sql.js sometimes returns TEXT columns as Uint8Array when the WASM build
// does not automatically convert binary blobs to JS strings.
const _textDecoder = new (require('util').TextDecoder)('utf-8');
const _decodeRow = (row) => {
  const decoded = {};
  for (const [k, v] of Object.entries(row)) {
    if (v instanceof Uint8Array) {
      decoded[k] = _textDecoder.decode(v);
    } else {
      decoded[k] = v;
    }
  }
  return decoded;
};

// ─── Public: Generic Query ────────────────────────────────────────────────────
const query = async (sql, params = []) => {
  if (dbMode === 'sqlite') {
    const sqSql = sql.replace(/\$\d+/g, '?');
    const isWrite = /^\s*(insert|update|delete|create|drop|alter)/i.test(sqSql);
    try {
      if (isWrite) {
        sqliteDb.run(sqSql, params);
        _flushSQLite();
        return { rows: [], rowCount: 1 };
      } else {
        const stmt = sqliteDb.prepare(sqSql);
        if (params && params.length) stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(_decodeRow(stmt.getAsObject()));
        stmt.free();
        return { rows, rowCount: rows.length };
      }
    } catch (err) {
      console.error('[DB Query Error]', err.message, '| SQL:', sqSql);
      throw err;
    }
  } else {
    return pgPool.query(sql, params);
  }
};

// ─── Public: SQLite Transaction ───────────────────────────────────────────────
const runTransaction = (fn) => {
  if (dbMode !== 'sqlite') throw new Error('runTransaction is SQLite-only.');
  try {
    sqliteDb.run('BEGIN TRANSACTION;');
    const result = fn();
    sqliteDb.run('COMMIT;');
    _flushSQLite();
    return result;
  } catch (err) {
    try { sqliteDb.run('ROLLBACK;'); } catch (_) {}
    throw err;
  }
};

// ─── Bootstrap ───────────────────────────────────────────────────────────────
_restoreFromConfig();   // async, fires in background — safe because requests arrive later

const reloadSQLite = async () => {
  if (dbMode === 'sqlite' && currentConfig && currentConfig.dbPath) {
    await initSQLiteMode(currentConfig.dbPath);
    console.log('[DB] SQLite reloaded & migrated successfully.');
  }
};

module.exports = {
  getMode, getConfig, isConfigured,
  getSQLiteDb, getPool,
  initSQLiteMode, initPostgresMode, testPostgresConnection,
  query, runTransaction,
  flushSQLite: _flushSQLite,
  reloadSQLite,
};

