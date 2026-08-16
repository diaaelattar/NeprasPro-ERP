import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeftRight, Search, Plus, Printer, Edit, Trash2,
  CheckCircle2, AlertCircle, Loader2, Save, FileText, ArrowLeft, FilePlus,
  Check, RotateCcw, Eye, ShieldAlert, UserX, UserCheck, X, FileSpreadsheet
} from 'lucide-react';
import TransferForm from './TransferForm';
import TransferPrintModal from './TransferPrintModal';
import TransfersStatementPrintModal from './TransfersStatementPrintModal';
import StudentForm from './StudentForm';
import { EGYPTIAN_DIRECTORATES } from '../../data/egyptianDirectorates';
import { parseEgyptianNationalId, GUARDIAN_RELATIONS } from '../../constants/lookupOptions';
import API_BASE_URL from '../../config/api';

const API = API_BASE_URL;

export default function StudentTransfersPage({ onBack, activeSectionId }) {
  const [activeTab, setActiveTab]         = useState('out'); // 'out' | 'history' | 'in'
  const [transfers, setTransfers]         = useState([]);
  const [institution, setInstitution]     = useState(null);
  const [studentsList, setStudentsList]   = useState([]);
  const [formOpts, setFormOpts]           = useState({ sections: [], stages: [], grades: [], academicYears: [], guardianRelations: [] });
  const [loading, setLoading]             = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState('');
  const [searchFilter, setSearchFilter]   = useState('');
  
  // Modal states
  const [showAddInModal, setShowAddInModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [selectedPrintTransfer, setSelectedPrintTransfer] = useState(null);
  const [printStatementType, setPrintStatementType] = useState(null); // 'out' | 'in' | null

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

  // Form for Transfer In (Rich & Complete)
  const [inForm, setInForm] = useState({
    fullNameAr: '',
    nationalId: '',
    gender: 'ذكر',
    birthDate: '',
    birthPlace: '',
    religion: 'مسلم',
    sectionId: '',
    stageId: '',
    gradeId: '',
    academicYearId: '',
    fromGovernorate: '',
    fromAdministration: '',
    fromSchool: '',
    guardianName: '',
    guardianRelation: 'أب',
    guardianPhone: '',
    feesStatus: 'سدد',
    booksStatus: 'استلم',
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

    fetch(`${API}/settings/institution`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.institution) {
          setInstitution({
            schoolName: d.institution.school_name || d.institution.schoolName || '',
            governorate: d.institution.governorate || '',
            directorate: d.institution.directorate || '',
            logoUrl: d.institution.logo_url || d.institution.logoUrl || null
          });
        }
      })
      .catch(() => {});
  }, []);

  // Load students for Transfer Out search
  const loadStudents = useCallback(() => {
    fetch(`${API}/students?limit=500`).then(r => r.json()).then(d => {
      if (d.success) setStudentsList(d.students || []);
    });
  }, []);

  // Load transfers list (We fetch student_transfers joined with students and institution)
  const loadTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/students/transfers/list`);
      const data = await res.json();
      if (data.success) {
        setTransfers(data.transfers || []);
        if (data.institution) setInstitution(data.institution);
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

  // Complete Transfer (تأكيد التحويل ونقل الطالب من سجل القيد)
  const handleCompleteTransfer = async (transferId, studentName) => {
    if (!window.confirm(`هل أنت متأكد من تأكيد التحويل وترحيل الطالب (${studentName}) وإخراجه من سجل القيد النشط وقوائم الفصول؟`)) return;
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/students/transfers/${transferId}/complete`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تأكيد التحويل.');
      setSuccess(`✅ تم اعتماد التحويل وترحيل الطالب (${studentName}) من سجل القيد بنجاح.`);
      loadTransfers();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel Transfer (إلغاء التحويل وإعادة الطالب لسجل القيد مرة أخرى)
  const handleCancelTransfer = async (transferId, studentName) => {
    if (!window.confirm(`هل تريد إلغاء التحويل وإعادة الطالب (${studentName}) لسجل القيد النشط بالمدرسة؟`)) return;
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/students/transfers/${transferId}/cancel`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إلغاء التحويل.');
      setSuccess(`✅ تم إلغاء التحويل وإعادة الطالب (${studentName}) لسجل القيد بنجاح.`);
      loadTransfers();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Transfer Record
  const handleDeleteTransfer = async (transferId) => {
    if (!window.confirm('هل تريد حذف سجل طلب التحويل هذا؟')) return;
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/students/transfers/${transferId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف السجل.');
      setSuccess('تم حذف السجل بنجاح.');
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
      const parts = inForm.fullNameAr.trim().split(/\s+/);
      const computedGuardianName = inForm.guardianName || parts.slice(1).join(' ') || inForm.fullNameAr;
      const combinedFromDirectorate = [inForm.fromGovernorate, inForm.fromAdministration].filter(Boolean).join(' - ');

      // 1. Create student first with rich data & special case flags
      const studRes = await fetch(`${API}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullNameAr: inForm.fullNameAr,
          firstName: parts[0] || '',
          fatherName: parts[1] || '',
          gFatherName: parts[2] || '',
          familyName: parts.slice(3).join(' ') || '',
          nationalId: inForm.nationalId || null,
          gender: inForm.gender,
          birthDate: inForm.birthDate || null,
          birthPlace: inForm.birthPlace || inForm.fromGovernorate || null,
          religion: inForm.religion,
          sectionId: inForm.sectionId,
          stageId: inForm.stageId,
          gradeId: inForm.gradeId,
          academicYearId: inForm.academicYearId,
          guardianName: computedGuardianName,
          guardianRelation: inForm.guardianRelation || 'أب',
          guardianPhone: inForm.guardianPhone || '00000000000',
          status: 'promoted',
          isTransferred: true,
          transferredFromSchool: inForm.fromSchool,
          transferredFromDirectorate: combinedFromDirectorate,
          transferredFromGovernorate: inForm.fromGovernorate,
          specialCases: []
        })
      });
      const studData = await studRes.json();
      if (!studRes.ok) throw new Error(studData.error);

      // 2. Insert into student_transfers table
      const transRes = await fetch(`${API}/students/${studData.studentId}/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transferType: 'in',
          fromSchool: inForm.fromSchool,
          fromDirectorate: combinedFromDirectorate,
          fromGradeId: inForm.gradeId,
          toGradeId: inForm.gradeId,
          reason: inForm.reason,
          transferDate: inForm.transferDate,
          academicYearId: parseInt(inForm.academicYearId),
          feesStatus: inForm.feesStatus || 'سدد',
          booksStatus: inForm.booksStatus || 'استلم',
          guardianName: computedGuardianName,
          guardianPhone: inForm.guardianPhone,
          notes: inForm.notes
        })
      });
      if (!transRes.ok) throw new Error('فشل تسجيل التحويل لكن تم تسجيل الطالب.');

      setSuccess('✅ تم تسجيل الطالب المحول والتحويل بنجاح وإدراجه في السجلات.');
      setShowAddInModal(false);
      
      // Auto open full student editor modal to edit details
      setEditingStudentId(studData.studentId);
      
      setInForm(f => ({
        ...f,
        fullNameAr: '', nationalId: '', birthDate: '', birthPlace: '',
        fromSchool: '', fromGovernorate: '', fromAdministration: '',
        guardianName: '', guardianPhone: '', reason: '', notes: ''
      }));
      loadTransfers();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredStages = formOpts.stages || [];
  const filteredGrades = inForm.stageId ? (formOpts.grades?.filter(g => String(g.stage_id) === String(inForm.stageId)) || []) : [];

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
      <div className="form-tabs" style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <button
          className={`form-tab ${activeTab === 'out' ? 'active' : ''}`}
          onClick={() => setActiveTab('out')}
          style={activeTab === 'out' ? { background: '#0284c7', color: '#fff', fontWeight: 800, borderColor: '#0284c7' } : { fontWeight: 700 }}
        >
          📝 تسجيل طلب نقل من المدرسة (صادر)
        </button>
        <button
          className={`form-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
          style={activeTab === 'history' ? { background: '#0284c7', color: '#fff', fontWeight: 800, borderColor: '#0284c7' } : { fontWeight: 700 }}
        >
          📑 سجل طلبات النقل والتحويلات المعتمدة ({transfers.filter(t => t.transfer_type === 'out').length})
        </button>
        <button
          className={`form-tab ${activeTab === 'in' ? 'active' : ''}`}
          onClick={() => setActiveTab('in')}
          style={activeTab === 'in' ? { background: '#0284c7', color: '#fff', fontWeight: 800, borderColor: '#0284c7' } : { fontWeight: 700 }}
        >
          ⬇️ التحويلات والطلبة الواردين
        </button>
      </div>

      {/* ── Tab: Ministry Transfer Form (تسجيل طلب نقل) ── */}
      {activeTab === 'out' && (
        <TransferForm
          onSaved={() => {
            loadTransfers();
            setSuccess('✅ تم تسجيل طلب النقل بنجاح وإدراجه في السجل.');
            setActiveTab('history');
          }}
        />
      )}

      {/* ── Tab: Outgoing History Table (سجل التحويلات الصادرة) ── */}
      {activeTab === 'history' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', borderRadius: 14 }}>
          
          {/* Header & Search Toolbar */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📑</span> سجل طلبات النقل والتحويلات الصادرة من المدرسة ({transfers.filter(t => t.transfer_type === 'out').length})
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '3px 0 0' }}>
                يمكنك طباعة طلب النقل (نسختين)، تأكيد الترحيل من سجل القيد النشط، أو إلغاء التحويل وإعادة الطالب في أي وقت
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div className="search-box" style={{ width: 240 }}>
                <Search size={14} className="search-icon" />
                <input
                  className="search-input"
                  style={{ padding: '7px 32px 7px 10px', fontSize: 12 }}
                  placeholder="بحث باسم الطالب، المدرسة، الكود..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={() => setPrintStatementType('out')}
                style={{
                  background: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '7px 14px',
                  fontSize: 12.5,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(2,132,199,0.3)'
                }}
              >
                <Printer size={15} /> طباعة كشف التحويلات الصادرة
              </button>

              <button className="btn-primary" onClick={() => setActiveTab('out')} style={{ padding: '7px 16px', fontSize: 12.5, fontWeight: 800, gap: 6 }}>
                <Plus size={15} /> تسجيل طلب نقل جديد
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 50 }}><Loader2 size={28} className="spin" /></div>
          ) : transfers.filter(t => t.transfer_type === 'out').length === 0 ? (
            <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-secondary)' }}>
              <FileText size={36} style={{ opacity: 0.4, marginBottom: 8 }} />
              <div>لا توجد طلبات نقل صادرة مسجلة حالياً.</div>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>الطالب</th>
                    <th>الصف والفصل</th>
                    <th>المدرسة والإدارة المحول إليها</th>
                    <th>تاريخ وسبب النقل</th>
                    <th>حالة التحويل وسجل القيد</th>
                    <th style={{ textAlign: 'center' }}>الإجراءات والطباعة</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers
                    .filter(t => t.transfer_type === 'out')
                    .filter(t => !searchFilter || t.full_name_ar?.includes(searchFilter) || t.student_code?.includes(searchFilter) || t.to_school?.includes(searchFilter) || t.national_id?.includes(searchFilter))
                    .map(t => {
                      const isDone = t.is_completed === 1;
                      return (
                        <tr key={t.id} className="table-row" style={{ background: isDone ? 'rgba(239, 68, 68, 0.02)' : 'inherit' }}>
                          
                          {/* Student Info */}
                          <td>
                            <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--text-primary)' }}>{t.full_name_ar}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 10, marginTop: 2 }}>
                              <span>القومي: <strong style={{ fontFamily: 'monospace' }}>{t.national_id || '—'}</strong></span>
                              <span>كود: <strong>{t.student_code || '—'}</strong></span>
                            </div>
                          </td>

                          {/* Grade & Class */}
                          <td>
                            <div style={{ fontWeight: 700, fontSize: 12.5 }}>{t.grade_name_ar || '—'}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                              فصل: {t.class_name ? `فصل ${t.class_name}` : 'غير مسكن'}
                            </div>
                          </td>

                          {/* Destination */}
                          <td>
                            <div style={{ fontWeight: 800, fontSize: 13, color: '#0369a1' }}>🏫 {t.to_school}</div>
                            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                              {t.to_directorate || '—'}
                            </div>
                          </td>

                          {/* Date & Reason */}
                          <td>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>📅 {t.transfer_date}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.reason || '—'}
                            </div>
                          </td>

                          {/* Status */}
                          <td>
                            {isDone ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 10px',
                                borderRadius: 12,
                                fontSize: 11.5,
                                fontWeight: 800,
                                background: '#fef2f2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca'
                              }}>
                                <UserX size={13} /> تم الترحيل من القيد
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 10px',
                                borderRadius: 12,
                                fontSize: 11.5,
                                fontWeight: 800,
                                background: '#fefce8',
                                color: '#a16207',
                                border: '1px solid #fef08a'
                              }}>
                                ⏳ قيد الموافقة (مسودة)
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                              
                              {/* Print 2-Copy Landscape Button */}
                              <button
                                className="btn-primary"
                                onClick={() => setSelectedPrintTransfer(t)}
                                title="طباعة طلب التحويل الرسمي (نسختين A4 بالعرض)"
                                style={{
                                  padding: '5px 10px',
                                  fontSize: 11.5,
                                  fontWeight: 800,
                                  gap: 5,
                                  background: '#0284c7'
                                }}
                              >
                                <Printer size={13} /> طباعة نسختين
                              </button>

                              {/* Complete Transfer / Cancel Transfer */}
                              {!isDone ? (
                                <button
                                  onClick={() => handleCompleteTransfer(t.id, t.full_name_ar)}
                                  title="تأكيد التحويل ونقل الطالب من سجل القيد النشط"
                                  disabled={actionLoading}
                                  style={{
                                    padding: '5px 10px',
                                    fontSize: 11.5,
                                    fontWeight: 800,
                                    gap: 5,
                                    background: '#16a34a',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <UserX size={13} /> ترحيل من القيد
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleCancelTransfer(t.id, t.full_name_ar)}
                                  title="إلغاء التحويل وإعادة الطالب لسجل القيد النشط بالمدرسة"
                                  disabled={actionLoading}
                                  style={{
                                    padding: '5px 10px',
                                    fontSize: 11.5,
                                    fontWeight: 800,
                                    gap: 5,
                                    background: '#f97316',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <RotateCcw size={13} /> إرجاع للقيد
                                </button>
                              )}

                              {/* Delete Record */}
                              <button
                                className="btn-icon"
                                onClick={() => handleDeleteTransfer(t.id)}
                                title="حذف السجل"
                                style={{ color: '#ef4444', padding: 5 }}
                              >
                                <Trash2 size={14} />
                              </button>

                            </div>
                          </td>

                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Incoming (Transfer In) ── */}
      {activeTab === 'in' && (
        <div>
          {/* Actions panel */}
          <div className="filter-panel glass-panel" style={{ marginBottom: 16, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              📥 سجل التحويلات الواردة المقيدة في المدرسة ({transfers.filter(t => t.transfer_type === 'in').length})
            </span>
            
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setPrintStatementType('in')}
                style={{
                  background: '#059669',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '7px 14px',
                  fontSize: 12.5,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(5,150,105,0.3)'
                }}
              >
                <Printer size={15} /> طباعة كشف التحويلات الواردة
              </button>

              <button className="btn-add-student" style={{ background: '#10b981', borderColor: '#10b981' }} onClick={() => setShowAddInModal(true)}>
                <Plus size={16} /> تسجيل طالب محول (وارد)
              </button>
            </div>
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
                      <th>المدرسة والإدارة المحول منها</th>
                      <th>الصف الملحق به</th>
                      <th>سداد المصروفات</th>
                      <th>استلام الكتب</th>
                      <th>تاريخ التحويل</th>
                      <th>سبب التحويل</th>
                      <th>تعديل البيانات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.filter(t => t.transfer_type === 'in').map(t => (
                      <tr key={t.id} className="table-row">
                        <td style={{ fontWeight: 700 }}>
                          <div>{t.full_name_ar}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            قومي: <span style={{ fontFamily: 'monospace' }}>{t.national_id || '—'}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{t.from_school}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.from_directorate || ''}</div>
                        </td>
                        <td>{t.grade_name_ar || '—'}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: t.fees_status === 'لم يسدد' ? '#ef4444' : '#10b981' }}>
                            {t.fees_status || 'سدد'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: t.books_status === 'لم يستلم' ? '#ef4444' : '#10b981' }}>
                            {t.books_status || 'استلم'}
                          </span>
                        </td>
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

      {/* ── Dialog: Add Incoming Student Modal ── */}
      {showAddInModal && (() => {
        const selectedGovObj = EGYPTIAN_DIRECTORATES.find(d => d.name === inForm.fromGovernorate);
        const availableEdarat = selectedGovObj?.edarat || [];

        return (
          <div className="modal-overlay" onClick={() => setShowAddInModal(false)}>
            <div className="modal-card glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 740, width: '92%' }}>
              <div className="modal-header">
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>⬇️ تسجيل طالب محول وارد جديد</h3>
                <button className="modal-close" onClick={() => setShowAddInModal(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleTransferInSubmit}>
                <div className="modal-body" style={{ padding: 20, maxHeight: '480px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  
                  {/* 1. National ID with Auto Extraction */}
                  <div className="form-group col-span-1">
                    <label className="field-label">الرقم القومي (14 رقم) — يستخرج البيانات والمحافظة تلقائياً</label>
                    <input
                      type="text"
                      className="form-control"
                      value={inForm.nationalId}
                      onChange={e => {
                        const val = e.target.value;
                        const parsed = parseEgyptianNationalId(val);
                        setInForm(f => ({
                          ...f,
                          nationalId: val,
                          birthDate: parsed?.birthDate || f.birthDate,
                          gender: parsed?.gender || f.gender,
                          birthPlace: parsed?.birthPlace || f.birthPlace,
                          fromGovernorate: f.fromGovernorate || (parsed?.birthPlace && parsed.birthPlace !== 'أخرى' ? parsed.birthPlace : f.fromGovernorate)
                        }));
                      }}
                      placeholder="30101..."
                      maxLength={14}
                      dir="ltr"
                    />
                  </div>

                  {/* 2. Full Name with Auto Guardian extraction */}
                  <div className="form-group col-span-1">
                    <label className="field-label">اسم الطالب رباعياً باللغة العربية <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={inForm.fullNameAr}
                      onChange={e => {
                        const val = e.target.value;
                        const parts = val.trim().split(/\s+/);
                        const gName = parts.slice(1).join(' ');
                        setInForm(f => ({
                          ...f,
                          fullNameAr: val,
                          guardianName: (!f.guardianName || f.guardianName === parts.slice(1, -1).join(' ')) ? gName : f.guardianName
                        }));
                      }}
                      placeholder="الاسم الرباعي الكامل..."
                      required
                    />
                  </div>

                  {/* 3. Birth Date & Birth Place */}
                  <div className="form-group">
                    <label className="field-label">تاريخ الميلاد</label>
                    <input
                      type="date"
                      className="form-control"
                      value={inForm.birthDate}
                      onChange={e => setInForm(f => ({ ...f, birthDate: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="field-label">محل الميلاد (المحافظة المستخرجة)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={inForm.birthPlace}
                      onChange={e => setInForm(f => ({ ...f, birthPlace: e.target.value }))}
                      placeholder="محافظة الميلاد..."
                    />
                  </div>

                  {/* 4. Gender & Religion */}
                  <div className="form-group">
                    <label className="field-label">النوع</label>
                    <select className="form-control" value={inForm.gender} onChange={e => setInForm(f => ({ ...f, gender: e.target.value }))}>
                      <option value="ذكر">ذكر</option>
                      <option value="أنثى">أنثى</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="field-label">الديانة</label>
                    <select className="form-control" value={inForm.religion} onChange={e => setInForm(f => ({ ...f, religion: e.target.value }))}>
                      <option value="مسلم">مسلم</option>
                      <option value="مسيحي">مسيحي</option>
                    </select>
                  </div>

                  {/* 5. Guardian Info */}
                  <div className="form-group">
                    <label className="field-label">اسم ولي الأمر</label>
                    <input
                      type="text"
                      className="form-control"
                      value={inForm.guardianName}
                      onChange={e => setInForm(f => ({ ...f, guardianName: e.target.value }))}
                      placeholder="اسم ولي الأمر..."
                    />
                  </div>

                  <div className="form-group">
                    <label className="field-label">صفة ولي الأمر</label>
                    <select
                      className="form-control"
                      value={inForm.guardianRelation || 'أب'}
                      onChange={e => setInForm(f => ({ ...f, guardianRelation: e.target.value }))}
                    >
                      {formOpts.guardianRelations && formOpts.guardianRelations.length > 0 ? (
                        formOpts.guardianRelations.map(gr => (
                          <option key={gr.id} value={gr.name_ar || gr.name}>{gr.name_ar || gr.name}</option>
                        ))
                      ) : (
                        GUARDIAN_RELATIONS.map(r => (
                          <option key={r.id || r.name} value={r.name || r}>{r.label || r.name || r}</option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="field-label">هاتف ولي الأمر</label>
                    <input
                      type="text"
                      className="form-control"
                      dir="ltr"
                      value={inForm.guardianPhone}
                      onChange={e => setInForm(f => ({ ...f, guardianPhone: e.target.value }))}
                      placeholder="01xxxxxxxxx"
                    />
                  </div>

                  {/* 6. Academic Placement */}
                  <div className="form-group">
                    <label className="field-label">القسم <span style={{ color: '#ef4444' }}>*</span></label>
                    <select className="form-control" value={inForm.sectionId} onChange={e => setInForm(f => ({ ...f, sectionId: e.target.value, stageId: '', gradeId: '' }))} required>
                      <option value="">-- اختر القسم --</option>
                      {formOpts.sections?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="field-label">المرحلة التعليمية <span style={{ color: '#ef4444' }}>*</span></label>
                    <select className="form-control" value={inForm.stageId} onChange={e => setInForm(f => ({ ...f, stageId: e.target.value, gradeId: '' }))} required>
                      <option value="">-- اختر المرحلة --</option>
                      {filteredStages.map(s => <option key={s.id} value={s.id}>{s.stage_name_ar || s.stage_name || s.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="field-label">الصف الدراسي <span style={{ color: '#ef4444' }}>*</span></label>
                    <select className="form-control" value={inForm.gradeId} onChange={e => setInForm(f => ({ ...f, gradeId: e.target.value }))} disabled={!inForm.stageId} required>
                      <option value="">{inForm.stageId ? '-- اختر الصف --' : '-- اختر المرحلة أولاً --'}</option>
                      {filteredGrades.map(g => <option key={g.id} value={g.id}>{g.grade_name_ar || g.name}</option>)}
                    </select>
                  </div>

                  {/* 7. Cascading Transfer Source (Governorate, Administration, School) */}
                  <div className="form-group">
                    <label className="field-label">المحافظة / المديرية المحول منها</label>
                    <select
                      className="form-control"
                      value={inForm.fromGovernorate}
                      onChange={e => setInForm(f => ({ ...f, fromGovernorate: e.target.value, fromAdministration: '' }))}
                    >
                      <option value="">-- اختر المحافظة --</option>
                      {EGYPTIAN_DIRECTORATES.map(dir => (
                        <option key={dir.id} value={dir.name}>{dir.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="field-label">الإدارة التعليمية المحول منها</label>
                    {availableEdarat.length > 0 ? (
                      <select
                        className="form-control"
                        value={inForm.fromAdministration}
                        onChange={e => setInForm(f => ({ ...f, fromAdministration: e.target.value }))}
                      >
                        <option value="">-- اختر الإدارة --</option>
                        {availableEdarat.map(ed => (
                          <option key={ed.id} value={ed.name}>{ed.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="form-control"
                        value={inForm.fromAdministration}
                        onChange={e => setInForm(f => ({ ...f, fromAdministration: e.target.value }))}
                        placeholder="اسم الإدارة التعليمية..."
                      />
                    )}
                  </div>

                  <div className="form-group col-span-2">
                    <label className="field-label">المدرسة المحول منها <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={inForm.fromSchool}
                      onChange={e => setInForm(f => ({ ...f, fromSchool: e.target.value }))}
                      placeholder="اسم المدرسة السابقة..."
                      required
                    />
                  </div>

                  {/* 8. Fees & Books Status */}
                  <div className="form-group">
                    <label className="field-label">💳 سداد المصروفات</label>
                    <select className="form-control" value={inForm.feesStatus} onChange={e => setInForm(f => ({ ...f, feesStatus: e.target.value }))}>
                      <option value="سدد">سدد</option>
                      <option value="لم يسدد">لم يسدد</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="field-label">📚 استلام الكتب</label>
                    <select className="form-control" value={inForm.booksStatus} onChange={e => setInForm(f => ({ ...f, booksStatus: e.target.value }))}>
                      <option value="استلم">استلم</option>
                      <option value="لم يستلم">لم يستلم</option>
                    </select>
                  </div>

                  {/* 9. Reason & Date */}
                  <div className="form-group">
                    <label className="field-label">سبب التحويل <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="text" className="form-control" value={inForm.reason} onChange={e => setInForm(f => ({ ...f, reason: e.target.value }))} placeholder="نقل سكن / رغبة ولي الأمر..." required />
                  </div>

                  <div className="form-group">
                    <label className="field-label">تاريخ التحويل <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="date" className="form-control" value={inForm.transferDate} onChange={e => setInForm(f => ({ ...f, transferDate: e.target.value }))} required />
                  </div>
                </div>

                <div className="modal-footer" style={{ padding: '12px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <button type="button" className="btn-cancel" onClick={() => setShowAddInModal(false)}>إلغاء</button>
                  <button type="submit" className="btn-save" style={{ background: '#10b981' }} disabled={actionLoading}>
                    {actionLoading ? <Loader2 size={15} className="spin" /> : <Save size={15} />} حفظ وتسجيل الطالب المحول
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

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

      {/* ── Modal: 2-Copy Landscape Printable Transfer Document ── */}
      {selectedPrintTransfer && (
        <TransferPrintModal
          transfer={selectedPrintTransfer}
          institution={institution}
          onClose={() => setSelectedPrintTransfer(null)}
        />
      )}

      {/* ── Modal: Statements Printable Report (Separated by Grade) ── */}
      {printStatementType && (
        <TransfersStatementPrintModal
          transfers={transfers}
          transferType={printStatementType}
          institution={institution}
          academicYearLabel={formOpts.academicYears?.find(y => y.is_current === 1 || y.is_current === true)?.year_label || '2025/2026'}
          onClose={() => setPrintStatementType(null)}
        />
      )}

    </div>
  );
}
