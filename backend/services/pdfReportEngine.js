// ════════════════════════════════════════════════════════════════
//  pdfReportEngine.js — Standalone PDF Report Generator (NeprasPro)
// ════════════════════════════════════════════════════════════════
//  Generates pixel-perfect A4 official PDF reports using Puppeteer.
// ════════════════════════════════════════════════════════════════

const puppeteer = require('puppeteer');

/**
 * Builds HTML for Primary Portrait Sheet (كشف رصد صفوف أولى بالطول)
 */
function buildPrimaryPortraitHtml({ school = {}, className = '', yearLabel = '', students = [] }) {
  const perPage = 35;
  const pageCount = Math.ceil(students.length / perPage) || 1;

  let pagesHtml = '';

  for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
    const pageStudents = students.slice(pageIdx * perPage, (pageIdx + 1) * perPage);

    const rowsHtml = pageStudents.map((s, idx) => {
      const rowNum = pageIdx * perPage + idx + 1;
      return `
        <tr>
          <td style="text-align: center; font-weight: bold;">${rowNum}</td>
          <td style="text-align: right; font-weight: 700; padding-right: 8px;">${s.full_name_ar || ''}</td>
          <td style="text-align: center; color: #64748b;">—</td>
          <td style="text-align: center; color: #64748b;">—</td>
          <td style="text-align: center; color: #64748b;">—</td>
          <td style="text-align: center; color: #64748b;">—</td>
          <td style="text-align: center; color: #64748b;">—</td>
          <td style="text-align: center; color: #64748b;">—</td>
          <td style="text-align: center; color: #64748b;">—</td>
          <td style="text-align: center; font-weight: bold;">—</td>
          <td style="text-align: center; color: #64748b;">—</td>
        </tr>
      `;
    }).join('');

    pagesHtml += `
      <div class="page-block" ${pageIdx > 0 ? 'style="page-break-before: always;"' : ''}>
        <!-- Official Header -->
        <div class="header-wrap">
          <div class="header-col-right">
            <div>وزارة التربية والتعليم</div>
            <div>محافظة: <strong>${school.governorate || '................'}</strong></div>
            <div>إدارة: <strong>${school.directorate || '................'} التعليمية</strong></div>
            <div>مدرسة: <strong>${school.school_name || '................'}</strong></div>
          </div>
          <div class="header-col-center">
            <h2 class="title-main">كشف تقييمات صفوف أولى (بالطول) — فصل: ${className || '................'}</h2>
            <div class="subtitle">العام الدراسي: ${yearLabel || '................'} | عدد الطلاب: ${students.length} طالب</div>
          </div>
          <div class="header-col-left">
            <div>التاريخ: ${new Date().toLocaleDateString('ar-EG')}</div>
            <div>الصفحة: ${pageIdx + 1} من ${pageCount}</div>
          </div>
        </div>

        <!-- Table -->
        <table class="report-table">
          <thead>
            <tr>
              <th rowspan="2" style="width: 35px;">م</th>
              <th rowspan="2" style="width: 220px;">اسم الطالب</th>
              <th colspan="7">جوانب التقييم والمواظبة والأنشطة</th>
              <th rowspan="2" style="width: 60px;">المجموع</th>
              <th rowspan="2" style="width: 80px;">النتيجة</th>
            </tr>
            <tr>
              <th>أداء صفي (20)</th>
              <th>واجب (20)</th>
              <th>نشاط (20)</th>
              <th>أسبوعي (20)</th>
              <th>شفهي (10)</th>
              <th>مهاري (5)</th>
              <th>حضور (5)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- Signatures Footer -->
        <div class="footer-wrap">
          <div>مدرس المادة: ....................</div>
          <div>ملاحظ الكنترول: ....................</div>
          <div>مدير المدرسة: ....................</div>
        </div>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>كشف رصد صفوف أولى - ${className}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm;
        }
        body {
          font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 0;
          direction: rtl;
          color: #0f172a;
          background: #fff;
          font-size: 11px;
        }
        .page-block {
          padding: 4px;
        }
        .header-wrap {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #1a3c6e;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .header-col-right {
          font-size: 11px;
          line-height: 1.5;
        }
        .header-col-center {
          text-align: center;
        }
        .title-main {
          font-size: 14px;
          font-weight: bold;
          color: #1a3c6e;
          margin: 0 0 4px 0;
        }
        .subtitle {
          font-size: 11px;
          color: #475569;
        }
        .header-col-left {
          font-size: 10px;
          color: #64748b;
          text-align: left;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        .report-table th, .report-table td {
          border: 1px solid #cbd5e1;
          padding: 5px 4px;
          font-size: 10.5px;
        }
        .report-table th {
          background-color: #f1f5f9;
          color: #1e293b;
          font-weight: bold;
          text-align: center;
        }
        .footer-wrap {
          display: flex;
          justify-content: space-around;
          margin-top: 20px;
          font-weight: bold;
          font-size: 11px;
        }
      </style>
    </head>
    <body>
      ${pagesHtml}
    </body>
    </html>
  `;
}

/**
 * Generates PDF buffer for Primary Portrait Sheet
 */
async function generatePrimaryPortraitPdf({ school, className, yearLabel, students }) {
  const htmlContent = buildPrimaryPortraitHtml({ school, className, yearLabel, students });
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

module.exports = {
  buildPrimaryPortraitHtml,
  generatePrimaryPortraitPdf
};
