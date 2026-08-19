import React, { useState, useEffect } from 'react';
import { Layers, Printer, RefreshCw, CheckCircle, ArrowRight } from 'lucide-react';
import '../staff/staff.css';
import API_BASE_URL from '../../config/api';
import { calculateAgeOnOct1st } from '../../constants/lookupOptions';

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
              <div>محافظة: ${gov}</div>
              <div>إدارة: ${cleanAdmin} التعليمية</div>
              <div>مدرسة: ${cleanSchool}</div>
            </div>
            <div class="hd-c">
              <h2>كشف مناداة ولجان الامتحانات (كشف 12 د)</h2>
              <div style="font-size: 11pt; font-weight: 800;">للعام الدراسي: ${academicYear} م</div>
            </div>
            <div class="hd-l">
              <div>التاريخ: ${dateStr}</div>
            </div>
          </div>
          <table style="font-size: 9pt;">
            <thead>
              <tr style="background: #e2e8f0; font-weight: 900;">
                <th rowspan="2" style="width: 25pt;">م</th>
                <th rowspan="2" style="width: 50pt;">رقم الجلوس</th>
                <th rowspan="2" style="text-align: right; min-width: 120pt; padding-right: 6pt;">اسم الطالب رباعياً</th>
                <th rowspan="2" style="width: 38pt;">الديانة</th>
                <th rowspan="2" style="width: 45pt;">حالة القيد</th>
                <th rowspan="2" style="width: 40pt;">الجنسية</th>
                <th rowspan="2" style="width: 85pt;">الرقم القومي</th>
                <th colspan="3" style="background: #cbd5e1;">السن في 1 أكتوبر</th>
                <th rowspan="2" style="width: 55pt;">الدمج</th>
                <th rowspan="2" style="width: 65pt;">اسم اللجنة</th>
                <th rowspan="2" style="min-width: 50pt;">الملاحظات</th>
              </tr>
              <tr style="background: #f1f5f9; font-size: 8pt;">
                <th style="width: 22pt;">سنة</th>
                <th style="width: 22pt;">شهر</th>
                <th style="width: 22pt;">يوم</th>
              </tr>
            </thead>
            <tbody>
              ${seatingList.map((st, idx) => {
                const age = calculateAgeOnOct1st(st.birth_date || st.national_id, academicYear);
                const isMerged = st.is_merged === 1 || st.is_merged === '1' || st.disability_id > 0;
                const mergeLabel = isMerged ? (st.merge_type ? `مدمج (${st.merge_type})` : 'مدمج') : 'غير مدمج';
                const natLabel = (st.nationality_id && st.nationality_id !== 1 && !(st.nationality_name || '').includes('مصر')) ? (st.nationality_name || 'وافد') : 'مصري';
                return `
                <tr style="background: ${idx % 2 === 1 ? '#fafafa' : '#fff'}; font-size: 8.5pt;">
                  <td>${idx + 1}</td>
                  <td><strong style="color: #1e40af; font-family: monospace; font-size: 9.5pt;">${st.seating_number || '—'}</strong></td>
                  <td style="text-align: right; font-weight: 800; padding-right: 6pt;">${st.full_name_ar}</td>
                  <td>${st.religion || 'مسلم'}</td>
                  <td>${st.enrollment_status || st.status || 'منقول'}</td>
                  <td>${natLabel}</td>
                  <td style="font-family: monospace;" dir="ltr">${st.national_id || '—'}</td>
                  <td style="font-weight: 800;">${age.years !== '' ? age.years : '—'}</td>
                  <td style="font-weight: 800;">${age.months !== '' ? age.months : '—'}</td>
                  <td style="font-weight: 800;">${age.days !== '' ? age.days : '—'}</td>
                  <td style="font-size: 7.5pt; font-weight: ${isMerged ? 'bold' : 'normal'}; color: ${isMerged ? '#b91c1c' : '#475569'};">${mergeLabel}</td>
                  <td>${st.committee_name || '—'}</td>
                  <td></td>
                </tr>
              `;}).join('')}
            </tbody>
          </table>

          <table class="sigs-table">
            <tr>
              <td style="width: 25%;"><div>مسؤول شؤون الطلاب</div><div class="sig-line"></div></td>
              <td style="width: 25%;"><div>رئيس لجنة النظام والمراقبة</div><div class="sig-line"></div></td>
              <td style="width: 25%;"><div>وكيل شؤون التعليم</div><div class="sig-line"></div></td>
              <td style="width: 25%;"><div>مدير المدرسة (رئيس عام الامتحان)</div><div class="sig-line"></div></td>
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
      <div className="staff-header-actions" style={{ marginBottom: 20 }}>
        <button className="staff-btn staff-btn-secondary" onClick={onBack}>
          <ArrowRight size={16} /> العودة للطلاب
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="staff-btn staff-btn-primary" onClick={handlePrintSeatingList} disabled={seatingList.length === 0}>
            <Printer size={18} /> طباعة كشف المناداة واللجان (12 د)
          </button>
        </div>
      </div>

      {error && <div className="staff-error-banner">{error}</div>}
      {successMsg && <div className="staff-success-banner" style={{ background: '#dcfce7', color: '#15803d', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontWeight: 700 }}>{successMsg}</div>}

      {/* نموذج التوزيع التلقائي */}
      <div className="staff-table-card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={18} color="#2563eb" /> إعدادات توليد أرقام الجلوس وتوزيع اللجان
        </h3>
        
        <form onSubmit={handleGenerate} style={{ display: 'flex', gap: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>رقم بداية الجلوس</label>
            <input
              type="number"
              value={startNumber}
              onChange={e => setStartNumber(e.target.value)}
              className="staff-input"
              required
              min="1"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>سعة كل لجنة (طالب/لجنة)</label>
            <input
              type="number"
              value={perCommittee}
              onChange={e => setPerCommittee(e.target.value)}
              className="staff-input"
              required
              min="1"
              max="50"
            />
          </div>

          <button type="submit" disabled={loading} className="staff-save-btn" style={{ height: 42 }}>
            <CheckCircle size={16} /> توليد أرقام الجلوس واللجان
          </button>
        </form>
      </div>

      {/* الجدول الرئيسي لأرقام الجلوس */}
      <div className="staff-table-card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 800, color: '#0f172a' }}>
          📋 قائمة أرقام الجلوس الموزعة على اللجان (سجل 12 د) — (إجمالي: {seatingList.length} طالب)
        </div>

        <div className="staff-table-scroll">
          <table className="staff-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>م</th>
                <th>رقم الجلوس</th>
                <th>اسم الطالب رباعياً بالكامل</th>
                <th>الديانة</th>
                <th>حالة القيد</th>
                <th>الجنسية</th>
                <th>الرقم القومي</th>
                <th>السن في 1 أكتوبر</th>
                <th>الدمج</th>
                <th>اللجنة الامتحانية</th>
              </tr>
            </thead>
            <tbody>
              {seatingList.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: '#64748b', fontWeight: 700 }}>
                    لم يتم توليد أرقام الجلوس بعد. اضغط على "توليد أرقام الجلوس واللجان" للبدء.
                  </td>
                </tr>
              ) : (
                seatingList.map((st, idx) => {
                  const isMerged = st.is_merged === 1 || st.is_merged === '1' || st.disability_id > 0;
                  const natLabel = (st.nationality_id && st.nationality_id !== 1 && !(st.nationality_name || '').includes('مصر')) ? (st.nationality_name || 'وافد') : 'مصري';
                  return (
                    <tr key={st.seating_number || idx}>
                      <td style={{ fontWeight: 700 }}>{idx + 1}</td>
                      <td>
                        <span style={{ padding: '4px 12px', borderRadius: 6, background: '#dbeafe', color: '#1e40af', fontWeight: 900, fontSize: 14, fontFamily: 'monospace' }}>
                          {st.seating_number}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>{st.full_name_ar}</td>
                      <td>{st.religion || 'مسلم'}</td>
                      <td>{st.enrollment_status || st.status || 'منقول'}</td>
                      <td>{natLabel}</td>
                      <td style={{ fontFamily: 'monospace' }} dir="ltr">{st.national_id}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{st.birth_date || '—'}</td>
                      <td>
                        <span className={isMerged ? 'badge-danger' : 'badge-neutral'} style={{ fontSize: 11 }}>
                          {isMerged ? 'مدمج' : 'غير مدمج'}
                        </span>
                      </td>
                      <td>
                        <span className="staff-cadre-chip">
                          {st.committee_name || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
