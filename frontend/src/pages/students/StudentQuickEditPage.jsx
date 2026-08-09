import React, { useState, useEffect, useCallback } from 'react';
import {
  Edit3, Search, Save, RefreshCw, AlertTriangle, CheckCircle,
  Loader2, ArrowLeft, ShieldAlert, Award, Globe, BookOpen, Filter
} from 'lucide-react';
import API_BASE_URL from '../../config/api';

const API = API_BASE_URL;

export default function StudentQuickEditPage({ onBack, activeSectionId }) {
  const [activeTab, setActiveTab]   = useState('nationalId'); // 'nationalId' | 'status' | 'merge' | 'grade'
  const [students, setStudents]     = useState([]);
  const [formOpts, setFormOpts]     = useState({ sections: [], stages: [], grades: [], academicYears: [] });
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [savingId, setSavingId]     = useState(null); // id of row currently saving
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  
  // Filtering & Pagination
  const [filters, setFilters] = useState({
    academicYearId: '',
    sectionId: activeSectionId && activeSectionId !== 'all' ? String(activeSectionId) : '',
    stageId: '',
    gradeId: '',
    classId: '',
    search: ''
  });

  // Local changes state: { studentId → { field: value } }
  const [pendingChanges, setPendingChanges] = useState({});

  useEffect(() => {
    fetch(`${API}/students/form-options`).then(r => r.json()).then(d => {
      if (d.success) {
        setFormOpts(d);
        const cur = d.academicYears?.find(y => y.is_current === 1 || y.is_current === true);
        if (cur) setFilters(f => ({ ...f, academicYearId: String(cur.id) }));
      }
    });
  }, []);

  useEffect(() => {
    if (filters.gradeId && filters.academicYearId) {
      fetch(`${API}/settings/classrooms?gradeId=${filters.gradeId}&academicYearId=${filters.academicYearId}`)
        .then(r => r.json()).then(d => setClassrooms(d.success ? d.classrooms : []));
    } else { setClassrooms([]); setFilters(f => ({ ...f, classId: '' })); }
  }, [filters.gradeId, filters.academicYearId]);

  // Load students based on filters
  const loadStudents = useCallback(() => {
    if (!filters.academicYearId) return;
    setLoading(true);
    const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const q = new URLSearchParams({ ...activeFilters, limit: 100, status: 'all' });
    
    fetch(`${API}/students?${q}`).then(r => r.json()).then(d => {
      if (d.success) {
        setStudents(d.students || []);
        setPendingChanges({});
      }
    }).finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { loadStudents(); }, [loadStudents]);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(''), 4000); return () => clearTimeout(t); } }, [success]);

  const filteredStages = formOpts.stages?.filter(s => !filters.sectionId || String(s.section_id) === filters.sectionId) || [];
  const filteredGrades = formOpts.grades?.filter(g => !filters.stageId || String(g.stage_id) === filters.stageId) || [];

  // Track local edits
  const handleLocalChange = (studentId, field, value) => {
    setPendingChanges(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [field]: value
      }
    }));
  };

  // Validate National ID (14 digits)
  const isNationalIdValid = (id) => {
    if (!id) return true; // Optional field initially
    return /^[23]\d{13}$/.test(id);
  };

  // Save changes for a single row
  const handleSaveRow = async (studentId) => {
    const changes = pendingChanges[studentId];
    if (!changes) return;

    // Validation for National ID
    if (changes.nationalId !== undefined && !isNationalIdValid(changes.nationalId)) {
      setError('الرقم القومي يجب أن يتكون من 14 رقماً ويبدأ بـ 2 أو 3.');
      return;
    }

    setSavingId(studentId);
    setError('');
    try {
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
          isMerged:               updatedData.is_merged === 1 || updatedData.isMerged === 1 || updatedData.isMerged === true,
          mergeType:              updatedData.merge_type || updatedData.mergeType,
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

      // If classroom or grade changed in tab 'grade'
      if (changes.classId || changes.gradeId) {
        const clsId = changes.classId ? parseInt(changes.classId) : updatedData.classroom_id;
        if (clsId) {
          await fetch(`${API}/settings/classrooms/bulk-enroll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              enrollments: [{ studentId, classId: clsId, academicYearId: parseInt(filters.academicYearId) }]
            })
          });
        }
      }

      setSuccess('✅ تم حفظ التعديلات بنجاح.');
      // Remove from pending
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
            <h1 className="page-title">تعديل البيانات الجزئي والتحكم السريع</h1>
            <p className="page-sub">شاشة سريعة لمراجعة وتحديث أرقام الطلاب القومية، حالات القيد، الدمج، والفصول مباشرة</p>
          </div>
        </div>
      </div>

      {error   && <div className="form-alert error"   style={{ marginBottom: 12 }}><AlertTriangle size={15} /> {error}</div>}
      {success && <div className="form-alert success" style={{ marginBottom: 12 }}><CheckCircle size={15} /> {success}</div>}

      {/* Filters */}
      <div className="filter-panel glass-panel" style={{ marginBottom: 16 }}>
        <div className="filter-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', gap: 10 }}>
          <select className="filter-select" value={filters.academicYearId}
            onChange={e => setFilters(f => ({ ...f, academicYearId: e.target.value }))}>
            <option value="">العام الدراسي</option>
            {formOpts.academicYears?.map(y => <option key={y.id} value={y.id}>{y.year_label}</option>)}
          </select>

          <select className="filter-select" value={filters.sectionId}
            onChange={e => setFilters(f => ({ ...f, sectionId: e.target.value, stageId: '', gradeId: '', classId: '' }))}
            disabled={activeSectionId && activeSectionId !== 'all'}>
            <option value="">القسم</option>
            {formOpts.sections?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <select className="filter-select" value={filters.stageId}
            onChange={e => setFilters(f => ({ ...f, stageId: e.target.value, gradeId: '', classId: '' }))}>
            <option value="">المرحلة</option>
            {filteredStages.map(s => <option key={s.id} value={s.id}>{s.stage_name}</option>)}
          </select>

          <select className="filter-select" value={filters.gradeId}
            onChange={e => setFilters(f => ({ ...f, gradeId: e.target.value, classId: '' }))}>
            <option value="">الصف</option>
            {filteredGrades.map(g => <option key={g.id} value={g.id}>{g.grade_name_ar}</option>)}
          </select>

          <select className="filter-select" value={filters.classId}
            onChange={e => setFilters(f => ({ ...f, classId: e.target.value }))}>
            <option value="">الفصل</option>
            {classrooms.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
          </select>

          <button className="filter-reset" onClick={() => loadStudents()} style={{ padding: '0 16px' }}>
            <RefreshCw size={14} /> تحديث
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="search-box" style={{ background: 'rgba(255,255,255,0.03)', maxWidth: '100%' }}>
            <Search size={14} className="search-icon" />
            <input className="search-input" placeholder="بحث باسم الطالب أو الكود لتعديله سريعاً..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="students-tabs" style={{ marginBottom: 14 }}>
        <button className={`tab-btn ${activeTab === 'nationalId' ? 'active' : ''}`} onClick={() => setActiveTab('nationalId')}>
          📇 الرقم القومي والمطابقة
        </button>
        <button className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`} onClick={() => setActiveTab('status')}>
          🏷️ حالة القيد والجنسية
        </button>
        <button className={`tab-btn ${activeTab === 'merge' ? 'active' : ''}`} onClick={() => setActiveTab('merge')}>
          ♿ الحالات الخاصة والدمج المستقل
        </button>
        <button className={`tab-btn ${activeTab === 'grade' ? 'active' : ''}`} onClick={() => setActiveTab('grade')}>
          🏫 الفصول ونوع الدراسة
        </button>
      </div>

      {/* Data Table */}
      <div className="table-container glass-panel">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 50 }}><Loader2 size={32} className="spin" /></div>
        ) : students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-secondary)' }}>لا توجد بيانات مطابقة للفلتر. اختر صفاً أو ابحث لعرض الطلاب.</div>
        ) : (
          <div className="table-scroll">
            <table className="students-table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>اسم الطالب</th>
                  <th style={{ width: '12%' }}>الكود</th>
                  
                  {/* Tab dynamic headers */}
                  {activeTab === 'nationalId' && (
                    <>
                      <th>الرقم القومي (14 رقم)</th>
                      <th>حالة الرقم</th>
                      <th>الجنس المستخلص</th>
                    </>
                  )}
                  {activeTab === 'status' && (
                    <>
                      <th>حالة القيد الحالية</th>
                      <th>الجنسية</th>
                      <th>الديانة</th>
                    </>
                  )}
                  {activeTab === 'merge' && (
                    <>
                      <th>هل الطالب دمج؟</th>
                      <th>نوع الدمج / الإعاقة</th>
                      <th>رقم قرار الدمج وتاريخه</th>
                    </>
                  )}
                  {activeTab === 'grade' && (
                    <>
                      <th>الفصل الدراسي الحالي</th>
                      <th>اللغة الثانية</th>
                      <th>شعبة الثانوية (اختياري)</th>
                    </>
                  )}

                  <th style={{ width: 90, textAlign: 'center' }}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => {
                  const pending = pendingChanges[s.id] || {};
                  const isSavedPending = Object.keys(pending).length > 0;
                  
                  // Extract info from National ID locally for helpers
                  const nationalIdVal = pending.nationalId !== undefined ? pending.nationalId : s.national_id;
                  const isValidId = isNationalIdValid(nationalIdVal);

                  return (
                    <tr key={s.id} className="table-row">
                      <td style={{ fontWeight: 600 }}>{s.full_name_ar}</td>
                      <td><code>{s.student_code || '—'}</code></td>

                      {/* 1. Tab: National ID */}
                      {activeTab === 'nationalId' && (
                        <>
                          <td>
                            <input type="text" className="form-control" style={{ fontSize: 12, padding: '4px 8px', direction: 'ltr', borderColor: !isValidId && nationalIdVal ? '#ef4444' : undefined }}
                              value={nationalIdVal || ''} maxLength={14}
                              onChange={e => handleLocalChange(s.id, 'nationalId', e.target.value)} />
                          </td>
                          <td>
                            {nationalIdVal ? (
                              isValidId ? (
                                <span style={{ color: '#10b981', fontWeight: 600 }}>✓ صالح</span>
                              ) : (
                                <span style={{ color: '#ef4444', fontWeight: 600 }}>⚠️ غير مكتمل</span>
                              )
                            ) : (
                              <span style={{ color: '#f59e0b' }}>⚠️ فارغ</span>
                            )}
                          </td>
                          <td>
                            {isValidId && nationalIdVal ? (
                              parseInt(nationalIdVal.charAt(12)) % 2 === 0 ? 'أنثى 👧' : 'ذكر 👦'
                            ) : '—'}
                          </td>
                        </>
                      )}

                      {/* 2. Tab: Status & Nationality */}
                      {activeTab === 'status' && (
                        <>
                          <td>
                            <select className="form-control" style={{ fontSize: 12, padding: '4px 8px' }}
                              value={pending.status !== undefined ? pending.status : (s.status || 'promoted')}
                              onChange={e => handleLocalChange(s.id, 'status', e.target.value)}>
                              <option value="promoted">منقول (نشط)</option>
                              <option value="retained">باقٍ للإعادة</option>
                              <option value="suspended">موقوف قيده</option>
                            </select>
                          </td>
                          <td>
                            <input type="text" className="form-control" style={{ fontSize: 12, padding: '4px 8px' }}
                              value={pending.nationality !== undefined ? pending.nationality : (s.nationality_name || 'مصري')}
                              onChange={e => handleLocalChange(s.id, 'nationality', e.target.value)} />
                          </td>
                          <td>
                            <select className="form-control" style={{ fontSize: 12, padding: '4px 8px' }}
                              value={pending.religion !== undefined ? pending.religion : (s.religion || 'مسلم')}
                              onChange={e => handleLocalChange(s.id, 'religion', e.target.value)}>
                              <option value="مسلم">مسلم</option>
                              <option value="مسيحي">مسيحي</option>
                              <option value="أخرى">أخرى</option>
                            </select>
                          </td>
                        </>
                      )}

                      {/* 3. Tab: Merge / Special Cases */}
                      {activeTab === 'merge' && (
                        <>
                          <td>
                            <label className="checkbox-label" style={{ justifyContent: 'center' }}>
                              <input type="checkbox"
                                checked={pending.isMerged !== undefined ? pending.isMerged : (s.is_merged === 1)}
                                onChange={e => handleLocalChange(s.id, 'isMerged', e.target.checked)} />
                              <span>دمج</span>
                            </label>
                          </td>
                          <td>
                            <input type="text" className="form-control" style={{ fontSize: 12, padding: '4px 8px' }}
                              placeholder="نوع الإعاقة..."
                              disabled={!(pending.isMerged !== undefined ? pending.isMerged : (s.is_merged === 1))}
                              value={pending.mergeType !== undefined ? pending.mergeType : (s.merge_type || '')}
                              onChange={e => handleLocalChange(s.id, 'mergeType', e.target.value)} />
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <input type="text" className="form-control" style={{ fontSize: 11, padding: '4px 6px' }}
                                placeholder="رقم القرار..."
                                disabled={!(pending.isMerged !== undefined ? pending.isMerged : (s.is_merged === 1))}
                                value={pending.mergeDecisionNumber !== undefined ? pending.mergeDecisionNumber : (s.merge_decision_number || '')}
                                onChange={e => handleLocalChange(s.id, 'mergeDecisionNumber', e.target.value)} />
                              
                              <input type="date" className="form-control" style={{ fontSize: 11, padding: '4px 4px' }}
                                disabled={!(pending.isMerged !== undefined ? pending.isMerged : (s.is_merged === 1))}
                                value={pending.mergeDecisionDate !== undefined ? pending.mergeDecisionDate : (s.merge_decision_date || '')}
                                onChange={e => handleLocalChange(s.id, 'mergeDecisionDate', e.target.value)} />
                            </div>
                          </td>
                        </>
                      )}

                      {/* 4. Tab: Classroom / Study Type */}
                      {activeTab === 'grade' && (
                        <>
                          <td>
                            <select className="form-control" style={{ fontSize: 12, padding: '4px 8px' }}
                              value={pending.classId !== undefined ? pending.classId : (s.classroom_id || '')}
                              onChange={e => handleLocalChange(s.id, 'classId', e.target.value)}>
                              <option value="">-- غير مسكن --</option>
                              {classrooms.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
                            </select>
                          </td>
                          <td>
                            <select className="form-control" style={{ fontSize: 12, padding: '4px 8px' }}
                              value={pending.secondLanguage !== undefined ? pending.secondLanguage : (s.second_language || '')}
                              onChange={e => handleLocalChange(s.id, 'secondLanguage', e.target.value)}>
                              <option value="">لا يوجد</option>
                              <option value="فرنسي">فرنسي</option>
                              <option value="ألماني">ألماني</option>
                              <option value="إيطالي">إيطالي</option>
                              <option value="إسباني">إسباني</option>
                            </select>
                          </td>
                          <td>
                            <select className="form-control" style={{ fontSize: 12, padding: '4px 8px' }}
                              value={pending.secondaryTrack !== undefined ? pending.secondaryTrack : (s.secondary_track || '')}
                              onChange={e => handleLocalChange(s.id, 'secondaryTrack', e.target.value)}>
                              <option value="">لا ينطبق</option>
                              <option value="science_bio">علمي علوم</option>
                              <option value="science_math">علمي رياضيات</option>
                              <option value="literary">أدبي</option>
                            </select>
                          </td>
                        </>
                      )}

                      <td style={{ textAlign: 'center' }}>
                        <button className="btn-save" style={{ padding: '6px 12px', fontSize: 11, background: isSavedPending ? 'linear-gradient(135deg, #10b981, #059669)' : '#f3f4f6', color: isSavedPending ? '#fff' : '#9ca3af', border: isSavedPending ? 'none' : '1px solid #d1d5db', pointerEvents: isSavedPending ? 'auto' : 'none' }}
                          onClick={() => handleSaveRow(s.id)} disabled={savingId === s.id}>
                          {savingId === s.id ? <Loader2 size={12} className="spin" /> : <Save size={12} />}
                          <span style={{ marginRight: 4 }}>حفظ</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
