// ════════════════════════════════════════════════════════════════
//  ReportsPage — Shell (مركز تقارير وشئون الطلاب والطباعة الموحد)
// ════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, FileSpreadsheet, Printer,
  Filter, RefreshCw, BookOpen, List, BarChart3,
  Search, LayoutGrid, X, Layers, Sparkles, ChevronDown, CheckCircle2
} from 'lucide-react';
import REPORTS from './reportRegistry';
import './reports.css';

const API = `http://${window.location.hostname}:3001/api`;

/* ── Category icons ────────────────────────────────────────────── */
const CAT_ICONS = {
  'الكل':             <Sparkles  size={14} />,
  'سجلات القيد':       <BookOpen  size={14} />,
  'قوائم الفصول':      <List      size={14} />,
  'إحصائيات':          <BarChart3 size={14} />,
  'المطبوعات والنماذج': <Printer   size={14} />,
  'الصحة المدرسية':    <FileText  size={14} />,
  'الكنترول والامتحانات': <Layers   size={14} />,
};

/* ── Unique categories ─────────────────────────────────────────── */
const CATEGORIES = ['الكل', ...new Set(REPORTS.map(r => r.category))];

export default function ReportsPage({ activeSectionId }) {
  /* ─── State ─────────────────────────────────────────────────── */
  const [activeId, setActiveId] = useState(REPORTS.find(r => r.available)?.id || '');
  const activeReport = REPORTS.find(r => r.id === activeId);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [showHubModal, setShowHubModal] = useState(false);

  const [formOpts,   setFormOpts]   = useState({ sections: [], stages: [], grades: [], academicYears: [] });
  const [schoolInfo, setSchoolInfo] = useState({ schoolName: '', governorate: '', directorate: '' });
  const [classrooms, setClassrooms] = useState([]);

  const [filters, setFilters] = useState({
    sectionId: activeSectionId && activeSectionId !== 'all' ? String(activeSectionId) : '',
    stageId: '', gradeId: '', academicYearId: '', classId: '',
  });

  useEffect(() => {
    if (activeSectionId && activeSectionId !== 'all') {
      setFilters(f => ({ ...f, sectionId: String(activeSectionId), stageId: '', gradeId: '', classId: '' }));
    } else if (!activeSectionId || activeSectionId === 'all') {
      setFilters(f => ({ ...f, sectionId: '' }));
    }
  }, [activeSectionId]);

  const [students,    setStudents]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [reportReady, setReportReady] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  const filteredStages = formOpts.stages?.filter(
    s => !filters.sectionId || String(s.section_id) === filters.sectionId) || [];
  const filteredGrades = formOpts.grades?.filter(
    g => !filters.stageId || String(g.stage_id) === filters.stageId) || [];

  const selectedYear      = formOpts.academicYears?.find(y => String(y.id) === filters.academicYearId);
  const selectedGrade     = formOpts.grades?.find(g => String(g.id) === filters.gradeId);
  const selectedClassroom = classrooms.find(c => String(c.id) === filters.classId);

  const meta = { selectedYear, selectedGrade, selectedClassroom };

  /* ─── Boot ───────────────────────────────────────────────────── */
  useEffect(() => {
    fetch(`${API}/students/form-options`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setFormOpts(d);
          const cur = d.academicYears?.find(y => y.is_current === 1 || y.is_current === true);
          if (cur) setFilters(f => ({ ...f, academicYearId: String(cur.id) }));
        }
      });
    fetch(`${API}/setup/status`)
      .then(r => r.json())
      .then(d => {
        if (d.success)
          setSchoolInfo({
            schoolName: d.schoolName || '',
            governorate: d.governorate || '',
            directorate: d.directorate || '',
            logoUrl: d.logoUrl || null
          });
      });
  }, []);

  useEffect(() => {
    if (filters.gradeId && filters.academicYearId) {
      fetch(`${API}/settings/classrooms?gradeId=${filters.gradeId}&academicYearId=${filters.academicYearId}`)
        .then(r => r.json())
        .then(d => setClassrooms(d.success ? (d.classrooms || []) : []))
        .catch(() => setClassrooms([]));
    } else {
      setClassrooms([]);
      setFilters(f => ({ ...f, classId: '' }));
    }
  }, [filters.gradeId, filters.academicYearId]);

  const switchReport = (id) => {
    if (id === activeId) return;
    setActiveId(id);
    setStudents([]);
    setReportReady(false);
    setError('');
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    const catReports = cat === 'الكل' ? REPORTS : REPORTS.filter(r => r.category === cat);
    if (catReports.length > 0) {
      switchReport(catReports[0].id);
    }
  };

  const canGenerate = (() => {
    if (!activeReport?.available) return false;
    const f = activeReport.filters || {};
    if (f.requiresYear  && !filters.academicYearId) return false;
    if (f.requiresGrade && !filters.gradeId)        return false;
    if (f.requiresClass && !filters.classId)        return false;
    return true;
  })();

  const loadStudents = useCallback(async () => {
    if (!canGenerate) {
      setError('يرجى اكتمال الفلاتر المطلوبة (*)');
      return;
    }
    setLoading(true);
    setError('');
    setReportReady(false);
    try {
      const queryStr = activeReport.buildQuery(filters);
      const res  = await fetch(`${API}/students?${queryStr}`);
      const data = await res.json();
      if (data.success) {
        setStudents(data.students);
        setReportReady(true);
      } else {
        setError(data.error || 'فشل تحميل البيانات');
      }
    } catch {
      setError('تعذّر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }, [filters, activeReport, canGenerate]);

  const exportExcel = async () => {
    if (exportingExcel) return;
    setExportingExcel(true);
    setExportMsg('جاري إنشاء وتجهيز ملف الإكسيل الرسمي...');
    try {
      const endpoint = activeReport.excelEndpoint(filters);
      const filename = activeReport.excelFileName(filters, meta);
      const res  = await fetch(`http://${window.location.hostname}:3001${endpoint}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob   = await res.blob();
      const url    = window.URL.createObjectURL(blob);
      const a      = document.createElement('a');
      a.href       = url;
      a.download   = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setExportMsg(`✅ تم تصدير ملف الإكسيل (${filename}) بنجاح!`);
      setTimeout(() => setExportMsg(''), 4500);
    } catch (err) {
      alert('خطأ في تصدير Excel: ' + err.message);
      setExportMsg('');
    } finally {
      setExportingExcel(false);
    }
  };

  const printReport = () => {
    const orientation = activeReport?.orientation || 'portrait';
    const styleId = '__print_orientation_override__';
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = `@media print { @page { size: A4 ${orientation}; margin: 10mm; } }`;
    window.print();
    setTimeout(() => {
      const s = document.getElementById(styleId);
      if (s) s.remove();
    }, 2000);
  };

  const setF = (patch) => {
    setFilters(f => ({ ...f, ...patch }));
    setReportReady(false);
    setStudents([]);
  };

  const filteredReports = REPORTS.filter(r => {
    const matchesSearch = !searchTerm || r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.category.toLowerCase().includes(searchTerm.toLowerCase()) || (r.desc && r.desc.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === 'الكل' || r.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="reports-center">

      {/* ══ Main panel ═══════════════════════════════════════════ */}
      <main className="reports-main">

        {/* Top Header Card */}
        <div className="reports-header-card">
          <div className="reports-header-top">
            <div className="reports-header-info">
              <div className="reports-header-icon">{activeReport?.icon || '📊'}</div>
              <div>
                <h1 className="reports-header-title">
                  {activeReport?.name || 'اختر تقريراً'}
                  <span className="reports-header-badge">{activeReport?.category || 'عام'}</span>
                </h1>
                {activeReport?.desc && <p className="reports-header-desc">{activeReport.desc}</p>}
              </div>
            </div>

            <div className="reports-header-actions">
              <div className="reports-search-input-wrap">
                <Search size={15} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="reports-search-input"
                  placeholder="ابحث باسم التقرير (40 تقرير)..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              <button className="reports-hub-btn" onClick={() => setShowHubModal(true)}>
                <LayoutGrid size={16} /> <span>دليل كل التقارير (40)</span>
              </button>
            </div>
          </div>

          {/* Category Pills Bar */}
          <div className="reports-category-bar">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`reports-category-pill ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => handleCategorySelect(cat)}
              >
                {CAT_ICONS[cat] || null}
                <span>{cat}</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>
                  ({cat === 'الكل' ? REPORTS.length : REPORTS.filter(r => r.category === cat).length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Filters & Direct Report Switcher Card ───────────── */}
        {activeReport?.available && (
          <div className="report-filters-card">
            <div className="filters-title" style={{ justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Filter size={14} /> اختر التقرير والفلاتر المطلوب عرضها
              </span>
              <span style={{ fontSize: 11, color: '#4f46e5', fontWeight: 700 }}>
                إجمالي التقارير المتاحة: {filteredReports.length} تقرير
              </span>
            </div>

            <div className="filters-grid">

              {/* Direct Active Report Switcher */}
              <div className="filter-field" style={{ minWidth: 240 }}>
                <label style={{ fontWeight: 800, color: '#4f46e5' }}>التقرير المباشر المطلوب *</label>
                <select
                  value={activeId}
                  onChange={e => switchReport(e.target.value)}
                  style={{ height: 38, border: '2px solid #6366f1', background: '#eff6ff', fontWeight: 800, color: '#1e1b4b' }}
                >
                  {filteredReports.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.icon} {r.name} ({r.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Academic Year */}
              {activeReport.filters?.requiresYear && (
                <div className="filter-field">
                  <label>العام الدراسي *</label>
                  <select
                    value={filters.academicYearId}
                    onChange={e => setF({ academicYearId: e.target.value })}
                  >
                    <option value="">اختر العام...</option>
                    {formOpts.academicYears?.map(y =>
                      <option key={y.id} value={y.id}>{y.year_label}</option>)}
                  </select>
                </div>
              )}

              {/* Section */}
              {activeReport.filters?.requiresSection && (
                <div className="filter-field">
                  <label>القسم</label>
                  <select
                    value={filters.sectionId}
                    onChange={e => setF({ sectionId: e.target.value, stageId: '', gradeId: '', classId: '' })}
                    disabled={Boolean(activeSectionId && activeSectionId !== 'all')}
                    style={activeSectionId && activeSectionId !== 'all' ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                  >
                    <option value="">كل الأقسام</option>
                    {formOpts.sections?.map(s =>
                      <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {/* Stage */}
              {activeReport.filters?.requiresStage && (
                <div className="filter-field">
                  <label>المرحلة</label>
                  <select
                    value={filters.stageId}
                    onChange={e => setF({ stageId: e.target.value, gradeId: '', classId: '' })}
                  >
                    <option value="">اختر المرحلة</option>
                    {filteredStages.map(s =>
                      <option key={s.id} value={s.id}>{s.stage_name}</option>)}
                  </select>
                </div>
              )}

              {/* Grade */}
              {activeReport.filters?.requiresGrade && (
                <div className="filter-field">
                  <label>الصف الدراسي *</label>
                  <select
                    value={filters.gradeId}
                    onChange={e => setF({ gradeId: e.target.value, classId: '' })}
                  >
                    <option value="">اختر الصف...</option>
                    {filteredGrades.map(g =>
                      <option key={g.id} value={g.id}>{g.grade_name_ar}</option>)}
                  </select>
                </div>
              )}

              {/* Classroom */}
              {activeReport.filters?.requiresClass && (
                <div className="filter-field">
                  <label>الفصل *</label>
                  <select
                    value={filters.classId}
                    onChange={e => setF({ classId: e.target.value })}
                    disabled={!classrooms.length}
                  >
                    <option value="">
                      {filters.gradeId && filters.academicYearId
                        ? (classrooms.length ? 'اختر الفصل...' : 'لا توجد فصول')
                        : 'اختر الصف والعام أولاً'}
                    </option>
                    {classrooms.map(c =>
                      <option key={c.id} value={c.id} style={{ direction: 'ltr' }}>
                        {'\u200E'}{c.class_name}
                      </option>)}
                  </select>
                </div>
              )}

              {/* Gender Sorting Order (البنون أولاً / البنات أولاً) */}
              <div className="filter-field">
                <label style={{ color: '#4338ca', fontWeight: 800 }}>فرز ترتيب النوع</label>
                <select
                  value={filters.genderOrder || 'none'}
                  onChange={e => setF({ genderOrder: e.target.value })}
                  style={{ background: '#f5f3ff', borderColor: '#a5b4fc', fontWeight: 700, color: '#312e81' }}
                >
                  <option value="none">أبجدي شامل (ذكور وإناث)</option>
                  <option value="boys_first">👦 البنون (الذكور) أولاً</option>
                  <option value="girls_first">👧 البنات (الإناث) أولاً</option>
                </select>
              </div>

              <button
                className="btn-generate"
                onClick={loadStudents}
                disabled={!canGenerate || loading}
              >
                {loading ? <RefreshCw size={14} className="spin" /> : <RefreshCw size={14} />}
                <span>{loading ? 'جاري العرض...' : 'عرض التقرير'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Toolbar (Export / Print) ─────────────────────────── */}
        {reportReady && (
          <div className="report-action-toolbar print-hide">
            <div className="report-info-badge">
              <span className="badge-dot" />
              <span>تم تجهيز التقرير: <strong>{students.length}</strong> طالب مسجل</span>
            </div>
            <div className="action-buttons">
              <button
                className={`btn-action excel ${exportingExcel ? 'loading' : ''}`}
                onClick={exportExcel}
                disabled={exportingExcel}
                style={{ opacity: exportingExcel ? 0.7 : 1, cursor: exportingExcel ? 'wait' : 'pointer' }}
              >
                {exportingExcel ? <RefreshCw size={15} className="spin" /> : <FileSpreadsheet size={15} />}
                <span>{exportingExcel ? 'جاري التصدير...' : 'تصدير Excel'}</span>
              </button>
              <button className="btn-action print" onClick={printReport} disabled={exportingExcel}>
                <Printer size={15} /> <span>طباعة التقرير / PDF</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Export status message banner ────────────────────── */}
        {exportMsg && (
          <div className="print-hide" style={{
            padding: '10px 16px',
            background: exportingExcel ? '#eff6ff' : '#f0fdf4',
            border: `1.5px solid ${exportingExcel ? '#93c5fd' : '#86efac'}`,
            color: exportingExcel ? '#1e40af' : '#166534',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            {exportingExcel ? <RefreshCw size={16} className="spin" /> : <CheckCircle2 size={16} />}
            <span>{exportMsg}</span>
          </div>
        )}

        {/* ── Error message ────────────────────────────────────── */}
        {error && (
          <div className="report-error print-hide" style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13 }}>
            <span>{error}</span>
          </div>
        )}

        {/* ── Empty state / Prompt ──────────────────────────────── */}
        {!reportReady && !loading && (
          <div className="report-filters-card print-hide" style={{ textAlign: 'center', padding: '40px 20px', alignItems: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>{activeReport?.icon || '📊'}</div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 18, color: '#0f172a' }}>{activeReport?.name}</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>حدد الفلاتر المطلوبة أعلاه ثم اضغط على زر "عرض التقرير".</p>
          </div>
        )}

        {/* ── Report Preview Area ──────────────────────────────── */}
        {reportReady && activeReport?.PreviewComponent && (
          <div className="report-preview-wrapper">
            <activeReport.PreviewComponent
              students={students}
              meta={meta}
              schoolInfo={schoolInfo}
            />
          </div>
        )}
      </main>

      {/* ── Fullscreen Reports Hub Modal ───────────────────────── */}
      {showHubModal && (
        <div className="modal-backdrop" onClick={() => setShowHubModal(false)}>
          <div className="modal-box" style={{ maxWidth: 1100, width: '92vw' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkles size={20} color="#6366f1" />
                <div>
                  <h3 style={{ margin: 0 }}>دليل وسجل التقارير الوزارية الموحد (40 تقريراً رسمياً)</h3>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>اختر التقرير المطلوب لعرضه وتصديره مباشرة</div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowHubModal(false)}><X size={18} /></button>
            </div>

            <div className="modal-body" style={{ padding: 20, maxHeight: '75vh', overflowY: 'auto' }}>
              {/* Category Pills & Search */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      className={`reports-category-pill ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div style={{ width: 260, position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="reports-search-input"
                    placeholder="🔍 ابحث في دليل التقارير..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Reports Grid */}
              <div className="reports-grid-container">
                {filteredReports.map(r => (
                  <div
                    key={r.id}
                    className={`report-card-hub ${activeId === r.id ? 'active' : ''}`}
                    onClick={() => {
                      switchReport(r.id);
                      setShowHubModal(false);
                    }}
                  >
                    <div className="report-card-header">
                      <div className="report-card-icon">{r.icon}</div>
                      <div>
                        <div className="report-card-title">{r.name}</div>
                        <span style={{ fontSize: 10, background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 4 }}>
                          {r.category}
                        </span>
                      </div>
                    </div>
                    {r.desc && <div className="report-card-desc">{r.desc}</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'left' }}>
              <button className="btn-cancel" onClick={() => setShowHubModal(false)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
