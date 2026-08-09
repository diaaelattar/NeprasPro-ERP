import React, { useState, useEffect } from 'react';
import { Layers, Printer, RefreshCw, CheckCircle, ArrowRight } from 'lucide-react';
import '../staff/staff.css';
import API_BASE_URL from '../../config/api';

const API = API_BASE_URL;

export default function StudentSeatingLists({ onBack }) {
  const [seatingList, setSeatingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startNumber, setStartNumber] = useState(1001);
  const [perCommittee, setPerCommittee] = useState(20);
  const [successMsg, setSuccessMsg] = useState('');

  const loadSeating = () => {
    setLoading(true);
    setError('');
    fetch(`${API}/students/seating-lists`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setSeatingList(d.seatingList || []);
        else setError(d.error);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSeating(); }, []);

  const handleGenerate = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    fetch(`${API}/students/generate-seating-numbers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_number: startNumber,
        students_per_committee: perCommittee
      })
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setSuccessMsg(d.message);
          loadSeating();
        } else setError(d.error);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handlePrintSeatingList = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>كشف مناداة لجان الامتحانات الرسمية (كشف 12 د)</title>
          <style>
            body { font-family: 'Cairo', sans-serif; padding: 20px; text-align: right; }
            h2, h3 { text-align: center; margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 8px 12px; font-size: 13px; text-align: center; }
            th { background: #f0f0f0; }
          </style>
        </head>
        <body>
          <h2>وزارة التربية والتعليم والتعليم الفني</h2>
          <h3>كشف مناداة ولجان الامتحانات الرسمية (كشف 12 د)</h3>
          <table>
            <thead>
              <tr>
                <th>رقم الجلوس</th>
                <th>اسم الطالب رباعياً</th>
                <th>الرقم القومي</th>
                <th>كود الطالب</th>
                <th>اسم اللجنة / القاعة</th>
                <th>التوقيع / ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${seatingList.map(st => `
                <tr>
                  <td><strong>${st.seating_number}</strong></td>
                  <td style="text-align: right;">${st.full_name_ar}</td>
                  <td>${st.national_id}</td>
                  <td>${st.emis_student_code || '-'}</td>
                  <td>${st.committee_name}</td>
                  <td></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
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
            <Layers className="w-6 h-6 text-indigo-600" />
            أرقام الجلوس ولجان الامتحانات (كشف 12 د)
          </h2>
          <p>توليد أرقام الجلوس تلقائياً أبجدياً، توزيع الطلاب على القاعات، وطباعة كشوف المناداة الرسمية</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {onBack && (
            <button onClick={onBack} className="staff-cancel-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowRight size={16} /> العودة للطلاب
            </button>
          )}
          <button onClick={handlePrintSeatingList} disabled={seatingList.length === 0} className="staff-add-btn">
            <Printer size={18} /> طباعة كشف المناداة واللجان (12 د)
          </button>
        </div>
      </div>

      {/* توليد أرقام الجلوس */}
      <div className="staff-form-card" style={{ padding: 20 }}>
        <h3 className="staff-form-section-title">
          <RefreshCw size={16} /> إعداد وتوليد أرقام الجلوس واللجان
        </h3>

        {error && <div style={{ padding: 12, background: '#fef2f2', color: '#dc2626', borderRadius: 8, margin: '10px 0', fontSize: 13, fontWeight: 700 }}>{error}</div>}
        {successMsg && <div style={{ padding: 12, background: '#f0fdf4', color: '#166534', borderRadius: 8, margin: '10px 0', fontSize: 13, fontWeight: 700 }}>{successMsg}</div>}

        <form onSubmit={handleGenerate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 16, alignItems: 'end', marginTop: 12 }}>
          <div className="staff-form-group">
            <label>بداية ترقيم أرقام الجلوس</label>
            <input type="number" value={startNumber} onChange={e => setStartNumber(e.target.value)} placeholder="1001" />
          </div>

          <div className="staff-form-group">
            <label>سعة اللجنة / القاعة (عدد الطلاب)</label>
            <input type="number" value={perCommittee} onChange={e => setPerCommittee(e.target.value)} placeholder="20" />
          </div>

          <button type="submit" disabled={loading} className="staff-save-btn" style={{ height: 42 }}>
            <CheckCircle size={16} /> توليد أرقام الجلوس واللجان
          </button>
        </form>
      </div>

      {/* الجدول الرئيسي لأرقام الجلوس */}
      <div className="staff-table-card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 800, color: '#0f172a' }}>
          📋 قائمة أرقام الجلوس الموزعة على اللجان (إجمالي: {seatingList.length} طالب)
        </div>

        <div className="staff-table-scroll">
          <table className="staff-table">
            <thead>
              <tr>
                <th>رقم الجلوس</th>
                <th>اسم الطالب رباعياً</th>
                <th>الرقم القومي</th>
                <th>كود الطالب الوزاري</th>
                <th>اسم اللجنة / القاعة الامتحانية</th>
              </tr>
            </thead>
            <tbody>
              {seatingList.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: '#64748b', fontWeight: 700 }}>
                    لم يتم توليد أرقام الجلوس بعد. اضغط على "توليد أرقام الجلوس واللجان" للبدء.
                  </td>
                </tr>
              ) : (
                seatingList.map(st => (
                  <tr key={st.seating_number}>
                    <td>
                      <span style={{ padding: '4px 12px', borderRadius: 6, background: '#dbeafe', color: '#1e40af', fontWeight: 900, fontSize: 14, fontFamily: 'monospace' }}>
                        {st.seating_number}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800, color: '#0f172a' }}>{st.full_name_ar}</td>
                    <td style={{ fontFamily: 'monospace' }} dir="ltr">{st.national_id}</td>
                    <td style={{ fontFamily: 'monospace' }} dir="ltr">{st.emis_student_code || '-'}</td>
                    <td>
                      <span className="staff-cadre-chip">
                        {st.committee_name}
                      </span>
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
