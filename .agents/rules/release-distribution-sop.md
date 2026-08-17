# بروتوكول وإجراءات بناء ورفع ونشر إصدارات نبراس برو (Standard Release & Distribution SOP)

هذا البروتوكول هو الدليل المعتمد والثابت لعمليات بناء وتحديث ورفع ملفات التثبيت وتحديث موقع التوزيع.

---

## 1. مسار وموقع التوزيع الرسمي
* **رابط الموقع**: [بوابة أدوات نبراس المدرسية | NeprasPro ERP](https://unified-school-tools-website.vercel.app/)
* **رابط التحميل المباشر للإصدار من GitHub Releases**:
  `https://github.com/diaaelattar/NeprasPro-ERP/releases/download/v{VERSION}/NeprasPro.ERP.Setup.{VERSION}.exe`
  (أو `https://github.com/diaaelattar/NeprasPro-ERP/releases/download/v{VERSION}/NeprasPro%20ERP%20Setup%20{VERSION}.exe`)

---

## 2. الخطوات القياسية المعتمدة (SOP Workflow):

### الخطوة 1: الفحص والتحقق البرمجي (Pre-build Verification)
1. التأكد من سلامة كود الواجهة والباك إند وقاعدة البيانات.
2. التأكد من خلو ملفات الـ CSS من التحذيرات أو أخطاء الصياغة.
3. التأكد من أن `frontend/vite.config.js` يعتمد `base: './'`.

### الخطوة 2: بناء حزمة التثبيت المحلية (Build Installer)
1. تشغيل أمر البناء الكامل للحزمة:
   ```bash
   npm run dist
   ```
2. التحقق من توليد ملف التثبيت بنجاح في مجلد `dist/`:
   `dist/NeprasPro ERP Setup {VERSION}.exe`

### الخطوة 3: رفع التعديلات البرمجية إلى GitHub (Git Push)
1. مراجعة الملفات المعدلة: `git status`
2. إضافة التغييرات والالتزام:
   ```bash
   git add .
   git commit -m "chore(release): release v{VERSION} ..."
   git push origin main
   ```

### الخطوة 4: رفع ملف التثبيت إلى GitHub Releases (Release Binaries)
1. إنشاء أو تحديث الإصدار ورفع ملف `.exe` التنفيذي:
   ```bash
   gh release upload v{VERSION} "dist/NeprasPro ERP Setup {VERSION}.exe" --clobber
   ```
   *أو عبر واجهة GitHub Releases يدوياً بإرفاق ملف الـ .exe.*

### الخطوة 5: تحديث صفحة وموقع التوزيع (Website Update)
* **الموقع المستهدف**: [بوابة أدوات نبراس المدرسية](https://unified-school-tools-website.vercel.app/)
1. تحديث زر التحميل المباشر (Direct Download Button) ليشير إلى الإصدار الجديد:
   `https://github.com/diaaelattar/NeprasPro-ERP/releases/download/v{VERSION}/NeprasPro.ERP.Setup.{VERSION}.exe`
2. تحديث جدول وسجل التحديثات (Release History / Changelog):
   - رقم الإصدار وتاريخ الصدور.
   - الميزات الجديدة والتحسينات المضافة (Changelog summary).
   - حجم الملف والتوافق (Windows 64-bit).
