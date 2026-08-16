import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, CheckCircle2, AlertTriangle, Users, Plus,
  XCircle, Trash2, ShieldCheck, Link2, Clock, Zap,
  AlertCircle, ChevronDown, ChevronUp, Globe, FolderOpen, UserCheck, ArrowRightLeft, Sliders, Save
} from 'lucide-react';
import API_BASE_URL from '../../config/api';

const API = `${API_BASE_URL}/students`;

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
      borderRadius: 12, padding: '14px 16px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      borderTop: `3px solid ${color}`,
    }}>
      <Icon size={22} style={{ color }} />
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</div>
    </div>
  );
}

function LevelSelector({ formOptions, value, onChange }) {
  const sections = formOptions?.sections || [];
  const stages = value.sectionId
    ? (formOptions?.stages || []).filter(s => String(s.section_id) === String(value.sectionId))
    : [];
  const grades = value.stageId
    ? (formOptions?.grades || []).filter(g => String(g.stage_id) === String(value.stageId))
    : [];
  const academicYears = formOptions?.academicYears || [];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label style={{ fontSize: 11, fontWeight: 700 }}>القسم</label>
        <select className="form-control" value={value.sectionId || ''} onChange={e => onChange({ ...value, sectionId: e.target.value, stageId: '', gradeId: '' })}>
          <option value="">-- اختر القسم --</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label style={{ fontSize: 11, fontWeight: 700 }}>المرحلة</label>
        <select className="form-control" value={value.stageId || ''} onChange={e => onChange({ ...value, stageId: e.target.value, gradeId: '' })} disabled={!value.sectionId}>
          <option value="">-- اختر المرحلة --</option>
          {stages.map(s => <option key={s.id} value={s.id}>{s.stage_name_ar || s.stage_name}</option>)}
        </select>
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label style={{ fontSize: 11, fontWeight: 700 }}>الصف</label>
        <select className="form-control" value={value.gradeId || ''} onChange={e => onChange({ ...value, gradeId: e.target.value })} disabled={!value.stageId}>
          <option value="">-- اختر الصف --</option>
          {grades.map(g => <option key={g.id} value={g.id}>{g.grade_name_ar}</option>)}
        </select>
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label style={{ fontSize: 11, fontWeight: 700 }}>العام الدراسي</label>
        <select className="form-control" value={value.academicYearId || ''} onChange={e => onChange({ ...value, academicYearId: e.target.value })}>
          <option value="">-- اختر العام الدراسي --</option>
          {academicYears.map(y => <option key={y.id} value={y.id}>{y.year_label}</option>)}
        </select>
      </div>
    </div>
  );
}

