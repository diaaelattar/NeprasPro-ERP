import React, { useState, useEffect } from 'react';
import { AlertTriangle, Printer, Search, Calendar, FileText, CheckCircle, ArrowRight } from 'lucide-react';
import '../staff/staff.css';
import API_BASE_URL from '../../config/api';

const API = API_BASE_URL;

export default function StudentAbsenceManager({ onBack }) {
  const [warnings, setWarnings] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [absenceDate, setAbsenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [absenceType, setAbsenceType] = useState('بدون عذر');
  const [recordSuccess, setRecordSuccess] = useState('');

  const loadData = () => {
    setLoading(true);
    setError('');
    Promise.all([
      fetch(`${API}/students/absence-warnings`).then(r => r.json()),
      fetch(`${API}/students?limit=500`).then(r => r.json())
    ])
      .then(([wRes, sRes]) => {
        if (wRes.success) setWarnings(wRes.warnings || []);
        if (sRes.success) setStudents(sRes.students || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleRecordAbsence = (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setError('يرجى اختيار الطالب من القائمة.');
      return;
    }
    setError('');
    setRecordSuccess('');

    fetch(`${API}/students/record-absence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: selectedStudentId,
        absence_date: absenceDate,
        absence_type: absenceType
      })
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setRecordSuccess(`تم تسجيل الغياب بنجاح. إجمالي الغياب بدون عذر: ${d.totalAbsent} يوماً.`);
          if (d.warningGenerated) {
            alert(`⚠️ تنبيه وزاري: تم اصدار "${d.warningGenerated}" للطالب تلقائياً!`);
          }
          loadData();
        } else setError(d.error);
      })
      .catch(err => setError(err.message));
  };

  const handlePrintWarning = (warning) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>إنذار غياب رسمي - ${warning.full_name_ar}</title>
          <style>
            body { font-family: 'Cairo', sans-serif; padding: 40px; line-height: 1.8; text-align: right; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 30px; }
            .content { font-size: 16px; margin-bottom: 40px; }
            .footer { display: flex; justify-content: space-between; margin-top: 60px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>وزارة التربية والتعليم والتعليم الفني</h2>
            <h3>إدارة شؤون الطلاب والامتحانات</h3>
            <h4>إشعار / ${warning.warning_type}</h4>
          </div>
          <div class="content">
            <p><strong>تاريخ الإشعار:</strong> ${warning.issue_date || new Date().toLocaleDateString('ar-EG')}</p>
            <p><strong>اسم الطالب:</strong> ${warning.full_name_ar}</p>
            <p><strong>الرقم القومي:</strong> ${warning.national_id}</p>
            <p><strong>كود الطالب:</strong> ${warning.emis_student_code || '-'}</p>
            <hr />
            <p>نفيدكم علماً بأنه لوحظ تجاوز الطالب المذكور أعلاه لنسبة الغياب المقررة قانوناً بدون عذر مقبول، حيث بلغ إجمالي أيام غيابه <strong>(${warning.total_absent_days}) يوماً</strong>.</p>
            <p>يرجى حضور ولي الأمر فوراً لتسوية موقف الطالب وتجنب اتخاذ الإجراءات القانونية وفصل الطالب.</p>
          </div>
          <div class="footer">
            <div>مسؤول شؤون الطلاب: ....................</div>
            <div>مدير المدرسة: ....................</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="staff-container">
      <div className="staff-header">
        <div className="staff-title-box">
          <h2>
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            تتبع غياب الطلاب وإنذارات الفصل الرسمية
          </h2>
          <p>تسجيل الغياب اليومي، التوليد التلقائي لإنذارات (7 و 12 و 15 يوماً)، وإصدار خطابات إعادة القيد</p>
        </div>
        {onBack && (
          <button onClick={onBack} className="staff-cancel-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowRight size={16} /> العودة لقائمة الطلاب
          </button>
        )}
      </div>

      {/* تسجيل الغياب اليومي */}
      <div className="staff-form-card" style={{ padding: 20 }}>
        <h3 className="staff-form-section-title">
          <Calendar size={16} /> تسجيل غياب طالب
        </h3>

        {error && <div style={{ padding: 12, background: '#fef2f2', color: '#dc2626', borderRadius: 8, margin: '10px 0', fontSize: 13, fontWeight: 700 }}>{error}</div>}
        {recordSuccess && <div style={{ padding: 12, background: '#f0fdf4', color: '#166534', borderRadius: 8, margin: '10px 0', fontSize: 13, fontWeight: 700 }}>{recordSuccess}</div>}

        <form onSubmit={handleRecordAbsence} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'end', marginTop: 12 }}>
          <div className="staff-form-group">
            <label>اختر الطالب <span style={{ color: '#ef4444' }}>*</span></label>
            <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
              <option value="">-- حدد الطالب --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.full_name_ar || `${s.first_name} ${s.last_name}`} - ({s.national_id})
                </option>
              ))}
            </select>
          </div>

          <div className="staff-form-group">
            <label>تاريخ الغياب</label>
            <input type="date" value={absenceDate} onChange={e => setAbsenceDate(e.target.value)} />
          </div>

          <div className="staff-form-group">
            <label>نوع الغياب</label>
            <select value={absenceType} onChange={e => setAbsenceType(e.target.value)}>
              <option value="بدون عذر">بدون عذر (يُحسب للإنذار)</option>
              <option value="بعذر">بعذر رسمي مقبول</option>
            </select>
          </div>

          <button type="submit" className="staff-save-btn" style={{ height: 42 }}>
            <CheckCircle size={16} /> تسجيل الغياب
          </button>
        </form>
      </div>

      {/* جدول الإنذارات الصادرة */}
      <div className="staff-table-card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 800, color: '#0f172a' }}>
          📋 سجل الإنذارات الصادرة وحالات تجاوز نسبة الغياب
        </div>

        <div className="staff-table-scroll">
          <table className="staff-table">
            <thead>
              <tr>
                <th>م</th>
                <th>اسم الطالب</th>
                <th>الرقم القومي</th>
                <th>نوع الإنذار الصادر</th>
                <th>إجمالي أيام الغياب</th>
                <th>تاريخ التوليد</th>
                <th>إجراءات الطباعة</th>
              </tr>
            </thead>
            <tbody>
              {warnings.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#64748b', fontWeight: 700 }}>
                    لا توجد إنذارات غياب صادرة حالياً
                  </td>
                </tr>
              ) : (
                warnings.map((w, idx) => (
                  <tr key={w.id}>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 800, color: '#0f172a' }}>{w.full_name_ar}</td>
                    <td style={{ fontFamily: 'monospace' }} dir="ltr">{w.national_id}</td>
                    <td>
                      <span style={{ padding: '4px 10px', borderRadius: 8, background: '#fef3c7', color: '#b45309', fontWeight: 800, fontSize: 12 }}>
                        {w.warning_type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800, color: '#dc2626' }}>{w.total_absent_days} يوماً</td>
                    <td style={{ fontSize: 12 }}>{w.issue_date || '-'}</td>
                    <td>
                      <button onClick={() => handlePrintWarning(w)} className="staff-action-btn edit" title="طباعة الإنذار الرسمي" style={{ width: 'auto', padding: '0 12px', gap: 6 }}>
                        <Printer size={14} /> طباعة الإنذار
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
