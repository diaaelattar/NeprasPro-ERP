// ════════════════════════════════════════════════════════════════
//  StudentAbsenceManager: نظام رصد الغياب الأسبوعي الجماعي والإنذارات الرسمية
// ════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle, Printer, Search, Calendar, FileText, CheckCircle,
  ArrowRight, Users, Check, X, ShieldAlert, Clock, ChevronRight,
  Filter, UserCheck, RefreshCw, Phone, MapPin, Eye, FileCheck, Settings2
} from 'lucide-react';
import '../staff/staff.css';
import API_BASE_URL from '../../config/api';

const API = API_BASE_URL;

// Safe Fetch JSON helper to prevent "Unexpected token '<'"
const safeFetchJson = async (url, options = {}) => {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { success: false, status: res.status, error: `استجابة غير صحيحة من الخادم (${res.status})` };
    }
    const json = await res.json();
    return json;
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const ALL_WEEK_DAYS = [
  { key: 'sat', name: 'السبت', offset: 0 },
  { key: 'sun', name: 'الأحد', offset: 1 },
  { key: 'mon', name: 'الاثنين', offset: 2 },
  { key: 'tue', name: 'الثلاثاء', offset: 3 },
  { key: 'wed', name: 'الأربعاء', offset: 4 },
  { key: 'thu', name: 'الخميس', offset: 5 },
];

// Helper to get week dates based on selected enabled days
function getWeekDates(startDateStr, enabledDayKeys = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu']) {
  const base = new Date(startDateStr);
  const dates = [];

  ALL_WEEK_DAYS.forEach((day) => {
    if (enabledDayKeys.includes(day.key)) {
      const d = new Date(base);
      d.setDate(base.getDate() + day.offset);
      const iso = d.toISOString().split('T')[0];
      dates.push({
        key: day.key,
        name: day.name,
        date: iso,
        formatted: `${day.name} (${iso.slice(5)})`
      });
    }
  });

  return dates;
}

// Get the closest previous Saturday as default week start
function getDefaultWeekStart() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday
  const diff = (dayOfWeek === 6) ? 0 : (dayOfWeek + 1); // Days back to last Saturday
  const sat = new Date(now);
  sat.setDate(now.getDate() - diff);
  return sat.toISOString().split('T')[0];
}

