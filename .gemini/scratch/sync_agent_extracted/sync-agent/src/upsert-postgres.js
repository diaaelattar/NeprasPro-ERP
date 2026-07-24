const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool(config.control);

/**
 * يدرج/يحدّث كل الطلاب دفعة واحدة داخل Transaction واحدة.
 * الرقم القومي (national_id) هو مفتاح التطابق — أي محاولة استيراد متكررة
 * تُحدِّث السجل الموجود بدل ما تكرره.
 *
 * !! TODO للوكيل البرمجي !!
 * تأكد أن جدول students عنده UNIQUE constraint على national_id فعليًا:
 *   ALTER TABLE students ADD CONSTRAINT students_national_id_unique UNIQUE (national_id);
 */
async function upsertStudents(students) {
  const client = await pool.connect();
  let inserted = 0;
  let updated = 0;

  try {
    await client.query('BEGIN');

    for (const s of students) {
      if (!s.national_id) {
        console.warn(`تخطي سجل بدون رقم قومي: ${s.full_name}`);
        continue;
      }

      const result = await client.query(
        `INSERT INTO students (
           full_name, national_id, gender, religion, nationality,
           enrollment_status, inclusion_status, second_language,
           education_type, synced_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW())
         ON CONFLICT (national_id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           gender = EXCLUDED.gender,
           religion = EXCLUDED.religion,
           nationality = EXCLUDED.nationality,
           enrollment_status = EXCLUDED.enrollment_status,
           inclusion_status = EXCLUDED.inclusion_status,
           second_language = EXCLUDED.second_language,
           education_type = EXCLUDED.education_type,
           synced_at = NOW()
         RETURNING (xmax = 0) AS inserted`,
        [
          s.full_name, s.national_id, s.gender, s.religion, s.nationality,
          s.enrollment_status, s.inclusion_status, s.second_language,
          s.education_type
        ]
      );

      if (result.rows[0].inserted) inserted++; else updated++;
    }

    await client.query('COMMIT');
    return { inserted, updated };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { upsertStudents, pool };
