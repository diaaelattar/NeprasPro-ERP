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

// ─── Internal: Save current in-memory SQLite state to disk ───────────────────
const _flushSQLite = () => {
  if (!sqliteDb || !currentConfig || !currentConfig.dbPath) return;
  const data = sqliteDb.export();
  fs.writeFileSync(currentConfig.dbPath, Buffer.from(data));
};

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

    // 2. Check if we need to migrate the status CHECK constraint to ('promoted','retained','suspended')
    const stmtMaster = dbInstance.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='students'");
    let tableSql = "";
    if (stmtMaster.step()) {
      tableSql = stmtMaster.getAsObject().sql || "";
    }
    stmtMaster.free();

    if (tableSql.includes("'active'") || tableSql.includes("'transferred'") || tableSql.includes("'withdrawn'") || tableSql.includes("'graduated'")) {
      console.log("[DB Migration] Upgrading students status values to ('promoted','retained','suspended')...");
      
      dbInstance.run("PRAGMA foreign_keys=OFF;");
      dbInstance.run("ALTER TABLE students RENAME TO students_old;");
      
      // Create new table
      dbInstance.run(`
        CREATE TABLE students (
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
          second_language       TEXT CHECK (second_language IN ('فرنسي','ألماني','إيطالي','إسباني','لا يوجد') OR second_language IS NULL),
          secondary_track       TEXT CHECK (secondary_track IN ('medicine_life','engineering_cs','business','arts_humanities','science_bio','science_math','literary') OR secondary_track IS NULL),
          secondary_elective    TEXT,
          is_merged             INTEGER DEFAULT 0,
          merged_grade_id       INTEGER REFERENCES grades_lookup(id),
          merge_type            TEXT,
          merge_decision_number TEXT,
          merge_decision_date   TEXT,
          merge_notes           TEXT,
          enrollment_date       TEXT DEFAULT (date('now')),
          status                TEXT DEFAULT 'promoted' CHECK (status IN ('promoted','retained','suspended','disconnected','excluded','deleted')),
          created_at            TEXT DEFAULT (datetime('now'))
        );
      `);

      // Copy data with mapped status values
      dbInstance.run(`
        INSERT INTO students (
          id, section_id, stage_id, grade_id, academic_year_id, student_code,
          full_name_ar, full_name_en, birth_date, birth_place, nationality_id, national_id, gender, religion,
          guardian_name, guardian_relation, guardian_national_id, guardian_phone, guardian_phone_2, guardian_job,
          mother_name, mother_nationality_id, mother_national_id, address, student_phone,
          second_language, secondary_track, secondary_elective,
          is_merged, merged_grade_id, merge_type, merge_decision_number, merge_decision_date, merge_notes,
          enrollment_date, status, created_at
        )
        SELECT 
          id, section_id, stage_id, grade_id, academic_year_id, student_code,
          full_name_ar, full_name_en, birth_date, birth_place, nationality_id, national_id, gender, religion,
          guardian_name, guardian_relation, guardian_national_id, guardian_phone, guardian_phone_2, guardian_job,
          mother_name, mother_nationality_id, mother_national_id, address, student_phone,
          second_language, secondary_track, secondary_elective,
          is_merged, merged_grade_id, merge_type, merge_decision_number, merge_decision_date, merge_notes,
          enrollment_date,
          CASE 
            WHEN status = 'active' THEN 'promoted'
            WHEN status = 'withdrawn' THEN 'suspended'
            WHEN status = 'suspended' THEN 'suspended'
            WHEN status = 'retained' THEN 'retained'
            ELSE 'promoted'
          END,
          created_at
        FROM students_old;
      `);

      dbInstance.run("DROP TABLE students_old;");
      dbInstance.run("PRAGMA foreign_keys=ON;");
      console.log("[DB Migration] Upgrade complete and students_old dropped.");
    }

    // 2b. Check if students table status CHECK constraint needs expansion for ('disconnected','excluded','deleted')
    const stmtStatusCheck = dbInstance.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='students'");
    let curStudentsSql = "";
    if (stmtStatusCheck.step()) {
      curStudentsSql = stmtStatusCheck.getAsObject().sql || "";
    }
    stmtStatusCheck.free();

    if (curStudentsSql && (!curStudentsSql.includes("'disconnected'") || !curStudentsSql.includes("'excluded'") || !curStudentsSql.includes("'deleted'"))) {
      console.log("[DB Migration] Expanding students status CHECK constraint to allow disconnected, excluded, deleted...");
      
      let newTableSql = curStudentsSql;
      if (/CHECK\s*\(\s*status\s+IN\s*\([^)]+\)\s*\)/i.test(curStudentsSql)) {
        newTableSql = curStudentsSql.replace(/CHECK\s*\(\s*status\s+IN\s*\([^)]+\)\s*\)/i, "CHECK (status IN ('promoted','retained','suspended','disconnected','excluded','deleted'))");
      }

      dbInstance.run("PRAGMA foreign_keys=OFF;");
      dbInstance.run("ALTER TABLE students RENAME TO students_status_old;");
      dbInstance.run(newTableSql);

      const stmtCols = dbInstance.prepare("PRAGMA table_info(students_status_old)");
      const existingCols = [];
      while (stmtCols.step()) {
        existingCols.push(stmtCols.getAsObject().name);
      }
      stmtCols.free();

      const colList = existingCols.join(', ');
      dbInstance.run(`INSERT INTO students (${colList}) SELECT ${colList} FROM students_status_old;`);
      dbInstance.run("DROP TABLE students_status_old;");
      dbInstance.run("PRAGMA foreign_keys=ON;");
      console.log("[DB Migration] Successfully expanded students status CHECK constraint.");
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
          capacity         INTEGER DEFAULT 40,
          UNIQUE (grade_id, academic_year_id, class_name)
        );
      `);
      console.log('[DB Migration] Created classes table.');
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

    // 6. Ensure emis_student_code, enrollment_status, and is_excluded columns exist on students
    if (!cols2.includes('emis_student_code')) {
      dbInstance.run("ALTER TABLE students ADD COLUMN emis_student_code TEXT;");
      console.log("[DB Migration] Added emis_student_code to students.");
    }
    if (!cols2.includes('enrollment_status')) {
      dbInstance.run("ALTER TABLE students ADD COLUMN enrollment_status TEXT DEFAULT 'منقول';");
      console.log("[DB Migration] Added enrollment_status to students.");
    }
    if (!cols2.includes('is_excluded')) {
      dbInstance.run("ALTER TABLE students ADD COLUMN is_excluded INTEGER DEFAULT 0;");
      console.log("[DB Migration] Added is_excluded to students.");
    }

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
        national_id           TEXT UNIQUE NOT NULL,
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
      ['is_exempt', 'INTEGER DEFAULT 0']
    ];

    cmAddCols.forEach(([col, type]) => {
      if (!cmCols.includes(col)) {
        try {
          dbInstance.run(`ALTER TABLE control_marks ADD COLUMN ${col} ${type};`);
          console.log(`[DB Migration] Added ${col} to control_marks table.`);
        } catch (e) {}
      }
    });


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
      ['is_failing_subject', 'INTEGER DEFAULT 1']
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

  // If the file exists from a previous (interrupted) setup, delete it so we start fresh
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('[DB] Deleted existing db file for clean init.');
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
  _migrateMasterPresetStructure(dbInstance);
  _flushSQLite();
};

const _migrateMasterPresetStructure = (dbInstance) => {
  try {
    const sqliteDb = dbInstance;
    const { MASTER_STRUCTURE } = require('./master_structure');

    const _all = (sql, params = []) => {
      const stmt = sqliteDb.prepare(sql);
      if (params.length) stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    };
    const _get = (sql, params = []) => _all(sql, params)[0] || null;

    const secCols = _all("PRAGMA table_info(sections)").map(c => c.name);
    if (!secCols.includes('code')) sqliteDb.run("ALTER TABLE sections ADD COLUMN code INTEGER;");
    if (!secCols.includes('is_active')) sqliteDb.run("ALTER TABLE sections ADD COLUMN is_active INTEGER DEFAULT 1;");

    const stgCols = _all("PRAGMA table_info(stages_lookup)").map(c => c.name);
    if (!stgCols.includes('code')) sqliteDb.run("ALTER TABLE stages_lookup ADD COLUMN code INTEGER;");
    if (!stgCols.includes('is_active')) sqliteDb.run("ALTER TABLE stages_lookup ADD COLUMN is_active INTEGER DEFAULT 1;");

    const grdCols = _all("PRAGMA table_info(grades_lookup)").map(c => c.name);
    if (!grdCols.includes('code')) sqliteDb.run("ALTER TABLE grades_lookup ADD COLUMN code INTEGER;");
    if (!grdCols.includes('is_active')) sqliteDb.run("ALTER TABLE grades_lookup ADD COLUMN is_active INTEGER DEFAULT 1;");

    MASTER_STRUCTURE.forEach(sec => {
      let existingSec = _get("SELECT * FROM sections WHERE code = ? OR name = ?", [sec.section_code, sec.name]);
      let secId;
      if (existingSec) {
        secId = existingSec.id;
        sqliteDb.run("UPDATE sections SET code = ?, is_active = COALESCE(is_active, 1) WHERE id = ?", [sec.section_code, secId]);
      } else {
        sqliteDb.run(
          "INSERT INTO sections (name, type, education_type, legal_status, code, is_active) VALUES (?, ?, ?, ?, ?, ?)",
          [sec.name, sec.type, sec.education_type, 'حكومي', sec.section_code, 1]
        );
        secId = _get("SELECT last_insert_rowid() AS id").id;
      }

      sec.stages.forEach(stg => {
        let existingStg = _get("SELECT * FROM stages_lookup WHERE section_id = ? AND (stage_name = ? OR code = ?)", [secId, stg.stage_name, stg.stage_code]);
        let stgId;
        if (existingStg) {
          stgId = existingStg.id;
          sqliteDb.run("UPDATE stages_lookup SET code = ?, is_active = COALESCE(is_active, 1) WHERE id = ?", [stg.stage_code, stgId]);
        } else {
          sqliteDb.run(
            "INSERT INTO stages_lookup (section_id, stage_name, years_count, display_order, code, is_active) VALUES (?, ?, ?, ?, ?, ?)",
            [secId, stg.stage_name, stg.years_count, stg.display_order, stg.stage_code, 1]
          );
          stgId = _get("SELECT last_insert_rowid() AS id").id;
        }

        stg.grades.forEach(grd => {
          let existingGrd = _get(
            "SELECT * FROM grades_lookup WHERE stage_id = ? AND (grade_number = ? OR grade_name_ar = ? OR code = ?)",
            [stgId, grd.grade_number, grd.grade_name_ar, grd.grade_code]
          );
          if (existingGrd) {
            sqliteDb.run("UPDATE grades_lookup SET code = ?, grade_name_ar = ?, is_active = COALESCE(is_active, 1) WHERE id = ?", [grd.grade_code, grd.grade_name_ar, existingGrd.id]);
          } else {
            sqliteDb.run(
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

// ─── Public: Initialize PostgreSQL Mode ──────────────────────────────────────
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
    await _openSQLite(currentConfig.dbPath);
    console.log('[DB] SQLite reloaded successfully.');
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