export default function EMISSyncPage() {
  const [activeTab, setActiveTab]         = useState('dashboard');
  const [stats, setStats]                 = useState({ total: 0, matched: 0, new: 0, conflict: 0, added: 0, skipped: 0 });
  const [newStudents, setNewStudents]     = useState([]);
  const [conflicts, setConflicts]         = useState([]);
  const [loading, setLoading]             = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState('');
  const [formOptions, setFormOptions]     = useState(null);
  const [approveForm, setApproveForm]     = useState({ sectionId: '', stageId: '', gradeId: '', academicYearId: '' });
  const [expandedRow, setExpandedRow]     = useState(null);
  const [autoRefresh, setAutoRefresh]     = useState(true);

  // Collector Configuration connected directly to App
  const [collectorConfig, setCollectorConfig] = useState({
    delayMs: 1200,
    batchSize: 50,
    autoSync: true,
    matchBy: 'national_id',
    incrementalOnly: true,
  });
  const [configSaving, setConfigSaving] = useState(false);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 4000); return () => clearTimeout(t); }
  }, [success]);

  useEffect(() => {
    fetch(`${API}/form-options`).then(r => r.json()).then(d => { if (d.success) setFormOptions(d); }).catch(() => {});
    fetch(`${API}/emis/config`).then(r => r.json()).then(d => { if (d.success && d.config) setCollectorConfig(d.config); }).catch(() => {});
  }, []);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/emis/status`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setNewStudents(data.newStudents || []);
        setConflicts(data.conflicts || []);
      }
    } catch { setError('تعذر الاتصال بالخادم.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadStatus]);

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    try {
      const res = await fetch(`${API}/emis/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collectorConfig)
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('تم حفظ إعدادات أداة جامع البيانات وتوصيلها بالتطبيق بنجاح.');
      } else {
        setError(data.error || 'فشل حفظ الإعدادات');
      }
    } catch {
      setError('فشلت عملية حفظ الإعدادات.');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleClearSession = async () => {
    if (!window.confirm('هل تريد مسح كل سجلات المزامنة الحالية؟')) return;
    setActionLoading(true);
    try {
      await fetch(`${API}/emis/session`, { method: 'DELETE' });
      setSuccess('تم مسح الجلسة بنجاح.');
      loadStatus();
    } catch { setError('فشل مسح الجلسة.'); }
    finally { setActionLoading(false); }
  };

  const handleOpenPortal = (target) => {
    if (window.electronAPI && window.electronAPI.openEmisPortal) {
      window.electronAPI.openEmisPortal(target);
    } else {
      const url = target === 'teacher' ? 'https://teacher.emis.gov.eg/login' : 'https://student.emis.gov.eg/';
      window.open(url, '_blank');
    }
  };

  const handleOpenExportFolder = () => {
    if (window.electronAPI && window.electronAPI.openExportFolder) {
      window.electronAPI.openExportFolder();
    } else {
      alert('مسار حفظ الملفات المصدّرة: المستندات -> أدوات المدرسة الموحّدة');
    }
  };

  const handleApproveOne = async (logId) => {
    const { sectionId, stageId, gradeId, academicYearId } = approveForm;
    if (!sectionId || !stageId || !gradeId || !academicYearId) { setError('يجب اختيار القسم والمرحلة والصف والعام الدراسي أولاً.'); return; }
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/emis/approve/${logId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId, stageId, gradeId, academicYearId }),
      });
      const data = await res.json();
      if (data.success) { setSuccess(`تمت إضافة الطالب بنجاح! كود الطالب: ${data.studentCode}`); loadStatus(); }
      else setError(data.error);
    } catch { setError('فشلت العملية.'); }
    finally { setActionLoading(false); }
  };

  const handleApproveAll = async () => {
    const { sectionId, stageId, gradeId, academicYearId } = approveForm;
    if (!sectionId || !stageId || !gradeId || !academicYearId) { setError('يجب اختيار القسم والمرحلة والصف والعام الدراسي أولاً.'); return; }
    if (!window.confirm(`سيتم إضافة جميع الطلاب الجدد (${stats.new}) إلى النظام. متابعة؟`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/emis/approve-all`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId, stageId, gradeId, academicYearId }),
      });
      const data = await res.json();
      if (data.success) { setSuccess(`تمت إضافة ${data.added} طالب بنجاح.`); loadStatus(); }
      else setError(data.error);
    } catch { setError('فشلت العملية.'); }
    finally { setActionLoading(false); }
  };

  const handleResolveConflict = async (conflictLog, decision) => {
    setActionLoading(true);
    try {
      if (decision === 'keep_nepras') {
        setSuccess('تم الإبقاء على بيانات نبراس الحالية بدون تغيير.');
      } else if (decision === 'accept_ministry') {
        const sid = conflictLog.nepras_student_id;
        if (sid && conflictLog.mapped) {
          await fetch(`${API}/${sid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(conflictLog.mapped)
          });
          setSuccess('تم تحديث بيانات الطالب في نبراس استناداً إلى بيانات موقع الوزارة بنجاح.');
        }
      }
      loadStatus();
    } catch {
      setError('فشلت معالجة التعارض.');
    } finally {
      setActionLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'لوحة المزامنة والتدفق الحي',    badge: 0 },
    { id: 'new',          label: 'طلاب جدد مفقودون',          badge: stats.new,      badgeColor: '#10b981' },
    { id: 'conflicts',    label: 'المراجعة اليدوية للتعارضات', badge: stats.conflict,  badgeColor: '#f59e0b' },
    { id: 'matched',   label: 'طلاب مطابقون ومكتملون',          badge: stats.matched,  badgeColor: '#6366f1' },
    { id: 'settings',     label: 'إعدادات الأداة والتأخير', badge: 0 },
  ];

  return (
    <div className="students-module">
      {/* ── Quick Access Launch Bar for Dedicated Option 1 Windows ────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#fff', padding: '16px 22px', borderRadius: 12, marginBottom: 16,
        boxShadow: '0 4px 14px rgba(15,23,42,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,0.2)', display: 'grid', placeItems: 'center', color: '#60a5fa' }}>
            <Globe size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>النافذة المخصصة الخارجية لبوابات موقع الوزارة (EMIS)</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>افتح موقع الوزارة في نافذة مخصصة كاملة الشاشة مع شريط أداة التجميع العائم والتدفق لجدول نبراس</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn-add-student" style={{ background: '#2563eb', borderColor: '#2563eb', padding: '10px 18px', fontSize: 13, fontWeight: 700 }}
            onClick={() => handleOpenPortal('student')}>
            <Globe size={16} />
            <span>🎓 فتح نافذة بوابة الطلاب (student.emis.gov.eg)</span>
          </button>

          <button className="btn-add-student" style={{ background: '#7c3aed', borderColor: '#7c3aed', padding: '10px 18px', fontSize: 13, fontWeight: 700 }}
            onClick={() => handleOpenPortal('teacher')}>
            <Users size={16} />
            <span>🧑‍🏫 فتح نافذة بوابة المعلمين (teacher.emis.gov.eg)</span>
          </button>

          <button className="btn-import-excel" style={{ color: '#e2e8f0', borderColor: 'rgba(255,255,255,0.2)', padding: '10px 14px', fontSize: 12.5 }}
            onClick={handleOpenExportFolder}>
            <FolderOpen size={16} />
            <span>فتح مجلد المستندات</span>
          </button>
        </div>
      </div>

      <div className="page-header">
        <div className="page-title-area">
          <div className="page-icon"><Link2 size={22} /></div>
          <div>
            <h1 className="page-title">جامع البيانات المباشر ومزامنة الوزارة</h1>
            <p className="page-sub">مركز استقبال ومزامنة بيانات الطلاب من النافذة المخصصة مباشرة</p>
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn-import-excel" onClick={() => setAutoRefresh(v => !v)}>
            <Zap size={15} style={{ color: autoRefresh ? '#10b981' : undefined }} />
            <span>{autoRefresh ? 'تدفق تلقائي مفعّل' : 'تحديث يدوي'}</span>
          </button>
          <button className="btn-import-excel" onClick={loadStatus} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>تحديث</span>
          </button>
          <button className="btn-import-excel" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
            onClick={handleClearSession} disabled={actionLoading || stats.total === 0}>
            <Trash2 size={15} />
            <span>مسح الجلسة</span>
          </button>
        </div>
      </div>

      {error   && <div className="form-alert error"   style={{ marginBottom: 12 }}><AlertCircle size={15} /> {error} <button onClick={() => setError('')} style={{ marginRight: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>x</button></div>}
      {success && <div className="form-alert success" style={{ marginBottom: 12 }}><CheckCircle2 size={15} /> {success}</div>}

      <div className="students-tabs" style={{ marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
            {t.badge > 0 && <span style={{ marginRight: 6, background: t.badgeColor || 'var(--primary)', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Dashboard ─────────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 20 }}>
            <StatCard icon={Users}         label="إجمالي المعالج"    value={stats.total}    color="#6366f1" />
            <StatCard icon={CheckCircle2}  label="مطابق تماماً"       value={stats.matched}  color="#10b981" />
            <StatCard icon={Plus}          label="جديد (مفقود بنبراس)" value={stats.new}    color="#3b82f6" />
            <StatCard icon={AlertTriangle} label="تعارض بيانات"      value={stats.conflict} color="#f59e0b" />
            <StatCard icon={ShieldCheck}   label="تمت إضافته"        value={stats.added}    color="#8b5cf6" />
            <StatCard icon={XCircle}       label="تم تخطيه"           value={stats.skipped}  color="#94a3b8" />
          </div>

          <div className="glass-panel" style={{ padding: 20, borderRadius: 12 }}>
            <h3 style={{ marginBottom: 14, fontSize: 15, fontWeight: 700 }}>كيف تعمل النافذة المخصصة بالأداة؟</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[
                { step: '1', title: 'انقر فتح نافذة بوابة الطلاب', desc: 'اضغط زر (🎓 فتح نافذة بوابة الطلاب) بالأعلى لفتح النافذة الخارجية المخصصة', color: '#2563eb' },
                { step: '2', title: 'شريط تجميع البيانات العائم', desc: 'تجد زر (▶️ بدء التجميع التلقائي) مثبتاً بأعلى النافذة المخصصة جهة اليمين', color: '#7c3aed' },
                { step: '3', title: 'قراءة حقول التلميذ تلقائياً', desc: 'تتولى الأداة فتح صفحة الطالب وقراءة البيانات كاملة والعودة للجدول أوتوماتيكياً', color: '#10b981' },
                { step: '4', title: 'التدفق المباشر لجدول نبراس', desc: 'تظهر البيانات المستخرجة فوراً هنا في الجدول للاعتماد بنقرة واحدة', color: '#f59e0b' },
              ].map(item => (
                <div key={item.step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: item.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>{item.step}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{item.title}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 11.5, marginTop: 3 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: New Students ─────────────────────────────────────────────── */}
      {activeTab === 'new' && (
        <div>
          <div className="glass-panel" style={{ padding: 16, marginBottom: 16, borderRadius: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>حدد القسم والمرحلة والصف لإضافة الطلاب الجدد المفقودين</div>
            {formOptions && <LevelSelector formOptions={formOptions} value={approveForm} onChange={setApproveForm} />}
            <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-add-student" style={{ background: '#10b981', borderColor: '#10b981' }}
                onClick={handleApproveAll} disabled={actionLoading || stats.new === 0 || !approveForm.gradeId || !approveForm.academicYearId}>
                <ShieldCheck size={16} />
                <span>إضافة الكل للجدول ({stats.new})</span>
              </button>
            </div>
          </div>

          <div className="table-container glass-panel">
            {newStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>لا يوجد طلاب جدد مفقودون في انتظار الإضافة.</div>
            ) : (
              <div className="table-scroll">
                <table className="students-table">
                  <thead><tr><th>#</th><th>الاسم</th><th>الرقم القومي</th><th>كود EMIS</th><th>الصف</th><th>القسم</th><th>الحالة بالمقارنة</th><th>تفاصيل</th><th>إضافة</th></tr></thead>
                  <tbody>
                    {newStudents.map((s, idx) => (
                      <React.Fragment key={s.id}>
                        <tr className="table-row">
                          <td>{idx + 1}</td>
                          <td style={{ fontWeight: 600 }}>{s.full_name_ar || '-'}</td>
                          <td style={{ fontFamily: 'monospace', direction: 'ltr' }}>{s.national_id || '-'}</td>
                          <td style={{ fontFamily: 'monospace' }}>{s.emis_code || '-'}</td>
                          <td>{s.grade_name || '-'}</td>
                          <td>{s.section_name || '-'}</td>
                          <td>
                            <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                              📥 مفقود في نبراس
                            </span>
                          </td>
                          <td>
                            <button className="btn-grid-action edit" onClick={() => setExpandedRow(expandedRow === s.id ? null : s.id)}>
                              {expandedRow === s.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                          </td>
                          <td>
                            <button className="btn-grid-action edit" style={{ color: '#10b981', borderColor: 'rgba(16,185,129,0.3)', padding: '4px 10px', fontSize: 11 }}
                              onClick={() => handleApproveOne(s.id)} disabled={actionLoading || !approveForm.gradeId}>
                              <Plus size={13}/> إضافة
                            </button>
                          </td>
                        </tr>
                        {expandedRow === s.id && (
                          <tr><td colSpan={9} style={{ background: 'var(--bg-input)', padding: 16 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, fontSize: 12 }}>
                              {Object.entries(s.mapped || {}).map(([k, v]) => v ? <div key={k}><span style={{ color: 'var(--text-secondary)' }}>{k}: </span><span style={{ fontWeight: 600 }}>{String(v)}</span></div> : null)}
                            </div>
                          </td></tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: Conflicts ────────────────────────────────────────────────── */}
      {activeTab === 'conflicts' && (
        <div className="table-container glass-panel" style={{ padding: 16, borderRadius: 12 }}>
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#b45309' }}>🔍 لوحة المراجعة اليدوية للتعارضات</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>قارن بين بيانات نبراس الحالية وبيانات موقع الوزارة المستوردة واختر القرار المناسب لكل طالب</p>
            </div>
            <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
              عدد التعارضات: {conflicts.length}
            </span>
          </div>

          {conflicts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>لا توجد تعارضات - جميع الطلاب المطابقين تم تأكيدهم.</div>
          ) : (
            <div className="table-scroll">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الاسم بموقع الوزارة</th>
                    <th>الرقم القومي</th>
                    <th>الصف</th>
                    <th>الحقول المتعارضة</th>
                    <th>المراجعة والقرار اليدوي</th>
                  </tr>
                </thead>
                <tbody>
                  {conflicts.map((c, idx) => (
                    <React.Fragment key={c.id}>
                      <tr className="table-row">
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: 700, color: '#1e293b' }}>{c.full_name_ar || '-'}</td>
                        <td style={{ fontFamily: 'monospace', direction: 'ltr' }}>{c.national_id || '-'}</td>
                        <td>{c.grade_name || '-'}</td>
                        <td>
                          {(c.conflictFieldsList || []).map(f => (
                            <span key={f} style={{ background: '#fef3c7', color: '#b45309', borderRadius: 4, padding: '2px 6px', fontSize: 11, marginLeft: 4, fontWeight: 700 }}>
                              {f}
                            </span>
                          ))}
                        </td>
                        <td>
                          <button className="btn-grid-action edit" style={{ color: '#2563eb', borderColor: '#bfdbfe', padding: '4px 12px', fontSize: 12 }}
                            onClick={() => setExpandedRow(expandedRow === `c${c.id}` ? null : `c${c.id}`)}>
                            <ArrowRightLeft size={13} style={{ marginLeft: 4 }} />
                            <span>{expandedRow === `c${c.id}` ? 'إغلاق مقارنة البيانات' : 'مقارنة البيانات والقرار'}</span>
                          </button>
                        </td>
                      </tr>

                      {expandedRow === `c${c.id}` && (
                        <tr>
                          <td colSpan={6} style={{ background: '#f8fafc', padding: 16, borderBottom: '2px solid #cbd5e1' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
                              <div style={{ background: '#fff', border: '1px solid #3b82f6', borderRadius: 10, padding: 14 }}>
                                <div style={{ fontWeight: 800, fontSize: 13, color: '#1d4ed8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <UserCheck size={16} />
                                  <span>بيانات نبرأس الحالية (المسجلة بالنظام)</span>
                                </div>
                                <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <div><strong>معرف الطالب:</strong> #{c.nepras_student_id}</div>
                                  <div><strong>الاسم بالعربية:</strong> {c.full_name_ar}</div>
                                  <div><strong>الرقم القومي:</strong> {c.national_id || '-'}</div>
                                </div>
                                <button className="btn-import-excel" style={{ marginTop: 12, width: '100%', justifyContent: 'center', background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                                  onClick={() => handleResolveConflict(c, 'keep_nepras')} disabled={actionLoading}>
                                  🟢 الإبقاء على بيانات نبراس بدون تغيير
                                </button>
                              </div>

                              <div style={{ background: '#fff', border: '1px solid #f59e0b', borderRadius: 10, padding: 14 }}>
                                <div style={{ fontWeight: 800, fontSize: 13, color: '#b45309', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <Globe size={16} />
                                  <span>بيانات موقع الوزارة المستوردة (EMIS)</span>
                                </div>
                                <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <div><strong>كود التلميذ الوزاري:</strong> {c.emis_code || '-'}</div>
                                  <div><strong>الاسم بالوزارة:</strong> {c.full_name_ar}</div>
                                  <div><strong>الصف بالوزارة:</strong> {c.grade_name || '-'}</div>
                                </div>
                                <button className="btn-import-excel" style={{ marginTop: 12, width: '100%', justifyContent: 'center', background: '#fffbebf', color: '#b45309', borderColor: '#fde68a' }}
                                  onClick={() => handleResolveConflict(c, 'accept_ministry')} disabled={actionLoading}>
                                  🔵 اعتماد وتحديث من موقع الوزارة
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: Matched ─────────────────────────────────────────────────── */}
      {activeTab === 'matched' && (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center', borderRadius: 12 }}>
          <CheckCircle2 size={48} style={{ color: '#10b981', marginBottom: 12 }} />
          <div style={{ fontSize: 40, fontWeight: 800, color: '#10b981', marginBottom: 6 }}>{stats.matched}</div>
          <div style={{ color: 'var(--text-secondary)' }}>طالب تطابقت بياناتهم بالكامل بين موقع الوزارة ونبراس برو.</div>
          {stats.added > 0 && <div style={{ marginTop: 16, fontSize: 14, color: '#8b5cf6' }}><ShieldCheck size={16} style={{ verticalAlign: 'middle', marginLeft: 4 }}/>تمت إضافة <strong>{stats.added}</strong> طالب جديد من موقع الوزارة بنجاح.</div>}
        </div>
      )}

      {/* ── TAB 5: Settings ─────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="glass-panel" style={{ padding: 24, borderRadius: 12, maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#1e293b' }}>
            <Sliders size={20} style={{ color: '#2563eb' }} />
            <span>إعدادات أداة جامع البيانات المربوطة بتطبيق نبراس برو</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field-group">
              <label className="field-label">زمن التأخير والتوقف بين الصفحات (مللي ثانية)</label>
              <input type="number" className="field-input" min={500} max={10000} step={100}
                value={collectorConfig.delayMs}
                onChange={e => setCollectorConfig({ ...collectorConfig, delayMs: parseInt(e.target.value) || 1200 })} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>مثال: 1200 مللي ثانية = 1.2 ثانية (يضمن الاستقرار واستجابة السيرفر)</span>
            </div>

            <div className="field-group">
              <label className="field-label">حجم الدفعة القياسي للتجميع</label>
              <input type="number" className="field-input" min={10} max={5000} step={10}
                value={collectorConfig.batchSize}
                onChange={e => setCollectorConfig({ ...collectorConfig, batchSize: parseInt(e.target.value) || 50 })} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>عدد السجلات المجمعة في كل دفعة قبل الإرسال التلقائي</span>
            </div>

            <div className="field-group">
              <label className="field-label">طريقة مطابقة الطلاب وتحديد التكرار</label>
              <select className="field-input" value={collectorConfig.matchBy}
                onChange={e => setCollectorConfig({ ...collectorConfig, matchBy: e.target.value })}>
                <option value="national_id">بالرقم القومي (14 رقم) [موصى به]</option>
                <option value="emis_code">بكود الطالب الوزاري (EMIS Code)</option>
                <option value="both">بالرقم القومي أو كود الطالب</option>
              </select>
            </div>

            <div className="field-group">
              <label className="field-label">التدفق المباشر والمقارنة التلقائية</label>
              <select className="field-input" value={collectorConfig.autoSync ? '1' : '0'}
                onChange={e => setCollectorConfig({ ...collectorConfig, autoSync: e.target.value === '1' })}>
                <option value="1">تفعيل التدفق والمقارنة المباشرة بتطبيق نبراس</option>
                <option value="0">إيقاف التدفق المباشر (تجميع محلي فقط)</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-add-student" style={{ background: '#2563eb', borderColor: '#2563eb', padding: '10px 20px' }}
              onClick={handleSaveConfig} disabled={configSaving}>
              <Save size={16} />
              <span>{configSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات في التطبيق'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
