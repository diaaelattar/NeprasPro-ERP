-- SQLite compatible schema for NeprasPro ERP
-- Note: SQLite uses INTEGER PRIMARY KEY (auto-increment), TEXT instead of VARCHAR, 
-- REAL instead of NUMERIC, and does not support SERIAL, TIMESTAMPTZ, or extensions.

-- 1. General Institution Settings
CREATE TABLE IF NOT EXISTS institution_config (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  school_code    TEXT UNIQUE NOT NULL,
  school_name    TEXT NOT NULL,
  school_name_en TEXT,
  governorate    TEXT NOT NULL,
  directorate    TEXT NOT NULL,
  education_type TEXT,
  address        TEXT,
  phone          TEXT,
  email          TEXT,
  website        TEXT,
  logo_url       TEXT,
  stamp_url      TEXT,
  director_name           TEXT,
  director_qualification  TEXT,
  director_national_id    TEXT,
  director_phone          TEXT,
  sections_count          INTEGER,
  stages_count            INTEGER,
  has_multiple_sections   INTEGER DEFAULT 0,
  is_initialized INTEGER DEFAULT 0,
  created_at     TEXT DEFAULT (datetime('now'))
);

-- 2. School Sections
CREATE TABLE IF NOT EXISTS sections (
  id                              INTEGER PRIMARY KEY AUTOINCREMENT,
  name                            TEXT UNIQUE NOT NULL,
  type                            TEXT NOT NULL CHECK (type IN ('arabic', 'languages', 'kindergarten')),
  education_type                  TEXT,
  legal_status                    TEXT CHECK (legal_status IN ('حكومي', 'خاص')),
  section_director_name           TEXT,
  section_director_qualification  TEXT,
  section_director_national_id    TEXT,
  section_director_phone          TEXT,
  section_deputy_name             TEXT,
  section_deputy_phone            TEXT,
  students_vice_name              TEXT,
  students_vice_phone             TEXT,
  staff_vice_name                 TEXT,
  staff_vice_phone                TEXT,
  created_at                      TEXT DEFAULT (datetime('now'))
);

-- 3. Academic Years
CREATE TABLE IF NOT EXISTS academic_years (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  year_label     TEXT UNIQUE NOT NULL,
  start_date     TEXT NOT NULL,
  end_date       TEXT NOT NULL,
  is_current     INTEGER DEFAULT 0
);

-- 4. Stages
CREATE TABLE IF NOT EXISTS stages_lookup (
  id                             INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id                     INTEGER REFERENCES sections(id) ON DELETE CASCADE,
  stage_name                     TEXT NOT NULL,
  stage_code                     TEXT,
  years_count                    INTEGER NOT NULL,
  display_order                  INTEGER DEFAULT 0,
  stage_director_name            TEXT,
  stage_director_qualification   TEXT,
  stage_director_national_id     TEXT,
  stage_director_phone           TEXT,
  stage_deputy_name              TEXT,
  stage_deputy_phone             TEXT,
  stage_students_vice_name       TEXT,
  stage_students_vice_phone      TEXT,
  stage_staff_vice_name          TEXT,
  stage_staff_vice_phone         TEXT,
  UNIQUE (section_id, stage_name)
);

-- 5. Grades
CREATE TABLE IF NOT EXISTS grades_lookup (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  stage_id          INTEGER REFERENCES stages_lookup(id) ON DELETE CASCADE,
  grade_number      INTEGER NOT NULL,
  grade_name_ar     TEXT NOT NULL,
  grade_name_en     TEXT,
  -- نظام الثانوية: null لغير الثانوي، 'baccalaureate' لنظام جديد، 'old' للنظام القديم
  secondary_system  TEXT CHECK (secondary_system IN ('baccalaureate','old') OR secondary_system IS NULL),
  UNIQUE (stage_id, grade_number)
);

-- 6. Stage Serial Counters (per section + stage)
CREATE TABLE IF NOT EXISTS stage_serial_counters (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id     INTEGER REFERENCES sections(id) ON DELETE CASCADE,
  stage_id       INTEGER REFERENCES stages_lookup(id) ON DELETE CASCADE,
  prefix         TEXT NOT NULL,
  last_serial    INTEGER DEFAULT 0,
  academic_year_id INTEGER REFERENCES academic_years(id)
);

