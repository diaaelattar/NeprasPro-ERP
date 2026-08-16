import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft, Grid, Users, Search, RefreshCw, CheckCircle,
  AlertTriangle, Shuffle, UserCheck, X, Save, Plus, ArrowRight,
  BookOpen, Loader2, Filter, Info, Trash2, ArrowLeftRight, MoveRight,
  CheckSquare, Square, Printer, Download, Undo2, ChevronRight,
  ChevronLeft, Sparkles, Scale, SlidersHorizontal, Eye
} from 'lucide-react';
import './students.css';
import API_BASE_URL from '../../config/api';

const API = API_BASE_URL;

export default function ClassroomDistribution({ onBack, activeSectionId }) {
  // ── 1. State Management ──────────────────────────────────────────────
  const [formOpts, setFormOpts] = useState({ sections: [], stages: [], grades: [], academicYears: [] });
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Main Active Tab: 'workspace' (Dual-Pane) | 'kanban' (Drag & Drop) | 'wizard' (Auto-Distribution)
  const [activeTab, setActiveTab] = useState('workspace');

  // Top Filters
  const [filters, setFilters] = useState({
    sectionId: activeSectionId && activeSectionId !== 'all' ? String(activeSectionId) : '',
    stageId: '',
    gradeId: '',
    academicYearId: '',
  });

  // Selected Classroom for Inspection & Editing
  const [inspectorClassId, setInspectorClassId] = useState('');

  // Target class for bulk transfer actions
  const [transferTargetClassId, setTransferTargetClassId] = useState('');
  const [unassignedTargetClassId, setUnassignedTargetClassId] = useState('');

  // Local Search & Filter States
  const [assignedSearch, setAssignedSearch] = useState('');
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [unassignedGenderFilter, setUnassignedGenderFilter] = useState('all'); // 'all' | 'ذكر' | 'أنثى'
  const [unassignedSortOrder, setUnassignedSortOrder] = useState('asc');
  const [assignedSortOrder, setAssignedSortOrder] = useState('asc');

  // Pending Changes State: { [studentId]: classId | 'unassigned' }
  const [pendingChanges, setPendingChanges] = useState({});
  const [historyStack, setHistoryStack] = useState([]); // for Undo

  // Selection Sets
  const [selectedAssigned, setSelectedAssigned] = useState(new Set());
  const [selectedUnassigned, setSelectedUnassigned] = useState(new Set());

  // Drag and Drop State
  const [dragOverClassId, setDragOverClassId] = useState(null);

  // Student Swap Modal State
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapStudentA, setSwapStudentA] = useState(null);
  const [swapStudentBId, setSwapStudentBId] = useState('');

  // Print Roster Modal State & Options
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printClassId, setPrintClassId] = useState('');
  const [printScope, setPrintScope] = useState('single'); // 'single' | 'grade_all'
  const [printFormat, setPrintFormat] = useState('detailed'); // 'detailed' | 'attendance' | 'simple'
  const [attendanceSubMode, setAttendanceSubMode] = useState('monthly'); // 'weekly' | 'biweekly' | 'monthly'
  const [printOrientation, setPrintOrientation] = useState('portrait'); // 'portrait' | 'landscape'
  const [schoolInfo, setSchoolInfo] = useState(null);

  // Auto-Distribution Options
  const [distOptions, setDistOptions] = useState({
    genderMode: 'mixed',        // 'mixed' | 'separate'
    religionMode: 'mixed',      // 'mixed' | 'proportional'
    redistMode: 'unassigned',   // 'unassigned' | 'all'
    alphabetical: true,         // Balance alphabets
    keepSiblings: true,         // Keep twins/siblings together
    maxCapacity: 49,            // Per class capacity limit
  });

  // ── 2. Data Fetching ────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/students/form-options`).then(r => r.json()).then(d => {
      if (d.success) setFormOpts(d);
      const cur = d.academicYears?.find(y => y.is_current === 1 || y.is_current === true);
      if (cur) setFilters(f => ({ ...f, academicYearId: String(cur.id) }));
    });

    fetch(`${API}/setup/status`).then(r => r.json()).then(d => {
      if (d.success) setSchoolInfo(d);
    }).catch(() => {});
  }, []);

  const loadClassrooms = useCallback(() => {
    if (filters.gradeId && filters.academicYearId) {
      fetch(`${API}/settings/classrooms?gradeId=${filters.gradeId}&academicYearId=${filters.academicYearId}`)
        .then(r => r.json()).then(d => {
          const list = d.success ? d.classrooms : [];
          setClassrooms(list);
          if (list.length > 0 && (!inspectorClassId || !list.some(c => String(c.id) === String(inspectorClassId)))) {
            setInspectorClassId(String(list[0].id));
          }
        });
    } else {
      setClassrooms([]);
      setInspectorClassId('');
    }
  }, [filters.gradeId, filters.academicYearId, inspectorClassId]);

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
      limit: 2500
    });
    fetch(`${API}/students?${q}`).then(r => r.json()).then(d => {
      if (d.success) {
        setStudents(d.students || []);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
    
    // Clear pending & selections on filter change
    setPendingChanges({});
    setHistoryStack([]);
    setSelectedAssigned(new Set());
    setSelectedUnassigned(new Set());
  }, [filters.gradeId, filters.academicYearId]);

  useEffect(() => {
    loadClassrooms();
    loadStudents();
  }, [filters.gradeId, filters.academicYearId, loadClassrooms, loadStudents]);

  // Hierarchical Filter Dropdowns
  const filteredStages = useMemo(() => 
    formOpts.stages || [],
    [formOpts.stages]
  );
  
  const filteredGrades = useMemo(() => 
    formOpts.grades?.filter(g => !filters.stageId || String(g.stage_id) === String(filters.stageId)) || [],
    [formOpts.grades, filters.stageId]
  );

  // ── 3. Helper Functions ─────────────────────────────────────────────
  const getStudentClassId = useCallback((student) => {
    if (pendingChanges[student.id] !== undefined) {
      return pendingChanges[student.id];
    }
    return student.classroom_id || 'unassigned';
  }, [pendingChanges]);

  const getClassroomStats = useCallback((classId) => {
    const classStudents = students.filter(s => String(getStudentClassId(s)) === String(classId));
    const males = classStudents.filter(s => s.gender === 'ذكر').length;
    const females = classStudents.filter(s => s.gender === 'أنثى').length;
    const muslims = classStudents.filter(s => s.religion === 'مسلم').length;
    const christians = classStudents.filter(s => s.religion === 'مسيحي').length;
    const merged = classStudents.filter(s => s.is_merged === 1).length;
    return { count: classStudents.length, males, females, muslims, christians, merged };
  }, [students, getStudentClassId]);

  const unassignedCount = useMemo(() => 
    students.filter(s => getStudentClassId(s) === 'unassigned').length,
    [students, getStudentClassId]
  );

  const pendingCount = Object.keys(pendingChanges).length;

  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    if (type === 'error') setError(message);
    else if (type === 'success') setSuccess(message);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Sorting Helper
  const sortStudents = (list, order) => {
    return [...list].sort((a, b) => {
      const nameA = a.full_name_ar || '';
      const nameB = b.full_name_ar || '';
      const cmp = nameA.localeCompare(nameB, 'ar');
      return order === 'asc' ? cmp : -cmp;
    });
  };

  // Student Lists
  const unassignedStudents = useMemo(() => {
    return sortStudents(
      students
        .filter(s => getStudentClassId(s) === 'unassigned')
        .filter(s => !unassignedSearch || s.full_name_ar?.includes(unassignedSearch) || s.student_code?.includes(unassignedSearch))
        .filter(s => unassignedGenderFilter === 'all' || s.gender === unassignedGenderFilter),
      unassignedSortOrder
    );
  }, [students, getStudentClassId, unassignedSearch, unassignedGenderFilter, unassignedSortOrder]);

  const activeInspectorClass = useMemo(() => 
    classrooms.find(c => String(c.id) === String(inspectorClassId)),
    [classrooms, inspectorClassId]
  );

  const inspectorStudents = useMemo(() => {
    if (!activeInspectorClass) return [];
    return sortStudents(
      students
        .filter(s => String(getStudentClassId(s)) === String(activeInspectorClass.id))
        .filter(s => !assignedSearch || s.full_name_ar?.includes(assignedSearch) || s.student_code?.includes(assignedSearch) || s.national_id?.includes(assignedSearch)),
      assignedSortOrder
    );
  }, [students, activeInspectorClass, getStudentClassId, assignedSearch, assignedSortOrder]);

  // ── 4. Action Handlers with Undo Support ────────────────────────────
  const recordChange = (newChanges) => {
    setHistoryStack(prev => [...prev, { ...pendingChanges }]);
    setPendingChanges(newChanges);
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const prev = historyStack[historyStack.length - 1];
    setHistoryStack(historyStack.slice(0, -1));
    setPendingChanges(prev);
    showToast('تم التراجع عن آخر خطوة.', 'info');
  };

  // Direct 1-Click Move Student to new Class with Capacity Check
  const handleDirectMoveStudent = (studentId, newClassId) => {
    if (newClassId !== 'unassigned') {
      const targetClass = classrooms.find(c => String(c.id) === String(newClassId));
      if (targetClass) {
        const stat = getClassroomStats(targetClass.id);
        const maxCap = Math.min(distOptions.maxCapacity || 49, targetClass.capacity || 49);
        if (stat.count >= maxCap) {
          showToast(`⚠️ لا يمكن النقل: فصل "${targetClass.class_name}" مكتمل الكثافة بالفعل (${stat.count}/${maxCap} طالب)!`, 'error');
          return;
        }
      }
    }
    const next = { ...pendingChanges, [studentId]: newClassId === 'unassigned' ? 'unassigned' : parseInt(newClassId, 10) };
    recordChange(next);
    const targetClass = classrooms.find(c => String(c.id) === String(newClassId));
    if (newClassId === 'unassigned') {
      showToast('تم فك تسكين الطالب وإعادته لقائمة غير المسكنين.', 'info');
    } else {
      showToast(`✅ تم نقل الطالب إلى فصل ${targetClass ? targetClass.class_name : ''} بنجاح.`, 'success');
    }
  };

  const handleDirectUnassign = (studentId) => {
    handleDirectMoveStudent(studentId, 'unassigned');
  };

  // Batch Assign Unassigned to a Target Class
  const handleBatchAssignUnassigned = (targetCId) => {
    if (selectedUnassigned.size === 0 || !targetCId) return;
    const targetClass = classrooms.find(c => String(c.id) === String(targetCId));
    if (!targetClass) return;

    const stats = getClassroomStats(targetClass.id);
    const maxCap = Math.min(distOptions.maxCapacity || 49, targetClass.capacity || 49);

    if (stats.count + selectedUnassigned.size > maxCap) {
      showToast(`⚠️ لا يمكن التسكين في فصل "${targetClass.class_name}": سيتجاوز السعة (${maxCap} طالباً). المتاح: ${Math.max(0, maxCap - stats.count)} طالباً.`, 'error');
      return;
    }

    const next = { ...pendingChanges };
    selectedUnassigned.forEach(sid => {
      next[sid] = targetClass.id;
    });
    recordChange(next);
    setSelectedUnassigned(new Set());
    showToast(`✅ تم تسكين ${selectedUnassigned.size} طالب في فصل ${targetClass.class_name} بنجاح.`, 'success');
  };

  // Batch Transfer from Inspector Class to Another Class
  const handleBatchTransferAssigned = (destCId) => {
    if (selectedAssigned.size === 0 || !destCId) return;
    const destClass = classrooms.find(c => String(c.id) === String(destCId));
    if (!destClass) return;

    const stats = getClassroomStats(destClass.id);
    const maxCap = Math.min(distOptions.maxCapacity || 49, destClass.capacity || 49);

    if (stats.count + selectedAssigned.size > maxCap) {
      showToast(`⚠️ لا يمكن النقل لفصل "${destClass.class_name}": سيتجاوز السعة (${maxCap} طالباً). المتاح: ${Math.max(0, maxCap - stats.count)} طالباً.`, 'error');
      return;
    }

    const next = { ...pendingChanges };
    selectedAssigned.forEach(sid => {
      next[sid] = destClass.id;
    });
    recordChange(next);
    setSelectedAssigned(new Set());
    showToast(`✅ تم نقل ${selectedAssigned.size} طالب إلى فصل ${destClass.class_name} بنجاح.`, 'success');
  };

  // Batch Unassign Selected Assigned Students
  const handleBatchUnassignAssigned = () => {
    if (selectedAssigned.size === 0) return;
    const count = selectedAssigned.size;
    const next = { ...pendingChanges };
    selectedAssigned.forEach(sid => {
      next[sid] = 'unassigned';
    });
    recordChange(next);
    setSelectedAssigned(new Set());
    showToast(`تم فك تسكين ${count} طالب وإعادتهم لغير المسكنين بنجاح.`, 'info');
  };

  // ── 5. Student Swap Logic (تبديل مباشر بين طالبين) ─────────────────
  const openSwapForStudent = (student) => {
    setSwapStudentA(student);
    setSwapStudentBId('');
    setSwapModalOpen(true);
  };

  const handleExecuteSwap = () => {
    if (!swapStudentA || !swapStudentBId) return;
    const studentB = students.find(s => String(s.id) === String(swapStudentBId));
    if (!studentB) return;

    const classAId = getStudentClassId(swapStudentA);
    const classBId = getStudentClassId(studentB);

    if (classAId === classBId) {
      setError('لا يمكن التبديل بين طالبين مسكنين في نفس الفصل.');
      return;
    }

    const next = { ...pendingChanges };
    next[swapStudentA.id] = classBId;
    next[studentB.id] = classAId;

    recordChange(next);
    setSwapModalOpen(false);
    setSwapStudentA(null);
    setSwapStudentBId('');
    setError('');
    setSuccess(`✅ تم التبديل الفوري بين الطالبين (${swapStudentA.full_name_ar}) و (${studentB.full_name_ar}) بنجاح.`);
  };

  // ── 6. Drag & Drop Handlers ─────────────────────────────────────────
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
      const maxCap = Math.min(distOptions.maxCapacity || 49, targetClassroom.capacity || 49);

      if (stats.count + idsToMove.length > maxCap) {
        setError(`⚠️ لا يمكن الإسقاط في فصل "${targetClassroom.class_name}": سيتجاوز السعة القصوى (${maxCap} طالباً). المتاح: ${Math.max(0, maxCap - stats.count)} طالباً.`);
        return;
      }

      const next = { ...pendingChanges };
      idsToMove.forEach(sid => {
        next[sid] = targetClassroom.id;
      });
      recordChange(next);
      setSelectedUnassigned(new Set());
      setError('');
      setSuccess(`✅ تم تسكين ${idsToMove.length} طالب في فصل ${targetClassroom.class_name} بالسحب والإفلات.`);
    } catch (err) {
      console.error(err);
    }
  };

  // ── 7. Smart Balancing & Auto-Distribution Algorithm ────────────────
  const handleAutoDistribute = () => {
    if (classrooms.length === 0) {
      setError('يجب إنشاء فصول دراسية لهذا الصف أولاً.');
      return;
    }

    const next = { ...pendingChanges };

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

    const maxCapPerClass = distOptions.maxCapacity || 49;
    const totalCapacity = classrooms.reduce((sum, c) => sum + Math.min(maxCapPerClass, c.capacity || maxCapPerClass), 0);
    const totalAssigned = students.filter(s => {
      const cid = next[s.id] !== undefined ? next[s.id] : (s.classroom_id || 'unassigned');
      return cid !== 'unassigned';
    }).length;
    const availableSeats = totalCapacity - totalAssigned;

    if (targetStudents.length > availableSeats) {
      const needed = Math.ceil((targetStudents.length - availableSeats) / maxCapPerClass);
      setError(`⚠️ السعة غير كافية! عدد الطلاب (${targetStudents.length}) يتجاوز المقاعد المتاحة (${availableSeats}). يلزم إضافة ${needed} فصل.`);
      return;
    }

    // Counters
    const countMap = {};
    const maleMap = {};
    const femaleMap = {};
    const muslimMap = {};
    const christianMap = {};

    classrooms.forEach(c => {
      countMap[c.id] = 0;
      maleMap[c.id] = 0;
      femaleMap[c.id] = 0;
      muslimMap[c.id] = 0;
      christianMap[c.id] = 0;
    });

    students.forEach(s => {
      const cid = next[s.id] !== undefined ? next[s.id] : (s.classroom_id || 'unassigned');
      if (cid !== 'unassigned' && countMap[cid] !== undefined) {
        countMap[cid]++;
        if (s.gender === 'ذكر') maleMap[cid]++;
        if (s.gender === 'أنثى') femaleMap[cid]++;
        if (s.religion === 'مسلم') muslimMap[cid]++;
        if (s.religion === 'مسيحي') christianMap[cid]++;
      }
    });

    const totalChristians = targetStudents.filter(s => s.religion === 'مسيحي').length;
    const christianRatio = targetStudents.length > 0 ? totalChristians / targetStudents.length : 0;

    const getBestClass = (student) => {
      let bestClass = null;
      let minCount = Infinity;

      classrooms.forEach(c => {
        const maxCap = Math.min(maxCapPerClass, c.capacity || maxCapPerClass);
        const count = countMap[c.id] ?? 0;
        if (count >= maxCap) return;

        if (distOptions.genderMode === 'separate') {
          const hasMales = maleMap[c.id] > 0;
          const hasFemales = femaleMap[c.id] > 0;
          if (student.gender === 'ذكر' && hasFemales) return;
          if (student.gender === 'أنثى' && hasMales) return;
        }

        if (distOptions.religionMode === 'proportional' && student.religion === 'مسيحي') {
          const classChristianRatio = count > 0 ? christianMap[c.id] / count : 0;
          if (classChristianRatio > christianRatio * 1.5 && christianRatio > 0) return;
        }

        if (count < minCount) {
          minCount = count;
          bestClass = c;
        }
      });

      if (!bestClass) {
        classrooms.forEach(c => {
          const maxCap = Math.min(maxCapPerClass, c.capacity || maxCapPerClass);
          const count = countMap[c.id] ?? 0;
          if (count < maxCap && count < minCount) {
            minCount = count;
            bestClass = c;
          }
        });
      }
      return bestClass;
    };

    const assign = (student, classroom) => {
      next[student.id] = classroom.id;
      countMap[classroom.id]++;
      if (student.gender === 'ذكر') maleMap[classroom.id]++;
      if (student.gender === 'أنثى') femaleMap[classroom.id]++;
      if (student.religion === 'مسلم') muslimMap[classroom.id]++;
      if (student.religion === 'مسيحي') christianMap[classroom.id]++;
    };

    // 1. Preserve Siblings & Twins
    const mergedStudents = targetStudents.filter(s => s.is_merged === 1 || s.twin_student_id);
    const regularStudents = targetStudents.filter(s => s.is_merged !== 1 && !s.twin_student_id);

    const siblingGroups = {};
    mergedStudents.forEach(s => {
      const key = s.twin_student_id
        ? `twin_${Math.min(s.id, s.twin_student_id)}_${Math.max(s.id, s.twin_student_id)}`
        : `single_${s.id}`;
      if (!siblingGroups[key]) siblingGroups[key] = [];
      siblingGroups[key].push(s);
    });

    Object.values(siblingGroups).forEach(group => {
      const cls = getBestClass(group[0]);
      if (cls) group.forEach(s => assign(s, cls));
    });

    // 2. Distribute with Alphabetical & Religious fairness
    let sortedPool = [...regularStudents];
    if (distOptions.alphabetical) {
      sortedPool = sortStudents(sortedPool, 'asc');
    }

    const christians = sortedPool.filter(s => s.religion === 'مسيحي');
    const others = sortedPool.filter(s => s.religion !== 'مسيحي');

    christians.forEach(s => {
      const cls = getBestClass(s);
      if (cls) assign(s, cls);
    });

    others.forEach(s => {
      const cls = getBestClass(s);
      if (cls) assign(s, cls);
    });

    recordChange(next);
    setError('');
    setSuccess(`🎉 تم التوزيع الآلي بنجاح لـ ${targetStudents.length} طالباً وفق المعايير المحددة! انقر "حفظ التعديلات" لاعتمادها.`);
    setActiveTab('workspace');
  };

  // ── 8. Bulk Save to Database ─────────────────────────────────────────
  const handleSaveAll = async () => {
    const entries = Object.entries(pendingChanges);
    if (entries.length === 0) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = entries.map(([studentId, classId]) => ({
        studentId: parseInt(studentId, 10),
        classId: classId === 'unassigned' ? null : parseInt(classId, 10),
        academicYearId: parseInt(filters.academicYearId, 10),
      }));

      const res = await fetch(`${API}/settings/classrooms/bulk-enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollments: payload })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ التوزيع.');

      setSuccess(`✅ تم حفظ وتثبيت تسكين ${data.enrolled} طالب بنجاح في قاعدة البيانات!`);
      setPendingChanges({});
      setHistoryStack([]);
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

  // ── 9. Print Roster Dialog & Engine ────────────────────────────────
  const handlePrintRoster = (cId) => {
    setPrintClassId(cId || inspectorClassId || (classrooms[0]?.id ? String(classrooms[0].id) : ''));
    setPrintModalOpen(true);
  };

  const handleExecutePrintRosters = () => {
    let classesToPrint = [];
    if (printScope === 'single') {
      const target = classrooms.find(c => String(c.id) === String(printClassId));
      if (target) classesToPrint = [target];
      else if (classrooms.length > 0) classesToPrint = [classrooms[0]];
    } else {
      classesToPrint = classrooms;
    }

    if (classesToPrint.length === 0) {
      alert('لا توجد فصول متاحة للطباعة.');
      return;
    }

    const rawSchool   = schoolInfo?.school_name || schoolInfo?.schoolName || '';
    const cleanSchool = rawSchool.replace(/^مدرسة\s*/, '').trim() || '...............';
    const rawAdmin    = schoolInfo?.directorate || schoolInfo?.administration || '';
    const cleanAdmin  = rawAdmin.replace(/التعليمية\s*$/, '').trim() || '...............';
    const gov         = schoolInfo?.governorate || '...............';
    const logo        = schoolInfo?.logo_url || schoolInfo?.logoUrl || '';
    const currentAcademicYear = formOpts.academicYears?.find(y => String(y.id) === String(filters.academicYearId))?.year_label 
      || schoolInfo?.academicYear || '....../......';
    const gradeObj = formOpts.grades?.find(g => String(g.id) === String(filters.gradeId));
    const gradeLabel = gradeObj?.grade_name_ar || 'الصف الدراسي';

    const now     = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });

    const targetClass = classrooms.find(c => String(c.id) === String(printClassId)) || classrooms[0];
    const docTitle = printScope === 'single'
      ? `قائمة_طلاب_فصل_${(targetClass?.class_name || '').replace(/[\/\s]/g, '_')}_${(gradeLabel || '').replace(/[\/\s]/g, '_')}`
      : `قوائم_فصول_${(gradeLabel || '').replace(/[\/\s]/g, '_')}_كاملة`;

    const generateClassPageHtml = (c, isLast) => {
      const classStudents = students
        .filter(s => String(getStudentClassId(s)) === String(c.id))
        .sort((a, b) => (a.full_name_ar || '').localeCompare(b.full_name_ar || '', 'ar'));

      const males = classStudents.filter(s => s.gender === 'ذكر').length;
      const females = classStudents.filter(s => s.gender === 'أنثى').length;
      const muslims = classStudents.filter(s => s.religion === 'مسلم').length;
      const christians = classStudents.filter(s => s.religion === 'مسيحي').length;
      const total = classStudents.length;

      let tableHeadHtml = '';
      let tableRowsHtml = '';

      if (printFormat === 'attendance') {
        if (attendanceSubMode === 'monthly') {
          // 🗓️ رصد الغياب الشهري الكامل (4 أسابيع = 20 يوماً بالعرض بنسب هندسية منضبطة)
          tableHeadHtml = `
            <tr style="background: #f1f5f9; font-weight: 800;">
              <th rowspan="2" style="width: 25pt;">م</th>
              <th rowspan="2" style="text-align: right; width: 170pt; padding-right: 6pt;">اسم الطالب رباعي</th>
              <th colspan="5">الأسبوع الأول</th>
              <th colspan="5">الأسبوع الثاني</th>
              <th colspan="5">الأسبوع الثالث</th>
              <th colspan="5">الأسبوع الرابع</th>
              <th rowspan="2" style="width: 45pt;">إجمالي الشهر</th>
            </tr>
            <tr style="background: #f8fafc; font-weight: 800; font-size: 8.5pt;">
              <th style="width: 27pt;">ح</th><th style="width: 27pt;">ن</th><th style="width: 27pt;">ث</th><th style="width: 27pt;">ر</th><th style="width: 27pt;">خ</th>
              <th style="width: 27pt;">ح</th><th style="width: 27pt;">ن</th><th style="width: 27pt;">ث</th><th style="width: 27pt;">ر</th><th style="width: 27pt;">خ</th>
              <th style="width: 27pt;">ح</th><th style="width: 27pt;">ن</th><th style="width: 27pt;">ث</th><th style="width: 27pt;">ر</th><th style="width: 27pt;">خ</th>
              <th style="width: 27pt;">ح</th><th style="width: 27pt;">ن</th><th style="width: 27pt;">ث</th><th style="width: 27pt;">ر</th><th style="width: 27pt;">خ</th>
            </tr>
          `;
          tableRowsHtml = classStudents.map((st, i) => `
            <tr style="background: ${i % 2 === 1 ? '#fafafa' : '#fff'};">
              <td style="font-weight: 700; padding: 4.5pt 1pt;">${i + 1}</td>
              <td style="text-align: right; font-weight: 700; padding: 4.5pt 6pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${st.full_name_ar}</td>
              <td></td><td></td><td></td><td></td><td></td>
              <td></td><td></td><td></td><td></td><td></td>
              <td></td><td></td><td></td><td></td><td></td>
              <td></td><td></td><td></td><td></td><td></td>
              <td></td>
            </tr>
          `).join('');
        } else if (attendanceSubMode === 'biweekly') {
          // 📅 رصد الغياب لمدة أسبوعين (10 أيام - صفحتين براحة للكتابة)
          tableHeadHtml = `
            <tr style="background: #f1f5f9; font-weight: 800;">
              <th rowspan="2" style="width: 22pt;">م</th>
              <th rowspan="2" style="text-align: right; min-width: 150pt; padding-right: 6pt;">اسم الطالب رباعي</th>
              <th colspan="5">الأسبوع الأول</th>
              <th colspan="5">الأسبوع الثاني</th>
              <th rowspan="2" style="width: 40pt;">مجموع الغياب</th>
            </tr>
            <tr style="background: #f8fafc; font-weight: 800; font-size: 8.5pt;">
              <th style="width: 22pt;">الأحد</th><th style="width: 22pt;">الاثنين</th><th style="width: 22pt;">الثلاثاء</th><th style="width: 22pt;">الأربعاء</th><th style="width: 22pt;">الخميس</th>
              <th style="width: 22pt;">الأحد</th><th style="width: 22pt;">الاثنين</th><th style="width: 22pt;">الثلاثاء</th><th style="width: 22pt;">الأربعاء</th><th style="width: 22pt;">الخميس</th>
            </tr>
          `;
          tableRowsHtml = classStudents.map((st, i) => `
            <tr style="background: ${i % 2 === 1 ? '#fafafa' : '#fff'};">
              <td style="font-weight: 700; padding: 6pt 2pt;">${i + 1}</td>
              <td style="text-align: right; font-weight: 700; padding: 6pt 6pt;">${st.full_name_ar}</td>
              <td></td><td></td><td></td><td></td><td></td>
              <td></td><td></td><td></td><td></td><td></td>
              <td></td>
            </tr>
          `).join('');
        } else {
          // 📅 رصد الغياب الأسبوعي (5 أيام - صفحتين بسطور عريضة)
          tableHeadHtml = `
            <tr style="background: #f1f5f9; font-weight: 800;">
              <th rowspan="2" style="width: 24pt;">م</th>
              <th rowspan="2" style="text-align: right; min-width: 160pt; padding-right: 8pt;">اسم الطالب رباعي</th>
              <th colspan="5">أيام الأسبوع (رصد الحضور والغياب)</th>
              <th rowspan="2" style="width: 45pt;">مجموع الغياب</th>
              <th rowspan="2" style="width: 60pt;">ملاحظات</th>
            </tr>
            <tr style="background: #f8fafc; font-weight: 800; font-size: 9pt;">
              <th style="width: 28pt;">الأحد</th><th style="width: 28pt;">الاثنين</th><th style="width: 28pt;">الثلاثاء</th><th style="width: 28pt;">الأربعاء</th><th style="width: 28pt;">الخميس</th>
            </tr>
          `;
          tableRowsHtml = classStudents.map((st, i) => `
            <tr style="background: ${i % 2 === 1 ? '#fafafa' : '#fff'};">
              <td style="font-weight: 700; padding: 6.5pt 2pt;">${i + 1}</td>
              <td style="text-align: right; font-weight: 700; padding: 6.5pt 8pt;">${st.full_name_ar}</td>
              <td></td><td></td><td></td><td></td><td></td>
              <td></td>
              <td style="font-size: 8.5pt;">${st.is_merged ? 'دمج' : ''}</td>
            </tr>
          `).join('');
        }
      } else if (printFormat === 'simple') {
        // Double Column (جدول مزدوج من عمودين متجاورين لاستيعاب الفصل كاملاً في صفحة واحدة بدون كود)
        const half = Math.ceil(classStudents.length / 2);
        const col1 = classStudents.slice(0, half);
        const col2 = classStudents.slice(half);
        const maxRows = Math.max(col1.length, col2.length, 1);

        const rows = [];
        for (let r = 0; r < maxRows; r++) {
          const s1 = col1[r];
          const s2 = col2[r];
          rows.push(`
            <tr style="background: ${r % 2 === 1 ? '#fafafa' : '#fff'};">
              ${s1 ? `
                <td style="font-weight: 700; width: 18pt; padding: 2.5pt 1pt;">${r + 1}</td>
                <td style="text-align: right; font-weight: 700; padding: 2.5pt 4pt;">${s1.full_name_ar}</td>
                <td style="width: 26pt; padding: 2.5pt 1pt;">${s1.religion || '—'}</td>
                <td style="width: 26pt; padding: 2.5pt 1pt;">${s1.gender || '—'}</td>
                <td style="width: 32pt; font-size: 8pt; padding: 2.5pt 1pt;">${s1.is_merged ? 'دمج' : ''}</td>
              ` : `
                <td colspan="5" style="border: 1pt solid #000;">&nbsp;</td>
              `}
              <td style="width: 4pt; background: #e2e8f0; border-top: none; border-bottom: none; padding: 0;"></td>
              ${s2 ? `
                <td style="font-weight: 700; width: 18pt; padding: 2.5pt 1pt;">${half + r + 1}</td>
                <td style="text-align: right; font-weight: 700; padding: 2.5pt 4pt;">${s2.full_name_ar}</td>
                <td style="width: 26pt; padding: 2.5pt 1pt;">${s2.religion || '—'}</td>
                <td style="width: 26pt; padding: 2.5pt 1pt;">${s2.gender || '—'}</td>
                <td style="width: 32pt; font-size: 8pt; padding: 2.5pt 1pt;">${s2.is_merged ? 'دمج' : ''}</td>
              ` : `
                <td colspan="5" style="border: 1pt solid #000;">&nbsp;</td>
              `}
            </tr>
          `);
        }

        tableHeadHtml = `
          <tr style="background: #f1f5f9; font-weight: 800;">
            <th style="width: 18pt; padding: 3pt 1pt;">م</th>
            <th style="text-align: right; min-width: 110pt; padding: 3pt 4pt;">اسم الطالب رباعي</th>
            <th style="width: 26pt; padding: 3pt 1pt;">الديانة</th>
            <th style="width: 26pt; padding: 3pt 1pt;">النوع</th>
            <th style="width: 32pt; padding: 3pt 1pt;">ملاحظات</th>
            <th style="width: 4pt; background: #e2e8f0; border-top: none; border-bottom: none; padding: 0;"></th>
            <th style="width: 18pt; padding: 3pt 1pt;">م</th>
            <th style="text-align: right; min-width: 110pt; padding: 3pt 4pt;">اسم الطالب رباعي</th>
            <th style="width: 26pt; padding: 3pt 1pt;">الديانة</th>
            <th style="width: 26pt; padding: 3pt 1pt;">النوع</th>
            <th style="width: 32pt; padding: 3pt 1pt;">ملاحظات</th>
          </tr>
        `;
        tableRowsHtml = rows.join('');
      } else {
        tableHeadHtml = `
          <tr style="background: #f1f5f9; font-weight: 800;">
            <th style="width: 25pt;">م</th>
            <th style="width: 60pt;">كود الطالب</th>
            <th style="text-align: right; min-width: 140pt; padding-right: 6pt;">اسم الطالب رباعي</th>
            <th style="width: 35pt;">الديانة</th>
            <th style="width: 55pt;">تاريخ الميلاد</th>
            <th style="width: 85pt;">الرقم القومي</th>
            <th style="width: 50pt;">حالة القيد</th>
            <th style="width: 55pt;">ملاحظات</th>
          </tr>
        `;
        tableRowsHtml = classStudents.map((st, i) => `
          <tr style="background: ${i % 2 === 1 ? '#fafafa' : '#fff'};">
            <td style="font-weight: 700;">${i + 1}</td>
            <td style="font-family: monospace;">${st.student_code || '—'}</td>
            <td style="text-align: right; font-weight: 700; padding-right: 6pt;">${st.full_name_ar}</td>
            <td>${st.religion || '—'}</td>
            <td style="direction: ltr;">${st.birth_date || '—'}</td>
            <td style="font-family: monospace; font-size: 8.5pt;">${st.national_id || '—'}</td>
            <td>${st.enrollment_status || 'منقول'}</td>
            <td style="font-size: 8.5pt;">${st.is_merged ? 'دمج' : '—'}</td>
          </tr>
        `).join('');
      }

      return `
        <div class="class-page" style="${!isLast ? 'page-break-after: always; break-after: page;' : ''}">
          <div class="hd-box">
            <div class="hd-r">
              <div>محافظة: <strong>${gov}</strong></div>
              <div>إدارة: <strong>${cleanAdmin} التعليمية</strong></div>
              <div>مدرسة: <strong>${cleanSchool}</strong></div>
            </div>
            <div class="hd-c">
              <h2>قائمة أسماء طلاب فصل: ${c.class_name}</h2>
              <div class="hd-yr">${gradeLabel} — للعام الدراسي: ${currentAcademicYear} م</div>
            </div>
            <div class="hd-l">
              ${logo ? `<img src="${logo}" alt="شعار" />` : '<div class="logo-box">شعار المدرسة</div>'}
              <div>التاريخ: ${dateStr}</div>
            </div>
          </div>

          <table style="${(printFormat === 'attendance' && attendanceSubMode === 'monthly') || printFormat === 'simple' ? 'table-layout: fixed; width: 100%;' : ''}">
            <thead>
              ${tableHeadHtml}
            </thead>
            <tbody>
              ${tableRowsHtml.length > 0 ? tableRowsHtml : `<tr><td colspan="8" style="padding: 15pt; color: #666;">لا يوجد طلاب مسكنين في هذا الفصل حالياً.</td></tr>`}
            </tbody>
          </table>

          <table class="stats-mini-table">
            <tr>
              <td style="background: #f1f5f9; font-weight: 800; width: 20%;">إحصائية الفصل:</td>
              <td>بنين: <strong>${males}</strong></td>
              <td>بنات: <strong>${females}</strong></td>
              <td>مسلم: <strong>${muslims}</strong></td>
              <td>مسيحي: <strong>${christians}</strong></td>
              <td style="background: #e2e8f0; font-weight: 900;">الإجمالي: <strong>${total} طالب</strong></td>
            </tr>
          </table>

          <table class="sigs-table">
            <tr>
              <td><div>رائد الفصل</div><div class="sig-line"></div></td>
              <td><div>مسؤول شؤون الطلاب والإحصاء</div><div class="sig-line"></div></td>
              <td><div>وكيل شؤون الطلاب والتعليم</div><div class="sig-line"></div></td>
              <td><div>مدير المدرسة (يعتمد)</div><div class="sig-line"></div></td>
            </tr>
          </table>
        </div>
      `;
    };

    const allPagesHtml = classesToPrint.map((c, idx) => generateClassPageHtml(c, idx === classesToPrint.length - 1)).join('');

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8" />
          <title>${docTitle}</title>
          <style>
            @page {
              size: A4 ${printOrientation};
              margin: 10mm 12mm 12mm 12mm;
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Calibri', 'Segoe UI', Tahoma, Arial, sans-serif;
              font-size: 9.5pt;
              color: #000;
              background: #fff;
              direction: rtl;
            }
            .class-page {
              width: 100%;
              min-height: 98vh;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .hd-box {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2pt solid #000;
              padding-bottom: 6pt;
              margin-bottom: 10pt;
            }
            .hd-r { text-align: right; font-size: 11pt; font-weight: 700; line-height: 1.45; min-width: 55mm; }
            .hd-c { text-align: center; flex: 1; }
            .hd-c h2 { font-size: 16pt; font-weight: 900; text-decoration: underline; margin-bottom: 2pt; color: #000; }
            .hd-yr { font-size: 11.5pt; font-weight: 800; text-decoration: underline; }
            .hd-l { text-align: left; min-width: 55mm; font-size: 9.5pt; font-weight: 600; }
            .hd-l img { max-height: 38pt; max-width: 75pt; object-fit: contain; margin-bottom: 2pt; }
            .logo-box { display: inline-block; border: 1pt dashed #999; padding: 2pt 6pt; font-size: 9pt; }

            table {
              width: 100%;
              border-collapse: collapse;
              border: 1.5pt solid #000;
              margin-bottom: 8pt;
              font-size: 9.5pt;
              text-align: center;
            }
            th, td {
              border: 1pt solid #000;
              padding: 3.5pt 3pt;
            }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }

            .stats-mini-table {
              width: 100%;
              border-collapse: collapse;
              border: 1pt solid #000;
              font-size: 9pt;
              text-align: center;
              margin-bottom: 15pt;
            }
            .stats-mini-table td { border: 1pt solid #000; padding: 3pt; }

            .sigs-table {
              width: 100%;
              border-collapse: collapse;
              border: none;
              margin-top: 10pt;
              font-size: 10pt;
              font-weight: 800;
              text-align: center;
            }
            .sigs-table td { border: none; padding: 2pt; }
            .sig-line { width: 70%; height: 1pt; border-bottom: 1pt dotted #000; margin: 18pt auto 0; }
          </style>
        </head>
        <body>
          ${allPagesHtml}
        </body>
      </html>
    `);
    doc.close();
    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 300);
  };

  return (
    <div className="students-container" style={{ maxWidth: '100%', padding: '20px 24px', direction: 'rtl' }}>
      
      {/* ══ TOP BAR ════════════════════════════════════════════════════ */}
      <div className="page-header" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {onBack && (
            <button className="btn-icon" onClick={onBack} title="العودة">
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h1 className="page-title" style={{ fontSize: 22, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>🏫</span> منظومة التسكين وإعادة التسكين الذكية
              <span style={{ fontSize: 12, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', padding: '4px 12px', borderRadius: 20, fontWeight: 800 }}>
                Smart Placement Suite
              </span>
            </h1>
            <p className="page-subtitle" style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              بيئة عمل تفاعلية متكاملة لتسكين الطلاب، النقل بين الفصول، التبديل المباشر، والتوزيع الآلي المتوازن
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {historyStack.length > 0 && (
            <button className="btn-secondary" onClick={handleUndo} title="تراجع عن آخر خطوة (Ctrl+Z)" style={{ gap: 6, padding: '8px 14px' }}>
              <Undo2 size={15} /> تراجع
            </button>
          )}

          <button
            className="btn-primary"
            style={{
              padding: '9px 20px',
              gap: 8,
              fontSize: 13.5,
              fontWeight: 800,
              background: pendingCount > 0 ? 'linear-gradient(135deg, #10b981, #059669)' : undefined,
              boxShadow: pendingCount > 0 ? '0 4px 14px rgba(16,185,129,0.3)' : 'none'
            }}
            disabled={saving || pendingCount === 0}
            onClick={handleSaveAll}
          >
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            {pendingCount > 0 ? `💾 حفظ التعديلات (${pendingCount})` : '💾 التغييرات محفوظة'}
          </button>
        </div>
      </div>

      {/* ══ NOTIFICATIONS ═════════════════════════════════════════════ */}
      {error && (
        <div className="alert alert-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={17} /> {error}
          </div>
          <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setError('')}>✕</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={17} /> {success}
          </div>
          <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setSuccess('')}>✕</button>
        </div>
      )}

      {/* ══ TOP FILTERS BAR ═══════════════════════════════════════════ */}
      <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', background: 'var(--glass-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={16} color="var(--text-secondary)" />
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>التصفية:</span>
        </div>

        {/* Section */}
        <select
          className="filter-select"
          style={{ width: 140, fontSize: 12.5 }}
          value={filters.sectionId}
          onChange={e => setFilters(f => ({ ...f, sectionId: e.target.value, stageId: '', gradeId: '' }))}
        >
          <option value="">كل الأقسام</option>
          {formOpts.sections?.map(s => <option key={s.id} value={s.id}>{s.section_name_ar || s.name}</option>)}
        </select>

        {/* Stage */}
        <select
          className="filter-select"
          style={{ width: 140, fontSize: 12.5 }}
          value={filters.stageId}
          onChange={e => setFilters(f => ({ ...f, stageId: e.target.value, gradeId: '' }))}
        >
          <option value="">اختر المرحلة...</option>
          {filteredStages.map(st => <option key={st.id} value={st.id}>{st.stage_name_ar || st.name}</option>)}
        </select>

        {/* Grade */}
        <select
          className="filter-select"
          style={{ width: 150, fontSize: 12.5, fontWeight: 700, borderColor: '#6366f1' }}
          value={filters.gradeId}
          onChange={e => setFilters(f => ({ ...f, gradeId: e.target.value }))}
        >
          <option value="">اختر الصف الدراسي...</option>
          {filteredGrades.map(g => <option key={g.id} value={g.id}>{g.grade_name_ar || g.name}</option>)}
        </select>

        {/* Academic Year */}
        <select
          className="filter-select"
          style={{ width: 150, fontSize: 12.5 }}
          value={filters.academicYearId}
          onChange={e => setFilters(f => ({ ...f, academicYearId: e.target.value }))}
        >
          {formOpts.academicYears?.map(y => (
            <option key={y.id} value={y.id}>{y.name} {y.is_current ? '⭐ (الحالي)' : ''}</option>
          ))}
        </select>

        <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12, gap: 6, marginRight: 'auto' }} onClick={() => { loadClassrooms(); loadStudents(); }}>
          <RefreshCw size={13} className={loading ? 'spin' : ''} /> تحديث البيانات
        </button>
      </div>

      {/* ══ FAIRNESS & CAPACITY RADAR BAR ════════════════════════════ */}
      {filters.gradeId && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 18 }}>
          <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontSize: 20 }}>
              👥
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>إجمالي الطلاب بالصف</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)' }}>{students.length} طالب</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: 20 }}>
              🏫
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>المسكنين بفصولهم</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981' }}>{students.length - unassignedCount} طالب</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: unassignedCount > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: unassignedCount > 0 ? '#ef4444' : '#10b981', fontSize: 20 }}>
              {unassignedCount > 0 ? '⚠️' : '✅'}
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>غير المسكنين</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: unassignedCount > 0 ? '#ef4444' : '#10b981' }}>
                {unassignedCount} طالب
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', fontSize: 20 }}>
              📊
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>عدد الفصول المعتمدة</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#f59e0b' }}>
                {classrooms.length} فصل ({classrooms.length > 0 ? Math.round((students.length - unassignedCount) / classrooms.length) : 0} ط/ف)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ WORKSPACE TABS SELECTOR ══════════════════════════════════ */}
      {filters.gradeId && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, borderBottom: '2px solid #e2e8f0', paddingBottom: 6 }}>
          <button
            onClick={() => setActiveTab('workspace')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px 10px 0 0',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: 13.5,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: activeTab === 'workspace' ? '#6366f1' : 'transparent',
              color: activeTab === 'workspace' ? '#fff' : 'var(--text-secondary)',
              boxShadow: activeTab === 'workspace' ? '0 4px 12px rgba(99,102,241,0.25)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            <Grid size={16} /> 📊 بيئة العمل التفاعلية المزدوجة
          </button>

          <button
            onClick={() => setActiveTab('kanban')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px 10px 0 0',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: 13.5,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: activeTab === 'kanban' ? '#6366f1' : 'transparent',
              color: activeTab === 'kanban' ? '#fff' : 'var(--text-secondary)',
              boxShadow: activeTab === 'kanban' ? '0 4px 12px rgba(99,102,241,0.25)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            <ArrowLeftRight size={16} /> 🖱️ لوحة السحب والإفلات الذكية
          </button>

          <button
            onClick={() => setActiveTab('wizard')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px 10px 0 0',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: 13.5,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: activeTab === 'wizard' ? '#6366f1' : 'transparent',
              color: activeTab === 'wizard' ? '#fff' : 'var(--text-secondary)',
              boxShadow: activeTab === 'wizard' ? '0 4px 12px rgba(99,102,241,0.25)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            <Sparkles size={16} /> 🤖 معالج التوزيع الآلي المتوازن
          </button>
        </div>
      )}

      {/* ══ MAIN BODY ═════════════════════════════════════════════════ */}
      {!filters.gradeId ? (
        <div className="glass-panel" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
          <BookOpen size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>اختر الصف الدراسي للبدء</h3>
          <p style={{ fontSize: 13 }}>يرجى تحديد المرحلة والصف الدراسي من الشريط العلوي لعرض الفصول وتسكين الطلاب.</p>
        </div>
      ) : loading ? (
        <div className="glass-panel" style={{ padding: 60, textAlign: 'center' }}>
          <Loader2 size={36} className="spin" style={{ margin: '0 auto 16px', color: '#6366f1' }} />
          <div style={{ fontSize: 14, fontWeight: 700 }}>جاري تحميل بيانات الطلاب والفصول...</div>
        </div>
      ) : (
        <div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* TAB 1: DUAL-PANE INTERACTIVE WORKSPACE                     */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === 'workspace' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              
              {/* ── Top Classroom Selector Strip (Cards) ── */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: '#1e293b' }}>
                    🏫 بطاقات الفصول الدراسية ({classrooms.length} فصول)
                  </h3>
                  <span style={{ fontSize: 11.5, color: '#64748b' }}>انقر على أي فصل لاستعراض طلابه وتعديلهم في الجدول أدناه</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                  {classrooms.map(c => {
                    const stat = getClassroomStats(c.id);
                    const maxCap = Math.min(distOptions.maxCapacity || 49, c.capacity || 49);
                    const percent = Math.min(100, Math.round((stat.count / maxCap) * 100));
                    const isSelected = String(inspectorClassId) === String(c.id);

                    return (
                      <div
                        key={c.id}
                        onClick={() => { setInspectorClassId(String(c.id)); setSelectedAssigned(new Set()); }}
                        className="glass-panel stat-card"
                        style={{
                          padding: 14,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          cursor: 'pointer',
                          border: isSelected ? '2.5px solid #6366f1' : '1px solid var(--border-color)',
                          boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.25), 0 6px 16px rgba(99,102,241,0.12)' : 'none',
                          background: isSelected ? 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(99,102,241,0.02))' : undefined,
                          transform: isSelected ? 'scale(1.015)' : 'none',
                          transition: 'all 0.15s ease-in-out'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h4 style={{ fontSize: 15, fontWeight: 900, color: isSelected ? '#4338ca' : 'var(--text-primary)', margin: 0 }}>
                              🏫 {c.class_name}
                            </h4>
                            {isSelected && (
                              <span style={{ fontSize: 9.5, background: '#6366f1', color: '#fff', padding: '2px 6px', borderRadius: 6, fontWeight: 800 }}>
                                النشط
                              </span>
                            )}
                          </div>
                          <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 800,
                            background: percent >= 100 ? '#fef2f2' : 'var(--bg-secondary)',
                            color: percent >= 100 ? '#ef4444' : 'var(--text-secondary)'
                          }}>
                            {stat.count}/{maxCap}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div style={{ width: '100%', height: 4.5, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              width: `${percent}%`, height: '100%',
                              background: percent >= 100 ? '#ef4444' : percent >= 80 ? '#f59e0b' : '#10b981',
                              borderRadius: 3
                            }} />
                          </div>
                        </div>

                        {/* Stats Breakdown */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, textAlign: 'center', fontSize: 10, paddingTop: 4, borderTop: '1px solid var(--border-light)' }}>
                          <div><span style={{ fontWeight: 800, color: '#2563eb' }}>{stat.males}</span> <span style={{ color: 'var(--text-muted)' }}>👦</span></div>
                          <div><span style={{ fontWeight: 800, color: '#db2777' }}>{stat.females}</span> <span style={{ color: 'var(--text-muted)' }}>👧</span></div>
                          <div><span style={{ fontWeight: 800, color: '#0891b2' }}>{stat.muslims}</span> <span style={{ color: 'var(--text-muted)' }}>🕌</span></div>
                          <div><span style={{ fontWeight: 800, color: '#7c3aed' }}>{stat.christians}</span> <span style={{ color: 'var(--text-muted)' }}>✝️</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Dual Workspace: Left (Unassigned) + Right (Classroom Roster) ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16, alignItems: 'start' }}>
                
                {/* ══ LEFT PANE: Unassigned Pool ══ */}
                <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', border: '1.5px solid #fca5a5', borderRadius: 12 }}>
                  
                  {/* Header */}
                  <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.04))', borderBottom: '1px solid #fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: 13.5, fontWeight: 900, color: '#b91c1c', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>⚠️</span> غير المسكنين ({unassignedStudents.length})
                      </h4>
                      <p style={{ fontSize: 11, color: '#7f1d1d', margin: '2px 0 0' }}>حدد الطلاب ثم اختر الفصل لنقلهم</p>
                    </div>

                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 8px', fontSize: 11, fontWeight: 700 }}
                      onClick={() => {
                        if (selectedUnassigned.size === unassignedStudents.length && unassignedStudents.length > 0) {
                          setSelectedUnassigned(new Set());
                        } else {
                          setSelectedUnassigned(new Set(unassignedStudents.map(s => s.id)));
                        }
                      }}
                    >
                      {selectedUnassigned.size === unassignedStudents.length && unassignedStudents.length > 0 ? 'إلغاء' : 'تحديد الكل'}
                    </button>
                  </div>

                  {/* Filters */}
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #fee2e2', display: 'flex', gap: 6 }}>
                    <div className="search-box" style={{ flex: 1 }}>
                      <Search size={13} className="search-icon" />
                      <input
                        className="search-input"
                        style={{ padding: '5px 30px 5px 8px', fontSize: 11.5 }}
                        placeholder="بحث بالاسم أو الكود..."
                        value={unassignedSearch}
                        onChange={e => setUnassignedSearch(e.target.value)}
                      />
                    </div>
                    <select
                      className="filter-select"
                      style={{ width: 85, fontSize: 11.5, padding: '4px' }}
                      value={unassignedGenderFilter}
                      onChange={e => setUnassignedGenderFilter(e.target.value)}
                    >
                      <option value="all">الكل</option>
                      <option value="ذكر">👦 ذكور</option>
                      <option value="أنثى">👧 إناث</option>
                    </select>
                  </div>

                  {/* Batch Move Action */}
                  <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.04)', borderBottom: '1px solid #fee2e2' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select
                        className="filter-select"
                        style={{ flex: 1, fontSize: 11.5 }}
                        value={unassignedTargetClassId}
                        onChange={e => setUnassignedTargetClassId(e.target.value)}
                      >
                        <option value="">اختر الفصل للتسكين...</option>
                        {classrooms.map(c => (
                          <option key={c.id} value={c.id}>فصل {c.class_name} ({getClassroomStats(c.id).count}/49)</option>
                        ))}
                      </select>
                      <button
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: 11.5, fontWeight: 800, whiteSpace: 'nowrap' }}
                        disabled={selectedUnassigned.size === 0 || !unassignedTargetClassId}
                        onClick={() => handleBatchAssignUnassigned(unassignedTargetClassId)}
                      >
                        تسكين ({selectedUnassigned.size})
                      </button>
                    </div>
                  </div>

                  {/* List */}
                  <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                    {unassignedStudents.map(s => {
                      const isChecked = selectedUnassigned.has(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            const next = new Set(selectedUnassigned);
                            if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                            setSelectedUnassigned(next);
                          }}
                          style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid #f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            background: isChecked ? 'rgba(99,102,241,0.08)' : '#fff'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input type="checkbox" checked={isChecked} onChange={() => {}} onClick={e => e.stopPropagation()} />
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>{s.full_name_ar}</div>
                              <div style={{ fontSize: 10.5, color: '#64748b' }}>
                                {s.gender === 'ذكر' ? '👦 ذكر' : '👧 أنثى'} • {s.religion === 'مسلم' ? '🕌 مسلم' : '✝️ مسيحي'}
                              </div>
                            </div>
                          </div>
                          
                          {/* 1-Click Quick Move Dropdown */}
                          <select
                            className="form-control"
                            style={{ fontSize: 11, padding: '3px 6px', width: 90, height: 26, fontWeight: 700 }}
                            value=""
                            onClick={e => e.stopPropagation()}
                            onChange={e => handleDirectMoveStudent(s.id, e.target.value)}
                          >
                            <option value="">تسكين في...</option>
                            {classrooms.map(cls => (
                              <option key={cls.id} value={cls.id}>فصل {cls.class_name}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}

                    {unassignedStudents.length === 0 && (
                      <div style={{ padding: 36, textAlign: 'center', color: '#10b981', fontSize: 12.5, fontWeight: 700 }}>
                        🎉 جميع طلاب الصف مسكنون بالكامل!
                      </div>
                    )}
                  </div>
                </div>

                {/* ══ RIGHT PANE: Classroom Roster & Interactive Table ══ */}
                {activeInspectorClass ? (
                  <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', border: '1.5px solid #cbd5e1', borderRadius: 12 }}>
                    
                    {/* Header */}
                    <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                          🏫 كشف طلاب فصل ({activeInspectorClass.class_name})
                          <span style={{ fontSize: 12, background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 12, fontWeight: 800 }}>
                            {inspectorStudents.length} طالب
                          </span>
                        </h3>
                        <p style={{ fontSize: 11.5, color: '#64748b', margin: '3px 0 0' }}>
                          تعديل فوري للفصل، تبديل بين طالبين، ونقل جماعي
                        </p>
                      </div>

                      {/* Top Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: 12, gap: 6, fontWeight: 700 }}
                          onClick={() => handlePrintRoster(activeInspectorClass.id)}
                          title="طباعة كشف الفصل الرسمي"
                        >
                          <Printer size={14} /> طباعة الكشف
                        </button>

                        <select
                          className="filter-select"
                          style={{ fontSize: 12, fontWeight: 700, padding: '5px 8px', width: 160 }}
                          value={transferTargetClassId}
                          onChange={e => setTransferTargetClassId(e.target.value)}
                        >
                          <option value="">نقل المحددين إلى...</option>
                          {classrooms.filter(c => String(c.id) !== String(inspectorClassId)).map(c => (
                            <option key={c.id} value={c.id}>فصل {c.class_name} ({getClassroomStats(c.id).count}/49)</option>
                          ))}
                        </select>
                        <button
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: 12, fontWeight: 800 }}
                          disabled={selectedAssigned.size === 0 || !transferTargetClassId}
                          onClick={() => handleBatchTransferAssigned(transferTargetClassId)}
                        >
                          نقل ({selectedAssigned.size})
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: 11.5, borderColor: '#fca5a5', color: '#ef4444', fontWeight: 700 }}
                          disabled={selectedAssigned.size === 0}
                          onClick={handleBatchUnassignAssigned}
                          title="فك تسكين المحددين"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Search & Sort inside class */}
                    <div style={{ padding: '8px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div className="search-box" style={{ flex: 1, maxWidth: 300 }}>
                        <Search size={13} className="search-icon" />
                        <input
                          className="search-input"
                          style={{ padding: '5px 30px 5px 8px', fontSize: 12 }}
                          placeholder="بحث داخل طلاب هذا الفصل..."
                          value={assignedSearch}
                          onChange={e => setAssignedSearch(e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          onClick={() => setAssignedSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                          style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 700 }}
                        >
                          {assignedSortOrder === 'asc' ? '↑ أبجدي (أ→ي)' : '↓ أبجدي (ي→أ)'}
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700 }}
                          onClick={() => {
                            if (selectedAssigned.size === inspectorStudents.length && inspectorStudents.length > 0) {
                              setSelectedAssigned(new Set());
                            } else {
                              setSelectedAssigned(new Set(inspectorStudents.map(s => s.id)));
                            }
                          }}
                        >
                          {selectedAssigned.size === inspectorStudents.length && inspectorStudents.length > 0 ? 'إلغاء' : 'تحديد كل طلاب الفصل'}
                        </button>
                      </div>
                    </div>

                    {/* Table */}
                    <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                      <table className="students-table" style={{ width: '100%', fontSize: 12 }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>
                          <tr>
                            <th style={{ width: 36, textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={inspectorStudents.length > 0 && selectedAssigned.size === inspectorStudents.length}
                                onChange={() => {
                                  if (selectedAssigned.size === inspectorStudents.length) setSelectedAssigned(new Set());
                                  else setSelectedAssigned(new Set(inspectorStudents.map(s => s.id)));
                                }}
                              />
                            </th>
                            <th style={{ width: 40, textAlign: 'center' }}>م</th>
                            <th style={{ width: 100 }}>كود الطالب</th>
                            <th style={{ textAlign: 'right' }}>اسم الطالب</th>
                            <th style={{ width: 130 }}>الرقم القومي</th>
                            <th style={{ width: 75, textAlign: 'center' }}>النوع</th>
                            <th style={{ width: 75, textAlign: 'center' }}>الديانة</th>
                            <th style={{ width: 160, textAlign: 'center' }}>تعديل الفصل مباشرة</th>
                            <th style={{ width: 110, textAlign: 'center' }}>إجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inspectorStudents.map((s, idx) => {
                            const isChecked = selectedAssigned.has(s.id);
                            const currentClassId = getStudentClassId(s);

                            return (
                              <tr
                                key={s.id}
                                className="table-row"
                                style={{
                                  background: isChecked ? 'rgba(99,102,241,0.06)' : (pendingChanges[s.id] !== undefined ? '#fffbeb' : undefined)
                                }}
                              >
                                <td style={{ textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      const next = new Set(selectedAssigned);
                                      if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                                      setSelectedAssigned(next);
                                    }}
                                  />
                                </td>
                                <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 700 }}>{idx + 1}</td>
                                <td><code style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 4px', borderRadius: 4 }}>{s.student_code || '—'}</code></td>
                                <td style={{ fontWeight: 800, color: '#0f172a' }}>{s.full_name_ar}</td>
                                <td style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#475569' }}>{s.national_id || '—'}</td>
                                <td style={{ textAlign: 'center', fontWeight: 700 }}>
                                  {s.gender === 'ذكر' ? <span style={{ color: '#2563eb' }}>👦 ذكر</span> : <span style={{ color: '#db2777' }}>👧 أنثى</span>}
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 700 }}>
                                  {s.religion === 'مسلم' ? '🕌 مسلم' : '✝️ مسيحي'}
                                </td>
                                <td>
                                  <select
                                    className="form-control"
                                    style={{
                                      fontSize: 11.5,
                                      fontWeight: 800,
                                      padding: '3px 6px',
                                      background: pendingChanges[s.id] !== undefined ? '#fef3c7' : '#fff',
                                      borderColor: pendingChanges[s.id] !== undefined ? '#f59e0b' : '#cbd5e1'
                                    }}
                                    value={String(currentClassId)}
                                    onChange={e => handleDirectMoveStudent(s.id, e.target.value)}
                                  >
                                    {classrooms.map(cls => (
                                      <option key={cls.id} value={String(cls.id)}>فصل {cls.class_name}</option>
                                    ))}
                                    <option value="unassigned">❌ فك التسكين (غير مسكن)</option>
                                  </select>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                    <button
                                      className="btn-secondary"
                                      onClick={() => openSwapForStudent(s)}
                                      style={{ padding: '3px 6px', fontSize: 10.5, fontWeight: 700, gap: 3 }}
                                      title="تبديل مع طالب في فصل آخر"
                                    >
                                      <ArrowLeftRight size={11} /> تبديل
                                    </button>
                                    <button
                                      onClick={() => handleDirectUnassign(s.id)}
                                      style={{
                                        padding: '3px 6px',
                                        fontSize: 10.5,
                                        borderRadius: 5,
                                        border: '1px solid #fca5a5',
                                        background: '#fff',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        fontWeight: 700
                                      }}
                                      title="فك التسكين"
                                    >
                                      فك
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}

                          {inspectorStudents.length === 0 && (
                            <tr>
                              <td colSpan={9} style={{ padding: 36, textAlign: 'center', color: '#94a3b8', fontSize: 12.5 }}>
                                لا يوجد طلاب في هذا الفصل يطابقون شروط البحث.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="glass-panel" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                    اختر فصلاً من البطاقات أعلاه لعرض طلابه.
                  </div>
                )}

              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* TAB 2: DRAG AND DROP KANBAN                                */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === 'kanban' && (
            <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16 }}>
              {/* Left: Draggable Unassigned */}
              <div className="glass-panel" style={{ padding: 14, display: 'flex', flexDirection: 'column', height: 680 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>
                    📚 قائمة الطلاب ({unassignedStudents.length})
                  </h4>
                  <span style={{ fontSize: 11, color: '#64748b' }}>اسحب وأفلت</span>
                </div>

                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <div className="search-box" style={{ flex: 1 }}>
                    <Search size={13} className="search-icon" />
                    <input
                      className="search-input"
                      style={{ padding: '5px 30px 5px 8px', fontSize: 11.5 }}
                      placeholder="بحث..."
                      value={unassignedSearch}
                      onChange={e => setUnassignedSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {unassignedStudents.map(s => (
                    <div
                      key={s.id}
                      draggable={true}
                      onDragStart={e => handleDragStart(e, s)}
                      style={{
                        padding: '9px 12px',
                        borderRadius: 8,
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--border-color)',
                        cursor: 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        userSelect: 'none'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 800 }}>{s.full_name_ar}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {s.gender === 'ذكر' ? '👦 ذكر' : '👧 أنثى'} • {s.religion === 'مسلم' ? '🕌' : '✝️'}
                        </div>
                      </div>
                      <span style={{ opacity: 0.4 }}>⣿</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Drop Targets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12, maxHeight: 680, overflowY: 'auto' }}>
                {classrooms.map(c => {
                  const stat = getClassroomStats(c.id);
                  const maxCap = Math.min(distOptions.maxCapacity || 49, c.capacity || 49);
                  const isFull = stat.count >= maxCap;
                  const isDragOver = dragOverClassId === c.id;

                  return (
                    <div
                      key={c.id}
                      onDragOver={e => handleDragOver(e, c)}
                      onDragLeave={handleDragLeave}
                      onDrop={e => handleDropOnClassroom(e, c)}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        background: isDragOver ? (isFull ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99,102,241,0.15)') : 'var(--glass-bg)',
                        border: isDragOver ? (isFull ? '2px solid #ef4444' : '2px solid #6366f1') : '1px solid var(--border-color)',
                        minHeight: 180
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontSize: 15, fontWeight: 900, margin: 0 }}>🏫 {c.class_name}</h4>
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 8, fontWeight: 800,
                          background: isFull ? '#fee2e2' : 'rgba(16,185,129,0.15)',
                          color: isFull ? '#ef4444' : '#10b981'
                        }}>
                          {stat.count}/{maxCap}
                        </span>
                      </div>

                      <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                        <span>👦 {stat.males}</span>
                        <span>👧 {stat.females}</span>
                        <span>🕌 {stat.muslims}</span>
                        <span>✝️ {stat.christians}</span>
                      </div>

                      <div style={{ marginTop: 'auto', textAlign: 'center', padding: '14px 0', border: '2px dashed #cbd5e1', borderRadius: 8, color: '#94a3b8', fontSize: 11.5 }}>
                        {isDragOver ? (isFull ? '❌ الفصل مكتمل' : '📥 أفلت للتسكين') : '⬇️ أسقط الطالب هنا'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* TAB 3: SMART BALANCING & AUTO-DISTRIBUTION WIZARD          */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === 'wizard' && (
            <div className="glass-panel" style={{ padding: 24, maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#4338ca' }}>
                  <Sparkles size={20} /> معالج التوزيع والتسكين الآلي العادل
                </h3>
                <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
                  حدد معايير التوزيع المتوازن ليقوم النظام بتوزيع الطلاب رياضياً بالتساوي على الفصول الـ {classrooms.length}
                </p>
              </div>

              {/* Options Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                
                {/* Rule 1: Gender Mode */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, color: '#1e293b' }}>👫 معيار النوع (الجنسين)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
                    {[
                      ['mixed', '🤝 فصول مشتركة بنسب متساوية (50% ذكور / 50% إناث)'],
                      ['separate', '🚫 فصول منفصلة تماماً (بنين بمفردهم / بنات بمفردهن)']
                    ].map(([val, lbl]) => (
                      <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="genderMode"
                          checked={distOptions.genderMode === val}
                          onChange={() => setDistOptions(o => ({ ...o, genderMode: val }))}
                        />
                        {lbl}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Rule 2: Religion Mode */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, color: '#1e293b' }}>🕌✝️ معيار التوزيع النسبي الديني</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
                    {[
                      ['mixed', '⚖️ توزيع نسبي متساوٍ (منع تكدس الطلاب المسيحيين في فصل واحد)'],
                      ['proportional', '🎯 توزيع عشوائي طبيعي حسب الأبجدية']
                    ].map(([val, lbl]) => (
                      <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="religionMode"
                          checked={distOptions.religionMode === val}
                          onChange={() => setDistOptions(o => ({ ...o, religionMode: val }))}
                        />
                        {lbl}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Rule 3: Scope */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, color: '#1e293b' }}>🔄 نطاق التوزيع</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
                    {[
                      ['unassigned', '➕ توزيع الطلاب غير المسكنين فقط (الحفاظ على المسكنين)'],
                      ['all', '♻️ إعادة توزيع الجميع من الصفر (Reset وتوزيع كامل المدرسة)']
                    ].map(([val, lbl]) => (
                      <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="redistMode"
                          checked={distOptions.redistMode === val}
                          onChange={() => setDistOptions(o => ({ ...o, redistMode: val }))}
                        />
                        {lbl}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Rule 4: Special Controls */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, color: '#1e293b' }}>⚙️ خيارات إضافية</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={distOptions.alphabetical}
                        onChange={e => setDistOptions(o => ({ ...o, alphabetical: e.target.checked }))}
                      />
                      🔤 توازن الحروف الأبجدية بين الفصول
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={distOptions.keepSiblings}
                        onChange={e => setDistOptions(o => ({ ...o, keepSiblings: e.target.checked }))}
                      />
                      ⭐ لم شمل التوائم والإخوة في نفس الفصل
                    </label>
                  </div>
                </div>

              </div>

              {/* Start Auto Distribution Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  className="btn-primary"
                  style={{ padding: '12px 30px', fontSize: 15, fontWeight: 900, gap: 10 }}
                  onClick={handleAutoDistribute}
                >
                  <Shuffle size={18} /> 🚀 بدء تشغيل خوارزمية التوزيع الذكي
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ══ STUDENT SWAP MODAL (التبديل المباشر بين طالبين) ═════════ */}
      {swapModalOpen && swapStudentA && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: 520, padding: 24, borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowLeftRight size={18} color="#6366f1" /> التبديل الفوري بين طالبين (Swap)
              </h3>
              <button className="btn-icon" onClick={() => setSwapModalOpen(false)}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 14, fontSize: 13 }}>
              <div><strong>الطالب الأول:</strong> {swapStudentA.full_name_ar}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                الفصل الحالي: {classrooms.find(c => String(c.id) === String(getStudentClassId(swapStudentA)))?.class_name || 'غير مسكن'}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 800, marginBottom: 6 }}>
                اختر الطالب الثاني للتبديل معه:
              </label>
              <select
                className="filter-select"
                style={{ width: '100%', fontSize: 12.5, padding: '8px 10px' }}
                value={swapStudentBId}
                onChange={e => setSwapStudentBId(e.target.value)}
              >
                <option value="">اختر الطالب البديل من أي فصل آخر...</option>
                {students
                  .filter(s => s.id !== swapStudentA.id && String(getStudentClassId(s)) !== String(getStudentClassId(swapStudentA)))
                  .map(s => {
                    const cName = classrooms.find(c => String(c.id) === String(getStudentClassId(s)))?.class_name || 'غير مسكن';
                    return (
                      <option key={s.id} value={s.id}>
                        {s.full_name_ar} — (فصل: {cName})
                      </option>
                    );
                  })}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setSwapModalOpen(false)}>إلغاء</button>
              <button
                className="btn-primary"
                disabled={!swapStudentBId}
                onClick={handleExecuteSwap}
                style={{ fontWeight: 800 }}
              >
                🔄 تنفيذ التبديل الفوري
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PRINT ROSTER MODAL (خيارات طباعة قوائم الفصول فردي / جماعي) ════════════ */}
      {printModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(3px)' }}>
          <div className="modal-content" style={{ maxWidth: 680, padding: 24, borderRadius: 16, background: '#fff', direction: 'rtl', boxShadow: '0 20px 45px rgba(0,0,0,0.3)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1.5px solid #e2e8f0', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 17, fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#1e293b' }}>
                <Printer size={20} color="#059669" /> طباعة قوائم وتسكين الفصول المدرسية
              </h3>
              <button
                className="btn-icon"
                onClick={() => setPrintModalOpen(false)}
                style={{ borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            {/* Scope Selection: Individual vs Bulk */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                🎯 نطاق الطباعة:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setPrintScope('single')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: printScope === 'single' ? '2px solid #0284c7' : '1.5px solid #cbd5e1',
                    background: printScope === 'single' ? '#f0f9ff' : '#fff',
                    color: printScope === 'single' ? '#0369a1' : '#475569',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textAlign: 'right',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3
                  }}
                >
                  <span style={{ fontSize: 13.5 }}>📄 طباعة فصل محدد (فردي)</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>طباعة كشف الفصل الذي تختاره فقط</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintScope('grade_all')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: printScope === 'grade_all' ? '2px solid #059669' : '1.5px solid #cbd5e1',
                    background: printScope === 'grade_all' ? '#f0fdf4' : '#fff',
                    color: printScope === 'grade_all' ? '#166534' : '#475569',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textAlign: 'right',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3
                  }}
                >
                  <span style={{ fontSize: 13.5 }}>📚 طباعة كافة الفصول (جماعي)</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>كل فصل في ورقة مستقلة مع الترويسة والتذييل</span>
                </button>
              </div>
            </div>

            {/* If Single: Class Dropdown */}
            {printScope === 'single' && (
              <div style={{ marginBottom: 18, background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
                  اختر الفصل المراد طباعته:
                </label>
                <select
                  value={printClassId}
                  onChange={e => setPrintClassId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #94a3b8', fontSize: 13.5, fontWeight: 800, background: '#fff' }}
                >
                  {classrooms.map(c => {
                    const cnt = students.filter(s => String(getStudentClassId(s)) === String(c.id)).length;
                    return (
                      <option key={c.id} value={c.id}>
                        فصل: {c.class_name} ({cnt} طالب مسكن)
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Format Style */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                📋 نمط وشكل الكشف:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { id: 'detailed', label: 'كشف رسمي معتمد', desc: 'بالرقم القومي والميلاد' },
                  { id: 'attendance', label: 'كشف رصد وغياب', desc: 'أسبوعي / أسبوعين / شهري' },
                  { id: 'simple', label: 'كشف تعليق مبسط', desc: 'جدول مزدوج (صفحة واحدة)' }
                ].map(fmt => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => {
                      setPrintFormat(fmt.id);
                      if (fmt.id === 'attendance' && attendanceSubMode === 'monthly') {
                        setPrintOrientation('landscape');
                      } else if (fmt.id !== 'attendance') {
                        setPrintOrientation('portrait');
                      }
                    }}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 8,
                      border: printFormat === fmt.id ? '2px solid #6366f1' : '1px solid #cbd5e1',
                      background: printFormat === fmt.id ? '#eef2ff' : '#fff',
                      color: printFormat === fmt.id ? '#4338ca' : '#475569',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: 12.5 }}>{fmt.label}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{fmt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Attendance Sub-Modes */}
            {printFormat === 'attendance' && (
              <div style={{ marginBottom: 18, background: '#f0f9ff', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #bae6fd' }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: '#0369a1', marginBottom: 8 }}>
                  ⏱️ الفترة الزمنية لرصد الغياب (مطبوعة على صفحتين بسطور مريحة):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { id: 'weekly', label: '📅 أسبوعي (5 أيام)', orient: 'portrait', desc: 'الأحد - الخميس' },
                    { id: 'biweekly', label: '📅 أسبوعين (10 أيام)', orient: 'portrait', desc: 'أسبوعين متتاليين' },
                    { id: 'monthly', label: '🗓️ شهري (4 أسابيع بالعرض)', orient: 'landscape', desc: '20 يوماً بالعرض' }
                  ].map(sub => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setAttendanceSubMode(sub.id);
                        setPrintOrientation(sub.orient);
                      }}
                      style={{
                        padding: '8px 6px',
                        borderRadius: 8,
                        border: attendanceSubMode === sub.id ? '2px solid #0284c7' : '1px solid #93c5fd',
                        background: attendanceSubMode === sub.id ? '#0284c7' : '#fff',
                        color: attendanceSubMode === sub.id ? '#fff' : '#0369a1',
                        fontWeight: 800,
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: 12
                      }}
                    >
                      <div>{sub.label}</div>
                      <div style={{ fontSize: 9.5, opacity: 0.85, marginTop: 2 }}>{sub.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Orientation Selection */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: '#334155' }}>
                📐 اتجاه الصفحة المطبوعة:
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="print_orient"
                    value="portrait"
                    checked={printOrientation === 'portrait'}
                    onChange={() => setPrintOrientation('portrait')}
                  />
                  طولي (A4 Portrait)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="print_orient"
                    value="landscape"
                    checked={printOrientation === 'landscape'}
                    onChange={() => setPrintOrientation('landscape')}
                  />
                  عرضي (A4 Landscape)
                </label>
              </div>
            </div>

            {/* Summary Badge */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: 8, marginBottom: 20, fontSize: 12, color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>
                {printScope === 'single' ? '📄 سيتم إخراج ورقة واحدة للفصل المحدد' : `📚 سيتم إخراج ${classrooms.length} ورقة منفصلة لكافة الفصول`}
              </span>
              <span>✅ بخط كاليبري وترويسة ثلاثية معتمدة</span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                className="btn-secondary"
                onClick={() => setPrintModalOpen(false)}
                style={{ padding: '8px 18px', fontWeight: 700 }}
              >
                إلغاء
              </button>
              <button
                onClick={handleExecutePrintRosters}
                style={{
                  background: '#059669',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 24px',
                  fontWeight: 900,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(5,150,105,0.35)'
                }}
              >
                <Printer size={16} /> 🖨️ بدء الطباعة الآن
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ══ FLOATING TOAST NOTIFICATIONS (تنبيهات منبثقة عائمة مباشرة في منطقة العمل) ═════ */}
      <div style={{
        position: 'fixed',
        bottom: 24,
        left: 28,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 440,
        pointerEvents: 'none'
      }}>
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              padding: '12px 18px',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              pointerEvents: 'auto',
              boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
              background: t.type === 'error' ? '#fef2f2' : (t.type === 'success' ? '#f0fdf4' : '#eff6ff'),
              border: `1.5px solid ${t.type === 'error' ? '#f87171' : (t.type === 'success' ? '#4ade80' : '#60a5fa')}`,
              color: t.type === 'error' ? '#b91c1c' : (t.type === 'success' ? '#15803d' : '#1d4ed8'),
              animation: 'fadeIn 0.2s ease-in-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{t.type === 'error' ? '❌' : (t.type === 'success' ? '✅' : 'ℹ️')}</span>
              <span>{t.message}</span>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 900, fontSize: 14, opacity: 0.6 }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
