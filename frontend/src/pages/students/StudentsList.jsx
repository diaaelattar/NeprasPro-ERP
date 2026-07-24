import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Search, ChevronRight, ChevronLeft,
  GraduationCap, CheckCircle, ArrowLeftRight, RefreshCw,
  FileSpreadsheet, Eye, RotateCcw, Edit3, Layers,
  AlertTriangle, CheckSquare, Square, X, Save, UserX, Trash2,
  Grid, ChevronsUpDown, ChevronUp, ChevronDown, SlidersHorizontal
} from 'lucide-react';
import ReportsPage from '../reports/ReportsPage';

const API = `http://${window.location.hostname}:3001/api`;

const STATUS_LABELS = {
  promoted:  { label: 'منقول',        color: '#10b981' },
  retained:  { label: 'باقٍ للإعادة', color: '#f59e0b' },
  suspended: { label: 'موقوف قيده',   color: '#ef4444' },
};

const TRACK_LABELS = {
  medicine_life: 'طب وعلوم حياة', engineering_cs: 'هندسة وحاسب',
  business: 'أعمال', arts_humanities: 'آداب وفنون',
  science_bio: 'علمي علوم', science_math: 'علمي رياضيات', literary: 'أدبي',
};

const SECOND_LANGS  = ['فرنسي', 'ألماني', 'إيطالي', 'إسباني', 'لا يوجد'];
const RELIGION_OPTS = ['مسلم', 'مسيحي'];
const GENDER_OPTS   = ['ذكر', 'أنثى'];

/* ── SortTh: clickable sortable column header ────────────────── */
function SortTh({ label, field, sortBy, sortDir, onSort, style = {} }) {
  const active = sortBy === field;
  const next   = active && sortDir === 'asc' ? 'desc' : 'asc';
  return (
    <th onClick={() => onSort(field, next)}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', ...style }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        {label}
        <span style={{ opacity: active ? 1 : 0.28, color: active ? '#818cf8' : 'inherit', lineHeight: 0 }}>
          {active
            ? (sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)
            : <ChevronsUpDown size={13} />}
        </span>
      </span>
    </th>
  );
}

/* ── Pill filter button ──────────────────────────────────────── */
function PillBtn({ active, color = 'indigo', onClick, children }) {
  const palettes = {
    indigo: { border: '#818cf8',  bg: '#e0e7ff',  text: '#4338ca' },
    pink:   { border: '#f472b6',  bg: '#fce7f3',  text: '#be185d' },
    amber:  { border: '#fbbf24',  bg: '#fef3c7',  text: '#b45309' },
    green:  { border: '#34d399',  bg: '#d1fae5',  text: '#047857' },
    white:  { border: '#9ca3af',  bg: '#f3f4f6',  text: '#374151' },
  };
  const p = palettes[color] || palettes.white;
  return (
    <button onClick={onClick} style={{
      padding: '5px 13px', borderRadius: 20, border: '1px solid',
      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-family)',
      transition: 'all 0.15s',
      borderColor: active ? p.border : 'var(--border-color, #e5e7eb)',
      background:  active ? p.bg    : 'transparent',
      color:       active ? p.text  : 'var(--text-secondary, #4b5563)',
    }}>
      {children}
    </button>
  );
}

/* ── Chip for active filter ─────────────────────────────────── */
function FilterChip({ label, onRemove }) {
  return (
    <span className="active-filter-chip">
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', lineHeight: 0 }}>
        <X size={11} />
      </button>
    </span>
  );
}

