---
name: qa-automated-test-generator
description: Skill for automatically generating unit tests, regression suites, and edge case assertions for React components, Node controllers, and WASM SQLite transactions in NeprasPro.
---

# مهارة مولّد اختبارات الوحدة والجودة الآلية (Automated Test & Edge-Case Generator)

تُستخدم هذه المهارة لتأكيد خلو الكود من أي تراجع أداء (Zero Regressions) وبناء سيناريوهات الاختبار القياسية الحادّة (Edge Cases) لمشروع **NeprasPro**.

---

## 🧪 معايير توليد سيناريوهات الاختبار (Test Standards)

### 1. اختبارات واجهة المستخدم (React Component Tests)
- فحص دورة حياة المكونات عند التنقل السريع بين التبويبات (Tab-switching race conditions).
- التحقق من إلغاء طلبات الشبكة المفتوحة بـ `AbortController`.
- فحص قيود الحقول (أرقام قومية، تواريخ، رموز الأقسام والمراحل).

### 2. اختبارات الباك إند والـ Transactions (Controller Edge Cases)
- فحص حالات التعارض `UNIQUE constraint failed` والـ `UPSERT`.
- فحص استجابة السيرفر عند غياب قاعدة البيانات أو انقطاع الاتصال.
- اختبار المعاملات النادرة والبيانات الضخمة (Boundary Testing & Large Datasets).

### 3. اختبارات تصدير التقارير والماكرو (Excel Macro Assertion Tests)
- التأكد من سلامة ملف الـ ZIP وتكامل المحتوى `[Content_Types].xml`.
- فحص ثبات كود الماكرو الثنائي `xl/vbaProject.bin` وحقن البيانات بنمط `inlineStr`.
