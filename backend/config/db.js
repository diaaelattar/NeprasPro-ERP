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
    if (buf && buf.length > 0) {
      sqliteDb = new SQL.Database(buf);
      sqliteDb.run('PRAGMA foreign_keys = ON;');
      console.log(`[DB] SQLite loaded from file: ${dbPath} (${buf.length} bytes)`);
    } else {
      sqliteDb = new SQL.Database();
      sqliteDb.run('PRAGMA foreign_keys = ON;');
      console.log(`[DB] SQLite 0-byte file found on disk. Initialized empty in-memory DB.`);
    }
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
          emis_student_code             TEXT,
          enrollment_status             TEXT DEFAULT 'منقول',
          is_excluded                   INTEGER DEFAULT 0,
          class_id                      INTEGER REFERENCES classes(id),
          student_serial_in_class       INTEGER DEFAULT 0,
          student_serial_in_grade       INTEGER DEFAULT 0,
          is_deleted                    INTEGER DEFAULT 0,
          deleted_at                    TEXT,
          deletion_reason               TEXT,
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

      // Get columns in the new (clean) students table
      const stmtNewCols = dbInstance.prepare("PRAGMA table_info(students)");
      const newCols = [];
      while (stmtNewCols.step()) {
        newCols.push(stmtNewCols.getAsObject().name);
      }
      stmtNewCols.free();

      // Only copy columns that exist in BOTH tables to avoid "no column named X" errors
      const newColSet = new Set(newCols);
      const safeColList = existingCols.filter(c => newColSet.has(c)).join(', ');

      dbInstance.run(`INSERT INTO students (${safeColList}) SELECT ${safeColList} FROM students_migration_backup;`);
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
          class_number     INTEGER NOT NULL DEFAULT 1,
          display_order    INTEGER DEFAULT 1,
          class_code       TEXT,
          capacity         INTEGER DEFAULT 40,
          UNIQUE (grade_id, academic_year_id, class_name)
        );
        CREATE INDEX IF NOT EXISTS idx_classes_sort ON classes (grade_id, academic_year_id, class_number ASC);
      `);
      console.log('[DB Migration] Created classes table with class_number.');
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
        if (!clsCols.includes('class_number')) {
          dbInstance.run("ALTER TABLE classes ADD COLUMN class_number INTEGER DEFAULT 1;");
          console.log('[DB Migration] Added class_number column to classes table.');
        }
        if (!clsCols.includes('display_order')) {
          dbInstance.run("ALTER TABLE classes ADD COLUMN display_order INTEGER DEFAULT 1;");
          console.log('[DB Migration] Added display_order column to classes table.');
        }
        dbInstance.run("CREATE INDEX IF NOT EXISTS idx_classes_sort ON classes (grade_id, academic_year_id, class_number ASC);");

        // Backfill class_number from class_name for existing records
        try {
          const allExistingClasses = [];
          const sCls = dbInstance.prepare("SELECT id, class_name, grade_id, academic_year_id FROM classes WHERE class_number IS NULL OR class_number = 1");
          while (sCls.step()) allExistingClasses.push(sCls.getAsObject());
          sCls.free();

          const gradeCounters = {};
          for (const cl of allExistingClasses) {
            const key = `${cl.grade_id}_${cl.academic_year_id}`;
            gradeCounters[key] = (gradeCounters[key] || 0) + 1;
            
            let extractedNum = null;
            const cName = cl.class_name ? String(cl.class_name).trim() : '';
            // Pattern like "1 / 3" or "1 / 3 ع" or "3/1"
            const slashMatch = cName.match(/\/\s*(\d+)/);
            if (slashMatch) {
              extractedNum = parseInt(slashMatch[1], 10);
            } else {
              const numMatch = cName.match(/(\d+)/);
              if (numMatch) extractedNum = parseInt(numMatch[1], 10);
            }

            const finalNum = (extractedNum && extractedNum > 0) ? extractedNum : gradeCounters[key];
            dbInstance.run("UPDATE classes SET class_number = ?, display_order = ? WHERE id = ?", [finalNum, finalNum, cl.id]);
          }
        } catch (_) {}
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

    // 4b. Ensure 'stage_serial_counters' table exists
    try {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS stage_serial_counters (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          section_id       INTEGER REFERENCES sections(id) ON DELETE CASCADE,
          stage_id         INTEGER REFERENCES stages_lookup(id) ON DELETE CASCADE,
          prefix           TEXT NOT NULL,
          last_serial      INTEGER DEFAULT 0,
          academic_year_id INTEGER REFERENCES academic_years(id)
        );
      `);
    } catch (_) {}

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

    // 6b. New dedicated columns for class, codes & Ministry fields
    const newStudentCols = [
      ['class_id', 'INTEGER REFERENCES classes(id)'],
      ['section_code', 'TEXT'],
      ['stage_code', 'TEXT'],
      ['grade_code', 'TEXT'],
      ['class_code', 'TEXT'],
      ['student_serial_in_class', 'INTEGER DEFAULT 0'],
      ['student_serial_in_grade', 'INTEGER DEFAULT 0'],
      ['first_name', 'TEXT'],
      ['father_name', 'TEXT'],
      ['grandfather_name', 'TEXT'],
      ['family_name', 'TEXT'],
      ['mother_first_name', 'TEXT'],
      ['mother_second_name', 'TEXT'],
      ['mother_third_name', 'TEXT'],
      ['mother_fourth_name', 'TEXT'],
      ['birth_governorate_id', 'INTEGER'],
      ['father_nationality_id', 'INTEGER REFERENCES nationalities(id)'],
      ['study_type_id', 'INTEGER'],
      ['registration_status_id', 'INTEGER'],
      ['division_id', 'INTEGER'],
      ['specialization_id', 'INTEGER'],
      ['language_id_1', 'INTEGER'],
      ['language_id_2', 'INTEGER'],
      ['disability_id', 'INTEGER']
    ];

    newStudentCols.forEach(([col, type]) => {
      if (!cols2.includes(col)) {
        try {
          dbInstance.run(`ALTER TABLE students ADD COLUMN ${col} ${type};`);
          console.log(`[DB Migration] Added ${col} to students table.`);
        } catch (_) {}
      }
    });

    // Ensure fast lookup indexes on students
    try {
      dbInstance.run("CREATE INDEX IF NOT EXISTS idx_students_dedicated_lookup ON students(section_id, stage_id, grade_id, class_id);");
      dbInstance.run("CREATE INDEX IF NOT EXISTS idx_students_code_lookup ON students(section_code, stage_code, grade_code, class_code);");
    } catch (_) {}

    // Backfill direct codes for existing students
    try {
      dbInstance.run(`
        UPDATE students SET
          section_code = (SELECT code FROM sections WHERE sections.id = students.section_id),
          stage_code   = (SELECT code FROM stages_lookup WHERE stages_lookup.id = students.stage_id),
          grade_code   = (SELECT code FROM grades_lookup WHERE grades_lookup.id = students.grade_id),
          class_code   = (SELECT class_code FROM classes WHERE classes.id = students.class_id)
        WHERE section_code IS NULL OR stage_code IS NULL OR grade_code IS NULL;
      `);
      console.log("[DB Migration] Backfilled direct codes for existing students.");
    } catch (_) {}

    // Standardize grades_lookup names to 'الصف الأول', 'الصف الثاني', etc.
    try {
      const arabicNumerals = ['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر','الحادي عشر','الثاني عشر'];
      arabicNumerals.forEach((numeral, idx) => {
        dbInstance.run(
          "UPDATE grades_lookup SET grade_name_ar = ? WHERE grade_number = ?;",
          [`الصف ${numeral}`, idx + 1]
        );
      });
      // Ensure inactive stages are set to is_active = 0
      dbInstance.run("UPDATE stages_lookup SET is_active = 0 WHERE section_id NOT IN (SELECT id FROM sections WHERE is_active = 1);");
      console.log("[DB Migration] Standardized grade names to 'الصف الأول', 'الصف الثاني'...");
    } catch (_) {}

    // Enterprise RBAC Permissions Matrix Migration
    try {
      try {
        dbInstance.run("ALTER TABLE permissions ADD COLUMN category TEXT;");
      } catch (_) {}

      const fullPerms = [
        // 1. Students
        ['students.view', 'استعراض بيانات وقوائم الطلاب', 'students'],
        ['students.create', 'قيد وتسجيل طالب جديد', 'students'],
        ['students.edit', 'تعديل وتحديث بيانات الطلاب', 'students'],
        ['students.delete', 'حذف وأرشفة قيد الطلاب', 'students'],
        ['students.distribute', 'توزيع الفصول والقوائم المدرسية', 'students'],
        ['students.transfers', 'إدارة التحويلات المدرسية', 'students'],
        ['students.emis_sync', 'مزامنة واستيراد بيانات EMIS', 'students'],
        ['students.reports', 'استخراج سجلات القيد وكشوف 41 والمطبوعات', 'students'],
        
        // 2. Staff HR
        ['staff.view', 'استعراض ملفات وسجلات الموظفين', 'staff'],
        ['staff.create', 'إضافة كادر وظيفي جديد', 'staff'],
        ['staff.edit', 'تعديل بيانات الموظف والأنصبة والترقيات', 'staff'],
        ['staff.delete', 'أرشفة وإنهاء خدمة موظف', 'staff'],
        ['staff.reports', 'استخراج كشوف النصاب والتكليفات الرسمية', 'staff'],
        
        // 3. Control & Exams
        ['control.view', 'استعراض شاشات وسجلات الكنترول', 'control'],
        ['control.setup', 'إعداد اللجان وأرقام الجلوس والتوزيع السري', 'control'],
        ['control.input_marks', 'رصد درجات الامتحانات وأعمال السنة', 'control'],
        ['control.modify_marks', 'تعديل درجات مرصودة سابقاً', 'control'],
        ['control.review_raffa', 'لجنة الرفع والحالات الخاصة وقواعد الجبر', 'control'],
        ['control.lock', 'اعتماد وإغلاق الفترات الامتحانية نهائياً', 'control'],
        ['control.print_certificates', 'طباعة الشهادات وكشوف النتائج والشيت الكنترولي', 'control'],
        
        // 4. Finance & Treasury
        ['finance.view', 'استعراض الرسوم والمتحصلات والخزينة', 'finance'],
        ['finance.collect', 'تحصيل الرسوم والأقساط وإصدار سندات قبض', 'finance'],
        ['finance.discounts', 'تطبيق الإعفاءات ومنح الحالات الخاصة', 'finance'],
        ['finance.reports', 'استخراج كشوف الحساب والميزانيات المالية', 'finance'],
        
        // 5. System Administration
        ['admin.users_manage', 'إدارة حسابات المستخدمين وكلمات المرور', 'admin'],
        ['admin.roles_perms', 'تخصيص وتعديل مصفوفة الصلاحيات والأدوار', 'admin'],
        ['admin.institution_settings', 'إعدادات المؤسسة والهياكل والأعوام الدراسية', 'admin'],
        ['admin.backups', 'إنشاء واستعادة النسخ الاحتياطية للأمان', 'admin'],
        ['admin.audit_logs', 'استعراض سجل العمليات والتدقيق الأمني', 'admin'],
        ['admin.system_reset', 'إعادة ضبط المصنع وتصفير النظام', 'admin']
      ];

      for (const [key, nameAr, cat] of fullPerms) {
        dbInstance.run(
          "INSERT INTO permissions (perm_key, perm_name_ar, category) VALUES (?, ?, ?) ON CONFLICT(perm_key) DO UPDATE SET perm_name_ar=excluded.perm_name_ar, category=excluded.category;",
          [key, nameAr, cat]
        );
      }

      // Ensure super_admin has all permissions
      dbInstance.run(`
        INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM roles r, permissions p WHERE r.role_name = 'super_admin'
      `);

      // Ensure data_entry has student permissions
      dbInstance.run(`
        INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM roles r, permissions p WHERE r.role_name = 'data_entry' AND p.category = 'students'
      `);

      // Ensure hr_officer has staff permissions
      dbInstance.run(`
        INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM roles r, permissions p WHERE r.role_name = 'hr_officer' AND p.category = 'staff'
      `);

      // Ensure head_control has control permissions
      dbInstance.run(`
        INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM roles r, permissions p WHERE r.role_name = 'head_control' AND p.category = 'control'
      `);

      // Ensure accountant has finance permissions
      dbInstance.run(`
        INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM roles r, permissions p WHERE r.role_name = 'accountant' AND p.category = 'finance'
      `);

      // Ensure viewer has view permissions
      dbInstance.run(`
        INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM roles r, permissions p WHERE r.role_name = 'viewer' AND p.perm_key LIKE '%.view'
      `);

      console.log("[DB Migration] Enterprise RBAC permissions & role mappings verified.");
    } catch (err) {
      console.error("[DB Migration RBAC Error]", err.message);
    }

    // 6c. Create student_academic_history table for lifecycle tracking
    const sahStmt = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='student_academic_history'");
    const sahExists = sahStmt.step();
    sahStmt.free();
    if (!sahExists) {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS student_academic_history (
          id                      INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id              INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          academic_year_id        INTEGER NOT NULL REFERENCES academic_years(id),
          section_id              INTEGER NOT NULL REFERENCES sections(id),
          stage_id                INTEGER NOT NULL REFERENCES stages_lookup(id),
          grade_id                INTEGER NOT NULL REFERENCES grades_lookup(id),
          class_id                INTEGER REFERENCES classes(id),
          section_code            TEXT,
          stage_code              TEXT,
          grade_code              TEXT,
          class_code              TEXT,
          student_serial_in_class INTEGER DEFAULT 0,
          student_serial_in_grade INTEGER DEFAULT 0,
          enrollment_status       TEXT DEFAULT 'promoted',
          created_at              TEXT DEFAULT (datetime('now')),
          UNIQUE (student_id, academic_year_id)
        );
      `);
      dbInstance.run("CREATE INDEX IF NOT EXISTS idx_student_academic_history ON student_academic_history(student_id, academic_year_id);");
      console.log("[DB Migration] Created student_academic_history table.");
    } else {
      // Ensure history table also has code columns
      try {
        const sahCols = [];
        const sahInfo = dbInstance.prepare("PRAGMA table_info(student_academic_history)");
        while (sahInfo.step()) sahCols.push(sahInfo.getAsObject().name);
        sahInfo.free();

        ['section_code', 'stage_code', 'grade_code', 'class_code'].forEach(c => {
          if (!sahCols.includes(c)) {
            dbInstance.run(`ALTER TABLE student_academic_history ADD COLUMN ${c} TEXT;`);
          }
        });
      } catch (_) {}
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

    // 7b. Ensure institution_config table exists with config_key column
    try {
      sqliteDb ? sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS institution_config (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          config_key   TEXT UNIQUE NOT NULL,
          config_value TEXT,
          updated_at   TEXT DEFAULT (datetime('now'))
        );
      `) : dbInstance.run(`
        CREATE TABLE IF NOT EXISTS institution_config (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          config_key   TEXT UNIQUE NOT NULL,
          config_value TEXT,
          updated_at   TEXT DEFAULT (datetime('now'))
        );
      `);
    } catch (_) {}

    // 8. Ensure special case tables exist
    try {
      const sctStmt = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='special_case_types'");
      const sctExists = sctStmt.step();
      sctStmt.free();
      if (!sctExists) {
        dbInstance.run(`
          CREATE TABLE IF NOT EXISTS special_case_types (
            id                 INTEGER PRIMARY KEY AUTOINCREMENT,
            code               TEXT UNIQUE NOT NULL,
            name_ar            TEXT NOT NULL,
            description        TEXT,
            requires_document  INTEGER DEFAULT 0,
            is_active          INTEGER DEFAULT 1
          );
        `);
        console.log('[DB Migration] Created special_case_types table.');
      }
      dbInstance.run("INSERT OR IGNORE INTO special_case_types (name_ar, code) VALUES ('محول (تحويل وارد)', 'transferred_in')");
      dbInstance.run("INSERT OR IGNORE INTO special_case_types (name_ar, code) VALUES ('محول (تحويل صادر)', 'transferred_out')");
    } catch (e) {
      console.warn('[DB Migration] special_case_types error:', e.message);
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

    // 9b. Ensure fees_status and books_status columns in student_transfers
    try {
      const trColsStmt = dbInstance.prepare("PRAGMA table_info(student_transfers)");
      const trCols = [];
      while (trColsStmt.step()) trCols.push(trColsStmt.getAsObject().name);
      trColsStmt.free();
      if (!trCols.includes('fees_status')) {
        dbInstance.run("ALTER TABLE student_transfers ADD COLUMN fees_status TEXT DEFAULT 'سدد';");
        console.log("[DB Migration] Added fees_status to student_transfers.");
      }
      if (!trCols.includes('books_status')) {
        dbInstance.run("ALTER TABLE student_transfers ADD COLUMN books_status TEXT DEFAULT 'استلم';");
        console.log("[DB Migration] Added books_status to student_transfers.");
      }
      if (!trCols.includes('duration_in_grade')) {
        dbInstance.run("ALTER TABLE student_transfers ADD COLUMN duration_in_grade TEXT DEFAULT 'سنة أولى (مستجد)';");
        console.log("[DB Migration] Added duration_in_grade to student_transfers.");
      }
    } catch (e) {
      console.warn('[DB Migration] student_transfers column check error:', e.message);
    }

    // 10. Ensure institution_config has the new school settings columns
    const instStmt = dbInstance.prepare("PRAGMA table_info(institution_config)");
    const instCols = [];
    while (instStmt.step()) instCols.push(instStmt.getAsObject().name);
    instStmt.free();

    if (!instCols.includes('governorate_id')) {
      dbInstance.run("ALTER TABLE institution_config ADD COLUMN governorate_id INTEGER;");
      console.log("[DB Migration] Added governorate_id to institution_config.");
    }
    if (!instCols.includes('administration_id')) {
      dbInstance.run("ALTER TABLE institution_config ADD COLUMN administration_id INTEGER;");
      console.log("[DB Migration] Added administration_id to institution_config.");
    }
    if (!instCols.includes('classification_id')) {
      dbInstance.run("ALTER TABLE institution_config ADD COLUMN classification_id INTEGER;");
      console.log("[DB Migration] Added classification_id to institution_config.");
    }
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

    // Check if sections table has legacy restrictive CHECK constraint lacking 'international'
    const secSqlStmt = dbInstance.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='sections'");
    let secTableSql = "";
    if (secSqlStmt.step()) secTableSql = secSqlStmt.getAsObject().sql || "";
    secSqlStmt.free();

    if (secTableSql && (secTableSql.includes("CHECK (type IN") || secTableSql.includes("CHECK(type IN")) && !secTableSql.includes("'international'")) {
      console.log("[DB Migration] Upgrading sections table DDL to support 'international' section...");
      try {
        dbInstance.run("PRAGMA foreign_keys=OFF;");
        dbInstance.run("ALTER TABLE sections RENAME TO sections_old;");
        dbInstance.run(`
          CREATE TABLE sections (
            id                              INTEGER PRIMARY KEY AUTOINCREMENT,
            name                            TEXT UNIQUE NOT NULL,
            type                            TEXT NOT NULL,
            education_type                  TEXT,
            legal_status                    TEXT,
            code                            INTEGER,
            is_active                       INTEGER DEFAULT 1,
            section_director_name           TEXT,
            section_director_qualification  TEXT,
            section_director_national_id    TEXT,
            section_director_phone          TEXT,
            section_deputy_name             TEXT,
            section_deputy_phone            TEXT,
            students_vice_name              TEXT,
            students_vice_phone             TEXT,
            staff_vice_name                 TEXT,
            staff_vice_phone                TEXT
          );
        `);
        const stmtOld = dbInstance.prepare("PRAGMA table_info(sections_old)");
        const oldCols = [];
        while (stmtOld.step()) oldCols.push(stmtOld.getAsObject().name);
        stmtOld.free();

        const commonCols = oldCols.filter(c => [
          'id', 'name', 'type', 'education_type', 'legal_status', 'code', 'is_active',
          'section_director_name', 'section_director_qualification', 'section_director_national_id',
          'section_director_phone', 'section_deputy_name', 'section_deputy_phone',
          'students_vice_name', 'students_vice_phone', 'staff_vice_name', 'staff_vice_phone'
        ].includes(c));

        if (commonCols.length > 0) {
          const colList = commonCols.join(',');
          dbInstance.run(`INSERT INTO sections (${colList}) SELECT ${colList} FROM sections_old;`);
        }
        dbInstance.run("DROP TABLE sections_old;");
        dbInstance.run("PRAGMA foreign_keys=ON;");
        console.log("[DB Migration] sections table upgraded cleanly.");
      } catch (migErr) {
        console.warn("[DB Migration Warning] sections upgrade skipped:", migErr.message);
        try { dbInstance.run("PRAGMA foreign_keys=ON;"); } catch (_) {}
      }
    }

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

    // Ensure main section is active by default
    try {
      dbInstance.run("UPDATE sections SET is_active = 1 WHERE id = 1 OR code = 100 OR name = 'القسم العربي' OR name = 'القسم الرئيسي';");
      // Do not auto-activate all stages on startup — stages are active only when selected by user in wizard or added in settings.
    } catch (_) {}

    // Ensure classes table has section_id, stage_id, class_code
    try {
      const clsCols = [];
      const clsStmt = dbInstance.prepare("PRAGMA table_info(classes)");
      while (clsStmt.step()) clsCols.push(clsStmt.getAsObject().name);
      clsStmt.free();
      if (!clsCols.includes('section_id')) dbInstance.run("ALTER TABLE classes ADD COLUMN section_id INTEGER REFERENCES sections(id);");
      if (!clsCols.includes('stage_id')) dbInstance.run("ALTER TABLE classes ADD COLUMN stage_id INTEGER REFERENCES stages_lookup(id);");
      if (!clsCols.includes('class_code')) dbInstance.run("ALTER TABLE classes ADD COLUMN class_code INTEGER;");
    } catch (_) {}

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

    // Ensure settings_audit_log table exists (migration for older databases)
    try {
      dbInstance.run(`
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
      console.log('[DB Migration] settings_audit_log table ensured.');
    } catch (e) {
      console.warn('[DB Migration] settings_audit_log already exists or error:', e.message);
    }

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
        // No years at all → create default initial year
        dbInstance.run(
          'INSERT INTO academic_years (year_label, start_date, end_date, is_current) VALUES (?, ?, ?, 1)',
          [label, startDate, endDate]
        );
        console.log(`[DB Migration] Created initial academic year: ${label} (is_current=1)`);
      } else {
        // Ensure at least one year is marked as current without creating extra years
        const hasCurrentStmt = dbInstance.prepare('SELECT id FROM academic_years WHERE is_current = 1 LIMIT 1');
        const hasCurrent = hasCurrentStmt.step();
        hasCurrentStmt.free();
        if (!hasCurrent) {
          dbInstance.run('UPDATE academic_years SET is_current = 1 WHERE id = (SELECT MAX(id) FROM academic_years)');
        }

        // Cleanup unreferenced non-current academic years (e.g., legacy auto-created 2025/2026)
        try {
          dbInstance.run(`
            DELETE FROM academic_years 
            WHERE is_current = 0 
              AND id NOT IN (SELECT DISTINCT academic_year_id FROM students WHERE academic_year_id IS NOT NULL)
              AND id NOT IN (SELECT DISTINCT academic_year_id FROM classrooms WHERE academic_year_id IS NOT NULL);
          `);
        } catch (_) {}
      }
    } catch (yearErr) {
      console.warn('[DB Migration] Academic year auto-correction skipped:', yearErr.message);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 18. Ensure institution structure tables exist (migration guard for old DBs)
    //     These tables are also created in _seedLookupData, but if _seedLookupData
    //     throws early, setup.controller.js would fail with "no such table".
    // ──────────────────────────────────────────────────────────────────────────
    try {
      dbInstance.run(`CREATE TABLE IF NOT EXISTS sections_master_lookup (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        code     TEXT UNIQUE NOT NULL,
        name_ar  TEXT UNIQUE NOT NULL
      );`);
      dbInstance.run(`CREATE TABLE IF NOT EXISTS education_types_lookup (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        code     TEXT UNIQUE NOT NULL,
        name_ar  TEXT UNIQUE NOT NULL
      );`);
      dbInstance.run(`CREATE TABLE IF NOT EXISTS institution_sections (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        section_master_id INTEGER NOT NULL REFERENCES sections_master_lookup(id),
        education_type_id INTEGER NOT NULL REFERENCES education_types_lookup(id),
        is_active         INTEGER DEFAULT 1,
        UNIQUE(section_master_id)
      );`);
      dbInstance.run(`CREATE TABLE IF NOT EXISTS institution_stages (
        id                     INTEGER PRIMARY KEY AUTOINCREMENT,
        institution_section_id INTEGER NOT NULL REFERENCES institution_sections(id) ON DELETE CASCADE,
        stage_master_id        INTEGER NOT NULL REFERENCES stages_master_lookup(id),
        is_active              INTEGER DEFAULT 1,
        UNIQUE(institution_section_id, stage_master_id)
      );`);
      dbInstance.run(`CREATE TABLE IF NOT EXISTS institution_grades (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        institution_stage_id INTEGER NOT NULL REFERENCES institution_stages(id) ON DELETE CASCADE,
        grade_master_id      INTEGER NOT NULL REFERENCES grades_master_lookup(id),
        display_name_ar      TEXT NOT NULL,
        is_active            INTEGER DEFAULT 1,
        UNIQUE(institution_stage_id, grade_master_id)
      );`);
      console.log('[DB Migration] Institution structure tables verified.');
    } catch (instErr) {
      console.error('[DB Migration] Institution tables guard error:', instErr.message);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 19. Lookup Tables — Seed Master Reference Data (CODE-based architecture)
    //     All queries/filters/statistics use CODE not Arabic text → no typo errors.
    //     INSERT OR IGNORE ensures existing data is NEVER overwritten on update.
    // ──────────────────────────────────────────────────────────────────────────
    _seedLookupData(dbInstance);

    _flushSQLite();


  } catch (err) {
    console.error("[DB Migration Error]", err.message);
  }
};


// ─── Startup: Restore from saved config (or auto-initialize default SQLite) ──────────
const _restoreFromConfig = async () => {
  const defaultDbPath = path.join(CONFIG_DIR, 'nepraspro.db');

  if (!fs.existsSync(CONFIG_FILE)) {
    console.log('[DB] No saved config found. Auto-initializing default SQLite database...');
    try {
      await initSQLiteMode();
    } catch (e) {
      console.error('[DB] Auto initSQLiteMode error:', e.message);
    }
    return;
  }

  try {
    currentConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    dbMode = currentConfig.mode;

    if (dbMode === 'sqlite') {
      const targetDbPath = currentConfig.dbPath || defaultDbPath;
      if (!fs.existsSync(targetDbPath) || fs.statSync(targetDbPath).size === 0) {
        console.log('[DB] Saved SQLite db file missing or empty on disk. Initializing fresh DB...');
        await initSQLiteMode();
        return;
      }
      await _openSQLite(targetDbPath);
      _migrateSQLiteSchema(sqliteDb);
      _flushSQLite(true);
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
    console.error('[DB] Failed to restore from saved config, re-initializing SQLite:', err.message);
    try {
      await initSQLiteMode();
    } catch (e) {
      console.error('[DB] Fallback init error:', e.message);
    }
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

  await _openSQLite(dbPath);  // Creates new in-memory empty db

  if (!sqliteDb) throw new Error('فشل إنشاء قاعدة البيانات المدمجة.');

  // Apply schema with candidate path resolution
  const candidateSchemaPaths = [
    path.join(__dirname, '../../database/schema_sqlite.sql'),
    path.join(__dirname, '../database/schema_sqlite.sql'),
    path.join(__dirname, '../../resources/database/schema_sqlite.sql'),
    path.join(__dirname, '../../../database/schema_sqlite.sql'),
    path.join(process.resourcesPath || '', 'database/schema_sqlite.sql'),
    path.join(process.resourcesPath || '', 'app/database/schema_sqlite.sql'),
    path.join(process.cwd(), 'database/schema_sqlite.sql'),
  ];
  const schemaPath = candidateSchemaPaths.find(p => p && fs.existsSync(p));
  if (!schemaPath) throw new Error('Schema file schema_sqlite.sql not found in any candidate path.');
  
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  sqliteDb.run(schemaSql);
  console.log('[DB] SQLite schema applied.');

  // Apply seed data
  _applySeed();
  console.log('[DB] SQLite seed data applied.');

  // Run migrations & master lookups (governorates, administrations, stages, grades, etc.)
  _migrateSQLiteSchema(sqliteDb);
  console.log('[DB] Master lookup reference data seeded successfully.');

  // Persist to disk immediately (immediate: true)
  currentConfig = { mode: 'sqlite', dbPath };
  _flushSQLite(true);
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
      const cleanParams = (params || []).map(p => p === undefined ? null : p);
      const stmt = targetDb.prepare(sql);
      if (cleanParams.length) stmt.bind(cleanParams);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    };
    const _get = (sql, params = []) => _all(sql, params)[0] || null;
    const _run = (sql, params = []) => {
      const cleanParams = (params || []).map(p => p === undefined ? null : p);
      return targetDb.run(sql, cleanParams);
    };

    const secCols = _all("PRAGMA table_info(sections)").map(c => c.name);
    if (!secCols.includes('code')) targetDb.run("ALTER TABLE sections ADD COLUMN code INTEGER;");
    if (!secCols.includes('is_active')) targetDb.run("ALTER TABLE sections ADD COLUMN is_active INTEGER DEFAULT 1;");
    if (!secCols.includes('type')) targetDb.run("ALTER TABLE sections ADD COLUMN type TEXT;");
    if (!secCols.includes('education_type')) targetDb.run("ALTER TABLE sections ADD COLUMN education_type TEXT;");
    if (!secCols.includes('legal_status')) targetDb.run("ALTER TABLE sections ADD COLUMN legal_status TEXT;");

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

    const stuCols = _all("PRAGMA table_info(students)").map(c => c.name);
    if (!stuCols.includes('first_name')) targetDb.run("ALTER TABLE students ADD COLUMN first_name TEXT;");
    if (!stuCols.includes('father_name')) targetDb.run("ALTER TABLE students ADD COLUMN father_name TEXT;");
    if (!stuCols.includes('gfather_name')) targetDb.run("ALTER TABLE students ADD COLUMN gfather_name TEXT;");
    if (!stuCols.includes('family_name')) targetDb.run("ALTER TABLE students ADD COLUMN family_name TEXT;");
    if (!stuCols.includes('mother_first_name')) targetDb.run("ALTER TABLE students ADD COLUMN mother_first_name TEXT;");
    if (!stuCols.includes('mother_second_name')) targetDb.run("ALTER TABLE students ADD COLUMN mother_second_name TEXT;");
    if (!stuCols.includes('mother_third_name')) targetDb.run("ALTER TABLE students ADD COLUMN mother_third_name TEXT;");
    if (!stuCols.includes('mother_forth_name')) targetDb.run("ALTER TABLE students ADD COLUMN mother_forth_name TEXT;");

    // Cleanup invalid fake sections created by legacy setup wizard
    try {
      targetDb.run("DELETE FROM sections WHERE name LIKE 'مرحلة %'");
    } catch (_) {}

    MASTER_STRUCTURE.forEach((sec, idx) => {
      let existingSec = _get("SELECT * FROM sections WHERE code = ? OR name = ?", [sec.section_code || null, sec.name || null]);
      let secId;
      if (existingSec) {
        secId = existingSec.id;
        // Only update code
        _run("UPDATE sections SET code = ? WHERE id = ?", [sec.section_code || null, secId]);
      } else {
        // Main section (first section / code 100) is ACTIVE (is_active=1) by default
        const isActiveDefault = (idx === 0 || sec.section_code === 100) ? 1 : 0;
        _run(
          "INSERT INTO sections (name, type, education_type, legal_status, code, is_active) VALUES (?, ?, ?, ?, ?, ?)",
          [sec.name || null, sec.type || null, sec.education_type || null, 'حكومي', sec.section_code || null, isActiveDefault]
        );
        secId = _get("SELECT last_insert_rowid() AS id")?.id;
      }

      (sec.stages || []).forEach(stg => {
        let existingStg = _get("SELECT * FROM stages_lookup WHERE section_id = ? AND (stage_name = ? OR (code = ? AND code IS NOT NULL))", [secId, stg.stage_name || null, stg.stage_code || null]);
        let stgId;
        if (existingStg) {
          stgId = existingStg.id;
          _run("UPDATE stages_lookup SET code = ?, is_active = COALESCE(is_active, 0) WHERE id = ?", [stg.stage_code || null, stgId]);
        } else {
          _run(
            "INSERT INTO stages_lookup (section_id, stage_name, years_count, display_order, code, is_active) VALUES (?, ?, ?, ?, ?, ?)",
            [secId, stg.stage_name || null, stg.years_count || null, stg.display_order || null, stg.stage_code || null, 0]
          );
          stgId = _get("SELECT last_insert_rowid() AS id")?.id;
        }

        (stg.grades || []).forEach(grd => {
          let existingGrd = _get(
            "SELECT * FROM grades_lookup WHERE stage_id = ? AND (grade_number = ? OR grade_name_ar = ? OR (code = ? AND code IS NOT NULL))",
            [stgId, grd.grade_number || null, grd.grade_name_ar || null, grd.grade_code || null]
          );
          if (existingGrd) {
            _run("UPDATE grades_lookup SET code = ?, grade_name_ar = ?, is_active = COALESCE(is_active, 1) WHERE id = ?", [grd.grade_code || null, grd.grade_name_ar || null, existingGrd.id]);
          } else {
            _run(
              "INSERT INTO grades_lookup (stage_id, grade_number, grade_name_ar, code, is_active) VALUES (?, ?, ?, ?, ?)",
              [stgId, grd.grade_number || null, grd.grade_name_ar || null, grd.grade_code || null, 1]
            );
          }
        });
      });
    });

    console.log('[DB Migration] Master Standard Structure (Arabic, Languages, International with 3-digit Codes) verified.');
  } catch (err) {
    console.error('[DB Migration Error] Master structure migration:', err?.message || err);
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
        ['official', 'رسمي'],
        ['official_languages', 'رسمي لغات'],
        ['official_languages_distinguished', 'رسمي لغات متميز'],
        ['private', 'خاص'],
        ['international', 'دولي'],
        ['cultural', 'ثقافي'],
        ['community', 'مجتمعي']
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
    // ── Seed: 27 محافظة مصرية وكافة الإدارات التعليمية الرسمية بالكامل ───────────
    const FULL_EGYPTIAN_DATA = [
      { name: "القاهرة", code: "CAI", region: "العاصمة", edarat: ["ديوان المديرية","روض الفرج","الساحل","شبرا","الشرابية","المطرية","مدينة السلام","الوايلى","الزيتون","مصر الجديدة","شرق مدينة نصر","وسط القاهرة","عابدين","غرب القاهرة","السيدة زينب","مصر القديمة","المعادى","حلوان","عين شمس","التبين","منشأة ناصر","المرج","حدائق القبة","الزاوية","الخليفة","النزهة","باب الشعرية","غرب مدينة نصر","القاهرة الجديدة","المعصره","المستقبل","الشروق","دار السلام","البساتين","بدر","المقطم"] },
      { name: "الإسكندرية", code: "ALX", region: "شمال", edarat: ["ديوان المديرية","شرق الأسكندرية","وسط الأسكندرية","غرب الأسكندرية","الجمرك","العامرية","برج العرب","العجمى","المنتزة اول","المنتزة ثان"] },
      { name: "بورسعيد", code: "PSD", region: "قناة", edarat: ["ديوان المديرية","شمال بورسعيد","جنوب بورسعيد","شرق بور سعيد","بور فؤاد","بحر البقر","الزهور"] },
      { name: "السويس", code: "SUZ", region: "قناة", edarat: ["ديوان المديرية","شمال السويس","جنوب السويس","الجناين"] },
      { name: "دمياط", code: "DMT", region: "دلتا", edarat: ["ديوان المديرية","دمياط","فارسكور","كفر سعد","الزرقا","عزبة البرج","كفر البطيخ","الروضة","دمياط الجديدة","السرو","ميــت أبو غالب"] },
      { name: "الدقهلية", code: "DKH", region: "دلتا", edarat: ["ديوان المديرية","شرق المنصورة","طلخا","ميت غمر","السنبلاوين","بلقاس","شربين","اجا","دكرنس","منية النصر","المنزلة","الجمالية","المطرية","غرب المنصورة","نبروة","تمى الامديد","ميت سلسيل","بنى عبيد"] },
      { name: "الشرقية", code: "SHR", region: "دلتا", edarat: ["ديوان المديرية","غرب الزقازيق","شرق الزقازيق","فاقوس","منيا القمح","بلبيس","ابو كبير","ابو حماد","الحسنية","ديرب نجم","ههيا","كفر صقر","اولاد صقر","مشتول السوق","الابراهيمية","القرين","العاشر من رمضان","القنايات","الصالحيه الجديده","صان الحجر","منشأة أبو عمر"] },
      { name: "القليوبية", code: "QHR", region: "العاصمة", edarat: ["ديوان المديرية","بنها","غرب شبرا الخيمة","طوخ","شبين القناطر","الخانكة","قليوب","القناطر الخيرية","شرق شبرا الخيمة","كفر شكر","العبــــور","الخصـــوص","قهـــا"] },
      { name: "كفر الشيخ", code: "KFS", region: "دلتا", edarat: ["ديوان المديرية","دسوق","بيلا","سيدى سالم","بلطيم","فوة","قلين","مطوبس","الحامول","الرياض","شرق كفر الشيخ","غرب كفر الشيخ","برج البرلس","سيدى غازى"] },
      { name: "الغربية", code: "GHR", region: "دلتا", edarat: ["ديوان المديرية","شرق طنطا","شرق المحلة","زفتا","السنطة","بسيون","سمنود","قطور","كفر الزيات","غرب طنطا","غرب المحلة"] },
      { name: "المنوفية", code: "MNF", region: "دلتا", edarat: ["ديوان المديرية","شبين الكوم","اشمون","منوف","تلا","قويسنا","الباجور","الشهداء","بركة السبع","سرس الليان","السادات"] },
      { name: "البحيرة", code: "BHR", region: "دلتا", edarat: ["ديوان المديرية","بندر دمنهور","بندر كفر الدوار","كوم حمادة","الدلنجات","ابوحمص","ايتاى البارود","ابو المطامير","رشيد","المحمودية","شبراخيت","حوش عيسى","وادى النطرون","الرحمانية","ادكو","مركز دمنهور","التحرير","مركز كفر الدوار","النوبارية"] },
      { name: "الإسماعيلية", code: "ISM", region: "قناة", edarat: ["ديوان المديرية","فايد","التل الكبير","القنطرة غرب","القنطرة شرق","ابو صوير","القصاصين","شمال الاسماعيلية","جنوب الاسماعيلية"] },
      { name: "الجيزة", code: "GIZ", region: "العاصمة", edarat: ["ديوان المديرية","شمال الجيزة","بولاق الدكرور","جنوب الجيزة","العجوزة","اوسيم","الهرم","البدرشين","العياط","ابو النمرس","الحوامدية","الصف","اطفيح","الواحات البحرية","الدقى","العمرانية","منشأة القناطر","الوراق","أكتوبر","كرداسة","الشيخ زايد","حدائق أكتوبر"] },
      { name: "بني سويف", code: "BNS", region: "صعيد", edarat: ["ديوان المديرية","بنى سويف","ببا","الواسطى","ناصر","اهناسيا","الفشن","سمسطا"] },
      { name: "الفيوم", code: "FYM", region: "صعيد", edarat: ["ديوان المديرية","شرق الفيوم","ابشواى","سنورس","اطسا","طامية","يوسف الصديق","غرب الفيوم"] },
      { name: "المنيا", code: "MNY", region: "صعيد", edarat: ["ديوان المديرية","المنيا","ملوى","سمالوط","بنى مزار","ابوقرقاص","مغاغة","دير مواس","مطاى","العدوة"] },
      { name: "أسيوط", code: "ASY", region: "صعيد", edarat: ["ديوان المديرية","اسيوط","ديروط","منفلوط","ابو تيج","القوصية","ابنوب","البدارى","صدفا","الغنايم","ساحل سليم","الفتح"] },
      { name: "سوهاج", code: "SGH", region: "صعيد", edarat: ["ديوان المديرية","سوهاج","جرجا","طهطا","طما","البلينا","المنشأة","اخميم","المراغة","ساقلتة","دار السلام","جهينة"] },
      { name: "قنا", code: "QNA", region: "صعيد", edarat: ["ديوان المديرية","قنا","قوص","دشنا","نجع حمادى","ابوتشت","نقادة","فرشوط","قفط","الوقف"] },
      { name: "أسوان", code: "ASW", region: "صعيد", edarat: ["ديوان المديرية","ادفو","اسوان","كوم امبو","نصر","دراو"] },
      { name: "البحر الأحمر", code: "RBH", region: "حدود", edarat: ["ديوان المديرية","الغردقة","القصير","رأس غارب","سفاجا","مرسى علم","شلاتيــن","حلايب"] },
      { name: "الوادي الجديد", code: "NVL", region: "حدود", edarat: ["ديوان المديرية","الخارجة","الداخلة","الفرافرة","بلاط","باريس"] },
      { name: "مطروح", code: "MTR", region: "حدود", edarat: ["ديوان المديرية","مطروح","الضبعة","الحمام","السلوم","سيوة","النجيــله","برانــــي","العلمين"] },
      { name: "شمال سيناء", code: "SIN", region: "حدود", edarat: ["ديوان المديرية","العريش","الشيخ زويد","بئر العبد","رفح","الحسنــــة","نخـــل"] },
      { name: "جنوب سيناء", code: "SSN", region: "حدود", edarat: ["ديوان المديرية","رأس سدر","سانت كاتريـــن","الطــــــور","أبورديس","دهب","أبو زنيمة","شرم الشيخ","نويبع"] },
      { name: "الأقصر", code: "LXR", region: "صعيد", edarat: ["ديوان المديرية","مدينةالأقصر","اسنا","ارمنت","البياضية","القـــــرنه","الزينيـــة","الطود"] }
    ];

    FULL_EGYPTIAN_DATA.forEach(gov => {
      dbInstance.run(
        'INSERT OR IGNORE INTO governorates (code, name_ar, region) VALUES (?,?,?)',
        [gov.code, gov.name, gov.region]
      );
      
      const s = dbInstance.prepare('SELECT id FROM governorates WHERE code = ? OR name_ar = ?');
      s.bind([gov.code, gov.name]);
      const govId = s.step() ? s.getAsObject().id : null;
      s.free();

      if (govId) {
        gov.edarat.forEach(admName => {
          const formattedName = admName.startsWith('إدارة') || admName.startsWith('ديوان') ? admName : `إدارة ${admName}`;
          dbInstance.run(
            'INSERT OR IGNORE INTO educational_administrations (governorate_id, name_ar, is_custom) VALUES (?,?,0)',
            [govId, formattedName]
          );
        });
      }
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