-- 7. Roles
CREATE TABLE IF NOT EXISTS roles (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  role_name      TEXT UNIQUE NOT NULL,
  role_name_ar   TEXT,
  description    TEXT,
  created_at     TEXT DEFAULT (datetime('now'))
);

-- 8. Permissions
CREATE TABLE IF NOT EXISTS permissions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  perm_key       TEXT UNIQUE NOT NULL,
  perm_name_ar   TEXT NOT NULL
);

-- 9. Role-Permission junction
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id        INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id  INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 10. Users
CREATE TABLE IF NOT EXISTS users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  username       TEXT UNIQUE NOT NULL,
  national_id    TEXT UNIQUE NOT NULL,
  full_name      TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  is_active      INTEGER DEFAULT 1,
  last_login     TEXT,
  created_at     TEXT DEFAULT (datetime('now'))
);

-- 11. User Roles junction
CREATE TABLE IF NOT EXISTS user_roles (
  user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_id        INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  section_id     INTEGER REFERENCES sections(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, role_id)
);

-- 12. Nationalities lookup
CREATE TABLE IF NOT EXISTS nationalities (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT UNIQUE NOT NULL
);

-- 13. Document Types lookup
CREATE TABLE IF NOT EXISTS document_types (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT UNIQUE NOT NULL
);

-- 14. Students
CREATE TABLE IF NOT EXISTS students (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id            INTEGER NOT NULL REFERENCES sections(id),
  stage_id              INTEGER NOT NULL REFERENCES stages_lookup(id),
  grade_id              INTEGER NOT NULL REFERENCES grades_lookup(id),
  academic_year_id      INTEGER NOT NULL REFERENCES academic_years(id),
  student_code          TEXT UNIQUE,
  emis_student_code     TEXT,
  -- ─── الاسم ───────────────────────────────────────────
  full_name_ar          TEXT NOT NULL,
  full_name_en          TEXT,
  -- ─── البيانات الشخصية ─────────────────────────────────
  birth_date            TEXT,
  birth_place           TEXT,
  nationality_id        INTEGER REFERENCES nationalities(id),
  national_id           TEXT UNIQUE,
  gender                TEXT CHECK (gender IN ('ذكر', 'أنثى')),
  religion              TEXT CHECK (religion IN ('مسلم', 'مسيحي', 'أخرى')),
  -- ─── بيانات ولي الأمر (الأب) ──────────────────────────
  guardian_name         TEXT,
  guardian_relation     TEXT,
  guardian_national_id  TEXT,
  guardian_phone        TEXT,
  guardian_phone_2      TEXT,
  guardian_job          TEXT,
  -- ─── بيانات الأم ──────────────────────────────────────
  mother_name           TEXT,
  mother_nationality_id INTEGER REFERENCES nationalities(id),
  mother_national_id    TEXT,
  -- ─── العنوان والتواصل ─────────────────────────────────
  address               TEXT,
  student_phone         TEXT,
  -- ─── البيانات الأكاديمية ──────────────────────────────
  second_language       TEXT CHECK (second_language IN ('فرنسي','ألماني','إيطالي','إسباني','لا يوجد') OR second_language IS NULL),
  -- للمرحلة الثانوية فقط: المسار (Grades 1&2 = نظام بكالوريا، Grade 3 = نظام قديم مؤقت)
  secondary_track       TEXT CHECK (secondary_track IN (
                          -- مسارات نظام البكالوريا الجديد (Grades 1 & 2)
                          'medicine_life',    -- مسار الطب وعلوم الحياة
                          'engineering_cs',   -- مسار الهندسة وعلوم الحاسب
                          'business',         -- مسار الأعمال
                          'arts_humanities',  -- مسار الآداب والفنون
                          -- شعب النظام القديم (الصف الثالث مؤقتاً)
                          'science_bio',      -- علمي علوم
                          'science_math',     -- علمي رياضيات
                          'literary'          -- أدبي
                        ) OR secondary_track IS NULL),
  -- المادة الاختيارية في الصف الثاني الثانوي (نظام بكالوريا)
  secondary_elective    TEXT,
  -- ─── حالة الدمج ───────────────────────────────────────
  is_merged             INTEGER DEFAULT 0,
  merged_grade_id       INTEGER REFERENCES grades_lookup(id),
  merge_type            TEXT,
  merge_decision_number TEXT,
  merge_decision_date   TEXT,
  merge_notes           TEXT,
  -- ─── حالات الأخوة والتوائم والمواهب والتحويل والنظام الأكاديمي ───
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
  -- ─── الحالة العامة ────────────────────────────────────
  enrollment_date       TEXT DEFAULT (date('now')),
  status                TEXT DEFAULT 'promoted' CHECK (status IN ('promoted','retained','suspended','disconnected','excluded','deleted')),
  created_at            TEXT DEFAULT (datetime('now'))
);

