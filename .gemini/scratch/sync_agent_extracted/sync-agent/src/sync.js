/**
 * السكريبت الرئيسي للمزامنة.
 *
 * وضعان:
 *   --mode=full   استيراد كامل (نسخة آمنة من ملف SQLite/Access + قراءة كل الصفوف)
 *   --mode=delta  مزامنة فروقات عبر الـ API الموجودة (للتحديثات اللحظية)
 *
 * تشغيل:
 *   npm run sync:full
 *   npm run sync:delta
 */
const config = require('./config');
const { snapshotSourceDb, cleanupSnapshot } = require('./copy-source');
const { mapToControlSchema } = require('./mapper');
const { upsertStudents, pool } = require('./upsert-postgres');

function getMode() {
  const arg = process.argv.find(a => a.startsWith('--mode='));
  return arg ? arg.split('=')[1] : 'full';
}

async function runFullSync() {
  console.log(`[full-sync] نسخ ملف المصدر (${config.source.type}) بأمان...`);
  const snapshotPath = snapshotSourceDb(config.source.path, config.snapshotDir);

  try {
    let rawRows;
    if (config.source.type === 'sqlite') {
      rawRows = require('./read-sqlite').readStudents(snapshotPath, config.source.studentsTable);
    } else if (config.source.type === 'access') {
      rawRows = await require('./read-access').readStudents(snapshotPath, config.source.studentsTable);
    } else {
      throw new Error(`Unknown SOURCE_DB_TYPE: ${config.source.type}`);
    }

    console.log(`[full-sync] تم قراءة ${rawRows.length} سجل من المصدر.`);

    const mapped = rawRows.map(mapToControlSchema);
    const { inserted, updated } = await upsertStudents(mapped);

    console.log(`[full-sync] تم: ${inserted} سجل جديد، ${updated} سجل مُحدَّث.`);
  } finally {
    cleanupSnapshot(snapshotPath);
  }
}

async function runDeltaSync() {
  const { fetchUpdatedStudents } = require('./fetch-from-api');

  // TODO للوكيل البرمجي: خزّن آخر وقت مزامنة ناجحة في جدول sync_log
  // بدل الاعتماد على قيمة ثابتة هنا.
  const lastSyncTimestamp = null;

  console.log('[delta-sync] جلب التحديثات من الـ API...');
  const rawRows = await fetchUpdatedStudents(lastSyncTimestamp);
  console.log(`[delta-sync] تم جلب ${rawRows.length} سجل مُحدَّث.`);

  const mapped = rawRows.map(mapToControlSchema);
  const { inserted, updated } = await upsertStudents(mapped);

  console.log(`[delta-sync] تم: ${inserted} سجل جديد، ${updated} سجل مُحدَّث.`);
}

async function main() {
  const mode = getMode();
  if (mode === 'full') {
    await runFullSync();
  } else if (mode === 'delta') {
    await runDeltaSync();
  } else {
    throw new Error(`Unknown mode: ${mode}. استخدم --mode=full أو --mode=delta`);
  }
  await pool.end();
}

main().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
