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

  const [schoolInfo, setSchoolInfo] = useState(null);

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

    fetch(`${API}/setup/status`)
      .then(r => r.json())
      .then(d => { if (d.success) setSchoolInfo(d); })
      .catch(() => {});
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
    const rawSchool   = schoolInfo?.school_name || schoolInfo?.schoolName || '';
    const cleanSchool = rawSchool.replace(/^مدرسة\s*/, '').trim() || '...............';
    const rawAdmin    = schoolInfo?.directorate || schoolInfo?.administration || '';
    const cleanAdmin  = rawAdmin.replace(/التعليمية\s*$/, '').trim() || '...............';
    const gov         = schoolInfo?.governorate || '...............';
    const logo        = schoolInfo?.logo_url || schoolInfo?.logoUrl || '';
    const academicYear = schoolInfo?.academicYear || schoolInfo?.academic_year || '....../......';

    const now     = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });

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
          <title>كشف مناداة لجان الامتحانات (كشف 12 د)</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Calibri', 'Segoe UI', Tahoma, Arial, sans-serif; padding: 10px; text-align: right; color: #000; direction: rtl; font-size: 11pt; }
            .hd-box { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2pt solid #000; padding-bottom: 6pt; margin-bottom: 12pt; }
            .hd-r { text-align: right; font-size: 11pt; font-weight: 700; line-height: 1.45; min-width: 55mm; }
            .hd-c { text-align: center; flex: 1; }
            .hd-c h2 { font-size: 16pt; font-weight: 900; text-decoration: underline; margin-bottom: 2pt; }
            .hd-yr { font-size: 11.5pt; font-weight: 800; text-decoration: underline; }
            .hd-l { text-align: left; min-width: 55mm; font-size: 9.5pt; font-weight: 600; }
            .hd-l img { max-height: 38pt; max-width: 75pt; object-fit: contain; margin-bottom: 2pt; }
            .logo-box { display: inline-block; border: 1pt dashed #999; padding: 2pt 6pt; font-size: 9pt; }

            table { width: 100%; border-collapse: collapse; border: 1.5pt solid #000; margin-top: 10pt; font-size: 10pt; text-align: center; }
            th, td { border: 1pt solid #000; padding: 5pt 4pt; }
            th { background: #f1f5f9; font-weight: 800; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
            .sigs-table { width: 100%; border: none; margin-top: 25pt; font-weight: 800; font-size: 11pt; text-align: center; }
            .sigs-table td { border: none; padding: 4pt; }
            .sig-line { width: 70%; height: 1pt; border-bottom: 1pt dotted #000; margin: 20pt auto 0; }
          </style>
        </head>
        <body>
          <div class="hd-box">
            <div class="hd-r">
              <div>محافظة: <strong>${gov}</strong></div>
              <div>إدارة: <strong>${cleanAdmin} التعليمية</strong></div>
              <div>مدرسة: <strong>${cleanSchool}</strong></div>
            </div>
            <div class="hd-c">
              <h2>كشف مناداة ولجان الامتحانات (كشف 12 د)</h2>
              <div class="hd-yr">للعام الدراسي: ${academicYear} م</div>
            </div>
            <div class="hd-l">
              ${logo ? `<img src="${logo}" alt="شعار" />` : '<div class="logo-box">شعار المدرسة</div>'}
              <div>التاريخ: ${dateStr}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30pt;">م</th>
                <th style="width: 65pt;">رقم الجلوس</th>
                <th style="text-align: right; min-width: 140pt; padding-right: 8pt;">اسم الطالب رباعياً</th>
                <th style="width: 95pt;">الرقم القومي</th>
                <th style="width: 80pt;">اسم اللجنة / القاعة</th>
                <th style="min-width: 70pt;">التوقيع / ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${seatingList.map((st, idx) => `
                <tr style="background: ${idx % 2 === 1 ? '#fafafa' : '#fff'};">
                  <td>${idx + 1}</td>
                  <td><strong>${st.seating_number || '—'}</strong></td>
                  <td style="text-align: right; font-weight: 700; padding-right: 8pt;">${st.full_name_ar}</td>
                  <td style="font-family: monospace;">${st.national_id || '—'}</td>
                  <td>${st.committee_name || '—'}</td>
                  <td></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <table class="sigs-table">
            <tr>
              <td style="width: 33%;"><div>مسؤول شؤون الطلاب والامتحانات</div><div class="sig-line"></div></td>
              <td style="width: 33%;"><div>رئيس لجنة النظام والمراقبة (الكنترول)</div><div class="sig-line"></div></td>
              <td style="width: 33%;"><div>مدير المدرسة (رئيس عام الامتحان)</div><div class="sig-line"></div></td>
            </tr>
          </table>
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
