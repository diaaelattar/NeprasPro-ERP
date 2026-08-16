import React, { useState } from 'react';
import { Printer, X, Download, FileText, Loader2 } from 'lucide-react';
import API_BASE_URL from '../../config/api';

/**
 * StudentDocPrintModal
 * مودال معاينة وطباعة الوثائق الفردية للطالب
 * بخط Calibri المعتمد، ويدعم كلا من:
 * 1) الطباعة الفورية من المتصفح / الطابعة
 * 2) التصدير عالي الدقة كـ PDF عبر Puppeteer على السيرفر
 */
export default function StudentDocPrintModal({ doc, student, schoolInfo, academicYear, onClose }) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  if (!doc || !student) return null;

  const handlePrint = () => window.print();

  /* ── تصدير PDF فائق الدقة عبر Puppeteer ── */
  const handleDownloadPuppeteerPdf = async () => {
    try {
      setDownloadingPdf(true);
      const res = await fetch(`${API_BASE_URL}/students/print/doc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          docType: doc.docType || 'enrollment_cert'
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'تعذر توليد ملف PDF');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (student.full_name_ar || 'student').replace(/\s+/g, '_');
      a.download = `${doc.title || 'وثيقة'}_${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('خطأ أثناء تصدير PDF عبر Puppeteer: ' + err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  /* ── بيانات المدرسة ── */
  const rawSchool  = schoolInfo?.school_name || '';
  const cleanSchool = rawSchool.replace(/^مدرسة\s*/, '').trim() || '...............';
  const rawAdmin   = schoolInfo?.directorate || '';
  const cleanAdmin = rawAdmin.replace(/التعليمية\s*$/, '').trim() || '...............';
  const gov        = schoolInfo?.governorate || '...............';
  const logo       = schoolInfo?.logo_url || schoolInfo?.logoUrl || '';

  const now        = new Date();
  const dateStr    = now.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr    = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  /* ── CSS الطباعة — خط Calibri وأبعاد دقيقة ── */
  const printCss = `
    @page { size: A4 portrait; margin: 15mm 20mm; }
    @media print {
      *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        font-family: 'Calibri', 'Segoe UI', Tahoma, Arial, sans-serif !important;
      }
      html, body {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
      }
      body * { visibility: hidden !important; }
      .student-doc-sheet, .student-doc-sheet * { visibility: visible !important; }
      .student-doc-sheet {
        position: absolute !important;
        left: 0 !important; top: 0 !important;
        width: 100% !important;
        max-width: none !important;
        padding: 15mm 20mm !important;
        margin: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
      }
      .no-print { display: none !important; }
    }
  `;

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 99999, background: 'rgba(0,0,0,0.75)', padding: 16, overflowY: 'auto' }}
    >
      {/* ── شريط الأدوات (مخفي عند الطباعة) ── */}
      <div className="no-print" style={{
        maxWidth: 860,
        margin: '0 auto 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#1e293b',
        padding: '12px 20px',
        borderRadius: 12,
        color: '#fff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Printer size={20} color="#38bdf8" />
          <span style={{ fontWeight: 800, fontSize: 14 }}>
            معاينة: {doc.title} — {student.full_name_ar}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* زر تنزيل PDF */}
          <button
            onClick={handleDownloadPuppeteerPdf}
            disabled={downloadingPdf}
            style={{
              background: '#059669', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 18px',
              fontWeight: 800, fontSize: 13, cursor: downloadingPdf ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 6px rgba(5,150,105,0.4)'
            }}
            title="تنزيل الوثيقة كملف PDF"
          >
            {downloadingPdf ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
            <span>تنزيل PDF</span>
          </button>

          {/* زر الطباعة */}
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

          {/* زر الإغلاق */}
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

      {/* ── الوثيقة القابلة للطباعة (بخط Calibri) ── */}
      <div
        className="student-doc-sheet"
        style={{
          maxWidth: 860,
          margin: '0 auto',
          background: '#fff',
          padding: '24px 30px',
          borderRadius: 10,
          boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
          direction: 'rtl',
          color: '#000',
          fontFamily: "'Calibri', 'Segoe UI', Tahoma, 'Arial', sans-serif",
          fontSize: 12
        }}
      >
        {/* ══ الترويسة الثلاثية المعتمدة ══ */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          direction: 'rtl', marginBottom: 14,
          borderBottom: '2px solid #000', paddingBottom: 10
        }}>
          {/* يمين: بيانات المدرسة */}
          <div style={{ textAlign: 'right', fontSize: 13.5, fontWeight: 700, lineHeight: 1.6, minWidth: 220 }}>
            <div>محافظة: <strong>{gov}</strong></div>
            <div>إدارة: <strong>{cleanAdmin} التعليمية</strong></div>
            <div>مدرسة: <strong>{cleanSchool}</strong></div>
          </div>

          {/* وسط: عنوان الوثيقة */}
          <div style={{ textAlign: 'center', flex: 1, padding: '0 10px' }}>
            <h2 style={{
              fontSize: 18, fontWeight: 900, margin: '0 0 4px',
              textDecoration: 'underline', color: '#000', letterSpacing: '.3px'
            }}>
              {doc.title}
            </h2>
            <div style={{ fontSize: 14.5, fontWeight: 800, textDecoration: 'underline', color: '#000' }}>
              للعام الدراسي: {academicYear || '....../......'} م
            </div>
            {doc.formCode && (
              <div style={{ fontSize: 10.5, color: '#475569', fontWeight: 600, marginTop: 2 }}>
                كود النموذج: {doc.formCode}
              </div>
            )}
          </div>

          {/* يسار: الشعار + التاريخ */}
          <div style={{ textAlign: 'left', minWidth: 220 }}>
            {logo ? (
              <img src={logo} alt="شعار" style={{ maxHeight: 48, maxWidth: 90, objectFit: 'contain', display: 'block' }} />
            ) : (
              <div style={{
                display: 'inline-block', border: '1px dashed #cbd5e1',
                padding: '4px 8px', borderRadius: 4, textAlign: 'center'
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#334155' }}>شعار المدرسة</div>
              </div>
            )}
            <div style={{ fontSize: 11, color: '#334155', marginTop: 4, fontWeight: 600 }}>
              {dateStr} {timeStr}
            </div>
            <div style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>
              رقم القيد: {student.student_code || '........'}
            </div>
          </div>
        </div>

        {/* ══ بيانات الطالب ══ */}
        <div style={{
          border: '1.5px solid #000', borderRadius: 6,
          padding: '12px 16px', margin: '16px 0', background: '#f8fafc'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13.5 }}>
            <div><strong>اسم الطالب:</strong> {student.full_name_ar || '—'}</div>
            <div><strong>الرقم القومي:</strong> <span dir="ltr">{student.national_id || '—'}</span></div>
            <div><strong>الصف الدراسي:</strong> {student.grade_name_ar || '—'}</div>
            <div><strong>الفصل:</strong> {student.class_name || '—'}</div>
            <div><strong>المرحلة:</strong> {student.stage_name || '—'}</div>
            <div><strong>تاريخ الالتحاق:</strong> {student.enrollment_date || '—'}</div>
          </div>
        </div>

        {/* ══ نص الوثيقة ══ */}
        <div style={{ fontSize: 14.5, lineHeight: 2.3, textAlign: 'justify', margin: '20px 0 30px' }}
          dangerouslySetInnerHTML={{ __html: doc.body }}
        />

        {/* ══ التذييل الرباعي الرسمي ══ */}
        <table style={{
          width: '100%', borderCollapse: 'collapse',
          marginTop: 50, fontSize: 12.5, fontWeight: 800, textAlign: 'center'
        }}>
          <tbody>
            <tr>
              {[
                'المسؤول المختص / كاتب السجل',
                'المراجع / الأخصائي',
                'وكيل شؤون الطلاب والتعليم',
                'مدير المدرسة (يعتمد)'
              ].map(label => (
                <td key={label} style={{ width: '25%', padding: '8px 4px' }}>
                  <div>{label}</div>
                  <div style={{ height: 36, borderBottom: '1px dotted #000', width: '80%', margin: '10px auto 0' }} />
                </td>
              ))}
            </tr>
            <tr>
              <td colSpan={4} style={{ paddingTop: 10 }}>
                <div style={{
                  width: 100, height: 100, border: '2px dashed #94a3b8',
                  borderRadius: '50%', margin: '10px auto 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: '#64748b', fontWeight: 700, textAlign: 'center'
                }}>
                  خاتم المدرسة الرسمي
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* CSS الطباعة */}
      <style>{printCss}</style>
    </div>
  );
}
