# NeprasPro Workspace Agent Rules & Customization Constraints

## 1. Skill Isolation & Exclusion Rules
This workspace (`NeprasPro`) strictly limits active skills and system rules to Egyptian School ERP development. 

### EXCLUDED / UNLOADED SKILLS:
- ALL Science, Biological, Genomic & Medical skills (alphagenome-*, protein-sequence-*, gnomad, pubmed, uniprot, chembl, clinvar, dbsnp, foldseek, openfda, opentargets, pdb, pubchem, string, etc.)
- ALL Google Cloud Platform (GCP) & Big Data skills (gcp-*, bigquery-*, dataflow, dataform, dbt-bigquery, composer, spark, gcs, etc.)
- ALL non-relevant frameworks (android-cli, etc.)

### APPROVED & ACTIVE SKILLS FOR NEPRASPRO:
1. `nepraspro-guidelines` (Core standards & rules for NeprasPro)
2. `egyptian-id-validator` (Validation of 14-digit Egyptian IDs & birth dates)
3. `excel-macro-handler` (Handling Ministry of Education .xltm templates & .xlsm exports)
4. `qa-code-auditor` (Senior Code Reviewer & QA Auditor)
5. `qa-automated-test-generator` (Unit testing & WASM/SQLite assertions)
6. `qa-performance-security-auditor` (sql.js WASM performance, memory leak & Electron security)
7. `building-data-apps` (Dashboard & Data UI best practices)
8. `accidental-data-loss-prevention` (Data safety guardrails)

---

## 2. Token Budget & Context Efficiency Protocol
- Do NOT re-print full files when generating diffs or snippets.
- Use exact targeted ranges for reading files.
- Keep tool output summaries concise (1-2 lines).
- Enforce strict 5-question clarification rule before major control module alterations.
- Maintain permanent context in `CONTEXT.md`.

---

## 3. Strict Code Isolation & Change Guardrails (مبدأ عزل وحماية الكود)
1. **نطاق التعديل المحدد (Targeted Scope Only)**:
   - يحظر تماماً لمس أو تعديل أي ملف، دالة، استعلام SQL، أو مكون خارج النطاق الفعلي والمباشر للطلب الحالي.
2. **منع التأثيرات الجانبية (Zero Side-Effects)**:
   - قبل إجراء أي تعديل على الدوال أو الاستعلامات المشتركة (Shared Controllers/Services)، يجب التأكد من عدم كسر أي تبويب آخر يعتمد عليها.
3. **ثبات قاعدة البيانات وهيكل الجداول (Schema Stability)**:
   - عدم تعديل أسماء الحقول أو الاستعلامات الأساسية لجدول الطلاب وباقي الجداول دون ضرورة قصوى وتأكيد مسبق.
4. **الفحص والتحقق الصارم (Pre & Post Verification)**:
   - فحص صحة الاستعلامات وعمليات البناء والتكامل داخلياً قبل اعتماد أي تغيير.

---

## 4. Standard 3-Column Ministerial Header & Print Protocol (معيار الترويسة والتذييل الرسمي)
- **الترويسة الثلاثية القياسية**:
  - **اليمين**: جمهورية مصر العربية / وزارة التربية والتعليم / مديرية التربية والتعليم بمحافظة ... / إدارة ... التعليمية / مدرسة ...
  - **الوسط**: شعار المدرسة / عنوان الوثيقة الرسمي مسطر / الصف والفصل أو كود الموضوع
  - **اليسار**: العام الدراسي / الفصل الدراسي / تاريخ الطباعة / كود الاستمارة الوزارية
- **التذييل الرباعي الرسمي**: (المسؤول المختص / المراجع والأخصائي / وكيل شؤون الطلاب والتعليم / مدير المدرسة وخاتم المدرسة).
- **مصدر البيانات**: جلب بيانات الترويسة حصراً من `getSchoolMasterInfo(sqliteDb)` أو `GET /api/setup/status` لضمان مطابقة ما تم حفظه في `institution_config`.

