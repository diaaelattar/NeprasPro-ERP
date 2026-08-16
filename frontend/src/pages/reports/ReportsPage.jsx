// ════════════════════════════════════════════════════════════════
//  ReportsPage — Shell (مركز تقارير وشئون الطلاب والطباعة الموحد)
// ════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, FileSpreadsheet, Printer,
  Filter, RefreshCw, BookOpen, List, BarChart3,
  Search, LayoutGrid, X, Layers, Sparkles, ChevronDown, CheckCircle2
} from 'lucide-react';
import JSZip from 'jszip';
import REPORTS from './reportRegistry';
import './reports.css';
import API_BASE_URL, { SERVER_ORIGIN } from '../../config/api';
import { formatClassroomLabel } from '../../utils/classroomFormatter';

const API = API_BASE_URL;

/* ── Category icons ────────────────────────────────────────────── */
const CAT_ICONS = {
  'الكل':                   <Sparkles  size={14} />,
  'سجلات القيد':             <BookOpen  size={14} />,
  'قوائم الفصول':            <List      size={14} />,
  'سجلات رصد أعمال السنة':    <Layers    size={14} />,
  'إحصائيات':                <BarChart3 size={14} />,
  'المطبوعات والنماذج':       <Printer   size={14} />,
  'الصحة المدرسية':          <FileText  size={14} />,
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
  // Batch-export progress state
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, label: '' });
  const [exportingPdf,  setExportingPdf]  = useState(false);

  const filteredStages = formOpts.stages || [];
  const filteredGrades = filters.stageId
    ? (formOpts.grades?.filter(g => String(g.stage_id) === String(filters.stageId)) || [])
    : [];

  const selectedYear      = formOpts.academicYears?.find(y => String(y.id) === filters.academicYearId);
  const selectedGrade     = formOpts.grades?.find(g => String(g.id) === filters.gradeId);
  const selectedStage     = formOpts.stages?.find(s => String(s.id) === filters.stageId);
  const selectedClassroom = classrooms.find(c => String(c.id) === filters.classId);

  const formattedClassLabel = selectedClassroom ? formatClassroomLabel({
    classNumber: selectedClassroom.class_number || selectedClassroom.class_name,
    className: selectedClassroom.class_name,
    gradeNumber: selectedGrade?.grade_number || 1,
    stageName: selectedStage?.stage_name || selectedGrade?.stage_name || '',
    sectionType: selectedStage?.section_type || 'general'
  }) : '';

  const classroomLabel =
    filters.classId === 'all_stage' ? 'جميع فصول المرحلة بالكامل' :
    filters.classId === 'all_grade' ? `جميع فصول ${selectedGrade?.grade_name_ar || 'الصف'}` :
    (formattedClassLabel || selectedClassroom?.class_name);

  const selectedClassroomEnhanced = selectedClassroom ? {
    ...selectedClassroom,
    class_name: formattedClassLabel || selectedClassroom.class_name,
    formatted_name: formattedClassLabel || selectedClassroom.class_name
  } : null;

  const gradeLabel =
    filters.gradeId === 'all_stage' || filters.classId === 'all_stage'
      ? (selectedStage?.stage_name ? `المرحلة ال${selectedStage.stage_name}` : 'جميع صفوف المرحلة')
      : selectedGrade?.grade_name_ar;

  const meta = { selectedYear, selectedGrade, selectedStage, selectedClassroom: selectedClassroomEnhanced, classroomLabel, gradeLabel, formOpts };

  /* ─── Boot ───────────────────────────────────────────────────── */
  useEffect(() => {
    fetch(`${API}/students/form-options`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setFormOpts(d);
          setFilters(f => {
            const newF = { ...f };
            const cur = d.academicYears?.find(y => y.is_current === 1 || y.is_current === true);
            if (cur && !newF.academicYearId) newF.academicYearId = String(cur.id);
            if (d.sections?.length === 1 && !newF.sectionId) newF.sectionId = String(d.sections[0].id);
            return newF;
          });
        }
      });
    fetch(`${API}/settings/institution`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.institution) {
          setSchoolInfo({
            schoolName: d.institution.school_name || d.institution.schoolName || '',
            governorate: d.institution.governorate || '',
            directorate: d.institution.directorate || '',
            educationType: d.institution.education_type || d.institution.educationType || 'رسمي',
            directorName: d.institution.director_name || d.institution.directorName || '',
            logoUrl: d.institution.logo_url || d.institution.logoUrl || null
          });
        } else {
          fetch(`${API}/setup/status`)
            .then(r => r.json())
            .then(st => {
              if (st.success) {
                setSchoolInfo({
                  schoolName: st.schoolName || '',
                  governorate: st.governorate || '',
                  directorate: st.directorate || '',
                  logoUrl: st.logoUrl || null
                });
              }
            });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (filteredStages.length === 1 && !filters.stageId) {
      setFilters(f => ({ ...f, stageId: String(filteredStages[0].id) }));
    }
  }, [filteredStages]);

  useEffect(() => {
    if (filters.gradeId && filters.gradeId !== 'all_stage' && filters.academicYearId) {
      fetch(`${API}/settings/classrooms?gradeId=${filters.gradeId}&academicYearId=${filters.academicYearId}`)
        .then(r => r.json())
        .then(d => setClassrooms(d.success ? (d.classrooms || []) : []))
        .catch(() => setClassrooms([]));
    } else {
      setClassrooms([]);
      if (filters.classId !== 'all_stage' && filters.classId !== 'all_grade') {
        setFilters(f => ({ ...f, classId: '' }));
      }
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

  const isBatchMode = Boolean(filters.isBatchMode) ||
                       filters.classId === 'all_grade' || filters.classId === 'all_stage' ||
                       filters.printScope === 'all_grade' || filters.printScope === 'all_stage';

  const effectiveFilters = {
    ...filters,
    classId: isBatchMode ? (filters.gradeId ? 'all_grade' : 'all_stage') : filters.classId,
    gradeId: isBatchMode ? (filters.gradeId || 'all_stage') : filters.gradeId,
  };

  const canGenerate = (() => {
    if (!activeReport?.available) return false;
    const f = activeReport.filters || {};
    if (f.requiresYear  && !effectiveFilters.academicYearId) return false;
    if (f.requiresGrade && !effectiveFilters.gradeId)        return false;
    if (f.requiresClass && !effectiveFilters.classId)        return false;
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
      const queryStr = activeReport.buildQuery(effectiveFilters);
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
  }, [effectiveFilters, activeReport, canGenerate]);

  /* ─── Export Excel (single class or batch sequential) ───────── */
  const exportExcel = async () => {
    if (exportingExcel || exportingPdf) return;

    const isBatchMode = Boolean(filters.isBatchMode) || 
                        filters.classId === 'all_grade' || filters.classId === 'all_stage' ||
                        filters.printScope === 'all_grade' || filters.printScope === 'all_stage';

    setExportingExcel(true);
    setExportMsg('');
    setBatchProgress({ current: 0, total: 0, label: '' });

    try {
      // ── BATCH MODE: iterate one class at a time ──────────────
      if (isBatchMode) {
        const zip = new JSZip();

        // 1. Get the classes list for iteration
        const clsParams = new URLSearchParams();
        if (filters.sectionId) clsParams.set('sectionId', filters.sectionId);
        if (filters.stageId)   clsParams.set('stageId',   filters.stageId);
        if (filters.gradeId && filters.gradeId !== 'all_stage' && filters.gradeId !== 'all_grade') clsParams.set('gradeId', filters.gradeId);
        if (filters.academicYearId) clsParams.set('academicYearId', filters.academicYearId);

        const clsRes   = await fetch(`${API}/students/export/classes-for-export?${clsParams}`);
        const clsData  = await clsRes.json();
        const classes  = clsData.classes || [];

        if (classes.length === 0) {
          setExportMsg('⚠️ لا توجد فصول مطابقة للفلاتر المحددة.');
          setTimeout(() => setExportMsg(''), 4000);
          return;
        }

        setBatchProgress({ current: 0, total: classes.length, label: '' });

        // 2. Export each class sequentially using the active report's generator
        for (let i = 0; i < classes.length; i++) {
          const cls = classes[i];
          setBatchProgress({ current: i + 1, total: classes.length, label: cls.class_name });
          setExportMsg(`⏳ جاري تصدير الفصل ${i + 1} من ${classes.length}: ${cls.class_name}`);

          const classFilters = {
            ...effectiveFilters,
            classId: String(cls.id),
            gradeId: cls.grade_id ? String(cls.grade_id) : effectiveFilters.gradeId,
          };

          let endpoint = activeReport.excelEndpoint ? activeReport.excelEndpoint(classFilters) : `/api/students/export/class-list?classId=${cls.id}`;
          if (filters.religion && filters.religion !== 'all' && !endpoint.includes('religion=')) {
            endpoint += `&religion=${encodeURIComponent(filters.religion)}`;
          }
          if (!endpoint.startsWith('http')) {
            endpoint = `${SERVER_ORIGIN}${endpoint}`;
          }

          try {
            const fileRes = await fetch(endpoint);
            if (!fileRes.ok) throw new Error(`HTTP ${fileRes.status}`);
            const buf  = await fileRes.arrayBuffer();
            const name = `تقرير_${cls.class_name}.xlsm`;
            zip.file(name, buf);
          } catch (clsErr) {
            console.error(`[Batch Export] Error for ${cls.class_name}:`, clsErr);
          }
        }

        // 3. Generate and download ZIP
        setExportMsg('جاري إعداد ملف ZIP شامل لجميع الفصول...');
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        const url = window.URL.createObjectURL(zipBlob);
        const a   = document.createElement('a');
        a.href    = url;
        a.download = `تقارير_فصول_المؤسسة_${new Date().toISOString().slice(0,10)}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setExportMsg(`✅ تم تصدير ${classes.length} فصل بنجاح في ملف ZIP واحد`);
        setTimeout(() => setExportMsg(''), 5000);

      } else {
        // ── SINGLE CLASS MODE ─────────────────────────────────────
        setExportMsg('جاري توليد ملف الإكسيل...');
        let endpoint          = activeReport.excelEndpoint(effectiveFilters);
        if (filters.religion && filters.religion !== 'all' && !endpoint.includes('religion=')) {
          endpoint += `&religion=${encodeURIComponent(filters.religion)}`;
        }
        const defaultFilename = activeReport.excelFileName(effectiveFilters, meta);
        const res = await fetch(`${SERVER_ORIGIN}${endpoint}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const contentDisposition = res.headers.get('content-disposition');
        let filename = defaultFilename;
        if (contentDisposition) {
          const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
          if (match && match[1]) filename = decodeURIComponent(match[1]);
        }
        if (res.headers.get('content-type')?.includes('zip') && !filename.endsWith('.zip'))
          filename = 'nepras_reports_batch.zip';

        const blob = await res.blob();
        const url  = window.URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setExportMsg(`✅ تم التصدير بنجاح: (${filename})`);
        setTimeout(() => setExportMsg(''), 4500);
      }
    } catch (err) {
      alert('خطأ في تصدير الملف: ' + err.message);
      setExportMsg('');
    } finally {
      setExportingExcel(false);
      setBatchProgress({ current: 0, total: 0, label: '' });
    }
  };

  /* ─── Export PDF (Excel template → macro → PDF stream) ──────── */
  const exportPdf = async (preview = false) => {
    if (exportingPdf || exportingExcel) return;

    const isBatchMode = Boolean(filters.isBatchMode) || 
                        filters.classId === 'all_grade' || filters.classId === 'all_stage' ||
                        filters.printScope === 'all_grade' || filters.printScope === 'all_stage';

    setExportingPdf(true);
    setExportMsg('جاري توليد PDF من الإكسيل...');
    setBatchProgress({ current: 0, total: 0, label: '' });

    try {
      if (isBatchMode) {
        const zip   = new JSZip();

        const clsParams = new URLSearchParams();
        if (filters.sectionId) clsParams.set('sectionId', filters.sectionId);
        if (filters.stageId)   clsParams.set('stageId',   filters.stageId);
        if (filters.gradeId && filters.gradeId !== 'all_stage' && filters.gradeId !== 'all_grade') clsParams.set('gradeId', filters.gradeId);
        if (filters.academicYearId) clsParams.set('academicYearId', filters.academicYearId);

        const clsRes  = await fetch(`${API}/students/export/classes-for-export?${clsParams}`);
        const clsData = await clsRes.json();
        const classes = clsData.classes || [];
        if (classes.length === 0) {
          setExportMsg('⚠️ لا توجد فصول مطابقة.');
          setTimeout(() => setExportMsg(''), 4000);
          return;
        }
        setBatchProgress({ current: 0, total: classes.length, label: '' });

        for (let i = 0; i < classes.length; i++) {
          const cls = classes[i];
          setBatchProgress({ current: i + 1, total: classes.length, label: cls.class_name });
          setExportMsg(`⏳ PDF فصل ${i + 1} من ${classes.length}: ${cls.class_name}`);
          try {
            const p = new URLSearchParams({
              classId: cls.id,
              academicYearId: filters.academicYearId || '',
              mode: activeReport.mode || 'primary_portrait',
            });
            const r = await fetch(`${API}/students/export/report-pdf?${p}`);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const buf  = await r.arrayBuffer();
            zip.file(`تقرير_${cls.class_name}.pdf`, buf);
          } catch (clsErr) {
            console.error(`[PDF Batch] Error for ${cls.class_name}:`, clsErr);
          }
        }
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        const url = window.URL.createObjectURL(zipBlob);
        const a   = document.createElement('a');
        a.href    = url;
        a.download = `تقارير_PDF_${new Date().toISOString().slice(0,10)}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setExportMsg(`✅ تم توليد ${classes.length} PDF بنجاح`);
        setTimeout(() => setExportMsg(''), 5000);
      } else {
        // Single class PDF
        const p = new URLSearchParams({
          classId:       filters.classId       || '',
          gradeId:       filters.gradeId       || '',
          stageId:       filters.stageId       || '',
          academicYearId: filters.academicYearId || '',
          mode:          activeReport.mode || 'primary_portrait',
        });
        const pdfUrl = `${API}/students/export/report-pdf?${p}`;

        if (preview) {
          window.open(pdfUrl, '_blank');
          setExportMsg('✅ تم فتح معاينة PDF في تبويب جديد');
        } else {
          const r = await fetch(pdfUrl);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const blob = await r.blob();
          const url  = window.URL.createObjectURL(blob);
          const a    = document.createElement('a');
          a.href     = url;
          a.download = `تقرير_${filters.classId || 'عام'}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
          setExportMsg('✅ تم تحميل PDF بنجاح');
        }
        setTimeout(() => setExportMsg(''), 4500);
      }
    } catch (err) {
      alert('خطأ في توليد PDF: ' + err.message);
      setExportMsg('');
    } finally {
      setExportingPdf(false);
      setBatchProgress({ current: 0, total: 0, label: '' });
    }
  };

  /* ─── Open populated file directly in MS Excel on Desktop ──── */
  const openInExcelApp = async () => {
    setExportMsg('جاري فتح شيت الإكسيل ببرنامج MS Excel على جهازك...');
    try {
      const p = new URLSearchParams({
        classId:       filters.classId       || '',
        gradeId:       filters.gradeId       || '',
        stageId:       filters.stageId       || '',
        academicYearId: filters.academicYearId || '',
        mode:          activeReport.mode || activeReport.id || 'primary_portrait',
      });
      if (filters.religion && filters.religion !== 'all') p.set('religion', filters.religion);
      const r = await fetch(`${API}/students/export/open-in-excel?${p}`);
      const d = await r.json();
      if (d.success) {
        setExportMsg('✅ تم فتح التقرير ببرنامج MS Excel على شاشتك بنجاح!');
      } else {
        alert(d.error || 'تعذر فتح الإكسيل');
      }
    } catch (err) {
      alert('خطأ في فتح الإكسيل: ' + err.message);
    } finally {
      setTimeout(() => setExportMsg(''), 4500);
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
            <div className="filters-title" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Filter size={14} /> فلاتر ومعطيات التقرير
              </span>
              <span style={{ fontSize: 11, color: '#4f46e5', fontWeight: 700 }}>
                إجمالي التقارير المتاحة: {filteredReports.length} تقرير
              </span>
            </div>

            {/* Direct Active Report Switcher (Full Width Hero Bar) */}
            <div className="report-select-hero-bar" style={{ marginBottom: 14, padding: '10px 14px', background: '#f5f3ff', borderRadius: 10, border: '1px solid #c7d2fe' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#4338ca', marginBottom: 6 }}>
                📋 التقرير المطلوب عرضه وتصديره *
              </label>
              <select
                value={activeId}
                onChange={e => switchReport(e.target.value)}
                style={{ width: '100%', height: 40, border: '2px solid #6366f1', background: '#ffffff', fontWeight: 800, color: '#1e1b4b', borderRadius: 8, padding: '0 12px', fontSize: 13 }}
              >
                {filteredReports.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.icon} {r.name} — ({r.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="filters-grid">

              {/* Section */}
              {!activeReport.filters?.hideSection && (
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
                      <option key={s.id} value={s.id}>{s.name || s.name_ar}</option>)}
                  </select>
                </div>
              )}

              {/* Stage */}
              {!activeReport.filters?.hideStage && (
                <div className="filter-field">
                  <label>المرحلة</label>
                  <select
                    value={filters.stageId}
                    onChange={e => setF({ stageId: e.target.value, gradeId: '', classId: '' })}
                  >
                    <option value="">كل المراحل</option>
                    {filteredStages.map(s =>
                      <option key={s.id} value={s.id}>{s.stage_name_ar || s.stage_name || s.name}</option>)}
                  </select>
                </div>
              )}

              {/* Grade */}
              {!activeReport.filters?.hideGrade && (
                <div className="filter-field">
                  <label>الصف الدراسي {activeReport.filters?.requiresGrade ? '*' : ''}</label>
                  <select
                    value={filters.gradeId}
                    onChange={e => setF({ gradeId: e.target.value, classId: '' })}
                    disabled={!filters.stageId}
                    style={!filters.stageId ? { opacity: 0.65, cursor: 'not-allowed' } : {}}
                  >
                    <option value="">{filters.stageId ? (activeReport.filters?.requiresGrade ? 'اختر الصف...' : 'كل الصفوف') : 'اختر المرحلة أولاً--'}</option>
                    {filteredGrades.map(g =>
                      <option key={g.id} value={g.id}>{g.grade_name_ar || g.name_ar || g.name}</option>)}
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
                    style={!classrooms.length ? { opacity: 0.65, cursor: 'not-allowed' } : {}}
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

              {/* Independent Religion Filter — Only for Grade/Assessment Reports */}
              {activeReport?.category === 'سجلات رصد أعمال السنة' && (
                <div className="filter-field">
                  <label style={{ color: '#047857', fontWeight: 800 }}>فرز الديانة</label>
                  <select
                    value={filters.religion || 'all'}
                    onChange={e => setF({ religion: e.target.value })}
                    style={{ background: '#ecfdf5', borderColor: '#a7f3d0', fontWeight: 700, color: '#065f46' }}
                  >
                    <option value="all">الكل (مسلمون ومسيحيون)</option>
                    <option value="مسلم">☪️ الديانة المسلمة فقط</option>
                    <option value="مسيحي">✝️ الديانة المسيحية فقط</option>
                  </select>
                </div>
              )}

              {/* Gender Sorting Order (البنون أولاً / البنات أولاً) */}
              {!activeReport.filters?.hideGenderOrder && activeReport?.category !== 'إحصائيات' && (
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
              )}

              {/* Checkbox for Batch Exporting All Classes */}
              {!activeReport.filters?.hideBatchMode && activeReport?.category !== 'إحصائيات' && (
                <div className="filter-field" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, color: '#1e40af', background: '#eff6ff', padding: '8px 12px', borderRadius: 8, border: '1px solid #bfdbfe', width: '100%' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(filters.isBatchMode)}
                      onChange={e => setF({ isBatchMode: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: '#2563eb', cursor: 'pointer' }}
                    />
                    <span>📦 تصدير كل فصول الصف/المرحلة مجمعة (ملف ZIP)</span>
                  </label>
                </div>
              )}

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
            <div className="action-buttons" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>

              {/* ── Direct Instant Print (A4 / PDF) button ── */}
              {activeReport?.PreviewComponent && (
                <button
                  className="btn-action print-direct"
                  onClick={() => {
                    const orientation = activeReport?.orientation || 'portrait';
                    let style = document.getElementById('dynamic-print-page-style');
                    if (!style) {
                      style = document.createElement('style');
                      style.id = 'dynamic-print-page-style';
                      document.head.appendChild(style);
                    }
                    style.textContent = `@media print { @page { size: A4 ${orientation}; margin: 6mm; } }`;
                    window.print();
                  }}
                  style={{ background: '#1d4ed8', color: '#fff', padding: '9px 18px', fontSize: 13, fontWeight: 800, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 2px 6px rgba(29,78,216,0.3)' }}
                  title="طباعة التقرير المعروض على الشاشة فوراً على ورق A4 أو حفظه بصيغة PDF مباشرة"
                >
                  <Printer size={16} />
                  <span>🖨️ طباعة النموذج المعروض (A4 / PDF)</span>
                </button>
              )}

              {/* ── Excel Export button ── */}
              {activeReport?.excelEndpoint && (
                <button
                  className={`btn-action excel ${exportingExcel ? 'loading' : ''}`}
                  onClick={exportExcel}
                  disabled={exportingExcel || exportingPdf}
                  style={{ opacity: (exportingExcel || exportingPdf) ? 0.7 : 1, cursor: (exportingExcel || exportingPdf) ? 'wait' : 'pointer', background: '#15803d', color: '#fff', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                  title="تصدير ملف الإكسيل الممتلئ بالبيانات"
                >
                  {exportingExcel ? <RefreshCw size={15} className="spin" /> : <FileSpreadsheet size={15} />}
                  <span>
                    {isBatchMode ? '📦 تصدير كل الفصول (.zip)' : '📊 تصدير شيت إكسيل (.xlsx)'}
                  </span>
                </button>
              )}

              {/* ── Open Directly in MS Excel Desktop button (Only for reports that support COM/Macro desktop opening) ── */}
              {Boolean(activeReport?.hasDesktopExcel) && (
                <button
                  className="btn-action"
                  onClick={openInExcelApp}
                  disabled={exportingExcel || exportingPdf}
                  style={{ background: '#0d9488', color: '#fff', opacity: (exportingExcel || exportingPdf) ? 0.7 : 1, borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  title="فتح ملف الإكسيل الممتلئ بالبيانات ببرنامج MS Excel على شاشتك فوراً للمعاينة والطباعة اليدوية"
                >
                  <FileSpreadsheet size={15} />
                  <span>💻 فتح ببرنامج MS Excel</span>
                </button>
              )}

              {/* ── Ministerial Macro-to-PDF button (Only for ministerial macro sheets) ── */}
              {Boolean(activeReport?.hasMacroPdf) && !activeReport?.excelOnly && (
                <button
                  className="btn-action"
                  onClick={() => exportPdf(false)}
                  disabled={exportingExcel || exportingPdf}
                  style={{ background: '#6366f1', color: '#fff', opacity: (exportingExcel || exportingPdf) ? 0.7 : 1, borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  title="توليد وتنزيل PDF من شيت الماكرو الوزاري"
                >
                  <FileText size={15} />
                  <span>📄 تصدير ماكرو PDF</span>
                </button>
              )}

            </div>

            {/* ── Batch Progress Bar ── */}
            {batchProgress.total > 0 && (
              <div className="print-hide" style={{ marginTop: 10, padding: '10px 14px', background: '#f0f9ff', border: '1.5px solid #38bdf8', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, fontWeight: 800, color: '#0369a1' }}>
                  <span>فصل {batchProgress.current} من {batchProgress.total}: {batchProgress.label}</span>
                  <span>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                </div>
                <div style={{ background: '#bae6fd', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%`, background: '#0284c7', height: '100%', transition: 'width 0.3s ease', borderRadius: 6 }} />
                </div>
              </div>
            )}
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
