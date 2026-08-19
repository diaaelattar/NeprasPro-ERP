import React, { useState, useEffect } from 'react';
import { Printer, X, Download, Loader2, BarChart2 } from 'lucide-react';
import API_BASE_URL from '../../config/api';

/**
 * OctoberCensusPrintModal
 * استمارة 1 إحصاء استقرار الفصول والتلاميذ في 1 أكتوبر
 * مطابقة للاشتراطات الوزارية:
 * - تدعم طباعة وتصدير: التقرير الشامل / إجمالي الصف والمرحلة فقط / تفصيلي الفصول فقط
 * - طباعة معزولة دقيقة 100% عبر iframe لمنع أي تشوه في التنسيق
 * - تصدير PDF متعدد الصفحات عبر Puppeteer على السيرفر
 */
export default function OctoberCensusPrintModal({ institution, academicYearLabel, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [gradeSummaries, setGradeSummaries] = useState([]);
  const [school, setSchool] = useState({});
  const [academicYear, setAcademicYear] = useState('');
  const [activeView, setActiveView] = useState('all'); // 'all' | 'detailed' | 'summary'

  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError('');
    fetch(`${API_BASE_URL}/students/reports/october-census`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setRows(d.rows || []);
          setGradeSummaries(d.gradeSummaries || []);
          if (d.school) setSchool(d.school);
          if (d.academicYear) setAcademicYear(d.academicYear);
        } else {
          setError(d.error || 'تعذر تحميل بيانات إحصاء الاستقرار');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ── طباعة نقية معزولة 100% عبر iframe لتجنب أي تشوه في الخطوط أو الجداول ── */
  const handlePrint = () => {
    const printContent = document.getElementById('printable-census-content');
    if (!printContent) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8" />
        <title>استمارة 1 إحصاء الاستقرار</title>
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
            background: #fff;
            direction: rtl;
          }
          .page-break { page-break-before: always; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr { page-break-inside: avoid; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10pt; }
          th, td { border: 1pt solid #000; padding: 3pt 2pt; text-align: center; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 300);
  };

  /* ── تصدير PDF فائق الدقة بالخادم مع احترام activeView المحددة ── */
  const handleExportPdf = async () => {
    try {
      setPdfGenerating(true);
      setDownloadSuccess(false);
      const res = await fetch(`${API_BASE_URL}/students/print/october-census`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeView }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'فشل توليد ملف PDF');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const viewSuffix = activeView === 'summary' ? '_إجمالي_المراحل' : activeView === 'detailed' ? '_تفصيلي_الفصول' : '';
      a.download = `استمارة_1_إحصاء_الاستقرار${viewSuffix}_${new Date().getFullYear()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      alert('خطأ أثناء تصدير PDF: ' + err.message);
    } finally {
      setPdfGenerating(false);
    }
  };

  const rawSchool   = school?.school_name || institution?.school_name || institution?.schoolName || '';
  const cleanSchool = rawSchool.replace(/^مدرسة\s*/, '').trim() || '...............';
  const rawAdmin    = school?.directorate || institution?.directorate || institution?.administration || '';
  const cleanAdmin  = rawAdmin.replace(/التعليمية\s*$/, '').trim() || '...............';
  const gov         = school?.governorate || institution?.governorate || '...............';
  const logo        = school?.logo_url || institution?.logo_url || institution?.logoUrl || '';

  const now     = new Date();
  const dateStr = now.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });

  // Totals calculations
  const totalClasses = rows.length;
  const grandTotal = rows.reduce((s, r) => s + (r.total_students || 0), 0);
  const totalBoys = rows.reduce((s, r) => s + (r.boys_count || 0), 0);
  const totalGirls = rows.reduce((s, r) => s + (r.girls_count || 0), 0);
  const totalMuslims = rows.reduce((s, r) => s + (r.muslims_count || 0), 0);
  const totalChristians = rows.reduce((s, r) => s + (r.christians_count || 0), 0);
  const totalEgyptian = rows.reduce((s, r) => s + (r.egyptian_count || 0), 0);
  const totalForeign = rows.reduce((s, r) => s + (r.foreign_count || 0), 0);
  const totalNew = rows.reduce((s, r) => s + (r.new_count || 0), 0);
  const totalPromoted = rows.reduce((s, r) => s + (r.promoted_count || 0), 0);
  const totalRetained = rows.reduce((s, r) => s + (r.retained_count || 0), 0);
  const totalDisconnected = rows.reduce((s, r) => s + (r.disconnected_count || 0), 0);
  const totalMerged = rows.reduce((s, r) => s + (r.merged_count || 0), 0);
  const avgDensity = totalClasses > 0 ? (grandTotal / totalClasses).toFixed(1) : '0';

  // Render Header Component
  const renderHeader = (subHeading) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      direction: 'rtl', marginBottom: 10,
      borderBottom: '2px solid #000', paddingBottom: 6
    }}>
      <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, lineHeight: 1.45, minWidth: 200 }}>
        <div>محافظة: <strong>{gov}</strong></div>
        <div>إدارة: <strong>{cleanAdmin} التعليمية</strong></div>
        <div>مدرسة: <strong>{cleanSchool}</strong></div>
      </div>

      <div style={{ textAlign: 'center', flex: 1, padding: '0 10px' }}>
        <h2 style={{
          fontSize: 16, fontWeight: 900, margin: '0 0 2px',
          textDecoration: 'underline', color: '#000'
        }}>
          استمارة 1 إحصاء استقرار الفصول والتلاميذ في 1 أكتوبر
        </h2>
        <div style={{ fontSize: 12.5, fontWeight: 800, textDecoration: 'underline', color: '#000' }}>
          للعام الدراسي: {academicYearLabel || academicYear || '....../......'} م {subHeading ? `— (${subHeading})` : ''}
        </div>
      </div>

      <div style={{ textAlign: 'left', minWidth: 200 }}>
        {logo ? (
          <img src={logo} alt="شعار" style={{ maxHeight: 38, maxWidth: 75, objectFit: 'contain', display: 'block' }} />
        ) : (
          <div style={{
            display: 'inline-block', border: '1px dashed #cbd5e1',
            padding: '2px 6px', borderRadius: 4, textAlign: 'center'
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#334155' }}>شعار المدرسة</div>
          </div>
        )}
        <div style={{ fontSize: 9.5, color: '#334155', marginTop: 2, fontWeight: 600 }}>
          تاريخ الإحصاء: 1 أكتوبر — طُبع: {dateStr}
        </div>
      </div>
    </div>
  );

  // Render Footer Component
  const renderFooter = () => (
    <table style={{
      width: '100%', borderCollapse: 'collapse', border: 'none',
      marginTop: 20, fontSize: 10.5, fontWeight: 800, textAlign: 'center'
    }}>
      <tbody>
        <tr>
          {[
            'مسؤول الإحصاء وشئون الطلاب',
            'المراجع / الأخصائي',
            'وكيل شؤون الطلاب والتعليم',
            'مدير المدرسة (يعتمد)'
          ].map(label => (
            <td key={label} style={{ width: '25%', padding: '4px', border: 'none' }}>
              <div>{label}</div>
              <div style={{ height: 26, borderBottom: '1px dotted #000', width: '70%', margin: '6px auto 0' }} />
            </td>
          ))}
        </tr>
        <tr>
          <td colSpan={4} style={{ paddingTop: 6, border: 'none' }}>
            <div style={{
              width: 70, height: 70, border: '1.5px dashed #94a3b8',
              borderRadius: '50%', margin: '6px auto 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9.5, color: '#64748b', fontWeight: 700, textAlign: 'center'
            }}>
              خاتم المدرسة
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 99999,
        background: 'rgba(0,0,0,0.8)',
        padding: '24px 16px 40px',
        overflowY: 'auto',
        display: 'block'
      }}
    >
      {/* ── شريط الأدوات ── */}
      <div className="no-print" style={{
        maxWidth: 1180,
        margin: '0 auto 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#1e293b',
        padding: '12px 20px',
        borderRadius: 12,
        color: '#fff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BarChart2 size={20} color="#38bdf8" />
          <span style={{ fontWeight: 800, fontSize: 14 }}>
            استمارة 1 إحصاء الاستقرار (إجمالي: {grandTotal} تلميذ في {totalClasses} فصل)
          </span>

          <div style={{ display: 'flex', gap: 6, marginRight: 10, background: '#334155', padding: '3px 6px', borderRadius: 8 }}>
            <button
              onClick={() => setActiveView('all')}
              style={{
                background: activeView === 'all' ? '#0284c7' : 'transparent',
                color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
              }}
            >
              التقرير الشامل
            </button>
            <button
              onClick={() => setActiveView('summary')}
              style={{
                background: activeView === 'summary' ? '#0284c7' : 'transparent',
                color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
              }}
            >
              إجمالي الصف والمرحلة فقط
            </button>
            <button
              onClick={() => setActiveView('detailed')}
              style={{
                background: activeView === 'detailed' ? '#0284c7' : 'transparent',
                color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
              }}
            >
              تفصيلي الفصول فقط
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {downloadSuccess && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#4ade80' }}>
              ✓ تم تنزيل PDF بنجاح
            </span>
          )}

          <button
            onClick={handleExportPdf}
            disabled={pdfGenerating}
            style={{
              background: pdfGenerating ? '#065f46' : '#059669', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 18px',
              fontWeight: 800, fontSize: 13, cursor: pdfGenerating ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 6px rgba(5,150,105,0.4)'
            }}
          >
            {pdfGenerating ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
            <span>{pdfGenerating ? 'جاري التوليد...' : 'تنزيل PDF'}</span>
          </button>

          <button
            onClick={handlePrint}
            style={{
              background: '#0284c7', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 18px',
              fontWeight: 800, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <Printer size={15} /> طباعة
          </button>

          <button
            onClick={onClose}
            style={{
              background: '#475569', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 16px',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5
            }}
          >
            <X size={14} /> إغلاق
          </button>
        </div>
      </div>

      {/* ── الاستمارة المطبوعة (معرّفة بـ id للطباعة المعزولة) ── */}
      <div
        id="printable-census-content"
        className="census-sheet"
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          background: '#fff',
          padding: '16px 20px',
          borderRadius: 8,
          boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
          direction: 'rtl',
          color: '#000',
          fontFamily: "'Calibri', 'Segoe UI', Tahoma, Arial, sans-serif",
          fontSize: 10.5
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Loader2 size={32} className="spin" style={{ margin: '0 auto 10px', color: '#0284c7' }} />
            <div>جاري تجميع بيانات إحصاء الاستقرار...</div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#dc2626' }}>
            {error}
          </div>
        ) : (
          <>
            {/* ═══════════════════════════════════════════════════════
                القسم الأول: كشف إجمالي الصف والمرحلة
               ═══════════════════════════════════════════════════════ */}
            {(activeView === 'all' || activeView === 'summary') && (
              <div style={{ marginBottom: (activeView === 'all' ? 30 : 0) }}>
                {renderHeader('حصر إجمالي الصفوف والمراحل الدراسية')}

                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1.5px solid #000',
                  fontSize: 10,
                  textAlign: 'center',
                  marginBottom: 10
                }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', color: '#000', fontWeight: 800 }}>
                      <th style={{ border: '1px solid #000', padding: '5px 2px', width: 28 }} rowSpan={2}>م</th>
                      <th style={{ border: '1px solid #000', padding: '5px 4px', width: 90 }} rowSpan={2}>المرحلة</th>
                      <th style={{ border: '1px solid #000', padding: '5px 6px', width: 110 }} rowSpan={2}>الصف الدراسي</th>
                      <th style={{ border: '1px solid #000', padding: '5px 2px', width: 48 }} rowSpan={2}>عدد الفصول</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px' }} colSpan={3}>توزيع النوع</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px' }} colSpan={2}>الديانة</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px' }} colSpan={2}>الجنسيات</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px' }} colSpan={4}>حالات القيد</th>
                      <th style={{ border: '1px solid #000', padding: '5px 2px', width: 45 }} rowSpan={2}>الدمج</th>
                      <th style={{ border: '1px solid #000', padding: '5px 4px', width: 55 }} rowSpan={2}>متوسط الكثافة</th>
                      <th style={{ border: '1px solid #000', padding: '5px 4px', width: 60 }} rowSpan={2}>الجملة</th>
                    </tr>
                    <tr style={{ background: '#f8fafc', color: '#000', fontWeight: 800 }}>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 40 }}>بنين</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 40 }}>بنات</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 45 }}>الجملة</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 40 }}>مسلم</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 40 }}>مسيحي</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 40 }}>مصري</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 40 }}>وافد</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 40 }}>مستجد</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 40 }}>منقول</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 40 }}>باقٍ</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 40 }}>منقطع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradeSummaries.map((g, i) => {
                      const gradeDensity = (g.classes_count > 0 ? (g.total_students / g.classes_count).toFixed(1) : '0');
                      return (
                        <tr key={i} style={{ background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                          <td style={{ border: '1px solid #000', padding: '4px 2px', fontWeight: 700 }}>{i + 1}</td>
                          <td style={{ border: '1px solid #000', padding: '4px 4px' }}>{g.stage_name || '—'}</td>
                          <td style={{ border: '1px solid #000', padding: '4px 4px', fontWeight: 800 }}>{g.grade_name_ar}</td>
                          <td style={{ border: '1px solid #000', padding: '4px 2px', fontWeight: 800 }}>{g.classes_count || 1}</td>
                          <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{g.boys_count || 0}</td>
                          <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{g.girls_count || 0}</td>
                          <td style={{ border: '1px solid #000', padding: '4px 2px', fontWeight: 800, background: '#f8fafc' }}>
                            {g.total_students || 0}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{g.muslims_count || 0}</td>
                          <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{g.christians_count || 0}</td>
                          <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{g.egyptian_count || 0}</td>
                          <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{g.foreign_count || 0}</td>
                          <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{g.new_count || 0}</td>
                          <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{g.promoted_count || 0}</td>
                          <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{g.retained_count || 0}</td>
                          <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{g.disconnected_count || 0}</td>
                          <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{g.merged_count || 0}</td>
                          <td style={{ border: '1px solid #000', padding: '4px 2px', fontWeight: 700 }}>{gradeDensity}</td>
                          <td style={{ border: '1px solid #000', padding: '4px 2px', fontWeight: 900, background: '#f1f5f9' }}>
                            {g.total_students || 0}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#e2e8f0', fontWeight: 900, fontSize: 10.5 }}>
                      <td style={{ border: '1.5px solid #000', padding: '5px 4px' }} colSpan={3}>
                        الإجمالي العام للمدرسة
                      </td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalClasses}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalBoys}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalGirls}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px', background: '#cbd5e1' }}>{grandTotal}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalMuslims}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalChristians}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalEgyptian}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalForeign}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalNew}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalPromoted}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalRetained}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalDisconnected}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalMerged}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{avgDensity}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px', background: '#cbd5e1' }}>{grandTotal}</td>
                    </tr>
                  </tfoot>
                </table>

                {activeView === 'summary' && renderFooter()}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                القسم الثاني: كشف تفصيلي بالفصول (مضبوط الأعمدة)
               ═══════════════════════════════════════════════════════ */}
            {(activeView === 'all' || activeView === 'detailed') && (
              <div className={activeView === 'all' ? 'page-break' : ''}>
                {renderHeader(activeView === 'all' ? 'كشف تفصيلي بحصر الفصول والتلاميذ' : 'تفصيلي فصول المدرسة')}

                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1.5px solid #000',
                  fontSize: 10,
                  textAlign: 'center'
                }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', color: '#000', fontWeight: 800 }}>
                      <th style={{ border: '1px solid #000', padding: '5px 2px', width: 28 }} rowSpan={2}>م</th>
                      <th style={{ border: '1px solid #000', padding: '5px 4px', width: 85 }} rowSpan={2}>المرحلة</th>
                      <th style={{ border: '1px solid #000', padding: '5px 6px', width: 100 }} rowSpan={2}>الصف الدراسي</th>
                      <th style={{ border: '1px solid #000', padding: '5px 2px', width: 50 }} rowSpan={2}>الفصل</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px' }} colSpan={3}>توزيع النوع</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px' }} colSpan={2}>الديانة</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px' }} colSpan={2}>الجنسيات</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px' }} colSpan={4}>حالات القيد</th>
                      <th style={{ border: '1px solid #000', padding: '5px 2px', width: 45 }} rowSpan={2}>الدمج</th>
                      <th style={{ border: '1px solid #000', padding: '5px 4px', width: 60 }} rowSpan={2}>جملة الفصل</th>
                    </tr>
                    <tr style={{ background: '#f8fafc', color: '#000', fontWeight: 800 }}>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 40 }}>بنين</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 40 }}>بنات</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 45 }}>الجملة</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 40 }}>مسلم</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 40 }}>مسيحي</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 40 }}>مصري</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 40 }}>وافد</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 40 }}>مستجد</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 40 }}>منقول</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 40 }}>باقٍ</th>
                      <th style={{ border: '1px solid #000', padding: '3px 2px', width: 40 }}>منقطع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} style={{ background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                        <td style={{ border: '1px solid #000', padding: '4px 2px', fontWeight: 700 }}>{i + 1}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 4px' }}>{r.stage_name || '—'}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 4px', fontWeight: 700 }}>{r.grade_name_ar}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 2px', fontWeight: 800 }}>{r.class_name || '—'}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{r.boys_count || 0}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{r.girls_count || 0}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 2px', fontWeight: 800, background: '#f8fafc' }}>
                          {r.total_students || 0}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{r.muslims_count || 0}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{r.christians_count || 0}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{r.egyptian_count || 0}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{r.foreign_count || 0}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{r.new_count || 0}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{r.promoted_count || 0}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{r.retained_count || 0}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{r.disconnected_count || 0}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{r.merged_count || 0}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 2px', fontWeight: 900, background: '#f1f5f9' }}>
                          {r.total_students || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#e2e8f0', fontWeight: 900, fontSize: 10.5 }}>
                      <td style={{ border: '1.5px solid #000', padding: '5px 4px' }} colSpan={4}>
                        الإجمالي العام (${totalClasses} فصل) — متوسط الكثافة: ${avgDensity}
                      </td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalBoys}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalGirls}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px', background: '#cbd5e1' }}>{grandTotal}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalMuslims}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalChristians}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalEgyptian}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalForeign}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalNew}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalPromoted}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalRetained}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalDisconnected}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px' }}>{totalMerged}</td>
                      <td style={{ border: '1.5px solid #000', padding: '5px 2px', background: '#cbd5e1' }}>{grandTotal}</td>
                    </tr>
                  </tfoot>
                </table>

                {renderFooter()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
