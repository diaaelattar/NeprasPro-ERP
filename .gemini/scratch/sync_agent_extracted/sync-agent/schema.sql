-- جدول الطلاب بنظام الكنترول الجديد (مرجع - نفّذه قبل أول تشغيل للمزامنة)
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  national_id VARCHAR(14) NOT NULL,
  gender VARCHAR(10),
  religion VARCHAR(20),
  nationality VARCHAR(30) DEFAULT 'مصري',
  class_level_id INT,
  enrollment_status VARCHAR(20),
  inclusion_status VARCHAR(30),
  second_language VARCHAR(20),
  education_type VARCHAR(10),
  seat_number INT,
  secret_code_term1 INT,
  secret_code_term2 INT,
  notes TEXT,
  synced_at TIMESTAMP,
  CONSTRAINT students_national_id_unique UNIQUE (national_id)
);

-- جدول تتبع آخر مزامنة ناجحة (مطلوب لدعم delta sync الحقيقي - انظر TODO في sync.js)
CREATE TABLE IF NOT EXISTS sync_log (
  id SERIAL PRIMARY KEY,
  mode VARCHAR(10) NOT NULL,           -- full | delta
  started_at TIMESTAMP NOT NULL,
  finished_at TIMESTAMP,
  records_inserted INT,
  records_updated INT,
  status VARCHAR(20),                  -- success | failed
  error_message TEXT
);
