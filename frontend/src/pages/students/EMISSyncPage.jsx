import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, CheckCircle2, AlertTriangle, Users, Plus,
  XCircle, Trash2, ShieldCheck, Link2, Clock, Zap,
  AlertCircle, ChevronDown, ChevronUp
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
        <label style={{ fontSize: 11 }}>القسم</label>
        <select className="form-control" value={value.sectionId || ''} onChange={e => onChange({ ...value, sectionId: e.target.value, stageId: '', gradeId: '' })}>
          <option value="">-- اختر --</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label style={{ fontSize: 11 }}>المرحلة</label>
        <select className="form-control" value={value.stageId || ''} onChange={e => onChange({ ...value, stageId: e.target.value, gradeId: '' })} disabled={!value.sectionId}>
          <option value="">-- اختر --</option>
          {stages.map(s => <option key={s.id} value={s.id}>{s.stage_name_ar}</option>)}
        </select>
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label style={{ fontSize: 11 }}>الصف</label>
        <select className="form-control" value={value.gradeId || ''} onChange={e => onChange({ ...value, gradeId: e.target.value })} disabled={!value.stageId}>
          <option value="">-- اختر --</option>
          {grades.map(g => <option key={g.id} value={g.id}>{g.grade_name_ar}</option>)}
        </select>
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label style={{ fontSize: 11 }}>العام الدراسي</label>
        <select className="form-control" value={value.academicYearId || ''} onChange={e => onChange({ ...value, academicYearId: e.target.value })}>
          <option value="">-- اختر --</option>
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

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 4000); return () => clearTimeout(t); }
  }, [success]);

  useEffect(() => {
    fetch(`${API}/form-options`).then(r => r.json()).then(d => { if (d.success) setFormOptions(d); }).catch(() => {});
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

  const handleApproveOne = async (logId) => {
    const { sectionId, stageId, gradeId, academicYearId } = approveForm;
    if (!sectionId || !stageId || !gradeId || !academicYearId) { setError('يجب اختيار القسم والمرحلة والصف والعام الدراسي اولا.'); return; }
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/emis/approve/${logId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId, stageId, gradeId, academicYearId }),
      });
      const data = await res.json();
      if (data.success) { setSuccess(`تمت اضافة الطالب بكود: ${data.studentCode}`); loadStatus(); }
      else setError(data.error);
    } catch { setError('فشلت العملية.'); }
    finally { setActionLoading(false); }
  };

  const handleApproveAll = async () => {
    const { sectionId, stageId, gradeId, academicYearId } = approveForm;
    if (!sectionId || !stageId || !gradeId || !academicYearId) { setError('يجب اختيار القسم والمرحلة والصف والعام الدراسي اولا.'); return; }
    if (!window.confirm(`سيتم اضافة جميع الطلاب الجدد (${stats.new}) الى النظام. المتابعة?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/emis/approve-all`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId, stageId, gradeId, academicYearId }),
      });
      const data = await res.json();
      if (data.success) { setSuccess(`تمت اضافة ${data.added} طالب بنجاح.`); loadStatus(); }
      else setError(data.error);
    } catch { setError('فشلت العملية.'); }
    finally { setActionLoading(false); }
  };

  const tabs = [
    { id: 'dashboard', label: 'لوحة المزامنة',  badge: 0 },
    { id: 'new',       label: 'طلاب جدد',        badge: stats.new,      badgeColor: '#10b981' },
    { id: 'conflicts', label: 'تعارضات',          badge: stats.conflict,  badgeColor: '#f59e0b' },
    { id: 'matched',   label: 'مطابق',            badge: stats.matched,  badgeColor: '#6366f1' },
  ];

  return (
    <div className="students-module">
      <div className="page-header">
        <div className="page-title-area">
          <div className="page-icon"><Link2 size={22} /></div>
          <div>
            <h1 className="page-title">مزامنة EMIS مع نبراس برو</h1>
            <p className="page-sub">استقبال ومعالجة بيانات منظومة بيانات التلميذ</p>
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn-import-excel" onClick={() => setAutoRefresh(v => !v)}>
            <Zap size={15} style={{ color: autoRefresh ? '#10b981' : undefined }} />
            <span>{autoRefresh ? 'تحديث تلقائي' : 'تحديث يدوي'}</span>
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
            {t.id === 'dashboard' && '📊 '}{t.id === 'new' && '🆕 '}{t.id === 'conflicts' && '⚠️ '}{t.id === 'matched' && '✅ '}
            {t.label}
            {t.badge > 0 && <span style={{ marginRight: 6, background: t.badgeColor || 'var(--primary)', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 20 }}>
            <StatCard icon={Users}         label="اجمالي المعالج"    value={stats.total}    color="#6366f1" />
            <StatCard icon={CheckCircle2}  label="مطابق تماما"       value={stats.matched}  color="#10b981" />
            <StatCard icon={Plus}          label="جديد (يحتاج اضافة)" value={stats.new}    color="#3b82f6" />
            <StatCard icon={AlertTriangle} label="تعارض بيانات"      value={stats.conflict} color="#f59e0b" />
            <StatCard icon={ShieldCheck}   label="تمت اضافته"        value={stats.added}    color="#8b5cf6" />
            <StatCard icon={XCircle}       label="تم تخطيه"           value={stats.skipped}  color="#94a3b8" />
          </div>
          <div className="glass-panel" style={{ padding: 20, borderRadius: 12 }}>
            <h3 style={{ marginBottom: 14, fontSize: 15, fontWeight: 700 }}>كيفية ربط الاضافة بنبراس برو</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { step: '1', title: 'افتح Chrome وادخل على EMIS', desc: 'سجل الدخول بحساب مدرستك على student.emis.gov.eg', color: '#3b82f6' },
                { step: '2', title: 'تاكد من تثبيت الاضافة', desc: 'الاضافة موجودة في مجلد extension/ - قم بتحميلها من ادارة الاضافات', color: '#8b5cf6' },
                { step: '3', title: 'اختر الصف وابدا التجميع', desc: 'ستظهر لوحة الاضافة تلقائيا - انقر بدء التجميع', color: '#10b981' },
                { step: '4', title: 'راجع النتائج هنا', desc: 'ستظهر البيانات في هذه الصفحة فور وصولها من الاضافة', color: '#f59e0b' },
              ].map(item => (
                <div key={item.step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: item.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>{item.step}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            {stats.total === 0 && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(59,130,246,0.08)', borderRadius: 8, border: '1px dashed rgba(59,130,246,0.3)', color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' }}>
                <Clock size={16} style={{ marginLeft: 6, verticalAlign: 'middle' }} />
                في انتظار استقبال بيانات من اضافة Chrome...
                {autoRefresh && <span style={{ fontSize: 11, marginRight: 8, color: '#10b981' }}>يتحدث تلقائيا كل 5 ثوان</span>}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'new' && (
        <div>
          <div className="glass-panel" style={{ padding: 16, marginBottom: 16, borderRadius: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>حدد القسم والمرحلة والصف لاضافة الطلاب الجدد</div>
            {formOptions && <LevelSelector formOptions={formOptions} value={approveForm} onChange={setApproveForm} />}
            <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-add-student" style={{ background: '#10b981', borderColor: '#10b981' }}
                onClick={handleApproveAll} disabled={actionLoading || stats.new === 0 || !approveForm.gradeId || !approveForm.academicYearId}>
                <ShieldCheck size={16} />
                <span>اضافة الكل ({stats.new})</span>
              </button>
            </div>
          </div>
          <div className="table-container glass-panel">
            {newStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>لا يوجد طلاب جدد في انتظار الاضافة.</div>
            ) : (
              <div className="table-scroll">
                <table className="students-table">
                  <thead><tr><th>#</th><th>الاسم</th><th>الرقم القومي</th><th>كود EMIS</th><th>الصف</th><th>القسم</th><th>تفاصيل</th><th>اضافة</th></tr></thead>
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
                            <button className="btn-grid-action edit" onClick={() => setExpandedRow(expandedRow === s.id ? null : s.id)}>
                              {expandedRow === s.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                          </td>
                          <td>
                            <button className="btn-grid-action edit" style={{ color: '#10b981', borderColor: 'rgba(16,185,129,0.3)', padding: '4px 10px', fontSize: 11 }}
                              onClick={() => handleApproveOne(s.id)} disabled={actionLoading || !approveForm.gradeId}>
                              <Plus size={13}/> اضافة
                            </button>
                          </td>
                        </tr>
                        {expandedRow === s.id && (
                          <tr><td colSpan={8} style={{ background: 'var(--bg-input)', padding: 16 }}>
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

      {activeTab === 'conflicts' && (
        <div className="table-container glass-panel">
          {conflicts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>لا توجد تعارضات - جميع الطلاب الموجودين مطابقون.</div>
          ) : (
            <div className="table-scroll">
              <table className="students-table">
                <thead><tr><th>#</th><th>الاسم (EMIS)</th><th>الرقم القومي</th><th>الصف</th><th>الحقول المتعارضة</th><th>تفاصيل</th></tr></thead>
                <tbody>
                  {conflicts.map((c, idx) => (
                    <React.Fragment key={c.id}>
                      <tr className="table-row">
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{c.full_name_ar || '-'}</td>
                        <td style={{ fontFamily: 'monospace', direction: 'ltr' }}>{c.national_id || '-'}</td>
                        <td>{c.grade_name || '-'}</td>
                        <td>{(c.conflictFieldsList || []).map(f => <span key={f} style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', borderRadius: 4, padding: '2px 6px', fontSize: 11, marginLeft: 4 }}>{f}</span>)}</td>
                        <td><button className="btn-grid-action edit" onClick={() => setExpandedRow(expandedRow === `c${c.id}` ? null : `c${c.id}`)}>
                          {expandedRow === `c${c.id}` ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </button></td>
                      </tr>
                      {expandedRow === `c${c.id}` && (
                        <tr><td colSpan={6} style={{ background: 'var(--bg-input)', padding: 16 }}>
                          <div style={{ fontSize: 12, marginBottom: 8 }}>معرف نبراس: <strong>#{c.nepras_student_id}</strong></div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, fontSize: 12 }}>
                            {Object.entries(c.mapped || {}).map(([k, v]) => v ? <div key={k}><span style={{ color: 'var(--text-secondary)' }}>{k}: </span><span style={{ fontWeight: 600 }}>{String(v)}</span></div> : null)}
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
      )}

      {activeTab === 'matched' && (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center', borderRadius: 12 }}>
          <CheckCircle2 size={48} style={{ color: '#10b981', marginBottom: 12 }} />
          <div style={{ fontSize: 40, fontWeight: 800, color: '#10b981', marginBottom: 6 }}>{stats.matched}</div>
          <div style={{ color: 'var(--text-secondary)' }}>طالب تطابقت بياناتهم بالكامل بين EMIS ونبراس برو.</div>
          {stats.added > 0 && <div style={{ marginTop: 16, fontSize: 14, color: '#8b5cf6' }}><ShieldCheck size={16} style={{ verticalAlign: 'middle', marginLeft: 4 }}/>تمت اضافة <strong>{stats.added}</strong> طالب جديد من EMIS بنجاح.</div>}
        </div>
      )}
    </div>
  );
}
