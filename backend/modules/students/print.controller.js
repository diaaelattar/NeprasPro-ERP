/**
 * print.controller.js
 * توليد PDF بجودة مثالية عبر Puppeteer
 * الخط: Calibri (متوفر على Windows)
 */

const puppeteer = require('puppeteer');
const db = require('../../config/db');
const { getSchoolMasterInfo, calculateAgeOnOct1st } = require('../../utils/schoolHelper');

// ─── sql.js helpers ───────────────────────────────────────────────────────────
const _all = (sqliteDb, sql, params = []) => {
  const stmt = sqliteDb.prepare(sql);
  if (params && params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
};

const _get = (sqliteDb, sql, params = []) => {
  const stmt = sqliteDb.prepare(sql);
  if (params && params.length) stmt.bind(params);
  const hasRow = stmt.step();
  const row = hasRow ? stmt.getAsObject() : null;
  stmt.free();
  return row;
};

/* ══════════════════════════════════════════════════════════
   دالة مساعدة — بناء HTML الترويسة الثلاثية المعتمدة
   ══════════════════════════════════════════════════════════ */
function buildDocHTML({ title, formCode, student, school, academicYear, bodyHtml }) {
  const gov        = school?.governorate  || '...............';
  const rawAdmin   = school?.directorate  || '';
  const cleanAdmin = rawAdmin.replace(/التعليمية\s*$/, '').trim() || '...............';
  const rawSchool  = school?.school_name  || '';
  const cleanSchool = rawSchool.replace(/^مدرسة\s*/, '').trim() || '...............';
  const logoUrl    = school?.logo_url     || '';

  const now     = new Date();
  const dateStr = now.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 22mm 20mm 22mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Calibri', 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 12pt;
      color: #000;
      line-height: 1.7;
      direction: rtl;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 10pt;
      border-bottom: 2pt solid #000;
      margin-bottom: 14pt;
    }
    .hd-right {
      text-align: right;
      font-size: 12pt;
      font-weight: 700;
      line-height: 1.65;
      min-width: 55mm;
    }
    .hd-center {
      text-align: center;
      flex: 1;
      padding: 0 8mm;
    }
    .hd-center h1 {
      font-size: 18pt;
      font-weight: 800;
      text-decoration: underline;
      letter-spacing: 0.5pt;
      margin-bottom: 4pt;
    }
    .hd-center .year {
      font-size: 13pt;
      font-weight: 700;
      text-decoration: underline;
    }
    .hd-left {
      text-align: left;
      font-size: 10pt;
      line-height: 1.5;
      min-width: 55mm;
    }
    .hd-left img {
      max-height: 52pt;
      max-width: 90pt;
      object-fit: contain;
      display: block;
      margin-bottom: 3pt;
    }
    .doc-body {
      padding: 10pt 0 16pt;
      font-size: 12.5pt;
      line-height: 2;
    }
    .doc-body p { margin-bottom: 10pt; }
    .doc-body ul { list-style: none; padding: 0; margin: 8pt 0 12pt; }
    .doc-body ul li {
      padding: 3pt 0;
      border-bottom: 0.5pt dotted #999;
      display: flex;
      justify-content: space-between;
    }
    .footer-sigs {
      margin-top: 24pt;
      display: flex;
      justify-content: space-between;
      text-align: center;
      font-size: 11pt;
      font-weight: 700;
    }
    .sig-cell { flex: 1; padding: 0 4pt; }
    .sig-line {
      margin-top: 24pt;
      border-bottom: 1pt dotted #000;
      width: 75%;
      margin-left: auto;
      margin-right: auto;
    }
    .stamp-row { text-align: center; margin-top: 14pt; }
    .stamp-circle {
      display: inline-block;
      width: 75pt;
      height: 75pt;
      border: 1.5pt dashed #555;
      border-radius: 50%;
      line-height: 75pt;
      font-size: 9.5pt;
      color: #666;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="hd-right">
      <div>جمهورية مصر العربية</div>
      <div>وزارة التربية والتعليم</div>
      <div>مديرية التربية والتعليم بمحافظة ${gov}</div>
      <div>إدارة ${cleanAdmin} التعليمية</div>
      <div>مدرسة ${cleanSchool}</div>
    </div>
    <div class="hd-center">
      <h1>${title}</h1>
      <div class="year">للعام الدراسي: ${academicYear || '....../......'} م</div>
    </div>
    <div class="hd-left">
      ${logoUrl ? `<img src="${logoUrl}" alt="شعار المدرسة" />` : '<div style="display:inline-block;border:1pt dashed #999;padding:4pt 8pt;border-radius:4pt;">شعار المدرسة</div>'}
      <div>التاريخ: ${dateStr}</div>
      <div>الوقت: ${timeStr}</div>
    </div>
  </div>

  <div class="doc-body">
    ${bodyHtml}
  </div>

  <div class="footer-sigs">
    <div class="sig-cell">
      <div>المسؤول المختص<br/>(كاتب السجل)</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-cell">
      <div>المراجع<br/>(الأخصائي)</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-cell">
      <div>وكيل شؤون الطلاب والتعليم</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-cell">
      <div>مدير المدرسة<br/>(يعتمد)</div>
      <div class="sig-line"></div>
    </div>
  </div>
  <div class="stamp-row">
    <div class="stamp-circle">خاتم المدرسة الرسمي</div>
  </div>
</body>
</html>`;
}

/* ══════════════════════════════════════════════════════════
   Controller — POST /api/students/print/doc
   Body: { studentId, docType }
   docType: 'enrollment_cert' | 'status_statement'
   ══════════════════════════════════════════════════════════ */
exports.printStudentDoc = async (req, res) => {
  let browser;
  try {
    const { studentId, docType } = req.body;
    if (!studentId || !docType) {
      return res.status(400).json({ success: false, error: 'studentId و docType مطلوبان' });
    }

    if (!db.isConfigured()) {
      return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة' });
    }
    const sqliteDb = db.getSQLiteDb();

    /* ── جلب بيانات الطالب ── */
    const student = _get(sqliteDb, `
      SELECT
        s.*,
        g.grade_name_ar,
        cl.class_name,
        sec.section_name,
        st.stage_name,
        n.name AS nationality_name,
        ay.year_label AS academic_year
      FROM students s
      LEFT JOIN grades_lookup  g   ON g.id = s.grade_id
      LEFT JOIN classes        cl  ON cl.id = s.class_id
      LEFT JOIN sections       sec ON sec.id = s.section_id
      LEFT JOIN stages_lookup  st  ON st.id = s.stage_id
      LEFT JOIN nationalities  n   ON n.id = s.nationality_id
      LEFT JOIN academic_years ay  ON ay.id = s.academic_year_id
      WHERE s.id = ? AND s.deleted_at IS NULL
      LIMIT 1
    `, [Number(studentId)]);

    if (!student) {
      return res.status(404).json({ success: false, error: 'الطالب غير موجود' });
    }

    const school = getSchoolMasterInfo(sqliteDb);
    const yearRow = _get(sqliteDb, `SELECT year_label FROM academic_years WHERE is_current = 1 LIMIT 1`);
    const academicYear = yearRow?.year_label || student.academic_year || '';

    const STATUS_LABELS = {
      promoted:     'منقول',
      new:          'مستجد',
      retained:     'باقٍ للإعادة',
      transferred:  'محول',
      disconnected: 'منقطع',
      suspended:    'موقوف قيده',
    };
    const statusLabel = STATUS_LABELS[student.enrollment_status] || student.enrollment_status || 'مقيد';

    let title    = 'إثبات قيد';
    let formCode = 'استمارة إثبات قيد';
    let bodyHtml = '';

    if (docType === 'enrollment_cert') {
      title    = 'إثبات قيد';
      formCode = 'إثبات قيد';
      bodyHtml = `
        <p>تشهد إدارة المدرسة بأن الطالب / <strong>${student.full_name_ar || '—'}</strong></p>
        <ul>
          <li>الرقم القومي: <strong>${student.national_id || '—'}</strong></li>
          <li>كود الطالب (الرقم التعريفي): <strong>${student.emis_student_code || student.student_code || '—'}</strong></li>
          <li>الصف الدراسي: <strong>${student.grade_name_ar || '—'}</strong></li>
          <li>الفصل: <strong>${student.class_name || '—'}</strong></li>
          <li>المرحلة الدراسية: <strong>${student.stage_name || '—'}</strong></li>
          <li>حالة القيد: <strong>${statusLabel}</strong></li>
          <li>تاريخ الميلاد: <strong>${student.birth_date || '—'}</strong></li>
          <li>محل الميلاد: <strong>${student.birth_governorate || '—'}</strong></li>
          <li>الجنسية: <strong>${student.nationality_name || 'مصري'}</strong></li>
          <li>الديانة: <strong>${student.religion || '—'}</strong></li>
        </ul>
        <p>مقيد بالمدرسة بالصف المذكور أعلاه للعام الدراسي <strong>${academicYear || '—'} م</strong>، وحالته مستقرة ومنتظم بالدراسة حتى تاريخه.</p>
        <p>وقد أُعطيت له هذه الشهادة بناءً على طلبه لتقديمها إلى من يهمه الأمر دون أدنى مسؤولية على المدرسة فيما يخص مستحقات مالية أو تعاملات خارجية.</p>
      `;

    } else if (docType === 'status_statement') {
      title    = 'بيان بالحالة الدراسية';
      formCode = 'بيان حالة طالب';
      bodyHtml = `
        <p>تفيد إدارة المدرسة بأن الطالب / <strong>${student.full_name_ar || '—'}</strong></p>
        <ul>
          <li>الرقم القومي: <strong>${student.national_id || '—'}</strong></li>
          <li>كود الطالب: <strong>${student.emis_student_code || student.student_code || '—'}</strong></li>
          <li>تاريخ الالتحاق بالمدرسة: <strong>${student.admission_date || student.enrollment_date || '—'}</strong></li>
          <li>الصف الدراسي المقيد به: <strong>${student.grade_name_ar || '—'}</strong> (${student.class_name || '—'})</li>
          <li>المرحلة التعليمية: <strong>${student.stage_name || '—'}</strong></li>
          <li>العام الدراسي: <strong>${academicYear || '—'}</strong></li>
          <li>حالة القيد: <strong>${statusLabel}</strong></li>
          <li>اللغة الأجنبية الثانية: <strong>${student.second_language || '—'}</strong></li>
        </ul>
        <p>وقد أُعطي هذا البيان بناءً على طلب ولي الأمر لتقديمه للجهات المختصة.</p>
      `;

    } else {
      return res.status(400).json({ success: false, error: `docType غير معروف: ${docType}` });
    }

    const html = buildDocHTML({ title, formCode, student, school, academicYear, bodyHtml });

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', right: '22mm', bottom: '20mm', left: '22mm' },
      displayHeaderFooter: false,
    });

    await browser.close();
    browser = null;

    const safeStudentName = (student.full_name_ar || 'student').replace(/\s+/g, '_');
    const fileName = `${title}_${safeStudentName}.pdf`;

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Content-Length':       pdfBuffer.length,
    });
    res.end(pdfBuffer);

  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error('[printStudentDoc] Error:', err);
    res.status(500).json({ success: false, error: 'فشل توليد PDF: ' + err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   Controller — POST /api/students/print/october-census
   توليد استمارة 1 إحصاء الاستقرار بـ Puppeteer (A4 Landscape)
   ══════════════════════════════════════════════════════════ */
exports.printOctoberCensusPdf = async (req, res) => {
  let browser;
  try {
    if (!db.isConfigured()) {
      return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة' });
    }
    const sqliteDb = db.getSQLiteDb();
    const school = getSchoolMasterInfo(sqliteDb);
    const yearRow = _get(sqliteDb, `SELECT id, year_label FROM academic_years WHERE is_current = 1 LIMIT 1`);
    const yearId = yearRow?.id || 1;
    const academicYear = yearRow?.year_label || '....../......';

    const gov        = school?.governorate  || '...............';
    const rawAdmin   = school?.directorate  || '';
    const cleanAdmin = rawAdmin.replace(/التعليمية\s*$/, '').trim() || '...............';
    const rawSchool  = school?.school_name  || '';
    const cleanSchool = rawSchool.replace(/^مدرسة\s*/, '').trim() || '...............';
    const logoUrl    = school?.logo_url     || '';

    const now     = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });

    // Detailed Rows
    const detailedRows = _all(sqliteDb, `
      SELECT
        st.stage_name,
        g.grade_name_ar,
        c.class_name,
        COUNT(s.id) AS total_students,
        SUM(CASE WHEN s.gender = 'ذكر' OR s.gender = 'بنين' THEN 1 ELSE 0 END) AS boys_count,
        SUM(CASE WHEN s.gender = 'أنثى' OR s.gender = 'بنات' THEN 1 ELSE 0 END) AS girls_count,
        SUM(CASE WHEN s.religion LIKE '%مسلم%' OR s.religion = '1' THEN 1 ELSE 0 END) AS muslims_count,
        SUM(CASE WHEN s.religion LIKE '%مسيح%' OR s.religion = '2' THEN 1 ELSE 0 END) AS christians_count,
        SUM(CASE WHEN n.name = 'مصري' OR s.nationality_id = 1 OR s.nationality_id IS NULL THEN 1 ELSE 0 END) AS egyptian_count,
        SUM(CASE WHEN n.name IS NOT NULL AND n.name != 'مصري' AND s.nationality_id > 1 THEN 1 ELSE 0 END) AS foreign_count,
        SUM(CASE WHEN s.enrollment_status = 'new' OR s.status = 'مستجد' OR s.registration_status_id = 1 THEN 1 ELSE 0 END) AS new_count,
        SUM(CASE WHEN s.enrollment_status IN ('promoted', 'منقول', 'مقيد') OR s.status IN ('promoted', 'منقول', 'مقيد', 'نشط') OR s.registration_status_id = 2 OR (s.enrollment_status IS NULL AND (s.status IS NULL OR s.status = '')) THEN 1 ELSE 0 END) AS promoted_count,
        SUM(CASE WHEN s.enrollment_status IN ('retained', 'باق', 'باق للإعادة') OR s.status IN ('retained', 'باق', 'باق للإعادة') OR s.registration_status_id = 3 THEN 1 ELSE 0 END) AS retained_count,
        SUM(CASE WHEN s.enrollment_status IN ('disconnected', 'منقطع') OR s.status IN ('disconnected', 'منقطع') OR s.registration_status_id = 5 THEN 1 ELSE 0 END) AS disconnected_count,
        SUM(CASE WHEN s.is_merged = 1 THEN 1 ELSE 0 END) AS merged_count
      FROM students s
      JOIN grades_lookup g ON g.id = s.grade_id
      LEFT JOIN stages_lookup st ON st.id = s.stage_id
      LEFT JOIN nationalities n ON n.id = s.nationality_id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.academic_year_id = s.academic_year_id
      LEFT JOIN classes c ON c.id = ce.class_id
      WHERE s.deleted_at IS NULL AND s.academic_year_id = ?
      GROUP BY g.id, c.id
      ORDER BY g.grade_number ASC, c.class_number ASC
    `, [Number(yearId)]);

    // Summary Rows
    const gradeSummaries = _all(sqliteDb, `
      SELECT
        st.stage_name,
        g.grade_name_ar,
        COUNT(DISTINCT c.id) AS classes_count,
        COUNT(s.id) AS total_students,
        SUM(CASE WHEN s.gender = 'ذكر' OR s.gender = 'بنين' THEN 1 ELSE 0 END) AS boys_count,
        SUM(CASE WHEN s.gender = 'أنثى' OR s.gender = 'بنات' THEN 1 ELSE 0 END) AS girls_count,
        SUM(CASE WHEN s.religion LIKE '%مسلم%' OR s.religion = '1' THEN 1 ELSE 0 END) AS muslims_count,
        SUM(CASE WHEN s.religion LIKE '%مسيح%' OR s.religion = '2' THEN 1 ELSE 0 END) AS christians_count,
        SUM(CASE WHEN n.name = 'مصري' OR s.nationality_id = 1 OR s.nationality_id IS NULL THEN 1 ELSE 0 END) AS egyptian_count,
        SUM(CASE WHEN n.name IS NOT NULL AND n.name != 'مصري' AND s.nationality_id > 1 THEN 1 ELSE 0 END) AS foreign_count,
        SUM(CASE WHEN s.enrollment_status = 'new' OR s.status = 'مستجد' OR s.registration_status_id = 1 THEN 1 ELSE 0 END) AS new_count,
        SUM(CASE WHEN s.enrollment_status IN ('promoted', 'منقول', 'مقيد') OR s.status IN ('promoted', 'منقول', 'مقيد', 'نشط') OR s.registration_status_id = 2 OR (s.enrollment_status IS NULL AND (s.status IS NULL OR s.status = '')) THEN 1 ELSE 0 END) AS promoted_count,
        SUM(CASE WHEN s.enrollment_status IN ('retained', 'باق', 'باق للإعادة') OR s.status IN ('retained', 'باق', 'باق للإعادة') OR s.registration_status_id = 3 THEN 1 ELSE 0 END) AS retained_count,
        SUM(CASE WHEN s.enrollment_status IN ('disconnected', 'منقطع') OR s.status IN ('disconnected', 'منقطع') OR s.registration_status_id = 5 THEN 1 ELSE 0 END) AS disconnected_count,
        SUM(CASE WHEN s.is_merged = 1 THEN 1 ELSE 0 END) AS merged_count
      FROM students s
      JOIN grades_lookup g ON g.id = s.grade_id
      LEFT JOIN stages_lookup st ON st.id = s.stage_id
      LEFT JOIN nationalities n ON n.id = s.nationality_id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.academic_year_id = s.academic_year_id
      LEFT JOIN classes c ON c.id = ce.class_id
      WHERE s.deleted_at IS NULL AND s.academic_year_id = ?
      GROUP BY g.id
      ORDER BY g.grade_number ASC
    `, [Number(yearId)]);

    const grandTotal = detailedRows.reduce((s, r) => s + (r.total_students || 0), 0);
    const totalClasses = detailedRows.length;
    const totalBoys = detailedRows.reduce((s, r) => s + (r.boys_count || 0), 0);
    const totalGirls = detailedRows.reduce((s, r) => s + (r.girls_count || 0), 0);
    const totalMuslims = detailedRows.reduce((s, r) => s + (r.muslims_count || 0), 0);
    const totalChristians = detailedRows.reduce((s, r) => s + (r.christians_count || 0), 0);
    const totalEgyptian = detailedRows.reduce((s, r) => s + (r.egyptian_count || 0), 0);
    const totalForeign = detailedRows.reduce((s, r) => s + (r.foreign_count || 0), 0);
    const totalNew = detailedRows.reduce((s, r) => s + (r.new_count || 0), 0);
    const totalPromoted = detailedRows.reduce((s, r) => s + (r.promoted_count || 0), 0);
    const totalRetained = detailedRows.reduce((s, r) => s + (r.retained_count || 0), 0);
    const totalDisconnected = detailedRows.reduce((s, r) => s + (r.disconnected_count || 0), 0);
    const totalMerged = detailedRows.reduce((s, r) => s + (r.merged_count || 0), 0);
    const avgDensity = totalClasses > 0 ? (grandTotal / totalClasses).toFixed(1) : '0';

    const activeView = req.body?.activeView || 'all';
    const showSummary = (activeView === 'all' || activeView === 'summary');
    const showDetailed = (activeView === 'all' || activeView === 'detailed');

    const subTitle = activeView === 'summary' 
      ? 'حصر إجمالي الصفوف والمراحل الدراسية' 
      : activeView === 'detailed' 
        ? 'كشف تفصيلي بحصر الفصول والتلاميذ' 
        : '';

    const headerHtml = `
      <div class="hd-box">
        <div class="hd-r">
          <div>محافظة: <strong>${gov}</strong></div>
          <div>إدارة: <strong>${cleanAdmin} التعليمية</strong></div>
          <div>مدرسة: <strong>${cleanSchool}</strong></div>
        </div>
        <div class="hd-c">
          <h2>استمارة 1 إحصاء استقرار الفصول والتلاميذ في 1 أكتوبر</h2>
          <div class="hd-yr">للعام الدراسي: ${academicYear} م ${subTitle ? `— (${subTitle})` : ''}</div>
        </div>
        <div class="hd-l">
          ${logoUrl ? `<img src="${logoUrl}" alt="شعار" />` : '<div class="logo-box">شعار المدرسة</div>'}
          <div>تاريخ الإحصاء: 1 أكتوبر — طُبع: ${dateStr}</div>
        </div>
      </div>
    `;

    const summarySectionHtml = showSummary ? `
      ${headerHtml}
      <div class="sec-title">أولاً: حصر إجمالي الصفوف والمراحل الدراسية</div>
      <table>
        <thead>
          <tr style="background: #f1f5f9; font-weight: 800;">
            <th rowspan="2" style="width: 20pt;">م</th>
            <th rowspan="2" style="width: 70pt;">المرحلة</th>
            <th rowspan="2" style="width: 90pt;">الصف الدراسي</th>
            <th rowspan="2" style="width: 35pt;">الفصول</th>
            <th colspan="3">توزيع النوع</th>
            <th colspan="2">الديانة</th>
            <th colspan="2">الجنسيات</th>
            <th colspan="4">حالات القيد</th>
            <th rowspan="2" style="width: 30pt;">الدمج</th>
            <th rowspan="2" style="width: 40pt;">الكثافة</th>
            <th rowspan="2" style="width: 45pt;">الجملة</th>
          </tr>
          <tr style="background: #f8fafc; font-weight: 800;">
            <th style="width: 28pt;">بنين</th>
            <th style="width: 28pt;">بنات</th>
            <th style="width: 32pt;">الجملة</th>
            <th style="width: 28pt;">مسلم</th>
            <th style="width: 28pt;">مسيحي</th>
            <th style="width: 28pt;">مصري</th>
            <th style="width: 28pt;">وافد</th>
            <th style="width: 28pt;">مستجد</th>
            <th style="width: 28pt;">منقول</th>
            <th style="width: 28pt;">باقٍ</th>
            <th style="width: 28pt;">منقطع</th>
          </tr>
        </thead>
        <tbody>
          ${gradeSummaries.map((g, i) => `
            <tr style="background: ${i % 2 === 1 ? '#fafafa' : '#fff'};">
              <td>${i + 1}</td>
              <td>${g.stage_name || '—'}</td>
              <td style="font-weight: 800;">${g.grade_name_ar}</td>
              <td style="font-weight: 800;">${g.classes_count || 1}</td>
              <td>${g.boys_count || 0}</td>
              <td>${g.girls_count || 0}</td>
              <td style="font-weight: 800; background: #f8fafc;">${g.total_students || 0}</td>
              <td>${g.muslims_count || 0}</td>
              <td>${g.christians_count || 0}</td>
              <td>${g.egyptian_count || 0}</td>
              <td>${g.foreign_count || 0}</td>
              <td>${g.new_count || 0}</td>
              <td>${g.promoted_count || 0}</td>
              <td>${g.retained_count || 0}</td>
              <td>${g.disconnected_count || 0}</td>
              <td>${g.merged_count || 0}</td>
              <td>${(g.classes_count > 0 ? (g.total_students / g.classes_count).toFixed(1) : '0')}</td>
              <td style="font-weight: 900; background: #f1f5f9;">${g.total_students || 0}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background: #e2e8f0; font-weight: 900;">
            <td colspan="3">الإجمالي العام للمدرسة</td>
            <td>${totalClasses}</td>
            <td>${totalBoys}</td>
            <td>${totalGirls}</td>
            <td style="background: #cbd5e1;">${grandTotal}</td>
            <td>${totalMuslims}</td>
            <td>${totalChristians}</td>
            <td>${totalEgyptian}</td>
            <td>${totalForeign}</td>
            <td>${totalNew}</td>
            <td>${totalPromoted}</td>
            <td>${totalRetained}</td>
            <td>${totalDisconnected}</td>
            <td>${totalMerged}</td>
            <td>${avgDensity}</td>
            <td style="background: #cbd5e1;">${grandTotal}</td>
          </tr>
        </tfoot>
      </table>
      ${activeView === 'summary' ? `
        <table class="sigs-table">
          <tr>
            <td><div>مسؤول الإحصاء وشئون الطلاب</div><div class="sig-line"></div></td>
            <td><div>المراجع / الأخصائي</div><div class="sig-line"></div></td>
            <td><div>وكيل شؤون الطلاب والتعليم</div><div class="sig-line"></div></td>
            <td><div>مدير المدرسة (يعتمد)</div><div class="sig-line"></div></td>
          </tr>
          <tr>
            <td colspan="4">
              <div class="stamp-box">خاتم المدرسة</div>
            </td>
          </tr>
        </table>
      ` : ''}
    ` : '';

    const detailedSectionHtml = showDetailed ? `
      ${activeView === 'all' ? '<div class="page-break"></div>' : ''}
      ${headerHtml}
      <div class="sec-title">${activeView === 'all' ? 'ثانياً: ' : ''}حصر تفصيلي لجميع فصول المدرسة</div>
      <table>
        <thead>
          <tr style="background: #f1f5f9; font-weight: 800;">
            <th rowspan="2" style="width: 20pt;">م</th>
            <th rowspan="2" style="width: 65pt;">المرحلة</th>
            <th rowspan="2" style="width: 85pt;">الصف الدراسي</th>
            <th rowspan="2" style="width: 35pt;">الفصل</th>
            <th colspan="3">توزيع النوع</th>
            <th colspan="2">الديانة</th>
            <th colspan="2">الجنسيات</th>
            <th colspan="4">حالات القيد</th>
            <th rowspan="2" style="width: 30pt;">الدمج</th>
            <th rowspan="2" style="width: 45pt;">جملة الفصل</th>
          </tr>
          <tr style="background: #f8fafc; font-weight: 800;">
            <th style="width: 28pt;">بنين</th>
            <th style="width: 28pt;">بنات</th>
            <th style="width: 32pt;">الجملة</th>
            <th style="width: 28pt;">مسلم</th>
            <th style="width: 28pt;">مسيحي</th>
            <th style="width: 28pt;">مصري</th>
            <th style="width: 28pt;">وافد</th>
            <th style="width: 28pt;">مستجد</th>
            <th style="width: 28pt;">منقول</th>
            <th style="width: 28pt;">باقٍ</th>
            <th style="width: 28pt;">منقطع</th>
          </tr>
        </thead>
        <tbody>
          ${detailedRows.map((r, i) => `
            <tr style="background: ${i % 2 === 1 ? '#fafafa' : '#fff'};">
              <td>${i + 1}</td>
              <td>${r.stage_name || '—'}</td>
              <td style="font-weight: 700;">${r.grade_name_ar}</td>
              <td style="font-weight: 800;">${r.class_name || '—'}</td>
              <td>${r.boys_count || 0}</td>
              <td>${r.girls_count || 0}</td>
              <td style="font-weight: 800; background: #f8fafc;">${r.total_students || 0}</td>
              <td>${r.muslims_count || 0}</td>
              <td>${r.christians_count || 0}</td>
              <td>${r.egyptian_count || 0}</td>
              <td>${r.foreign_count || 0}</td>
              <td>${r.new_count || 0}</td>
              <td>${r.promoted_count || 0}</td>
              <td>${r.retained_count || 0}</td>
              <td>${r.disconnected_count || 0}</td>
              <td>${r.merged_count || 0}</td>
              <td style="font-weight: 900; background: #f1f5f9;">${r.total_students || 0}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background: #e2e8f0; font-weight: 900;">
            <td colspan="4">الإجمالي العام (${totalClasses} فصل) — متوسط الكثافة: ${avgDensity}</td>
            <td>${totalBoys}</td>
            <td>${totalGirls}</td>
            <td style="background: #cbd5e1;">${grandTotal}</td>
            <td>${totalMuslims}</td>
            <td>${totalChristians}</td>
            <td>${totalEgyptian}</td>
            <td>${totalForeign}</td>
            <td>${totalNew}</td>
            <td>${totalPromoted}</td>
            <td>${totalRetained}</td>
            <td>${totalDisconnected}</td>
            <td>${totalMerged}</td>
            <td style="background: #cbd5e1;">${grandTotal}</td>
          </tr>
        </tfoot>
      </table>

      <!-- التذييل الرسمي -->
      <table class="sigs-table">
        <tr>
          <td><div>مسؤول الإحصاء وشئون الطلاب</div><div class="sig-line"></div></td>
          <td><div>المراجع / الأخصائي</div><div class="sig-line"></div></td>
          <td><div>وكيل شؤون الطلاب والتعليم</div><div class="sig-line"></div></td>
          <td><div>مدير المدرسة (يعتمد)</div><div class="sig-line"></div></td>
        </tr>
        <tr>
          <td colspan="4">
            <div class="stamp-box">خاتم المدرسة</div>
          </td>
        </tr>
      </table>
    ` : '';

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>استمارة 1 إحصاء الاستقرار</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm 12mm 12mm 12mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Calibri', 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 10pt;
      color: #000;
      line-height: 1.4;
      direction: rtl;
    }
    .hd-box {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2pt solid #000;
      padding-bottom: 6pt;
      margin-bottom: 10pt;
    }
    .hd-r { text-align: right; font-size: 11pt; font-weight: 700; line-height: 1.4; min-width: 60mm; }
    .hd-c { text-align: center; flex: 1; }
    .hd-c h2 { font-size: 15pt; font-weight: 900; text-decoration: underline; margin-bottom: 2pt; }
    .hd-yr { font-size: 12pt; font-weight: 800; text-decoration: underline; }
    .hd-l { text-align: left; min-width: 60mm; font-size: 9.5pt; font-weight: 600; }
    .hd-l img { max-height: 38pt; max-width: 75pt; object-fit: contain; margin-bottom: 2pt; }
    .logo-box { display: inline-block; border: 1pt dashed #999; padding: 2pt 6pt; font-size: 9pt; }

    .sec-title {
      font-size: 12pt;
      font-weight: 800;
      margin: 10pt 0 6pt;
      padding: 3pt 6pt;
      background: #e2e8f0;
      border-right: 4pt solid #0284c7;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5pt solid #000;
      font-size: 9.5pt;
      text-align: center;
      margin-bottom: 12pt;
    }
    th, td {
      border: 1pt solid #000;
      padding: 3.5pt 2pt;
    }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { page-break-inside: avoid; }
    .page-break { page-break-before: always; }

    .sigs-table {
      width: 100%;
      border-collapse: collapse;
      border: none;
      margin-top: 20pt;
      font-size: 10.5pt;
      font-weight: 800;
      text-align: center;
    }
    .sigs-table td { border: none; padding: 4pt; }
    .sig-line { width: 70%; height: 1pt; border-bottom: 1pt dotted #000; margin: 18pt auto 0; }
    .stamp-box {
      width: 65pt;
      height: 65pt;
      border: 1.5pt dashed #999;
      border-radius: 50%;
      margin: 6pt auto 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8.5pt;
      color: #777;
    }
  </style>
</head>
<body>
  ${summarySectionHtml}
  ${detailedSectionHtml}
</body>
</html>`;

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '8mm', right: '10mm', bottom: '10mm', left: '10mm' },
      displayHeaderFooter: false,
    });

    await browser.close();
    browser = null;

    const fileName = `استمارة_1_إحصاء_الاستقرار_${academicYear.replace(/[\/\\]/g, '_')}.pdf`;

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Content-Length':       pdfBuffer.length,
    });
    res.end(pdfBuffer);

  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error('[printOctoberCensusPdf] Error:', err);
    res.status(500).json({ success: false, error: 'فشل توليد PDF: ' + err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   Controller — POST /api/students/print/register-41
   توليد سجل 41 مستجدين بـ Puppeteer (A4 Landscape)
   ══════════════════════════════════════════════════════════ */
exports.printRegister41Pdf = async (req, res) => {
  let browser;
  try {
    if (!db.isConfigured()) {
      return res.status(400).json({ success: false, error: 'قاعدة البيانات غير مهيأة' });
    }
    const sqliteDb = db.getSQLiteDb();
    const school = getSchoolMasterInfo(sqliteDb);

    // ── العام الدراسي: من الطلب أو النشط حالياً
    const { gradeId, academicYearId } = req.body || req.query || {};
    const yearRow = academicYearId
      ? _get(sqliteDb, `SELECT id, year_label FROM academic_years WHERE id = ? LIMIT 1`, [Number(academicYearId)])
      : _get(sqliteDb, `SELECT id, year_label FROM academic_years WHERE is_current = 1 LIMIT 1`);
    const yearId = yearRow?.id || 1;
    const academicYear = yearRow?.year_label || '....../......';

    const gov         = school?.governorate || '...............';
    const rawAdmin    = school?.directorate || '';
    const cleanAdmin  = rawAdmin.replace(/التعليمية\s*$/, '').trim() || '...............';
    const rawSchool   = school?.school_name || '';
    const cleanSchool = rawSchool.replace(/^مدرسة\s*/, '').trim() || '...............';
    const logoUrl     = school?.logo_url    || '';

    const now     = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });

    // ── بناء شرط الصف ديناميكياً
    const gradeCondition = gradeId ? `AND s.grade_id = ${Number(gradeId)}` : 'AND g.grade_number = 1';

    const students = _all(sqliteDb, `
      SELECT
        s.id, s.student_code, s.full_name_ar, s.national_id, s.birth_date,
        s.gender, s.religion, s.enrollment_date, s.enrollment_status,
        s.guardian_name, s.guardian_relation, s.guardian_job, s.guardian_phone,
        s.guardian_national_id, s.address, s.is_merged, s.merge_type,
        g.grade_name_ar, g.grade_number,
        st.stage_name,
        c.class_name,
        ay.year_label AS academic_year
      FROM students s
      LEFT JOIN grades_lookup  g   ON g.id  = s.grade_id
      LEFT JOIN stages_lookup  st  ON st.id = s.stage_id
      LEFT JOIN academic_years ay  ON ay.id = s.academic_year_id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.academic_year_id = s.academic_year_id
      LEFT JOIN classes        c   ON c.id = ce.class_id
      WHERE s.deleted_at IS NULL AND s.academic_year_id = ? ${gradeCondition}
        AND (s.enrollment_status IN ('new', 'promoted', 'مستجد', 'منقول')
          OR s.status IN ('new', 'promoted', 'مستجد', 'منقول', 'نشط', 'active')
          OR s.enrollment_status IS NULL
          OR s.enrollment_status = '')
        AND (s.enrollment_status NOT IN ('retained', 'باق', 'باق للإعادة', 'disconnected', 'منقطع', 'excluded', 'مستبعد')
          AND s.status NOT IN ('retained', 'باق', 'باق للإعادة', 'disconnected', 'منقطع', 'excluded', 'مستبعد'))
      ORDER BY s.full_name_ar ASC`, [Number(yearId)]);

    const enriched = students.map((stu, idx) => {
      const yearForCalc = stu.academic_year || academicYear;
      const age = calculateAgeOnOct1st(
        stu.birth_date || stu.national_id,
        yearForCalc,
        academicYear
      );
      return {
        serial: idx + 1,
        ...stu,
        age_oct_years: age.years !== '' ? age.years : 0,
        age_oct_months: age.months !== '' ? age.months : 0,
        age_oct_days: age.days !== '' ? age.days : 0,
        fees_status: ''
      };
    });

    const headerHtml = `
      <div class="hd-box">
        <div class="hd-r">
          <div>محافظة: <strong>${gov}</strong></div>
          <div>إدارة: <strong>${cleanAdmin} التعليمية</strong></div>
          <div>مدرسة: <strong>${cleanSchool}</strong></div>
        </div>
        <div class="hd-c">
          <h2>سجل قيد التلاميذ المستجدين (سجل 41 مستجدين)</h2>
          <div class="hd-yr">للعام الدراسي: ${academicYear} م</div>
        </div>
        <div class="hd-l">
          ${logoUrl ? `<img src="${logoUrl}" alt="شعار" />` : '<div class="logo-box">شعار المدرسة</div>'}
          <div>تاريخ الطباعة: ${dateStr}</div>
        </div>
      </div>
    `;

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>سجل 41 مستجدين</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm 10mm 10mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Calibri', 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 9.5pt;
      color: #000;
      line-height: 1.35;
      direction: rtl;
      background: #fff;
    }

    /* ── الترويسة الثلاثية ── */
    .hd-box {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2pt solid #000;
      padding-bottom: 5pt;
      margin-bottom: 6pt;
      text-align: right;
    }
    .hd-r { text-align: right; font-size: 10.5pt; font-weight: 700; line-height: 1.4; min-width: 65mm; }
    .hd-c { text-align: center; flex: 1; }
    .hd-c h2 { font-size: 14pt; font-weight: 900; text-decoration: underline; margin-bottom: 2pt; color: #000; }
    .hd-yr { font-size: 11pt; font-weight: 800; text-decoration: underline; color: #000; }
    .hd-l { text-align: left; min-width: 65mm; font-size: 9.5pt; font-weight: 600; }
    .hd-l img { max-height: 38pt; max-width: 75pt; object-fit: contain; margin-bottom: 2pt; }
    .logo-box { display: inline-block; border: 1pt dashed #999; padding: 2pt 6pt; font-size: 9pt; }

    /* ── الجدول الأساسي ── */
    table.main-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5pt solid #000;
      font-size: 9pt;
      text-align: center;
      margin-bottom: 10pt;
    }
    table.main-table th, table.main-table td {
      border: 1pt solid #000;
      padding: 3.5pt 2pt;
    }
    /* تكرار thead بالكامل (الترويسة + أسماء الأعمدة) على كل صفحة تلقائياً */
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { page-break-inside: avoid; }

    .sigs-table {
      width: 100%;
      border-collapse: collapse;
      border: none;
      margin-top: 16pt;
      font-size: 10pt;
      font-weight: 800;
      text-align: center;
    }
    .sigs-table td { border: none; padding: 4pt; }
    .sig-line { width: 70%; height: 1pt; border-bottom: 1pt dotted #000; margin: 18pt auto 0; }
    .stamp-box {
      width: 60pt; height: 60pt;
      border: 1.5pt dashed #999;
      border-radius: 50%;
      margin: 6pt auto 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8.5pt;
      color: #777;
    }
  </style>
</head>
<body>
  <table class="main-table">
    <thead>
      <!-- الترويسة مدمجة داخل thead لضمان تكرارها رأسياً في كل صفحة -->
      <tr>
        <th colspan="14" style="border: none; background: #fff; padding: 0 0 6pt 0; font-weight: normal;">
          ${headerHtml}
        </th>
      </tr>
      <tr style="background: #f1f5f9; font-weight: 800;">
        <th rowspan="2" style="width: 24pt;">م</th>
        <th rowspan="2" style="text-align: right; min-width: 130pt; padding-right: 6pt;">اسم التلميذ رباعي</th>
        <th rowspan="2" style="width: 32pt;">الديانة</th>
        <th rowspan="2" style="width: 58pt;">تاريخ الميلاد</th>
        <th colspan="3">السن في 1 أكتوبر</th>
        <th rowspan="2" style="width: 85pt;">الرقم القومي للتلميذ</th>
        <th rowspan="2" style="text-align: right; min-width: 110pt; padding-right: 6pt;">اسم ولي الأمر</th>
        <th rowspan="2" style="width: 70pt;">مهنة ولي الأمر</th>
        <th rowspan="2" style="text-align: right; min-width: 90pt; padding-right: 6pt;">محل الإقامة والعنوان</th>
        <th rowspan="2" style="width: 65pt;">هاتف ولي الأمر</th>
        <th rowspan="2" style="width: 48pt;">المصروفات</th>
        <th rowspan="2" style="width: 55pt;">ملاحظات</th>
      </tr>
      <tr style="background: #f8fafc; font-weight: 800;">
        <th style="width: 22pt;">سنة</th>
        <th style="width: 22pt;">شهر</th>
        <th style="width: 22pt;">يوم</th>
      </tr>
    </thead>
    <tbody>
      ${enriched.map((stu, i) => `
        <tr style="background: ${i % 2 === 1 ? '#fafafa' : '#fff'};">
          <td style="font-weight: 700;">${i + 1}</td>
          <td style="text-align: right; font-weight: 700; padding-right: 6pt;">${stu.full_name_ar}</td>
          <td>${stu.religion || '—'}</td>
          <td style="direction: ltr;">${stu.birth_date || '—'}</td>
          <td style="font-weight: 700;">${stu.age_oct_years}</td>
          <td style="font-weight: 700;">${stu.age_oct_months}</td>
          <td style="font-weight: 700;">${stu.age_oct_days}</td>
          <td style="font-family: monospace; font-size: 8.5pt;">${stu.national_id || '—'}</td>
          <td style="text-align: right; padding-right: 6pt;">${stu.guardian_name || '—'}</td>
          <td>${stu.guardian_job || '—'}</td>
          <td style="text-align: right; padding-right: 6pt;">${stu.address || '—'}</td>
          <td>${stu.guardian_phone || '—'}</td>
          <td>${stu.fees_status || 'مسدد'}</td>
          <td>${stu.is_merged ? 'دمج' : '—'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- ══ الإحصاء الإجمالي للصف + التوقيعات (موحد ومطابق للطباعة المباشرة) ══ -->
  ${(() => {
    const statsBoys       = enriched.filter(s => ['ذكر','male','بنين','ذكور'].some(v => String(s.gender||'').includes(v))).length;
    const statsGirls      = enriched.length - statsBoys;
    const statsMuslims    = enriched.filter(s => String(s.religion||'').includes('مسلم') || s.religion === '1').length;
    const statsChristians = enriched.filter(s => ['مسيحي','مسيح','2'].some(v => String(s.religion||'').includes(v))).length;
    const statsMerged     = enriched.filter(s => s.is_merged).length;
    const statsClasses    = [...new Set(enriched.map(s => s.class_name).filter(Boolean))].length || 1;
    const statsGradeName  = enriched[0]?.grade_name_ar  || 'الصف الأول الابتدائي';
    const statsStageName  = enriched[0]?.stage_name     || 'ابتدائي';

    return `
      <div style="page-break-inside: avoid; break-inside: avoid; margin-top: 14pt;">
        <div style="font-size: 11pt; font-weight: 900; text-align: center; margin-bottom: 5pt; border-bottom: 1.5pt solid #000; padding-bottom: 3pt;">
          إحصاء قيد التلاميذ المستجدين بسجل 41
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt; text-align: center; margin-bottom: 12pt;">
          <thead>
            <tr style="background: #f1f5f9; font-weight: 800;">
              <th style="border: 1pt solid #000; padding: 4pt 2pt; width: 28pt;" rowspan="2">م</th>
              <th style="border: 1pt solid #000; padding: 4pt 4pt; width: 85pt;" rowspan="2">المرحلة</th>
              <th style="border: 1pt solid #000; padding: 4pt 6pt; width: 120pt;" rowspan="2">الصف الدراسي</th>
              <th style="border: 1pt solid #000; padding: 4pt 2pt; width: 50pt;" rowspan="2">عدد الفصول</th>
              <th style="border: 1pt solid #000; padding: 3pt 2pt;" colspan="3">توزيع النوع</th>
              <th style="border: 1pt solid #000; padding: 3pt 2pt;" colspan="2">الديانة</th>
              <th style="border: 1pt solid #000; padding: 4pt 2pt; width: 50pt;" rowspan="2">مستجد</th>
              <th style="border: 1pt solid #000; padding: 4pt 2pt; width: 45pt;" rowspan="2">دمج</th>
              <th style="border: 1pt solid #000; padding: 4pt 4pt; width: 60pt;" rowspan="2">الجملة الكلية</th>
            </tr>
            <tr style="background: #f8fafc; font-weight: 800;">
              <th style="border: 1pt solid #000; padding: 3pt 2pt; width: 45pt;">بنين</th>
              <th style="border: 1pt solid #000; padding: 3pt 2pt; width: 45pt;">بنات</th>
              <th style="border: 1pt solid #000; padding: 3pt 2pt; width: 50pt;">الجملة</th>
              <th style="border: 1pt solid #000; padding: 3pt 2pt; width: 45pt;">مسلم</th>
              <th style="border: 1pt solid #000; padding: 3pt 2pt; width: 45pt;">مسيحي</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: #fff; font-weight: 700;">
              <td style="border: 1pt solid #000; padding: 5pt 2pt;">1</td>
              <td style="border: 1pt solid #000; padding: 5pt 4pt;">${statsStageName}</td>
              <td style="border: 1pt solid #000; padding: 5pt 4pt; font-weight: 800;">${statsGradeName}</td>
              <td style="border: 1pt solid #000; padding: 5pt 2pt; font-weight: 800;">${statsClasses}</td>
              <td style="border: 1pt solid #000; padding: 5pt 2pt;">${statsBoys}</td>
              <td style="border: 1pt solid #000; padding: 5pt 2pt;">${statsGirls}</td>
              <td style="border: 1pt solid #000; padding: 5pt 2pt; font-weight: 900; background: #f8fafc;">${enriched.length}</td>
              <td style="border: 1pt solid #000; padding: 5pt 2pt;">${statsMuslims}</td>
              <td style="border: 1pt solid #000; padding: 5pt 2pt;">${statsChristians}</td>
              <td style="border: 1pt solid #000; padding: 5pt 2pt; font-weight: 800;">${enriched.length}</td>
              <td style="border: 1pt solid #000; padding: 5pt 2pt;">${statsMerged || '—'}</td>
              <td style="border: 1pt solid #000; padding: 5pt 2pt; font-weight: 900; background: #f1f5f9; font-size: 10.5pt;">${enriched.length}</td>
            </tr>
          </tbody>
        </table>

        <!-- التذييل الرباعي الرسمي للاعتماد -->
        <table class="sigs-table" style="margin-top: 10pt; page-break-inside: avoid;">
          <tr>
            <td><div>المسؤول المختص (كاتب السجل)</div><div class="sig-line"></div></td>
            <td><div>المراجع (الأخصائي)</div><div class="sig-line"></div></td>
            <td><div>وكيل شؤون الطلاب والتعليم</div><div class="sig-line"></div></td>
            <td><div>مدير المدرسة (يعتمد)</div><div class="sig-line"></div></td>
          </tr>
          <tr>
            <td colspan="4">
              <div class="stamp-box">خاتم المدرسة</div>
            </td>
          </tr>
        </table>
      </div>
    `;
  })()}
</body>
</html>`;

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
    });

    const page = await browser.newPage();
    await page.emulateMediaType('print');
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '8mm', right: '10mm', bottom: '10mm', left: '10mm' },
      displayHeaderFooter: false,
    });

    await browser.close();
    browser = null;

    const fileName = `سجل_41_مستجدين_${academicYear.replace(/[\/\\]/g, '_')}.pdf`;

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Content-Length':       pdfBuffer.length,
    });
    res.end(pdfBuffer);

  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error('[printRegister41Pdf] Error:', err);
    res.status(500).json({ success: false, error: 'فشل توليد PDF: ' + err.message });
  }
};

