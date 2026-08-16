-- Enable cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. General Institution Settings
CREATE TABLE IF NOT EXISTS institution_config (
  id             SERIAL PRIMARY KEY,
  school_code    VARCHAR(50) UNIQUE NOT NULL,
  school_name    VARCHAR(150) NOT NULL,
  school_name_en VARCHAR(150),
  governorate    VARCHAR(100) NOT NULL,
  directorate    VARCHAR(100) NOT NULL,
  governorate_id    INTEGER,
  administration_id INTEGER,
  classification_id INTEGER,
  education_type VARCHAR(50),
  phone          VARCHAR(20),
  email          VARCHAR(100),
  logo_url       VARCHAR(500),
  stamp_url      VARCHAR(500),
  is_initialized BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 2. School Sections (Arabic, Languages, Kindergarten)
CREATE TABLE IF NOT EXISTS sections (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'عربي', 'لغات'
  type          VARCHAR(30) NOT NULL CHECK (type IN ('arabic', 'languages', 'international', 'kindergarten')),
  education_type VARCHAR(50), -- عربي / رسمي لغات / متميز لغات / خاص
  legal_status  VARCHAR(20) CHECK (legal_status IN ('حكومي', 'خاص', 'دولي')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Academic Years
CREATE TABLE IF NOT EXISTS academic_years (
  id            SERIAL PRIMARY KEY,
  year_label    VARCHAR(20) UNIQUE NOT NULL, -- e.g., '2025/2026'
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  is_current    BOOLEAN DEFAULT false
);

-- 4. Stages (ابتدائي، إعدادي، ثانوي)
CREATE TABLE IF NOT EXISTS stages_lookup (
  id            SERIAL PRIMARY KEY,
  section_id    INTEGER REFERENCES sections(id) ON DELETE CASCADE,
  stage_name    VARCHAR(100) NOT NULL, -- e.g. 'ابتدائي', 'إعدادي'
  years_count   INTEGER NOT NULL,
  display_order INTEGER DEFAULT 0,
  UNIQUE (section_id, stage_name)
);

-- 5. Grades (الصف الأول، الصف الثاني)
CREATE TABLE IF NOT EXISTS grades_lookup (
  id            SERIAL PRIMARY KEY,
  stage_id      INTEGER REFERENCES stages_lookup(id) ON DELETE CASCADE,
  grade_number  INTEGER NOT NULL,
  grade_name_ar VARCHAR(100) NOT NULL,
  grade_name_en VARCHAR(100),
  UNIQUE (stage_id, grade_number)
);

-- 6. Classes (الفصول)
CREATE TABLE IF NOT EXISTS classes (
  id               SERIAL PRIMARY KEY,
  section_id       INTEGER REFERENCES sections(id) ON DELETE CASCADE,
  stage_id         INTEGER REFERENCES stages_lookup(id) ON DELETE CASCADE,
  grade_id         INTEGER REFERENCES grades_lookup(id) ON DELETE CASCADE,
  academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE CASCADE,
  class_name       VARCHAR(100) NOT NULL,
  class_code       INTEGER,
  max_capacity     INTEGER DEFAULT 40,
  shift_type       VARCHAR(20) DEFAULT 'صباحي' CHECK (shift_type IN ('صباحي', 'مسائي')),
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (grade_id, academic_year_id, class_name)
);

-- 7. Sequential counters for each stage/section to generate unique IDs
CREATE TABLE IF NOT EXISTS stage_serial_counters (
  id            SERIAL PRIMARY KEY,
  section_id    INTEGER REFERENCES sections(id) ON DELETE CASCADE,
  stage_id      INTEGER REFERENCES stages_lookup(id) ON DELETE CASCADE,
  current_value INTEGER DEFAULT 0,
  prefix        VARCHAR(10) NOT NULL,
  UNIQUE (section_id, stage_id)
);

-- 8. Users Table
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(100) UNIQUE NOT NULL,
  national_id   VARCHAR(14) UNIQUE NOT NULL CHECK (LENGTH(national_id) = 14),
  full_name     VARCHAR(200) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Roles
CREATE TABLE IF NOT EXISTS roles (
  id            SERIAL PRIMARY KEY,
  role_name     VARCHAR(50) UNIQUE NOT NULL, -- super_admin, accountant, data_entry, head_control, hr_officer, viewer
  role_name_ar  VARCHAR(100) NOT NULL,
  description   TEXT
);

-- 10. Permissions
CREATE TABLE IF NOT EXISTS permissions (
  id           SERIAL PRIMARY KEY,
  perm_key     VARCHAR(100) UNIQUE NOT NULL, -- enroll_student, input_grades, manage_staff, collect_fees
  perm_name_ar VARCHAR(200) NOT NULL
);

-- 11. Role-Permissions Mappings
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 12. User-Roles Mappings
CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- 13. User Scopes (نطاق العمل: قسم أو مرحلة معينة)
CREATE TABLE IF NOT EXISTS user_scopes (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_id       INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  section_id    INTEGER REFERENCES sections(id) ON DELETE SET NULL,
  stage_id      INTEGER REFERENCES stages_lookup(id) ON DELETE SET NULL,
  UNIQUE (user_id, role_id)
);

-- 14. Active login sessions
CREATE TABLE IF NOT EXISTS active_sessions (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
  active_role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
  token_hash     VARCHAR(255) NOT NULL,
  ip_address     VARCHAR(45),
  user_agent     TEXT,
  last_activity  TIMESTAMPTZ DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL
);

-- 15. Nationalities
CREATE TABLE IF NOT EXISTS nationalities (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

-- 16. Document Types
CREATE TABLE IF NOT EXISTS document_types (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

-- 17. Students
CREATE TABLE IF NOT EXISTS students (
  id                 SERIAL PRIMARY KEY,
  national_id        VARCHAR(14) UNIQUE CHECK (LENGTH(national_id) = 14),
  birth_cert_number  VARCHAR(30),
  doc_type           INTEGER REFERENCES document_types(id),
  full_name_ar       VARCHAR(200) NOT NULL,
  full_name_en       VARCHAR(200),
  gender             VARCHAR(10) NOT NULL CHECK (gender IN ('ذكر', 'أنثى')),
  birth_date         DATE NOT NULL,
  birth_place        VARCHAR(150),
  religion           VARCHAR(20) DEFAULT 'مسلم' CHECK (religion IN ('مسلم', 'مسيحي', 'آخر')),
  nationality_id     INTEGER REFERENCES nationalities(id),
  address            TEXT,
  phone_home         VARCHAR(20),
  phone_parent       VARCHAR(20) NOT NULL,
  parent_job         VARCHAR(150),
  health_status      TEXT DEFAULT 'سليم',
  student_code       VARCHAR(50) UNIQUE, -- Auto generated serial
  custom_attributes  JSONB DEFAULT '{}'::jsonb,
  class_id               INTEGER REFERENCES classes(id),
  section_code           VARCHAR(10),
  stage_code             VARCHAR(10),
  grade_code             VARCHAR(10),
  class_code             VARCHAR(10),
  student_serial_in_class INTEGER DEFAULT 0,
  student_serial_in_grade INTEGER DEFAULT 0,
  is_active          BOOLEAN DEFAULT true,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Index for ultra-fast queries by dedicated columns & codes
CREATE INDEX IF NOT EXISTS idx_students_dedicated_lookup ON students(section_id, stage_id, grade_id, class_id);
CREATE INDEX IF NOT EXISTS idx_students_code_lookup ON students(section_code, stage_code, grade_code, class_code);

-- 17b. Student Academic History (Movement & Progress Tracking)
CREATE TABLE IF NOT EXISTS student_academic_history (
  id                      SERIAL PRIMARY KEY,
  student_id              INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id        INTEGER NOT NULL REFERENCES academic_years(id),
  section_id              INTEGER NOT NULL REFERENCES sections(id),
  stage_id                INTEGER NOT NULL REFERENCES stages_lookup(id),
  grade_id                INTEGER NOT NULL REFERENCES grades_lookup(id),
  class_id                INTEGER REFERENCES classes(id),
  section_code            VARCHAR(10),
  stage_code              VARCHAR(10),
  grade_code              VARCHAR(10),
  class_code              VARCHAR(10),
  student_serial_in_class INTEGER DEFAULT 0,
  student_serial_in_grade INTEGER DEFAULT 0,
  enrollment_status       VARCHAR(30) DEFAULT 'promoted',
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_student_academic_history ON student_academic_history(student_id, academic_year_id);

-- 18. Student Enrollment state per Year
CREATE TABLE IF NOT EXISTS student_enrollment (
  id               SERIAL PRIMARY KEY,
  student_id       INTEGER REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE CASCADE,
  section_id       INTEGER REFERENCES sections(id) ON DELETE CASCADE,
  stage_id         INTEGER REFERENCES stages_lookup(id) ON DELETE CASCADE,
  grade_id         INTEGER REFERENCES grades_lookup(id) ON DELETE CASCADE,
  class_id         INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  enrollment_type  VARCHAR(20) DEFAULT 'مستجد' CHECK (enrollment_type IN ('مستجد', 'عائد', 'محول')),
  enrollment_date  DATE DEFAULT CURRENT_DATE,
  is_active        BOOLEAN DEFAULT true,
  UNIQUE (student_id, academic_year_id)
);

-- 19. Staff Table (HR)
CREATE TABLE IF NOT EXISTS staff (
  id                SERIAL PRIMARY KEY,
  national_id       VARCHAR(14) UNIQUE NOT NULL CHECK (LENGTH(national_id) = 14),
  first_name        VARCHAR(50) NOT NULL,
  middle_name       VARCHAR(100),
  last_name         VARCHAR(50) NOT NULL,
  gender            VARCHAR(10) NOT NULL CHECK (gender IN ('ذكر', 'أنثى')),
  birth_date        DATE NOT NULL,
  birth_place       VARCHAR(150),
  religion          VARCHAR(20) DEFAULT 'مسلم',
  nationality_id    INTEGER REFERENCES nationalities(id),
  marital_status    VARCHAR(20) CHECK (marital_status IN ('أعزب', 'متزوج', 'مطلق', 'أرمل')),
  address           TEXT,
  phone             VARCHAR(20) NOT NULL,
  email             VARCHAR(100),
  hire_date         DATE NOT NULL,
  sector_type       VARCHAR(10) NOT NULL CHECK (sector_type IN ('حكومي', 'خاص')),
  status            VARCHAR(20) DEFAULT 'نشط' CHECK (status IN ('نشط', 'إجازة', 'منتدب', 'معار', 'متقاعد')),
  photo_url         VARCHAR(500),
  custom_attributes JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Gov Staff Details
CREATE TABLE IF NOT EXISTS staff_gov (
  id                  SERIAL PRIMARY KEY,
  staff_id            INTEGER UNIQUE REFERENCES staff(id) ON DELETE CASCADE,
  ministry_code       VARCHAR(30) UNIQUE NOT NULL,
  financial_grade     VARCHAR(50),
  specialization      VARCHAR(100),
  appointment_date    DATE,
  last_promotion_date DATE
);

-- 21. Private Staff Details
CREATE TABLE IF NOT EXISTS staff_private (
  id                  SERIAL PRIMARY KEY,
  staff_id            INTEGER UNIQUE REFERENCES staff(id) ON DELETE CASCADE,
  contract_type       VARCHAR(30) CHECK (contract_type IN ('دائم', 'مؤقت', 'بالساعة')),
  contract_end        DATE,
  base_salary         NUMERIC(10,2) DEFAULT 0.00,
  allowances          NUMERIC(10,2) DEFAULT 0.00,
  bank_account        VARCHAR(50)
);

-- 22. Staff Qualifications
CREATE TABLE IF NOT EXISTS qualifications (
  id              SERIAL PRIMARY KEY,
  staff_id        INTEGER REFERENCES staff(id) ON DELETE CASCADE,
  degree          VARCHAR(50) NOT NULL,
  major           VARCHAR(150) NOT NULL,
  university      VARCHAR(150),
  graduation_year INTEGER
);

-- 23. Staff Leaves
CREATE TABLE IF NOT EXISTS staff_leaves (
  id                  SERIAL PRIMARY KEY,
  staff_id            INTEGER REFERENCES staff(id) ON DELETE CASCADE,
  leave_type          VARCHAR(20) CHECK (leave_type IN ('اعتيادية', 'مرضية', 'عارضة', 'بدون مرتب')),
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  status              VARCHAR(20) DEFAULT 'معلق' CHECK (status IN ('معلق', 'مقبول', 'مرفوض')),
  approved_by         INTEGER REFERENCES users(id)
);

-- 24. Staff Penalties
CREATE TABLE IF NOT EXISTS staff_penalties (
  id              SERIAL PRIMARY KEY,
  staff_id        INTEGER REFERENCES staff(id) ON DELETE CASCADE,
  penalty_type    VARCHAR(30) NOT NULL,
  reason          TEXT NOT NULL,
  days_deducted   INTEGER DEFAULT 0,
  decision_date   DATE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 25. Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) UNIQUE NOT NULL,
  max_oral      NUMERIC(5,2) DEFAULT 0.00,
  max_written   NUMERIC(5,2) DEFAULT 0.00,
  max_activity  NUMERIC(5,2) DEFAULT 0.00,
  max_research  NUMERIC(5,2) DEFAULT 0.00,
  is_active     BOOLEAN DEFAULT true
);

-- 26. Stage Mapped Subjects
CREATE TABLE IF NOT EXISTS stage_subjects (
  id         SERIAL PRIMARY KEY,
  stage_id   INTEGER REFERENCES stages_lookup(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  is_optional BOOLEAN DEFAULT false,
  UNIQUE (stage_id, subject_id)
);

-- 27. Fee Structures
CREATE TABLE IF NOT EXISTS fee_structures (
  id               SERIAL PRIMARY KEY,
  academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE CASCADE,
  section_id       INTEGER REFERENCES sections(id) ON DELETE CASCADE,
  stage_id         INTEGER REFERENCES stages_lookup(id) ON DELETE CASCADE,
  grade_id         INTEGER REFERENCES grades_lookup(id) ON DELETE CASCADE,
  fee_name         VARCHAR(150) NOT NULL,
  amount           NUMERIC(10,2) NOT NULL,
  installments     INTEGER DEFAULT 1,
  UNIQUE (academic_year_id, section_id, stage_id, grade_id, fee_name)
);

-- 28. Student Fees Mapped
CREATE TABLE IF NOT EXISTS student_fees (
  id               SERIAL PRIMARY KEY,
  student_id       INTEGER REFERENCES students(id) ON DELETE CASCADE,
  fee_structure_id INTEGER REFERENCES fee_structures(id) ON DELETE CASCADE,
  total_amount     NUMERIC(10,2) NOT NULL,
  paid_amount      NUMERIC(10,2) DEFAULT 0.00,
  remaining_amount NUMERIC(10,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  UNIQUE (student_id, fee_structure_id)
);

-- 29. Fee Installments
CREATE TABLE IF NOT EXISTS fee_installments (
  id             SERIAL PRIMARY KEY,
  student_fee_id INTEGER REFERENCES student_fees(id) ON DELETE CASCADE,
  installment_no INTEGER NOT NULL,
  amount         NUMERIC(10,2) NOT NULL,
  due_date       DATE NOT NULL,
  status         VARCHAR(20) DEFAULT 'غير مسدد' CHECK (status IN ('غير مسدد', 'مسدد جزئي', 'مسدد بالكامل')),
  UNIQUE (student_fee_id, installment_no)
);

-- 30. Payments
CREATE TABLE IF NOT EXISTS payments (
  id               SERIAL PRIMARY KEY,
  student_fee_id   INTEGER REFERENCES student_fees(id) ON DELETE CASCADE,
  amount_paid      NUMERIC(10,2) NOT NULL,
  payment_date     DATE DEFAULT CURRENT_DATE,
  receipt_number   VARCHAR(100) UNIQUE,
  academic_year_id INTEGER REFERENCES academic_years(id),
  collected_by     INTEGER REFERENCES users(id),
  notes            TEXT
);

-- 31. Exam Sessions
CREATE TABLE IF NOT EXISTS exam_sessions (
  id                  SERIAL PRIMARY KEY,
  academic_year_id    INTEGER REFERENCES academic_years(id) ON DELETE CASCADE,
  grade_id            INTEGER REFERENCES grades_lookup(id) ON DELETE CASCADE,
  name                VARCHAR(150) NOT NULL,
  is_locked           BOOLEAN DEFAULT false,
  results_announced   BOOLEAN DEFAULT false,
  announced_at        TIMESTAMPTZ,
  announced_by        INTEGER REFERENCES users(id)
);

-- 32. Exam Seats
CREATE TABLE IF NOT EXISTS exam_seats (
  id                   SERIAL PRIMARY KEY,
  exam_session_id      INTEGER REFERENCES exam_sessions(id) ON DELETE CASCADE,
  student_id           INTEGER REFERENCES students(id) ON DELETE CASCADE,
  seat_number          VARCHAR(30) NOT NULL,
  committee_room       VARCHAR(100),
  UNIQUE (exam_session_id, student_id),
  UNIQUE (exam_session_id, seat_number)
);

-- 33. Grade Entries (الرصد والكنترول)
CREATE TABLE IF NOT EXISTS grade_entries (
  id              SERIAL PRIMARY KEY,
  exam_session_id INTEGER REFERENCES exam_sessions(id) ON DELETE CASCADE,
  student_id      INTEGER REFERENCES students(id) ON DELETE CASCADE,
  subject_id      INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  score_oral      VARCHAR(10) DEFAULT '0',
  score_written   VARCHAR(10) DEFAULT '0',
  score_activity  VARCHAR(10) DEFAULT '0',
  score_research  VARCHAR(10) DEFAULT '0',
  absence_code    VARCHAR(10), -- 'غ'
  total_score     VARCHAR(15),
  is_locked       BOOLEAN DEFAULT false,
  entered_by      INTEGER REFERENCES users(id),
  entry_timestamp TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (exam_session_id, student_id, subject_id)
);

-- 34. Exam Results
CREATE TABLE IF NOT EXISTS results (
  id               SERIAL PRIMARY KEY,
  exam_session_id  INTEGER REFERENCES exam_sessions(id) ON DELETE CASCADE,
  student_id       INTEGER REFERENCES students(id) ON DELETE CASCADE,
  enrollment_id    INTEGER REFERENCES student_enrollment(id) ON DELETE CASCADE,
  total_score      NUMERIC(8,2) NOT NULL,
  percentage       NUMERIC(5,2) NOT NULL,
  result_status    VARCHAR(20) CHECK (result_status IN ('ناجح', 'راسب', 'غائب')),
  published        BOOLEAN DEFAULT false,
  published_by     INTEGER REFERENCES users(id),
  published_at     TIMESTAMPTZ,
  UNIQUE (exam_session_id, student_id)
);

-- 35. Certificates
CREATE TABLE IF NOT EXISTS certificates (
  id               SERIAL PRIMARY KEY,
  student_id       INTEGER REFERENCES students(id) ON DELETE CASCADE,
  exam_session_id  INTEGER REFERENCES exam_sessions(id) ON DELETE CASCADE,
  cert_type        VARCHAR(30) CHECK (cert_type IN ('شهادة تقدير', 'شهادة نقل', 'بيان درجات')),
  issue_date       DATE DEFAULT CURRENT_DATE,
  serial_number    VARCHAR(100) UNIQUE NOT NULL,
  printed_by       INTEGER REFERENCES users(id),
  printed_at       TIMESTAMPTZ,
  pdf_url          VARCHAR(500)
);

-- 36. Dynamic Custom Fields Config
CREATE TABLE IF NOT EXISTS system_custom_fields (
  id              SERIAL PRIMARY KEY,
  entity_type     VARCHAR(50) NOT NULL CHECK (entity_type IN ('students', 'staff', 'classes', 'payments')),
  field_name      VARCHAR(50) NOT NULL,
  label_ar        VARCHAR(100) NOT NULL,
  label_en        VARCHAR(100),
  field_type      VARCHAR(20) NOT NULL CHECK (field_type IN ('text', 'number', 'boolean', 'select', 'date')),
  options         JSONB DEFAULT '[]'::jsonb,
  is_required     BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  display_order   INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (entity_type, field_name)
);

-- 37. System Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action        VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE
  table_name    VARCHAR(100) NOT NULL,
  record_id     INTEGER NOT NULL,
  old_values    JSONB,
  new_values    JSONB,
  role_used     VARCHAR(50),
  ip_address    VARCHAR(45),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- System Indexes
CREATE INDEX IF NOT EXISTS idx_students_national_id ON students(national_id);
CREATE INDEX IF NOT EXISTS idx_students_search_name ON students(full_name_ar);
CREATE INDEX IF NOT EXISTS idx_students_custom_attr ON students USING gin(custom_attributes);
CREATE INDEX IF NOT EXISTS idx_enrollment_lookup ON student_enrollment(academic_year_id, section_id, stage_id, grade_id, class_id);
CREATE INDEX IF NOT EXISTS idx_payments_by_student ON payments(student_fee_id);
CREATE INDEX IF NOT EXISTS idx_grade_entries_lookup ON grade_entries(exam_session_id, student_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_query ON audit_log(table_name, record_id);
