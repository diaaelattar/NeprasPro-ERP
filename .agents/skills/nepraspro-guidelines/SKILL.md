---
name: nepraspro-guidelines
description: Core guidelines and standards for developing, designing, and maintaining the Egypt Smart School ERP (NeprasPro). Use this skill whenever planning, building, or modifying features, control modules, database migrations, or Excel macro reports.
---

# NeprasPro Guidelines & Best Practices

## 1. General Rules Overview
When developing any module or component for NeprasPro, always adhere to the core principles defined in `AGENTS.md` and `architecture-rules.md`:

- **Database Safety**: Never change the DB path from `%USERPROFILE%/.nepraspro/nepraspro.db`.
- **Cumulative Migrations**: Write safe SQL migrations with checks (`PRAGMA table_info`, `IF NOT EXISTS`).
- **5-Question Rule**: Ask 5 specific clarifying questions before making any changes in control or core modules.
- **Designer-Driven Rules**: Grade boundaries and evaluation controls are defined per designer/user input upon request.
- **EMIS Visual Identity**: Use `#1a3c6e` headers, `#f0f2f5` background, `#ffffff` cards, and `Cairo` font.
- **Excel Macro Preservation**: Export templates as `.xlsm` preserving macros intact.

## 2. Standard Official Header & Footer Guidelines (معيار الترويسة والتذييل للمطبوعات الرسمية)
Any report, certificate, slip, warning letter, seating card, or ministerial form printed in NeprasPro MUST strictly follow the standard 3-Column Egyptian Ministerial Header (`الترويسة الثلاثية المعتمدة`) and 4-Column Official Footer:

### A. الترويسة الثلاثية المعتمدة (Standard 3-Column Ministerial Header):
```html
<table class="header-table" style="width: 100%; border-bottom: 2.5px solid #1e3a8a; margin-bottom: 15px; padding-bottom: 8px;">
  <tr>
    <!-- 1. اليمين: التبعية الإدارية والمؤسسة -->
    <td style="width: 33%; text-align: right; font-size: 13px; font-weight: bold; line-height: 1.6;">
      <div>جمهورية مصر العربية</div>
      <div>وزارة التربية والتعليم والتعليم الفني</div>
      <div>مديرية التربية والتعليم بمحافظة: ${governorate}</div>
      <div>إدارة: ${directorate} التعليمية</div>
      <div>مدرسة: ${school_name}</div>
    </td>
    <!-- 2. الوسط: عنوان الوثيقة والشعار -->
    <td style="width: 34%; text-align: center;">
      ${logoUrl ? `<img src="${logoUrl}" style="height: 48px; margin-bottom: 4px;" />` : ''}
      <h2 style="font-size: 18px; font-weight: 900; color: #1e3a8a; margin: 0; text-decoration: underline;">
        ${title}
      </h2>
      <div style="font-size: 12.5px; font-weight: 800; color: #475569; margin-top: 3px;">
        ${subTitle || docSubject}
      </div>
    </td>
    <!-- 3. اليسار: التاريخ، العام الدراسي، والتوثيق -->
    <td style="width: 33%; text-align: left; font-size: 12px; font-weight: bold; line-height: 1.6;">
      <div>العام الدراسي: ${academicYear}</div>
      <div>الفصل الدراسي: ${termName || 'العام بالكامل'}</div>
      <div>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</div>
      ${formCode ? `<div>كود النموذج: ${formCode}</div>` : ''}
    </td>
  </tr>
</table>
```

### B. تذييل التوقيعات والاعتماد الرسمي (Standard Official Signatures & Stamp):
```html
<table class="signatures-table" style="width: 100%; margin-top: 30px; font-weight: 800; font-size: 13px; text-align: center;">
  <tr>
    <td style="width: 25%;">
      <div>المسؤول المختص / كاتب السجل</div>
      <div style="height: 40px; border-bottom: 1px dotted #000; width: 80%; margin: 10px auto 0;"></div>
    </td>
    <td style="width: 25%;">
      <div>المراجع / الأخصائي</div>
      <div style="height: 40px; border-bottom: 1px dotted #000; width: 80%; margin: 10px auto 0;"></div>
    </td>
    <td style="width: 25%;">
      <div>وكيل شؤون الطلاب والتعليم</div>
      <div style="height: 40px; border-bottom: 1px dotted #000; width: 80%; margin: 10px auto 0;"></div>
    </td>
    <td style="width: 25%;">
      <div>مدير المدرسة (يعتمد)</div>
      <div style="height: 40px; border-bottom: 1px dotted #000; width: 80%; margin: 10px auto 0;"></div>
    </td>
  </tr>
  <tr>
    <td colspan="4" style="padding-top: 20px;">
      <div style="width: 100px; height: 100px; border: 2px dashed #94a3b8; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 11.5px; color: #64748b; font-weight: bold;">
        خاتم المدرسة الرسمي
      </div>
    </td>
  </tr>
</table>
```

### C. قواعد بيانات الترويسة الموحدة:
1. **مصدر البيانات الحقيقي (Single Source of Truth)**: يتم جلب بيانات المدرسة والمحافظة والإدارة دائماً من `getSchoolMasterInfo(sqliteDb)` في الباك إند أو من `GET /api/setup/status` في الفرونت إند لضمان مطابقة التقرير لما تم حفظه في `institution_config`.
2. **خطوط وهوامش الطباعة (A4 / Portrait or Landscape)**:
   - للتقارير الرأسية (إفادات، إنذارات، كشوف جلوس): `size: A4 portrait; margin: 15mm 20mm;`.
   - للتقارير الأفقية (شيتات الكنترول، سجل 41، سجل درجات أعمال السنة): `size: A4 landscape; margin: 10mm 12mm;`.
   - الخط المعتمد: `'Cairo', 'Segoe UI', Arial, sans-serif`.

---

## 3. Checklist for New Feature Development
1. Read `CONTEXT.md` to confirm the latest state.
2. Follow the 3-Column Ministerial Header and 4-Signature Footer on all print layouts.
3. Ask 5 clarifying questions if working on control/core modules.
4. Use code-based queries (`codes` instead of Arabic strings).
5. Verify National ID (14 digits) and date inputs.
6. Update `CONTEXT.md` upon completion.
