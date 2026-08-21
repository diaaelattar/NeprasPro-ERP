// ════════════════════════════════════════════════════════════════
//  ControlMainPage.jsx — Official Egyptian School Control Room Hub
// ════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, RefreshCw, Hash, Lock, BookOpen, Layers, 
  FileSpreadsheet, Award, CheckCircle2, Users, AlertCircle, Sparkles, Printer, Eye, EyeOff, KeyRound, Building2,
  Sliders, Calendar, Scale, ArrowUpRight, FileCheck, Check, Search, FileText, Download, CheckSquare
} from 'lucide-react';
import ControlPhasePrints from './ControlPhasePrints';
import { sortStudentsByGenderAndName, isBoy, isGirl } from '../../utils/studentSorter';

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
  const [schoolInfo, setSchoolInfo] = useState(null);

  // Head of Control Authentication Session (Always strictly locked on open and resets on every exit)
  const [isHeadOfControlAuthenticated, setIsHeadOfControlAuthenticated] = useState(false);
  const [isChangePinModalOpen, setIsChangePinModalOpen] = useState(false);
  const [changePinForm, setChangePinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });

  const handleLockControlSession = () => {
    setIsHeadOfControlAuthenticated(false);
    setIsSecretUnmasked(false);
    sessionStorage.removeItem('nepras_control_auth');
    setMsg({ type: 'info', text: '🔒 تم قفل جلسة رئيس الكنترول وتأمين التبويبات السرية.' });
  };

  useEffect(() => {
    // Reset and enforce locked state on mount and unmount
    setIsHeadOfControlAuthenticated(false);
    setIsSecretUnmasked(false);
    sessionStorage.removeItem('nepras_control_auth');

    return () => {
      setIsHeadOfControlAuthenticated(false);
      setIsSecretUnmasked(false);
      sessionStorage.removeItem('nepras_control_auth');
    };
  }, []);

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
  const [tableSortMode, setTableSortMode] = useState('seat'); // 'seat' | 'boys_first' | 'girls_first' | 'name' | 'class'
  
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

  // Dynamic Control Students sorting
  const sortedControlStudents = React.useMemo(() => {
    let list = (students || []).filter(s => 
      (s.full_name_ar || '').includes(studentSearchQuery) || 
      String(s.seat_number || '').includes(studentSearchQuery) ||
      (s.classroom_name || '').includes(studentSearchQuery) ||
      (s.committee_name || '').includes(studentSearchQuery)
    );

    if (tableSortMode === 'boys_first') {
      return sortStudentsByGenderAndName(list, 'boys_first');
    }
    if (tableSortMode === 'girls_first') {
      return sortStudentsByGenderAndName(list, 'girls_first');
    }
    if (tableSortMode === 'name') {
      return [...list].sort((a, b) => String(a.full_name_ar || '').localeCompare(String(b.full_name_ar || ''), 'ar'));
    }
    if (tableSortMode === 'class') {
      return [...list].sort((a, b) => (a.class_number || 0) - (b.class_number || 0) || String(a.full_name_ar || '').localeCompare(String(b.full_name_ar || ''), 'ar'));
    }

    // Default: 'seat' (Sort by seat_number ASC, then full_name_ar ASC)
    return [...list].sort((a, b) => {
      const seatA = a.seat_number ? Number(a.seat_number) : 999999;
      const seatB = b.seat_number ? Number(b.seat_number) : 999999;
      if (seatA !== seatB) return seatA - seatB;
      return String(a.full_name_ar || '').localeCompare(String(b.full_name_ar || ''), 'ar');
    });
  }, [students, studentSearchQuery, tableSortMode]);

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
    fetchSchoolInfo();
  }, []);

  const fetchSchoolInfo = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/setup/status`);
      const data = await res.json();
      if (data && data.institution) {
        setSchoolInfo(data.institution);
      }
    } catch (e) {
      console.error(e);
    }
  };

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
      setLoading(true);
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
        setMsg({ type: 'error', text: data.error || 'فشلت استعادة افتراضيات أصل البرنامج.' });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'فشلت استعادة افتراضيات أصل البرنامج.' });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPrimaryPreset = async (presetType) => {
    if (!selectedGradeId) return;
    try {
      setLoading(true);
      let endpoint = 'preset-primary/setup';
      if (presetType === 'primary3') endpoint = 'preset-primary3/setup';
      if (presetType === 'primary456') endpoint = 'preset-primary456/setup';

      const res = await fetch(`${API_BASE}/${endpoint}`, {
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
      setMsg({ type: 'error', text: 'فشل تطبيق القالب الوزاري.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddHighLevelSubject = async (subjectType) => {
    if (!selectedGradeId) return;
    try {
      setLoading(true);
      let payload = {};
      if (subjectType === 'connect_plus') {
        payload = {
          gradeId: selectedGradeId,
          subjectNameAr: 'Connect Plus (مستوى رفيع)',
          subjectCode: 'HL_ENG',
          subjectCategory: 'مستوى_رفيع',
          term1WorkMark: 40, term1ExamMark: 60,
          term2WorkMark: 40, term2ExamMark: 60,
          passMark: 50, subjectPassPercent: 50,
          writtenPassMode: 'percent_30', writtenPassMark: 18, minExamPassMark: 18,
          isAddedToTotal: false, isFailingSubject: true,
          evaluationMethod: 'numeric_100',
          isHighLevel: true
        };
      } else if (subjectType === 'second_lang') {
        payload = {
          gradeId: selectedGradeId,
          subjectNameAr: 'اللغة الأجنبية الثانية (مستوى رفيع)',
          subjectCode: 'HL_LANG2',
          subjectCategory: 'مستوى_رفيع',
          term1WorkMark: 40, term1ExamMark: 60,
          term2WorkMark: 40, term2ExamMark: 60,
          passMark: 50, subjectPassPercent: 50,
          writtenPassMode: 'percent_30', writtenPassMark: 18, minExamPassMark: 18,
          isAddedToTotal: false, isFailingSubject: true,
          evaluationMethod: 'numeric_100',
          isHighLevel: true
        };
      } else if (subjectType === 'activity') {
        payload = {
          gradeId: selectedGradeId,
          subjectNameAr: 'نشاط تربوي إضافي',
          subjectCode: 'EXTRA_ACT',
          subjectCategory: 'نشاط',
          term1WorkMark: 0, term1ExamMark: 0,
          term2WorkMark: 0, term2ExamMark: 0,
          passMark: 0, subjectPassPercent: 0,
          isAddedToTotal: false, isFailingSubject: false,
          evaluationMethod: 'pass_fail_only'
        };
      }

      const res = await fetch(`${API_BASE}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: 'تمت إضافة المادة بنجاح.' });
        fetchSubjects();
      } else {
        setMsg({ type: 'error', text: data.error || 'فشلت إضافة المادة.' });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'فشلت إضافة المادة.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateTerm = async (term) => {
    if (!selectedGradeId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/calculate-term`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradeId: selectedGradeId, term, academicYearId: currentAcademicYearId })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: data.message });
        fetchStudents();
      } else {
        setMsg({ type: 'error', text: data.error });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'فشل احتساب نتائج الفصل الدراسي.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateFinal = async () => {
    if (!selectedGradeId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/calculate-final`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradeId: selectedGradeId, academicYearId: currentAcademicYearId })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: data.message });
        fetchStudents();
      } else {
        setMsg({ type: 'error', text: data.error });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'فشل احتساب النتيجة النهائية السنوية.' });
    } finally {
      setLoading(false);
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
      if (data.success) {
        setStudents(data.students || []);
        if (data.school) setSchoolInfo(data.school);
      }
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

  const handleVerifyPin = async (inputPin = null) => {
    const targetPin = inputPin || pinInput;
    if (!targetPin) {
      setMsg({ type: 'error', text: 'يرجى إدخال رمز أمان رئيس الكنترول.' });
      return false;
    }
    try {
      const res = await fetch(`${API_BASE}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: targetPin, userName: 'رئيس الكنترول' })
      });
      const data = await res.json();
      if (data.success) {
        setIsHeadOfControlAuthenticated(true);
        setIsSecretUnmasked(true);
        setIsPinModalOpen(false);
        setPinInput('');
        setMsg({ type: 'success', text: '🔓 تم التحقق بنجاح وتفعيل صلاحية رئيس الكنترول.' });
        return true;
      } else {
        setMsg({ type: 'error', text: data.error || 'رمز أمان رئيس الكنترول غير صحيح.' });
        return false;
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'رمز أمان رئيس الكنترول غير صحيح.' });
      return false;
    }
  };

  const handleUpdatePin = async (e) => {
    if (e) e.preventDefault();
    if (!changePinForm.newPin || changePinForm.newPin.length < 4) {
      setMsg({ type: 'error', text: 'يجب أن لا يقل الرقم السري الجديد عن 4 خانات.' });
      return;
    }
    if (changePinForm.newPin !== changePinForm.confirmPin) {
      setMsg({ type: 'error', text: 'الرقم السري الجديد وتأكيده غير متطابقين.' });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/update-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPin: changePinForm.currentPin,
          newPin: changePinForm.newPin,
          userName: 'رئيس الكنترول'
        })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: '🔒 تم تغيير الرقم السري لرئيس الكنترول بنجاح.' });
        setIsChangePinModalOpen(false);
        setChangePinForm({ currentPin: '', newPin: '', confirmPin: '' });
      } else {
        setMsg({ type: 'error', text: data.error || 'فشل تحديث الرقم السري.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'خطأ أثناء الاتصال بالخادم.' });
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
    const classMatch = (s.class_name && s.class_name.toLowerCase().includes(q)) || (s.class_number && String(s.class_number) === q);
    const committeeMatch = s.committee_name && s.committee_name.toLowerCase().includes(q);
    const secret1Match = isHeadOfControlAuthenticated && s.secret_code_term1 && String(s.secret_code_term1).includes(q);
    const secret2Match = isHeadOfControlAuthenticated && s.secret_code_term2 && String(s.secret_code_term2).includes(q);
    const nationalMatch = (q.length >= 10) && s.national_id && s.national_id.includes(q);

    return nameMatch || seatMatch || classMatch || committeeMatch || secret1Match || secret2Match || nationalMatch;
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

        {/* Head of Control Session Status / Quick Lock */}
        {isHeadOfControlAuthenticated && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '6px 12px', borderRadius: '8px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '5px' }}>
              🟢 صلاحيات رئيس الكنترول مفعلة
            </span>
            <button
              type="button"
              onClick={handleLockControlSession}
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '8px',
                fontWeight: 800, fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)'
              }}
              title="قفل التبويبات والبيانات السرية فوراً"
            >
              <Lock size={14} /> قفل الجلسة السرية
            </button>
          </div>
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
            <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
              <button
                onClick={() => { setIsPinModalOpen(false); setIsChangePinModalOpen(true); }}
                style={{ background: 'none', border: 'none', color: '#4338ca', fontSize: '12px', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
              >
                ⚙️ تغيير الرقم السري لرئيس الكنترول
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Master PIN Modal */}
      {isChangePinModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: '#fff', padding: '32px', borderRadius: '16px', width: '90%', maxWidth: '440px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
            <div style={{ width: '56px', height: '56px', background: '#e0e7ff', color: '#4338ca', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <KeyRound size={32} />
            </div>
            <h3 style={{ margin: 0, fontWeight: 900, color: '#1e1b4b' }}>تغيير الرقم السري لرئيس الكنترول</h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '8px 0 20px 0' }}>
              قم بإدخال الرقم السري الحالي ثم الرقم الجديد (4 أرقام أو حروف على الأقل).
            </p>

            <form onSubmit={handleUpdatePin} style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'right' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#1e1b4b', display: 'block', marginBottom: '4px' }}>الرقم السري الحالي *</label>
                <input
                  type="password" required
                  placeholder="الرقم السري الحالي (الافتراضي 1234)"
                  value={changePinForm.currentPin}
                  onChange={e => setChangePinForm({ ...changePinForm, currentPin: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 800 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#1e1b4b', display: 'block', marginBottom: '4px' }}>الرقم السري الجديد *</label>
                <input
                  type="password" required
                  placeholder="الرقم السري الجديد (4 خانات فأكثر)"
                  value={changePinForm.newPin}
                  onChange={e => setChangePinForm({ ...changePinForm, newPin: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 800 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#1e1b4b', display: 'block', marginBottom: '4px' }}>تأكيد الرقم السري الجديد *</label>
                <input
                  type="password" required
                  placeholder="أعد إدخال الرقم السري الجديد"
                  value={changePinForm.confirmPin}
                  onChange={e => setChangePinForm({ ...changePinForm, confirmPin: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 800 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="submit" style={{ flex: 1, background: '#059669', color: '#fff', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>
                  💾 حفظ الرقم السري الجديد
                </button>
                <button type="button" onClick={() => setIsChangePinModalOpen(false)} style={{ flex: 1, background: '#f1f5f9', color: '#475569', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                  إلغاء
                </button>
              </div>
            </form>
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
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* TAB 1: 1️⃣ إعدادات أعمال الامتحان */}
          {activeTab === 'setup' && (
            <div>

              {/* Sub-Tab 1.1: تجهيز المواد وضوابط العمل */}
              {subTabSetup === 'subjects' && (
                !isHeadOfControlAuthenticated ? (
                  <HeadOfControlLockCard
                    title="تعديل ضوابط المواد والقرار 151 وتحديد الدرجات محمي بصلاحية ورمز أمان رئيس الكنترول."
                    onUnlock={handleVerifyPin}
                    onOpenChangePin={() => setIsChangePinModalOpen(true)}
                  />
                ) : (
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
                          onClick={() => handleApplyPrimaryPreset('primary456')}
                          style={{ background: 'linear-gradient(135deg, #4338ca 0%, #3730a3 100%)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: 900, fontSize: '12px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(67, 56, 202, 0.3)' }}
                        >
                          📜 تطبيق القرار 151 (صفوف 4-5-6 ابتدائي 500 درجة)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPrimaryPreset('primary12')}
                          style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: 900, fontSize: '12px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(2, 132, 199, 0.3)' }}
                        >
                          📜 تطبيق القرار 151 (صفوف 1-2-3 ابتدائي 300 درجة)
                        </button>
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
                          <Check size={16} /> حفظ واعتماد الضوابط
                        </button>
                      </div>
                    </div>

                    {/* Optional High Level & Activities Buttons */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1', alignItems: 'center' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>🌐 مواد المستوى الرفيع واللغات (اختياري - لا تضاف للمجموع وتظهر بالشيت):</span>
                      <button
                        type="button"
                        onClick={() => handleAddHighLevelSubject('connect_plus')}
                        style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '6px', fontWeight: 800, fontSize: '11.5px', cursor: 'pointer' }}
                      >
                        ➕ Connect Plus (مستوى رفيع لغة أولى)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddHighLevelSubject('second_lang')}
                        style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '6px', fontWeight: 800, fontSize: '11.5px', cursor: 'pointer' }}
                      >
                        ➕ لغة ثانية (French/German مستوى رفيع)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddHighLevelSubject('activity')}
                        style={{ background: '#059669', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '6px', fontWeight: 800, fontSize: '11.5px', cursor: 'pointer' }}
                      >
                        ➕ مادة نشاط اختياري
                      </button>
                    </div>

                    {passingRules.isEnabled && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '14px' }}>
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
                )
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontWeight: 800, fontSize: '15px', color: '#1e1b4b' }}>
                          كشف متابعة وتعديل أرقام الجلوس واللجان لجميع الطلاب ({sortedControlStudents.length} طالب)
                        </h3>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '11.5px', color: '#64748b', marginTop: '3px' }}>
                          <span>👦 بنون: <strong style={{ color: '#2563eb' }}>{sortedControlStudents.filter(s => isBoy(s)).length}</strong></span>
                          <span>👧 بنات: <strong style={{ color: '#db2777' }}>{sortedControlStudents.filter(s => isGirl(s)).length}</strong></span>
                          <span>🔢 مرقم جلوس: <strong style={{ color: '#059669' }}>{sortedControlStudents.filter(s => s.seat_number).length}</strong></span>
                        </div>
                      </div>

                      {/* Sorting Quick Selector Toolbar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', padding: '0 4px' }}>ترتيب العرض:</span>
                        <button
                          type="button"
                          onClick={() => setTableSortMode('seat')}
                          style={{
                            padding: '5px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer', border: 'none',
                            background: tableSortMode === 'seat' ? '#4338ca' : 'transparent',
                            color: tableSortMode === 'seat' ? '#fff' : '#475569'
                          }}>
                          🔢 بأرقام الجلوس
                        </button>
                        <button
                          type="button"
                          onClick={() => setTableSortMode('boys_first')}
                          style={{
                            padding: '5px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer', border: 'none',
                            background: tableSortMode === 'boys_first' ? '#2563eb' : 'transparent',
                            color: tableSortMode === 'boys_first' ? '#fff' : '#475569'
                          }}>
                          👦 البنون أولاً
                        </button>
                        <button
                          type="button"
                          onClick={() => setTableSortMode('girls_first')}
                          style={{
                            padding: '5px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer', border: 'none',
                            background: tableSortMode === 'girls_first' ? '#db2777' : 'transparent',
                            color: tableSortMode === 'girls_first' ? '#fff' : '#475569'
                          }}>
                          👧 البنات أولاً
                        </button>
                        <button
                          type="button"
                          onClick={() => setTableSortMode('name')}
                          style={{
                            padding: '5px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer', border: 'none',
                            background: tableSortMode === 'name' ? '#059669' : 'transparent',
                            color: tableSortMode === 'name' ? '#fff' : '#475569'
                          }}>
                          🔤 أبجدي بالاسم
                        </button>
                        <button
                          type="button"
                          onClick={() => setTableSortMode('class')}
                          style={{
                            padding: '5px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer', border: 'none',
                            background: tableSortMode === 'class' ? '#d97706' : 'transparent',
                            color: tableSortMode === 'class' ? '#fff' : '#475569'
                          }}>
                          🏫 بالفصول
                        </button>
                      </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>
                          <th style={{ padding: '8px 10px', width: '40px' }}>م</th>
                          <th 
                            onClick={() => setTableSortMode(tableSortMode === 'name' ? 'seat' : 'name')}
                            style={{ padding: '8px 10px', cursor: 'pointer', userSelect: 'none' }}
                            title="انقر للترتيب أبجدياً"
                          >
                            اسم الطالب {tableSortMode === 'name' ? '🔼' : ''}
                          </th>
                          <th 
                            onClick={() => setTableSortMode(tableSortMode === 'boys_first' ? 'girls_first' : 'boys_first')}
                            style={{ padding: '8px 10px', cursor: 'pointer', userSelect: 'none', width: '80px', textAlign: 'center' }}
                            title="انقر لفرز البنين / البنات"
                          >
                            النوع {tableSortMode === 'boys_first' ? '👦' : tableSortMode === 'girls_first' ? '👧' : ''}
                          </th>
                          <th 
                            onClick={() => setTableSortMode(tableSortMode === 'class' ? 'seat' : 'class')}
                            style={{ padding: '8px 10px', cursor: 'pointer', userSelect: 'none', width: '70px', textAlign: 'center' }}
                            title="انقر للترتيب حسب الفصل"
                          >
                            الفصل {tableSortMode === 'class' ? '🔼' : ''}
                          </th>
                          <th style={{ padding: '8px 10px', width: '80px', textAlign: 'center' }}>الديانة</th>
                          <th 
                            onClick={() => setTableSortMode('seat')}
                            style={{ padding: '8px 10px', cursor: 'pointer', userSelect: 'none', width: '100px', textAlign: 'center' }}
                            title="انقر للترتيب برقم الجلوس"
                          >
                            رقم الجلوس {tableSortMode === 'seat' ? '🔼' : ''}
                          </th>
                          <th style={{ padding: '8px 10px' }}>اللجنة الامتحانية</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center', width: '90px' }}>تعديل يدوياً</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedControlStudents.length === 0 ? (
                          <tr>
                            <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                              لا يوجد طلاب مطابقون للبحث أو الصف المحدد.
                            </td>
                          </tr>
                        ) : (
                          sortedControlStudents.map((st, idx) => {
                            const isStudentBoy = isBoy(st);
                            return (
                              <tr key={st.id || st.student_id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                                <td style={{ padding: '8px 10px', fontWeight: 800, color: '#1e1b4b' }}>
                                  {st.full_name_ar}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    background: isStudentBoy ? '#eff6ff' : '#fdf2f8',
                                    color: isStudentBoy ? '#2563eb' : '#db2777',
                                    border: `1px solid ${isStudentBoy ? '#bfdbfe' : '#fbcfe8'}`
                                  }}>
                                    {isStudentBoy ? 'ذكر 👦' : 'أنثى 👧'}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: st.class_number > 0 ? '#1e40af' : '#94a3b8' }}>
                                  {st.classroom_name || (st.class_number > 0 ? `فصل ${st.class_number}` : '—')}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: (st.religion || '').includes('مسيح') ? '#d97706' : '#059669' }}>
                                  {st.religion || 'مسلم'}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 900, color: '#4338ca', fontSize: '14px' }}>
                                  {st.seat_number ? st.seat_number : <span style={{ color: '#ef4444', fontSize: '11px' }}>غير مرقم</span>}
                                </td>
                                <td style={{ padding: '8px 10px', fontWeight: 800, color: '#0369a1' }}>
                                  {st.committee_name ? `${st.committee_name} (${st.room_number || ''})` : <span style={{ color: '#94a3b8', fontSize: '11px' }}>لم يوزع بعد</span>}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => setEditingStudent(st)}
                                    style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                                  >
                                    ✏️ تعديل
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
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

              {/* Sub-Tab 1.5: 🖨️ مطبوعات التجهيز واللجان */}
              {subTabSetup === 'prints' && (
                <ControlPhasePrints
                  phase="setup"
                  gradeId={selectedGradeId}
                  grades={grades}
                  students={students}
                  subjects={subjects}
                  committees={committeesStats}
                  schoolInfo={schoolInfo}
                  secretSummary={secretSummary}
                  setMsg={setMsg}
                />
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
                  onCalculateTerm={() => handleCalculateTerm(1)}
                  isHeadOfControlAuthenticated={isHeadOfControlAuthenticated}
                  onVerifyHeadOfControlPin={handleVerifyPin}
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
                  onCalculateTerm={() => handleCalculateTerm(1)}
                  isHeadOfControlAuthenticated={isHeadOfControlAuthenticated}
                  onVerifyHeadOfControlPin={handleVerifyPin}
                />
              )}

              {subTabTerm1 === 'secret' && (
                !isHeadOfControlAuthenticated ? (
                  <HeadOfControlLockCard
                    title="توليد وتشفير الأرقام السرية وتوزيع المجموعات محمي بصلاحية رئيس الكنترول."
                    onUnlock={handleVerifyPin}
                    onOpenChangePin={() => setIsChangePinModalOpen(true)}
                  />
                ) : (
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
                )
              )}

              {subTabTerm1 === 'search' && (
                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontWeight: 800, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                        <Search size={20} color="#4338ca" />
                        البحث المخصص عن بيانات الطلاب وتوزيع اللجان (الفصل الأول)
                      </h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                        متاح لجميع أعضاء الكنترول للبحث السريع بالاسم أو رقم الجلوس أو الفصل أو اللجنة. (الأرقام السرية محجوبة داخلياً).
                      </p>
                    </div>
                    <div>
                      {!isHeadOfControlAuthenticated ? (
                        <button
                          type="button"
                          onClick={() => setIsPinModalOpen(true)}
                          style={{
                            background: '#312e81', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px',
                            fontWeight: 800, fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                          }}
                        >
                          <Lock size={15} color="#fef08a" />
                          فك حجب الأرقام السرية (خاص برئيس الكنترول)
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', background: '#ecfdf5', color: '#059669', padding: '5px 12px', borderRadius: '8px', fontWeight: 800, border: '1px solid #a7f3d0' }}>
                            🔓 الأرقام السرية مفكوكة (رئيس الكنترول)
                          </span>
                          <button
                            type="button"
                            onClick={handleLockControlSession}
                            style={{
                              background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px',
                              fontWeight: 800, fontSize: '12px', cursor: 'pointer'
                            }}
                          >
                            🔒 إعادة الحجب
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
                      <input
                        type="text"
                        placeholder="🔍 ابحث باسم الطالب، رقم الجلوس، الفصل، أو اسم اللجنة..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: '8px',
                          border: '2px solid #6366f1', fontSize: '13px', fontWeight: 700,
                          background: '#faf5ff', color: '#1e1b4b'
                        }}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          style={{
                            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 900
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 700 }}>
                      عدد النتائج: <strong style={{ color: '#4338ca' }}>{filteredStudents.length}</strong> طالب
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
                      <thead>
                        <tr style={{ background: '#0f172a', color: '#fff' }}>
                          <th style={{ padding: '10px 8px', width: '45px', textAlign: 'center', fontWeight: 800 }}>م</th>
                          <th style={{ padding: '10px 12px', minWidth: '180px', fontWeight: 800 }}>اسم الطالب</th>
                          <th style={{ padding: '10px 8px', width: '75px', textAlign: 'center', fontWeight: 800 }}>الفصل</th>
                          <th style={{ padding: '10px 8px', width: '95px', textAlign: 'center', fontWeight: 800 }}>رقم الجلوس</th>
                          <th style={{ padding: '10px 10px', width: '130px', textAlign: 'center', fontWeight: 800, background: '#312e81', color: '#fef08a' }}>
                            السرّي (ت1) 🔢
                          </th>
                          <th style={{ padding: '10px 10px', minWidth: '130px', fontWeight: 800 }}>اللجنة الامتحانية</th>
                          <th style={{ padding: '10px 10px', minWidth: '120px', fontWeight: 800 }}>مقر اللجنة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontWeight: 800 }}>
                              لا توجد نتائج مطابقة لبحثك.
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((s, idx) => (
                            <tr key={s.control_student_id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                              <td style={{ padding: '8px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>{idx + 1}</td>
                              <td style={{ padding: '8px 12px', fontWeight: 800, color: s.inclusion_status === 'مستبعد' ? '#94a3b8' : '#1e293b' }}>
                                {s.full_name_ar}
                                {s.inclusion_status === 'مستبعد' && (
                                  <span style={{ fontSize: '11px', background: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px', marginRight: '6px', fontWeight: 900 }}>
                                    ⚠️ مستبعد
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center', color: '#1e40af', fontWeight: 700 }}>
                                {s.class_name || (s.class_number ? `فصل ${s.class_number}` : '—')}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, color: '#0284c7' }}>
                                {s.seat_number ? (
                                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: 900 }}>
                                    {s.seat_number}
                                  </span>
                                ) : '—'}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                {isHeadOfControlAuthenticated ? (
                                  <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: '6px', fontWeight: 900, fontSize: '13px', border: '1px solid #fde68a' }}>
                                    {s.secret_code_term1 || 'غير محدد'}
                                  </span>
                                ) : (
                                  <span style={{ background: '#f1f5f9', color: '#64748b', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '11.5px', border: '1px dashed #cbd5e1' }}>
                                    🔒 محجوب
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '8px', fontWeight: 700, color: '#334155' }}>
                                {s.committee_name || 'لم يوزع'}
                              </td>
                              <td style={{ padding: '8px', color: '#64748b', fontSize: '12px' }}>
                                {s.committee_location || '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-Tab 2.5: 🖨️ مطبوعات الفصل الأول */}
              {subTabTerm1 === 'prints' && (
                <ControlPhasePrints
                  phase="term1"
                  gradeId={selectedGradeId}
                  grades={grades}
                  students={students}
                  subjects={subjects}
                  committees={committeesStats}
                  schoolInfo={schoolInfo}
                  secretSummary={secretSummary}
                  setMsg={setMsg}
                />
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
                  onCalculateTerm={() => handleCalculateTerm(2)}
                  isHeadOfControlAuthenticated={isHeadOfControlAuthenticated}
                  onVerifyHeadOfControlPin={handleVerifyPin}
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
                  onCalculateTerm={() => handleCalculateTerm(2)}
                  isHeadOfControlAuthenticated={isHeadOfControlAuthenticated}
                  onVerifyHeadOfControlPin={handleVerifyPin}
                />
              )}

              {subTabTerm2 === 'secret' && (
                !isHeadOfControlAuthenticated ? (
                  <HeadOfControlLockCard
                    title="توليد وتشفير الأرقام السرية وتوزيع المجموعات محمي بصلاحية رئيس الكنترول."
                    onUnlock={handleVerifyPin}
                    onOpenChangePin={() => setIsChangePinModalOpen(true)}
                  />
                ) : (
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
                )
              )}

              {subTabTerm2 === 'search' && (
                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontWeight: 800, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                        <Search size={20} color="#4338ca" />
                        البحث المخصص عن بيانات الطلاب وتوزيع اللجان (الفصل الثاني)
                      </h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                        متاح لجميع أعضاء الكنترول للبحث السريع بالاسم أو رقم الجلوس أو الفصل أو اللجنة. (الأرقام السرية محجوبة داخلياً).
                      </p>
                    </div>
                    <div>
                      {!isHeadOfControlAuthenticated ? (
                        <button
                          type="button"
                          onClick={() => setIsPinModalOpen(true)}
                          style={{
                            background: '#312e81', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px',
                            fontWeight: 800, fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                          }}
                        >
                          <Lock size={15} color="#fef08a" />
                          فك حجب الأرقام السرية (خاص برئيس الكنترول)
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', background: '#ecfdf5', color: '#059669', padding: '5px 12px', borderRadius: '8px', fontWeight: 800, border: '1px solid #a7f3d0' }}>
                            🔓 الأرقام السرية مفكوكة (رئيس الكنترول)
                          </span>
                          <button
                            type="button"
                            onClick={handleLockControlSession}
                            style={{
                              background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px',
                              fontWeight: 800, fontSize: '12px', cursor: 'pointer'
                            }}
                          >
                            🔒 إعادة الحجب
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
                      <input
                        type="text"
                        placeholder="🔍 ابحث باسم الطالب، رقم الجلوس، الفصل، أو اسم اللجنة..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: '8px',
                          border: '2px solid #6366f1', fontSize: '13px', fontWeight: 700,
                          background: '#faf5ff', color: '#1e1b4b'
                        }}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          style={{
                            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 900
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 700 }}>
                      عدد النتائج: <strong style={{ color: '#4338ca' }}>{filteredStudents.length}</strong> طالب
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
                      <thead>
                        <tr style={{ background: '#0f172a', color: '#fff' }}>
                          <th style={{ padding: '10px 8px', width: '45px', textAlign: 'center', fontWeight: 800 }}>م</th>
                          <th style={{ padding: '10px 12px', minWidth: '180px', fontWeight: 800 }}>اسم الطالب</th>
                          <th style={{ padding: '10px 8px', width: '75px', textAlign: 'center', fontWeight: 800 }}>الفصل</th>
                          <th style={{ padding: '10px 8px', width: '95px', textAlign: 'center', fontWeight: 800 }}>رقم الجلوس</th>
                          <th style={{ padding: '10px 10px', width: '130px', textAlign: 'center', fontWeight: 800, background: '#312e81', color: '#fef08a' }}>
                            السرّي (ت2) 🔢
                          </th>
                          <th style={{ padding: '10px 10px', minWidth: '130px', fontWeight: 800 }}>اللجنة الامتحانية</th>
                          <th style={{ padding: '10px 10px', minWidth: '120px', fontWeight: 800 }}>مقر اللجنة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontWeight: 800 }}>
                              لا توجد نتائج مطابقة لبحثك.
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((s, idx) => (
                            <tr key={s.control_student_id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                              <td style={{ padding: '8px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>{idx + 1}</td>
                              <td style={{ padding: '8px 12px', fontWeight: 800, color: s.inclusion_status === 'مستبعد' ? '#94a3b8' : '#1e293b' }}>
                                {s.full_name_ar}
                                {s.inclusion_status === 'مستبعد' && (
                                  <span style={{ fontSize: '11px', background: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px', marginRight: '6px', fontWeight: 900 }}>
                                    ⚠️ مستبعد
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center', color: '#1e40af', fontWeight: 700 }}>
                                {s.class_name || (s.class_number ? `فصل ${s.class_number}` : '—')}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, color: '#0284c7' }}>
                                {s.seat_number ? (
                                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: 900 }}>
                                    {s.seat_number}
                                  </span>
                                ) : '—'}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                {isHeadOfControlAuthenticated ? (
                                  <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: '6px', fontWeight: 900, fontSize: '13px', border: '1px solid #fde68a' }}>
                                    {s.secret_code_term2 || 'غير محدد'}
                                  </span>
                                ) : (
                                  <span style={{ background: '#f1f5f9', color: '#64748b', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '11.5px', border: '1px dashed #cbd5e1' }}>
                                    🔒 محجوب
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '8px', fontWeight: 700, color: '#334155' }}>
                                {s.committee_name || 'لم يوزع'}
                              </td>
                              <td style={{ padding: '8px', color: '#64748b', fontSize: '12px' }}>
                                {s.committee_location || '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-Tab 3.5: 🖨️ مطبوعات الفصل الثاني والشهادات */}
              {subTabTerm2 === 'prints' && (
                <ControlPhasePrints
                  phase="term2"
                  gradeId={selectedGradeId}
                  grades={grades}
                  students={students}
                  subjects={subjects}
                  committees={committeesStats}
                  schoolInfo={schoolInfo}
                  secretSummary={secretSummary}
                  setMsg={setMsg}
                />
              )}
            </div>
          )}

          {/* TAB 4: 4️⃣ الدور الثاني والتخلفات */}
          {activeTab === 'secondRound' && (
            <div>
              {subTabSecondRound === 'seats' && (
                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontWeight: 900, color: '#1e1b4b' }}>🎫 أرقام جلوس ولجان طلاب الدور الثاني</h3>
                  <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
                    تجهيز كشوف المناداة وتخصيص مقار ولجان طلاب الدور الثاني والراسبين في مادة أو مادتين.
                  </p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'center' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ padding: '8px' }}>م</th>
                        <th style={{ padding: '8px' }}>رقم الجلوس</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>اسم الطالب</th>
                        <th style={{ padding: '8px' }}>مواد الرسوب / الدور الثاني</th>
                        <th style={{ padding: '8px' }}>اللجنة المخصصة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.filter(s => s.status_final === 'بحاجة_لدور_ثان').map((st, idx) => (
                        <tr key={st.control_student_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px' }}>{idx + 1}</td>
                          <td style={{ padding: '8px', fontWeight: 800 }}>{st.seat_number}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800 }}>{st.full_name_ar}</td>
                          <td style={{ padding: '8px', color: '#b91c1c', fontWeight: 800 }}>دور ثانٍ في المواد غير المجتازة</td>
                          <td style={{ padding: '8px' }}>{st.committee_name || 'لجنة الدور الثاني (1)'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {subTabSecondRound === 'exam' && (
                <MarksEntryPanel
                  term={2}
                  mode="exam"
                  gradeId={selectedGradeId}
                  examSubjects={subjects}
                  secretSummary={secretSummary}
                  setMsg={setMsg}
                  onCalculateTerm={() => handleCalculateTerm(2)}
                  isHeadOfControlAuthenticated={isHeadOfControlAuthenticated}
                  onVerifyHeadOfControlPin={handleVerifyPin}
                />
              )}

              {subTabSecondRound === 'prints' && (
                <ControlPhasePrints
                  phase="secondRound"
                  gradeId={selectedGradeId}
                  grades={grades}
                  students={students}
                  subjects={subjects}
                  committees={committeesStats}
                  schoolInfo={schoolInfo}
                  secretSummary={secretSummary}
                  setMsg={setMsg}
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

          {/* TAB 5: 5️⃣ احتساب النتيجة النهائية وغلق الكنترول */}
          {activeTab === 'close' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontWeight: 900, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Award size={24} color="#4338ca" /> 🏆 احتساب واعتماد النتيجة السنوية (القرار الوزاري 151)
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    معادلة النتيجة السنوية: (ترم 1 + ترم 2) ÷ 2 | التحقق من شرط الـ 30% لامتحان الفصل الثاني (18 درجة) | تطبيق سلم التقديرات
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleCalculateFinal}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #4338ca 0%, #3730a3 100%)',
                      color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none',
                      fontWeight: 900, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                      boxShadow: '0 2px 6px rgba(67, 56, 202, 0.3)'
                    }}
                  >
                    ⚡ احتساب وتدقيق النتيجة السنوية
                  </button>
                </div>
              </div>

              {/* Student Results Table */}
              <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 14px 0', fontWeight: 900, color: '#1e1b4b' }}>📋 كشف ملخص نتائج طلاب الصف وحالات النجاح والدور الثاني:</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'center' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ padding: '8px' }}>م</th>
                        <th style={{ padding: '8px' }}>رقم الجلوس</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>اسم الطالب</th>
                        <th style={{ padding: '8px' }}>مجموع ت1</th>
                        <th style={{ padding: '8px' }}>مجموع ت2</th>
                        <th style={{ padding: '8px' }}>المجموع السنوي</th>
                        <th style={{ padding: '8px' }}>النسبة %</th>
                        <th style={{ padding: '8px' }}>التقدير العام</th>
                        <th style={{ padding: '8px' }}>شرط الـ 30%</th>
                        <th style={{ padding: '8px' }}>القرار النهائي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((st, idx) => (
                        <tr key={st.control_student_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px' }}>{idx + 1}</td>
                          <td style={{ padding: '8px', fontWeight: 900, color: '#0284c7' }}>{st.seat_number || '-'}</td>
                          <td style={{ padding: '8px', fontWeight: 800, textAlign: 'right' }}>{st.full_name_ar}</td>
                          <td style={{ padding: '8px', fontWeight: 700 }}>{st.term1_total !== null && st.term1_total !== undefined ? st.term1_total : '-'}</td>
                          <td style={{ padding: '8px', fontWeight: 700 }}>{st.term2_total !== null && st.term2_total !== undefined ? st.term2_total : '-'}</td>
                          <td style={{ padding: '8px', fontWeight: 900, color: '#1e1b4b' }}>{st.year_total !== null && st.year_total !== undefined ? st.year_total : '-'}</td>
                          <td style={{ padding: '8px', fontWeight: 800 }}>{st.percentage !== null && st.percentage !== undefined ? `${st.percentage.toFixed(1)}%` : '-'}</td>
                          <td style={{ padding: '8px', fontWeight: 900, color: st.final_rating === 'دون المستوى' ? '#b91c1c' : '#059669' }}>
                            {st.final_rating || st.term1_rating || '-'}
                          </td>
                          <td style={{ padding: '8px' }}>
                            {st.min_term2_exam_met === 0 ? (
                              <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>غير مستوفٍ (&lt;18)</span>
                            ) : (
                              <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>مستوفٍ ✅</span>
                            )}
                          </td>
                          <td style={{ padding: '8px' }}>
                            {st.status_final === 'بحاجة_لدور_ثان' ? (
                              <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: '6px', fontWeight: 900 }}>دور ثانٍ ⚠️</span>
                            ) : (
                              <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: '6px', fontWeight: 900 }}>ناجح ومنقول 🎉</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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
        </div>
      )}
    </div>
  );
}

// ─── Sub-Component: Head of Control Security Lock Card ────────────────────────
function HeadOfControlLockCard({ title, onUnlock, onOpenChangePin }) {
  const [inputPin, setInputPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onUnlock(inputPin);
    setSubmitting(false);
  };

  return (
    <div style={{
      background: '#fff', padding: '40px 24px', borderRadius: '16px', border: '2px dashed #cbd5e1',
      textAlign: 'center', maxWidth: '520px', margin: '40px auto', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)'
    }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto'
      }}>
        <Lock size={32} />
      </div>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 900, color: '#1e1b4b' }}>
        🔒 قسم محمي — خاص برئيس الكنترول
      </h3>
      <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
        {title || 'هذا القسم يحتوي على ضوابط تحكم وأرقام سرية حساسة. يرجى إدخال الرقم السري لرئيس الكنترول للمتابعة.'}
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
        <input
          type="password"
          required
          autoFocus
          placeholder="أدخل الرقم السري لرئيس الكنترول..."
          value={inputPin}
          onChange={e => setInputPin(e.target.value)}
          style={{
            width: '100%', maxWidth: '300px', padding: '12px', borderRadius: '8px', border: '2px solid #cbd5e1',
            textAlign: 'center', fontSize: '16px', fontWeight: 900, letterSpacing: '2px'
          }}
        />

        <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '300px' }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              flex: 1, background: '#dc2626', color: '#fff', padding: '10px', borderRadius: '8px',
              border: 'none', fontWeight: 900, fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <KeyRound size={16} /> {submitting ? 'جاري التحقق...' : 'فتح القفل والولوج'}
          </button>
        </div>
      </form>

      <div style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
        <button
          type="button"
          onClick={onOpenChangePin}
          style={{
            background: 'none', border: 'none', color: '#4338ca', fontSize: '12px', fontWeight: 800,
            cursor: 'pointer', textDecoration: 'underline'
          }}
        >
          ⚙️ تغيير أو إعادة تعيين الرقم السري لرئيس الكنترول
        </button>
      </div>
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

// ─── Second Language Helpers (FR, GE, IT, SP) ─────────────────────────────────
const getSecondLangInfo = (langStr) => {
  if (!langStr) return null;
  const l = langStr.trim().toLowerCase();
  if (l.includes('فرنس') || l.includes('french') || l.includes('fr')) {
    return { code: 'FR', label: 'فرنسي', en: 'French', badgeColor: '#1d4ed8', bgColor: '#eff6ff' };
  }
  if (l.includes('ألمان') || l.includes('german') || l.includes('deutsch') || l.includes('ge') || l.includes('de')) {
    return { code: 'GE', label: 'ألماني', en: 'German', badgeColor: '#d97706', bgColor: '#fffbeb' };
  }
  if (l.includes('إيطال') || l.includes('italian') || l.includes('it')) {
    return { code: 'IT', label: 'إيطالي', en: 'Italian', badgeColor: '#15803d', bgColor: '#f0fdf4' };
  }
  if (l.includes('إسبان') || l.includes('spanish') || l.includes('sp') || l.includes('es')) {
    return { code: 'SP', label: 'إسباني', en: 'Spanish', badgeColor: '#dc2626', bgColor: '#fef2f2' };
  }
  return null;
};

// ─── Sub-Component: Marks Entry Panel (Full Official Implementation - Side Toolbar Layout) ────────
function MarksEntryPanel({
  term,
  mode,
  gradeId,
  examSubjects = [],
  secretSummary,
  setMsg,
  onCalculateTerm,
  isHeadOfControlAuthenticated,
  onVerifyHeadOfControlPin
}) {
  const [entryMode, setEntryMode] = useState('vertical'); // 'vertical' | 'horizontal'
  const [activeSubjectId, setActiveSubjectId] = useState('');
  const [hoveredSubjectId, setHoveredSubjectId] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [selectedSecretGroup, setSelectedSecretGroup] = useState('all');
  const [secondLangFilter, setSecondLangFilter] = useState('all');
  const [isSecretUnmasked, setIsSecretUnmasked] = useState(false);
  const [isPinPromptOpen, setIsPinPromptOpen] = useState(false);
  const [pinPromptInput, setPinPromptInput] = useState('');
  const [unprintedFilterOnly, setUnprintedFilterOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [marksGrid, setMarksGrid] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'

  const saveSingleMarkAsync = async (studentId, subjectId, item) => {
    if (!item || !studentId || !subjectId) return;
    const subj = examSubjects.find(s => String(s.id) === String(subjectId));
    const isPassFail = subj?.evaluation_method === 'pass_fail_only';
    let numVal = 0;
    if (!item.is_absent && !item.is_exempt && item.mark !== '' && !isPassFail) {
      numVal = parseFloat(item.mark) || 0;
    }

    setAutoSaveStatus('saving');
    try {
      const payload = {
        controlStudentId: parseInt(studentId),
        subjectId: parseInt(subjectId),
        academicYearId: 1,
        term,
        passFailResult: isPassFail ? item.mark : ((item.mark === 'اجتاز' || item.mark === 'لم يجتز') ? item.mark : null),
        isAbsent: !!item.is_absent,
        isExempt: !!item.is_exempt
      };
      if (mode === 'work') {
        payload.workMarks = item.is_absent || item.is_exempt ? 0 : numVal;
      } else if (mode === 'exam') {
        payload.writtenMarks = item.is_absent || item.is_exempt ? 0 : numVal;
      }

      const res = await fetch(`http://${window.location.hostname}:3001/api/control/marks/single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setAutoSaveStatus('saved');
      } else {
        setAutoSaveStatus('error');
      }
    } catch (err) {
      console.error('Auto save failed:', err);
      setAutoSaveStatus('error');
    }
  };

  const handleCellBlur = (studentId, subjectId) => {
    const item = marksGrid[studentId]?.[subjectId];
    if (item) {
      saveSingleMarkAsync(studentId, subjectId, item);
    }
  };

  // Keyboard navigation with strict boundary validation
  const handleKeyDown = (e, studentIndex, subjectId) => {
    const currSt = filteredStudents[studentIndex];
    const currItem = marksGrid[currSt?.control_student_id]?.[subjectId];
    const subj = examSubjects.find(s => String(s.id) === String(subjectId));
    const maxM = typeof getMaxMark(subj) === 'number' ? getMaxMark(subj) : 100;
    const isPassFail = subj?.evaluation_method === 'pass_fail_only';

    // Validation check before advancing: prevent moving if score exceeds maxM or is negative
    if (currItem && !currItem.is_absent && !currItem.is_exempt && !isPassFail && currItem.mark !== '' && currItem.mark !== undefined) {
      const num = parseFloat(currItem.mark);
      if (!isNaN(num) && (num > maxM || num < 0)) {
        if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Tab') {
          e.preventDefault();
          e.stopPropagation();
          setMsg({ type: 'error', text: `⚠️ خطأ في الرصد: الدرجة (${num}) أكبر من النهاية العظمى للمادة (${maxM})! يرجى التصحيح قبل المتابعة.` });
          if (e.target && e.target.select) {
            e.target.select();
          }
          return;
        }
      }
    }

    if (currSt) {
      handleCellBlur(currSt.control_student_id, subjectId);
    }

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextId = `input-${studentIndex + 1}-${subjectId}`;
      const nextEl = document.getElementById(nextId);
      if (nextEl) {
        nextEl.focus();
        if (nextEl.select) nextEl.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevId = `input-${studentIndex - 1}-${subjectId}`;
      const prevEl = document.getElementById(prevId);
      if (prevEl) {
        prevEl.focus();
        if (prevEl.select) prevEl.select();
      }
    } else if (e.key === 'Tab') {
      if (entryMode === 'horizontal') {
        const subIdx = displaySubjects.findIndex(s => String(s.id) === String(subjectId));
        if (subIdx !== -1 && subIdx < displaySubjects.length - 1) {
          e.preventDefault();
          const nextSubId = displaySubjects[subIdx + 1].id;
          const nextEl = document.getElementById(`input-${studentIndex}-${nextSubId}`);
          if (nextEl) {
            nextEl.focus();
            if (nextEl.select) nextEl.select();
          }
        }
      }
    }
  };

  const [subjectCategoryFilter, setSubjectCategoryFilter] = useState('academic'); // 'academic' | 'activities' | 'all'

  // Filter subjects based on exam mode and category selection
  const displaySubjects = React.useMemo(() => {
    let list = examSubjects;
    if (mode === 'exam') {
      return list.filter(s => s.evaluation_method !== 'pass_fail_only');
    }
    if (subjectCategoryFilter === 'academic') {
      return list.filter(s => s.evaluation_method !== 'pass_fail_only' && s.subject_category !== 'نشاط');
    } else if (subjectCategoryFilter === 'activities') {
      return list.filter(s => s.evaluation_method === 'pass_fail_only' || s.subject_category === 'نشاط');
    }
    return list;
  }, [examSubjects, mode, subjectCategoryFilter]);

  const handleBulkPassActivities = async () => {
    const activitySubjs = examSubjects.filter(s => s.evaluation_method === 'pass_fail_only' || s.subject_category === 'نشاط');
    if (activitySubjs.length === 0) return;

    const newGrid = { ...marksGrid };
    const payload = [];

    students.forEach(st => {
      if (!newGrid[st.control_student_id]) newGrid[st.control_student_id] = {};
      activitySubjs.forEach(sub => {
        newGrid[st.control_student_id][sub.id] = { mark: 'اجتاز', is_absent: false, is_exempt: false, has_error: false };
        payload.push({
          control_student_id: st.control_student_id,
          subject_id: sub.id,
          pass_fail_result: 'اجتاز',
          is_absent: 0,
          is_exempt: 0
        });
      });
    });

    setMarksGrid(newGrid);
    setAutoSaveStatus('saving');

    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/control/marks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks: payload, term, academicYearId: 1 })
      });
      const data = await res.json();
      if (data.success) {
        setAutoSaveStatus('saved');
        setMsg({ type: 'success', text: '✅ تم تعيين (اجتاز) بنجاح لجميع طلاب الصف في كافة الأنشطة التربوية!' });
      } else {
        setAutoSaveStatus('error');
      }
    } catch (e) {
      setAutoSaveStatus('error');
    }
  };

  useEffect(() => {
    if (displaySubjects.length > 0 && !activeSubjectId) {
      setActiveSubjectId(displaySubjects[0].id);
    } else if (displaySubjects.length > 0 && !displaySubjects.some(s => String(s.id) === String(activeSubjectId))) {
      setActiveSubjectId(displaySubjects[0].id);
    }
  }, [displaySubjects]);

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
          const subj = displaySubjects.find(s => String(s.id) === String(m.subject_id)) || examSubjects.find(s => String(s.id) === String(m.subject_id));
          let val = mode === 'work' ? m.work_marks : m.written_marks;
          if (subj && subj.evaluation_method === 'pass_fail_only') {
            val = m.pass_fail_result || (m.is_absent ? 'غائب' : m.is_exempt ? 'معفى' : null);
          }
          grid[m.control_student_id][m.subject_id] = {
            mark: m.is_absent ? 'غائب' : m.is_exempt ? 'معفى' : (val !== null && val !== undefined && val !== '' ? String(val) : ''),
            is_absent: !!m.is_absent,
            is_exempt: !!m.is_exempt,
            has_error: false
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

  // Extract Secret Groups list
  const secretGroupsList = Array.from(new Set(students.map(s => term === 1 ? s.secret_group_term1 : s.secret_group_term2).filter(Boolean)));

  const activeSubject = displaySubjects.find(s => String(s.id) === String(activeSubjectId)) || displaySubjects[0] || null;

  const getMaxMark = (subj) => {
    if (!subj) return 100;
    if (subj.evaluation_method === 'pass_fail_only') return 'نشاط (اجتياز)';
    return mode === 'work'
      ? (term === 1 ? (subj.term1_work_mark ?? 40) : (subj.term2_work_mark ?? 40))
      : (term === 1 ? (subj.term1_exam_mark ?? 60) : (subj.term2_exam_mark ?? 60));
  };

  const handleCellChange = (studentId, subjectId, rawVal) => {
    const subj = examSubjects.find(s => String(s.id) === String(subjectId));
    const isPassFail = subj?.evaluation_method === 'pass_fail_only';
    const maxM = typeof getMaxMark(subj) === 'number' ? getMaxMark(subj) : 100;

    let isAbsent = false;
    let isExempt = false;
    let finalVal = rawVal;
    let hasError = false;

    const trimmed = String(rawVal).trim();
    if (['غ', 'غائب', 'غـ'].includes(trimmed)) {
      isAbsent = true;
      finalVal = 'غائب';
    } else if (['معفى', 'م'].includes(trimmed)) {
      isExempt = true;
      finalVal = 'معفى';
    } else if (['اجتاز', 'لم يجتز'].includes(trimmed)) {
      finalVal = trimmed;
    } else if (trimmed === 'صفر') {
      finalVal = '0';
    } else if (trimmed !== '' && !isPassFail) {
      const num = parseFloat(trimmed);
      if (!isNaN(num)) {
        if (num > maxM) {
          setMsg({ type: 'error', text: `⚠️ الدرجة المدخلة (${num}) تتجاوز النهاية العظمى للمادة (${maxM}). يرجى التصحيح!` });
          hasError = true;
          finalVal = trimmed; // Retain exact typed value so user can see and fix it
        } else if (num < 0) {
          setMsg({ type: 'error', text: '⚠️ لا يمكن إدخال درجات سالبة.' });
          hasError = true;
          finalVal = trimmed;
        }
      }
    }

    setMarksGrid(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectId]: {
          mark: finalVal,
          is_absent: isAbsent,
          is_exempt: isExempt,
          has_error: hasError
        }
      }
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const marksPayload = [];
      Object.keys(marksGrid).forEach(stId => {
        Object.keys(marksGrid[stId] || {}).forEach(subId => {
          const item = marksGrid[stId][subId];
          const subj = examSubjects.find(s => String(s.id) === String(subId));
          const isPassFail = subj?.evaluation_method === 'pass_fail_only';
          if (item) {
            let numVal = 0;
            if (!item.is_absent && !item.is_exempt && item.mark !== '' && !isPassFail) {
              numVal = parseFloat(item.mark) || 0;
            }
            const itemPayload = {
              control_student_id: parseInt(stId),
              subject_id: parseInt(subId),
              pass_fail_result: isPassFail ? item.mark : ((item.mark === 'اجتاز' || item.mark === 'لم يجتز') ? item.mark : null),
              is_absent: item.is_absent ? 1 : 0,
              is_exempt: item.is_exempt ? 1 : 0
            };
            if (mode === 'work') {
              itemPayload.work_marks = item.is_absent || item.is_exempt ? 0 : numVal;
            } else if (mode === 'exam') {
              itemPayload.written_marks = item.is_absent || item.is_exempt ? 0 : numVal;
            }
            marksPayload.push(itemPayload);
          }
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

  const handlePromptUnlock = async (e) => {
    e.preventDefault();
    if (onVerifyHeadOfControlPin) {
      const ok = await onVerifyHeadOfControlPin(pinPromptInput);
      if (ok) {
        setIsSecretUnmasked(true);
        setIsPinPromptOpen(false);
        setPinPromptInput('');
      }
    }
  };

  // Filter and Sort students
  const filteredStudents = students.filter(st => {
    if (selectedClassId !== 'all' && String(st.class_id) !== String(selectedClassId)) return false;

    if (secondLangFilter !== 'all') {
      const stLangInfo = getSecondLangInfo(st.second_language);
      if (stLangInfo?.code !== secondLangFilter) return false;
    }

    if (mode === 'exam' && selectedSecretGroup !== 'all') {
      const sGrp = term === 1 ? st.secret_group_term1 : st.secret_group_term2;
      if (String(sGrp) !== String(selectedSecretGroup)) return false;
    }

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
  }).sort((a, b) => {
    if (mode === 'exam') {
      const codeA = parseInt(term === 1 ? a.secret_code_term1 : a.secret_code_term2) || 999999;
      const codeB = parseInt(term === 1 ? b.secret_code_term1 : b.secret_code_term2) || 999999;
      return codeA - codeB;
    } else {
      const seatA = parseInt(a.seat_number) || 999999;
      const seatB = parseInt(b.seat_number) || 999999;
      return seatA - seatB;
    }
  });

  // Calculate subject progress
  const activeMarkedCount = students.filter(st => {
    const item = marksGrid[st.control_student_id]?.[activeSubjectId];
    return item && item.mark !== '' && item.mark !== undefined;
  }).length;
  const activeTotalCount = students.length;
  const progressPercent = activeTotalCount > 0 ? Math.round((activeMarkedCount / activeTotalCount) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {/* PIN Prompt Modal for unmasking exam marks */}
      {isPinPromptOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '380px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px 0', fontWeight: 900, color: '#1e1b4b', fontSize: '16px' }}>🔓 فك حجب الأسماء وأرقام الجلوس</h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px 0' }}>خاص برئيس الكنترول: أدخل رمز الأمان لفك حجب الأسماء مؤقتاً.</p>
            <form onSubmit={handlePromptUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="password" autoFocus required placeholder="رمز أمان رئيس الكنترول..."
                value={pinPromptInput} onChange={e => setPinPromptInput(e.target.value)}
                style={{ padding: '8px', borderRadius: '6px', border: '2px solid #cbd5e1', textAlign: 'center', fontWeight: 800 }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" style={{ flex: 1, background: '#059669', color: '#fff', padding: '8px', borderRadius: '6px', border: 'none', fontWeight: 800, cursor: 'pointer' }}>تأكيد الفك</button>
                <button type="button" onClick={() => setIsPinPromptOpen(false)} style={{ flex: 1, background: '#f1f5f9', color: '#475569', padding: '8px', borderRadius: '6px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sleek Ultra-Compact Horizontal Toolbar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '6px',
        background: '#111c30', padding: '5px 12px', borderRadius: '8px', color: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
        fontFamily: "'Cairo', sans-serif"
      }}>
        {/* Right Action Group: Save & Entry Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            style={{
              background: '#059669', color: '#fff', padding: '5px 12px', borderRadius: '5px', border: 'none',
              fontWeight: 900, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)', fontFamily: "'Cairo', sans-serif"
            }}
          >
            💾 {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>

          {/* Auto-Save Live Badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 800,
            padding: '3px 8px', borderRadius: '5px', background: '#1e293b', border: '1px solid #334155'
          }}>
            {autoSaveStatus === 'saving' && <span style={{ color: '#facc15' }}>⏳ جاري الحفظ...</span>}
            {autoSaveStatus === 'saved' && <span style={{ color: '#4ade80' }}>🟢 تم الحفظ</span>}
            {autoSaveStatus === 'error' && <span style={{ color: '#f87171' }}>⚠️ خطأ</span>}
            {autoSaveStatus === 'idle' && <span style={{ color: '#38bdf8' }}>⚡ تلقائي مفعّل</span>}
          </div>

          <div style={{ display: 'flex', background: '#1e293b', padding: '2px', borderRadius: '5px' }}>
            <button
              onClick={() => setEntryMode('vertical')}
              style={{
                padding: '3px 8px', borderRadius: '3px', border: 'none', fontWeight: 800, fontSize: '11px', cursor: 'pointer',
                background: entryMode === 'vertical' ? '#2563eb' : 'transparent', color: '#fff', fontFamily: "'Cairo', sans-serif"
              }}
            >
              ⬇️ رأسي
            </button>
            <button
              onClick={() => setEntryMode('horizontal')}
              style={{
                padding: '3px 8px', borderRadius: '3px', border: 'none', fontWeight: 800, fontSize: '11px', cursor: 'pointer',
                background: entryMode === 'horizontal' ? '#2563eb' : 'transparent', color: '#fff', fontFamily: "'Cairo', sans-serif"
              }}
            >
              ➡️ أفقي
            </button>
          </div>

          {/* Exam Mode Unmask Button */}
          {mode === 'exam' && (
            <button
              type="button"
              onClick={() => {
                if (isSecretUnmasked) {
                  setIsSecretUnmasked(false);
                } else {
                  setIsPinPromptOpen(true);
                }
              }}
              style={{
                padding: '4px 10px', borderRadius: '5px', border: 'none', fontWeight: 800, fontSize: '11px', cursor: 'pointer',
                background: isSecretUnmasked ? '#059669' : '#dc2626', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              {isSecretUnmasked ? '🔓 الأسماء مفكوكة' : '🔒 فك الحجب (رئيس الكنترول)'}
            </button>
          )}

          <button
            onClick={() => setUnprintedFilterOnly(!unprintedFilterOnly)}
            style={{
              padding: '4px 9px', borderRadius: '5px', border: 'none', fontWeight: 800, fontSize: '11px', cursor: 'pointer',
              background: unprintedFilterOnly ? '#f59e0b' : '#334155', color: '#fff', fontFamily: "'Cairo', sans-serif"
            }}
          >
            {unprintedFilterOnly ? '👁️ الكل' : '🎯 فقط غير المرصودين'}
          </button>
        </div>

        {/* Progress & Class / Secret Group Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {activeSubject && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}>
              <span style={{ color: '#94a3b8' }}>الإنجاز:</span>
              <div style={{ width: '70px', height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', background: progressPercent === 100 ? '#10b981' : '#38bdf8' }} />
              </div>
              <span style={{ fontWeight: 800, color: progressPercent === 100 ? '#10b981' : '#38bdf8' }}>{progressPercent}%</span>
            </div>
          )}

          {/* Class Filter */}
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            style={{ padding: '3px 6px', borderRadius: '5px', background: '#1e293b', color: '#fff', border: '1px solid #334155', fontSize: '11.5px', fontWeight: 700 }}
          >
            <option value="all">🏫 كل الفصول</option>
            {classesList.map(c => (
              <option key={c.id} value={c.id}>فصل {c.name}</option>
            ))}
          </select>

          {/* Second Language Filter */}
          <select
            value={secondLangFilter}
            onChange={e => setSecondLangFilter(e.target.value)}
            style={{ padding: '3px 6px', borderRadius: '5px', background: '#1e293b', color: '#fef08a', border: '1px solid #4338ca', fontSize: '11.5px', fontWeight: 800 }}
            title="تصفية رصد الدرجات حسب اللغة الأجنبية الثانية"
          >
            <option value="all">🌐 كل اللغات</option>
            <option value="FR">🇫🇷 فرنسي (FR)</option>
            <option value="GE">🇩🇪 ألماني (GE)</option>
            <option value="IT">🇮🇹 إيطالي (IT)</option>
            <option value="SP">🇪🇸 إسباني (SP)</option>
          </select>

          {/* Secret Group Filter in Exam Mode */}
          {mode === 'exam' && secretGroupsList.length > 0 && (
            <select
              value={selectedSecretGroup}
              onChange={e => setSelectedSecretGroup(e.target.value)}
              style={{ padding: '3px 6px', borderRadius: '5px', background: '#1e293b', color: '#fff', border: '1px solid #334155', fontSize: '11.5px', fontWeight: 700 }}
            >
              <option value="all">🔒 كل المجموعات</option>
              {secretGroupsList.map(g => (
                <option key={g} value={g}>مجموعة {g}</option>
              ))}
            </select>
          )}

          {/* Search Box */}
          <input
            type="text"
            placeholder="بحث..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ padding: '3px 6px', borderRadius: '5px', border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: '11.5px', width: '110px' }}
          />
        </div>
      </div>

      {/* Category Filter Bar (Only in Work Marks mode, since Exam is written exams only) */}
      {mode === 'work' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px',
          background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>التصنيف:</span>
            <div style={{ display: 'flex', background: '#e2e8f0', padding: '2px', borderRadius: '6px', gap: '3px' }}>
              <button
                type="button"
                onClick={() => setSubjectCategoryFilter('academic')}
                style={{
                  padding: '4px 10px', borderRadius: '4px', border: 'none', fontWeight: 800, fontSize: '11.5px', cursor: 'pointer',
                  background: subjectCategoryFilter === 'academic' ? '#0284c7' : 'transparent',
                  color: subjectCategoryFilter === 'academic' ? '#fff' : '#475569',
                  boxShadow: subjectCategoryFilter === 'academic' ? '0 1px 2px rgba(2,132,199,0.3)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                📚 الأساسية والامتحانية ({examSubjects.filter(s => s.evaluation_method !== 'pass_fail_only' && s.subject_category !== 'نشاط').length})
              </button>
              <button
                type="button"
                onClick={() => setSubjectCategoryFilter('activities')}
                style={{
                  padding: '4px 10px', borderRadius: '4px', border: 'none', fontWeight: 800, fontSize: '11.5px', cursor: 'pointer',
                  background: subjectCategoryFilter === 'activities' ? '#8b5cf6' : 'transparent',
                  color: subjectCategoryFilter === 'activities' ? '#fff' : '#475569',
                  boxShadow: subjectCategoryFilter === 'activities' ? '0 1px 2px rgba(139,92,246,0.3)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                🎨 الأنشطة التربوية ({examSubjects.filter(s => s.evaluation_method === 'pass_fail_only' || s.subject_category === 'نشاط').length})
              </button>
              <button
                type="button"
                onClick={() => setSubjectCategoryFilter('all')}
                style={{
                  padding: '4px 10px', borderRadius: '4px', border: 'none', fontWeight: 800, fontSize: '11.5px', cursor: 'pointer',
                  background: subjectCategoryFilter === 'all' ? '#1e293b' : 'transparent',
                  color: subjectCategoryFilter === 'all' ? '#fff' : '#475569',
                  boxShadow: subjectCategoryFilter === 'all' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                📋 كل المواد
              </button>
            </div>
          </div>

          {subjectCategoryFilter === 'activities' && (
            <button
              type="button"
              onClick={handleBulkPassActivities}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: '5px',
                fontWeight: 900, fontSize: '11.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                boxShadow: '0 1px 3px rgba(5,150,105,0.3)'
              }}
              title="تعيين اجتياز لجميع طلاب الصف في جميع مواد الأنشطة"
            >
              ⚡ تعيين (اجتاز) للجميع في الأنشطة
            </button>
          )}
        </div>
      )}

      {/* Main Table Content */}
      <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #cbd5e1', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {displaySubjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontWeight: 800 }}>
            ⚠️ لا توجد مواد مطابقة لهذا النمط من الرصد.
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#1a56a8', fontWeight: 900 }}>
            ⏳ جاري تحميل سجلات الطلاب والدرجات...
          </div>
        ) : (
          <div className="custom-scroll-container" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 195px)', width: '100%' }}>
            <table style={{ minWidth: 'max-content', width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '13px', textAlign: 'right', fontFamily: "'Cairo', sans-serif" }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#fff', fontFamily: "'Cairo', sans-serif", position: 'sticky', top: 0, zIndex: 20 }}>
                  <th style={{ padding: '8px 4px', width: '38px', minWidth: '38px', maxWidth: '38px', textAlign: 'center', fontWeight: 800, position: 'sticky', right: 0, background: '#0f172a', zIndex: 22, borderBottom: '2px solid #334155' }}>م</th>
                  {mode === 'exam' ? (
                    <th style={{ padding: '8px 4px', width: '85px', minWidth: '85px', fontWeight: 900, background: '#312e81', color: '#fef08a', position: 'sticky', right: 38, zIndex: 22, borderBottom: '2px solid #334155', borderLeft: '1px solid #4338ca', textAlign: 'center' }}>الرقم السري</th>
                  ) : null}
                  {!(mode === 'exam' && !isSecretUnmasked) && (
                    <>
                      <th style={{ padding: '8px 4px', width: '50px', minWidth: '50px', textAlign: 'center', fontWeight: 800, position: 'sticky', right: mode === 'exam' ? 123 : 38, background: '#0f172a', zIndex: 22, borderBottom: '2px solid #334155' }}>الفصل</th>
                      <th style={{ padding: '8px 4px', width: '68px', minWidth: '68px', textAlign: 'center', fontWeight: 800, position: 'sticky', right: mode === 'exam' ? 173 : 88, background: '#0f172a', zIndex: 22, borderBottom: '2px solid #334155' }}>رقم الجلوس</th>
                      <th style={{ padding: '8px 8px', width: mode === 'exam' ? '160px' : '180px', minWidth: mode === 'exam' ? '160px' : '170px', maxWidth: mode === 'exam' ? '210px' : '230px', fontWeight: 800, position: 'sticky', right: mode === 'exam' ? 241 : 156, background: '#0f172a', zIndex: 22, borderBottom: '2px solid #334155', borderLeft: '2px solid #334155', boxShadow: '-3px 0 6px rgba(0,0,0,0.15)' }}>اسم الطالب</th>
                    </>
                  )}
                  {displaySubjects.map(subj => {
                    const isActive = String(subj.id) === String(activeSubjectId);
                    const isHovered = String(subj.id) === String(hoveredSubjectId);
                    const isPassFail = subj.evaluation_method === 'pass_fail_only';
                    const maxM = getMaxMark(subj);
                    const rawName = subj.subject_name_ar || '';
                    const matchParen = rawName.match(/^(.*?)\s*\((.*?)\)$/);
                    const mainName = matchParen ? matchParen[1].trim() : rawName;
                    const subTag = matchParen ? matchParen[2].trim() : (subj.is_high_level ? 'مستوى رفيع' : null);

                    return (
                      <th
                        key={subj.id}
                        onClick={() => setActiveSubjectId(subj.id)}
                        onMouseEnter={() => setHoveredSubjectId(subj.id)}
                        onMouseLeave={() => setHoveredSubjectId(null)}
                        title={`${subj.subject_name_ar} - الدرجة العظمى: ${maxM}`}
                        style={{
                          padding: '8px 4px', textAlign: 'center', cursor: 'pointer',
                          width: '88px', minWidth: '82px', maxWidth: '105px',
                          background: isActive ? '#1d4ed8' : (isHovered ? '#1e3a8a' : '#0f172a'),
                          borderRight: '1px solid #334155', borderBottom: '2px solid #334155', fontFamily: "'Cairo', sans-serif",
                          userSelect: 'none', verticalAlign: 'middle',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: '13px', lineHeight: '1.25', wordBreak: 'break-word', color: '#ffffff' }}>
                          {mainName}
                        </div>
                        {subTag && (
                          <div style={{ fontSize: '10px', color: '#93c5fd', fontWeight: 800, marginTop: '2px' }}>
                            ({subTag})
                          </div>
                        )}
                        <div style={{
                          fontSize: '11px',
                          fontWeight: 900,
                          color: isPassFail ? '#6ee7b7' : '#fef08a',
                          marginTop: '3px'
                        }}>
                          {isPassFail ? '🎨 اجتياز' : `(${maxM} درجة)`}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((st, idx) => {
                  const isMasked = mode === 'exam' && !isSecretUnmasked;
                  const secretVal = term === 1 ? st.secret_code_term1 : st.secret_code_term2;
                  const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

                  return (
                    <tr key={st.control_student_id} style={{ borderBottom: '1px solid #e2e8f0', background: rowBg }}>
                      <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, color: '#64748b', position: 'sticky', right: 0, background: rowBg, zIndex: 6, borderBottom: '1px solid #e2e8f0', width: '38px', minWidth: '38px', maxWidth: '38px' }}>{idx + 1}</td>
                      {mode === 'exam' && (
                        <td style={{ padding: '6px 4px', fontWeight: 900, color: '#1e1b4b', borderLeft: '1px solid #cbd5e1', position: 'sticky', right: 38, background: rowBg, zIndex: 6, borderBottom: '1px solid #e2e8f0', textAlign: 'center', width: '85px', minWidth: '85px' }}>
                          <span style={{ background: '#e0e7ff', color: '#312e81', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                            {secretVal || 'غير محدد'}
                          </span>
                        </td>
                      )}
                      {!isMasked && (
                        <>
                          <td style={{ padding: '6px 4px', color: st.class_number > 0 ? '#1e40af' : '#94a3b8', fontWeight: 700, position: 'sticky', right: mode === 'exam' ? 123 : 38, background: rowBg, zIndex: 6, borderBottom: '1px solid #e2e8f0', textAlign: 'center', width: '50px', minWidth: '50px' }}>{st.class_number ?? 0}</td>
                          <td style={{ padding: '6px 4px', fontWeight: 800, color: '#0284c7', position: 'sticky', right: mode === 'exam' ? 173 : 88, background: rowBg, zIndex: 6, borderBottom: '1px solid #e2e8f0', textAlign: 'center', width: '68px', minWidth: '68px' }}>
                            {st.seat_number || '-'}
                          </td>
                          <td
                            title={st.full_name_ar}
                            style={{
                              padding: '6px 8px', fontWeight: 800, color: (st.inclusion_status === 'مستبعد' ? '#94a3b8' : '#1e293b'),
                              position: 'sticky', right: mode === 'exam' ? 241 : 156, background: rowBg, zIndex: 6,
                              borderBottom: '1px solid #e2e8f0', borderLeft: '2px solid #cbd5e1', boxShadow: '-3px 0 6px rgba(0,0,0,0.06)',
                              width: mode === 'exam' ? '160px' : '180px', minWidth: mode === 'exam' ? '160px' : '170px', maxWidth: mode === 'exam' ? '210px' : '230px',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}
                          >
                            {st.full_name_ar}
                            {st.second_language && (() => {
                              const lang = getSecondLangInfo(st.second_language);
                              if (!lang) return null;
                              return (
                                <span
                                  title={`اللغة الثانية: ${lang.label}`}
                                  style={{
                                    marginRight: '6px',
                                    fontSize: '10px',
                                    fontWeight: 900,
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    color: lang.badgeColor,
                                    background: lang.bgColor,
                                    border: `1px solid ${lang.badgeColor}33`,
                                    display: 'inline-block'
                                  }}
                                >
                                  {lang.code}
                                </span>
                              );
                            })()}
                            {st.inclusion_status === 'مستبعد' && (
                              <span style={{ fontSize: '10px', background: '#fee2e2', color: '#dc2626', padding: '1px 5px', borderRadius: '4px', marginRight: '4px', fontWeight: 900 }}>
                                ⚠️ مستبعد
                              </span>
                            )}
                          </td>
                        </>
                      )}

                      {displaySubjects.map(subj => {
                        const isActive = String(subj.id) === String(activeSubjectId);
                        const isHovered = String(subj.id) === String(hoveredSubjectId);
                        const isExcluded = st.inclusion_status === 'مستبعد';
                        const isDisabled = (entryMode === 'vertical' && !isActive) || isExcluded;
                        const isPassFail = subj.evaluation_method === 'pass_fail_only';
                        const maxM = typeof getMaxMark(subj) === 'number' ? getMaxMark(subj) : 100;
                        const cellData = marksGrid[st.control_student_id]?.[subj.id] || { mark: '', is_absent: false, is_exempt: false, has_error: false };

                        return (
                          <td
                            key={subj.id}
                            onMouseEnter={() => setHoveredSubjectId(subj.id)}
                            onMouseLeave={() => setHoveredSubjectId(null)}
                            style={{
                              padding: '4px 2px', textAlign: 'center',
                              background: isActive ? '#f0f9ff' : (isHovered ? '#f1f5f9' : 'transparent'),
                              borderRight: '1px solid #f1f5f9',
                              width: '88px', minWidth: '82px', maxWidth: '105px',
                              transition: 'background 0.15s ease'
                            }}
                          >
                            {isPassFail ? (
                              <select
                                id={`input-${idx}-${subj.id}`}
                                disabled={isDisabled}
                                value={cellData.mark || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  handleCellChange(st.control_student_id, subj.id, val);
                                  saveSingleMarkAsync(st.control_student_id, subj.id, {
                                    mark: val,
                                    is_absent: val === 'غائب',
                                    is_exempt: val === 'معفى'
                                  });
                                }}
                                onBlur={() => handleCellBlur(st.control_student_id, subj.id)}
                                onKeyDown={e => handleKeyDown(e, idx, subj.id)}
                                style={{
                                  padding: '3px 2px', borderRadius: '4px', fontWeight: 800, fontSize: '11px',
                                  background: cellData.mark === 'لم يجتز' ? '#fee2e2' : cellData.mark === 'غائب' ? '#ffedd5' : cellData.mark === 'اجتاز' ? '#dcfce7' : '#fff',
                                  color: cellData.mark === 'لم يجتز' ? '#dc2626' : cellData.mark === 'غائب' ? '#c2410c' : cellData.mark === 'اجتاز' ? '#15803d' : '#94a3b8',
                                  border: cellData.mark ? '1px solid #cbd5e1' : '1.5px dashed #cbd5e1', cursor: 'pointer', width: '74px'
                                }}
                              >
                                <option value="">— غير محدد —</option>
                                <option value="اجتاز">✅ اجتاز</option>
                                <option value="لم يجتز">❌ لم يجتز</option>
                                <option value="غائب">⚠️ غائب</option>
                                <option value="معفى">⚪ معفى</option>
                              </select>
                            ) : (() => {
                              const numVal = parseFloat(cellData.mark);
                              const isOverMax = !isNaN(numVal) && !cellData.is_absent && !cellData.is_exempt && numVal > maxM;
                              const hasErr = cellData.has_error || isOverMax;

                              return (
                                <input
                                  id={`input-${idx}-${subj.id}`}
                                  type="text"
                                  disabled={isDisabled}
                                  value={isExcluded ? 'مستبعد' : cellData.is_exempt ? 'معفى' : (cellData.mark ?? '')}
                                  onFocus={e => e.target.select()}
                                  onChange={e => {
                                    if (e.target.value.trim() === 'معفى') {
                                      setMarksGrid(prev => ({
                                        ...prev,
                                        [st.control_student_id]: {
                                          ...(prev[st.control_student_id] || {}),
                                          [subj.id]: { mark: 'معفى', is_exempt: true, is_absent: false, has_error: false }
                                        }
                                      }));
                                    } else {
                                      handleCellChange(st.control_student_id, subj.id, e.target.value);
                                    }
                                  }}
                                  onBlur={() => handleCellBlur(st.control_student_id, subj.id)}
                                  onKeyDown={e => handleKeyDown(e, idx, subj.id)}
                                  placeholder={isDisabled ? '-' : cellData.is_exempt ? 'معفى' : '—'}
                                  style={{
                                    width: '64px', padding: '3px 2px', textAlign: 'center', borderRadius: '4px',
                                    border: hasErr ? '2px solid #dc2626' : (isActive ? '2px solid #1a56a8' : '1px solid #cbd5e1'),
                                    fontWeight: 900, fontSize: '12px',
                                    background: hasErr ? '#fee2e2' : isExcluded ? '#f3f4f6' : (isDisabled ? '#f1f5f9' : (cellData.is_absent ? '#fee2e2' : cellData.is_exempt ? '#fef3c7' : '#fff')),
                                    color: hasErr ? '#dc2626' : isExcluded ? '#94a3b8' : (cellData.is_absent ? '#dc2626' : cellData.is_exempt ? '#b45309' : '#1e1b4b'),
                                    boxShadow: hasErr ? '0 0 0 2px rgba(220, 38, 38, 0.25)' : 'none'
                                  }}
                                  title={hasErr ? `خطأ: الدرجة (${cellData.mark}) أكبر من النهاية العظمى (${maxM})!` : ''}
                                />
                              );
                            })()}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer Bar */}
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: 700, color: '#64748b' }}>
              <div>عرض {filteredStudents.length} من أصل {students.length} طالب مسجلين بالكنترول {mode === 'exam' ? '(مرتبين تصاعدياً بالرقم السري)' : ''}</div>
              <div style={{ color: '#059669' }}>💡 نصيحة: استخدم زر Enter للتنقل الراسي، وزر Tab للتنقل الأفقي وسرعة الرصد.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