export default function StudentAbsenceManager({ onBack }) {
  const [activeTab, setActiveTab] = useState('weekly_matrix'); // 'weekly_matrix' | 'single' | 'warnings'
  
  // School structure lookups
  const [formOptions, setFormOptions] = useState({ sections: [], stages: [], grades: [] });
  const [classrooms, setClassrooms] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState({});
  const [currentAcademicYear, setCurrentAcademicYear] = useState('');

  // Cascading Filters (القسم ⬅️ المرحلة ⬅️ الصف ⬅️ الفصل)
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedStageId, setSelectedStageId]     = useState('');
  const [selectedGradeId, setSelectedGradeId]     = useState('');
  const [selectedClassId, setSelectedClassId]     = useState('');
  const [weekStartDate, setWeekStartDate]         = useState(getDefaultWeekStart());

  // Flexible Working Days / Off Days Configuration
  const [enabledDays, setEnabledDays] = useState(['sat', 'sun', 'mon', 'tue', 'wed', 'thu']);
  const [showDaysConfig, setShowDaysConfig] = useState(false);

  // Weekly Matrix Data
  const [classStudents, setClassStudents] = useState([]);
  const [matrixState, setMatrixState] = useState({}); // { `${student_id}_${date}`: 'present' | 'absent_unexcused' | 'absent_excused' }
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [matrixSuccess, setMatrixSuccess] = useState('');

  // Warnings & Single Absence State
  const [warnings, setWarnings] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Single Record Form State
  const [singleStudentId, setSingleStudentId] = useState('');
  const [singleAbsenceDate, setSingleAbsenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [singleAbsenceType, setSingleAbsenceType] = useState('بدون عذر');
  const [singleNotes, setSingleNotes] = useState('');
  const [singleSuccess, setSingleSuccess] = useState('');

  // Load Base Lookups & Stats safely
  useEffect(() => {
    Promise.all([
      safeFetchJson(`${API}/students/form-options`),
      safeFetchJson(`${API}/settings/institution`),
      safeFetchJson(`${API}/students/absence-warnings`),
      safeFetchJson(`${API}/students?limit=1000`)
    ])
      .then(([optsRes, instRes, warnRes, sRes]) => {
        if (optsRes && optsRes.success) {
          setFormOptions(optsRes);
          if (optsRes.sections && optsRes.sections.length === 1) {
            setSelectedSectionId(String(optsRes.sections[0].id));
          }
          if (optsRes.stages && optsRes.stages.length === 1) {
            setSelectedStageId(String(optsRes.stages[0].id));
          }
          // استخلاص العام الدراسي الجاري لاستخدامه في الطباعة
          const years = optsRes.academicYears || [];
          const curYear = years.find(y => y.is_current === 1 || y.is_current === true) || years[0];
          if (curYear) setCurrentAcademicYear(curYear.year_label || '');
        }
        if (instRes && instRes.success && (instRes.config || instRes.institution)) {
          setSchoolInfo(instRes.config || instRes.institution || {});
        }
        if (warnRes && warnRes.success) setWarnings(warnRes.warnings || []);
        if (sRes && sRes.success) {
          const sorted = [...(sRes.students || [])].sort((a, b) => 
            (a.full_name_ar || '').trim().localeCompare((b.full_name_ar || '').trim(), 'ar', { sensitivity: 'base' })
          );
          setAllStudents(sorted);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Filtered Stages (All active stages or filtered by section)
  const filteredStages = useMemo(() => {
    const allStages = formOptions.stages || [];
    if (!selectedSectionId) return allStages;
    const bySec = allStages.filter(s => String(s.section_id) === String(selectedSectionId));
    return bySec.length > 0 ? bySec : allStages;
  }, [selectedSectionId, formOptions.stages]);

  // Auto-select stage if only 1 stage
  useEffect(() => {
    if (filteredStages.length === 1 && !selectedStageId) {
      setSelectedStageId(String(filteredStages[0].id));
    }
  }, [filteredStages, selectedStageId]);

  // Filtered Grades (Cascaded from Stage, fallback to all grades)
  const filteredGrades = useMemo(() => {
    const allGrades = formOptions.grades || [];
    if (!selectedStageId) return allGrades;
    return allGrades.filter(g => String(g.stage_id) === String(selectedStageId));
  }, [selectedStageId, formOptions.grades]);

  // Auto-select first grade if available
  useEffect(() => {
    if (filteredGrades.length > 0 && !selectedGradeId) {
      setSelectedGradeId(String(filteredGrades[0].id));
    }
  }, [filteredGrades, selectedGradeId]);

  // Load classrooms safely when grade changes
  useEffect(() => {
    if (!selectedGradeId) {
      setClassrooms([]);
      setSelectedClassId('');
      return;
    }

    safeFetchJson(`${API}/settings/classrooms?gradeId=${selectedGradeId}`)
      .then(d => {
        if (d && d.success && d.classrooms && d.classrooms.length > 0) {
          setClassrooms(d.classrooms);
          setSelectedClassId(d.classrooms[0].id);
        } else {
          safeFetchJson(`${API}/students/export/classes-for-export?gradeId=${selectedGradeId}`)
            .then(d2 => {
              if (d2 && d2.success && d2.classes && d2.classes.length > 0) {
                setClassrooms(d2.classes);
                setSelectedClassId(d2.classes[0].id);
              } else {
                setClassrooms([]);
                setSelectedClassId('');
              }
            });
        }
      })
      .catch(() => {
        setClassrooms([]);
        setSelectedClassId('');
      });
  }, [selectedGradeId]);

  // Compute Active Week Dates based on enabledDays
  const weekDates = useMemo(() => {
    return getWeekDates(weekStartDate, enabledDays);
  }, [weekStartDate, enabledDays]);

  // Load Class Students & Existing Absence with Robust Fallback
  const loadClassMatrix = async () => {
    if (!selectedGradeId && !selectedClassId) return;
    setMatrixLoading(true);
    setMatrixSuccess('');
    setError('');

    const datesParam = weekDates.map(d => d.date).join(',');
    const url = `${API}/students/absence/weekly-class?classId=${selectedClassId || ''}&gradeId=${selectedGradeId || ''}&dates=${datesParam}`;

    try {
      const d = await safeFetchJson(url);
      if (d && d.success && d.students) {
        const sortedList = [...(d.students || [])].sort((a, b) => 
          (a.full_name_ar || '').trim().localeCompare((b.full_name_ar || '').trim(), 'ar', { sensitivity: 'base' })
        );
        setClassStudents(sortedList);
        const newMap = {};
        sortedList.forEach(s => {
          weekDates.forEach(wd => {
            newMap[`${s.id}_${wd.date}`] = 'present';
          });
        });

        (d.absences || []).forEach(abs => {
          const key = `${abs.student_id}_${abs.absence_date}`;
          newMap[key] = abs.absence_type === 'بعذر' ? 'absent_excused' : 'absent_unexcused';
        });

        setMatrixState(newMap);
      } else {
        // Fallback: Fetch students directly from main student endpoint
        const q = new URLSearchParams({ limit: '1000', status: 'all' });
        if (selectedGradeId) q.set('gradeId', selectedGradeId);
        if (selectedClassId) q.set('classId', selectedClassId);

        const stdRes = await safeFetchJson(`${API}/students?${q.toString()}`);
        if (stdRes && stdRes.success) {
          const list = [...(stdRes.students || [])].sort((a, b) => 
            (a.full_name_ar || '').trim().localeCompare((b.full_name_ar || '').trim(), 'ar', { sensitivity: 'base' })
          );
          setClassStudents(list);
          const newMap = {};
          list.forEach(s => {
            weekDates.forEach(wd => {
              newMap[`${s.id}_${wd.date}`] = 'present';
            });
          });
          setMatrixState(newMap);
        } else {
          setError(stdRes?.error || 'تعذر تحميل قائمة الطلاب.');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setMatrixLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClassId || selectedGradeId) {
      loadClassMatrix();
    }
  }, [selectedClassId, selectedGradeId, weekStartDate, enabledDays]);

  // Toggle single attendance status
  const toggleAttendance = (studentId, date) => {
    const key = `${studentId}_${date}`;
    const curr = matrixState[key] || 'present';
    let next = 'present';
    if (curr === 'present') next = 'absent_unexcused';
    else if (curr === 'absent_unexcused') next = 'absent_excused';
    else next = 'present';

    setMatrixState(prev => ({
      ...prev,
      [key]: next
    }));
  };

  // Bulk set all students for a single date
  const setAllForDate = (date, status) => {
    const updated = { ...matrixState };
    classStudents.forEach(s => {
      updated[`${s.id}_${date}`] = status;
    });
    setMatrixState(updated);
  };

  // Save Bulk Matrix to Backend with Fallback
  const handleSaveMatrix = async () => {
    setSavingMatrix(true);
    setError('');
    setMatrixSuccess('');

    const records = [];
    const absentItems = [];

    classStudents.forEach(s => {
      weekDates.forEach(wd => {
        const status = matrixState[`${s.id}_${wd.date}`] || 'present';
        records.push({
          student_id: s.id,
          date: wd.date,
          status
        });
        if (status === 'absent_unexcused' || status === 'absent_excused') {
          absentItems.push({
            student_id: s.id,
            absence_date: wd.date,
            absence_type: status === 'absent_excused' ? 'بعذر' : 'بدون عذر'
          });
        }
      });
    });

    try {
      const data = await safeFetchJson(`${API}/students/absence/weekly-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dates: weekDates.map(d => d.date),
          records
        })
      });

      if (data && data.success) {
        let msg = data.message || 'تم حفظ غياب الفصل بالكامل للأسبوع بنجاح!';
        if (data.warningsGenerated && data.warningsGenerated.length > 0) {
          msg += ` ⚠️ تم إصدار (${data.warningsGenerated.length}) إنذار رسمي جديد تلقائياً!`;
        }
        setMatrixSuccess(msg);
      } else {
        // Fallback: Save via single record-absence endpoint for each absent record
        for (const item of absentItems) {
          await safeFetchJson(`${API}/students/record-absence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
          });
        }
        setMatrixSuccess(`تم حفظ غياب الفصل بنجاح (${absentItems.length} حالة غياب مسجلة للأسبوع).`);
      }

      safeFetchJson(`${API}/students/absence-warnings`).then(wRes => {
        if (wRes && wRes.success) setWarnings(wRes.warnings || []);
      });
      loadClassMatrix();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingMatrix(false);
    }
  };

  // Record Single Student Absence
  const handleRecordSingleAbsence = async (e) => {
    e.preventDefault();
    if (!singleStudentId) {
      setError('يرجى اختيار الطالب من القائمة.');
      return;
    }
    setError('');
    setSingleSuccess('');

    try {
      const data = await safeFetchJson(`${API}/students/record-absence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: singleStudentId,
          absence_date: singleAbsenceDate,
          absence_type: singleAbsenceType,
          notes: singleNotes
        })
      });
      if (!data || !data.success) throw new Error(data?.error || 'فشل في حفظ الغياب');

      let msg = `تم تسجيل الغياب بنجاح. إجمالي أيام الغياب بدون عذر: ${data.totalAbsent} يوماً.`;
      if (data.warningGenerated) {
        msg += ` ⚠️ تم إصدار: "${data.warningGenerated}" للطالب تلقائياً!`;
      }
      setSingleSuccess(msg);
      setSingleNotes('');

      safeFetchJson(`${API}/students/absence-warnings`).then(wRes => {
        if (wRes && wRes.success) setWarnings(wRes.warnings || []);
      });
      loadClassMatrix();
    } catch (err) {
      setError(err.message);
    }
  };

  // Preset Days Modes
  const applyPresetDays = (preset) => {
    if (preset === '6_days_sat') {
      setEnabledDays(['sat', 'sun', 'mon', 'tue', 'wed', 'thu']); // الجمعة فقط إجازة
    } else if (preset === '5_days_fri_sat') {
      setEnabledDays(['sun', 'mon', 'tue', 'wed', 'thu']); // الجمعة والسبت إجازة
    } else if (preset === '5_days_thu_fri') {
      setEnabledDays(['sat', 'sun', 'mon', 'tue', 'wed']); // الخميس والجمعة إجازة
    }
  };

  const toggleDayKey = (key) => {
    if (enabledDays.includes(key)) {
      if (enabledDays.length === 1) return; // Keep at least 1 day
      setEnabledDays(enabledDays.filter(k => k !== key));
    } else {
      setEnabledDays([...enabledDays, key]);
    }
  };

  // Official Print Window Handler
  const handleOpenPrintModal = (warning, type = 'warning') => {
    const cleanSchool = (schoolInfo.school_name || schoolInfo.schoolName || '').replace(/^مدرسة\s*/, '').trim() || 'الشهيد محمد سليمان سلامة ع';
    const cleanAdmin = (schoolInfo.directorate || '').replace(/التعليمية\s*$/, '').trim() || 'العمرانية';
    const governorate = schoolInfo.governorate || 'الجيزة';

    let title = 'إنذار أول';
    if (warning.warning_type?.includes('ثان') || warning.warning_type?.includes('ثاني') || warning.warning_type?.includes('12')) {
      title = 'إنذار ثانٍ';
    } else if (warning.warning_type?.includes('فصل') || warning.warning_type?.includes('نهائي') || warning.warning_type?.includes('15') || warning.warning_type?.includes('30')) {
      title = 'إنذار نهائي وفصل';
    } else {
      title = 'إنذار أول';
    }

    let docSubject = '';
    let bodyText = `
      نفيدكم علماً بأنه لوحظ تكرار غياب الطالب المذكور أعلاه عن الحضور للمدرسة بدون عذر مقبول، 
      حيث بلغ إجمالي أيام غيابه بدون عذر <strong>(${warning.total_absent_days}) يوماً</strong> حتى تاريخه.
      <br/><br/>
      ويرجى التنبيه على ولي الأمر بضرورة الحضور فوراً إلى إدارة المدرسة لتسوية موقف قيد الطالب، 
      حيث أن الاستمرار في الغياب يعرض الطالب لتطبيق المادة القانونية المقررة بالفصل وإيقاف القيد.
    `;

    if (type === 'call') {
      title = 'استدعاء ولي أمر';
      docSubject = '';
      bodyText = `
        نظراً لتكرار غياب نجلكم الطالب المذكور أعلاه وتجاوزه للنسبة المقررة قانوناً، 
        يرجى التكرم بالحضور إلى مقر المدرسة (مكتب شؤون الطلاب) للأهمية القصوى لمناقشة انتظام قيد الطالب، 
        وذلك خلال 48 ساعة من تاريخ وصول هذا الإشعار لتفادي اتخاذ الإجراءات القانونية.
      `;
    } else if (type === 're_enrollment') {
      title = 'نموذج إعادة قيد طالب';
      docSubject = '';
      bodyText = `
        أقر أنا ولي أمر الطالب المذكور أعلاه بالتزامي الكامل بانتظام نجلي بالدراسة وعدم تكرار الغياب بدون عذر مقبول، 
        وألتمس الموافقة على إعادة قيده بالمدرسة بالعام الدراسي الحالي طبقاً للقرارات الوزارية المنظمة، 
        مع سداد الرسوم المقررة لإعادة القيد.
      `;
    }

    const now = new Date();
    const dateStr = warning.issue_date 
      ? new Date(warning.issue_date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })
      : now.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });

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
          <title>${title} - ${warning.full_name_ar}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm 20mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Calibri', 'Segoe UI', Tahoma, Arial, sans-serif;
              padding: 10px;
              line-height: 1.75;
              text-align: right;
              color: #000;
              font-size: 12pt;
              direction: rtl;
            }
            .header-box {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2pt solid #000;
              padding-bottom: 8pt;
              margin-bottom: 14pt;
            }
            .hd-right { text-align: right; font-size: 11pt; font-weight: 700; line-height: 1.5; min-width: 55mm; }
            .hd-center { text-align: center; flex: 1; padding: 0 6mm; }
            .header-title { font-size: 18pt; font-weight: 900; color: #000; margin: 0 0 3pt; text-decoration: underline; }
            .header-sub { font-size: 12pt; font-weight: 800; text-decoration: underline; }
            .hd-left { text-align: left; min-width: 55mm; font-size: 9.5pt; font-weight: 600; }
            .hd-left img { max-height: 42pt; max-width: 80pt; object-fit: contain; display: block; margin-bottom: 2pt; }
            .logo-box { display: inline-block; border: 1pt dashed #cbd5e1; padding: 3pt 6pt; font-size: 9.5pt; font-weight: 700; }

            .student-info-box {
              border: 1.5pt solid #000;
              border-radius: 6pt;
              padding: 12pt 16pt;
              margin-bottom: 16pt;
              background: #fff;
            }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8pt 16pt; font-size: 11.5pt; }
            .content-box { font-size: 12.5pt; margin-bottom: 25pt; line-height: 2; text-align: justify; }
            .signatures-table {
              width: 100%;
              border-collapse: collapse;
              border: none;
              margin-top: 30pt;
              font-weight: 800;
              font-size: 11pt;
              text-align: center;
            }
            .signatures-table td { border: none; padding: 4pt; }
            .sig-line { width: 70%; height: 1pt; border-bottom: 1pt dotted #000; margin: 25pt auto 0; }
            .stamp-box {
              width: 65pt; height: 65pt; border: 1.5pt dashed #94a3b8; border-radius: 50%;
              margin: 8pt auto 0 auto; display: flex; align-items: center; justify-content: center;
              font-size: 9pt; color: #64748b; font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div class="hd-right">
              <div>محافظة: <strong>${governorate}</strong></div>
              <div>إدارة: <strong>${cleanAdmin} التعليمية</strong></div>
              <div>مدرسة: <strong>${cleanSchool}</strong></div>
            </div>
            <div class="hd-center">
              <h2 class="header-title">${title}</h2>
              <div class="header-sub">للعام الدراسي: ${currentAcademicYear || '....../......'} م ${docSubject ? `— (${docSubject})` : ''}</div>
            </div>
            <div class="hd-left">
              ${schoolInfo?.logo_url ? `<img src="${schoolInfo.logo_url}" alt="شعار" />` : '<div class="logo-box">شعار المدرسة</div>'}
              <div>التاريخ: ${dateStr}</div>
            </div>
          </div>

          <div class="student-info-box">
            <div class="info-grid">
              <div><strong>اسم الطالب:</strong> ${warning.full_name_ar}</div>
              <div><strong>الرقم القومي:</strong> <span style="font-family: monospace;">${warning.national_id || '—'}</span></div>
              <div><strong>الصف الدراسي:</strong> ${warning.grade_name_ar || '—'}</div>
              <div><strong>الفصل:</strong> ${warning.class_name || '—'}</div>
              <div><strong>اسم ولي الأمر:</strong> ${warning.guardian_name || '—'}</div>
              <div><strong>رقم الهاتف:</strong> <span style="font-family: monospace;">${warning.guardian_phone || '—'}</span></div>
              <div style="grid-column: 1 / -1;"><strong>العنوان:</strong> ${warning.address || '—'}</div>
            </div>
          </div>

          <div class="content-box">
            <p>${bodyText}</p>
          </div>

          <table class="signatures-table">
            <tr>
              <td style="width: 25%;">
                <div>مسؤول الغياب وشؤون الطلاب</div>
                <div class="sig-line"></div>
              </td>
              <td style="width: 25%;">
                <div>الأخصائي الاجتماعي / النفسي</div>
                <div class="sig-line"></div>
              </td>
              <td style="width: 25%;">
                <div>وكيل شؤون الطلاب والتعليم</div>
                <div class="sig-line"></div>
              </td>
              <td style="width: 25%;">
                <div>مدير المدرسة (يعتمد)</div>
                <div class="sig-line"></div>
              </td>
            </tr>
            <tr>
              <td colspan="4" style="padding-top: 15pt;">
                <div class="stamp-box">
                  خاتم المدرسة الرسمي
                </div>
              </td>
            </tr>
          </table>
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
    <div className="staff-container" style={{ direction: 'rtl' }}>
      {/* Header */}
      <div className="staff-header" style={{ marginBottom: 14 }}>
        <div className="staff-title-box">
          <h2>
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            نظام رصد الغياب الأسبوعي والإنذارات الرسمية
          </h2>
          <p>رصد الغياب الأسبوعي الجماعي للفصل مع تخصيص أيام الدراسة والإجازات الأسبوعية، إصدار الإنذارات التلقائية والطباعة الرسمية</p>
        </div>
        {onBack && (
          <button onClick={onBack} className="staff-cancel-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
            <ArrowRight size={16} /> العودة لقائمة الطلاب
          </button>
        )}
      </div>

      {/* Main Navigation Tabs */}
      <div className="form-tabs" style={{ marginBottom: 16 }}>
        <button
          className={`form-tab ${activeTab === 'weekly_matrix' ? 'active' : ''}`}
          onClick={() => setActiveTab('weekly_matrix')}
          style={activeTab === 'weekly_matrix' ? { background: '#e0f2fe', color: '#0369a1', fontWeight: 900, borderBottom: '3px solid #0284c7' } : {}}
        >
          📅 مصفوفة رصد الغياب الأسبوعي للفصل
        </button>
        <button
          className={`form-tab ${activeTab === 'single' ? 'active' : ''}`}
          onClick={() => setActiveTab('single')}
          style={activeTab === 'single' ? { background: '#e0f2fe', color: '#0369a1', fontWeight: 900, borderBottom: '3px solid #0284c7' } : {}}
        >
          📝 تسجيل غياب فردي / عذر
        </button>
        <button
          className={`form-tab ${activeTab === 'warnings' ? 'active' : ''}`}
          onClick={() => setActiveTab('warnings')}
          style={activeTab === 'warnings' ? { background: '#fef3c7', borderColor: '#d97706', color: '#92400e', fontWeight: 900 } : {}}
        >
          ⚠️ سجل الإنذارات القانونية ({warnings.length})
        </button>
      </div>

      {/* Global Alerts */}
      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, marginBottom: 14, fontSize: 13, fontWeight: 700 }}>
          {error}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TAB 1: WEEKLY BULK MATRIX (مصفوفة رصد الغياب الأسبوعي للفصل) */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'weekly_matrix' && (
        <div className="staff-card" style={{ background: '#fff', borderRadius: 12, padding: 18, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          
          {/* Cascading Filter Controls Bar (القسم ⬅️ المرحلة ⬅️ الصف ⬅️ الفصل) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1.5px solid #e2e8f0', marginBottom: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              
              {/* 1. Section (القسم) */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 3 }}>القسم</label>
                <select
                  value={selectedSectionId}
                  onChange={e => {
                    setSelectedSectionId(e.target.value);
                    setSelectedStageId('');
                    setSelectedGradeId('');
                    setSelectedClassId('');
                  }}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5, fontWeight: 700 }}
                >
                  <option value="">كل الأقسام</option>
                  {(formOptions.sections || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* 2. Stage (المرحلة) */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 3 }}>المرحلة</label>
                <select
                  value={selectedStageId}
                  onChange={e => {
                    setSelectedStageId(e.target.value);
                    setSelectedGradeId('');
                    setSelectedClassId('');
                  }}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5, fontWeight: 700 }}
                >
                  <option value="">كل المراحل</option>
                  {filteredStages.map(s => <option key={s.id} value={s.id}>{s.stage_name_ar || s.stage_name || s.name}</option>)}
                </select>
              </div>

              {/* 3. Grade (الصف الدراسي) */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 3 }}>الصف الدراسي</label>
                <select
                  value={selectedGradeId}
                  onChange={e => {
                    setSelectedGradeId(e.target.value);
                    setSelectedClassId('');
                  }}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5, fontWeight: 700 }}
                >
                  <option value="">اختر الصف</option>
                  {filteredGrades.map(g => <option key={g.id} value={g.id}>{g.grade_name_ar || g.name}</option>)}
                </select>
              </div>

              {/* 4. Classroom (الفصل) */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 3 }}>الفصل</label>
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5, fontWeight: 800, color: '#0369a1' }}
                >
                  <option value="">{classrooms.length > 0 ? 'اختر الفصل' : (selectedGradeId ? 'كل فصول الصف' : 'اختر الصف أولاً--')}</option>
                  {classrooms.map(c => <option key={c.id} value={c.id}>{'\u200E' + (c.class_name || c.name)}</option>)}
                </select>
              </div>

              {/* 5. Week Start Date */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 3 }}>تاريخ بداية الأسبوع</label>
                <input
                  type="date"
                  value={weekStartDate}
                  onChange={e => setWeekStartDate(e.target.value)}
                  style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5, fontWeight: 700 }}
                />
              </div>

              {/* 6. Custom Days / Weekend Config Button */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 3 }}>أيام الدراسة والإجازة</label>
                <button
                  type="button"
                  onClick={() => setShowDaysConfig(!showDaysConfig)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 800,
                    background: showDaysConfig ? '#e0f2fe' : '#f8fafc', color: '#0369a1', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6
                  }}
                >
                  <Settings2 size={14} /> ({enabledDays.length} أيام دراسة) {showDaysConfig ? '▲' : '▼'}
                </button>
              </div>

            </div>

            {/* Action Save Button */}
            <div>
              <button
                type="button"
                onClick={handleSaveMatrix}
                disabled={savingMatrix || classStudents.length === 0}
                style={{
                  padding: '9px 22px', borderRadius: 8, border: 'none',
                  background: '#059669', color: '#fff', fontSize: 13, fontWeight: 900,
                  cursor: (savingMatrix || classStudents.length === 0) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 4px rgba(5,150,105,0.2)'
                }}
              >
                {savingMatrix ? <RefreshCw className="animate-spin" size={16} /> : '💾'}
                {savingMatrix ? 'جاري الحفظ...' : 'حفظ غياب الفصل بالكامل للأسبوع'}
              </button>
            </div>
          </div>

          {/* Collapsible Custom Days Configuration Box */}
          {showDaysConfig && (
            <div style={{
              background: '#f8fafc', border: '1.5px solid #bae6fd', borderRadius: 8,
              padding: 14, marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 12.5, color: '#0369a1', marginBottom: 6 }}>
                  ⚙️ تحديد أيام الدراسة الفعلية والأيام المعطلة / الإجازات الأسبوعية:
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ALL_WEEK_DAYS.map(day => {
                    const isChecked = enabledDays.includes(day.key);
                    return (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => toggleDayKey(day.key)}
                        style={{
                          padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                          border: isChecked ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                          background: isChecked ? '#e0f2fe' : '#ffffff',
                          color: isChecked ? '#0369a1' : '#64748b'
                        }}
                      >
                        {isChecked ? '✅ ' : '❌ إجازة: '} {day.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Presets */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, color: '#64748b', alignSelf: 'center' }}>نماذج جاهزة:</span>
                <button
                  type="button"
                  onClick={() => applyPresetDays('6_days_sat')}
                  style={{ padding: '4px 10px', fontSize: 11, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
                >
                  الجمعة فقط إجازة (6 أيام دراسة)
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetDays('5_days_fri_sat')}
                  style={{ padding: '4px 10px', fontSize: 11, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
                >
                  الجمعة والسبت إجازة (5 أيام دراسة)
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetDays('5_days_thu_fri')}
                  style={{ padding: '4px 10px', fontSize: 11, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
                >
                  الخميس والجمعة إجازة (5 أيام دراسة)
                </button>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {matrixSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#f0fdf4', color: '#166534', borderRadius: 8, marginBottom: 14, fontSize: 13, fontWeight: 800, border: '1px solid #bbf7d0' }}>
              <CheckCircle size={18} /> {matrixSuccess}
            </div>
          )}

          {/* Color Legend & Matrix Table */}
          {selectedGradeId ? (
            <div>
              {/* Legend & Quick Helpers */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, fontWeight: 700 }}>
                  <span style={{ color: '#64748b' }}>دليل الحالات (انقر على الخانة للتبديل):</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#166534' }}>
                    <span style={{ display: 'inline-block', width: 14, height: 14, background: '#dcfce7', border: '1px solid #86efac', borderRadius: 3 }}></span> حاضر (ح)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#991b1b' }}>
                    <span style={{ display: 'inline-block', width: 14, height: 14, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 3 }}></span> غياب بدون عذر (غ)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#9a3412' }}>
                    <span style={{ display: 'inline-block', width: 14, height: 14, background: '#ffedd5', border: '1px solid #fdba74', borderRadius: 3 }}></span> غياب بعذر (ع)
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>
                  عدد الطلاب المعروضين: <strong style={{ color: '#0284c7' }}>{classStudents.length}</strong> طالب
                </div>
              </div>

              {/* Grid Table */}
              <div style={{ overflowX: 'auto', border: '1.5px solid #cbd5e1', borderRadius: 8 }}>
                <table dir="rtl" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#00838f', borderBottom: '2px solid #006978', color: '#fff' }}>
                      <th style={{ padding: '8px 4px', width: 35, borderRight: '1px solid rgba(255,255,255,0.2)', background: '#00838f', color: '#fff' }}>م</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', minWidth: 170, borderRight: '1px solid rgba(255,255,255,0.2)', background: '#00838f', color: '#fff' }}>اسم التلميذ</th>
                      <th style={{ padding: '8px 6px', width: 95, borderRight: '1px solid rgba(255,255,255,0.2)', background: '#00838f', color: '#fff' }}>الرقم القومي</th>
                      
                      {/* Enabled Week Days Headers with Quick Actions */}
                      {weekDates.map(wd => (
                        <th key={wd.key} style={{ padding: '6px 4px', minWidth: 95, borderRight: '1px solid rgba(255,255,255,0.2)', background: '#00838f', color: '#fff' }}>
                          <div style={{ fontWeight: 900, color: '#ffffff', fontSize: 12.5 }}>{wd.name}</div>
                          <div style={{ fontSize: 10, color: '#e0f2fe', fontWeight: 700 }}>{wd.date}</div>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 4 }}>
                            <button
                              type="button"
                              onClick={() => setAllForDate(wd.date, 'present')}
                              title="الكل حاضر"
                              style={{ padding: '1px 6px', fontSize: 9.5, background: '#dcfce7', color: '#166534', border: '1px solid #86efac', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
                            >
                              الكل ح
                            </button>
                            <button
                              type="button"
                              onClick={() => setAllForDate(wd.date, 'absent_unexcused')}
                              title="الكل غائب بدون عذر"
                              style={{ padding: '1px 6px', fontSize: 9.5, background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
                            >
                              الكل غ
                            </button>
                          </div>
                        </th>
                      ))}

                      <th style={{ padding: '8px 6px', width: 75 }}>غياب الأسبوع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixLoading ? (
                      <tr>
                        <td colSpan={weekDates.length + 4} style={{ padding: 40, color: '#64748b', fontWeight: 700 }}>
                          <RefreshCw className="animate-spin inline mr-2" size={18} /> جاري تحميل قائمة طلاب الفصل...
                        </td>
                      </tr>
                    ) : classStudents.length > 0 ? (
                      classStudents.map((s, sIdx) => {
                        let weekAbsentCount = 0;
                        weekDates.forEach(wd => {
                          const st = matrixState[`${s.id}_${wd.date}`];
                          if (st === 'absent_unexcused' || st === 'absent_excused') weekAbsentCount++;
                        });

                        return (
                          <tr key={s.id} style={{ background: sIdx % 2 === 1 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '6px 2px', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>{sIdx + 1}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800, borderRight: '1px solid #e2e8f0' }}>
                              {s.full_name_ar}
                              {s.is_merged ? <span style={{ marginRight: 6, fontSize: 10, color: '#0284c7' }}>♿ (دمج)</span> : null}
                            </td>
                            <td style={{ padding: '6px 4px', fontFamily: 'monospace', fontSize: 11, borderRight: '1px solid #e2e8f0' }}>
                              {s.national_id || s.student_code || '—'}
                            </td>

                            {/* Attendance Days Buttons */}
                            {weekDates.map(wd => {
                              const status = matrixState[`${s.id}_${wd.date}`] || 'present';
                              let bg = '#dcfce7';
                              let text = 'حاضر';
                              let textColor = '#166534';
                              let border = '#86efac';

                              if (status === 'absent_unexcused') {
                                bg = '#fee2e2';
                                text = 'غ (بدون عذر)';
                                textColor = '#991b1b';
                                border = '#fca5a5';
                              } else if (status === 'absent_excused') {
                                bg = '#ffedd5';
                                text = 'ع (بعذر)';
                                textColor = '#9a3412';
                                border = '#fdba74';
                              }

                              return (
                                <td key={wd.key} style={{ padding: '4px 3px', borderRight: '1px solid #e2e8f0' }}>
                                  <button
                                    type="button"
                                    onClick={() => toggleAttendance(s.id, wd.date)}
                                    style={{
                                      width: '100%', padding: '5px 2px', borderRadius: 5, border: `1px solid ${border}`,
                                      background: bg, color: textColor, fontWeight: 900, fontSize: 11, cursor: 'pointer',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    {text}
                                  </button>
                                </td>
                              );
                            })}

                            <td style={{ padding: '6px 4px', fontWeight: 900, fontSize: 13, color: weekAbsentCount > 0 ? '#dc2626' : '#166534' }}>
                              {weekAbsentCount}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={weekDates.length + 4} style={{ padding: 30, color: '#64748b', fontWeight: 700 }}>
                          لا يوجد طلاب مسجلون في هذا الصف / الفصل
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b', border: '1.5px dashed #cbd5e1', borderRadius: 8 }}>
              👈 يرجى اختيار الصف الدراسي لبدء رصد الغياب الأسبوعي
            </div>
          )}

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TAB 2: SINGLE STUDENT ABSENCE (تسجيل غياب فردي أو عذر ممتد)  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'single' && (
        <div className="staff-card" style={{ background: '#fff', borderRadius: 12, padding: 22, border: '1px solid #e2e8f0', maxWidth: 700, margin: '0 auto' }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar className="w-5 h-5 text-sky-600" />
            تسجيل غياب فردي لطالب / إجازة مرضية
          </h3>

          {singleSuccess && (
            <div style={{ padding: '10px 14px', background: '#f0fdf4', color: '#166534', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 700 }}>
              {singleSuccess}
            </div>
          )}

          <form onSubmit={handleRecordSingleAbsence} style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 800, marginBottom: 4 }}>
                اختر الطالب <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={singleStudentId}
                onChange={e => setSingleStudentId(e.target.value)}
                style={{ width: '100%', padding: '9px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }}
                required
              >
                <option value="">-- ابحث أو اختر الطالب --</option>
                {allStudents.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.full_name_ar} - ({s.national_id || s.student_code || 'بدون كود'})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>تاريخ الغياب</label>
                <input
                  type="date"
                  value={singleAbsenceDate}
                  onChange={e => setSingleAbsenceDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>نوع الغياب</label>
                <select
                  value={singleAbsenceType}
                  onChange={e => setSingleAbsenceType(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }}
                >
                  <option value="بدون عذر">بدون عذر (يحسب في الإنذارات)</option>
                  <option value="بعذر">بعذر طبي / مقبول (لا يحسب في الإنذارات)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>الملاحظات أو رقم التقرير الطبي</label>
              <input
                type="text"
                value={singleNotes}
                onChange={e => setSingleNotes(e.target.value)}
                placeholder="مثال: تقرير مستشفى التأمين الصحي بتاريخ..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <button
              type="submit"
              style={{
                padding: '10px 20px', borderRadius: 8, border: 'none', background: '#0284c7', color: '#fff',
                fontWeight: 900, fontSize: 14, cursor: 'pointer', marginTop: 10
              }}
            >
              💾 تسجيل وحفظ حركة الغياب
            </button>
          </form>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TAB 3: LEGAL WARNINGS LOG (سجل ومتابعة الإنذارات القانونية) */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'warnings' && (
        <div className="staff-card" style={{ background: '#fff', borderRadius: 12, padding: 18, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: '#9a3412', margin: 0 }}>
                ⚠️ سجل الإنذارات القانونية وإخطارات الفصل الرسمية
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>
                الإنذارات المولدة تلقائياً حسب قرارات وزارة التربية والتعليم (7، 12، 15 يوماً متصلة أو 30 يوماً منفصلة)
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: 8 }}>
            <table dir="rtl" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#fef3c7', color: '#92400e', fontWeight: 800 }}>
                  <th style={{ padding: '8px 4px', width: 35 }}>م</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: 170 }}>اسم الطالب</th>
                  <th style={{ padding: '8px 6px', width: 95 }}>الرقم القومي</th>
                  <th style={{ padding: '8px 6px', width: 85 }}>الصف / الفصل</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: 180 }}>نوع الإنذار القانوني</th>
                  <th style={{ padding: '8px 4px', width: 65 }}>أيام الغياب</th>
                  <th style={{ padding: '8px 6px', width: 85 }}>تاريخ الصدور</th>
                  <th style={{ padding: '8px 6px', width: 95 }}>هاتف ولي الأمر</th>
                  <th style={{ padding: '8px 10px', width: 140 }}>إجراءات الطباعة</th>
                </tr>
              </thead>
              <tbody>
                {warnings.length > 0 ? (
                  warnings.map((w, idx) => (
                    <tr key={w.id || idx} style={{ background: idx % 2 === 1 ? '#fffbeb' : '#fff', borderBottom: '1px solid #fef3c7' }}>
                      <td style={{ padding: '6px 2px', fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800 }}>{w.full_name_ar}</td>
                      <td style={{ padding: '6px 4px', fontFamily: 'monospace', fontSize: 11 }}>{w.national_id || '—'}</td>
                      <td style={{ padding: '6px 4px', fontSize: 11.5 }}>
                        {w.grade_name_ar || '—'} {w.class_name ? `(${w.class_name})` : ''}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800, color: w.total_absent_days >= 15 ? '#b91c1c' : '#c2410c' }}>
                        {w.warning_type}
                      </td>
                      <td style={{ padding: '6px 4px', fontWeight: 900, color: '#dc2626', fontSize: 13 }}>
                        {w.total_absent_days}
                      </td>
                      <td style={{ padding: '6px 4px', fontFamily: 'monospace', fontSize: 11 }}>
                        {w.issue_date || w.created_at?.slice(0, 10) || '—'}
                      </td>
                      <td style={{ padding: '6px 4px', fontFamily: 'monospace', fontSize: 11 }} dir="ltr">
                        {w.guardian_phone || '—'}
                      </td>
                      <td style={{ padding: '6px 6px' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenPrintModal(w, 'warning')}
                            title="طباعة إنذار غياب رسمي"
                            style={{ padding: '4px 8px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <Printer size={12} /> إنذار
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenPrintModal(w, 'call')}
                            title="طباعة استدعاء ولي أمر"
                            style={{ padding: '4px 8px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <FileText size={12} /> استدعاء
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenPrintModal(w, 're_enrollment')}
                            title="طباعة طلب إعادة قيد"
                            style={{ padding: '4px 8px', background: '#059669', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <FileCheck size={12} /> إعادة قيد
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} style={{ padding: 30, color: '#64748b', fontWeight: 700 }}>
                      لا توجد إنذارات غياب مسجلة حتى الآن
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
