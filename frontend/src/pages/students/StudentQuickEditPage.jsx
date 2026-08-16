import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Edit3, Search, Save, RefreshCw, AlertTriangle, CheckCircle,
  Loader2, ArrowLeft, Check, CheckCheck, Globe, School, UserCheck,
  Layers, Filter, Users, Calendar, MapPin, Sparkles, BookOpen, ShieldAlert,
  ChevronRight, ChevronLeft
} from 'lucide-react';
import API_BASE_URL from '../../config/api';
import {
  ENROLLMENT_STATUS_OPTIONS,
  RELIGIONS,
  GENDERS,
  FOREIGN_LANGUAGES,
  DISABILITY_TYPES,
  SECONDARY_SPECIALIZATIONS,
  GUARDIAN_RELATIONS,
  GOVERNORATES_MAP,
  parseEgyptianNationalId,
  formatClassNumeric
} from '../../constants/lookupOptions';

const API = API_BASE_URL;

export default function StudentQuickEditPage({ onBack, activeSectionId }) {
  // Tabs: 'nationalId' | 'status' | 'classes' | 'merge'
  const [activeTab, setActiveTab]       = useState('nationalId');
  const [students, setStudents]         = useState([]);
  const [formOpts, setFormOpts]         = useState({ sections: [], stages: [], grades: [], academicYears: [], nationalities: [] });
  const [allClassrooms, setAllClassrooms] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [savingId, setSavingId]         = useState(null);
  const [savingAll, setSavingAll]       = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  
  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Bulk values state
  const [bulkField, setBulkField] = useState('classId');
  const [bulkValue, setBulkValue] = useState('');
  const [bulkDecisionNo, setBulkDecisionNo] = useState('');
  const [bulkDecisionDate, setBulkDecisionDate] = useState('');

  // Filtering & Search
  const [filters, setFilters] = useState({
    academicYearId: '',
    sectionId: activeSectionId && activeSectionId !== 'all' ? String(activeSectionId) : '',
    stageId: '',
    gradeId: '',
    classId: '',
    search: ''
  });

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState('50'); // Defaults to 50 for ultra-fast instantaneous loading
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Local pending changes: { [studentId]: { field: value } }
  const [pendingChanges, setPendingChanges] = useState({});

  useEffect(() => {
    fetch(`${API}/students/form-options`).then(r => r.json()).then(d => {
      if (d.success) {
        setFormOpts(d);
        const cur = d.academicYears?.find(y => y.is_current === 1 || y.is_current === true);
        const stg = d.stages?.length === 1 ? String(d.stages[0].id) : '';
        const grd = d.grades?.length === 1 ? String(d.grades[0].id) : '';
        setFilters(f => ({
          ...f,
          academicYearId: cur ? String(cur.id) : (d.academicYears?.[0]?.id ? String(d.academicYears[0].id) : ''),
          stageId: f.stageId || stg,
          gradeId: f.gradeId || grd
        }));
      }
    });
  }, []);

  // Load ALL classrooms for the school / academic year so they are always available for every student
  useEffect(() => {
    const ayId = filters.academicYearId || formOpts.academicYears?.find(y => y.is_current === 1 || y.is_current === true)?.id;
    const url = ayId ? `${API}/settings/classrooms?academicYearId=${ayId}` : `${API}/settings/classrooms`;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setAllClassrooms(d.classrooms || []);
        }
      })
      .catch(e => console.error('Classrooms load error:', e));
  }, [filters.academicYearId, formOpts.academicYears]);

  // Load students based on filters & pagination
  const loadStudents = useCallback(() => {
    if (!filters.academicYearId) return;
    setLoading(true);
    const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const q = new URLSearchParams({ ...activeFilters, page: String(page), limit: String(limit), status: 'all' });
    
    fetch(`${API}/students?${q}`).then(r => r.json()).then(d => {
      if (d.success) {
        setStudents(d.students || []);
        setTotalCount(d.total || d.students?.length || 0);
        setTotalPages(d.totalPages || Math.ceil((d.total || d.students?.length || 0) / (limit === 'all' ? 100000 : parseInt(limit))) || 1);
        setPendingChanges({});
        setSelectedIds([]);
      }
    }).finally(() => setLoading(false));
  }, [filters, page, limit]);

  useEffect(() => { loadStudents(); }, [loadStudents]);
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const filteredStages = useMemo(() => {
    const allStages = formOpts.stages || [];
    if (!filters.sectionId) return allStages;
    const bySec = allStages.filter(s => String(s.section_id) === String(filters.sectionId));
    return bySec.length > 0 ? bySec : allStages;
  }, [filters.sectionId, formOpts.stages]);

  const filteredGrades = useMemo(() => {
    const allGrades = formOpts.grades || [];
    if (filters.stageId) {
      return allGrades.filter(g => String(g.stage_id) === String(filters.stageId));
    }
    return allGrades;
  }, [formOpts.grades, filters.stageId]);

  // Classrooms for the top filter bar
  const filterClassrooms = useMemo(() => {
    return allClassrooms.filter(c => !filters.gradeId || String(c.grade_id) === String(filters.gradeId));
  }, [allClassrooms, filters.gradeId]);

  // Track local edits per student
  const handleLocalChange = (studentId, field, value) => {
    setPendingChanges(prev => {
      const existing = prev[studentId] || {};
      const updated = { ...existing, [field]: value };

      // إذا تم تعديل الرقم القومي، استخلص تاريخ الميلاد والمحافظة والنوع تلقائياً إذا كان صالحاً
      if (field === 'nationalId') {
        const parsed = parseEgyptianNationalId(value);
        if (parsed && parsed.isValid) {
          updated.birthDate  = parsed.birthDate;
          updated.birthPlace = parsed.birthPlace;
          updated.gender     = parsed.gender;
        }
      }

      // إذا تم تغيير اللغة الأولى إلى نفس اللغة الثانية، عدل اللغة الثانية لتجنب التضارب
      if (field === 'firstLanguage') {
        const currentLang2 = updated.secondLanguage !== undefined ? updated.secondLanguage : (students.find(s => s.id === studentId)?.second_language || 'لا يوجد');
        if (currentLang2 === value && value !== 'لا يوجد') {
          updated.secondLanguage = 'لا يوجد';
        }
      }

      return {
        ...prev,
        [studentId]: updated
      };
    });
  };

  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedIds.length === students.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map(s => s.id));
    }
  };

  const toggleSelectStudent = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Save changes for a single student row
  const handleSaveRow = async (studentId) => {
    const changes = pendingChanges[studentId] || {};
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const updatedData = { ...student, ...changes };

    setSavingId(studentId);
    setError('');
    try {
      const targetAyId = parseInt(filters.academicYearId || student.academic_year_id || formOpts.academicYears?.[0]?.id || '1', 10);

      const res = await fetch(`${API}/students/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullNameAr:             updatedData.full_name_ar,
          nationalId:             updatedData.national_id || updatedData.nationalId,
          gender:                 updatedData.gender,
          religion:               updatedData.religion,
          status:                 updatedData.status,
          nationalityId:          updatedData.nationalityId !== undefined ? (updatedData.nationalityId ? parseInt(updatedData.nationalityId, 10) : null) : (updatedData.nationality_id || null),
          birthDate:              updatedData.birth_date || updatedData.birthDate,
          birthPlace:             updatedData.birth_place || updatedData.birthPlace,
          isMerged:               updatedData.is_merged === 1 || updatedData.isMerged === 1 || updatedData.isMerged === true,
          mergeType:              updatedData.merge_type || updatedData.mergeType,
          disabilityId:           updatedData.disabilityId || updatedData.disability_id,
          mergeDecisionNumber:    updatedData.merge_decision_number || updatedData.mergeDecisionNumber,
          mergeDecisionDate:      updatedData.merge_decision_date || updatedData.mergeDecisionDate,
          address:                updatedData.address,
          studentPhone:           updatedData.student_phone || updatedData.studentPhone,
          secondLanguage:         updatedData.second_language || updatedData.secondLanguage,
          secondaryTrack:         updatedData.secondary_track || updatedData.secondaryTrack,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // If classroom was changed, perform classroom enrollment
      if (changes.classId !== undefined) {
        const clsId = changes.classId ? parseInt(changes.classId, 10) : null;
        await fetch(`${API}/settings/classrooms/bulk-enroll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enrollments: [{ studentId, classId: clsId, academicYearId: targetAyId }]
          })
        });
      }

      setSuccess(`✅ تم حفظ بيانات الطالب "${updatedData.full_name_ar}" بنجاح في قاعدة البيانات.`);
      setPendingChanges(prev => {
        const n = { ...prev };
        delete n[studentId];
        return n;
      });
      loadStudents();
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingId(null);
    }
  };

  // Bulk Apply & Direct Save Handler (تطبيق جماعي وحفظ فوري ومباشر في قاعدة البيانات)
  const handleApplyAndSaveBulk = async () => {
    if (!selectedIds.length) {
      setError('يرجى تحديد طلاب أولاً لتطبيق التعديل الجماعي وحفظه.');
      return;
    }

    setSavingAll(true);
    setError('');
    let successCount = 0;
    const targetAyId = parseInt(filters.academicYearId || formOpts.academicYears?.[0]?.id || '1', 10);

    for (const sid of selectedIds) {
      try {
        const studentId = parseInt(sid, 10);
        const student = students.find(s => s.id === studentId);
        const cur = pendingChanges[studentId] || {};
        let updatedData = { ...student, ...cur };

        if (activeTab === 'nationalId') {
          const nid = cur.nationalId !== undefined ? cur.nationalId : student?.national_id;
          const parsed = parseEgyptianNationalId(nid);
          if (parsed && parsed.isValid) {
            updatedData = {
              ...updatedData,
              birth_date:  parsed.birthDate,
              birth_place: parsed.birthPlace,
              gender:      parsed.gender
            };
          }
        } else if (activeTab === 'status') {
          if (bulkField === 'status') updatedData.status = bulkValue;
          if (bulkField === 'nationalityId') updatedData.nationality_id = parseInt(bulkValue, 10);
          if (bulkField === 'religion') updatedData.religion = bulkValue;
        } else if (activeTab === 'classes') {
          if (bulkField === 'firstLanguage') updatedData.second_language = (updatedData.second_language === bulkValue ? 'لا يوجد' : updatedData.second_language);
          if (bulkField === 'secondLanguage') updatedData.second_language = bulkValue;
          if (bulkField === 'secondaryTrack') updatedData.secondary_track = bulkValue;
        } else if (activeTab === 'merge') {
          const disObj = DISABILITY_TYPES.find(d => d.id === bulkValue);
          updatedData.disability_id = bulkValue;
          updatedData.is_merged = disObj?.isMerged ? 1 : 0;
          updatedData.merge_type = disObj?.typeName || null;
          if (bulkDecisionNo) updatedData.merge_decision_number = bulkDecisionNo;
          if (bulkDecisionDate) updatedData.merge_decision_date = bulkDecisionDate;
        }

        const res = await fetch(`${API}/students/${studentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullNameAr:             updatedData.full_name_ar,
            nationalId:             updatedData.national_id || updatedData.nationalId,
            gender:                 updatedData.gender,
            religion:               updatedData.religion,
            status:                 updatedData.status,
            nationalityId:          updatedData.nationality_id || null,
            birthDate:              updatedData.birth_date || updatedData.birthDate,
            birthPlace:             updatedData.birth_place || updatedData.birthPlace,
            isMerged:               updatedData.is_merged === 1,
            mergeType:              updatedData.merge_type || null,
            disabilityId:           updatedData.disability_id || null,
            mergeDecisionNumber:    updatedData.merge_decision_number || null,
            mergeDecisionDate:      updatedData.merge_decision_date || null,
            address:                updatedData.address,
            studentPhone:           updatedData.student_phone,
            secondLanguage:         updatedData.second_language,
            secondaryTrack:         updatedData.secondary_track,
          })
        });

        if (res.ok) {
          // If bulk updating classroom
          if (activeTab === 'classes' && bulkField === 'classId') {
            const clsId = bulkValue ? parseInt(bulkValue, 10) : null;
            await fetch(`${API}/settings/classrooms/bulk-enroll`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                enrollments: [{ studentId, classId: clsId, academicYearId: targetAyId }]
              })
            });
          }
          successCount++;
        }
      } catch (err) {
        console.error('Batch save error for student:', sid, err);
      }
    }

    setSavingAll(false);
    setSuccess(`✅ تم تطبيق وحفظ التعديلات لـ (${successCount}) طالباً مباشرة في قاعدة البيانات.`);
    setPendingChanges({});
    loadStudents();
  };

  // Save All Pending Modified Rows in Batch
  const handleSaveAllPending = async () => {
    const studentIds = Object.keys(pendingChanges);
    if (!studentIds.length) return;

    setSavingAll(true);
    setError('');
    let successCount = 0;
    const targetAyId = parseInt(filters.academicYearId || formOpts.academicYears?.[0]?.id || '1', 10);

    for (const sid of studentIds) {
      try {
        const studentId = parseInt(sid, 10);
        const changes = pendingChanges[studentId];
        const student = students.find(s => s.id === studentId);
        const updatedData = { ...student, ...changes };

        const res = await fetch(`${API}/students/${studentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullNameAr:             updatedData.full_name_ar,
            nationalId:             updatedData.national_id || updatedData.nationalId,
            gender:                 updatedData.gender,
            religion:               updatedData.religion,
            status:                 updatedData.status,
            nationalityId:          updatedData.nationalityId !== undefined ? (updatedData.nationalityId ? parseInt(updatedData.nationalityId, 10) : null) : (updatedData.nationality_id || null),
            birthDate:              updatedData.birth_date || updatedData.birthDate,
            birthPlace:             updatedData.birth_place || updatedData.birthPlace,
            isMerged:               updatedData.is_merged === 1 || updatedData.isMerged === 1 || updatedData.isMerged === true,
            mergeType:              updatedData.merge_type || updatedData.mergeType,
            disabilityId:           updatedData.disabilityId || updatedData.disability_id,
            mergeDecisionNumber:    updatedData.merge_decision_number || updatedData.mergeDecisionNumber,
            mergeDecisionDate:      updatedData.merge_decision_date || updatedData.mergeDecisionDate,
            address:                updatedData.address,
            studentPhone:           updatedData.student_phone || updatedData.studentPhone,
            secondLanguage:         updatedData.second_language || updatedData.secondLanguage,
            secondaryTrack:         updatedData.secondary_track || updatedData.secondaryTrack,
          })
        });

        if (res.ok) {
          if (changes.classId !== undefined) {
            const clsId = changes.classId ? parseInt(changes.classId, 10) : null;
            await fetch(`${API}/settings/classrooms/bulk-enroll`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                enrollments: [{ studentId, classId: clsId, academicYearId: targetAyId }]
              })
            });
          }
          successCount++;
        }
      } catch (err) {
        console.error('Batch save error for student:', sid, err);
      }
    }

    setSavingAll(false);
    setSuccess(`✅ تم حفظ تعديلات (${successCount}) طالب بنجاح في قاعدة البيانات.`);
    setPendingChanges({});
    loadStudents();
  };

  const modifiedCount = Object.keys(pendingChanges).length;

  return (
    <div className="students-module">
      {/* Header */}
      <div className="page-header">
        <div className="page-title-area">
          <button className="import-back-btn" onClick={onBack}>
            <ArrowLeft size={16} /> العودة للطلاب
          </button>
          <div className="page-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <Edit3 size={22} />
          </div>
          <div>
            <h1 className="page-title">التحكم السريع وتدقيق البيانات الشامل (فردي وجماعي)</h1>
            <p className="page-sub">تدقيق الأرقام القومية وتواريخ الميلاد، توحيد حالات القيد، تسكين الفصول، ضبط اللغات، وحالات الدمج</p>
          </div>
        </div>

        {modifiedCount > 0 && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn-add-student" onClick={handleSaveAllPending} disabled={savingAll} style={{ background: 'linear-gradient(135deg, #059669, #047857)', padding: '10px 22px', gap: 8, boxShadow: '0 4px 14px rgba(5,150,105,0.35)' }}>
              {savingAll ? <Loader2 size={16} className="spin" /> : <CheckCheck size={17} />}
              <span>حفظ التعديلات المعلقة ({modifiedCount})</span>
            </button>
          </div>
        )}
      </div>

      {error   && <div className="form-alert error"   style={{ marginBottom: 12 }}><AlertTriangle size={15} /> {error}</div>}
      {success && <div className="form-alert success" style={{ marginBottom: 12 }}><CheckCircle size={15} /> {success}</div>}

      {/* Filter Bar */}
      <div className="filter-panel glass-panel" style={{ marginBottom: 16 }}>
        <div className="filter-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', gap: 10 }}>
          {formOpts.academicYears?.length > 1 && (
            <select className="filter-select" value={filters.academicYearId}
              onChange={e => setFilters(f => ({ ...f, academicYearId: e.target.value }))}>
              <option value="">العام الدراسي</option>
              {formOpts.academicYears.map(y => <option key={y.id} value={y.id}>{y.year_label}</option>)}
            </select>
          )}

          <select className="filter-select" value={filters.sectionId}
            onChange={e => setFilters(f => ({ ...f, sectionId: e.target.value, stageId: '', gradeId: '', classId: '' }))}
            disabled={activeSectionId && activeSectionId !== 'all'}>
            <option value="">القسم</option>
            {formOpts.sections?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <select className="filter-select" value={filters.stageId}
            onChange={e => setFilters(f => ({ ...f, stageId: e.target.value, gradeId: '', classId: '' }))}>
            <option value="">المرحلة</option>
            {filteredStages.map(s => <option key={s.id} value={s.id}>{s.stage_name_ar || s.stage_name || s.name}</option>)}
          </select>

          <select 
            className="filter-select" 
            value={filters.gradeId}
            onChange={e => setFilters(f => ({ ...f, gradeId: e.target.value, classId: '' }))}
            disabled={!filters.stageId}
            style={!filters.stageId ? { opacity: 0.65, background: 'var(--bg-secondary, #f8fafc)', cursor: 'not-allowed' } : {}}
          >
            <option value="">{filters.stageId ? 'الصف' : 'اختر المرحلة أولاً--'}</option>
            {filteredGrades.map(g => <option key={g.id} value={g.id}>{g.grade_name_ar || g.name}</option>)}
          </select>

          <select className="filter-select" value={filters.classId}
            onChange={e => setFilters(f => ({ ...f, classId: e.target.value }))}>
            <option value="">الفصل</option>
            {filterClassrooms.map(c => <option key={c.id} value={c.id}>{c.formatted_name || c.class_name}</option>)}
          </select>

          <button className="filter-reset" onClick={() => loadStudents()} style={{ padding: '0 16px' }}>
            <RefreshCw size={14} /> تحديث
          </button>
        </div>

        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div className="search-box" style={{ background: 'rgba(255,255,255,0.03)', flex: '1 1 320px', maxWidth: '100%' }}>
            <Search size={14} className="search-icon" />
            <input className="search-input" placeholder="بحث سريع باسم الطالب، الكود الوزاري، أو الرقم القومي..." value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }} />
          </div>

          {/* Top Pagination & Limit Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f1f5f9', padding: '6px 14px', borderRadius: 8, border: '1px solid #cbd5e1' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>عرض:</span>
            <select
              value={limit}
              onChange={e => { setLimit(e.target.value); setPage(1); }}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid #94a3b8',
                fontSize: 12,
                fontWeight: 800,
                color: '#0f172a',
                background: '#fff',
                cursor: 'pointer'
              }}
            >
              <option value="50">50 طالب (سريع ⚡)</option>
              <option value="100">100 طالب</option>
              <option value="250">250 طالب</option>
              <option value="500">500 طالب</option>
              <option value="all">جميع الطلاب (الكل)</option>
            </select>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              (معروض <strong>{students.length}</strong> من <strong>{totalCount}</strong>)
            </span>

            {limit !== 'all' && totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 6 }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    border: '1px solid #cbd5e1',
                    background: page <= 1 ? '#e2e8f0' : '#fff',
                    color: page <= 1 ? '#94a3b8' : '#0f172a',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    fontSize: 11.5,
                    fontWeight: 700
                  }}
                >
                  ◀ السابق
                </button>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: '0 4px' }}>
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    border: '1px solid #cbd5e1',
                    background: page >= totalPages ? '#e2e8f0' : '#fff',
                    color: page >= totalPages ? '#94a3b8' : '#0f172a',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    fontSize: 11.5,
                    fontWeight: 700
                  }}
                >
                  التالي ▶
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="students-tabs" style={{ marginBottom: 14 }}>
        <button className={`tab-btn ${activeTab === 'nationalId' ? 'active' : ''}`} onClick={() => { setActiveTab('nationalId'); setBulkField('extractAll'); }}>
          📇 تدقيق ومطابقة الرقم القومي وتواريخ الميلاد
        </button>
        <button className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`} onClick={() => { setActiveTab('status'); setBulkField('status'); setBulkValue('promoted'); }}>
          🏷️ حالات القيد والجنسية والديانة
        </button>
        <button className={`tab-btn ${activeTab === 'classes' ? 'active' : ''}`} onClick={() => { setActiveTab('classes'); setBulkField('classId'); setBulkValue(filterClassrooms[0]?.id || ''); }}>
          🏫 التسكين على الفصول واللغات (الأولى والثانية)
        </button>
        <button className={`tab-btn ${activeTab === 'merge' ? 'active' : ''}`} onClick={() => { setActiveTab('merge'); setBulkField('disabilityId'); setBulkValue('0'); }}>
          ♿ حالات الدمج والإعاقات وقرارات الوزارة
        </button>
      </div>

      {/* ── Smart Bulk Toolbar (شريط التطبيق الجماعي الذكي مع حفظ فوري) ─────────────── */}
      <div className="bulk-action-bar" style={{
        background: '#ffffff',
        border: '1.5px solid #cbd5e1',
        borderRadius: 12,
        padding: '10px 16px',
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label className="checkbox-label" style={{ fontWeight: 800, color: '#1e293b', cursor: 'pointer' }}>
            <input type="checkbox"
              checked={students.length > 0 && selectedIds.length === students.length}
              onChange={toggleSelectAll} />
            <span>تحديد الكل ({selectedIds.length} من {students.length})</span>
          </label>
        </div>

        {/* Dynamic Bulk Controls per Active Tab */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {activeTab === 'nationalId' && (
            <button className="btn-save" onClick={handleApplyAndSaveBulk} disabled={!selectedIds.length || savingAll} style={{
              background: selectedIds.length ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#f1f5f9',
              color: selectedIds.length ? '#fff' : '#94a3b8',
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 800,
              borderRadius: 8,
              border: 'none',
              cursor: selectedIds.length ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: selectedIds.length ? '0 2px 8px rgba(37,99,235,0.3)' : 'none'
            }}>
              {savingAll ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
              <span>⚡ استخلاص ومطابقة وحفظ فوري للمحددين ({selectedIds.length})</span>
            </button>
          )}

          {activeTab === 'status' && (
            <>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>تطبيق وحفظ فوري:</span>
              <select className="form-control" style={{ width: 140, fontSize: 12.5 }} value={bulkField} onChange={e => {
                setBulkField(e.target.value);
                if (e.target.value === 'status') setBulkValue('promoted');
                if (e.target.value === 'nationalityId') setBulkValue(formOpts.nationalities?.[0]?.id || '1');
                if (e.target.value === 'religion') setBulkValue('مسلم');
              }}>
                <option value="status">حالة القيد</option>
                <option value="nationalityId">الجنسية</option>
                <option value="religion">الديانة</option>
              </select>

              {bulkField === 'status' && (
                <select className="form-control" style={{ width: 180, fontSize: 12.5, fontWeight: 700 }} value={bulkValue} onChange={e => setBulkValue(e.target.value)}>
                  {ENROLLMENT_STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}

              {bulkField === 'nationalityId' && (
                <select className="form-control" style={{ width: 150, fontSize: 12.5 }} value={bulkValue} onChange={e => setBulkValue(e.target.value)}>
                  {(formOpts.nationalities || []).map(n => (
                    <option key={n.id} value={String(n.id)}>{n.name_ar || n.name}</option>
                  ))}
                </select>
              )}

              {bulkField === 'religion' && (
                <select className="form-control" style={{ width: 110, fontSize: 12.5, fontWeight: 700 }} value={bulkValue} onChange={e => setBulkValue(e.target.value)}>
                  {RELIGIONS.map(r => (
                    <option key={r.id} value={r.name}>{r.name} {r.icon}</option>
                  ))}
                </select>
              )}

              <button className="btn-save" onClick={handleApplyAndSaveBulk} disabled={!selectedIds.length || savingAll} style={{
                background: selectedIds.length ? 'linear-gradient(135deg, #059669, #047857)' : '#f1f5f9',
                color: selectedIds.length ? '#fff' : '#94a3b8',
                padding: '8px 18px',
                fontSize: 12.5,
                fontWeight: 800,
                borderRadius: 8,
                border: 'none',
                cursor: selectedIds.length ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                {savingAll ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                <span>حفظ للمحددين ({selectedIds.length})</span>
              </button>
            </>
          )}

          {activeTab === 'classes' && (
            <>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>تطبيق وحفظ فوري:</span>
              <select className="form-control" style={{ width: 140, fontSize: 12.5 }} value={bulkField} onChange={e => {
                setBulkField(e.target.value);
                if (e.target.value === 'classId') setBulkValue(filterClassrooms[0]?.id || '');
                if (e.target.value === 'firstLanguage') setBulkValue('الإنجليزية');
                if (e.target.value === 'secondLanguage') setBulkValue('الفرنسية');
              }}>
                <option value="classId">الفصل الدراسي</option>
                <option value="firstLanguage">اللغة الأولى</option>
                <option value="secondLanguage">اللغة الثانية</option>
              </select>

              {bulkField === 'classId' && (
                <select className="form-control" style={{ width: 180, fontSize: 12.5, fontWeight: 700 }} value={bulkValue} onChange={e => setBulkValue(e.target.value)}>
                  <option value="">-- بدون فصل --</option>
                  {filterClassrooms.map(c => <option key={c.id} value={c.id}>{c.formatted_name || c.class_name}</option>)}
                </select>
              )}

              {bulkField === 'firstLanguage' && (
                <select className="form-control" style={{ width: 150, fontSize: 12.5 }} value={bulkValue} onChange={e => setBulkValue(e.target.value)}>
                  {FOREIGN_LANGUAGES.map(fl => <option key={fl.code} value={fl.name}>{fl.name}</option>)}
                </select>
              )}

              {bulkField === 'secondLanguage' && (
                <select className="form-control" style={{ width: 150, fontSize: 12.5 }} value={bulkValue} onChange={e => setBulkValue(e.target.value)}>
                  <option value="لا يوجد">لا يوجد / معفى</option>
                  {FOREIGN_LANGUAGES.map(fl => <option key={fl.code} value={fl.name}>{fl.name}</option>)}
                </select>
              )}

              <button className="btn-save" onClick={handleApplyAndSaveBulk} disabled={!selectedIds.length || savingAll} style={{
                background: selectedIds.length ? 'linear-gradient(135deg, #059669, #047857)' : '#f1f5f9',
                color: selectedIds.length ? '#fff' : '#94a3b8',
                padding: '8px 18px',
                fontSize: 12.5,
                fontWeight: 800,
                borderRadius: 8,
                border: 'none',
                cursor: selectedIds.length ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                {savingAll ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                <span>حفظ للمحددين ({selectedIds.length})</span>
              </button>
            </>
          )}

          {activeTab === 'merge' && (
            <>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>الموقف من الدمج:</span>
              <select className="form-control" style={{ width: 220, fontSize: 12.5, fontWeight: 700 }} value={bulkValue} onChange={e => setBulkValue(e.target.value)}>
                {DISABILITY_TYPES.map(dt => (
                  <option key={dt.id} value={dt.id}>{dt.name}</option>
                ))}
              </select>
              <input type="text" className="form-control" style={{ width: 110, fontSize: 12 }} placeholder="رقم القرار..." value={bulkDecisionNo} onChange={e => setBulkDecisionNo(e.target.value)} />
              <input type="date" className="form-control" style={{ width: 125, fontSize: 11.5 }} value={bulkDecisionDate} onChange={e => setBulkDecisionDate(e.target.value)} />

              <button className="btn-save" onClick={handleApplyAndSaveBulk} disabled={!selectedIds.length || savingAll} style={{
                background: selectedIds.length ? 'linear-gradient(135deg, #059669, #047857)' : '#f1f5f9',
                color: selectedIds.length ? '#fff' : '#94a3b8',
                padding: '8px 18px',
                fontSize: 12.5,
                fontWeight: 800,
                borderRadius: 8,
                border: 'none',
                cursor: selectedIds.length ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                {savingAll ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                <span>حفظ للمحددين ({selectedIds.length})</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Data Table */}
      <div className="table-container glass-panel">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 50 }}><Loader2 size={32} className="spin" /></div>
        ) : students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-secondary)' }}>لا توجد بيانات مطابقة للفلتر. اختر صفاً أو ابحث لعرض الطلاب.</div>
        ) : (
          <div className="table-scroll">
            <table className="students-table" style={{ fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <input type="checkbox"
                      checked={students.length > 0 && selectedIds.length === students.length}
                      onChange={toggleSelectAll} />
                  </th>
                  <th style={{ width: '20%' }}>اسم الطالب الرباعي</th>
                  <th style={{ width: '11%' }}>الكود</th>
                  
                  {/* Tab 1: تدقيق الرقم القومي */}
                  {activeTab === 'nationalId' && (
                    <>
                      <th style={{ width: '18%' }}>الرقم القومي (14 رقماً)</th>
                      <th style={{ width: '12%' }}>تاريخ الميلاد</th>
                      <th style={{ width: '12%' }}>محافظة الميلاد</th>
                      <th style={{ width: '9%' }}>النوع</th>
                      <th style={{ width: '10%' }}>حالة المطابقة</th>
                    </>
                  )}

                  {/* Tab 2: حالات القيد والجنسية */}
                  {activeTab === 'status' && (
                    <>
                      <th style={{ width: '24%' }}>حالة القيد الرسمية</th>
                      <th style={{ width: '18%' }}>الجنسية الرسمية</th>
                      <th style={{ width: '14%' }}>الديانة</th>
                    </>
                  )}

                  {/* Tab 3: التسكين على الفصول واللغات */}
                  {activeTab === 'classes' && (
                    <>
                      <th style={{ width: '20%' }}>الفصل الدراسي المسكن عليه</th>
                      <th style={{ width: '18%' }}>اللغة الأجنبية الأولى</th>
                      <th style={{ width: '18%' }}>اللغة الأجنبية الثانية (مصفاة)</th>
                    </>
                  )}

                  {/* Tab 4: حالات الدمج وقرارات الوزارة */}
                  {activeTab === 'merge' && (
                    <>
                      <th style={{ width: '24%' }}>الموقف من الدمج والإعاقة (وزاري)</th>
                      <th style={{ width: '14%' }}>رقم القرار الوزاري</th>
                      <th style={{ width: '14%' }}>تاريخ القرار</th>
                    </>
                  )}

                  <th style={{ width: 85, textAlign: 'center' }}>حفظ</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => {
                  const pending = pendingChanges[s.id] || {};
                  const isSavedPending = Object.keys(pending).length > 0;
                  const isSelected = selectedIds.includes(s.id);
                  
                  const nationalIdVal = pending.nationalId !== undefined ? pending.nationalId : s.national_id;
                  const parsedNid = parseEgyptianNationalId(nationalIdVal);
                  const isValidId = parsedNid && parsedNid.isValid;

                  // First & Second Language logic with automatic mutual exclusion
                  const firstLangVal  = pending.firstLanguage !== undefined ? pending.firstLanguage : (s.first_language || 'الإنجليزية');
                  const secondLangVal = pending.secondLanguage !== undefined ? pending.secondLanguage : (s.second_language || 'لا يوجد');

                  // Filtered Second Language options: excludes chosen First Language
                  const availableSecondLangs = FOREIGN_LANGUAGES.filter(fl => fl.name !== firstLangVal);

                  // Merge / Disability type
                  const currentDisabilityId = pending.disabilityId !== undefined ? pending.disabilityId : (s.disability_id !== null && s.disability_id !== undefined ? String(s.disability_id) : (s.is_merged ? '8' : '0'));

                  // Classrooms available for this specific student's grade
                  const studentClassrooms = allClassrooms.filter(c => String(c.grade_id) === String(s.grade_id));
                  // Ensure student's current classroom is in options if not found
                  const currentClassId = pending.classId !== undefined ? pending.classId : (s.classroom_id ? String(s.classroom_id) : '');

                  return (
                    <tr key={s.id} className="table-row" style={{
                      background: isSavedPending ? 'rgba(16, 185, 129, 0.08)' : (isSelected ? 'rgba(37, 99, 235, 0.05)' : undefined)
                    }}>
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectStudent(s.id)} />
                      </td>

                      <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                        {s.full_name_ar}
                        {isSavedPending && <span style={{ marginRight: 6, fontSize: 10, background: '#10b981', color: '#fff', padding: '1px 5px', borderRadius: 4 }}>معدل</span>}
                      </td>

                      <td><code>{s.student_code || s.emis_student_code || '—'}</code></td>

                      {/* 1. Tab: تدقيق الرقم القومي */}
                      {activeTab === 'nationalId' && (
                        <>
                          <td>
                            <input type="text" className="form-control" style={{
                              fontSize: 13,
                              fontWeight: 700,
                              padding: '5px 8px',
                              direction: 'ltr',
                              borderColor: !isValidId && nationalIdVal ? '#ef4444' : (isValidId ? '#10b981' : undefined)
                            }}
                              value={nationalIdVal || ''} maxLength={14}
                              placeholder="14 رقماً..."
                              onChange={e => handleLocalChange(s.id, 'nationalId', e.target.value)} />
                          </td>

                          <td>
                            <input type="date" className="form-control" style={{ fontSize: 12, padding: '4px 6px' }}
                              value={pending.birthDate !== undefined ? pending.birthDate : (s.birth_date || '')}
                              onChange={e => handleLocalChange(s.id, 'birthDate', e.target.value)} />
                          </td>

                          <td>
                            <input type="text" className="form-control" style={{ fontSize: 12, padding: '4px 8px' }}
                              value={pending.birthPlace !== undefined ? pending.birthPlace : (s.birth_place || '')}
                              placeholder="محافظة الميلاد"
                              onChange={e => handleLocalChange(s.id, 'birthPlace', e.target.value)} />
                          </td>

                          <td>
                            <select className="form-control" style={{ fontSize: 12, padding: '4px 6px', fontWeight: 700 }}
                              value={pending.gender !== undefined ? pending.gender : (s.gender || 'ذكر')}
                              onChange={e => handleLocalChange(s.id, 'gender', e.target.value)}>
                              <option value="ذكر">ذكر 👦</option>
                              <option value="أنثى">أنثى 👧</option>
                            </select>
                          </td>

                          <td>
                            {nationalIdVal ? (
                              isValidId ? (
                                <span style={{ color: '#059669', fontWeight: 800, background: '#ecfdf5', padding: '3px 8px', borderRadius: 6, fontSize: 11 }}>✓ مطابق وسليم</span>
                              ) : (
                                <span style={{ color: '#dc2626', fontWeight: 800, background: '#fef2f2', padding: '3px 8px', borderRadius: 6, fontSize: 11 }}>⚠️ غير مكتمل ({nationalIdVal.length}/14)</span>
                              )
                            ) : (
                              <span style={{ color: '#d97706', fontWeight: 700, background: '#fffbeb', padding: '3px 8px', borderRadius: 6, fontSize: 11 }}>⚠️ فارغ</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* 2. Tab: حالات القيد والجنسية والديانة */}
                      {activeTab === 'status' && (
                        <>
                          <td>
                            <select className="form-control" style={{ fontSize: 12.5, padding: '6px 8px', fontWeight: 700, color: '#0f172a' }}
                              value={pending.status !== undefined ? pending.status : (s.status || 'promoted')}
                              onChange={e => handleLocalChange(s.id, 'status', e.target.value)}>
                              {ENROLLMENT_STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </td>

                          <td>
                            <select className="form-control" style={{ fontSize: 12.5, padding: '6px 8px', fontWeight: 600 }}
                              value={pending.nationalityId !== undefined ? String(pending.nationalityId) : String(s.nationality_id || '1')}
                              onChange={e => handleLocalChange(s.id, 'nationalityId', e.target.value)}>
                              {(formOpts.nationalities || []).map(n => (
                                <option key={n.id} value={String(n.id)}>{n.name_ar || n.name}</option>
                              ))}
                            </select>
                          </td>

                          <td>
                            <select className="form-control" style={{ fontSize: 12.5, padding: '6px 8px', fontWeight: 600 }}
                              value={pending.religion !== undefined ? pending.religion : (s.religion || 'مسلم')}
                              onChange={e => handleLocalChange(s.id, 'religion', e.target.value)}>
                              {RELIGIONS.map(r => (
                                <option key={r.id} value={r.name}>{r.name} {r.icon}</option>
                              ))}
                            </select>
                          </td>
                        </>
                      )}

                      {/* 3. Tab: التسكين على الفصول واللغات */}
                      {activeTab === 'classes' && (
                        <>
                          <td>
                            <select className="form-control" style={{ fontSize: 12.5, padding: '6px 8px', fontWeight: 700, color: currentClassId ? '#1e3a8a' : '#64748b' }}
                              value={currentClassId}
                              onChange={e => handleLocalChange(s.id, 'classId', e.target.value)}>
                              <option value="">-- غير مسكن بفصل --</option>
                              {studentClassrooms.length > 0 ? (
                                studentClassrooms.map(c => (
                                  <option key={c.id} value={String(c.id)}>{c.formatted_name || c.class_name || `فصل ${c.class_number}`}</option>
                                ))
                              ) : (
                                allClassrooms.map(c => (
                                  <option key={c.id} value={String(c.id)}>{c.formatted_name || c.class_name || `فصل ${c.class_number}`}</option>
                                ))
                              )}
                              {s.classroom_id && !studentClassrooms.some(c => String(c.id) === String(s.classroom_id)) && (
                                <option value={String(s.classroom_id)}>{s.classroom_name || `فصل ${s.classroom_id}`}</option>
                              )}
                            </select>
                          </td>

                          <td>
                            <select className="form-control" style={{ fontSize: 12.5, padding: '6px 8px', fontWeight: 600 }}
                              value={firstLangVal}
                              onChange={e => handleLocalChange(s.id, 'firstLanguage', e.target.value)}>
                              {FOREIGN_LANGUAGES.map(fl => (
                                <option key={fl.code} value={fl.name}>{fl.name}</option>
                              ))}
                            </select>
                          </td>

                          <td>
                            <select className="form-control" style={{ fontSize: 12.5, padding: '6px 8px', fontWeight: 600 }}
                              value={secondLangVal}
                              onChange={e => handleLocalChange(s.id, 'secondLanguage', e.target.value)}>
                              <option value="لا يوجد">لا يوجد / معفى</option>
                              {availableSecondLangs.map(fl => (
                                <option key={fl.code} value={fl.name}>{fl.name}</option>
                              ))}
                            </select>
                          </td>
                        </>
                      )}

                      {/* 4. Tab: حالات الدمج وقرارات الوزارة */}
                      {activeTab === 'merge' && (
                        <>
                          <td>
                            <select className="form-control" style={{ fontSize: 12.5, padding: '6px 8px', fontWeight: 700, color: currentDisabilityId !== '0' ? '#b45309' : '#334155' }}
                              value={currentDisabilityId}
                              onChange={e => {
                                const val = e.target.value;
                                const disObj = DISABILITY_TYPES.find(d => d.id === val);
                                handleLocalChange(s.id, 'disabilityId', val);
                                handleLocalChange(s.id, 'isMerged', disObj?.isMerged || false);
                                handleLocalChange(s.id, 'mergeType', disObj?.typeName || '');
                              }}>
                              {DISABILITY_TYPES.map(dt => (
                                <option key={dt.id} value={dt.id}>{dt.name}</option>
                              ))}
                            </select>
                          </td>

                          <td>
                            <input type="text" className="form-control" style={{ fontSize: 12, padding: '5px 8px' }}
                              placeholder="رقم القرار..."
                              disabled={currentDisabilityId === '0'}
                              value={pending.mergeDecisionNumber !== undefined ? pending.mergeDecisionNumber : (s.merge_decision_number || '')}
                              onChange={e => handleLocalChange(s.id, 'mergeDecisionNumber', e.target.value)} />
                          </td>

                          <td>
                            <input type="date" className="form-control" style={{ fontSize: 11.5, padding: '5px 6px' }}
                              disabled={currentDisabilityId === '0'}
                              value={pending.mergeDecisionDate !== undefined ? pending.mergeDecisionDate : (s.merge_decision_date || '')}
                              onChange={e => handleLocalChange(s.id, 'mergeDecisionDate', e.target.value)} />
                          </td>
                        </>
                      )}

                      {/* Save Individual Action */}
                      <td style={{ textAlign: 'center' }}>
                        <button className="btn-save" style={{
                          padding: '7px 14px',
                          fontSize: 12,
                          fontWeight: 800,
                          background: isSavedPending ? 'linear-gradient(135deg, #10b981, #059669)' : '#f8fafc',
                          color: isSavedPending ? '#fff' : '#64748b',
                          border: isSavedPending ? 'none' : '1px solid #cbd5e1',
                          borderRadius: 8,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: isSavedPending ? '0 2px 6px rgba(16,185,129,0.3)' : 'none'
                        }}
                          onClick={() => handleSaveRow(s.id)} disabled={savingId === s.id}>
                          {savingId === s.id ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
                          <span>حفظ</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination & Limit Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#64748b' }}>
                <span>عرض</span>
                <select
                  value={limit}
                  onChange={e => { setLimit(e.target.value); setPage(1); }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#1e293b'
                  }}
                >
                  <option value="50">50 طالب</option>
                  <option value="100">100 طالب</option>
                  <option value="250">250 طالب</option>
                  <option value="500">500 طالب</option>
                  <option value="all">جميع الطلاب (الكل)</option>
                </select>
                <span>من إجمالي <strong>{totalCount}</strong> طالب</span>
              </div>

              {limit !== 'all' && totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      background: page <= 1 ? '#f1f5f9' : '#fff',
                      color: page <= 1 ? '#94a3b8' : '#1e293b',
                      cursor: page <= 1 ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    <ChevronRight size={14} />
                    السابق
                  </button>

                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#475569', padding: '0 8px' }}>
                    صفحة {page} من {totalPages}
                  </span>

                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      background: page >= totalPages ? '#f1f5f9' : '#fff',
                      color: page >= totalPages ? '#94a3b8' : '#1e293b',
                      cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    التالي
                    <ChevronLeft size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
