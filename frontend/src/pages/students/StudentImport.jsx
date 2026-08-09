// ════════════════════════════════════════════════════════════════
//  StudentImport — Excel Import Wizard (4 Steps)
//  الخطوة ①: اختيار الوضع + رفع الملف
//  الخطوة ②: مطابقة الأعمدة
//  الخطوة ③: التحقق من البيانات
//  الخطوة ④: النتيجة
// ════════════════════════════════════════════════════════════════
import React, { useState, useRef, useCallback } from 'react';
import {
  Upload, FileSpreadsheet, Download, CheckCircle2, XCircle,
  AlertTriangle, ChevronRight, ChevronLeft, RotateCcw,
  Users, ArrowLeft, Loader2, Info, Check, X,
  UserPlus, RefreshCw, Tag, Sliders
} from 'lucide-react';
import API_BASE_URL from '../../config/api';
import './import.css';

const API = API_BASE_URL;

/* ── Field definitions — NEW STUDENTS mode ── */
const NEW_FIELD_OPTIONS = [
  { value: '',                     label: '— تجاهل هذا العمود —' },
  { value: 'full_name_ar',         label: 'اسم الطالب بالعربي *',          required: true },
  { value: 'full_name_en',         label: 'اسم الطالب بالإنجليزية' },
  { value: 'gender',               label: 'الجنس *',                        required: true },
  { value: 'birth_date',           label: 'تاريخ الميلاد' },
  { value: 'birth_place',          label: 'محل الميلاد' },
  { value: 'national_id',          label: 'الرقم القومي' },
  { value: 'nationality',          label: 'الجنسية' },
  { value: 'religion',             label: 'الديانة' },
  { value: 'section_name',         label: 'اسم القسم (اختياري / القسم الفعّال)' },
  { value: 'stage_name',           label: 'اسم المرحلة *',                  required: true },
  { value: 'grade_name',           label: 'اسم الصف *',                     required: true },
  { value: 'academic_year',        label: 'العام الدراسي (اختياري / العام الجاري)' },
  { value: 'guardian_name',        label: 'اسم ولي الأمر' },
  { value: 'guardian_relation',    label: 'صفة ولي الأمر' },
  { value: 'guardian_phone',       label: 'رقم هاتف ولي الأمر' },
  { value: 'guardian_job',         label: 'الوظيفة' },
  { value: 'guardian_national_id', label: 'الرقم القومي لولي الأمر' },
  { value: 'mother_name',          label: 'اسم الأم' },
  { value: 'address',              label: 'العنوان' },
  { value: 'student_phone',        label: 'رقم هاتف الطالب' },
  { value: 'second_language',      label: 'اللغة الأجنبية الثانية' },
  { value: 'enrollment_date',      label: 'تاريخ القيد' },
  { value: 'classroom_name',       label: 'اسم الفصل (اختياري)' },
];


/* ── Field definitions — UPDATE mode ── */
const UPDATE_FIELD_OPTIONS = [
  { value: '',             label: '— تجاهل هذا العمود —' },
  { value: 'national_id',  label: 'الرقم القومي (للمطابقة) *',   required: true, matchKey: true },
  { value: 'student_code', label: 'كود الطالب (للمطابقة)',        matchKey: true },
  { value: 'status',       label: 'حالة القيد *',                  required: true },
  { value: 'full_name_ar', label: 'اسم الطالب (للتحقق فقط)' },
];

const NEW_REQUIRED_FIELDS    = NEW_FIELD_OPTIONS.filter(f => f.required).map(f => f.value);
const UPDATE_REQUIRED_FIELDS = ['status'];

const STATUS_LABELS = {
  promoted:  { label: 'منقول',       color: '#10b981' },
  retained:  { label: 'باق للإعادة', color: '#f59e0b' },
  suspended: { label: 'موقوف قيده', color: '#ef4444' },
};

