/**
 * 🔑 Emergency Recovery Key Generator for NeprasPro
 * Usage:
 *   node scripts/generate_recovery_key.js --schoolCode="12345"
 */

const crypto = require('crypto');
const SECRET_SALT = 'NEPRAS_PRO_ENTERPRISE_SECRET_KEY_2026';

const args = process.argv.slice(2);
let schoolCode = '';

args.forEach(arg => {
  if (arg.startsWith('--schoolCode=')) schoolCode = arg.split('=')[1].trim();
});

if (!schoolCode && args[0] && !args[0].startsWith('--')) {
  schoolCode = args[0].trim();
}

console.log('\n======================================================================');
console.log('🔑 مولّد مفتاح الطوارئ الماستر لاستعادة حساب الأدمن (Emergency Recovery Key)');
console.log('======================================================================');

if (schoolCode) {
  const cleanCode = schoolCode.trim().toUpperCase();
  const masterHash = crypto.createHash('sha256').update(`RECOVERY-${cleanCode}-${SECRET_SALT}`).digest('hex').toUpperCase();
  const masterKey = `${masterHash.substring(0, 5)}-${masterHash.substring(5, 10)}-${masterHash.substring(10, 15)}-${masterHash.substring(15, 20)}`;

  console.log(`🏫 كود المدرسة الرسمي: ${schoolCode}`);
  console.log(`🔑 مفتاح طوارئ استعادة الحساب (Master Recovery Key):`);
  console.log(`\n    >>>  ${masterKey}  <<<\n`);
  console.log('💡 يمكن إدخال هذا المفتاح في حقل (الرقم القومي / كود الطوارئ) في شاشة الاستعادة لإعادة تعيين كلمة السر فوراً!');
} else {
  console.log('\n⚠️ يرجى تحديد كود المدرسة:');
  console.log('  node scripts/generate_recovery_key.js --schoolCode="12345"');
}

console.log('======================================================================\n');
