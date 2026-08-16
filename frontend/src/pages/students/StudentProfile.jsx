import React, { useState, useEffect } from 'react';
import {
  ArrowRight, Edit2, FileText, AlertCircle, Hash, Plus, Printer,
  CheckCircle, Clock, AlertTriangle, Trash2, X, UploadCloud, Save, Loader2
} from 'lucide-react';
import TransferForm from './TransferForm';
import StudentDocPrintModal from './StudentDocPrintModal';
import API_BASE_URL from '../../config/api';

const API = API_BASE_URL;

const STATUS_CFG = {
  promoted:     { label: 'منقول',        color: '#10b981', bg: '#10b98122' },
  new:          { label: 'مستجد',        color: '#3b82f6', bg: '#3b82f622' },
  retained:     { label: 'باقٍ للإعادة', color: '#3b82f6', bg: '#3b82f622' },
  disconnected: { label: 'منقطع',        color: '#d97706', bg: '#d9770622' },
  suspended:    { label: 'موقوف قيده',   color: '#b45309', bg: '#b4530922' },
  excluded:     { label: 'مستبعد',       color: '#ef4444', bg: '#ef444422' },
  'منقول':      { label: 'منقول',        color: '#10b981', bg: '#10b98122' },
  'مستجد':      { label: 'مستجد',        color: '#3b82f6', bg: '#3b82f622' },
  'باق':        { label: 'باقٍ للإعادة', color: '#3b82f6', bg: '#3b82f622' },
  'منقطع':      { label: 'منقطع',        color: '#d97706', bg: '#d9770622' },
  'موقوف قيده': { label: 'موقوف قيده',   color: '#b45309', bg: '#b4530922' },
  'مستبعد':     { label: 'مستبعد',       color: '#ef4444', bg: '#ef444422' },
};

const TRACK_LABELS = {
  medicine_life:   'مسار الطب وعلوم الحياة',
  engineering_cs:  'مسار الهندسة وعلوم الحاسب',
  business:        'مسار الأعمال',
  arts_humanities: 'مسار الآداب والفنون',
  science_bio:     'علمي — علوم',
  science_math:    'علمي — رياضيات',
  literary:        'أدبي',
};

const InfoRow = ({ label, value, dir = 'rtl' }) => (
  value ? (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value" dir={dir}>{value}</span>
    </div>
  ) : null
);

/* ══════════════════════════════════════════════════════════
   المكوّن الرئيسي
   ══════════════════════════════════════════════════════════ */
