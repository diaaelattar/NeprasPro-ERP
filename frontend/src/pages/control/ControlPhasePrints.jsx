/**
 * ControlPhasePrints.jsx — Official Ministerial Print Hub for Egyptian School Control Room
 * Implements the 3-Column Ministerial Header and 4-Role Footer per AGENTS.md Rule 4
 */

import React, { useState, useEffect } from 'react';
import { 
  Printer, FileText, Award, Users, AlertTriangle, CheckCircle2, 
  Layers, Lock, Eye, Download, Sparkles, Building2, BookOpen, Archive,
  BarChart3
} from 'lucide-react';
import { MinisterialPrintHeader, MinisterialPrintFooter } from '../../components/common/MinisterialPrintHeader';
import { printElementById } from '../../utils/printHelper';

// Fix: window.location.hostname is empty string in Electron (file:// protocol) → always use 127.0.0.1
const _apiHost = (typeof window !== 'undefined' && window.location?.hostname?.trim()) ? window.location.hostname : '127.0.0.1';


// Second language codes and labels helper (FR, GE, IT, SP)
export const getSecondLangInfo = (langStr) => {
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

// Shorten lengthy subject names for compact vertical ministerial table headers
const getShortSubjectName = (name) => {
  if (!name) return '';
  const trimmed = name.trim();
  if (trimmed.includes('تكنولوجيا المعلومات والاتصالات')) return 'تكنولوجيا المعلومات';
  if (trimmed.includes('Connect Plus') || trimmed.includes('كونكت بلس') || (trimmed.includes('مستوى رفيع') && (trimmed.includes('أولى') || trimmed.includes('1') || trimmed.includes('إنجليزي') || trimmed.includes('Connect')))) {
    return 'مستوى رفيع (1)';
  }
  if (trimmed.includes('الأجنبية الثانية') || trimmed.includes('اللغة الثانية') || (trimmed.includes('مستوى رفيع') && (trimmed.includes('ثانية') || trimmed.includes('2') || trimmed.includes('فرنسي') || trimmed.includes('ألماني') || trimmed.includes('إيطالي') || trimmed.includes('إسباني')))) {
    return 'لغة ثانية';
  }
  if (trimmed.includes('نشاط تربوي إضافي') || trimmed.includes('نشاط تربوي اضافي') || trimmed.includes('نشاط إضافي') || trimmed.includes('نشاط تربوى إضافي')) return 'مادة نشاط';
  if (trimmed.includes('المجالات')) return 'المجالات';
  return trimmed;
};

// Calculate qualitative verbal ratings (القرار الوزاري 151 / 136)
const getGradeRating = (score, maxScore = 100) => {
  if (score === null || score === undefined || score === '' || isNaN(score)) return '-';
  const num = Number(score);
  const max = Number(maxScore) || 100;
  if (max <= 0) return '-';
  const pct = (num / max) * 100;
  if (pct >= 85) return 'ممتاز';
  if (pct >= 65) return 'جيد جداً';
  if (pct >= 50) return 'جيد';
  return 'دون المستوى';
};

export default function ControlPhasePrints({
  phase = 'setup', // 'setup' | 'term1' | 'term2' | 'secondRound'
  gradeId,
  grades = [],
  students = [],
  subjects = [],
  committees = [],
  schoolInfo = {},
  secretSummary = null,
  setMsg
}) {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedCommitteeId, setSelectedCommitteeId] = useState('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [selectedSecondLangFilter, setSelectedSecondLangFilter] = useState('all');
  const [reportResults, setReportResults] = useState(null);
  const [loading, setLoading] = useState(false);

  // Print Layout Controls
  const [printOrientation, setPrintOrientation] = useState('landscape');
  const [fontSizePt, setFontSizePt] = useState(11);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [cardsPerPage, setCardsPerPage] = useState(10);
  const [absenceLinesPerCommittee, setAbsenceLinesPerCommittee] = useState(2);
  const [verticalHeaders, setVerticalHeaders] = useState(true);
  const [resultSheetMode, setResultSheetMode] = useState('evaluation'); // 'evaluation' | 'detailed'
  const [certLayoutMode, setCertLayoutMode] = useState('single_framed'); // 'single_framed' | 'dual_split' | 'quad_full' | 'quad_blank_header'

  const currentGradeObj = grades.find(g => String(g.id) === String(gradeId));
  const gradeName = currentGradeObj?.grade_name_ar || 'الصف الدراسي';
  const stageName = currentGradeObj?.stage_name || currentGradeObj?.section_name || 'المرحلة التعليمية';
  const academicYear = schoolInfo?.academic_year_name || schoolInfo?.academicYear || schoolInfo?.academic_year || '2026 / 2027';

  // Set defaults when selecting a document
  const handleSelectDoc = (docId) => {
    setSelectedDoc(docId);
    if (
      docId === 'seat_cards' ||
      docId === 'committees_stats' ||
      docId === 'proctor_attendance' ||
      docId === 'committee_absence_sheet' ||
      docId === 'proc_control_open_close' ||
      docId === 'proc_envelope_opening' ||
      docId === 'proc_cupboard_opening' ||
      docId === 'legal_impediments_declaration' ||
      docId === 'answer_papers_receipt_declaration' ||
      docId === 'grading_committee_form' ||
      docId === 'failing_students_grade_review' ||
      docId === 'committee_file_cover' ||
      docId === 'answer_envelope_cover' ||
      docId === 'questions_envelope_cover' ||
      docId === 'committee_large_badges' ||
      docId?.includes('report_cards')
    ) {
      setPrintOrientation('portrait');
      setFontSizePt(10);
      setRowsPerPage(20);
    } else if (docId?.includes('work_activities') || docId?.includes('secret') || docId?.includes('broadsheet') || docId?.includes('evaluation')) {
      setPrintOrientation('landscape');
      setFontSizePt(10);
      setRowsPerPage(docId?.includes('evaluation') ? 20 : 35);
    } else {
      setPrintOrientation('landscape');
      setFontSizePt(11);
      setRowsPerPage(25);
    }
  };

  // Available classes for filtering
  const availableClasses = React.useMemo(() => {
    const map = new Map();
    students.forEach(st => {
      const clsNum = st.class_number || st.classroom_name || st.class_name_ar;
      if (clsNum) {
        const key = String(st.class_number || st.classroom_name || st.class_name_ar);
        const label = st.classroom_name || (st.class_number ? `فصل (${st.class_number})` : `فصل ${key}`);
        if (!map.has(key)) {
          map.set(key, label);
        }
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [students]);

  // Filter students for preview
  const previewStudents = students.filter(st => {
    if (selectedCommitteeId !== 'all' && String(st.committee_id) !== String(selectedCommitteeId)) return false;
    if (selectedClassFilter !== 'all') {
      const clsVal = String(st.class_number || st.classroom_name || st.class_name_ar || '');
      if (clsVal !== String(selectedClassFilter)) return false;
    }
    if (selectedSecondLangFilter !== 'all') {
      const langInfo = getSecondLangInfo(st.second_language);
      if (langInfo?.code !== selectedSecondLangFilter) return false;
    }
    return true;
  });

  // Fetch compiled results summary if in term1, term2, or secondRound
  const [controlMarksMap, setControlMarksMap] = useState({});

  const fetchControlMarks = async (termNum = 1) => {
    if (!gradeId) return;
    try {
      const res = await fetch(`http://${_apiHost}:3001/api/control/marks?gradeId=${gradeId}&term=${termNum}`);
      const data = await res.json();
      if (data.success && data.marks) {
        const map = {};
        data.marks.forEach(m => {
          if (!map[m.control_student_id]) map[m.control_student_id] = {};
          map[m.control_student_id][m.subject_id] = m;
        });
        setControlMarksMap(map);
      }
    } catch (e) {
      console.error('Error fetching control marks:', e);
    }
  };

  useEffect(() => {
    if (gradeId && (phase === 'term1' || phase === 'term2' || phase === 'secondRound')) {
      fetchResultsSummary();
      const termNum = phase === 'term2' ? 2 : 1;
      fetchControlMarks(termNum);
    }
  }, [gradeId, phase]);

  useEffect(() => {
    if (gradeId && selectedDoc) {
      if (selectedDoc.includes('term2')) {
        fetchControlMarks(2);
      } else if (selectedDoc.includes('term1') || selectedDoc.includes('work_activities')) {
        fetchControlMarks(1);
      } else if (selectedDoc === 'student_report_cards') {
        fetchControlMarks(phase === 'term1' ? 1 : 2);
      }
    }
  }, [gradeId, selectedDoc, phase]);

  const fetchResultsSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://${_apiHost}:3001/api/control/results-summary?gradeId=${gradeId}`);
      const data = await res.json();
      if (data.success) {
        setReportResults(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Define documents per phase
  const docsByPhase = {
    setup: [
      { id: 'seating_call_list', title: 'كشوف المناداة العامة (41 د ك)', icon: Users, desc: 'كشف عام لجميع طلاب الصف مرتباً بأرقام الجلوس والفصول.' },
      { id: 'seating_call_list_single', title: 'كشوف مناداة اللجان (لجنة بالورقة)', icon: FileText, desc: 'كشف مخصص لكل لجنة امتحانية في ورقة منفصلة.' },
      { id: 'seating_call_list_dual', title: 'كشوف مناداة اللجان المزدوجة (لجنتين بالورقة)', icon: Layers, desc: 'كشف يعرض كل لجنتين متجاورتين في ورقة واحدة.' },
      { id: 'seat_cards', title: 'بطاقات أرقام الجلوس', icon: BookOpen, desc: 'بطاقات أرقام الجلوس للطلاب للصق على الأدراج.' },
      { id: 'committees_distribution', title: 'دليل اللجان ومقار الامتحان', icon: Building2, desc: 'توزيع أرقام الجلوس على قاعات ولجان الامتحان.' },
      { id: 'committees_stats', title: 'إحصائية أعداد لجان وطلاب الامتحان', icon: Layers, desc: 'إحصائية بأعداد الطلاب، البنين، البنات، اللجان، والديانة.' },
      { id: 'committee_file_cover', title: 'غلاف لجنة', icon: FileText, desc: 'غلاف ملف اللجنة برقم اللجنة وإحصاء الطلاب وأرقام الجلوس.' },
      { id: 'answer_envelope_cover', title: 'غلاف إجابة', icon: BookOpen, desc: 'غلاف مظروف كراسات الإجابة برقم اللجنة والإحصاء وأرقام الجلوس.' },
      { id: 'questions_envelope_cover', title: 'غلاف أسئلة', icon: Lock, desc: 'غلاف مظروف أوراق الأسئلة برقم اللجنة والإحصاء وأرقام الجلوس.' },
      { id: 'committee_large_badges', title: 'أرقام اللجان (3 بالورقة)', icon: Layers, desc: 'لافتات أرقام اللجان الكبيرة للصق على الملفات والمظاريف.' },
      { id: 'proctor_attendance', title: 'كشوف ملاحظة امتحان', icon: CheckCircle2, desc: 'كشف توزيع وملاحظة السادة المراقبين والملاحظين على اللجان وتوقيعاتهم.' },
      { id: 'committee_absence_sheet', title: 'كشف غياب لجان', icon: AlertTriangle, desc: 'كشف حصر غياب الطلاب باللجان وتوقيعات الملاحظين ومراقب الدور.' },
      { id: 'proc_control_open_close', title: 'محاضر فتح وغلق الكنترول', icon: Lock, desc: 'محضر غلق ومحضر فتح حجرة الكنترول وتوقيعات اللجنة ونوبتجي المدرسة (2 بالورقة).' },
      { id: 'proc_envelope_opening', title: 'محضر فتح ظروف الأسئلة', icon: FileText, desc: 'محضر فحص وفتح أظرف أوراق الأسئلة وتوقيعات الأعضاء ورئيس اللجنة (2 بالورقة).' },
      { id: 'proc_cupboard_opening', title: 'محضر فتح دولاب الأسئلة', icon: Archive, desc: 'محضر فحص أقفال وفتح دولاب أسئلة الكنترول وتأكيد سلامة المحفوظات (2 بالورقة).' },
      { id: 'legal_impediments_declaration', title: 'إقرار عدم وجود موانع', icon: CheckCircle2, desc: 'إقرار السادة أعضاء الكنترول والملاحظين بعدم وجود موانع قانونية لأعمال الامتحانات.' },
      { id: 'answer_papers_receipt_declaration', title: 'إقرار استلام أوراق الإجابة', icon: BookOpen, desc: 'إقرار استلام أوراق الإجابة لتقدير درجات الطلاب والمصححين (2 بالورقة مع برواز كامل).' },
      { id: 'grading_committee_form', title: 'استمارة مقدري ومراجعي الإجابات', icon: Layers, desc: 'استمارة مقدري ومراجعي درجات الأسئلة وتوقيعاتهم حتى 8 أسئلة (2 بالورقة).' },
      { id: 'failing_students_grade_review', title: 'مراجعة ورفع درجات طلاب راسبين', icon: AlertTriangle, desc: 'استمارة مراجعة وإعادة فحص درجات الطلاب الراسبين وتعديل الدرجة (25 سطر).' }
    ],
    term1: [
      { id: 'term1_secret_sheet', title: 'شيت مسودة الرصد السري (فارغ للرصد اليدوي)', icon: Lock, desc: 'شيت رصد الدرجات التحريرية على الأرقام السرية فارغ للرصد اليدوي وسرية الكراسات.' },
      { id: 'term1_secret_review_sheet', title: 'شيت مراجعة الرصد السري (بعد الرصد بالدرجات)', icon: CheckCircle2, desc: 'شيت تدقيق ومراجعة الدرجات التحريرية المرصودة على الأرقام السرية قبل فك السري.' },
      { id: 'term1_secret_master', title: 'كشاف الأرقام السرية المعتمد للفصل الأول', icon: FileText, desc: 'كشف فك السري المعتمد لرئيس الكنترول يربط الرقم السري برقم الجلوس والاسم.' },
      { id: 'term1_work_activities_blank', title: 'شيت رصد أعمال السنة (فارغ - بدون توقيعات)', icon: BookOpen, desc: 'كشف رصد أعمال السنة والأنشطة فارغ للرصد مقسم بالفصل أو للكل بدون عمود التوقيعات.' },
      { id: 'term1_work_activities_review', title: 'شيت مراجعة أعمال السنة (بعد الرصد بالدرجات)', icon: FileText, desc: 'كشف مراجعة وتدقيق درجات أعمال السنة والأنشطة المرصودة بالفعل مقسم بالفصل أو للكل.' },
      { id: 'term1_result_broadsheet', title: 'كشف نتيجة الفصل الدراسي الأول (أعمال + تحريري + مجموع)', icon: Layers, desc: 'كشف تفصيلي رسمي بنتيجة الفصل الدراسي الأول يتضمن أعمدة (أعمال السنة + التحريري + المجموع) لكل مادة والمجموع الكلي ونسبة الحضور.' },
      { id: 'term1_evaluation_sheet', title: 'كشف تقييم ونتائج الطلاب (درجات + تقديرات + الرقم القومي)', icon: Award, desc: 'كشف رسمي بنتيجة وتقييمات الطلاب وفق القرار الوزاري (سطرين للطالب: درجات المواد + التقديرات الوصفية مع الرقم القومي ونسبة الحضور).' },
      { id: 'term1_report_cards', title: 'بطاقات وشهادات تقييم درجات الطلاب (الفصل الأول)', icon: Award, desc: 'شهادات تقييم درجات الطالب للفصل الأول (3 نماذج: فردية بإطار فاخر، 2 بالصفحة، 4 بالصفحة، ونموذج بدون ترويسة).' },
      { id: 'term1_top_students', title: 'كشف الطلاب الأوائل والمتفوقين (الفصل الأول)', icon: Award, desc: 'ترتيب الطلاب المتفوقين والحاصلين على أعلى الدرجات والنسب المئوية.' },
      { id: 'term1_failing_students', title: 'كشف الطلاب دون المستوى والراسبين (الفصل الأول)', icon: AlertTriangle, desc: 'حصر الطلاب الذين لم يحققوا درجات النجاح للرعاية والمتابعة.' },
      { id: 'term1_statistical_analysis', title: 'التقرير والتحليل الإحصائي العام للنتيجة (الفصل الأول)', icon: BarChart3, desc: 'جداول الإحصاء الشاملة: نسب الحضور والغياب، التحليل الإحصائي للمواد وتوزيع التقديرات وفق القرار 151، والمقارنة الإحصائية بين الفصول.' }
    ],
    term2: [
      { id: 'term2_secret_sheet', title: 'شيت مسودة الرصد السري للترم الثاني (فارغ)', icon: Lock, desc: 'شيت رصد درجات امتحان الفصل الثاني مرتباً بالأرقام السرية للترم الثاني.' },
      { id: 'term2_secret_review_sheet', title: 'شيت مراجعة الرصد السري للترم الثاني (بعد الرصد)', icon: CheckCircle2, desc: 'شيت تدقيق ومراجعة الدرجات التحريرية للترم الثاني على الأرقام السرية.' },
      { id: 'term2_secret_master', title: 'كشاف الأرقام السرية المعتمد للفصل الثاني', icon: FileText, desc: 'كشف فك السري المعتمد للفصل الدراسي الثاني.' },
      { id: 'term2_work_activities_blank', title: 'شيت رصد أعمال السنة للترم الثاني (فارغ - بدون توقيعات)', icon: BookOpen, desc: 'كشف رصد أعمال السنة والأنشطة فارغ للترم الثاني بدون عمود توقيعات.' },
      { id: 'term2_work_activities_review', title: 'شيت مراجعة أعمال السنة للترم الثاني (بعد الرصد)', icon: FileText, desc: 'كشف مراجعة درجات أعمال السنة والأنشطة المرصودة للترم الثاني.' },
      { id: 'term2_result_broadsheet', title: 'كشف نتيجة الفصل الدراسي الثاني (أعمال + تحريري + مجموع)', icon: Layers, desc: 'كشف تفصيلي رسمي بنتيجة الفصل الدراسي الثاني يتضمن أعمدة (أعمال السنة + التحريري + المجموع) لكل مادة والمجموع الكلي ونسبة الحضور.' },
      { id: 'term2_evaluation_sheet', title: 'كشف تقييم ونتائج الطلاب للترم الثاني (درجات + تقديرات + الرقم القومي)', icon: Award, desc: 'كشف رسمي بنتيجة وتقييمات الطلاب للترم الثاني (سطرين للطالب: درجات المواد + التقديرات الوصفية مع الرقم القومي ونسبة الحضور).' },
      { id: 'master_broadsheet_12d', title: 'الشيت العام والرئيسي للنتائج المجمعة (12 د)', icon: Layers, desc: 'الشيت العام النهائي للترمين مع المجموع الكلي والتقدير اللفظي ونسب النجاح.' },
      { id: 'student_report_cards', title: 'بطاقات وشهادات تقييم درجات الطلاب (نهاية العام)', icon: Award, desc: 'شهادات تقييم درجات الطالب الرسمية (3 نماذج: فردية بإطار فاخر، 2 بالصفحة، 4 بالصفحة، ونموذج بدون ترويسة).' },
      { id: 'annual_top_students', title: 'لوحة شرف الأوائل للعام الدراسي', icon: Award, desc: 'كشف أوائل الصف الدراسي للعام كاملاً مع صورهم وتقديراتهم الممتازة.' },
      { id: 'second_round_entitled', title: 'كشف الطلاب المستحقين لدخول الدور الثاني', icon: AlertTriangle, desc: 'كشف تفصيلي بأسماء وأرقام جلوس الطلاب الذين لهم دور ثانٍ والمواد غير المجتازة.' },
      { id: 'statistical_report', title: 'التقرير والتحليل الإحصائي العام ونسب النجاح (نهاية العام)', icon: BarChart3, desc: 'جداول الإحصاء الشاملة: نسب النجاح والرسوب، التحليل الإحصائي للمواد، وتوزيع التقديرات وفق القرار 151، والمقارنة بين الفصول.' }
    ],
    secondRound: [
      { id: 'sr_seating_call_list', title: 'كشف مناداة ولجان طلاب الدور الثاني', icon: Users, desc: 'كشف رسمي بطلاب الدور الثاني وأرقام جلوسهم ومقار لجانهم.' },
      { id: 'sr_marks_sheet', title: 'شيت رصد درجات امتحانات الدور الثاني', icon: FileText, desc: 'شيت رصد درجات الدور الثاني لكل مادة من مواد الرسوب.' },
      { id: 'sr_final_results', title: 'النتيجة النهائية المجمعة بعد الدور الثاني', icon: Award, desc: 'كشف الاعتماد النهائي لنتائج الطلاب المنقولين والراسبين بعد الدور الثاني.' }
    ]
  };

  const currentDocs = docsByPhase[phase] || [];

  const [localSchoolInfo, setLocalSchoolInfo] = useState(schoolInfo);

  useEffect(() => {
    if (schoolInfo && Object.keys(schoolInfo).length > 0) {
      setLocalSchoolInfo(schoolInfo);
    } else {
      fetch(`http://${_apiHost}:3001/api/setup/status`)
        .then(r => r.json())
        .then(d => {
          if (d?.institution) setLocalSchoolInfo(d.institution);
        })
        .catch(() => {});
    }
  }, [schoolInfo]);

  const effectiveSchoolInfo = (schoolInfo && Object.keys(schoolInfo).length > 0) ? schoolInfo : localSchoolInfo;

  // Group students by actual assigned committees (for committee-based prints)
  const actualCommitteeGroups = React.useMemo(() => {
    const list = [];
    const processedStudentIds = new Set();

    // 1. If committees stats/list are provided
    if (committees && committees.length > 0) {
      committees.forEach((c, idx) => {
        const commStudents = students.filter(st => {
          const match = (st.committee_id && String(st.committee_id) === String(c.id)) || (st.committee_name && st.committee_name === c.committee_name);
          if (match) processedStudentIds.add(st.control_student_id || st.student_id);
          return match;
        });

        if (commStudents.length > 0) {
          list.push({
            committee: {
              id: c.id,
              committee_name: c.committee_name || `لجنة (${idx + 1})`,
              committee_number: c.committee_number || c.committee_name?.match(/\d+/)?.[0] || (idx + 1),
              room_number: c.room_number || `قاعة (${idx + 1})`,
              building_name: c.building_name || 'المبنى الرئيسي'
            },
            students: commStudents
          });
        }
      });
    }

    // 2. Any remaining students with committee_id or committee_name not in committees list
    const remaining = students.filter(st => !processedStudentIds.has(st.control_student_id || st.student_id));
    if (remaining.length > 0) {
      const remainingMap = new Map();
      remaining.forEach(st => {
        const key = st.committee_name || (st.committee_id ? `لجنة (${st.committee_id})` : 'اللجنة (1)');
        if (!remainingMap.has(key)) {
          remainingMap.set(key, []);
        }
        remainingMap.get(key).push(st);
      });

      remainingMap.forEach((groupStudents, groupName) => {
        const num = groupName.match(/\d+/)?.[0] || (list.length + 1);
        list.push({
          committee: {
            id: num,
            committee_name: groupName,
            committee_number: num,
            room_number: groupStudents[0]?.room_number || `قاعة (${num})`,
            building_name: groupStudents[0]?.building_name || 'المبنى الرئيسي'
          },
          students: groupStudents
        });
      });
    }

    return list.length > 0 ? list : [{
      committee: { id: 1, committee_name: 'اللجنة (1)', committee_number: 1, room_number: 'قاعة (1)' },
      students: students
    }];
  }, [students, committees]);

  // Pair actual committee groups for dual-committee print (2 per sheet)
  const actualCommitteePairs = React.useMemo(() => {
    const pairs = [];
    for (let i = 0; i < actualCommitteeGroups.length; i += 2) {
      pairs.push({
        left: actualCommitteeGroups[i],
        right: actualCommitteeGroups[i + 1] || null
      });
    }
    return pairs;
  }, [actualCommitteeGroups]);

  // Chunk students for general pagination (used in general lists)
  const perPage = rowsPerPage === 'all' ? (previewStudents.length || 1) : Number(rowsPerPage);
  const pageChunks = [];
  if (previewStudents.length === 0) {
    pageChunks.push([]);
  } else {
    for (let i = 0; i < previewStudents.length; i += perPage) {
      pageChunks.push(previewStudents.slice(i, i + perPage));
    }
  }

  // Sort students by secret code for secret sheets
  const secretSortedStudents = React.useMemo(() => {
    const isTerm2 = phase === 'term2' || (selectedDoc && selectedDoc.includes('term2'));
    return [...previewStudents].sort((a, b) => {
      const codeA = isTerm2 ? (Number(a.secret_code_term2) || 999999) : (Number(a.secret_code_term1) || 999999);
      const codeB = isTerm2 ? (Number(b.secret_code_term2) || 999999) : (Number(b.secret_code_term1) || 999999);
      if (codeA !== codeB) return codeA - codeB;
      return (Number(a.seat_number) || 0) - (Number(b.seat_number) || 0);
    });
  }, [previewStudents, phase, selectedDoc]);

  const secretPageChunks = React.useMemo(() => {
    const chunks = [];
    if (secretSortedStudents.length === 0) {
      chunks.push([]);
    } else {
      for (let i = 0; i < secretSortedStudents.length; i += perPage) {
        chunks.push(secretSortedStudents.slice(i, i + perPage));
      }
    }
    return chunks;
  }, [secretSortedStudents, perPage]);

  const handleTriggerPrint = () => {
    const docMeta = currentDocs.find(d => d.id === selectedDoc);
    const cleanDocTitle = (docMeta?.title || 'تقرير_الكنترول').replace(/\s+/g, '_');
    const cleanGrade = (gradeName || 'الصف').replace(/\s+/g, '_');
    const cleanStage = (stageName || 'المرحلة').replace(/\s+/g, '_');
    const cleanYear = (academicYear || '2026_2027').replace(/[\s/]+/g, '_');
    const fullFileName = `${cleanDocTitle}_${cleanStage}_${cleanGrade}_${cleanYear}`;

    printElementById('ministerial-printable-area', {
      orientation: printOrientation,
      fontSize: `${fontSizePt}pt`,
      title: fullFileName
    });
  };

  const [exportingBatch, setExportingBatch] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, currentName: '' });

  const handleOpenReportsFolder = async () => {
    const cleanGrade = (gradeName || 'الصف').replace(/\s+/g, '_');
    const cleanStage = (stageName || 'المرحلة').replace(/\s+/g, '_');
    const cleanYear = (academicYear || '2026_2027').replace(/[\s/]+/g, '_');
    const phaseFolderName = 
      phase === 'setup' ? '01_مرحلة_التجهيز_وأعمال_اللجان' :
      phase === 'term1' ? '02_مطبوعات_ونتائج_الفصل_الأول' :
      phase === 'term2' ? '03_مطبوعات_وشهادات_الفصل_الثاني' :
      '04_مطبوعات_ولجان_الدور_الثاني';

    const sub = `${cleanYear}/${cleanStage}/${cleanGrade}/${phaseFolderName}`;
    try {
      if (window.electronAPI?.openReportsFolder) {
        window.electronAPI.openReportsFolder(sub);
      }
      const res = await fetch('/api/control/open-reports-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subPath: sub })
      });
      const data = await res.json();
      if (data?.success && setMsg) {
        setMsg({ type: 'success', text: `📁 تم فتح مجلد تقارير الكنترول: ${data.path}` });
      }
    } catch (err) {
      console.error('Failed to open reports folder:', err);
    }
  };

  const handleBatchExport = async () => {
    if (exportingBatch) return;
    const docsToExport = currentDocs;
    if (!docsToExport || docsToExport.length === 0) return;

    setExportingBatch(true);
    setExportProgress({ current: 0, total: docsToExport.length, currentName: 'بدء التجهيز...' });

    const cleanGrade = (gradeName || 'الصف').replace(/\s+/g, '_');
    const cleanStage = (stageName || 'المرحلة').replace(/\s+/g, '_');
    const cleanYear = (academicYear || '2026_2027').replace(/[\s/]+/g, '_');
    const phaseFolderName = 
      phase === 'setup' ? '01_مرحلة_التجهيز_وأعمال_اللجان' :
      phase === 'term1' ? '02_مطبوعات_ونتائج_الفصل_الأول' :
      phase === 'term2' ? '03_مطبوعات_وشهادات_الفصل_الثاني' :
      '04_مطبوعات_ولجان_الدور_الثاني';
    const sub = `${cleanYear}/${cleanStage}/${cleanGrade}/${phaseFolderName}`;

    const originalSelected = selectedDoc;

    try {
      for (let i = 0; i < docsToExport.length; i++) {
        const docObj = docsToExport[i];
        const docId = docObj.id;
        const prefix = String(i + 1).padStart(2, '0');
        const cleanDocTitle = `${prefix}_${docObj.title.replace(/\s+/g, '_')}`;
        const fileName = `${cleanDocTitle}_${cleanStage}_${cleanGrade}_${cleanYear}`;

        setExportProgress({ current: i + 1, total: docsToExport.length, currentName: docObj.title });

        setSelectedDoc(docId);
        await new Promise(r => setTimeout(r, 150));

        const areaElem = document.getElementById('ministerial-printable-area');
        if (areaElem) {
          const isPort = (
            docId === 'seat_cards' || docId === 'committees_stats' || docId === 'proctor_attendance' ||
            docId === 'committee_absence_sheet' || docId === 'proc_control_open_close' ||
            docId === 'proc_envelope_opening' || docId === 'proc_cupboard_opening' ||
            docId === 'legal_impediments_declaration' || docId === 'answer_papers_receipt_declaration' ||
            docId === 'grading_committee_form' || docId === 'failing_students_grade_review' ||
            docId === 'committee_file_cover' || docId === 'answer_envelope_cover' ||
            docId === 'questions_envelope_cover' || docId === 'committee_large_badges'
          );

          await fetch('/api/control/export-report-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subPath: sub,
              fileName,
              htmlContent: areaElem.innerHTML,
              orientation: isPort ? 'portrait' : 'landscape'
            })
          });
        }
      }

      setSelectedDoc(originalSelected);
      setExportingBatch(false);

      if (setMsg) {
        setMsg({ type: 'success', text: `📦 تم بنجاح تصدير جميع وثائق ومطبوعات الكنترول (${docsToExport.length} ملف PDF)!` });
      }

      handleOpenReportsFolder();
    } catch (err) {
      console.error('Batch export failed:', err);
      setExportingBatch(false);
      setSelectedDoc(originalSelected);
      if (setMsg) {
        setMsg({ type: 'error', text: `حدث خطأ أثناء التصدير: ${err.message}` });
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', fontFamily: "'Cairo', sans-serif" }}>
      {/* 1. Header Toolbar */}
      <div style={{
        background: '#111c30', padding: '16px 20px', borderRadius: '12px', color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Printer size={26} color="#38bdf8" />
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#f8fafc' }}>
              🖨️ مركز المطبوعات الرسمية — {
                phase === 'setup' ? 'مرحلة التجهيز وأعمال اللجان' :
                phase === 'term1' ? 'مطبوعات ونتائج الفصل الدراسي الأول' :
                phase === 'term2' ? 'مطبوعات وشهادات الفصل الدراسي الثاني والنتيجة السنوية' :
                'مطبوعات ولجان الدور الثاني'
              }
            </h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{gradeName} | العام الدراسي: {academicYear}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleBatchExport}
            disabled={exportingBatch}
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', border: 'none',
              padding: '8px 16px', borderRadius: '8px', fontWeight: 900, fontSize: '12.5px',
              cursor: exportingBatch ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 2px 8px rgba(5,150,105,0.3)', opacity: exportingBatch ? 0.7 : 1
            }}
            title="تصدير وحفظ جميع وثائق ومطبوعات هذه المرحلة بصيغة PDF في مجلد الكنترول دفعة واحدة"
          >
            <Download size={16} /> 📦 تصدير حقيبة المطبوعات كاملة (PDF)
          </button>

          <button
            onClick={handleOpenReportsFolder}
            style={{
              background: '#1e293b', color: '#38bdf8', border: '1px solid #334155',
              padding: '8px 14px', borderRadius: '8px', fontWeight: 800, fontSize: '12.5px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
            title="فتح مجلد حفظ تقارير الكنترول في المستندات"
          >
            <Archive size={15} /> 📂 فتح مجلد التقارير
          </button>

          {selectedDoc && (
            <>
              <button
                onClick={handleTriggerPrint}
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#fff',
                  padding: '8px 20px', borderRadius: '8px', border: 'none', fontWeight: 900, fontSize: '13px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 6px rgba(2,132,199,0.3)'
                }}
              >
                <Printer size={16} /> طباعة المستند الآن
              </button>
              <button
                onClick={() => setSelectedDoc(null)}
                style={{
                  background: '#334155', color: '#fff', padding: '8px 14px', borderRadius: '8px',
                  border: 'none', fontWeight: 800, fontSize: '12.5px', cursor: 'pointer'
                }}
              >
                رجوع لقائمة المطبوعات
              </button>
            </>
          )}
        </div>
      </div>

      {/* Batch Export Progress Modal Overlay */}
      {exportingBatch && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '28px 36px', width: '460px',
            textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '2px solid #059669'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>📦</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
              جاري تصدير حقيبة مطبوعات الكنترول
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b', fontWeight: 700 }}>
              {exportProgress.currentName} ({exportProgress.current} من {exportProgress.total})
            </p>

            {/* Progress Bar */}
            <div style={{ width: '100%', height: '12px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden', marginBottom: '14px' }}>
              <div style={{
                height: '100%',
                width: `${(exportProgress.current / Math.max(exportProgress.total, 1)) * 100}%`,
                background: 'linear-gradient(90deg, #059669, #10b981)',
                transition: 'width 0.3s ease'
              }} />
            </div>

            <span style={{ fontSize: '12px', color: '#059669', fontWeight: 800 }}>
              يتم حفظ الملفات تلقائياً داخل مجلد التقارير... يرجى الانتظار
            </span>
          </div>
        </div>
      )}

      {/* 2. Document Selection Cards Grid (if no document selected) */}
      {!selectedDoc ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {currentDocs.map(doc => {
            const IconComp = doc.icon;
            return (
              <div
                key={doc.id}
                onClick={() => handleSelectDoc(doc.id)}
                style={{
                  background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)', cursor: 'pointer', transition: 'all 0.2s ease',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px',
                  borderTop: '4px solid #2563eb'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)'; }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IconComp size={22} />
                    </div>
                    <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 900, color: '#1e293b' }}>{doc.title}</h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>{doc.desc}</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    معاينة وتجهيز الطباعة ⬅️
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 3. Document Preview & Print Sheet (معاينة المستند المختار) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Advanced Print Controls Toolbar */}
          <div style={{
            background: '#fff', padding: '14px 18px', borderRadius: '10px', border: '1px solid #cbd5e1',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            {/* Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Committee filter (For general call list, distributions, seat cards, covers, badges, broadsheet) */}
              {(selectedDoc === 'seating_call_list' ||
                selectedDoc === 'seat_cards' ||
                selectedDoc === 'committees_distribution' ||
                selectedDoc === 'committee_file_cover' ||
                selectedDoc === 'answer_envelope_cover' ||
                selectedDoc === 'questions_envelope_cover' ||
                selectedDoc === 'committee_large_badges' ||
                selectedDoc === 'master_broadsheet_12d') && committees.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>تصفية اللجنة:</span>
                  <select
                    value={selectedCommitteeId}
                    onChange={e => setSelectedCommitteeId(e.target.value)}
                    style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 700 }}
                  >
                    <option value="all">جميع اللجان ({actualCommitteeGroups.length || committees.length} لجنة)</option>
                    {actualCommitteeGroups.map(cg => (
                      <option key={cg.committee.id} value={cg.committee.id}>{cg.committee.committee_name} ({cg.committee.room_number ? `قاعة ${cg.committee.room_number}` : 'اللجنة'})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Class filter (Especially for seat cards, call list, work activities, secret review, broadsheet, evaluation, report cards, etc.) */}
              {(selectedDoc === 'seat_cards' || selectedDoc === 'seating_call_list' || selectedDoc?.includes('work_activities') || selectedDoc?.includes('secret') || selectedDoc?.includes('broadsheet') || selectedDoc?.includes('evaluation') || selectedDoc?.includes('report_cards') || selectedDoc === 'student_report_cards' || selectedDoc?.includes('top_students') || selectedDoc?.includes('failing')) && availableClasses.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>فرز الفصل:</span>
                  <select
                    value={selectedClassFilter}
                    onChange={e => setSelectedClassFilter(e.target.value)}
                    style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 700 }}
                  >
                    <option value="all">جميع الفصول ({students.length} طالب)</option>
                    {availableClasses.map(cls => (
                      <option key={cls.value} value={cls.value}>{cls.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Second Language Filter for Language Schools */}
              {(selectedDoc?.includes('work_activities') || selectedDoc?.includes('secret') || selectedDoc?.includes('broadsheet') || selectedDoc?.includes('evaluation') || selectedDoc?.includes('report_cards') || selectedDoc === 'student_report_cards' || selectedDoc?.includes('top_students') || selectedDoc === 'seating_call_list') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#4338ca' }}>فرز اللغة الثانية:</span>
                  <select
                    value={selectedSecondLangFilter}
                    onChange={e => setSelectedSecondLangFilter(e.target.value)}
                    style={{ padding: '5px 10px', borderRadius: '6px', border: '1.5px solid #4338ca', fontSize: '12px', fontWeight: 800, background: '#eef2ff', color: '#3730a3' }}
                  >
                    <option value="all">جميع اللغات الثانية ({students.length} طالب)</option>
                    <option value="FR">🇫🇷 فرنسي (FR)</option>
                    <option value="GE">🇩🇪 ألماني (GE)</option>
                    <option value="IT">🇮🇹 إيطالي (IT)</option>
                    <option value="SP">🇪🇸 إسباني (SP)</option>
                  </select>
                </div>
              )}

              {/* Cards Per Page Selector (For Seat Cards) */}
              {selectedDoc === 'seat_cards' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#0369a1' }}>عدد البطاقات بالصفحة:</span>
                  <select
                    value={cardsPerPage}
                    onChange={e => setCardsPerPage(Number(e.target.value))}
                    style={{ padding: '5px 10px', borderRadius: '6px', border: '1.5px solid #0284c7', fontSize: '12px', fontWeight: 800, background: '#f0f9ff', color: '#0369a1' }}
                  >
                    <option value={10}>10 بطاقات / صفحة (2 × 5) — افتراضي</option>
                    <option value={12}>12 بطاقة / صفحة (2 × 6)</option>
                    <option value={14}>14 بطاقة / صفحة (2 × 7)</option>
                    <option value={8}>8 بطاقات / صفحة (2 × 4)</option>
                  </select>
                </div>
              )}

              {/* Absence Lines Per Committee Selector */}
              {selectedDoc === 'committee_absence_sheet' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#0369a1' }}>عدد أسطر الغياب لكل لجنة:</span>
                  <select
                    value={absenceLinesPerCommittee}
                    onChange={e => setAbsenceLinesPerCommittee(Number(e.target.value))}
                    style={{ padding: '5px 10px', borderRadius: '6px', border: '1.5px solid #0284c7', fontSize: '12px', fontWeight: 800, background: '#f0f9ff', color: '#0369a1' }}
                  >
                    <option value={2}>سطران (2 طلاب) — 10 لجان بالورقة</option>
                    <option value={3}>3 أسطر (3 طلاب) — 8 لجان بالورقة</option>
                    <option value={4}>4 أسطر (4 طلاب) — 6 لجان بالورقة</option>
                  </select>
                </div>
              )}

              {/* Rows Per Page / Pagination for General Lists */}
              {(selectedDoc === 'seating_call_list' || selectedDoc?.includes('secret') || selectedDoc?.includes('work_activities') || selectedDoc?.includes('broadsheet') || selectedDoc?.includes('evaluation') || selectedDoc?.includes('top_students') || selectedDoc?.includes('failing')) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>عدد الطلاب بالصفحة:</span>
                  <select
                    value={rowsPerPage}
                    onChange={e => setRowsPerPage(e.target.value)}
                    style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 700 }}
                  >
                    <option value={15}>15 طالب / صفحة</option>
                    <option value={20}>20 طالب / صفحة</option>
                    <option value={25}>25 طالب / صفحة</option>
                    <option value={30}>30 طالب / صفحة</option>
                    <option value={35}>35 طالب / صفحة</option>
                    <option value={40}>40 طالب / صفحة</option>
                    <option value="all">كل الطلاب بصفحة واحدة</option>
                  </select>
                </div>
              )}

              {(selectedDoc === 'seating_call_list_single' || selectedDoc === 'seating_call_list_dual') && (
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0369a1', background: '#eff6ff', padding: '4px 10px', borderRadius: '6px' }}>
                  📌 يتم تقسيم وطباعة اللجان الفعلية تلقائياً ({actualCommitteeGroups.length} لجنة مسجلة)
                </div>
              )}
            </div>

            {/* Print Formatting: Orientation & Font Size */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {/* Orientation Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>الاتجاه:</span>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '6px' }}>
                  <button
                    onClick={() => setPrintOrientation('portrait')}
                    style={{
                      padding: '4px 10px', borderRadius: '4px', border: 'none', fontSize: '11.5px', fontWeight: 800,
                      cursor: 'pointer', background: printOrientation === 'portrait' ? '#2563eb' : 'transparent',
                      color: printOrientation === 'portrait' ? '#fff' : '#64748b'
                    }}
                  >
                    📄 طولي (Portrait)
                  </button>
                  <button
                    onClick={() => setPrintOrientation('landscape')}
                    style={{
                      padding: '4px 10px', borderRadius: '4px', border: 'none', fontSize: '11.5px', fontWeight: 800,
                      cursor: 'pointer', background: printOrientation === 'landscape' ? '#2563eb' : 'transparent',
                      color: printOrientation === 'landscape' ? '#fff' : '#64748b'
                    }}
                  >
                    📑 عرضي (Landscape)
                  </button>
                </div>
              </div>

              {/* Font Size Selector (Calibri font 10 - 14) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>حجم الخط (كاليبري):</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[9, 10, 11, 12, 13, 14].map(sz => (
                    <button
                      key={sz}
                      onClick={() => setFontSizePt(sz)}
                      style={{
                        padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 800,
                        cursor: 'pointer', background: fontSizePt === sz ? '#0f172a' : '#fff',
                        color: fontSizePt === sz ? '#fff' : '#334155'
                      }}
                    >
                      {sz}pt
                    </button>
                  ))}
                </div>
              </div>

              {/* Vertical Headers Toggle for wide tables */}
              {(selectedDoc?.includes('secret') || selectedDoc?.includes('work_activities') || selectedDoc?.includes('broadsheet') || selectedDoc?.includes('evaluation')) && (
                <button
                  onClick={() => setVerticalHeaders(!verticalHeaders)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: '1.5px solid #2563eb',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: verticalHeaders ? '#2563eb' : '#eff6ff',
                    color: verticalHeaders ? '#fff' : '#1d4ed8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {verticalHeaders ? '📐 أسماء المواد: رأسية ✔' : '📏 أسماء المواد: أفقية'}
                </button>
              )}

              {/* Mode Switcher for Result Broadsheets */}
              {selectedDoc?.includes('result_broadsheet') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: '#f1f5f9', padding: '2px 4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <button
                    onClick={() => setResultSheetMode('evaluation')}
                    style={{
                      padding: '4px 10px', borderRadius: '4px', border: 'none', fontSize: '11px', fontWeight: 800,
                      cursor: 'pointer', background: resultSheetMode === 'evaluation' ? '#047857' : 'transparent',
                      color: resultSheetMode === 'evaluation' ? '#fff' : '#334155'
                    }}
                  >
                    📋 درجات وتقديرات بالرقم القومي (سطرين) ✔
                  </button>
                  <button
                    onClick={() => setResultSheetMode('detailed')}
                    style={{
                      padding: '4px 10px', borderRadius: '4px', border: 'none', fontSize: '11px', fontWeight: 800,
                      cursor: 'pointer', background: resultSheetMode === 'detailed' ? '#047857' : 'transparent',
                      color: resultSheetMode === 'detailed' ? '#fff' : '#334155'
                    }}
                  >
                    📊 تفصيلي (أعمال + تحريري + مجموع)
                  </button>
                </div>
              )}

              {/* Mode Switcher for Student Report Cards / Certificates */}
              {(selectedDoc === 'student_report_cards' || selectedDoc === 'term1_report_cards') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: '#f0f9ff', padding: '3px 6px', borderRadius: '8px', border: '1.5px solid #0284c7', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 900, color: '#0369a1', marginLeft: '4px' }}>نموذج الشهادة:</span>
                  <button
                    onClick={() => {
                      setCertLayoutMode('single_framed');
                      setPrintOrientation('landscape');
                    }}
                    style={{
                      padding: '4px 8px', borderRadius: '4px', border: 'none', fontSize: '11px', fontWeight: 800,
                      cursor: 'pointer', background: certLayoutMode === 'single_framed' ? '#0284c7' : 'transparent',
                      color: certLayoutMode === 'single_framed' ? '#fff' : '#334155'
                    }}
                  >
                    🥇 شهادة فردية (A4 بالعرض كاملة)
                  </button>
                  <button
                    onClick={() => {
                      setCertLayoutMode('dual_split');
                      setPrintOrientation('portrait');
                    }}
                    style={{
                      padding: '4px 8px', borderRadius: '4px', border: 'none', fontSize: '11px', fontWeight: 800,
                      cursor: 'pointer', background: certLayoutMode === 'dual_split' ? '#0284c7' : 'transparent',
                      color: certLayoutMode === 'dual_split' ? '#fff' : '#334155'
                    }}
                  >
                    🥈 2 بالصفحة (A4 بالطول فوق بعض)
                  </button>
                  <button
                    onClick={() => {
                      setCertLayoutMode('triple_vertical');
                      setPrintOrientation('portrait');
                    }}
                    style={{
                      padding: '4px 8px', borderRadius: '4px', border: 'none', fontSize: '11px', fontWeight: 800,
                      cursor: 'pointer', background: (certLayoutMode === 'triple_vertical' || certLayoutMode === 'quad_full') ? '#0284c7' : 'transparent',
                      color: (certLayoutMode === 'triple_vertical' || certLayoutMode === 'quad_full') ? '#fff' : '#334155'
                    }}
                  >
                    🥉 3 بالصفحة (A4 بالطول فوق بعض)
                  </button>
                  <button
                    onClick={() => {
                      setCertLayoutMode('quad_vertical_blank');
                      setPrintOrientation('portrait');
                    }}
                    style={{
                      padding: '4px 8px', borderRadius: '4px', border: 'none', fontSize: '11px', fontWeight: 800,
                      cursor: 'pointer', background: (certLayoutMode === 'quad_vertical_blank' || certLayoutMode === 'quad_blank_header') ? '#0284c7' : 'transparent',
                      color: (certLayoutMode === 'quad_vertical_blank' || certLayoutMode === 'quad_blank_header') ? '#fff' : '#334155'
                    }}
                  >
                    📄 4 بالصفحة (A4 بالطول فوق بعض بدون ترويسة)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Printable Document Container */}
          <div id="ministerial-printable-area" style={{
            background: '#fff', padding: '24px 30px', borderRadius: '12px', border: '2px solid #94a3b8',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)', minHeight: '600px', color: '#000', direction: 'rtl',
            overflowX: 'auto'
          }}>
            {/* 1. أ: كشف المناداة العام والشامل لجميع طلاب الصف (41 د ك) */}
            {(selectedDoc === 'seating_call_list' || selectedDoc === 'sr_seating_call_list') && (
              <div>
                {pageChunks.map((chunkStudents, pageIdx) => (
                  <div
                    key={pageIdx}
                    className="printable-page-block"
                    style={{
                      pageBreakAfter: pageIdx < pageChunks.length - 1 ? 'always' : 'auto',
                      marginBottom: pageIdx < pageChunks.length - 1 ? '24px' : '0',
                      paddingBottom: pageIdx < pageChunks.length - 1 ? '16px' : '0',
                      borderBottom: pageIdx < pageChunks.length - 1 ? '2px dashed #cbd5e1' : 'none'
                    }}
                  >
                    {/* Repeated Header per page */}
                    <MinisterialPrintHeader
                      schoolInfo={effectiveSchoolInfo}
                      documentTitle="كشف المناداة العام لطلاب الصف (سجل 41 د ك)"
                      gradeName={gradeName}
                      subTitle={`${phase === 'secondRound' ? 'الدور الثاني' : 'العام الدراسي'} ${pageChunks.length > 1 ? `(صفحة ${pageIdx + 1} من ${pageChunks.length})` : ''}`}
                      docCode={`NP-CTL-CALL-FULL`}
                      academicYear={academicYear}
                    />

                    <table style={{
                      width: '100%', borderCollapse: 'collapse', fontSize: `${fontSizePt}pt`,
                      fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif", textAlign: 'center'
                    }} border="1">
                      <thead>
                        <tr style={{ background: '#f1f5f9', fontWeight: 900 }}>
                          <th style={{ padding: '4px', width: '32px' }}>م</th>
                          <th style={{ padding: '4px', width: '75px' }}>رقم الجلوس</th>
                          <th style={{ padding: '4px', textAlign: 'right', minWidth: '170px' }}>اسم الطالب رباعياً</th>
                          <th style={{ padding: '4px', width: '60px' }}>الديانة</th>
                          <th style={{ padding: '4px', width: '75px' }}>اللغة الأولى</th>
                          <th style={{ padding: '4px', width: '65px' }}>الفصل</th>
                          <th style={{ padding: '4px', minWidth: '100px' }}>اللجنة الامتحانية</th>
                          <th style={{ padding: '4px', width: '90px' }}>توقيع الطالب</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chunkStudents.map((st, sIdx) => {
                          const globalIdx = pageIdx * perPage + sIdx + 1;
                          const isMerged = st.is_merged === 1 || st.is_merged === '1' || st.is_merged === true || Boolean(st.special_case) || Boolean(st.merge_type) || (st.inclusion_status && st.inclusion_status !== 'عادي' && st.inclusion_status !== 'لا يوجد');
                          return (
                            <tr key={st.control_student_id || sIdx}>
                              <td style={{ padding: '4px' }}>{globalIdx}</td>
                              <td style={{ padding: '4px', fontWeight: 900, color: '#0369a1' }}>{st.seat_number || '-'}</td>
                              <td style={{ padding: '4px', textAlign: 'right', fontWeight: 800 }}>
                                {st.full_name_ar} {isMerged ? <span style={{ color: '#b91c1c', fontWeight: 900, marginRight: '4px' }}>[دمج]</span> : ''}
                              </td>
                              <td style={{ padding: '4px' }}>{st.religion || 'مسلم'}</td>
                              <td style={{ padding: '4px' }}>{st.first_foreign_language || 'الإنجليزية'}</td>
                              <td style={{ padding: '4px' }}>{st.class_name_ar || (st.class_number > 0 ? `فصل ${st.class_number}` : '-')}</td>
                              <td style={{ padding: '4px' }}>{st.committee_name || '-'}</td>
                              <td style={{ padding: '4px' }}></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <MinisterialPrintFooter />
                  </div>
                ))}
              </div>
            )}

            {/* 1. ب: كشوف مناداة اللجان الفعلية (كل لجنة في ورقة مستقلة تماماً) */}
            {selectedDoc === 'seating_call_list_single' && (
              <div>
                {actualCommitteeGroups.map((commGroup, commIdx) => {
                  const commStudents = commGroup.students || [];
                  const muslimCount = commStudents.filter(s => (s.religion || '').includes('مسلم')).length;
                  const christianCount = commStudents.filter(s => (s.religion || '').includes('مسيح')).length;
                  const mergedCount = commStudents.filter(s =>
                    s.is_merged === 1 || s.is_merged === '1' || s.is_merged === true ||
                    Boolean(s.special_case) ||
                    Boolean(s.merge_type) ||
                    (s.inclusion_status && s.inclusion_status !== 'عادي' && s.inclusion_status !== 'لا يوجد')
                  ).length;
                  const totalCount = commStudents.length;

                  const displayRowsCount = Math.max(commStudents.length, 20);
                  const paddedIndices = Array.from({ length: displayRowsCount }, (_, i) => i);

                  return (
                    <div
                      key={commIdx}
                      className="printable-page-block"
                      style={{
                        pageBreakAfter: commIdx < actualCommitteeGroups.length - 1 ? 'always' : 'auto',
                        marginBottom: commIdx < actualCommitteeGroups.length - 1 ? '24px' : '0',
                        paddingBottom: commIdx < actualCommitteeGroups.length - 1 ? '16px' : '0',
                        borderBottom: commIdx < actualCommitteeGroups.length - 1 ? '2px dashed #cbd5e1' : 'none',
                        minHeight: '940px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        {/* Header */}
                        <MinisterialPrintHeader
                          schoolInfo={effectiveSchoolInfo}
                          documentTitle="كشف مناداة طلاب اللجنة"
                          gradeName={gradeName}
                          subTitle={`${phase === 'secondRound' ? 'الدور الثاني' : 'العام الدراسي'} (لجنة ${commIdx + 1} من ${actualCommitteeGroups.length})`}
                          docCode={`NP-CTL-CALL-SINGLE`}
                          academicYear={academicYear}
                        />

                        {/* Committee Box Prominent in Header */}
                        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                          <div style={{
                            display: 'inline-block', border: '2px solid #000', padding: '4px 20px',
                            borderRadius: '6px', fontSize: '13.5px', fontWeight: 900, background: '#f8fafc', color: '#000'
                          }}>
                            مقر اللجنة رقم ( {commGroup.committee.committee_number || (commIdx + 1)} ) — {commGroup.committee.committee_name} {commGroup.committee.room_number ? `— قاعة: ${commGroup.committee.room_number}` : ''}
                          </div>
                        </div>

                        {/* Table: م - رقم الجلوس - اسم الطالب - الديانة - ملاحظات */}
                        <table style={{
                          width: '100%', borderCollapse: 'collapse', fontSize: `${fontSizePt}pt`,
                          fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif", textAlign: 'center'
                        }} border="1">
                          <thead>
                            <tr style={{ background: '#f1f5f9', fontWeight: 900 }}>
                              <th style={{ padding: '5px', width: '35px' }}>م</th>
                              <th style={{ padding: '5px', width: '85px' }}>رقم الجلوس</th>
                              <th style={{ padding: '5px', textAlign: 'right', minWidth: '180px' }}>اسم الطالب رباعياً</th>
                              <th style={{ padding: '5px', width: '65px' }}>الديانة</th>
                              <th style={{ padding: '5px', width: '120px' }}>ملاحظات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paddedIndices.map(idx => {
                              const st = commStudents[idx];
                              if (!st) {
                                return (
                                  <tr key={`empty-${idx}`} style={{ height: '24px' }}>
                                    <td style={{ padding: '3px', color: '#94a3b8' }}>{idx + 1}</td>
                                    <td style={{ padding: '3px' }}></td>
                                    <td style={{ padding: '3px' }}></td>
                                    <td style={{ padding: '3px' }}></td>
                                    <td style={{ padding: '3px' }}></td>
                                  </tr>
                                );
                              }
                              const isMerged = st.is_merged === 1 || st.is_merged === '1' || st.is_merged === true || Boolean(st.special_case) || Boolean(st.merge_type) || (st.inclusion_status && st.inclusion_status !== 'عادي' && st.inclusion_status !== 'لا يوجد');
                              return (
                                <tr key={st.control_student_id || idx} style={{ height: '24px' }}>
                                  <td style={{ padding: '3px' }}>{idx + 1}</td>
                                  <td style={{ padding: '3px', fontWeight: 900, color: '#0369a1' }}>{st.seat_number || '-'}</td>
                                  <td style={{ padding: '3px', textAlign: 'right', fontWeight: 800 }}>{st.full_name_ar}</td>
                                  <td style={{ padding: '3px' }}>{st.religion || 'مسلم'}</td>
                                  <td style={{ padding: '3px', fontSize: '10pt', color: isMerged ? '#b91c1c' : '#475569', fontWeight: isMerged ? 900 : 400 }}>
                                    {isMerged ? (st.special_case || st.merge_type || 'دمج') : ''}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div>
                        {/* Simple Stats Footer (مسلم - مسيحي - جملة - دمج) */}
                        <div style={{
                          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                          border: '1.5px solid #000', padding: '6px 12px', background: '#f8fafc',
                          fontSize: '11pt', fontWeight: 900, marginTop: '8px', fontFamily: "Calibri, sans-serif"
                        }}>
                          <div>مسلم: <strong>{muslimCount}</strong></div>
                          <div>مسيحي: <strong>{christianCount}</strong></div>
                          <div>جملة: <strong>{totalCount}</strong> طالب</div>
                          <div>دمج: <strong>{mergedCount}</strong></div>
                        </div>

                        {/* Signatures: المراقب الأول / رئيس اللجنة فقط */}
                        <div style={{
                          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                          marginTop: '18px', fontSize: '11.5pt', fontWeight: 900, fontFamily: "Calibri, sans-serif"
                        }}>
                          <div style={{ textAlign: 'center', minWidth: '180px' }}>
                            <div>المراقب الأول</div>
                            <div style={{ height: '28px', borderBottom: '1px dotted #000', marginTop: '4px' }}></div>
                          </div>
                          <div style={{ textAlign: 'center', minWidth: '180px' }}>
                            <div>رئيس اللجنة</div>
                            <div style={{ height: '28px', borderBottom: '1px dotted #000', marginTop: '4px' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 1. ج: كشوف مناداة اللجان المزدوجة (كل لجنتين في ورقة واحدة A4) */}
            {selectedDoc === 'seating_call_list_dual' && (
              <div>
                {actualCommitteePairs.map((pair, pairIdx) => (
                  <div
                    key={pairIdx}
                    className="printable-page-block"
                    style={{
                      pageBreakAfter: pairIdx < actualCommitteePairs.length - 1 ? 'always' : 'auto',
                      marginBottom: pairIdx < actualCommitteePairs.length - 1 ? '24px' : '0',
                      paddingBottom: pairIdx < actualCommitteePairs.length - 1 ? '16px' : '0',
                      borderBottom: pairIdx < actualCommitteePairs.length - 1 ? '2px dashed #cbd5e1' : 'none'
                    }}
                  >
                    {/* 2-Column Grid: Each committee is a complete independent list */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', alignItems: 'start' }}>
                      {[pair.left, pair.right].filter(Boolean).map((commGroup, sideIdx) => {
                        const commStudents = commGroup.students || [];
                        const muslimCount = commStudents.filter(s => (s.religion || '').includes('مسلم')).length;
                        const christianCount = commStudents.filter(s => (s.religion || '').includes('مسيح')).length;
                        const mergedCount = commStudents.filter(s =>
                          s.is_merged === 1 || s.is_merged === '1' || s.is_merged === true ||
                          Boolean(s.special_case) ||
                          Boolean(s.merge_type) ||
                          (s.inclusion_status && s.inclusion_status !== 'عادي' && s.inclusion_status !== 'لا يوجد')
                        ).length;
                        const totalCount = commStudents.length;

                        return (
                          <div key={sideIdx} style={{ border: '1.5px solid #000', padding: '10px', borderRadius: '6px' }}>
                            {/* Each list has its own compact ministerial header */}
                            <MinisterialPrintHeader
                              schoolInfo={effectiveSchoolInfo}
                              documentTitle="كشف مناداة طلاب اللجنة"
                              gradeName={gradeName}
                              compact={true}
                              academicYear={academicYear}
                            />

                            {/* Committee Box */}
                            <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                              <div style={{
                                display: 'inline-block', border: '1.5px solid #000', padding: '2px 12px',
                                borderRadius: '4px', fontSize: '11.5pt', fontWeight: 900, background: '#f1f5f9'
                              }}>
                                اللجنة رقم ( {commGroup.committee.committee_number || (pairIdx * 2 + sideIdx + 1)} ) {commGroup.committee.room_number ? `— قاعة: ${commGroup.committee.room_number}` : ''}
                              </div>
                            </div>

                            {/* Table: م - رقم الجلوس - اسم الطالب - الديانة */}
                            <table style={{
                              width: '100%', borderCollapse: 'collapse', fontSize: `${fontSizePt}pt`,
                              fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif", textAlign: 'center'
                            }} border="1">
                              <thead>
                                <tr style={{ background: '#f8fafc', fontWeight: 900 }}>
                                  <th style={{ padding: '3px', width: '28px' }}>م</th>
                                  <th style={{ padding: '3px', width: '65px' }}>رقم الجلوس</th>
                                  <th style={{ padding: '3px', textAlign: 'right' }}>اسم الطالب</th>
                                  <th style={{ padding: '3px', width: '50px' }}>الديانة</th>
                                </tr>
                              </thead>
                              <tbody>
                                {commStudents.map((st, sIdx) => {
                                  const isMerged = st.is_merged === 1 || st.is_merged === '1' || st.is_merged === true || Boolean(st.special_case) || Boolean(st.merge_type) || (st.inclusion_status && st.inclusion_status !== 'عادي' && st.inclusion_status !== 'لا يوجد');
                                  return (
                                    <tr key={st.control_student_id || sIdx}>
                                      <td style={{ padding: '3px' }}>{sIdx + 1}</td>
                                      <td style={{ padding: '3px', fontWeight: 900, color: '#0369a1' }}>{st.seat_number || '-'}</td>
                                      <td style={{ padding: '3px', textAlign: 'right', fontWeight: 800, fontSize: `${fontSizePt - 0.5}pt` }}>
                                        {st.full_name_ar} {isMerged ? <span style={{ color: '#b91c1c', fontWeight: 900, fontSize: '9pt', marginRight: '3px' }}>[دمج]</span> : ''}
                                      </td>
                                      <td style={{ padding: '3px' }}>{st.religion || 'مسلم'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>

                            {/* Simple Stats Footer (مسلم - مسيحي - جملة - دمج) */}
                            <div style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              border: '1px solid #000', padding: '3px 8px', background: '#f8fafc',
                              fontSize: '9.5pt', fontWeight: 900, marginTop: '5px', fontFamily: "Calibri, sans-serif"
                            }}>
                              <div>مسلم: <strong>{muslimCount}</strong></div>
                              <div>مسيحي: <strong>{christianCount}</strong></div>
                              <div>دمج: <strong>{mergedCount}</strong></div>
                              <div>جملة: <strong>{totalCount}</strong></div>
                            </div>

                            {/* Signatures */}
                            <div style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              marginTop: '10px', fontSize: '10pt', fontWeight: 900, fontFamily: "Calibri, sans-serif"
                            }}>
                              <div>المراقب الأول: ................</div>
                              <div>رئيس اللجنة: ................</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. بطاقات أرقام الجلوس للطلاب (Seat Cards — 10 أو 12 أو 14 أو 8 بالصفحة) */}
            {selectedDoc === 'seat_cards' && (
              <div>
                {(() => {
                  const filteredStudents = previewStudents;
                  const perSheet = cardsPerPage || 10;
                  const chunks = [];
                  for (let i = 0; i < filteredStudents.length; i += perSheet) {
                    chunks.push(filteredStudents.slice(i, i + perSheet));
                  }

                  // Responsive card metrics based on cardsPerPage (10, 12, 14, 8)
                  const getMetrics = () => {
                    if (perSheet === 14) {
                      return { gap: '8px', pad: '6px 10px', minH: '120px', nameSz: '11pt', metaSz: '8.5pt', seatSz: '18pt', boxPad: '3px 8px', boxMinW: '75px' };
                    }
                    if (perSheet === 12) {
                      return { gap: '10px', pad: '8px 12px', minH: '145px', nameSz: '11.5pt', metaSz: '9pt', seatSz: '20pt', boxPad: '4px 10px', boxMinW: '85px' };
                    }
                    if (perSheet === 10) {
                      return { gap: '12px', pad: '10px 14px', minH: '172px', nameSz: '13pt', metaSz: '10pt', seatSz: '24pt', boxPad: '6px 12px', boxMinW: '95px' };
                    }
                    return { gap: '14px', pad: '14px 16px', minH: '215px', nameSz: '14pt', metaSz: '10.5pt', seatSz: '28pt', boxPad: '8px 14px', boxMinW: '105px' };
                  };

                  const m = getMetrics();

                  return chunks.map((chunk, chunkIdx) => (
                    <div
                      key={chunkIdx}
                      className="printable-page-block"
                      style={{
                        pageBreakAfter: chunkIdx < chunks.length - 1 ? 'always' : 'auto',
                        marginBottom: chunkIdx < chunks.length - 1 ? '24px' : '0',
                        paddingBottom: chunkIdx < chunks.length - 1 ? '16px' : '0',
                        borderBottom: chunkIdx < chunks.length - 1 ? '2px dashed #cbd5e1' : 'none',
                        minHeight: '940px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      {/* Optional Sheet Top Header */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', marginBottom: '8px',
                        fontSize: '9.5pt', color: '#475569', fontWeight: 700
                      }}>
                        <span>بطاقات أرقام جلوس الطلاب — {gradeName} {selectedClassFilter !== 'all' ? `(فصل ${selectedClassFilter})` : ''}</span>
                        <span>مدرسة: {effectiveSchoolInfo?.school_name || effectiveSchoolInfo?.school_name_ar || '................'} (صفحة {chunkIdx + 1} من {chunks.length})</span>
                      </div>

                      {/* 2-Column Grid x (N/2) Rows */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: m.gap }}>
                        {chunk.map(st => {
                          const isMerged = st.is_merged === 1 || st.is_merged === '1' || st.is_merged === true || Boolean(st.special_case) || Boolean(st.merge_type) || (st.inclusion_status && st.inclusion_status !== 'عادي' && st.inclusion_status !== 'لا يوجد');
                          return (
                            <div
                              key={st.control_student_id || st.student_id}
                              style={{
                                border: '1.5px dashed #000',
                                padding: m.pad,
                                borderRadius: '6px',
                                background: '#fff',
                                pageBreakInside: 'avoid',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                minHeight: m.minH,
                                fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif"
                              }}
                            >
                              {/* Card Top: School & Year */}
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid #000',
                                paddingBottom: '2px',
                                marginBottom: '4px',
                                fontSize: m.metaSz,
                                fontWeight: 800
                              }}>
                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }}>
                                  <span>مدرسة: </span>
                                  <strong style={{ color: '#000' }}>
                                    {effectiveSchoolInfo?.school_name || effectiveSchoolInfo?.school_name_ar || '................'}
                                  </strong>
                                </div>
                                <div style={{ fontSize: m.metaSz, color: '#334155', whiteSpace: 'nowrap' }}>
                                  العام: <strong>{academicYear || '2026 / 2027'} م</strong>
                                </div>
                              </div>

                              {/* Card Middle: Student Info + Big Seat Number Box */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                <div style={{ fontSize: m.metaSz, fontWeight: 800, lineHeight: 1.4, flex: 1 }}>
                                  <div style={{ fontSize: m.nameSz, fontWeight: 900, color: '#000' }}>
                                    الطالب: <strong>{st.full_name_ar}</strong> {isMerged ? <span style={{ color: '#b91c1c', fontSize: '9pt', fontWeight: 900 }}>[دمج]</span> : ''}
                                  </div>
                                  <div style={{ color: '#1e293b' }}>
                                    الصف: <strong>{gradeName}</strong> | الفصل: <strong>{st.class_name_ar || (st.class_number ? `فصل ${st.class_number}` : '-')}</strong>
                                  </div>
                                  <div style={{ color: '#0369a1' }}>
                                    مقر اللجنة: <strong>{st.committee_name || 'اللجنة (1)'}</strong> {st.room_number ? `(قاعة ${st.room_number})` : ''}
                                  </div>
                                </div>

                                {/* Big Seat Number Box */}
                                <div style={{
                                  textAlign: 'center',
                                  border: '2px solid #000',
                                  padding: m.boxPad,
                                  borderRadius: '6px',
                                  background: '#f8fafc',
                                  minWidth: m.boxMinW
                                }}>
                                  <span style={{ fontSize: '8.5pt', display: 'block', fontWeight: 800, color: '#475569', lineHeight: 1 }}>رقم الجلوس</span>
                                  <span style={{ fontSize: m.seatSz, fontWeight: 900, color: '#0369a1', lineHeight: 1.1 }}>
                                    {st.seat_number || '-'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* 3. دليل اللجان ومقار الامتحان */}
            {selectedDoc === 'committees_distribution' && (
              <div className="printable-page-block">
                <MinisterialPrintHeader
                  schoolInfo={effectiveSchoolInfo}
                  documentTitle="دليل اللجان ومقار الامتحان"
                  gradeName={gradeName}
                  subTitle="العام الدراسي"
                  docCode="NP-CTL-GUIDE"
                  academicYear={academicYear}
                />

                <table style={{
                  width: '100%', borderCollapse: 'collapse', fontSize: `${fontSizePt}pt`,
                  fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif", textAlign: 'center', marginBottom: '16px'
                }} border="1">
                  <thead>
                    <tr style={{ background: '#f1f5f9', fontWeight: 900 }}>
                      <th style={{ padding: '6px', width: '40px' }}>م</th>
                      <th style={{ padding: '6px', minWidth: '120px' }}>اسم اللجنة</th>
                      <th style={{ padding: '6px', minWidth: '140px' }}>المقر / المبنى / القاعة</th>
                      <th style={{ padding: '6px', width: '80px' }}>سعة اللجنة</th>
                      <th style={{ padding: '6px', width: '90px' }}>الطلاب المعينين</th>
                      <th style={{ padding: '6px', width: '90px' }}>من رقم جلوس</th>
                      <th style={{ padding: '6px', width: '90px' }}>إلى رقم جلوس</th>
                      <th style={{ padding: '6px', minWidth: '110px' }}>ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actualCommitteeGroups.map((cg, idx) => {
                      const comm = cg.committee;
                      const commStudents = cg.students || [];
                      const seatNums = commStudents.map(s => Number(s.seat_number)).filter(n => !isNaN(n) && n > 0);
                      const minSeat = seatNums.length > 0 ? Math.min(...seatNums) : '-';
                      const maxSeat = seatNums.length > 0 ? Math.max(...seatNums) : '-';
                      const mergedCount = commStudents.filter(s =>
                        s.is_merged === 1 || s.is_merged === '1' || s.is_merged === true ||
                        Boolean(s.special_case) ||
                        Boolean(s.merge_type) ||
                        (s.inclusion_status && s.inclusion_status !== 'عادي' && s.inclusion_status !== 'لا يوجد')
                      ).length;

                      return (
                        <tr key={comm.id || idx}>
                          <td style={{ padding: '6px' }}>{idx + 1}</td>
                          <td style={{ padding: '6px', fontWeight: 900 }}>{comm.committee_name}</td>
                          <td style={{ padding: '6px' }}>{comm.building_name || 'المبنى الرئيسي'} {comm.room_number ? `— قاعة: ${comm.room_number}` : ''}</td>
                          <td style={{ padding: '6px' }}>{comm.capacity || comm.max_capacity || 20}</td>
                          <td style={{ padding: '6px', fontWeight: 900, color: '#0369a1' }}>{commStudents.length}</td>
                          <td style={{ padding: '6px', fontWeight: 900 }}>{minSeat}</td>
                          <td style={{ padding: '6px', fontWeight: 900 }}>{maxSeat}</td>
                          <td style={{ padding: '6px', fontSize: '9.5pt', color: mergedCount > 0 ? '#b91c1c' : '#475569' }}>
                            {mergedCount > 0 ? `يوجد دمج (${mergedCount})` : 'عادي'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    {(() => {
                      const seatNums = previewStudents.map(s => Number(s.seat_number)).filter(n => !isNaN(n) && n > 0);
                      const minOverall = seatNums.length > 0 ? Math.min(...seatNums) : '-';
                      const maxOverall = seatNums.length > 0 ? Math.max(...seatNums) : '-';

                      return (
                        <tr style={{ background: '#f8fafc', fontWeight: 900, fontSize: `${fontSizePt + 0.5}pt` }}>
                          <td colSpan="3" style={{ padding: '8px', textAlign: 'center' }}>
                            الإجمالي العام ({actualCommitteeGroups.length} لجنة)
                          </td>
                          <td style={{ padding: '8px' }}>
                            {actualCommitteeGroups.reduce((acc, cg) => acc + (Number(cg.committee.capacity || cg.committee.max_capacity) || 20), 0)}
                          </td>
                          <td style={{ padding: '8px', color: '#0369a1' }}>
                            {previewStudents.length} طالب
                          </td>
                          <td colSpan="3" style={{ padding: '8px', textAlign: 'center' }}>
                            أرقام الجلوس من <strong>{minOverall}</strong> إلى <strong>{maxOverall}</strong>
                          </td>
                        </tr>
                      );
                    })()}
                  </tfoot>
                </table>

                <MinisterialPrintFooter />
              </div>
            )}

            {/* 4. إحصائية أعداد لجان وطلاب الامتحان */}
            {selectedDoc === 'committees_stats' && (
              <div className="printable-page-block">
                <MinisterialPrintHeader
                  schoolInfo={effectiveSchoolInfo}
                  documentTitle="إحصائية أعداد لجان وطلاب الامتحان"
                  gradeName={gradeName}
                  subTitle="العام الدراسي"
                  docCode="NP-CTL-STATS"
                  academicYear={academicYear}
                />

                <table style={{
                  width: '100%', borderCollapse: 'collapse', fontSize: `${fontSizePt}pt`,
                  fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif", textAlign: 'center', marginBottom: '16px'
                }} border="1">
                  <thead>
                    <tr style={{ background: '#f1f5f9', fontWeight: 900 }}>
                      <th style={{ padding: '6px', width: '35px' }} rowSpan="2">م</th>
                      <th style={{ padding: '6px', minWidth: '110px' }} rowSpan="2">اسم اللجنة</th>
                      <th style={{ padding: '6px', minWidth: '130px' }} rowSpan="2">المقر / القاعة</th>
                      <th style={{ padding: '4px' }} colSpan="2">مسلم</th>
                      <th style={{ padding: '4px' }} colSpan="2">مسيحي</th>
                      <th style={{ padding: '6px', width: '60px' }} rowSpan="2">دمج</th>
                      <th style={{ padding: '6px', width: '85px' }} rowSpan="2">إجمالي اللجنة</th>
                    </tr>
                    <tr style={{ background: '#f8fafc', fontWeight: 900 }}>
                      <th style={{ padding: '4px', width: '55px' }}>بنين</th>
                      <th style={{ padding: '4px', width: '55px' }}>بنات</th>
                      <th style={{ padding: '4px', width: '55px' }}>بنين</th>
                      <th style={{ padding: '4px', width: '55px' }}>بنات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actualCommitteeGroups.map((cg, idx) => {
                      const comm = cg.committee;
                      const commStudents = cg.students || [];
                      const mBoys = commStudents.filter(s => (s.religion || '').includes('مسلم') && (s.gender === 'ذكر' || s.gender === 'بنين')).length;
                      const mGirls = commStudents.filter(s => (s.religion || '').includes('مسلم') && (s.gender === 'أنثى' || s.gender === 'انثى' || s.gender === 'بنات')).length;
                      const cBoys = commStudents.filter(s => (s.religion || '').includes('مسيح') && (s.gender === 'ذكر' || s.gender === 'بنين')).length;
                      const cGirls = commStudents.filter(s => (s.religion || '').includes('مسيح') && (s.gender === 'أنثى' || s.gender === 'انثى' || s.gender === 'بنات')).length;
                      const mergedCount = commStudents.filter(s =>
                        s.is_merged === 1 || s.is_merged === '1' || s.is_merged === true ||
                        Boolean(s.special_case) ||
                        Boolean(s.merge_type) ||
                        (s.inclusion_status && s.inclusion_status !== 'عادي' && s.inclusion_status !== 'لا يوجد')
                      ).length;

                      return (
                        <tr key={comm.id || idx}>
                          <td style={{ padding: '5px' }}>{idx + 1}</td>
                          <td style={{ padding: '5px', fontWeight: 800 }}>{comm.committee_name}</td>
                          <td style={{ padding: '5px' }}>{comm.building_name || 'المبنى الرئيسي'} {comm.room_number ? `— قاعة: ${comm.room_number}` : ''}</td>
                          <td style={{ padding: '5px' }}>{mBoys}</td>
                          <td style={{ padding: '5px' }}>{mGirls}</td>
                          <td style={{ padding: '5px' }}>{cBoys}</td>
                          <td style={{ padding: '5px' }}>{cGirls}</td>
                          <td style={{ padding: '5px', color: mergedCount > 0 ? '#b91c1c' : '#000', fontWeight: mergedCount > 0 ? 900 : 400 }}>{mergedCount}</td>
                          <td style={{ padding: '5px', fontWeight: 900, color: '#0369a1' }}>{commStudents.length}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    {(() => {
                      const allSt = previewStudents;
                      const tmBoys = allSt.filter(s => (s.religion || '').includes('مسلم') && (s.gender === 'ذكر' || s.gender === 'بنين')).length;
                      const tmGirls = allSt.filter(s => (s.religion || '').includes('مسلم') && (s.gender === 'أنثى' || s.gender === 'انثى' || s.gender === 'بنات')).length;
                      const tcBoys = allSt.filter(s => (s.religion || '').includes('مسيح') && (s.gender === 'ذكر' || s.gender === 'بنين')).length;
                      const tcGirls = allSt.filter(s => (s.religion || '').includes('مسيح') && (s.gender === 'أنثى' || s.gender === 'انثى' || s.gender === 'بنات')).length;
                      const tMerged = allSt.filter(s => s.is_merged || s.special_case).length;

                      return (
                        <tr style={{ background: '#f1f5f9', fontWeight: 900, fontSize: `${fontSizePt + 0.5}pt` }}>
                          <td colSpan="3" style={{ padding: '8px', textAlign: 'center' }}>
                            الإجمالي العام ({actualCommitteeGroups.length} لجنة)
                          </td>
                          <td style={{ padding: '8px' }}>{tmBoys}</td>
                          <td style={{ padding: '8px' }}>{tmGirls}</td>
                          <td style={{ padding: '8px' }}>{tcBoys}</td>
                          <td style={{ padding: '8px' }}>{tcGirls}</td>
                          <td style={{ padding: '8px', color: '#b91c1c' }}>{tMerged}</td>
                          <td style={{ padding: '8px', color: '#0369a1', fontSize: `${fontSizePt + 1}pt` }}>{allSt.length} طالب</td>
                        </tr>
                      );
                    })()}
                  </tfoot>
                </table>

                <MinisterialPrintFooter />
              </div>
            )}

            {/* 5. غلاف ملف اللجنة (تصميم مطابق للنموذج المعتمد) */}
            {selectedDoc === 'committee_file_cover' && (
              <div>
                {actualCommitteeGroups
                  .filter(cg => selectedCommitteeId === 'all' || String(cg.committee.id) === String(selectedCommitteeId))
                  .map((cg, idx) => {
                    const comm = cg.committee;
                    const commStudents = cg.students || [];
                    const seatNums = commStudents.map(s => Number(s.seat_number)).filter(n => !isNaN(n) && n > 0);
                    const minSeat = seatNums.length > 0 ? Math.min(...seatNums) : '-';
                    const maxSeat = seatNums.length > 0 ? Math.max(...seatNums) : '-';
                    const mCount = commStudents.filter(s => (s.religion || '').includes('مسلم')).length;
                    const cCount = commStudents.filter(s => (s.religion || '').includes('مسيح')).length;
                    const mergedStudents = commStudents.filter(s =>
                      s.is_merged === 1 || s.is_merged === '1' || s.is_merged === true ||
                      Boolean(s.special_case) ||
                      Boolean(s.merge_type) ||
                      (s.inclusion_status && s.inclusion_status !== 'عادي' && s.inclusion_status !== 'لا يوجد')
                    );

                    const gov = (effectiveSchoolInfo?.governorate || effectiveSchoolInfo?.governorate_name || effectiveSchoolInfo?.governorateName || 'الجيزة').replace(/^محافظة\s*/, '');
                    const admin = (effectiveSchoolInfo?.directorate || effectiveSchoolInfo?.directorate_name || effectiveSchoolInfo?.educational_administration || effectiveSchoolInfo?.administrationName || 'العمرانية').replace(/^إدارة\s*/, '').replace(/\s*التعليمية$/, '');
                    const school = (effectiveSchoolInfo?.school_name || effectiveSchoolInfo?.school_name_ar || effectiveSchoolInfo?.schoolName || 'الشهيد محمد سليمان سلامة');

                    return (
                      <div
                        key={comm.id || idx}
                        className="printable-page-block"
                        style={{
                          pageBreakAfter: 'always',
                          marginBottom: '24px',
                          border: '4px double #1e3a8a',
                          padding: '8px',
                          borderRadius: '12px',
                          background: '#fff',
                          boxShadow: 'inset 0 0 0 2px #000, inset 0 0 0 5px #fff, inset 0 0 0 7px #1e3a8a'
                        }}
                      >
                        <div style={{
                          border: '1.5px solid #1e3a8a',
                          padding: '24px 30px',
                          borderRadius: '8px',
                          minHeight: '940px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-around',
                          alignItems: 'center',
                          textAlign: 'center',
                          fontFamily: "'Amiri', 'Cairo', Calibri, 'Segoe UI', Arial, sans-serif"
                        }}>
                          {/* 1. School Header in Top Center */}
                          <div style={{ fontSize: '15pt', fontWeight: 800, color: '#1e3a8a', lineHeight: 1.4, width: '100%' }}>
                            <div>محافظة {gov}</div>
                            <div>إدارة {admin} التعليمية</div>
                            <div>مدرسة {school}</div>
                            <div style={{ width: '220px', height: '3px', background: '#15803d', margin: '8px auto', borderRadius: '2px' }}></div>
                          </div>

                          {/* 2. Grade Name in Huge Font */}
                          <div style={{ fontSize: '40pt', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.5px', margin: '6px 0' }}>
                            {gradeName}
                          </div>

                          {/* 3. Cover Title */}
                          <div style={{ fontSize: '32pt', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
                            غلاف لجنة
                          </div>

                          {/* 4. Committee Box */}
                          <div style={{ border: '3px solid #000', borderRadius: '8px', width: '260px', padding: '8px 12px', background: '#fff', margin: '8px 0' }}>
                            <div style={{ fontSize: '26pt', fontWeight: 900, color: '#1e3a8a', borderBottom: '1.5px solid #000', paddingBottom: '4px', marginBottom: '4px' }}>
                              رقم اللجنة
                            </div>
                            <div style={{ fontSize: '64pt', fontWeight: 900, color: '#000', lineHeight: 1.05 }}>
                              {comm.committee_number || idx + 1}
                            </div>
                          </div>

                          {/* 5. Total Count Box */}
                          <div style={{ border: '2px solid #000', borderRadius: '6px', width: '180px', textAlign: 'center', background: '#fff', margin: '6px 0' }}>
                            <div style={{ fontSize: '20pt', fontWeight: 900, color: '#1e3a8a', borderBottom: '1.5px solid #000', padding: '3px 0' }}>
                              العدد
                            </div>
                            <div style={{ fontSize: '32pt', fontWeight: 900, color: '#000', padding: '4px 0', lineHeight: 1 }}>
                              {commStudents.length}
                            </div>
                          </div>

                          {/* 6. Stats Grid (مسلم / مسيحي / عدد الدمج لو وجد) */}
                          <div style={{
                            border: '2px solid #000',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            margin: '6px 0',
                            width: mergedStudents.length > 0 ? '360px' : '260px'
                          }}>
                            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '18pt', textAlign: 'center' }} border="1">
                              <tbody>
                                <tr>
                                  <td style={{ padding: '6px 14px', fontWeight: 900, color: '#1e3a8a', width: mergedStudents.length > 0 ? '33.3%' : '50%' }}>مسلم</td>
                                  <td style={{ padding: '6px 14px', fontWeight: 900, color: '#000', fontSize: '22pt', width: mergedStudents.length > 0 ? '33.3%' : '50%' }}>{mCount}</td>
                                  {mergedStudents.length > 0 && (
                                    <td style={{ padding: '6px 14px', fontWeight: 900, color: '#b91c1c', width: '33.3%' }}>عدد الدمج</td>
                                  )}
                                </tr>
                                <tr>
                                  <td style={{ padding: '6px 14px', fontWeight: 900, color: '#1e3a8a' }}>مسيحي</td>
                                  <td style={{ padding: '6px 14px', fontWeight: 900, color: '#000', fontSize: '22pt' }}>{cCount}</td>
                                  {mergedStudents.length > 0 && (
                                    <td style={{ padding: '6px 14px', fontWeight: 900, color: '#b91c1c', fontSize: '22pt' }}>{mergedStudents.length}</td>
                                  )}
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* 7. Seating Numbers Box */}
                          <div style={{ border: '2px solid #000', borderRadius: '6px', width: '280px', overflow: 'hidden', margin: '6px 0' }}>
                            <div style={{ fontSize: '20pt', fontWeight: 900, color: '#1e3a8a', borderBottom: '1.5px solid #000', padding: '3px 0', background: '#f8fafc' }}>
                              جلوس
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '18pt', textAlign: 'center' }} border="1">
                              <tbody>
                                <tr>
                                  <td style={{ width: '35%', fontWeight: 900, color: '#1e3a8a', padding: '6px' }}>من</td>
                                  <td style={{ width: '65%', fontWeight: 900, color: '#000', fontSize: '22pt', padding: '6px' }}>{minSeat}</td>
                                </tr>
                                <tr>
                                  <td style={{ fontWeight: 900, color: '#1e3a8a', padding: '6px' }}>إلى</td>
                                  <td style={{ fontWeight: 900, color: '#000', fontSize: '22pt', padding: '6px' }}>{maxSeat}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* 8. Merged Students List ONLY if they exist */}
                          {mergedStudents.length > 0 && (
                            <div style={{
                              width: '90%',
                              border: '1.5px solid #b91c1c',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              background: '#fff5f5',
                              marginTop: '6px'
                            }}>
                              <div style={{ fontSize: '11pt', fontWeight: 900, color: '#b91c1c', marginBottom: '4px' }}>
                                طلاب الدمج باللجنة:
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', fontSize: '11pt', fontWeight: 800 }}>
                                {mergedStudents.map((st, sIdx) => (
                                  <span key={st.control_student_id || sIdx} style={{ background: '#fff', border: '1px solid #fca5a5', padding: '2px 8px', borderRadius: '4px' }}>
                                    رقم جلوس ( <strong>{st.seat_number}</strong> ) : {st.full_name_ar} {st.special_case ? `[${st.special_case}]` : ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* 6. غلاف مظروف كراسات الإجابة (تصميم مطابق للنموذج المعتمد) */}
            {selectedDoc === 'answer_envelope_cover' && (
              <div>
                {actualCommitteeGroups
                  .filter(cg => selectedCommitteeId === 'all' || String(cg.committee.id) === String(selectedCommitteeId))
                  .map((cg, idx) => {
                    const comm = cg.committee;
                    const commStudents = cg.students || [];
                    const seatNums = commStudents.map(s => Number(s.seat_number)).filter(n => !isNaN(n) && n > 0);
                    const minSeat = seatNums.length > 0 ? Math.min(...seatNums) : '-';
                    const maxSeat = seatNums.length > 0 ? Math.max(...seatNums) : '-';
                    const mCount = commStudents.filter(s => (s.religion || '').includes('مسلم')).length;
                    const cCount = commStudents.filter(s => (s.religion || '').includes('مسيح')).length;
                    const mergedStudents = commStudents.filter(s =>
                      s.is_merged === 1 || s.is_merged === '1' || s.is_merged === true ||
                      Boolean(s.special_case) ||
                      Boolean(s.merge_type) ||
                      (s.inclusion_status && s.inclusion_status !== 'عادي' && s.inclusion_status !== 'لا يوجد')
                    );

                    const gov = (effectiveSchoolInfo?.governorate || effectiveSchoolInfo?.governorate_name || effectiveSchoolInfo?.governorateName || 'الجيزة').replace(/^محافظة\s*/, '');
                    const admin = (effectiveSchoolInfo?.directorate || effectiveSchoolInfo?.directorate_name || effectiveSchoolInfo?.educational_administration || effectiveSchoolInfo?.administrationName || 'العمرانية').replace(/^إدارة\s*/, '').replace(/\s*التعليمية$/, '');
                    const school = (effectiveSchoolInfo?.school_name || effectiveSchoolInfo?.school_name_ar || effectiveSchoolInfo?.schoolName || 'الشهيد محمد سليمان سلامة');

                    return (
                      <div
                        key={comm.id || idx}
                        className="printable-page-block"
                        style={{
                          pageBreakAfter: 'always',
                          marginBottom: '24px',
                          border: '4px double #1e3a8a',
                          padding: '8px',
                          borderRadius: '12px',
                          background: '#fff',
                          boxShadow: 'inset 0 0 0 2px #000, inset 0 0 0 5px #fff, inset 0 0 0 7px #1e3a8a'
                        }}
                      >
                        <div style={{
                          border: '1.5px solid #1e3a8a',
                          padding: '24px 30px',
                          borderRadius: '8px',
                          minHeight: '940px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-around',
                          alignItems: 'center',
                          textAlign: 'center',
                          fontFamily: "'Amiri', 'Cairo', Calibri, 'Segoe UI', Arial, sans-serif"
                        }}>
                          {/* 1. School Header in Top Center */}
                          <div style={{ fontSize: '15pt', fontWeight: 800, color: '#1e3a8a', lineHeight: 1.4, width: '100%' }}>
                            <div>محافظة {gov}</div>
                            <div>إدارة {admin} التعليمية</div>
                            <div>مدرسة {school}</div>
                            <div style={{ width: '220px', height: '3px', background: '#15803d', margin: '8px auto', borderRadius: '2px' }}></div>
                          </div>

                          {/* 2. Grade Name in Huge Font */}
                          <div style={{ fontSize: '40pt', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.5px', margin: '6px 0' }}>
                            {gradeName}
                          </div>

                          {/* 3. Cover Title */}
                          <div style={{ fontSize: '32pt', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
                            غلاف إجابة
                          </div>

                          {/* 4. Committee Box */}
                          <div style={{ border: '3px solid #000', borderRadius: '8px', width: '260px', padding: '8px 12px', background: '#fff', margin: '8px 0' }}>
                            <div style={{ fontSize: '26pt', fontWeight: 900, color: '#1e3a8a', borderBottom: '1.5px solid #000', paddingBottom: '4px', marginBottom: '4px' }}>
                              رقم اللجنة
                            </div>
                            <div style={{ fontSize: '64pt', fontWeight: 900, color: '#000', lineHeight: 1.05 }}>
                              {comm.committee_number || idx + 1}
                            </div>
                          </div>

                          {/* 5. Total Count Box */}
                          <div style={{ border: '2px solid #000', borderRadius: '6px', width: '180px', textAlign: 'center', background: '#fff', margin: '6px 0' }}>
                            <div style={{ fontSize: '20pt', fontWeight: 900, color: '#1e3a8a', borderBottom: '1.5px solid #000', padding: '3px 0' }}>
                              العدد
                            </div>
                            <div style={{ fontSize: '32pt', fontWeight: 900, color: '#000', padding: '4px 0', lineHeight: 1 }}>
                              {commStudents.length}
                            </div>
                          </div>

                          {/* 6. Stats Grid (مسلم / مسيحي / عدد الدمج لو وجد) */}
                          <div style={{
                            border: '2px solid #000',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            margin: '6px 0',
                            width: mergedStudents.length > 0 ? '360px' : '260px'
                          }}>
                            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '18pt', textAlign: 'center' }} border="1">
                              <tbody>
                                <tr>
                                  <td style={{ padding: '6px 14px', fontWeight: 900, color: '#1e3a8a', width: mergedStudents.length > 0 ? '33.3%' : '50%' }}>مسلم</td>
                                  <td style={{ padding: '6px 14px', fontWeight: 900, color: '#000', fontSize: '22pt', width: mergedStudents.length > 0 ? '33.3%' : '50%' }}>{mCount}</td>
                                  {mergedStudents.length > 0 && (
                                    <td style={{ padding: '6px 14px', fontWeight: 900, color: '#b91c1c', width: '33.3%' }}>عدد الدمج</td>
                                  )}
                                </tr>
                                <tr>
                                  <td style={{ padding: '6px 14px', fontWeight: 900, color: '#1e3a8a' }}>مسيحي</td>
                                  <td style={{ padding: '6px 14px', fontWeight: 900, color: '#000', fontSize: '22pt' }}>{cCount}</td>
                                  {mergedStudents.length > 0 && (
                                    <td style={{ padding: '6px 14px', fontWeight: 900, color: '#b91c1c', fontSize: '22pt' }}>{mergedStudents.length}</td>
                                  )}
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* 7. Seating Numbers Box */}
                          <div style={{ border: '2px solid #000', borderRadius: '6px', width: '280px', overflow: 'hidden', margin: '6px 0' }}>
                            <div style={{ fontSize: '20pt', fontWeight: 900, color: '#1e3a8a', borderBottom: '1.5px solid #000', padding: '3px 0', background: '#f8fafc' }}>
                              جلوس
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '18pt', textAlign: 'center' }} border="1">
                              <tbody>
                                <tr>
                                  <td style={{ width: '35%', fontWeight: 900, color: '#1e3a8a', padding: '6px' }}>من</td>
                                  <td style={{ width: '65%', fontWeight: 900, color: '#000', fontSize: '22pt', padding: '6px' }}>{minSeat}</td>
                                </tr>
                                <tr>
                                  <td style={{ fontWeight: 900, color: '#1e3a8a', padding: '6px' }}>إلى</td>
                                  <td style={{ fontWeight: 900, color: '#000', fontSize: '22pt', padding: '6px' }}>{maxSeat}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* 8. Merged Students List ONLY if they exist */}
                          {mergedStudents.length > 0 && (
                            <div style={{
                              width: '90%',
                              border: '1.5px solid #b91c1c',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              background: '#fff5f5',
                              marginTop: '6px'
                            }}>
                              <div style={{ fontSize: '11pt', fontWeight: 900, color: '#b91c1c', marginBottom: '4px' }}>
                                طلاب الدمج باللجنة:
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', fontSize: '11pt', fontWeight: 800 }}>
                                {mergedStudents.map((st, sIdx) => (
                                  <span key={st.control_student_id || sIdx} style={{ background: '#fff', border: '1px solid #fca5a5', padding: '2px 8px', borderRadius: '4px' }}>
                                    رقم جلوس ( <strong>{st.seat_number}</strong> ) : {st.full_name_ar} {st.special_case ? `[${st.special_case}]` : ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* 7. غلاف مظروف أوراق الأسئلة (تصميم مطابق للنموذج المعتمد) */}
            {selectedDoc === 'questions_envelope_cover' && (
              <div>
                {actualCommitteeGroups
                  .filter(cg => selectedCommitteeId === 'all' || String(cg.committee.id) === String(selectedCommitteeId))
                  .map((cg, idx) => {
                    const comm = cg.committee;
                    const commStudents = cg.students || [];
                    const seatNums = commStudents.map(s => Number(s.seat_number)).filter(n => !isNaN(n) && n > 0);
                    const minSeat = seatNums.length > 0 ? Math.min(...seatNums) : '-';
                    const maxSeat = seatNums.length > 0 ? Math.max(...seatNums) : '-';
                    const mCount = commStudents.filter(s => (s.religion || '').includes('مسلم')).length;
                    const cCount = commStudents.filter(s => (s.religion || '').includes('مسيح')).length;
                    const mergedStudents = commStudents.filter(s =>
                      s.is_merged === 1 || s.is_merged === '1' || s.is_merged === true ||
                      Boolean(s.special_case) ||
                      Boolean(s.merge_type) ||
                      (s.inclusion_status && s.inclusion_status !== 'عادي' && s.inclusion_status !== 'لا يوجد')
                    );

                    const gov = (effectiveSchoolInfo?.governorate || effectiveSchoolInfo?.governorate_name || effectiveSchoolInfo?.governorateName || 'الجيزة').replace(/^محافظة\s*/, '');
                    const admin = (effectiveSchoolInfo?.directorate || effectiveSchoolInfo?.directorate_name || effectiveSchoolInfo?.educational_administration || effectiveSchoolInfo?.administrationName || 'العمرانية').replace(/^إدارة\s*/, '').replace(/\s*التعليمية$/, '');
                    const school = (effectiveSchoolInfo?.school_name || effectiveSchoolInfo?.school_name_ar || effectiveSchoolInfo?.schoolName || 'الشهيد محمد سليمان سلامة');

                    return (
                      <div
                        key={comm.id || idx}
                        className="printable-page-block"
                        style={{
                          pageBreakAfter: 'always',
                          marginBottom: '24px',
                          border: '4px double #b91c1c',
                          padding: '8px',
                          borderRadius: '12px',
                          background: '#fff',
                          boxShadow: 'inset 0 0 0 2px #000, inset 0 0 0 5px #fff, inset 0 0 0 7px #b91c1c'
                        }}
                      >
                        <div style={{
                          border: '1.5px solid #b91c1c',
                          padding: '24px 30px',
                          borderRadius: '8px',
                          minHeight: '940px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-around',
                          alignItems: 'center',
                          textAlign: 'center',
                          fontFamily: "'Amiri', 'Cairo', Calibri, 'Segoe UI', Arial, sans-serif"
                        }}>
                          {/* 1. School Header in Top Center */}
                          <div style={{ fontSize: '15pt', fontWeight: 800, color: '#1e3a8a', lineHeight: 1.4, width: '100%' }}>
                            <div>محافظة {gov}</div>
                            <div>إدارة {admin} التعليمية</div>
                            <div>مدرسة {school}</div>
                            <div style={{ width: '220px', height: '3px', background: '#15803d', margin: '8px auto', borderRadius: '2px' }}></div>
                          </div>

                          {/* 2. Grade Name in Huge Font */}
                          <div style={{ fontSize: '40pt', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.5px', margin: '6px 0' }}>
                            {gradeName}
                          </div>

                          {/* 3. Cover Title */}
                          <div style={{ fontSize: '32pt', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
                            غلاف أسئلة
                          </div>

                          {/* 4. Committee Box */}
                          <div style={{ border: '3px solid #000', borderRadius: '8px', width: '260px', padding: '8px 12px', background: '#fff', margin: '8px 0' }}>
                            <div style={{ fontSize: '26pt', fontWeight: 900, color: '#1e3a8a', borderBottom: '1.5px solid #000', paddingBottom: '4px', marginBottom: '4px' }}>
                              رقم اللجنة
                            </div>
                            <div style={{ fontSize: '64pt', fontWeight: 900, color: '#000', lineHeight: 1.05 }}>
                              {comm.committee_number || idx + 1}
                            </div>
                          </div>

                          {/* 5. Total Count Box */}
                          <div style={{ border: '2px solid #000', borderRadius: '6px', width: '180px', textAlign: 'center', background: '#fff', margin: '6px 0' }}>
                            <div style={{ fontSize: '20pt', fontWeight: 900, color: '#1e3a8a', borderBottom: '1.5px solid #000', padding: '3px 0' }}>
                              العدد
                            </div>
                            <div style={{ fontSize: '32pt', fontWeight: 900, color: '#000', padding: '4px 0', lineHeight: 1 }}>
                              {commStudents.length}
                            </div>
                          </div>

                          {/* 6. Stats Grid (مسلم / مسيحي / عدد الدمج لو وجد) */}
                          <div style={{
                            border: '2px solid #000',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            margin: '6px 0',
                            width: mergedStudents.length > 0 ? '360px' : '260px'
                          }}>
                            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '18pt', textAlign: 'center' }} border="1">
                              <tbody>
                                <tr>
                                  <td style={{ padding: '6px 14px', fontWeight: 900, color: '#b91c1c', width: mergedStudents.length > 0 ? '33.3%' : '50%' }}>مسلم</td>
                                  <td style={{ padding: '6px 14px', fontWeight: 900, color: '#000', fontSize: '22pt', width: mergedStudents.length > 0 ? '33.3%' : '50%' }}>{mCount}</td>
                                  {mergedStudents.length > 0 && (
                                    <td style={{ padding: '6px 14px', fontWeight: 900, color: '#b91c1c', width: '33.3%' }}>عدد الدمج</td>
                                  )}
                                </tr>
                                <tr>
                                  <td style={{ padding: '6px 14px', fontWeight: 900, color: '#b91c1c' }}>مسيحي</td>
                                  <td style={{ padding: '6px 14px', fontWeight: 900, color: '#000', fontSize: '22pt' }}>{cCount}</td>
                                  {mergedStudents.length > 0 && (
                                    <td style={{ padding: '6px 14px', fontWeight: 900, color: '#b91c1c', fontSize: '22pt' }}>{mergedStudents.length}</td>
                                  )}
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* 7. Seating Numbers Box */}
                          <div style={{ border: '2px solid #000', borderRadius: '6px', width: '280px', overflow: 'hidden', margin: '6px 0' }}>
                            <div style={{ fontSize: '20pt', fontWeight: 900, color: '#b91c1c', borderBottom: '1.5px solid #000', padding: '3px 0', background: '#fef2f2' }}>
                              جلوس
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '18pt', textAlign: 'center' }} border="1">
                              <tbody>
                                <tr>
                                  <td style={{ width: '35%', fontWeight: 900, color: '#b91c1c', padding: '6px' }}>من</td>
                                  <td style={{ width: '65%', fontWeight: 900, color: '#000', fontSize: '22pt', padding: '6px' }}>{minSeat}</td>
                                </tr>
                                <tr>
                                  <td style={{ fontWeight: 900, color: '#b91c1c', padding: '6px' }}>إلى</td>
                                  <td style={{ fontWeight: 900, color: '#000', fontSize: '22pt', padding: '6px' }}>{maxSeat}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* 8. Merged Students List ONLY if they exist */}
                          {mergedStudents.length > 0 && (
                            <div style={{
                              width: '90%',
                              border: '1.5px solid #b91c1c',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              background: '#fff5f5',
                              marginTop: '6px'
                            }}>
                              <div style={{ fontSize: '11pt', fontWeight: 900, color: '#b91c1c', marginBottom: '4px' }}>
                                طلاب الدمج باللجنة:
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', fontSize: '11pt', fontWeight: 800 }}>
                                {mergedStudents.map((st, sIdx) => (
                                  <span key={st.control_student_id || sIdx} style={{ background: '#fff', border: '1px solid #fca5a5', padding: '2px 8px', borderRadius: '4px' }}>
                                    رقم جلوس ( <strong>{st.seat_number}</strong> ) : {st.full_name_ar} {st.special_case ? `[${st.special_case}]` : ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* 8. لافتات أرقام اللجان الكبيرة (3 لجان بالورقة A4) */}
            {selectedDoc === 'committee_large_badges' && (
              <div>
                {(() => {
                  const filteredComms = actualCommitteeGroups.filter(
                    cg => selectedCommitteeId === 'all' || String(cg.committee.id) === String(selectedCommitteeId)
                  );
                  const badgesPerPage = 3;
                  const chunks = [];
                  for (let i = 0; i < filteredComms.length; i += badgesPerPage) {
                    chunks.push(filteredComms.slice(i, i + badgesPerPage));
                  }

                  return chunks.map((chunk, chunkIdx) => (
                    <div
                      key={chunkIdx}
                      className="printable-page-block"
                      style={{
                        pageBreakAfter: chunkIdx < chunks.length - 1 ? 'always' : 'auto',
                        marginBottom: chunkIdx < chunks.length - 1 ? '24px' : '0',
                        paddingBottom: chunkIdx < chunks.length - 1 ? '16px' : '0',
                        borderBottom: chunkIdx < chunks.length - 1 ? '2px dashed #cbd5e1' : 'none'
                      }}
                    >
                      {/* Stack of 3 Big Badges */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {chunk.map((cg, bIdx) => {
                          const comm = cg.committee;
                          const commStudents = cg.students || [];
                          const seatNums = commStudents.map(s => Number(s.seat_number)).filter(n => !isNaN(n) && n > 0);
                          const minSeat = seatNums.length > 0 ? Math.min(...seatNums) : '-';
                          const maxSeat = seatNums.length > 0 ? Math.max(...seatNums) : '-';
                          const muslimCount = commStudents.filter(s => (s.religion || '').includes('مسلم')).length;
                          const christianCount = commStudents.filter(s => (s.religion || '').includes('مسيح')).length;
                          const mergedCount = commStudents.filter(s =>
                            s.is_merged === 1 || s.is_merged === '1' || s.is_merged === true ||
                            Boolean(s.special_case) ||
                            Boolean(s.merge_type) ||
                            (s.inclusion_status && s.inclusion_status !== 'عادي' && s.inclusion_status !== 'لا يوجد')
                          ).length;

                          return (
                            <div
                              key={comm.id || bIdx}
                              style={{
                                border: '3.5px solid #000',
                                borderRadius: '10px',
                                padding: '12px 18px',
                                background: '#fff',
                                pageBreakInside: 'avoid',
                                minHeight: '280px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif",
                                boxShadow: 'inset 0 0 0 1.5px #000'
                              }}
                            >
                              {/* Badge Top: Header with School & Year */}
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '2px solid #000',
                                paddingBottom: '4px',
                                fontSize: '11.5pt',
                                fontWeight: 900
                              }}>
                                <div>مدرسة: <strong>{effectiveSchoolInfo?.school_name || effectiveSchoolInfo?.school_name_ar || '................'}</strong></div>
                                <div>العام الدراسي: <strong>{academicYear || '2026 / 2027'} م</strong></div>
                              </div>

                              {/* Grade Name in prominent 36pt font */}
                              <div style={{
                                fontSize: '36pt',
                                fontWeight: 900,
                                color: '#0369a1',
                                textAlign: 'center',
                                lineHeight: 1.1,
                                margin: '2px 0'
                              }}>
                                {gradeName}
                              </div>

                              {/* Giant Committee Number Banner */}
                              <div style={{
                                textAlign: 'center',
                                margin: '4px 0',
                                background: '#f8fafc',
                                border: '2.5px solid #000',
                                borderRadius: '10px',
                                padding: '4px 12px'
                              }}>
                                <div style={{ fontSize: '56pt', fontWeight: 900, color: '#000', lineHeight: 1.05 }}>
                                  اللجنة رقم ( {comm.committee_number || (chunkIdx * 3 + bIdx + 1)} )
                                </div>
                              </div>

                              {/* Seat Range & Stats Bar */}
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderTop: '2px solid #000',
                                paddingTop: '6px',
                                fontSize: '12.5pt',
                                fontWeight: 900
                              }}>
                                <div>
                                  أرقام الجلوس: <span style={{ fontSize: '15pt', color: '#0369a1' }}>من ( {minSeat} ) إلى ( {maxSeat} )</span>
                                </div>
                                <div style={{ fontSize: '11.5pt', color: '#334155', background: '#f8fafc', border: '1.5px solid #cbd5e1', padding: '3px 12px', borderRadius: '4px' }}>
                                  الجملة: <strong>{commStudents.length}</strong> | مسلم: <strong>{muslimCount}</strong> | مسيحي: <strong>{christianCount}</strong> {mergedCount > 0 ? `| دمج: ${mergedCount}` : ''}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* 9. كشوف ملاحظة الامتحان (تصميم مطابق للنموذج المعتمد) */}
            {selectedDoc === 'proctor_attendance' && (
              <div>
                {(() => {
                  const commsList = actualCommitteeGroups;
                  const perPage = 10;
                  const pageChunks = [];
                  for (let i = 0; i < commsList.length; i += perPage) {
                    pageChunks.push(commsList.slice(i, i + perPage));
                  }
                  if (pageChunks.length === 0) pageChunks.push([]);

                  const gov = (effectiveSchoolInfo?.governorate || effectiveSchoolInfo?.governorate_name || effectiveSchoolInfo?.governorateName || 'الجيزة').replace(/^محافظة\s*/, '');
                  const admin = (effectiveSchoolInfo?.directorate || effectiveSchoolInfo?.directorate_name || effectiveSchoolInfo?.educational_administration || effectiveSchoolInfo?.administrationName || 'العمرانية').replace(/^إدارة\s*/, '').replace(/\s*التعليمية$/, '');
                  const school = (effectiveSchoolInfo?.school_name || effectiveSchoolInfo?.school_name_ar || effectiveSchoolInfo?.schoolName || 'الشهيد محمد سليمان سلامة');

                  return pageChunks.map((chunk, pageIdx) => (
                    <div
                      key={pageIdx}
                      className="printable-page-block"
                      style={{
                        pageBreakAfter: pageIdx < pageChunks.length - 1 ? 'always' : 'auto',
                        marginBottom: pageIdx < pageChunks.length - 1 ? '24px' : '0',
                        padding: '12px 16px',
                        background: '#fff',
                        fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif"
                      }}
                    >
                      {/* 3-Column Specific Header */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1fr 1.2fr',
                        alignItems: 'start',
                        borderBottom: '2px solid #000',
                        paddingBottom: '8px',
                        marginBottom: '10px'
                      }}>
                        {/* Right: School Info */}
                        <div style={{ fontSize: '11.5pt', fontWeight: 800, lineHeight: 1.4, textAlign: 'right' }}>
                          <div>محافظة {gov}</div>
                          <div>إدارة {admin} التعليمية</div>
                          <div>مدرسة {school}</div>
                          <div style={{ width: '120px', height: '3px', background: '#15803d', marginTop: '4px' }}></div>
                        </div>

                        {/* Center: Title & Grade */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '17pt', fontWeight: 900, color: '#1e3a8a' }}>
                            كشوف ملاحظة امتحان
                          </div>
                          <div style={{ fontSize: '15pt', fontWeight: 900, color: '#000', marginTop: '2px' }}>
                            الصف: {gradeName}
                          </div>
                        </div>

                        {/* Left: Date, Subject & Semester */}
                        <div style={{ fontSize: '11pt', fontWeight: 800, lineHeight: 1.5, textAlign: 'left', direction: 'rtl' }}>
                          <div>اليوم: ................ الموافق: ...... / ...... / 20 م</div>
                          <div>المادة: .......................................</div>
                          <div style={{ fontWeight: 900 }}>( نصف / آخر ) العام</div>
                        </div>
                      </div>

                      {/* Main Proctor Assignment Table */}
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '11.5pt',
                        textAlign: 'center',
                        marginBottom: '14px'
                      }} border="1">
                        <thead>
                          <tr style={{ background: '#dcfce7', fontWeight: 900, height: '36px' }}>
                            <th style={{ padding: '6px', width: '55px', border: '1.5px solid #000' }}>رقم اللجنة</th>
                            <th style={{ padding: '6px', width: '100px', border: '1.5px solid #000' }}>
                              <div>جلوس من</div>
                              <div style={{ borderTop: '1px solid #000', marginTop: '2px', paddingTop: '2px' }}>جلوس إلى</div>
                            </th>
                            <th style={{ padding: '6px', minWidth: '220px', border: '1.5px solid #000' }}>الملاحظين</th>
                            <th style={{ padding: '6px', width: '100px', border: '1.5px solid #000' }}>التوقيع</th>
                            <th style={{ padding: '6px', width: '110px', border: '1.5px solid #000' }}>مراقب الدور</th>
                            <th style={{ padding: '6px', width: '100px', border: '1.5px solid #000' }}>ملاحظات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chunk.map((cg, idx) => {
                            const comm = cg.committee;
                            const commStudents = cg.students || [];
                            const seatNums = commStudents.map(s => Number(s.seat_number)).filter(n => !isNaN(n) && n > 0);
                            const minSeat = seatNums.length > 0 ? Math.min(...seatNums) : '-';
                            const maxSeat = seatNums.length > 0 ? Math.max(...seatNums) : '-';
                            const mergedCount = commStudents.filter(s =>
                              s.is_merged === 1 || s.is_merged === '1' || s.is_merged === true ||
                              Boolean(s.special_case) || Boolean(s.merge_type) ||
                              (s.inclusion_status && s.inclusion_status !== 'عادي' && s.inclusion_status !== 'لا يوجد')
                            ).length;

                            return (
                              <tr key={comm.id || idx} style={{ height: '54px' }}>
                                {/* Committee Number */}
                                <td style={{ padding: '4px', fontWeight: 900, fontSize: '15pt', border: '1.5px solid #000' }}>
                                  {comm.committee_number || (pageIdx * perPage + idx + 1)}
                                </td>

                                {/* Seating Numbers: From & To */}
                                <td style={{ padding: '0', border: '1.5px solid #000' }}>
                                  <div style={{ padding: '3px', fontWeight: 900, color: '#0369a1', borderBottom: '1px solid #000' }}>
                                    {minSeat}
                                  </div>
                                  <div style={{ padding: '3px', fontWeight: 900, color: '#0369a1' }}>
                                    {maxSeat}
                                  </div>
                                </td>

                                {/* Proctor Lines */}
                                <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 800, fontSize: '11pt', border: '1.5px solid #000' }}>
                                  <div style={{ marginBottom: '6px' }}>1- ................................................................</div>
                                  <div>2- ................................................................</div>
                                </td>

                                {/* Signatures */}
                                <td style={{ padding: '4px', border: '1.5px solid #000' }}>
                                  <div style={{ height: '22px', borderBottom: '1px dotted #cbd5e1' }}></div>
                                  <div style={{ height: '22px' }}></div>
                                </td>

                                {/* Floor Proctor */}
                                <td style={{ padding: '4px', border: '1.5px solid #000' }}></td>

                                {/* Notes */}
                                <td style={{ padding: '4px', fontSize: '10pt', fontWeight: 800, color: mergedCount > 0 ? '#b91c1c' : '#000', border: '1.5px solid #000' }}>
                                  {mergedCount > 0 ? `دمج (${mergedCount})` : ''}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Footer Signatures */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '18px',
                        padding: '0 40px',
                        fontSize: '13pt',
                        fontWeight: 900
                      }}>
                        <div style={{ textAlign: 'center', minWidth: '180px' }}>
                          <div>المراقب الأول</div>
                          <div style={{ marginTop: '24px' }}>..........................................</div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '180px' }}>
                          <div>رئيس اللجنة</div>
                          <div style={{ marginTop: '24px' }}>..........................................</div>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* 10. كشف غياب لجان (تصميم مطابق للنموذج المعتمد) */}
            {selectedDoc === 'committee_absence_sheet' && (
              <div>
                {(() => {
                  const commsList = actualCommitteeGroups;
                  const lineCount = absenceLinesPerCommittee || 2;
                  const perPage = lineCount === 4 ? 6 : (lineCount === 3 ? 8 : 10);
                  const pageChunks = [];
                  for (let i = 0; i < commsList.length; i += perPage) {
                    pageChunks.push(commsList.slice(i, i + perPage));
                  }
                  if (pageChunks.length === 0) pageChunks.push([]);

                  const gov = (effectiveSchoolInfo?.governorate || effectiveSchoolInfo?.governorate_name || effectiveSchoolInfo?.governorateName || 'الجيزة').replace(/^محافظة\s*/, '');
                  const admin = (effectiveSchoolInfo?.directorate || effectiveSchoolInfo?.directorate_name || effectiveSchoolInfo?.educational_administration || effectiveSchoolInfo?.administrationName || 'العمرانية').replace(/^إدارة\s*/, '').replace(/\s*التعليمية$/, '');
                  const school = (effectiveSchoolInfo?.school_name || effectiveSchoolInfo?.school_name_ar || effectiveSchoolInfo?.schoolName || 'الشهيد محمد سليمان سلامة');
                  const lineArr = Array.from({ length: lineCount }, (_, i) => i + 1);

                  return pageChunks.map((chunk, pageIdx) => (
                    <div
                      key={pageIdx}
                      className="printable-page-block"
                      style={{
                        pageBreakAfter: pageIdx < pageChunks.length - 1 ? 'always' : 'auto',
                        marginBottom: pageIdx < pageChunks.length - 1 ? '24px' : '0',
                        padding: '12px 16px',
                        background: '#fff',
                        fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif"
                      }}
                    >
                      {/* 3-Column Specific Header */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1fr 1.2fr',
                        alignItems: 'start',
                        borderBottom: '2px solid #000',
                        paddingBottom: '8px',
                        marginBottom: '10px'
                      }}>
                        {/* Right: School Info */}
                        <div style={{ fontSize: '11.5pt', fontWeight: 800, lineHeight: 1.4, textAlign: 'right' }}>
                          <div>محافظة {gov}</div>
                          <div>إدارة {admin} التعليمية</div>
                          <div>مدرسة {school}</div>
                          <div style={{ width: '120px', height: '3px', background: '#15803d', marginTop: '4px' }}></div>
                        </div>

                        {/* Center: Title & Grade */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '17pt', fontWeight: 900, color: '#1e3a8a' }}>
                            كشف غياب لجان
                          </div>
                          <div style={{ fontSize: '15pt', fontWeight: 900, color: '#000', marginTop: '2px' }}>
                            الصف: {gradeName}
                          </div>
                        </div>

                        {/* Left: Date, Subject & Semester */}
                        <div style={{ fontSize: '11pt', fontWeight: 800, lineHeight: 1.5, textAlign: 'left', direction: 'rtl' }}>
                          <div>اليوم: ................ الموافق: ...... / ...... / 20 م</div>
                          <div>المادة: .......................................</div>
                          <div style={{ fontWeight: 900 }}>( نصف / آخر ) العام</div>
                        </div>
                      </div>

                      {/* Main Absence Sheet Table */}
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: lineCount >= 4 ? '10pt' : '11pt',
                        textAlign: 'center',
                        marginBottom: '14px'
                      }} border="1">
                        <thead>
                          <tr style={{ background: '#dcfce7', fontWeight: 900, height: '36px' }}>
                            <th style={{ padding: '6px', width: '55px', border: '1.5px solid #000' }}>رقم اللجنة</th>
                            <th style={{ padding: '6px', width: '90px', border: '1.5px solid #000' }}>رقم الجلوس</th>
                            <th style={{ padding: '6px', minWidth: '240px', border: '1.5px solid #000' }}>أسماء الغائبين</th>
                            <th style={{ padding: '6px', width: '110px', border: '1.5px solid #000' }}>توقيع الملاحظين</th>
                            <th style={{ padding: '6px', width: '100px', border: '1.5px solid #000' }}>مراقب الدور</th>
                            <th style={{ padding: '6px', width: '100px', border: '1.5px solid #000' }}>ملاحظات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chunk.map((cg, idx) => {
                            const comm = cg.committee;
                            const rowH = lineCount === 4 ? '20px' : (lineCount === 3 ? '24px' : '26px');

                            return (
                              <tr key={comm.id || idx}>
                                {/* Committee Number */}
                                <td style={{ padding: '4px', fontWeight: 900, fontSize: '15pt', border: '1.5px solid #000' }}>
                                  {comm.committee_number || (pageIdx * perPage + idx + 1)}
                                </td>

                                {/* Seating Number subdivisions */}
                                <td style={{ padding: '0', border: '1.5px solid #000' }}>
                                  {lineArr.map(n => (
                                    <div key={n} style={{ height: rowH, borderBottom: n < lineCount ? '1px dotted #cbd5e1' : 'none' }}></div>
                                  ))}
                                </td>

                                {/* Absent Names Dotted Lines */}
                                <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 800, fontSize: lineCount >= 4 ? '10pt' : '10.5pt', border: '1.5px solid #000' }}>
                                  {lineArr.map(n => (
                                    <div key={n} style={{ height: rowH, display: 'flex', alignItems: 'center' }}>
                                      ....................................................................
                                    </div>
                                  ))}
                                </td>

                                {/* Proctors Signatures */}
                                <td style={{ padding: '0', border: '1.5px solid #000' }}>
                                  {lineArr.map(n => (
                                    <div key={n} style={{ height: rowH, borderBottom: n < lineCount ? '1px dotted #cbd5e1' : 'none' }}></div>
                                  ))}
                                </td>

                                {/* Floor Proctor */}
                                <td style={{ padding: '4px', border: '1.5px solid #000' }}></td>

                                {/* Notes */}
                                <td style={{ padding: '4px', border: '1.5px solid #000' }}></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* 11. محاضر فتح وغلق الكنترول (محضر غلق بالأعلى ومحضر فتح بالأسفل في ورقة A4) */}
            {selectedDoc === 'proc_control_open_close' && (
              <div
                className="printable-page-block"
                style={{
                  background: '#fff',
                  padding: '14px 20px',
                  fontFamily: "'Amiri', 'Cairo', Calibri, 'Segoe UI', Arial, sans-serif"
                }}
              >
                {(() => {
                  const gov = (effectiveSchoolInfo?.governorate || effectiveSchoolInfo?.governorate_name || effectiveSchoolInfo?.governorateName || 'الجيزة').replace(/^محافظة\s*/, '');
                  const admin = (effectiveSchoolInfo?.directorate || effectiveSchoolInfo?.directorate_name || effectiveSchoolInfo?.educational_administration || effectiveSchoolInfo?.administrationName || 'العمرانية').replace(/^إدارة\s*/, '').replace(/\s*التعليمية$/, '');
                  const school = (effectiveSchoolInfo?.school_name || effectiveSchoolInfo?.school_name_ar || effectiveSchoolInfo?.schoolName || 'الشهيد محمد سليمان سلامة');

                  const renderProtocolSection = (type) => {
                    const isClose = type === 'close';
                    const title = isClose ? 'محضر إغلاق غرفة الكنترول' : 'محضر فتح غرفة الكنترول';

                    return (
                      <div style={{ minHeight: '440px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        {/* Standard 3-Column Ministerial Header */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1.2fr 1.2fr 1.2fr',
                          alignItems: 'start',
                          borderBottom: '2px solid #000',
                          paddingBottom: '6px',
                          marginBottom: '8px'
                        }}>
                          {/* Right: School Info */}
                          <div style={{ fontSize: '11pt', fontWeight: 800, lineHeight: 1.35, textAlign: 'right' }}>
                            <div>محافظة {gov}</div>
                            <div>إدارة {admin} التعليمية</div>
                            <div>مدرسة {school}</div>
                            <div style={{ width: '110px', height: '3px', background: '#15803d', marginTop: '3px' }}></div>
                          </div>

                          {/* Center: Title */}
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '17pt', fontWeight: 900, color: '#b91c1c' }}>
                              {title}
                            </div>
                          </div>

                          {/* Left: Year & Semester */}
                          <div style={{ fontSize: '10.5pt', fontWeight: 800, lineHeight: 1.4, textAlign: 'left', direction: 'rtl' }}>
                            <div>العام الدراسي: <strong>{academicYear || '2026 / 2027'} م</strong></div>
                            <div>امتحانات النقل</div>
                            <div>( نصف / آخر ) العام</div>
                          </div>
                        </div>

                        {/* Body Text */}
                        <div style={{
                          fontSize: '12pt',
                          fontWeight: 800,
                          lineHeight: 2,
                          textAlign: 'justify',
                          margin: '6px 0',
                          direction: 'rtl'
                        }}>
                          {isClose ? (
                            <>
                              <div>
                                إنه في يوم ........................ الموافق ........................ وفي تمام الساعة ....................
                              </div>
                              <div>
                                تم إغلاق غرفة الكنترول وفقا للإجراءات القانونية والقواعد المنظمة حيال ذلك ، وتسليمها إلى مسئول الأمن بعد توقيعه بالعلم ، وتم ذلك بمعرفتنا نحن أعضاء اللجنة المكونة من :
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                إنه في يوم ........................ الموافق ........................ وفي تمام الساعة ....................
                              </div>
                              <div>
                                تم فتح غرفة الكنترول وتأكد لدينا سلامة الإجراءات القانونية ، وتم ذلك بمعرفتنا نحن أعضاء اللجنة المكونة من :
                              </div>
                            </>
                          )}
                        </div>

                        {/* Committee Members 1 - 4 */}
                        <div style={{ margin: '6px 0', fontSize: '11.5pt', fontWeight: 800, direction: 'rtl' }}>
                          {[1, 2, 3, 4].map(n => (
                            <div key={n} style={{ marginBottom: '6px' }}>
                              -{n} ....................................................................................................................................
                            </div>
                          ))}
                        </div>

                        {/* Bottom Signatures: مسؤول الأمن / رئيس الكنترول / رئيس اللجنة */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '12px',
                          padding: '0 20px',
                          fontSize: '13pt',
                          fontWeight: 900
                        }}>
                          <div style={{ textAlign: 'center', minWidth: '140px' }}>
                            <div>مسئول الأمن</div>
                            <div style={{ marginTop: '16px' }}>..........................................</div>
                          </div>
                          <div style={{ textAlign: 'center', minWidth: '140px' }}>
                            <div>رئيس الكنترول</div>
                            <div style={{ marginTop: '16px' }}>..........................................</div>
                          </div>
                          <div style={{ textAlign: 'center', minWidth: '140px' }}>
                            <div>رئيس اللجنة</div>
                            <div style={{ marginTop: '16px' }}>..........................................</div>
                          </div>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div>
                      {/* Top: Close Protocol */}
                      {renderProtocolSection('close')}

                      {/* Middle Cut Line */}
                      <div style={{
                        borderTop: '2px dashed #64748b',
                        margin: '14px 0',
                        position: 'relative',
                        textAlign: 'center'
                      }}>
                        <span style={{
                          position: 'relative',
                          top: '-11px',
                          background: '#fff',
                          padding: '0 12px',
                          fontSize: '9pt',
                          color: '#64748b',
                          fontWeight: 800
                        }}>
                          ✂ ---------------------------------------- خط قص ---------------------------------------- ✂
                        </span>
                      </div>

                      {/* Bottom: Open Protocol */}
                      {renderProtocolSection('open')}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 12. محضر فتح ظروف الأسئلة (2 محضر بالورقة A4 مع خط قص) */}
            {selectedDoc === 'proc_envelope_opening' && (
              <div
                className="printable-page-block"
                style={{
                  background: '#fff',
                  padding: '14px 20px',
                  fontFamily: "'Amiri', 'Cairo', Calibri, 'Segoe UI', Arial, sans-serif"
                }}
              >
                {(() => {
                  const gov = (effectiveSchoolInfo?.governorate || effectiveSchoolInfo?.governorate_name || effectiveSchoolInfo?.governorateName || 'الجيزة').replace(/^محافظة\s*/, '');
                  const admin = (effectiveSchoolInfo?.directorate || effectiveSchoolInfo?.directorate_name || effectiveSchoolInfo?.educational_administration || effectiveSchoolInfo?.administrationName || 'العمرانية').replace(/^إدارة\s*/, '').replace(/\s*التعليمية$/, '');
                  const school = (effectiveSchoolInfo?.school_name || effectiveSchoolInfo?.school_name_ar || effectiveSchoolInfo?.schoolName || 'الشهيد محمد سليمان سلامة');

                  const renderEnvelopeSection = () => (
                    <div style={{ minHeight: '440px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      {/* Standard 3-Column Ministerial Header */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1.2fr 1.2fr',
                        alignItems: 'start',
                        borderBottom: '2px solid #000',
                        paddingBottom: '6px',
                        marginBottom: '8px'
                      }}>
                        {/* Right: School Info */}
                        <div style={{ fontSize: '11pt', fontWeight: 800, lineHeight: 1.35, textAlign: 'right' }}>
                          <div>محافظة {gov}</div>
                          <div>إدارة {admin} التعليمية</div>
                          <div>مدرسة {school}</div>
                          <div style={{ width: '110px', height: '3px', background: '#15803d', marginTop: '3px' }}></div>
                        </div>

                        {/* Center: Title */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '17pt', fontWeight: 900, color: '#b91c1c' }}>
                            محضر فتح مظروف أسئلة
                          </div>
                        </div>

                        {/* Left: Year & Semester */}
                        <div style={{ fontSize: '10.5pt', fontWeight: 800, lineHeight: 1.4, textAlign: 'left', direction: 'rtl' }}>
                          <div>العام الدراسي: <strong>{academicYear || '2026 / 2027'} م</strong></div>
                          <div>امتحانات النقل</div>
                          <div>( نصف / آخر ) العام</div>
                        </div>
                      </div>

                      {/* Body Text */}
                      <div style={{
                        fontSize: '12.5pt',
                        fontWeight: 800,
                        lineHeight: 2,
                        textAlign: 'justify',
                        margin: '6px 0',
                        direction: 'rtl'
                      }}>
                        <div>
                          إنه فى يوم ........................ الموافق ........................ وفى تمام الساعة ....................
                        </div>
                        <div>
                          تم فتح مظروف أسئلة مادة .................................... للصف ....................................
                        </div>
                        <div>
                          ووجد به عدد (&nbsp;&nbsp;..........&nbsp;&nbsp;) ورقة بعد التأكد من صحة الأختام على المظروف ، وتم ذلك بمعرفتنا نحن أعضاء اللجنة المكونة من الآتى أسماؤهم :
                        </div>
                      </div>

                      {/* Members 1 to 4 */}
                      <div style={{ margin: '6px 0', fontSize: '11.5pt', fontWeight: 800, direction: 'rtl' }}>
                        {[1, 2, 3, 4].map(n => (
                          <div key={n} style={{ marginBottom: '6px' }}>
                            -{n} ....................................................................................................................................
                          </div>
                        ))}
                      </div>

                      {/* Bottom Signatures */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '12px',
                        padding: '0 50px',
                        fontSize: '13pt',
                        fontWeight: 900
                      }}>
                        <div style={{ textAlign: 'center', minWidth: '160px' }}>
                          <div>المراقب الأول</div>
                          <div style={{ marginTop: '16px' }}>..........................................</div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '160px' }}>
                          <div>رئيس اللجنة</div>
                          <div style={{ marginTop: '16px' }}>..........................................</div>
                        </div>
                      </div>
                    </div>
                  );

                  return (
                    <div>
                      {/* Top Protocol */}
                      {renderEnvelopeSection()}

                      {/* Middle Cut Line */}
                      <div style={{
                        borderTop: '2px dashed #64748b',
                        margin: '14px 0',
                        position: 'relative',
                        textAlign: 'center'
                      }}>
                        <span style={{
                          position: 'relative',
                          top: '-11px',
                          background: '#fff',
                          padding: '0 12px',
                          fontSize: '9pt',
                          color: '#64748b',
                          fontWeight: 800
                        }}>
                          ✂ ---------------------------------------- خط قص ---------------------------------------- ✂
                        </span>
                      </div>

                      {/* Bottom Protocol */}
                      {renderEnvelopeSection()}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 13. محضر فتح دولاب الأسئلة (2 محضر بالورقة A4 مع خط قص) */}
            {selectedDoc === 'proc_cupboard_opening' && (
              <div
                className="printable-page-block"
                style={{
                  background: '#fff',
                  padding: '14px 20px',
                  fontFamily: "'Amiri', 'Cairo', Calibri, 'Segoe UI', Arial, sans-serif"
                }}
              >
                {(() => {
                  const gov = (effectiveSchoolInfo?.governorate || effectiveSchoolInfo?.governorate_name || effectiveSchoolInfo?.governorateName || 'الجيزة').replace(/^محافظة\s*/, '');
                  const admin = (effectiveSchoolInfo?.directorate || effectiveSchoolInfo?.directorate_name || effectiveSchoolInfo?.educational_administration || effectiveSchoolInfo?.administrationName || 'العمرانية').replace(/^إدارة\s*/, '').replace(/\s*التعليمية$/, '');
                  const school = (effectiveSchoolInfo?.school_name || effectiveSchoolInfo?.school_name_ar || effectiveSchoolInfo?.schoolName || 'الشهيد محمد سليمان سلامة');

                  const renderCupboardSection = () => (
                    <div style={{ minHeight: '440px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      {/* Standard 3-Column Ministerial Header */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1.2fr 1.2fr',
                        alignItems: 'start',
                        borderBottom: '2px solid #000',
                        paddingBottom: '6px',
                        marginBottom: '8px'
                      }}>
                        {/* Right: School Info */}
                        <div style={{ fontSize: '11pt', fontWeight: 800, lineHeight: 1.35, textAlign: 'right' }}>
                          <div>محافظة {gov}</div>
                          <div>إدارة {admin} التعليمية</div>
                          <div>مدرسة {school}</div>
                          <div style={{ width: '110px', height: '3px', background: '#15803d', marginTop: '3px' }}></div>
                        </div>

                        {/* Center: Title */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '17pt', fontWeight: 900, color: '#b91c1c' }}>
                            محضر فتح دولاب الأسئلة
                          </div>
                        </div>

                        {/* Left: Year & Semester */}
                        <div style={{ fontSize: '10.5pt', fontWeight: 800, lineHeight: 1.4, textAlign: 'left', direction: 'rtl' }}>
                          <div>العام الدراسي: <strong>{academicYear || '2026 / 2027'} م</strong></div>
                          <div>امتحانات النقل</div>
                          <div>( نصف / آخر ) العام</div>
                        </div>
                      </div>

                      {/* Body Text */}
                      <div style={{
                        fontSize: '12pt',
                        fontWeight: 800,
                        lineHeight: 1.9,
                        textAlign: 'justify',
                        margin: '4px 0',
                        direction: 'rtl'
                      }}>
                        <div>
                          امتحان ( الدور ..................... / ..... / ..... / 20 م )
                        </div>
                        <div>
                          محضر فتح دولاب أسئلة الامتحان في مادة / ................................................................
                        </div>
                        <div>
                          إنه في يوم ..................... سنة ..................... م الساعة ............ والدقيقة ............
                        </div>
                        <div>
                          فحصنا الأقفال الخاصة بدولاب الكنترول ووجدناها سليمة ثم فتحنا الدولاب وتأكدنا من
                        </div>
                        <div>
                          سلامة المحفوظات داخله ، وهذا إقرار منا بذلك
                        </div>
                      </div>

                      {/* Members */}
                      <div style={{ margin: '6px 0', fontSize: '11.5pt', fontWeight: 800, direction: 'rtl' }}>
                        <div style={{ fontWeight: 900, marginBottom: '3px' }}>الأعضاء :</div>
                        <div style={{ marginBottom: '4px' }}>1- ................................................................................................................</div>
                        <div>2- ................................................................................................................</div>
                      </div>

                      {/* Bottom Signatures */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '8px',
                        padding: '0 40px',
                        fontSize: '12pt',
                        fontWeight: 900
                      }}>
                        <div style={{ textAlign: 'center', minWidth: '160px' }}>
                          <div>المراقب الأول</div>
                          <div style={{ marginTop: '14px' }}>..........................................</div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '160px' }}>
                          <div>رئيس اللجنة</div>
                          <div style={{ marginTop: '14px' }}>..........................................</div>
                        </div>
                      </div>
                    </div>
                  );

                  return (
                    <div>
                      {/* Top Protocol */}
                      {renderCupboardSection()}

                      {/* Middle Cut Line */}
                      <div style={{
                        borderTop: '2px dashed #64748b',
                        margin: '14px 0',
                        position: 'relative',
                        textAlign: 'center'
                      }}>
                        <span style={{
                          position: 'relative',
                          top: '-11px',
                          background: '#fff',
                          padding: '0 12px',
                          fontSize: '9pt',
                          color: '#64748b',
                          fontWeight: 800
                        }}>
                          ✂ ---------------------------------------- خط قص ---------------------------------------- ✂
                        </span>
                      </div>

                      {/* Bottom Protocol */}
                      {renderCupboardSection()}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 14. إقرار عدم وجود موانع قانونية تحول دون مباشرة أعمال الامتحانات */}
            {selectedDoc === 'legal_impediments_declaration' && (
              <div
                className="printable-page-block"
                style={{
                  background: '#fff',
                  padding: '16px 20px',
                  fontFamily: "'Amiri', 'Cairo', Calibri, 'Segoe UI', Arial, sans-serif",
                  minHeight: '960px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                {(() => {
                  const gov = (effectiveSchoolInfo?.governorate || effectiveSchoolInfo?.governorate_name || effectiveSchoolInfo?.governorateName || 'الجيزة').replace(/^محافظة\s*/, '');
                  const admin = (effectiveSchoolInfo?.directorate || effectiveSchoolInfo?.directorate_name || effectiveSchoolInfo?.educational_administration || effectiveSchoolInfo?.administrationName || 'العمرانية').replace(/^إدارة\s*/, '').replace(/\s*التعليمية$/, '');
                  const school = (effectiveSchoolInfo?.school_name || effectiveSchoolInfo?.school_name_ar || effectiveSchoolInfo?.schoolName || 'الشهيد محمد سليمان سلامة');

                  const rowsCount = 18;
                  const rightRows = Array.from({ length: rowsCount }, (_, i) => i + 1);
                  const leftRows = Array.from({ length: rowsCount }, (_, i) => i + rowsCount + 1);

                  return (
                    <div>
                      {/* Top Header: Standard 3-Columns */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 2fr 1.2fr',
                        alignItems: 'start',
                        borderBottom: '2px solid #000',
                        paddingBottom: '8px',
                        marginBottom: '10px'
                      }}>
                        {/* Right: School Info */}
                        <div style={{ fontSize: '11pt', fontWeight: 800, lineHeight: 1.35, textAlign: 'right' }}>
                          <div>محافظة {gov}</div>
                          <div>إدارة {admin} التعليمية</div>
                          <div>مدرسة {school}</div>
                          <div style={{ width: '110px', height: '3px', background: '#15803d', marginTop: '3px' }}></div>
                        </div>

                        {/* Center: Title */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '17pt', fontWeight: 900, color: '#b91c1c' }}>
                            إقرار عدم وجود موانع قانونية تحول دون مباشرة أعمال الامتحانات
                          </div>
                        </div>

                        {/* Left: Year & Semester */}
                        <div style={{ fontSize: '10.5pt', fontWeight: 800, lineHeight: 1.4, textAlign: 'left', direction: 'rtl' }}>
                          <div>العام الدراسي: <strong>{academicYear || '2026 / 2027'} م</strong></div>
                          <div>امتحانات النقل</div>
                          <div>( نصف / آخر ) العام</div>
                        </div>
                      </div>

                      {/* Intro Statement Before Table */}
                      <div style={{
                        fontSize: '13pt',
                        fontWeight: 800,
                        color: '#000',
                        textAlign: 'center',
                        margin: '6px 0 10px 0',
                        lineHeight: 1.5
                      }}>
                        نقر نحن الموقعين أدناه بعدم وجود موانع قانونية تحول دون مباشرة أعمال الامتحانات وفقاً للقواعد المنظمة واللوائح.
                      </div>

                      {/* Main Dual-Column Declaration Table */}
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '11pt',
                        textAlign: 'center',
                        marginBottom: '14px'
                      }} border="1">
                        <thead>
                          <tr style={{ background: '#fef3c7', fontWeight: 900, height: '32px' }}>
                            <th style={{ padding: '4px', width: '35px', border: '1.5px solid #000' }}>م</th>
                            <th style={{ padding: '4px', minWidth: '160px', border: '1.5px solid #000' }}>الإســــم</th>
                            <th style={{ padding: '4px', width: '130px', border: '1.5px solid #000' }}>التوقيع</th>
                            <th style={{ padding: '4px', width: '35px', border: '1.5px solid #000' }}>م</th>
                            <th style={{ padding: '4px', minWidth: '160px', border: '1.5px solid #000' }}>الإســــم</th>
                            <th style={{ padding: '4px', width: '130px', border: '1.5px solid #000' }}>التوقيع</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rightRows.map((num, idx) => {
                            const leftNum = leftRows[idx];
                            return (
                              <tr key={num} style={{ height: '34px' }}>
                                {/* Right Group */}
                                <td style={{ padding: '2px', fontWeight: 900, border: '1.5px solid #000', background: '#f8fafc' }}>
                                  {num}
                                </td>
                                <td style={{ padding: '2px 8px', textAlign: 'right', border: '1.5px solid #000' }}></td>
                                <td style={{ padding: '2px', border: '1.5px solid #000' }}></td>

                                {/* Left Group */}
                                <td style={{ padding: '2px', fontWeight: 900, border: '1.5px solid #000', background: '#f8fafc' }}>
                                  {leftNum}
                                </td>
                                <td style={{ padding: '2px 8px', textAlign: 'right', border: '1.5px solid #000' }}></td>
                                <td style={{ padding: '2px', border: '1.5px solid #000' }}></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Footer Signatures */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '16px',
                        padding: '0 50px',
                        fontSize: '13pt',
                        fontWeight: 900
                      }}>
                        <div style={{ textAlign: 'center', minWidth: '180px' }}>
                          <div>المراقب الأول</div>
                          <div style={{ marginTop: '22px' }}>..........................................</div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '180px' }}>
                          <div>رئيس اللجنة</div>
                          <div style={{ marginTop: '22px' }}>..........................................</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 15. إقرار استلام أوراق الإجابة لتقدير درجات الطلاب (2 بالورقة مع برواز كامل وترويسة) */}
            {selectedDoc === 'answer_papers_receipt_declaration' && (
              <div
                className="printable-page-block"
                style={{
                  background: '#fff',
                  padding: '12px 16px',
                  fontFamily: "'Amiri', 'Cairo', Calibri, 'Segoe UI', Arial, sans-serif"
                }}
              >
                {(() => {
                  const gov = (effectiveSchoolInfo?.governorate || effectiveSchoolInfo?.governorate_name || effectiveSchoolInfo?.governorateName || 'الجيزة').replace(/^محافظة\s*/, '');
                  const admin = (effectiveSchoolInfo?.directorate || effectiveSchoolInfo?.directorate_name || effectiveSchoolInfo?.educational_administration || effectiveSchoolInfo?.administrationName || 'العمرانية').replace(/^إدارة\s*/, '').replace(/\s*التعليمية$/, '');
                  const school = (effectiveSchoolInfo?.school_name || effectiveSchoolInfo?.school_name_ar || effectiveSchoolInfo?.schoolName || 'الشهيد محمد سليمان سلامة');

                  const renderReceiptSection = () => (
                    <div style={{
                      border: '2px solid #000',
                      borderRadius: '4px',
                      padding: '12px 18px',
                      minHeight: '445px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      {/* Standard 3-Column Ministerial Header */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1.6fr 1.2fr',
                        alignItems: 'start',
                        borderBottom: '2px solid #000',
                        paddingBottom: '6px',
                        marginBottom: '6px'
                      }}>
                        {/* Right: School Info */}
                        <div style={{ fontSize: '11pt', fontWeight: 800, lineHeight: 1.35, textAlign: 'right' }}>
                          <div>محافظة {gov}</div>
                          <div>إدارة {admin} التعليمية</div>
                          <div>مدرسة {school}</div>
                          <div style={{ width: '110px', height: '3px', background: '#15803d', marginTop: '3px' }}></div>
                        </div>

                        {/* Center: Title */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '16pt', fontWeight: 900, color: '#b91c1c' }}>
                            إقرار إستلام أوراق الإجابة لتقدير درجات الطلاب
                          </div>
                        </div>

                        {/* Left: Year & Semester */}
                        <div style={{ fontSize: '10.5pt', fontWeight: 800, lineHeight: 1.4, textAlign: 'left', direction: 'rtl' }}>
                          <div>العام الدراسي: <strong>{academicYear || '2026 / 2027'} م</strong></div>
                          <div>امتحانات النقل</div>
                          <div>( نصف / آخر ) العام</div>
                        </div>
                      </div>

                      {/* Body Text */}
                      <div style={{
                        fontSize: '12.5pt',
                        fontWeight: 800,
                        lineHeight: 2.1,
                        textAlign: 'justify',
                        margin: '6px 0',
                        direction: 'rtl'
                      }}>
                        <div>
                          إنه فى يوم ........................ الموافق ........................ وفى تمام الساعة ....................
                        </div>
                        <div>
                          إستلمت أنا / ................................................................ عدد (&nbsp;&nbsp;..........&nbsp;&nbsp;) ورقة إجابة لمادة ................................................................
                        </div>
                        <div>
                          وتأكدت من سلامة الاوراق والاجراءات ، وذلك حتى يتم تقدير درجات الطلاب ، وأكون مسئولا مسئولية كاملة
                        </div>
                        <div>
                          عن تسليم ذات العدد من الأوراق إلى غرفة الكنترول مرة أخرى بعد التقدير والمراجعة دون أى ضرر لأى ورقة.
                        </div>
                      </div>

                      {/* Signatures: المستلم & المراقب الأول / رئيس اللجنة */}
                      <div>
                        <div style={{ fontSize: '12.5pt', fontWeight: 900, textAlign: 'left', marginLeft: '40px', marginBottom: '10px' }}>
                          المستلم : ............................................................
                        </div>

                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0 40px',
                          fontSize: '12.5pt',
                          fontWeight: 900
                        }}>
                          <div style={{ textAlign: 'center', minWidth: '150px' }}>
                            <div>المراقب الأول</div>
                            <div style={{ marginTop: '14px' }}>..........................................</div>
                          </div>
                          <div style={{ textAlign: 'center', minWidth: '150px' }}>
                            <div>رئيس اللجنة</div>
                            <div style={{ marginTop: '14px' }}>..........................................</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );

                  return (
                    <div>
                      {/* Top Receipt Box */}
                      {renderReceiptSection()}

                      {/* Middle Cut Line */}
                      <div style={{
                        borderTop: '2px dashed #64748b',
                        margin: '12px 0',
                        position: 'relative',
                        textAlign: 'center'
                      }}>
                        <span style={{
                          position: 'relative',
                          top: '-11px',
                          background: '#fff',
                          padding: '0 12px',
                          fontSize: '9pt',
                          color: '#64748b',
                          fontWeight: 800
                        }}>
                          ✂ ---------------------------------------- خط قص ---------------------------------------- ✂
                        </span>
                      </div>

                      {/* Bottom Receipt Box */}
                      {renderReceiptSection()}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 16. إستمارة مقدرى ومراجعى تقدير إجابات الطلاب بأوراق الإجابة (2 بالورقة حتى 8 أسئلة) */}
            {selectedDoc === 'grading_committee_form' && (
              <div
                className="printable-page-block"
                style={{
                  background: '#fff',
                  padding: '10px 14px',
                  fontFamily: "'Amiri', 'Cairo', Calibri, 'Segoe UI', Arial, sans-serif"
                }}
              >
                {(() => {
                  const gov = (effectiveSchoolInfo?.governorate || effectiveSchoolInfo?.governorate_name || effectiveSchoolInfo?.governorateName || 'الجيزة').replace(/^محافظة\s*/, '');
                  const admin = (effectiveSchoolInfo?.directorate || effectiveSchoolInfo?.directorate_name || effectiveSchoolInfo?.educational_administration || effectiveSchoolInfo?.administrationName || 'العمرانية').replace(/^إدارة\s*/, '').replace(/\s*التعليمية$/, '');
                  const school = (effectiveSchoolInfo?.school_name || effectiveSchoolInfo?.school_name_ar || effectiveSchoolInfo?.schoolName || 'الشهيد محمد سليمان سلامة');

                  const questionNames = [
                    'السؤال الأول',
                    'السؤال الثاني',
                    'السؤال الثالث',
                    'السؤال الرابع',
                    'السؤال الخامس',
                    'السؤال السادس',
                    'السؤال السابع',
                    'السؤال الثامن'
                  ];

                  const renderGradingSection = () => (
                    <div style={{
                      border: '2px solid #000',
                      padding: '8px 12px',
                      borderRadius: '3px',
                      minHeight: '455px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      {/* Standard 3-Column Ministerial Header */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 2fr 1.2fr',
                        alignItems: 'start',
                        borderBottom: '2px solid #000',
                        paddingBottom: '4px',
                        marginBottom: '4px'
                      }}>
                        {/* Right: School Info */}
                        <div style={{ fontSize: '10.5pt', fontWeight: 800, lineHeight: 1.3, textAlign: 'right' }}>
                          <div>محافظة {gov}</div>
                          <div>إدارة {admin} التعليمية</div>
                          <div>مدرسة {school}</div>
                          <div style={{ width: '100px', height: '2.5px', background: '#15803d', marginTop: '2px' }}></div>
                        </div>

                        {/* Center: Title */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '14pt', fontWeight: 900, color: '#b91c1c' }}>
                            إستمارة مقدرى ومراجعى تقدير إجابات الطلاب بأوراق الإجابة
                          </div>
                        </div>

                        {/* Left: Year & Semester */}
                        <div style={{ fontSize: '10pt', fontWeight: 800, lineHeight: 1.35, textAlign: 'left', direction: 'rtl' }}>
                          <div>العام الدراسي: <strong>{academicYear || '2026 / 2027'} م</strong></div>
                          <div>امتحانات النقل</div>
                          <div>( نصف / آخر ) العام</div>
                        </div>
                      </div>

                      {/* Sub-line: Grade & Subject */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '40px',
                        fontSize: '11pt',
                        fontWeight: 900,
                        margin: '2px 0 6px 0',
                        direction: 'rtl'
                      }}>
                        <div>الصف : ................................................................</div>
                        <div>مادة : ................................................................</div>
                      </div>

                      {/* Main Grading Table: 8 Questions */}
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '10.5pt',
                        textAlign: 'center',
                        marginBottom: '6px'
                      }} border="1">
                        <thead>
                          <tr style={{ background: '#fef08a', fontWeight: 900, height: '24px' }}>
                            <th style={{ padding: '3px', width: '100px', border: '1.5px solid #000' }}>رقم السؤال</th>
                            <th style={{ padding: '3px', minWidth: '150px', border: '1.5px solid #000' }}>اسم المقدر</th>
                            <th style={{ padding: '3px', width: '100px', border: '1.5px solid #000' }}>التوقيع</th>
                            <th style={{ padding: '3px', minWidth: '150px', border: '1.5px solid #000' }}>اسم المراجع</th>
                            <th style={{ padding: '3px', width: '100px', border: '1.5px solid #000' }}>التوقيع</th>
                          </tr>
                        </thead>
                        <tbody>
                          {questionNames.map((qName, idx) => (
                            <tr key={idx} style={{ height: '21px' }}>
                              <td style={{ padding: '2px', fontWeight: 900, border: '1.5px solid #000', background: '#f8fafc' }}>
                                {qName}
                              </td>
                              <td style={{ padding: '2px', border: '1.5px solid #000' }}></td>
                              <td style={{ padding: '2px', border: '1.5px solid #000' }}></td>
                              <td style={{ padding: '2px', border: '1.5px solid #000' }}></td>
                              <td style={{ padding: '2px', border: '1.5px solid #000' }}></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Bottom Summation Table */}
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '10.5pt',
                        textAlign: 'center',
                        marginBottom: '6px'
                      }} border="1">
                        <thead>
                          <tr style={{ background: '#f1f5f9', fontWeight: 900, height: '22px' }}>
                            <th style={{ padding: '3px', width: '50%', border: '1.5px solid #000' }}>جمع الدرجات</th>
                            <th style={{ padding: '3px', width: '50%', border: '1.5px solid #000' }}>راجع الجمع</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ height: '24px' }}>
                            <td style={{ padding: '2px', border: '1.5px solid #000', fontWeight: 800 }}>التوقيع : </td>
                            <td style={{ padding: '2px', border: '1.5px solid #000', fontWeight: 800 }}>التوقيع : </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Footer 3 Signatures */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0 20px',
                        fontSize: '11.5pt',
                        fontWeight: 900
                      }}>
                        <div style={{ textAlign: 'center', minWidth: '130px' }}>
                          <div>المعلم – مشرف المادة</div>
                          <div style={{ marginTop: '12px' }}>....................................</div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '130px' }}>
                          <div>رئيس الكنترول</div>
                          <div style={{ marginTop: '12px' }}>....................................</div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '130px' }}>
                          <div>رئيس اللجنة</div>
                          <div style={{ marginTop: '12px' }}>....................................</div>
                        </div>
                      </div>
                    </div>
                  );

                  return (
                    <div>
                      {/* Top Grading Box */}
                      {renderGradingSection()}

                      {/* Middle Cut Line */}
                      <div style={{
                        borderTop: '2px dashed #64748b',
                        margin: '10px 0',
                        position: 'relative',
                        textAlign: 'center'
                      }}>
                        <span style={{
                          position: 'relative',
                          top: '-10px',
                          background: '#fff',
                          padding: '0 12px',
                          fontSize: '8.5pt',
                          color: '#64748b',
                          fontWeight: 800
                        }}>
                          ✂ ---------------------------------------- خط قص ---------------------------------------- ✂
                        </span>
                      </div>

                      {/* Bottom Grading Box */}
                      {renderGradingSection()}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 17. مراجعة ورفع درجات طلاب راسبين (25 سطر ببرواز كامل وترويسة ثلاثية) */}
            {selectedDoc === 'failing_students_grade_review' && (
              <div
                className="printable-page-block"
                style={{
                  background: '#fff',
                  padding: '14px 18px',
                  fontFamily: "'Amiri', 'Cairo', Calibri, 'Segoe UI', Arial, sans-serif",
                  minHeight: '970px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                {(() => {
                  const gov = (effectiveSchoolInfo?.governorate || effectiveSchoolInfo?.governorate_name || effectiveSchoolInfo?.governorateName || 'الجيزة').replace(/^محافظة\s*/, '');
                  const admin = (effectiveSchoolInfo?.directorate || effectiveSchoolInfo?.directorate_name || effectiveSchoolInfo?.educational_administration || effectiveSchoolInfo?.administrationName || 'العمرانية').replace(/^إدارة\s*/, '').replace(/\s*التعليمية$/, '');
                  const school = (effectiveSchoolInfo?.school_name || effectiveSchoolInfo?.school_name_ar || effectiveSchoolInfo?.schoolName || 'الشهيد محمد سليمان سلامة');

                  const rows = Array.from({ length: 25 }, (_, i) => i + 1);

                  return (
                    <div style={{
                      border: '2px solid #000',
                      padding: '12px 16px',
                      borderRadius: '3px',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        {/* Standard 3-Column Ministerial Header */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1.2fr 2fr 1.2fr',
                          alignItems: 'start',
                          borderBottom: '2px solid #000',
                          paddingBottom: '6px',
                          marginBottom: '6px'
                        }}>
                          {/* Right: School Info */}
                          <div style={{ fontSize: '11pt', fontWeight: 800, lineHeight: 1.35, textAlign: 'right' }}>
                            <div>محافظة {gov}</div>
                            <div>إدارة {admin} التعليمية</div>
                            <div>مدرسة {school}</div>
                            <div style={{ width: '110px', height: '3px', background: '#15803d', marginTop: '3px' }}></div>
                          </div>

                          {/* Center: Title */}
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '17pt', fontWeight: 900, color: '#b91c1c' }}>
                              مراجعة ورفع درجات طلاب راسبين
                            </div>
                          </div>

                          {/* Left: Year & Semester */}
                          <div style={{ fontSize: '10.5pt', fontWeight: 800, lineHeight: 1.4, textAlign: 'left', direction: 'rtl' }}>
                            <div>العام الدراسي: <strong>{academicYear || '2026 / 2027'} م</strong></div>
                            <div>امتحانات النقل</div>
                            <div>( نصف / آخر ) العام</div>
                          </div>
                        </div>

                        {/* Sub-line: Grade & Subject */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          gap: '50px',
                          fontSize: '11.5pt',
                          fontWeight: 900,
                          margin: '4px 0 8px 0',
                          direction: 'rtl'
                        }}>
                          <div>الصف : ................................................................</div>
                          <div>مادة : ................................................................</div>
                        </div>

                        {/* Main 25-Row Table */}
                        <table style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: '10pt',
                          textAlign: 'center',
                          marginBottom: '8px'
                        }} border="1">
                          <thead>
                            <tr style={{ background: '#fef9c3', fontWeight: 900 }}>
                              <th rowSpan="2" style={{ padding: '4px 2px', width: '35px', border: '1.5px solid #000' }}>م</th>
                              <th rowSpan="2" style={{ padding: '4px 2px', width: '100px', border: '1.5px solid #000' }}>الرقم السرى</th>
                              <th colSpan="2" style={{ padding: '3px 2px', width: '130px', border: '1.5px solid #000' }}>الدرجـــة</th>
                              <th rowSpan="2" style={{ padding: '4px 2px', minWidth: '230px', border: '1.5px solid #000' }}>نتيجة الفحص</th>
                              <th rowSpan="2" style={{ padding: '4px 2px', width: '110px', border: '1.5px solid #000' }}>التوقيع</th>
                            </tr>
                            <tr style={{ background: '#fef9c3', fontWeight: 900 }}>
                              <th style={{ padding: '2px', width: '65px', border: '1.5px solid #000' }}>قبل</th>
                              <th style={{ padding: '2px', width: '65px', border: '1.5px solid #000' }}>بعد</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map(num => (
                              <tr key={num} style={{ height: '22px' }}>
                                <td style={{ padding: '1px', fontWeight: 900, border: '1.5px solid #000', background: '#f8fafc' }}>
                                  {num}
                                </td>
                                <td style={{ padding: '1px', border: '1.5px solid #000' }}></td>
                                <td style={{ padding: '1px', border: '1.5px solid #000' }}></td>
                                <td style={{ padding: '1px', border: '1.5px solid #000' }}></td>
                                <td style={{ padding: '1px', border: '1.5px solid #000' }}></td>
                                <td style={{ padding: '1px', border: '1.5px solid #000' }}></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Footer 3 Signatures */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '10px',
                        padding: '0 30px',
                        fontSize: '12pt',
                        fontWeight: 900
                      }}>
                        <div style={{ textAlign: 'center', minWidth: '150px' }}>
                          <div>المعلم – مشرف المادة</div>
                          <div style={{ marginTop: '16px' }}>..........................................</div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '150px' }}>
                          <div>رئيس الكنترول</div>
                          <div style={{ marginTop: '16px' }}>..........................................</div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '150px' }}>
                          <div>رئيس اللجنة</div>
                          <div style={{ marginTop: '16px' }}>..........................................</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 9.1 شيت مسودة الرصد السري (فارغ للرصد اليدوي على الأرقام السرية - بدون توقيعات وبدون أعمدة إضافية) */}
            {(selectedDoc === 'term1_secret_sheet' || selectedDoc === 'term2_secret_sheet') && (
              <div>
                {secretPageChunks.map((chunkStudents, pageIdx) => {
                  const isTerm2 = selectedDoc === 'term2_secret_sheet';
                  const examSubjects = subjects.filter(s => s.evaluation_method !== 'pass_fail_only');
                  return (
                    <div
                      key={pageIdx}
                      className="printable-page-block"
                      style={{
                        pageBreakAfter: pageIdx < secretPageChunks.length - 1 ? 'always' : 'auto',
                        marginBottom: pageIdx < secretPageChunks.length - 1 ? '24px' : '0',
                        paddingBottom: pageIdx < secretPageChunks.length - 1 ? '16px' : '0',
                        borderBottom: pageIdx < secretPageChunks.length - 1 ? '2px dashed #cbd5e1' : 'none'
                      }}
                    >
                      <MinisterialPrintHeader
                        schoolInfo={effectiveSchoolInfo}
                        documentTitle={`شيت مسودة رصد درجات امتحان الفصل الدراسي ${isTerm2 ? 'الثاني' : 'الأول'} (سري بدون أسماء)`}
                        gradeName={gradeName}
                        subTitle={`مرتباً تصاعدياً بالأرقام السرية (مسودة الرصد اليدوي) ${secretPageChunks.length > 1 ? `| صفحة ${pageIdx + 1} من ${secretPageChunks.length}` : ''}`}
                        docCode={`NP-CTL-SEC-BLANK-T${isTerm2 ? '2' : '1'}`}
                        academicYear={academicYear}
                      />

                      <table style={{
                        width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: `${fontSizePt}pt`,
                        fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif", textAlign: 'center'
                      }} border="1">
                        <thead>
                          <tr style={{ background: '#f1f5f9', fontWeight: 900 }}>
                            <th rowSpan={2} style={{ padding: '4px 2px', width: '35px', verticalAlign: 'middle' }}>م</th>
                            <th rowSpan={2} style={{ padding: '4px 2px', width: '85px', verticalAlign: 'middle' }}>الرقم السري</th>
                            {examSubjects.map(sbj => (
                              <th key={sbj.id} style={{
                                padding: '4px 2px',
                                height: verticalHeaders ? '85px' : 'auto',
                                verticalAlign: verticalHeaders ? 'middle' : 'middle',
                                textAlign: 'center',
                                overflow: 'hidden'
                              }}>
                                {verticalHeaders ? (
                                  <div style={{
                                    writingMode: 'vertical-rl',
                                    textOrientation: 'mixed',
                                    transform: 'none',
                                    whiteSpace: 'nowrap',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    margin: '0 auto',
                                    padding: '2px 0',
                                    lineHeight: 1.1
                                  }}>
                                    {getShortSubjectName(sbj.subject_name_ar)}
                                  </div>
                                ) : (
                                  <div style={{ fontSize: '11px', fontWeight: 800, lineHeight: 1.15 }}>{sbj.subject_name_ar}</div>
                                )}
                              </th>
                            ))}
                          </tr>
                          <tr style={{ background: '#f8fafc', fontWeight: 900, fontSize: '10.5px' }}>
                            {examSubjects.map(sbj => {
                              const examMax = isTerm2 ? (sbj.term2_exam_mark || 60) : (sbj.term1_exam_mark || 60);
                              return (
                                <th key={`mark-${sbj.id}`} style={{ padding: '2px', height: '24px', verticalAlign: 'middle', color: '#0f172a' }}>
                                  {examMax}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {chunkStudents.map((st, sIdx) => {
                            const globalIdx = pageIdx * perPage + sIdx + 1;
                            const secCode = (isTerm2 ? st.secret_code_term2 : st.secret_code_term1) || `${5001 + globalIdx - 1}`;
                            return (
                              <tr key={st.control_student_id || sIdx} style={{ height: '24px' }}>
                                <td style={{ padding: '4px 2px' }}>{globalIdx}</td>
                                <td style={{ padding: '4px 2px', fontWeight: 900, color: '#1e1b4b' }}>{secCode}</td>
                                {examSubjects.map(sbj => (
                                  <td key={sbj.id} style={{ padding: '4px 2px' }}></td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 9.2 شيت مراجعة وتدقيق الرصد السري (بعد الرصد بالدرجات على الأرقام السرية) */}
            {(selectedDoc === 'term1_secret_review_sheet' || selectedDoc === 'term2_secret_review_sheet') && (
              <div>
                {secretPageChunks.map((chunkStudents, pageIdx) => {
                  const isTerm2 = selectedDoc === 'term2_secret_review_sheet';
                  const examSubjects = subjects.filter(s => s.evaluation_method !== 'pass_fail_only');
                  return (
                    <div
                      key={pageIdx}
                      className="printable-page-block"
                      style={{
                        pageBreakAfter: pageIdx < secretPageChunks.length - 1 ? 'always' : 'auto',
                        marginBottom: pageIdx < secretPageChunks.length - 1 ? '24px' : '0',
                        paddingBottom: pageIdx < secretPageChunks.length - 1 ? '16px' : '0',
                        borderBottom: pageIdx < secretPageChunks.length - 1 ? '2px dashed #cbd5e1' : 'none'
                      }}
                    >
                      <MinisterialPrintHeader
                        schoolInfo={effectiveSchoolInfo}
                        documentTitle={`شيت مراجعة وتدقيق درجات الامتحان السري (الفصل الدراسي ${isTerm2 ? 'الثاني' : 'الأول'})`}
                        gradeName={gradeName}
                        subTitle={`كشف التدقيق والمراجعة بعد الرصد على الأرقام السرية ${secretPageChunks.length > 1 ? `| صفحة ${pageIdx + 1} من ${secretPageChunks.length}` : ''}`}
                        docCode={`NP-CTL-SEC-REV-T${isTerm2 ? '2' : '1'}`}
                        academicYear={academicYear}
                      />

                      <table style={{
                        width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: `${fontSizePt}pt`,
                        fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif", textAlign: 'center'
                      }} border="1">
                        <thead>
                          <tr style={{ background: '#f1f5f9', fontWeight: 900 }}>
                            <th rowSpan={2} style={{ padding: '4px 2px', width: '32px', verticalAlign: 'middle' }}>م</th>
                            <th rowSpan={2} style={{ padding: '4px 2px', width: '75px', verticalAlign: 'middle' }}>الرقم السري</th>
                            {examSubjects.map(sbj => (
                              <th key={sbj.id} style={{
                                padding: '4px 2px',
                                height: verticalHeaders ? '85px' : 'auto',
                                verticalAlign: verticalHeaders ? 'middle' : 'middle',
                                textAlign: 'center',
                                overflow: 'hidden'
                              }}>
                                {verticalHeaders ? (
                                  <div style={{
                                    writingMode: 'vertical-rl',
                                    textOrientation: 'mixed',
                                    transform: 'none',
                                    whiteSpace: 'nowrap',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    margin: '0 auto',
                                    padding: '2px 0',
                                    lineHeight: 1.1
                                  }}>
                                    {getShortSubjectName(sbj.subject_name_ar)}
                                  </div>
                                ) : (
                                  <div style={{ fontSize: '11px', fontWeight: 800, lineHeight: 1.15 }}>{sbj.subject_name_ar}</div>
                                )}
                              </th>
                            ))}
                            <th rowSpan={2} style={{ padding: '4px 2px', width: '80px', verticalAlign: 'middle' }}>المجموع التحريري</th>
                            <th rowSpan={2} style={{ padding: '4px 2px', width: '80px', verticalAlign: 'middle' }}>حالة الطالب</th>
                          </tr>
                          <tr style={{ background: '#f8fafc', fontWeight: 900, fontSize: '10.5px' }}>
                            {examSubjects.map(sbj => {
                              const examMax = isTerm2 ? (sbj.term2_exam_mark || 60) : (sbj.term1_exam_mark || 60);
                              return (
                                <th key={`mark-${sbj.id}`} style={{ padding: '2px', height: '24px', verticalAlign: 'middle', color: '#0f172a' }}>
                                  {examMax}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {chunkStudents.map((st, sIdx) => {
                            const globalIdx = pageIdx * perPage + sIdx + 1;
                            const secCode = (isTerm2 ? st.secret_code_term2 : st.secret_code_term1) || `${5001 + globalIdx - 1}`;
                            let studentExamTotal = 0;
                            let hasAnyAbsent = false;
                            let enteredCount = 0;
                            const totalExamSubjects = examSubjects.length;

                            const cells = examSubjects.map(sbj => {
                              const cell = controlMarksMap[st.control_student_id]?.[sbj.id];
                              const val = cell?.written_marks !== undefined && cell?.written_marks !== null && cell?.written_marks !== ''
                                ? Number(cell.written_marks)
                                : (cell?.total_marks !== undefined && cell?.total_marks !== null && cell?.total_marks !== '' ? Number(cell.total_marks) : null);
                              
                              if (cell?.is_absent) {
                                hasAnyAbsent = true;
                                enteredCount++;
                              } else if (cell?.is_exempt) {
                                enteredCount++;
                              } else if (val !== null && !isNaN(val)) {
                                enteredCount++;
                                if (sbj.is_added_to_total) studentExamTotal += val;
                              }

                              return { sbj, cell, val };
                            });

                            let statusBadge = <span style={{ color: '#94a3b8', fontWeight: 600 }}>لم يرصد ⏳</span>;
                            if (hasAnyAbsent) {
                              statusBadge = <span style={{ color: '#dc2626', fontWeight: 800 }}>⚠️ غياب</span>;
                            } else if (enteredCount === totalExamSubjects && totalExamSubjects > 0) {
                              statusBadge = <span style={{ color: '#059669', fontWeight: 800 }}>مرصود ✅</span>;
                            } else if (enteredCount > 0) {
                              statusBadge = <span style={{ color: '#d97706', fontWeight: 800 }}>رصد جزئي ({enteredCount}/{totalExamSubjects})</span>;
                            }

                            return (
                              <tr key={st.control_student_id || sIdx}>
                                <td style={{ padding: '4px 2px' }}>{globalIdx}</td>
                                <td style={{ padding: '4px 2px', fontWeight: 900, color: '#1e1b4b' }}>{secCode}</td>
                                {cells.map(({ sbj, cell, val }) => (
                                  <td key={sbj.id} style={{ padding: '4px 2px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {cell?.is_absent ? (
                                      <span style={{ color: '#dc2626', fontWeight: 900 }}>غائب</span>
                                    ) : cell?.is_exempt ? (
                                      <span style={{ color: '#d97706', fontWeight: 900 }}>معفى</span>
                                    ) : val !== null && !isNaN(val) ? (
                                      val
                                    ) : (
                                      <span style={{ color: '#94a3b8' }}>-</span>
                                    )}
                                  </td>
                                ))}
                                <td style={{ padding: '4px 2px', fontWeight: 900, color: '#0369a1' }}>
                                  {studentExamTotal > 0 ? studentExamTotal.toFixed(1).replace(/\.0$/, '') : '-'}
                                </td>
                                <td style={{ padding: '4px 2px', fontSize: '10.5px' }}>
                                  {statusBadge}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      <div style={{ marginTop: '12px' }}>
                        <MinisterialPrintFooter />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 9.3 شيت رصد أعمال السنة والأنشطة (فارغ للرصد اليدوي - بدون عمود توقيعات - مقسم بالفصل أو الكل) */}
            {(selectedDoc === 'term1_work_activities_blank' || selectedDoc === 'term2_work_activities_blank' || selectedDoc === 'term1_work_activities') && (
              <div>
                {pageChunks.map((chunkStudents, pageIdx) => {
                  const isTerm2 = selectedDoc === 'term2_work_activities_blank';
                  const classLabel = selectedClassFilter !== 'all' ? (availableClasses.find(c => c.value === selectedClassFilter)?.label || `فصل ${selectedClassFilter}`) : 'كافة الفصول';
                  return (
                    <div
                      key={pageIdx}
                      className="printable-page-block"
                      style={{
                        pageBreakAfter: pageIdx < pageChunks.length - 1 ? 'always' : 'auto',
                        marginBottom: pageIdx < pageChunks.length - 1 ? '24px' : '0',
                        paddingBottom: pageIdx < pageChunks.length - 1 ? '16px' : '0',
                        borderBottom: pageIdx < pageChunks.length - 1 ? '2px dashed #cbd5e1' : 'none'
                      }}
                    >
                      <MinisterialPrintHeader
                        schoolInfo={effectiveSchoolInfo}
                        documentTitle={`شيت رصد درجات أعمال السنة والأنشطة التربوية (الفصل ${isTerm2 ? 'الثاني' : 'الأول'})`}
                        gradeName={gradeName}
                        subTitle={`الفصل: ${classLabel} (مسودة الرصد اليدوي) ${pageChunks.length > 1 ? `| صفحة ${pageIdx + 1} من ${pageChunks.length}` : ''}`}
                        docCode={`NP-CTL-WORK-BLANK-T${isTerm2 ? '2' : '1'}`}
                        academicYear={academicYear}
                      />

                      <table style={{
                        width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: `${fontSizePt}pt`,
                        fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif", textAlign: 'center'
                      }} border="1">
                        <thead>
                          <tr style={{ background: '#f1f5f9', fontWeight: 900 }}>
                            <th rowSpan={2} style={{ padding: '4px 2px', width: '32px', verticalAlign: 'middle' }}>م</th>
                            {selectedClassFilter === 'all' && (
                              <th rowSpan={2} style={{ padding: '4px 2px', width: '50px', verticalAlign: 'middle' }}>الفصل</th>
                            )}
                            <th rowSpan={2} style={{ padding: '4px 2px', width: '70px', verticalAlign: 'middle' }}>رقم الجلوس</th>
                            <th rowSpan={2} style={{ padding: '4px 6px', textAlign: 'right', width: selectedClassFilter === 'all' ? '210px' : '250px', verticalAlign: 'middle' }}>اسم الطالب رباعياً</th>
                            {subjects.map(sbj => (
                              <th key={sbj.id} style={{
                                padding: '4px 2px',
                                height: verticalHeaders ? '85px' : 'auto',
                                verticalAlign: verticalHeaders ? 'middle' : 'middle',
                                textAlign: 'center',
                                overflow: 'hidden'
                              }}>
                                {verticalHeaders ? (
                                  <div style={{
                                    writingMode: 'vertical-rl',
                                    textOrientation: 'mixed',
                                    transform: 'none',
                                    whiteSpace: 'nowrap',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    margin: '0 auto',
                                    padding: '2px 0',
                                    lineHeight: 1.1
                                  }}>
                                    {getShortSubjectName(sbj.subject_name_ar)}
                                  </div>
                                ) : (
                                  <div style={{ fontSize: '11px', fontWeight: 800, lineHeight: 1.15 }}>{sbj.subject_name_ar}</div>
                                )}
                              </th>
                            ))}
                          </tr>
                          <tr style={{ background: '#f8fafc', fontWeight: 900, fontSize: '10.5px' }}>
                            {subjects.map(sbj => {
                              const isActivity = sbj.evaluation_method === 'pass_fail_only';
                              const workMax = isTerm2 ? (sbj.term2_work_mark || 40) : (sbj.term1_work_mark || 40);
                              return (
                                <th key={`mark-${sbj.id}`} style={{ padding: '2px', height: '24px', verticalAlign: 'middle', color: '#0f172a' }}>
                                  {isActivity ? 'نشاط' : workMax}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {chunkStudents.map((st, sIdx) => {
                            const globalIdx = pageIdx * perPage + sIdx + 1;
                            return (
                              <tr key={st.control_student_id || sIdx} style={{ height: '25px' }}>
                                <td style={{ padding: '4px 2px' }}>{globalIdx}</td>
                                {selectedClassFilter === 'all' && (
                                  <td style={{ padding: '4px 2px' }}>{st.class_name_ar || (st.class_number > 0 ? `فصل ${st.class_number}` : '-')}</td>
                                )}
                                <td style={{ padding: '4px 2px', fontWeight: 900, color: '#0369a1' }}>{st.seat_number || '-'}</td>
                                <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.full_name_ar}</td>
                                {subjects.map(sbj => (
                                  <td key={sbj.id} style={{ padding: '4px 2px' }}></td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      <div style={{ marginTop: '12px' }}>
                        <MinisterialPrintFooter />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 9.4 شيت مراجعة وتدقيق درجات أعمال السنة والأنشطة (بعد الرصد بالدرجات - مقسم بالفصل أو الكل) */}
            {(selectedDoc === 'term1_work_activities_review' || selectedDoc === 'term2_work_activities_review') && (
              <div>
                {pageChunks.map((chunkStudents, pageIdx) => {
                  const isTerm2 = selectedDoc === 'term2_work_activities_review';
                  const classLabel = selectedClassFilter !== 'all' ? (availableClasses.find(c => c.value === selectedClassFilter)?.label || `فصل ${selectedClassFilter}`) : 'كافة الفصول';
                  return (
                    <div
                      key={pageIdx}
                      className="printable-page-block"
                      style={{
                        pageBreakAfter: pageIdx < pageChunks.length - 1 ? 'always' : 'auto',
                        marginBottom: pageIdx < pageChunks.length - 1 ? '24px' : '0',
                        paddingBottom: pageIdx < pageChunks.length - 1 ? '16px' : '0',
                        borderBottom: pageIdx < pageChunks.length - 1 ? '2px dashed #cbd5e1' : 'none'
                      }}
                    >
                      <MinisterialPrintHeader
                        schoolInfo={effectiveSchoolInfo}
                        documentTitle={`شيت مراجعة وتدقيق درجات أعمال السنة والأنشطة (الفصل ${isTerm2 ? 'الثاني' : 'الأول'})`}
                        gradeName={gradeName}
                        subTitle={`الفصل: ${classLabel} (كشف المراجعة والتدقيق بعد الرصد) ${pageChunks.length > 1 ? `| صفحة ${pageIdx + 1} من ${pageChunks.length}` : ''}`}
                        docCode={`NP-CTL-WORK-REV-T${isTerm2 ? '2' : '1'}`}
                        academicYear={academicYear}
                      />

                      <table style={{
                        width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: `${fontSizePt}pt`,
                        fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif", textAlign: 'center'
                      }} border="1">
                        <thead>
                          <tr style={{ background: '#f1f5f9', fontWeight: 900 }}>
                            <th rowSpan={2} style={{ padding: '4px 2px', width: '32px', verticalAlign: 'middle' }}>م</th>
                            {selectedClassFilter === 'all' && (
                              <th rowSpan={2} style={{ padding: '4px 2px', width: '50px', verticalAlign: 'middle' }}>الفصل</th>
                            )}
                            <th rowSpan={2} style={{ padding: '4px 2px', width: '70px', verticalAlign: 'middle' }}>رقم الجلوس</th>
                            <th rowSpan={2} style={{ padding: '4px 6px', textAlign: 'right', width: selectedClassFilter === 'all' ? '210px' : '250px', verticalAlign: 'middle' }}>اسم الطالب رباعياً</th>
                            {subjects.map(sbj => (
                              <th key={sbj.id} style={{
                                padding: '4px 2px',
                                height: verticalHeaders ? '85px' : 'auto',
                                verticalAlign: verticalHeaders ? 'middle' : 'middle',
                                textAlign: 'center',
                                overflow: 'hidden'
                              }}>
                                {verticalHeaders ? (
                                  <div style={{
                                    writingMode: 'vertical-rl',
                                    textOrientation: 'mixed',
                                    transform: 'none',
                                    whiteSpace: 'nowrap',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    margin: '0 auto',
                                    padding: '2px 0',
                                    lineHeight: 1.1
                                  }}>
                                    {getShortSubjectName(sbj.subject_name_ar)}
                                  </div>
                                ) : (
                                  <div style={{ fontSize: '11px', fontWeight: 800, lineHeight: 1.15 }}>{sbj.subject_name_ar}</div>
                                )}
                              </th>
                            ))}
                            <th rowSpan={2} style={{ padding: '4px 2px', width: '75px', verticalAlign: 'middle' }}>حالة التقييم</th>
                          </tr>
                          <tr style={{ background: '#f8fafc', fontWeight: 900, fontSize: '10.5px' }}>
                            {subjects.map(sbj => {
                              const isActivity = sbj.evaluation_method === 'pass_fail_only';
                              const workMax = isTerm2 ? (sbj.term2_work_mark || 40) : (sbj.term1_work_mark || 40);
                              return (
                                <th key={`mark-${sbj.id}`} style={{ padding: '2px', height: '24px', verticalAlign: 'middle', color: '#0f172a' }}>
                                  {isActivity ? 'نشاط' : workMax}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {chunkStudents.map((st, sIdx) => {
                            const globalIdx = pageIdx * perPage + sIdx + 1;
                            let hasAnyAbsent = false;
                            let enteredWorkCount = 0;
                            const totalSubjectsCount = subjects.length;

                            const cells = subjects.map(sbj => {
                              const isActivity = sbj.evaluation_method === 'pass_fail_only';
                              const cell = controlMarksMap[st.control_student_id]?.[sbj.id];

                              if (isActivity) {
                                const actResult = cell?.pass_fail_result || cell?.mark;
                                if (actResult) enteredWorkCount++;
                                return { sbj, isActivity, actResult: actResult || null };
                              }

                              const val = cell?.work_marks !== undefined && cell?.work_marks !== null && cell?.work_marks !== ''
                                ? Number(cell.work_marks)
                                : null;

                              if (cell?.is_absent) {
                                hasAnyAbsent = true;
                                enteredWorkCount++;
                              } else if (cell?.is_exempt) {
                                enteredWorkCount++;
                              } else if (val !== null && !isNaN(val)) {
                                enteredWorkCount++;
                              }

                              return { sbj, isActivity, cell, val };
                            });

                            let workStatusBadge = <span style={{ color: '#94a3b8', fontWeight: 600 }}>لم يرصد ⏳</span>;
                            if (hasAnyAbsent) {
                              workStatusBadge = <span style={{ color: '#dc2626', fontWeight: 800 }}>⚠️ غياب</span>;
                            } else if (enteredWorkCount === totalSubjectsCount && totalSubjectsCount > 0) {
                              workStatusBadge = <span style={{ color: '#059669', fontWeight: 800 }}>مرصود ✅</span>;
                            } else if (enteredWorkCount > 0) {
                              workStatusBadge = <span style={{ color: '#d97706', fontWeight: 800 }}>رصد جزئي ({enteredWorkCount}/{totalSubjectsCount})</span>;
                            }

                            return (
                              <tr key={st.control_student_id || sIdx} style={{ height: '25px' }}>
                                <td style={{ padding: '4px 2px' }}>{globalIdx}</td>
                                {selectedClassFilter === 'all' && (
                                  <td style={{ padding: '4px 2px' }}>{st.class_name_ar || (st.class_number > 0 ? `فصل ${st.class_number}` : '-')}</td>
                                )}
                                <td style={{ padding: '4px 2px', fontWeight: 900, color: '#0369a1' }}>{st.seat_number || '-'}</td>
                                <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.full_name_ar}</td>
                                {cells.map(c => {
                                  if (c.isActivity) {
                                    return (
                                      <td key={c.sbj.id} style={{ padding: '4px 2px', fontWeight: 800, fontSize: '10.5px' }}>
                                        {c.actResult === 'اجتاز' ? (
                                          <span style={{ color: '#15803d' }}>اجتاز ✅</span>
                                        ) : c.actResult === 'لم يجتز' ? (
                                          <span style={{ color: '#dc2626' }}>لم يجتز ❌</span>
                                        ) : (
                                          <span style={{ color: '#94a3b8' }}>-</span>
                                        )}
                                      </td>
                                    );
                                  }

                                  return (
                                    <td key={c.sbj.id} style={{ padding: '4px 2px', fontWeight: 800, overflow: 'hidden' }}>
                                      {c.cell?.is_absent ? (
                                        <span style={{ color: '#dc2626', fontWeight: 900 }}>غائب</span>
                                      ) : c.cell?.is_exempt ? (
                                        <span style={{ color: '#d97706', fontWeight: 900 }}>معفى</span>
                                      ) : c.val !== null && !isNaN(c.val) ? (
                                        c.val
                                      ) : (
                                        <span style={{ color: '#94a3b8' }}>-</span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td style={{ padding: '4px 2px', fontSize: '10.5px' }}>
                                  {workStatusBadge}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      <div style={{ marginTop: '12px' }}>
                        <MinisterialPrintFooter />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 9.4.1 كشف نتيجة الفصل الدراسي (الشيت التفصيلي المجمع - أعمال + تحريري + مجموع) */}
            {(selectedDoc === 'term1_result_broadsheet' || selectedDoc === 'term2_result_broadsheet') && (
              <div>
                {pageChunks.map((chunkStudents, pageIdx) => {
                  const isTerm2 = selectedDoc === 'term2_result_broadsheet';
                  const classLabel = selectedClassFilter !== 'all' ? (availableClasses.find(c => c.value === selectedClassFilter)?.label || `فصل ${selectedClassFilter}`) : 'كافة الفصول';
                  
                  const addedSubjects = subjects.filter(s => s.is_added_to_total && s.evaluation_method !== 'pass_fail_only');
                  const nonAddedSubjects = subjects.filter(s => !s.is_added_to_total || s.evaluation_method === 'pass_fail_only');
                  
                  const overallAddedMax = addedSubjects.reduce((acc, sbj) => {
                    const wMax = isTerm2 ? (sbj.term2_work_mark || 40) : (sbj.term1_work_mark || 40);
                    const eMax = isTerm2 ? (sbj.term2_exam_mark || 60) : (sbj.term1_exam_mark || 60);
                    return acc + wMax + eMax;
                  }, 0) || 500;

                  return (
                    <div
                      key={pageIdx}
                      className="printable-page-block"
                      style={{
                        pageBreakAfter: pageIdx < pageChunks.length - 1 ? 'always' : 'auto',
                        marginBottom: pageIdx < pageChunks.length - 1 ? '24px' : '0',
                        paddingBottom: pageIdx < pageChunks.length - 1 ? '16px' : '0',
                        borderBottom: pageIdx < pageChunks.length - 1 ? '2px dashed #cbd5e1' : 'none'
                      }}
                    >
                      <MinisterialPrintHeader
                        schoolInfo={effectiveSchoolInfo}
                        documentTitle={`كشف نتيجة الفصل الدراسي ${isTerm2 ? 'الثاني' : 'الأول'}`}
                        gradeName={gradeName}
                        subTitle={`الفصل: ${classLabel} (الشيت التفصيلي: أعمال + تحريري + مجموع) ${pageChunks.length > 1 ? `| صفحة ${pageIdx + 1} من ${pageChunks.length}` : ''}`}
                        docCode={`NP-CTL-RES-T${isTerm2 ? '2' : '1'}`}
                        academicYear={academicYear}
                      />

                      <table style={{
                        width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: `${fontSizePt}pt`,
                        fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif", textAlign: 'center'
                      }} border="1">
                        <thead>
                          {/* Row 1: Main Subject Names */}
                          <tr style={{ background: '#f1f5f9', fontWeight: 900 }}>
                            <th rowSpan={3} style={{ padding: '2px', width: '28px', verticalAlign: 'middle' }}>م</th>
                            <th rowSpan={3} style={{ padding: '2px', width: '58px', verticalAlign: 'middle' }}>رقم الجلوس</th>
                            <th rowSpan={3} style={{ padding: '2px 6px', textAlign: 'right', width: '210px', verticalAlign: 'middle' }}>اسم الطالب رباعياً</th>

                            {/* Added to total subjects */}
                            {addedSubjects.map(sbj => (
                              <th key={sbj.id} colSpan={3} style={{ padding: '3px 1px', fontSize: '10.5px', fontWeight: 900, background: '#f8fafc' }}>
                                {getShortSubjectName(sbj.subject_name_ar)}
                              </th>
                            ))}

                            {/* Overall Added Total */}
                            <th rowSpan={2} style={{ padding: '2px', width: '45px', verticalAlign: 'middle', fontWeight: 900, background: '#f1f5f9' }}>
                              المجموع
                            </th>

                            {/* Non-added subjects */}
                            {nonAddedSubjects.map(sbj => {
                              const isActivity = sbj.evaluation_method === 'pass_fail_only';
                              if (isActivity) {
                                return (
                                  <th key={sbj.id} rowSpan={2} style={{ padding: '2px', width: '38px', verticalAlign: 'middle', fontSize: '10px' }}>
                                    {getShortSubjectName(sbj.subject_name_ar)}
                                  </th>
                                );
                              }
                              return (
                                <th key={sbj.id} colSpan={3} style={{ padding: '3px 1px', fontSize: '10.5px', fontWeight: 900, background: '#f8fafc' }}>
                                  {getShortSubjectName(sbj.subject_name_ar)}
                                </th>
                              );
                            })}

                            {/* Attendance Rate */}
                            <th rowSpan={3} style={{ padding: '2px', width: '32px', verticalAlign: 'middle', background: '#f1f5f9' }}>
                              <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'none', whiteSpace: 'nowrap', fontSize: '10.5px', fontWeight: 800, margin: '0 auto', lineHeight: 1.1 }}>
                                نسبة الحضور
                              </div>
                            </th>
                          </tr>

                          {/* Row 2: Sub-headers (أعمال / تحريري / مجموع) */}
                          <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                            {addedSubjects.map(sbj => (
                              <React.Fragment key={`sub-${sbj.id}`}>
                                <th style={{ padding: '2px 0', width: '25px', fontSize: '8px', fontWeight: 800, whiteSpace: 'nowrap', letterSpacing: '-0.4px', lineHeight: 1 }}>أعمال</th>
                                <th style={{ padding: '2px 0', width: '25px', fontSize: '8px', fontWeight: 800, whiteSpace: 'nowrap', letterSpacing: '-0.4px', lineHeight: 1 }}>تحريري</th>
                                <th style={{ padding: '2px 0', width: '28px', fontSize: '8px', fontWeight: 900, whiteSpace: 'nowrap', letterSpacing: '-0.4px', lineHeight: 1, background: '#e2e8f0', color: '#0f172a' }}>مجموع</th>
                              </React.Fragment>
                            ))}

                            {nonAddedSubjects.map(sbj => {
                              if (sbj.evaluation_method === 'pass_fail_only') return null;
                              return (
                                <React.Fragment key={`sub-non-${sbj.id}`}>
                                  <th style={{ padding: '2px 0', width: '25px', fontSize: '8px', fontWeight: 800, whiteSpace: 'nowrap', letterSpacing: '-0.4px', lineHeight: 1 }}>أعمال</th>
                                  <th style={{ padding: '2px 0', width: '25px', fontSize: '8px', fontWeight: 800, whiteSpace: 'nowrap', letterSpacing: '-0.4px', lineHeight: 1 }}>تحريري</th>
                                  <th style={{ padding: '2px 0', width: '28px', fontSize: '8px', fontWeight: 900, whiteSpace: 'nowrap', letterSpacing: '-0.4px', lineHeight: 1, background: '#e2e8f0', color: '#0f172a' }}>مجموع</th>
                                </React.Fragment>
                              );
                            })}
                          </tr>

                          {/* Row 3: Max Marks */}
                          <tr style={{ background: '#f1f5f9', fontWeight: 900, fontSize: '8.5px', color: '#0f172a' }}>
                            {addedSubjects.map(sbj => {
                              const workMax = isTerm2 ? (sbj.term2_work_mark || 40) : (sbj.term1_work_mark || 40);
                              const examMax = isTerm2 ? (sbj.term2_exam_mark || 60) : (sbj.term1_exam_mark || 60);
                              const totalMax = workMax + examMax;
                              return (
                                <React.Fragment key={`max-${sbj.id}`}>
                                  <th style={{ padding: '1px 0' }}>{workMax}</th>
                                  <th style={{ padding: '1px 0' }}>{examMax}</th>
                                  <th style={{ padding: '1px 0', background: '#cbd5e1' }}>{totalMax}</th>
                                </React.Fragment>
                              );
                            })}

                            {/* Overall Total Max */}
                            <th style={{ padding: '1px 0', background: '#cbd5e1', color: '#0369a1', fontSize: '9px' }}>
                              {overallAddedMax}
                            </th>

                            {nonAddedSubjects.map(sbj => {
                              const isActivity = sbj.evaluation_method === 'pass_fail_only';
                              if (isActivity) {
                                return (
                                  <th key={`max-act-${sbj.id}`} style={{ padding: '1px 0', fontSize: '8px' }}>نشاط</th>
                                );
                              }
                              const workMax = isTerm2 ? (sbj.term2_work_mark || 40) : (sbj.term1_work_mark || 40);
                              const examMax = isTerm2 ? (sbj.term2_exam_mark || 60) : (sbj.term1_exam_mark || 60);
                              const totalMax = workMax + examMax;
                              return (
                                <React.Fragment key={`max-non-${sbj.id}`}>
                                  <th style={{ padding: '1px 0' }}>{workMax}</th>
                                  <th style={{ padding: '1px 0' }}>{examMax}</th>
                                  <th style={{ padding: '1px 0', background: '#cbd5e1' }}>{totalMax}</th>
                                </React.Fragment>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {chunkStudents.map((st, sIdx) => {
                            const globalIdx = pageIdx * perPage + sIdx + 1;
                            let studentAddedTotal = 0;
                            let hasAbsentInAdded = false;

                            const addedCells = addedSubjects.map(sbj => {
                              const cell = controlMarksMap[st.control_student_id]?.[sbj.id];
                              const wVal = cell?.work_marks !== undefined && cell?.work_marks !== null && cell?.work_marks !== '' ? Number(cell.work_marks) : null;
                              const eVal = cell?.written_marks !== undefined && cell?.written_marks !== null && cell?.written_marks !== '' ? Number(cell.written_marks) : null;
                              
                              let totalVal = null;
                              if (cell?.is_absent) {
                                hasAbsentInAdded = true;
                              } else if (wVal !== null || eVal !== null) {
                                totalVal = (wVal || 0) + (eVal || 0);
                                studentAddedTotal += totalVal;
                              }

                              return { sbj, cell, wVal, eVal, totalVal };
                            });

                            const nonAddedCells = nonAddedSubjects.map(sbj => {
                              const isActivity = sbj.evaluation_method === 'pass_fail_only';
                              const cell = controlMarksMap[st.control_student_id]?.[sbj.id];
                              if (isActivity) {
                                const actRes = cell?.pass_fail_result || cell?.mark || (cell?.is_absent ? 'غائب' : '-');
                                return { sbj, isActivity, actRes };
                              }
                              const wVal = cell?.work_marks !== undefined && cell?.work_marks !== null && cell?.work_marks !== '' ? Number(cell.work_marks) : null;
                              const eVal = cell?.written_marks !== undefined && cell?.written_marks !== null && cell?.written_marks !== '' ? Number(cell.written_marks) : null;
                              const totalVal = (wVal !== null || eVal !== null) ? (wVal || 0) + (eVal || 0) : null;
                              return { sbj, isActivity, cell, wVal, eVal, totalVal };
                            });

                            const attendancePct = st.attendance_rate || st.attendance_percentage || '98%';

                            return (
                              <tr key={st.control_student_id || sIdx} style={{ height: '24px' }}>
                                <td style={{ padding: '2px 1px' }}>{globalIdx}</td>
                                <td style={{ padding: '2px 1px', fontWeight: 900, color: '#0369a1' }}>{st.seat_number || '-'}</td>
                                <td style={{ padding: '2px 6px', textAlign: 'right', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.full_name_ar}</td>

                                {/* Added Subjects Marks */}
                                {addedCells.map(({ sbj, cell, wVal, eVal, totalVal }) => (
                                  <React.Fragment key={sbj.id}>
                                    <td style={{ padding: '2px 1px' }}>
                                      {cell?.is_absent ? <span style={{ color: '#dc2626', fontWeight: 900 }}>غ</span> : cell?.is_exempt ? <span style={{ color: '#d97706' }}>م</span> : wVal !== null ? wVal : '-'}
                                    </td>
                                    <td style={{ padding: '2px 1px' }}>
                                      {cell?.is_absent ? <span style={{ color: '#dc2626', fontWeight: 900 }}>غ</span> : cell?.is_exempt ? <span style={{ color: '#d97706' }}>م</span> : eVal !== null ? eVal : '-'}
                                    </td>
                                    <td style={{ padding: '2px 1px', fontWeight: 900, background: '#f8fafc', color: totalVal !== null ? '#0f172a' : '#94a3b8' }}>
                                      {cell?.is_absent ? <span style={{ color: '#dc2626' }}>غائب</span> : totalVal !== null ? totalVal : '-'}
                                    </td>
                                  </React.Fragment>
                                ))}

                                {/* Overall Total Mark */}
                                <td style={{ padding: '2px 1px', fontWeight: 900, color: '#047857', background: '#f0fdf4' }}>
                                  {studentAddedTotal > 0 ? studentAddedTotal.toFixed(1).replace(/\.0$/, '') : (hasAbsentInAdded ? 'غياب' : '-')}
                                </td>

                                {/* Non Added Subjects Marks */}
                                {nonAddedCells.map(c => {
                                  if (c.isActivity) {
                                    return (
                                      <td key={c.sbj.id} style={{ padding: '2px 1px', fontSize: '9.5px', fontWeight: 800 }}>
                                        {c.actRes === 'اجتاز' ? <span style={{ color: '#15803d' }}>اجتاز</span> : c.actRes === 'لم يجتز' ? <span style={{ color: '#dc2626' }}>لم يجتز</span> : c.actRes}
                                      </td>
                                    );
                                  }
                                  return (
                                    <React.Fragment key={c.sbj.id}>
                                      <td style={{ padding: '2px 1px' }}>
                                        {c.cell?.is_absent ? <span style={{ color: '#dc2626' }}>غ</span> : c.wVal !== null ? c.wVal : '-'}
                                      </td>
                                      <td style={{ padding: '2px 1px' }}>
                                        {c.cell?.is_absent ? <span style={{ color: '#dc2626' }}>غ</span> : c.eVal !== null ? c.eVal : '-'}
                                      </td>
                                      <td style={{ padding: '2px 1px', fontWeight: 900, background: '#f8fafc' }}>
                                        {c.cell?.is_absent ? <span style={{ color: '#dc2626' }}>غائب</span> : c.totalVal !== null ? c.totalVal : '-'}
                                      </td>
                                    </React.Fragment>
                                  );
                                })}

                                {/* Attendance Pct */}
                                <td style={{ padding: '2px 1px', fontWeight: 800, fontSize: '10px' }}>
                                  {attendancePct}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      <div style={{ marginTop: '12px' }}>
                        <MinisterialPrintFooter />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 9.4.2 كشف تقييم ونتائج الطلاب (النموذج الوزاري بسطرين: درجات + تقديرات لفظية + الرقم القومي) */}
            {(selectedDoc === 'term1_evaluation_sheet' || selectedDoc === 'term2_evaluation_sheet') && (
              <div>
                {pageChunks.map((chunkStudents, pageIdx) => {
                  const isTerm2 = selectedDoc === 'term2_evaluation_sheet';
                  const classLabel = selectedClassFilter !== 'all' ? (availableClasses.find(c => c.value === selectedClassFilter)?.label || `فصل ${selectedClassFilter}`) : 'كافة الفصول';
                  
                  const addedSubjects = subjects.filter(s => s.is_added_to_total && s.evaluation_method !== 'pass_fail_only');
                  const nonAddedSubjects = subjects.filter(s => !s.is_added_to_total || s.evaluation_method === 'pass_fail_only');
                  
                  const overallAddedMax = addedSubjects.reduce((acc, sbj) => {
                    const wMax = isTerm2 ? (sbj.term2_work_mark || 40) : (sbj.term1_work_mark || 40);
                    const eMax = isTerm2 ? (sbj.term2_exam_mark || 60) : (sbj.term1_exam_mark || 60);
                    return acc + wMax + eMax;
                  }, 0) || 500;

                  return (
                    <div
                      key={pageIdx}
                      className="printable-page-block"
                      style={{
                        pageBreakAfter: pageIdx < pageChunks.length - 1 ? 'always' : 'auto',
                        marginBottom: pageIdx < pageChunks.length - 1 ? '24px' : '0',
                        paddingBottom: pageIdx < pageChunks.length - 1 ? '16px' : '0',
                        borderBottom: pageIdx < pageChunks.length - 1 ? '2px dashed #cbd5e1' : 'none'
                      }}
                    >
                      <MinisterialPrintHeader
                        schoolInfo={effectiveSchoolInfo}
                        documentTitle={`كشف تقييم ونتائج الطلاب (الفصل الدراسي ${isTerm2 ? 'الثاني' : 'الأول'})`}
                        gradeName={gradeName}
                        subTitle={`الفصل: ${classLabel} (كشف الدرجات والتقديرات بالرقم القومي) ${pageChunks.length > 1 ? `| صفحة ${pageIdx + 1} من ${pageChunks.length}` : ''}`}
                        docCode={`NP-CTL-EVAL-T${isTerm2 ? '2' : '1'}`}
                        academicYear={academicYear}
                      />

                      <table style={{
                        width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: `${fontSizePt}pt`,
                        fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif", textAlign: 'center', borderColor: '#000'
                      }} border="1">
                        <thead>
                          {/* Row 1: Vertical Subjects Header with Sage/Olive Ministerial Background */}
                          <tr style={{ background: '#e2ebd8', fontWeight: 900, color: '#000' }}>
                            <th rowSpan={2} style={{ padding: '3px 1px', width: '28px', verticalAlign: 'middle' }}>م</th>
                            <th rowSpan={2} style={{ padding: '3px 1px', width: '56px', verticalAlign: 'middle' }}>رقم الجلوس</th>
                            <th rowSpan={2} style={{ padding: '3px 6px', textAlign: 'right', width: '175px', verticalAlign: 'middle' }}>اسم الطالب رباعياً</th>

                            {/* Added Subjects (Single column per subject with vertical downward text) */}
                            {addedSubjects.map(sbj => (
                              <th key={sbj.id} style={{
                                padding: '3px 1px',
                                width: '42px',
                                height: '85px',
                                verticalAlign: 'middle',
                                textAlign: 'center',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  writingMode: 'vertical-rl',
                                  textOrientation: 'mixed',
                                  transform: 'none',
                                  whiteSpace: 'nowrap',
                                  fontSize: '10.5px',
                                  fontWeight: 900,
                                  margin: '0 auto',
                                  lineHeight: 1.15
                                }}>
                                  {getShortSubjectName(sbj.subject_name_ar)}
                                </div>
                              </th>
                            ))}

                            {/* Overall Total Header */}
                            <th style={{
                              padding: '3px 1px',
                              width: '46px',
                              height: '85px',
                              verticalAlign: 'middle',
                              textAlign: 'center',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                writingMode: 'vertical-rl',
                                textOrientation: 'mixed',
                                transform: 'none',
                                whiteSpace: 'nowrap',
                                fontSize: '11px',
                                fontWeight: 900,
                                margin: '0 auto',
                                lineHeight: 1.15
                              }}>
                                المجموع
                              </div>
                            </th>

                            {/* Non-added Subjects */}
                            {nonAddedSubjects.map(sbj => (
                              <th key={sbj.id} style={{
                                padding: '3px 1px',
                                width: '42px',
                                height: '85px',
                                verticalAlign: 'middle',
                                textAlign: 'center',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  writingMode: 'vertical-rl',
                                  textOrientation: 'mixed',
                                  transform: 'none',
                                  whiteSpace: 'nowrap',
                                  fontSize: '10.5px',
                                  fontWeight: 900,
                                  margin: '0 auto',
                                  lineHeight: 1.15
                                }}>
                                  {getShortSubjectName(sbj.subject_name_ar)}
                                </div>
                              </th>
                            ))}

                            {/* Attendance Rate */}
                            <th rowSpan={2} style={{
                              padding: '3px 1px',
                              width: '32px',
                              verticalAlign: 'middle',
                              textAlign: 'center',
                              background: '#e2ebd8'
                            }}>
                              <div style={{
                                writingMode: 'vertical-rl',
                                textOrientation: 'mixed',
                                transform: 'none',
                                whiteSpace: 'nowrap',
                                fontSize: '10.5px',
                                fontWeight: 900,
                                margin: '0 auto',
                                lineHeight: 1.15
                              }}>
                                نسبة الحضور
                              </div>
                            </th>
                          </tr>

                          {/* Row 2: Max Marks Row */}
                          <tr style={{ background: '#e2ebd8', fontWeight: 900, fontSize: '10.5px', color: '#000' }}>
                            {addedSubjects.map(sbj => {
                              const workMax = isTerm2 ? (sbj.term2_work_mark || 40) : (sbj.term1_work_mark || 40);
                              const examMax = isTerm2 ? (sbj.term2_exam_mark || 60) : (sbj.term1_exam_mark || 60);
                              return (
                                <th key={`max-${sbj.id}`} style={{ padding: '2px 0', height: '22px', verticalAlign: 'middle' }}>
                                  {workMax + examMax}
                                </th>
                              );
                            })}

                            {/* Overall Max */}
                            <th style={{ padding: '2px 0', height: '22px', verticalAlign: 'middle' }}>
                              {overallAddedMax}
                            </th>

                            {nonAddedSubjects.map(sbj => {
                              const isActivity = sbj.evaluation_method === 'pass_fail_only';
                              if (isActivity) {
                                return (
                                  <th key={`max-non-${sbj.id}`} style={{ padding: '2px 0', height: '22px', verticalAlign: 'middle', fontSize: '10px' }}>
                                    نشاط
                                  </th>
                                );
                              }
                              const workMax = isTerm2 ? (sbj.term2_work_mark || 40) : (sbj.term1_work_mark || 40);
                              const examMax = isTerm2 ? (sbj.term2_exam_mark || 60) : (sbj.term1_exam_mark || 60);
                              return (
                                <th key={`max-non-${sbj.id}`} style={{ padding: '2px 0', height: '22px', verticalAlign: 'middle' }}>
                                  {workMax + examMax}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {chunkStudents.map((st, sIdx) => {
                            const globalIdx = pageIdx * perPage + sIdx + 1;
                            let studentAddedTotal = 0;
                            let hasAbsentInAdded = false;

                            const addedCells = addedSubjects.map(sbj => {
                              const cell = controlMarksMap[st.control_student_id]?.[sbj.id];
                              const wVal = cell?.work_marks !== undefined && cell?.work_marks !== null && cell?.work_marks !== '' ? Number(cell.work_marks) : null;
                              const eVal = cell?.written_marks !== undefined && cell?.written_marks !== null && cell?.written_marks !== '' ? Number(cell.written_marks) : null;
                              
                              let totalVal = null;
                              if (cell?.is_absent) {
                                hasAbsentInAdded = true;
                              } else if (wVal !== null || eVal !== null) {
                                totalVal = (wVal || 0) + (eVal || 0);
                                studentAddedTotal += totalVal;
                              }

                              const sbjMax = (isTerm2 ? (sbj.term2_work_mark || 40) : (sbj.term1_work_mark || 40)) + (isTerm2 ? (sbj.term2_exam_mark || 60) : (sbj.term1_exam_mark || 60));
                              const rating = cell?.is_absent ? 'غائب' : getGradeRating(totalVal, sbjMax);

                              return { sbj, cell, totalVal, rating };
                            });

                            const nonAddedCells = nonAddedSubjects.map(sbj => {
                              const isActivity = sbj.evaluation_method === 'pass_fail_only';
                              const cell = controlMarksMap[st.control_student_id]?.[sbj.id];
                              if (isActivity) {
                                const actRes = cell?.pass_fail_result || cell?.mark || (cell?.is_absent ? 'غائب' : '-');
                                return { sbj, isActivity, actRes, totalVal: actRes, rating: actRes };
                              }
                              const wVal = cell?.work_marks !== undefined && cell?.work_marks !== null && cell?.work_marks !== '' ? Number(cell.work_marks) : null;
                              const eVal = cell?.written_marks !== undefined && cell?.written_marks !== null && cell?.written_marks !== '' ? Number(cell.written_marks) : null;
                              const totalVal = (wVal !== null || eVal !== null) ? (wVal || 0) + (eVal || 0) : null;
                              const sbjMax = (isTerm2 ? (sbj.term2_work_mark || 40) : (sbj.term1_work_mark || 40)) + (isTerm2 ? (sbj.term2_exam_mark || 60) : (sbj.term1_exam_mark || 60));
                              const rating = cell?.is_absent ? 'غائب' : getGradeRating(totalVal, sbjMax);
                              return { sbj, isActivity, cell, totalVal, rating };
                            });

                            const attendancePct = st.attendance_rate || st.attendance_percentage || '98%';
                            const overallRating = getGradeRating(studentAddedTotal, overallAddedMax);

                            return (
                              <React.Fragment key={st.control_student_id || sIdx}>
                                {/* Sub-row 1: Numeric Scores */}
                                <tr style={{ height: '22px' }}>
                                  <td rowSpan={2} style={{ padding: '2px 1px', fontWeight: 900, verticalAlign: 'middle' }}>{globalIdx}</td>
                                  <td rowSpan={2} style={{ padding: '2px 1px', fontWeight: 900, color: '#0369a1', verticalAlign: 'middle' }}>{st.seat_number || '-'}</td>
                                  <td rowSpan={2} style={{ padding: '4px 8px', textAlign: 'right', verticalAlign: 'middle' }}>
                                    <div style={{ fontWeight: 900, fontSize: '11px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {st.full_name_ar}
                                    </div>
                                    {st.national_id && (
                                        <div style={{ fontSize: '9.5px', color: '#475569', fontWeight: 700, marginTop: '2px', direction: 'ltr', textAlign: 'right' }}>
                                          ({st.national_id})
                                        </div>
                                    )}
                                  </td>

                                  {/* Added Subjects Scores */}
                                  {addedCells.map(({ sbj, cell, totalVal }) => {
                                    const isLang2 = sbj.subject_name_ar.includes('ثانية') || sbj.subject_code === 'HL_LANG2';
                                    const langInfo = isLang2 ? getSecondLangInfo(st.second_language) : null;
                                    return (
                                      <td key={`sc-${sbj.id}`} style={{ padding: '2px 1px', fontWeight: 900, fontSize: '11px' }}>
                                        {cell?.is_absent ? (
                                          <span style={{ color: '#dc2626' }}>غائب</span>
                                        ) : totalVal !== null ? (
                                          <span>
                                            {totalVal}
                                            {langInfo && (
                                              <span style={{ fontSize: '8px', color: langInfo.badgeColor, fontWeight: 900, marginRight: '2px' }}>
                                                ({langInfo.code})
                                              </span>
                                            )}
                                          </span>
                                        ) : '-'}
                                      </td>
                                    );
                                  })}

                                  {/* Overall Total Score */}
                                  <td style={{ padding: '2px 1px', fontWeight: 900, fontSize: '11px', color: '#047857', background: '#f8fafc' }}>
                                    {studentAddedTotal > 0 ? studentAddedTotal.toFixed(1).replace(/\.0$/, '') : (hasAbsentInAdded ? 'غياب' : '-')}
                                  </td>

                                  {/* Non Added Subjects Scores */}
                                  {nonAddedCells.map(c => {
                                    if (c.isActivity) {
                                      return (
                                        <td key={`sc-non-${c.sbj.id}`} rowSpan={2} style={{ padding: '2px 1px', fontWeight: 900, fontSize: '10.5px', verticalAlign: 'middle' }}>
                                          {c.cell?.is_absent ? <span style={{ color: '#dc2626' }}>غائب</span> : c.actRes === 'اجتاز' ? <span style={{ color: '#15803d' }}>اجتاز</span> : c.actRes === 'لم يجتز' ? <span style={{ color: '#dc2626' }}>لم يجتز</span> : (c.actRes || '-')}
                                        </td>
                                      );
                                    }
                                    const isLang2 = c.sbj.subject_name_ar.includes('ثانية') || c.sbj.subject_code === 'HL_LANG2';
                                    const langInfo = isLang2 ? getSecondLangInfo(st.second_language) : null;
                                    return (
                                      <td key={`sc-non-${c.sbj.id}`} style={{ padding: '2px 1px', fontWeight: 900, fontSize: '11px' }}>
                                        {c.cell?.is_absent ? (
                                          <span style={{ color: '#dc2626' }}>غائب</span>
                                        ) : c.totalVal !== null ? (
                                          <span>
                                            {c.totalVal}
                                            {langInfo && (
                                              <span style={{ fontSize: '8px', color: langInfo.badgeColor, fontWeight: 900, marginRight: '2px' }}>
                                                ({langInfo.code})
                                              </span>
                                            )}
                                          </span>
                                        ) : '-'}
                                      </td>
                                    );
                                  })}

                                  {/* Attendance Rate */}
                                  <td rowSpan={2} style={{ padding: '2px 1px', fontWeight: 800, fontSize: '10.5px', verticalAlign: 'middle' }}>
                                    {attendancePct}
                                  </td>
                                </tr>

                                {/* Sub-row 2: Verbal Ratings / Evaluation (التقديرات اللفظية) */}
                                <tr style={{ height: '20px', background: '#fcfdfa', fontSize: '9.5px' }}>
                                  {addedCells.map(({ sbj, rating }) => (
                                    <td key={`rt-${sbj.id}`} style={{ padding: '1px 0', fontWeight: 800, color: rating === 'دون المستوى' || rating === 'غائب' ? '#dc2626' : '#1e293b' }}>
                                      {rating}
                                    </td>
                                  ))}

                                  {/* Overall Rating */}
                                  <td style={{ padding: '1px 0', fontWeight: 900, color: '#15803d', background: '#f8fafc' }}>
                                    {hasAbsentInAdded ? 'غياب' : overallRating}
                                  </td>

                                  {/* Non Added Ratings (Only for graded non-added subjects) */}
                                  {nonAddedCells.map(c => {
                                    if (c.isActivity) return null;
                                    return (
                                      <td key={`rt-non-${c.sbj.id}`} style={{ padding: '1px 0', fontWeight: 800, color: c.rating === 'دون المستوى' || c.rating === 'غائب' ? '#dc2626' : '#1e293b' }}>
                                        {c.rating}
                                      </td>
                                    );
                                  })}
                                </tr>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>

                      <div style={{ marginTop: '12px' }}>
                        <MinisterialPrintFooter />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 9.5 كشف الطلاب الأوائل والمتفوقين (الفصل الأول) */}
            {selectedDoc === 'term1_top_students' && (() => {
              const filteredStudents = selectedClassFilter === 'all' 
                ? students 
                : students.filter(st => String(st.class_number || st.classroom_name || st.class_name_ar) === String(selectedClassFilter));

              const addedSubjects = subjects.filter(s => s.is_added_to_total && s.evaluation_method !== 'pass_fail_only');
              const religionSubject = subjects.find(s => s.subject_name_ar?.includes('دين') || s.subject_name_ar?.includes('إسلام') || s.subject_name_ar?.includes('مسيح'));

              const overallAddedMax = addedSubjects.reduce((acc, sbj) => {
                const wMax = sbj.term1_work_mark || 40;
                const eMax = sbj.term1_exam_mark || 60;
                return acc + wMax + eMax;
              }, 0) || 280;

              const getDecision151Procedure = (pct, rating) => {
                const p = Number(pct) || 0;
                if (rating === 'ممتاز' || p >= 85) return 'أنشطة إثرائية';
                if (rating === 'جيد جداً' || rating === 'جيد جدا' || (p >= 75 && p < 85)) return 'رعاية وتحفيز';
                if (rating === 'جيد' || (p >= 65 && p < 75)) return 'رفع كفاءة';
                if (rating === 'مقبول' || (p >= 50 && p < 65)) return 'رفع مستوى';
                return 'أنشطة علاجية';
              };

              const arabicOrdinals = [
                '', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
                'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون',
                'الحادي والعشرون', 'الثاني والعشرون', 'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون', 'السادس والعشرون', 'السابع والعشرون', 'الثامن والعشرون', 'التاسع والعشرون', 'الثلاثون'
              ];

              const getStudentMeta = (st) => {
                let totalScore = 0;
                const subjectMarks = {};
                addedSubjects.forEach(sbj => {
                  const cell = controlMarksMap[st.control_student_id]?.[sbj.id];
                  const wVal = cell?.work_marks !== undefined && cell?.work_marks !== null && cell?.work_marks !== '' ? Number(cell.work_marks) : null;
                  const eVal = cell?.written_marks !== undefined && cell?.written_marks !== null && cell?.written_marks !== '' ? Number(cell.written_marks) : null;
                  let val = 0;
                  if (wVal !== null || eVal !== null) {
                    val = (wVal || 0) + (eVal || 0);
                  } else if (cell?.total_marks !== undefined && cell?.total_marks !== null && cell?.total_marks !== '') {
                    val = Number(cell.total_marks);
                  } else if (cell?.mark !== undefined && cell?.mark !== null && cell?.mark !== '') {
                    val = Number(cell.mark);
                  }
                  subjectMarks[sbj.id] = cell?.is_absent ? 'غائب' : val;
                  if (!cell?.is_absent) totalScore += val;
                });

                let religionScore = 0;
                if (religionSubject) {
                  const rCell = controlMarksMap[st.control_student_id]?.[religionSubject.id];
                  const rW = rCell?.work_marks !== undefined && rCell?.work_marks !== null && rCell?.work_marks !== '' ? Number(rCell.work_marks) : null;
                  const rE = rCell?.written_marks !== undefined && rCell?.written_marks !== null && rCell?.written_marks !== '' ? Number(rCell.written_marks) : null;
                  if (rW !== null || rE !== null) {
                    religionScore = (rW || 0) + (rE || 0);
                  } else if (rCell?.total_marks !== undefined && rCell?.total_marks !== null && rCell?.total_marks !== '') {
                    religionScore = Number(rCell.total_marks);
                  } else if (rCell?.mark !== undefined && rCell?.mark !== null && rCell?.mark !== '') {
                    religionScore = Number(rCell.mark);
                  }
                }

                let birthTimestamp = 0;
                if (st.birth_date) {
                  birthTimestamp = new Date(st.birth_date).getTime() || 0;
                } else if (st.national_id && st.national_id.length === 14) {
                  const century = st.national_id[0] === '3' ? '20' : '19';
                  const yy = st.national_id.substring(1, 3);
                  const mm = st.national_id.substring(3, 5);
                  const dd = st.national_id.substring(5, 7);
                  birthTimestamp = new Date(`${century}${yy}-${mm}-${dd}`).getTime() || 0;
                }

                const pct = overallAddedMax > 0 ? (totalScore / overallAddedMax) * 100 : 0;
                const rating = getGradeRating(totalScore, overallAddedMax);
                const procedure = getDecision151Procedure(pct, rating);

                return { totalScore, religionScore, birthTimestamp, subjectMarks, pct, rating, procedure };
              };

              // Sort by: 1. Total Score (الأكبر في المجموع) -> 2. Younger age (الأصغر سناً = تاريخ أحدث) -> 3. Religion score (الأكبر في التربية الدينية)
              const sortedTopList = filteredStudents.map(st => ({
                student: st,
                meta: getStudentMeta(st)
              })).filter(item => item.meta.totalScore > 0).sort((a, b) => {
                if (b.meta.totalScore !== a.meta.totalScore) return b.meta.totalScore - a.meta.totalScore;
                if (b.meta.birthTimestamp !== a.meta.birthTimestamp) return b.meta.birthTimestamp - a.meta.birthTimestamp;
                if (b.meta.religionScore !== a.meta.religionScore) return b.meta.religionScore - a.meta.religionScore;
                return 0;
              });

              // Assign Ordinal Rank (الأول، الثاني، الثاني مكرر، الرابع...)
              let currentBaseRank = 1;
              for (let i = 0; i < sortedTopList.length; i++) {
                const item = sortedTopList[i];
                const isTiedWithPrevious = i > 0 && 
                  item.meta.totalScore === sortedTopList[i - 1].meta.totalScore &&
                  item.meta.birthTimestamp === sortedTopList[i - 1].meta.birthTimestamp &&
                  item.meta.religionScore === sortedTopList[i - 1].meta.religionScore;

                if (isTiedWithPrevious) {
                  const baseName = arabicOrdinals[currentBaseRank] || `المركز (${currentBaseRank})`;
                  item.rankText = `${baseName} مكرر`;
                  item.rankNum = currentBaseRank;
                } else {
                  currentBaseRank = i + 1;
                  const baseName = arabicOrdinals[currentBaseRank] || `المركز (${currentBaseRank})`;
                  item.rankText = baseName;
                  item.rankNum = currentBaseRank;
                }

                if (item.rankNum === 1) item.badgeIcon = '🏆';
                else if (item.rankNum === 2) item.badgeIcon = '🥈';
                else if (item.rankNum === 3) item.badgeIcon = '🥉';
                else item.badgeIcon = '';
              }

              const topPerPage = 15;
              const topChunks = [];
              for (let i = 0; i < sortedTopList.length; i += topPerPage) {
                topChunks.push(sortedTopList.slice(i, i + topPerPage));
              }

              if (topChunks.length === 0) {
                return <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>لا توجد درجات مرصودة لعرض كشف الأوائل.</div>;
              }

              return (
                <div>
                  {topChunks.map((chunk, pageIdx) => (
                    <div
                      key={pageIdx}
                      className="printable-page-block"
                      style={{
                        pageBreakAfter: pageIdx < topChunks.length - 1 ? 'always' : 'auto',
                        marginBottom: pageIdx < topChunks.length - 1 ? '24px' : '0',
                        paddingBottom: pageIdx < topChunks.length - 1 ? '16px' : '0',
                        borderBottom: pageIdx < topChunks.length - 1 ? '2px dashed #cbd5e1' : 'none'
                      }}
                    >
                      <MinisterialPrintHeader
                        schoolInfo={effectiveSchoolInfo}
                        documentTitle="لوحة شرف الطلاب الأوائل والمتفوقين (الفصل الدراسي الأول)"
                        gradeName={gradeName}
                        subTitle={`كشف ترتيب الطلاب الأوائل بالمواد الأساسية الخمسة وفق معايير المفاضلة (المجموع - السن - التربية الدينية) ${topChunks.length > 1 ? `| صفحة ${pageIdx + 1} من ${topChunks.length}` : ''}`}
                        docCode="NP-CTL-TOP-T1"
                        academicYear={academicYear}
                      />

                      <table style={{
                        width: '100%', borderCollapse: 'collapse', fontSize: `${fontSizePt}pt`,
                        fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif", textAlign: 'center'
                      }} border="1">
                        <thead>
                          <tr style={{ background: '#fef08a', fontWeight: 900, color: '#1e1b4b' }}>
                            <th style={{ padding: '6px 3px', width: '85px' }}>الترتيب</th>
                            <th style={{ padding: '6px 3px', width: '65px' }}>رقم الجلوس</th>
                            <th style={{ padding: '6px 4px', textAlign: 'right', minWidth: '160px' }}>اسم الطالب رباعياً</th>
                            <th style={{ padding: '6px 3px', width: '60px' }}>الفصل</th>
                            {addedSubjects.map(sbj => (
                              <th key={sbj.id} style={{ padding: '6px 2px', minWidth: '55px', fontSize: '11px', background: '#fef9c3' }}>
                                {getShortSubjectName(sbj.subject_name_ar)}
                              </th>
                            ))}
                            <th style={{ padding: '6px 3px', width: '75px', background: '#dcfce7', color: '#166534' }}>المجموع ({overallAddedMax})</th>
                            <th style={{ padding: '6px 3px', width: '60px' }}>النسبة</th>
                            <th style={{ padding: '6px 3px', width: '75px' }}>التقدير</th>
                            <th style={{ padding: '6px 4px', width: '95px', background: '#e0f2fe', color: '#0369a1' }}>الإجراء (القرار 151)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chunk.map(({ student: st, meta, rankText, badgeIcon }, sIdx) => {
                            return (
                              <tr key={st.control_student_id || sIdx} style={{ height: '28px', background: sIdx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                <td style={{ padding: '4px', fontWeight: 900, color: '#1e1b4b' }}>
                                  {rankText} {badgeIcon}
                                </td>
                                <td style={{ padding: '4px', fontWeight: 900, color: '#0369a1' }}>{st.seat_number || '-'}</td>
                                <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 800 }}>{st.full_name_ar}</td>
                                <td style={{ padding: '4px' }}>{st.class_name_ar || (st.class_number > 0 ? `فصل ${st.class_number}` : '-')}</td>
                                {addedSubjects.map(sbj => {
                                  const markVal = meta.subjectMarks[sbj.id];
                                  return (
                                    <td key={sbj.id} style={{ padding: '4px 2px', fontWeight: 800 }}>
                                      {typeof markVal === 'number' ? markVal.toFixed(1).replace(/\.0$/, '') : (markVal || '-')}
                                    </td>
                                  );
                                })}
                                <td style={{ padding: '4px', fontWeight: 900, color: '#047857', background: '#f0fdf4' }}>
                                  {meta.totalScore.toFixed(1).replace(/\.0$/, '')}
                                </td>
                                <td style={{ padding: '4px', fontWeight: 800 }}>{meta.pct.toFixed(1)}%</td>
                                <td style={{ padding: '4px', fontWeight: 800, color: '#15803d' }}>{meta.rating}</td>
                                <td style={{ padding: '4px', fontWeight: 800, color: '#0369a1', background: '#f0f9ff', fontSize: '11px' }}>
                                  {meta.procedure}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      <div style={{ marginTop: '12px' }}>
                        <MinisterialPrintFooter />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* 9.6 كشف الطلاب دون المستوى والراسبين (الفصل الأول) */}
            {selectedDoc === 'term1_failing_students' && (() => {
              const filteredStudents = selectedClassFilter === 'all' 
                ? students 
                : students.filter(st => String(st.class_number || st.classroom_name || st.class_name_ar) === String(selectedClassFilter));

              const addedSubjects = subjects.filter(s => s.is_added_to_total && s.evaluation_method !== 'pass_fail_only');

              const failingList = filteredStudents.map(st => {
                let studentTotal = 0;
                const failedSubjs = [];
                addedSubjects.forEach(sbj => {
                  const cell = controlMarksMap[st.control_student_id]?.[sbj.id];
                  const wVal = cell?.work_marks !== undefined && cell?.work_marks !== null && cell?.work_marks !== '' ? Number(cell.work_marks) : null;
                  const eVal = cell?.written_marks !== undefined && cell?.written_marks !== null && cell?.written_marks !== '' ? Number(cell.written_marks) : null;
                  const wMax = sbj.term1_work_mark || 40;
                  const eMax = sbj.term1_exam_mark || 60;
                  const totMax = wMax + eMax;
                  const totMin = Math.round(totMax * 0.5);
                  let val = 0;
                  if (wVal !== null || eVal !== null) {
                    val = (wVal || 0) + (eVal || 0);
                  } else if (cell?.total_marks !== undefined && cell?.total_marks !== null && cell?.total_marks !== '') {
                    val = Number(cell.total_marks);
                  } else if (cell?.mark !== undefined && cell?.mark !== null && cell?.mark !== '') {
                    val = Number(cell.mark);
                  }
                  if (cell?.is_absent) {
                    failedSubjs.push(`${getShortSubjectName(sbj.subject_name_ar)} (غائب)`);
                  } else if (val < totMin) {
                    failedSubjs.push(`${getShortSubjectName(sbj.subject_name_ar)} (${val}/${totMax})`);
                  }
                  if (!cell?.is_absent) studentTotal += val;
                });

                return {
                  student: st,
                  studentTotal,
                  failedSubjs,
                  isFailing: failedSubjs.length > 0
                };
              }).filter(item => item.isFailing);

              const failPerPage = 16;
              const failChunks = [];
              for (let i = 0; i < failingList.length; i += failPerPage) {
                failChunks.push(failingList.slice(i, i + failPerPage));
              }

              if (failChunks.length === 0) {
                return <div style={{ textAlign: 'center', padding: '30px', color: '#15803d', fontWeight: 800 }}>✅ ممتاز: لا يوجد طلاب دون المستوى أو بحاجة لبرامج علاجية في هذا الصف.</div>;
              }

              return (
                <div>
                  {failChunks.map((chunk, pageIdx) => (
                    <div
                      key={pageIdx}
                      className="printable-page-block"
                      style={{
                        pageBreakAfter: pageIdx < failChunks.length - 1 ? 'always' : 'auto',
                        marginBottom: pageIdx < failChunks.length - 1 ? '24px' : '0',
                        paddingBottom: pageIdx < failChunks.length - 1 ? '16px' : '0',
                        borderBottom: pageIdx < failChunks.length - 1 ? '2px dashed #cbd5e1' : 'none'
                      }}
                    >
                      <MinisterialPrintHeader
                        schoolInfo={effectiveSchoolInfo}
                        documentTitle="كشف الطلاب دون المستوى والراسبين للرعاية والمتابعة (الفصل الأول)"
                        gradeName={gradeName}
                        subTitle={`حصر الطلاب الذين لم يحققوا درجات النجاح وبحاجة لبرامج علاجية وفق القرار 151 ${failChunks.length > 1 ? `| صفحة ${pageIdx + 1} من ${failChunks.length}` : ''}`}
                        docCode="NP-CTL-FAIL-T1"
                        academicYear={academicYear}
                      />

                      <table style={{
                        width: '100%', borderCollapse: 'collapse', fontSize: `${fontSizePt}pt`,
                        fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif", textAlign: 'center'
                      }} border="1">
                        <thead>
                          <tr style={{ background: '#fee2e2', fontWeight: 900, color: '#991b1b' }}>
                            <th style={{ padding: '5px', width: '35px' }}>م</th>
                            <th style={{ padding: '5px', width: '75px' }}>رقم الجلوس</th>
                            <th style={{ padding: '5px', textAlign: 'right', minWidth: '170px' }}>اسم الطالب رباعياً</th>
                            <th style={{ padding: '5px', width: '70px' }}>الفصل</th>
                            <th style={{ padding: '5px', width: '80px' }}>المجموع الكلي</th>
                            <th style={{ padding: '5px', minWidth: '160px' }}>المواد دون المستوى (غير المجتازة)</th>
                            <th style={{ padding: '5px', width: '130px', background: '#fef2f2' }}>الإجراء وتوصيات الرعاية</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chunk.map(({ student: st, studentTotal, failedSubjs }, sIdx) => {
                            const globalIdx = pageIdx * failPerPage + sIdx + 1;
                            return (
                              <tr key={st.control_student_id || sIdx} style={{ height: '28px' }}>
                                <td style={{ padding: '4px' }}>{globalIdx}</td>
                                <td style={{ padding: '4px', fontWeight: 900, color: '#0369a1' }}>{st.seat_number || '-'}</td>
                                <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 800 }}>{st.full_name_ar}</td>
                                <td style={{ padding: '4px' }}>{st.class_name_ar || (st.class_number > 0 ? `فصل ${st.class_number}` : '-')}</td>
                                <td style={{ padding: '4px', fontWeight: 900, color: '#dc2626' }}>
                                  {studentTotal > 0 ? studentTotal.toFixed(1).replace(/\.0$/, '') : '-'}
                                </td>
                                <td style={{ padding: '4px', fontWeight: 700, color: '#b91c1c' }}>
                                  {failedSubjs.join(' ، ')}
                                </td>
                                <td style={{ padding: '4px', fontSize: '11px', fontWeight: 800, color: '#991b1b', background: '#fef2f2' }}>
                                  أنشطة علاجية وخطة تحسين المستوى
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      <div style={{ marginTop: '12px' }}>
                        <MinisterialPrintFooter />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* 9.7 التقرير والتحليل الإحصائي العام للنتيجة ونسب النجاح بالمواد (وفق القرار 151) */}
            {(selectedDoc === 'term1_statistical_analysis' || selectedDoc === 'statistical_report') && (() => {
              const isTerm1 = selectedDoc === 'term1_statistical_analysis' || phase === 'term1';
              const termNum = isTerm1 ? 1 : 2;

              const filteredStudents = selectedClassFilter === 'all' 
                ? students 
                : students.filter(st => String(st.class_number || st.classroom_name || st.class_name_ar) === String(selectedClassFilter));

              const addedSubjects = subjects.filter(s => s.is_added_to_total && s.evaluation_method !== 'pass_fail_only');
              const nonAddedSubjects = subjects.filter(s => !s.is_added_to_total || s.evaluation_method === 'pass_fail_only');
              const allGradedSubjects = subjects.filter(s => s.evaluation_method !== 'pass_fail_only');

              const overallAddedMax = addedSubjects.reduce((acc, sbj) => {
                const wMax = isTerm1 ? (sbj.term1_work_mark || 40) : (sbj.term2_work_mark || 40);
                const eMax = isTerm1 ? (sbj.term1_exam_mark || 60) : (sbj.term2_exam_mark || 60);
                return acc + wMax + eMax;
              }, 0) || 280;

              const boys = filteredStudents.filter(st => st.gender === 'ذكر' || st.gender === 'بنين' || st.gender === 'boy');
              const girls = filteredStudents.filter(st => st.gender === 'أنثى' || st.gender === 'بنات' || st.gender === 'girl');

              // Student level calculation
              const studentMetaMap = {};
              filteredStudents.forEach(st => {
                let totScore = 0;
                let absentSubjectsCount = 0;
                let failedSubjectsCount = 0;
                const totalGradedCount = addedSubjects.length;

                addedSubjects.forEach(sbj => {
                  const cell = controlMarksMap[st.control_student_id]?.[sbj.id];
                  const isSbjAbsent = Boolean(
                    cell?.is_absent === 1 || 
                    cell?.is_absent === true || 
                    cell?.attendance_status === 'absent' || 
                    cell?.written_marks === 'غ' || 
                    cell?.work_marks === 'غ' || 
                    cell?.mark === 'غ' ||
                    cell?.total_marks === 'غ'
                  );

                  const wVal = cell?.work_marks !== undefined && cell?.work_marks !== null && cell?.work_marks !== '' && !isNaN(cell.work_marks) ? Number(cell.work_marks) : 0;
                  const eVal = cell?.written_marks !== undefined && cell?.written_marks !== null && cell?.written_marks !== '' && !isNaN(cell.written_marks) ? Number(cell.written_marks) : 0;
                  const wMax = isTerm1 ? (sbj.term1_work_mark || 40) : (sbj.term2_work_mark || 40);
                  const eMax = isTerm1 ? (sbj.term1_exam_mark || 60) : (sbj.term2_exam_mark || 60);
                  const totMax = wMax + eMax;
                  const totMin = Math.round(totMax * 0.5);

                  if (isSbjAbsent) {
                    absentSubjectsCount++;
                    failedSubjectsCount++;
                  } else {
                    let val = 0;
                    if (cell?.work_marks !== undefined || cell?.written_marks !== undefined) {
                      val = (wVal || 0) + (eVal || 0);
                    } else if (cell?.total_marks !== undefined && cell?.total_marks !== null && cell?.total_marks !== '' && !isNaN(cell.total_marks)) {
                      val = Number(cell.total_marks);
                    } else if (cell?.mark !== undefined && cell?.mark !== null && cell?.mark !== '' && !isNaN(cell.mark)) {
                      val = Number(cell.mark);
                    }
                    totScore += val;
                    if (val < totMin) failedSubjectsCount++;
                  }
                });

                // A student is considered totally absent ONLY if explicitly marked absent in all subjects
                const isAbsentAll = totalGradedCount > 0 && absentSubjectsCount === totalGradedCount;
                const isPassedAll = !isAbsentAll && failedSubjectsCount === 0 && totScore >= Math.round(overallAddedMax * 0.5);
                const pct = overallAddedMax > 0 ? (totScore / overallAddedMax) * 100 : 0;
                const rating = getGradeRating(totScore, overallAddedMax);

                studentMetaMap[st.control_student_id] = {
                  totScore,
                  isAbsentAll,
                  failedSubjectsCount,
                  isPassedAll,
                  pct,
                  rating
                };
              });

              const getGroupStats = (groupStudents) => {
                const enrolled = groupStudents.length;
                const absent = groupStudents.filter(st => studentMetaMap[st.control_student_id]?.isAbsentAll).length;
                const present = enrolled - absent;
                const attendancePct = enrolled > 0 ? ((present / enrolled) * 100).toFixed(1) : '0.0';
                const passed = groupStudents.filter(st => studentMetaMap[st.control_student_id]?.isPassedAll).length;
                const failed = present - passed;
                const passEnrolledPct = enrolled > 0 ? ((passed / enrolled) * 100).toFixed(1) : '0.0';
                const passPresentPct = present > 0 ? ((passed / present) * 100).toFixed(1) : '0.0';
                return { enrolled, present, absent, attendancePct, passed, failed, passEnrolledPct, passPresentPct };
              };

              const totalStats = getGroupStats(filteredStudents);
              const boysStats = getGroupStats(boys);
              const girlsStats = getGroupStats(girls);

              // Subject Statistics (Split Second Language subjects into distinct rows per language if applicable)
              const subjectStatsList = allGradedSubjects.flatMap(sbj => {
                const wMax = isTerm1 ? (sbj.term1_work_mark || 40) : (sbj.term2_work_mark || 40);
                const eMax = isTerm1 ? (sbj.term1_exam_mark || 60) : (sbj.term2_exam_mark || 60);
                const totMax = wMax + eMax;
                const totMin = Math.round(totMax * 0.5);

                const isSecondLang = sbj.subject_name_ar.includes('ثانية') || sbj.subject_code === 'HL_LANG2';
                const distinctLangs = isSecondLang
                  ? Array.from(new Set(filteredStudents.map(st => getSecondLangInfo(st.second_language)?.code).filter(Boolean)))
                  : [];

                const groupsToProcess = (isSecondLang && distinctLangs.length > 1)
                  ? distinctLangs.map(code => {
                      const lInfo = getSecondLangInfo(code);
                      return {
                        title: `اللغة الأجنبية الثانية (${lInfo?.label || code} - ${code})`,
                        studentsList: filteredStudents.filter(st => getSecondLangInfo(st.second_language)?.code === code)
                      };
                    })
                  : [{ title: sbj.subject_name_ar, studentsList: filteredStudents }];

                return groupsToProcess.map(grp => {
                  let enrolled = grp.studentsList.length;
                  let absent = 0;
                  let present = 0;
                  let passed = 0;
                  let failed = 0;

                  let countExcellent = 0; // ممتاز 85%+
                  let countVeryGood = 0;  // جيد جدا 75% - 84.9%
                  let countGood = 0;      // جيد 65% - 74.9%
                  let countPass = 0;      // مقبول 50% - 64.9%
                  let countBelow = 0;     // دون المستوى < 50%

                  grp.studentsList.forEach(st => {
                    const cell = controlMarksMap[st.control_student_id]?.[sbj.id];
                    const isSbjAbsent = Boolean(
                      cell?.is_absent === 1 || 
                      cell?.is_absent === true || 
                      cell?.attendance_status === 'absent' || 
                      cell?.written_marks === 'غ' || 
                      cell?.work_marks === 'غ' || 
                      cell?.mark === 'غ' ||
                      cell?.total_marks === 'غ'
                    );

                    if (isSbjAbsent) {
                      absent++;
                    } else {
                      present++;
                      const wVal = cell?.work_marks !== undefined && cell?.work_marks !== null && cell?.work_marks !== '' && !isNaN(cell.work_marks) ? Number(cell.work_marks) : 0;
                      const eVal = cell?.written_marks !== undefined && cell?.written_marks !== null && cell?.written_marks !== '' && !isNaN(cell.written_marks) ? Number(cell.written_marks) : 0;
                      
                      let val = 0;
                      if (cell?.work_marks !== undefined || cell?.written_marks !== undefined) {
                        val = (wVal || 0) + (eVal || 0);
                      } else if (cell?.total_marks !== undefined && cell?.total_marks !== null && cell?.total_marks !== '' && !isNaN(cell.total_marks)) {
                        val = Number(cell.total_marks);
                      } else if (cell?.mark !== undefined && cell?.mark !== null && cell?.mark !== '') {
                        val = Number(cell.mark);
                      }

                      const p = totMax > 0 ? (val / totMax) * 100 : 0;
                      if (p >= 85) countExcellent++;
                      else if (p >= 75) countVeryGood++;
                      else if (p >= 65) countGood++;
                      else if (p >= 50) countPass++;
                      else countBelow++;

                      if (val >= totMin) passed++;
                      else failed++;
                    }
                  });

                  const passPct = present > 0 ? ((passed / present) * 100).toFixed(1) : '0.0';
                  return {
                    sbj,
                    customTitle: grp.title,
                    totMax,
                    totMin,
                    enrolled,
                    present,
                    absent,
                    passed,
                    failed,
                    passPct,
                    countExcellent,
                    countVeryGood,
                    countGood,
                    countPass,
                    countBelow,
                    pctExcellent: present > 0 ? ((countExcellent / present) * 100).toFixed(1) : '0.0',
                    pctVeryGood: present > 0 ? ((countVeryGood / present) * 100).toFixed(1) : '0.0',
                    pctGood: present > 0 ? ((countGood / present) * 100).toFixed(1) : '0.0',
                    pctPass: present > 0 ? ((countPass / present) * 100).toFixed(1) : '0.0',
                    pctBelow: present > 0 ? ((countBelow / present) * 100).toFixed(1) : '0.0'
                  };
                });
              });

              // Ranges Distribution
              const ranges = [
                { label: 'من 95% إلى 100% (فائق التميز)', min: 95, max: 100, badge: 'أزرق 🔵', action: 'أنشطة إثرائية فائقة' },
                { label: 'من 85% إلى أقل من 95% (ممتاز)', min: 85, max: 94.99, badge: 'أزرق 🔵', action: 'أنشطة إثرائية' },
                { label: 'من 75% إلى أقل من 85% (جيد جداً)', min: 75, max: 84.99, badge: 'أخضر 🟢', action: 'رعاية وتحفيز' },
                { label: 'من 65% إلى أقل من 75% (جيد)', min: 65, max: 74.99, badge: 'أخضر 🟢', action: 'رفع كفاءة' },
                { label: 'من 50% إلى أقل من 65% (مقبول)', min: 50, max: 64.99, badge: 'أصفر 🟡', action: 'رفع مستوى' },
                { label: 'أقل من 50% (دون المستوى)', min: 0, max: 49.99, badge: 'أحمر 🔴', action: 'أنشطة علاجية وخطة تحسين' }
              ];

              const rangeStats = ranges.map(r => {
                const matchBoys = boys.filter(st => {
                  const meta = studentMetaMap[st.control_student_id];
                  return meta && !meta.isAbsentAll && meta.pct >= r.min && meta.pct <= r.max;
                }).length;

                const matchGirls = girls.filter(st => {
                  const meta = studentMetaMap[st.control_student_id];
                  return meta && !meta.isAbsentAll && meta.pct >= r.min && meta.pct <= r.max;
                }).length;

                const totalMatch = matchBoys + matchGirls;
                const pctOfPresent = totalStats.present > 0 ? ((totalMatch / totalStats.present) * 100).toFixed(1) : '0.0';

                return { ...r, matchBoys, matchGirls, totalMatch, pctOfPresent };
              });

              // Class by class comparison
              const uniqueClassNames = Array.from(new Set(students.map(st => st.class_name_ar || (st.class_number > 0 ? `فصل ${st.class_number}` : 'عام'))));
              const classStatsList = uniqueClassNames.map(clsName => {
                const cStudents = students.filter(st => (st.class_name_ar || (st.class_number > 0 ? `فصل ${st.class_number}` : 'عام')) === clsName);
                const stats = getGroupStats(cStudents);
                const scores = cStudents.map(st => studentMetaMap[st.control_student_id]?.totScore || 0);
                const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
                const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0.0';
                return { clsName, ...stats, maxScore, avgScore };
              });

              return (
                <div style={{ direction: 'rtl', fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif" }}>
                  {/* ══════════════════════════════════════════════════════════ */}
                  {/* 📄 الورقة الأولى: أولاً (الإحصاء العام) وثانياً (تحليل المواد) 📄 */}
                  {/* ══════════════════════════════════════════════════════════ */}
                  <div className="printable-page-block" style={{ marginBottom: '24px' }}>
                    <MinisterialPrintHeader
                      schoolInfo={effectiveSchoolInfo}
                      documentTitle={isTerm1 ? 'التقرير والتحليل الإحصائي العام للنتيجة ونسب النجاح (الفصل الأول)' : 'التقرير والتحليل الإحصائي العام للنتيجة ونسب النجاح (نهاية العام)'}
                      gradeName={gradeName}
                      subTitle="أولاً: جدول الإحصاء العام للطلاب والحضور والنجاح — ثانياً: التحليل الإحصائي التفصيلي لدرجات المواد وتوزيع التقديرات (وفق القرار 151)"
                      docCode={isTerm1 ? 'NP-CTL-STAT-T1-P1' : 'NP-CTL-STAT-T2-P1'}
                      academicYear={academicYear}
                    />

                    {/* ═══ 1. جدول الإحصاء العام للطلاب والحضور ونسب النجاح ═══ */}
                    <div style={{ marginBottom: '26px' }}>
                      <div style={{ fontWeight: 900, fontSize: '13.5px', color: '#1e1b4b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📊</span>
                        <span>أولاً: جدول الإحصاء العام للطلاب والحضور ونسب النجاح الإجمالية:</span>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'center' }} border="1">
                        <thead>
                          <tr style={{ background: '#e2e8f0', fontWeight: 900, color: '#1e293b' }}>
                            <th style={{ padding: '7px' }}>البيان</th>
                            <th style={{ padding: '7px' }}>المقيد</th>
                            <th style={{ padding: '7px' }}>الحاضر</th>
                            <th style={{ padding: '7px' }}>الغائب</th>
                            <th style={{ padding: '7px' }}>نسبة الحضور %</th>
                            <th style={{ padding: '7px', background: '#dcfce7', color: '#166534' }}>الناجح / المجتاز</th>
                            <th style={{ padding: '7px', background: '#fee2e2', color: '#991b1b' }}>
                              {isTerm1 ? 'دون المستوى' : 'له دور ثانٍ / دون المستوى'}
                            </th>
                            <th style={{ padding: '7px', background: '#fef3c7', color: '#92400e' }}>نسبة النجاح للحاضر %</th>
                            <th style={{ padding: '7px' }}>نسبة النجاح للمقيد %</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ padding: '6px', fontWeight: 900, background: '#f8fafc' }}>بنين (ذكور)</td>
                            <td style={{ padding: '6px', fontWeight: 800 }}>{boysStats.enrolled}</td>
                            <td style={{ padding: '6px', fontWeight: 800 }}>{boysStats.present}</td>
                            <td style={{ padding: '6px', color: boysStats.absent > 0 ? '#dc2626' : '#000' }}>{boysStats.absent}</td>
                            <td style={{ padding: '6px' }}>{boysStats.attendancePct}%</td>
                            <td style={{ padding: '6px', fontWeight: 900, color: '#15803d' }}>{boysStats.passed}</td>
                            <td style={{ padding: '6px', fontWeight: 900, color: '#dc2626' }}>{boysStats.failed}</td>
                            <td style={{ padding: '6px', fontWeight: 900, color: '#b45309' }}>{boysStats.passPresentPct}%</td>
                            <td style={{ padding: '6px' }}>{boysStats.passEnrolledPct}%</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '6px', fontWeight: 900, background: '#f8fafc' }}>بنات (إناث)</td>
                            <td style={{ padding: '6px', fontWeight: 800 }}>{girlsStats.enrolled}</td>
                            <td style={{ padding: '6px', fontWeight: 800 }}>{girlsStats.present}</td>
                            <td style={{ padding: '6px', color: girlsStats.absent > 0 ? '#dc2626' : '#000' }}>{girlsStats.absent}</td>
                            <td style={{ padding: '6px' }}>{girlsStats.attendancePct}%</td>
                            <td style={{ padding: '6px', fontWeight: 900, color: '#15803d' }}>{girlsStats.passed}</td>
                            <td style={{ padding: '6px', fontWeight: 900, color: '#dc2626' }}>{girlsStats.failed}</td>
                            <td style={{ padding: '6px', fontWeight: 900, color: '#b45309' }}>{girlsStats.passPresentPct}%</td>
                            <td style={{ padding: '6px' }}>{girlsStats.passEnrolledPct}%</td>
                          </tr>
                          <tr style={{ background: '#f1f5f9', fontWeight: 900 }}>
                            <td style={{ padding: '8px', fontWeight: 900, color: '#0f172a' }}>الجملة العامة (الإجمالي)</td>
                            <td style={{ padding: '8px', fontWeight: 900, color: '#0369a1' }}>{totalStats.enrolled}</td>
                            <td style={{ padding: '8px', fontWeight: 900 }}>{totalStats.present}</td>
                            <td style={{ padding: '8px', fontWeight: 900, color: totalStats.absent > 0 ? '#dc2626' : '#000' }}>{totalStats.absent}</td>
                            <td style={{ padding: '8px', fontWeight: 900 }}>{totalStats.attendancePct}%</td>
                            <td style={{ padding: '8px', fontWeight: 900, color: '#15803d', background: '#dcfce7' }}>{totalStats.passed}</td>
                            <td style={{ padding: '8px', fontWeight: 900, color: '#dc2626', background: '#fee2e2' }}>{totalStats.failed}</td>
                            <td style={{ padding: '8px', fontWeight: 900, color: '#b45309', background: '#fef3c7', fontSize: '13px' }}>{totalStats.passPresentPct}%</td>
                            <td style={{ padding: '8px', fontWeight: 900 }}>{totalStats.passEnrolledPct}%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* ═══ 2. جدول التحليل الإحصائي المفصل للمواد وتوزيع التقديرات وفق القرار 151 ═══ */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ fontWeight: 900, fontSize: '13.5px', color: '#1e1b4b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📈</span>
                        <span>ثانياً: جدول التحليل الإحصائي التفصيلي لدرجات المواد وتوزيع التقديرات (وفق القرار الوزاري 151):</span>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center' }} border="1">
                        <thead>
                          <tr style={{ background: '#f8fafc', fontWeight: 900 }}>
                            <th rowSpan="2" style={{ padding: '5px', width: '30px' }}>م</th>
                            <th rowSpan="2" style={{ padding: '5px', minWidth: '130px', textAlign: 'right' }}>المادة الدراسية</th>
                            <th rowSpan="2" style={{ padding: '5px', width: '50px' }}>العظمى</th>
                            <th rowSpan="2" style={{ padding: '5px', width: '50px' }}>الصغرى</th>
                            <th rowSpan="2" style={{ padding: '5px', width: '50px' }}>المقيد</th>
                            <th rowSpan="2" style={{ padding: '5px', width: '50px' }}>الحاضر</th>
                            <th rowSpan="2" style={{ padding: '5px', width: '50px' }}>الغائب</th>
                            <th colSpan="5" style={{ padding: '5px', background: '#fef9c3', color: '#854d0e' }}>توزيع التقديرات والفئات الوصفية (القرار 151)</th>
                            <th rowSpan="2" style={{ padding: '5px', width: '60px', background: '#dcfce7', color: '#166534' }}>الناجحون</th>
                            <th rowSpan="2" style={{ padding: '5px', width: '70px', background: '#dbeafe', color: '#1e40af' }}>نسبة النجاح %</th>
                          </tr>
                          <tr style={{ background: '#fefce8', fontSize: '10px', fontWeight: 800 }}>
                            <th style={{ padding: '3px', background: '#eff6ff', color: '#1d4ed8' }}>ممتاز (85%+)</th>
                            <th style={{ padding: '3px', background: '#f0fdf4', color: '#15803d' }}>جيد جداً (75%)</th>
                            <th style={{ padding: '3px', background: '#f0fdf4', color: '#166534' }}>جيد (65%)</th>
                            <th style={{ padding: '3px', background: '#fffbeb', color: '#b45309' }}>مقبول (50%)</th>
                            <th style={{ padding: '3px', background: '#fef2f2', color: '#b91c1c' }}>دون المستوى</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjectStatsList.map((stat, sIdx) => (
                            <tr key={stat.sbj.id} style={{ height: '26px', background: sIdx % 2 === 0 ? '#fff' : '#fafafa' }}>
                              <td style={{ padding: '3px' }}>{sIdx + 1}</td>
                              <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 800 }}>{stat.customTitle || stat.sbj.subject_name_ar}</td>
                              <td style={{ padding: '3px' }}>{stat.totMax}</td>
                              <td style={{ padding: '3px' }}>{stat.totMin}</td>
                              <td style={{ padding: '3px' }}>{stat.enrolled}</td>
                              <td style={{ padding: '3px', fontWeight: 800 }}>{stat.present}</td>
                              <td style={{ padding: '3px', color: stat.absent > 0 ? '#dc2626' : '#000' }}>{stat.absent}</td>
                              <td style={{ padding: '3px', color: '#1d4ed8' }}>{stat.countExcellent} ({stat.pctExcellent}%)</td>
                              <td style={{ padding: '3px', color: '#15803d' }}>{stat.countVeryGood} ({stat.pctVeryGood}%)</td>
                              <td style={{ padding: '3px', color: '#166534' }}>{stat.countGood} ({stat.pctGood}%)</td>
                              <td style={{ padding: '3px', color: '#b45309' }}>{stat.countPass} ({stat.pctPass}%)</td>
                              <td style={{ padding: '3px', color: stat.countBelow > 0 ? '#dc2626' : '#000', fontWeight: stat.countBelow > 0 ? 800 : 400 }}>
                                {stat.countBelow} ({stat.pctBelow}%)
                              </td>
                              <td style={{ padding: '3px', fontWeight: 900, color: '#15803d', background: '#f0fdf4' }}>{stat.passed}</td>
                              <td style={{ padding: '3px', fontWeight: 900, color: '#1e40af', background: '#eff6ff', fontSize: '11.5px' }}>{stat.passPct}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ marginTop: '20px' }}>
                      <MinisterialPrintFooter />
                    </div>
                  </div>

                  {/* ══════════════════════════════════════════════════════════ */}
                  {/* 📄 الورقة الثانية: ثالثاً (الشرائح) ورابعاً (مقارنة الفصول) 📄 */}
                  {/* ══════════════════════════════════════════════════════════ */}
                  <div className="printable-page-block" style={{ pageBreakBefore: 'always', marginTop: '30px' }}>
                    <MinisterialPrintHeader
                      schoolInfo={effectiveSchoolInfo}
                      documentTitle={isTerm1 ? 'التقرير والتحليل الإحصائي العام للنتيجة ونسب النجاح (الفصل الأول)' : 'التقرير والتحليل الإحصائي العام للنتيجة ونسب النجاح (نهاية العام)'}
                      gradeName={gradeName}
                      subTitle="ثالثاً: جدول التوزيع التكراري للشرائح المئوية لمجموع الطلاب — رابعاً: المقارنة الإحصائية ونسب النجاح بين فصول الصف"
                      docCode={isTerm1 ? 'NP-CTL-STAT-T1-P2' : 'NP-CTL-STAT-T2-P2'}
                      academicYear={academicYear}
                    />

                    {/* ═══ 3. جدول التوزيع التكراري للشرائح والنسب المئوية لمجموع الدرجات ═══ */}
                    <div style={{ marginBottom: '26px' }}>
                      <div style={{ fontWeight: 900, fontSize: '13.5px', color: '#1e1b4b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🎯</span>
                        <span>ثالثاً: جدول التوزيع التكراري للشرائح المئوية لمجموع الطلاب العام:</span>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'center' }} border="1">
                        <thead>
                          <tr style={{ background: '#f1f5f9', fontWeight: 900 }}>
                            <th style={{ padding: '6px', textAlign: 'right', minWidth: '180px' }}>الشريحة والنسبة المئوية</th>
                            <th style={{ padding: '6px', width: '100px' }}>اللون المعتمد</th>
                            <th style={{ padding: '6px', width: '60px' }}>بنين</th>
                            <th style={{ padding: '6px', width: '60px' }}>بنات</th>
                            <th style={{ padding: '6px', width: '70px', background: '#e2e8f0' }}>الجملة</th>
                            <th style={{ padding: '6px', width: '90px' }}>النسبة % للحاضرين</th>
                            <th style={{ padding: '6px', minWidth: '160px', textAlign: 'right' }}>الإجراء المعتمد (القرار 151)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rangeStats.map((r, rIdx) => (
                            <tr key={rIdx} style={{ height: '28px' }}>
                              <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800 }}>{r.label}</td>
                              <td style={{ padding: '5px', fontWeight: 700 }}>{r.badge}</td>
                              <td style={{ padding: '5px' }}>{r.matchBoys}</td>
                              <td style={{ padding: '5px' }}>{r.matchGirls}</td>
                              <td style={{ padding: '5px', fontWeight: 900, background: '#f8fafc' }}>{r.totalMatch}</td>
                              <td style={{ padding: '5px', fontWeight: 900, color: '#0369a1' }}>{r.pctOfPresent}%</td>
                              <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800, color: rIdx >= 4 ? '#b91c1c' : '#15803d' }}>
                                {r.action}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* ═══ 4. جدول المقارنة الإحصائية بين فصول الصف ═══ */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ fontWeight: 900, fontSize: '13.5px', color: '#1e1b4b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🏫</span>
                        <span>رابعاً: المقارنة الإحصائية ونسب النجاح بين فصول الصف:</span>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'center' }} border="1">
                        <thead>
                          <tr style={{ background: '#f8fafc', fontWeight: 900 }}>
                            <th style={{ padding: '6px' }}>الفصل</th>
                            <th style={{ padding: '6px' }}>المقيد</th>
                            <th style={{ padding: '6px' }}>الحاضر</th>
                            <th style={{ padding: '6px' }}>الغائب</th>
                            <th style={{ padding: '6px', background: '#dcfce7', color: '#166534' }}>الناجح / المجتاز</th>
                            <th style={{ padding: '6px', background: '#fee2e2', color: '#991b1b' }}>
                              {isTerm1 ? 'دون المستوى' : 'له دور ثانٍ / دون المستوى'}
                            </th>
                            <th style={{ padding: '6px', background: '#eff6ff', color: '#1e40af' }}>نسبة النجاح %</th>
                            <th style={{ padding: '6px' }}>أعلى مجموع</th>
                            <th style={{ padding: '6px' }}>متوسط درجات الفصل</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classStatsList.map((cls, cIdx) => (
                            <tr key={cIdx} style={{ height: '26px' }}>
                              <td style={{ padding: '5px', fontWeight: 800 }}>{cls.clsName}</td>
                              <td style={{ padding: '5px' }}>{cls.enrolled}</td>
                              <td style={{ padding: '5px', fontWeight: 700 }}>{cls.present}</td>
                              <td style={{ padding: '5px', color: cls.absent > 0 ? '#dc2626' : '#000' }}>{cls.absent}</td>
                              <td style={{ padding: '5px', fontWeight: 800, color: '#15803d' }}>{cls.passed}</td>
                              <td style={{ padding: '5px', color: cls.failed > 0 ? '#dc2626' : '#000' }}>{cls.failed}</td>
                              <td style={{ padding: '5px', fontWeight: 900, color: '#1e40af', background: '#eff6ff' }}>{cls.passPresentPct}%</td>
                              <td style={{ padding: '5px', fontWeight: 800, color: '#047857' }}>{cls.maxScore.toFixed(1).replace(/\.0$/, '')}</td>
                              <td style={{ padding: '5px', fontWeight: 800 }}>{cls.avgScore}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ marginTop: '20px' }}>
                      <MinisterialPrintFooter />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 5. كشاف الأرقام السرية المعتمد */}
            {(selectedDoc === 'term1_secret_master' || selectedDoc === 'term2_secret_master') && secretSummary && (
              <div>
                <div style={{ textAlign: 'center', margin: '0 0 14px 0', fontWeight: 900, color: '#b91c1c' }}>
                  🔒 وثيقة سرية للغاية — تسلم حصراً لرئيس لجنة النظام والمراقبة
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'center' }} border="1">
                  <thead>
                    <tr style={{ background: '#f1f5f9', fontWeight: 900 }}>
                      <th style={{ padding: '6px' }}>م</th>
                      <th style={{ padding: '6px' }}>المجموعة</th>
                      <th style={{ padding: '6px' }}>رقم الجلوس</th>
                      <th style={{ padding: '6px' }}>الرقم السري</th>
                      <th style={{ padding: '6px', textAlign: 'right', minWidth: '180px' }}>اسم الطالب رباعياً</th>
                      <th style={{ padding: '6px' }}>اللجنة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(secretSummary.students || []).map((st, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '5px' }}>{idx + 1}</td>
                        <td style={{ padding: '5px', fontWeight: 800 }}>{st.group_label}</td>
                        <td style={{ padding: '5px' }}>{st.seat_number || '-'}</td>
                        <td style={{ padding: '5px', fontWeight: 900, color: '#1e1b4b' }}>{st.secret_code || '-'}</td>
                        <td style={{ padding: '5px', textAlign: 'right', fontWeight: 800 }}>{st.full_name_ar}</td>
                        <td style={{ padding: '5px' }}>{st.committee_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 6. الشيت العام والرئيسي للنتائج المجمعة (12 د) */}
            {selectedDoc === 'master_broadsheet_12d' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center' }} border="1">
                  <thead>
                    <tr style={{ background: '#f1f5f9', fontWeight: 900 }}>
                      <th style={{ padding: '5px' }}>م</th>
                      <th style={{ padding: '5px' }}>رقم الجلوس</th>
                      <th style={{ padding: '5px', textAlign: 'right', minWidth: '140px' }}>اسم الطالب</th>
                      <th style={{ padding: '5px' }}>مجموع ت1</th>
                      <th style={{ padding: '5px' }}>مجموع ت2</th>
                      <th style={{ padding: '5px' }}>المتوسط السنوي</th>
                      <th style={{ padding: '5px' }}>النسبة</th>
                      <th style={{ padding: '5px' }}>التقدير اللفظي</th>
                      <th style={{ padding: '5px' }}>شرط الـ 30%</th>
                      <th style={{ padding: '5px' }}>حالة الطالب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportResults?.students || previewStudents).map((st, idx) => (
                      <tr key={st.control_student_id || idx}>
                        <td style={{ padding: '4px' }}>{idx + 1}</td>
                        <td style={{ padding: '4px', fontWeight: 800 }}>{st.seat_number || '-'}</td>
                        <td style={{ padding: '4px', textAlign: 'right', fontWeight: 800 }}>{st.full_name_ar}</td>
                        <td style={{ padding: '4px' }}>{st.term1_total_score ?? '-'}</td>
                        <td style={{ padding: '4px' }}>{st.term2_total_score ?? '-'}</td>
                        <td style={{ padding: '4px', fontWeight: 900 }}>{st.final_score ?? '-'}</td>
                        <td style={{ padding: '4px' }}>{st.percentage !== null && st.percentage !== undefined ? `${st.percentage.toFixed(1)}%` : '-'}</td>
                        <td style={{ padding: '4px', fontWeight: 800 }}>{st.final_rating || st.term1_rating || '-'}</td>
                        <td style={{ padding: '4px' }}>{st.min_term2_exam_met === 0 ? 'غير مستوفٍ' : 'مستوفٍ'}</td>
                        <td style={{ padding: '4px', fontWeight: 800 }}>{st.status_final === 'بحاجة_لدور_ثان' ? 'دور ثانٍ' : 'ناجح ومنقول'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 7. إخطارات النجاح وشهادات وبطاقات تقييم درجات الطلاب (وفق القرار 151) */}
            {(selectedDoc === 'student_report_cards' || selectedDoc === 'term1_report_cards') && (() => {
              const isTerm1 = selectedDoc === 'term1_report_cards';
              const filteredStudents = selectedClassFilter === 'all' 
                ? students 
                : students.filter(st => String(st.class_number || st.classroom_name || st.class_name_ar) === String(selectedClassFilter));

              const addedSubjects = subjects.filter(s => s.is_added_to_total && s.evaluation_method !== 'pass_fail_only');
              const nonAddedSubjects = subjects.filter(s => !s.is_added_to_total || s.evaluation_method === 'pass_fail_only');

              const overallAddedMax = addedSubjects.reduce((acc, sbj) => {
                const wMax = isTerm1 ? (sbj.term1_work_mark || 40) : (sbj.term2_work_mark || 40);
                const eMax = isTerm1 ? (sbj.term1_exam_mark || 60) : (sbj.term2_exam_mark || 60);
                return acc + wMax + eMax;
              }, 0) || 280;

              const religionSubject = subjects.find(s => s.subject_name_ar?.includes('دين') || s.subject_name_ar?.includes('إسلام') || s.subject_name_ar?.includes('مسيح'));

              const getDecision151Procedure = (pct, rating, failedSubjs = []) => {
                const p = Number(pct) || 0;
                if (rating === 'ممتاز' || p >= 85) return 'أنشطة إثرائية';
                if (rating === 'جيد جداً' || rating === 'جيد جدا' || (p >= 75 && p < 85)) return 'رعاية وتحفيز';
                if (rating === 'جيد' || (p >= 65 && p < 75)) return 'رفع كفاءة';
                if (rating === 'مقبول' || (p >= 50 && p < 65)) return 'رفع مستوى';
                if (failedSubjs.length > 0) {
                  return `أنشطة علاجية في مادة (${failedSubjs.map(s => getShortSubjectName(s.subject_name_ar)).join('، ')})`;
                }
                return 'أنشطة علاجية';
              };

              const arabicOrdinals = [
                '', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
                'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون',
                'الحادي والعشرون', 'الثاني والعشرون', 'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون', 'السادس والعشرون', 'السابع والعشرون', 'الثامن والعشرون', 'التاسع والعشرون', 'الثلاثون',
                'الحادي والثلاثون', 'الثاني والثلاثون', 'الثالث والثلاثون', 'الرابع والثلاثون', 'الخامس والثلاثون', 'السادس والثلاثون', 'السابع والثلاثون', 'الثامن والثلاثون', 'التاسع والثلاثون', 'الأربعون',
                'الحادي والأربعون', 'الثاني والأربعون', 'الثالث والأربعون', 'الرابع والأربعون', 'الخامس والأربعون', 'السادس والأربعون', 'السابع والأربعون', 'الثامن والأربعون', 'التاسع والأربعون', 'الخمسون',
                'الحادي والخمسون', 'الثاني والخمسون', 'الثالث والخمسون', 'الرابع والخمسون', 'الخامس والخمسون', 'السادس والخمسون', 'السابع والخمسون', 'الثامن والخمسون', 'التاسع والخمسون', 'الستون',
                'الحادي والستون', 'الثاني والستون', 'الثالث والستون', 'الرابع والستون', 'الخامس والستون', 'السادس والستون', 'السابع والستون', 'الثامن والستون', 'التاسع والستون', 'السبعون',
                'الحادي والسبعون', 'الثاني والسبعون', 'الثالث والسبعون', 'الرابع والسبعون', 'الخامس والسبعون', 'السادس والسبعون', 'السابع والسبعون', 'الثامن والسبعون', 'التاسع والسبعون', 'الثمانون'
              ];

              const getArabicRank = (rankNum, isDuplicate = false) => {
                if (!rankNum || rankNum <= 0) return '-';
                const base = arabicOrdinals[rankNum] || `المركز (${rankNum})`;
                return isDuplicate ? `${base} مكرر` : base;
              };

              const getStudentMetaForRank = (st) => {
                let totalScore = 0;
                addedSubjects.forEach(sbj => {
                  const cell = controlMarksMap[st.control_student_id]?.[sbj.id];
                  const wVal = cell?.work_marks !== undefined && cell?.work_marks !== null && cell?.work_marks !== '' ? Number(cell.work_marks) : null;
                  const eVal = cell?.written_marks !== undefined && cell?.written_marks !== null && cell?.written_marks !== '' ? Number(cell.written_marks) : null;
                  let val = 0;
                  if (wVal !== null || eVal !== null) {
                    val = (wVal || 0) + (eVal || 0);
                  } else if (cell?.total_marks !== undefined && cell?.total_marks !== null && cell?.total_marks !== '') {
                    val = Number(cell.total_marks);
                  } else if (cell?.mark !== undefined && cell?.mark !== null && cell?.mark !== '') {
                    val = Number(cell.mark);
                  }
                  if (!cell?.is_absent) totalScore += val;
                });

                let religionScore = 0;
                if (religionSubject) {
                  const rCell = controlMarksMap[st.control_student_id]?.[religionSubject.id];
                  const rW = rCell?.work_marks !== undefined && rCell?.work_marks !== null && rCell?.work_marks !== '' ? Number(rCell.work_marks) : null;
                  const rE = rCell?.written_marks !== undefined && rCell?.written_marks !== null && rCell?.written_marks !== '' ? Number(rCell.written_marks) : null;
                  if (rW !== null || rE !== null) {
                    religionScore = (rW || 0) + (rE || 0);
                  } else if (rCell?.total_marks !== undefined && rCell?.total_marks !== null && rCell?.total_marks !== '') {
                    religionScore = Number(rCell.total_marks);
                  } else if (rCell?.mark !== undefined && rCell?.mark !== null && rCell?.mark !== '') {
                    religionScore = Number(rCell.mark);
                  }
                }

                let birthTimestamp = 0;
                if (st.birth_date) {
                  birthTimestamp = new Date(st.birth_date).getTime() || 0;
                } else if (st.national_id && st.national_id.length === 14) {
                  const century = st.national_id[0] === '3' ? '20' : '19';
                  const yy = st.national_id.substring(1, 3);
                  const mm = st.national_id.substring(3, 5);
                  const dd = st.national_id.substring(5, 7);
                  birthTimestamp = new Date(`${century}${yy}-${mm}-${dd}`).getTime() || 0;
                }

                return { totalScore, religionScore, birthTimestamp };
              };

              const sortedForCertRank = filteredStudents.map(st => ({
                stId: st.control_student_id,
                meta: getStudentMetaForRank(st)
              })).sort((a, b) => {
                if (b.meta.totalScore !== a.meta.totalScore) return b.meta.totalScore - a.meta.totalScore;
                if (b.meta.birthTimestamp !== a.meta.birthTimestamp) return b.meta.birthTimestamp - a.meta.birthTimestamp;
                if (b.meta.religionScore !== a.meta.religionScore) return b.meta.religionScore - a.meta.religionScore;
                return 0;
              });

              const studentRankMap = {};
              let currentBaseCertRank = 1;
              for (let i = 0; i < sortedForCertRank.length; i++) {
                const item = sortedForCertRank[i];
                const isTiedWithPrevious = i > 0 && 
                  item.meta.totalScore === sortedForCertRank[i - 1].meta.totalScore &&
                  item.meta.birthTimestamp === sortedForCertRank[i - 1].meta.birthTimestamp &&
                  item.meta.religionScore === sortedForCertRank[i - 1].meta.religionScore;

                if (isTiedWithPrevious) {
                  const baseName = arabicOrdinals[currentBaseCertRank] || `المركز (${currentBaseCertRank})`;
                  studentRankMap[item.stId] = item.meta.totalScore > 0 ? `${baseName} مكرر` : '-';
                } else {
                  currentBaseCertRank = i + 1;
                  const baseName = arabicOrdinals[currentBaseCertRank] || `المركز (${currentBaseCertRank})`;
                  studentRankMap[item.stId] = item.meta.totalScore > 0 ? baseName : '-';
                }
              }

              // Chunking based on selected layout mode
              const isTriple = certLayoutMode === 'triple_vertical' || certLayoutMode === 'quad_full';
              const isQuadBlank = certLayoutMode === 'quad_vertical_blank' || certLayoutMode === 'quad_blank_header';
              const chunkSize = certLayoutMode === 'single_framed' ? 1 : certLayoutMode === 'dual_split' ? 2 : isTriple ? 3 : 4;
              const certChunks = [];
              for (let i = 0; i < filteredStudents.length; i += chunkSize) {
                certChunks.push(filteredStudents.slice(i, i + chunkSize));
              }

              // Color badge helper according to Decision 151 (ألوان التقييم الوصفي)
              const getColorBadge = (pct) => {
                if (pct >= 85) {
                  return { label: 'يفوق التوقعات دائماً', color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd', name: 'أزرق 🔵' };
                } else if (pct >= 65) {
                  return { label: 'يلبي التوقعات كثيراً', color: '#15803d', bg: '#f0fdf4', border: '#86efac', name: 'أخضر 🟢' };
                } else if (pct >= 50) {
                  return { label: 'يلبي التوقعات أحياناً', color: '#b45309', bg: '#fffbeb', border: '#fde68a', name: 'أصفر 🟡' };
                } else {
                  return { label: 'دون المستوى المطلوب', color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', name: 'أحمر 🔴' };
                }
              };

              // Sub-component for individual certificate
              const renderCard = (st, mode, cardIdx = 0) => {
                const clsName = st.classroom_name || (st.class_number ? `فصل (${st.class_number})` : 'عام');
                
                let studentAddedTotal = 0;
                let failedSubjects = [];

                const addedData = addedSubjects.map(sbj => {
                  const cell = controlMarksMap[st.control_student_id]?.[sbj.id];
                  const wVal = cell?.work_marks !== undefined && cell?.work_marks !== null && cell?.work_marks !== '' ? Number(cell.work_marks) : null;
                  const eVal = cell?.written_marks !== undefined && cell?.written_marks !== null && cell?.written_marks !== '' ? Number(cell.written_marks) : null;
                  const wMax = isTerm1 ? (sbj.term1_work_mark || 40) : (sbj.term2_work_mark || 40);
                  const eMax = isTerm1 ? (sbj.term1_exam_mark || 60) : (sbj.term2_exam_mark || 60);
                  const totMax = wMax + eMax;
                  const totMin = Math.round(totMax * 0.5);
                  
                  let totVal = null;
                  let rating = '-';
                  let badge = null;
                  let pct = 0;

                  if (cell?.is_absent) {
                    failedSubjects.push(sbj);
                    rating = 'غائب';
                  } else if (wVal !== null || eVal !== null) {
                    totVal = (wVal || 0) + (eVal || 0);
                    studentAddedTotal += totVal;
                    pct = totMax > 0 ? (totVal / totMax) * 100 : 0;
                    rating = getGradeRating(totVal, totMax);
                    badge = getColorBadge(pct);
                    if (totVal < totMin) {
                      failedSubjects.push(sbj);
                    }
                  } else if (cell?.total_marks !== undefined && cell?.total_marks !== null && cell?.total_marks !== '') {
                    totVal = Number(cell.total_marks);
                    studentAddedTotal += totVal;
                    pct = totMax > 0 ? (totVal / totMax) * 100 : 0;
                    rating = getGradeRating(totVal, totMax);
                    badge = getColorBadge(pct);
                    if (totVal < totMin) {
                      failedSubjects.push(sbj);
                    }
                  } else if (cell?.mark !== undefined && cell?.mark !== null && cell?.mark !== '') {
                    totVal = Number(cell.mark);
                    studentAddedTotal += totVal;
                    pct = totMax > 0 ? (totVal / totMax) * 100 : 0;
                    rating = getGradeRating(totVal, totMax);
                    badge = getColorBadge(pct);
                    if (totVal < totMin) {
                      failedSubjects.push(sbj);
                    }
                  } else {
                    failedSubjects.push(sbj);
                  }

                  return { sbj, wVal, eVal, totVal, totMax, totMin, rating, badge, pct, isAbsent: cell?.is_absent };
                });

                const nonAddedData = nonAddedSubjects.map(sbj => {
                  const cell = controlMarksMap[st.control_student_id]?.[sbj.id];
                  const isActivity = sbj.evaluation_method === 'pass_fail_only';
                  if (isActivity) {
                    const actRes = cell?.pass_fail_result || cell?.mark || (cell?.is_absent ? 'غائب' : 'اجتاز');
                    if (actRes === 'لم يجتز' || cell?.is_absent) {
                      failedSubjects.push(sbj);
                    }
                    return { sbj, isActivity, totMax: 'نشاط', totMin: '-', val: actRes, rating: actRes, isAbsent: cell?.is_absent };
                  }
                  const wVal = cell?.work_marks !== undefined && cell?.work_marks !== null && cell?.work_marks !== '' ? Number(cell.work_marks) : null;
                  const eVal = cell?.written_marks !== undefined && cell?.written_marks !== null && cell?.written_marks !== '' ? Number(cell.written_marks) : null;
                  const wMax = isTerm1 ? (sbj.term1_work_mark || 40) : (sbj.term2_work_mark || 40);
                  const eMax = isTerm1 ? (sbj.term1_exam_mark || 60) : (sbj.term2_exam_mark || 60);
                  const totMax = wMax + eMax;
                  const totMin = Math.round(totMax * 0.5);
                  let val = (wVal !== null || eVal !== null) ? (wVal || 0) + (eVal || 0) : null;
                  if (val === null && cell?.total_marks !== undefined && cell?.total_marks !== null && cell?.total_marks !== '') {
                    val = Number(cell.total_marks);
                  } else if (val === null && cell?.mark !== undefined && cell?.mark !== null && cell?.mark !== '') {
                    val = Number(cell.mark);
                  }
                  const rating = cell?.is_absent ? 'غائب' : getGradeRating(val, totMax);
                  if (val === null || val < totMin || cell?.is_absent) {
                    failedSubjects.push(sbj);
                  }
                  return { sbj, isActivity, totMax, totMin, val, rating, isAbsent: cell?.is_absent };
                });

                const overallPercentage = overallAddedMax > 0 ? ((studentAddedTotal / overallAddedMax) * 100).toFixed(1) : 0;
                const overallRating = getGradeRating(studentAddedTotal, overallAddedMax);
                const overallBadge = getColorBadge(Number(overallPercentage));

                const isSingle = mode === 'single_framed';
                const isDual = mode === 'dual_split';
                const isTripleMode = mode === 'triple_vertical' || mode === 'quad_full';
                const isQuadBlankMode = mode === 'quad_vertical_blank' || mode === 'quad_blank_header';
                const isBlankHeader = isQuadBlankMode;

                const govName = effectiveSchoolInfo?.governorate || 'الجيزة';
                const dirName = effectiveSchoolInfo?.educational_admin || effectiveSchoolInfo?.directorate || 'العمرانية';
                const schName = effectiveSchoolInfo?.school_name_ar || effectiveSchoolInfo?.school_name || 'مدرسة الشهيد محمد سليمان سلامة';

                // Activity subjects display text
                const activityNames = nonAddedSubjects
                  .filter(s => s.evaluation_method === 'pass_fail_only')
                  .map(s => getShortSubjectName(s.subject_name_ar));
                const activitiesText = activityNames.length > 0
                  ? activityNames.join(' — ')
                  : 'التربية الموسيقية — التربية الفنية — التربية البدنية — المهارات المهنية';

                // Graded non-added subjects (e.g. Religion, Tech, High Level)
                const gradedNonAdded = nonAddedData.filter(d => !d.isActivity);

                // Decision 151 Procedure text (نص الإجراء الرسمي وفق القرار الوزاري 151)
                const procedureText = isTerm1 
                  ? (failedSubjects.length === 0
                      ? 'اجتاز تقييمات الفصل الدراسي الأول بنجاح، ويستمر للفصل الدراسي الثاني'
                      : (failedSubjects.length === 1 && failedSubjects[0].evaluation_method === 'pass_fail_only')
                          ? 'اجتاز المواد الأساسية، ومطلوب استيفاء النشاط في الفصل الثاني'
                          : `يحتاج برنامج علاجي ورعاية في مادة: (${failedSubjects.map(s => getShortSubjectName(s.subject_name_ar)).join('، ')}) خلال الفصل الثاني`)
                  : (failedSubjects.length === 0
                      ? 'ناجح ومنقول إلى الصف الأعلى'
                      : `له دور ثانٍ في مادة / مواد: (${failedSubjects.map(s => getShortSubjectName(s.subject_name_ar)).join('، ')})`);

                const ribbonSize = isSingle ? 75 : isDual ? 50 : isTripleMode ? 38 : 30;

                return (
                  <div
                    key={st.control_student_id || cardIdx}
                    style={{
                      position: 'relative',
                      background: '#fff',
                      boxSizing: 'border-box',
                      fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif",
                      direction: 'rtl',
                      color: '#000',
                      // Styling based on model
                      border: isSingle ? '4px solid #7f1d1d' : (isDual || isTripleMode) ? '2px solid #7f1d1d' : '1.5px solid #0284c7',
                      padding: isSingle ? '20px 65px' : isDual ? '14px 50px' : isTripleMode ? '10px 36px' : '8px 24px',
                      borderRadius: isSingle ? '10px' : isDual ? '6px' : '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: isSingle ? 'space-between' : 'flex-start',
                      minHeight: isSingle ? '190mm' : 'auto',
                      gap: isSingle ? '12px' : isDual ? '6px' : isTripleMode ? '4px' : '3px',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Red & Gold Luxury Corner Ribbons (Top-Right, Top-Left, Bottom-Right, Bottom-Left) */}
                    {(isSingle || isDual || isTripleMode) && (
                      <>
                        {/* Top Right */}
                        <div style={{ position: 'absolute', top: 0, right: 0, width: ribbonSize, height: ribbonSize, pointerEvents: 'none', zIndex: 2 }}>
                          <svg width="100%" height="100%" viewBox="0 0 75 75">
                            <polygon points="0,0 75,0 75,20 20,75 0,75" fill="#8b1d24" />
                            <polygon points="75,20 75,28 28,75 20,75" fill="#d4af37" />
                            <polygon points="0,0 45,0 0,45" fill="#b91c1c" />
                            <circle cx="24" cy="24" r="3.5" fill="#fde047" />
                          </svg>
                        </div>
                        {/* Top Left */}
                        <div style={{ position: 'absolute', top: 0, left: 0, width: ribbonSize, height: ribbonSize, pointerEvents: 'none', zIndex: 2, transform: 'scaleX(-1)' }}>
                          <svg width="100%" height="100%" viewBox="0 0 75 75">
                            <polygon points="0,0 75,0 75,20 20,75 0,75" fill="#8b1d24" />
                            <polygon points="75,20 75,28 28,75 20,75" fill="#d4af37" />
                            <polygon points="0,0 45,0 0,45" fill="#b91c1c" />
                            <circle cx="24" cy="24" r="3.5" fill="#fde047" />
                          </svg>
                        </div>
                        {/* Bottom Right */}
                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: ribbonSize, height: ribbonSize, pointerEvents: 'none', zIndex: 2, transform: 'scaleY(-1)' }}>
                          <svg width="100%" height="100%" viewBox="0 0 75 75">
                            <polygon points="0,0 75,0 75,20 20,75 0,75" fill="#8b1d24" />
                            <polygon points="75,20 75,28 28,75 20,75" fill="#d4af37" />
                            <polygon points="0,0 45,0 0,45" fill="#b91c1c" />
                            <circle cx="24" cy="24" r="3.5" fill="#fde047" />
                          </svg>
                        </div>
                        {/* Bottom Left */}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: ribbonSize, height: ribbonSize, pointerEvents: 'none', zIndex: 2, transform: 'scale(-1, -1)' }}>
                          <svg width="100%" height="100%" viewBox="0 0 75 75">
                            <polygon points="0,0 75,0 75,20 20,75 0,75" fill="#8b1d24" />
                            <polygon points="75,20 75,28 28,75 20,75" fill="#d4af37" />
                            <polygon points="0,0 45,0 0,45" fill="#b91c1c" />
                            <circle cx="24" cy="24" r="3.5" fill="#fde047" />
                          </svg>
                        </div>
                      </>
                    )}

                    {/* 1. Header Section (Inset safely from right and left) */}
                    {!isBlankHeader ? (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isSingle ? '1.2fr 2.4fr 1.2fr' : '1fr 2fr 1fr',
                        alignItems: 'center',
                        paddingBottom: isSingle ? '10px' : isDual ? '4px' : '2px',
                        paddingLeft: isSingle ? '45px' : isDual ? '28px' : '18px',
                        paddingRight: isSingle ? '45px' : isDual ? '28px' : '18px',
                        borderBottom: isSingle ? '2px solid #cbd5e1' : '1px solid #e2e8f0',
                        position: 'relative',
                        zIndex: 1
                      }}>
                        {/* 1. Right: Governorate & School (اليمين) */}
                        <div style={{ textAlign: 'right', fontSize: isSingle ? '14px' : isDual ? '10px' : '8.5px', fontWeight: 800, color: '#000', lineHeight: 1.4 }}>
                          <div>محافظة {govName}</div>
                          <div>إدارة {dirName}</div>
                          <div style={{ fontWeight: 900 }}>مدرسة {schName}</div>
                        </div>

                        {/* 2. Center: Main Title (الوسط) */}
                        <div style={{ textAlign: 'center' }}>
                          <h2 style={{ margin: '0 0 2px 0', fontSize: isSingle ? '24px' : isDual ? '15px' : '13px', fontWeight: 900, color: '#000', letterSpacing: '-0.3px' }}>
                            بطاقة تقدير درجات
                          </h2>
                          <div style={{ fontSize: isSingle ? '15px' : isDual ? '10.5px' : '9px', fontWeight: 800, color: '#1e293b' }}>
                            {isTerm1 ? 'الفصل الدراسي الأول' : 'الدور الأول'} — للعام الدراسي {academicYear}م
                          </div>
                          <div style={{ fontSize: isSingle ? '16px' : isDual ? '11.5px' : '10px', fontWeight: 900, color: '#000', marginTop: '2px' }}>
                            الصف {gradeName}
                          </div>
                        </div>

                        {/* 3. Left: School Logo (اليسار) */}
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: isSingle ? '60px' : isDual ? '42px' : '34px', height: isSingle ? '60px' : isDual ? '42px' : '34px', border: '1.5px dashed #cbd5e1', borderRadius: '50%', background: '#f8fafc', color: '#64748b', fontSize: isSingle ? '11px' : '8.5px', fontWeight: 800 }}>
                            الشعار
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Blank Space for Pre-printed Letterhead */
                      <div style={{ height: isSingle ? '55px' : isDual ? '35px' : '18px' }} />
                    )}

                    {/* 2. Student Info Box (Orange/Gold Border matching image) */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: isSingle ? '13.5px' : isDual ? '10.5px' : isTripleMode ? '9.5px' : '8.5px',
                      fontWeight: 800,
                      padding: isSingle ? '7px 16px' : isDual ? '4px 8px' : isTripleMode ? '3px 8px' : '2px 6px',
                      border: '2px solid #ea580c',
                      borderRadius: '4px',
                      background: '#fff',
                      position: 'relative',
                      zIndex: 1
                    }}>
                      <div style={{ flex: 1.8 }}>
                        <span style={{ textDecoration: 'underline', fontWeight: 900 }}>اسم الطالب :</span> <strong style={{ color: '#000', fontSize: isSingle ? '14.5px' : isDual ? '11px' : '10px', marginRight: '4px' }}>{st.full_name_ar}</strong>
                      </div>
                      <div style={{ flex: 0.9, textAlign: 'center' }}>
                        <span style={{ textDecoration: 'underline', fontWeight: 900 }}>رقم الجلوس :</span> <strong style={{ color: '#0369a1', fontSize: isSingle ? '14px' : isDual ? '11px' : '10px', marginRight: '4px' }}>{st.seat_number || '-'}</strong>
                      </div>
                      <div style={{ flex: 0.8, textAlign: 'center' }}>
                        <span style={{ textDecoration: 'underline', fontWeight: 900 }}>فصل :</span> <strong style={{ color: '#000', marginRight: '4px' }}>{clsName}</strong>
                      </div>
                      <div style={{ flex: 1.2, textAlign: 'left', color: '#000' }}>
                        <span style={{ textDecoration: 'underline', fontWeight: 900 }}>الرقم القومي</span> ( <span style={{ direction: 'ltr', display: 'inline-block', fontWeight: 900 }}>{st.national_id || '....................'}</span> )
                      </div>
                    </div>

                    {/* 3. Main Unified Horizontal Table */}
                    {(() => {
                      const totalColumnsCount = 1 + addedData.length + 1 + gradedNonAdded.length;
                      const equalColWidth = `${(100 / totalColumnsCount).toFixed(2)}%`;

                      return (
                        <div style={{ position: 'relative', zIndex: 1 }}>
                          <table style={{
                            width: '100%',
                            tableLayout: 'fixed',
                            borderCollapse: 'collapse',
                            fontSize: isSingle ? '12.5px' : isDual ? '9.5px' : '8px',
                            textAlign: 'center',
                            borderColor: '#000'
                          }} border="1">
                            <thead>
                              {/* Row 1: Header (Subject Names - All Exactly Equal Width) */}
                              <tr style={{ background: '#f8fafc', fontWeight: 900, color: '#000' }}>
                                <th style={{ padding: isSingle ? '7px 2px' : '3px 1px', width: equalColWidth }}>المادة</th>
                                {addedData.map(d => {
                                  const isLang2 = d.sbj.subject_name_ar.includes('ثانية') || d.sbj.subject_code === 'HL_LANG2';
                                  const langInfo = isLang2 ? getSecondLangInfo(st.second_language) : null;
                                  return (
                                    <th key={d.sbj.id} style={{ padding: isSingle ? '7px 2px' : '3px 1px', width: equalColWidth, fontSize: isSingle ? '12px' : isDual ? '9px' : '7.5px' }}>
                                      {isLang2 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.1 }}>
                                          <span>لغة ثانية</span>
                                          <span style={{ fontSize: isSingle ? '10px' : '7.5px', fontWeight: 900, color: '#0369a1' }}>({langInfo?.code || 'FR'})</span>
                                        </div>
                                      ) : getShortSubjectName(d.sbj.subject_name_ar)}
                                    </th>
                                  );
                                })}
                                <th style={{ padding: isSingle ? '7px 2px' : '3px 1px', width: equalColWidth, background: '#f1f5f9' }}>المجموع</th>
                                {gradedNonAdded.map(d => {
                                  const isLang2 = d.sbj.subject_name_ar.includes('ثانية') || d.sbj.subject_code === 'HL_LANG2';
                                  const langInfo = isLang2 ? getSecondLangInfo(st.second_language) : null;
                                  return (
                                    <th key={`non-head-${d.sbj.id}`} style={{ padding: isSingle ? '7px 2px' : '3px 1px', width: equalColWidth, fontSize: isSingle ? '12px' : isDual ? '9px' : '7.5px' }}>
                                      {isLang2 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.1 }}>
                                          <span>لغة ثانية</span>
                                          <span style={{ fontSize: isSingle ? '10px' : '7.5px', fontWeight: 900, color: '#0369a1' }}>({langInfo?.code || 'FR'})</span>
                                        </div>
                                      ) : getShortSubjectName(d.sbj.subject_name_ar)}
                                    </th>
                                  );
                                })}
                              </tr>

                              {/* Row 2: Maximum Score (الدرجة العظمى) */}
                              <tr style={{ background: '#fff', fontWeight: 800, fontSize: isSingle ? '12px' : '8.5px' }}>
                                <th style={{ padding: isSingle ? '5px 2px' : '2px 1px', fontWeight: 900 }}>الدرجة العظمى</th>
                                {addedData.map(d => (
                                  <th key={`max-${d.sbj.id}`} style={{ padding: isSingle ? '5px 2px' : '2px 1px' }}>{d.totMax}</th>
                                ))}
                                <th style={{ padding: isSingle ? '5px 2px' : '2px 1px', background: '#f1f5f9' }}>{overallAddedMax}</th>
                                {gradedNonAdded.map(d => (
                                  <th key={`non-max-${d.sbj.id}`} style={{ padding: isSingle ? '5px 2px' : '2px 1px' }}>{d.totMax}</th>
                                ))}
                              </tr>
                            </thead>

                        <tbody>
                          {/* Row 3: Student Score (درجة الطالب) */}
                          <tr style={{ height: isSingle ? '34px' : '22px', fontWeight: 900, fontSize: isSingle ? '13px' : '9.5px' }}>
                            <td style={{ fontWeight: 900 }}>درجة الطالب</td>
                            {addedData.map(d => (
                              <td key={`val-${d.sbj.id}`} style={{ padding: '2px 1px', color: d.isAbsent ? '#dc2626' : (d.totVal !== null && d.totVal < d.totMin ? '#dc2626' : '#000') }}>
                                {d.isAbsent ? 'غائب' : d.totVal !== null ? d.totVal.toFixed(1).replace(/\.0$/, '') : '-'}
                              </td>
                            ))}
                            <td style={{ padding: '2px 1px', color: '#047857', background: '#f0fdf4', fontWeight: 900 }}>
                              {studentAddedTotal > 0 ? studentAddedTotal.toFixed(1).replace(/\.0$/, '') : '-'}
                            </td>
                            {gradedNonAdded.map(d => (
                              <td key={`non-val-${d.sbj.id}`} style={{ padding: '2px 1px', color: d.isAbsent ? '#dc2626' : '#000' }}>
                                {d.isAbsent ? 'غائب' : (typeof d.val === 'number' ? d.val.toFixed(1).replace(/\.0$/, '') : (d.val || '-'))}
                              </td>
                            ))}
                          </tr>

                          {/* Row 4: Qualitative Rating (التقدير) */}
                          <tr style={{ height: isSingle ? '30px' : '20px', fontSize: isSingle ? '11.5px' : '8.5px', background: '#fff', fontWeight: 800 }}>
                            <td style={{ fontWeight: 900 }}>التقدير</td>
                            {addedData.map(d => (
                              <td key={`rt-${d.sbj.id}`} style={{ padding: '1px 0', color: d.rating === 'دون المستوى' || d.rating === 'غائب' ? '#dc2626' : '#000' }}>
                                {d.rating}
                              </td>
                            ))}
                            <td style={{ padding: '1px 0', fontWeight: 900, color: '#15803d', background: '#f0fdf4' }}>
                              {overallRating}
                            </td>
                            {gradedNonAdded.map(d => (
                              <td key={`non-rt-${d.sbj.id}`} style={{ padding: '1px 0', color: d.rating === 'دون المستوى' || d.rating === 'غائب' ? '#dc2626' : '#000' }}>
                                {d.rating}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

                    {/* 4. Activity Subjects Line (مواد النشاط) */}
                    <div style={{
                      fontSize: isSingle ? '13px' : isDual ? '10px' : '8.5px',
                      fontWeight: 800,
                      color: '#000',
                      position: 'relative',
                      zIndex: 1
                    }}>
                      <span>الطالب اجتاز مواد النشاط ( <strong style={{ textDecoration: 'underline' }}>{activitiesText}</strong> )</span>
                    </div>

                    {/* 5. Ranking & General Level Line */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: isSingle ? '13.5px' : isDual ? '10.5px' : '8.5px',
                      fontWeight: 800,
                      color: '#000',
                      position: 'relative',
                      zIndex: 1
                    }}>
                      <div style={{ flex: 1.2 }}>
                        <span style={{ textDecoration: 'underline', fontWeight: 900 }}>ترتيب الطالب :</span> <strong style={{ color: '#0369a1', marginRight: '6px', fontSize: isSingle ? '14px' : '11px' }}>{studentRankMap[st.control_student_id] || '-'}</strong>
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ textDecoration: 'underline', fontWeight: 900 }}>المستوى العام :</span> <strong style={{ color: overallBadge.color, marginRight: '4px' }}>{overallRating} ({overallBadge.name})</strong>
                      </div>
                    </div>

                    {/* 6. Procedure / Action Line (الإجراء وفق القرار 151) */}
                    <div style={{
                      fontSize: isSingle ? '13px' : isDual ? '10px' : '8.5px',
                      fontWeight: 800,
                      color: '#000',
                      position: 'relative',
                      zIndex: 1
                    }}>
                      <span style={{ textDecoration: 'underline', fontWeight: 900 }}>الإجراء :</span> <strong style={{
                        color: overallRating === 'ممتاز' || overallRating === 'جيد جداً' || overallRating === 'جيد' ? '#15803d' : overallRating === 'مقبول' ? '#b45309' : '#dc2626',
                        marginRight: '6px',
                        fontSize: isSingle ? '13.5px' : isDual ? '10.5px' : '9px'
                      }}>
                        {getDecision151Procedure(overallPercentage, overallRating, failedSubjects)}
                      </strong>
                    </div>

                    {/* 7. Signatures Footer (Inset safely from right and left) */}
                    {!isBlankHeader ? (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        textAlign: 'center',
                        fontSize: isSingle ? '13px' : isDual ? '10px' : '8.5px',
                        fontWeight: 800,
                        color: '#000',
                        paddingTop: isSingle ? '10px' : '4px',
                        paddingLeft: isSingle ? '45px' : '28px',
                        paddingRight: isSingle ? '45px' : '28px',
                        borderTop: isSingle ? '1.5px solid #cbd5e1' : '1px solid #e2e8f0',
                        position: 'relative',
                        zIndex: 1
                      }}>
                        {/* Right: Clerk & Dictation */}
                        <div style={{ textAlign: 'right', lineHeight: 1.6 }}>
                          <div><span style={{ textDecoration: 'underline', fontWeight: 900 }}>كتبه :</span> ....................</div>
                          <div><span style={{ textDecoration: 'underline', fontWeight: 900 }}>أملاه :</span> ....................</div>
                        </div>

                        {/* Center: Control Head */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 900 }}>رئيس لجنة النظام والمراقبة</div>
                          <div style={{ marginTop: isSingle ? '16px' : '8px' }}>....................................</div>
                        </div>

                        {/* Left: School Principal */}
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 900 }}>يعتمد؛ مدير المدرسة</div>
                          <div style={{ marginTop: isSingle ? '16px' : '8px' }}>....................................</div>
                        </div>
                      </div>
                    ) : (
                      /* Blank Space for Pre-printed Signatures Section */
                      <div style={{ height: '36px' }} />
                    )}
                  </div>
                );
              };

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {certChunks.map((chunk, pageIdx) => (
                    <div
                      key={pageIdx}
                      className="printable-page-block"
                      style={{
                        pageBreakAfter: pageIdx < certChunks.length - 1 ? 'always' : 'auto',
                        marginBottom: pageIdx < certChunks.length - 1 ? '24px' : '0',
                        paddingBottom: pageIdx < certChunks.length - 1 ? '16px' : '0',
                        borderBottom: pageIdx < certChunks.length - 1 ? '2px dashed #cbd5e1' : 'none'
                      }}
                    >
                      {/* 1. Single Framed Certificate (1 per A4 page) */}
                      {certLayoutMode === 'single_framed' && (
                        <div>
                          {chunk.map((st, idx) => renderCard(st, 'single_framed', idx))}
                        </div>
                      )}

                      {/* 2. Dual Split Certificates (2 per A4 page) */}
                      {certLayoutMode === 'dual_split' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {chunk.map((st, idx) => (
                            <React.Fragment key={st.control_student_id || idx}>
                              {renderCard(st, 'dual_split', idx)}
                              {idx === 0 && chunk.length > 1 && (
                                <div style={{ borderTop: '2px dashed #94a3b8', margin: '4px 0', position: 'relative', textAlign: 'center' }}>
                                  <span style={{ position: 'absolute', top: '-10px', background: '#fff', padding: '0 8px', fontSize: '10.5px', color: '#64748b', fontWeight: 800 }}>
                                    ✂ خط القص وفصل البطاقتين
                                  </span>
                                </div>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      )}

                      {/* 3. Triple Vertical Certificates (3 per A4 page stacked vertically) */}
                      {isTriple && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {chunk.map((st, idx) => (
                            <React.Fragment key={st.control_student_id || idx}>
                              {renderCard(st, 'triple_vertical', idx)}
                              {idx < chunk.length - 1 && (
                                <div style={{ borderTop: '2px dashed #94a3b8', margin: '3px 0', position: 'relative', textAlign: 'center' }}>
                                  <span style={{ position: 'absolute', top: '-9px', background: '#fff', padding: '0 8px', fontSize: '9.5px', color: '#64748b', fontWeight: 800 }}>
                                    ✂ خط القص وفصل البطاقات
                                  </span>
                                </div>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      )}

                      {/* 4. Quad Vertical Blank Header Certificates (4 per A4 page stacked vertically) */}
                      {isQuadBlank && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {chunk.map((st, idx) => (
                            <React.Fragment key={st.control_student_id || idx}>
                              {renderCard(st, 'quad_vertical_blank', idx)}
                              {idx < chunk.length - 1 && (
                                <div style={{ borderTop: '1.5px dashed #94a3b8', margin: '2px 0', position: 'relative', textAlign: 'center' }}>
                                  <span style={{ position: 'absolute', top: '-8px', background: '#fff', padding: '0 6px', fontSize: '9px', color: '#64748b', fontWeight: 800 }}>
                                    ✂ خط القص وفصل البطاقات
                                  </span>
                                </div>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