/* ── Step indicator ── */
function StepBar({ current }) {
  const steps = ['رفع الملف', 'مطابقة الأعمدة', 'التحقق', 'النتيجة'];
  return (
    <div className="import-stepbar">
      {steps.map((label, i) => {
        const idx   = i + 1;
        const state = idx < current ? 'done' : idx === current ? 'active' : 'pending';
        return (
          <React.Fragment key={idx}>
            <div className={`step-item ${state}`}>
              <div className="step-circle">
                {state === 'done' ? <Check size={14} /> : idx}
              </div>
              <span className="step-label">{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`step-line ${idx < current ? 'done' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════ */
export default function StudentImport({ onBack, activeSectionId }) {
  const [step, setStep]               = useState(1);
  const [importMode, setImportMode]   = useState('new');   // 'new' | 'update'
  const [file, setFile]               = useState(null);
  const [dragOver, setDragOver]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  // Step 2
  const [headers, setHeaders]           = useState([]);
  const [colMapping, setColMapping]     = useState({});
  const [previewCells, setPreviewCells] = useState([]);

  // Step 3
  const [validationResults, setValidationResults] = useState([]);
  const [validSummary, setValidSummary] = useState({ total: 0, valid: 0, errors: 0 });

  // Hierarchical Bulk States
  const [importMetadata, setImportMetadata] = useState(null);
  const [bulkSectionId, setBulkSectionId]   = useState('');
  const [bulkStageId, setBulkStageId]       = useState('');
  const [bulkGradeId, setBulkGradeId]       = useState('');

  // Step 4
  const [importResults, setImportResults] = useState(null);

  const fileInputRef = useRef();

  /* derived per mode */
  const FIELD_OPTIONS   = importMode === 'update' ? UPDATE_FIELD_OPTIONS   : NEW_FIELD_OPTIONS;
  const REQUIRED_FIELDS = importMode === 'update' ? UPDATE_REQUIRED_FIELDS : NEW_REQUIRED_FIELDS;

  /* ── File pick ── */
  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files[0] || e.target.files[0];
    if (!f) return;
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      setError('يُسمح فقط بملفات Excel (.xlsx أو .xls)');
      return;
    }
    setError('');
    setFile(f);
  }, []);

  /* ── Step 1 → 2 ── */
  const handleUploadAndPreview = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mode', importMode);

      const res  = await fetch(`${API}/students/import/preview`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const initMap = {};
      if (data.fieldToCol) {
        Object.entries(data.fieldToCol).forEach(([fieldKey, colIdx]) => { initMap[colIdx] = fieldKey; });
      }
      setHeaders(data.headers || []);
      setColMapping(initMap);
      setPreviewCells(data.preview || []);
      setValidationResults(data.results);
      setValidSummary(data.summary || { total: 0, valid: 0, errors: 0 });
      setImportMetadata(data.metadata || null);
      setStep(2);
    } catch (err) {
      setError(err.message || 'فشل قراءة الملف');
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2 → 3 ── */
  const handleValidateWithMapping = async () => {
    setLoading(true);
    setError('');
    try {
      const mappedFields = Object.values(colMapping).filter(Boolean);

      if (importMode === 'update') {
        if (!mappedFields.includes('status'))
          throw new Error('يجب تعيين عمود "حالة القيد".');
        if (!mappedFields.includes('national_id') && !mappedFields.includes('student_code'))
          throw new Error('يجب تعيين عمود "الرقم القومي" أو "كود الطالب" للمطابقة.');
      } else {
        const missing = REQUIRED_FIELDS.filter(f => !mappedFields.includes(f));
        if (missing.length > 0) {
          const labels = missing.map(f => NEW_FIELD_OPTIONS.find(o => o.value === f)?.label || f);
          throw new Error(`الحقول الإلزامية غير مُعيَّنة: ${labels.join(' ، ')}`);
        }
      }

      const fd = new FormData();
      fd.append('file', file);
      fd.append('mapping', JSON.stringify(colMapping));
      fd.append('mode', importMode);

      const res  = await fetch(`${API}/students/import/preview`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setValidationResults(data.results);
      setValidSummary(data.summary);
      setImportMetadata(data.metadata || null);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Bulk Apply Section to ALL rows
  const handleApplyBulkSection = () => {
    if (!bulkSectionId || !importMetadata) return;
    const secObj = importMetadata.sections.find(s => String(s.id) === String(bulkSectionId));
    if (!secObj) return;

    setValidationResults(prev => {
      const next = prev.map(row => {
        const newData = { ...row.data, sectionId: secObj.id, sectionName: secObj.name };
        return { ...row, data: newData, status: 'valid', errors: [] };
      });
      const vCount = next.filter(r => r.status === 'valid').length;
      const eCount = next.filter(r => r.status === 'error').length;
      setValidSummary({ total: next.length, valid: vCount, errors: eCount });
      return next;
    });
  };

  // Bulk Apply Stage to rows
  const handleApplyBulkStage = () => {
    if (!bulkStageId || !importMetadata) return;
    const stgObj = importMetadata.stages.find(st => String(st.id) === String(bulkStageId));
    if (!stgObj) return;

    setValidationResults(prev => {
      const next = prev.map(row => {
        const newData = { ...row.data, stageId: stgObj.id, stageName: stgObj.name };
        return { ...row, data: newData, status: 'valid', errors: [] };
      });
      const vCount = next.filter(r => r.status === 'valid').length;
      const eCount = next.filter(r => r.status === 'error').length;
      setValidSummary({ total: next.length, valid: vCount, errors: eCount });
      return next;
    });
  };

  // Bulk Apply Grade (Scoped strictly under Stage) to rows
  const handleApplyBulkGrade = () => {
    if (!bulkGradeId || !importMetadata) return;
    const grdObj = importMetadata.grades.find(g => String(g.id) === String(bulkGradeId));
    if (!grdObj) return;

    setValidationResults(prev => {
      const next = prev.map(row => {
        const newData = { ...row.data, gradeId: grdObj.id, gradeName: grdObj.name };
        return { ...row, data: newData, status: 'valid', errors: [] };
      });
      const vCount = next.filter(r => r.status === 'valid').length;
      const eCount = next.filter(r => r.status === 'error').length;
      setValidSummary({ total: next.length, valid: vCount, errors: eCount });
      return next;
    });
  };

  // Inline row update for an individual student row
  const handleInlineRowUpdate = (rowIndex, field, value) => {
    if (!importMetadata) return;
    setValidationResults(prev => {
      const next = [...prev];
      const targetRow = { ...next[rowIndex] };
      const newData = { ...targetRow.data };

      if (field === 'section') {
        const secObj = importMetadata.sections.find(s => String(s.id) === String(value));
        if (secObj) { newData.sectionId = secObj.id; newData.sectionName = secObj.name; }
      } else if (field === 'stage') {
        const stgObj = importMetadata.stages.find(st => String(st.id) === String(value));
        if (stgObj) { newData.stageId = stgObj.id; newData.stageName = stgObj.name; }
      } else if (field === 'grade') {
        const grdObj = importMetadata.grades.find(g => String(g.id) === String(value));
        if (grdObj) { newData.gradeId = grdObj.id; newData.gradeName = grdObj.name; }
      }

      targetRow.data = newData;
      if (newData.stageId && newData.gradeId) {
        targetRow.status = 'valid';
        targetRow.errors = [];
      }
      next[rowIndex] = targetRow;

      const vCount = next.filter(r => r.status === 'valid').length;
      const eCount = next.filter(r => r.status === 'error').length;
      setValidSummary({ total: next.length, valid: vCount, errors: eCount });
      return next;
    });
  };

  /* ── Step 3 → 4 ── */
  const handleExecuteImport = async () => {
    setLoading(true);
    setError('');
    try {
      const rowsToImport = validationResults.filter(r => r.status === 'valid').map(r => r.data);
      if (rowsToImport.length === 0) throw new Error('لا توجد سجلات صالحة.');

      const res  = await fetch(`${API}/students/import/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: rowsToImport, mode: importMode }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setImportResults(data);
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1); setFile(null); setError('');
    setHeaders([]); setColMapping({}); setPreviewCells([]);
    setValidationResults([]); setImportResults(null);
  };

  const switchMode = (m) => { setImportMode(m); setFile(null); setError(''); };

  const exportFailedRowsToExcel = () => {
    let rowsToExport = [];
    if (step === 3) {
      rowsToExport = validationResults.filter(r => r.status === 'error' || (r.errors && r.errors.length > 0));
    } else if (step === 4 && importResults) {
      rowsToExport = importResults.results.filter(r => r.status === 'failed' || r.error);
    }

    if (rowsToExport.length === 0) return;

    let csvContent = "\uFEFF";
    csvContent += "رقم الصف,اسم الطالب / الحساب,القسم / المرحلة / الصف,الأخطاء والسبب\n";

    rowsToExport.forEach(r => {
      const rowNum = r.rowNum || '—';
      const name = (r.data?.fullNameAr || r.data?.matchedName || r.name || '—').replace(/"/g, '""');
      const hierarchy = `${r.data?.sectionName || ''} / ${r.data?.stageName || ''} / ${r.data?.gradeName || ''}`.replace(/"/g, '""');
      const errs = (r.errors?.join(' | ') || r.error || r.warnings?.join(' | ') || 'خطأ في التحقق').replace(/"/g, '""');
      csvContent += `"${rowNum}","${name}","${hierarchy}","${errs}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_سجلات_لم_يتم_استيرادها_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  /* ══════════════════════════════════════════════════════════════ */
  return (
    <div className="import-container">

      {/* Header */}
      <div className="import-header">
        <button className="import-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> العودة للطلاب
        </button>
        <div className="import-title-area">
          <div className="import-icon-wrap"><FileSpreadsheet size={22} /></div>
          <div>
            <h1 className="import-title">استيراد بيانات الطلاب</h1>
            <p className="import-sub">
              {importMode === 'update'
                ? 'تحديث جماعي لحالة القيد من ملف Excel'
                : 'استيراد جماعي من ملف Excel'}
            </p>
          </div>
        </div>
      </div>

      <StepBar current={step} />

      <div className="import-card glass-panel">

        {/* ════ STEP 1 ════ */}
        {step === 1 && (
          <div className="step-content">
            <div className="step-heading">
              <Upload size={20} className="step-icon-color" />
              <h2>اختر وضع الاستيراد ثم ارفع الملف</h2>
            </div>

            {/* Mode selector */}
            <div className="import-mode-selector">
              <button
                className={`import-mode-btn ${importMode === 'new' ? 'active' : ''}`}
                onClick={() => switchMode('new')}
              >
                <UserPlus size={22} />
                <div className="mode-btn-text">
                  <strong>استيراد طلاب جدد</strong>
                  <span>إضافة طلاب غير مسجلين في النظام</span>
                </div>
              </button>
              <button
                className={`import-mode-btn ${importMode === 'update' ? 'active' : ''}`}
                onClick={() => switchMode('update')}
              >
                <RefreshCw size={22} />
                <div className="mode-btn-text">
                  <strong>تحديث حالة القيد</strong>
                  <span>تحديث حالة طلاب موجودين (منقول / باق / موقوف)</span>
                </div>
              </button>
            </div>

            {/* Info banner */}
            {importMode === 'new' ? (
              <div className="mode-info-banner mode-info-new">
                <Info size={15} />
                <span>
                  يتطلب هذا الوضع تطابق أسماء الأقسام والمراحل والصفوف والسنوات الدراسية
                  مع ما هو مضبوط في النظام. نزّل القالب أولاً لضمان صحة التنسيق.
                </span>
              </div>
            ) : (
              <div className="mode-info-banner mode-info-update">
                <Tag size={15} />
                <span>
                  يطابق النظام الطلاب تلقائياً بالرقم القومي أو كود الطالب ويُحدِّث حالة قيدهم.
                  لا يتطلب معرفة العام الدراسي أو الصف. القيم المقبولة:{' '}
                  <strong>منقول / باق للإعادة / موقوف قيده</strong>
                </span>
              </div>
            )}

            {importMode === 'new' && (
              <button className="btn-template" onClick={() => window.open(`${API}/students/import/template`, '_blank')}>
                <Download size={16} /> تحميل قالب Excel الجاهز
              </button>
            )}

            {/* Drop zone */}
            <div
              className={`drop-zone ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" accept=".xlsx,.xls" ref={fileInputRef}
                style={{ display: 'none' }} onChange={handleFileDrop} />
              {file ? (
                <div className="file-selected">
                  <FileSpreadsheet size={38} className="file-icon-green" />
                  <p className="file-name">{file.name}</p>
                  <p className="file-size">{(file.size / 1024).toFixed(1)} KB</p>
                  <button className="btn-change-file"
                    onClick={e => { e.stopPropagation(); setFile(null); }}>
                    <X size={13} /> تغيير الملف
                  </button>
                </div>
              ) : (
                <div className="drop-placeholder">
                  <Upload size={42} className="drop-icon" />
                  <p className="drop-main">اسحب ملف Excel وأفلته هنا</p>
                  <p className="drop-sub">أو انقر للاختيار من الجهاز</p>
                  <span className="drop-types">.xlsx · .xls</span>
                </div>
              )}
            </div>

            {error && <div className="import-error"><AlertTriangle size={15} />{error}</div>}

            <div className="step-actions">
              <button className="btn-primary-import"
                onClick={handleUploadAndPreview} disabled={!file || loading}>
                {loading
                  ? <><Loader2 size={16} className="spin" /> جاري القراءة...</>
                  : <>التالي: مطابقة الأعمدة <ChevronLeft size={16} /></>}
              </button>
            </div>
          </div>
        )}

        {/* ════ STEP 2 ════ */}
        {step === 2 && (
          <div className="step-content">
            <div className="step-heading">
              <Info size={20} className="step-icon-color" />
              <h2>مطابقة أعمدة الملف بحقول النظام</h2>
            </div>
            <p className="step-desc">
              {importMode === 'update'
                ? 'يجب تعيين عمود للمطابقة (الرقم القومي أو الكود) وعمود لحالة القيد.'
                : 'حدد لكل عمود الحقل المناسب. الحقول بـ * إلزامية.'}
            </p>

            <div className="mapping-table-wrap">
              <table className="mapping-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>اسم العمود في Excel</th>
                    <th>مثال البيانات</th>
                    <th>الحقل في النظام</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((header, colIdx) => {
                    const currentField = colMapping[colIdx] || '';
                    const fieldDef     = FIELD_OPTIONS.find(f => f.value === currentField);
                    const isRequired   = fieldDef?.required;
                    const isMatchKey   = importMode === 'update' && fieldDef?.matchKey;

                    return (
                      <tr key={colIdx} className={isRequired ? 'row-required' : ''}>
                        <td className="col-num">{colIdx + 1}</td>
                        <td>
                          <span className={`excel-col-badge${isMatchKey ? ' match-key-badge' : ''}`}>
                            {header || '(فارغ)'}
                          </span>
                        </td>
                        <td className="col-sample">
                          <span className="sample-val">
                            {previewCells[1] ? previewCells[1][colIdx] || '—' : '—'}
                          </span>
                        </td>
                        <td>
                          <select className="field-select" value={currentField}
                            onChange={e => {
                              const newMap   = { ...colMapping };
                              const newField = e.target.value;
                              if (newField)
                                Object.entries(newMap).forEach(([k, v]) => {
                                  if (v === newField && parseInt(k) !== colIdx) delete newMap[k];
                                });
                              newMap[colIdx] = newField;
                              setColMapping(newMap);
                            }}>
                            {FIELD_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Required fields status */}
            <div className="required-status">
              <div className="req-status-title"><Info size={14} /> حالة الحقول الإلزامية:</div>
              <div className="req-status-chips">
                {importMode === 'update' ? (
                  <>
                    {(() => {
                      const ok = Object.values(colMapping).some(v =>
                        v === 'national_id' || v === 'student_code');
                      return (
                        <span className={`req-chip ${ok ? 'mapped' : 'unmapped'}`}>
                          {ok ? <Check size={11} /> : <X size={11} />}
                          مفتاح المطابقة
                        </span>
                      );
                    })()}
                    {(() => {
                      const ok = Object.values(colMapping).includes('status');
                      return (
                        <span className={`req-chip ${ok ? 'mapped' : 'unmapped'}`}>
                          {ok ? <Check size={11} /> : <X size={11} />}
                          حالة القيد
                        </span>
                      );
                    })()}
                  </>
                ) : (
                  NEW_FIELD_OPTIONS.filter(f => f.required).map(f => {
                    const ok = Object.values(colMapping).includes(f.value);
                    return (
                      <span key={f.value} className={`req-chip ${ok ? 'mapped' : 'unmapped'}`}>
                        {ok ? <Check size={11} /> : <X size={11} />}
                        {f.label.replace(' *', '')}
                      </span>
                    );
                  })
                )}
              </div>
            </div>

            {error && <div className="import-error"><AlertTriangle size={15} />{error}</div>}

            <div className="step-actions">
              <button className="btn-secondary-import" onClick={() => { setError(''); setStep(1); }}>
                <ChevronRight size={16} /> السابق
              </button>
              <button className="btn-primary-import"
                onClick={handleValidateWithMapping} disabled={loading}>
                {loading
                  ? <><Loader2 size={16} className="spin" /> جاري التحقق...</>
                  : <>التالي: التحقق من البيانات <ChevronLeft size={16} /></>}
              </button>
            </div>
          </div>
        )}

        {/* ════ STEP 3 ════ */}
        {step === 3 && (
          <div className="step-content">
            <div className="step-heading">
              <CheckCircle2 size={20} className="step-icon-color" />
              <h2>نتائج التحقق من البيانات</h2>
            </div>

            <div className="validation-summary">
              <div className="vsummary-card total">
                <div className="vsummary-num">{validSummary.total}</div>
                <div className="vsummary-lbl">إجمالي الصفوف</div>
              </div>
              <div className="vsummary-card valid">
                <CheckCircle2 size={20} />
                <div className="vsummary-num">{validSummary.valid}</div>
                <div className="vsummary-lbl">سجل صالح</div>
              </div>
              <div className="vsummary-card errors">
                <XCircle size={20} />
                <div className="vsummary-num">{validSummary.errors}</div>
                <div className="vsummary-lbl">به أخطاء</div>
              </div>
            </div>

            {/* Hierarchical Bulk Correction Bar */}
            {importMode === 'new' && importMetadata && (
              <div style={{
                background: '#ffffff',
                padding: '16px 20px',
                borderRadius: '12px',
                border: '2px solid #cbd5e1',
                marginBottom: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14.5px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders size={18} color="#2563eb" />
                  شريط التعيين والتعديل التراتبي (تعديل القسم للجميع ← المرحلة للمجموعة ← الصف للمرحلة)
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
                  
                  {/* 1. Section Bulk */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>1. القسم:</span>
                    <select
                      value={bulkSectionId}
                      onChange={e => setBulkSectionId(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, background: '#fff' }}
                    >
                      <option value="">-- اختر القسم للجميع --</option>
                      {importMetadata.sections.map(sec => (
                        <option key={sec.id} value={sec.id}>{sec.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleApplyBulkSection}
                      disabled={!bulkSectionId}
                      style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      تعديل القسم للجميع
                    </button>
                  </div>

                  {/* 2. Stage Bulk */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>2. المرحلة:</span>
                    <select
                      value={bulkStageId}
                      onChange={e => { setBulkStageId(e.target.value); setBulkGradeId(''); }}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, background: '#fff' }}
                    >
                      <option value="">-- اختر المرحلة --</option>
                      {(bulkSectionId
                        ? importMetadata.stages.filter(st => String(st.sectionId) === String(bulkSectionId))
                        : importMetadata.stages
                      ).map(st => (
                        <option key={st.id} value={st.id}>{st.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleApplyBulkStage}
                      disabled={!bulkStageId}
                      style={{ background: '#059669', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      تعديل المرحلة
                    </button>
                  </div>

                  {/* 3. Grade Bulk (Scoped strictly under Stage to prevent overlaps!) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>3. الصف:</span>
                    <select
                      value={bulkGradeId}
                      onChange={e => setBulkGradeId(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, background: '#fff' }}
                    >
                      <option value="">-- اختر الصف (حسب المرحلة) --</option>
                      {(bulkStageId
                        ? importMetadata.grades.filter(gr => String(gr.stageId) === String(bulkStageId))
                        : importMetadata.grades
                      ).map(grd => (
                        <option key={grd.id} value={grd.id}>{grd.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleApplyBulkGrade}
                      disabled={!bulkGradeId}
                      style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      تعديل الصف للمجموعة
                    </button>
                  </div>

                </div>
              </div>
            )}

            <div className="validation-table-wrap">
              <table className="validation-table">
                <thead>
                  <tr>
                    <th>صف</th>
                    <th>الحالة</th>
                    {importMode === 'update' ? (
                      <>
                        <th>الطالب المُطابَق</th>
                        <th>الصف / العام</th>
                        <th>تغيير الحالة</th>
                      </>
                    ) : (
                      <>
                        <th>اسم الطالب</th>
                        <th>القسم / المرحلة / الصف</th>
                      </>
                    )}
                    <th>الأخطاء / التحذيرات</th>
                  </tr>
                </thead>
                <tbody>
                  {validationResults.map((row, i) => (
                    <tr key={i} className={row.status === 'valid' ? 'row-valid' : 'row-error'}>
                      <td className="vrow-num">{row.rowNum}</td>
                      <td>
                        {row.status === 'valid'
                          ? <span className="badge-valid"><CheckCircle2 size={13} /> صالح</span>
                          : <span className="badge-error"><XCircle size={13} /> خطأ</span>}
                      </td>

                      {importMode === 'update' ? (
                        <>
                          <td className="vrow-name">
                            {row.data.matchedName || '—'}
                            {row.data.studentCode &&
                              <span className="student-code-inline"> ({row.data.studentCode})</span>}
                          </td>
                          <td className="vrow-loc">
                            <span className="loc-chip">{row.data.matchedGrade || '—'}</span>
                            <span className="loc-sep">·</span>
                            <span className="loc-chip">{row.data.matchedYear || '—'}</span>
                          </td>
                          <td>
                            {row.data.currentStatus ? (
                              <span className="status-change-arrow">
                                <span style={{ color: STATUS_LABELS[row.data.currentStatus]?.color, fontWeight: 600 }}>
                                  {STATUS_LABELS[row.data.currentStatus]?.label}
                                </span>
                                {' → '}
                                <span style={{ color: STATUS_LABELS[row.data.status]?.color, fontWeight: 700 }}>
                                  {STATUS_LABELS[row.data.status]?.label || row.data.statusLabel}
                                </span>
                              </span>
                            ) : (
                              <span style={{ color: STATUS_LABELS[row.data.status]?.color, fontWeight: 600 }}>
                                {STATUS_LABELS[row.data.status]?.label || row.data.statusLabel || '—'}
                              </span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="vrow-name">{row.data.fullNameAr || '—'}</td>
                          <td className="vrow-loc">
                            <span className="loc-chip">{row.data.sectionName || '—'}</span>
                            <span className="loc-sep">›</span>
                            <span className="loc-chip">{row.data.stageName || '—'}</span>
                            <span className="loc-sep">›</span>
                            <span className="loc-chip">{row.data.gradeName || '—'}</span>
                          </td>
                        </>
                      )}

                      <td className="vrow-errors">
                        {row.errors.map((e, ei) => (
                          <div key={ei} className="error-msg"><XCircle size={11} /> {e}</div>
                        ))}
                        {row.warnings?.map((w, wi) => (
                          <div key={wi} className="warning-msg"><AlertTriangle size={11} /> {w}</div>
                        ))}
                        {row.errors.length === 0 && !row.warnings?.length && (
                          <span className="no-issues">لا توجد مشاكل ✓</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {validSummary.valid === 0 && (
              <div className="import-error large">
                <XCircle size={18} />
                لا توجد سجلات صالحة. يرجى تصحيح الأخطاء وإعادة المحاولة.
              </div>
            )}
            {error && <div className="import-error"><AlertTriangle size={15} />{error}</div>}

            <div className="step-actions">
              <button className="btn-secondary-import" onClick={() => { setError(''); setStep(2); }}>
                <ChevronRight size={16} /> تعديل المطابقة
              </button>
              {validSummary.errors > 0 && (
                <button className="btn-secondary-import" onClick={exportFailedRowsToExcel} style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                  <Download size={16} /> تصدير السجلات المرفوضة (Excel)
                </button>
              )}
              <button className="btn-primary-import"
                onClick={handleExecuteImport}
                disabled={loading || validSummary.valid === 0}>
                {loading ? (
                  <><Loader2 size={16} className="spin" /> جاري التنفيذ...</>
                ) : (
                  <>
                    {importMode === 'update' ? <RefreshCw size={16} /> : <Users size={16} />}
                    {importMode === 'update'
                      ? `تحديث ${validSummary.valid} سجل`
                      : `استيراد ${validSummary.valid} طالب`}
                    <ChevronLeft size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ════ STEP 4 ════ */}
        {step === 4 && importResults && (
          <div className="step-content">
            <div className="result-hero">
              {importResults.summary.success > 0
                ? <div className="result-success-icon"><CheckCircle2 size={56} /></div>
                : <div className="result-fail-icon"><XCircle size={56} /></div>}
              <h2 className="result-headline">
                {importMode === 'update'
                  ? importResults.summary.success > 0
                    ? `تم تحديث حالة قيد ${importResults.summary.success} طالب بنجاح!`
                    : 'لم يتم تحديث أي سجل'
                  : importResults.summary.success > 0
                    ? `تم استيراد ${importResults.summary.success} طالب بنجاح!`
                    : 'لم يتم استيراد أي سجل'}
              </h2>
              {importResults.summary.failed > 0 && (
                <p className="result-sub-warn">
                  <AlertTriangle size={15} /> فشل {importResults.summary.failed} سجل
                </p>
              )}
            </div>

            {importResults.results.length > 0 && (
              <div className="result-table-wrap">
                <table className="result-table">
                  <thead>
                    <tr>
                      <th>الحالة</th>
                      <th>اسم الطالب</th>
                      <th>{importMode === 'update' ? 'حالة القيد الجديدة' : 'كود الطالب'}</th>
                      <th>تفاصيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResults.results.map((r, i) => (
                      <tr key={i} className={r.status === 'success' ? 'row-valid' : 'row-error'}>
                        <td>
                          {r.status === 'success'
                            ? <span className="badge-valid"><CheckCircle2 size={13} /> تم</span>
                            : <span className="badge-error"><XCircle size={13} /> فشل</span>}
                        </td>
                        <td>{r.name}</td>
                        <td className="student-code">
                          {importMode === 'update'
                            ? <span style={{ fontWeight: 700 }}>{r.newStatus || '—'}</span>
                            : r.code || '—'}
                        </td>
                        <td className="result-detail">{r.error || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="step-actions result-actions">
              <button className="btn-secondary-import" onClick={reset}>
                <RotateCcw size={16} /> استيراد ملف آخر
              </button>
              {importResults.summary.failed > 0 && (
                <button className="btn-secondary-import" onClick={exportFailedRowsToExcel} style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                  <Download size={16} /> تصدير الأخطاء (Excel)
                </button>
              )}
              <button className="btn-primary-import" onClick={onBack}>
                <Users size={16} /> العودة لقائمة الطلاب
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