export default function StudentProfile({ studentId, onEdit, onBack }) {
  const [data,            setData]            = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');
  const [activeSection,   setActiveSection]   = useState('personal');
  const [showTransferForm,setShowTransferForm] = useState(false);
  const [schoolInfo,      setSchoolInfo]      = useState({});
  const [currentYear,     setCurrentYear]     = useState('');
  const [absences,        setAbsences]        = useState([]);
  const [absLoading,      setAbsLoading]      = useState(false);
  const [printDoc,        setPrintDoc]        = useState(null);

  // Document Management States
  const [docTypes,           setDocTypes]           = useState([]);
  const [showAddDocModal,    setShowAddDocModal]    = useState(false);
  const [selectedDocTypeId,  setSelectedDocTypeId]  = useState('');
  const [customDocTypeName,  setCustomDocTypeName]  = useState('');
  const [docNotes,           setDocNotes]           = useState('');
  const [docFileName,        setDocFileName]        = useState('');
  const [savingDoc,          setSavingDoc]          = useState(false);
  const [docActionError,     setDocActionError]     = useState('');

  /* ── تحميل الطالب + المدرسة + الأعوام + أنواع الوثائق ── */
  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    Promise.all([
      fetch(`${API}/students/${studentId}`).then(r => r.json()),
      fetch(`${API}/settings/institution`).then(r => r.json()),
      fetch(`${API}/students/form-options`).then(r => r.json()),
      fetch(`${API}/students/document-types`).then(r => r.json()).catch(() => ({ success: false })),
    ]).then(([stuRes, instRes, optsRes, docTypesRes]) => {
      if (stuRes.success) setData(stuRes);
      else setError(stuRes.error || 'فشل تحميل بيانات الطالب');
      if (instRes.success && instRes.institution) setSchoolInfo(instRes.institution);
      if (optsRes.success) {
        const years = optsRes.academicYears || [];
        const cur = years.find(y => y.is_current === 1 || y.is_current === true) || years[0];
        if (cur) setCurrentYear(cur.year_label || '');
      }
      if (docTypesRes?.success && docTypesRes.types) {
        setDocTypes(docTypesRes.types);
      }
    })
    .catch(() => setError('تعذّر الاتصال بالخادم'))
    .finally(() => setLoading(false));
  }, [studentId]);

  /* ── تحميل سجل الإنذارات عند فتح تبويب الغياب ── */
  useEffect(() => {
    if (activeSection !== 'absence' || !studentId) return;
    setAbsLoading(true);
    fetch(`${API}/students/absence-warnings`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setAbsences((d.warnings || []).filter(w => String(w.student_id) === String(studentId)));
        }
      })
      .catch(() => {})
      .finally(() => setAbsLoading(false));
  }, [activeSection, studentId]);

  /* ── فتح مودال إثبات قيد ── */
  const handlePrintEnrollmentCert = () => {
    if (!data?.student) return;
    const s = data.student;
    const statusLabel = STATUS_CFG[s.enrollment_status]?.label || STATUS_CFG[s.status]?.label || '—';
    setPrintDoc({
      docType: 'enrollment_cert',
      title: 'إثبات قيد',
      formCode: 'SC-ENR-01',
      body: `
        <p>نُفيد بأن الطالب / الطالبة المبيّنة بياناته أعلاه مقيّد بسجلات هذه المدرسة
        للعام الدراسي <strong>${currentYear || '....../......'}</strong>
        بالصف <strong>${s.grade_name_ar || '—'}</strong>،
        وحالته القيدية حالياً: <strong>${statusLabel}</strong>.</p>
        <p>وقد أُعطيت له هذه الشهادة بناءً على طلبه لتقديمها إلى من يهمه الأمر.</p>
        <p style="margin-top:14px;font-weight:700;">وهذه الإفادة صادرة من إدارة المدرسة بالبيانات الرسمية المحفوظة بسجلاتها.</p>
      `,
    });
  };

  /* ── فتح مودال بيان الحالة الدراسية ── */
  const handlePrintStatusStatement = () => {
    if (!data?.student) return;
    const s = data.student;
    const statusLabel = STATUS_CFG[s.enrollment_status]?.label || STATUS_CFG[s.status]?.label || '—';
    setPrintDoc({
      docType: 'status_statement',
      title: 'بيان بالحالة الدراسية',
      formCode: 'SC-STS-02',
      body: `
        <p>يُفيد المسؤول المختص بأن الطالب / الطالبة المذكور اسمه أعلاه مقيّد بالمدرسة وحالته الدراسية كالتالي:</p>
        <ul style="margin:12px 30px;line-height:2.4;font-size:13.5px;">
          <li>الصف الدراسي: <strong>${s.grade_name_ar || '—'}</strong></li>
          <li>المرحلة: <strong>${s.stage_name || '—'}</strong></li>
          <li>القسم: <strong>${s.section_name || '—'}</strong></li>
          <li>العام الدراسي: <strong>${currentYear || '—'}</strong></li>
          <li>حالة القيد: <strong>${statusLabel}</strong></li>
          <li>اللغة الأجنبية الثانية: <strong>${s.second_language || '—'}</strong></li>
          ${s.secondary_track ? `<li>المسار الدراسي: <strong>${TRACK_LABELS[s.secondary_track] || s.secondary_track}</strong></li>` : ''}
        </ul>
        <p>وقد أُعطي هذا البيان بناءً على طلب ولي الأمر لتقديمه للجهات المختصة.</p>
      `,
    });
  };

  /* ── إضافة وثيقة جديدة للطالب ── */
  const handleSaveDocument = async (e) => {
    e.preventDefault();
    if (!selectedDocTypeId && !customDocTypeName) {
      setDocActionError('يرجى اختيار أو كتابة نوع الوثيقة');
      return;
    }

    try {
      setSavingDoc(true);
      setDocActionError('');
      const res = await fetch(`${API}/students/${studentId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_type_id: selectedDocTypeId || null,
          doc_type_name: customDocTypeName || null,
          file_name: docFileName || null,
          notes: docNotes || null
        })
      });

      const resJson = await res.json();
      if (!res.ok || !resJson.success) throw new Error(resJson.error || 'فشل حفظ الوثيقة');

      // Update documents in state
      setData(prev => ({
        ...prev,
        documents: resJson.documents || prev.documents
      }));

      // Reset modal form
      setShowAddDocModal(false);
      setSelectedDocTypeId('');
      setCustomDocTypeName('');
      setDocNotes('');
      setDocFileName('');
    } catch (err) {
      setDocActionError(err.message);
    } finally {
      setSavingDoc(false);
    }
  };

  /* ── حذف وثيقة ── */
  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الوثيقة؟')) return;
    try {
      const res = await fetch(`${API}/students/${studentId}/documents/${docId}`, {
        method: 'DELETE'
      });
      const resJson = await res.json();
      if (!res.ok || !resJson.success) throw new Error(resJson.error || 'فشل حذف الوثيقة');

      setData(prev => ({
        ...prev,
        documents: resJson.documents || prev.documents.filter(d => d.id !== docId)
      }));
    } catch (err) {
      alert('خطأ أثناء الحذف: ' + err.message);
    }
  };

  /* ── Loading / Error ── */
  if (loading) return (
    <div className="form-loading">
      <div className="loading-spinner" />
      <span>جاري تحميل ملف الطالب...</span>
    </div>
  );
  if (error) return (
    <div className="profile-error">
      <AlertCircle size={40} />
      <p>{error}</p>
      <button className="btn-cancel" onClick={onBack}>رجوع</button>
    </div>
  );
  if (!data) return null;

  const { student: s, specialCases, documents, transfers } = data;
  const statusCfg = STATUS_CFG[s.enrollment_status] || STATUS_CFG[s.status] || STATUS_CFG.promoted;

  const SECTIONS = [
    { id: 'personal',  label: 'البيانات الشخصية',   icon: '👤' },
    { id: 'family',    label: 'بيانات الأسرة',       icon: '👨‍👩‍👧' },
    { id: 'academic',  label: 'البيانات الأكاديمية', icon: '🎓' },
    { id: 'absence',   label: 'سجل الغياب',          icon: '📅' },
    { id: 'cases',     label: 'الحالات الخاصة',      icon: '⭐' },
    { id: 'transfers', label: 'التحويلات',           icon: '↔️' },
    { id: 'documents', label: 'الوثائق',             icon: '📄' },
  ];

  const maxAbsentDays = absences.reduce((m, a) => Math.max(m, a.total_absent_days || 0), 0);

  return (
    <>
    <div className="student-profile-page">

      {/* ── Profile Header ── */}
      <div className="profile-header-card glass-panel">
        <div className="profile-back">
          <button className="btn-back" onClick={onBack}><ArrowRight size={16} /> رجوع للقائمة</button>
        </div>
        <div className="profile-hero">
          <div className="profile-avatar">
            <span>{s.full_name_ar?.[0] || '؟'}</span>
          </div>
          <div className="profile-meta">
            <h1 className="profile-name">{s.full_name_ar}</h1>
            {s.full_name_en && <p className="profile-name-en" dir="ltr">{s.full_name_en}</p>}
            <div className="profile-badges">
              <span className="badge-code"><Hash size={12} /> {s.student_code}</span>
              <span className="badge-section">{s.section_name}</span>
              <span className="badge-grade">{s.stage_name} — {s.grade_name_ar}</span>
              <span className="badge-year">{s.academic_year}</span>
              <span className="badge-status" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                {statusCfg.label}
              </span>
            </div>
            {s.secondary_track && (
              <div className="profile-track">
                🎯 {TRACK_LABELS[s.secondary_track] || s.secondary_track}
                {s.secondary_elective && <span> — {s.secondary_elective}</span>}
              </div>
            )}
          </div>
          <div className="profile-actions">
            <button className="btn-edit-profile" onClick={() => onEdit(studentId)}>
              <Edit2 size={16} /> تعديل البيانات
            </button>
            <button
              className="btn-edit-profile"
              onClick={handlePrintEnrollmentCert}
              style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', borderColor: 'rgba(16,185,129,0.3)', marginTop: 6 }}
            >
              <Printer size={15} /> إثبات قيد
            </button>
            <button
              className="btn-edit-profile"
              onClick={handlePrintStatusStatement}
              style={{ background: 'rgba(59,130,246,0.12)', color: '#2563eb', borderColor: 'rgba(59,130,246,0.3)', marginTop: 6 }}
            >
              <Printer size={15} /> بيان حالة
            </button>
          </div>
        </div>

        <div className="profile-quick-strip">
          <div className="quick-item">
            <span className="quick-icon">📅</span>
            <div><div className="quick-lbl">تاريخ الالتحاق</div><div className="quick-val">{s.enrollment_date || '—'}</div></div>
          </div>
          <div className="quick-item">
            <span className="quick-icon">{s.gender === 'ذكر' ? '👦' : '👧'}</span>
            <div><div className="quick-lbl">الجنس</div><div className="quick-val">{s.gender || '—'}</div></div>
          </div>
          <div className="quick-item">
            <span className="quick-icon">📱</span>
            <div><div className="quick-lbl">هاتف ولي الأمر</div><div className="quick-val" dir="ltr">{s.guardian_phone || '—'}</div></div>
          </div>
          <div className="quick-item">
            <span className="quick-icon">🌐</span>
            <div><div className="quick-lbl">الجنسية</div><div className="quick-val">{s.nationality_name || '—'}</div></div>
          </div>
          {specialCases?.length > 0 && (
            <div className="quick-item cases-preview">
              <span className="quick-icon">⭐</span>
              <div>
                <div className="quick-lbl">حالات خاصة</div>
                <div className="quick-val">{specialCases.map(c => c.case_name).join(' • ')}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Nav + Content ── */}
      <div className="profile-body">
        <nav className="profile-nav">
          {SECTIONS.map(sec => (
            <button key={sec.id}
              className={`profile-nav-btn ${activeSection === sec.id ? 'active' : ''}`}
              onClick={() => setActiveSection(sec.id)}>
              <span>{sec.icon}</span> {sec.label}
              {sec.id === 'cases'     && specialCases?.length > 0 && <span className="nav-badge">{specialCases.length}</span>}
              {sec.id === 'transfers' && transfers?.length > 0    && <span className="nav-badge">{transfers.length}</span>}
              {sec.id === 'documents' && documents?.length > 0    && <span className="nav-badge">{documents.length}</span>}
              {sec.id === 'absence'   && absences.length > 0      && <span className="nav-badge" style={{ background:'#f59e0b' }}>{absences.length}</span>}
            </button>
          ))}
        </nav>

        <div className="profile-content glass-panel">

          {/* ─ البيانات الشخصية ─ */}
          {activeSection === 'personal' && (
            <div className="info-section">
              <h3 className="info-section-title">🪪 الهوية الشخصية</h3>
              <InfoRow label="الاسم الرباعي بالعربية" value={s.full_name_ar} />
              <InfoRow label="الاسم بالإنجليزية" value={s.full_name_en} dir="ltr" />
              <InfoRow label="الرقم القومي" value={s.national_id} dir="ltr" />
              <InfoRow label="الجنسية" value={s.nationality_name} />
              <InfoRow label="الجنس" value={s.gender === 'ذكر' ? '👦 ذكر' : s.gender === 'أنثى' ? '👧 أنثى' : s.gender} />
              <InfoRow label="الديانة" value={s.religion} />
              <InfoRow label="تاريخ الميلاد" value={s.birth_date} />
              <InfoRow label="محل الميلاد" value={s.birth_place} />
              <InfoRow label="العنوان" value={s.address} />
              <InfoRow label="هاتف الطالب الشخصي" value={s.student_phone} dir="ltr" />
            </div>
          )}

          {/* ─ بيانات الأسرة ─ */}
          {activeSection === 'family' && (
            <div className="info-section">
              <h3 className="info-section-title">👨 بيانات ولي الأمر</h3>
              <InfoRow label="اسم ولي الأمر" value={s.guardian_name} />
              <InfoRow label="صفة ولي الأمر" value={s.guardian_relation} />
              <InfoRow label="الرقم القومي" value={s.guardian_national_id} dir="ltr" />
              <InfoRow label="رقم الهاتف الأساسي" value={s.guardian_phone} dir="ltr" />
              <InfoRow label="رقم الهاتف الإضافي" value={s.guardian_phone_2} dir="ltr" />
              <InfoRow label="الوظيفة" value={s.guardian_job} />
              <h3 className="info-section-title" style={{ marginTop: 24 }}>👩 بيانات الأم</h3>
              <InfoRow label="اسم الأم" value={s.mother_name} />
              <InfoRow label="جنسية الأم" value={s.mother_nationality_name} />
              <InfoRow label="الرقم القومي للأم" value={s.mother_national_id} dir="ltr" />
            </div>
          )}

          {/* ─ البيانات الأكاديمية ─ */}
          {activeSection === 'academic' && (
            <div className="info-section">
              <h3 className="info-section-title">🏫 التوزيع الأكاديمي</h3>
              <InfoRow label="القسم" value={s.section_name} />
              <InfoRow label="المرحلة الدراسية" value={s.stage_name} />
              <InfoRow label="الصف الدراسي" value={s.grade_name_ar} />
              <InfoRow label="الفصل" value={s.classroom_name || s.class_name} />
              <InfoRow label="العام الدراسي" value={s.academic_year} />
              <InfoRow label="النظام الدراسي" value={
                s.secondary_system === 'baccalaureate' ? 'نظام البكالوريا الجديد' :
                s.secondary_system === 'old'           ? 'النظام القديم (مؤقت)'   : null
              } />
              <InfoRow label="المسار" value={TRACK_LABELS[s.secondary_track] || s.secondary_track} />
              <InfoRow label="المادة الاختيارية" value={s.secondary_elective} />
              <InfoRow label="اللغة الأجنبية الثانية" value={s.second_language} />
              {s.is_merged && (
                <>
                  <div className="merge-alert">
                    <AlertCircle size={16} /> هذا الطالب في حالة <strong>دمج تعليمي</strong>
                  </div>
                  <InfoRow label="نوع الدمج / الإعاقة" value={s.merge_type} />
                  <InfoRow label="رقم القرار الوزاري" value={s.merge_decision_number} />
                  <InfoRow label="تاريخ القرار الوزاري" value={s.merge_decision_date} />
                  <InfoRow label="ملاحظات الدمج" value={s.merge_notes} />
                </>
              )}
              <InfoRow label="تاريخ الالتحاق" value={s.enrollment_date} />
              <InfoRow label="كود الطالب" value={s.student_code} dir="ltr" />
            </div>
          )}

          {/* ─ سجل الغياب ─ */}
          {activeSection === 'absence' && (
            <div className="info-section">
              <h3 className="info-section-title">📅 سجل الإنذارات والغياب</h3>
              {absLoading ? (
                <div className="form-loading" style={{ minHeight: 120 }}>
                  <div className="loading-spinner" />
                  <span>جاري تحميل سجل الغياب...</span>
                </div>
              ) : absences.length === 0 ? (
                <div style={{ padding: '36px 0', textAlign: 'center' }}>
                  <CheckCircle size={40} style={{ color: '#10b981', margin: '0 auto 10px', display: 'block' }} />
                  <div style={{ fontWeight: 700, color: '#059669', fontSize: 15 }}>لا توجد إنذارات غياب مسجّلة</div>
                  <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>الطالب منتظم في الحضور ✅</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14
                  }}>
                    <AlertTriangle size={30} style={{ color: '#ef4444', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#dc2626' }}>
                        {absences.length} إنذار مسجّل
                      </div>
                      <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                        إجمالي أيام الغياب بدون عذر: <strong style={{ color: '#dc2626' }}>{maxAbsentDays} يوماً</strong>
                      </div>
                    </div>
                  </div>
                  {absences.map((w, i) => (
                    <div key={w.id || i} style={{
                      border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10,
                      padding: '12px 16px', background: 'rgba(245,158,11,0.06)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#b45309' }}>
                          ⚠️ {w.warning_type || 'إنذار غياب'}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} />
                          {w.issue_date ? new Date(w.issue_date).toLocaleDateString('ar-EG') : '—'}
                        </div>
                      </div>
                      <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>
                        أيام الغياب بدون عذر حتى تاريخ الإنذار: <strong>{w.total_absent_days}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─ الحالات الخاصة ─ */}
          {activeSection === 'cases' && (
            <div className="info-section">
              <h3 className="info-section-title">⭐ الحالات الخاصة</h3>
              {specialCases?.length === 0 ? (
                <div className="empty-state-sm">لا توجد حالات خاصة مسجّلة لهذا الطالب.</div>
              ) : (
                <div className="cases-list">
                  {specialCases.map(c => (
                    <div key={c.id} className="case-card">
                      <span className="case-icon">⭐</span>
                      <div>
                        <div className="case-card-name">{c.case_name}</div>
                        {c.notes && <div className="case-card-notes">{c.notes}</div>}
                      </div>
                      {c.verified_at && <span className="case-verified"><CheckCircle size={14} /> موثّقة</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─ التحويلات ─ */}
          {activeSection === 'transfers' && (
            <div className="info-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 className="info-section-title" style={{ margin: 0 }}>↔️ سجل التحويلات</h3>
                <button className="btn-add-student" style={{ fontSize: 12, padding: '7px 14px' }}
                  onClick={() => setShowTransferForm(true)}>
                  <Plus size={14} /> تسجيل تحويل
                </button>
              </div>
              {transfers?.length === 0 ? (
                <div className="empty-state-sm">لا توجد تحويلات مسجّلة لهذا الطالب.</div>
              ) : (
                <div className="transfers-list">
                  {transfers.map(t => (
                    <div key={t.id} className={`transfer-card ${t.transfer_type}`}>
                      <div className="transfer-type">
                        {t.transfer_type === 'in'  ? '⬇️ تحويل وارد' :
                         t.transfer_type === 'out' ? '⬆️ تحويل صادر' : '🔄 نقل داخلي'}
                      </div>
                      <div className="transfer-details">
                        {t.from_school      && <InfoRow label="من مدرسة" value={t.from_school} />}
                        {t.from_directorate && <InfoRow label="إدارة" value={t.from_directorate} />}
                        {t.to_school        && <InfoRow label="إلى مدرسة" value={t.to_school} />}
                        {t.to_directorate   && <InfoRow label="إدارة" value={t.to_directorate} />}
                        <InfoRow label="تاريخ التحويل" value={t.transfer_date} />
                        <InfoRow label="سبب التحويل" value={t.reason} />
                        <InfoRow label="العام الدراسي" value={t.year_label} />
                        <div className="transfer-status">
                          {t.is_completed
                            ? <span className="completed"><CheckCircle size={14} /> مكتمل — {t.completed_date}</span>
                            : <span className="pending"><AlertCircle size={14} /> قيد الإجراء</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─ الوثائق والمستندات ─ */}
          {activeSection === 'documents' && (
            <div className="info-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 className="info-section-title" style={{ margin: 0 }}>📄 الوثائق والمستندات</h3>
                <button
                  className="btn-add-student"
                  style={{ fontSize: 12, padding: '7px 14px', background: '#0284c7', color: '#fff' }}
                  onClick={() => {
                    setDocActionError('');
                    setShowAddDocModal(true);
                  }}
                >
                  <Plus size={14} /> إضافة وثيقة
                </button>
              </div>

              {documents?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 0' }}>
                  <UploadCloud size={40} style={{ color: '#94a3b8', margin: '0 auto 10px', display: 'block' }} />
                  <div style={{ fontWeight: 700, color: '#64748b' }}>لا توجد وثائق مسجلة لهذا الطالب</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    يمكنك إضافة شهادة الميلاد، بطاقة الرقم القومي لولي الأمر، أو أي إفادات رسمية
                  </div>
                </div>
              ) : (
                <div className="docs-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {documents.map(d => (
                    <div key={d.id} className="doc-card" style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      padding: 12, background: 'var(--bg-secondary, #f8fafc)', border: '1px solid #e2e8f0', borderRadius: 8
                    }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <FileText size={22} style={{ color: '#0284c7', flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary, #0f172a)' }}>
                            {d.doc_type_name || 'وثيقة رسمية'}
                          </div>
                          {d.file_name && (
                            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                              📎 {d.file_name}
                            </div>
                          )}
                          {d.notes && (
                            <div style={{ fontSize: 11.5, color: '#475569', marginTop: 3 }}>
                              📝 {d.notes}
                            </div>
                          )}
                          <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 4 }}>
                            {d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString('ar-EG') : '—'}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteDocument(d.id)}
                        style={{
                          background: 'none', border: 'none', color: '#ef4444',
                          cursor: 'pointer', padding: 4, borderRadius: 4
                        }}
                        title="حذف الوثيقة"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>

    {/* ── Modal إضافة وثيقة جديدة ── */}
    {showAddDocModal && (
      <div className="modal-overlay" style={{ zIndex: 99999, background: 'rgba(0,0,0,0.7)', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          background: '#fff', borderRadius: 12, width: '100%', maxWidth: 460,
          padding: 22, direction: 'rtl', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              📄 إضافة وثيقة لملف الطالب
            </h3>
            <button onClick={() => setShowAddDocModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSaveDocument} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {docActionError && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                {docActionError}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 5, color: '#334155' }}>
                نوع الوثيقة <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={selectedDocTypeId}
                onChange={(e) => setSelectedDocTypeId(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
              >
                <option value="">-- اختر نوع الوثيقة --</option>
                {docTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
                <option value="other">+ نوع وثيقة آخر...</option>
              </select>
            </div>

            {selectedDocTypeId === 'other' && (
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 5, color: '#334155' }}>
                  اسم نوع الوثيقة الجديد
                </label>
                <input
                  type="text"
                  value={customDocTypeName}
                  onChange={(e) => setCustomDocTypeName(e.target.value)}
                  placeholder="مثلاً: توكيل رسمي / بطاقة تطعيمات"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  required
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 5, color: '#334155' }}>
                اسم الملف أو رقم المستند (اختياري)
              </label>
              <input
                type="text"
                value={docFileName}
                onChange={(e) => setDocFileName(e.target.value)}
                placeholder="مثلاً: شهادة_ميلاد_2025.pdf أو رقم القيد"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 5, color: '#334155' }}>
                ملاحظات وتفاصيل المستند
              </label>
              <textarea
                value={docNotes}
                onChange={(e) => setDocNotes(e.target.value)}
                placeholder="أي ملاحظات حول الوثيقة أو تاريخ انتهاء صلاحيتها..."
                rows={3}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setShowAddDocModal(false)}
                style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={savingDoc}
                style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 800, cursor: savingDoc ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {savingDoc ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
                <span>حفظ الوثيقة</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* ── Transfer Form Overlay ── */}
    {showTransferForm && (
      <TransferForm
        studentId={studentId}
        studentName={data?.student?.full_name_ar || ''}
        onSaved={() => {
          setShowTransferForm(false);
          fetch(`${API}/students/${studentId}`).then(r => r.json()).then(d => { if (d.success) setData(d); });
        }}
        onCancel={() => setShowTransferForm(false)}
      />
    )}

    {/* ── Print Document Modal ── */}
    {printDoc && data?.student && (
      <StudentDocPrintModal
        doc={printDoc}
        student={data.student}
        schoolInfo={schoolInfo}
        academicYear={currentYear}
        onClose={() => setPrintDoc(null)}
      />
    )}
  </>
  );
}
