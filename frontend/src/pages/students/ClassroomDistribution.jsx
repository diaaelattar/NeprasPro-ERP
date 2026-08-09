import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Grid, Users, Search, RefreshCw, CheckCircle,
  AlertTriangle, Shuffle, UserCheck, X, Save, Plus, ArrowRight,
  BookOpen, Loader2, Filter, Info, Trash2, ArrowLeftRight, MoveRight, CheckSquare, Square
} from 'lucide-react';
import './students.css';
import API_BASE_URL from '../../config/api';

const API = API_BASE_URL;

export default function ClassroomDistribution({ onBack, activeSectionId }) {
  const [formOpts, setFormOpts] = useState({ sections: [], stages: [], grades: [], academicYears: [] });
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Mode Selection: 'auto' | 'drag' | 'checkbox'
  const [distributionMode, setDistributionMode] = useState('auto');

  // Top Filter
  const [filters, setFilters] = useState({
    sectionId: activeSectionId && activeSectionId !== 'all' ? String(activeSectionId) : '',
    stageId: '',
    gradeId: '',
    academicYearId: '',
  });

  // Selected classroom for inspector view in checkbox/legacy mode
  const [selectedClass, setSelectedClass] = useState(null);
  const [inspectorClassId, setInspectorClassId] = useState('');

  // Target Class selectors
  const [targetClassId, setTargetClassId] = useState('');
  const [transferTargetClassId, setTransferTargetClassId] = useState('');

  // Local Search & Gender Filters
  const [assignedSearch, setAssignedSearch] = useState('');
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('all'); // 'all' | 'ذكر' | 'أنثى'
  
  // Pending changes state: { studentId: classroomId } (classroomId is 'unassigned' if removed)
  const [pendingChanges, setPendingChanges] = useState({});

  // Checkbox selections
  const [selectedAssigned, setSelectedAssigned] = useState(new Set());
  const [selectedUnassigned, setSelectedUnassigned] = useState(new Set());

  // Sort order for student lists: 'asc' | 'desc'
  const [unassignedSortOrder, setUnassignedSortOrder] = useState('asc');
  const [assignedSortOrder, setAssignedSortOrder] = useState('asc');

  // Drag and Drop Dragged Over State
  const [dragOverClassId, setDragOverClassId] = useState(null);

  // Auto-Distribution Options (حسب اختيار الموزع)
  const [distOptions, setDistOptions] = useState({
    genderMode: 'mixed',       // 'mixed' | 'separate'
    religionMode: 'mixed',     // 'mixed' | 'proportional'
    redistMode: 'unassigned',  // 'unassigned' | 'all'
  });

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
        .then(r => r.json()).then(d => {
          const list = d.success ? d.classrooms : [];
          setClassrooms(list);
          if (list.length > 0 && !inspectorClassId) {
            setInspectorClassId(String(list[0].id));
          }
        });
    } else {
      setClassrooms([]);
      setInspectorClassId('');
    }
  }, [filters.gradeId, filters.academicYearId, inspectorClassId]);

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
      limit: 2000 // High limit for performance
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

  // Checkbox Selection Helpers
  const toggleSelectUnassigned = (sid) => {
    const next = new Set(selectedUnassigned);
    if (next.has(sid)) next.delete(sid);
    else next.add(sid);
    setSelectedUnassigned(next);
  };

  const toggleSelectAssigned = (sid) => {
    const next = new Set(selectedAssigned);
    if (next.has(sid)) next.delete(sid);
    else next.add(sid);
    setSelectedAssigned(next);
  };

  const selectAllUnassignedFiltered = (filteredList) => {
    if (selectedUnassigned.size === filteredList.length && filteredList.length > 0) {
      setSelectedUnassigned(new Set());
    } else {
      setSelectedUnassigned(new Set(filteredList.map(s => s.id)));
    }
  };

  const selectAllAssignedFiltered = (filteredList) => {
    if (selectedAssigned.size === filteredList.length && filteredList.length > 0) {
      setSelectedAssigned(new Set());
    } else {
      setSelectedAssigned(new Set(filteredList.map(s => s.id)));
    }
  };

  // Handle assigning selected unassigned students to target classroom
  const assignSelectedToClass = (clsId) => {
    if (selectedUnassigned.size === 0 || !clsId) return;
    const targetClassroom = classrooms.find(c => String(c.id) === String(clsId));
    if (!targetClassroom) return;

    const stats = getClassroomStats(targetClassroom.id);
    const maxCapacity = Math.min(49, targetClassroom.capacity || 49);
    
    if (stats.count + selectedUnassigned.size > maxCapacity) {
      setError(`لا يمكن الإضافة لفصل "${targetClassroom.class_name}": سيتجاوز السعة القصوى (${maxCapacity} طالباً). السعة المتبقية المتاحة: ${Math.max(0, maxCapacity - stats.count)} طالباً.`);
      return;
    }

    const next = { ...pendingChanges };
    selectedUnassigned.forEach(sid => {
      next[sid] = targetClassroom.id;
    });
    setPendingChanges(next);
    setSelectedUnassigned(new Set());
    setError('');
    setSuccess(`✅ تم نقل/تسكين ${selectedUnassigned.size} طالب إلى فصل ${targetClassroom.class_name} بنجاح. انقر "حفظ التعديلات".`);
  };

  // Handle transfer/re-assign enrolled students from one class to another
  const transferSelectedAssignedToClass = (destClassId) => {
    if (selectedAssigned.size === 0 || !destClassId) return;
    const destClassroom = classrooms.find(c => String(c.id) === String(destClassId));
    if (!destClassroom) return;

    const stats = getClassroomStats(destClassroom.id);
    const maxCapacity = Math.min(49, destClassroom.capacity || 49);

    if (stats.count + selectedAssigned.size > maxCapacity) {
      setError(`لا يمكن النقل لفصل "${destClassroom.class_name}": سيتجاوز السعة القصوى (${maxCapacity} طالباً). السعة المتبقية المتاحة: ${Math.max(0, maxCapacity - stats.count)} طالباً.`);
      return;
    }

    const next = { ...pendingChanges };
    selectedAssigned.forEach(sid => {
      next[sid] = destClassroom.id;
    });
    setPendingChanges(next);
    setSelectedAssigned(new Set());
    setError('');
    setSuccess(`✅ تم إعادة تسكين/نقل ${selectedAssigned.size} طالب إلى فصل ${destClassroom.class_name} بنجاح. انقر "حفظ التعديلات".`);
  };

  // Handle removing selected assigned students back to unassigned pool
  const unassignSelectedAssigned = () => {
    if (selectedAssigned.size === 0) return;
    const next = { ...pendingChanges };
    selectedAssigned.forEach(sid => {
      next[sid] = 'unassigned';
    });
    setPendingChanges(next);
    setSelectedAssigned(new Set());
    setSuccess(`تم فك تسكين ${selectedAssigned.size} طالب وإعادتهم لغير المسكنين بنجاح.`);
  };

  // ── Drag & Drop Handlers ─────────────────────────────────────────
  const handleDragStart = (e, student) => {
    let idsToDrag = [];
    if (selectedUnassigned.has(student.id)) {
      idsToDrag = Array.from(selectedUnassigned);
    } else {
      idsToDrag = [student.id];
    }
    e.dataTransfer.setData('text/plain', JSON.stringify(idsToDrag));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, classroom) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverClassId !== classroom.id) {
      setDragOverClassId(classroom.id);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOverClassId(null);
  };

  const handleDropOnClassroom = (e, targetClassroom) => {
    e.preventDefault();
    setDragOverClassId(null);
    try {
      const data = e.dataTransfer.getData('text/plain');
      if (!data) return;
      const idsToMove = JSON.parse(data);
      if (!Array.isArray(idsToMove) || idsToMove.length === 0) return;

      const stats = getClassroomStats(targetClassroom.id);
      const maxCapacity = Math.min(49, targetClassroom.capacity || 49);

      if (stats.count + idsToMove.length > maxCapacity) {
        setError(`⚠️ لا يمكن الإسقاط في فصل "${targetClassroom.class_name}": سيتجاوز السعة القصوى (${maxCapacity} طالباً). السعة المتبقية: ${Math.max(0, maxCapacity - stats.count)} طالباً.`);
        return;
      }

      const next = { ...pendingChanges };
      idsToMove.forEach(sid => {
        next[sid] = targetClassroom.id;
      });
      setPendingChanges(next);
      setSelectedUnassigned(new Set());
      setError('');
      setSuccess(`✅ تم تسكين ${idsToMove.length} طالب في فصل ${targetClassroom.class_name} بالسحب والإفلات. انقر "حفظ".`);
    } catch (err) {
      console.error(err);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // SMART AUTO-DISTRIBUTION ENGINE
  // Options: genderMode, religionMode, redistMode
  // ══════════════════════════════════════════════════════════════════
  const handleAutoDistribute = () => {
    if (classrooms.length === 0) {
      setError('يجب إنشاء فصول دراسية لهذا الصف أولاً.');
      return;
    }

    // ── 1. تحديد قائمة الطلاب للتوزيع ─────────────────────────────
    const next = { ...pendingChanges };

    // إذا أُختير إعادة التوزيع الكامل: فك تسكين الجميع أولاً
    if (distOptions.redistMode === 'all') {
      students.forEach(s => { next[s.id] = 'unassigned'; });
    }

    const targetStudents = students.filter(s => {
      const cid = next[s.id] !== undefined ? next[s.id] : (s.classroom_id || 'unassigned');
      return cid === 'unassigned';
    });

    if (targetStudents.length === 0) {
      setError('لا يوجد طلاب غير مسكنين للتوزيع.');
      return;
    }

    // ── 2. فحص السعة الإجمالية ─────────────────────────────────────
    const totalCapacity = classrooms.reduce((sum, c) => sum + Math.min(49, c.capacity || 49), 0);
    const totalCurrentAssigned = students.filter(s => {
      const cid = next[s.id] !== undefined ? next[s.id] : (s.classroom_id || 'unassigned');
      return cid !== 'unassigned';
    }).length;
    const availableSeats = totalCapacity - totalCurrentAssigned;

    if (targetStudents.length > availableSeats) {
      const needed = Math.ceil((targetStudents.length - availableSeats) / 49);
      setError(
        `⚠️ السعة غير كافية! عدد الطلاب (${targetStudents.length}) يتجاوز المقاعد المتاحة (${availableSeats}).` +
        ` يُنصح بإضافة ${needed} فصل جديد على الأقل ثم إعادة المحاولة.`
      );
      return;
    }

    // ── 3. بناء عداد محلي + تتبع جنس كل فصل ──────────────────────
    const countMap    = {};  // { classId: totalCount }
    const maleMap     = {};  // { classId: maleCount }
    const femaleMap   = {};  // { classId: femaleCount }
    const muslimMap   = {};  // { classId: muslimCount }
    const christianMap= {};  // { classId: christianCount }

    classrooms.forEach(c => {
      countMap[c.id]     = 0;
      maleMap[c.id]      = 0;
      femaleMap[c.id]    = 0;
      muslimMap[c.id]    = 0;
      christianMap[c.id] = 0;
    });

    students.forEach(s => {
      const cid = next[s.id] !== undefined ? next[s.id] : (s.classroom_id || 'unassigned');
      if (cid !== 'unassigned' && countMap[cid] !== undefined) {
        countMap[cid]++;
        if (s.gender === 'ذكر')    maleMap[cid]++;
        if (s.gender === 'أنثى')   femaleMap[cid]++;
        if (s.religion === 'مسلم') muslimMap[cid]++;
        if (s.religion === 'مسيحي') christianMap[cid]++;
      }
    });

    // ── 4. نسبة المسيحيين (للتوزيع النسبي الديني) ────────────────
    const totalChristians = targetStudents.filter(s => s.religion === 'مسيحي').length;
    const christianRatio  = targetStudents.length > 0 ? totalChristians / targetStudents.length : 0;

    // ── 5. اختيار أفضل فصل لطالب معين ────────────────────────────
    const getBestClass = (student, allowedClassIds = null) => {
      let bestClass = null;
      let minCount  = Infinity;
      const pool = allowedClassIds
        ? classrooms.filter(c => allowedClassIds.includes(c.id))
        : classrooms;

      pool.forEach(c => {
        const maxCap = Math.min(49, c.capacity || 49);
        const count  = countMap[c.id] ?? 0;
        if (count >= maxCap) return; // مكتمل

        // قاعدة فصل الجنسين
        if (distOptions.genderMode === 'separate') {
          const hasMales   = maleMap[c.id]   > 0;
          const hasFemales = femaleMap[c.id] > 0;
          if (student.gender === 'ذكر'  && hasFemales) return;
          if (student.gender === 'أنثى' && hasMales)   return;
        }

        // قاعدة التوازن الديني (نسبي)
        if (distOptions.religionMode === 'proportional' && student.religion === 'مسيحي') {
          const classChristianRatio = count > 0 ? christianMap[c.id] / count : 0;
          // لا تُضف مسيحياً لفصل نسبته أعلى من المتوسط بنسبة 50%
          if (classChristianRatio > christianRatio * 1.5 && christianRatio > 0) return;
        }

        if (count < minCount) {
          minCount  = count;
          bestClass = c;
        }
      });

      // fallback: لو لا يوجد فصل مناسب بالشروط، خذ أي فصل متاح
      if (!bestClass) {
        pool.forEach(c => {
          const maxCap = Math.min(49, c.capacity || 49);
          const count  = countMap[c.id] ?? 0;
          if (count < maxCap && count < minCount) {
            minCount  = count;
            bestClass = c;
          }
        });
      }
      return bestClass;
    };

    // ── 6. دالة التسكين مع تحديث فوري للعدادات ──────────────────
    const assign = (student, classroom) => {
      next[student.id] = classroom.id;
      countMap[classroom.id]++;
      if (student.gender === 'ذكر')     maleMap[classroom.id]++;
      if (student.gender === 'أنثى')    femaleMap[classroom.id]++;
      if (student.religion === 'مسلم')  muslimMap[classroom.id]++;
      if (student.religion === 'مسيحي') christianMap[classroom.id]++;
    };

    // ── 7. تسكين طلاب الدمج (إخوة/توأم) في نفس الفصل ──────────
    const mergedStudents  = targetStudents.filter(s => s.is_merged === 1);
    const regularStudents = targetStudents.filter(s => s.is_merged !== 1);

    // جمّع الإخوة/التوأم في مجموعات حسب twin_student_id أو sibling_student_ids
    const siblingGroups = {};
    mergedStudents.forEach(s => {
      const key = s.twin_student_id
        ? `twin_${Math.min(s.id, s.twin_student_id)}_${Math.max(s.id, s.twin_student_id)}`
        : `single_${s.id}`;
      if (!siblingGroups[key]) siblingGroups[key] = [];
      siblingGroups[key].push(s);
    });

    // كل مجموعة → فصل واحد
    Object.values(siblingGroups).forEach(group => {
      const cls = getBestClass(group[0]);
      if (cls) group.forEach(s => assign(s, cls));
    });

    // ── 8. توزيع باقي الطلاب ─────────────────────────────────────
    // ترتيب: مسيحيون أولاً (لضمان التوزيع النسبي)، ثم مسلمون
    const christians = regularStudents.filter(s => s.religion === 'مسيحي');
    const others     = regularStudents.filter(s => s.religion !== 'مسيحي');

    [...christians, ...others].forEach(student => {
      const cls = getBestClass(student);
      if (cls) assign(student, cls);
    });

    // ── 9. حساب النتائج وإظهار الملخص ────────────────────────────
    const assigned = targetStudents.filter(s => next[s.id] && next[s.id] !== 'unassigned').length;
    const skipped  = targetStudents.length - assigned;

    setPendingChanges(next);
    setError('');
    setSuccess(
      `✅ تم توزيع ${assigned} طالب على ${classrooms.length} فصل` +
      (skipped > 0 ? ` (${skipped} طالب لم يُسكَّن لامتلاء الفصول)` : '') +
      '. انقر "حفظ التعديلات" للتأكيد.'
    );
  };



  // Save changes to Database
  const saveChanges = async () => {
    const entries = Object.entries(pendingChanges);
    if (entries.length === 0) {
      setError('لا توجد أي تعديلات معلقة لحفظها.');
      return;
    }

    setSaving(true);
    setError(''); setSuccess('');

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
      if (!res.ok) throw new Error(data.error || 'فشل حفظ التوزيع.');

      setSuccess(`✅ تم حفظ التوزيع وإجراء التعديلات لـ ${data.enrolled} طالب بنجاح!`);
      setPendingChanges({});
      setSelectedAssigned(new Set());
      setSelectedUnassigned(new Set());
      
      loadClassrooms();
      loadStudents();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Sort helper
  const sortStudents = (list, order) => {
    return [...list].sort((a, b) => {
      const nameA = a.full_name_ar || '';
      const nameB = b.full_name_ar || '';
      const cmp = nameA.localeCompare(nameB, 'ar');
      return order === 'asc' ? cmp : -cmp;
    });
  };

  // Lists in Split-View / Filters
  const unassignedStudents = sortStudents(
    students
      .filter(s => getStudentClassId(s) === 'unassigned')
      .filter(s => !unassignedSearch || s.full_name_ar?.includes(unassignedSearch) || s.student_code?.includes(unassignedSearch))
      .filter(s => genderFilter === 'all' || s.gender === genderFilter),
    unassignedSortOrder
  );

  const activeInspectorClass = classrooms.find(c => String(c.id) === String(inspectorClassId));
  const inspectorStudents = sortStudents(
    students
      .filter(s => getStudentClassId(s) === (activeInspectorClass ? activeInspectorClass.id : -1))
      .filter(s => !assignedSearch || s.full_name_ar?.includes(assignedSearch) || s.student_code?.includes(assignedSearch)),
    assignedSortOrder
  );

  const pendingCount = Object.keys(pendingChanges).length;

  return (
    <div className="students-module">
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-title-area">
          <button className="import-back-btn" onClick={onBack}>
            <ArrowLeft size={16} /> العودة للطلاب
          </button>
          <div className="page-icon" style={{ background: 'var(--primary)' }}>
            <Grid size={22} />
          </div>
          <div>
            <h1 className="page-title">توزيع الطلاب على الفصول الدراسية</h1>
            <p className="page-sub">إدارة وتسكين الطلاب بالفصول بسهولة عبر 3 أنماط تفاعلية فائقة السرعة</p>
          </div>
        </div>
        <div className="page-header-actions">
          {pendingCount > 0 && (
            <button className="btn-add-student" onClick={saveChanges} disabled={saving} style={{ background: '#10b981', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
              {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              حفظ {pendingCount} تعديل معلق
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && <div className="form-alert error" style={{ marginBottom: 12 }}><AlertTriangle size={15} /> {error}</div>}
      {success && <div className="form-alert success" style={{ marginBottom: 12 }}><CheckCircle size={15} /> {success}</div>}

      {/* ── Filter Panel ────────────────────────────────────────── */}
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
          <h3>يرجى اختيار القسم والمرحلة والصف الدراسي أولاً لعرض الفصول وتسكين الطلاب.</h3>
        </div>
      ) : (
        <div>
          {/* ── 3 Distribution Navigation Tabs ───────────────────── */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <button
              onClick={() => setDistributionMode('auto')}
              style={{
                padding: '10px 20px', borderRadius: 10, fontWeight: 800, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                background: distributionMode === 'auto' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--glass-bg)',
                color: distributionMode === 'auto' ? '#fff' : 'var(--text-primary)',
                border: distributionMode === 'auto' ? 'none' : '1px solid var(--border-color)',
                boxShadow: distributionMode === 'auto' ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                transition: 'all 0.2s'
              }}>
              <Shuffle size={16} /> 🔀 1. التوزيع الآلي التوازني
            </button>

            <button
              onClick={() => setDistributionMode('drag')}
              style={{
                padding: '10px 20px', borderRadius: 10, fontWeight: 800, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                background: distributionMode === 'drag' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'var(--glass-bg)',
                color: distributionMode === 'drag' ? '#fff' : 'var(--text-primary)',
                border: distributionMode === 'drag' ? 'none' : '1px solid var(--border-color)',
                boxShadow: distributionMode === 'drag' ? '0 4px 12px rgba(59,130,246,0.3)' : 'none',
                transition: 'all 0.2s'
              }}>
              <ArrowLeftRight size={16} /> 🖱️ 2. السحب والإفلات المباشر
            </button>

            <button
              onClick={() => setDistributionMode('checkbox')}
              style={{
                padding: '10px 20px', borderRadius: 10, fontWeight: 800, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                background: distributionMode === 'checkbox' ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--glass-bg)',
                color: distributionMode === 'checkbox' ? '#fff' : 'var(--text-primary)',
                border: distributionMode === 'checkbox' ? 'none' : '1px solid var(--border-color)',
                boxShadow: distributionMode === 'checkbox' ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
                transition: 'all 0.2s'
              }}>
              <UserCheck size={16} /> 📋 3. التحديد والتسكين الجماعي ونقل الفصول
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* MODE 1: AUTOMATIC BALANCED DISTRIBUTION MODE             */}
          {/* ══════════════════════════════════════════════════════════ */}
          {distributionMode === 'auto' && (() => {
            const unassignedCount = getUnassignedCount();
            const muslimCount     = students.filter(s => getStudentClassId(s) === 'unassigned' && s.religion === 'مسلم').length;
            const christianCount  = students.filter(s => getStudentClassId(s) === 'unassigned' && s.religion === 'مسيحي').length;
            const maleCount       = students.filter(s => getStudentClassId(s) === 'unassigned' && s.gender === 'ذكر').length;
            const femaleCount     = students.filter(s => getStudentClassId(s) === 'unassigned' && s.gender === 'أنثى').length;
            const mergedCount     = students.filter(s => getStudentClassId(s) === 'unassigned' && s.is_merged === 1).length;
            const totalCap        = classrooms.reduce((s, c) => s + Math.min(49, c.capacity || 49), 0);
            const assignedTotal   = students.filter(s => getStudentClassId(s) !== 'unassigned').length;
            const freeSeats       = totalCap - assignedTotal;
            const capacityOk      = unassignedCount <= freeSeats;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* ── Stats Bar ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                  {[
                    { label: 'غير مسكنين', value: unassignedCount, color: '#ef4444', icon: '👥' },
                    { label: 'ذكور', value: maleCount, color: '#2563eb', icon: '👦' },
                    { label: 'إناث', value: femaleCount, color: '#db2777', icon: '👧' },
                    { label: 'مسلمون', value: muslimCount, color: '#0891b2', icon: '🕌' },
                    { label: 'مسيحيون', value: christianCount, color: '#7c3aed', icon: '✝️' },
                    { label: 'دمج', value: mergedCount, color: '#059669', icon: '⭐' },
                    { label: 'مقاعد متاحة', value: freeSeats, color: capacityOk ? '#10b981' : '#ef4444', icon: '🪑' },
                  ].map(item => (
                    <div key={item.label} style={{ background: `rgba(${item.color === '#ef4444' ? '239,68,68' : item.color === '#2563eb' ? '37,99,235' : item.color === '#db2777' ? '219,39,119' : item.color === '#0891b2' ? '8,145,178' : item.color === '#7c3aed' ? '124,58,237' : item.color === '#059669' ? '5,150,105' : '16,185,129'},0.08)`, border: `1px solid ${item.color}30`, borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 18 }}>{item.icon}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                {/* ── Distribution Options ── */}
                <div className="glass-panel" style={{ padding: 18 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 800, margin: '0 0 14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    ⚙️ خيارات التوزيع الآلي
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>

                    {/* فصل الجنسين */}
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>👫 توزيع الجنسين</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[['mixed', '🔀 خلط ذكور وإناث في نفس الفصل'], ['separate', '🔴 فصل تام: فصول ذكور + فصول إناث']].map(([val, label]) => (
                          <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                            <input type="radio" name="genderMode" value={val}
                              checked={distOptions.genderMode === val}
                              onChange={() => setDistOptions(o => ({ ...o, genderMode: val }))}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* توزيع الدين */}
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>🕌✝️ توزيع المسلمين والمسيحيين</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[['mixed', '🔀 توزيع عادي بدون اعتبار الدين'], ['proportional', '⚖️ توزيع نسبي متوازن (كل فصل يعكس النسبة الكلية)']].map(([val, label]) => (
                          <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                            <input type="radio" name="religionMode" value={val}
                              checked={distOptions.religionMode === val}
                              onChange={() => setDistOptions(o => ({ ...o, religionMode: val }))}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* إعادة التوزيع */}
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>🔄 نطاق التوزيع</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[['unassigned', '➕ توزيع الغير مسكنين فقط (لا يمس المسكنين)'], ['all', '♻️ إعادة توزيع الجميع من الصفر (reset كامل)']].map(([val, label]) => (
                          <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                            <input type="radio" name="redistMode" value={val}
                              checked={distOptions.redistMode === val}
                              onChange={() => setDistOptions(o => ({ ...o, redistMode: val }))}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Capacity warning */}
                  {!capacityOk && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 12, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertTriangle size={14} />
                      السعة غير كافية! يوجد {unassignedCount} طالب غير مسكن ولكن المقاعد المتاحة {freeSeats} فقط. يُنصح بإضافة {Math.ceil((unassignedCount - freeSeats) / 49)} فصل إضافي.
                    </div>
                  )}

                  <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn-primary" onClick={handleAutoDistribute}
                      disabled={unassignedCount === 0 && distOptions.redistMode === 'unassigned'}
                      style={{ padding: '10px 24px', gap: 8, fontSize: 14 }}>
                      <Shuffle size={17} /> 🚀 بدء التوزيع الآلي
                    </button>
                  </div>
                </div>

                {/* ── Classrooms Cards ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                  {classrooms.map(c => {
                    const stat    = getClassroomStats(c.id);
                    const maxCap  = Math.min(49, c.capacity || 49);
                    const percent = Math.min(100, Math.round((stat.count / maxCap) * 100));
                    const muslims    = students.filter(s => getStudentClassId(s) === c.id && s.religion === 'مسلم').length;
                    const christians = students.filter(s => getStudentClassId(s) === c.id && s.religion === 'مسيحي').length;

                    return (
                      <div key={c.id} className="glass-panel stat-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>🏫 {c.class_name}</h3>
                            {c.class_code && <span style={{ fontSize: 10, color: '#6366f1', fontFamily: 'monospace', fontWeight: 700 }}>🏷️ {c.class_code}</span>}
                          </div>
                          <span style={{ fontSize: 11, background: percent >= 100 ? '#fef2f2' : 'var(--bg-secondary)', color: percent >= 100 ? '#ef4444' : 'var(--text-secondary)', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                            {stat.count}/{maxCap}
                          </span>
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3, color: 'var(--text-secondary)' }}>
                            <span>الامتلاء</span><span>{percent}%</span>
                          </div>
                          <div style={{ width: '100%', height: 5, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${percent}%`, height: '100%', background: percent >= 100 ? '#ef4444' : percent >= 80 ? '#f59e0b' : '#10b981', borderRadius: 3 }} />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, textAlign: 'center', fontSize: 10, paddingTop: 6, borderTop: '1px solid var(--border-light)' }}>
                          <div><div style={{ fontWeight: 800, color: '#2563eb', fontSize: 13 }}>{stat.males}</div><div style={{ color: 'var(--text-muted)' }}>👦</div></div>
                          <div><div style={{ fontWeight: 800, color: '#db2777', fontSize: 13 }}>{stat.females}</div><div style={{ color: 'var(--text-muted)' }}>👧</div></div>
                          <div><div style={{ fontWeight: 800, color: '#0891b2', fontSize: 13 }}>{muslims}</div><div style={{ color: 'var(--text-muted)' }}>🕌</div></div>
                          <div><div style={{ fontWeight: 800, color: '#7c3aed', fontSize: 13 }}>{christians}</div><div style={{ color: 'var(--text-muted)' }}>✝️</div></div>
                          <div><div style={{ fontWeight: 800, color: '#059669', fontSize: 13 }}>{stat.merged}</div><div style={{ color: 'var(--text-muted)' }}>⭐</div></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })()}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* MODE 2: DRAG AND DROP INTERACTIVE MODE                   */}
          {/* ══════════════════════════════════════════════════════════ */}
          {distributionMode === 'drag' && (
            <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 18 }}>
              
              {/* RIGHT COLUMN: Draggable Students Pool */}
              <div className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', height: 680 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    📚 قائمة الطلاب ({unassignedStudents.length})
                  </h3>
                  <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }}
                    onClick={() => selectAllUnassignedFiltered(unassignedStudents)}>
                    {selectedUnassigned.size === unassignedStudents.length && unassignedStudents.length > 0 ? 'إلغاء الكل' : '🎯 تحديد كافة المصفين'}
                  </button>
                </div>

                {/* Filter and Search Bar */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div className="search-box" style={{ flex: 1 }}>
                    <Search size={14} className="search-icon" />
                    <input className="search-input" style={{ padding: '6px 36px 6px 12px', fontSize: 12 }} placeholder="بحث بالاسم أو الكود..." value={unassignedSearch} onChange={e => setUnassignedSearch(e.target.value)} />
                  </div>
                  <select className="filter-select" style={{ width: 90, padding: '4px 6px', fontSize: 11 }} value={genderFilter} onChange={e => setGenderFilter(e.target.value)}>
                    <option value="all">الكل</option>
                    <option value="ذكر">👦 ذكور</option>
                    <option value="أنثى">👧 إناث</option>
                  </select>
                </div>

                {selectedUnassigned.size > 0 && (
                  <div style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#6366f1', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>💡 تم تحديد {selectedUnassigned.size} طالب. اسحب أي طالب منهم لنقل الدفعة بالكامل!</span>
                    <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 800 }} onClick={() => setSelectedUnassigned(new Set())}>✕</button>
                  </div>
                )}

                {/* Draggable List */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                  {unassignedStudents.map(s => {
                    const isChecked = selectedUnassigned.has(s.id);
                    return (
                      <div
                        key={s.id}
                        draggable={true}
                        onDragStart={e => handleDragStart(e, s)}
                        onClick={() => toggleSelectUnassigned(s.id)}
                        style={{
                          padding: '10px 14px', borderRadius: 10,
                          background: isChecked ? 'rgba(99,102,241,0.15)' : 'var(--glass-bg)',
                          border: isChecked ? '2px solid #6366f1' : '1px solid var(--border-color)',
                          cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          userSelect: 'none', transition: 'all 0.15s'
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input type="checkbox" checked={isChecked} onChange={() => {}} onClick={e => e.stopPropagation()} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{s.full_name_ar}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                              {s.gender === 'ذكر' ? '👦 ذكر' : '👧 أنثى'} {s.is_merged === 1 ? '• ⭐ دمج' : ''}
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: 11, opacity: 0.5 }}>⣿</span>
                      </div>
                    );
                  })}

                  {unassignedStudents.length === 0 && (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      لا يوجد طلاب غير مسكنين يطابقون تصفيتك.
                    </div>
                  )}
                </div>
              </div>

              {/* LEFT AREA: Classroom Cards Drop Zones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 18px', borderRadius: 12, fontSize: 13, color: '#1e40af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>🖱️</span>
                  <span><strong>طريقة السحب والإفلات:</strong> اسحب الطالب (أو دفعة الطلاب المحددين) وأسقطه مباشرة فوق بطاقة الفصل المطلوب لتسكينه فوراً. يتم حظر الإسقاط وتنبيهك باللون الأحمر في حال تجاوز السعة القصوى (49 طالباً).</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, maxHeight: 620, overflowY: 'auto', paddingRight: 4 }}>
                  {classrooms.map(c => {
                    const stat = getClassroomStats(c.id);
                    const maxCap = Math.min(49, c.capacity || 49);
                    const isFull = stat.count >= maxCap;
                    const isDragOver = dragOverClassId === c.id;

                    return (
                      <div
                        key={c.id}
                        onDragOver={e => handleDragOver(e, c)}
                        onDragLeave={handleDragLeave}
                        onDrop={e => handleDropOnClassroom(e, c)}
                        style={{
                          padding: 18, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 10,
                          background: isDragOver ? (isFull ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99,102,241,0.15)') : 'var(--glass-bg)',
                          border: isDragOver ? (isFull ? '2px solid #ef4444' : '2px solid #6366f1') : '1px solid var(--border-color)',
                          boxShadow: isDragOver ? '0 8px 24px rgba(99,102,241,0.25)' : 'none',
                          transition: 'all 0.2s', minHeight: 180
                        }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>🏫 {c.class_name}</h4>
                          <span style={{
                            fontSize: 11, padding: '3px 8px', borderRadius: 8, fontWeight: 700,
                            background: isFull ? '#fee2e2' : 'rgba(16,185,129,0.15)',
                            color: isFull ? '#ef4444' : '#10b981'
                          }}>
                            {isFull ? '⚠️ مكتمل (49)' : `${stat.count} / ${maxCap} طالب`}
                          </span>
                        </div>

                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
                          <span>👦 ذكور: {stat.males}</span>
                          <span>👧 إناث: {stat.females}</span>
                          <span>⭐ دمج: {stat.merged}</span>
                        </div>

                        <div style={{ marginTop: 'auto', textAlign: 'center', padding: '12px 0', border: '2px dashed var(--border-color)', borderRadius: 10, color: 'var(--text-muted)', fontSize: 12, background: 'rgba(255,255,255,0.05)' }}>
                          {isDragOver ? (isFull ? '❌ الفصل مكتمل (49)' : '📥 أفلت الطلاب هنا للتسكين') : '⬇️ أسقط الطالب أو الدفعة هنا'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* MODE 3: INTERACTIVE CHECKBOX SELECTION & RE-ASSIGNMENT    */}
          {/* ══════════════════════════════════════════════════════════ */}
          {distributionMode === 'checkbox' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* ── Summary Stats Bar ──────────────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>👥</span>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#ef4444' }}>{getUnassignedCount()}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>طالب غير مسكن</div>
                  </div>
                </div>
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>🏫</span>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#10b981' }}>{students.length - getUnassignedCount()}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>طالب مسكن بفصوله</div>
                  </div>
                </div>
                <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>📋</span>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#6366f1' }}>{classrooms.length}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>فصل دراسي</div>
                  </div>
                </div>
                {pendingCount > 0 && (
                  <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>⏳</span>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: '#f59e0b' }}>{pendingCount}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>تعديل معلق للحفظ</div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Two Columns Layout ─────────────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

                {/* ══ LEFT PANEL: Unassigned Students ══ */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden' }}>

                  {/* Panel Header */}
                  <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>{unassignedStudents.length}</span>
                        📚 الطلاب غير المسكنين
                      </h3>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '3px 0 0' }}>حدد الطلاب ثم اختر الفصل لتسكينهم</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        onClick={() => setUnassignedSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                        title={unassignedSortOrder === 'asc' ? 'ترتيب تصاعدي (أ→ي) — اضغط للعكس' : 'ترتيب تنازلي (ي→أ) — اضغط للعكس'}
                        style={{ padding: '4px 10px', fontSize: 11, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--glass-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-primary)', fontWeight: 700 }}>
                        {unassignedSortOrder === 'asc' ? '↑ أ→ي' : '↓ ي→أ'}
                      </button>
                      <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: 11, flexShrink: 0 }}
                        onClick={() => selectAllUnassignedFiltered(unassignedStudents)}>
                        {selectedUnassigned.size === unassignedStudents.length && unassignedStudents.length > 0 ? '✕ إلغاء الكل' : '🎯 تحديد كافة المصفين'}
                      </button>
                    </div>
                  </div>

                  {/* Filters Row */}
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 8 }}>
                    <div className="search-box" style={{ flex: 1 }}>
                      <Search size={14} className="search-icon" />
                      <input className="search-input" style={{ padding: '6px 36px 6px 12px', fontSize: 12 }}
                        placeholder="بحث بالاسم..." value={unassignedSearch}
                        onChange={e => setUnassignedSearch(e.target.value)} />
                    </div>
                    <select className="filter-select" style={{ width: 95, fontSize: 12 }} value={genderFilter} onChange={e => setGenderFilter(e.target.value)}>
                      <option value="all">الكل</option>
                      <option value="ذكر">👦 ذكور</option>
                      <option value="أنثى">👧 إناث</option>
                    </select>
                  </div>

                  {/* Selection Status Badge */}
                  {selectedUnassigned.size > 0 && (
                    <div style={{ padding: '8px 14px', background: 'rgba(99,102,241,0.1)', borderBottom: '1px solid rgba(99,102,241,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1' }}>✅ تم تحديد {selectedUnassigned.size} طالب</span>
                      <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, fontWeight: 700 }} onClick={() => setSelectedUnassigned(new Set())}>✕ إلغاء</button>
                    </div>
                  )}

                  {/* Target Class Action Bar */}
                  <div style={{ padding: '12px 14px', background: 'rgba(59,130,246,0.06)', borderBottom: '1px solid rgba(59,130,246,0.15)' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', display: 'block', marginBottom: 6 }}>📥 تسكين المحددين في الفصل:</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select className="filter-select" style={{ flex: 1, fontSize: 12 }} value={targetClassId} onChange={e => setTargetClassId(e.target.value)}>
                        <option value="">اختر الفصل المستهدف...</option>
                        {classrooms.map(c => {
                          const st = getClassroomStats(c.id);
                          return <option key={c.id} value={c.id}>{c.class_name} — {st.count}/49</option>;
                        })}
                      </select>
                      <button className="btn-primary" style={{ padding: '7px 14px', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}
                        disabled={selectedUnassigned.size === 0 || !targetClassId}
                        onClick={() => assignSelectedToClass(targetClassId)}>
                        📥 تسكين ({selectedUnassigned.size})
                      </button>
                    </div>
                  </div>

                  {/* Students Table */}
                  <div style={{ maxHeight: 440, overflowY: 'auto' }}>
                    <table className="students-table" style={{ width: '100%', fontSize: 12 }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                        <tr style={{ background: '#f9fafb' }}>
                          <th style={{ width: 40, padding: '8px 10px' }}>
                            <input type="checkbox"
                              checked={unassignedStudents.length > 0 && selectedUnassigned.size === unassignedStudents.length}
                              onChange={() => selectAllUnassignedFiltered(unassignedStudents)} />
                          </th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>الاسم الكامل</th>
                          <th style={{ width: 70, padding: '8px 10px' }}>النوع</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unassignedStudents.map(s => (
                          <tr key={s.id} className="table-row"
                            onClick={() => toggleSelectUnassigned(s.id)}
                            style={{ cursor: 'pointer', background: selectedUnassigned.has(s.id) ? 'rgba(99,102,241,0.07)' : undefined }}>
                            <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                              <input type="checkbox" checked={selectedUnassigned.has(s.id)}
                                onChange={() => {}} onClick={e => e.stopPropagation()} />
                            </td>
                            <td style={{ padding: '7px 10px', fontWeight: 600 }}>{s.full_name_ar}</td>
                            <td style={{ padding: '7px 10px', fontSize: 11 }}>{s.gender === 'ذكر' ? '👦 ذكر' : '👧 أنثى'}</td>
                          </tr>
                        ))}
                        {unassignedStudents.length === 0 && (
                          <tr><td colSpan={3} style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
                            ✅ لا يوجد طلاب غير مسكنين {genderFilter !== 'all' || unassignedSearch ? 'يطابقون تصفيتك' : 'في هذا الصف'}
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ══ RIGHT PANEL: Enrolled Classroom Inspector ══ */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden' }}>

                  {/* Panel Header */}
                  <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                        🏫 استعراض طلاب الفصل ونقلهم
                      </h3>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '3px 0 0' }}>اختر فصلاً لاستعراض طلابه وإعادة تسكينهم</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => setAssignedSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                        title={assignedSortOrder === 'asc' ? 'ترتيب تصاعدي (أ→ي) — اضغط للعكس' : 'ترتيب تنازلي (ي→أ) — اضغط للعكس'}
                        style={{ padding: '4px 10px', fontSize: 11, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--glass-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-primary)', fontWeight: 700 }}>
                        {assignedSortOrder === 'asc' ? '↑ أ→ي' : '↓ ي→أ'}
                      </button>
                      {selectedAssigned.size > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: 8 }}>
                          ✅ {selectedAssigned.size} محدد
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inspector Classroom Selector */}
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 8 }}>
                    <select className="filter-select" style={{ flex: 1, fontSize: 12 }}
                      value={inspectorClassId}
                      onChange={e => { setInspectorClassId(e.target.value); setSelectedAssigned(new Set()); }}>
                      {classrooms.map(c => (
                        <option key={c.id} value={c.id}>{c.class_name} — {getClassroomStats(c.id).count} طالب</option>
                      ))}
                    </select>
                    <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: 11, flexShrink: 0 }}
                      onClick={() => selectAllAssignedFiltered(inspectorStudents)}>
                      {selectedAssigned.size === inspectorStudents.length && inspectorStudents.length > 0 ? '✕ إلغاء الكل' : '🎯 تحديد الكل'}
                    </button>
                  </div>

                  {/* Local Search */}
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-light)' }}>
                    <div className="search-box">
                      <Search size={14} className="search-icon" />
                      <input className="search-input" style={{ padding: '6px 36px 6px 12px', fontSize: 12 }}
                        placeholder="بحث بطلاب الفصل..." value={assignedSearch}
                        onChange={e => setAssignedSearch(e.target.value)} />
                    </div>
                  </div>

                  {/* Transfer/Unassign Action Bar */}
                  <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,0.06)', borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#d97706', display: 'block', marginBottom: 6 }}>🔄 إعادة تسكين / نقل المحددين:</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select className="filter-select" style={{ flex: 1, fontSize: 12 }} value={transferTargetClassId} onChange={e => setTransferTargetClassId(e.target.value)}>
                        <option value="">اختر الفصل المستهدف للنقل...</option>
                        {classrooms.filter(c => String(c.id) !== String(inspectorClassId)).map(c => {
                          const st = getClassroomStats(c.id);
                          return <option key={c.id} value={c.id}>{c.class_name} — {st.count}/49</option>;
                        })}
                      </select>
                      <button className="btn-primary" style={{ padding: '7px 12px', fontSize: 12, background: '#f59e0b', borderColor: '#d97706', whiteSpace: 'nowrap', flexShrink: 0 }}
                        disabled={selectedAssigned.size === 0 || !transferTargetClassId}
                        onClick={() => transferSelectedAssignedToClass(transferTargetClassId)}>
                        🔄 نقل ({selectedAssigned.size})
                      </button>
                      <button className="btn-secondary" style={{ padding: '7px 10px', fontSize: 11, borderColor: '#fca5a5', color: '#ef4444', flexShrink: 0 }}
                        disabled={selectedAssigned.size === 0} onClick={unassignSelectedAssigned} title="فك تسكين وإعادة للغير مسكنين">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Enrolled Students Table */}
                  <div style={{ maxHeight: 440, overflowY: 'auto' }}>
                    <table className="students-table" style={{ width: '100%', fontSize: 12 }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                        <tr style={{ background: '#f9fafb' }}>
                          <th style={{ width: 40, padding: '8px 10px' }}>
                            <input type="checkbox"
                              checked={inspectorStudents.length > 0 && selectedAssigned.size === inspectorStudents.length}
                              onChange={() => selectAllAssignedFiltered(inspectorStudents)} />
                          </th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>الاسم الكامل</th>
                          <th style={{ width: 70, padding: '8px 10px' }}>النوع</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inspectorStudents.map(s => (
                          <tr key={s.id} className="table-row"
                            onClick={() => toggleSelectAssigned(s.id)}
                            style={{ cursor: 'pointer', background: selectedAssigned.has(s.id) ? 'rgba(16,185,129,0.07)' : undefined }}>
                            <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                              <input type="checkbox" checked={selectedAssigned.has(s.id)}
                                onChange={() => {}} onClick={e => e.stopPropagation()} />
                            </td>
                            <td style={{ padding: '7px 10px', fontWeight: 600 }}>{s.full_name_ar}</td>
                            <td style={{ padding: '7px 10px', fontSize: 11 }}>{s.gender === 'ذكر' ? '👦 ذكر' : '👧 أنثى'}</td>
                          </tr>
                        ))}
                        {inspectorStudents.length === 0 && (
                          <tr><td colSpan={3} style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
                            لا يوجد طلاب مقيدون في هذا الفصل.
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

