import React from 'react';

/**
 * MinisterialPrintHeader — Official 3-Column Ministerial Header for Egyptian School ERP
 * Follows Standard Ministerial Protocol (AGENTS.md Rule 4 & nepraspro-guidelines)
 */
export function MinisterialPrintHeader({
  schoolInfo = {},
  documentTitle = 'مستند رسمي',
  gradeName = '',
  subTitle = '',
  termName = '',
  docCode = '',
  academicYear = '',
  showLeftCol = false,
  compact = false
}) {
  const gov = (schoolInfo?.governorate || schoolInfo?.governorate_name || schoolInfo?.governorateName || '................').replace(/^محافظة\s*/, '');
  const admin = (schoolInfo?.directorate || schoolInfo?.directorate_name || schoolInfo?.educational_administration || schoolInfo?.administrationName || '................').replace(/^إدارة\s*/, '').replace(/\s*التعليمية$/, '');
  const school = (schoolInfo?.school_name || schoolInfo?.school_name_ar || schoolInfo?.schoolName || '................');
  const logo = schoolInfo?.logo_url || schoolInfo?.school_logo || schoolInfo?.logoUrl || '';
  const currentYear = academicYear || schoolInfo?.academic_year_name || schoolInfo?.academicYear || schoolInfo?.academic_year || '2026 / 2027';
  const printDate = new Date().toLocaleDateString('ar-EG');

  return (
    <div className="report-official-header" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: compact ? '1.5px solid #000' : '2px solid #000',
      paddingBottom: compact ? '4px' : '6px',
      marginBottom: compact ? '8px' : '12px',
      fontFamily: "'Cairo', 'Amiri', Tahoma, sans-serif",
      direction: 'rtl',
      color: '#000',
      fontSize: compact ? '10px' : '11px',
      lineHeight: 1.4
    }}>
      {/* Right Column: Exact 3 Lines (محافظة / إدارة / مدرسة) */}
      <div className="header-col-right" style={{
        textAlign: 'right', fontWeight: 700,
        minWidth: compact ? '120px' : '170px',
        fontSize: compact ? '10.5px' : '11.5px',
        lineHeight: 1.4
      }}>
        <div>محافظة: <strong>{gov}</strong></div>
        <div>إدارة: <strong>{admin ? (admin.includes('إدارة') ? admin : `${admin} التعليمية`) : '................'}</strong></div>
        <div>مدرسة: <strong>{school}</strong></div>
      </div>

      {/* Center Column: Document Title & Academic Year Directly Below It */}
      <div className="header-col-center" style={{ textAlign: 'center', flex: 1, padding: '0 8px' }}>
        <h2 className="report-title-main" style={{
          fontSize: compact ? '13px' : '16px',
          fontWeight: 900,
          color: '#000',
          margin: '0 0 2px 0',
          textDecoration: 'underline'
        }}>
          {documentTitle}
        </h2>
        <div style={{ fontSize: compact ? '11px' : '12.5px', fontWeight: 800, color: '#000', marginBottom: '1px' }}>
          للعام الدراسي: <strong>{currentYear}</strong> م
        </div>
        {(gradeName || subTitle) && (
          <div className="report-subtitle-meta" style={{ fontSize: compact ? '10px' : '11px', fontWeight: 800, color: '#1e293b' }}>
            {gradeName ? `${gradeName}` : ''} {subTitle ? `— ${subTitle}` : ''}
          </div>
        )}
      </div>

      {/* Left Column: School Logo, Print Date & Document Code */}
      <div className="header-col-left" style={{
        textAlign: 'left', fontWeight: 700,
        minWidth: compact ? '120px' : '170px',
        lineHeight: 1.3
      }}>
        {logo ? (
          <div style={{ marginBottom: '3px' }}>
            <img src={logo} alt="شعار المدرسة" style={{ maxHeight: compact ? '32px' : '42px', maxWidth: '100px', objectFit: 'contain' }} />
          </div>
        ) : (
          <div style={{ display: 'inline-block', border: '1px dashed #94a3b8', borderRadius: '4px', padding: compact ? '1px 6px' : '2px 8px', fontSize: compact ? '9px' : '10px', color: '#64748b', marginBottom: '2px' }}>
            شعار المدرسة
          </div>
        )}
        <div style={{ fontSize: compact ? '9.5px' : '10.5px', color: '#1e293b' }}>تاريخ الطباعة: <strong>{printDate}</strong></div>
        {docCode ? <div style={{ fontSize: compact ? '8.5px' : '9.5px', color: '#64748b', marginTop: '1px' }}>كود النموذج: <strong>{docCode}</strong></div> : null}
      </div>
    </div>
  );
}

/**
 * MinisterialPrintFooter — Official 4-Role Signatures and Stamp Block
 */
export function MinisterialPrintFooter({
  customRoles = null
}) {
  const defaultRoles = [
    { title: 'المسؤول المختص', subtitle: '(كاتب السجل / عضو الكنترول)' },
    { title: 'المراجع والأخصائي', subtitle: '(رئيس الحجرة)' },
    { title: 'وكيل شؤون الطلاب', subtitle: '(مسؤول النظام والمراقبة)' },
    { title: 'مدير المدرسة', subtitle: '(رئيس عام الامتحان - يعتمد)' }
  ];

  const roles = customRoles || defaultRoles;

  return (
    <div className="ministerial-print-footer" style={{
      marginTop: '16px',
      paddingTop: '10px',
      borderTop: '1.5px solid #000',
      fontFamily: "'Cairo', 'Amiri', Tahoma, sans-serif",
      direction: 'rtl',
      pageBreakInside: 'avoid'
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${roles.length}, 1fr)`,
        gap: '12px',
        textAlign: 'center'
      }}>
        {roles.map((r, i) => (
          <div key={i} style={{ fontSize: '11.5px', fontWeight: 800 }}>
            <div style={{ fontWeight: 900, color: '#000' }}>{r.title}</div>
            {r.subtitle && <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>{r.subtitle}</div>}
            <div style={{ height: '30px', borderBottom: '1px dotted #64748b', margin: '6px 12px 0 12px' }}></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MinisterialPrintHeader;
