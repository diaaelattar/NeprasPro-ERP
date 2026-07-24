// ════════════════════════════════════════════════════════════════
//  ControlMainPage.jsx — Official Egyptian School Control Room Hub
// ════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, RefreshCw, Hash, Lock, BookOpen, Layers, 
  FileSpreadsheet, Award, CheckCircle2, Users, AlertCircle, Sparkles, Printer, Eye, EyeOff, KeyRound, Building2,
  Sliders, Calendar, Scale, ArrowUpRight, FileCheck, Check, Search, FileText, Download, CheckSquare
} from 'lucide-react';

const API_BASE = `http://${window.location.hostname}:3001/api/control`;

export default function ControlMainPage({
  externalActiveTab,
  setExternalActiveTab,
  externalSubTabSetup,
  setExternalSubTabSetup,
  externalSubTabTerm1,
  setExternalSubTabTerm1,
  externalSubTabTerm2,
  setExternalSubTabTerm2,
  externalSubTabSecondRound,
  setExternalSubTabSecondRound
}) {
  const [internalActiveTab, setInternalActiveTab] = useState('term1');
  const [internalSubTabSetup, setInternalSubTabSetup] = useState('subjects');
  const [internalSubTabTerm1, setInternalSubTabTerm1] = useState('work');
  const [internalSubTabTerm2, setInternalSubTabTerm2] = useState('work');
  const [internalSubTabSecondRound, setInternalSubTabSecondRound] = useState('seats');

  const activeTab = externalActiveTab || internalActiveTab;
  const setActiveTab = setExternalActiveTab || setInternalActiveTab;

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Sub-tabs states
  const subTabSetup = externalSubTabSetup || internalSubTabSetup;
  const setSubTabSetup = setExternalSubTabSetup || setInternalSubTabSetup;

  const subTabTerm1 = externalSubTabTerm1 || internalSubTabTerm1;
  const setSubTabTerm1 = setExternalSubTabTerm1 || setInternalSubTabTerm1;

  const subTabTerm2 = externalSubTabTerm2 || internalSubTabTerm2;
  const setSubTabTerm2 = setExternalSubTabTerm2 || setInternalSubTabTerm2;

  const subTabSecondRound = externalSubTabSecondRound || internalSubTabSecondRound;
  const setSubTabSecondRound = setExternalSubTabSecondRound || setInternalSubTabSecondRound;

  // Student Search
  const [searchQuery, setSearchQuery] = useState('');

  // Security & Secret Unmasking PIN Modal
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isSecretUnmasked, setIsSecretUnmasked] = useState(false);

  // Cascading Selection: Section -> Stage -> Grade
  const [sections, setSections] = useState([]);
  const [stages, setStages] = useState([]);
  const [grades, setGrades] = useState([]);
  
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [currentAcademicYearId, setCurrentAcademicYearId] = useState(1); // populated from backend

  // Control Data
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Form states
  const [seatForm, setSeatForm] = useState({ startSeatNumber: '1001', genderOrder: 'none' });
  
  // Secret Codes Full State
  const [secretMode, setSecretMode] = useState('equal'); // 'equal' | 'manual'
  const [equalGroupSize, setEqualGroupSize] = useState(30); // students per group
  const [equalStartCode, setEqualStartCode] = useState(5001); // starting secret code for each group (user sets per group)
  const [manualGroups, setManualGroups] = useState([
    { groupLabel: '1', count: 30, startCode: 5001 }
  ]);
  // Equal groups: auto-generated group configs (groupLabel + count + startCode editable by user)
  const [equalGroups, setEqualGroups] = useState([]); // populated after preview
  const [secretSummary, setSecretSummary] = useState(null); // { groups: [], students: [] }
  const [isPrintPinOpen, setIsPrintPinOpen] = useState(false);
  const [printPinInput, setPrintPinInput] = useState('');
  const [printReady, setPrintReady] = useState(false);
  const [printTerm, setPrintTerm] = useState(1);

  // Committees & Live Stats State
  const [committeesStats, setCommitteesStats] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [committeeForm, setCommitteeForm] = useState({
    distributionMode: 'equal',
    capacityPerCommittee: 20,
    manualCommittees: [
      { committeeName: 'لجنة (1)', buildingName: 'المبنى الرئيسي', roomNumber: 'قاعة (1)', capacity: 20 }
    ]
  });

  // Master Subjects Lookup State
  const [masterSubjects, setMasterSubjects] = useState([]);
  const [isNewMasterModalOpen, setIsNewMasterModalOpen] = useState(false);
  const [newMasterForm, setNewMasterForm] = useState({ subjectNameAr: '', subjectNameEn: '', category: 'أساسية' });

  // Subject Form & Controls
  const [subjectForm, setSubjectForm] = useState({
    id: null, subjectNameAr: '', subjectCode: '', subjectCategory: 'أساسية',
    term1WorkMark: 15, term1PracticalMark: 0, term1ExamMark: 35,
    term2WorkMark: 15, term2PracticalMark: 0, term2ExamMark: 35,
    passMark: 50, subjectPassPercent: 50,
    writtenPassMode: 'none', writtenPassMark: 0, actualConvertedMark: 0,
    attendanceRate: 85, isActivitySubject: false, isHighLevel: false,
    isExtraSubject: false, isAddedToTotal: true, isFailingSubject: true
  });

  // General Measurable Passing Rules State
  const [passingRules, setPassingRules] = useState({
    isEnabled: true,
    enableAttendanceRule: true,
    enableWrittenRule: true,
    enableSecondRoundRule: true,
    enableGraceRule: true,
    minAttendancePercent: 85,
    writtenPassPercent: 30,
    maxFailingSecondRound: 2,
    graceMarksPool: 5
  });

  useEffect(() => {
    fetchCascadingMetadata();
    fetchMasterSubjects();
  }, []);

  useEffect(() => {
    if (msg.text) {
      const timer = setTimeout(() => {
        setMsg({ type: '', text: '' });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [msg.text]);

  const fetchMasterSubjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/master-subjects`);
      const data = await res.json();
      if (data.success) setMasterSubjects(data.masterSubjects || []);
    } catch (e) {}
  };

  const handleCreateMasterSubject = async (e) => {
    e.preventDefault();
    if (!newMasterForm.subjectNameAr) return;
    try {
      const res = await fetch(`${API_BASE}/master-subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMasterForm)
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: data.message });
        setSubjectForm(prev => ({ ...prev, subjectNameAr: newMasterForm.subjectNameAr, subjectCode: data.subjectCode }));
        setIsNewMasterModalOpen(false);
        setNewMasterForm({ subjectNameAr: '', subjectNameEn: '', category: 'أساسية' });
        fetchMasterSubjects();
      } else {
        setMsg({ type: 'error', text: data.error });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'فشل تكويد المادة الجديدة.' });
    }
  };

  useEffect(() => {
    if (selectedGradeId) {
      fetchSubjects();
      fetchStudents();
      fetchPassingRules();
      fetchCommitteesStats();
    } else {
      setStudents([]);
      setSubjects([]);
      setCommitteesStats([]);
    }
  }, [selectedGradeId]);

  const fetchCommitteesStats = async () => {
    if (!selectedGradeId) return;
    try {
      const res = await fetch(`${API_BASE}/committees/stats?gradeId=${selectedGradeId}`);
      const data = await res.json();
      if (data.success) setCommitteesStats(data.stats || []);
    } catch (e) {}
  };

  const handleGenerateSeats = async (mode = 'overwrite') => {
    if (!selectedGradeId) return;
    try {
      const res = await fetch(`${API_BASE}/generate-seat-numbers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gradeId: selectedGradeId,
          startSeatNumber: parseInt(seatForm.startSeatNumber || 1001),
          genderOrder: seatForm.genderOrder || 'none',
          mode
        })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: data.message });
        fetchStudents();
        fetchCommitteesStats();
      } else {
        setMsg({ type: 'error', text: data.error });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'فشلت عملية توليد أرقام الجلوس.' });
    }
  };

  const handleSaveCommittees = async () => {
    if (!selectedGradeId) return;
    try {
      const res = await fetch(`${API_BASE}/committees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gradeId: selectedGradeId,
          academicYearId: currentAcademicYearId,
          distributionMode: committeeForm.distributionMode,
          capacityPerCommittee: parseInt(committeeForm.capacityPerCommittee || 20),
          manualCommittees: committeeForm.manualCommittees
        })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: data.message });
        fetchStudents();
        fetchCommitteesStats();
      } else {
        setMsg({ type: 'error', text: data.error || 'فشلت عملية حفظ وتوزيع اللجان.' });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'خطأ في الاتصال بالخادم: ' + e.message });
    }
  };


  const handleSaveStudentControlData = async (studentId, seatNumber, committeeId) => {
    try {
      const res = await fetch(`${API_BASE}/students/${studentId}/control-data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatNumber, committeeId })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: data.message });
        fetchStudents();
        fetchCommitteesStats();
        setEditingStudent(null);
      } else {
        setMsg({ type: 'error', text: data.error });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'فشل تحديث بيانات الطالب.' });
    }
  };

  const fetchPassingRules = async () => {
    if (!selectedGradeId) return;
    try {
      const res = await fetch(`${API_BASE}/passing-rules?gradeId=${selectedGradeId}`);
      const data = await res.json();
      if (data.success && data.rules) {
        setPassingRules({
          isEnabled: data.rules.is_enabled === 1,
          enableAttendanceRule: data.rules.enable_attendance_rule !== 0,
          enableWrittenRule: data.rules.enable_written_rule !== 0,
          enableSecondRoundRule: data.rules.enable_second_round_rule !== 0,
          enableGraceRule: data.rules.enable_grace_rule !== 0,
          minAttendancePercent: data.rules.min_attendance_percent || 85,
          writtenPassPercent: data.rules.written_pass_percent || 30,
          maxFailingSecondRound: data.rules.max_failing_second_round || 2,
          graceMarksPool: data.rules.grace_marks_pool || 5
        });
      }
    } catch (e) {}
  };

  const handleSavePassingRules = async (e) => {
    e.preventDefault();
    if (!selectedGradeId) return;
    try {
      const res = await fetch(`${API_BASE}/passing-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradeId: selectedGradeId, ...passingRules })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: data.message });
        fetchPassingRules();
      } else {
        setMsg({ type: 'error', text: data.error });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'فشل حفظ شروط وضوابط النجاح.' });
    }
  };

  const handleSaveGradePresetAsDefault = async () => {
    if (!selectedGradeId) return;
    try {
      const res = await fetch(`${API_BASE}/preset-default/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradeId: selectedGradeId })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: data.message });
      } else {
        setMsg({ type: 'error', text: data.error });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'فشل حفظ افتراضيات أصل البرنامج.' });
    }
  };

  const handleRestoreGradePresetDefaults = async () => {
    if (!selectedGradeId) return;
    try {
      const res = await fetch(`${API_BASE}/preset-default/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradeId: selectedGradeId })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: data.message });
        fetchSubjects();
        fetchPassingRules();
      } else {
        setMsg({ type: 'error', text: data.error });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'فشل استعادة افتراضيات أصل البرنامج.' });
    }
  };

  const handleEditSubject = (sbj) => {
    setSubjectForm({
      id: sbj.id,
      subjectNameAr: sbj.subject_name_ar || '',
      subjectCode: sbj.subject_code || '',
      subjectCategory: sbj.subject_category || 'أساسية',
      term1WorkMark: sbj.term1_work_mark || 15,
      term1PracticalMark: sbj.term1_practical_mark || 0,
      term1ExamMark: sbj.term1_exam_mark || 35,
      term2WorkMark: sbj.term2_work_mark || 15,
      term2PracticalMark: sbj.term2_practical_mark || 0,
      term2ExamMark: sbj.term2_exam_mark || 35,
      passMark: sbj.pass_mark || 50,
      subjectPassPercent: sbj.subject_pass_percent || 50,
      writtenPassMode: sbj.written_pass_mode || 'none',
      writtenPassMark: sbj.written_pass_mark || 0,
      actualConvertedMark: sbj.actual_converted_mark || 0,
      isAddedToTotal: sbj.is_added_to_total === 1,
      isFailingSubject: sbj.is_failing_subject === 1,
      isActivitySubject: false, isHighLevel: false, isExtraSubject: false
    });
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm('هل أنت تأكد من رغبتك في حذف هذه المادة الدراسية نهائياً من الصف؟')) return;
    try {
      const res = await fetch(`${API_BASE}/subjects/${subjectId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: data.message });
        fetchSubjects();
      } else {
        setMsg({ type: 'error', text: data.error });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'فشلت عملية حذف المادة.' });
    }
  };

  const fetchCascadingMetadata = async () => {
    try {
      const res = await fetch(`${API_BASE}/grades`);
      const data = await res.json();
      if (data.success) {
        setSections(data.sections || []);
        setStages(data.stages || []);
        setGrades(data.grades || []);
        if (data.grades && data.grades.length > 0 && !selectedGradeId) {
          const activeGrade = data.grades.find(g => (g.student_count || 0) > 0) || data.grades[0];
          setSelectedGradeId(activeGrade.id);
          if (activeGrade.section_id) setSelectedSectionId(activeGrade.section_id);
          if (activeGrade.stage_id) setSelectedStageId(activeGrade.stage_id);
        }
        if (data.currentAcademicYear?.id) {
          setCurrentAcademicYearId(data.currentAcademicYear.id);
        }
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'فشل تحميل بيانات الأقسام والمراحل والصفوف.' });
    }
  };

  const fetchSubjects = async () => {
    if (!selectedGradeId) return;
    try {
      const res = await fetch(`${API_BASE}/subjects?gradeId=${selectedGradeId}`);
      const data = await res.json();
      if (data.success) {
        setSubjects(data.subjects || []);
        if (data.subjects?.length > 0 && !gradingSubjectId) {
          setGradingSubjectId(String(data.subjects[0].id));
        }
      }
    } catch (e) {}
  };

  const fetchStudents = async () => {
    if (!selectedGradeId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/students?gradeId=${selectedGradeId}`);
      const data = await res.json();
      if (data.success) setStudents(data.students || []);
    } catch (e) {
      setMsg({ type: 'error', text: 'فشل تحميل بيانات طلاب الكنترول للصف المحدد.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncGrade = async () => {
    if (!selectedGradeId) {
      setMsg({ type: 'error', text: 'يرجى تحديد الصف الدراسي أولاً للمزامنة.' });
      return;
    }
    setLoading(true);
    setMsg({ type: 'info', text: '🔄 جاري مزامنة بيانات طلاب الصف المحدد من شؤون الطلاب...' });
    try {
      const res = await fetch(`${API_BASE}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradeId: selectedGradeId })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: data.message });
        fetchStudents();
      } else {
        setMsg({ type: 'error', text: data.error });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'فشلت عملية المزامنة.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async () => {
    try {
      const res = await fetch(`${API_BASE}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput, userName: 'رئيس الكنترول' })
      });
      const data = await res.json();
      if (data.success) {
        setIsSecretUnmasked(true);
        setIsPinModalOpen(false);
        setPinInput('');
        setMsg({ type: 'success', text: '🔓 تم فك تشفير وعرض كشف السرّي الكامل بنجاح.' });
      } else {
        setMsg({ type: 'error', text: data.error });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'رمز أمان رئيس الكنترول غير صحيح.' });
    }
  };



  // Build groupConfig from equalGroups or manualGroups
  const buildGroupConfig = () => {
    if (secretMode === 'equal') {
      return equalGroups.map(g => ({ groupLabel: String(g.groupLabel), count: g.count, startCode: parseInt(g.startCode) }));
    } else {
      return manualGroups.map(g => ({ groupLabel: String(g.groupLabel), count: parseInt(g.count), startCode: parseInt(g.startCode) }));
    }
  };

  // Preview equal groups (auto-calc based on student count and group size)
  const handlePreviewEqualGroups = () => {
    if (!students.length) { setMsg({ type: 'error', text: 'لا يوجد طلاب لعرض التقسيم.' }); return; }
    const size = Math.max(1, parseInt(equalGroupSize) || 30);
    const total = students.length;
    const count = Math.ceil(total / size);
    const newGroups = [];
    let remaining = total;
    for (let i = 0; i < count; i++) {
      const cnt = Math.min(size, remaining);
      newGroups.push({ groupLabel: String(i + 1), count: cnt, startCode: equalStartCode + (i * size) });
      remaining -= cnt;
    }
    setEqualGroups(newGroups);
  };

  // Fetch summary after generation
  const fetchSecretSummary = async (term) => {
    if (!selectedGradeId) return;
    try {
      const res = await fetch(`${API_BASE}/secret-groups?gradeId=${selectedGradeId}&term=${term}`);
      const data = await res.json();
      if (data.success) setSecretSummary(data);
    } catch (e) {}
  };

  const handleGenerateSecretCodes = async (term = 1) => {
    if (!selectedGradeId) return;
    const groupConfig = buildGroupConfig();
    if (!groupConfig.length) { setMsg({ type: 'error', text: 'يجب إعداد المجموعات أولاً.' }); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/generate-secret-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradeId: selectedGradeId, term, groupConfig })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: data.message });
        fetchStudents();
        await fetchSecretSummary(term);
      } else {
        setMsg({ type: 'error', text: data.error });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'فشل توليد الأرقام السرية.' });
    } finally {
      setLoading(false);
    }
  };

  // Direct print secret sheet (since tab is already PIN-protected)
  const handlePrintSecretSheet = async (term) => {
    setPrintTerm(term);
    await fetchSecretSummary(term);
    setPrintReady(true);
    setTimeout(() => window.print(), 300);
  };



  const handleSaveSubject = async (e) => {
    e.preventDefault();
    if (!selectedGradeId) return;
    try {
      const res = await fetch(`${API_BASE}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...subjectForm, gradeId: selectedGradeId })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: data.message });
        setSubjectForm(prev => ({
          id: null, subjectNameAr: '', term1WorkMark: 15, term1ExamMark: 35, term2WorkMark: 15, term2ExamMark: 35, passMark: 50,
          attendanceRate: 85, isActivitySubject: false, isHighLevel: false, isExtraSubject: false, isAddedToTotal: true, isFailingSubject: true
        }));
        fetchSubjects();
      } else {
        setMsg({ type: 'error', text: data.error });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'فشل حفظ المادة الدراسية.' });
    }
  };

  // Filtered dropdown lists
  const availableStages = stages.filter(s => !selectedSectionId || String(s.section_id) === String(selectedSectionId));
  const availableGrades = grades.filter(g => {
    if (selectedStageId && String(g.stage_id) !== String(selectedStageId)) return false;
    if (selectedSectionId && String(g.section_id) !== String(selectedSectionId)) return false;
    return true;
  });

  const selectedGradeObj = grades.find(g => String(g.id) === String(selectedGradeId));

  // Search filtered students (Strict & Accurate Matching)
  const filteredStudents = students.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.trim().toLowerCase();

    const nameMatch = s.full_name_ar && s.full_name_ar.toLowerCase().includes(q);
    const seatMatch = s.seat_number && String(s.seat_number).includes(q);
    const secret1Match = s.secret_code_term1 && String(s.secret_code_term1).includes(q);
    const secret2Match = s.secret_code_term2 && String(s.secret_code_term2).includes(q);
    const nationalMatch = (q.length >= 10) && s.national_id && s.national_id.includes(q);

    return nameMatch || seatMatch || secret1Match || secret2Match || nationalMatch;
  });

  return (
    <div className="control-hub-page" style={{ padding: '20px', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
      
      {/* Ultra-Compact Control Top Toolbar (Height ~52px) */}
      <div style={{
        background: '#fff', padding: '10px 20px', borderRadius: '12px', marginBottom: '16px',
        border: '1px solid #cbd5e1', borderRight: '6px solid #4338ca', boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px'
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={22} color="#4338ca" />
          <span style={{ fontSize: '16px', fontWeight: 900, color: '#1e1b4b' }}>منظومة الكنترول والامتحانات</span>
        </div>

        {/* Inline Compact Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <select
            value={selectedSectionId}
            onChange={e => {
              setSelectedSectionId(e.target.value);
              setSelectedStageId('');
              setSelectedGradeId('');
            }}
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '13px', background: '#f8fafc' }}
          >
            <option value="">القسم (الكل)</option>
            {sections.map(sec => (
              <option key={sec.id} value={sec.id}>{sec.name}</option>
            ))}
          </select>

          <select
            value={selectedStageId}
            onChange={e => {
              setSelectedStageId(e.target.value);
              setSelectedGradeId('');
            }}
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '13px', background: '#f8fafc' }}
          >
            <option value="">المرحلة (الكل)</option>
            {availableStages.map(stg => (
              <option key={stg.id} value={stg.id}>{stg.stage_name}</option>
            ))}
          </select>

          <select
            value={selectedGradeId}
            onChange={e => setSelectedGradeId(e.target.value)}
            style={{
              padding: '7px 14px', borderRadius: '8px', border: '2px solid #4338ca',
              background: '#e0e7ff', color: '#1e1b4b', fontWeight: 900, fontSize: '13.5px', cursor: 'pointer'
            }}
          >
            <option value="">-- اختر الصف الدراسي --</option>
            {availableGrades.map(grd => (
              <option key={grd.id} value={grd.id}>
                {grd.grade_name_ar} {grd.student_count > 0 ? `(${grd.student_count} طالب)` : ''}
              </option>
            ))}
          </select>
        </div>


        {/* Sync Action Button */}
        {selectedGradeId && (
          <button
            onClick={handleSyncGrade}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff', border: 'none', padding: '7px 16px', borderRadius: '8px',
              fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
            }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> مزامنة الصف
          </button>
        )}
      </div>

      {/* Floating Notification Toast */}
      {msg.text && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 10000,
          padding: '14px 24px', borderRadius: '12px', fontWeight: 800, fontSize: '14px',
          background: msg.type === 'success' ? '#065f46' : msg.type === 'error' ? '#991b1b' : '#3730a3',
          color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
          display: 'flex', alignItems: 'center', gap: '16px', border: '2px solid rgba(255,255,255,0.2)'
        }}>
          <span>{msg.text}</span>
          <button
            onClick={() => setMsg({ type: '', text: '' })}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontWeight: 900, cursor: 'pointer', fontSize: '14px', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* PIN Security Modal */}
      {isPinModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: '#fff', padding: '32px', borderRadius: '16px', width: '90%', maxWidth: '420px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
            <div style={{ width: '56px', height: '56px', background: '#fee2e2', color: '#b91c1c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <KeyRound size={32} />
            </div>
            <h3 style={{ margin: 0, fontWeight: 900, color: '#1e1b4b' }}>التحقق من رمز أمان رئيس الكنترول</h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '8px 0 20px 0' }}>
              كشف الأرقام السرية والربط محمي وحساس. يرجى إدخال رمز الأمان للفك والمتابعة.
            </p>
            <input
              type="password"
              placeholder="رمز أمان رئيس الكنترول (Master PIN)"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #cbd5e1', textAlign: 'center', fontSize: '16px', fontWeight: 800, marginBottom: '20px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleVerifyPin} style={{ flex: 1, background: '#b91c1c', color: '#fff', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>
                تأكيد ومطابقة الرمز
              </button>
              <button onClick={() => setIsPinModalOpen(false)} style={{ flex: 1, background: '#f1f5f9', color: '#475569', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Master Subject Coding Modal */}
      {isNewMasterModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: '#fff', padding: '28px', borderRadius: '16px', width: '90%', maxWidth: '440px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontWeight: 900, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={22} color="#2563eb" /> إضافة وتكويد مادة دراسية جديدة
            </h3>
            <form onSubmit={handleCreateMasterSubject} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700 }}>اسم المادة بالعربي *</label>
                <input
                  type="text" required
                  placeholder="مثال: البرمجة والذكاء الاصطناعي"
                  value={newMasterForm.subjectNameAr}
                  onChange={e => setNewMasterForm({ ...newMasterForm, subjectNameAr: e.target.value })}
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700 }}>اسم المادة بالإنجليزي (اختياري)</label>
                <input
                  type="text"
                  placeholder="e.g. AI & Programming"
                  value={newMasterForm.subjectNameEn}
                  onChange={e => setNewMasterForm({ ...newMasterForm, subjectNameEn: e.target.value })}
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700 }}>تصنيف المادة</label>
                <select
                  value={newMasterForm.category}
                  onChange={e => setNewMasterForm({ ...newMasterForm, category: e.target.value })}
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700 }}
                >
                  <option value="أساسية">مادة أساسية</option>
                  <option value="دينية">مادة دينية</option>
                  <option value="نشاط">نشاط تربوي</option>
                  <option value="مستوى_رفيع">مستوى رفيع</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={{ flex: 1, background: '#2563eb', color: '#fff', padding: '10px', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>
                  حفظ وتكويد المادة
                </button>
                <button type="button" onClick={() => setIsNewMasterModalOpen(false)} style={{ flex: 1, background: '#f1f5f9', color: '#475569', padding: '10px', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INITIAL SCREEN: No grade selected prompt */}
      {!selectedGradeId ? (
        <div style={{
          background: '#fff', padding: '60px 24px', borderRadius: '16px', border: '2px dashed #cbd5e1',
          textAlign: 'center', color: '#64748b'
        }}>
          <ShieldCheck size={54} color="#6366f1" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#1e1b4b', margin: 0 }}>
            اختيار الصف الدراسي
          </h2>
          <p style={{ fontSize: '14px', maxWidth: '500px', margin: '10px auto 24px auto', lineHeight: 1.6 }}>
            يرجى اختيار <strong>الصف الدراسي</strong> للبدء في تشغيل الكنترول.
          </p>
        </div>
      ) : (
        <>
          {/* TAB 1: 1️⃣ إعدادات أعمال الامتحان */}
          {activeTab === 'setup' && (
            <div>

              {/* Sub-Tab 1.1: تجهيز المواد وضوابط العمل */}
              {subTabSetup === 'subjects' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* General Measurable Passing & Promotion Rules Card */}
                  <div style={{
                    background: '#fff', padding: '20px 24px', borderRadius: '14px',
                    border: '1px solid #cbd5e1', borderRight: '6px solid #059669', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h3 style={{ margin: 0, fontWeight: 900, fontSize: '15px', color: '#064e3b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Scale size={20} color="#059669" /> 🎯 الشروط والضوابط العامة لنجاح الطالب للصف (قابلة للقياس والاحتساب)
                        </h3>
                        <label style={{ fontSize: '13px', fontWeight: 800, color: '#059669', cursor: 'pointer', background: '#dcfce7', padding: '4px 10px', borderRadius: '6px' }}>
                          <input
                            type="checkbox" checked={passingRules.isEnabled}
                            onChange={e => setPassingRules({ ...passingRules, isEnabled: e.target.checked })}
                            style={{ marginLeft: '6px' }}
                          />
                          {passingRules.isEnabled ? 'تفعيل ضوابط الصف' : 'تعطيل كافة الشروط'}
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={handleSaveGradePresetAsDefault}
                          style={{ background: '#312e81', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 800, fontSize: '11.5px', cursor: 'pointer' }}
                        >
                          💾 حفظ كافتراضي لأصل البرنامج
                        </button>
                        <button
                          type="button"
                          onClick={handleRestoreGradePresetDefaults}
                          style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '6px 12px', borderRadius: '8px', fontWeight: 800, fontSize: '11.5px', cursor: 'pointer' }}
                        >
                          🔄 استعادة افتراضيات أصل البرنامج
                        </button>
                        <button
                          onClick={handleSavePassingRules}
                          style={{
                            background: '#059669', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: '8px',
                            fontWeight: 800, fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                          }}
                        >
                          <Check size={16} /> حفظ واعتتماد الضوابط
                        </button>
                      </div>
                    </div>

                    {passingRules.isEnabled && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>
                              ⏱️ الحد الأدنى لنسبة حضور الطالب (%):
                            </label>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: passingRules.enableAttendanceRule ? '#059669' : '#64748b' }}>
                              <input type="checkbox" checked={passingRules.enableAttendanceRule} onChange={e => setPassingRules({ ...passingRules, enableAttendanceRule: e.target.checked })} style={{ marginLeft: '4px' }} />
                              {passingRules.enableAttendanceRule ? 'مفعل' : 'غير مطلوب'}
                            </label>
                          </div>
                          <input
                            type="number" disabled={!passingRules.enableAttendanceRule}
                            value={passingRules.minAttendancePercent}
                            onChange={e => setPassingRules({ ...passingRules, minAttendancePercent: parseFloat(e.target.value) })}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 800 }}
                          />
                          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>يُحرم الطالب من الامتحان إذا قل حضوره</span>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>
                              ✍️ النسبة العامة للتحريري (%):
                            </label>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: passingRules.enableWrittenRule ? '#059669' : '#64748b' }}>
                              <input type="checkbox" checked={passingRules.enableWrittenRule} onChange={e => setPassingRules({ ...passingRules, enableWrittenRule: e.target.checked })} style={{ marginLeft: '4px' }} />
                              {passingRules.enableWrittenRule ? 'مفعل' : 'غير مطلوب'}
                            </label>
                          </div>
                          <input
                            type="number" disabled={!passingRules.enableWrittenRule}
                            value={passingRules.writtenPassPercent}
                            onChange={e => setPassingRules({ ...passingRules, writtenPassPercent: parseFloat(e.target.value) })}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 800 }}
                          />
                          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>نسبة الاسترشاد بالورقة الامتحانية</span>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>
                              📚 مواد الرسوب للدور الثاني:
                            </label>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: passingRules.enableSecondRoundRule ? '#059669' : '#64748b' }}>
                              <input type="checkbox" checked={passingRules.enableSecondRoundRule} onChange={e => setPassingRules({ ...passingRules, enableSecondRoundRule: e.target.checked })} style={{ marginLeft: '4px' }} />
                              {passingRules.enableSecondRoundRule ? 'مفعل' : 'غير مطلوب'}
                            </label>
                          </div>
                          <input
                            type="number" disabled={!passingRules.enableSecondRoundRule}
                            value={passingRules.maxFailingSecondRound}
                            onChange={e => setPassingRules({ ...passingRules, maxFailingSecondRound: parseInt(e.target.value) })}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 800 }}
                          />
                          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>أكثر من ذلك يعتبر الطالب راسباً للإعادة</span>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>
                              ⚖️ وعاء درجات الرأفة للرفع:
                            </label>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: passingRules.enableGraceRule ? '#059669' : '#64748b' }}>
                              <input type="checkbox" checked={passingRules.enableGraceRule} onChange={e => setPassingRules({ ...passingRules, enableGraceRule: e.target.checked })} style={{ marginLeft: '4px' }} />
                              {passingRules.enableGraceRule ? 'مفعل' : 'غير مطلوب'}
                            </label>
                          </div>
                          <input
                            type="number" disabled={!passingRules.enableGraceRule}
                            value={passingRules.graceMarksPool}
                            onChange={e => setPassingRules({ ...passingRules, graceMarksPool: parseFloat(e.target.value) })}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 800 }}
                          />
                          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>أقصى درجات متاحة لرفع الطالب للنجاح</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
                    {/* Add/Edit Subject Form */}
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <h3 style={{ margin: 0, fontWeight: 800, fontSize: '15px', color: '#1e1b4b' }}>
                          {subjectForm.id ? '✏️ تعديل بيانات المادة المسجلة' : '➕ إضافة وتعيين مادة دراسية للصف'}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setIsNewMasterModalOpen(true)}
                          style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer' }}
                        >
                          ➕ إضافة وتكويد مادة جديدة
                        </button>
                      </div>

                      <form onSubmit={handleSaveSubject} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Select from Master Subjects Lookup */}
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>المادة الدراسية (من الدليل المكود)</label>
                          <select
                            value={subjectForm.subjectNameAr}
                            onChange={e => {
                              const selectedMaster = masterSubjects.find(m => m.subject_name_ar === e.target.value);
                              setSubjectForm({
                                ...subjectForm,
                                subjectNameAr: e.target.value,
                                subjectCode: selectedMaster ? selectedMaster.subject_code : ''
                              });
                            }}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800 }}
                          >
                            <option value="">-- اختر مادة من القائمة --</option>
                            {masterSubjects.map(m => (
                              <option key={m.id} value={m.subject_name_ar}>📌 {m.subject_name_ar} ({m.subject_code})</option>
                            ))}
                          </select>
                        </div>

                        {/* Category & Custom Name */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>اسم المادة المحدد</label>
                            <input
                              type="text" required value={subjectForm.subjectNameAr}
                              onChange={e => setSubjectForm({ ...subjectForm, subjectNameAr: e.target.value })}
                              placeholder="اسم المادة"
                              style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>تصنيف المادة</label>
                            <select
                              value={subjectForm.subjectCategory}
                              onChange={e => setSubjectForm({ ...subjectForm, subjectCategory: e.target.value })}
                              style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800 }}
                            >
                              <option value="أساسية">أساسية</option>
                              <option value="دينية">دينية</option>
                              <option value="نشاط">نشاط</option>
                              <option value="مستوى رفيع">مستوى رفيع</option>
                              <option value="إضافية">إضافية / دون مجموع</option>
                            </select>
                          </div>
                        </div>

                        {/* Term 1 Work, Practical, Written */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                          <div>
                            <label style={{ fontSize: '10.5px', fontWeight: 700 }}>أعمال ترم 1</label>
                            <input type="number" value={subjectForm.term1WorkMark} onChange={e => setSubjectForm({ ...subjectForm, term1WorkMark: parseFloat(e.target.value) })} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#0369a1' }}>عملي ترم 1</label>
                            <input type="number" value={subjectForm.term1PracticalMark} onChange={e => setSubjectForm({ ...subjectForm, term1PracticalMark: parseFloat(e.target.value) })} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #7dd3fc', fontWeight: 800 }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '10.5px', fontWeight: 700 }}>تحريري ترم 1</label>
                            <input type="number" value={subjectForm.term1ExamMark} onChange={e => setSubjectForm({ ...subjectForm, term1ExamMark: parseFloat(e.target.value) })} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                          </div>
                        </div>

                        {/* Term 2 Work, Practical, Written */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                          <div>
                            <label style={{ fontSize: '10.5px', fontWeight: 700 }}>أعمال ترم 2</label>
                            <input type="number" value={subjectForm.term2WorkMark} onChange={e => setSubjectForm({ ...subjectForm, term2WorkMark: parseFloat(e.target.value) })} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#0369a1' }}>عملي ترم 2</label>
                            <input type="number" value={subjectForm.term2PracticalMark} onChange={e => setSubjectForm({ ...subjectForm, term2PracticalMark: parseFloat(e.target.value) })} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #7dd3fc', fontWeight: 800 }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '10.5px', fontWeight: 700 }}>تحريري ترم 2</label>
                            <input type="number" value={subjectForm.term2ExamMark} onChange={e => setSubjectForm({ ...subjectForm, term2ExamMark: parseFloat(e.target.value) })} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                          </div>
                        </div>

                        {/* Per-Subject Total Pass Percentage Selector (50%, 40%, 70%, Custom) */}
                        <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                          <label style={{ fontSize: '12px', fontWeight: 800, color: '#1e1b4b', display: 'block', marginBottom: '4px' }}>
                            🎯 نسبة النجاح الصغرى المطلوبة للمادة (شرط نجاح المادة):
                          </label>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                              value={subjectForm.subjectPassPercent}
                              onChange={e => setSubjectForm({ ...subjectForm, subjectPassPercent: parseFloat(e.target.value) })}
                              style={{ flex: 1, padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800 }}
                            >
                              <option value={50}>50% (النسبة الأساسية المعتادة)</option>
                              <option value={40}>40% (نسبة صغرى مخفضة)</option>
                              <option value={60}>60% (نسبة صغرى مرتفعة)</option>
                              <option value={70}>70% (مستوى رفيع / لغات)</option>
                            </select>
                            <input
                              type="number"
                              placeholder="نسبة %"
                              value={subjectForm.subjectPassPercent}
                              onChange={e => setSubjectForm({ ...subjectForm, subjectPassPercent: parseFloat(e.target.value) })}
                              style={{ width: '80px', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800, textAlign: 'center' }}
                            />
                          </div>
                          <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                            درجة الصغرى المطلوبة = {((((parseFloat(subjectForm.term1WorkMark) || 0) + (parseFloat(subjectForm.term1ExamMark) || 0) + (parseFloat(subjectForm.term2WorkMark) || 0) + (parseFloat(subjectForm.term2ExamMark) || 0)) * ((parseFloat(subjectForm.subjectPassPercent) || 50) / 100)).toFixed(1))} درجة
                          </span>
                        </div>

                        {/* Actual Converted Certificate Mark Input */}
                        <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                          <label style={{ fontSize: '12px', fontWeight: 800, color: '#92400e', display: 'block', marginBottom: '4px' }}>
                            🎓 الدرجة الفعلية للمادة بالشهادة الرسمية:
                          </label>
                          <input
                            type="number"
                            placeholder="اتركه 0 لاستخدام المجموع العظمى للمادة تلقائياً"
                            value={subjectForm.actualConvertedMark}
                            onChange={e => setSubjectForm({ ...subjectForm, actualConvertedMark: parseFloat(e.target.value) })}
                            style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #d97706', fontWeight: 800 }}
                          />
                          <span style={{ fontSize: '10.5px', color: '#b45309', display: 'block', marginTop: '3px' }}>
                            تُحدد الدرجة التراكمية الفعلية للمادة بالشهادة النهائية (إذا كانت تختلف عن مجموع أعمال السنة والتحريري)
                          </span>
                        </div>

                        {/* Tri-state Written Pass Requirement Selector */}
                        <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <label style={{ fontSize: '12px', fontWeight: 800, color: '#312e81', display: 'block', marginBottom: '6px' }}>
                            ✍️ شرط الورقة الامتحانية التحريرية لهذه المادة:
                          </label>
                          <select
                            value={subjectForm.writtenPassMode}
                            onChange={e => setSubjectForm({ ...subjectForm, writtenPassMode: e.target.value })}
                            style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800, marginBottom: '6px' }}
                          >
                            <option value="none">لا يشترط درجة للورقة التحريرية</option>
                            <option value="percent_30">يشترط 30% من امتحانات الترم الثاني التحريرية تلقائياً</option>
                            <option value="custom_mark">يشترط درجة رقمية مخصصة أدخلها يدوياً</option>
                          </select>

                          {subjectForm.writtenPassMode === 'custom_mark' && (
                            <input
                              type="number"
                              placeholder="الدرجة الحدية للتحريري المطلوب الحصول عليها"
                              value={subjectForm.writtenPassMark}
                              onChange={e => setSubjectForm({ ...subjectForm, writtenPassMark: parseFloat(e.target.value) })}
                              style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #4338ca', fontWeight: 800 }}
                            />
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 700 }}><input type="checkbox" checked={subjectForm.isActivitySubject} onChange={e => setSubjectForm({ ...subjectForm, isActivitySubject: e.target.checked })} /> نشاط</label>
                          <label style={{ fontSize: '12px', fontWeight: 700 }}><input type="checkbox" checked={subjectForm.isHighLevel} onChange={e => setSubjectForm({ ...subjectForm, isHighLevel: e.target.checked })} /> مستوى رفيع</label>
                          <label style={{ fontSize: '12px', fontWeight: 700 }}><input type="checkbox" checked={subjectForm.isAddedToTotal} onChange={e => setSubjectForm({ ...subjectForm, isAddedToTotal: e.target.checked })} /> تضاف للمجموع</label>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                          <button type="submit" style={{ flex: 1, background: subjectForm.id ? '#d97706' : '#4338ca', color: '#fff', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 800, cursor: 'pointer' }}>
                            {subjectForm.id ? '💾 تحديث بيانات المادة' : 'حفظ وتأكيد المادة'}
                          </button>
                          {subjectForm.id && (
                            <button
                              type="button"
                              onClick={() => setSubjectForm({
                                id: null, subjectNameAr: '', subjectCode: '', term1WorkMark: 15, term1ExamMark: 35, term2WorkMark: 15, term2ExamMark: 35, passMark: 50, writtenPassMode: 'none', writtenPassMark: 0, actualConvertedMark: 0, isAddedToTotal: true, isFailingSubject: true, isActivitySubject: false, isHighLevel: false, isExtraSubject: false
                              })}
                              style={{ background: '#f1f5f9', color: '#475569', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                            >
                              إلغاء التعديل
                            </button>
                          )}
                        </div>
                      </form>
                    </div>

                    {/* Registered Subjects Table */}
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 14px 0', fontWeight: 800, fontSize: '15px', color: '#1e1b4b' }}>
                        جدول المواد المسجلة للصف ({subjects.length} مادة)
                      </h3>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>
                            <th style={{ padding: '8px' }}>ت2 (أعمال/تحريري)</th>
                            <th style={{ padding: '8px' }}>المجموع العظمى</th>
                            <th style={{ padding: '8px' }}>درجة الصغرى</th>
                            <th style={{ padding: '8px' }}>الدرجة الفعلية</th>
                            <th style={{ padding: '8px' }}>شرط التحريري</th>
                            <th style={{ padding: '8px', textAlign: 'center' }}>تعديل</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjects.map(sbj => (
                            <tr key={sbj.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px', fontWeight: 800 }}>
                                {sbj.subject_name_ar} {sbj.subject_code && <span style={{ fontSize: '10px', color: '#64748b' }}>({sbj.subject_code})</span>}
                              </td>
                              <td style={{ padding: '8px' }}>
                                {sbj.term1_work_mark}أ + {sbj.term1_practical_mark > 0 ? <strong style={{ color: '#0369a1' }}>{sbj.term1_practical_mark}ع + </strong> : ''}{sbj.term1_exam_mark}ت = {sbj.term1_max_mark}
                              </td>
                              <td style={{ padding: '8px' }}>
                                {sbj.term2_work_mark}أ + {sbj.term2_practical_mark > 0 ? <strong style={{ color: '#0369a1' }}>{sbj.term2_practical_mark}ع + </strong> : ''}{sbj.term2_exam_mark}ت = {sbj.term2_max_mark}
                              </td>
                              <td style={{ padding: '8px', fontWeight: 900, color: '#4338ca' }}>{sbj.year_max_mark}</td>
                              <td style={{ padding: '8px', fontWeight: 800, color: '#15803d' }}>
                                {sbj.subject_pass_percent || 50}% ({sbj.pass_mark} درجة)
                              </td>
                              <td style={{ padding: '8px', fontWeight: 900, color: sbj.actual_converted_mark > 0 ? '#b45309' : '#475569' }}>
                                {sbj.actual_converted_mark > 0 ? `${sbj.actual_converted_mark} درجة` : `${sbj.year_max_mark} (تلقائي)`}
                              </td>
                              <td style={{ padding: '8px', fontWeight: 800, color: sbj.written_pass_mode !== 'none' ? '#d97706' : '#64748b' }}>
                                {sbj.written_pass_mode === 'percent_30' ? `30% (${(((parseFloat(sbj.term2_exam_mark) || 0) + (parseFloat(sbj.term2_practical_mark) || 0)) * 0.3).toFixed(1)} درجة)` : sbj.written_pass_mode === 'custom_mark' ? `${sbj.written_pass_mark} درجة` : 'لا يشترط'}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center', display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleEditSubject(sbj)}
                                  style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                                >
                                  ✏️ تعديل
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubject(sbj.id)}
                                  style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                                >
                                  🗑️ حذف
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-Tab 1.2: تسجيل وتوليد أرقام الجلوس */}
              {subTabSetup === 'seats' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Live Seat Stats Counter Panel (كشاف إحصائي علوي) */}
                  <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', color: '#fff', padding: '16px', borderRadius: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#cbd5e1' }}>📊 إجمالي طلاب الصف</span>
                      <h3 style={{ margin: '4px 0 0 0', fontWeight: 900, color: '#60a5fa' }}>{students.length} طالب</h3>
                    </div>
                    <div style={{ textAlign: 'center', borderRight: '1px solid #4338ca' }}>
                      <span style={{ fontSize: '11px', color: '#cbd5e1' }}>🟢 المعين لهم أرقام جلوس</span>
                      <h3 style={{ margin: '4px 0 0 0', fontWeight: 900, color: '#4ade80' }}>{students.filter(s => s.seat_number).length} طالب</h3>
                    </div>
                    <div style={{ textAlign: 'center', borderRight: '1px solid #4338ca' }}>
                      <span style={{ fontSize: '11px', color: '#cbd5e1' }}>🔴 متبقي بدون رقم جلوس</span>
                      <h3 style={{ margin: '4px 0 0 0', fontWeight: 900, color: '#f87171' }}>{students.filter(s => !s.seat_number).length} طالب</h3>
                    </div>
                    <div style={{ textAlign: 'center', borderRight: '1px solid #4338ca' }}>
                      <span style={{ fontSize: '11px', color: '#cbd5e1' }}>🔢 نطاق أرقام الجلوس</span>
                      <h3 style={{ margin: '4px 0 0 0', fontWeight: 900, color: '#fbbf24' }}>
                        {students.filter(s => s.seat_number).length > 0 ? `${Math.min(...students.filter(s => s.seat_number).map(s => s.seat_number))} - ${Math.max(...students.filter(s => s.seat_number).map(s => s.seat_number))}` : 'غير محدد'}
                      </h3>
                    </div>
                  </div>

                  {/* Controls & Search Card */}
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div>
                        <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#1e1b4b', display: 'block', marginBottom: '4px' }}>🔢 بداية رقم الجلوس:</label>
                        <input type="number" value={seatForm.startSeatNumber} onChange={e => setSeatForm({ ...seatForm, startSeatNumber: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800, width: '120px' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#1e1b4b', display: 'block', marginBottom: '4px' }}>ترتيب أرقام الجلوس:</label>
                        <select value={seatForm.genderOrder} onChange={e => setSeatForm({ ...seatForm, genderOrder: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800 }}>
                          <option value="none">ترتيب أبجدي لجميع الطلاب (أساسي)</option>
                          <option value="boys_first">ترتيب البنين أولاً ثم البنات</option>
                          <option value="girls_first">ترتيب البنات أولاً ثم البنين</option>
                        </select>
                      </div>
                      <div style={{ marginTop: '18px', display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleGenerateSeats('overwrite')} style={{ background: '#4338ca', color: '#fff', padding: '9px 16px', borderRadius: '6px', border: 'none', fontWeight: 800, cursor: 'pointer' }}>
                          ⚡ إعادة توليد أرقام الجلوس للصف بالكامل
                        </button>
                        <button onClick={() => handleGenerateSeats('append_only')} style={{ background: '#0284c7', color: '#fff', padding: '9px 16px', borderRadius: '6px', border: 'none', fontWeight: 800, cursor: 'pointer' }}>
                          ➕ ترقيم الطلاب الجدد فقط
                        </button>
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="🔍 بحث باسم الطالب أو رقم الجلوس..."
                        value={studentSearchQuery}
                        onChange={e => setStudentSearchQuery(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #94a3b8', width: '240px', fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  {/* Live Student Allocation Monitor Table (كشف أرقام الجلوس واللجان المباشر) */}
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 14px 0', fontWeight: 800, fontSize: '15px', color: '#1e1b4b' }}>
                      كشف متابعة وتعديل أرقام الجلوس واللجان لجميع الطلاب ({students.length} طالب)
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>
                          <th style={{ padding: '8px' }}>م</th>
                          <th style={{ padding: '8px' }}>اسم الطالب</th>
                          <th style={{ padding: '8px' }}>الفصل</th>
                          <th style={{ padding: '8px' }}>الديانة</th>
                          <th style={{ padding: '8px' }}>رقم الجلوس</th>
                          <th style={{ padding: '8px' }}>اللجنة الامتحانية</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>تعديل يدوياً</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.filter(s => (s.full_name_ar || '').includes(studentSearchQuery) || String(s.seat_number || '').includes(studentSearchQuery)).map((st, idx) => (
                          <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px', color: '#64748b' }}>{idx + 1}</td>
                            <td style={{ padding: '8px', fontWeight: 800, color: '#1e1b4b' }}>{st.full_name_ar}</td>
                            <td style={{ padding: '8px', fontWeight: 700, color: st.class_number > 0 ? '#1e40af' : '#94a3b8' }}>{st.class_number ?? 0}</td>
                            <td style={{ padding: '8px', fontWeight: 800, color: (st.religion || '').includes('مسيح') ? '#d97706' : '#059669' }}>
                              {st.religion || 'مسلم'}
                            </td>
                            <td style={{ padding: '8px', fontWeight: 900, color: '#4338ca', fontSize: '14px' }}>
                              {st.seat_number ? st.seat_number : <span style={{ color: '#ef4444', fontSize: '11px' }}>غير مرقم</span>}
                            </td>
                            <td style={{ padding: '8px', fontWeight: 800, color: '#0369a1' }}>
                              {st.committee_name ? `${st.committee_name} (${st.room_number || ''})` : <span style={{ color: '#94a3b8', fontSize: '11px' }}>لم يوزع بعد</span>}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => setEditingStudent(st)}
                                style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                              >
                                ✏️ تعديل
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-Tab 1.3: توزيع اللجان الامتحانية والكشاف الإحصائي المباشر */}
              {subTabSetup === 'committees' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Allocation Overview Live Counter Panel (الكشاف الإحصائي العام للتوزيع) */}
                  <div style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)', color: '#fff', padding: '16px', borderRadius: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#a7f3d0' }}>📊 إجمالي طلاب الصف</span>
                      <h3 style={{ margin: '4px 0 0 0', fontWeight: 900, color: '#fff' }}>{students.length} طالب</h3>
                    </div>
                    <div style={{ textAlign: 'center', borderRight: '1px solid #059669' }}>
                      <span style={{ fontSize: '11px', color: '#a7f3d0' }}>🟢 الموزعون على اللجان</span>
                      <h3 style={{ margin: '4px 0 0 0', fontWeight: 900, color: '#6ee7b7' }}>
                        {committeesStats.reduce((acc, c) => acc + (c.total_assigned || 0), 0)} طالب
                      </h3>
                    </div>
                    <div style={{ textAlign: 'center', borderRight: '1px solid #059669' }}>
                      <span style={{ fontSize: '11px', color: '#a7f3d0' }}>🔴 متبقون بدون لجنة</span>
                      <h3 style={{ margin: '4px 0 0 0', fontWeight: 900, color: (students.length - committeesStats.reduce((acc, c) => acc + (c.total_assigned || 0), 0)) > 0 ? '#fca5a5' : '#6ee7b7' }}>
                        {Math.max(0, students.length - committeesStats.reduce((acc, c) => acc + (c.total_assigned || 0), 0))} طالب
                      </h3>
                    </div>
                    <div style={{ textAlign: 'center', borderRight: '1px solid #059669' }}>
                      <span style={{ fontSize: '11px', color: '#a7f3d0' }}>🏫 إجمالي اللجان المفعلة</span>
                      <h3 style={{ margin: '4px 0 0 0', fontWeight: 900, color: '#fde047' }}>{committeesStats.length} لجنة</h3>
                    </div>
                  </div>

                  {/* Mode Selector & Allocation Form */}
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 14px 0', fontWeight: 800, color: '#1e1b4b' }}>🏫 خيارات وتقسيم اللجان الامتحانية للصف</h3>
                    
                    {/* Allocation Mode Switcher */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                      <button
                        type="button"
                        onClick={() => setCommitteeForm({ ...committeeForm, distributionMode: 'equal' })}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: committeeForm.distributionMode === 'equal' ? '#4338ca' : '#f8fafc', color: committeeForm.distributionMode === 'equal' ? '#fff' : '#475569', fontWeight: 800, cursor: 'pointer' }}
                      >
                        1️⃣ الطريقة الأولى: توزيع تلقائي بسعة موحدة
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommitteeForm({ ...committeeForm, distributionMode: 'custom' })}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: committeeForm.distributionMode === 'custom' ? '#4338ca' : '#f8fafc', color: committeeForm.distributionMode === 'custom' ? '#fff' : '#475569', fontWeight: 800, cursor: 'pointer' }}
                      >
                        2️⃣ الطريقة الثانية: جدول مخصص للجان والقاعات
                      </button>
                    </div>

                    {/* Equal Mode Form */}
                    {committeeForm.distributionMode === 'equal' && (
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 800, color: '#1e1b4b', display: 'block', marginBottom: '4px' }}>👥 عدد الطلاب بكل لجنة (السعة):</label>
                          <input
                            type="number"
                            value={committeeForm.capacityPerCommittee}
                            onChange={e => setCommitteeForm({ ...committeeForm, capacityPerCommittee: parseInt(e.target.value) })}
                            style={{ width: '120px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800 }}
                          />
                        </div>
                        <div style={{ marginTop: '20px' }}>
                          <button onClick={handleSaveCommittees} style={{ background: '#059669', color: '#fff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: 800, cursor: 'pointer' }}>
                            ⚡ حساب وتقسيم الطلاب على اللجان تلقائياً
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Custom Table Mode Form */}
                    {committeeForm.distributionMode === 'custom' && (
                      <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h4 style={{ margin: 0, fontWeight: 800, color: '#1e1b4b' }}>تحديد اللجان والقاعات المخصصة:</h4>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => setCommitteeForm(prev => ({
                                ...prev,
                                manualCommittees: [...prev.manualCommittees, { committeeName: `لجنة (${prev.manualCommittees.length + 1})`, buildingName: 'المبنى الرئيسي', roomNumber: `قاعة (${prev.manualCommittees.length + 1})`, capacity: 20 }]
                              }))}
                              style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                            >
                              ➕ إضافة لجنة جديدة
                            </button>
                            <button
                              onClick={handleSaveCommittees}
                              style={{ background: '#059669', color: '#fff', padding: '6px 16px', borderRadius: '6px', border: 'none', fontWeight: 800, cursor: 'pointer' }}
                            >
                              💾 حفظ وتوزيع الطلاب طبقاً للجدول
                            </button>
                          </div>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ background: '#e2e8f0', textAlign: 'right' }}>
                              <th style={{ padding: '6px' }}>اسم اللجنة</th>
                              <th style={{ padding: '6px' }}>اسم المبنى / القاعة</th>
                              <th style={{ padding: '6px' }}>السعة المطلوب تخصيصها</th>
                              <th style={{ padding: '6px', textAlign: 'center' }}>إجراء</th>
                            </tr>
                          </thead>
                          <tbody>
                            {committeeForm.manualCommittees.map((mc, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #cbd5e1' }}>
                                <td style={{ padding: '6px' }}>
                                  <input type="text" value={mc.committeeName} onChange={e => {
                                    const updated = [...committeeForm.manualCommittees];
                                    updated[idx].committeeName = e.target.value;
                                    setCommitteeForm({ ...committeeForm, manualCommittees: updated });
                                  }} style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                </td>
                                <td style={{ padding: '6px' }}>
                                  <input type="text" value={mc.roomNumber} onChange={e => {
                                    const updated = [...committeeForm.manualCommittees];
                                    updated[idx].roomNumber = e.target.value;
                                    setCommitteeForm({ ...committeeForm, manualCommittees: updated });
                                  }} style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                </td>
                                <td style={{ padding: '6px' }}>
                                  <input type="number" value={mc.capacity} onChange={e => {
                                    const updated = [...committeeForm.manualCommittees];
                                    updated[idx].capacity = parseInt(e.target.value);
                                    setCommitteeForm({ ...committeeForm, manualCommittees: updated });
                                  }} style={{ width: '100px', padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 800 }} />
                                </td>
                                <td style={{ padding: '6px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => setCommitteeForm({ ...committeeForm, manualCommittees: committeeForm.manualCommittees.filter((_, i) => i !== idx) })}
                                    style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 800 }}
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Live Committees Detailed Stats Counter Panel (كشاف اللجان الظاهر المطلوب) */}
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h3 style={{ margin: 0, fontWeight: 900, fontSize: '16px', color: '#1e1b4b' }}>
                        📊 الكشاف الإحصائي المباشر لجميع اللجان الامتحانية ({committeesStats.length} لجنة)
                      </h3>
                      <span style={{ fontSize: '12px', color: '#059669', fontWeight: 800 }}>
                        ⚡ تحديث حي ومباشر فور أي تعديل
                      </span>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                      <thead>
                        <tr style={{ background: '#1e1b4b', color: '#fff', textAlign: 'right' }}>
                          <th style={{ padding: '10px' }}>رقم اللجنة</th>
                          <th style={{ padding: '10px' }}>اسم القاعة / المكان</th>
                          <th style={{ padding: '10px' }}>عدد مسلم ☪️</th>
                          <th style={{ padding: '10px' }}>عدد مسيحي ✝️</th>
                          <th style={{ padding: '10px' }}>إجمالي الطلاب 👥</th>
                          <th style={{ padding: '10px' }}>من رقم جلوس 🔢</th>
                          <th style={{ padding: '10px' }}>إلى رقم جلوس 🔢</th>
                          <th style={{ padding: '10px', textAlign: 'center' }}>العمليات والطباعة السريعة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {committeesStats.map((c, i) => (
                          <tr key={c.id || i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                            <td style={{ padding: '10px', fontWeight: 900, color: '#312e81' }}>{c.committee_name}</td>
                            <td style={{ padding: '10px', fontWeight: 800 }}>{c.room_number || 'قاعة (1)'}</td>
                            <td style={{ padding: '10px', fontWeight: 900, color: '#059669' }}>{c.muslim_count || 0}</td>
                            <td style={{ padding: '10px', fontWeight: 900, color: '#d97706' }}>{c.christian_count || 0}</td>
                            <td style={{ padding: '10px', fontWeight: 900, color: '#4338ca', fontSize: '13.5px' }}>{c.total_assigned || 0} / {c.max_capacity}</td>
                            <td style={{ padding: '10px', fontWeight: 900, color: '#0284c7' }}>{c.from_seat_number || '-'}</td>
                            <td style={{ padding: '10px', fontWeight: 900, color: '#0284c7' }}>{c.to_seat_number || '-'}</td>
                            <td style={{ padding: '10px', textAlign: 'center', display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button
                                type="button"
                                onClick={() => window.print()}
                                style={{ background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                              >
                                🖨️ كشف مناداة
                              </button>
                              <button
                                type="button"
                                onClick={() => window.print()}
                                style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                              >
                                🏷️ ملصقات الدسكات
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {committeesStats.length > 0 && (
                        <tfoot>
                          <tr style={{ background: '#e0e7ff', fontWeight: 900, color: '#1e1b4b' }}>
                            <td style={{ padding: '10px' }}>الجملة الكلية</td>
                            <td style={{ padding: '10px' }}>{committeesStats.length} لجنة</td>
                            <td style={{ padding: '10px', color: '#059669' }}>{committeesStats.reduce((acc, c) => acc + (c.muslim_count || 0), 0)} مسلم</td>
                            <td style={{ padding: '10px', color: '#d97706' }}>{committeesStats.reduce((acc, c) => acc + (c.christian_count || 0), 0)} مسيحي</td>
                            <td style={{ padding: '10px', color: '#4338ca' }}>{committeesStats.reduce((acc, c) => acc + (c.total_assigned || 0), 0)} طالب</td>
                            <td colSpan="3" style={{ padding: '10px', textAlign: 'center' }}>إصدار كشوفات الملاحظة والندب مكتملة ✅</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-Tab 1.4: مطبوعات إعداد الامتحان (الـ 30 تقرير) */}
              {subTabSetup === 'reports' && (
                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 14px 0', fontWeight: 900, color: '#1e1b4b' }}>🖨️ دليل مطبوعات وتقارير إعداد الامتحان (أكثر من 30 تقرير جاهز)</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                    {['كشف الندب وتوزيع المراقبة', 'بطاقات أرقام الجلوس للمقاعد', 'كشف المناداة والتوقيعات', 'قوائم اللجان والملاحظة', 'جدول توزيع قاعات الامتحانات', 'سجل أمان الكنترول'].map((rep, i) => (
                      <div key={i} style={{ border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '13px' }}>{i + 1}. {rep}</span>
                        <button style={{ background: '#4338ca', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>طباعة</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 2️⃣ الفصل الدراسي الأول */}
          {activeTab === 'term1' && (
            <div>

              {subTabTerm1 === 'work' && (
                <MarksEntryPanel
                  term={1}
                  mode="work"
                  gradeId={selectedGradeId}
                  examSubjects={subjects}
                  secretSummary={secretSummary}
                  setMsg={setMsg}
                />
              )}

              {subTabTerm1 === 'exam' && (
                <MarksEntryPanel
                  term={1}
                  mode="exam"
                  gradeId={selectedGradeId}
                  examSubjects={subjects}
                  secretSummary={secretSummary}
                  setMsg={setMsg}
                />
              )}

              {subTabTerm1 === 'secret' && (
                <SecretCodesPanel
                  term={1}
                  students={students}
                  secretMode={secretMode} setSecretMode={setSecretMode}
                  equalGroupSize={equalGroupSize} setEqualGroupSize={setEqualGroupSize}
                  equalStartCode={equalStartCode} setEqualStartCode={setEqualStartCode}
                  equalGroups={equalGroups} setEqualGroups={setEqualGroups}
                  manualGroups={manualGroups} setManualGroups={setManualGroups}
                  secretSummary={secretSummary}
                  loading={loading}
                  onPreview={handlePreviewEqualGroups}
                  onGenerate={handleGenerateSecretCodes}
                  onPrint={handlePrintSecretSheet}
                  onFetchSummary={fetchSecretSummary}
                />
              )}


              {subTabTerm1 === 'search' && (
                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontWeight: 800 }}>🔍 البحث المخصص عن طالب بالرقم السرّي أو رقم الجلوس</h3>
                  <input
                    type="text" placeholder="ادخل رقم الجلوس أو السرّي أو اسم الطالب..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: '100%', maxWidth: '400px', padding: '10px', borderRadius: '8px', border: '2px solid #6366f1', marginBottom: '16px' }}
                  />
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', textAlign: 'right' }}>
                        <th style={{ padding: '8px' }}>الاسم</th>
                        <th style={{ padding: '8px' }}>رقم الجلوس</th>
                        <th style={{ padding: '8px' }}>السرّي (ت1)</th>
                        <th style={{ padding: '8px' }}>اللجنة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map(s => (
                        <tr key={s.control_student_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px', fontWeight: 800 }}>{s.full_name_ar}</td>
                          <td style={{ padding: '8px', fontWeight: 800, color: '#0284c7' }}>{s.seat_number}</td>
                          <td style={{ padding: '8px', fontWeight: 800, color: '#d97706' }}>{s.secret_code_term1 || '🔒 مشفر'}</td>
                          <td style={{ padding: '8px' }}>{s.committee_name || 'لم يوزع'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: 3️⃣ الفصل الدراسي الثاني */}
          {activeTab === 'term2' && (
            <div>

              {subTabTerm2 === 'work' && (
                <MarksEntryPanel
                  term={2}
                  mode="work"
                  gradeId={selectedGradeId}
                  examSubjects={subjects}
                  secretSummary={secretSummary}
                  setMsg={setMsg}
                />
              )}

              {subTabTerm2 === 'exam' && (
                <MarksEntryPanel
                  term={2}
                  mode="exam"
                  gradeId={selectedGradeId}
                  examSubjects={subjects}
                  secretSummary={secretSummary}
                  setMsg={setMsg}
                />
              )}

              {subTabTerm2 === 'secret' && (
                <SecretCodesPanel
                  term={2}
                  students={students}
                  secretMode={secretMode} setSecretMode={setSecretMode}
                  equalGroupSize={equalGroupSize} setEqualGroupSize={setEqualGroupSize}
                  equalStartCode={equalStartCode} setEqualStartCode={setEqualStartCode}
                  equalGroups={equalGroups} setEqualGroups={setEqualGroups}
                  manualGroups={manualGroups} setManualGroups={setManualGroups}
                  secretSummary={secretSummary}
                  loading={loading}
                  onPreview={handlePreviewEqualGroups}
                  onGenerate={handleGenerateSecretCodes}
                  onPrint={handlePrintSecretSheet}
                  onFetchSummary={fetchSecretSummary}
                />
              )}
            </div>
          )}

          {/* Modal for Editing Individual Student Seat / Committee */}
          {editingStudent && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
              <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '420px', maxWidth: '90%' }}>
                <h3 style={{ margin: '0 0 12px 0', fontWeight: 800 }}>✏️ تعديل بيانات الكنترول للطالب</h3>
                <p style={{ margin: '0 0 14px 0', fontSize: '13px', fontWeight: 700, color: '#4338ca' }}>{editingStudent.full_name_ar}</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>رقم الجلوس:</label>
                    <input
                      type="number"
                      value={editingStudent.seat_number || ''}
                      onChange={e => setEditingStudent({ ...editingStudent, seat_number: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>اللجنة الامتحانية:</label>
                    <select
                      value={editingStudent.committee_id || ''}
                      onChange={e => setEditingStudent({ ...editingStudent, committee_id: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800 }}
                    >
                      <option value="">-- بدون لجنة --</option>
                      {committeesStats.map(c => (
                        <option key={c.id} value={c.id}>🏫 {c.committee_name} ({c.room_number || ''})</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      onClick={() => handleSaveStudentControlData(editingStudent.id, editingStudent.seat_number, editingStudent.committee_id)}
                      style={{ flex: 1, background: '#059669', color: '#fff', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 800, cursor: 'pointer' }}
                    >
                      💾 حفظ التعديل
                    </button>
                    <button
                      onClick={() => setEditingStudent(null)}
                      style={{ background: '#f1f5f9', color: '#475569', padding: '10px 14px', borderRadius: '6px', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: 5️⃣ غلق الكنترول */}
          {activeTab === 'close' && (
            <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <Award size={48} color="#059669" style={{ margin: '0 auto 16px auto' }} />
              <h3 style={{ margin: '0 0 8px 0', fontWeight: 900, color: '#1e1b4b' }}>
                الاعتماد والترحيل التلقائي للصف الدراسي
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '500px', margin: '0 auto 20px auto' }}>
                يقوم هذا الخيار بتأمين وقفل نتائج الكنترول وترحيل الطلاب الناجحين تلقائياً للصف الأعلى للعام الجديد.
              </p>
              <button style={{ background: '#059669', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 800, cursor: 'pointer' }}>
                🚀 الاعتماد والترحيل للصف الأعلى
              </button>
            </div>
          )}
          {/* Hidden Printable Secret Sheet (Kashf Serry) */}
          {printReady && secretSummary && (

            <div id="printable-secret-sheet" className="printable-secret-area">
              <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900 }}>كشاف الأرقام السرية (سرّي للغاية)</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 700 }}>
                  الترم {printTerm === 1 ? 'الأول' : 'الثاني'} — العام الدراسي 2025 / 2026
                </p>
              </div>

              <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 800 }}>ملخص المجموعات السرية:</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', textAlign: 'center', fontSize: '13px' }} border="1">
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: '8px' }}>المجموعة</th>
                    <th style={{ padding: '8px' }}>عدد الطلاب</th>
                    <th style={{ padding: '8px' }}>من رقم الجلوس</th>
                    <th style={{ padding: '8px' }}>إلى رقم الجلوس</th>
                    <th style={{ padding: '8px' }}>من الرقم السرّي</th>
                    <th style={{ padding: '8px' }}>إلى الرقم السرّي</th>
                  </tr>
                </thead>
                <tbody>
                  {secretSummary.groups.map(g => (
                    <tr key={g.group_label}>
                      <td style={{ padding: '8px', fontWeight: 800 }}>المجموعة ({g.group_label})</td>
                      <td style={{ padding: '8px' }}>{g.student_count}</td>
                      <td style={{ padding: '8px' }}>{g.from_seat || '-'}</td>
                      <td style={{ padding: '8px' }}>{g.to_seat || '-'}</td>
                      <td style={{ padding: '8px', fontWeight: 800, color: '#312e81' }}>{g.from_secret || '-'}</td>
                      <td style={{ padding: '8px', fontWeight: 800, color: '#312e81' }}>{g.to_secret || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 800 }}>كشف التفاصيل الكاملة للطلاب (مرتب حسـب المجموعة والسرّي):</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '12px' }} border="1">
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: '6px' }}>م</th>
                    <th style={{ padding: '6px' }}>المجموعة</th>
                    <th style={{ padding: '6px' }}>رقم الجلوس</th>
                    <th style={{ padding: '6px' }}>الرقم السرّي</th>
                    <th style={{ padding: '6px' }}>اسم الطالب</th>
                    <th style={{ padding: '6px' }}>اللجنة</th>
                  </tr>
                </thead>
                <tbody>
                  {secretSummary.students.map((st, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '6px' }}>{idx + 1}</td>
                      <td style={{ padding: '6px', fontWeight: 800 }}>{st.group_label}</td>
                      <td style={{ padding: '6px' }}>{st.seat_number || '-'}</td>
                      <td style={{ padding: '6px', fontWeight: 900 }}>{st.secret_code || '-'}</td>
                      <td style={{ padding: '6px', textAlign: 'right' }}>{st.full_name_ar}</td>
                      <td style={{ padding: '6px' }}>{st.committee_name ? `${st.committee_name} (${st.room_number || ''})` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', padding: '0 20px', fontWeight: 800 }}>
                <div>عضو الكنترول: ..........................</div>
                <div>رئيس الكنترول: ..........................</div>
                <div>يعتمد مدير المدرسة: ..........................</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Sub-Component: Secret Codes Full Management Panel ────────────────────────
function SecretCodesPanel({
  term, students, secretMode, setSecretMode,
  equalGroupSize, setEqualGroupSize, equalStartCode, setEqualStartCode,
  equalGroups, setEqualGroups, manualGroups, setManualGroups,
  secretSummary, loading, onPreview, onGenerate, onPrint, onFetchSummary
}) {
  useEffect(() => {
    onFetchSummary(term);
  }, [term]);

  const addManualGroup = () => {
    const nextLabel = String(manualGroups.length + 1);
    const lastGrp = manualGroups[manualGroups.length - 1];
    const nextStart = lastGrp ? (parseInt(lastGrp.startCode) + parseInt(lastGrp.count || 30)) : 5001;
    setManualGroups([...manualGroups, { groupLabel: nextLabel, count: 30, startCode: nextStart }]);
  };

  const removeManualGroup = (index) => {
    if (manualGroups.length <= 1) return;
    setManualGroups(manualGroups.filter((_, i) => i !== index));
  };

  const updateManualGroup = (index, field, val) => {
    const updated = [...manualGroups];
    updated[index][field] = val;
    setManualGroups(updated);
  };

  const updateEqualGroup = (index, field, val) => {
    const updated = [...equalGroups];
    updated[index][field] = val;
    setEqualGroups(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Control Panel Header & Mode Selection */}
      <div style={{ background: '#fff', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontWeight: 900, color: '#1e1b4b', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔒 إعداد وتوزيع الأرقام السرية — الترم {term === 1 ? 'الأول' : 'الثاني'}
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
              إجمالي الطلاب المتاحين للتوزيع بالصف: <strong style={{ color: '#4338ca' }}>{students.length} طالب</strong> (مرتبين حسب رقم الجلوس)
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => onPrint(term)}
              style={{ background: '#059669', color: '#fff', padding: '10px 18px', borderRadius: '8px', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px' }}
            >
              <Printer size={18} /> 🖨️ طباعة كشاف السرّي
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', gap: '12px', background: '#f8fafc', padding: '6px', borderRadius: '10px', width: 'fit-content', border: '1px solid #e2e8f0' }}>
          <button
            onClick={() => {
              setSecretMode('equal');
              setManualGroups([{ groupLabel: '1', count: 30, startCode: 5001 }]);
            }}
            style={{
              padding: '10px 20px', borderRadius: '8px', fontWeight: 800, fontSize: '13px', border: 'none', cursor: 'pointer',
              background: secretMode === 'equal' ? '#4338ca' : 'transparent',
              color: secretMode === 'equal' ? '#fff' : '#64748b'
            }}
          >
            📊 1. تقسيم تلقائي لمجموعات متساوية
          </button>
          <button
            onClick={() => {
              setSecretMode('manual');
              setEqualGroups([]);
            }}
            style={{
              padding: '10px 20px', borderRadius: '8px', fontWeight: 800, fontSize: '13px', border: 'none', cursor: 'pointer',
              background: secretMode === 'manual' ? '#4338ca' : 'transparent',
              color: secretMode === 'manual' ? '#fff' : '#64748b'
            }}
          >
            ✍️ 2. تقسيم مخصص حسب رغبة المستخدم
          </button>
        </div>
      </div>

      {/* 2. Method 1: Equal Groups Config */}
      {secretMode === 'equal' && (
        <div style={{ background: '#fff', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 16px 0', fontWeight: 800, color: '#1e293b' }}>الضوابط العامة للتقسيم المتساوي:</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>عدد الطلاب بكل مجموعة:</label>
              <input
                type="number" value={equalGroupSize} onChange={e => setEqualGroupSize(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>بداية أول رقم سرّي افتراضي:</label>
              <input
                type="number" value={equalStartCode} onChange={e => setEqualStartCode(parseInt(e.target.value) || 5001)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={onPreview}
                style={{ background: '#4338ca', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 800, cursor: 'pointer', width: '100%' }}
              >
                🔄 معاينة وتكوين المجموعات
              </button>
            </div>
          </div>

          {equalGroups.length > 0 && (
            <div>
              <h5 style={{ margin: '0 0 10px 0', fontWeight: 800, color: '#334155' }}>جدول المجموعات المولّدة تلقائياً (يمكنك تعديل بداية السرّي لكل مجموعة):</h5>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', textAlign: 'right' }}>
                    <th style={{ padding: '10px' }}>اسم / رقم المجموعة</th>
                    <th style={{ padding: '10px' }}>عدد الطلاب</th>
                    <th style={{ padding: '10px' }}>بداية الرقم السرّي (قابلة للتعديل)</th>
                  </tr>
                </thead>
                <tbody>
                  {equalGroups.map((g, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', fontWeight: 800 }}>المجموعة ({g.groupLabel})</td>
                      <td style={{ padding: '10px', fontWeight: 700, color: '#4338ca' }}>{g.count} طالب</td>
                      <td style={{ padding: '10px' }}>
                        <input
                          type="number" value={g.startCode} onChange={e => updateEqualGroup(idx, 'startCode', e.target.value)}
                          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800, color: '#15803d', width: '140px' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                onClick={() => onGenerate(term)} disabled={loading}
                style={{ background: '#d97706', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 900, cursor: 'pointer', fontSize: '14px' }}
              >
                {loading ? 'جاري التوزيع...' : `🔒 اعتماد وتطبيق الأرقام السرية للترم ${term === 1 ? 'الأول' : 'الثاني'}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. Method 2: Custom / Manual Groups Config */}
      {secretMode === 'manual' && (
        <div style={{ background: '#fff', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>تحديد المجموعات يدوياً وأعدادها وبداية سرّي كل مجموعة:</h4>
            <button
              onClick={addManualGroup}
              style={{ background: '#4338ca', color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '12.5px' }}
            >
              ➕ إضافة مجموعة جديدة
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', textAlign: 'right' }}>
                <th style={{ padding: '10px' }}>اسم / رقم المجموعة</th>
                <th style={{ padding: '10px' }}>سعة المجموعة (عدد الطلاب)</th>
                <th style={{ padding: '10px' }}>بداية الرقم السرّي للمجموعة</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {manualGroups.map((g, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px' }}>
                    <input
                      type="text" value={g.groupLabel} onChange={e => updateManualGroup(idx, 'groupLabel', e.target.value)}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800, width: '120px' }}
                    />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input
                      type="number" value={g.count} onChange={e => updateManualGroup(idx, 'count', e.target.value)}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, width: '120px' }}
                    />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input
                      type="number" value={g.startCode} onChange={e => updateManualGroup(idx, 'startCode', e.target.value)}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800, color: '#15803d', width: '140px' }}
                    />
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button
                      onClick={() => removeManualGroup(idx)} disabled={manualGroups.length <= 1}
                      style={{ background: '#fee2e2', color: '#dc2626', padding: '6px 12px', borderRadius: '6px', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={() => onGenerate(term)} disabled={loading}
            style={{ background: '#d97706', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 900, cursor: 'pointer', fontSize: '14px' }}
          >
            {loading ? 'جاري التوزيع...' : `🔒 اعتماد وتطبيق الأرقام السرية المخصصة (ترم ${term === 1 ? 'أول' : 'ثاني'})`}
          </button>
        </div>
      )}

      {/* 4. Display Table: Generated Secret Groups Summary */}
      {secretSummary && secretSummary.groups && secretSummary.groups.length > 0 && (
        <div style={{ background: '#fff', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 16px 0', fontWeight: 900, color: '#1e1b4b', fontSize: '16px' }}>
            📋 ملخص كشاف الأرقام السرية المسجلة حالياً (الترم ${term === 1 ? 'الأول' : 'الثاني'}):
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: '#312e81', color: '#fff' }}>
                <th style={{ padding: '10px' }}>المجموعة</th>
                <th style={{ padding: '10px' }}>عدد الطلاب الموزعين</th>
                <th style={{ padding: '10px' }}>من رقم جلوس</th>
                <th style={{ padding: '10px' }}>إلى رقم جلوس</th>
                <th style={{ padding: '10px' }}>من الرقم السرّي</th>
                <th style={{ padding: '10px' }}>إلى الرقم السرّي</th>
              </tr>
            </thead>
            <tbody>
              {secretSummary.groups.map((g, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ padding: '10px', fontWeight: 900, color: '#312e81' }}>المجموعة ({g.group_label})</td>
                  <td style={{ padding: '10px', fontWeight: 700 }}>{g.student_count} طالب</td>
                  <td style={{ padding: '10px', color: '#475569' }}>{g.from_seat || '-'}</td>
                  <td style={{ padding: '10px', color: '#475569' }}>{g.to_seat || '-'}</td>
                  <td style={{ padding: '10px', fontWeight: 900, color: '#059669' }}>{g.from_secret || '-'}</td>
                  <td style={{ padding: '10px', fontWeight: 900, color: '#059669' }}>{g.to_secret || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Sub-Component: Marks Entry Panel (Full Official Implementation - Side Toolbar Layout) ────────
function MarksEntryPanel({ term, mode, gradeId, examSubjects = [], secretSummary, setMsg }) {
  const [entryMode, setEntryMode] = useState('vertical'); // 'vertical' | 'horizontal'
  const [activeSubjectId, setActiveSubjectId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [unprintedFilterOnly, setUnprintedFilterOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [marksGrid, setMarksGrid] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (examSubjects.length > 0 && !activeSubjectId) {
      setActiveSubjectId(examSubjects[0].id);
    }
  }, [examSubjects]);

  useEffect(() => {
    if (gradeId) {
      fetchMarksAndStudents();
    }
  }, [gradeId, term, selectedClassId]);

  const fetchMarksAndStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/control/marks?gradeId=${gradeId}&term=${term}&classId=${selectedClassId}`);
      const data = await res.json();
      if (data.success) {
        setStudents(data.students || []);
        
        // Extract unique classes list
        const uClasses = [];
        const seen = new Set();
        (data.students || []).forEach(st => {
          if (st.class_id && !seen.has(st.class_id)) {
            seen.add(st.class_id);
            uClasses.push({ id: st.class_id, name: st.class_number > 0 ? String(st.class_number) : st.class_name_ar });
          }
        });
        setClassesList(uClasses);

        // Build Marks Grid
        const grid = {};
        (data.students || []).forEach(st => {
          grid[st.control_student_id] = {};
        });

        (data.marks || []).forEach(m => {
          if (!grid[m.control_student_id]) grid[m.control_student_id] = {};
          const val = mode === 'work' ? m.work_marks : m.written_marks;
          grid[m.control_student_id][m.subject_id] = {
            mark: m.is_absent ? 'غائب' : m.is_exempt ? 'معفى' : (val !== null && val !== undefined ? String(val) : ''),
            is_absent: !!m.is_absent,
            is_exempt: !!m.is_exempt
          };
        });
        setMarksGrid(grid);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const activeSubject = examSubjects.find(s => String(s.id) === String(activeSubjectId)) || examSubjects[0] || null;

  const getMaxMark = (subj) => {
    if (!subj) return 100;
    return mode === 'work'
      ? (term === 1 ? (subj.term1_work_mark || 15) : (subj.term2_work_mark || 15))
      : (term === 1 ? (subj.term1_exam_mark || 35) : (subj.term2_exam_mark || 35));
  };

  const handleCellChange = (studentId, subjectId, rawVal) => {
    const subj = examSubjects.find(s => String(s.id) === String(subjectId));
    const maxM = getMaxMark(subj);

    let isAbsent = false;
    let isExempt = false;
    let finalVal = rawVal;

    const trimmed = String(rawVal).trim();
    if (['غ', 'غائب', 'غـ'].includes(trimmed)) {
      isAbsent = true;
      finalVal = 'غائب';
    } else if (['معفى', 'م'].includes(trimmed)) {
      isExempt = true;
      finalVal = 'معفى';
    } else if (trimmed === 'صفر') {
      finalVal = '0';
    } else if (trimmed !== '') {
      const num = parseFloat(trimmed);
      if (!isNaN(num)) {
        if (num > maxM) {
          setMsg({ type: 'error', text: `الدرجة المدخلة (${num}) تتجاوز النهاية العظمى للمادة (${maxM})` });
          finalVal = String(maxM);
        } else if (num < 0) {
          finalVal = '0';
        }
      }
    }

    setMarksGrid(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subjectId]: {
          mark: finalVal,
          is_absent: isAbsent,
          is_exempt: isExempt
        }
      }
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const marksPayload = [];
      Object.keys(marksGrid).forEach(stId => {
        Object.keys(marksGrid[stId]).forEach(subId => {
          const item = marksGrid[stId][subId];
          const numVal = parseFloat(item.mark) || 0;
          marksPayload.push({
            control_student_id: parseInt(stId),
            subject_id: parseInt(subId),
            work_marks: mode === 'work' ? (item.is_absent || item.is_exempt ? 0 : numVal) : 0,
            written_marks: mode === 'exam' ? (item.is_absent || item.is_exempt ? 0 : numVal) : 0,
            is_absent: item.is_absent ? 1 : 0,
            is_exempt: item.is_exempt ? 1 : 0
          });
        });
      });

      const res = await fetch(`http://${window.location.hostname}:3001/api/control/marks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks: marksPayload, term, academicYearId: 1 })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: '💾 تم حفظ جميع التغييرات وتحديث نتائج الكنترول بنجاح!' });
      } else {
        setMsg({ type: 'error', text: data.error || 'فشل حفظ الدرجات.' });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'خطأ في الاتصال بالخادم.' });
    } finally {
      setSaving(false);
    }
  };

  // Filter students
  const filteredStudents = students.filter(st => {
    if (selectedClassId !== 'all' && String(st.class_id) !== String(selectedClassId)) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = st.full_name_ar?.toLowerCase().includes(q);
      const seatMatch = String(st.seat_number || '').includes(q);
      const secMatch = term === 1 ? String(st.secret_code_term1 || '').includes(q) : String(st.secret_code_term2 || '').includes(q);
      if (!nameMatch && !seatMatch && !secMatch) return false;
    }

    if (unprintedFilterOnly && activeSubjectId) {
      const item = marksGrid[st.control_student_id]?.[activeSubjectId];
      if (item && item.mark !== '' && item.mark !== undefined) return false;
    }

    return true;
  });

  // Calculate subject progress
  const activeMarkedCount = students.filter(st => {
    const item = marksGrid[st.control_student_id]?.[activeSubjectId];
    return item && item.mark !== '' && item.mark !== undefined;
  }).length;
  const activeTotalCount = students.length;
  const progressPercent = activeTotalCount > 0 ? Math.round((activeMarkedCount / activeTotalCount) * 100) : 0;

  // Keyboard navigation
  const handleKeyDown = (e, studentIndex, subjectId) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextId = `input-${studentIndex + 1}-${subjectId}`;
      const nextEl = document.getElementById(nextId);
      if (nextEl) nextEl.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevId = `input-${studentIndex - 1}-${subjectId}`;
      const prevEl = document.getElementById(prevId);
      if (prevEl) prevEl.focus();
    } else if (e.key === 'Tab') {
      if (entryMode === 'horizontal') {
        const subIdx = examSubjects.findIndex(s => String(s.id) === String(subjectId));
        if (subIdx !== -1 && subIdx < examSubjects.length - 1) {
          e.preventDefault();
          const nextSubId = examSubjects[subIdx + 1].id;
          const nextEl = document.getElementById(`input-${studentIndex}-${nextSubId}`);
          if (nextEl) nextEl.focus();
        }
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Sleek Ultra-Compact Horizontal Toolbar (Reduced Height & Bold Typography) */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
        background: '#111c30', padding: '6px 14px', borderRadius: '10px', color: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
        fontFamily: "'Cairo', sans-serif"
      }}>
        {/* Right Action Group: Save & Entry Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            style={{
              background: '#059669', color: '#fff', padding: '5px 14px', borderRadius: '6px', border: 'none',
              fontWeight: 900, fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)', fontFamily: "'Cairo', sans-serif"
            }}
          >
            💾 {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>

          <div style={{ display: 'flex', background: '#1e293b', padding: '2px', borderRadius: '6px' }}>
            <button
              onClick={() => setEntryMode('vertical')}
              style={{
                padding: '4px 10px', borderRadius: '4px', border: 'none', fontWeight: 800, fontSize: '11.5px', cursor: 'pointer',
                background: entryMode === 'vertical' ? '#2563eb' : 'transparent', color: '#fff', fontFamily: "'Cairo', sans-serif"
              }}
            >
              ⬇️ رصد رأسي (مادة بمادة)
            </button>
            <button
              onClick={() => setEntryMode('horizontal')}
              style={{
                padding: '4px 10px', borderRadius: '4px', border: 'none', fontWeight: 800, fontSize: '11.5px', cursor: 'pointer',
                background: entryMode === 'horizontal' ? '#2563eb' : 'transparent', color: '#fff', fontFamily: "'Cairo', sans-serif"
              }}
            >
              ➡️ رصد أفقي (لكافة المواد)
            </button>
          </div>

          <button
            onClick={() => setUnprintedFilterOnly(!unprintedFilterOnly)}
            style={{
              padding: '5px 11px', borderRadius: '6px', border: 'none', fontWeight: 800, fontSize: '11.5px', cursor: 'pointer',
              background: unprintedFilterOnly ? '#d97706' : '#334155', color: '#fff', fontFamily: "'Cairo', sans-serif"
            }}
          >
            🔻 {unprintedFilterOnly ? 'عرض الجميع' : 'تصفية غير المرصودين'}
          </button>
        </div>

        {/* Center Group: Class Filter & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '12px', background: '#fff', color: '#0f172a', fontFamily: "'Cairo', sans-serif" }}
          >
            <option value="all">جميع الفصول ({students.length} طالب)</option>
            {classesList.map(c => (
              <option key={c.id} value={c.id}>فصل {c.name}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="🔍 اسم، جلوس، سرّي..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 800, background: '#fff', color: '#0f172a', width: '160px', fontFamily: "'Cairo', sans-serif" }}
          />
        </div>

        {/* Left Group: Active Subject Progress Badge */}
        {activeSubject && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f172a', padding: '4px 10px', borderRadius: '6px', border: '1px solid #334155' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#93c5fd', fontFamily: "'Cairo', sans-serif" }}>
              إنجاز {activeSubject.subject_name_ar}:
            </span>
            <span style={{ fontSize: '12px', fontWeight: 900, color: '#10b981', fontFamily: "'Cairo', sans-serif" }}>
              {activeMarkedCount}/{activeTotalCount} ({progressPercent}%)
            </span>
          </div>
        )}
      </div>

      {/* 2. Main Data Table Area (100% Full Width & Height) */}
      <div style={{ width: '100%', background: '#fff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>

        {!gradeId ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: 800 }}>
            ⚠️ يرجى اختيار الصف الدراسي من الشريط العلوي أولاً للبدء في رصد الدرجات.
          </div>
        ) : examSubjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: 800 }}>
            ⚠️ لا توجد مواد مضافة لهذا الصف الدراسي بعد. يرجى إضافة المواد أولاً من تبويب "تجهيز مواد الكنترول".
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#1a56a8', fontWeight: 900 }}>
            ⏳ جاري تحميل سجلات الطلاب والدرجات...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right', fontFamily: "'Cairo', sans-serif" }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#fff', fontFamily: "'Cairo', sans-serif" }}>
                  <th style={{ padding: '10px 8px', width: '40px', textAlign: 'center', fontWeight: 800 }}>م</th>
                  <th style={{ padding: '10px 8px', width: '80px', fontWeight: 800 }}>الفصل</th>
                  <th style={{ padding: '10px 8px', width: '90px', fontWeight: 800 }}>رقم الجلوس</th>
                  {mode === 'exam' && <th style={{ padding: '10px 8px', width: '90px', fontWeight: 800 }}>السرّي</th>}
                  <th style={{ padding: '10px 12px', minWidth: '180px', fontWeight: 800 }}>اسم الطالب</th>
                  {examSubjects.map(subj => {
                    const isActive = String(subj.id) === String(activeSubjectId);
                    const maxM = getMaxMark(subj);
                    return (
                      <th
                        key={subj.id}
                        onClick={() => setActiveSubjectId(subj.id)}
                        style={{
                          padding: '10px 8px', textAlign: 'center', cursor: 'pointer',
                          background: isActive ? '#1d4ed8' : '#0f172a',
                          borderRight: '1px solid #334155', fontFamily: "'Cairo', sans-serif"
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: '13.5px' }}>{subj.subject_name_ar}</div>
                        <div style={{ fontSize: '11px', color: isActive ? '#fef08a' : '#94a3b8', fontWeight: 800 }}>({maxM} درجة)</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((st, idx) => (
                  <tr key={st.control_student_id} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '8px', color: st.class_number > 0 ? '#1e40af' : '#94a3b8', fontWeight: 700 }}>{st.class_number ?? 0}</td>
                    <td style={{ padding: '8px', fontWeight: 800, color: '#0284c7' }}>{st.seat_number || '-'}</td>
                    {mode === 'exam' && (
                      <td style={{ padding: '8px', fontWeight: 900, color: '#d97706' }}>
                        {term === 1 ? (st.secret_code_term1 || '🔒') : (st.secret_code_term2 || '🔒')}
                      </td>
                    )}
                    <td style={{ padding: '8px', fontWeight: 800, color: st.inclusion_status === 'مستبعد' ? '#94a3b8' : '#1e293b' }}>
                      {st.full_name_ar}
                      {st.inclusion_status === 'مستبعد' && (
                        <span style={{ fontSize: '11px', background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', marginRight: '8px', fontWeight: 900 }}>
                          ⚠️ مستبعد (رقم مجمّد)
                        </span>
                      )}
                    </td>

                    {examSubjects.map(subj => {
                      const isActive = String(subj.id) === String(activeSubjectId);
                      const isExcluded = st.inclusion_status === 'مستبعد';
                      const isDisabled = (entryMode === 'vertical' && !isActive) || isExcluded;
                      const maxM = getMaxMark(subj);
                      const cellData = marksGrid[st.control_student_id]?.[subj.id] || { mark: '', is_absent: false, is_exempt: false };

                      return (
                        <td
                          key={subj.id}
                          style={{
                            padding: '6px', textAlign: 'center',
                            background: isActive ? '#f0f9ff' : 'transparent',
                            borderRight: '1px solid #f1f5f9'
                          }}
                        >
                          <input
                            id={`input-${idx}-${subj.id}`}
                            type="text"
                            disabled={isDisabled}
                            value={isExcluded ? 'مستبعد' : cellData.is_exempt ? 'معفى' : cellData.mark}
                            onChange={e => {
                              if (e.target.value.trim() === 'معفى') {
                                setMarksGrid(prev => ({
                                  ...prev,
                                  [st.control_student_id]: {
                                    ...(prev[st.control_student_id] || {}),
                                    [subj.id]: { mark: 'معفى', is_exempt: true, is_absent: false }
                                  }
                                }));
                              } else {
                                handleCellChange(st.control_student_id, subj.id, e.target.value);
                              }
                            }}
                            onKeyDown={e => handleKeyDown(e, idx, subj.id)}
                            placeholder={isDisabled ? '-' : cellData.is_exempt ? 'معفى' : '0'}
                            style={{
                              width: '80px', padding: '6px', textAlign: 'center', borderRadius: '6px',
                              border: isActive ? '2px solid #1a56a8' : '1px solid #cbd5e1',
                              fontWeight: 900, fontSize: '13px',
                              background: isExcluded ? '#f3f4f6' : (isDisabled ? '#f1f5f9' : (cellData.is_absent ? '#fee2e2' : cellData.is_exempt ? '#fef3c7' : '#fff')),
                              color: isExcluded ? '#94a3b8' : (cellData.is_absent ? '#dc2626' : cellData.is_exempt ? '#b45309' : '#1e1b4b')
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer Bar */}
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: 700, color: '#64748b' }}>
              <div>عرض {filteredStudents.length} من أصل {students.length} طالب مسجلين بالكنترول</div>
              <div style={{ color: '#059669' }}>💡 نصيحة: استخدم زر Enter للتنقل الراسي، وزر Tab للتنقل الأفقي وسرعة الرصد.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

