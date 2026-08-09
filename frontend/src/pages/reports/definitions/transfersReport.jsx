import API_BASE_URL from '../../../config/api';

function TransfersReportPreview({ students, meta, schoolInfo }) {
  const { selectedYear } = meta;
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/students/transfers/list`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setTransfers(d.transfers || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="report-preview" id="print-area" data-orientation="portrait">
      {/* Official Header */}
      <div className="official-header">
        <div className="official-logo-box">
          <div className="logo-placeholder">شئون الطلاب<br />قسم التحويلات</div>
        </div>
        <div className="official-title-block">
          <div className="official-title" style={{ fontSize: 16 }}>
            سجل حركة تحويلات الطلاب (الواردة والصادرة)
          </div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            العام الدراسي: <span className="title-fill">{selectedYear?.year_label || '...............'}</span>
          </div>
        </div>
        <div className="official-school-info">
          <div>محافظة: <span>{schoolInfo.governorate || '................'}</span></div>
          <div>إدارة: <span>{schoolInfo.directorate || '................'}</span></div>
          <div>مدرسة: <span>{schoolInfo.schoolName || '................'}</span></div>
        </div>
      </div>

      {/* Table */}
      <div className="register-table-wrap" style={{ marginTop: 15 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>جاري تحميل سجل التحويلات...</div>
        ) : (
          <table className="register-table" dir="rtl" style={{ fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ width: 35 }}>م</th>
                <th>اسم الطالب</th>
                <th style={{ width: 110 }}>الرقم القومي</th>
                <th style={{ width: 80 }}>نوع الحركة</th>
                <th>المدرسة المرتبطة</th>
                <th style={{ width: 100 }}>تاريخ التحويل</th>
                <th>سبب التحويل</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t, i) => (
                <tr key={t.id}>
                  <td className="cell-num">{i + 1}</td>
                  <td className="cell-name" style={{ textAlign: 'right', fontWeight: 600 }}>{t.full_name_ar}</td>
                  <td className="cell-id" dir="ltr">{t.national_id || '—'}</td>
                  <td style={{ fontWeight: 600, color: t.transfer_type === 'in' ? '#10b981' : '#f59e0b' }}>
                    {t.transfer_type === 'in' ? '⬇️ تحويل وارد' : '⬆️ تحويل صادر'}
                  </td>
                  <td>{t.transfer_type === 'in' ? t.from_school : t.to_school}</td>
                  <td style={{ textAlign: 'center' }}>{t.transfer_date}</td>
                  <td>{t.reason || '—'}</td>
                  <td>{t.notes || '—'}</td>
                </tr>
              ))}
              {transfers.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: 25, color: '#6b7280' }}>
                    لا توجد تحويلات مسجلة حالياً.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 30, display: 'flex', justifyContent: 'space-between', padding: '0 40px', fontSize: 12 }}>
        <div>أخصائي شئون الطلاب: ..........................</div>
        <div>مدير المدرسة: ..........................</div>
      </div>
    </div>
  );
}

const transfersReport = {
  id:          'transfers_report',
  name:        'سجل حركة التحويلات السنوي',
  desc:        'سجل كامل للتحويلات الصادرة والواردة وأسبابها',
  category:    'سجلات أخرى',
  icon:        '🔃',
  orientation: 'portrait',
  available:   true,

  filters: {
    requiresYear: true,
  },

  excelEndpoint: (f) => `/api/students/export/transfers`,
  excelFileName: (f, meta) => `سجل_تحويلات_الطلاب_${meta.selectedYear?.year_label?.replace('/', '_') || ''}.xlsx`,
  buildQuery: (f) => `limit=1`, // Mock query

  PreviewComponent: TransfersReportPreview,
};

export default transfersReport;
