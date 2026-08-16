const path = require('path');
const os = require('os');
const fs = require('fs');

async function execute() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const dbPath = path.join(os.homedir(), '.nepraspro', 'nepraspro.db');
  if (!fs.existsSync(dbPath)) {
    console.log('Database file not found:', dbPath);
    return;
  }

  const dbData = fs.readFileSync(dbPath);
  const db = new SQL.Database(dbData);

  // 1. Ensure stage_name_en exists in stages_lookup
  const stgCols = [];
  const stmtStgInfo = db.prepare("PRAGMA table_info(stages_lookup)");
  while (stmtStgInfo.step()) stgCols.push(stmtStgInfo.getAsObject().name);
  stmtStgInfo.free();

  if (!stgCols.includes('stage_name_en')) {
    db.run("ALTER TABLE stages_lookup ADD COLUMN stage_name_en TEXT;");
  }

  db.run("PRAGMA foreign_keys=OFF;");

  // 2. Stages Lookup (5 Master Stages)
  db.run("DELETE FROM stages_lookup;");
  
  const masterStages = [
    { code: 1, stage_name: 'تمهيدي',    stage_name_en: 'Pre-school',   years_count: 1, display_order: 1 },
    { code: 2, stage_name: 'رياض أطفال', stage_name_en: 'Kindergarten', years_count: 2, display_order: 2 },
    { code: 3, stage_name: 'ابتدائي',    stage_name_en: 'Primary',      years_count: 6, display_order: 3 },
    { code: 4, stage_name: 'إعدادي',    stage_name_en: 'Preparatory',  years_count: 3, display_order: 4 },
    { code: 5, stage_name: 'ثانوي',    stage_name_en: 'Secondary',    years_count: 3, display_order: 5 },
  ];

  const stageIdMap = {};

  masterStages.forEach(stg => {
    db.run(
      `INSERT INTO stages_lookup (section_id, stage_name, stage_name_en, years_count, display_order, code, is_active) VALUES (1, ?, ?, ?, ?, ?, 1)`,
      [stg.stage_name, stg.stage_name_en, stg.years_count, stg.display_order, stg.code]
    );
    const stmtId = db.prepare("SELECT last_insert_rowid() AS id");
    stmtId.step();
    stageIdMap[stg.code] = stmtId.getAsObject().id;
    stmtId.free();
  });

  // 3. Grades Lookup (Option 1: Global Sequential Codes 1 to 15)
  db.run("DELETE FROM grades_lookup;");

  const masterGradesOption1 = [
    // تمهيدي (stage code 1)
    { stageCode: 1, grade_number: 1, globalCode: 1, grade_name_ar: 'الصف الأول التمهيدي', grade_name_en: 'Pre-school 1' },

    // رياض أطفال (stage code 2)
    { stageCode: 2, grade_number: 1, globalCode: 2, grade_name_ar: 'الصف الأول الرياض أطفال', grade_name_en: 'KG 1' },
    { stageCode: 2, grade_number: 2, globalCode: 3, grade_name_ar: 'الصف الثاني الرياض أطفال', grade_name_en: 'KG 2' },

    // ابتدائي (stage code 3)
    { stageCode: 3, grade_number: 1, globalCode: 4, grade_name_ar: 'الصف الأول الابتدائي', grade_name_en: 'Grade 1 (Primary 1)' },
    { stageCode: 3, grade_number: 2, globalCode: 5, grade_name_ar: 'الصف الثاني الابتدائي', grade_name_en: 'Grade 2 (Primary 2)' },
    { stageCode: 3, grade_number: 3, globalCode: 6, grade_name_ar: 'الصف الثالث الابتدائي', grade_name_en: 'Grade 3 (Primary 3)' },
    { stageCode: 3, grade_number: 4, globalCode: 7, grade_name_ar: 'الصف الرابع الابتدائي', grade_name_en: 'Grade 4 (Primary 4)' },
    { stageCode: 3, grade_number: 5, globalCode: 8, grade_name_ar: 'الصف الخامس الابتدائي', grade_name_en: 'Grade 5 (Primary 5)' },
    { stageCode: 3, grade_number: 6, globalCode: 9, grade_name_ar: 'الصف السادس الابتدائي', grade_name_en: 'Grade 6 (Primary 6)' },

    // إعدادي (stage code 4)
    { stageCode: 4, grade_number: 1, globalCode: 10, grade_name_ar: 'الصف الأول الإعدادي', grade_name_en: 'Grade 7 (Prep 1)' },
    { stageCode: 4, grade_number: 2, globalCode: 11, grade_name_ar: 'الصف الثاني الإعدادي', grade_name_en: 'Grade 8 (Prep 2)' },
    { stageCode: 4, grade_number: 3, globalCode: 12, grade_name_ar: 'الصف الثالث الإعدادي', grade_name_en: 'Grade 9 (Prep 3)' },

    // ثانوي (stage code 5)
    { stageCode: 5, grade_number: 1, globalCode: 13, grade_name_ar: 'الصف الأول الثانوي', grade_name_en: 'Grade 10 (Sec 1)' },
    { stageCode: 5, grade_number: 2, globalCode: 14, grade_name_ar: 'الصف الثاني الثانوي', grade_name_en: 'Grade 11 (Sec 2)' },
    { stageCode: 5, grade_number: 3, globalCode: 15, grade_name_ar: 'الصف الثالث الثانوي', grade_name_en: 'Grade 12 (Sec 3)' }
  ];

  masterGradesOption1.forEach(grd => {
    const stgId = stageIdMap[grd.stageCode];
    db.run(
      `INSERT INTO grades_lookup (stage_id, grade_number, grade_name_ar, grade_name_en, code, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
      [stgId, grd.grade_number, grd.grade_name_ar, grd.grade_name_en, grd.globalCode]
    );
  });

  db.run("PRAGMA foreign_keys=ON;");

  // Save to disk
  const exported = db.export();
  fs.writeFileSync(dbPath, Buffer.from(exported));
  console.log('[SUCCESS] stages_lookup and grades_lookup updated cleanly (Option 1 - Sequential 1 to 15).');
}

execute().catch(console.error);
