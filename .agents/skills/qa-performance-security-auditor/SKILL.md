---
name: qa-performance-security-auditor
description: Specialized skill for deep performance profiling, WASM memory leak prevention, Electron IPC security verification, and SQL injection sanitization in NeprasPro.
---

# مهارة مدقق الأداء والأمان المتقدم (Performance & Security Auditor Skill) — Antigravity Engine

تُفعل هذه المهارة لتعظيم دور مدقق الجودة في المحاور الأمنية والتنفيذية ذات الحساسية العالية داخل برنامج **NeprasPro**.

---

## 🛡️ محاور التدقيق والتأمين المتقدمة

### 1. إدارة ذاكرة `sql.js (WASM)` والأداء العميق
- **تحرير الـ Statements الفوري**: التأكد الصارم من أن كل استعلام `sqliteDb.prepare()` يتبعه `stmt.free()` في كتل `try...finally` لمنع Memory Leaks.
- **تأمين معاملات الـ ArrayBuffer**: التأكد من تجميد وكتابة الـ Memory Buffer الخاص بالملف بنمط الخيط الآمن لمنع تعارضات القراءة والكتابة المتزامنة (`Concurrency Locks`).
- **فحص استهلاك الـ Heap**: منع عمليات الحلقات المفتوحة أو تضخم ذاكرة متصفح Electron.

### 2. عزل أمان Electron والأمان المحلي (Electron Isolation & Data Privacy)
- **الالتزام الكامل بإغلاق الوصول للبيئة المحلية في الـ Renderer**:
  - `contextIsolation: true`
  - `nodeIntegration: false`
- **تطهير قنوات الـ IPC**: يمنع تماماً فتح ممرات IPC غير مفحوصة المعاملات عبر `contextBridge`.
- **التشفير ومنع الحفظ المؤقت الحساس**: منع تسجيل أرقام هواتف أو أرقام قومية أو كلمات مرور في ملفات `console.log` أو ملفات الكاش غير المشفرة.

### 3. الحماية ضد ثغرات SQL Injection و Input Sanitization
- **الالتزام المطلق بالاستعلامات المجهزة (`Parameterized Queries`)**: يمنع تماماً دمج النصوص مباشرة داخل استعلامات SQL (مثل: `WHERE name = '${userInput}'`).
- **التفريغ والتسنيق الصارم للمدخلات**: التحقق المزدوج من أنواع المدخلات (Strings, Numbers, Arrays) قبل تمريرها للـ Controller.
