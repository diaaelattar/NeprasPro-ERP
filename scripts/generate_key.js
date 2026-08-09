/**
 * 🔑 NeprasPro Enterprise License Key Generator (أداة المطور الشاملة لتوليد المفاتيح)
 * 
 * الاستخدام (الطريقة الأولى - مفتاح ماستر كود المدرسة العكسي دون طلب Machine ID):
 *   npm run generate-key -- --schoolCode="21024219" --seats=10 --school="مدرسة السلام خاصة"
 *   أو:
 *   node scripts/generate_key.js --schoolCode="21024219" --seats=10 --school="مدرسة السلام خاصة"
 * 
 * الاستخدام (الطريقة الثانية - التفعيل المباشر بـ Machine ID للجهاز):
 *   node scripts/generate_key.js --machineId="NEP-8F9B-4C21-7A0E" --seats=5 --school="مدرسة السلام خاصة"
 */

const crypto = require('crypto');
const SECRET_SALT = 'NEPRAS_PRO_ENTERPRISE_SECRET_KEY_2026';

const args = process.argv.slice(2);
let machineId = '';
let schoolCode = '';
let seats = 5;
let schoolName = 'مدرسة تعليمية';

args.forEach(arg => {
  if (arg.startsWith('--machineId=')) machineId = arg.split('=')[1].trim().toUpperCase();
  if (arg.startsWith('--schoolCode=')) schoolCode = arg.split('=')[1].trim();
  if (arg.startsWith('--seats=')) seats = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--school=')) schoolName = arg.split('=')[1].trim();
});

console.log('\n======================================================================');
console.log('🏆 مولّد مفاتيح الترخيص المعتمدة لمنظومة NeprasPro (Enterprise Key Generator)');
console.log('======================================================================');
console.log(`🏫 اسم المدرسة / العميل: ${schoolName}`);
console.log(`💻 عدد الأجهزة المسموح بها (Seats): ${seats} أجهزة`);

if (schoolCode) {
  // Master School Code Key (Reverse Method - No Machine ID needed!)
  const masterHash = crypto.createHash('sha256').update(`MASTER-${schoolCode.trim().toUpperCase()}-${SECRET_SALT}`).digest('hex').toUpperCase();
  const masterKey = `${masterHash.substring(0, 5)}-${masterHash.substring(5, 10)}-${masterHash.substring(10, 15)}-${masterHash.substring(15, 20)}`;

  console.log(`📌 نوع الترخيص: ✨ مفتاح ماستر موحد (Reverse School Code Key)`);
  console.log(`🏫 كود المدرسة التراخصي: ${schoolCode}`);
  console.log(`🔑 مفتاح التفعيل الماستر الموحد:`);
  console.log(`\n    >>>  ${masterKey}  <<<\n`);
  console.log('💡 هذا المفتاح يعمل على أي جهاز يتبع لهذه المدرسة بمجرد إدخال كود المدرسة والمفتاح!');
} else if (machineId) {
  // Direct Machine Key
  const raw = `${machineId}-${SECRET_SALT}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
  const directKey = `${hash.substring(0, 5)}-${hash.substring(5, 10)}-${hash.substring(10, 15)}-${hash.substring(15, 20)}`;

  console.log(`📌 نوع الترخيص: 🆔 مفتاح مباشر مرتبط بمعرّف الجهاز (Direct Machine ID Key)`);
  console.log(`🆔 معرّف الجهاز Target Machine ID: ${machineId}`);
  console.log(`🔑 مفتاح التفعيل المباشر:`);
  console.log(`\n    >>>  ${directKey}  <<<\n`);
} else {
  console.log('\n⚠️ يرجى تحديد كود المدرسة (--schoolCode="XXXX") أو معرّف الجهاز (--machineId="NEP-XXXX")');
  console.log('\nمثال طريقة المفتاح العكسي الموحد (دون طلب معرّف الجهاز):');
  console.log('  node scripts/generate_key.js --schoolCode="21024219" --seats=10 --school="مدرسة النيل"');
}

console.log('======================================================================\n');
