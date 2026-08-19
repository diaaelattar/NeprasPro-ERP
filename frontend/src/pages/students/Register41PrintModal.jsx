import React, { useState, useEffect } from 'react';
import { Printer, X, Download, Loader2, FileSpreadsheet } from 'lucide-react';
import API_BASE_URL from '../../config/api';
import { calculateAgeOnOct1st } from '../../constants/lookupOptions';

/**
 * Register41PrintModal
 * سجل 41 مستجدين (سجل قيد تلاميذ الصف الأول الابتدائي / رياض الأطفال)
 * - بدون كود الطالب (مطابق لدفتر السجل الوزاري الورقي)
 * - عمود الموقف من سداد المصروفات
 * - طباعة معزولة دقيقة 100% عبر iframe لمنع أي تشوه
 * - تصدير PDF متعدد الصفحات عبر Puppeteer على السيرفر
 */
export default function Register41PrintModal({ institution, academicYearLabel, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [students, setStudents] = useState([]);
  const [school, setSchool] = useState({});
  const [academicYear, setAcademicYear] = useState('');

  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [excelGenerating, setExcelGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError('');
    fetch(`${API_BASE_URL}/students/reports/register-41`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setStudents(d.students || []);
          if (d.school) setSchool(d.school);
          if (d.academicYear) setAcademicYear(d.academicYear);
        } else {
          setError(d.error || 'تعذر تحميل بيانات سجل 41');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ── طباعة نقية معزولة 100% عبر iframe ── */
  const handlePrint = () => {
    const printContent = document.getElementById('printable-register-41-content');
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
        <title>سجل 41 مستجدين</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 8mm 10mm 10mm 10mm;
          }
          * { box-sizing: border-box; margin: 0; padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important; }
          body {
            font-family: 'Calibri', 'Segoe UI', Tahoma, Arial, sans-serif;
            font-size: 9.5pt;
            color: #000;
            background: #fff;
            direction: rtl;
            width: 100%;
          }
          div { box-shadow: none !important; border-radius: 0 !important; }
          #printable-register-41-content {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 4mm !important;
          }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr { page-break-inside: avoid; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 6pt; }
          th, td { border: 1pt solid #000; padding: 3pt 2pt; text-align: center; }
          .reg41-footer {
            page-break-before: avoid;
            break-before: avoid;
            page-break-inside: avoid;
            break-inside: avoid;
          }
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

  /* ── تصدير PDF فائق الدقة بالخادم عبر Puppeteer ── */
  const handleExportPdf = async () => {
    try {
      setPdfGenerating(true);
      setDownloadSuccess(false);
      const res = await fetch(`${API_BASE_URL}/students/print/register-41`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'فشل توليد ملف PDF');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `سجل_41_مستجدين_${new Date().getFullYear()}.pdf`;
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

  /* ── تصدير إكسيل ماكرو (sgl_all - ورقة بيانات الصف) ── */
  const handleExportExcel = async () => {
    try {
      setExcelGenerating(true);
      const res = await fetch(`${API_BASE_URL}/students/export/excel?templateName=sgl_all&format=sgl_all`);
      if (!res.ok) throw new Error('فشل تصدير ملف الإكسيل');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `سجل_41_مستجدين_sgl_all_${new Date().toISOString().slice(0, 10)}.xlsm`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 1000);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      alert('خطأ أثناء تصدير الإكسيل: ' + err.message);
    } finally {
      setExcelGenerating(false);
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

  // ── إحصاء إجمالي الصف (يُحسب مباشرةً من بيانات الطلاب) ────────────────────
  const statsBoys       = students.filter(s => ['ذكر','male','بنين','ذكور'].some(v => String(s.gender||'').includes(v))).length;
  const statsGirls      = students.length - statsBoys;
  const statsMuslims    = students.filter(s => String(s.religion||'').includes('مسلم')).length;
  const statsChristians = students.filter(s => ['مسيحي','مسيح'].some(v => String(s.religion||'').includes(v))).length;
  const statsMerged     = students.filter(s => s.is_merged).length;
  const statsClasses    = [...new Set(students.map(s => s.class_name).filter(Boolean))].length || 1;
  const statsGradeName  = students[0]?.grade_name_ar  || 'الصف الأول الابتدائي';
  const statsStageName  = students[0]?.stage_name     || 'ابتدائي';

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileSpreadsheet size={20} color="#38bdf8" />
          <span style={{ fontWeight: 800, fontSize: 14 }}>
            سجل 41 مستجدين (إجمالي: {students.length} تلميذ)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {downloadSuccess && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#4ade80' }}>
              ✓ تم تنزيل PDF بنجاح
            </span>
          )}

          <button
            onClick={handleExportExcel}
            disabled={excelGenerating}
            style={{
              background: excelGenerating ? '#15803d' : '#16a34a', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 18px',
              fontWeight: 800, fontSize: 13, cursor: excelGenerating ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 6px rgba(22,163,74,0.4)'
            }}
          >
            {excelGenerating ? <Loader2 size={15} className="spin" /> : <FileSpreadsheet size={15} />}
            <span>{excelGenerating ? 'جاري التصدير...' : 'تصدير إكسيل (sgl_all)'}</span>
          </button>

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
        id="printable-register-41-content"
        className="register-sheet"
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
          fontSize: 10
        }}
      >
        {/* ══ جدول السجل (بدون كود الطالب مع تكرار الترويسة في كل صفحة) ══ */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Loader2 size={32} className="spin" style={{ margin: '0 auto 10px', color: '#0284c7' }} />
            <div>جاري إعداد بيانات سجل 41...</div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#dc2626' }}>
            {error}
          </div>
        ) : students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            لا يوجد تلاميذ مستجدين مسجلين لهذا العام.
          </div>
        ) : (
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: 'none',
            fontSize: 9.5,
            textAlign: 'center'
          }}>
            <thead>
              {/* ══ الترويسة الثلاثية داخل thead لتتكرر تلقائياً في كل صفحة ══ */}
              <tr>
                <th colSpan={14} style={{ border: 'none', background: '#fff', padding: '0 0 8px 0', fontWeight: 'normal' }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    direction: 'rtl', marginBottom: 6,
                    borderBottom: '2px solid #000', paddingBottom: 6
                  }}>
                    <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, lineHeight: 1.45, minWidth: 200 }}>
                      <div>محافظة: <strong>{gov}</strong></div>
                      <div>إدارة: <strong>{cleanAdmin} التعليمية</strong></div>
                      <div>مدرسة: <strong>{cleanSchool}</strong></div>
                    </div>

                    <div style={{ textAlign: 'center', flex: 1, padding: '0 10px' }}>
                      <h2 style={{
                        fontSize: 16.5, fontWeight: 900, margin: '0 0 2px',
                        textDecoration: 'underline', color: '#000'
                      }}>
                        سجل قيد التلاميذ المستجدين (سجل 41 مستجدين)
                      </h2>
                      <div style={{ fontSize: 13, fontWeight: 800, textDecoration: 'underline', color: '#000' }}>
                        للعام الدراسي: {academicYearLabel || academicYear || students[0]?.academic_year || '....../......'} م
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
                        تاريخ الطباعة: {dateStr}
                      </div>
                    </div>
                  </div>
                </th>
              </tr>
              <tr style={{ background: '#f1f5f9', color: '#000', fontWeight: 800 }}>
                <th style={{ border: '1px solid #000', padding: '5px 2px', width: 28 }} rowSpan={2}>م</th>
                <th style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right', minWidth: 160 }} rowSpan={2}>اسم التلميذ رباعي</th>
                <th style={{ border: '1px solid #000', padding: '5px 2px', width: 38 }} rowSpan={2}>الديانة</th>
                <th style={{ border: '1px solid #000', padding: '5px 4px', width: 75 }} rowSpan={2}>تاريخ الميلاد</th>
                <th style={{ border: '1px solid #000', padding: '3px 2px' }} colSpan={3}>السن في 1 أكتوبر</th>
                <th style={{ border: '1px solid #000', padding: '5px 4px', width: 110 }} rowSpan={2}>الرقم القومي للتلميذ</th>
                <th style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right', minWidth: 140 }} rowSpan={2}>اسم ولي الأمر</th>
                <th style={{ border: '1px solid #000', padding: '5px 4px', width: 85 }} rowSpan={2}>مهنة ولي الأمر</th>
                <th style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right', minWidth: 120 }} rowSpan={2}>محل الإقامة والعنوان</th>
                <th style={{ border: '1px solid #000', padding: '5px 4px', width: 80 }} rowSpan={2}>هاتف ولي الأمر</th>
                <th style={{ border: '1px solid #000', padding: '5px 4px', width: 60 }} rowSpan={2}>المصروفات</th>
                <th style={{ border: '1px solid #000', padding: '5px 4px', width: 65 }} rowSpan={2}>ملاحظات</th>
              </tr>
              <tr style={{ background: '#f8fafc', color: '#000', fontWeight: 800 }}>
                <th style={{ border: '1px solid #000', padding: '3px 2px', width: 28 }}>سنة</th>
                <th style={{ border: '1px solid #000', padding: '3px 2px', width: 28 }}>شهر</th>
                <th style={{ border: '1px solid #000', padding: '3px 2px', width: 28 }}>يوم</th>
              </tr>
            </thead>
            <tbody>
              {students.map((stu, i) => {
                const age = calculateAgeOnOct1st(
                  stu.birth_date || stu.national_id,
                  stu.academic_year || academicYear || academicYearLabel
                );
                return (
                  <tr key={stu.id || i} style={{ background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                    <td style={{ border: '1px solid #000', padding: '4px 2px', fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>
                      {stu.full_name_ar}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px 2px' }}>{stu.religion || '—'}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 2px', direction: 'ltr' }}>{stu.birth_date || '—'}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 2px', fontWeight: 700 }}>{age.years !== '' ? age.years : stu.age_oct_years}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 2px', fontWeight: 700 }}>{age.months !== '' ? age.months : stu.age_oct_months}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 2px', fontWeight: 700 }}>{age.days !== '' ? age.days : stu.age_oct_days}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 2px', fontFamily: 'monospace', fontSize: 9.5 }}>{stu.national_id || '—'}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{stu.guardian_name || '—'}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 4px' }}>{stu.guardian_job || '—'}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{stu.address || '—'}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 4px', direction: 'ltr' }}>{stu.guardian_phone || '—'}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 4px', fontWeight: 700 }}>
                      {stu.fees_status || ''}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px 4px', fontSize: 9 }}>
                      {stu.is_merged ? 'دمج' : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* ══ الإحصاء الإجمالي + التذييل (معاً لمنع انتقالهما لصفحة فارغة) ══ */}
        {students.length > 0 && (
          <div className="reg41-footer" style={{ marginTop: 16 }}>

            {/* ── جدول الإحصاء الإجمالي للصف (مطابق لإجمالي 1 أكتوبر) ── */}
            <div style={{
              fontSize: 11.5, fontWeight: 900, textAlign: 'center',
              marginBottom: 6, borderBottom: '1.5px solid #000', paddingBottom: 4, color: '#000'
            }}>
              إحصاء قيد التلاميذ المستجدين بسجل 41
            </div>

            <table style={{
              width: '100%', borderCollapse: 'collapse', border: 'none',
              fontSize: 10, textAlign: 'center', marginBottom: 14
            }}>
              <thead>
                <tr style={{ background: '#f1f5f9', fontWeight: 800, color: '#000' }}>
                  <th style={{ border: '1px solid #000', padding: '4px 2px', width: 28 }} rowSpan={2}>م</th>
                  <th style={{ border: '1px solid #000', padding: '4px 4px', width: 85 }} rowSpan={2}>المرحلة</th>
                  <th style={{ border: '1px solid #000', padding: '4px 6px', width: 120 }} rowSpan={2}>الصف الدراسي</th>
                  <th style={{ border: '1px solid #000', padding: '4px 2px', width: 50 }} rowSpan={2}>عدد الفصول</th>
                  <th style={{ border: '1px solid #000', padding: '3px 2px' }} colSpan={3}>توزيع النوع</th>
                  <th style={{ border: '1px solid #000', padding: '3px 2px' }} colSpan={2}>الديانة</th>
                  <th style={{ border: '1px solid #000', padding: '4px 2px', width: 50 }} rowSpan={2}>مستجد</th>
                  <th style={{ border: '1px solid #000', padding: '4px 2px', width: 45 }} rowSpan={2}>دمج</th>
                  <th style={{ border: '1px solid #000', padding: '4px 4px', width: 60 }} rowSpan={2}>الجملة الكلية</th>
                </tr>
                <tr style={{ background: '#f8fafc', fontWeight: 800, color: '#000' }}>
                  <th style={{ border: '1px solid #000', padding: '3px 2px', width: 45 }}>بنين</th>
                  <th style={{ border: '1px solid #000', padding: '3px 2px', width: 45 }}>بنات</th>
                  <th style={{ border: '1px solid #000', padding: '3px 2px', width: 50 }}>الجملة</th>
                  <th style={{ border: '1px solid #000', padding: '3px 2px', width: 45 }}>مسلم</th>
                  <th style={{ border: '1px solid #000', padding: '3px 2px', width: 45 }}>مسيحي</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: '#fff', fontWeight: 700 }}>
                  <td style={{ border: '1px solid #000', padding: '6px 2px' }}>1</td>
                  <td style={{ border: '1px solid #000', padding: '6px 4px' }}>{statsStageName}</td>
                  <td style={{ border: '1px solid #000', padding: '6px 4px', fontWeight: 800 }}>{statsGradeName}</td>
                  <td style={{ border: '1px solid #000', padding: '6px 2px', fontWeight: 800 }}>{statsClasses}</td>
                  <td style={{ border: '1px solid #000', padding: '6px 2px' }}>{statsBoys}</td>
                  <td style={{ border: '1px solid #000', padding: '6px 2px' }}>{statsGirls}</td>
                  <td style={{ border: '1px solid #000', padding: '6px 2px', fontWeight: 900, background: '#f8fafc' }}>{students.length}</td>
                  <td style={{ border: '1px solid #000', padding: '6px 2px' }}>{statsMuslims}</td>
                  <td style={{ border: '1px solid #000', padding: '6px 2px' }}>{statsChristians}</td>
                  <td style={{ border: '1px solid #000', padding: '6px 2px', fontWeight: 800 }}>{students.length}</td>
                  <td style={{ border: '1px solid #000', padding: '6px 2px' }}>{statsMerged || '—'}</td>
                  <td style={{ border: '1px solid #000', padding: '6px 2px', fontWeight: 900, background: '#f1f5f9', fontSize: 10.5 }}>{students.length}</td>
                </tr>
              </tbody>
            </table>

            {/* ── التذييل الرسمي الرباعي ── */}
            <table style={{
              width: '100%', borderCollapse: 'collapse', border: 'none',
              marginTop: 10, fontSize: 10.5, fontWeight: 800, textAlign: 'center'
            }}>
              <tbody>
                <tr>
                  {[
                    'المسؤول المختص (كاتب السجل)',
                    'المراجع (الأخصائي)',
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

          </div>
        )}
      </div>
    </div>
  );
}
