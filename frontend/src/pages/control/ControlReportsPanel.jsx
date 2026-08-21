/**
 * ControlReportsPanel.jsx — Independent Control Room Reports & Exports Hub
 * NeprasPro - Control Module UI Component
 */

import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, Printer, Lock, KeyRound, Eye, Download, ShieldCheck, 
  FileText, CheckCircle2, AlertCircle, Sparkles, Filter, RefreshCw 
} from 'lucide-react';
import { MinisterialPrintHeader, MinisterialPrintFooter } from '../../components/common/MinisterialPrintHeader';
import API_BASE_URL from '../../config/api';

export default function ControlReportsPanel({ gradeId, term, setMsg, initialCategory = 'all', schoolInfo = null }) {
  const API = `${API_BASE_URL}/control`;
  
  const [reports, setReports] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // PIN Authorization State for Sensitive Reports
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pendingReport, setPendingReport] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [unlockedReports, setUnlockedReports] = useState(new Set());

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    fetchReportsList();
  }, []);

  const fetchReportsList = async () => {
    try {
      const res = await fetch(`${API}/reports-engine`);
      const data = await res.json();
      if (data.success) {
        setReports(data.reports || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectReport = (rep) => {
    if (rep.requiresPin && !unlockedReports.has(rep.id)) {
      setPendingReport(rep);
      setPinModalOpen(true);
      return;
    }
    loadReportPreview(rep);
  };

  const handleUnlockPin = async (e) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    try {
      const res = await fetch(`${API}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput })
      });
      const data = await res.json();
      if (data.success) {
        setUnlockedReports(prev => new Set([...prev, pendingReport.id]));
        setPinModalOpen(false);
        const target = pendingReport;
        setPendingReport(null);
        setPinInput('');
        loadReportPreview(target);
      } else {
        setMsg({ type: 'error', text: 'رمز PIN غير صحيح.' });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'خطأ أثناء التحقق من الرمز.' });
    }
  };

  const loadReportPreview = async (rep) => {
    setSelectedReport(rep);
    setLoading(true);
    try {
      const res = await fetch(`${API}/reports-engine/${rep.id}/data?gradeId=${gradeId || 1}&term=${term || 1}`);
      const data = await res.json();
      if (data.success) {
        setReportData(data.data);
      } else {
        setMsg({ type: 'error', text: data.error || 'فشل تحميل بيانات التقرير.' });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'خطأ في الاتصال بالخادم.' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = (repId) => {
    const url = `${API}/reports-engine/${repId}/export-excel?gradeId=${gradeId || 1}&term=${term || 1}`;
    window.open(url, '_blank');
  };

  const categories = ['all', ...Array.from(new Set(reports.map(r => r.category)))];
  const filteredReports = selectedCategory === 'all' 
    ? reports 
    : reports.filter(r => r.category === selectedCategory);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', fontFamily: "'Cairo', sans-serif" }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        padding: '20px 24px', borderRadius: '14px', color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={24} color="#6366f1" /> 📊 تقارير ومخرجات الكنترول الرسمية
          </h2>
          <p style={{ margin: '6px 0 0 0', fontSize: '12.5px', color: '#c7d2fe' }}>
            توليد وتصدير كشوف الرصد المجمعة، الأرقام السرية، وكشوف المناداة بقوالب إكسيل رسمية جاهزة للطباعة.
          </p>
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 14px', borderRadius: '8px', border: 'none', fontWeight: 800, fontSize: '12px',
                cursor: 'pointer',
                background: selectedCategory === cat ? '#6366f1' : 'rgba(255,255,255,0.1)',
                color: '#fff'
              }}
            >
              {cat === 'all' ? 'جميع التقارير' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Grid & Preview Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {filteredReports.map(rep => {
          const isUnlocked = !rep.requiresPin || unlockedReports.has(rep.id);
          const isSelected = selectedReport?.id === rep.id;

          return (
            <div
              key={rep.id}
              style={{
                background: isSelected ? '#f0f9ff' : '#fff',
                borderRadius: '12px', padding: '18px',
                border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#6366f1', background: '#e0e7ff', padding: '3px 8px', borderRadius: '6px' }}>
                    {rep.category}
                  </span>
                  {rep.requiresPin && (
                    <span style={{
                      fontSize: '11px', fontWeight: 800,
                      color: isUnlocked ? '#059669' : '#d97706',
                      background: isUnlocked ? '#dcfce7' : '#fef3c7',
                      padding: '3px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                      {isUnlocked ? <ShieldCheck size={13} /> : <Lock size={13} />}
                      {isUnlocked ? 'محمي ومحقق' : 'محمي بـ PIN'}
                    </span>
                  )}
                </div>

                <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 900, color: '#1e293b' }}>
                  {rep.title}
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                  {rep.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  onClick={() => handleSelectReport(rep)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    background: '#fff', color: '#1e293b', fontWeight: 800, fontSize: '12px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <Eye size={15} color="#2563eb" /> معاينة التقرير
                </button>

                {rep.exportFormats.includes('excel') && (
                  <button
                    onClick={() => {
                      if (rep.requiresPin && !unlockedReports.has(rep.id)) {
                        setPendingReport(rep);
                        setPinModalOpen(true);
                      } else {
                        handleExportExcel(rep.id);
                      }
                    }}
                    style={{
                      background: '#059669', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px',
                      fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <FileSpreadsheet size={15} /> تصدير Excel
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Preview Section */}
      {selectedReport && reportData && (
        <div style={{ background: '#fff', padding: '24px 28px', borderRadius: '14px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔍 معاينة حية: {selectedReport.title} ({reportData.students?.length || 0} طالب)
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => window.print()}
                style={{ background: '#312e81', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={15} /> طباعة المستند
              </button>
              <button
                onClick={() => handleExportExcel(selectedReport.id)}
                style={{ background: '#059669', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FileSpreadsheet size={15} /> تنزيل ملف Excel (.xlsx)
              </button>
            </div>
          </div>

          {/* Standard 3-Column Ministerial Header */}
          <MinisterialPrintHeader
            schoolInfo={schoolInfo || reportData.school || {}}
            documentTitle={selectedReport.title}
            gradeName={reportData.grade?.grade_name_ar || ''}
            subTitle={term === 1 ? 'الفصل الدراسي الأول' : term === 2 ? 'الفصل الدراسي الثاني' : 'العام الدراسي'}
            termName={term === 1 ? 'الأول' : term === 2 ? 'الثاني' : 'كامل العام'}
            docCode={`NP-CTL-${selectedReport.id.toUpperCase()}`}
          />

          <div style={{ overflowX: 'auto', maxHeight: '450px', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#fff' }}>
                  <th style={{ padding: '8px', width: '40px' }}>م</th>
                  <th style={{ padding: '8px', width: '90px' }}>رقم الجلوس</th>
                  <th style={{ padding: '8px' }}>اسم الطالب</th>
                  <th style={{ padding: '8px', width: '80px' }}>الفصل</th>
                  {selectedReport.id === 'secret_codes_list' ? (
                    <>
                      <th style={{ padding: '8px', width: '100px' }}>الرقم السرّي</th>
                      <th style={{ padding: '8px', width: '120px' }}>اللجنة</th>
                    </>
                  ) : (
                    reportData.subjects?.map(s => <th key={s.id} style={{ padding: '8px', textAlign: 'center' }}>{s.subject_name_ar}</th>)
                  )}
                </tr>
              </thead>
              <tbody>
                {reportData.students?.slice(0, 50).map((st, idx) => (
                  <tr key={st.control_student_id} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding: '7px', textAlign: 'center', fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ padding: '7px', fontWeight: 800, color: '#0284c7' }}>{st.seat_number || '-'}</td>
                    <td style={{ padding: '7px', fontWeight: 800 }}>{st.full_name_ar}</td>
                    <td style={{ padding: '7px' }}>{st.class_name_ar || '-'}</td>
                    {selectedReport.id === 'secret_codes_list' ? (
                      <>
                        <td style={{ padding: '7px', fontWeight: 900, color: '#d97706' }}>
                          {term === 1 ? (st.secret_code_term1 || '🔒') : (st.secret_code_term2 || '🔒')}
                        </td>
                        <td style={{ padding: '7px' }}>{st.committee_name || '-'}</td>
                      </>
                    ) : (
                      reportData.subjects?.map(s => {
                        const m = reportData.marks?.find(item => item.control_student_id === st.control_student_id && item.subject_id === s.id);
                        const val = m ? (m.is_absent ? 'غائب' : m.is_exempt ? 'معفى' : (m.work_marks || 0) + (m.written_marks || 0)) : '-';
                        return <td key={s.id} style={{ padding: '7px', textAlign: 'center', fontWeight: 800 }}>{val}</td>;
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Standard 4-Role Ministerial Footer */}
          <MinisterialPrintFooter />
        </div>
      )}

      {/* PIN Unlock Modal */}
      {pinModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '400px',
            padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', border: '2px solid #6366f1'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', background: '#e0e7ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                <KeyRound size={24} color="#4f46e5" />
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#1e1b4b' }}>
                فتح التقرير السري المحمي
              </h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                يتطلب فتح <strong>{pendingReport?.title}</strong> إدخال الرمز السري للكنترول (Master PIN).
              </p>
            </div>

            <form onSubmit={handleUnlockPin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="password"
                placeholder="أدخل رمز PIN الكنترول..."
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                autoFocus
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #cbd5e1',
                  textAlign: 'center', fontSize: '16px', fontWeight: 900, letterSpacing: '4px'
                }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  style={{ flex: 1, background: '#4f46e5', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
                >
                  تأكيد وتأمين التقرير
                </button>
                <button
                  type="button"
                  onClick={() => { setPinModalOpen(false); setPendingReport(null); setPinInput(''); }}
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
