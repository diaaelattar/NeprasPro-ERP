import React, { useState, useEffect } from 'react';
import {
  GraduationCap, User, Phone, MapPin, BookOpen, ArrowRight,
  Edit2, Star, FileText, ArrowLeftRight, Calendar, Shield,
  CheckCircle, XCircle, AlertCircle, Hash, Plus
} from 'lucide-react';
import TransferForm from './TransferForm';

const API = `http://${window.location.hostname}:3001/api`;

const STATUS_CFG = {
  promoted:     { label: 'منقول',        color: '#10b981', bg: '#10b98122' },
  retained:     { label: 'باقٍ للإعادة', color: '#3b82f6', bg: '#3b82f622' },
  disconnected: { label: 'منقطع',        color: '#d97706', bg: '#d9770622' },
  suspended:    { label: 'موقوف قيده',   color: '#b45309', bg: '#b4530922' },
  excluded:     { label: 'مستبعد',       color: '#ef4444', bg: '#ef444422' },
  'منقول':      { label: 'منقول',        color: '#10b981', bg: '#10b98122' },
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

export default function StudentProfile({ studentId, onEdit, onBack }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [activeSection,    setActiveSection]    = useState('personal');
  const [showTransferForm, setShowTransferForm] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    fetch(`${API}/students/${studentId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d);
        else setError(d.error || 'فشل تحميل بيانات الطالب');
      })
      .catch(() => setError('تعذّر الاتصال بالخادم'))
      .finally(() => setLoading(false));
  }, [studentId]);

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
    { id: 'cases',     label: 'الحالات الخاصة',      icon: '⭐' },
    { id: 'transfers', label: 'التحويلات',           icon: '↔️' },
    { id: 'documents', label: 'الوثائق',             icon: '📄' },
  ];

  return (
    <>
    <div className="student-profile-page">
      {/* ── Profile Header Card ────────────────────────── */}
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
          </div>
        </div>

        {/* Quick info strip */}
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

      {/* ── Section Nav + Content ─────────────────────── */}
      <div className="profile-body">
        <nav className="profile-nav">
          {SECTIONS.map(sec => (
            <button key={sec.id}
              className={`profile-nav-btn ${activeSection === sec.id ? 'active' : ''}`}
              onClick={() => setActiveSection(sec.id)}>
              <span>{sec.icon}</span> {sec.label}
              {sec.id === 'cases'     && specialCases?.length > 0  && <span className="nav-badge">{specialCases.length}</span>}
              {sec.id === 'transfers' && transfers?.length > 0     && <span className="nav-badge">{transfers.length}</span>}
              {sec.id === 'documents' && documents?.length > 0     && <span className="nav-badge">{documents.length}</span>}
            </button>
          ))}
        </nav>

        <div className="profile-content glass-panel">

          {/* Personal */}
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

          {/* Family */}
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

          {/* Academic */}
          {activeSection === 'academic' && (
            <div className="info-section">
              <h3 className="info-section-title">🏫 التوزيع الأكاديمي</h3>
              <InfoRow label="القسم" value={s.section_name} />
              <InfoRow label="المرحلة الدراسية" value={s.stage_name} />
              <InfoRow label="الصف الدراسي" value={s.grade_name_ar} />
              <InfoRow label="العام الدراسي" value={s.academic_year} />
              <InfoRow label="النظام الدراسي" value={
                s.secondary_system === 'baccalaureate' ? 'نظام البكالوريا الجديد' :
                s.secondary_system === 'old'           ? 'النظام القديم (مؤقت)'   : null
              } />
              <InfoRow label="المسار" value={TRACK_LABELS[s.secondary_track] || s.secondary_track} />
              <InfoRow label="المادة الاختيارية" value={s.secondary_elective} />
              <InfoRow label="اللغة الأجنبية الثانية" value={s.second_language} />

              {s.is_merged ? (
                <>
                  <div className="merge-alert">
                    <AlertCircle size={16} /> هذا الطالب في حالة <strong>دمج تعليمي</strong>
                  </div>
                  <InfoRow label="نوع الدمج / الإعاقة" value={s.merge_type} />
                  <InfoRow label="رقم القرار الوزاري" value={s.merge_decision_number} />
                  <InfoRow label="تاريخ القرار الوزاري" value={s.merge_decision_date} />
                  <InfoRow label="ملاحظات الدمج" value={s.merge_notes} />
                </>
              ) : null}

              <InfoRow label="تاريخ الالتحاق" value={s.enrollment_date} />
              <InfoRow label="كود الطالب" value={s.student_code} dir="ltr" />
            </div>
          )}

          {/* Special Cases */}
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
                      {c.verified_at && (
                        <span className="case-verified"><CheckCircle size={14} /> موثّقة</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Transfers */}
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
                        {t.transfer_type === 'in'       ? '⬇️ تحويل وارد' :
                         t.transfer_type === 'out'      ? '⬆️ تحويل صادر' : '🔄 نقل داخلي'}
                      </div>
                      <div className="transfer-details">
                        {t.from_school && <InfoRow label="من مدرسة" value={t.from_school} />}
                        {t.from_directorate && <InfoRow label="إدارة" value={t.from_directorate} />}
                        {t.to_school && <InfoRow label="إلى مدرسة" value={t.to_school} />}
                        {t.to_directorate && <InfoRow label="إدارة" value={t.to_directorate} />}
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

          {/* Documents */}
          {activeSection === 'documents' && (
            <div className="info-section">
              <h3 className="info-section-title">📄 الوثائق والمستندات</h3>
              {documents?.length === 0 ? (
                <div className="empty-state-sm">لا توجد وثائق مرفوعة لهذا الطالب.</div>
              ) : (
                <div className="docs-list">
                  {documents.map(d => (
                    <div key={d.id} className="doc-card">
                      <FileText size={20} />
                      <div>
                        <div className="doc-type">{d.doc_type_name || 'وثيقة'}</div>
                        {d.notes && <div className="doc-notes">{d.notes}</div>}
                        <div className="doc-date">{d.uploaded_at}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* ── Transfer Form Overlay ─────────────────────────── */}
    {showTransferForm && (
      <TransferForm
        studentId={studentId}
        studentName={data?.student?.full_name_ar || ''}
        onSaved={() => {
          setShowTransferForm(false);
          // Reload profile data
          fetch(`${API}/students/${studentId}`)
            .then(r => r.json())
            .then(d => { if (d.success) setData(d); });
        }}
        onCancel={() => setShowTransferForm(false)}
      />
    )}
  </>
  );
}
