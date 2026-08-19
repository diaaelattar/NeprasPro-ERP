import React from 'react';
import { Printer, FileSpreadsheet } from 'lucide-react';

export default function TransfersStatementPrintModal({
  transfers = [],
  transferType = 'out', // 'out' (صادر من المدرسة) or 'in' (وارد إلى المدرسة)
  institution,
  academicYearLabel = '2025/2026',
  onClose
}) {
  const handlePrint = () => {
    window.print();
  };

  const isOut = transferType === 'out';
  const title = isOut
    ? 'كشف بأسماء الطلاب المحولين من المدرسة (التحويلات الصادرة)'
    : 'كشف بأسماء الطلاب المحولين إلى المدرسة (التحويلات الواردة)';

  const rawSchool = institution?.schoolName || institution?.school_name || '';
  const cleanSchool = rawSchool.replace(/^مدرسة\s*/, '').trim();
  const rawAdmin = institution?.directorate || institution?.administration || '';
  const cleanAdmin = rawAdmin.replace(/التعليمية\s*$/, '').trim();
  const governorate = institution?.governorate || 'الجيزة';

  // Filter transfers by selected type
  const targetTransfers = transfers.filter(t => t.transfer_type === transferType);

  // Group transfers by Grade
  const groupedByGrade = targetTransfers.reduce((acc, t) => {
    const gradeKey = t.grade_name_ar || t.grade_name || 'غير محدد';
    if (!acc[gradeKey]) {
      acc[gradeKey] = [];
    }
    acc[gradeKey].push(t);
    return acc;
  }, {});

  const gradeKeys = Object.keys(groupedByGrade);

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
      
      {/* Top Action Bar (hidden on print) */}
      <div className="no-print" style={{
        maxWidth: 1120,
        margin: '0 auto 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#0f172a',
        padding: '12px 20px',
        borderRadius: 10,
        color: '#fff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileSpreadsheet size={20} color="#38bdf8" />
          <span style={{ fontWeight: 800, fontSize: 14 }}>
            معاينة {title} — مقسم حسب الصفوف الدراسية (إجمالي: {targetTransfers.length} طالب)
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
              padding: '8px 22px',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(2,132,199,0.4)'
            }}
          >
            <Printer size={15} /> طباعة الكشف (Print)
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

      {/* Printable Sheet (A4 Landscape) */}
      <div className="transfers-statement-sheet" style={{
        maxWidth: 1120,
        margin: '0 auto',
        background: '#fff',
        padding: '24px 30px',
        borderRadius: 8,
        boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
        direction: 'rtl',
        color: '#000',
        fontFamily: "'Segoe UI', Tahoma, 'Arial', sans-serif"
      }}>

        {/* ── الترويسة الرسمية للتقرير (مطابقة تماماً لترويسة تقرير الإحصاء) ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', direction: 'rtl', marginBottom: 14, borderBottom: '2px solid #000', paddingBottom: 10 }}>
          
          {/* الجانب الأيمن: بيانات المحافظة والإدارة والمدرسة الفعلية */}
          <div style={{ textAlign: 'right', fontSize: '13.5px', lineHeight: '1.6', fontWeight: 700, minWidth: '220px' }}>
            <div>محافظة: <strong>{governorate || '................'}</strong></div>
            <div>إدارة: <strong>{cleanAdmin ? `${cleanAdmin} التعليمية` : '................'}</strong></div>
            <div>مدرسة: <strong>{cleanSchool || '................'}</strong></div>
          </div>

          {/* المنتصف: عنوان التقرير والعام الدراسي الفعلي */}
          <div style={{ textAlign: 'center', flex: 1, padding: '0 10px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 900, margin: '0 0 4px 0', textDecoration: 'underline', color: '#000', letterSpacing: '0.3px' }}>
              {title}
            </h2>
            <div style={{ fontSize: '14.5px', fontWeight: 800, textDecoration: 'underline', color: '#000' }}>
              للعام الدراسي: {academicYearLabel} م
            </div>
          </div>

          {/* الجانب الأيسر: الشعار والتاريخ والوقت */}
          <div style={{ textAlign: 'left', minWidth: '220px' }}>
            {institution?.logoUrl || institution?.logo_url ? (
              <img src={institution.logoUrl || institution.logo_url} alt="Logo" style={{ maxHeight: 48, maxWidth: 90, objectFit: 'contain' }} />
            ) : (
              <div style={{ display: 'inline-block', textAlign: 'center', border: '1px dashed #cbd5e1', padding: '4px 8px', borderRadius: 4 }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>شعار المدرسة</div>
              </div>
            )}
            <div style={{ fontSize: '11px', color: '#334155', marginTop: 4, direction: 'rtl', textAlign: 'left', fontWeight: 600 }}>
              {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} {new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* ── Empty State ── */}
        {targetTransfers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', fontSize: 14 }}>
            لا توجد تحويلات {isOut ? 'صادرة' : 'واردة'} مسجلة في هذا العام الدراسي حتى الآن.
          </div>
        ) : (
          /* ── Content Grouped by Grade ── */
          <div>
            {gradeKeys.map((gradeKey) => {
              const studentsInGrade = groupedByGrade[gradeKey] || [];
              return (
                <div key={gradeKey} style={{ marginBottom: 20, pageBreakInside: 'avoid' }}>
                  
                  {/* Grade Banner Header */}
                  <div style={{
                    background: '#f1f5f9',
                    border: '1.5px solid #000',
                    borderBottom: 'none',
                    padding: '6px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontWeight: 800,
                    fontSize: 13
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>📌 الصف الدراسي: <strong>{gradeKey}</strong></span>
                    </div>
                    <div>
                      عدد الطلاب: <strong>{studentsInGrade.length}</strong> طالب
                    </div>
                  </div>

                  {/* Grade Table */}
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1.5px solid #000',
                    fontSize: 11,
                    textAlign: 'center'
                  }}>
                    <thead>
                      <tr style={{ background: '#e2e8f0', color: '#000', fontWeight: 800 }}>
                        <th style={{ border: '1px solid #000', padding: '7px 4px', width: 32 }}>م</th>
                        <th style={{ border: '1px solid #000', padding: '7px 8px', textAlign: 'right', minWidth: 200 }}>اسم الطالب بالكامل</th>
                        <th style={{ border: '1px solid #000', padding: '7px 4px', width: 125 }}>الرقم القومي</th>
                        <th style={{ border: '1px solid #000', padding: '7px 4px', width: 45 }}>النوع</th>
                        <th style={{ border: '1px solid #000', padding: '7px 8px', textAlign: 'right', minWidth: 220 }}>
                          {isOut ? 'المدرسة والإدارة والمحافظة المحول إليها' : 'المدرسة والإدارة والمحافظة المحول منها'}
                        </th>
                        <th style={{ border: '1px solid #000', padding: '7px 4px', width: 85 }}>تاريخ التحويل</th>
                        <th style={{ border: '1px solid #000', padding: '7px 6px', width: 160 }}>ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsInGrade.map((s, idx) => (
                        <tr key={s.id || idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : '#fff' }}>
                          <td style={{ border: '1px solid #000', padding: '6px 4px', fontWeight: 700 }}>{idx + 1}</td>
                          <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right', fontWeight: 800 }}>
                            {s.full_name_ar || s.studentName}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '6px 4px', fontFamily: 'monospace', fontSize: 11 }}>
                            {s.national_id || s.nationalId || '—'}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '6px 4px' }}>
                            {s.gender || '—'}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>
                            {isOut ? (
                              <>
                                <div style={{ fontSize: 11.5 }}>{s.to_school || '—'}</div>
                                {s.to_directorate && (
                                  <div style={{ fontSize: 10, color: '#334155', marginTop: 2 }}>
                                    (محافظة / إدارة: {s.to_directorate})
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <div style={{ fontSize: 11.5 }}>{s.from_school || '—'}</div>
                                {s.from_directorate && (
                                  <div style={{ fontSize: 10, color: '#334155', marginTop: 2 }}>
                                    (محافظة / إدارة: {s.from_directorate})
                                  </div>
                                )}
                              </>
                            )}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '6px 4px', fontSize: 10.5 }}>
                            {s.transfer_date || s.date || '—'}
                          </td>
                          {/* Blank Notes column for manual handwriting */}
                          <td style={{ border: '1px solid #000', padding: '6px 4px' }}></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                </div>
              );
            })}
          </div>
        )}

        {/* ── Official Signatures Footer ── */}
        <div style={{
          marginTop: 26,
          paddingTop: 14,
          borderTop: '1.5px solid #000',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          textAlign: 'center',
          fontSize: 12.5,
          fontWeight: 800,
          pageBreakInside: 'avoid'
        }}>
          <div>
            <div>مسؤول شئون الطلاب</div>
            <div style={{ marginTop: 26 }}>التوقيع : ...................................</div>
          </div>

          <div>
            <div>وكيل شئون الطلاب</div>
            <div style={{ marginTop: 26 }}>التوقيع : ...................................</div>
          </div>

          <div>
            <div>يعتمد، مدير المدرسة</div>
            <div style={{ marginTop: 26 }}>التوقيع : ...................................</div>
          </div>
        </div>

      </div>

      {/* Print Styles */}
      <style>{`
        @page {
          size: A4 landscape !important;
          margin: 6mm !important;
        }
        @media print {
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          body * {
            visibility: hidden !important;
          }
          .transfers-statement-sheet, .transfers-statement-sheet * {
            visibility: visible !important;
          }
          .transfers-statement-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            padding: 4mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
}
