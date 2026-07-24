const fs = require('fs');
const path = require('path');
const db = require('../../backend/config/db');

async function importStaff() {
  await new Promise(resolve => setTimeout(resolve, 1500));
  const sqliteDb = db.getSQLiteDb();
  
  const mdPath = path.join(__dirname, '../../بيانات_الموظفين.md');
  if (!fs.existsSync(mdPath)) {
    console.error('File not found:', mdPath);
    return;
  }

  const content = fs.readFileSync(mdPath, 'utf8');
  const lines = content.split('\n');

  let imported = 0;
  let updated = 0;

  for (let line of lines) {
    line = line.trim();
    if (!line.startsWith('|')) continue;

    const parts = line.split('|').map(p => p.trim());
    if (parts.length < 13) continue;

    const seq = parts[1]; // م
    const fullNameAr = parts[2]; // الاسم الكامل
    const nationalId = parts[3]; // الرقم القومي
    const birthDate = parts[4]; // تاريخ الميلاد
    const gender = parts[5]; // النوع
    const title = parts[6]; // الوظيفة
    const subject = parts[7]; // مادة التدريس
    const phone = parts[8]; // المحمول
    const hireDate = parts[9]; // تاريخ التعيين
    const qualification = parts[10]; // المؤهل
    const teachingStage = parts[11]; // مرحلة التدريس
    const address = parts[12]; // العنوان

    // Validate national ID or name
    if (!nationalId || nationalId === 'الرقم القومي' || nationalId.length !== 14 || isNaN(nationalId)) {
      continue;
    }

    // Split name into first, middle, last for legacy compatibility
    const nameTokens = fullNameAr.split(/\s+/).filter(Boolean);
    const firstName = nameTokens[0] || fullNameAr;
    const lastName = nameTokens[nameTokens.length - 1] || '';
    const middleName = nameTokens.slice(1, nameTokens.length - 1).join(' ') || '';

    // Check if staff member already exists by national_id
    const checkStmt = sqliteDb.prepare('SELECT id FROM staff WHERE national_id = ?');
    checkStmt.bind([nationalId]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (exists) {
      sqliteDb.run(`
        UPDATE staff SET
          full_name_ar = ?, first_name = ?, middle_name = ?, last_name = ?,
          gender = ?, birth_date = ?, title = ?, subject = ?, phone = ?,
          hire_date = ?, qualification = ?, teaching_stage = ?, address = ?,
          org_name = 'مدرسة الشهيد محمد سليمان سلامة'
        WHERE national_id = ?
      `, [
        fullNameAr, firstName, middleName, lastName,
        gender, birthDate || null, title || null, subject || null, phone || null,
        hireDate || null, qualification || null, teachingStage || null, address || null,
        nationalId
      ]);
      updated++;
    } else {
      sqliteDb.run(`
        INSERT INTO staff (
          full_name_ar, national_id, first_name, middle_name, last_name,
          gender, birth_date, title, subject, phone,
          hire_date, qualification, teaching_stage, address, org_name, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'مدرسة الشهيد محمد سليمان سلامة', 'نشط')
      `, [
        fullNameAr, nationalId, firstName, middleName, lastName,
        gender, birthDate || null, title || null, subject || null, phone || null,
        hireDate || null, qualification || null, teachingStage || null, address || null
      ]);
      imported++;
    }
  }

  db.flushSQLite();
  console.log(`✅ Completed staff import from بيانات_الموظفين.md! Imported: ${imported}, Updated: ${updated}`);
}

importStaff().catch(console.error);
