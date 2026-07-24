/**
 * يحوّل صف خام من المصدر (شؤون الطلاب) لصيغة موحدة تُدخَل في جدول
 * students بنظام الكنترول الجديد.
 *
 * !! TODO للوكيل البرمجي !!
 * الأسماء على يمين كل سطر (['الاسم'], ['النوع'], ...) هي أسماء افتراضية.
 * بعد تشغيل `npm run discover` استبدلها بالأسماء الحقيقية الظاهرة في المخرجات.
 * كل سطر فيه علامة TODO يوضح الحقل المطلوب تأكيده.
 */
function mapToControlSchema(sourceRow) {
  return {
    full_name: sourceRow['الاسم'],                         // TODO: تأكيد اسم عمود الاسم الكامل
    national_id: sourceRow['الرقم_القومي'],                  // TODO: تأكيد اسم عمود الرقم القومي (مفتاح التطابق الأساسي)
    gender: normalizeGender(sourceRow['النوع']),             // TODO: تأكيد اسم عمود النوع + القيم الفعلية (ذكر/أنثى أو 1/2 مثلاً)
    religion: sourceRow['الديانة'],                          // TODO: تأكيد اسم عمود الديانة
    nationality: sourceRow['الجنسية'] || 'مصري',             // TODO: تأكيد اسم عمود الجنسية
    class_level_source_id: sourceRow['كود_الصف'],            // TODO: تأكيد اسم عمود كود/رقم الصف بالمصدر
    enrollment_status: sourceRow['حالة_القيد'],               // TODO: تأكيد اسم العمود + القيم الممكنة (منتظم/منقول/محول/متسرب)
    inclusion_status: sourceRow['حالة_الدمج'],                // TODO: تأكيد اسم العمود + القيم الممكنة (عادي/دمج جزئي/دمج كلي)
    second_language: sourceRow['اللغة_الثانية'],              // TODO: تأكيد اسم العمود
    education_type: sourceRow['نوعية_التعليم'],               // TODO: تأكيد القيم (نظامي/منازل بالضبط أو أكواد رقمية)
    source_last_modified: sourceRow['تاريخ_التعديل'] || null // TODO: تأكيد وجود عمود تاريخ تعديل لدعم الـ Delta Sync
  };
}

/** يوحّد قيم النوع المحتملة (نص عربي أو كود رقمي) لصيغة ثابتة */
function normalizeGender(rawValue) {
  const map = {
    'ذكر': 'ذكر', 'بنين': 'ذكر', '1': 'ذكر', 1: 'ذكر',
    'أنثى': 'أنثى', 'انثى': 'أنثى', 'بنات': 'أنثى', '2': 'أنثى', 2: 'أنثى'
  };
  return map[rawValue] || rawValue;
}

module.exports = { mapToControlSchema };