-- 15. Custom Fields Definition (Dynamic Fields Engine)
CREATE TABLE IF NOT EXISTS system_custom_fields (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type    TEXT NOT NULL CHECK (entity_type IN ('students','employees','fees')),
  field_name     TEXT NOT NULL,
  label_ar       TEXT NOT NULL,
  field_type     TEXT NOT NULL CHECK (field_type IN ('text','number','date','select','boolean','file')),
  options        TEXT,  -- JSON array for 'select' type
  is_required    INTEGER DEFAULT 0,
  display_order  INTEGER DEFAULT 0,
  is_active      INTEGER DEFAULT 1,
  UNIQUE (entity_type, field_name)
);

-- 16. Custom Field Values
CREATE TABLE IF NOT EXISTS custom_field_values (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  field_id       INTEGER NOT NULL REFERENCES system_custom_fields(id) ON DELETE CASCADE,
  entity_type    TEXT NOT NULL,
  entity_id      INTEGER NOT NULL,
  value          TEXT,
  created_at     TEXT DEFAULT (datetime('now')),
  UNIQUE (field_id, entity_type, entity_id)
);

-- 17. Student Documents
CREATE TABLE IF NOT EXISTS student_documents (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id     INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  doc_type_id    INTEGER REFERENCES document_types(id),
  file_path      TEXT,
  notes          TEXT,
  uploaded_at    TEXT DEFAULT (datetime('now'))
);

-- 18. Classes / Classrooms
CREATE TABLE IF NOT EXISTS classes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  grade_id       INTEGER NOT NULL REFERENCES grades_lookup(id),
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),
  class_name     TEXT NOT NULL,
  capacity       INTEGER DEFAULT 40,
  UNIQUE (grade_id, academic_year_id, class_name)
);

-- 19. Class Enrollment
CREATE TABLE IF NOT EXISTS class_enrollments (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id     INTEGER NOT NULL REFERENCES students(id),
  class_id       INTEGER NOT NULL REFERENCES classes(id),
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),
  enrolled_at    TEXT DEFAULT (datetime('now')),
  UNIQUE (student_id, academic_year_id)
);

-- 20. Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id     INTEGER NOT NULL REFERENCES students(id),
  class_id       INTEGER NOT NULL REFERENCES classes(id),
  att_date       TEXT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('حاضر','غائب','متأخر','إجازة')),
  notes          TEXT,
  recorded_by    INTEGER REFERENCES users(id),
  UNIQUE (student_id, att_date)
);

-- 21. Employees
CREATE TABLE IF NOT EXISTS employees (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_code       TEXT UNIQUE,
  full_name           TEXT NOT NULL,
  national_id         TEXT UNIQUE NOT NULL,
  birth_date          TEXT,
  gender              TEXT CHECK (gender IN ('ذكر','أنثى')),
  religion            TEXT,
  phone               TEXT,
  address             TEXT,
  job_title           TEXT,
  department          TEXT,
  qualification       TEXT,
  hire_date           TEXT,
  employment_type     TEXT DEFAULT 'دائم' CHECK (employment_type IN ('دائم','مؤقت','مستعار','منتدب')),
  status              TEXT DEFAULT 'active' CHECK (status IN ('active','retired','resigned','terminated')),
  base_salary         REAL DEFAULT 0,
  created_at          TEXT DEFAULT (datetime('now'))
);

-- 22. Employee Documents
CREATE TABLE IF NOT EXISTS employee_documents (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id    INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  doc_type_id    INTEGER REFERENCES document_types(id),
  file_path      TEXT,
  notes          TEXT,
  uploaded_at    TEXT DEFAULT (datetime('now'))
);

