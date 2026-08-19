import React from 'react';
import { Printer, X } from 'lucide-react';

export default function TransferPrintModal({ transfer, institution, onClose }) {
  if (!transfer) return null;

  const handlePrint = () => {
    window.print();
  };

  const studentName = transfer.full_name_ar || '—';
  const birthDate = transfer.birth_date || '—';
  const gradeName = transfer.grade_name_ar || transfer.grade_name || '—';
  const rawSchool = institution?.schoolName || institution?.school_name || '';
  const currentSchool = rawSchool.replace(/^مدرسة\s*/, '').trim();
  const currentGovernorate = institution?.governorate || 'الجيزة';
  const rawAdmin = institution?.directorate || institution?.administration || '';
  const currentDirectorate = rawAdmin.replace(/التعليمية\s*$/, '').trim();

  const toSchool = transfer.to_school || '—';
  const toDirectorate = transfer.to_directorate || '—';
  const reason = transfer.reason || 'نقل السكن ورغبة ولي الأمر';
  const guardianName = transfer.guardian_name || '—';
  const address = transfer.address || '—';
  const feesStatus = transfer.fees_status || transfer.feesStatus || 'سدد';
  const booksStatus = transfer.books_status || transfer.booksStatus || 'استلم';
  const durationInGrade = transfer.duration_in_grade || transfer.durationInGrade || 'سنة أولى (مستجد)';

  // Single Transfer Form Card component
  const TransferDocument = ({ copyLabel }) => (
    <div className="transfer-card-print" style={{
      border: '2px solid #000',
      borderRadius: 12,
      padding: '12px 16px',
      background: '#fff',
      color: '#000',
      fontFamily: "'Segoe UI', Tahoma, 'Arial', sans-serif",
      fontSize: 11,
      lineHeight: 1.5,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '100%',
      boxSizing: 'border-box'
    }}>
      
      {/* ── Header (مطابق لترويسة تقرير الإحصاء المعتمدة) ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, borderBottom: '1.5px solid #000', paddingBottom: 6 }}>
        <div style={{ textAlign: 'right', fontSize: 10.5, fontWeight: 700, lineHeight: 1.4 }}>
          <div>محافظة: <strong>{currentGovernorate}</strong></div>
          <div>إدارة: <strong>{currentDirectorate} التعليمية</strong></div>
          <div>مدرسة: <strong>{currentSchool}</strong></div>
        </div>

        <div style={{ textAlign: 'center', flex: 1, padding: '0 10px' }}>
          <h2 style={{
            fontSize: 16,
            fontWeight: 900,
            margin: 0,
            textDecoration: 'underline',
            letterSpacing: 1
          }}>
            طلب تحـويـل
          </h2>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', marginTop: 2 }}>({copyLabel})</div>
        </div>

        <div style={{ textAlign: 'left', fontSize: 10, fontWeight: 600, lineHeight: 1.4, color: '#334155' }}>
          <div>التاريخ: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></div>
          <div>{new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>

      {/* ── Body Details ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, margin: '4px 0' }}>
        
        {/* Line 1 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ flex: 1.3 }}>
            اسم الطالب : <span style={{ fontWeight: 800 }}>{studentName}</span>
          </div>
          <div style={{ flex: 1 }}>
            المدرسة المقيد بها : <span style={{ fontWeight: 700 }}>{currentSchool}</span>
          </div>
        </div>

        {/* Line 2 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 10.5 }}>
          <div>
            الصف الدراسي: <strong>{gradeName}</strong>
          </div>
          <div>
            مدة بقائه بالصف: <strong>{durationInGrade}</strong>
          </div>
          <div>
            تاريخ الميلاد : <strong>{birthDate}</strong>
          </div>
        </div>

        {/* Line 3 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ flex: 1.4 }}>
            اسم المدرسة المحول إليها : <strong>{toSchool}</strong>
          </div>
          <div style={{ flex: 1 }}>
            الجهة/الإدارة : <strong>{toDirectorate}</strong>
          </div>
        </div>

        {/* Line 4 */}
        <div>
          عنوان السكن : <span>{address}</span>
        </div>

        {/* Line 5 */}
        <div>
          سبب التحويل : <strong>{reason}</strong>
        </div>

        {/* Line 6 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 10.5 }}>
          <div>
            موقف الطالب من سداد المصروفات : <strong>{feesStatus}</strong>
          </div>
          <div>
            موقف الطالب من استلام الكتب : <strong>{booksStatus}</strong>
          </div>
        </div>

        {/* Line 7 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 2 }}>
          <div style={{ flex: 1.2 }}>
            اسم ولي أمر الطالب : <strong>{guardianName}</strong>
          </div>
          <div style={{ flex: 1 }}>
            توقيع ولي الأمر : ...................................
          </div>
        </div>
      </div>

      {/* ── Divider 1 ── */}
      <hr style={{ border: 'none', borderTop: '1.5px solid #000', margin: '4px 0' }} />

      {/* ── Section 2: طلب الرأي والموافقة ── */}
      <div style={{ margin: '4px 0' }}>
        <div style={{ fontWeight: 700 }}>
          السيد الأستاذ مدير مدرسة : <strong>{toSchool}</strong>
        </div>
        <div style={{ textAlign: 'center', fontWeight: 800, margin: '2px 0', fontSize: 12 }}>
          تحية طيبة وبعد؛
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, margin: '2px 0' }}>
          برجاء التكرم بموافقتنا برأيكم في طلب تحويل الطالب الموضحة بياناته بعاليه إلى مدرستكم
        </div>
        <div style={{ textAlign: 'center', fontWeight: 700, margin: '4px 0' }}>
          وتفضلوا بقبول فائق الاحترام؛
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: '0 10px' }}>
          <div>
            يعتمد؛ مدير المدرسة : ...................................
          </div>
          <div>
            التاريخ : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/ 20 م
          </div>
        </div>
      </div>

      {/* ── Divider 2 ── */}
      <hr style={{ border: 'none', borderTop: '1.5px solid #000', margin: '4px 0' }} />

      {/* ── Section 3: رأي المدرسة المطلوب التحويل إليها ── */}
      <div style={{ margin: '4px 0' }}>
        <div style={{ textAlign: 'center', fontWeight: 900, textDecoration: 'underline', marginBottom: 6 }}>
          رأي المدرسة المطلوب التحويل إليها
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '6px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
            <span style={{ display: 'inline-block', width: 36, height: 16, border: '1.5px solid #000', borderRadius: 3 }}></span>
            الموافقة على تحويل الطالب
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
            <span style={{ display: 'inline-block', width: 36, height: 16, border: '1.5px solid #000', borderRadius: 3 }}></span>
            عدم الموافقة على تحويل الطالب
          </div>
        </div>

        <div style={{ textAlign: 'center', fontWeight: 700, margin: '4px 0' }}>
          وتفضلوا بقبول فائق الاحترام؛
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: '0 10px' }}>
          <div>
            يعتمد؛ مدير المدرسة : ...................................
          </div>
          <div>
            التاريخ : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/ 20 م
          </div>
        </div>
      </div>

    </div>
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
      
      {/* Modal Actions Bar (Invisible on print) */}
      <div className="no-print" style={{
        maxWidth: 1080,
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
            معاينة طباعة طلب التحويل الرسمي (نسختين على صفحة A4 بالعرض) — {studentName}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handlePrint}
            style={{
              background: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 20px',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Printer size={15} /> طباعة الآن (Print)
          </button>
          <button
            onClick={onClose}
            style={{
              background: '#475569',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* Printable Sheet (2 Landscape Copies Side-by-Side) */}
      <div className="transfer-print-sheet" style={{
        maxWidth: 1080,
        margin: '0 auto',
        background: '#fff',
        padding: 16,
        borderRadius: 12,
        boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        direction: 'rtl'
      }}>
        {/* Right Copy (نسخة المدرسة / الأصل) */}
        <TransferDocument copyLabel="نسخة المدرسة" />

        {/* Left Copy (نسخة ولي الأمر / المدرسة المحول إليها) */}
        <TransferDocument copyLabel="نسخة الإدارة" />
      </div>

      {/* Print CSS Styles */}
      <style>{`
        @page {
          size: A4 landscape !important;
          margin: 4mm !important;
        }
        @media print {
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            overflow: hidden !important;
          }
          body * {
            visibility: hidden !important;
          }
          .transfer-print-sheet, .transfer-print-sheet * {
            visibility: visible !important;
          }
          .transfer-print-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            max-width: none !important;
            padding: 2mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 5mm !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          .transfer-card-print {
            border: 1.5px solid #000 !important;
            border-radius: 8px !important;
            padding: 8px 12px !important;
            font-size: 10.5px !important;
            line-height: 1.45 !important;
            box-sizing: border-box !important;
            height: 100% !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
}
