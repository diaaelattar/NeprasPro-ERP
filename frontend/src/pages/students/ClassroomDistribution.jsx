import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Grid, Users, Search, RefreshCw, CheckCircle,
  AlertTriangle, Shuffle, UserCheck, X, Save, Plus, ArrowRight,
  BookOpen, Loader2, Filter, Info, Trash2, ArrowLeftRight
} from 'lucide-react';
import './students.css';

const API = `http://${window.location.hostname}:3001/api`;

export default function ClassroomDistribution({ onBack, activeSectionId }) {
  const [formOpts, setFormOpts] = useState({ sections: [], stages: [], grades: [], academicYears: [] });
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Top Filter
  const [filters, setFilters] = useState({
    sectionId: activeSectionId && activeSectionId !== 'all' ? String(activeSectionId) : '',
    stageId: '',
    gradeId: '',
    academicYearId: '',
  });

  // Selected classroom for detailed split-view
  const [selectedClass, setSelectedClass] = useState(null); // classroom object

  // Split-view local state
  const [assignedSearch, setAssignedSearch] = useState('');
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('all'); // 'all' | 'ذكر' | 'أنثى'
  
  // Pending changes state: { studentId: classroomId } (classroomId is 'unassigned' if removed)
  const [pendingChanges, setPendingChanges] = useState({});

  // Checkbox selections in split view
  const [selectedAssigned, setSelectedAssigned] = useState(new Set());
  const [selectedUnassigned, setSelectedUnassigned] = useState(new Set());

  // Load Form Options (academic years, stages, etc)
  useEffect(() => {
    fetch(`${API}/students/form-options`).then(r => r.json()).then(d => {
      if (d.success) setFormOpts(d);
      const cur = d.academicYears?.find(y => y.is_current === 1 || y.is_current === true);
      if (cur) setFilters(f => ({ ...f, academicYearId: String(cur.id) }));
    });
  }, []);

  // Load classrooms for the selected grade
  const loadClassrooms = useCallback(() => {
    if (filters.gradeId && filters.academicYearId) {
      fetch(`${API}/settings/classrooms?gradeId=${filters.gradeId}&academicYearId=${filters.academicYearId}`)
        .then(r => r.json()).then(d => setClassrooms(d.success ? d.classrooms : []));
    } else {
      setClassrooms([]);
    }
  }, [filters.gradeId, filters.academicYearId]);

  // Load ALL students for this grade and academic year
  const loadStudents = useCallback(() => {
    if (!filters.gradeId || !filters.academicYearId) {
      setStudents([]);
      return;
    }
    setLoading(true);
    const q = new URLSearchParams({
      gradeId: filters.gradeId,
      academicYearId: filters.academicYearId,
      status: 'all',
      limit: 1000 // Bypass pagination limit
    });
    fetch(`${API}/students?${q}`).then(r => r.json()).then(d => {
      if (d.success) {
        setStudents(d.students || []);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
    
    // Reset temporary states
    setPendingChanges({});
    setSelectedAssigned(new Set());
    setSelectedUnassigned(new Set());
  }, [filters.gradeId, filters.academicYearId]);

  useEffect(() => {
    loadClassrooms();
    loadStudents();
  }, [filters.gradeId, filters.academicYearId, loadClassrooms, loadStudents]);

  // Sync selected classroom object details when students reload
  useEffect(() => {
    if (selectedClass) {
      const updated = classrooms.find(c => c.id === selectedClass.id);
      if (updated) setSelectedClass(updated);
    }
  }, [classrooms, selectedClass]);

  const filteredStages = formOpts.stages?.filter(s => !filters.sectionId || String(s.section_id) === filters.sectionId) || [];
  const filteredGrades = formOpts.grades?.filter(g => !filters.stageId || String(g.stage_id) === filters.stageId) || [];

  // Helper: Get student's CURRENT classroom ID (taking pending changes into account)
  const getStudentClassId = (student) => {
    if (pendingChanges[student.id] !== undefined) {
      return pendingChanges[student.id]; // Can be 'unassigned' or classroomId
    }
    return student.classroom_id || 'unassigned';
  };

  // Helper: Calculate stats for classroom cards
  const getClassroomStats = (classId) => {
    const classStudents = students.filter(s => getStudentClassId(s) === classId);
    const males = classStudents.filter(s => s.gender === 'ذكر').length;
    const females = classStudents.filter(s => s.gender === 'أنثى').length;
    const merged = classStudents.filter(s => s.is_merged === 1).length;
    return { count: classStudents.length, males, females, merged };
  };

  // Get total unassigned count
  const getUnassignedCount = () => {
    return students.filter(s => getStudentClassId(s) === 'unassigned').length;
  };

  // Handle assigning selected unassigned students to the active classroom
  const assignToClass = () => {
    if (selectedUnassigned.size === 0 || !selectedClass) return;
    const next = { ...pendingChanges };
    selectedUnassigned.forEach(sid => {
      next[sid] = selectedClass.id;
    });
    setPendingChanges(next);
    setSelectedUnassigned(new Set());
  };

  // Handle removing selected assigned students from the active classroom
  const unassignFromClass = () => {
    if (selectedAssigned.size === 0) return;
    const next = { ...pendingChanges };
    selectedAssigned.forEach(sid => {
      next[sid] = 'unassigned';
    });
    setPendingChanges(next);
    setSelectedAssigned(new Set());
  };

  // Intelligent Automatic Distribution for ALL remaining unassigned students
  const handleAutoDistribute = () => {
    if (classrooms.length === 0) {
      setError('يجب إنشاء فصول دراسية لهذا الصف أولاً.');
      return;
    }
    
    // Students currently unassigned
    const unassigned = students.filter(s => getStudentClassId(s) === 'unassigned');
    if (unassigned.length === 0) {
      setError('لا يوجد طلاب غير موزعين لتوزيعهم تلقائياً.');
      return;
    }

    const merged = unassigned.filter(s => s.is_merged === 1);
    const males = unassigned.filter(s => s.is_merged !== 1 && s.gender === 'ذكر');
    const females = unassigned.filter(s => s.is_merged !== 1 && s.gender === 'أنثى');

    const next = { ...pendingChanges };

    const distributeList = (list) => {
      list.forEach(student => {
        // Find classroom with the lowest total enrolled count (taking current next changes into account)
        let bestClass = classrooms[0];
        let minEnrolled = students.filter(s => {
          const cid = next[s.id] !== undefined ? next[s.id] : s.classroom_id;
          return cid === bestClass.id;
        }).length;

        classrooms.forEach(c => {
          const count = students.filter(s => {
            const cid = next[s.id] !== undefined ? next[s.id] : s.classroom_id;
            return cid === c.id;
          }).length;
          if (count < minEnrolled) {
            minEnrolled = count;
            bestClass = c;
          }
        });

        next[student.id] = bestClass.id;
      });
    };

    distributeList(merged);
    distributeList(males);
    distributeList(females);

    setPendingChanges(next);
    setSuccess('✅ تم التوزيع التلقائي العادل للمتبقي بنجاح. راجع التعديلات ثم انقر حفظ.');
  };

  // Save changes to Database
  const saveChanges = async () => {
    const entries = Object.entries(pendingChanges);
    if (entries.length === 0) {
      setError('لا توجد أي تعديلات معلقة لحفظها.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = entries.map(([studentId, classId]) => ({
        studentId: parseInt(studentId),
        classId: classId === 'unassigned' ? null : parseInt(classId),
        academicYearId: parseInt(filters.academicYearId),
      }));

      const res = await fetch(`${API}/settings/classrooms/bulk-enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollments: payload })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(`✅ تم حفظ التوزيع وإجراء التغييرات لـ ${data.enrolled} طالب بنجاح!`);
      setPendingChanges({});
      setSelectedAssigned(new Set());
      setSelectedUnassigned(new Set());
      
      // Reload lists
      loadClassrooms();
      loadStudents();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Checkbox helpers
  const toggleSelectAssigned = (sid) => {
    const next = new Set(selectedAssigned);
    if (next.has(sid)) next.delete(sid);
    else next.add(sid);
    setSelectedAssigned(next);
  };

  const toggleSelectUnassigned = (sid) => {
    const next = new Set(selectedUnassigned);
    if (next.has(sid)) next.delete(sid);
    else next.add(sid);
    setSelectedUnassigned(next);
  };

  const selectAllAssigned = (list) => {
    if (selectedAssigned.size === list.length) {
      setSelectedAssigned(new Set());
    } else {
      setSelectedAssigned(new Set(list.map(s => s.id)));
    }
  };

  const selectAllUnassigned = (list) => {
    if (selectedUnassigned.size === list.length) {
      setSelectedUnassigned(new Set());
    } else {
      setSelectedUnassigned(new Set(list.map(s => s.id)));
    }
  };

  // Lists in Split-View
  const currentClassStudents = students.filter(s => getStudentClassId(s) === selectedClass?.id)
    .filter(s => !assignedSearch || s.full_name_ar?.includes(assignedSearch) || s.student_code?.includes(assignedSearch));

  const unassignedStudents = students.filter(s => getStudentClassId(s) === 'unassigned')
    .filter(s => !unassignedSearch || s.full_name_ar?.includes(unassignedSearch) || s.student_code?.includes(unassignedSearch))
    .filter(s => genderFilter === 'all' || s.gender === genderFilter);

  const pendingCount = Object.keys(pendingChanges).length;

  return (
    <div className="students-module">
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-title-area">
          <button className="import-back-btn" onClick={selectedClass ? () => setSelectedClass(null) : onBack}>
            <ArrowLeft size={16} /> {selectedClass ? 'العودة لقائمة الفصول' : 'العودة للطلاب'}
          </button>
          <div className="page-icon" style={{ background: 'var(--primary)' }}>
            <Grid size={22} />
          </div>
          <div>
            <h1 className="page-title">
              {selectedClass ? `إدارة طلاب فصل: ${selectedClass.class_name}` : 'توزيع الطلاب على الفصول'}
            </h1>
            <p className="page-sub">
              {selectedClass 
                ? `إضافة ونقل الطلاب مباشرة من وإلى فصل ${selectedClass.class_name}`
                : 'توزيع وتسكين الطلاب داخل الفصول الدراسية وتعديلها بسهولة'}
            </p>
          </div>
        </div>
        <div className="page-header-actions">
          {pendingCount > 0 && (
            <button className="btn-add-student" onClick={saveChanges} disabled={saving} style={{ background: 'var(--success)' }}>
              {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              حفظ {pendingCount} تعديل معلق
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && <div className="form-alert error" style={{ marginBottom: 12 }}><AlertTriangle size={15} /> {error}</div>}
      {success && <div className="form-alert success" style={{ marginBottom: 12 }}><CheckCircle size={15} /> {success}</div>}

      {/* ── Mode 1: Classroom Cards Selection ───────────────────── */}
      {!selectedClass && (
        <>
          {/* Filter Panel */}
          <div className="filter-panel glass-panel" style={{ marginBottom: 20 }}>
            <div className="filter-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: 10 }}>
              <select className="filter-select" value={filters.academicYearId}
                onChange={e => setFilters(f => ({ ...f, academicYearId: e.target.value }))}>
                <option value="">العام الدراسي</option>
                {formOpts.academicYears?.map(y => <option key={y.id} value={y.id}>{y.year_label}</option>)}
              </select>

              <select className="filter-select" value={filters.sectionId}
                onChange={e => setFilters(f => ({ ...f, sectionId: e.target.value, stageId: '', gradeId: '' }))}
                disabled={activeSectionId && activeSectionId !== 'all'}>
                <option value="">القسم</option>
                {formOpts.sections?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <select className="filter-select" value={filters.stageId}
                onChange={e => setFilters(f => ({ ...f, stageId: e.target.value, gradeId: '' }))}>
                <option value="">المرحلة</option>
                {filteredStages.map(s => <option key={s.id} value={s.id}>{s.stage_name}</option>)}
              </select>

              <select className="filter-select" value={filters.gradeId}
                onChange={e => setFilters(f => ({ ...f, gradeId: e.target.value }))}>
                <option value="">الصف الدراسي</option>
                {filteredGrades.map(g => <option key={g.id} value={g.id}>{g.grade_name_ar}</option>)}
              </select>

              <button className="filter-reset" onClick={loadStudents} style={{ padding: '0 16px' }}>
                <RefreshCw size={14} /> تحديث
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><Loader2 size={32} className="spin" /></div>
          ) : !filters.gradeId ? (
            <div className="glass-panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Info size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
              <h3>يرجى اختيار القسم والمرحلة والصف الدراسي أولاً لعرض الفصول.</h3>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Intelligent Auto Distribute Bar */}
              <div className="glass-panel" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff6ff', borderColor: '#bfdbfe' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>🧠</span>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', margin: 0 }}>التوزيع التلقائي الذكي</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      يوجد <strong style={{ color: 'var(--text-primary)' }}>{getUnassignedCount()} طالب</strong> غير مسكنين في فصول. يمكنك توزيعهم بالتساوي بنقرة واحدة.
                    </p>
                  </div>
                </div>
                <button className="btn-primary" onClick={handleAutoDistribute} disabled={getUnassignedCount() === 0}>
                  <Shuffle size={16} /> بدء التوزيع الذكي
                </button>
              </div>

              {/* Classrooms Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {classrooms.map(c => {
                  const stat = getClassroomStats(c.id);
                  const percent = c.capacity ? Math.min(100, Math.round((stat.count / c.capacity) * 100)) : 0;
                  
                  return (
                    <div key={c.id} className="glass-panel stat-card" style={{ display: 'flex', flexDirection: 'column', padding: 20, borderTopWidth: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{c.class_name}</h3>
                        <span style={{ fontSize: 11, background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 12, color: 'var(--text-secondary)' }}>
                          السعة: {c.capacity || '—'}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span>الطلاب المسجلين:</span>
                          <strong>{stat.count} طالب ({percent}%)</strong>
                        </div>
                        <div style={{ width: '100%', height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', background: percent >= 100 ? 'var(--danger)' : 'var(--primary)', borderRadius: 3 }} />
                        </div>
                      </div>

                      {/* Counts */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '10px 0', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)', marginBottom: 14, textAlign: 'center', fontSize: 12 }}>
                        <div><div style={{ fontWeight: 700, color: '#2563eb' }}>{stat.males}</div><div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>👦 ذكور</div></div>
                        <div><div style={{ fontWeight: 700, color: '#db2777' }}>{stat.females}</div><div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>👧 إناث</div></div>
                        <div><div style={{ fontWeight: 700, color: '#059669' }}>{stat.merged}</div><div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>⭐ دمج</div></div>
                      </div>

                      <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: 8 }}
                        onClick={() => {
                          setSelectedClass(c);
                          setAssignedSearch('');
                          setUnassignedSearch('');
                          setGenderFilter('all');
                        }}>
                        <UserCheck size={15} /> إدارة طلاب الفصل
                      </button>
                    </div>
                  );
                })}

                {classrooms.length === 0 && (
                  <div style={{ gridColumn: 'span 3', padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                    لم يتم العثور على فصول دراسية لهذا الصف. يرجى تهيئة الفصول من قائمة الإعدادات.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Mode 2: Classroom Split-View Management ─────────────── */}
      {selectedClass && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 10 }}>
          
          {/* RIGHT COLUMN: Assigned Students */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: 600 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff6ff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>🏫</span>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
                  الطلاب المقيدون بالفصل ({currentClassStudents.length})
                </h3>
              </div>
              
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11, borderColor: '#fca5a5', color: '#ef4444' }}
                disabled={selectedAssigned.size === 0} onClick={unassignFromClass}>
                <Trash2 size={13} /> إزالة المحددين ({selectedAssigned.size})
              </button>
            </div>

            {/* Local Search inside Assigned */}
            <div style={{ padding: 10, borderBottom: '1px solid var(--border-light)' }}>
              <div className="search-box">
                <Search size={14} className="search-icon" />
                <input className="search-input" style={{ padding: '6px 36px 6px 12px' }} placeholder="بحث باسم الطالب..." value={assignedSearch} onChange={e => setAssignedSearch(e.target.value)} />
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
              <table className="students-table" style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ width: 40, padding: 8 }}>
                      <input type="checkbox" checked={currentClassStudents.length > 0 && selectedAssigned.size === currentClassStudents.length}
                        onChange={() => selectAllAssigned(currentClassStudents)} />
                    </th>
                    <th style={{ padding: 8 }}>الاسم</th>
                    <th style={{ width: 80, padding: 8 }}>النوع</th>
                    <th style={{ width: 60, padding: 8 }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {currentClassStudents.map(s => (
                    <tr key={s.id} className="table-row">
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        <input type="checkbox" checked={selectedAssigned.has(s.id)} onChange={() => toggleSelectAssigned(s.id)} />
                      </td>
                      <td style={{ padding: 8, fontWeight: 600 }}>{s.full_name_ar}</td>
                      <td style={{ padding: 8 }}>{s.gender === 'ذكر' ? '👦 ذكر' : '👧 أنثى'}</td>
                      <td style={{ padding: 8 }}>
                        {s.is_merged === 1 && <span style={{ background: '#fee2e2', color: '#ef4444', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>دمج</span>}
                      </td>
                    </tr>
                  ))}
                  {currentClassStudents.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                        لا يوجد طلاب مقيدون في هذا الفصل.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* LEFT COLUMN: Unassigned Students */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: 600 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>📚</span>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  طلاب الصف غير الموزعين ({unassignedStudents.length})
                </h3>
              </div>
              
              <button className="btn-primary" style={{ padding: '5px 12px', fontSize: 11 }}
                disabled={selectedUnassigned.size === 0} onClick={assignToClass}>
                إضافة للفصل ← ({selectedUnassigned.size})
              </button>
            </div>

            {/* Local Search and Gender filter */}
            <div style={{ padding: 10, borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className="search-box" style={{ flex: 1 }}>
                <Search size={14} className="search-icon" />
                <input className="search-input" style={{ padding: '6px 36px 6px 12px' }} placeholder="بحث بالاسم..." value={unassignedSearch} onChange={e => setUnassignedSearch(e.target.value)} />
              </div>
              
              <select className="filter-select" style={{ minWidth: 100, padding: '5px 8px !important', fontSize: 12 }} value={genderFilter} onChange={e => setGenderFilter(e.target.value)}>
                <option value="all">الكل</option>
                <option value="ذكر">👦 ذكور</option>
                <option value="أنثى">👧 إناث</option>
              </select>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
              <table className="students-table" style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ width: 40, padding: 8 }}>
                      <input type="checkbox" checked={unassignedStudents.length > 0 && selectedUnassigned.size === unassignedStudents.length}
                        onChange={() => selectAllUnassigned(unassignedStudents)} />
                    </th>
                    <th style={{ padding: 8 }}>الاسم</th>
                    <th style={{ width: 80, padding: 8 }}>النوع</th>
                    <th style={{ width: 60, padding: 8 }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {unassignedStudents.map(s => (
                    <tr key={s.id} className="table-row">
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        <input type="checkbox" checked={selectedUnassigned.has(s.id)} onChange={() => toggleSelectUnassigned(s.id)} />
                      </td>
                      <td style={{ padding: 8, fontWeight: 600 }}>{s.full_name_ar}</td>
                      <td style={{ padding: 8 }}>{s.gender === 'ذكر' ? '👦 ذكر' : '👧 أنثى'}</td>
                      <td style={{ padding: 8 }}>
                        {s.is_merged === 1 && <span style={{ background: '#fee2e2', color: '#ef4444', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>دمج</span>}
                      </td>
                    </tr>
                  ))}
                  {unassignedStudents.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                        لا يوجد طلاب غير موزعين.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
