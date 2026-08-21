/**
 * printHelper.js — Standard Iframe-based Print Engine for NeprasPro
 * Reusable print utility extracted from Students Affairs module
 */

export function printHtmlViaIframe(htmlContent, {
  orientation = 'portrait', // 'portrait' | 'landscape'
  title = 'تقرير_كنترول_رسمي',
  margin = '6mm',
  fontSize = '11pt',
  fontFamily = "Calibri, 'Segoe UI', Tahoma, Arial, sans-serif"
} = {}) {
  // Sanitize title for filename / title bar
  const cleanTitle = (title || 'تقرير_كنترول_نبراس')
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_');

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8" />
      <title>${cleanTitle}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
          margin: ${margin || '5mm'};
        }
        *, *::before, *::after {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          height: auto;
          margin: 0;
          padding: 0;
          background: #fff;
          color: #000;
          direction: rtl;
        }
        body {
          font-family: ${fontFamily};
          font-size: ${fontSize};
          line-height: 1.25;
          width: 100%;
        }
        thead {
          display: table-header-group;
        }
        tfoot {
          display: table-footer-group;
        }
        tr {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          margin-bottom: 4px;
        }
        th, td {
          border: 1px solid #000;
          padding: 3px 2px;
          text-align: center;
          vertical-align: middle;
          font-family: ${fontFamily};
        }
        th {
          background-color: #f1f5f9 !important;
          font-weight: 800;
        }
        .report-official-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #000;
          padding-bottom: 6px;
          margin-bottom: 8px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .ministerial-print-footer {
          margin-top: 14px;
          padding-top: 8px;
          border-top: 1.5px solid #000;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .printable-page-block {
          page-break-after: always;
          break-after: page;
          page-break-inside: avoid;
          break-inside: avoid;
          display: block;
          width: 100%;
          margin-bottom: 0;
          padding-bottom: 0;
          box-sizing: border-box;
        }
        .printable-page-block:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        /* Tables filling available height gracefully */
        .printable-table-fill {
          flex: 1;
          display: table;
          width: 100%;
          height: 100%;
        }
        /* Seat Cards styling */
        .seat-card-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          flex: 1;
          align-content: space-between;
        }
        .seat-card-item {
          border: 1.5px solid #000;
          padding: 10px 12px;
          border-radius: 6px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `);
  doc.close();

  // Temporarily update parent document.title so Save-As-PDF in Chromium/Electron picks it up
  const originalDocTitle = document.title;
  try {
    document.title = cleanTitle;
  } catch (_) {}

  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => {
      try {
        document.title = originalDocTitle;
      } catch (_) {}
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  }, 400);
}

export function printElementById(elementId, options = {}) {
  const el = document.getElementById(elementId);
  if (!el) {
    console.error(`Print element #${elementId} not found`);
    return false;
  }
  printHtmlViaIframe(el.innerHTML, options);
  return true;
}

export default {
  printHtmlViaIframe,
  printElementById
};
