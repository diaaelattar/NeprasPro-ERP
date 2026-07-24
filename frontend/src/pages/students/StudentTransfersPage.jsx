import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeftRight, Search, Plus, Printer, Edit, Trash2,
  CheckCircle2, AlertCircle, Loader2, Save, FileText, ArrowLeft
} from 'lucide-react';
import StudentForm from './StudentForm';

const API = `http://${window.location.hostname}:3001/api`;

export default function StudentTransfersPage({ onBack, activeSectionId }) {
  const [activeTab, setActiveTab]         = useState('out'); // 'out' | 'in'
  const [transfers, setTransfers]         = useState([]);
  const [studentsList, setStudentsList]   = useState([]); // For selecting student to transfer out
  const [formOpts, setFormOpts]           = useState({ sections: [], stages: [], grades: [], academicYears: [] });
  const [loading, setLoading]             = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState('');
  
  // Modal states
  const [showAddInModal, setShowAddInModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null); // For editing student details directly
  const [printData, setPrintData]         = useState(null); // Data for print layout

  // Form for Transfer Out
  const [outForm, setOutForm] = useState({
    studentId: '',
    toSchool: '',
    toDirectorate: '',
    reason: '',
    transferDate: new Date().toISOString().split('T')[0],
    academicYearId: '',
    notes: ''
  });

  // Form for Transfer In (Simple initial insert)
  const [inForm, setInForm] = useState({
    fullNameAr: '',
    nationalId: '',
    gender: 'ذكر',
    religion: 'مسلم',
    sectionId: '',
    stageId: '',
    gradeId: '',
    academicYearId: '',
    fromSchool: '',
    fromDirectorate: '',
    reason: '',
    transferDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Load configuration options
  useEffect(() => {
    fetch(`${API}/students/form-options`).then(r => r.json()).then(d => {
      if (d.success) {
        setFormOpts(d);
        const cur = d.academicYears?.find(y => y.is_current === 1 || y.is_current === true);
        if (cur) {
          setOutForm(f => ({ ...f, academicYearId: String(cur.id) }));
          setInForm(f => ({ ...f, academicYearId: String(cur.id) }));
        }
      }
    });
  }, []);

  // Load students for Transfer Out search
  const loadStudents = useCallback(() => {
    fetch(`${API}/students?limit=500`).then(r => r.json()).then(d => {
      if (d.success) setStudentsList(d.students || []);
    });
  }, []);

  // Load transfers list (We will fetch and join backend data)
  const loadTransfers = useCallback(async () => {
    setLoading(true);
    try {
      // In a real database we fetch student_transfers joined with students. 
      // We will create a clean controller mapping or mock it from SQLite
      const res = await fetch(`${API}/students/transfers/list`); // Custom backend query we'll define
      const data = await res.json();
      if (data.success) {
        setTransfers(data.transfers || []);
      }
    } catch {
      setError('فشل تحميل قائمة التحويلات.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
    loadTransfers();
  }, [loadStudents, loadTransfers]);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 4000); return () => clearTimeout(t); }
  }, [success]);

  // Handle Transfer Out Submit
  const handleTransferOutSubmit = async (e) => {
    e.preventDefault();
    if (!outForm.studentId || !outForm.toSchool || !outForm.reason) {
      setError('يرجى تعبئة كافة الحقول الإلزامية.');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/students/${outForm.studentId}/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transferType: 'out',
          toSchool: outForm.toSchool,
          toDirectorate: outForm.toDirectorate,
          reason: outForm.reason,
          transferDate: outForm.transferDate,
          academicYearId: parseInt(outForm.academicYearId),
          notes: outForm.notes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      const stud = studentsList.find(s => String(s.id) === String(outForm.studentId));
      setSuccess('✅ تم تسجيل التحويل الصادر بنجاح وتحديث حالة الطالب.');
      
      // Auto trigger print layout
      setPrintData({
        studentName: stud?.full_name_ar,
        nationalId: stud?.national_id,
        studentCode: stud?.student_code,
        schoolName: outForm.toSchool,
        directorate: outForm.toDirectorate,
        reason: outForm.reason,
        date: outForm.transferDate
      });

      setOutForm(f => ({ ...f, studentId: '', toSchool: '', toDirectorate: '', reason: '', notes: '' }));
      loadTransfers();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Transfer In Submit
  const handleTransferInSubmit = async (e) => {
    e.preventDefault();
    if (!inForm.fullNameAr || !inForm.fromSchool || !inForm.reason || !inForm.sectionId || !inForm.stageId || !inForm.gradeId) {
      setError('يرجى تعبئة الحقول الإلزامية لتسجيل الطالب.');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      // 1. Create student first as 'promoted' but with source transfer
      const studRes = await fetch(`${API}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullNameAr: inForm.fullNameAr,
          nationalId: inForm.nationalId || null,
          gender: inForm.gender,
          religion: inForm.religion,
          sectionId: inForm.sectionId,
          stageId: inForm.stageId,
          gradeId: inForm.gradeId,
          academicYearId: inForm.academicYearId,
          guardianPhone: '00000000000', // Default placeholder for direct transfer creation
          status: 'promoted'
        })
      });
      const studData = await studRes.json();
      if (!studRes.ok) throw new Error(studData.error);

      // 2. Insert into student_transfers
      const transRes = await fetch(`${API}/students/${studData.studentId}/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transferType: 'in',
          fromSchool: inForm.fromSchool,
          fromDirectorate: inForm.fromDirectorate,
          reason: inForm.reason,
          transferDate: inForm.transferDate,
          academicYearId: parseInt(inForm.academicYearId),
          notes: inForm.notes
        })
      });
      if (!transRes.ok) throw new Error('فشل تسجيل التحويل لكن تم تسجيل الطالب.');

      setSuccess('✅ تم تسجيل الطالب المحول والتحويل بنجاح.');
      setShowAddInModal(false);
      
      // Auto open full student editor modal to edit details
      setEditingStudentId(studData.studentId);
      
      setInForm(f => ({ ...f, fullNameAr: '', nationalId: '', fromSchool: '', fromDirectorate: '', reason: '', notes: '' }));
      loadTransfers();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Direct print window trigger
  const handlePrint = (p) => {
    const w = window.open('', '_blank');
    w.document.write(`
      <html>
      <head>
        <title>طلب تحويل طالب</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; padding: 40px; }
          .header { text-align: center; margin-bottom: 40px; }
          .title { font-size: 20px; font-weight: bold; text-decoration: underline; }
          .content { font-size: 16px; line-height: 2; margin-top: 30px; }
          .signature { margin-top: 60px; display: flex; justify-content: space-between; }
          .footer { text-align: center; margin-top: 100px; font-size: 12px; color: #777; }
        </style>
      </head>
      <body onload="window.print()">
        <div class="header">
          <h2>جمهورية مصر العربية</h2>
          <h3>إدارة التعليمية</h3>
          <h3>مدرستنا الرسمية</h3>
        </div>
        <div class="header">
          <span class="title">طلب تحويل طالب صادر</span>
        </div>
        <div class="content">
          بناءً على الطلب المقدم من ولي أمر الطالب/الطالبة: <strong>${p.studentName || p.full_name_ar}</strong><br/>
          الرقم القومي: <strong>${p.nationalId || '—'}</strong> | كود الطالب: <strong>${p.studentCode || '—'}</strong><br/>
          نفيدكم علماً بأنه تمت الموافقة على تحويل الطالب إلى مدرسة: <strong>${p.to_school || p.schoolName}</strong><br/>
          التابعة لإدارة: <strong>${p.to_directorate || p.directorate || '—'}</strong><br/>
          وذلك بسبب: <strong>${p.reason}</strong><br/>
          تاريخ الموافقة والتحويل: <strong>${p.transfer_date || p.date}</strong>
        </div>
        <div class="signature">
          <div>شئون الطلاب<br/>التوقيع: ....................</div>
          <div>مدير المدرسة<br/>التوقيع والختم: ....................</div>
        </div>
        <div class="footer">طبع من نظام نبراس برو v2.0</div>
      </body>
      </html>
    `);
    w.document.close();
  };

  const filteredStages = formOpts.stages?.filter(s => !inForm.sectionId || String(s.section_id) === inForm.sectionId) || [];
  const filteredGrades = formOpts.grades?.filter(g => !inForm.stageId || String(g.stage_id) === inForm.stageId) || [];

  return (
    <div className="students-module">
      {/* Header */}
      <div className="page-header">
        <div className="page-title-area">
          <button className="import-back-btn" onClick={onBack}>
            <ArrowLeft size={16} /> العودة للطلاب
          </button>
          <div className="page-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <ArrowLeftRight size={22} />
          </div>
          <div>
            <h1 className="page-title">إدارة تحويلات الطلاب</h1>
            <p className="page-sub">تسجيل وطباعة التحويلات الصادرة والواردة وتعديل بيانات المحولين</p>
          </div>
        </div>
      </div>

      {error   && <div className="form-alert error"   style={{ marginBottom: 12 }}><AlertCircle size={15} /> {error}</div>}
      {success && <div className="form-alert success" style={{ marginBottom: 12 }}><CheckCircle2 size={15} /> {success}</div>}

      {/* Tabs */}
      <div className="students-tabs" style={{ marginBottom: 16 }}>
        <button className={`tab-btn ${activeTab === 'out' ? 'active' : ''}`} onClick={() => setActiveTab('out')}>
          ⬆️ تسجيل تحويل خارج المدرسة (صادر)
        </button>
        <button className={`tab-btn ${activeTab === 'in' ? 'active' : ''}`} onClick={() => setActiveTab('in')}>
          ⬇️ التحويلات والطلبة الواردين
        </button>
      </div>

      {/* ── Tab: Outgoing (Transfer Out) ── */}
      {activeTab === 'out' && (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, alignItems: 'start' }}>
          {/* Transfer Form */}
          <form className="glass-panel" style={{ padding: 16, borderRadius: 12 }} onSubmit={handleTransferOutSubmit}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
              تسجيل تحويل جديد
            </h3>
            
            <div className="form-group">
              <label className="field-label">اختر الطالب من المدرسة *</label>
              <select className="form-control" value={outForm.studentId} onChange={e => setOutForm(f => ({ ...f, studentId: e.target.value }))} required>
                <option value="">-- ابحث واختر الطالب --</option>
                {studentsList.filter(s => s.status !== 'suspended').map(s => (
                  <option key={s.id} value={s.id}>{s.full_name_ar} (كود: {s.student_code})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="field-label">المدرسة المحول إليها *</label>
              <input type="text" className="form-control" value={outForm.toSchool} onChange={e => setOutForm(f => ({ ...f, toSchool: e.target.value }))} placeholder="اسم المدرسة البديلة..." required />
            </div>

            <div className="form-group">
              <label className="field-label">الإدارة التعليمية المحول إليها</label>
              <input type="text" className="form-control" value={outForm.toDirectorate} onChange={e => setOutForm(f => ({ ...f, toDirectorate: e.target.value }))} placeholder="الإدارة..." />
            </div>

            <div className="form-group">
              <label className="field-label">سبب التحويل *</label>
              <input type="text" className="form-control" value={outForm.reason} onChange={e => setOutForm(f => ({ ...f, reason: e.target.value }))} placeholder="مثال: نقل السكن، رغبة ولي الأمر..." required />
            </div>

            <div className="form-group">
              <label className="field-label">تاريخ التحويل *</label>
              <input type="date" className="form-control" value={outForm.transferDate} onChange={e => setOutForm(f => ({ ...f, transferDate: e.target.value }))} required />
            </div>

            <div className="form-group">
              <label className="field-label">ملاحظات إضافية</label>
              <textarea className="form-control" value={outForm.notes} onChange={e => setOutForm(f => ({ ...f, notes: e.target.value }))} placeholder="ملاحظات..." rows={2} />
            </div>

            <button type="submit" className="btn-add-student" style={{ width: '100%', background: '#f59e0b', borderColor: '#f59e0b', justifyContent: 'center' }} disabled={actionLoading}>
              {actionLoading ? <Loader2 size={16} className="spin" /> : <ArrowLeftRight size={16} />}
              <span>تسجيل التحويل والطباعة</span>
            </button>
          </form>

          {/* Transfers list Table */}
          <div className="table-container glass-panel">
            <h3 style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, margin: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              سجل التحويلات الصادرة
            </h3>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={24} className="spin" /></div>
            ) : transfers.filter(t => t.transfer_type === 'out').length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>لا توجد تحويلات صادرة مسجلة حالياً.</div>
            ) : (
              <div className="table-scroll">
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>اسم الطالب</th>
                      <th>المدرسة المستهدفة</th>
                      <th>الإدارة</th>
                      <th>تاريخ التحويل</th>
                      <th>سبب التحويل</th>
                      <th>طباعة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.filter(t => t.transfer_type === 'out').map(t => (
                      <tr key={t.id} className="table-row">
                        <td style={{ fontWeight: 600 }}>{t.full_name_ar}</td>
                        <td>{t.to_school}</td>
                        <td>{t.to_directorate || '—'}</td>
                        <td>{t.transfer_date}</td>
                        <td>{t.reason}</td>
                        <td>
                          <button className="btn-grid-action edit" onClick={() => handlePrint(t)} title="طباعة النموذج">
                            <Printer size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Incoming (Transfer In) ── */}
      {activeTab === 'in' && (
        <div>
          {/* Actions panel */}
          <div className="filter-panel glass-panel" style={{ marginBottom: 16, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>التحويلات الواردة المقيدة في المدرسة</span>
            <button className="btn-add-student" style={{ background: '#10b981', borderColor: '#10b981' }} onClick={() => setShowAddInModal(true)}>
              <Plus size={16} /> تسجيل طالب محول (وارد)
            </button>
          </div>

          {/* Incoming transfers list */}
          <div className="table-container glass-panel">
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={24} className="spin" /></div>
            ) : transfers.filter(t => t.transfer_type === 'in').length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>لا توجد تحويلات واردة مسجلة.</div>
            ) : (
              <div className="table-scroll">
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>اسم الطالب</th>
                      <th>المدرسة المحول منها</th>
                      <th>الصف الملحق به</th>
                      <th>تاريخ التحويل</th>
                      <th>سبب التحويل</th>
                      <th>تعديل البيانات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.filter(t => t.transfer_type === 'in').map(t => (
                      <tr key={t.id} className="table-row">
                        <td style={{ fontWeight: 600 }}>{t.full_name_ar}</td>
                        <td>{t.from_school}</td>
                        <td>{t.grade_name_ar || '—'}</td>
                        <td>{t.transfer_date}</td>
                        <td>{t.reason}</td>
                        <td>
                          <button className="btn-grid-action edit" onClick={() => setEditingStudentId(t.student_id)} title="تعديل بيانات الطالب">
                            <Edit size={13} /> تعديل الطالب
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Dialog: Print Preview Modal ── */}
      {printData && (
        <div className="modal-overlay" onClick={() => setPrintData(null)}>
          <div className="modal-card glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16 }}>🖨️ طباعة طلب التحويل</h3>
              <button className="modal-close" onClick={() => setPrintData(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 20, textAlign: 'center' }}>
              <FileText size={48} style={{ color: '#f59e0b', marginBottom: 12 }} />
              <p>تم تسجيل تحويل الطالب <strong>{printData.studentName}</strong> بنجاح.</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>اضغط على زر الطباعة للحصول على النسخة الورقية المعتمدة.</p>
            </div>
            <div className="modal-footer" style={{ padding: '12px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button className="btn-cancel" onClick={() => setPrintData(null)}>إغلاق</button>
              <button className="btn-save" style={{ background: '#f59e0b' }} onClick={() => { handlePrint(printData); setPrintData(null); }}>
                <Printer size={15} /> طباعة الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dialog: Add Incoming Student Modal ── */}
      {showAddInModal && (
        <div className="modal-overlay" onClick={() => setShowAddInModal(false)}>
          <div className="modal-card glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>⬇️ تسجيل طالب محول وارد جديد</h3>
              <button className="modal-close" onClick={() => setShowAddInModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleTransferInSubmit}>
              <div className="modal-body" style={{ padding: 20, maxHeight: '420px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                
                <div className="form-group col-span-2">
                  <label className="field-label">اسم الطالب بالكامل *</label>
                  <input type="text" className="form-control" value={inForm.fullNameAr} onChange={e => setInForm(f => ({ ...f, fullNameAr: e.target.value }))} placeholder="الاسم باللغة العربية..." required />
                </div>

                <div className="form-group">
                  <label className="field-label">الرقم القومي (14 رقم)</label>
                  <input type="text" className="form-control" value={inForm.nationalId} onChange={e => setInForm(f => ({ ...f, nationalId: e.target.value }))} placeholder="الرقم القومي..." maxLength={14} />
                </div>

                <div className="form-group">
                  <label className="field-label">الجنس</label>
                  <select className="form-control" value={inForm.gender} onChange={e => setInForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="field-label">القسم *</label>
                  <select className="form-control" value={inForm.sectionId} onChange={e => setInForm(f => ({ ...f, sectionId: e.target.value, stageId: '', gradeId: '' }))} required>
                    <option value="">-- اختر --</option>
                    {formOpts.sections?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="field-label">المرحلة *</label>
                  <select className="form-control" value={inForm.stageId} onChange={e => setInForm(f => ({ ...f, stageId: e.target.value, gradeId: '' }))} disabled={!inForm.sectionId} required>
                    <option value="">-- اختر --</option>
                    {filteredStages.map(s => <option key={s.id} value={s.id}>{s.stage_name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="field-label">الصف الدراسي *</label>
                  <select className="form-control" value={inForm.gradeId} onChange={e => setInForm(f => ({ ...f, gradeId: e.target.value }))} disabled={!inForm.stageId} required>
                    <option value="">-- اختر --</option>
                    {filteredGrades.map(g => <option key={g.id} value={g.id}>{g.grade_name_ar}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="field-label">المدرسة المحول منها *</label>
                  <input type="text" className="form-control" value={inForm.fromSchool} onChange={e => setInForm(f => ({ ...f, fromSchool: e.target.value }))} placeholder="المدرسة السابقة..." required />
                </div>

                <div className="form-group">
                  <label className="field-label">الإدارة التعليمية المحول منها</label>
                  <input type="text" className="form-control" value={inForm.fromDirectorate} onChange={e => setInForm(f => ({ ...f, fromDirectorate: e.target.value }))} placeholder="إدارة..." />
                </div>

                <div className="form-group">
                  <label className="field-label">سبب التحويل *</label>
                  <input type="text" className="form-control" value={inForm.reason} onChange={e => setInForm(f => ({ ...f, reason: e.target.value }))} placeholder="السبب..." required />
                </div>

                <div className="form-group">
                  <label className="field-label">تاريخ التحويل *</label>
                  <input type="date" className="form-control" value={inForm.transferDate} onChange={e => setInForm(f => ({ ...f, transferDate: e.target.value }))} required />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '12px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowAddInModal(false)}>إلغاء</button>
                <button type="submit" className="btn-save" style={{ background: '#10b981' }} disabled={actionLoading}>
                  {actionLoading ? <Loader2 size={15} className="spin" /> : <Save size={15} />} حفظ وتسجيل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Dialog: Full Student Editor Modal ── */}
      {editingStudentId && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-card glass-panel" style={{ maxWidth: '90%', width: '1000px', height: '90%' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16 }}>📝 استكمال وتعديل بيانات الطالب المحول</h3>
              <button className="modal-close" onClick={() => setEditingStudentId(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 0, height: 'calc(100% - 110px)', overflowY: 'auto' }}>
              <StudentForm
                studentId={editingStudentId}
                onSaved={() => {
                  setEditingStudentId(null);
                  loadTransfers();
                  setSuccess('✅ تم حفظ بيانات الطالب بالكامل بنجاح.');
                }}
                onCancel={() => setEditingStudentId(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