-- 23. Employee Secondments (ندب)
CREATE TABLE IF NOT EXISTS secondments (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id    INTEGER NOT NULL REFERENCES employees(id),
  from_entity    TEXT NOT NULL,
  to_entity      TEXT NOT NULL,
  start_date     TEXT NOT NULL,
  end_date       TEXT,
  notes          TEXT,
  created_at     TEXT DEFAULT (datetime('now'))
);

-- 24. Employee Leaves
CREATE TABLE IF NOT EXISTS leaves (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id    INTEGER NOT NULL REFERENCES employees(id),
  leave_type     TEXT NOT NULL,
  start_date     TEXT NOT NULL,
  end_date       TEXT NOT NULL,
  duration_days  INTEGER,
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by    INTEGER REFERENCES users(id),
  notes          TEXT,
  created_at     TEXT DEFAULT (datetime('now'))
);

-- 25. Fee Categories
CREATE TABLE IF NOT EXISTS fee_categories (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id     INTEGER REFERENCES sections(id),
  stage_id       INTEGER REFERENCES stages_lookup(id),
  academic_year_id INTEGER REFERENCES academic_years(id),
  fee_name       TEXT NOT NULL,
  total_amount   REAL NOT NULL DEFAULT 0,
  installments   INTEGER DEFAULT 1,
  is_mandatory   INTEGER DEFAULT 1
);

-- 26. Student Fees
CREATE TABLE IF NOT EXISTS student_fees (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id     INTEGER NOT NULL REFERENCES students(id),
  fee_category_id INTEGER NOT NULL REFERENCES fee_categories(id),
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),
  total_due      REAL NOT NULL,
  discount       REAL DEFAULT 0,
  net_due        REAL NOT NULL,
  paid_amount    REAL DEFAULT 0,
  balance        REAL DEFAULT 0,
  UNIQUE (student_id, fee_category_id, academic_year_id)
);

-- 27. Payment Receipts
CREATE TABLE IF NOT EXISTS payment_receipts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  student_fee_id INTEGER NOT NULL REFERENCES student_fees(id),
  receipt_number TEXT UNIQUE NOT NULL,
  amount_paid    REAL NOT NULL,
  payment_date   TEXT DEFAULT (date('now')),
  payment_method TEXT DEFAULT 'نقدي' CHECK (payment_method IN ('نقدي','تحويل بنكي','شيك')),
  collected_by   INTEGER REFERENCES users(id),
  notes          TEXT,
  created_at     TEXT DEFAULT (datetime('now'))
);

-- 28. Exam Periods
CREATE TABLE IF NOT EXISTS exam_periods (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),
  period_name    TEXT NOT NULL,
  start_date     TEXT,
  end_date       TEXT,
  is_locked      INTEGER DEFAULT 0,
  locked_by      INTEGER REFERENCES users(id),
  locked_at      TEXT
);

-- 29. Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  stage_id       INTEGER NOT NULL REFERENCES stages_lookup(id),
  subject_name   TEXT NOT NULL,
  max_grade      REAL DEFAULT 100,
  pass_grade     REAL DEFAULT 50,
  display_order  INTEGER DEFAULT 0
);

-- 30. Grade Records
CREATE TABLE IF NOT EXISTS grade_records (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id     INTEGER NOT NULL REFERENCES students(id),
  subject_id     INTEGER NOT NULL REFERENCES subjects(id),
  exam_period_id INTEGER NOT NULL REFERENCES exam_periods(id),
  oral_grade     REAL,
  written_grade  REAL,
  practical_grade REAL,
  total_grade    REAL,
  notes          TEXT,
  entered_by     INTEGER REFERENCES users(id),
  UNIQUE (student_id, subject_id, exam_period_id)
);

-- 31. Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER REFERENCES users(id),
  action         TEXT NOT NULL,
  entity_type    TEXT,
  entity_id      INTEGER,
  old_values     TEXT,
  new_values     TEXT,
  ip_address     TEXT,
  created_at     TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════
-- 32. Special Case Types Lookup (أنواع الحالات الخاصة)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS special_case_types (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  code                TEXT UNIQUE NOT NULL,
  name_ar             TEXT NOT NULL,
  description         TEXT,
  requires_document   INTEGER DEFAULT 0,  -- هل تستلزم وثيقة رسمية؟
  is_active           INTEGER DEFAULT 1
);

