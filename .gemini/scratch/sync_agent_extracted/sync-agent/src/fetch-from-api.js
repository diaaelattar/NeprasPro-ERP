const axios = require('axios');
const config = require('./config');

/**
 * يجلب الطلاب المُحدَّثين منذ آخر مزامنة عبر الـ API الموجودة بالفعل في البرنامج.
 * يُستخدم للمزامنة اللحظية/الفروقات (Delta Sync)، لا للاستيراد الأول الكامل.
 *
 * ملاحظة للوكيل البرمجي: شكل الاستجابة (Response shape) أدناه افتراضي.
 * يجب تعديله بعد فحص استجابة حقيقية من الـ API الفعلية (انظر TODO في README).
 */
async function fetchUpdatedStudents(sinceTimestamp) {
  if (!config.source.api.baseUrl) {
    throw new Error('SOURCE_API_BASE_URL غير مُعرَّف في .env');
  }

  const url = `${config.source.api.baseUrl}${config.source.api.studentsEndpoint}`;
  const res = await axios.get(url, {
    params: sinceTimestamp ? { updatedSince: sinceTimestamp } : {},
    headers: config.source.api.apiKey
      ? { Authorization: `Bearer ${config.source.api.apiKey}` }
      : {}
  });

  // TODO: تأكيد أن الاستجابة الفعلية مصفوفة مباشرة، أو { data: [...] }, أو { students: [...] }
  return Array.isArray(res.data) ? res.data : (res.data.data || res.data.students || []);
}

module.exports = { fetchUpdatedStudents };