/* ── Bulk Edit Modal ─────────────────────────────────────────── */
function BulkEditModal({ count, formOpts, onApply, onClose }) {
  const [field, setField] = useState('status');
  const [value, setValue] = useState('');
  const FIELD_OPTIONS = [
    { value: 'status',          label: 'حالة القيد' },
    { value: 'second_language', label: 'اللغة الأجنبية الثانية' },
    { value: 'grade_id',        label: 'الصف الدراسي' },
    { value: 'section_id',      label: 'القسم' },
    { value: 'academic_year_id',label: 'العام الدراسي' },
  ];
  const renderValueInput = () => {
    if (field === 'status') return (<select className="field-input" value={value} onChange={e => setValue(e.target.value)}><option value="">اختر الحالة</option>{Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</select>);
    if (field === 'second_language') return (<select className="field-input" value={value} onChange={e => setValue(e.target.value)}><option value="">اختر اللغة</option>{SECOND_LANGS.map(l => <option key={l} value={l}>{l}</option>)}</select>);
    if (field === 'grade_id') return (<select className="field-input" value={value} onChange={e => setValue(e.target.value)}><option value="">اختر الصف</option>{formOpts.grades?.map(g => <option key={g.id} value={g.id}>{g.grade_name_ar}</option>)}</select>);
    if (field === 'section_id') return (<select className="field-input" value={value} onChange={e => setValue(e.target.value)}><option value="">اختر القسم</option>{formOpts.sections?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>);
    if (field === 'academic_year_id') return (<select className="field-input" value={value} onChange={e => setValue(e.target.value)}><option value="">اختر العام الدراسي</option>{formOpts.academicYears?.map(y => <option key={y.id} value={y.id}>{y.year_label}</option>)}</select>);
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="page-icon" style={{ width: 36, height: 36 }}><Edit3 size={18} /></div>
            <div><h3 style={{ margin: 0, fontSize: 16 }}>تعديل جماعي</h3><p style={{ margin: 0, opacity: 0.6, fontSize: 13 }}>{count} طالب محدد</p></div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ padding: '20px 24px' }}>
          <div className="field-group" style={{ marginBottom: 16 }}>
            <label className="field-label">الحقل المراد تعديله</label>
            <select className="field-input" value={field} onChange={e => { setField(e.target.value); setValue(''); }}>
              {FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="field-group"><label className="field-label">القيمة الجديدة</label>{renderValueInput()}</div>
        </div>
        <div className="modal-footer" style={{ padding: '12px 24px', display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button className="btn-cancel" onClick={onClose}>إلغاء</button>
          <button className="btn-save" disabled={!value} onClick={() => onApply(field, value)}><Save size={15} /> تطبيق على {count} طالب</button>
        </div>
      </div>
    </div>
  );
}

/* ── Delete Confirm Modal ────────────────────────────────────── */
function DeleteConfirmModal({ count, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="page-icon" style={{ width: 36, height: 36, background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}><AlertTriangle size={18} /></div>
            <div><h3 style={{ margin: 0, fontSize: 16 }}>تأكيد الحذف</h3><p style={{ margin: 0, opacity: 0.6, fontSize: 13 }}>سيُنقل {count} طالب إلى المستبعدين</p></div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ padding: '20px 24px' }}>
          <div className="form-alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
            <AlertTriangle size={14} style={{ marginLeft: 6, verticalAlign: 'middle' }} />
            لن يُحذف الطالب نهائياً — يمكن استعادته لاحقاً من تبويب «المستبعدين»
          </div>
          <div className="field-group">
            <label className="field-label">سبب الاستبعاد (اختياري)</label>
            <input type="text" className="field-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="مثال: نقل لمدرسة أخرى، بيانات خاطئة..." />
          </div>
        </div>
        <div className="modal-footer" style={{ padding: '12px 24px', display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button className="btn-cancel" onClick={onClose}>إلغاء</button>
          <button className="btn-danger" onClick={() => onConfirm(reason)} style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserX size={15} /> استبعاد {count} طالب
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Purge All Confirm Modal ────────────────────────────────────── */
function PurgeConfirmModal({ onConfirm, onClose, actionLoading }) {
  const [confirmInput, setConfirmInput] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="page-icon" style={{ width: 36, height: 36, background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}><AlertTriangle size={18} /></div>
            <div><h3 style={{ margin: 0, fontSize: 16, color: '#ef4444' }}>حذف جميع الطلاب نهائياً</h3><p style={{ margin: 0, opacity: 0.6, fontSize: 13 }}>تصفير وتطبيق جدول الطلاب</p></div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ padding: '20px 24px' }}>
          <div className="form-alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 8, padding: '12px 14px', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
            ⚠️ <strong>تنبيه هام جداً:</strong> هذا الإجراء سيقوم بحذف كافة بيانات الطلاب المسجلين بالكامل في كل المراحل والصفوف! الإجراء غير قابل للتراجع.
          </div>
          <div className="field-group">
            <label className="field-label" style={{ fontWeight: 'bold' }}>اكتب "حذف جميع الطلاب" للتأكيد:</label>
            <input type="text" className="field-input" value={confirmInput} onChange={e => setConfirmInput(e.target.value)} placeholder="حذف جميع الطلاب" dir="rtl" />
          </div>
        </div>
        <div className="modal-footer" style={{ padding: '12px 24px', display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button className="btn-cancel" onClick={onClose}>إلغاء</button>
          <button className="btn-danger" disabled={confirmInput !== 'حذف جميع الطلاب' || actionLoading} onClick={() => onConfirm(confirmInput)} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, cursor: confirmInput === 'حذف جميع الطلاب' ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserX size={15} /> {actionLoading ? 'جاري الحذف...' : 'حذف وإعادة الضبط بالكامل'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════ */
export default function StudentsList({ onAdd, onView, onImport, onDistribute, onTransfers, onQuickEdit, onAbsence, onSeating, activeSectionId, currentUser, isSuperAdmin }) {
  const [students,   setStudents]   = useState([]);
  const [stats,      setStats]      = useState({ total: 0, promoted: 0, male: 0, female: 0, retained: 0, disconnected: 0, excluded: 0, deleted: 0 });
  const [formOpts,   setFormOpts]   = useState({ sections: [], stages: [], grades: [], academicYears: [], nationalities: [] });
  const [classrooms, setClassrooms] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [viewMode,   setViewMode]   = useState('active');
  const [showAdv,    setShowAdv]    = useState(false);
  const [showMoreOps, setShowMoreOps] = useState(false);

  // Sort
  const [sortBy,  setSortBy]  = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  // Multi-select
  const [selected, setSelected] = useState(new Set());
  const [showBulkEdit,      setShowBulkEdit]      = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPurgeModal,    setShowPurgeModal]    = useState(false);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [duplicatesData, setDuplicatesData] = useState(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const handleCheckDuplicates = () => {
    setCheckingDuplicates(true);
    setShowDuplicatesModal(true);
    fetch(`${API}/students/duplicates`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setDuplicatesData(d);
      })
      .finally(() => setCheckingDuplicates(false));
  };
  const [actionLoading,     setActionLoading]     = useState(false);

  const BASE_FILTERS = {
    search: '', sectionId: '', stageId: '', gradeId: '', classId: '',
    status: '', academicYearId: '', secondaryTrack: '',
    gender: '', religion: '', isMerged: '', nationalityId: '',
  };
  const [filters, setFilters] = useState({
    ...BASE_FILTERS,
    sectionId: activeSectionId && activeSectionId !== 'all' ? String(activeSectionId) : '',
  });

  useEffect(() => {
    if (activeSectionId && activeSectionId !== 'all') {
      setFilters(f => ({ ...f, sectionId: String(activeSectionId), stageId: '', gradeId: '', classId: '' }));
    } else {
      setFilters(f => ({ ...f, sectionId: '' }));
    }
  }, [activeSectionId]);

  useEffect(() => {
    fetch(`${API}/students/form-options`).then(r => r.json()).then(d => {
      if (d.success) setFormOpts(d);
      const cur = d.academicYears?.find(y => y.is_current === 1 || y.is_current === true);
      if (cur) setFilters(f => ({ ...f, academicYearId: String(cur.id) }));
    });
  }, []);

  useEffect(() => {
    if (filters.gradeId && filters.academicYearId) {
      fetch(`${API}/settings/classrooms?gradeId=${filters.gradeId}&academicYearId=${filters.academicYearId}`)
        .then(r => r.json()).then(d => setClassrooms(d.success ? d.classrooms : [])).catch(() => setClassrooms([]));
    } else { setClassrooms([]); setFilters(f => ({ ...f, classId: '' })); }
  }, [filters.gradeId, filters.academicYearId]);

  const loadStats = useCallback(() => {
    const q = new URLSearchParams();
    if (filters.academicYearId) q.set('academicYearId', filters.academicYearId);
    if (filters.sectionId)      q.set('sectionId', filters.sectionId);
    fetch(`${API}/students/stats?${q}`).then(r => r.json()).then(d => { if (d.success) setStats(d.stats); });
  }, [filters.academicYearId, filters.sectionId]);

  const loadStudents = useCallback(() => {
    setLoading(true); setError(''); setSelected(new Set());
    const active = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined));
    const q = new URLSearchParams({ page, limit: 50, sortBy, sortDir, ...active });
    q.set('viewMode', viewMode);

    fetch(`${API}/students?${q}`).then(r => r.json())
      .then(d => { if (d.success) { setStudents(d.students); setTotal(d.total); } else setError(d.error || 'فشل التحميل'); })
      .catch(() => setError('تعذّر الاتصال بالخادم')).finally(() => setLoading(false));
  }, [filters, page, viewMode, sortBy, sortDir]);

  useEffect(() => { loadStats(); },    [loadStats]);
  useEffect(() => { setPage(1); setSelected(new Set()); }, [filters, viewMode, sortBy, sortDir]);
  useEffect(() => { loadStudents(); }, [loadStudents]);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(''), 4000); return () => clearTimeout(t); } }, [success]);

  const filteredStages = formOpts.stages?.filter(s => !filters.sectionId || String(s.section_id) === filters.sectionId) || [];
  const filteredGrades = formOpts.grades?.filter(g => !filters.stageId  || String(g.stage_id)   === filters.stageId)   || [];
  const totalPages = Math.ceil(total / 50);
  const isSecondary = formOpts.stages?.find(s => String(s.id) === filters.stageId)?.stage_name === 'ثانوي';

  const handleSort = (field, dir) => { setSortBy(field); setSortDir(dir); };
  const advCount = [filters.gender, filters.religion, filters.isMerged, filters.nationalityId].filter(Boolean).length;

  const allSelected = students.length > 0 && selected.size === students.length;
  const toggleAll   = () => setSelected(allSelected ? new Set() : new Set(students.map(s => s.id)));
  const toggleOne   = id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const handleSingleDeleteClick = (id) => {
    setSelected(new Set([id]));
    setShowDeleteConfirm(true);
  };

  const safeFetch = async (url, options = {}) => {
    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        if (!res.ok) {
          throw new Error(`تعذر التواصل مع الخادم (${res.status}). يرجى التأكد من تشغيل الخدمة بشكل صحيح.`);
        }
        throw new Error('استجابة غير متوقعة من الخادم.');
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'حدث خطأ أثناء معالجة الطلب.');
      }
      return data;
    } catch (err) {
      if (err.name === 'SyntaxError' || err.message.includes('Unexpected token') || err.message.includes('JSON')) {
        throw new Error('⚠️ تعذر التواصل مع الخدمة الخلفية للبرنامج. يرجى التأكد من إعادة تشغيل الخادم وتحديث الصفحة.');
      }
      throw err;
    }
  };

  const handleBulkDelete = async (reason) => {
    setActionLoading(true);
    setError(''); setSuccess('');
    try {
      const data = await safeFetch(`${API}/students/bulk-delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selected], reason }) });
      setSuccess(data.message); setShowDeleteConfirm(false); loadStudents(); loadStats();
    } catch (e) { setError(e.message); } finally { setActionLoading(false); }
  };

  const handleBulkRestore = async () => {
    setActionLoading(true);
    setError(''); setSuccess('');
    try {
      const data = await safeFetch(`${API}/students/bulk-restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selected] }) });
      setSuccess(data.message); setSelected(new Set()); loadStudents(); loadStats();
    } catch (e) { setError(e.message); } finally { setActionLoading(false); }
  };

  const handleBulkPermanentDelete = async () => {
    const count = selected.size;
    if (!window.confirm(`⚠️ تحذير مهم جداً:\n\nهل أنت متأكد تماماً من حذف ${count} طالب نهائياً من قاعدة البيانات؟\nسيتم مسح جميع بياناتهم وسجلاتهم بشكل قطعي ولن يمكن استعادتها أبدًا.`)) return;
    setActionLoading(true);
    setError(''); setSuccess('');
    try {
      const data = await safeFetch(`${API}/students/bulk-delete-permanent`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selected] }) });
      setSuccess(data.message); setSelected(new Set()); loadStudents(); loadStats();
    } catch (e) { setError(e.message); } finally { setActionLoading(false); }
  };

  const handleBulkUpdate = async (field, value) => {
    setActionLoading(true);
    setError(''); setSuccess('');
    try {
      const data = await safeFetch(`${API}/students/bulk-update`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selected], field, value }) });
      setSuccess(data.message); setShowBulkEdit(false); loadStudents(); loadStats();
    } catch (e) { setError(e.message); } finally { setActionLoading(false); }
  };

  const handlePurgeAll = async (confirmText) => {
    setActionLoading(true);
    setError(''); setSuccess('');
    try {
      const data = await safeFetch(`${API}/students/purge-all`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmText }) });
      setSuccess(data.message); setShowPurgeModal(false); loadStudents(); loadStats();
    } catch (e) { setError(e.message); } finally { setActionLoading(false); }
  };

  const handleRestoreStatus = async (id) => {
    if (!window.confirm('هل تريد إعادة تفعيل قيد هذا الطالب وإرجاعه للمقيدين النشطين؟')) return;
    setActionLoading(true);
    setError(''); setSuccess('');
    try {
      const data = await safeFetch(`${API}/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'promoted' })
      });
      setSuccess('تم إعادة تفعيل الطالب بنجاح.');
      loadStudents(); loadStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async (id, name) => {
    if (!window.confirm(`⚠️ تحذير نهائي:\n\nهل أنت متأكد من حذف الطالب "${name}" بالكامل من قاعدة البيانات؟\nسيتم حذف جميع سجلاته نهائياً ولا يمكن استعادة هذه البيانات.`)) return;
    setActionLoading(true);
    setError(''); setSuccess('');
    try {
      const data = await safeFetch(`${API}/students/${id}/permanent`, {
        method: 'DELETE'
      });
      setSuccess('تم حذف الطالب نهائياً بنجاح.');
      loadStudents(); loadStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtractNationalId = async () => {
    if (!window.confirm('هل أنت متأكد من رغبتك في استخلاص تاريخ الميلاد، الجنس، ومحل الميلاد لجميع الطلاب من أرقامهم القومية تلقائياً؟ لن يتم تعديل الحقول المعبأة مسبقاً.')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/students/bulk-extract-national-id`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(data.message); loadStudents();
    } catch (e) { setError(e.message); } finally { setActionLoading(false); }
  };

  const resetFilters = () => {
    setSortBy('date'); setSortDir('desc');
    setFilters({ ...BASE_FILTERS, sectionId: activeSectionId && activeSectionId !== 'all' ? String(activeSectionId) : '' });
  };

  const SORT_NAMES = { name: 'أبجدياً', gender: 'بالنوع', status: 'بالحالة', grade: 'بالصف', religion: 'بالديانة', date: 'بالتاريخ' };

  return (
    <div className="students-module">

      {/* ── Page Header ──────────────────────────────────── */}
      <div className="page-header">
        <div className="page-title-area">
          <div className="page-icon"><GraduationCap size={22} /></div>
          <div>
            <h1 className="page-title">شئون الطلاب والقبول</h1>
            <p className="page-sub">إدارة بيانات الطلاب وملفاتهم الأكاديمية</p>
          </div>
        </div>
        <div className="page-header-actions" style={{ position: 'relative' }}>
          <button className="btn-add-student" onClick={onAdd}><UserPlus size={16} /> <span>تسجيل جديد</span></button>
          <button className="btn-import-excel" onClick={onImport}><FileSpreadsheet size={15} /> <span>استيراد Excel</span></button>

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn-import-excel"
              onClick={(e) => {
                e.stopPropagation();
                setShowMoreOps(prev => !prev);
              }}
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              <span>إجراءات إضافية {showMoreOps ? '▲' : '▼'}</span>
            </button>

            {showMoreOps && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 99998 }}
                  onClick={() => setShowMoreOps(false)}
                />
                <div
                  className="more-ops-dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    left: 'auto',
                    zIndex: 99999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    padding: 8,
                    minWidth: 220,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 12,
                    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.18)'
                  }}
                >
                  {onQuickEdit && (
                    <button className="more-ops-menu-item" onClick={() => { onQuickEdit(); setShowMoreOps(false); }}>
                      <Edit3 size={14} style={{ marginLeft: 8 }} /> <span>تعديل سريع</span>
                    </button>
                  )}
                  {onTransfers && (
                    <button className="more-ops-menu-item" onClick={() => { onTransfers(); setShowMoreOps(false); }}>
                      <ArrowLeftRight size={14} style={{ marginLeft: 8 }} /> <span>التحويلات</span>
                    </button>
                  )}
                  {onAbsence && (
                    <button className="more-ops-menu-item" onClick={() => { onAbsence(); setShowMoreOps(false); }}>
                      <AlertTriangle size={14} style={{ marginLeft: 8, color: '#f59e0b' }} /> <span>إنذارات الغياب والقيد</span>
                    </button>
                  )}
                  {onSeating && (
                    <button className="more-ops-menu-item" onClick={() => { onSeating(); setShowMoreOps(false); }}>
                      <Layers size={14} style={{ marginLeft: 8, color: '#6366f1' }} /> <span>أرقام الجلوس واللجان (12 د)</span>
                    </button>
                  )}
                  {onDistribute && (
                    <button className="more-ops-menu-item" onClick={() => { onDistribute(); setShowMoreOps(false); }}>
                      <Grid size={14} style={{ marginLeft: 8 }} /> <span>توزيع الفصول</span>
                    </button>
                  )}
                  <button className="more-ops-menu-item" onClick={() => { handleExtractNationalId(); setShowMoreOps(false); }} disabled={actionLoading}>
                    <RefreshCw size={14} style={{ marginLeft: 8 }} className={actionLoading ? 'spin' : ''} /> <span>تحديث الهويات</span>
                  </button>
                  <button className="more-ops-menu-item" onClick={() => { handleCheckDuplicates(); setShowMoreOps(false); }}>
                    <Search size={14} style={{ marginLeft: 8, color: '#0284c7' }} /> <span>فحص التكرار والأرقام القومية</span>
                  </button>
                  {isSuperAdmin && (
                    <>
                      <div style={{ borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
                      <button className="more-ops-menu-item" onClick={() => { setShowPurgeModal(true); setShowMoreOps(false); }} style={{ color: '#ef4444' }}>
                        <Trash2 size={14} style={{ marginLeft: 8, color: '#ef4444' }} /> <span>حذف جميع الطلاب</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Cards ──────────────────────────────────── */}
      {viewMode !== 'reports' && (
        <div className="stats-row">
          <div className="stat-chip total"><div className="stat-icon"><Users size={20} /></div><div><div className="stat-val">{stats.total}</div><div className="stat-lbl">إجمالي الطلاب</div></div></div>
          <div className="stat-chip active"><div className="stat-icon"><CheckCircle size={20} /></div><div><div className="stat-val">{stats.promoted}</div><div className="stat-lbl">منقولون</div></div></div>
          <div className="stat-chip male" style={{ cursor: 'pointer' }} onClick={() => setFilters(f => ({ ...f, gender: f.gender === 'ذكر' ? '' : 'ذكر' }))}>
            <div className="stat-icon">👦</div>
            <div>
              <div className="stat-val">{stats.male}</div>
              <div className="stat-lbl" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                ذكور {stats.total > 0 && <span style={{ fontSize: 10, opacity: 0.6, background: 'rgba(99,102,241,0.15)', padding: '1px 6px', borderRadius: 10 }}>{Math.round(stats.male / stats.total * 100)}%</span>}
              </div>
            </div>
          </div>
          <div className="stat-chip female" style={{ cursor: 'pointer' }} onClick={() => setFilters(f => ({ ...f, gender: f.gender === 'أنثى' ? '' : 'أنثى' }))}>
            <div className="stat-icon">👧</div>
            <div>
              <div className="stat-val">{stats.female}</div>
              <div className="stat-lbl" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                إناث {stats.total > 0 && <span style={{ fontSize: 10, opacity: 0.6, background: 'rgba(236,72,153,0.15)', padding: '1px 6px', borderRadius: 10 }}>{Math.round(stats.female / stats.total * 100)}%</span>}
              </div>
            </div>
          </div>
          <div className="stat-chip transferred"><div className="stat-icon"><ArrowLeftRight size={20} /></div><div><div className="stat-val">{stats.retained}</div><div className="stat-lbl">باقون للإعادة</div></div></div>
          {stats.disconnected > 0 && (
            <div className="stat-chip warning" style={{ cursor: 'pointer' }} onClick={() => setViewMode('disconnected')}>
              <div className="stat-icon">⚠️</div>
              <div>
                <div className="stat-val">{stats.disconnected}</div>
                <div className="stat-lbl">منقطعون</div>
              </div>
            </div>
          )}
          {stats.suspended > 0 && (
            <div className="stat-chip warning" style={{ cursor: 'pointer', background: '#fff7ed', borderColor: '#fed7aa', color: '#c2410c' }} onClick={() => setViewMode('suspended')}>
              <div className="stat-icon">🛑</div>
              <div>
                <div className="stat-val">{stats.suspended}</div>
                <div className="stat-lbl">موقوف قيدهم</div>
              </div>
            </div>
          )}
          {stats.excluded > 0 && (
            <div className="stat-chip danger" style={{ cursor: 'pointer' }} onClick={() => setViewMode('excluded')}>
              <div className="stat-icon">🚫</div>
              <div>
                <div className="stat-val">{stats.excluded}</div>
                <div className="stat-lbl">مستبعدون</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── View Tabs (سجلات القيد وحالات الطلاب) ─────────────────── */}
      <div className="form-tabs" style={{ marginBottom: 0 }}>
        <button className={`form-tab ${viewMode === 'active' ? 'active' : ''}`} onClick={() => setViewMode('active')}>📋 سجل القيد الرئيسي ({stats.total})</button>
        <button className={`form-tab ${viewMode === 'disconnected' ? 'active' : ''}`} onClick={() => setViewMode('disconnected')} style={viewMode === 'disconnected' ? { borderColor: '#d97706', color: '#d97706' } : {}}>⚠️ سجل المنقطعين ({stats.disconnected || 0})</button>
        <button className={`form-tab ${viewMode === 'suspended' ? 'active' : ''}`} onClick={() => setViewMode('suspended')} style={viewMode === 'suspended' ? { borderColor: '#b45309', color: '#b45309' } : {}}>🛑 سجل الموقوف قيدهم ({stats.suspended || 0})</button>
        <button className={`form-tab ${viewMode === 'excluded' ? 'active' : ''}`} onClick={() => setViewMode('excluded')} style={viewMode === 'excluded' ? { borderColor: '#ef4444', color: '#ef4444' } : {}}>🚫 سجل المستبعدين ({stats.excluded || 0})</button>
        <button className={`form-tab ${viewMode === 'deleted' ? 'active' : ''}`} onClick={() => setViewMode('deleted')} style={viewMode === 'deleted' ? { borderColor: '#6b7280', color: '#6b7280' } : {}}>🗑️ السلة ({stats.deleted || 0})</button>
      </div>

      {/* ── Alerts ────────────────────────────────────────── */}
      {error   && <div className="form-alert error"   style={{ marginBottom: 12 }}><AlertTriangle size={15} /> {error}</div>}
      {success && <div className="form-alert success" style={{ marginBottom: 12 }}><CheckCircle size={15} /> {success}</div>}

      {/* ── Bulk Bar ──────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="bulk-action-bar">
          <span className="bulk-count"><CheckSquare size={16} /> {selected.size} طالب محدد</span>
          <div className="bulk-actions">
            {viewMode === 'active' ? (<>
              <button className="bulk-btn edit"    onClick={() => setShowBulkEdit(true)}      disabled={actionLoading}><Edit3 size={15} /> تعديل جماعي</button>
              {isSuperAdmin && (
                <button className="bulk-btn delete"  onClick={() => setShowDeleteConfirm(true)} disabled={actionLoading}><UserX size={15} /> استبعاد المحددين</button>
              )}
            </>) : viewMode === 'deleted' ? (<>
              <button className="bulk-btn restore" onClick={handleBulkRestore} disabled={actionLoading}><RotateCcw size={15} /> استعادة المحددين</button>
              {isSuperAdmin && (
                <button className="bulk-btn delete" onClick={handleBulkPermanentDelete} disabled={actionLoading}
                  style={{ background: 'rgba(239,68,68,0.15)', borderColor: '#ef4444', color: '#ef4444' }}>
                  <Trash2 size={15} /> حذف نهائي ({selected.size})
                </button>
              )}
            </>) : (
              <button className="bulk-btn restore" onClick={handleBulkRestore} disabled={actionLoading}><RotateCcw size={15} /> استعادة المحددين</button>
            )}
            <button className="bulk-btn cancel" onClick={() => setSelected(new Set())}><X size={15} /> إلغاء التحديد</button>
          </div>
        </div>
      )}

        <>
          {/* ── Filter Panel ──────────────────────────────────── */}
      <div className="filter-panel glass-panel">

        {/* Row 1 — Main filters */}
        <div className="filter-row">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input type="text" placeholder="بحث بالاسم أو الكود أو الرقم القومي..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} className="search-input" />
          </div>
          <select className="filter-select" value={filters.academicYearId} onChange={e => setFilters(f => ({ ...f, academicYearId: e.target.value }))}>
            <option value="">كل الأعوام</option>
            {formOpts.academicYears?.map(y => <option key={y.id} value={y.id}>{y.year_label}</option>)}
          </select>
          <select className="filter-select" value={filters.sectionId} onChange={e => setFilters(f => ({ ...f, sectionId: e.target.value, stageId: '', gradeId: '' }))} disabled={activeSectionId && activeSectionId !== 'all'}>
            <option value="">كل الأقسام</option>
            {formOpts.sections?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="filter-select" value={filters.stageId} onChange={e => setFilters(f => ({ ...f, stageId: e.target.value, gradeId: '' }))}>
            <option value="">كل المراحل</option>
            {filteredStages.map(s => <option key={s.id} value={s.id}>{s.stage_name}</option>)}
          </select>
          <select className="filter-select" value={filters.gradeId} onChange={e => setFilters(f => ({ ...f, gradeId: e.target.value, classId: '' }))}>
            <option value="">كل الصفوف</option>
            {filteredGrades.map(g => <option key={g.id} value={g.id}>{g.grade_name_ar}</option>)}
          </select>
          {classrooms.length > 0 && (
            <select className="filter-select" value={filters.classId} onChange={e => setFilters(f => ({ ...f, classId: e.target.value }))}>
              <option value="">كل الفصول</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{'\u200E' + c.class_name}</option>)}
            </select>
          )}
          {viewMode === 'active' && (
            <select className="filter-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="">كل الحالات</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          )}
          {isSecondary && (
            <select className="filter-select" value={filters.secondaryTrack} onChange={e => setFilters(f => ({ ...f, secondaryTrack: e.target.value }))}>
              <option value="">كل المسارات</option>
              {Object.entries(TRACK_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          )}
          <button className="filter-reset" onClick={() => setShowAdv(v => !v)}
            style={advCount > 0 ? { borderColor: 'rgba(129,140,248,0.5)', color: '#818cf8', background: 'rgba(129,140,248,0.08)' } : {}}>
            <SlidersHorizontal size={14} /> فلاتر متقدمة
            {advCount > 0 && <span style={{ background: '#818cf8', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 7px', minWidth: 18, textAlign: 'center' }}>{advCount}</span>}
          </button>
          <button className="filter-reset" onClick={resetFilters}><RefreshCw size={14} /> إعادة ضبط</button>
        </div>

        {/* Row 2 — Advanced filters (collapsible) */}
        {showAdv && (
          <div className="filter-row" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color, #e5e7eb)', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>

            {/* Gender pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary, #4b5563)', whiteSpace: 'nowrap' }}>النوع:</span>
              <div style={{ display: 'flex', gap: 5 }}>
                <PillBtn active={filters.gender === ''}     color="white"  onClick={() => setFilters(f => ({ ...f, gender: '' }))}>الكل</PillBtn>
                <PillBtn active={filters.gender === 'ذكر'} color="indigo" onClick={() => setFilters(f => ({ ...f, gender: 'ذكر' }))}>👦 ذكور</PillBtn>
                <PillBtn active={filters.gender === 'أنثى'} color="pink"  onClick={() => setFilters(f => ({ ...f, gender: 'أنثى' }))}>👧 إناث</PillBtn>
              </div>
            </div>

            {/* Religion pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary, #4b5563)', whiteSpace: 'nowrap' }}>الديانة:</span>
              <div style={{ display: 'flex', gap: 5 }}>
                <PillBtn active={filters.religion === ''}        color="white" onClick={() => setFilters(f => ({ ...f, religion: '' }))}>الكل</PillBtn>
                <PillBtn active={filters.religion === 'مسلم'}   color="amber" onClick={() => setFilters(f => ({ ...f, religion: 'مسلم' }))}>☪️ مسلم</PillBtn>
                <PillBtn active={filters.religion === 'مسيحي'}  color="amber" onClick={() => setFilters(f => ({ ...f, religion: 'مسيحي' }))}>✝️ مسيحي</PillBtn>
              </div>
            </div>

            {/* Merge pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary, #4b5563)', whiteSpace: 'nowrap' }}>الدمج:</span>
              <div style={{ display: 'flex', gap: 5 }}>
                <PillBtn active={filters.isMerged === ''}  color="white" onClick={() => setFilters(f => ({ ...f, isMerged: '' }))}>الكل</PillBtn>
                <PillBtn active={filters.isMerged === '1'} color="green" onClick={() => setFilters(f => ({ ...f, isMerged: '1' }))}>♿ مدمج</PillBtn>
                <PillBtn active={filters.isMerged === '0'} color="white" onClick={() => setFilters(f => ({ ...f, isMerged: '0' }))}>— عادي</PillBtn>
              </div>
            </div>

            {/* حالة القيد pills */}
            {viewMode === 'active' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary, #4b5563)', whiteSpace: 'nowrap' }}>حالة القيد:</span>
                <div style={{ display: 'flex', gap: 5 }}>
                  <PillBtn active={filters.status === ''}         color="white" onClick={() => setFilters(f => ({ ...f, status: '' }))}>الكل</PillBtn>
                  <PillBtn active={filters.status === 'promoted'} color="green" onClick={() => setFilters(f => ({ ...f, status: 'promoted' }))}>✅ منقول</PillBtn>
                  <PillBtn active={filters.status === 'retained'} color="amber" onClick={() => setFilters(f => ({ ...f, status: 'retained' }))}>🔄 باقٍ للإعادة</PillBtn>
                  <PillBtn active={filters.status === 'suspended'} color="indigo" onClick={() => setFilters(f => ({ ...f, status: 'suspended' }))}>🔴 موقوف</PillBtn>
                </div>
              </div>
            )}

            {/* Nationality dropdown */}
            {formOpts.nationalities?.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary, #4b5563)', whiteSpace: 'nowrap' }}>الجنسية:</span>
                <select className="filter-select" value={filters.nationalityId} onChange={e => setFilters(f => ({ ...f, nationalityId: e.target.value }))} style={{ minWidth: 130 }}>
                  <option value="">كل الجنسيات</option>
                  {formOpts.nationalities.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Active filter chips */}
        {advCount > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {filters.gender && <FilterChip label={filters.gender === 'ذكر' ? '👦 ذكور' : '👧 إناث'} onRemove={() => setFilters(f => ({ ...f, gender: '' }))} />}
            {filters.religion && <FilterChip label={filters.religion === 'مسلم' ? '☪️ مسلم' : '✝️ مسيحي'} onRemove={() => setFilters(f => ({ ...f, religion: '' }))} />}
            {filters.isMerged !== '' && <FilterChip label={filters.isMerged === '1' ? '♿ مدمج' : '— عادي'} onRemove={() => setFilters(f => ({ ...f, isMerged: '' }))} />}
            {filters.nationalityId && <FilterChip label={`🌍 ${formOpts.nationalities?.find(n => String(n.id) === filters.nationalityId)?.name || ''}`} onRemove={() => setFilters(f => ({ ...f, nationalityId: '' }))} />}
          </div>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div className="table-container glass-panel">
        {loading ? (
          <div className="table-loading"><div className="loading-spinner" /><span>جاري تحميل بيانات الطلاب...</span></div>
        ) : students.length === 0 ? (
          <div className="table-empty">
            <GraduationCap size={52} opacity={0.3} />
            <p>{viewMode === 'deleted' ? 'لا يوجد طلاب في قائمة المستبعدين' : 'لا يوجد طلاب مطابقون لمعايير البحث'}</p>
            {viewMode === 'active' && <button className="btn-add-student-sm" onClick={onAdd}><UserPlus size={16} /> تسجيل أول طالب</button>}
          </div>
        ) : (
          <>
            <div className="table-info-bar">
              <span>إجمالي النتائج: <strong>{total}</strong> طالب</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {sortBy !== 'date' && (
                  <span style={{ fontSize: 11, color: '#818cf8', background: 'rgba(129,140,248,0.1)', padding: '2px 10px', borderRadius: 20, border: '1px solid rgba(129,140,248,0.2)' }}>
                    مرتب {SORT_NAMES[sortBy]} {sortDir === 'asc' ? '↑' : '↓'}
                  </span>
                )}
                <span>صفحة {page} من {totalPages}</span>
              </span>
            </div>
            <div className="table-scroll">
              <table className="students-table">
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: 'center' }}>
                      <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>
                        {allSelected ? <CheckSquare size={16} color="#818cf8" /> : <Square size={16} opacity={0.5} />}
                      </button>
                    </th>
                    <th>كود الطالب</th>
                    <SortTh label="اسم الطالب"     field="name"     sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <th>القسم / المرحلة / الصف</th>
                    <th style={{ textAlign: 'center' }}>الفصل</th>
                    <SortTh label="النوع"          field="gender"   sortBy={sortBy} sortDir={sortDir} onSort={handleSort} style={{ textAlign: 'center' }} />
                    <SortTh label="الديانة"        field="religion" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} style={{ textAlign: 'center' }} />
                    <th style={{ textAlign: 'center' }}>الجنسية</th>
                    <SortTh label="حالة القيد"     field="status"   sortBy={sortBy} sortDir={sortDir} onSort={handleSort} style={{ textAlign: 'center' }} />
                    <th style={{ textAlign: 'center' }}>الدمج</th>
                    <th>الهاتف</th>
                    {viewMode === 'deleted' && <th>سبب الاستبعاد</th>}
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => {
                    const statusCfg = STATUS_LABELS[s.status] || STATUS_LABELS.promoted;
                    const isChecked = selected.has(s.id);
                    return (
                      <tr key={s.id} className={`table-row ${isChecked ? 'row-selected' : ''}`}
                        onClick={() => onView(s.id)} style={{ opacity: viewMode === 'deleted' ? 0.75 : 1 }}>
                        <td style={{ textAlign: 'center' }} onClick={e => { e.stopPropagation(); toggleOne(s.id); }}>
                          {isChecked ? <CheckSquare size={16} color="#818cf8" /> : <Square size={16} opacity={0.4} />}
                        </td>
                        <td><code className="student-code">{s.student_code || '—'}</code></td>
                        <td className="student-name">{s.full_name_ar}</td>
                        <td className="student-section">
                          <span className="tag-section">{s.section_name}</span>
                          <span className="tag-grade">{s.stage_name} — {s.grade_name_ar}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {s.classroom_name
                            ? <span className="tag-track" style={{ background: '#6366f122', color: '#818cf8' }}>{s.classroom_name}</span>
                            : <span style={{ opacity: 0.35 }}>—</span>}
                        </td>
                        {/* النوع */}
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                          {s.gender === 'ذكر'  ? <span style={{ color: '#818cf8', fontWeight: 700 }}>👦 ذكر</span>
                          : s.gender === 'أنثى' ? <span style={{ color: '#f9a8d4', fontWeight: 700 }}>👧 أنثى</span>
                          : <span style={{ opacity: 0.35 }}>—</span>}
                        </td>
                        {/* الديانة */}
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'center', fontSize: 12 }}>
                          {s.religion === 'مسلم'   ? <span style={{ color: '#fbbf24' }}>☪️ مسلم</span>
                          : s.religion === 'مسيحي' ? <span style={{ color: '#93c5fd' }}>✝️ مسيحي</span>
                          : <span style={{ opacity: 0.35 }}>{s.religion || '—'}</span>}
                        </td>
                        {/* الجنسية */}
                        <td style={{ textAlign: 'center', fontSize: 12 }}>
                          {s.nationality_name
                            ? <span style={{ color: 'rgba(255,255,255,0.75)' }}>🌍 {s.nationality_name}</span>
                            : <span style={{ opacity: 0.3 }}>—</span>}
                        </td>
                        {/* حالة القيد */}
                        <td style={{ textAlign: 'center' }}>
                          {(() => {
                            const displayStatus = s.enrollment_status || (STATUS_LABELS[s.status] ? STATUS_LABELS[s.status].label : null) || (s.status === 'disconnected' ? 'منقطع' : s.status === 'suspended' ? 'موقوف قيده' : s.status === 'excluded' ? 'مستبعد' : 'منقول');
                            let badgeColor = '#10b981';
                            if (displayStatus.includes('باق')) badgeColor = '#3b82f6';
                            else if (displayStatus.includes('منقطع')) badgeColor = '#d97706';
                            else if (displayStatus.includes('موقوف')) badgeColor = '#b45309';
                            else if (displayStatus.includes('مستبعد')) badgeColor = '#ef4444';
                            return (
                              <span className="status-badge" style={{ background: badgeColor + '22', color: badgeColor, border: `1px solid ${badgeColor}44`, padding: '4px 10px', borderRadius: '12px', fontWeight: 800, fontSize: '12px' }}>
                                {displayStatus}
                              </span>
                            );
                          })()}
                        </td>
                        {/* الدمج */}
                        <td style={{ textAlign: 'center' }}>
                          {s.is_merged
                            ? <span style={{ fontSize: 11, background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)', padding: '2px 10px', borderRadius: 20 }}>♿ مدمج</span>
                            : <span style={{ opacity: 0.3 }}>—</span>}
                        </td>
                        <td className="phone-cell" dir="ltr">{s.guardian_phone || '—'}</td>
                        {viewMode === 'deleted' && <td style={{ opacity: 0.7, fontSize: 12 }}>{s.deletion_reason || '—'}</td>}
                        <td>
                          <div className="row-actions" onClick={e => e.stopPropagation()}>
                            <button className="action-btn view" onClick={() => onView(s.id)} title="عرض الملف"><Eye size={15} /></button>
                            {viewMode === 'active' && (
                              <button className="action-btn view" style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}
                                onClick={() => handleSingleDeleteClick(s.id)} title="استبعاد الطالب">
                                <UserX size={14} />
                              </button>
                            )}
                            {(viewMode === 'excluded' || viewMode === 'disconnected' || viewMode === 'deleted') && (
                              <>
                                <button className="action-btn edit" style={{ borderColor: 'rgba(16,185,129,0.3)', color: '#10b981' }}
                                  onClick={() => handleRestoreStatus(s.id)} title="إعادة تفعيل القيد">
                                  <RotateCcw size={14} />
                                </button>
                                <button className="action-btn view" style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}
                                  onClick={() => handlePermanentDelete(s.id, s.full_name_ar)} title="حذف نهائي للطالب">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                عرض الصفحات: <strong style={{ color: '#0f172a' }}>{page}</strong> من <strong style={{ color: '#0f172a' }}>{totalPages || 1}</strong> (إجمالي {total} طالب)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronRight size={16} /> السابق
                </button>
                <div className="page-numbers">
                  {Array.from({ length: Math.min(7, totalPages || 1) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 3 + i, Math.max(1, (totalPages || 1) - 6 + i)));
                    return (
                      <button key={p} className={`page-num ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>
                        {p}
                      </button>
                    );
                  })}
                </div>
                <button className="page-btn" disabled={page >= (totalPages || 1)} onClick={() => setPage(p => p + 1)}>
                  التالي <ChevronLeft size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
        </>

      {showDuplicatesModal && (
        <div className="modal-backdrop" onClick={() => setShowDuplicatesModal(false)}>
          <div className="modal-box" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔍 فحص وتدقيق الطلاب والأرقام القومية المكررة</h3>
              <button className="modal-close" onClick={() => setShowDuplicatesModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 20, maxHeight: '60vh', overflowY: 'auto' }}>
              {checkingDuplicates ? (
                <div style={{ textAlign: 'center', padding: 30, fontWeight: 700, color: '#64748b' }}>
                  جاري فحص قاعدة البيانات لكشف الطلاب والأرقام القومية المكررة...
                </div>
              ) : duplicatesData && (duplicatesData.duplicateNationalIdCount > 0 || duplicatesData.duplicateNameCount > 0) ? (
                <div>
                  <div style={{ padding: 12, background: '#fef3c7', color: '#b45309', borderRadius: 8, fontWeight: 700, marginBottom: 16 }}>
                    ⚠️ تم اكتشاف عدد {duplicatesData.duplicateNationalIdCount} رقم قومي مكرر.
                  </div>

                  {duplicatesData.duplicateStudentsById?.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <h4 style={{ margin: '0 0 10px', color: '#0f172a', fontWeight: 800 }}>📌 الأرقام القومية المكررة:</h4>
                      <table className="staff-table" style={{ fontSize: 13 }}>
                        <thead>
                          <tr>
                            <th>اسم الطالب</th>
                            <th>الرقم القومي</th>
                            <th>الصف / القسم</th>
                            <th>حالة القيد</th>
                            <th>إجراء</th>
                          </tr>
                        </thead>
                        <tbody>
                          {duplicatesData.duplicateStudentsById.map(s => (
                            <tr key={s.id}>
                              <td style={{ fontWeight: 800 }}>{s.full_name_ar}</td>
                              <td style={{ fontFamily: 'monospace' }} dir="ltr">{s.national_id}</td>
                              <td>{s.grade_name_ar || '-'}</td>
                              <td><span className="staff-cadre-chip">{s.enrollment_status || s.status || 'منقول'}</span></td>
                              <td>
                                <button className="staff-action-btn edit" onClick={() => { setShowDuplicatesModal(false); onView(s.id); }}>
                                  <Edit3 size={14} /> تعديل
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 30, color: '#166534', background: '#f0fdf4', borderRadius: 10, fontWeight: 700 }}>
                  ✅ ممتاز! جميع الأرقام القومية مفردة ولا توجد أي أرقام مكررة في قاعدة البيانات.
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'left' }}>
              <button className="btn-cancel" onClick={() => setShowDuplicatesModal(false)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {showBulkEdit && <BulkEditModal count={selected.size} formOpts={formOpts} onApply={handleBulkUpdate} onClose={() => setShowBulkEdit(false)} />}
      {showDeleteConfirm && <DeleteConfirmModal count={selected.size} onConfirm={handleBulkDelete} onClose={() => setShowDeleteConfirm(false)} />}
      {showPurgeModal && <PurgeConfirmModal onConfirm={handlePurgeAll} onClose={() => setShowPurgeModal(false)} actionLoading={actionLoading} />}
    </div>
  );
}