-- ═══════════════════════════════════════════════════════════
-- 33. Student Special Cases (حالات كل طالب خاصة)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS student_special_cases (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id          INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  case_type_id        INTEGER NOT NULL REFERENCES special_case_types(id),
  related_student_id  INTEGER REFERENCES students(id), -- الأخ / التوأم المرتبط
  start_date          TEXT,
  end_date            TEXT,           -- NULL = لا تزال سارية
  document_ref        INTEGER REFERENCES student_documents(id),
  verified_by         INTEGER REFERENCES users(id),
  verified_at         TEXT,
  notes               TEXT,
  is_active           INTEGER DEFAULT 1,
  created_at          TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE (student_id, case_type_id)  -- حالة واحدة من كل نوع لكل طالب
);

-- ═══════════════════════════════════════════════════════════
-- 34. Student Transfers (محولون داخل / خارج المدرسة)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS student_transfers (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id          INTEGER NOT NULL REFERENCES students(id),
  academic_year_id    INTEGER NOT NULL REFERENCES academic_years(id),
  -- نوع التحويل: out = خروج | in = دخول | internal = نقل داخلي بين أقسام/مراحل
  transfer_type       TEXT NOT NULL CHECK (transfer_type IN ('out','in','internal')),
  -- ─── بيانات المدرسة الأصل (عند الدخول أو النقل الداخلي) ──────
  from_school         TEXT,
  from_directorate    TEXT,
  from_grade_id       INTEGER REFERENCES grades_lookup(id),
  -- ─── بيانات المدرسة الوجهة (عند الخروج) ──────────────────────
  to_school           TEXT,
  to_directorate      TEXT,
  to_grade_id         INTEGER REFERENCES grades_lookup(id),
  -- ─── تفاصيل التحويل ────────────────────────────────────────────
  reason              TEXT,
  transfer_date       TEXT NOT NULL DEFAULT (date('now')),
  -- ─── إتمام التحويل ─────────────────────────────────────────────
  is_completed        INTEGER DEFAULT 0,
  completed_date      TEXT,
  completed_by        INTEGER REFERENCES users(id),
  -- ─── ملاحظات وتوقيت ────────────────────────────────────────────
  notes               TEXT,
  created_by          INTEGER REFERENCES users(id),
  created_at          TEXT DEFAULT (datetime('now','localtime'))
);

-- ═══════════════════════════════════════════════════════════
-- 35. Baccalaureate Tracks (مسارات نظام البكالوريا المصري)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS baccalaureate_tracks (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  code            TEXT UNIQUE NOT NULL,
  name_ar         TEXT NOT NULL,
  description     TEXT,
  universities_ar TEXT,     -- وصف الكليات المتاحة
  is_active       INTEGER DEFAULT 1
);

-- ═══════════════════════════════════════════════════════════
-- 36. Baccalaureate Subjects per Track and Grade
-- (مواد كل مسار وصفه لاحقاً في بناء وحدة الكنترول)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS baccalaureate_subjects (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id        INTEGER REFERENCES baccalaureate_tracks(id),  -- NULL = مشترك لكل المسارات
  grade_year      INTEGER NOT NULL,    -- 1 أو 2 أو 3
  subject_name_ar TEXT NOT NULL,
  subject_type    TEXT NOT NULL CHECK (subject_type IN (
                    'common',     -- مادة مشتركة لكل المسارات
                    'elective',   -- مادة اختيارية (صف 2)
                    'advanced',   -- مادة متخصصة بمستوى رفيع (صف 3)
                    'outside'     -- خارج المجموع (كالتربية الدينية)
                  )),
  total_score     INTEGER,            -- الدرجة الكلية
  counts_in_total INTEGER DEFAULT 1,  -- هل تدخل ضمن مجموع الطالب؟
  display_order   INTEGER DEFAULT 0
);

-- ═══════════════════════════════════════════════════════════
-- Indexes for performance
-- ═══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_students_grade      ON students(grade_id);
CREATE INDEX IF NOT EXISTS idx_students_status     ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_code       ON students(student_code);
CREATE INDEX IF NOT EXISTS idx_students_national   ON students(national_id);
CREATE INDEX IF NOT EXISTS idx_transfers_student   ON student_transfers(student_id);
CREATE INDEX IF NOT EXISTS idx_transfers_year      ON student_transfers(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_cases_student       ON student_special_cases(student_id);
CREATE INDEX IF NOT EXISTS idx_bacc_subjects_track ON baccalaureate_subjects(track_id, grade_year);

